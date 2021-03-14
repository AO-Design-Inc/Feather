/**
 * {@link ExecutableState} class declared here
 * @packageDocumentation
 */
import * as crypto from 'crypto';
declare const SmartWeave: any;
declare const ContractError: any;
declare const ContractAssert: <T extends boolean>(
	cond: T,
	message: string
) => T extends true ? string : never;
import {
	ExecutableKinds,
	ArweaveAddress,
	BidInterface,
	AcceptedBidInput,
	ResultInput,
	StateInterface,
	AccountInterface
} from './interfaces';
import {
	ValidationAnnounce,
	ValidationLock,
	ValidationRelease,
	ValidationStages,
	ValidationAnnounceState,
	ValidationReleaseState,
	ValidationLockState
} from './validate';
import {
	lastElement,
	getElements,
	createLinkedList,
	Tuple,
	LinkedList,
	isArrayOfDiscriminatedTypes,
	isOfDiscriminatedType
} from './utils';

/**
 * ExecutableState is a class that wraps the executable state, the only way to
 * go from one executable state to the next is to call the next method on the
 * ExecutableState class with a function that takes the wrapped executable
 * state and returns the next executable state.
 *
 * Ideally this class would be stronger, and its constructor would be able to
 * do the instanceof typechecking for what kind of Executable it is. This is
 * currently in progress, however the author has not yet been able to find an
 * elegant solution for the same.
 *
 * TODO: add input option to executable, so user can link pre-existing programs
 * on arweave.
 */

abstract class ExecutableState<T extends ExecutableStates> {
	public readonly value: T;

	/** Should have typechecking for instanceof T, but this is awkward in
	 * typescript because they're implemented as interfaces, so can't do
	 * that at runtime, might want to have if-else typeguard chain ie:
	 * ```typescript
	 * 	if (isProposedExecutable(value)) {
	 * 		this.value: ProposedExecutable = value;
	 * 	} else if (isAcceptedExecutable(value)) {
	 * 		this.value: AcceptedExecutable = value;
	 * ```
	 * Presently cleaned up by putting into the transfer functions
	 * (eg. proposedToAccepted)
	 */
	constructor(value: T) {
		this.value = value;
	}

	/**
	 * @param  f - function that takes in an instance of one of the
	 * @link{ExecutableStates} interfaces, and returns an ExecutableState
	 * class.
	 * @returns f applied to wrapped state.
	 */
	next(f: InputApplier<T>): ExecutableState<StateMapsTo<T>> {
		return f(this.value);
	}

	consume() {
		// Possibly make this a decorator in the future.
		return this.value;
	}
}

export class ProposedState extends ExecutableState<ProposedExecutable> {
	constructor(value: ExecutableStates) {
		if (!isProposedExecutable(value)) {
			throw new ContractError('executable not in proposed state!');
		}

		super(value);
	}
}

export class AcceptedState extends ExecutableState<AcceptedExecutable> {
	constructor(value: ExecutableStates) {
		if (!isAcceptedExecutable(value)) {
			throw new ContractError('executable not in accepted state!');
		}

		super(value);
	}

	get accepted_bid() {
		return this.value.accepted_bid;
	}

	get caller() {
		return this.value.caller;
	}
}

function difference<T>(setA: Set<T>, setB: Set<T>) {
	const _difference = new Set(setA);
	for (const element of setB) {
		_difference.delete(element);
	}

	return _difference;
}

export type ValidationStates =
	| ValidationAnnounceState
	| ValidationLockState
	| ValidationReleaseState;

function initialiseValidationState(
	i: ValidationStages
): ValidationStates {
	switch (i._discriminator) {
		case 'announce':
			return new ValidationAnnounceState(i);
		case 'lock':
			return new ValidationLockState(i);
		case 'release':
			return new ValidationReleaseState(i);
		default:
			throw new ContractError('impossible!');
	}
}

export class ResultState extends ExecutableState<ResultExecutable> {
	// THIS IS THE REFACTOR!
	// Could mayyybe use tuple
	validations: ValidationStates[][];

