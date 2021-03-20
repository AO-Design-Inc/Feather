var __defProp = Object.defineProperty;
var __getOwnPropDesc = Object.getOwnPropertyDescriptor;
var __decorate = (decorators, target, key, kind) => {
  var result = kind > 1 ? void 0 : kind ? __getOwnPropDesc(target, key) : target;
  for (var i = decorators.length - 1, decorator; i >= 0; i--)
    if (decorator = decorators[i])
      result = (kind ? decorator(target, key, result) : decorator(result)) || result;
  if (kind && result)
    __defProp(target, key, result);
  return result;
};

// src/transaction.ts
function configurable(value) {
  return function(target, propertyKey, descriptor) {
    descriptor.configurable = value;
  };
}
function writable(value) {
  return function(target, propertyKey, descriptor) {
    descriptor.writable = value;
  };
}
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
  burn(proportion) {
    this.value.stake = (this.value.stake ?? 0) * proportion;
  }
  get valid_vaults() {
    return this.value.vaults.filter((vault) => vault.end >= this.block_height && vault.start <= this.block_height);
  }
  get balance() {
    return this.value.vaults.filter((vault) => vault.end >= SmartWeave.block.height && vault.start <= SmartWeave.block.height).reduce((acc, cur) => acc - cur.amount, this.value.balance);
  }
  consume() {
    Object.freeze(this);
    return this.value;
  }
  get _value() {
    return this.value;
  }
  add_vault(vault) {
    if (this.balance < vault.amount) {
      throw new ContractError("not enough balance");
    }
    if (this.block_height < vault.start || this.block_height >= vault.end) {
      throw new ContractError("invalid block height");
    }
    this.value.vaults.push(vault);
  }
  async remove_vault(amount) {
    return new Promise((resolve, reject) => {
      const amounts_array = this.valid_vaults.map((item) => item.amount);
      if (amounts_array.includes(amount)) {
        this.value.balance -= amount;
        this.value.vaults = this.valid_vaults.splice(amounts_array.indexOf(amount));
        resolve();
      } else {
        reject(new ContractError(`no vault of quantity ${amount}`));
      }
    });
  }
  increase_balance(from_account, amount) {
    from_account.remove_vault(amount).then(() => {
      this.value.balance += amount;
    }).catch((error) => {
      throw error;
    });
  }
};
__decorate([
  configurable(false),
  writable(false)
], Account.prototype, "_value", 1);

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
  SetFunctions2["validate_lock"] = "validate_lock";
  SetFunctions2["validate_release"] = "validate_release";
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
        ContractAssert(isValidBid(target.accepted_bid.quantity), "invalid amount");
        ContractAssert(isArweaveAddress(target.accepted_bid.bidder), "bad accepted bid bidder");
        return target.accepted_bid;
      case "executable_key":
        ContractAssert(isArweaveAddress(target.executable_key), "not valid executable key");
        return target.executable_key;
      default:
        throw new ContractError("invalid key");
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
var ValidationLockInputProxy = {
  get(target, p) {
    switch (p) {
      case "encrypted_hash":
        return target.encrypted_hash;
      case "executable_key":
        ContractAssert(isArweaveAddress(target.executable_key), "invalid executable key (not arweave address)");
        return target.executable_key;
      default:
        throw new ContractError("invalid key");
    }
  }
};
var ValidationReleaseInputProxy = {
  get(target, p) {
    switch (p) {
      case "executable_key":
        ContractAssert(isArweaveAddress(target.executable_key), "invalid executable key (not arweave address)");
        return target.executable_key;
      case "symm_key":
        return target.symm_key;
      default:
        throw new ContractError("invalid key");
    }
  }
};

// src/executable.ts
import {
  createDecipheriv as createDecipheriv2
} from "crypto";

