'use strict';

Object.defineProperty(exports, "__esModule", {
    value: true
});

var _byte = require('./byte');

var _byte2 = _interopRequireDefault(_byte);

var _protobufjs = require('protobufjs');

var _events = require('events');

var _events2 = _interopRequireDefault(_events);

var _socket = require('./socket');

var _socket2 = _interopRequireDefault(_socket);

var _proto = require('./proto');

var protoJson = _interopRequireWildcard(_proto);

function _interopRequireWildcard(obj) { if (obj && obj.__esModule) { return obj; } else { var newObj = {}; if (obj != null) { for (var key in obj) { if (Object.prototype.hasOwnProperty.call(obj, key)) newObj[key] = obj[key]; } } newObj.default = obj; return newObj; } }

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

class SocketClient extends _events2.default {

    constructor(host, port, params = {}) {
        super();

        this._socket = null;
        this._reqId = 0;
        this._callbacks = {};

        this.heartbeatInterval = params.heartbeatInterval || 5000;
        this.heartbeatTimeout = params.heartbeatTimeout || this.heartbeatInterval * 2;
        this.nextHeartbeatTimeout = params.nextHeartbeatTimeout || 0;
        this.gapThreshold = params.gapThreshold || 100;
        this.heartbeatId = null;
        this.heartbeatTimeoutId = null;

        this.reconnect = false;
        this.reconncetTimer = false;
        this.reconnectUrl = params.reconnectUrl;
        this.reconnectAttempts = 0;
        this.reconnectionDelay = params.reconnectionDelay || 5000;
        this.maxReconnectAttempts = 10;

        this.protoRoot = params.protoJson ? _protobufjs.Root.fromJSON(params.protoJson) : _protobufjs.Root.fromJSON(protoJson);

        if (host && port > 0 && port < 65535) {
            this.connect(host, port);
        }
    }

    connect(host, port) {
        let url = "ws://" + host + ":" + port;
        // if (window.location.protocol === "https:") {
        //     url = "wss://" + host + ":" + port;
        // } else {
        //     url = "ws://" + host + ":" + port;
        // }
        if (!this.reconnectUrl) {
            this.reconnectUrl = url;
        }
        this.connectByUrl(url);
    }

    connectByUrl(url) {
        let onopen = e => {
            if (this.reconnect) {
                this.emit('reconnect', e);
            } else {
                this.emit('open', e);
            }
            this.reset();
        };
        let onmessage = e => {
            this.onMessage(e instanceof ArrayBuffer ? e : e.data);
            if (this.heartbeatTimeout) {
                this.nextHeartbeatTimeout = Date.now() + this.heartbeatTimeout;
            }
        };
        let onerror = e => {
            this.emit('error', e);
        };
        let onclose = e => {
            this.emit('close', e);
            this.emit('disconnect', e);
            if (this.reconnect && this.reconnectAttempts < this.maxReconnectAttempts) {
                this.reconnect = true;
                this.reconnectAttempts++;
                this.reconncetTimer = setTimeout(() => {
                    if (this.reconnectUrl) {
                        this.connectByUrl(this.reconnectUrl);
                    }
                }, this.reconnectionDelay);
                this.reconnectionDelay *= 2;
            }
        };
        this._socket = new _socket2.default();
        this._socket.connectByUrl(url);
        this._socket.on('open', onopen);
        this._socket.on('message', onmessage);
        this._socket.on('error', onerror);
        this._socket.on('close', onclose);
    }

    disconnect() {
        if (this._socket) {
            this._socket.disconnect && this._socket.disconnect();
            this._socket.close && this._socket.close();
            this._socket = null;
        }
        if (this.heartbeatId) {
            clearTimeout(this.heartbeatId);
            this.heartbeatId = null;
        }
        if (this.heartbeatTimeoutId) {
            clearTimeout(this.heartbeatTimeoutId);
            this.heartbeatTimeoutId = null;
        }
    }

    reset() {
        this.reconnect = false;
        this.reconnectionDelay = 5 * 1000;
        this.reconnectAttempts = 0;
        clearTimeout(this.reconncetTimer);
    }

    notify(route, data) {
        data = data || {};
        this.sendMessage(0, route, data);
    }

    request(route, data, cb) {
        if (!route) {
            return;
        }
        if (arguments.length === 2 && typeof data === 'function') {
            cb = data;
            data = {};
        } else {
            data = data || {};
        }
        this._reqId++;
        this.sendMessage(this._reqId, route, data);
        this._callbacks[this._reqId] = cb;
    }

    sendMessage(reqId, route, data) {

        let output = this._socket.output;

        let messageProto = this.protoRoot.lookupType(route);
        let messageInstance = messageProto.create(data);
        let buffer = messageProto.encode(messageInstance).finish();

        output.endian = "BigEndian";
        output.writeByte(route.length);
        output.writeUTFBytes(route);
        output.writeArrayBuffer(buffer);
        output.writeUint32(reqId);

        console.debug(`socket: sendMessage: ${reqId}-${route}-${JSON.stringify(data)}`);

        this._socket.flush();
    }

    onMessage(message) {
        if (message instanceof ArrayBuffer) {

            let byte = new _byte2.default(message);
            byte.endian = "BigEndian";
            let len = byte.readByte();
            let route = byte.readUTFBytes(len);
            let protoBuffer = byte.buffer.slice(1 + len, -4);
            byte.pos = byte.buffer.byteLength - 4;
            let reqId = byte.getUint32();

            let messageProto = this.protoRoot.lookupType(route);
            let data = messageProto.decode(new Uint8Array(protoBuffer));

            this.processMessage(reqId, route, data);

            console.debug(`socket: onMessage: ${reqId}-${route}-${JSON.stringify(data)}`);
        } else {
            throw new Error('socket onmessage data must ArrayBuffer');
        }
    }

    processMessage(seqId, route, data) {
        if (!seqId || seqId === 0) {
            this.emit(route, data);
            return;
        }
        let cb = this._callbacks[seqId];
        delete this._callbacks[seqId];
        if (typeof cb === 'function') {
            cb(data);
        }
    }

    heartbeat() {
        if (!this.heartbeatInterval) {
            return;
        }
        if (this.heartbeatTimeoutId) {
            clearTimeout(this.heartbeatTimeoutId);
            this.heartbeatTimeoutId = null;
        }
        if (this.heartbeatId) {
            return;
        }
        let messageName = 'HeartbeatRequest';
        let messageProto = this.protoRoot.lookupType(messageName);
        let buffer = messageProto.encode(messageProto.create()).finish();
        this.heartbeatId = setTimeout(() => {
            this.heartbeatId = null;
            this.sendMessage(0, messageName, buffer);

            this.nextHeartbeatTimeout = Date.now() + this.heartbeatTimeout;
            this.heartbeatTimeoutId = setTimeout(this.heartbeatTimeoutCb.bind(this), this.heartbeatTimeout);
        }, this.heartbeatInterval);
    }

    heartbeatTimeoutCb() {
        let gap = this.nextHeartbeatTimeout - Date.now();
        if (gap > this.gapThreshold) {
            this.heartbeatTimeoutId = setTimeout(this.heartbeatTimeoutCb, gap);
        } else {
            this.emit('heartbeat timeout');
            this.disconnect();
            console.debug('socket: heartbeat timeout');
        }
    }

}
exports.default = SocketClient;