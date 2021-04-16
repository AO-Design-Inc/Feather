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
    this.account_address = account_address;
  }
  burn(proportion) {
    var _a;
    this.value.stake = ((_a = this.value.stake) != null ? _a : 0) * proportion;
  }
  get valid_vaults() {
    return this.value.vaults.filter((vault) => vault.end >= this.block_height && vault.start <= this.block_height);
  }
  get balance() {
    return this.value.vaults.filter((vault) => vault.end >= SmartWeave.block.height && vault.start <= SmartWeave.block.height).reduce((acc, cur) => acc - cur.amount, this.value.balance);
  }
  consume() {
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
  increase_balance(from_account, amount) {
    from_account.remove_vault(amount);
    this.value.balance += amount;
  }
  remove_vault(amount) {
    const amounts_array = this.valid_vaults.map((_) => _.amount);
    if (this.account_address === "regulator") {
      return;
    }
    if (amounts_array.includes(amount)) {
      this.value.balance -= amount;
      this.value.vaults = this.valid_vaults.filter((_, i) => i !== amounts_array.indexOf(amount));
    } else {
      throw new ContractError(`no vault of quantity ${amount}`);
    }
  }
};

// src/constants.ts
var START_BLOCK = () => Number(SmartWeave.block.height);
var END_BLOCK = () => START_BLOCK() + 1e3;
var PRICE_INCREASE_PER_BLOCK = 1;
var DEFAULT_MAX_PRICE = 100;
var PROPORTION_OF_TOTAL_STAKE_FOR_EXECUTION = 0.3;
var PROPORTION_OF_PRICE_FOR_UPLOADERS_BONUS = 0.01;

// src/faces.ts
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
  SetFunctions2["result"] = "result";
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
    var _a, _b;
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
      case "input_to_executable":
        ContractAssert(typeof target.input_to_executable !== "undefined", "No input to executable");
        if (isArweaveAddress(target.input_to_executable)) {
          return target.input_to_executable;
        }
        throw new ContractError("invalid input address");
      case "start_cost":
        if (typeof target.start_cost === "undefined") {
          return 0;
        }
        ContractAssert(typeof target.max_cost === "number", "max cost must be defined with start cost");
        if (isValidBid(target.start_cost)) {
          ContractAssert(target.max_cost > target.start_cost, "max cost must be greater than start cost");
          return target.start_cost;
        }
        throw new ContractError("Invalid start cost");
      case "max_cost": {
        ContractAssert(typeof target.max_cost === "number", "max cost must be a number");
        const start_cost = (_a = target.start_cost) != null ? _a : 0;
        const max_cost = (_b = target.max_cost) != null ? _b : start_cost + DEFAULT_MAX_PRICE;
        if (isValidBid(max_cost)) {
          ContractAssert(max_cost > start_cost, "max cost must be greater than start cost");
          return max_cost;
        }
        throw new ContractError("Invalid max cost");
      }
      default:
        throw new ContractError("invalid key");
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
      case "executable_key":
        ContractAssert(isArweaveAddress(target.executable_key), "invalid executable key (not arweave address)");
        return target.executable_key;
      case "encrypted_obj":
        ContractAssert(typeof target.encrypted_obj === "string", "encrypted_obj is string");
        return target.encrypted_obj;
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

