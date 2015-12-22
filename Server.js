'use strict';

var pubSub;
var ipcNamespace = 'com.starvox.core.ipc';
var redis = require('redis');
var uuid = require('uuid');
var Debuger = require('debug');
var debug = new Debuger('starvox:ipmc:server');
var client;
/*
 @TODO: implement the validation
 */
var validate = function (request) {
    return {
        namespace: request.from
    };
};
var actions = {
    register: function (request, data) {
        //@todo validate token
        var callback = function (err, provider) {
            var response = {};
            if (err) {
                response.error = err;
            } else {
                response = {
                    action: 'response',
                    uid: request.uid,
                    from: ipcNamespace,
                    to: request.from + ':' + provider.uid
                };
            }
            debug('Message id %s send to \'%s\' with the action \'%s\'', response.uid, response.to, response.action);
            pubSub.publish(data.namespace, response);
        };

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
                client.set(namespace, JSON.stringify(data), callback);
            }
        });
    },
    consume: function (request) {
        var key = Object.keys(request.consume)[0];
        client.get(key, function (err, value) {
            if (!err && !!value) {
                value = JSON.parse(value);
                var provider = key + ':' + value.uid;
                request.to = key;
                debug('Message id %s send to \'%s\' with the action \'%s\'', request.uid, request.to, request.action);
                pubSub.publish(provider, request);
            }
        });
    }
};
// {
//     redis: {
//         port: 6379,
//         host: '127.0.0.1',
//         pass: 'xxx-yyyy'
//     },
//     namespace: 'com.starvox.core.ipc'
// }
function server(config) {
    client = redis.createClient();
    pubSub = new(require('./PubSub'))(config);
    config.namespace = config.namespace || 'com.starvox.core.ipc';
    pubSub.subscribe(config.namespace);
    debug('IPC Server started and subscribe to %s', config.namespace);

    pubSub.on('message', function (channel, request) {

        debug('Message id %s receive from \'%s\' with the action \'%s\'', request.uid, request.from, request.action);

        var data = validate(request);
        if (actions[request.action]) {
            actions[request.action](request, data);
        } else {
            debug('Invalid action %s', request.action);
        }

    });
}


module.exports = function (config) {
    return {
        start: function (cnf) {
            config = cnf || config;
            server(config);
        }
    };
};