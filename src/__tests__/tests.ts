import Arweave from 'arweave';
import * as fs from 'fs';
import {StateInterface} from '../interfaces';
import {createContractExecutionEnvironment} from '../swglobal/contract-load';

const arweave = Arweave.init({
	host: '127.0.0.1',
	port: 1984,
	protocol: 'http'
});
import {handle} from '../contract';

const state: StateInterface = JSON.parse(fs.readFileSync('./init_state.json', 'utf8'));

const {handler, swGlobal} = createContractExecutionEnvironment(arweave, handle.toString(), 'bYz5YKzHH97983nS8UWtqjrlhBHekyy-kvHt_eBxBBY');
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
