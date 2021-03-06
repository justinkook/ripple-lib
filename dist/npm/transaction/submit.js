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
var __importStar = (this && this.__importStar) || function (mod) {
    if (mod && mod.__esModule) return mod;
    var result = {};
    if (mod != null) for (var k in mod) if (Object.hasOwnProperty.call(mod, k)) result[k] = mod[k];
    result["default"] = mod;
    return result;
};
Object.defineProperty(exports, "__esModule", { value: true });
const _ = __importStar(require("lodash"));
const utils = __importStar(require("./utils"));
const common_1 = require("../common");
function isImmediateRejection(engineResult) {
    return _.startsWith(engineResult, 'tem');
}
function formatSubmitResponse(response) {
    const data = {
        resultCode: response.engine_result,
        resultMessage: response.engine_result_message,
        engine_result: response.engine_result,
        engine_result_code: response.engine_result_code,
        engine_result_message: response.engine_result_message,
        tx_blob: response.tx_blob,
        tx_json: response.tx_json
    };
    if (isImmediateRejection(response.engine_result)) {
        throw new utils.common.errors.RippledError('Submit failed', data);
    }
    return data;
}
function submit(signedTransaction) {
    return __awaiter(this, void 0, void 0, function* () {
        common_1.validate.submit({ signedTransaction });
        const response = yield this.request('submit', { tx_blob: signedTransaction });
        return formatSubmitResponse(response);
    });
}
exports.default = submit;
//# sourceMappingURL=submit.js.map