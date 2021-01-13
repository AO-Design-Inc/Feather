"use strict";

function _typeof(obj) { "@babel/helpers - typeof"; if (typeof Symbol === "function" && typeof Symbol.iterator === "symbol") { _typeof = function _typeof(obj) { return typeof obj; }; } else { _typeof = function _typeof(obj) { return obj && typeof Symbol === "function" && obj.constructor === Symbol && obj !== Symbol.prototype ? "symbol" : typeof obj; }; } return _typeof(obj); }

function _defineProperties(target, props) { for (var i = 0; i < props.length; i++) { var descriptor = props[i]; descriptor.enumerable = descriptor.enumerable || false; descriptor.configurable = true; if ("value" in descriptor) descriptor.writable = true; Object.defineProperty(target, descriptor.key, descriptor); } }

function _createClass(Constructor, protoProps, staticProps) { if (protoProps) _defineProperties(Constructor.prototype, protoProps); if (staticProps) _defineProperties(Constructor, staticProps); return Constructor; }

function _inherits(subClass, superClass) { if (typeof superClass !== "function" && superClass !== null) { throw new TypeError("Super expression must either be null or a function"); } subClass.prototype = Object.create(superClass && superClass.prototype, { constructor: { value: subClass, writable: true, configurable: true } }); if (superClass) _setPrototypeOf(subClass, superClass); }

function _setPrototypeOf(o, p) { _setPrototypeOf = Object.setPrototypeOf || function _setPrototypeOf(o, p) { o.__proto__ = p; return o; }; return _setPrototypeOf(o, p); }

function _createSuper(Derived) { var hasNativeReflectConstruct = _isNativeReflectConstruct(); return function _createSuperInternal() { var Super = _getPrototypeOf(Derived), result; if (hasNativeReflectConstruct) { var NewTarget = _getPrototypeOf(this).constructor; result = Reflect.construct(Super, arguments, NewTarget); } else { result = Super.apply(this, arguments); } return _possibleConstructorReturn(this, result); }; }

function _possibleConstructorReturn(self, call) { if (call && (_typeof(call) === "object" || typeof call === "function")) { return call; } return _assertThisInitialized(self); }

function _assertThisInitialized(self) { if (self === void 0) { throw new ReferenceError("this hasn't been initialised - super() hasn't been called"); } return self; }

function _isNativeReflectConstruct() { if (typeof Reflect === "undefined" || !Reflect.construct) return false; if (Reflect.construct.sham) return false; if (typeof Proxy === "function") return true; try { Date.prototype.toString.call(Reflect.construct(Date, [], function () {})); return true; } catch (e) { return false; } }

function _getPrototypeOf(o) { _getPrototypeOf = Object.setPrototypeOf ? Object.getPrototypeOf : function _getPrototypeOf(o) { return o.__proto__ || Object.getPrototypeOf(o); }; return _getPrototypeOf(o); }

function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError("Cannot call a class as a function"); } }

