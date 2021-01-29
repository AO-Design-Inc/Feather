import {ArweaveAddress, InputType, SetFunctionInput} from './interfaces';
import {
	ExecutableType,
	CheckedExecutable,
	ExecutableInterface,
	ProposedExecutable,
	CheckingExecutable,
	ExecutableKinds
} from './set-functions-interfaces';

declare const ContractError: any;

export const isArweaveAddress = (addy: string): addy is ArweaveAddress =>
	/[\w-]{43}/i.test(addy);
export const isCheckingExecutable = (
	target: ExecutableType
): target is CheckingExecutable => 'checked' in target && !target.checked;
export const isProposedExecutable = (target: ExecutableType):
	target is ProposedExecutable =>
	'result_address' in target;
export const isCheckedExecutable = (target: ExecutableType):
	target is CheckedExecutable =>
	'checked' in target && target.checked;
const isNumber = (x: any): x is number =>
	typeof x === 'number';
const isExecutableKind = (exec_kind: string):
	exec_kind is ExecutableKinds =>
	exec_kind in ExecutableKinds;
/* NOTE: report typescript bug with never type given intersections! */

export const ExecutableHandler: ProxyHandler<ExecutableType> = {
	get(target: ExecutableType, p: keyof ExecutableInterface) {
		if (isProposedExecutable(target)) {
			switch (p) {
				case 'birth_height':
					if (isNumber(target.birth_height)) {
						return target.birth_height;
					}

					throw new ContractError('asdf');
				case 'executable_kind':
					if (isExecutableKind(
						target.executable_kind
					)) {
						return target.executable_kind;
					}

					throw new ContractError('sdfs');
				case 'quantity':
					if (isNumber(target.quantity)) {
						return target.quantity;
					}

					throw new ContractError('sfs');
				default:
					throw new ContractError('invalid!');
			}
		} else if (isCheckingExecutable(target)) {
			switch (p) {
				case 'checked':
					if (!target.checked) {
						return target.checked;
					}

					throw new ContractError('nein!');
				case 'result_address':
					if (isArweaveAddress(
						target.result_address)) {
						return target.result_address;
					}

					throw new ContractError('no! result!');
				case 'result_height':
					if (isNumber(target.result_height)) {
						return target.result_height;
					}

					throw new ContractError('hahahaha');
				default:
					throw new ContractError(
						'Invalid request');
			}
		} else if (isCheckedExecutable(target)) {
			switch (p) {
				case 'checked':
					if (target.checked) {
						return target.checked;
					}

					throw new ContractError('hn');
				default:
					throw new ContractError('hm');
			}
		}
	}
};

export const InputHandler: ProxyHandler<InputType> = {
	get(target, p: keyof InputType) {
		if (target instanceof SetFunctionInput) {
			switch (p) {
				case 'executable':
					return new Proxy(
						target.executable,
						ExecutableHandler);
				case 'function':
					return target.function;
				case 'program_address':
					if (isArweaveAddress(
						target.program_address)) {
						return target.program_address;
					}

					throw new ContractError('lol!');
				default:
					throw new
					ContractError('Invalid property');
			}
		}
	}
};
