"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const ripple_address_codec_1 = require("ripple-address-codec");
const ripple_keypairs_1 = __importDefault(require("ripple-keypairs"));
const common_1 = require("../common");
function generateAddressAPI(options) {
    common_1.validate.generateAddress({ options });
    try {
        const secret = ripple_keypairs_1.default.generateSeed(options);
        const keypair = ripple_keypairs_1.default.deriveKeypair(secret);
        const classicAddress = ripple_keypairs_1.default.deriveAddress(keypair.publicKey);
        const returnValue = {
            xAddress: ripple_address_codec_1.classicAddressToXAddress(classicAddress, false, options && options.test),
            secret
        };
        if (options.includeClassicAddress) {
            returnValue.classicAddress = classicAddress;
            returnValue.address = classicAddress;
        }
        return returnValue;
    }
    catch (error) {
        throw new common_1.errors.UnexpectedError(error.message);
    }
}
exports.generateAddressAPI = generateAddressAPI;
//# sourceMappingURL=generate-address.js.map