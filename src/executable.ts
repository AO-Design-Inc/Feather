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
	isOfDiscriminatedType,
	setDifference,
	getWeightedProbabilityElement
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
		if (
			!isOfDiscriminatedType<ProposedExecutable>(value, 'proposed')
		) {
			throw new ContractError('executable not in proposed state!');
		}

		super(value);
	}
}

export class AcceptedState extends ExecutableState<AcceptedExecutable> {
	constructor(value: ExecutableStates) {
		if (
			!isOfDiscriminatedType<AcceptedExecutable>(value, 'accepted')
		) {
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
	// Could mayyybe use tuple
	validations: ValidationStates[][];

	constructor(value: ExecutableStates) {
		if (!isOfDiscriminatedType<ResultExecutable>(value, 'result')) {
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
		return this.validations.flatMap((_) =>
			_.map((_) => _.value.validator)
		);
	}

	allowed_validators(
		validators: Record<ArweaveAddress, Required<AccountInterface>>
	) {
		const used_validators = new Set(this.used_validators);
		const validator_keys = new Set(Object.keys(validators));
		const allowed_validators = setDifference(
			validator_keys,
			used_validators
		);
		return new Set<[ArweaveAddress, Required<AccountInterface>]>(
			Array.from(allowed_validators).map((_) => [_, validators._])
		);
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
				generateValidators(this.allowed_validators(validators)).map(
					initialiseValidationState
				)
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
		if (
			!isOfDiscriminatedType<ValidatedExecutable>(value, 'validated')
		) {
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
	size: number;
	hash: string;
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

function generateValidators(
	validators: Set<[ArweaveAddress, Required<AccountInterface>]>
): ValidationAnnounce[] {
	const validatorReturner = getWeightedProbabilityElement(
		Number(SmartWeave.block.indep_hash)
	);

	const validator1 = validatorReturner(
		Array.from(validators).map((_) => [_, _[1].stake])
	);
	validators.delete(validator1);
	const validator2 = validatorReturner(
		Array.from(validators).map((_) => [_, _[1].stake])
	);

	return [
		{_discriminator: 'announce', validator: validator1[0]},
		{_discriminator: 'announce', validator: validator2[0]}
	];
}

export async function acceptedToResult(
	result_input: ResultInput,
	caller: ArweaveAddress,
	validators: Set<[ArweaveAddress, Required<AccountInterface>]>
): Promise<InputApplier<AcceptedExecutable>> {
	const [
		result_hash,
		result_size
	] = await SmartWeave.unsafeClient.transactions
		.get(result_input.result_address)
		.then((_: any) => [
			_.tags[0].result_hash as string,
			_.data_size as number
		]);

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
				height: SmartWeave.block.height,
				size: result_size,
				hash: result_hash
			}
		});
	};
}
