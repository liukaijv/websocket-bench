'use strict';

Object.defineProperty(exports, "__esModule", {
    value: true
});

var _endian = require('./endian');

class Byte {

    constructor(data) {

        this._sysEndian = null;

        this._xd_ = true;

        this._allocated_ = 8;

        this._pos_ = 0;

        this._length = 0;

        if (data) {
            this._u8d_ = new Uint8Array(data);
            this._d = new DataView(this._u8d_.buffer);
            this._length = this._d.byteLength;
        } else {
            this.___resizeBuffer(this._allocated_);
        }
    }

    static getSystemEndian() {
        if (!this._sysEndian) {
            let buffer = new ArrayBuffer(2);
            new DataView(buffer).setInt16(0, 255, true);
            this._sysEndian = new Int16Array(buffer)[0] === 256 ? _endian.LITTLE_ENDIAN : _endian.BIG_ENDIAN;
        }
        return this._sysEndian;
    }

    get buffer() {
        let buffer = this._u8d_.buffer;
        if (buffer.byteLength === this.length) {
            return buffer;
        }
        return buffer.slice(0, this.length);
    }

    get endian() {
        return this._xd_ ? _endian.LITTLE_ENDIAN : _endian.BIG_ENDIAN;
    }

    set endian(endianStr) {
        this._xd_ = endianStr === _endian.LITTLE_ENDIAN;
    }

    get length() {
        return this._length;
    }

    set length(value) {
        if (this._allocated_ < value) {
            this.___resizeBuffer(this._allocated_ = Math.floor(Math.max(value, this._allocated_ * 2)));
        } else if (this._allocated_ > value) {
            this.___resizeBuffer(this._allocated_ = value);
        } else {
            this._length = value;
        }
    }

    ___resizeBuffer(len) {
        try {
            let newByteView = new Uint8Array(len);
            if (this._u8d_) {
                if (this._u8d_.length <= len) {
                    newByteView.set(this._u8d_);
                } else {
                    newByteView.set(this._u8d_.subarray(0, len));
                }
            }
            this._u8d_ = newByteView;
            this._d = new DataView(newByteView.buffer);
        } catch (e) {
            throw new Error(`___resizeBuffer err:${len};`);
        }
    }

    getString() {
        return this.rUTF(this.getUint16());
    }

    getFloat32Array(start, len) {
        let end = start + len;
        end = end > this._length ? this._length : end;
        let v = new Float32Array(this._d.buffer.slice(start, end));
        this._pos_ = end;
        return v;
    }

    getUint8Array(start, len) {
        let end = start + len;
        end = end > this._length ? this._length : end;
        let v = new Uint8Array(this._d.buffer.slice(start, end));
        this._pos_ = end;
        return v;
    }

    getInt16Array(start, len) {
        let end = start + len;
        end = end > this._length ? this._length : end;
        let v = new Int16Array(this._d.buffer.slice(start, end));
        this._pos_ = end;
        return v;
    }

    getFloat32() {
        if (this._pos_ + 4 > this._length) {
            throw new Error('getFloat32 error - Out of bounds');
        }
        let v = this._d.getFloat32(this._pos_, this._xd_);
        this._pos_ += 4;
        return v;
    }

    getFloat64() {
        if (this._pos_ + 8 > this._length) {
            throw new Error('getFloat64 error - Out of bounds');
        }
        let v = this._d.getFloat64(this._pos_, this._xd_);
        this._pos_ += 8;
        return v;
    }

    writeFloat32(value) {
        this.ensureWrite(this._pos_ + 4);
        this._d.setFloat32(this._pos_, value, this._xd_);
        this._pos_ += 4;
    }

    writeFloat64(value) {
        this.ensureWrite(this._pos_ + 8);
        this._d.setFloat64(this._pos_, value, this._xd_);
        this._pos_ += 8;
    }

    getInt32() {
        if (this._pos_ + 4 > this._length) {
            throw new Error('getInt32 error - Out of bounds');
        }
        let v = this._d.getInt32(this._pos_, this._xd_);
        this._pos_ += 4;
        return v;
    }

    getUint32() {
        if (this._pos_ + 4 > this._length) {
            throw new Error('getUint32 error - Out of bounds');
        }
        let v = this._d.getUint32(this._pos_, this._xd_);
        this._pos_ += 4;
        return v;
    }

    writeInt32(value) {
        this.ensureWrite(this._pos_ + 4);
        this._d.setInt32(this._pos_, value, this._xd_);
        this._pos_ += 4;
    }

    writeUint32(value) {
        this.ensureWrite(this._pos_ + 4);
        this._d.setUint32(this._pos_, value, this._xd_);
        this._pos_ += 4;
    }

    getInt16() {
        if (this._pos_ + 2 > this._length) {
            throw new Error('getInt16 error - Out of bounds');
        }
        let v = this._d.getInt16(this._pos_, this._xd_);
        this._pos_ += 2;
        return v;
    }

    getUint16() {
        if (this._pos_ + 2 > this._length) {
            throw new Error('getUint16 error - Out of bounds');
        }
        let v = this._d.getUint16(this._pos_, this._xd_);
        this._pos_ += 2;
        return v;
    }

    writeInt16(value) {
        this.ensureWrite(this._pos_ + 2);
        this._d.setInt16(this._pos_, value, this._xd_);
        this._pos_ += 2;
    }

    writeUint16(value) {
        this.ensureWrite(this._pos_ + 2);
        this._d.setUint16(this._pos_, value, this._xd_);
        this._pos_ += 2;
    }

    getUint8() {
        if (this._pos_ + 1 > this._length) {
            throw new Error('getUint8 error - Out of bounds');
        }
        return this._d.getUint8(this._pos_++);
    }