System.register("set-functions-interfaces", [], function (exports_1, context_1) {
  "use strict";

  var ProposedExecutable, CheckingExecutable, CheckedExecutable;

  var __moduleName = context_1 && context_1.id;

  function filterExecutable(_, exec_type) {
    return Object.fromEntries(Object.entries(_).filter(function (keyval) {
      return keyval[1] instanceof exec_type;
    }));
  }

  exports_1("filterExecutable", filterExecutable);
  return {
    setters: [],
    execute: function execute() {
      ProposedExecutable = function ProposedExecutable() {
        _classCallCheck(this, ProposedExecutable);

        this.executable_kind = 'wasm';
        this.birth_height = SmartWeave.block.height;
      };

      exports_1("ProposedExecutable", ProposedExecutable);

      CheckingExecutable = /*#__PURE__*/function (_ProposedExecutable) {
        _inherits(CheckingExecutable, _ProposedExecutable);

        var _super = _createSuper(CheckingExecutable);

        function CheckingExecutable() {
          var _this;

          _classCallCheck(this, CheckingExecutable);

          _this = _super.apply(this, arguments);
          _this.checked = false;
          return _this;
        }

        return CheckingExecutable;
      }(ProposedExecutable);

      exports_1("CheckingExecutable", CheckingExecutable);

      CheckedExecutable = /*#__PURE__*/function (_CheckingExecutable) {
        _inherits(CheckedExecutable, _CheckingExecutable);

        var _super2 = _createSuper(CheckedExecutable);

        function CheckedExecutable() {
          var _this2;

          _classCallCheck(this, CheckedExecutable);

          _this2 = _super2.apply(this, arguments);
          _this2.checked = true;
          return _this2;
        }

        return CheckedExecutable;
      }(CheckingExecutable);

      exports_1("CheckedExecutable", CheckedExecutable);
    }
  };
});
System.register("interfaces", [], function (exports_2, context_2) {
  "use strict";

  var GetFunctions, SetFunctions;

  var __moduleName = context_2 && context_2.id;

  return {
    setters: [],
    execute: function execute() {
      (function (GetFunctions) {
        GetFunctions["unexecuted"] = "unexecuted";
        GetFunctions["executed"] = "executed";
        GetFunctions["checking"] = "checking";
      })(GetFunctions || (GetFunctions = {}));

      exports_2("GetFunctions", GetFunctions);

      (function (SetFunctions) {
        SetFunctions["add"] = "add";
        SetFunctions["run"] = "run";
        SetFunctions["check"] = "check";
      })(SetFunctions || (SetFunctions = {}));

      exports_2("SetFunctions", SetFunctions);
    }
  };
});
System.register("typeguards", [], function (exports_3, context_3) {
  "use strict";

  var isArweaveAddress;

  var __moduleName = context_3 && context_3.id;

  return {
    setters: [],
    execute: function execute() {
      exports_3("isArweaveAddress", isArweaveAddress = function isArweaveAddress(addy) {
        return /[\w-]{43}/i.test(addy);
      });
    }
  };
});
System.register("contract3", ["interfaces", "typeguards", "set-functions-interfaces"], function (exports_4, context_4) {
  "use strict";

  var interfaces_1, typeguards_1, set_functions_interfaces_1, Action;

  var __moduleName = context_4 && context_4.id;

  function handle(state, action) {
    switch (action.input["function"]) {
      case interfaces_1.GetFunctions.unexecuted:
        return {
          result: set_functions_interfaces_1.filterExecutable(state.executables, set_functions_interfaces_1.ProposedExecutable)
        };

      case interfaces_1.GetFunctions.checking:
        return {
          result: set_functions_interfaces_1.filterExecutable(state.executables, set_functions_interfaces_1.CheckingExecutable)
        };

      case interfaces_1.GetFunctions.executed:
        return {
          result: set_functions_interfaces_1.filterExecutable(state.executables, set_functions_interfaces_1.CheckedExecutable)
        };

      case interfaces_1.SetFunctions.add:
        if (typeof action.input.program_address !== 'string') {
          throw new TypeError('Program address must be defined');
        } else if (!typeguards_1.isArweaveAddress(action.input.program_address)) {
          throw new TypeError('Program address must be arweave address');
        } else if (action.input.executable instanceof set_functions_interfaces_1.ProposedExecutable && !state.executables[action.input.program_address]) {
          return Object.defineProperty(state.executables, action.input.program_address, action.input.executable);
        }

        throw new TypeError('no!');

      case interfaces_1.SetFunctions.check:
        if (typeof action.input.program_address !== 'string') {
          throw new TypeError('Program address must be defined');
        } else if (!typeguards_1.isArweaveAddress(action.input.program_address)) {
          throw new TypeError('Program address must be arweave address');
        } else if (action.input.executable instanceof set_functions_interfaces_1.CheckedExecutable && state.executables[action.input.program_address] instanceof set_functions_interfaces_1.CheckingExecutable) {
          return Object.defineProperty(state.executables, action.input.program_address, action.input.executable);
        }

        throw new TypeError('no!');

      case interfaces_1.SetFunctions.run:
        if (typeof action.input.program_address !== 'string') {
          throw new TypeError('Program address must be defined');
        } else if (!typeguards_1.isArweaveAddress(action.input.program_address)) {
          throw new TypeError('Program address must be arweave address');
        } else if (action.input.executable instanceof set_functions_interfaces_1.CheckingExecutable && state.executables[action.input.program_address] instanceof set_functions_interfaces_1.ProposedExecutable) {
          return Object.defineProperty(state.executables, action.input.program_address, action.input.executable);
        }

        throw new TypeError('no!');

      default:
        throw new Error('Invalid function call');
    }
  }

  return {
    setters: [function (interfaces_1_1) {
      interfaces_1 = interfaces_1_1;
    }, function (typeguards_1_1) {
      typeguards_1 = typeguards_1_1;
    }, function (set_functions_interfaces_1_1) {
      set_functions_interfaces_1 = set_functions_interfaces_1_1;
    }],
    execute: function execute() {
      Action = /*#__PURE__*/function () {
        function Action(_caller, _input) {
          _classCallCheck(this, Action);

          this.caller = _caller;
          this.input = _input;
        }

        _createClass(Action, [{
          key: "caller",
          get: function get() {
            return this._caller;
          },
          set: function set(addy) {
            if (typeguards_1.isArweaveAddress(addy)) {
              this._caller = addy;
            } else {
              throw new Error("".concat(addy, " is not an arweave address"));
            }
          }
        }, {
          key: "input",
          get: function get() {
            return this._input;
          },
          set: function set(inp) {
            this._input = inp;
          }
        }]);

        return Action;
      }();
    }
  };
});