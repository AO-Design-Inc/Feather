import {StateInterface,
	InputInterface,
	ArweaveAddress,
	GetFunctions,
	SetFunctions,
	InputType,
	ResultType
} from './interfaces';
import {InputHandler} from './typeguards';
import {ProposedExecutable,
	CheckingExecutable,
	CheckedExecutable,
	filterExecutable} from './set-functions-interfaces';

declare const ContractError: any;
declare const SmartWeave: any;

interface ActionInterface {
	input: InputType;
	caller: ArweaveAddress;
}

export function handle(
	state: StateInterface,
	action: ActionInterface
): {state: StateInterface} | {result: ResultType} {
	// Proxy used for all input validation
	const input = new Proxy(action.input, InputHandler);
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
			throw new ContractError('Invalid function call');
	}
}