// src/utils.ts
import {
  createDecipheriv
} from "crypto";
function decipher(l) {
  let decrypted;
  const iv = Buffer.alloc(16, 0);
  const decipher2 = createDecipheriv("aes-192-gcm", l[0], iv);
  decrypted = decipher2.update(l[1], "hex", "utf8");
  decrypted = decipher2.final("utf8");
  return decrypted;
}
function getElements(list) {
  const retarr = [];
  do {
    const value = list;
    retarr.push(value);
  } while (list.next);
  return retarr;
}
function createLinkedList(t) {
  return t.length > 0 ? {
    value: t.shift(),
    next: createLinkedList(t)
  } : void 0;
}
function isArrayOfDiscriminatedTypes(target, discriminator) {
  return target.every((_) => _._discriminator === discriminator);
}
function isOfDiscriminatedType(target, discriminator) {
  return target._discriminator === discriminator;
}
function setDifference(setA, setB) {
  const _difference = new Set(setA);
  for (const element of setB) {
    _difference.delete(element);
  }
  return _difference;
}
function getWeightedProbabilityElement(seed) {
  const mul32instance = mulberry32(seed);
  return function(value) {
    const total_weight = value.reduce((acc, cur) => acc + cur[1], 0);
    const pdf = value.map((_) => _[1] / total_weight);
    const rand_no_from_0_to_1 = mul32instance();
    for (let i = 0, _sum = pdf[0]; i < pdf.length; i++, _sum += pdf[i]) {
      if (rand_no_from_0_to_1 < _sum)
        return value[i][0];
    }
    throw new Error("Impossible state, probability function borked");
  };
}
function mulberry32(a) {
  return function() {
    a = Math.trunc(a);
    a = Math.trunc(a + 1831565813);
    let t = Math.imul(a ^ a >>> 15, 1 | a);
    t ^= t + Math.imul(t ^ t >>> 7, 61 | t);
    return ((t ^ t >>> 14) >>> 0) / 4294967296;
  };
}

// src/validate.ts
var ValidationState = class {
  constructor(value) {
    this.value = value;
  }
  next(f) {
    return f(this.value);
  }
};
var ValidationAnnounceState = class extends ValidationState {
  constructor(value) {
    if (!isOfDiscriminatedType(value, "announce")) {
      throw new ContractError("validation not in announce state!");
    }
    super(value);
  }
};
var ValidationLockState = class extends ValidationState {
  constructor(value) {
    if (!isOfDiscriminatedType(value, "lock")) {
      throw new ContractError("validation not in locked state!");
    }
    super(value);
  }
};
var ValidationReleaseState = class extends ValidationState {
  constructor(value) {
    if (!isOfDiscriminatedType(value, "release")) {
      throw new ContractError("validation not in released state!");
    }
    super(value);
  }
};
function validationAnnouncedToLocked(lock_input) {
  return (i) => {
    return new ValidationLockState({
      ...i,
      _discriminator: "lock",
      encrypted_hash: lock_input.encrypted_hash
    });
  };
}
function validationLockedToReleased(release_input) {
  const symm_key = release_input.symm_key;
  return (i) => {
    return new ValidationReleaseState({
      ...i,
      _discriminator: "release",
      symm_key,
      decrypted_hash: decipher([symm_key, i.encrypted_hash])
    });
  };
}

