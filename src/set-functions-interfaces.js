"use strict";
var __extends = (this && this.__extends) || (function () {
    var extendStatics = function (d, b) {
        extendStatics = Object.setPrototypeOf ||
            ({ __proto__: [] } instanceof Array && function (d, b) { d.__proto__ = b; }) ||
            function (d, b) { for (var p in b) if (Object.prototype.hasOwnProperty.call(b, p)) d[p] = b[p]; };
        return extendStatics(d, b);
    };
    return function (d, b) {
        extendStatics(d, b);
        function __() { this.constructor = d; }
        d.prototype = b === null ? Object.create(b) : (__.prototype = b.prototype, new __());
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
exports.filterExecutable = exports.CheckedExecutable = exports.CheckingExecutable = exports.ProposedExecutable = void 0;
var ProposedExecutable = /** @class */ (function () {
    function ProposedExecutable() {
        this.executable_kind = 'wasm';
        this.birth_height = SmartWeave.block.height;
    }
    return ProposedExecutable;
}());
exports.ProposedExecutable = ProposedExecutable;
/* Possible:
type ProposedExecutable2 = Omit<ExecutableInterface, 'result_address' | 'result_height'>;

type CheckingExecutable2 = ProposedExecutable2 & {
    result_address: ArweaveAddress;
    result_height: number;
    checked: boolean;
};

type CheckedExecutable2 = CheckingExecutable2 & {
    checked: boolean;
};
*/
var CheckingExecutable = /** @class */ (function (_super) {
    __extends(CheckingExecutable, _super);
    function CheckingExecutable() {
        var _this = _super !== null && _super.apply(this, arguments) || this;
        _this.checked = false;
        return _this;
    }
    return CheckingExecutable;
}(ProposedExecutable));
exports.CheckingExecutable = CheckingExecutable;
var CheckedExecutable = /** @class */ (function (_super) {
    __extends(CheckedExecutable, _super);
    function CheckedExecutable() {
        var _this = _super !== null && _super.apply(this, arguments) || this;
        _this.checked = true;
        return _this;
    }
    return CheckedExecutable;
}(CheckingExecutable));
exports.CheckedExecutable = CheckedExecutable;
function filterExecutable(_, exec_type) {
    return Object.fromEntries(Object.entries(_).filter(function (keyval) { return keyval[1] instanceof exec_type; }));
}
exports.filterExecutable = filterExecutable;
// Refactor into conditional types and a single function.
/* Refactor above!
export function filterUnexecuted(_: ExecutableHashMap): ExecutableHashMap {
    // Checks if result_address defined to infer type, maybe refactor?
    return Object.fromEntries(
        Object.entries(_).filter((keyval: KeyValue) => keyval[1] instanceof ProposedExecutable)
    );
}

export function filterExecuted(_: ExecutableHashMap): ExecutableHashMap {
    return Object.fromEntries(
        Object.entries(_).filter((keyval: KeyValue) => keyval[1] instanceof CheckedExecutable)
    );
}

export function filterChecking(_: ExecutableHashMap): ExecutableHashMap {
    return Object.fromEntries(
        Object.entries(_).filter((keyval: KeyValue) => keyval[1] instanceof CheckingExecutable)
    );
}
*/
