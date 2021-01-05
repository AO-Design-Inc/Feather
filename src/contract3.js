"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
var interfaces_1 = require("./interfaces");
var typeguards_1 = require("./typeguards");
var set_functions_interfaces_1 = require("./set-functions-interfaces");
var Action = /** @class */ (function () {
    function Action(_caller, _input) {
        this.caller = _caller;
        this.input = _input;
    }
    Object.defineProperty(Action.prototype, "caller", {
        get: function () {
            return this._caller;
        },
        set: function (addy) {
            if (typeguards_1.isArweaveAddress(addy)) {
                this._caller = addy;
            }
            else {
                // TODO: report eslint bug.
                /* eslint-disable
                @typescript-eslint/restrict-template-expressions */
                throw new Error(addy + " is not an arweave address");
                /* eslint-enable
                @typescript-eslint/restrict-template-expressions */
            }
        },
        enumerable: false,
        configurable: true
    });
    Object.defineProperty(Action.prototype, "input", {
        get: function () {
            return this._input;
        },
        set: function (inp) {
            this._input = inp;
        },
        enumerable: false,
        configurable: true
    });
    return Action;
}());
function handle(state, action) {
    switch (action.input.function) {
        case interfaces_1.GetFunctions.unexecuted:
            return { result: set_functions_interfaces_1.filterExecutable(state.executables, set_functions_interfaces_1.ProposedExecutable) };
        case interfaces_1.GetFunctions.checking:
            return { result: set_functions_interfaces_1.filterExecutable(state.executables, set_functions_interfaces_1.CheckingExecutable) };
        case interfaces_1.GetFunctions.executed:
            return { result: set_functions_interfaces_1.filterExecutable(state.executables, set_functions_interfaces_1.CheckedExecutable) };
        case interfaces_1.SetFunctions.add:
            if (typeof action.input.program_address !== 'string') {
                throw new TypeError('Program address must be defined');
            }
            else if (!typeguards_1.isArweaveAddress(action.input.program_address)) {
                throw new TypeError('Program address must be arweave address');
            }
            else if (action.input.executable instanceof
                set_functions_interfaces_1.ProposedExecutable &&
                !state.executables[action.input.program_address]) {
                return Object.defineProperty(state.executables, action.input.program_address, action.input.executable);
            }
            throw new TypeError('no!');
        case interfaces_1.SetFunctions.check:
            if (typeof action.input.program_address !== 'string') {
                throw new TypeError('Program address must be defined');
            }
            else if (!typeguards_1.isArweaveAddress(action.input.program_address)) {
                throw new TypeError('Program address must be arweave address');
            }
            else if (action.input.executable instanceof
                set_functions_interfaces_1.CheckedExecutable &&
                state.executables[action.input.program_address] instanceof set_functions_interfaces_1.CheckingExecutable) {
                return Object.defineProperty(state.executables, action.input.program_address, action.input.executable);
            }
            throw new TypeError('no!');
        case interfaces_1.SetFunctions.run:
            if (typeof action.input.program_address !== 'string') {
                throw new TypeError('Program address must be defined');
            }
            else if (!typeguards_1.isArweaveAddress(action.input.program_address)) {
                throw new TypeError('Program address must be arweave address');
            }
            else if (action.input.executable instanceof
                set_functions_interfaces_1.CheckingExecutable &&
                state.executables[action.input.program_address] instanceof set_functions_interfaces_1.ProposedExecutable) {
                return Object.defineProperty(state.executables, action.input.program_address, action.input.executable);
            }
            throw new TypeError('no!');
        default:
            throw new Error('Invalid function call');
    }
}
