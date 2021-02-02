declare const SmartWeave: any;
import {
	ExecutableKinds,
	ArweaveAddress,
	BidInterface,
	AcceptedBidInput,
	ResultInput,
	ValidationInput
} from './interfaces';

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
 */
export class ExecutableState<T extends ExecutableStates> {
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
	next<T1 extends ExecutableStates>(
		f: (v: T) => ExecutableState<T1>
	): ExecutableState<T1> {
		return f(this.value);
	}
}
export interface ExecutableInterface {
	executable_address: ArweaveAddress;
	executable_kind: ExecutableKinds;
	birth_height: number;
}

export interface ProposedExecutable {
	executable: ExecutableInterface;
	caller: ArweaveAddress;
	bids: BidInterface[];
}

interface ExecResultInterface {
	address: ArweaveAddress;
	height: number;
	giver: ArweaveAddress;
}

interface AcceptedExecutable extends ProposedExecutable {
	accepted_bid: BidInterface;
}

interface ResultExecutable extends AcceptedExecutable {
	result: ExecResultInterface;
}

interface ValidatedExecutable extends ResultExecutable {
	is_correct: boolean;
}

export type ExecutableStates =
	| ProposedExecutable
	| AcceptedExecutable
	| ResultExecutable
	| ValidatedExecutable;

type InputApplier<T1 extends ExecutableStates, T2 extends ExecutableStates> = (
	_: T1
) => ExecutableState<T2>;

export function proposedToAccepted(
	acc_input: AcceptedBidInput
): InputApplier<ProposedExecutable, AcceptedExecutable> {
	return (i: ProposedExecutable): ExecutableState<AcceptedExecutable> => {
		return new ExecutableState<AcceptedExecutable>({
			...i,
			accepted_bid: acc_input.accepted_bid
		});
	};
}

export function acceptedToResult(
	result_input: ResultInput,
	caller: ArweaveAddress
): InputApplier<AcceptedExecutable, ResultExecutable> {
	return (i: AcceptedExecutable): ExecutableState<ResultExecutable> => {
		return new ExecutableState<ResultExecutable>({
			...i,
			result: {
				address: result_input.result_address,
				giver: caller,
				height: SmartWeave.block.height
			}
		});
	};
}

export function resultToValidated(
	validation_input: ValidationInput
): InputApplier<ResultExecutable, ValidatedExecutable> {
	return (i: ResultExecutable): ExecutableState<ValidatedExecutable> => {
		return new ExecutableState<ValidatedExecutable>({
			...i,
			is_correct: validation_input.is_correct
		});
	};
}

export const isProposedExecutable = (
	target: ExecutableStates
): target is ProposedExecutable =>
	!('result' in target) && !('accepted_bid' in target);

export const isAcceptedExecutable = (
	target: ExecutableStates
): target is AcceptedExecutable =>
	!('result' in target) && 'accepted_bid' in target;

export const isResultExecutable = (
	target: ExecutableStates
): target is ResultExecutable =>
	!isProposedExecutable(target) && !isAcceptedExecutable(target);
