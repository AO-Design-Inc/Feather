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
) => T extends true ? string : never;
import {
	ArweaveAddress,
	AccountInterface,
	ProposedExecutableInputProxy,
	ProposedExecutableInput,
	BidInputProxy,
	BidInput,
	AcceptedBidInput,
	AcceptedBidInputProxy,
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
	ExecutableStates,
	ProposedExecutable,
	AcceptedExecutable,
	ProposedState,
	AcceptedState,
	ResultState,
	ValidatedState,
	ValidationStates,
	proposedToAccepted,
	acceptedToResult
} from './executable';
import {
	ValidationAnnounceState,
	ValidationLockState,
	ValidationReleaseState,
	validationAnnouncedToLocked,
	validationLockedToReleased
} from './validate';

import {
	isOfDiscriminatedType,
	lastElementArray,
	lastElementArrayIndex
} from './utils';

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
			const inputProxy: ProposedExecutableInput = new Proxy(
				action.input,
				ProposedExecutableInputProxy
			);

			/** Semi-monadic architecture on ExecutableState, use
			 * .next to get to next state of executable, read
			 * {@link ExecutableState} documentation for further
			 * clarification.
			 */
			const proposed_exec = new ProposedState({
				_discriminator: 'proposed',
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

			/** There should be a hash func from blockheight
			 * and input hash to give exec key, don't make user pass it
			 * bruh just take the transaction id, you idiot.
			 */
			return {state};
		}

		// Process a bid on an executable.
		case 'bid': {
			const inputProxy: BidInput = new Proxy(
				action.input,
				BidInputProxy
			);
			const ref_exec = new ProposedState(
				state.executables[inputProxy.executable_key]
			);
			ref_exec.value.bids.push({
				bidder: action.caller,
				quantity: inputProxy.quantity
			});

			state.executables[inputProxy.executable_key] = ref_exec.value;
			return {state};
		}

		// Lets user who proposed executable accept a bid on an
		// executable.
		case 'accept': {
			const inputProxy: AcceptedBidInput = new Proxy(
				action.input,
				AcceptedBidInputProxy
			);
			const ref_exec = state.executables[inputProxy.executable_key];

			ContractAssert(
				ref_exec.caller === action.caller,
				`${action.caller} is not creator of proposal`
			);

			const proposed_exec = new ProposedState(ref_exec);
			const accepted_exec = proposed_exec.next(
				proposedToAccepted(inputProxy)
			);

			/** {@link Account | Account class} used to
			 * safely encapsulate all
			 * transaction methods and ideas. Read the
			 * documentation of the Account class for further
			 * clarification.
			 */
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

		// Adds result to AcceptedExecutable from winning bidder,
		// pays out money to them.
		// also sends stuff to validation part of contract.
		case 'result': {
			const inputProxy: ResultInput = new Proxy(
				action.input,
				ResultInputProxy
			);
			const ref_exec = state.executables[inputProxy.executable_key];

			// This right here is a code smell, I should probably
			// make the monad bois just take present state and
			// input so I dont have to do this weird dance
			const accepted_exec = new AcceptedState(ref_exec);

			ContractAssert(
				accepted_exec.accepted_bid.bidder === action.caller,
				'result not made by winning bidder!'
			);

			const validators = getValidators(state);

			const result_giver_account = new Account(
				state.accounts,
				action.caller
			);

			accepted_exec.post_collateral(result_giver_account);

			const result_exec = accepted_exec.next(
				acceptedToResult(
					inputProxy,
					action.caller,
					new Set(Object.entries(validators)),
					state.accounts
				)
			);

			// Validate!
			// Wait... There is no result executable, it IS the
			// validating executable.

			state.executables[
				inputProxy.executable_key
			] = result_exec.consume();
			return {state};
		}

		case 'validate_lock': {
			const inputProxy: ValidationLockInput = new Proxy(
				action.input,
				ValidationLockInputProxy
			);
			const ref_exec = state.executables[inputProxy.executable_key];
			const result_exec = new ResultState(ref_exec);

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
			const result_exec = new ResultState(ref_exec);

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
