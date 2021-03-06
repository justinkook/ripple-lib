"use strict";
var __importStar = (this && this.__importStar) || function (mod) {
    if (mod && mod.__esModule) return mod;
    var result = {};
    if (mod != null) for (var k in mod) if (Object.hasOwnProperty.call(mod, k)) result[k] = mod[k];
    result["default"] = mod;
    return result;
};
Object.defineProperty(exports, "__esModule", { value: true });
const constants = __importStar(require("./constants"));
exports.constants = constants;
const errors = __importStar(require("./errors"));
exports.errors = errors;
const validate = __importStar(require("./validate"));
exports.validate = validate;
const serverInfo = __importStar(require("./serverinfo"));
exports.serverInfo = serverInfo;
const ripple_address_codec_1 = require("ripple-address-codec");
function ensureClassicAddress(account) {
    if (ripple_address_codec_1.isValidXAddress(account)) {
        const { classicAddress, tag } = ripple_address_codec_1.xAddressToClassicAddress(account);
        if (tag !== false) {
            throw new Error('This command does not support the use of a tag. Use an address without a tag.');
        }
        return classicAddress;
    }
    else {
        return account;
    }
}
exports.ensureClassicAddress = ensureClassicAddress;
var utils_1 = require("./utils");
exports.dropsToXrp = utils_1.dropsToXrp;
exports.xrpToDrops = utils_1.xrpToDrops;
exports.toRippledAmount = utils_1.toRippledAmount;
exports.removeUndefined = utils_1.removeUndefined;
exports.convertKeysFromSnakeCaseToCamelCase = utils_1.convertKeysFromSnakeCaseToCamelCase;
exports.iso8601ToRippleTime = utils_1.iso8601ToRippleTime;
exports.rippleTimeToISO8601 = utils_1.rippleTimeToISO8601;
var connection_1 = require("./connection");
exports.Connection = connection_1.default;
var txflags_1 = require("./txflags");
exports.txFlags = txflags_1.txFlags;
//# sourceMappingURL=index.js.map