// src/executable.ts
var ExecutableState = class {
  constructor(value) {
    this.value = value;
  }
  next(f) {
    return f(this.value);
  }
  consume() {
    return this.value;
  }
};
var ProposedState = class extends ExecutableState {
  constructor(value) {
    if (!isOfDiscriminatedType(value, "proposed")) {
      throw new ContractError("executable not in proposed state!");
    }
    super(value);
  }
};
var default_timings = {
  start: SmartWeave.block.height,
  end: SmartWeave.block.height + 1e3
};
var AcceptedState = class extends ExecutableState {
  constructor(value) {
    if (!isOfDiscriminatedType(value, "accepted")) {
      throw new ContractError("executable not in accepted state!");
    }
    super(value);
  }
  get accepted_bid() {
    return this.value.accepted_bid;
  }
  get caller() {
    return this.value.caller;
  }
  post_collateral(result_giver_account) {
    result_giver_account.add_vault({
      amount: 0.5 * this.accepted_bid.quantity,
      ...default_timings
    });
  }
};
function initialiseValidationState(i) {
  switch (i._discriminator) {
    case "announce":
      return new ValidationAnnounceState(i);
    case "lock":
      return new ValidationLockState(i);
    case "release":
      return new ValidationReleaseState(i);
    default:
      throw new ContractError("impossible!");
  }
}
var ResultState = class extends ExecutableState {
  constructor(value) {
    if (!isOfDiscriminatedType(value, "result")) {
      throw new ContractError("executable not in result state!");
    }
    super(value);
    this.validations = getElements(this.value.validation_linked_list).map((v) => v.value.map(initialiseValidationState));
  }
  get used_validators() {
    return this.validations.flatMap((_) => _.map((_2) => _2.value.validator));
  }
  allowed_validators(validators) {
    const used_validators = new Set(this.used_validators);
    const validator_keys = new Set(Object.keys(validators));
    const allowed_validators = setDifference(validator_keys, used_validators);
    return new Set(Array.from(allowed_validators).map((_) => [_, validators._]));
  }
  consume() {
    this.value.validation_linked_list = createLinkedList(this.validations.map((_) => _.map((_2) => _2.value)));
    return this.value;
  }
  verify_and_iterate(validators, accounts) {
    const validatorTail = this.validations[-1].map((_) => _.value);
    if (isArrayOfDiscriminatedTypes(validatorTail, "release")) {
      const deciphered = decipherList(validatorTail.map((_) => [_.symm_key, _.encrypted_hash]));
      const is_correct = JSON.parse(deciphered[0]).is_correct;
      if (deciphered.every((_) => _ === deciphered[0])) {
        this.next(() => new ValidatedState({
          ...this.consume(),
          _discriminator: "validated",
          is_correct
        }, accounts));
      }
      this.validations.push(generateValidators(new Account(accounts, "regulator"), 0.05 * this.value.accepted_bid.quantity, this.allowed_validators(validators)).map((_) => new ValidationAnnounceState(_)));
    }
    return this;
  }
};
function decipherList(l) {
  const decrypted = [];
  const iv = Buffer.alloc(16, 0);
  l.forEach((v, i) => {
    const decipher2 = createDecipheriv2("aes-192-gcm", v[0], iv);
    decrypted[i] = decipher2.update(v[1], "hex", "utf8");
    decrypted[i] = decipher2.final("utf8");
  });
  return decrypted;
}
var ValidatedState = class extends ExecutableState {
  constructor(value, accounts) {
    if (!isOfDiscriminatedType(value, "validated")) {
      throw new ContractError("executable not in validated state!");
    }
    super(value);
    const regulator_account = new Account(accounts, "regulator");
    const result_giver_account = new Account(accounts, this.value.result.giver);
    this.validations = getElements(this.value.validation_linked_list).map((v) => v.value.map((_) => new ValidationReleaseState(_)));
    this.validations.flat().forEach((_) => {
      const validator_account = new Account(accounts, _.value.validator);
      if (_.value.decrypted_hash === this.validations[-1][0].value.decrypted_hash) {
        validator_account.increase_balance(regulator_account, 0.05 * this.value.accepted_bid.quantity);
      } else {
        validator_account.burn(0.5);
      }
    });
    if (this.value.is_correct) {
      result_giver_account.increase_balance(new Account(accounts, this.value.caller), this.value.accepted_bid.quantity);
    } else {
      regulator_account.increase_balance(result_giver_account, 0.5 * this.value.accepted_bid.quantity);
    }
  }
};
function proposedToAccepted(acc_input) {
  return (i) => {
    return new AcceptedState({
      ...i,
      _discriminator: "accepted",
      accepted_bid: acc_input.accepted_bid
    });
  };
}
function generateValidators(regulator, fee, validators) {
  validators.forEach(() => regulator.add_vault({
    amount: fee,
    end: Number(SmartWeave.block.height) + 1e3,
    start: Number(SmartWeave.block.height)
  }));
  const validatorReturner = getWeightedProbabilityElement(Number(SmartWeave.block.indep_hash));
  const validator1 = validatorReturner(Array.from(validators).map((_) => [_, _[1].stake]));
  validators.delete(validator1);
  const validator2 = validatorReturner(Array.from(validators).map((_) => [_, _[1].stake]));
  return [
    {_discriminator: "announce", validator: validator1[0]},
    {_discriminator: "announce", validator: validator2[0]}
  ];
}
function acceptedToResult(result_input, caller, validators, accounts) {
  return (i) => {
    return new ResultState({
      ...i,
      _discriminator: "result",
      validation_linked_list: {
        value: generateValidators(new Account(accounts, "regulator"), i.accepted_bid.quantity, validators),
        next: void 0
      },
      result: {
        address: result_input.result_address,
        giver: caller,
        height: SmartWeave.block.height
      }
    });
  };
}

