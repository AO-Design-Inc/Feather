declare const ContractError: any;
declare const ContractAssert: <T extends boolean>(
	cond: T,
	message: string
) => T extends true ? string : never;
import {ExecutableStates, ProposedExecutable} from './executable';

export interface ActionInterface {
	input: InputType;
	caller: ArweaveAddress;
}

export interface StateInterface {
	executables: Record<ArweaveAddress, ExecutableStates>;
	accounts: Record<ArweaveAddress, AccountInterface>;
	ticker: 'FEA';
}

export type ResultInterface = any;

export type ContractHandlerOutput =
	| {state: StateInterface}
	| {result: ResultInterface};

export enum GetFunctions {
	proposed = 'proposed',

	executable = 'executable'
}

export enum ExecutableKinds {
	webgpu = 'webgpu',

	wasm = 'wasm'
}

export enum SetFunctions {
	propose = 'propose',

	bid = 'bid',

	accept = 'accept',

	result = 'result',

	validate = 'validate_bid',

	validate_lock = 'validate_lock',

	validate_release = 'validate_release'
}

export enum AccountFunctions {
	lock = 'lock',

	unlock = 'unlock'
}

export interface AccountInterface {
	balance: number;
	vaults: VaultInterface[];
	stake?: number;
}

export type ArweaveAddress = string;
export const isArweaveAddress = (
	addy: string
): addy is ArweaveAddress => /[\w-]{43}/i.test(addy);

export interface VaultInterface {
	amount: number;
	start: number;
	end: number;
}

export interface InputInterface {
	function: SetFunctions | GetFunctions;
}

export interface ProposedExecutableInput extends InputInterface {
	executable_address: ArweaveAddress;
	executable_kind: ExecutableKinds;
	function: SetFunctions.propose;
	input_to_executable?: ArweaveAddress;
}

export const ProposedExecutableInputProxy: ProxyHandler<ProposedExecutableInput> = {
	get(
		target: ProposedExecutableInput,
		p: keyof ProposedExecutableInput
	) {
		switch (p) {
			case 'executable_address':
				if (isArweaveAddress(target.executable_address)) {
					return target.executable_address;
				}

				throw new ContractError(`
						${String(target.executable_address)}
						is not valid Arweave Address
						`);
			case 'executable_kind':
				if (target.executable_kind in ExecutableKinds) {
					return target.executable_kind;
				}

				throw new ContractError(`
					${target.executable_kind}
					is not valid executable type
					`);
			default:
				throw new ContractError(`
					${String(p)} is invalid key
					`);
		}
	}
};

export interface BidInterface {
	quantity: number;
	bidder: ArweaveAddress;
}

type ValidBid = number;
export const isValidBid = (
	bid_amount: number
): bid_amount is ValidBid =>
	typeof bid_amount === 'number' && bid_amount > 0;

export interface BidInput extends InputInterface {
	function: SetFunctions.bid;
	executable_key: ArweaveAddress;
	quantity: ValidBid;
}

export const BidInputProxy: ProxyHandler<BidInput> = {
	get(target: BidInput, p: keyof BidInput) {
		switch (p) {
			case 'executable_key':
				if (isArweaveAddress(target.executable_key)) {
					return target.executable_key;
				}

				throw new ContractError(`
					${String(target.executable_key)}
					is not valid executable key
					`);
			case 'quantity':
				if (isValidBid(target.quantity)) {
					return target.quantity;
				}

				throw new ContractError(`
					${String(target.quantity)} 
					is not valid bid quantity
					`);
			default:
				throw new ContractError(`
						${String(p)} is invalid key
						`);
		}
	}
};

export interface AcceptedBidInput extends InputInterface {
	function: SetFunctions.accept;
	accepted_bid: BidInterface;
	executable_key: ArweaveAddress;
}

/* Possible state refactor
type InputProxyFactory<T extends InputInterface> = (
	input: T,
	state: StateInterface
) => ProxyHandler<T>;
*/

export const AcceptedBidInputProxy: ProxyHandler<AcceptedBidInput> = {
	get(target: AcceptedBidInput, p: keyof AcceptedBidInput) {
		switch (p) {
			case 'accepted_bid':
				ContractAssert(
					isValidBid(target.accepted_bid.quantity),
					'invalid amount'
				);
				ContractAssert(
					isArweaveAddress(target.accepted_bid.bidder),
					'bad accepted bid bidder'
				);
				return target.accepted_bid;
			case 'executable_key':
				ContractAssert(
					isArweaveAddress(target.executable_key),
					'not valid executable key'
				);
				return target.executable_key;
			default:
				throw new ContractError('invalid key');
		}
	}
};

export interface ResultInput extends InputInterface {
	function: SetFunctions.result;
	result_address: ArweaveAddress;
	executable_key: ArweaveAddress;
}

export const ResultInputProxy: ProxyHandler<ResultInput> = {
	get(target: ResultInput, p: keyof ResultInput) {
		switch (p) {
			case 'result_address':
				if (isArweaveAddress(target.result_address)) {
					return target.result_address;
				}

				throw new ContractError(`${String(target.result_address)}
						is not Arweave Address`);

			case 'executable_key':
				if (isArweaveAddress(target.executable_key)) {
					return target.executable_key;
				}

				throw new ContractError(`
					${String(target.executable_key)}
					is not valid executable key
					`);
			default:
				throw new ContractError(`
					${String(p)} is invalid key
					`);
		}
	}
};

// Make sure encrypted_hash actually is a hash
export interface ValidationLockInput extends InputInterface {
	function: SetFunctions.validate_lock;
	executable_key: ArweaveAddress;
	// DEPRECATED encrypted_hash in favour of encrypted_obj
	encrypted_obj: string;
}

export const ValidationLockInputProxy: ProxyHandler<ValidationLockInput> = {
	get(target: ValidationLockInput, p: keyof ValidationLockInput) {
		switch (p) {
			case 'executable_key':
				ContractAssert(
					isArweaveAddress(target.executable_key),
					'invalid executable key (not arweave address)'
				);
				return target.executable_key;
			case 'encrypted_obj':
				ContractAssert(
					typeof target.encrypted_obj === 'string',
					'encrypted_obj is string'
				);

				return target.encrypted_obj;

			default:
				throw new ContractError('invalid key');
		}
	}
};

export interface ValidationReleaseInput extends InputInterface {
	function: SetFunctions.validate_release;
	executable_key: ArweaveAddress;
	symm_key: string;
}

export const ValidationReleaseInputProxy: ProxyHandler<ValidationReleaseInput> = {
	get(
		target: ValidationReleaseInput,
		p: keyof ValidationReleaseInput
	) {
		switch (p) {
			case 'executable_key':
				ContractAssert(
					isArweaveAddress(target.executable_key),
					'invalid executable key (not arweave address)'
				);
				return target.executable_key;
			case 'symm_key':
				return target.symm_key;
			default:
				throw new ContractError('invalid key');
		}
	}
};

// MAKE ABSOLUTELY SURE ONE EXECUTOR CAN'T GET CALLED TWICE SOMEHOW.

export interface GetProposedExecutableInput extends InputInterface {
	function: GetFunctions.proposed;
}

export type InputType =
	| BidInput
	| AcceptedBidInput
	| ProposedExecutableInput
	| ResultInput
	| ValidationLockInput
	| ValidationReleaseInput
	| GetProposedExecutableInput;
