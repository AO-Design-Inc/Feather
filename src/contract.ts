/**
 * Main contract file, entry point for bundling.
 * Defines {@link handle}, as required by smartweave.
 * @packageDocumentation
 */
/* eslint new-cap: 0 */
declare const ContractError: any;
declare const SmartWeave: any;
import {Account} from './transaction';
declare const ContractAssert: <T extends boolean>(
	cond: T,
	message: string
) => asserts cond;
import {
	ArweaveAddress,
	AccountInterface,
	ProposedExecutableInputProxy,
	BidInputProxy,
	BidInput,
	ResultInput,
	ResultInputProxy,
	ValidationLockInput,
	ValidationLockInputProxy,
	ValidationReleaseInput,
	ValidationReleaseInputProxy,
	ActionInterface,
	StateInterface,
	ContractHandlerOutput
} from './interfaces';
import {
	ProposedExecutable,
	ProposedState,
	AcceptedState,
	proposedToAccepted,
	ValidatedExecutable,
	ResultExecutable
} from './executable';
import {
	START_BLOCK,
	END_BLOCK,
	PROPORTION_OF_TOTAL_STAKE_FOR_EXECUTION,
	PROPORTION_OF_PRICE_FOR_UPLOADERS_BONUS
} from './constants';

import {isOfDiscriminatedType} from './utils';

function getValidators(
	state: StateInterface
): Record<ArweaveAddress, Required<AccountInterface>> {
	return Object.fromEntries(
		Object.entries(state.accounts).filter(
			(value) => typeof value[1].stake !== 'undefined'
		)
	) as Record<ArweaveAddress, Required<AccountInterface>>;
}

/*
 * A user proposes a function using SetFunctions.propose,
 * this creates a ProposedExecutable,
 * an executor can submit bids on this executable using SetFunctions.bid
 * user then accepts and pays into escrow using SetFunctions.accept
 * selected executor then uploads result
 * user then validates result or objects to it
 */

/**
 * handle takes in a state and and a contract interaction and returns either a
 * new state or a result (for now just list of pending proposed executables).
 * Uses Proxy for inputs to conduct first level typechecking.
 * Then, the ExecutableState class is used to enforce further rules.
 * The Account class implements escrow functionality and safe transactions.
 *
 * @param  state - Present state of smart contract.
 * @param  action - The contract interaction.
 * @throws ContractError is thrown if any illegal state is
 * seen or if any inputs are of the wrong type.
 * @returns new state or result.
 */
