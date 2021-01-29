declare const SmartWeave: any;
import {
	ExecutableKinds,
	ArweaveAddress,
	BidInterface,
	AcceptedBidInput,
	ResultInput,
	ValidationInput,
	VaultInterface
} from './interfaces';
declare const ContractError: any;

export class ExecutableState<T extends ExecutableStates> {
	public readonly value: T;

	constructor(value: T) {
		this.value = value;
	}

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

const acceptedInputProxy: ProxyHandler<AcceptedBidInput> = {
	get(target: AcceptedBidInput, key: keyof AcceptedBidInput) {
		return target[key];
	}
};


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