	constructor(value: ExecutableStates) {
		if (!isResultExecutable(value)) {
			throw new ContractError('executable not in result state!');
		}

		super(value);
		this.validations = getElements(
			this.value.validation_linked_list
		).map((v) => v.value.map(initialiseValidationState));
	}
	// Spawn new validation
	//

	get used_validators() {
		return this.validations.flatMap((_) => _.map((_) => _.value.validator))
	}

	get validator_tail() {
		return lastElement(this.value.validation_linked_list);
	}

	allowed_validators_object(
		validators: Record<ArweaveAddress, Required<AccountInterface>>
	) {
		const used_validators = new Set(this.used_validators);
		const validator_keys = new Set(Object.keys(validators));
		const allowed_validators = difference(
			validator_keys,
			used_validators
		);
		const allowed_validator_object: Record<
			ArweaveAddress,
			Required<AccountInterface>
		> = {};

		for (const i of allowed_validators.values()) {
			allowed_validator_object[i] = validators[i];
		}

		return allowed_validator_object;
	}

	consume() {
		// Possibly make this a decorator in the future.
		this.value.validation_linked_list = createLinkedList<
			ValidationStages[]
		>(
			this.validations.map((_) => _.map((_) => _.value))
		) as NonNullable<LinkedList<ValidationStages[]>>;

		return this.value;
	}

	verify_and_iterate(
		validators: Record<ArweaveAddress, Required<AccountInterface>>
	) {
		const iv = Buffer.alloc(16, 0);
		const validatorTail = this.validations[-1].map((_) => _.value);
		if (
			isArrayOfDiscriminatedTypes<ValidationRelease>(
				validatorTail,
				'release'
			)
		) {
			// Report error in being unable to use map in validated
			// arr
			const deciphered = decipherList(
				validatorTail.map((_) => [_.symm_key, _.encrypted_hash])
			);

			if (deciphered.every((_) => _ === deciphered[0])) {
				return this.next(
					() =>
						new ValidatedState({
							...this.consume(),
							_discriminator: 'validated',
							is_correct: true
						})
				);
				// Complete and payout!
			}

			this.validations.push(
				generateValidators(
					this.allowed_validators_object(validators)
				).map(initialiseValidationState)
			);
		}

		return this;
	}
}

export function decipherList(l: Array<[string, string]>): string[] {
	const decrypted: string[] = [];
	const iv = Buffer.alloc(16, 0);
	l.forEach((v, i) => {
		const decipher = crypto.createDecipheriv('aes-192-gcm', v[0], iv);
		decrypted[i] = decipher.update(v[1], 'hex', 'utf8');
		decrypted[i] = decipher.final('utf8');
	});
	return decrypted;
}

export class ValidatedState extends ExecutableState<ValidatedExecutable> {
	// Handle payments and punishments in constructor!
	constructor(value: ExecutableStates) {
		if (!isValidatedExecutable(value)) {
			throw new ContractError('executable not in validated state!');
		}

		super(value);
	}
}

export interface ExecutableInterface {
	executable_address: ArweaveAddress;
	executable_kind: ExecutableKinds;
	birth_height: number;
}

export interface ProposedExecutable {
	_discriminator: 'proposed';
	executable: ExecutableInterface;
	caller: ArweaveAddress;
	bids: BidInterface[];
}

interface ExecResultInterface {
	address: ArweaveAddress;
	height: number;
	giver: ArweaveAddress;
}

export interface AcceptedExecutable
	extends Omit<ProposedExecutable, '_discriminator'> {
	_discriminator: 'accepted';
	accepted_bid: BidInterface;
}

export interface ResultExecutable
	extends Omit<AcceptedExecutable, '_discriminator'> {
	_discriminator: 'result';
	result: ExecResultInterface;
	validation_linked_list: LinkedList<ValidationStages[]>;
}
export interface ValidatedExecutable
	extends Omit<ResultExecutable, '_discriminator'> {
	_discriminator: 'validated';
	is_correct: boolean;
}

// Use discriminator pattern.

export type ExecutableStates =
	| ProposedExecutable
	| AcceptedExecutable
	| ResultExecutable
	| ValidatedExecutable;

export type StateMapsTo<
	T extends ExecutableStates
> = T extends ProposedExecutable
	? AcceptedExecutable
	: T extends AcceptedExecutable
	? ResultExecutable
	: T extends ResultExecutable
	? ValidatedExecutable
	: never;

