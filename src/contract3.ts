import {StateInterface,
	InputInterface,
	ArweaveAddress,
	GetFunctions,
	SetFunctions,
	ResultType
} from './interfaces';
import {isArweaveAddress} from './typeguards';
import {ProposedExecutable,
	CheckingExecutable,
	CheckedExecutable,
	filterExecutable} from './set-functions-interfaces';

declare const ContractError: any;

declare const SmartWeave: any;

class Action {
	public _input!: InputInterface;
	private _caller!: ArweaveAddress;

	constructor(_caller: string, _input: InputInterface) {
		this.caller = _caller;
		this.input = _input;
	}

	get caller(): ArweaveAddress {
		return this._caller;
	}

	set caller(addy: string) {
		if (isArweaveAddress(addy)) {
			this._caller = addy;
		} else {
			// TODO: report eslint bug.
			/* eslint-disable
			@typescript-eslint/restrict-template-expressions */
			throw new Error(`${addy} is not an arweave address`);
			/* eslint-enable
			@typescript-eslint/restrict-template-expressions */
		}
	}

	get input() {
		return this._input;
	}

	set input(inp: InputInterface) {
		this._input = inp;
	}
}

function handle(
	state: StateInterface,
	action: Action
): {state: StateInterface} | {result: ResultType} {
	switch (action.input.function) {
		case GetFunctions.unexecuted:
			return {result: filterExecutable(
				state.executables,
				ProposedExecutable
			)};
		case GetFunctions.checking:
			return {result: filterExecutable(
				state.executables,
				CheckingExecutable
			)};
		case GetFunctions.executed:
			return {result: filterExecutable(
				state.executables,
				CheckedExecutable
			)};
		case SetFunctions.add:
			if (typeof action.input.program_address !== 'string') {
				throw new TypeError('Program address must be defined');
			} else if (!isArweaveAddress(action.input.program_address)) {
				throw new TypeError('Program address must be arweave address');
			} else if (action.input.executable instanceof
				ProposedExecutable &&
				!state.executables[action.input.program_address]
			) {
				return Object.defineProperty(
					state.executables,
					action.input.program_address,
					action.input.executable
				);
			}

			throw new TypeError('no!');
		case SetFunctions.check:
			if (typeof action.input.program_address !== 'string') {
				throw new TypeError('Program address must be defined');
			} else if (!isArweaveAddress(action.input.program_address)) {
				throw new TypeError('Program address must be arweave address');
			} else if (action.input.executable instanceof
				CheckedExecutable &&
				state.executables[
					action.input.program_address
				] instanceof CheckingExecutable
			) {
				return Object.defineProperty(
					state.executables,
					action.input.program_address,
					action.input.executable
				);
			}

			throw new TypeError('no!');
		case SetFunctions.run:
			if (typeof action.input.program_address !== 'string') {
				throw new TypeError('Program address must be defined');
			} else if (!isArweaveAddress(action.input.program_address)) {
				throw new TypeError('Program address must be arweave address');
			} else if (action.input.executable instanceof
				CheckingExecutable &&
				state.executables[
					action.input.program_address
				] instanceof ProposedExecutable
			) {
				return Object.defineProperty(
					state.executables,
					action.input.program_address,
					action.input.executable
				);
			}

			throw new TypeError('no!');
		default:
			throw new Error('Invalid function call');
	}
}
