// THIS SHOULD DEFINE REQUIRED GLOBAL CONSTS, LIKE SMARTWEAVE.BLOCK.HEIGHT
// this thing needs to be a function cause smartweave might not be defined
// sometimes.

/* eslint-disable @typescript-eslint/prefer-literal-enum-member */

declare const SmartWeave: any;
enum Constants {
	A = 1,
	END_BLOCK = Number(SmartWeave.block.height) + 1000
}
