"use strict";
var pubSub = new(require('./PubSub'))();
var ipcNamespace = 'com.starvox.core.ipc';
var redis = require('redis');
var uuid = require('uuid');
var client;

function Server() {
    client = redis.createClient();
    pubSub.subscribe(ipcNamespace);
    console.log('IPC Server started and subscribe to %s', ipcNamespace);
}

var validate = function (request) {
    return {
        namespace: request.token
    };
};
var register = function (request, data, callback) {
    //@todo validate token
    var namespace = data.namespace;
    client.get(namespace, function (err, value) {
        if (err) {
            return callback(err);
        }
        if (value) {
            callback(null, JSON.parse(value));
        } else {
            var data = {
                uid: uuid.v4(),
                lastRegister: Date.now()
            };
            client.set(namespace, JSON.stringify(data), function (err) {
                callback(err, data);
            });
        }
    });
};

var consume = function (request, data, callback) {
    client.get(request.to, function (err, value) {
        if (err) {
            return callback(err);
        }
        if (value) {
            pubSub.publish(request.to + ':' + value.uid, request);
            callback();
        } else {
            callback(new Error('This namespace doesn\'st exist or are not register yet'));
        }
    });
};
/**
 * Waiting a
 * @param  {[type]} channel  [description]
 * @param  {[type]} message) {}          [description]
 * @return {[type]}          [description]
 */
pubSub.on('message', function (channel, request) {
    //decode the
    // console.log(request.action);
    console.log('Message id %s receive from \'%s\' with the action \'%s\'', request.uid, request.from, request.action);
    var data = validate(request);

    switch (request.action) {
    case 'register':
        {
            register(request, data, function (err, provider) {
                var response = {};
                if (err) {
                    response.error = err;
                } else {
                    response = {
                        action: 'response',
                        uid: request.uid,
                        from: ipcNamespace,
                        to: data.namespace + ':' + provider.uid
                    };
                }
                pubSub.publish(data.namespace, response);
            });
            break;
        }
    case 'consume':
        {
            var key = Object.keys(request.consume)[0];
            client.get(key, function (err, value) {
                if (!err && !! value) {
                    value = JSON.parse(value);
                    var provider = key + ':' + value.uid;
                    request.to = key;
                    console.log('responding with', request);
                    pubSub.publish(provider, request);
                }
            });
        }
    }

});


var server = new Server();

// IPC.prototype.add = function (funcName, callback) {
//     this.callback = callback;
//     pubSub.publish(this.namespace);
// };