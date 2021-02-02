/**
 * {@link Account} defined here, used for validation of accounts in the
 * contract via its constructor.
 * @packageDocumentation
 */
import {
	VaultInterface,
	AccountInterface,
	ArweaveAddress
} from './interfaces';

declare const ContractError: any;
declare const SmartWeave: any;

/** So a transaction has two states
 * vaulted and done.
 * so when you make a transaction, it creates a vault.
 * and when you *accept* a transaction, you consume a vault.
 * so balance can take either address, vault or vault, address
 */
export class Account {
	readonly value: AccountInterface;
	/** Haven't fully decided between camelCase and underscore_case */
	private readonly block_height: number;

	constructor(
		accounts: Record<ArweaveAddress, AccountInterface>,
		account_address: ArweaveAddress
	) {
		if (typeof accounts[account_address] === 'undefined') {
			accounts[account_address] = {
				balance: 0,
				vaults: []
			};
		}

		this.value = accounts[account_address];
		this.block_height = SmartWeave.block.height;
	}

	/**
	 * @returns adjusted balance, ie, deducts all valid vaults.
	 */
	adj_balance(): number {
		/* eslint-disable unicorn/no-reduce */
		return this.value.vaults
			.filter(
				vault =>
					vault.end >= SmartWeave.block.height &&
					vault.start <= SmartWeave.block.height
			)
			.reduce((acc: number, cur) => acc - cur.amount, this.value.balance);
		/* eslint-enable unicorn/no-reduce */
	}

	/**
	 *  An added vault serves as a method of escrow.
	 *  @param vault - adds a vault (a hold in this sense) to the account,
	 *  this vault serves as a guarantee of funds being in the account.
	 */
	add_vault(vault: VaultInterface): void {
		if (this.adj_balance() < vault.amount) {
			throw new ContractError('not enough balance');
		}

		if (this.block_height < vault.start || this.block_height >= vault.end) {
			throw new ContractError('invalid block height');
		}

		this.value.vaults.push(vault);
	}

	/** Removes a vault from the account, this should permit a deduction
	 * from the balance. Be careful removing vaults without deducting
	 * balances because the function they're associated with may not then
	 * be able to complete!
	 * @returns Object with a method to deduct balance of amount of vault
	 * removed.
	 */
	remove_vault(amount: number): {deduct_balance: () => void} {
		const amounts_array = this.value.vaults.map(item => item.amount);
		if (!(amounts_array.includes(amount))) {
			throw new ContractError(`no vault of quantity ${amount}`);
		}

		this.value.vaults.splice(amounts_array.indexOf(amount), 1);
		return {
			deduct_balance: (): void => {
				this.value.balance -= amount;
			}
		};
	}

	/** Used to pay to an account, checks that amount is not illegal.
	 * presently not very happy with how this works, would be nice to have
	 * a way for this to be *sure* that the money is coming from an account
	 * that is valid.
	 * @param amount - amount to add to balance, checks that amount is > 0.
	 */
	increase_balance(amount: number): void {
		if (amount <= 0) {
			throw new ContractError('illegal amount');
		}

		this.value.balance += amount;
	}
}

/**
 * Used to send feathers from one account to another account, ensures that
 * from account has money by using @link{Account.remove_vault}. A refactor here
 * that makes it clearer that money MUST go out from from_account and to
 * to_account would be desirable.
 *
 * @param from_account - Account that feathers come from.
 * @param to_account - Account that feathers go to.
 * @param deduct - Amount that is deducted from from_account and sent to
 * to_account.
 * @returns tuple with modified (from_account, to_account).
 */
export function balanceHandler(
	from_account: Account,
	to_account: Account,
	deduct: number
): [Account, Account] {
	from_account.remove_vault(deduct).deduct_balance();
	to_account.increase_balance(deduct);

	return [from_account, to_account];
}
