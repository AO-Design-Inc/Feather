// THIS SHOULD DEFINE REQUIRED GLOBAL CONSTS, LIKE SMARTWEAVE.BLOCK.HEIGHT
// this thing needs to be a function cause smartweave might not be defined
// sometimes.

declare const SmartWeave: any;
export const START_BLOCK = () => Number(SmartWeave.block.height);
export const END_BLOCK = () => START_BLOCK() + 1000;
export const EXECUTION_COST = (
	start_height: number,
	start_cost: number
) => start_cost + (START_BLOCK() - start_height) * 10;
export const PRICE_INCREASE_PER_BLOCK = 1;
export const DEFAULT_MAX_PRICE = 100;
export const PROPORTION_OF_TOTAL_STAKE_FOR_EXECUTION = 0.3;
export const PROPORTION_OF_PRICE_FOR_UPLOADERS_BONUS = 0.01;
export const MIN_BAL_FOR_PROPOSAL = 0;
export const MIN_BAL_FOR_BIDDING = 0;
export const MIN_BAL_FOR_STAKING = 0;
export const STAKE_FOR_BIDDING = (bid_amount: number) =>
	0.01 * bid_amount;
export const TRANSACTION_FEE = (transaction_amount: number) =>
	0.1 * transaction_amount;
export const NUMBER_OF_VALIDATORS_PER_VALIDATION = 2;
export const VALIDATOR_REWARD = (bid_amount: number) =>
	TRANSACTION_FEE(bid_amount) / NUMBER_OF_VALIDATORS_PER_VALIDATION;
// Fees specified as parts out of 1.
