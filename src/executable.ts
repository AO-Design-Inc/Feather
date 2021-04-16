/**
 * {@link ExecutableState} class declared here
 * @packageDocumentation
 */
// import * as SmartWeave.arweave.crypto from 'SmartWeave.arweave.crypto';
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
	AccountInterface,
	ValidationLockInput,
	ValidationReleaseInput,
	ResultInput
} from './faces';
import {
	ValidationAnnounce,
	ValidationRelease,
	ValidationStages,
	ValidationAnnounceState,
	ValidationReleaseState,
	ValidationLockState,
	validationAnnouncedToLocked,
	validationLockedToReleased
} from './validate';
import {
	getElements,
	createLinkedList,
	LinkedList,
	isArrayOfDiscriminatedTypes,
	isOfDiscriminatedType,
	setDifference,
	getWeightedProbabilityElement,
	lastElementArrayIndex,
	decipher,
	isArrayNonZero
} from './utils';
import {PRICE_INCREASE_PER_BLOCK, START_BLOCK} from './constants';
import {Account} from './transaction';

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

	/* The activeBids method gets bids that are valid for some blockheight. */
	get activeBids() {
		return this.value.bids.filter(
			(_) => this.currentPrice >= _.quantity
		);
	}

	/* The currentPrice getter accesses price of executable at some block
	 * height */
	get currentPrice() {
		return (
			this.value.start_cost +
			(START_BLOCK() - this.value.executable.birth_height) *
				PRICE_INCREASE_PER_BLOCK
		);
	}
}
/* Deprecated
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

	post_collateral(result_giver_account: Account) {
		result_giver_account.add_vault({
			amount: 0.1 * this.accepted_bid.quantity,
			start: START_BLOCK(),
			end: END_BLOCK()
		});
	}
}
*/

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

export class AcceptedState extends ExecutableState<AcceptedExecutable> {
	// Could mayyybe use tuple
	validations: ValidationStates[][];

	constructor(value: ExecutableStates) {
		if (
			!isOfDiscriminatedType<AcceptedExecutable>(value, 'accepted')
		) {
			throw new ContractError('executable not in accepted state!');
		}

		super(value);
		this.validations = getElements(
			this.value.validation_linked_list
		).map((v) => v.value.map(initialiseValidationState));
	}
	// Spawn new validation
	//

	get validation_tail() {
		if (isArrayNonZero(this.validations)) {
			return this.validations[
				lastElementArrayIndex(this.validations)
			];
		}

		throw new ContractError(
			'validation tail does not exist if no validations'
		);
	}

	get used_validators() {
		return this.validations.flatMap((_) =>
			_.map((_) => _.value.validator)
		);
	}

	lock_validation(
		validation_index: number,
		input_proxy: ValidationLockInput
	): void {
		if (
			this.validation_tail
				.filter((_) =>
					isOfDiscriminatedType<ValidationStages>(_.value, 'lock')
				)
				.some(
					(_) =>
						(_ as ValidationLockState).value.encrypted_obj ===
						input_proxy.encrypted_obj
				)
		) {
			throw new ContractError(
				'cannot have identical encrypted objects!'
			);
		}

		this.validation_tail[validation_index] = new ValidationLockState(
			(this.validation_tail[
				validation_index
			] as ValidationAnnounceState).next(
				validationAnnouncedToLocked(input_proxy)
			).value
		);
	}