    writeUint8(value) {
        this.ensureWrite(this._pos_ + 1);
        this._d.setUint8(this._pos_, value);
        this._pos_++;
    }

    _getUInt8() {
        return this.getUint8();
    }

    _getUint16() {
        return this.getUint16();
    }

    rUTF(len) {
        let v = "",
            max = this._pos_ + len,
            c,
            c2,
            c3,
            f = String.fromCharCode;
        let u = this._u8d_;
        while (this._pos_ < max) {
            c = u[this._pos_++];
            if (c < 0x80) {
                if (c != 0) {
                    v += f(c);
                }
            } else if (c < 0xE0) {
                v += f((c & 0x3F) << 6 | u[this._pos_++] & 0x7F);
            } else if (c < 0xF0) {
                c2 = u[this._pos_++];
                v += f((c & 0x1F) << 12 | (c2 & 0x7F) << 6 | u[this._pos_++] & 0x7F);
            } else {
                c2 = u[this._pos_++];
                c3 = u[this._pos_++];
                v += f((c & 0x0F) << 18 | (c2 & 0x7F) << 12 | c3 << 6 & 0x7F | u[this._pos_++] & 0x7F);
            }
        }
        return v;
    }

    getCustomString(len) {
        let v = "",
            ulen = 0,
            c,
            c2,
            f = String.fromCharCode;
        let u = this._u8d_;
        while (len > 0) {
            c = u[this._pos_];
            if (c < 0x80) {
                v += f(c);
                this._pos_++;
                len--;
            } else {
                ulen = c - 0x80;
                this._pos_++;
                len -= ulen;
                while (ulen > 0) {
                    c = u[this._pos_++];
                    c2 = u[this._pos_++];
                    v += f(c2 << 8 | c);
                    ulen--;
                }
            }
        }
        return v;
    }

    get pos() {
        return this._pos_;
    }

    set pos(value) {
        this._pos_ = value;
    }

    get bytesAvailable() {
        return this._length - this._pos_;
    }

    clear() {
        this._length = 0;
        this._pos_ = 0;
    }

    __getBuffer() {
        return this._d.buffer;
    }

    writeUTFBytes(value) {
        // utf8-decode
        value = value + "";
        for (let i = 0, sz = value.length; i < sz; i++) {
            let c = value.charCodeAt(i);

            if (c <= 0x7F) {
                this.writeByte(c);
            } else if (c <= 0x7FF) {
                //优化为直接写入多个字节，而不必重复调用writeByte，免去额外的调用和逻辑开销。
                this.ensureWrite(this._pos_ + 2);
                this._u8d_.set([0xC0 | c >> 6, 0x80 | c & 0x3F], this._pos_);
                this._pos_ += 2;
            } else if (c <= 0xFFFF) {
                this.ensureWrite(this._pos_ + 3);
                this._u8d_.set([0xE0 | c >> 12, 0x80 | c >> 6 & 0x3F, 0x80 | c & 0x3F], this._pos_);
                this._pos_ += 3;
            } else {
                this.ensureWrite(this._pos_ + 4);
                this._u8d_.set([0xF0 | c >> 18, 0x80 | c >> 12 & 0x3F, 0x80 | c >> 6 & 0x3F, 0x80 | c & 0x3F], this._pos_);
                this._pos_ += 4;
            }
        }
    }

    writeUTFString(value) {
        let tPos = this.pos;
        this.writeUint16(1);
        this.writeUTFBytes(value);
        let dPos = this.pos - tPos - 2;
        //console.log("writeLen:",dPos,"pos:",tPos);
        if (dPos >= 65536) {
            throw new Error("writeUTFString byte len more than 65536");
        }
        this._d.setUint16(tPos, dPos, this._xd_);
    }

    readUTFString() {
        return this.readUTFBytes(this.getUint16());
    }

    getUTFString() {
        return this.readUTFString();
    }

    readUTFBytes(len = -1) {
        if (len === 0) {
            return '';
        }
        let lastBytes = this.bytesAvailable;
        if (len > lastBytes) {
            throw new Error("readUTFBytes error - Out of bounds");
        }
        len = len > 0 ? len : lastBytes;
        return this.rUTF(len);
    }

    getUTFBytes(len = -1) {
        return this.readUTFBytes(len);
    }

    writeByte(value) {
        this.ensureWrite(this._pos_ + 1);
        this._d.setInt8(this._pos_, value);
        this._pos_ += 1;
    }

    readByte() {
        if (this._pos_ + 1 > this._length) throw new Error("readByte error - Out of bounds");
        return this._d.getInt8(this._pos_++);
    }

    getByte() {
        return this.readByte();
    }

    ensureWrite(lengthToEnsure) {
        if (this._length < lengthToEnsure) this._length = lengthToEnsure;
        if (this._allocated_ < lengthToEnsure) this.length = lengthToEnsure;
    }

    writeArrayBuffer(arraybuffer, offset = 0, length = 0) {
        if (offset < 0 || length < 0) throw new Error("writeArrayBuffer error - Out of bounds");
        if (length == 0) length = arraybuffer.byteLength - offset;
        //$ALERT 这里会分配用户指定的内存空间，这可能导致分配多余的内存空间，甚至导致内存溢出。应该进行有效性检查。如果用户想要分配多余的空间，应该使用set length。
        this.ensureWrite(this._pos_ + length);
        let uint8array = new Uint8Array(arraybuffer);
        this._u8d_.set(uint8array.subarray(offset, offset + length), this._pos_);
        this._pos_ += length;
    }

}
exports.default = Byte;