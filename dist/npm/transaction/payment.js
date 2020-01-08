"use strict";
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
const validate = utils.common.validate;
const toRippledAmount = utils.common.toRippledAmount;
const paymentFlags = utils.common.txFlags.Payment;
const ValidationError = utils.common.errors.ValidationError;
const common_1 = require("../common");
const utils_1 = require("./utils");
function isMaxAdjustment(source) {
    return source.maxAmount !== undefined;
}
function isMinAdjustment(destination) {
    return destination.minAmount !== undefined;
}
function isXRPToXRPPayment(payment) {
    const { source, destination } = payment;
    const sourceCurrency = isMaxAdjustment(source)
        ? source.maxAmount.currency
        : source.amount.currency;
    const destinationCurrency = isMinAdjustment(destination)
        ? destination.minAmount.currency
        : destination.amount.currency;
    return ((sourceCurrency === 'XRP' || sourceCurrency === 'drops') &&
        (destinationCurrency === 'XRP' || destinationCurrency === 'drops'));
}
function isIOUWithoutCounterparty(amount) {
    return (amount &&
        amount.currency !== 'XRP' &&
        amount.currency !== 'drops' &&
        amount.counterparty === undefined);
}
function applyAnyCounterpartyEncoding(payment) {
    _.forEach([payment.source, payment.destination], adjustment => {
        _.forEach(['amount', 'minAmount', 'maxAmount'], key => {
            if (isIOUWithoutCounterparty(adjustment[key])) {
                adjustment[key].counterparty = adjustment.address;
            }
        });
    });
}
function createMaximalAmount(amount) {
    const maxXRPValue = '100000000000';
    const maxIOUValue = '9999999999999999e80';
    let maxValue;
    if (amount.currency === 'XRP') {
        maxValue = maxXRPValue;
    }
    else if (amount.currency === 'drops') {
        maxValue = common_1.xrpToDrops(maxXRPValue);
    }
    else {
        maxValue = maxIOUValue;
    }
    return _.assign({}, amount, { value: maxValue });
}
function validateAndNormalizeAddress(address, expectedTag) {
    const classicAddress = utils_1.getClassicAccountAndTag(address, expectedTag);
    classicAddress.tag =
        classicAddress.tag === false ? undefined : classicAddress.tag;
    return classicAddress;
}
function createPaymentTransaction(address, paymentArgument) {
    const payment = _.cloneDeep(paymentArgument);
    applyAnyCounterpartyEncoding(payment);
    const sourceAddressAndTag = validateAndNormalizeAddress(payment.source.address, payment.source.tag);
    const addressToVerifyAgainst = validateAndNormalizeAddress(address, undefined);
    if (addressToVerifyAgainst.classicAccount !== sourceAddressAndTag.classicAccount) {
        throw new ValidationError('address must match payment.source.address');
    }
    if (addressToVerifyAgainst.tag !== undefined &&
        sourceAddressAndTag.tag !== undefined &&
        addressToVerifyAgainst.tag !== sourceAddressAndTag.tag) {
        throw new ValidationError('address includes a tag that does not match payment.source.tag');
    }
    const destinationAddressAndTag = validateAndNormalizeAddress(payment.destination.address, payment.destination.tag);
    if ((isMaxAdjustment(payment.source) && isMinAdjustment(payment.destination)) ||
        (!isMaxAdjustment(payment.source) && !isMinAdjustment(payment.destination))) {
        throw new ValidationError('payment must specify either (source.maxAmount ' +
            'and destination.amount) or (source.amount and destination.minAmount)');
    }
    const destinationAmount = isMinAdjustment(payment.destination)
        ? payment.destination.minAmount
        : payment.destination.amount;
    const sourceAmount = isMaxAdjustment(payment.source)
        ? payment.source.maxAmount
        : payment.source.amount;
    const amount = isMinAdjustment(payment.destination) && !isXRPToXRPPayment(payment)
        ? createMaximalAmount(destinationAmount)
        : destinationAmount;
    const txJSON = {
        TransactionType: 'Payment',
        Account: sourceAddressAndTag.classicAccount,
        Destination: destinationAddressAndTag.classicAccount,
        Amount: toRippledAmount(amount),
        Flags: 0
    };
    if (payment.invoiceID !== undefined) {
        txJSON.InvoiceID = payment.invoiceID;
    }
    if (sourceAddressAndTag.tag !== undefined) {
        txJSON.SourceTag = sourceAddressAndTag.tag;
    }
    if (destinationAddressAndTag.tag !== undefined) {
        txJSON.DestinationTag = destinationAddressAndTag.tag;
    }
    if (payment.memos !== undefined) {
        txJSON.Memos = _.map(payment.memos, utils.convertMemo);
    }
    if (payment.noDirectRipple === true) {
        txJSON.Flags |= paymentFlags.NoRippleDirect;
    }
    if (payment.limitQuality === true) {
        txJSON.Flags |= paymentFlags.LimitQuality;
    }
    if (!isXRPToXRPPayment(payment)) {
        if (payment.allowPartialPayment || isMinAdjustment(payment.destination)) {
            txJSON.Flags |= paymentFlags.PartialPayment;
        }
        txJSON.SendMax = toRippledAmount(sourceAmount);
        if (isMinAdjustment(payment.destination)) {
            txJSON.DeliverMin = toRippledAmount(destinationAmount);
        }
        if (payment.paths !== undefined) {
            txJSON.Paths = JSON.parse(payment.paths);
        }
    }
    else if (payment.allowPartialPayment === true) {
        throw new ValidationError('XRP to XRP payments cannot be partial payments');
    }
    return txJSON;
}
function preparePayment(address, payment, instructions = {}) {
    try {
        validate.preparePayment({ address, payment, instructions });
        const txJSON = createPaymentTransaction(address, payment);
        return utils.prepareTransaction(txJSON, this, instructions);
    }
    catch (e) {
        return Promise.reject(e);
    }
}
exports.default = preparePayment;
//# sourceMappingURL=payment.js.map