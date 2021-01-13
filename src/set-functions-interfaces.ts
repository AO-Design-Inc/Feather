import {ArweaveAddress} from './interfaces';

export enum ExecutableKinds {
	webgpu = 'webgpu',

	wasm = 'wasm'
}

export type ExecutableHashMap = Record<ArweaveAddress, ExecutableType>;

declare const ContractError: any;

declare const SmartWeave: any;

export interface ExecutableInterface {
	executable_kind: ExecutableKinds;
	quantity?: number;
	result_address: ArweaveAddress;
	birth_height: number;
	result_height: number;
	checked: boolean;
}

export class ProposedExecutable {
	_state!: 'proposed';
}
export interface ProposedExecutable extends Omit<
ExecutableInterface, 'result_address' | 'result_height'
> {}

export class CheckedExecutable {
	_state!: 'checked';
	checked!: true;
}

export class CheckingExecutable {
	_state!: 'checking';
	checked!: false;
	result_address!: ArweaveAddress;
	result_height!: number;
}

export type ExecutableType = CheckedExecutable | ProposedExecutable | CheckingExecutable;

interface KeyValue {
	[0]: ArweaveAddress;
	[1]: ExecutableType;
}

type GConstructor<T> = new (...args: any[]) => T;
export function filterExecutable<T extends GConstructor<ExecutableType>>(
	_: ExecutableHashMap,
	exec_type: T):
	ExecutableHashMap {
	return Object.fromEntries(
		Object.entries(_)
			.filter((keyval: KeyValue) =>
				keyval[1] instanceof exec_type)
	);
}
