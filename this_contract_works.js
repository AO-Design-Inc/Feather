// src/transaction.ts
var Account = class {
  constructor(accounts, account_address) {
    if (typeof accounts[account_address] === "undefined") {
      accounts[account_address] = {
        balance: 0,
        vaults: []
      };
    }
    this.value = accounts[account_address];
    this.block_height = SmartWeave.block.height;
  }
  adj_balance() {
    return this.value.vaults.filter((vault) => vault.end >= SmartWeave.block.height && vault.start <= SmartWeave.block.height).reduce((acc, cur) => acc - cur.amount, this.value.balance);
  }
  add_vault(vault) {
    if (this.adj_balance() < vault.amount) {
      throw new ContractError("not enough balance");
    }
    if (this.block_height < vault.start || this.block_height >= vault.end) {
      throw new ContractError("invalid block height");
    }
    this.value.vaults.push(vault);
  }
  remove_vault(amount) {
    const amounts_array = this.value.vaults.map((item) => item.amount);
    if (!(amount in amounts_array)) {
      throw new ContractError(`no vault of quantity ${amount}`);
    }
    this.value.vaults.splice(amounts_array.indexOf(amount), 1);
    return {
      deduct_balance: () => {
        this.value.balance -= amount;
      }
    };
  }
  increase_balance(amount) {
    if (amount <= 0) {
      throw new ContractError("illegal amount");
    }
    this.value.balance += amount;
  }
};
function balanceHandler(from_account, to_account, deduct) {
  from_account.remove_vault(deduct).deduct_balance();
  to_account.increase_balance(deduct);
  return [from_account, to_account];
}

// src/interfaces.ts
var GetFunctions;
(function(GetFunctions2) {
  GetFunctions2["proposed"] = "proposed";
  GetFunctions2["executable"] = "executable";
})(GetFunctions || (GetFunctions = {}));
var ExecutableKinds;
(function(ExecutableKinds2) {
  ExecutableKinds2["webgpu"] = "webgpu";
  ExecutableKinds2["wasm"] = "wasm";
})(ExecutableKinds || (ExecutableKinds = {}));
var SetFunctions;
(function(SetFunctions2) {
  SetFunctions2["propose"] = "propose";
  SetFunctions2["bid"] = "bid";
  SetFunctions2["accept"] = "accept";
  SetFunctions2["result"] = "result";
  SetFunctions2["validate"] = "validate";
})(SetFunctions || (SetFunctions = {}));
var AccountFunctions;
(function(AccountFunctions2) {
  AccountFunctions2["lock"] = "lock";
  AccountFunctions2["unlock"] = "unlock";
})(AccountFunctions || (AccountFunctions = {}));
var isArweaveAddress = (addy) => /[\w-]{43}/i.test(addy);
var ProposedExecutableInputProxy = {
  get(target, p) {
    switch (p) {
      case "executable_address":
        if (isArweaveAddress(target.executable_address)) {
          return target.executable_address;
        }
        throw new ContractError(`
						${String(target.executable_address)}
						is not valid Arweave Address
						`);
      case "executable_kind":
        if (target.executable_kind in ExecutableKinds) {
          return target.executable_kind;
        }
        throw new ContractError(`
					${target.executable_kind}
					is not valid executable type
					`);
      case "executable_key":
        if (isArweaveAddress(target.executable_key)) {
          return target.executable_key;
        }
        throw new ContractError(`
					${String(target.executable_key)}
					is not valid executable key
					`);
      default:
        throw new ContractError(`
					${String(p)} is invalid key
					`);
    }
  }
};
var isValidBid = (bid_amount) => typeof bid_amount === "number" && bid_amount > 0;
var BidInputProxy = {
  get(target, p) {
    switch (p) {
      case "executable_key":
        if (isArweaveAddress(target.executable_key)) {
          return target.executable_key;
        }
        throw new ContractError(`
					${String(target.executable_key)}
					is not valid executable key
					`);
      case "quantity":
        if (isValidBid(target.quantity)) {
          return target.quantity;
        }
        throw new ContractError(`
					${String(target.quantity)} 
					is not valid bid quantity
					`);
      default:
        throw new ContractError(`
						${String(p)} is invalid key
						`);
    }
  }
};
var AcceptedBidInputProxy = {
  get(target, p) {
    switch (p) {
      case "accepted_bid":
        if (!isValidBid(target.accepted_bid.quantity)) {
          throw new ContractError(`
						${String(target.accepted_bid.quantity)}
						is invalid amount`);
        }
        if (!isArweaveAddress(target.accepted_bid.bidder)) {
          throw new ContractError(`
						${String(target.accepted_bid.bidder)}
						is not Arweave Address`);
        }
        return target.accepted_bid;
      case "executable_key":
        if (isArweaveAddress(target.executable_key)) {
          return target.executable_key;
        }
        throw new ContractError(`
					${String(target.executable_key)}
					is not valid executable key
					`);
      default:
        throw new ContractError(`
						${String(p)} is invalid key
						`);
    }
  }
};
var ResultInputProxy = {
  get(target, p) {
    switch (p) {
      case "result_address":
        if (isArweaveAddress(target.result_address)) {
          return target.result_address;
        }
        throw new ContractError(`${String(target.result_address)}
						is not Arweave Address`);
      case "executable_key":
        if (isArweaveAddress(target.executable_key)) {
          return target.executable_key;
        }
        throw new ContractError(`
					${String(target.executable_key)}
					is not valid executable key
					`);
      default:
        throw new ContractError(`
					${String(p)} is invalid key
					`);
    }
  }
};
var ValidationInputProxy = {
  get(target, p) {
    switch (p) {
      case "is_correct":
        if (typeof target.is_correct === "boolean") {
          return target.is_correct;
        }
        throw new ContractError(`${String(target.is_correct)}
					is not a boolean value`);
      case "executable_key":
        if (isArweaveAddress(target.executable_key)) {
          return target.executable_key;
        }
        throw new ContractError(`
					${String(target.executable_key)}
					is not valid executable key
					`);
      default:
        throw new ContractError(`
					${String(p)} is invalid key
					`);
    }
  }
};

