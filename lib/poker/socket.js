'use strict';

Object.defineProperty(exports, "__esModule", {
    value: true
});

var _byte = require('./byte');

var _byte2 = _interopRequireDefault(_byte);

var _events = require('events');

var _events2 = _interopRequireDefault(_events);

var _endian = require('./endian');

var _ws = require('ws');

var _ws2 = _interopRequireDefault(_ws);

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

class Socket extends _events2.default {

    constructor(host, port, byteClass = null) {
        super();

        this._endian = _endian.BIG_ENDIAN;

        this._socket = null;

        this._connected = false;

        this._addInputPosition = 0;

        this._input = null;

        this._output = null;

        this.timeout = 20000;

        this.disableInput = false;

        this._byteClass = byteClass ? byteClass : _byte2.default;

        this.protocols = [];

        if (host && port > 0 && port < 65535) {
            this.connect(host, port);
        }
    }

    get input() {
        return this._input;
    }

    get output() {
        return this._output;
    }

    get connected() {
        return this._connected;
    }

    get endian() {
        return this._endian;
    }

    set endian(value) {
        this._endian = value;
        if (this._output) {
            this._output._endian = value;
        }
        if (this._input) {
            this._input._endian = value;
        }
    }

    connect(host, port) {
        let url = "ws://" + host + ":" + port;
        // if (window.location.protocol === "https:") {
        //     url = "wss://" + host + ":" + port;
        // } else {
        //     url = "ws://" + host + ":" + port;
        // }
        this.connectByUrl(url);
    }

    connectByUrl(url) {
        if (this._socket) {
            this.close();
        }

        this._socket && this.cleanSocket();

        if (!this.protocols || this.protocols.length == 0) {
            this._socket = new _ws2.default(url);
        } else {
            this._socket = new _ws2.default(url, this.protocols);
        }

        this._socket.binaryType = "arraybuffer";

        this._output = new this._byteClass();
        this._output.endian = this.endian;
        this._input = new this._byteClass();
        this._input.endian = this.endian;
        this._addInputPosition = 0;

        this._socket.onopen = e => {
            this._onOpen(e);
        };
        this._socket.onmessage = msg => {
            this._onMessage(msg);
        };
        this._socket.onclose = e => {
            this._onClose(e);
        };
        this._socket.onerror = e => {
            this._onError(e);
        };
    }

    cleanSocket() {
        this._connected = false;
        if (this._socket) {
            this._socket.close();
            this._socket.onopen = null;
            this._socket.onmessage = null;
            this._socket.onclose = null;
            this._socket.onerror = null;
            this._socket = null;
        }
    }

    close() {
        this._socket && this._socket.close();
    }

    _onOpen(e) {
        this._connected = true;
        this.emit('open', e);
    }

    _onMessage(msg) {
        if (!msg || !msg.data) {
            return;
        }
        let data = msg.data;
        if (this.disableInput && data) {
            this.emit('message', data);
            return;
        }
        if (this._input.length > 0 && this._input.bytesAvailable < 1) {
            this._input.clear();
            this._addInputPosition = 0;
        }
        let pre = this._input.pos;
        if (!this._addInputPosition) {
            this._addInputPosition = 0;
        }
        this._input.pos = this._addInputPosition;
        if (data) {
            if (typeof data === 'string') {
                this._input.writeUTFBytes(data);
            } else if (data instanceof ArrayBuffer) {
                this._input.writeArrayBuffer(data);
            } else {
                throw new Error('socket onmessage unkown type');
            }
            this._addInputPosition = this._input.pos;
            this._input.pos = pre;
        }
        this.emit('message', data);
    }

    _onClose(e) {
        this._connected = false;
        this.emit('close', e);
    }

    _onError(e) {
        this.emit('error', e);
    }

    send(data) {
        this._socket.send(data);
    }

    flush() {
        if (this._output && this._output.length > 0) {
            let evt;
            try {
                this._socket && this._socket.send(this._output.__getBuffer().slice(0, this._output.length));
            } catch (e) {
                evt = e;
            }
            this._output.endian = this.endian;
            this._output.clear();
            if (evt) {
                this.emit('error', evt);
            }
        }
    }

}
exports.default = Socket;