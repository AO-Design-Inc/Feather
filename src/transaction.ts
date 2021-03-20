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

function configurable(value: boolean) {
	return function (
		target: any,
		propertyKey: string,
		descriptor: PropertyDescriptor
	) {
		descriptor.configurable = value;
	};
}

function writable(value: boolean) {
	return function (
		target: any,
		propertyKey: string,
		descriptor: PropertyDescriptor
	) {
		descriptor.writable = value;
	};
}

// MAKE THE VAULTS A CLASS, WITH GETTER THAT CHECKS VALIDITY! THAT'LL CLEAN
// EVERYTHING UP SO MUCH
/** So a transaction has two states
 * vaulted and done.
 * so when you make a transaction, it creates a vault.
 * and when you *accept* a transaction, you consume a vault.
 * so balance can take either address, vault or vault, address
 */
export class Account {
	readonly value: AccountInterface | Required<AccountInterface>;
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

	// Only call this if you KNOW you're dealing with a validator
	burn(proportion: number) {
		this.value.stake = (this.value.stake ?? 0) * proportion;
	}

	get valid_vaults(): VaultInterface[] {
		return this.value.vaults.filter(
			(vault) =>
				vault.end >= this.block_height &&
				vault.start <= this.block_height
		);
	}

	/**
	 * @returns adjusted balance, ie, deducts all valid vaults.
	 */
	get balance(): number {
		/* eslint-disable unicorn/no-reduce */
		return this.value.vaults
			.filter(
				(vault) =>
					vault.end >= SmartWeave.block.height &&
					vault.start <= SmartWeave.block.height
			)
			.reduce(
				(acc: number, cur) => acc - cur.amount,
				this.value.balance
			);
		/* eslint-enable unicorn/no-reduce */
	}

	consume() {
		// Possibly make this a decorator in the future.
		Object.freeze(this);
		return this.value;
	}

	@configurable(false)
	@writable(false)
	get _value() {
		return this.value;
	}

	/**
	 *  An added vault serves as a method of escrow.
	 *  @param vault - adds a vault (a hold in this sense) to the account,
	 *  this vault serves as a guarantee of funds being in the account.
	 */
	add_vault(vault: VaultInterface): void {
		if (this.balance < vault.amount) {
			throw new ContractError('not enough balance');
		}

		if (
			this.block_height < vault.start ||
			this.block_height >= vault.end
		) {
			throw new ContractError('invalid block height');
		}

		this.value.vaults.push(vault);
	}

	/** Removes a vault from the account, this should permit a deduction
	 * from the balance. Be careful removing vaults without deducting
	 * balances because the function they're associated with may not then
	 * be able to complete!
	 * @returns Promise
	 */
	async remove_vault(amount: number): Promise<void> {
		return new Promise((resolve, reject) => {
			const amounts_array = this.valid_vaults.map(
				(item) => item.amount
			);
			if (amounts_array.includes(amount)) {
				this.value.balance -= amount;
				this.value.vaults = this.valid_vaults.splice(
					amounts_array.indexOf(amount)
				);
				resolve();
			} else {
				reject(new ContractError(`no vault of quantity ${amount}`));
			}
		});
	}

	/** Used to pay to an account, checks that amount is not illegal.
	 * presently not very happy with how this works, would be nice to have
	 * a way for this to be *sure* that the money is coming from an account
	 * that is valid.
	 * @param amount - amount to add to balance, checks that amount is > 0.
	 */
	increase_balance(from_account: Account, amount: number): void {
		from_account
			.remove_vault(amount)
			.then(() => {
				this.value.balance += amount;
			})
			.catch((error) => {
				throw error;
			});
	}
}
