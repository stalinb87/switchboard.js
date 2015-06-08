var redis = require('redis');
var util = require('util');
var EventEmitter = require('events').EventEmitter;

var PubSub = function () {
    var _redis = (process.env.REDIS || ':').split(':');
    var port = Number(_redis[1]) || 6379;
    var host = _redis[0] || '127.0.0.1';
    this.sub = redis.createClient(port, host);
    this.pub = redis.createClient(port, host);
    /* Event emitter inheritance */
    EventEmitter.call(this);
    var self = this;
    this.sub.on('subscribe', function (channel, count) {
        self.emit('subscribe', channel, count);
    });
    this.sub.on('message', function (channel, message) {
        self.emit('message', channel, JSON.parse(message));
    });
    this.pub.on('error', manageError);
    this.sub.on('error', manageError);
};

function manageError(e) {
    console.error('PubSub error:', e);
}

/* Event emitter inheritance */
PubSub.prototype = EventEmitter;
util.inherits(PubSub, EventEmitter);

PubSub.prototype.publish = function (channel, message) {
    if (process.env.DEBUG) {
        var _n = 30 + (new Buffer(channel).toJSON().reduce(function (a, b) {
            return a + b;
        }, 0) % 7);
        console.log('\x1b[1;%dm %s -> %j\x1b[0m', _n, channel, message);
    }

    this.pub.publish(channel, JSON.stringify(message));
};

PubSub.prototype.subscribe = function (channel) {
    this.sub.subscribe(channel);
};

PubSub.prototype.unsubscribe = function (channel) {
    this.sub.unsubscribe(channel);
};

module.exports = PubSub;