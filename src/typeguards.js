"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.isArweaveAddress = void 0;
var isArweaveAddress = function (addy) {
    return /[\w-]{43}/i.test(addy);
};
exports.isArweaveAddress = isArweaveAddress;
// RIGHT, the best option here is clean slate refactor, im just being dumb.
// let programaddress be undef if querying everything else it's arweaveaddress
