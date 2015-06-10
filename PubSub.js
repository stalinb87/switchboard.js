var redis = require('redis'),
    util = require('util'),
    EventEmitter = require('events').EventEmitter,
    isEnding = false,
    endingCount = 0;

var PubSub = function (config) {

    var port = config.redis.port || 6379;
    var host = config.redis.host || '127.0.0.1';
    this.sub = redis.createClient(port, host);
    this.pub = redis.createClient(port, host);
    if (config.redis.pass) {
        this.sub.auth(config.redis.pass);
        this.pub.auth(config.redis.pass);
    }
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
    this.pub.on('end', function () {
        self.manageEnd();
    });
    this.sub.on('end', function () {
        self.manageEnd();
    });
};



function manageError(e) {
    console.error('PubSub error:', e);
}

/* Event emitter inheritance */
PubSub.prototype = EventEmitter;
util.inherits(PubSub, EventEmitter);

PubSub.prototype.manageEnd = function () {
    if (isEnding) {
        endingCount++;
        if (endingCount >= 2) {
            this.emit('end');
            endingCount = 0;
            isEnding = false;
        }
    }

}
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
PubSub.prototype.end = function () {
    isEnding = true;
    this.sub.quit();
    this.pub.quit();
}
module.exports = PubSub;
