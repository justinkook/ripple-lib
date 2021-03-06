"use strict";
var __importStar = (this && this.__importStar) || function (mod) {
    if (mod && mod.__esModule) return mod;
    var result = {};
    if (mod != null) for (var k in mod) if (Object.hasOwnProperty.call(mod, k)) result[k] = mod[k];
    result["default"] = mod;
    return result;
};
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const _ = __importStar(require("lodash"));
const events_1 = require("events");
const url_1 = require("url");
const ws_1 = __importDefault(require("ws"));
const rangeset_1 = __importDefault(require("./rangeset"));
const errors_1 = require("./errors");
class Connection extends events_1.EventEmitter {
    constructor(url, options = {}) {
        super();
        this._isReady = false;
        this._ws = null;
        this._ledgerVersion = null;
        this._availableLedgerVersions = new rangeset_1.default();
        this._nextRequestID = 1;
        this._retry = 0;
        this._connectTimer = null;
        this._retryTimer = null;
        this._heartbeatInterval = null;
        this._onOpenErrorBound = null;
        this._onUnexpectedCloseBound = null;
        this._fee_base = null;
        this._fee_ref = null;
        this._trace = () => { };
        this._clearHeartbeatInterval = () => {
            clearInterval(this._heartbeatInterval);
        };
        this._startHeartbeatInterval = () => {
            this._clearHeartbeatInterval();
            this._heartbeatInterval = setInterval(() => this._heartbeat(), 1000 * 60);
        };
        this._heartbeat = () => {
            return this.request({ command: 'ping' }).catch(() => this.reconnect());
        };
        this.setMaxListeners(Infinity);
        this._url = url;
        this._config = Object.assign({ timeout: 20 * 1000, connectionTimeout: 2 * 1000 }, options);
        if (typeof options.trace === 'function') {
            this._trace = options.trace;
        }
        else if (options.trace === true) {
            this._trace = console.log;
        }
    }
    _updateLedgerVersions(data) {
        this._ledgerVersion = Number(data.ledger_index);
        if (data.validated_ledgers) {
            this._availableLedgerVersions.reset();
            this._availableLedgerVersions.parseAndAddRanges(data.validated_ledgers);
        }
        else {
            this._availableLedgerVersions.addValue(this._ledgerVersion);
        }
    }
    _updateFees(data) {
        this._fee_base = Number(data.fee_base);
        this._fee_ref = Number(data.fee_ref);
    }
    _parseMessage(message) {
        const data = JSON.parse(message);
        if (data.type === 'response') {
            if (!(Number.isInteger(data.id) && data.id >= 0)) {
                throw new errors_1.ResponseFormatError('valid id not found in response', data);
            }
            return [data.id.toString(), data];
        }
        else if (data.type === undefined && data.error) {
            return ['error', data.error, data.error_message, data];
        }
        if (data.type === 'ledgerClosed') {
            this._updateLedgerVersions(data);
            this._updateFees(data);
        }
        return [data.type, data];
    }
    _onMessage(message) {
        this._trace('receive', message);
        let parameters;
        try {
            parameters = this._parseMessage(message);
        }
        catch (error) {
            this.emit('error', 'badMessage', error.message, message);
            return;
        }
        this.emit.apply(this, parameters);
    }
    get _state() {
        return this._ws ? this._ws.readyState : ws_1.default.CLOSED;
    }
    get _shouldBeConnected() {
        return this._ws !== null;
    }
    isConnected() {
        return this._state === ws_1.default.OPEN && this._isReady;
    }
    _onUnexpectedClose(beforeOpen, resolve, reject, code) {
        if (this._onOpenErrorBound) {
            this._ws.removeListener('error', this._onOpenErrorBound);
            this._onOpenErrorBound = null;
        }
        this._ws.removeAllListeners('open');
        this._ws = null;
        this._isReady = false;
        if (beforeOpen) {
            this.connect().then(resolve, reject);
        }
        else {
            this.emit('disconnected', code || 1006);
            this._retryConnect();
        }
    }
    _calculateTimeout(retriesCount) {
        return retriesCount < 40
            ?
                1000 / 20
            : retriesCount < 40 + 60
                ?
                    1000
                : retriesCount < 40 + 60 + 60
                    ?
                        10 * 1000
                    :
                        30 * 1000;
    }
    _retryConnect() {
        this._retry += 1;
        const retryTimeout = this._calculateTimeout(this._retry);
        this._retryTimer = setTimeout(() => {
            this.emit('reconnecting', this._retry);
            this.connect().catch(this._retryConnect.bind(this));
        }, retryTimeout);
    }
    _clearReconnectTimer() {
        if (this._retryTimer !== null) {
            clearTimeout(this._retryTimer);
            this._retryTimer = null;
        }
    }
    _clearConnectTimer() {
        if (this._connectTimer !== null) {
            clearTimeout(this._connectTimer);
            this._connectTimer = null;
        }
    }
    _onOpen() {
        if (!this._ws) {
            return Promise.reject(new errors_1.DisconnectedError());
        }
        if (this._onOpenErrorBound) {
            this._ws.removeListener('error', this._onOpenErrorBound);
            this._onOpenErrorBound = null;
        }
        const request = {
            command: 'subscribe',
            streams: ['ledger']
        };
        return this.request(request).then((data) => {
            if (_.isEmpty(data) || !data.ledger_index) {
                return this._disconnect(false).then(() => {
                    throw new errors_1.RippledNotInitializedError('Rippled not initialized');
                });
            }
            this._updateLedgerVersions(data);
            this._updateFees(data);
            this._rebindOnUnexpectedClose();
            this._retry = 0;
            this._ws.on('error', error => {
                this.emit('error', 'websocket', error.message, error);
            });
            this._isReady = true;
            this.emit('connected');
            return undefined;
        });
    }
    _rebindOnUnexpectedClose() {
        if (this._onUnexpectedCloseBound) {
            this._ws.removeListener('close', this._onUnexpectedCloseBound);
        }
        this._onUnexpectedCloseBound = this._onUnexpectedClose.bind(this, false, null, null);
        this._ws.once('close', this._onUnexpectedCloseBound);
    }
    _unbindOnUnexpectedClose() {
        if (this._onUnexpectedCloseBound) {
            this._ws.removeListener('close', this._onUnexpectedCloseBound);
        }
        this._onUnexpectedCloseBound = null;
    }
    _onOpenError(reject, error) {
        this._onOpenErrorBound = null;
        this._unbindOnUnexpectedClose();
        reject(new errors_1.NotConnectedError(error.message, error));
    }
    _createWebSocket() {
        const options = {};
        if (this._config.proxy !== undefined) {
            const parsedURL = url_1.parse(this._url);
            const parsedProxyURL = url_1.parse(this._config.proxy);
            const proxyOverrides = _.omitBy({
                secureEndpoint: parsedURL.protocol === 'wss:',
                secureProxy: parsedProxyURL.protocol === 'https:',
                auth: this._config.proxyAuthorization,
                ca: this._config.trustedCertificates,
                key: this._config.key,
                passphrase: this._config.passphrase,
                cert: this._config.certificate
            }, _.isUndefined);
            const proxyOptions = _.assign({}, parsedProxyURL, proxyOverrides);
            let HttpsProxyAgent;
            try {
                HttpsProxyAgent = require('https-proxy-agent');
            }
            catch (error) {
                throw new Error('"proxy" option is not supported in the browser');
            }
            options.agent = new HttpsProxyAgent(proxyOptions);
        }
        if (this._config.authorization !== undefined) {
            const base64 = Buffer.from(this._config.authorization).toString('base64');
            options.headers = { Authorization: `Basic ${base64}` };
        }
        const optionsOverrides = _.omitBy({
            ca: this._config.trustedCertificates,
            key: this._config.key,
            passphrase: this._config.passphrase,
            cert: this._config.certificate
        }, _.isUndefined);
        const websocketOptions = _.assign({}, options, optionsOverrides);
        const websocket = new ws_1.default(this._url, null, websocketOptions);
        if (typeof websocket.setMaxListeners === 'function') {
            websocket.setMaxListeners(Infinity);
        }
        return websocket;
    }
    connect() {
        this._clearConnectTimer();
        this._clearReconnectTimer();
        this._clearHeartbeatInterval();
        return (new Promise((_resolve, reject) => {
            this._connectTimer = setTimeout(() => {
                reject(new errors_1.ConnectionError(`Error: connect() timed out after ${this._config.connectionTimeout} ms. ` +
                    `If your internet connection is working, the rippled server may be blocked or inaccessible.`));
            }, this._config.connectionTimeout);
            if (!this._url) {
                reject(new errors_1.ConnectionError('Cannot connect because no server was specified'));
            }
            const resolve = () => {
                this._startHeartbeatInterval();
                _resolve();
            };
            if (this._state === ws_1.default.OPEN) {
                resolve();
            }
            else if (this._state === ws_1.default.CONNECTING) {
                this._ws.once('open', () => resolve);
            }
            else {
                this._ws = this._createWebSocket();
                this._onOpenErrorBound = this._onOpenError.bind(this, reject);
                this._ws.once('error', this._onOpenErrorBound);
                this._ws.on('message', this._onMessage.bind(this));
                this._onUnexpectedCloseBound = this._onUnexpectedClose.bind(this, true, resolve, reject);
                this._ws.once('close', this._onUnexpectedCloseBound);
                this._ws.once('open', () => {
                    return this._onOpen().then(resolve, reject);
                });
            }
        })
            .then(() => {
            this._clearConnectTimer();
        })
            .catch(err => {
            this._clearConnectTimer();
            throw err;
        }));
    }
    disconnect() {
        return this._disconnect(true);
    }
    _disconnect(calledByUser) {
        this._clearHeartbeatInterval();
        if (calledByUser) {
            this._clearConnectTimer();
            this._clearReconnectTimer();
            this._retry = 0;
        }
        return new Promise(resolve => {
            if (this._state === ws_1.default.CLOSED) {
                resolve();
            }
            else if (this._state === ws_1.default.CLOSING) {
                this._ws.once('close', resolve);
            }
            else {
                if (this._onUnexpectedCloseBound) {
                    this._ws.removeListener('close', this._onUnexpectedCloseBound);
                    this._onUnexpectedCloseBound = null;
                }
                this._ws.once('close', code => {
                    this._ws = null;
                    this._isReady = false;
                    if (calledByUser) {
                        this.emit('disconnected', code || 1000);
                    }
                    resolve();
                });
                this._ws.close();
            }
        });
    }
    reconnect() {
        this.emit('reconnect');
        return this.disconnect().then(() => this.connect());
    }
    _whenReady(promise) {
        return new Promise((resolve, reject) => {
            promise.catch(reject);
            if (!this._shouldBeConnected) {
                reject(new errors_1.NotConnectedError());
            }
            else if (this._state === ws_1.default.OPEN && this._isReady) {
                promise.then(resolve, reject);
            }
            else {
                this.once('connected', () => promise.then(resolve, reject));
            }
        });
    }
    getLedgerVersion() {
        return this._whenReady(Promise.resolve(this._ledgerVersion));
    }
    hasLedgerVersions(lowLedgerVersion, highLedgerVersion) {
        return this._whenReady(Promise.resolve(this._availableLedgerVersions.containsRange(lowLedgerVersion, highLedgerVersion || this._ledgerVersion)));
    }
    hasLedgerVersion(ledgerVersion) {
        return this.hasLedgerVersions(ledgerVersion, ledgerVersion);
    }
    getFeeBase() {
        return this._whenReady(Promise.resolve(Number(this._fee_base)));
    }
    getFeeRef() {
        return this._whenReady(Promise.resolve(Number(this._fee_ref)));
    }
    _send(message) {
        this._trace('send', message);
        return new Promise((resolve, reject) => {
            try {
                this._ws.send(message, undefined, error => {
                    if (error) {
                        reject(new errors_1.DisconnectedError(error.message, error));
                    }
                    else {
                        resolve();
                    }
                });
            }
            catch (error) {
                reject(new errors_1.DisconnectedError(error.message, error));
            }
        });
    }
    request(request, timeout) {
        return new Promise((resolve, reject) => {
            if (!this._shouldBeConnected) {
                reject(new errors_1.NotConnectedError());
            }
            let timer = null;
            const self = this;
            const id = this._nextRequestID;
            this._nextRequestID += 1;
            const eventName = id.toString();
            function onDisconnect() {
                clearTimeout(timer);
                self.removeAllListeners(eventName);
                reject(new errors_1.DisconnectedError('websocket was closed'));
            }
            function cleanup() {
                clearTimeout(timer);
                self.removeAllListeners(eventName);
                if (self._ws !== null) {
                    self._ws.removeListener('close', onDisconnect);
                }
            }
            function _resolve(response) {
                cleanup();
                resolve(response);
            }
            function _reject(error) {
                cleanup();
                reject(error);
            }
            this.once(eventName, response => {
                if (response.status === 'error') {
                    _reject(new errors_1.RippledError(response.error_message || response.error, response));
                }
                else if (response.status === 'success') {
                    _resolve(response.result);
                }
                else {
                    _reject(new errors_1.ResponseFormatError('unrecognized status: ' + response.status, response));
                }
            });
            this._ws.once('close', onDisconnect);
            const message = JSON.stringify(Object.assign({}, request, { id }));
            this._whenReady(this._send(message))
                .then(() => {
                const delay = timeout || this._config.timeout;
                timer = setTimeout(() => _reject(new errors_1.TimeoutError()), delay);
                if (timer.unref) {
                    timer.unref();
                }
            })
                .catch(_reject);
        });
    }
}
exports.default = Connection;
//# sourceMappingURL=connection.js.map