export async function handle(
	state: StateInterface,
	action: ActionInterface
): Promise<ContractHandlerOutput> {
	switch (action.input.function) {
		// Process proposing new executable.
		case 'propose': {
			const inputProxy = new Proxy(
				action.input,
				ProposedExecutableInputProxy
			);

			/** Semi-monadic architecture on ExecutableState, use
			 * .next to get to next state of executable, read
			 * {@link ExecutableState} documentation for further
			 * clarification.
			 */

			const proposer_account = new Account(
				state.accounts,
				action.caller
			);
			proposer_account.add_vault({
				amount:
					inputProxy.max_cost! +
					PROPORTION_OF_PRICE_FOR_UPLOADERS_BONUS *
						inputProxy.max_cost!,
				start: START_BLOCK(),
				end: END_BLOCK()
			});
			const proposed_exec = new ProposedState({
				_discriminator: 'proposed',
				// This needs to be type annotated as
				// typescript doesn't catch the type narrowing in
				// the proxy. an alternate way to get around
				// this would be to set this as number in the
				// interface even though it *can be undefined*
				// and do the typeguard anyway, but that makes
				// the interface a lot less clear.
				start_cost: inputProxy.start_cost!,
				max_cost: inputProxy.max_cost!,
				bids: [],
				caller: action.caller,
				executable: {
					birth_height: SmartWeave.block.height,
					executable_address: inputProxy.executable_address,
					executable_kind: inputProxy.executable_kind
				}
			});

			state.executables[SmartWeave.transaction.id] =
				proposed_exec.value;

			return {state};
		}

		/** Process bids on executable, this case checks to make sure
		 * that the bid is under the value of the current max price,
		 * which is given by a straight line increasing from min price.
		 */
		case 'bid': {
			const inputProxy: BidInput = new Proxy(
				action.input,
				BidInputProxy
			);
			const ref_exec =
				state.executables[inputProxy.executable_key] ?? undefined;

			ContractAssert(
				typeof ref_exec !== 'undefined',
				'referenced executable does not exist'
			);

			const bidder = state.accounts[action.caller] ?? undefined;

			ContractAssert(
				typeof bidder !== 'undefined',
				'caller does not have an account'
			);

			const proposed_exec = new ProposedState(ref_exec);
			/* If bid is pushed while over current price, then
			 * a transaction fee is attached to the bid and sent to
			 * the regulator account */

			ContractAssert(
				typeof bidder.stake !== 'undefined',
				'bidder is not an executor'
			);

			proposed_exec.value.bids.push({
				bidder: action.caller,
				quantity: inputProxy.quantity,
				birth_height: START_BLOCK()
			});

			/* If bid is over reserve price it is just invalid,
			 * should be checked in proxy */

			/* If bid is timed such that it is under current price,
			 * no fee is charged, and a bid under the current price
			 * is picked randomly with weightage toward lower bids */

			/* Arweave fee is paid by user through some sort of
			 * ar representation eventually */

			const TOTAL_STAKE = Object.entries(state.accounts).reduce(
				(acc: number, cur) => acc + cur[1].stake!,
				0
			);

			const validators = new Set(
				proposed_exec.activeBids.map(
					(_) =>
						[_.bidder, state.accounts[_.bidder]] as [
							string,
							Required<AccountInterface>
						]
				)
			);

			const propToAcc = proposedToAccepted(validators);
			const next_exec =
				proposed_exec.activeBids.reduce(
					(acc: number, cur) =>
						acc + state.accounts[cur.bidder].stake!,
					0
				) >=
				PROPORTION_OF_TOTAL_STAKE_FOR_EXECUTION * TOTAL_STAKE
					? proposed_exec.next(propToAcc)
					: proposed_exec;

			state.executables[
				inputProxy.executable_key
			] = next_exec.consume();

			return {state};
		}

		/*
		Case 'accept': {
			const inputProxy: AcceptedBidInput = new Proxy(
				action.input,
				AcceptedBidInputProxy
			);
			const ref_exec =
				state.executables[inputProxy.executable_key] ?? undefined;

			ContractAssert(
				ref_exec?.caller === action.caller,
				`${action.caller} is not creator of proposal`
			);

			const proposed_exec = new ProposedState(ref_exec);
			const accepted_exec = proposed_exec.next(
				proposedToAccepted(inputProxy)
			);

			const accepter_account = new Account(
				state.accounts,
				ref_exec.caller
			);
			accepter_account.add_vault({
				amount: inputProxy.accepted_bid.quantity,
				start: SmartWeave.block.height,
				end: SmartWeave.block.height + 1000
			});

			state.executables[inputProxy.executable_key] =
				accepted_exec.value;
			state.accounts[ref_exec.caller] = accepter_account.value;
			return {state};
		}
		*/

		// Adds result to AcceptedExecutable from winning bidder,
		// pays out money to them.
		// also sends stuff to validation part of contract.
		case 'result': {
			const inputProxy: ResultInput = new Proxy(
				action.input,
				ResultInputProxy
			);
			const ref_exec = state.executables[
				inputProxy.executable_key
			] as ValidatedExecutable;

			ContractAssert(
				ref_exec.result_giver === action.caller,
				'result not made by winning bidder!'
			);

			/** {@link Account | Account class} used to
			 * safely encapsulate all
			 * transaction methods and ideas. Read the
			 * documentation of the Account class for further
			 * clarification.
			 *const result_giver_account = new Account(
			 *	state.accounts,
			 *	action.caller
			 *);
			 */

			const result_exec: ResultExecutable = {
				...ref_exec,
				result: {
					address: inputProxy.result_address,
					height: START_BLOCK(),
					giver: action.caller
				},
				_discriminator: 'result'
			};

			/*
			Const result_exec = accepted_exec.next(
				acceptedToResult(
					inputProxy,
					action.caller,
					new Set(Object.entries(validators)),
					state.accounts
				)
			);
			*/

			// Validate!
			// Wait... There is no result executable, it IS the
			// validating executable.

			state.executables[inputProxy.executable_key] = result_exec;
			return {state};
		}

		/*
		Case 'validate_bid': {
			const inputProxy: ValidationBidInput = new Proxy(
				action.input,
				ValidationBidInputProxy
			);

			const ref_exec = state.executables[inputProxy.executable_key];
			const result_exec = new ResultState;
			return {state};
		}
		*/

		case 'validate_lock': {
			const inputProxy: ValidationLockInput = new Proxy(
				action.input,
				ValidationLockInputProxy
			);
			const ref_exec = state.executables[inputProxy.executable_key];
			const result_exec = new AcceptedState(ref_exec);

			// With Linked list we do this instead.

			const matched_validation_index = result_exec.validation_tail.findIndex(
				(_) =>
					_.value.validator === action.caller &&
					_.value._discriminator === 'announce'
			);

			ContractAssert(
				matched_validation_index !== -1,
				'no matching validation!'
			);

			result_exec.lock_validation(
				matched_validation_index,
				inputProxy
			);

			state.executables[
				inputProxy.executable_key
			] = result_exec.consume();

			return {state};
		}

		case 'validate_release': {
			const inputProxy: ValidationReleaseInput = new Proxy(
				action.input,
				ValidationReleaseInputProxy
			);

			const ref_exec = state.executables[inputProxy.executable_key];
			const result_exec = new AcceptedState(ref_exec);

			if (
				!result_exec.validation_tail.every(
					(_) => _.value._discriminator !== 'announce'
				)
			)
				throw new ContractError('entire vll is not locked');

			const matched_validation_index = result_exec.validation_tail.findIndex(
				(value) =>
					value.value.validator === action.caller &&
					value.value._discriminator === 'lock'
			);

			ContractAssert(
				matched_validation_index !== -1,
				'no matching validation!'
			);

			result_exec.release_validation(
				matched_validation_index,
				inputProxy
			);

			try {
				const next_exec = result_exec.check_fully_released()
					? await result_exec.branch(
							getValidators(state),
							state.accounts
					  )
					: result_exec;
				state.executables[
					inputProxy.executable_key
				] = next_exec.consume();

				return {state};
			} catch (error: unknown) {
				throw error;
			}
		}

		// Filters out list of executables in proposed state so
		// executors know what to bid on.
		case 'proposed':
			return {
				result: Object.entries(state.executables).filter((keyval) =>
					isOfDiscriminatedType<ProposedExecutable>(
						keyval[1],
						'proposed'
					)
				)
			};

		default:
			throw new ContractError('Invalid function call');
	}
}
