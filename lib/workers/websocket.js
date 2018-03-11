var Socket = require('../poker/socket-client'),
    util = require('util'),
    BaseWorker = require('./baseworker.js'),
    logger = require('../logger.js');

var SocketWorker = function (server, generator) {
    SocketWorker.super_.apply(this, arguments);
};

util.inherits(SocketWorker, BaseWorker);

SocketWorker.prototype.createClient = function (callback) {
    var self = this;
    var client = new Socket.default();

    client.connectByUrl(this.server);

    client.on('open', function () {
        callback(false, client);
    });

    client.on('close', function (err) {
        if (self.verbose) {
            logger.error("Websocket Worker close: " + JSON.stringify(err));
        }
        callback(true, client);
    });

    client.on('error', function (err) {
        if (self.verbose) {
            logger.error("Websocket Worker error: " + JSON.stringify(err));
        }
        callback(true, client);
    });

};

module.exports = SocketWorker;