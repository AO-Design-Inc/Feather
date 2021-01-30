import {
	VaultInterface,
	AccountInterface,
	ArweaveAddress
} from './interfaces';

declare const ContractError: any;
declare const SmartWeave: any;

// So a transaction has two states
// vaulted and done.
// so when you make a transaction, it creates a vault.
// and when you *accept* a transaction, you consume a vault.
// so balance can take either address, vault or vault, address

export class Account {
	readonly value: AccountInterface;
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

	add_vault(vault: VaultInterface): void {
		if (this.adj_balance() < vault.amount) {
			throw new ContractError('not enough balance');
		}

		if (this.block_height < vault.start || this.block_height >= vault.end) {
			throw new ContractError('invalid block height');
		}

		this.value.vaults.push(vault);
	}

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

	increase_balance(amount: number): void {
		if (amount <= 0) {
			throw new ContractError('illegal amount');
		}

		this.value.balance += amount;
	}
}

// Monadic refactor for balances may be desirable.
export function balanceHandler(
	from_account: Account,
	to_account: Account,
	deduct: number
): [Account, Account] {
	from_account.remove_vault(deduct).deduct_balance();
	to_account.increase_balance(deduct);

	return [from_account, to_account];
}
