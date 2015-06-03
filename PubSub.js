var redis = require('redis');
var util = require('util');
var EventEmitter = require('events').EventEmitter;

var PubSub = function () {
    this.sub = redis.createClient();
    this.pub = redis.createClient();
    /* Event emitter inheritance */
    EventEmitter.call(this);
    var self = this;
    this.sub.on('subscribe', function (channel, count) {
        self.emit('subscribe', channel, count);
    });
    this.sub.on('message', function (channel, message) {
        self.emit('message', channel, JSON.parse(message));
    });

};

/* Event emitter inheritance */
PubSub.prototype = EventEmitter;
util.inherits(PubSub, EventEmitter);

PubSub.prototype.publish = function (channel, message) {

    this.pub.publish(channel, JSON.stringify(message));
};

PubSub.prototype.subscribe = function (channel) {
    this.sub.subscribe(channel);
};

PubSub.prototype.unsubscribe = function (channel) {
    this.sub.unsubscribe(channel);
};

PubSub.prototype.multi = function () {
    return this.sub.multi();
}

module.exports = PubSub;