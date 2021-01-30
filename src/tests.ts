import {ExecutableState, ProposedExecutable} from './executable';
import {SetFunctions, GetFunctions, ExecutableKinds, ProposedExecutableInput} from './interfaces';
import {StateInterface, ActionInterface, ContractHandlerOutput, handle} from './contract';

export const smartWeave: any = {
	block: {
		height: 32333
	}
};

eval(`global.SmartWeave = {
     block: {
	     height: 32432
     }
};`);

eval(`global.ContractError = Error`);

const init_state: StateInterface = {
	accounts: {
		initializer: {
			balance: 1000,
			vaults: []
		}
	},
	executables: {},
	ticker: 'FEA'
};

const inp: ProposedExecutableInput = {
	executable_address: 'BNttzDav3jHVnNiV7nYbQv-GY0HQ-4XXsdkE5K9ylHQ',
	executable_key: 'BNttzDav3jHVnNiV7nYbQv-GY0HQ-4XXsdkE5K9ylhQ',
	executable_kind: ExecutableKinds.wasm,
	function: SetFunctions.propose
};

const prop_exec_action: ActionInterface = {
	input: inp,
	caller: 'sdlkfnskl'
};


let newState = handle(init_state, prop_exec_action);


console.log(newState);

const get_prop_action: ActionInterface = {
	input: {
		function: GetFunctions.proposed
	},
	caller: 'sfasdfs'
};

export const isStateResult = (handler_out: ContractHandlerOutput):
	handler_out is { state: StateInterface } =>
	'state' in handler_out;


if (isStateResult(newState)) {
	newState = handle(newState.state, get_prop_action);
}

console.log(newState);

const a = new ExecutableState<ProposedExecutable>({
	executable: {
		executable_address: 'asfsd',
		executable_kind: ExecutableKinds.webgpu,
		birth_height: 2000
	},
	caller: 'asdfs',
	bids: [{quantity: 234, bidder: 'sdfs'}]
});