	release_validation(
		validation_index: number,
		input_proxy: ValidationReleaseInput
	): void {
		this.validation_tail[
			validation_index
		] = new ValidationReleaseState(
			(this.validation_tail[
				validation_index
			] as ValidationLockState).next(
				validationLockedToReleased(input_proxy)
			).value
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

	check_fully_released() {
		return isArrayOfDiscriminatedTypes<ValidationRelease>(
			this.validation_tail.map((_) => _.value),
			'release'
		);
	}

	async branch(
		validators: Record<ArweaveAddress, Required<AccountInterface>>,
		accounts: Record<ArweaveAddress, AccountInterface>
	) {
		const vt = this.validation_tail.map((_) => _.value);

		if (
			!isArrayOfDiscriminatedTypes<ValidationRelease>(vt, 'release')
		) {
			throw new ContractError(
				'cannot branch if validations not released'
			);
		}

		const deciphered_promises = vt.map(async (_) =>
			decipher([_.symm_key, _.encrypted_obj])
		);

		const deciphered_array = await Promise.all(deciphered_promises);

		if (deciphered_array.every((_) => _ === deciphered_array[0])) {
			const correct_hash = deciphered_array[0];
			const corr_validators = await this.correct_validators(
				correct_hash
			);
			const resultGiverReturner = getWeightedProbabilityElement(
				Number(SmartWeave.block.indep_hash)
			);
			const resultGiver = resultGiverReturner(
				Array.from(corr_validators).map((_) => [_, 1])
			);

			return this.next(
				() =>
					new ValidatedState(
						{
							...this.consume(),
							result_giver: resultGiver,
							_discriminator: 'validated'
						},
						accounts,
						corr_validators
					)
			);
		}

		this.validations.push(
			generateValidators(this.allowed_validators(validators)).map(
				(_) => new ValidationAnnounceState(_)
			)
		);
		return this;
	}

	private async correct_validators(correct_hash: string) {
		const flat_validations = this.validations.flat();
		if (
			!isArrayOfDiscriminatedTypes<ValidationRelease>(
				flat_validations,
				'release'
			)
		) {
			throw new ContractError(
				'cannot branch if validations not released'
			);
		}

		return flat_validations.reduce(
			async (acc, cur: ValidationRelease) => {
				return (await decipher([cur.symm_key, cur.encrypted_obj])) ===
					correct_hash
					? (await acc).concat([cur.validator])
					: acc;
			},
			Promise.resolve([] as string[])
		);
	}
}

// Before ValidatedState, ResultState should take ValidationBids for the
// creation of a validation bidding pool. This mechanism ensures that
// validators are not underpaid

export class ValidatedState extends ExecutableState<ValidatedExecutable> {
	validations: ValidationReleaseState[][];

	get validation_tail() {
		if (isArrayNonZero(this.validations)) {
			return this.validations[
				lastElementArrayIndex(this.validations)
			];
		}

		throw new ContractError(
			'validation tail does not exist if no validations'
		);
	}

	// Handle payments and punishments in constructor!
	constructor(
		value: ExecutableStates,
		accounts?: Record<ArweaveAddress, AccountInterface>,
		correct_validators?: ArweaveAddress[]
	) {
		if (
			!isOfDiscriminatedType<ValidatedExecutable>(value, 'validated')
		) {
			throw new ContractError('executable not in validated state!');
		}

		super(value);

		this.validations = getElements(
			this.value.validation_linked_list
		).map((v) => v.value.map((_) => new ValidationReleaseState(_)));

		if (
			typeof accounts !== 'undefined' &&
			typeof correct_validators !== 'undefined'
		) {
			this.handlePayments(accounts, correct_validators);
		}
	}

	private handlePayments(
		accounts: Record<ArweaveAddress, AccountInterface>,
		correct_validators: ArweaveAddress[]
	) {

		const regulator_account = new Account(accounts, 'regulator');
		const result_giver_account = new Account(
			accounts,
			this.value.result_giver
		);

		this.validations.flat().forEach(async (_) => {
			const validator_account = new Account(
				accounts,
				_.value.validator
			);

			if (correct_validators.includes(_.value.validator)) {
				validator_account.increase_balance(
					regulator_account,
					0.5 * this.value.accepted_cost
				);
			} else {
				validator_account.burn(0.5);
			}
		});

		result_giver_account.increase_balance(regulator_account, 1);
	}
}

export class ResultState extends ExecutableState<ResultExecutable> {
	constructor(value: ExecutableStates) {
		if (!isOfDiscriminatedType<ResultExecutable>(value, 'result')) {
			throw new ContractError('executable not in result state!');
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
	start_cost: number;
	max_cost: number;
}

interface ExecResultInterface {
	address: ArweaveAddress;
	height: number;
	giver: ArweaveAddress;
}

export interface AcceptedExecutable
	extends Omit<ProposedExecutable, '_discriminator'> {
	_discriminator: 'accepted';
	// Changing
	// accepted_bid: BidInterface;
	validation_linked_list: LinkedList<ValidationStages[]>;
	accepted_cost: number;
}

export interface ResultExecutable
	extends Omit<ValidatedExecutable, '_discriminator'> {
	_discriminator: 'result';
	result: ExecResultInterface;
	// Changing
	// validation_linked_list: LinkedList<ValidationStages[]>;
}
export interface ValidatedExecutable
	extends Omit<AcceptedExecutable, '_discriminator'> {
	_discriminator: 'validated';
	result_giver: ArweaveAddress;
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
	? ValidatedExecutable
	: T extends ValidatedExecutable
	? ResultExecutable
	: never;

type InputApplier<T1 extends ExecutableStates> = (
	_: T1
) => ExecutableState<StateMapsTo<T1>>;

export function proposedToAccepted(
	validators: Set<[ArweaveAddress, Required<AccountInterface>]>
): InputApplier<ProposedExecutable> {
	return (
		i: ProposedExecutable
	): ExecutableState<AcceptedExecutable> => {
		return new AcceptedState({
			...i,
			_discriminator: 'accepted',
			validation_linked_list: {
				value: generateValidators(validators),
				next: undefined
			},
			accepted_cost: new ProposedState(i).currentPrice
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

/*
Export function acceptedToResult(
	result_input: ResultInput,
	caller: ArweaveAddress
): InputApplier<AcceptedExecutable> {
	return (
		i: AcceptedExecutable
	): ExecutableState<ResultExecutable> => {
		return new ResultState({
			...i,
			_discriminator: 'result',
			result: {
				address: result_input.result_address,
				giver: caller,
				height: SmartWeave.block.height
			}
		});
	};
}
*/

export function validatedToResult(
	result_input: ResultInput,
	caller: ArweaveAddress
): InputApplier<ValidatedExecutable> {
	return (
		i: ValidatedExecutable
	): ExecutableState<ResultExecutable> => {
		return new ResultState({
			...i,
			_discriminator: 'result',
			result: {
				address: result_input.result_address,
				giver: caller,
				height: START_BLOCK()
			}
		});
	};
}