// src/executable.ts
var ExecutableState = class {
  constructor(value) {
    this.value = value;
  }
  next(f) {
    return f(this.value);
  }
};
function proposedToAccepted(acc_input) {
  return (i) => {
    return new ExecutableState({
      ...i,
      accepted_bid: acc_input.accepted_bid
    });
  };
}
function acceptedToResult(result_input, caller) {
  return (i) => {
    return new ExecutableState({
      ...i,
      result: {
        address: result_input.result_address,
        giver: caller,
        height: SmartWeave.block.height
      }
    });
  };
}
function resultToValidated(validation_input) {
  return (i) => {
    return new ExecutableState({
      ...i,
      is_correct: validation_input.is_correct
    });
  };
}
var isProposedExecutable = (target) => !("result" in target) && !("accepted_bid" in target);
var isAcceptedExecutable = (target) => !("result" in target) && "accepted_bid" in target;
var isResultExecutable = (target) => !isProposedExecutable(target) && !isAcceptedExecutable(target);

// src/contract.ts
export function handle(state, action) {
  const blockHeight = SmartWeave.block.height;
  switch (action.input.function) {
    case "propose": {
      const inputProxy = new Proxy(action.input, ProposedExecutableInputProxy);
      const proposed_exec = new ExecutableState({
        bids: [],
        caller: action.caller,
        executable: {
          birth_height: blockHeight,
          executable_address: inputProxy.executable_address,
          executable_kind: inputProxy.executable_kind
        }
      });
      if (Object.keys(state.executables).includes(inputProxy.executable_key)) {
        throw new ContractError(`the executable key 
					${String(inputProxy.executable_key)}
					already exists`);
      } else {
        state.executables[inputProxy.executable_key] = proposed_exec.value;
      }
      return {state};
    }
    case "bid": {
      const inputProxy = new Proxy(action.input, BidInputProxy);
      const ref_exec = state.executables[inputProxy.executable_key];
      if (isProposedExecutable(ref_exec)) {
        ref_exec.bids.push({
          bidder: action.caller,
          quantity: inputProxy.quantity
        });
        return {state};
      }
      throw new ContractError(`Referred executable 
				${String(inputProxy.executable_key)}
				is not in proposed state`);
    }
    case "accept": {
      const inputProxy = new Proxy(action.input, AcceptedBidInputProxy);
      const ref_exec = state.executables[inputProxy.executable_key];
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
        end: blockHeight + 1e3
      });
      state.executables[inputProxy.executable_key] = accepted_exec.value;
      state.accounts[ref_exec.caller] = accepter_account.value;
      return {state};
    }
    case "result": {
      const inputProxy = new Proxy(action.input, ResultInputProxy);
      const ref_exec = state.executables[inputProxy.executable_key];
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
      const result_exec = accepted_exec.next(acceptedToResult(inputProxy, action.caller));
      let result_giver_account = new Account(state.accounts, action.caller);
      let accepter_account = new Account(state.accounts, ref_exec.caller);
      [accepter_account, result_giver_account] = balanceHandler(accepter_account, result_giver_account, ref_exec.accepted_bid.quantity);
      state.accounts[ref_exec.caller] = accepter_account.value;
      state.accounts[action.caller] = result_giver_account.value;
      state.executables[inputProxy.executable_key] = result_exec.value;
      return {state};
    }
    case "validate": {
      const inputProxy = new Proxy(action.input, ValidationInputProxy);
      const ref_exec = state.executables[inputProxy.executable_key];
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
    case "proposed":
      return {
        result: Object.entries(state.executables).filter((keyval) => isProposedExecutable(keyval[1]))
      };
    default:
      throw new ContractError("Invalid function call");
  }
}
