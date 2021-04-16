require('typescript.api').register();
import Arweave from 'arweave';
import assert from 'assert';
import * as fs from 'fs';
import {
	SetFunctions,
	StateInterface,
	ExecutableKinds
} from '../faces';

// Import {createContractExecutionEnvironment} from '../swglobal/contract-load';
import {SmartWeaveGlobal} from '../swglobal/smartweave-global';
import {handle} from '../contract';

const state: StateInterface = JSON.parse(
	fs.readFileSync('./src/__tests__/init_state.json', 'utf8')
);
/*
Async function main(): Promise<void> {
	const arweave = Arweave.init({
		host: '127.0.0.1',
		port: 1984,
		protocol: 'http'
	});

	const {handler, swGlobal} = createContractExecutionEnvironment(arweave, handle.toString(), 'ewXd9NMeSSIhun88SaRjpH2mjNCHkTTMcm86R6tAzwQ');
	const key = await arweave.wallets.generate();

	// Plain text
	const transactionA = await arweave.createTransaction({
		data: '<html><head><meta charset="UTF-8"><title>Hello world!</title></head><body></body></html>'
	}, key);

	// Buffer
	const transactionB = await arweave.createTransaction({
		data: Buffer.from('Some data', 'utf8')
	}, key);


	console.log(transactionA);
	console.log(transactionB);
	console.log(handle);
	console.log(handler);
	console.log(swGlobal);
	console.log(state);
}
*/

declare global {
	namespace NodeJS {
		interface Global {
			ContractError: any;
			ContractAssert: any;
			SmartWeave: any;
			_activeTx: any;
		}
	}
}

const arweave = Arweave.init({
	host: 'arweave.net',
	protocol: 'https',
	port: 443
});

global.ContractError = Error;
global.ContractAssert = assert;
global.SmartWeave = new SmartWeaveGlobal(arweave, {
	id: 'bYz5YKzHH97983nS8UWtqjrlhBHekyy-kvHt_eBxBBY'
});
global.SmartWeave._activeTx = {
	id: 'commie',
	info: {
		confirmed: {
			block_height: 69
		}
	}
};

/*
Const {handler, swGlobal} = createContractExecutionEnvironment(arweave, handle.toString(), 'ewXd9NMeSSIhun88SaRjpH2mjNCHkTTMcm86R6tAzwQ');

swGlobal;
*/

test('adds 1 + 2 to equal 3', () => {
	expect(1 + 2).toBe(3);
});

const addresses = {
	admin: 'regulator',
	user: 'Pq6OBljxlpypNuE0O1eL92Kr9U1Ok4USfcc0aJcUAzs',
	nonuser: 'DfCXDjdxcTIg1-FQDZ5jDclk1shKIpMlshe0IXodApc'
};

const isStateExtender = (obj: any) : obj is {state: StateInterface} => typeof obj.state !== 'undefined';

	
it(`should transfer from ${addresses.admin} to ${addresses.user}`, async () => {
	const newState = await handle(state, {
		input: {
			function: SetFunctions.propose,
			executable_address:
				'Pq6OBljxlpypNuE0O1eL92Kr9U1Ok4USfcc0aJcUAzs',
			executable_kind: ExecutableKinds.wasm,
			max_cost: 10
		},
		caller: addresses.admin
	});

	console.log(newState);

	if (isStateExtender(newState)) {
		expect(newState.state.ticker === 'FEA')
	}

	expect(Object.keys(state.accounts).length).toBe(3);
	// expect(state.accounts[addresses.admin]).toBe(9999000);
	// expect(state.accounts[addresses.user]).toBe(1000);
});