type InputApplier<T1 extends ExecutableStates> = (
	_: T1
) => ExecutableState<StateMapsTo<T1>>;

export function proposedToAccepted(
	acc_input: AcceptedBidInput
): InputApplier<ProposedExecutable> {
	return (
		i: ProposedExecutable
	): ExecutableState<AcceptedExecutable> => {
		return new AcceptedState({
			...i,
			_discriminator: 'accepted',
			accepted_bid: acc_input.accepted_bid
		});
	};
}

// Some prng i found on the internet
// Mulberry32, a fast high quality PRNG:
// https://gist.github.com/tommyettinger/46a874533244883189143505d203312c
// https://gist.github.com/blixt/f17b47c62508be59987b
function mulberry32(a: number) {
	return function () {
		a = Math.trunc(a);
		a = Math.trunc(a + 0x6d2b79f5);
		let t = Math.imul(a ^ (a >>> 15), 1 | a);
		t ^= t + Math.imul(t ^ (t >>> 7), 61 | t);
		return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
	};
}

// Gets validator after weighting for stake.
function getWeightedProbabilityValidator(seed: number) {
	const mul32instance = mulberry32(seed);
	return function (
		validators: Record<ArweaveAddress, Required<AccountInterface>>
	): ArweaveAddress {
		const validators_keyval = Object.entries(validators);
		const total_stake = validators_keyval.reduce(
			(acc, cur) => acc + cur[1].stake,
			0
		);
		const pdf = validators_keyval.map(
			(value) => value[1].stake / total_stake
		);
		// The gods only know whether this works.
		// For fuck's sake let there not be an off by one here.
		const rand_no_from_0_to_1 = mul32instance();
		for (
			let i = 0, _sum = pdf[0];
			i < pdf.length;
			++i, _sum += pdf[i]
		) {
			if (rand_no_from_0_to_1 < _sum) return validators_keyval[i][0];
		}

		throw new ContractError(
			'Impossible state, probability function borked'
		);
	};
}

function generateValidators(
	validators: Record<ArweaveAddress, Required<AccountInterface>>
): ValidationAnnounce[] {
	const validatorReturner = getWeightedProbabilityValidator(
		Number(SmartWeave.block.indep_hash)
	);

	const validator1 = validatorReturner(validators);
	// Need to write tests to catch if dumb shit happens here
	// I dont know exactly *how* weak the ref to this is
	// like is it going to remove validator from state? lol.
	delete validators.validator1;
	const validator2 = validatorReturner(validators);
	delete validators.validator2;
	return [
		{_discriminator: 'announce', validator: validator1},
		{_discriminator: 'announce', validator: validator2}
	];
}

export function acceptedToResult(
	result_input: ResultInput,
	caller: ArweaveAddress,
	validators: Record<ArweaveAddress, Required<AccountInterface>>
): InputApplier<AcceptedExecutable> {
	const validatorReturner = getWeightedProbabilityValidator(
		Number(SmartWeave.block.indep_hash)
	);

	return (
		i: AcceptedExecutable
	): ExecutableState<ResultExecutable> => {
		return new ResultState({
			...i,
			_discriminator: 'result',
			validation_linked_list: {
				value: generateValidators(validators),
				next: undefined
			},
			result: {
				address: result_input.result_address,
				giver: caller,
				height: SmartWeave.block.height
			}
		});
	};
}

export const isProposedExecutable = (
	target: ExecutableStates
): target is ProposedExecutable =>
	target._discriminator === 'proposed';

/**
 * Maybe use Reflect.has() instead of in here
 */
export const isAcceptedExecutable = (
	target: ExecutableStates
): target is AcceptedExecutable =>
	target._discriminator === 'accepted';

export const isResultExecutable = (
	target: ExecutableStates
): target is ResultExecutable => target._discriminator === 'result';

export const isValidatedExecutable = (
	target: ExecutableStates
): target is ValidatedExecutable =>
	target._discriminator === 'validated';

function isExecutableType<T extends ExecutableStates>(
	target: ExecutableStates,
	discriminator: T['_discriminator']
): target is T {
	return discriminator === target._discriminator;
}
