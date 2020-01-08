/// <reference types="node" />
import { EventEmitter } from 'events';
import WebSocket from 'ws';
export interface ConnectionOptions {
    trace?: boolean | ((id: string, message: string) => void);
    proxy?: string;
    proxyAuthorization?: string;
    authorization?: string;
    trustedCertificates?: string[];
    key?: string;
    passphrase?: string;
    certificate?: string;
    timeout: number;
    connectionTimeout: number;
}
export declare type ConnectionUserOptions = Partial<ConnectionOptions>;
declare class Connection extends EventEmitter {
    private _url;
    private _isReady;
    private _ws;
    protected _ledgerVersion: null | number;
    private _availableLedgerVersions;
    private _nextRequestID;
    private _retry;
    private _connectTimer;
    private _retryTimer;
    private _heartbeatInterval;
    private _onOpenErrorBound;
    private _onUnexpectedCloseBound;
    private _fee_base;
    private _fee_ref;
    private _trace;
    private _config;
    constructor(url?: string, options?: ConnectionUserOptions);
    _updateLedgerVersions(data: any): void;
    _updateFees(data: any): void;
    _parseMessage(message: any): [string, Object] | ['error', string, string, Object];
    _onMessage(message: any): void;
    get _state(): number;
    get _shouldBeConnected(): boolean;
    isConnected(): boolean;
    _onUnexpectedClose(beforeOpen: any, resolve: any, reject: any, code: any): void;
    _calculateTimeout(retriesCount: any): number;
    _retryConnect(): void;
    _clearReconnectTimer(): void;
    _clearConnectTimer(): void;
    _onOpen(): Promise<never>;
    _rebindOnUnexpectedClose(): void;
    _unbindOnUnexpectedClose(): void;
    _onOpenError(reject: any, error: any): void;
    _createWebSocket(): WebSocket;
    connect(): Promise<void>;
    disconnect(): Promise<void>;
    _disconnect(calledByUser: any): Promise<void>;
    reconnect(): Promise<void>;
    private _clearHeartbeatInterval;
    private _startHeartbeatInterval;
    private _heartbeat;
    _whenReady<T>(promise: Promise<T>): Promise<T>;
    getLedgerVersion(): Promise<number>;
    hasLedgerVersions(lowLedgerVersion: any, highLedgerVersion: any): Promise<boolean>;
    hasLedgerVersion(ledgerVersion: any): Promise<boolean>;
    getFeeBase(): Promise<number>;
    getFeeRef(): Promise<number>;
    _send(message: string): Promise<void>;
    request(request: any, timeout?: number): Promise<any>;
}
export default Connection;
//# sourceMappingURL=connection.d.ts.map