"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
Object.defineProperty(exports, "__esModule", { value: true });
const npm_1 = require("../../dist/npm");
const api = new npm_1.RippleAPI({ server: 'wss://s.altnet.rippletest.net:51233' });
parseAccountFlags();
function parseAccountFlags() {
    return __awaiter(this, void 0, void 0, function* () {
        yield api.connect();
        const account_info = yield api.request('account_info', { account: 'rKsdkGhyZH6b2Zzd5hNnEqSv2wpznn4n6N' });
        const flags = api.parseAccountFlags(account_info.account_data.Flags);
        console.log(JSON.stringify(flags, null, 2));
        process.exit(0);
    });
}
//# sourceMappingURL=parseAccountFlags.js.map