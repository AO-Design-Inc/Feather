import {ExecutableHashMap, ExecutableType} from './set-functions-interfaces';
export type ArweaveAddress = string;

export type ResultType = ExecutableHashMap;

export interface StateInterface {
	executables: ExecutableHashMap;
}

/* Test:
export interface InputInterface {
	function: GetFunctions | SetFunctions;
	executable: ExecutableType;
	program_address?: ArweaveAddress;
}
*/

// There HAS to be a better refactor with conditional types here
export interface InputInterface {
	function: GetFunctions | SetFunctions;
	executable: ExecutableType;
	program_address?: ArweaveAddress;
}

// Classes defined for declaration merging purposes.
export class GetFunctionInput {}
export interface GetFunctionInput extends Partial<InputInterface> {
	function: GetFunctions;
}

export interface SetFunctionInput extends InputInterface {
	function: SetFunctions;
	executable: ExecutableType;
	program_address: ArweaveAddress;
}
export class SetFunctionInput {}

export type InputType = GetFunctionInput | SetFunctionInput;
export enum GetFunctions {
	unexecuted = 'unexecuted',

	executed = 'executed',

	checking = 'checking'
}

export enum SetFunctions {
	add = 'add',

	run = 'run',

	check = 'check'
}