// src/contract.ts
function getValidators(state) {
  return Object.fromEntries(Object.entries(state.accounts).filter((value) => typeof value[1].stake !== "undefined"));
}
function handle(state, action) {
  const blockHeight = SmartWeave.block.height;
  switch (action.input.function) {
    case "propose": {
      const inputProxy = new Proxy(action.input, ProposedExecutableInputProxy);
      const proposed_exec = new ProposedState({
        _discriminator: "proposed",
        bids: [],
        caller: action.caller,
        executable: {
          birth_height: blockHeight,
          executable_address: inputProxy.executable_address,
          executable_kind: inputProxy.executable_kind
        }
      });
      state.executables[SmartWeave.transaction.id] = proposed_exec.value;
      return {state};
    }
    case "bid": {
      const inputProxy = new Proxy(action.input, BidInputProxy);
      const ref_exec = new ProposedState(state.executables[inputProxy.executable_key]);
      ref_exec.value.bids.push({
        bidder: action.caller,
        quantity: inputProxy.quantity
      });
      state.executables[inputProxy.executable_key] = ref_exec.value;
      return {state};
    }
    case "accept": {
      const inputProxy = new Proxy(action.input, AcceptedBidInputProxy);
      const ref_exec = state.executables[inputProxy.executable_key];
      ContractAssert(ref_exec.caller === action.caller, `${action.caller} is not creator of proposal`);
      const proposed_exec = new ProposedState(ref_exec);
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
      const accepted_exec = new AcceptedState(ref_exec);
      ContractAssert(accepted_exec.accepted_bid.bidder === action.caller, "result not made by winning bidder!");
      const validators = getValidators(state);
      const result_exec = accepted_exec.next(acceptedToResult(inputProxy, action.caller, new Set(Object.entries(validators)), state.accounts));
      const result_giver_account = new Account(state.accounts, action.caller);
      const accepter_account = new Account(state.accounts, ref_exec.caller);
      result_giver_account.increase_balance(accepter_account, accepted_exec.accepted_bid.quantity);
      state.accounts[ref_exec.caller] = accepter_account.consume();
      state.accounts[action.caller] = result_giver_account.consume();
      state.executables[inputProxy.executable_key] = result_exec.consume();
      return {state};
    }
    case "validate_lock": {
      const inputProxy = new Proxy(action.input, ValidationLockInputProxy);
      const ref_exec = state.executables[inputProxy.executable_key];
      const result_exec = new ResultState(ref_exec);
      const matched_validation = result_exec.validations[-1].filter((value) => value.value.validator === action.caller && value.value._discriminator === "announce");
      ContractAssert(Boolean(matched_validation.length), "no matching validation!");
      matched_validation[0] = new ValidationLockState(matched_validation[0].next(validationAnnouncedToLocked(inputProxy)).value);
      state.executables[inputProxy.executable_key] = result_exec.consume();
      return {state};
    }
    case "validate_release": {
      const inputProxy = new Proxy(action.input, ValidationReleaseInputProxy);
      const ref_exec = state.executables[inputProxy.executable_key];
      const result_exec = new ResultState(ref_exec);
      if (!result_exec.validations[-1].every((_) => _.value._discriminator === "lock"))
        throw new ContractError("entire vll is not locked");
      const matched_validation = result_exec.validations[-1].filter((value) => value.value.validator === action.caller && value.value._discriminator === "announce");
      ContractAssert(Boolean(matched_validation.length), "no matching validation!");
      matched_validation[0] = new ValidationReleaseState(matched_validation[0].next(validationLockedToReleased(inputProxy)).value);
      const next_exec = result_exec.verify_and_iterate(getValidators(state), state.accounts);
      state.executables[inputProxy.executable_key] = next_exec.consume();
      return {state};
    }
    case "proposed":
      return {
        result: Object.entries(state.executables).filter((keyval) => isOfDiscriminatedType(keyval[1], "proposed"))
      };
    default:
      throw new ContractError("Invalid function call");
  }
}
export {
  handle
};