// src/utils.ts
async function decipher(l) {
  return SmartWeave.arweave.crypto.decrypt(Buffer.from(l[1], "hex"), l[0]).then((_) => _.toString());
}
function isArrayNonZero(array) {
  return typeof array[0] !== "undefined";
}
function lastElementArrayIndex(array) {
  return array.length === 0 ? 0 : array.length - 1;
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
  return target == null ? void 0 : target.every((_) => _._discriminator === discriminator);
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
      if (rand_no_from_0_to_1 < _sum) {
        return value[i][0];
      }
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
      encrypted_obj: lock_input.encrypted_obj
    });
  };
}
function validationLockedToReleased(release_input) {
  const symm_key = release_input.symm_key;
  return (i) => {
    return new ValidationReleaseState({
      ...i,
      _discriminator: "release",
      symm_key
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
  get activeBids() {
    return this.value.bids.filter((_) => this.currentPrice >= _.quantity);
  }
  get currentPrice() {
    return this.value.start_cost + (START_BLOCK() - this.value.executable.birth_height) * PRICE_INCREASE_PER_BLOCK;
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
var AcceptedState = class extends ExecutableState {
  constructor(value) {
    if (!isOfDiscriminatedType(value, "accepted")) {
      throw new ContractError("executable not in accepted state!");
    }
    super(value);
    this.validations = getElements(this.value.validation_linked_list).map((v) => v.value.map(initialiseValidationState));
  }
  get validation_tail() {
    if (isArrayNonZero(this.validations)) {
      return this.validations[lastElementArrayIndex(this.validations)];
    }
    throw new ContractError("validation tail does not exist if no validations");
  }
  get used_validators() {
    return this.validations.flatMap((_) => _.map((_2) => _2.value.validator));
  }
  lock_validation(validation_index, input_proxy) {
    if (this.validation_tail.filter((_) => isOfDiscriminatedType(_.value, "lock")).some((_) => _.value.encrypted_obj === input_proxy.encrypted_obj)) {
      throw new ContractError("cannot have identical encrypted objects!");
    }
    this.validation_tail[validation_index] = new ValidationLockState(this.validation_tail[validation_index].next(validationAnnouncedToLocked(input_proxy)).value);
  }
  release_validation(validation_index, input_proxy) {
    this.validation_tail[validation_index] = new ValidationReleaseState(this.validation_tail[validation_index].next(validationLockedToReleased(input_proxy)).value);
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
  check_fully_released() {
    return isArrayOfDiscriminatedTypes(this.validation_tail.map((_) => _.value), "release");
  }
  async branch(validators, accounts) {
    const vt = this.validation_tail.map((_) => _.value);
    if (!isArrayOfDiscriminatedTypes(vt, "release")) {
      throw new ContractError("cannot branch if validations not released");
    }
    const deciphered_promises = vt.map(async (_) => decipher([_.symm_key, _.encrypted_obj]));
    const deciphered_array = await Promise.all(deciphered_promises);
    if (deciphered_array.every((_) => _ === deciphered_array[0])) {
      const correct_hash = deciphered_array[0];
      const corr_validators = await this.correct_validators(correct_hash);
      const resultGiverReturner = getWeightedProbabilityElement(Number(SmartWeave.block.indep_hash));
      const resultGiver = resultGiverReturner(Array.from(corr_validators).map((_) => [_, 1]));
      return this.next(() => new ValidatedState({
        ...this.consume(),
        result_giver: resultGiver,
        _discriminator: "validated"
      }, accounts, corr_validators));
    }
    this.validations.push(generateValidators(this.allowed_validators(validators)).map((_) => new ValidationAnnounceState(_)));
    return this;
  }
  async correct_validators(correct_hash) {
    const flat_validations = this.validations.flat();
    if (!isArrayOfDiscriminatedTypes(flat_validations, "release")) {
      throw new ContractError("cannot branch if validations not released");
    }
    return flat_validations.reduce(async (acc, cur) => {
      return await decipher([cur.symm_key, cur.encrypted_obj]) === correct_hash ? (await acc).concat([cur.validator]) : acc;
    }, Promise.resolve([]));
  }
};
var ValidatedState = class extends ExecutableState {
  get validation_tail() {
    if (isArrayNonZero(this.validations)) {
      return this.validations[lastElementArrayIndex(this.validations)];
    }
    throw new ContractError("validation tail does not exist if no validations");
  }
  constructor(value, accounts, correct_validators) {
    if (!isOfDiscriminatedType(value, "validated")) {
      throw new ContractError("executable not in validated state!");
    }
    super(value);
    this.validations = getElements(this.value.validation_linked_list).map((v) => v.value.map((_) => new ValidationReleaseState(_)));
    if (typeof accounts !== "undefined" && typeof correct_validators !== "undefined") {
      this.handlePayments(accounts, correct_validators);
    }
  }
  handlePayments(accounts, correct_validators) {
    const regulator_account = new Account(accounts, "regulator");
    const result_giver_account = new Account(accounts, this.value.result_giver);
    this.validations.flat().forEach(async (_) => {
      const validator_account = new Account(accounts, _.value.validator);
      if (correct_validators.includes(_.value.validator)) {
        validator_account.increase_balance(regulator_account, 0.5 * this.value.accepted_cost);
      } else {
        validator_account.burn(0.5);
      }
    });
    result_giver_account.increase_balance(regulator_account, 1);
  }
};
var ResultState = class extends ExecutableState {
  constructor(value) {
    if (!isOfDiscriminatedType(value, "result")) {
      throw new ContractError("executable not in result state!");
    }
    super(value);
  }
};
function proposedToAccepted(validators) {
  return (i) => {
    return new AcceptedState({
      ...i,
      _discriminator: "accepted",
      validation_linked_list: {
        value: generateValidators(validators),
        next: void 0
      },
      accepted_cost: new ProposedState(i).currentPrice
    });
  };
}
function generateValidators(validators) {
  const validatorReturner = getWeightedProbabilityElement(Number(SmartWeave.block.indep_hash));
  const validator1 = validatorReturner(Array.from(validators).map((_) => [_, _[1].stake]));
  validators.delete(validator1);
  const validator2 = validatorReturner(Array.from(validators).map((_) => [_, _[1].stake]));
  return [
    {_discriminator: "announce", validator: validator1[0]},
    {_discriminator: "announce", validator: validator2[0]}
  ];
}
function validatedToResult(result_input, caller) {
  return (i) => {
    return new ResultState({
      ...i,
      _discriminator: "result",
      result: {
        address: result_input.result_address,
        giver: caller,
        height: START_BLOCK()
      }
    });
  };
}

// src/contract.ts
function getValidators(state) {
  return Object.fromEntries(Object.entries(state.accounts).filter((value) => typeof value[1].stake !== "undefined"));
}
async function handle(state, action) {
  var _a, _b;
  switch (action.input.function) {
    case "propose": {
      const inputProxy = new Proxy(action.input, ProposedExecutableInputProxy);
      const proposer_account = new Account(state.accounts, action.caller);
      proposer_account.add_vault({
        amount: inputProxy.max_cost + PROPORTION_OF_PRICE_FOR_UPLOADERS_BONUS * inputProxy.max_cost,
        start: START_BLOCK(),
        end: END_BLOCK()
      });
      const proposed_exec = new ProposedState({
        _discriminator: "proposed",
        start_cost: inputProxy.start_cost,
        max_cost: inputProxy.max_cost,
        bids: [],
        caller: action.caller,
        executable: {
          birth_height: SmartWeave.block.height,
          executable_address: inputProxy.executable_address,
          executable_kind: inputProxy.executable_kind
        }
      });
      state.executables[SmartWeave.transaction.id] = proposed_exec.value;
      return {state};
    }
    case "bid": {
      const inputProxy = new Proxy(action.input, BidInputProxy);
      const ref_exec = (_a = state.executables[inputProxy.executable_key]) != null ? _a : void 0;
      ContractAssert(typeof ref_exec !== "undefined", "referenced executable does not exist");
      const bidder = (_b = state.accounts[action.caller]) != null ? _b : void 0;
      ContractAssert(typeof bidder !== "undefined", "caller does not have an account");
      const proposed_exec = new ProposedState(ref_exec);
      ContractAssert(typeof bidder.stake !== "undefined", "bidder is not an executor");
      proposed_exec.value.bids.push({
        bidder: action.caller,
        quantity: inputProxy.quantity,
        birth_height: START_BLOCK()
      });
      const TOTAL_STAKE = Object.entries(state.accounts).reduce((acc, cur) => acc + cur[1].stake, 0);
      const validators = new Set(proposed_exec.activeBids.map((_) => [_.bidder, state.accounts[_.bidder]]));
      const propToAcc = proposedToAccepted(validators);
      const next_exec = proposed_exec.activeBids.reduce((acc, cur) => acc + state.accounts[cur.bidder].stake, 0) >= PROPORTION_OF_TOTAL_STAKE_FOR_EXECUTION * TOTAL_STAKE ? proposed_exec.next(propToAcc) : proposed_exec;
      state.executables[inputProxy.executable_key] = next_exec.consume();
      return {state};
    }
    case "result": {
      const inputProxy = new Proxy(action.input, ResultInputProxy);
      const ref_exec = state.executables[inputProxy.executable_key];
      const validated_exec = new ValidatedState(ref_exec);
      ContractAssert(validated_exec.value.result_giver === action.caller, "result not made by winning bidder!");
      const result_exec = validated_exec.next(validatedToResult(inputProxy, action.caller));
      state.executables[inputProxy.executable_key] = result_exec.consume();
      return {state};
    }
    case "validate_lock": {
      const inputProxy = new Proxy(action.input, ValidationLockInputProxy);
      const ref_exec = state.executables[inputProxy.executable_key];
      const accepted_exec = new AcceptedState(ref_exec);
      const matched_validation_index = accepted_exec.validation_tail.findIndex((_) => _.value.validator === action.caller && _.value._discriminator === "announce");
      ContractAssert(matched_validation_index !== -1, "no matching validation!");
      accepted_exec.lock_validation(matched_validation_index, inputProxy);
      state.executables[inputProxy.executable_key] = accepted_exec.consume();
      return {state};
    }
    case "validate_release": {
      const inputProxy = new Proxy(action.input, ValidationReleaseInputProxy);
      const ref_exec = state.executables[inputProxy.executable_key];
      const accepted_exec = new AcceptedState(ref_exec);
      if (!accepted_exec.validation_tail.every((_) => _.value._discriminator !== "announce")) {
        throw new ContractError("entire vll is not locked");
      }
      const matched_validation_index = accepted_exec.validation_tail.findIndex((value) => value.value.validator === action.caller && value.value._discriminator === "lock");
      ContractAssert(matched_validation_index !== -1, "no matching validation!");
      accepted_exec.release_validation(matched_validation_index, inputProxy);
      try {
        const next_exec = accepted_exec.check_fully_released() ? await accepted_exec.branch(getValidators(state), state.accounts) : accepted_exec;
        state.executables[inputProxy.executable_key] = next_exec.consume();
        return {state};
      } catch (error) {
        throw error;
      }
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
