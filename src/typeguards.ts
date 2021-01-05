import {ArweaveAddress, InputInterface} from './interfaces';
export const isArweaveAddress = (addy: string): addy is ArweaveAddress =>
	/[\w-]{43}/i.test(addy);

// RIGHT, the best option here is clean slate refactor, im just being dumb.
// let programaddress be undef if querying everything else it's arweaveaddress
