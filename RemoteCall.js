"use strict";
var Q = require('q');
var uuid = require('uuid');
var util = require('util');
var EventEmitter = require('events').EventEmitter;
var RemoteObject = function () {
    EventEmitter.call(this);
};
RemoteObject.prototype = EventEmitter;
util.inherits(RemoteObject, EventEmitter);
module.exports = {
    getParameters: function (fn) {
        var _params = fn.toString()
            .match(/^function[^\(]+\(([^\)]+)\)/)[1]
            .replace(/\s/g, '')
            .split(',');
        _params.pop();

        return _params;
    },
    paramCall: function (ipc, fn, params, $done) {
        var _params = this.getParameters(fn).reduce(function (result, p) {
            result.push(params[p]);
            return result;
        }, []);
        _params.push($done || function () {});
        fn.apply(ipc, _params);
    },
    provider: function (ipc, response) {
        var fn = ipc.methods[response.methodCall.method];
        var params = this.getParameters(fn).reduce(function (_params, p) {
            _params.push(response.methodCall[p]);
            return _params;
        }, []);


        params.push(function (err, data) {
            response.error = err;
            response.data = data;

            var from = response.from;
            response.from = response.to;
            response.to = from;
            response.action = 'response';

            ipc.pubSub.publish(response.to, response);
        });


        fn.apply(ipc, params);
    },
    consumer: function (ipc, response) {
        var provider = response.from;
        var methods = response.methods;

        var provide = new RemoteObject();
        methods.reduce(function (_calls, method) {
            var _params = {
                method: method.method
            };
            var _call = {
                method: method.method,
                run: function () {
                    var defer = Q.defer();
                    var uid = uuid.v4();

                    ipc.makeCall({
                        action: 'request',
                        token: ipc.token,
                        from: global.starvox.getPartition() + ':' + ipc.namespace,
                        to: provider,
                        uid: uid,
                        methodCall: _params
                    }, defer);
                    return defer.promise.then(function (response) {
                        var method = _params.method;
                        _params = {
                            method: method
                        };
                        return response;
                    });
                }
            };
            _call.then = function (success, fail, notify) {
                return _call.run().then(success, fail, notify);
            };

            method.params.forEach(function (param) {
                _call[param] = function (value) {
                    _params[param] = typeof value === 'undefined' ? '' : value;
                    return _call;
                };
            });
            provide[method.method] = _call;
            _calls[method.method] = _call;

            return _calls;
        }, {});
        return provide
    }
};