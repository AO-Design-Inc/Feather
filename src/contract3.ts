import {StateInterface,
	InputInterface,
	ArweaveAddress,
	GetFunctions,
	SetFunctions,
	InputType,
	ResultType,
	SetFunctionInput,
	GetFunctionInput
} from './interfaces';
import {isArweaveAddress, InputHandler} from './typeguards';
import {ProposedExecutable,
	CheckingExecutable,
	CheckedExecutable,
	filterExecutable} from './set-functions-interfaces';

declare const ContractError: Error;

declare const SmartWeave: any;

interface ActionInterface {
	input: InputType;
	caller: ArweaveAddress;
}

/*
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
			throw new Error(`${addy} is not an arweave address`);
		}
	}

	get input() {
		return this._input;
	}

	set input(inp: InputInterface) {
		this._input = inp;
	}
}
*/

/* Hm:
get(target: InputInterface, p: string) {
	return p ===
}
*/

function handle(
	state: StateInterface,
	action: ActionInterface
): {state: StateInterface} | {result: ResultType} {
	let input = new Proxy ( action.input, InputHandler );
	switch (input.function) {
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
			return Object.defineProperty(
				state.executables,
				input.program_address,
				input.executable
			);
		case SetFunctions.check:
			return Object.defineProperty(
				state.executables,
				input.program_address,
				input.executable
			);
		case SetFunctions.run:
			return Object.defineProperty(
				state.executables,
				input.program_address,
				input.executable
			);
		default:
			throw new Error('Invalid function call');
	}
}
