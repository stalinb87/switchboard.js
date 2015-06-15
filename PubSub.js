"use strict";
/**
 * Is a PubSub wrapper that use internally redis
 */

//the redis object connection
var redis = require('redis'),
    util = require('util'),
    EventEmitter = require('events').EventEmitter,
    isEnding = false,
    endingCount = 0,
    ipcNamespace = 'com.starvox.core.ipc'


    /**
     * A function that handle error
     * @param  {Error} e An Error object
     */
    function manageError(e) {
        console.error('PubSub error:', e);
    }

    /**
     * Ask if a channel already has a partition
     */
    function hasPartition(channel) {
        return /^[\w_\-]+:/.test(channel);
    }
    /**
     * PubSub object with publish and subscription
     * @param {Object} config A configuration object with the connection to redis
     */
var PubSub = function (config) {
    this.partition = config.partition;
    //setting the redis configuration
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

    //implementing the subscribe event
    this.sub.on('subscribe', function (channel, count) {
        self.emit('subscribe', channel, count);
    });

    //implementing the on message event
    this.sub.on('message', function (channel, message) {

        channel = channel.replace(self.partition + ':', '');
        self.emit('message', channel, JSON.parse(message));
    });

    //handling errors
    this.pub.on('error', manageError);
    this.sub.on('error', manageError);

    //handling end
    this.pub.on('end', function () {
        self.manageEnd();
    });
    this.sub.on('end', function () {
        self.manageEnd();
    });
};





/* Event emitter inheritance */
PubSub.prototype = EventEmitter;
util.inherits(PubSub, EventEmitter);
/**
 * Handle the end
 */
PubSub.prototype.manageEnd = function () {
    //if the end was call
    if (isEnding) {
        endingCount += 1;
        // end the event of end was call for pub and sub client
        if (endingCount >= 2) {
            this.emit('end');
            endingCount = 0;
            isEnding = false;
        }
    }

};

/**
 * Implementing the  publish mechanism
 * @param  {string} channel The channel to publish
 * @param  {Object} message the message to publish
 */
PubSub.prototype.publish = function (channel, message, partition) {

    if (channel !== ipcNamespace && !hasPartition(channel)) {
        partition = partition || this.partition;
        channel = partition + ':' + channel;
    }
    if (process.env.DEBUG) {
        var _n = 40 + (new Buffer(channel).toJSON().data.reduce(function (a, b) {
            return a + b;
        }, 0) % 7);
        console.log('\x1b[1;%s;37m publishing: %s -> %j\x1b[0m', _n, channel, message);
    }
    this.pub.publish(channel, JSON.stringify(message));
};

/**
 * Implementing the  subscribe mechanism
 * @param  {string} channel The channel to subscribe
 */
PubSub.prototype.subscribe = function (channel) {

    if (channel !== ipcNamespace && !hasPartition(channel)) {
        channel = this.partition + ':' + channel;
    }
    if (process.env.DEBUG) {
        var _n = 41 + (new Buffer(channel).toJSON().data.reduce(function (a, b) {
            return a + b;
        }, 0) % 6);
        console.log('\x1b[1;%s;37m subscribing to %s\x1b[0m', _n, channel);
    }
    this.sub.subscribe(channel);
};

/**
 * Implementing the  unsubscribe mechanism
 * @param  {String} channel The channel to unsubscribe
 */
PubSub.prototype.unsubscribe = function (channel) {
    if (channel !== ipcNamespace && !hasPartition(channel)) {
        channel = this.partition + ':' + channel;
    }
    this.sub.unsubscribe(channel);
};

/**
 * Implementing the end mechanism
 */
PubSub.prototype.end = function () {
    isEnding = true;
    this.sub.quit();
    this.pub.quit();
};
module.exports = PubSub;