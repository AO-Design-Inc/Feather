declare const ContractError: any;
declare const SmartWeave: any;
import {balanceHandler, Account} from './transaction';
import {
	ArweaveAddress,
	VaultInterface,
	AccountInterface,
	InputType,
	ProposedExecutableInputProxy,
	ProposedExecutableInput,
	BidInputProxy,
	BidInput,
	AcceptedBidInput,
	AcceptedBidInputProxy,
	ResultInput,
	ResultInputProxy,
	ValidationInput,
	ValidationInputProxy
} from './interfaces';
import {
	ExecutableStates,
	isProposedExecutable,
	isAcceptedExecutable,
	isResultExecutable,
	ExecutableState,
	proposedToAccepted,
	acceptedToResult,
	resultToValidated
} from './executable';

// REMODEL VAULTS WITH THE BALANCE PUSH ARRAY MODEL!
/*
 * A user proposes a function using SetFunctions.propose,
 * this creates a ProposedExecutable,
 * an executor can submit bids on this executable using SetFunctions.bid
 * user then accepts and pays into escrow using SetFunctions.accept
 * selected executor then uploads result
 * user then validates result or objects to it
 */
interface ActionInterface {
	input: InputType;
	caller: ArweaveAddress;
}

interface StateInterface {
	executables: Record<ArweaveAddress, ExecutableStates>;
	balances: Record<ArweaveAddress, number>;
	vault: Record<ArweaveAddress, VaultInterface[]>;
	accounts: Record<ArweaveAddress, AccountInterface>;
	ticker: 'FEA';
}

type ResultInterface = any;

type ContractHandlerOutput =
	| {state: StateInterface}
	| {result: ResultInterface};

/* Terrible
const getVaultBalanceKeyValue = (
	state: StateInterface
): Record<ArweaveAddress, number> => {
	return Object.fromEntries(
		Object.keys(state.vault).map((key, _) => [key, state.vault.key.balance])
	);
};
*/

export function handle(
	state: StateInterface,
	action: ActionInterface
): ContractHandlerOutput | Promise<ContractHandlerOutput> {
	const blockHeight: number = SmartWeave.block.height;
	switch (action.input.function) {
		case 'propose': {
			const inputProxy: ProposedExecutableInput = new Proxy(
				action.input,
				ProposedExecutableInputProxy
			);
			const proposed_exec = new ExecutableState({
				bids: [],
				caller: action.caller,
				executable: {
					birth_height: blockHeight,
					executable_address: inputProxy.executable_address,
					executable_kind: inputProxy.executable_kind
				}
			});
			if (inputProxy.executable_key in Object.keys(state.executables)) {
				throw new ContractError(
					`the executable key 
					${String(inputProxy.executable_key)}
					already exists`
				);
			} else {
				state.executables[inputProxy.executable_key] = proposed_exec.value;
			}

			return {state};
		}

		case 'bid': {
			const inputProxy: BidInput = new Proxy(action.input, BidInputProxy);
			const ref_exec = state.executables[inputProxy.executable_key];
			if (isProposedExecutable(ref_exec)) {
				ref_exec.bids.push({
					bidder: action.caller,
					quantity: inputProxy.quantity
				});
			}

			throw new ContractError(`Referred executable 
				${String(inputProxy.executable_key)}
				is not in proposed state`);
		}

		case 'accept': {
			const inputProxy: AcceptedBidInput = new Proxy(
				action.input,
				AcceptedBidInputProxy
			);
			const ref_exec: ExecutableStates =
				state.executables[inputProxy.executable_key];
			if (!isProposedExecutable(ref_exec)) {
				throw new ContractError(`referred executable 
					${inputProxy.executable_key}
					not in proposed state`);
			}

			if (ref_exec.caller !== action.caller) {
				throw new ContractError(`${action.caller}
					is not creator of proposal`);
			}

			const proposed_exec = new ExecutableState(ref_exec);
			const accepted_exec = proposed_exec.next(proposedToAccepted(inputProxy));

			const accepter_account = new Account(state.accounts, ref_exec.caller);
			accepter_account.add_vault({
				amount: inputProxy.accepted_bid.quantity,
				start: blockHeight,
				end: blockHeight + 1000
			});

			state.executables[inputProxy.executable_key] = accepted_exec.value;
			state.accounts[ref_exec.caller] = accepter_account.value;
			return {state};
		}

		case 'result': {
			const inputProxy: ResultInput = new Proxy(action.input, ResultInputProxy);
			const ref_exec: ExecutableStates =
				state.executables[inputProxy.executable_key];
			if (!isAcceptedExecutable(ref_exec)) {
				throw new ContractError(`referred executable 
					${inputProxy.executable_key}
					not in accepted state`);
			}

			if (ref_exec.accepted_bid.bidder !== action.caller) {
				throw new ContractError(`result not made by
							winning bidder`);
			}

			const accepted_exec = new ExecutableState(ref_exec);
			const result_exec = accepted_exec.next(
				acceptedToResult(inputProxy, action.caller)
			);

			let result_giver_account = new Account(state.accounts, action.caller);
			let accepter_account = new Account(state.accounts, ref_exec.caller);
			[accepter_account, result_giver_account] = balanceHandler(
				accepter_account,
				result_giver_account,
				ref_exec.accepted_bid.quantity
			);

			state.accounts[ref_exec.caller] = accepter_account.value;
			state.accounts[action.caller] = result_giver_account.value;
			state.executables[inputProxy.executable_key] = result_exec.value;
			return {state};
		}

		case 'validate': {
			const inputProxy: ValidationInput = new Proxy(
				action.input,
				ValidationInputProxy
			);

			const ref_exec: ExecutableStates =
				state.executables[inputProxy.executable_key];
			if (!isResultExecutable(ref_exec)) {
				throw new ContractError(`referred executable
					${inputProxy.executable_key}
					not in result state`);
			}

			if (ref_exec.caller !== action.caller) {
				throw new ContractError(`referred executable
					${inputProxy.executable_key}
					has caller ${ref_exec.caller}
					not the same as current caller
					${action.caller}`);
			}

			const result_exec = new ExecutableState(ref_exec);
			const validated_exec = result_exec.next(resultToValidated(inputProxy));

			state.executables[inputProxy.executable_key] = validated_exec.value;
			return {state};
		}

		case 'proposed':
			return {
				result: Object.entries(state.executables).filter((keyval) =>
					isProposedExecutable(keyval[1])
				)
			};

		default:
			throw new ContractError('Invalid function call');
	}
}

/* Possible future refactor for stuff in the cases,
 * currently not particularly DRY
function checkExecutable<T extends ExecutableStates>(
	state: StateInterface,
	executable_key: ArweaveAddress,
	executable_state?: ExecutableStates
) : {
	if (executable_state) {
		return
*/

// Two possible refactors
// one is Proxy with closure for state
// second is ExecutableState being saved directly into state instead
// of instances of the interfaces
