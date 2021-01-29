import {ArweaveAddress} from '../interfaces';

export interface ExecutableInterface {
	executable_address: ArweaveAddress;
	executable_kind: ExecutableKinds;
	birth_height: number;
}

export class ProposedExecutable {
	private readonly _state!: 'proposed';
}
export interface ProposedExecutable {
	executable: ExecutableInterface;
	caller: ArweaveAddress;
	bids: BidInterface[];
}

export class ProposedExecutableInput {
	executable_address: ArweaveAddress;
	executable_kind: ExecutableKinds;
}

interface Functor<A> {
    map<B>( transform: (value: A) => B ): Functor<B>;
}


export interface BidInterface {
	quantity: number;
	bidder: ArweaveAddress;
}

export class AcceptedExecutable {
	_state!: 'accepted';
}
export interface AcceptedExecutable extends ProposedExecutable {
	accepted_bid: BidInterface;
}

export interface ExecResultInterface {
	result_address: ArweaveAddress;
	result_height: number;
	result_giver: ArweaveAddress;
}

export class ResultExecutable {
	_state!: 'result';
}
export interface ResultExecutable extends AcceptedExecutable {
	result: ExecResultInterface;
}

export type ExecutableType =
	| ResultExecutable
	| AcceptedExecutable
	| ProposedExecutable;

enum ExecutableKinds {
	webgpu = 'webgpu',

	wasm = 'wasm'
}
