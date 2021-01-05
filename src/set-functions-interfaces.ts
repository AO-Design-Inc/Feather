import {ArweaveAddress} from './interfaces';
export type ExecutableKinds = 'wasm';

export type ExecutableHashMap = Record<ArweaveAddress, ExecutableType>;

declare const ContractError: any;

declare const SmartWeave: any;

export interface ExecutableInterface<Type extends ExecutableKinds> {
	readonly executable_kind: Type;
	quantity?: number;
	result_address: ArweaveAddress;
	readonly birth_height: number;
	result_height: number;
}

export class ProposedExecutable
implements Omit<ExecutableInterface<ExecutableKinds>, 'result_address' | 'result_height'> {
	readonly executable_kind: ExecutableKinds = 'wasm';
	readonly birth_height: number = SmartWeave.block.height;
}

/* Possible:
type ProposedExecutable2 = Omit<ExecutableInterface, 'result_address' | 'result_height'>;

type CheckingExecutable2 = ProposedExecutable2 & {
	result_address: ArweaveAddress;
	result_height: number;
	checked: boolean;
};

type CheckedExecutable2 = CheckingExecutable2 & {
	checked: boolean;
};
*/

export class CheckingExecutable extends ProposedExecutable {
	checked = false;
}

export class CheckedExecutable extends CheckingExecutable {
	checked = true;
}

export type ExecutableType = CheckedExecutable | ProposedExecutable | CheckingExecutable;

interface KeyValue {
	[0]: ArweaveAddress;
	[1]: ExecutableType;
}

type GConstructor<T> = new (...args: any[]) => T;
export function filterExecutable<T extends GConstructor<ExecutableType>>(_: ExecutableHashMap, exec_type: T): ExecutableHashMap {
	return Object.fromEntries(
		Object.entries(_).filter((keyval: KeyValue) => keyval[1] instanceof exec_type)
	);
}

// Refactor into conditional types and a single function.
/* Refactor above!
export function filterUnexecuted(_: ExecutableHashMap): ExecutableHashMap {
	// Checks if result_address defined to infer type, maybe refactor?
	return Object.fromEntries(
		Object.entries(_).filter((keyval: KeyValue) => keyval[1] instanceof ProposedExecutable)
	);
}

export function filterExecuted(_: ExecutableHashMap): ExecutableHashMap {
	return Object.fromEntries(
		Object.entries(_).filter((keyval: KeyValue) => keyval[1] instanceof CheckedExecutable)
	);
}

export function filterChecking(_: ExecutableHashMap): ExecutableHashMap {
	return Object.fromEntries(
		Object.entries(_).filter((keyval: KeyValue) => keyval[1] instanceof CheckingExecutable)
	);
}
*/
