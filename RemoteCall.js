"use strict";
var Q = require('q');
var uuid = require('uuid');

module.exports = {
    getParameters: function (fn) {
        var _params = fn.toString()
            .match(/^function[^\(]+\(([^\)]+)\)/)[1]
            .replace(/\s/g, '')
            .split(',');
        _params.pop();

        return _params;
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

        return methods.reduce(function (_calls, method) {
            var _params = {
                method: method.method
            },
                _call = {
                    run: function () {
                        var defer = Q.defer();
                        var uid = uuid.v4();

                        ipc.makeCall({
                            action: 'request',
                            token: ipc.token,
                            from: ipc.namespace,
                            to: provider,
                            uid: uid,
                            methodCall: _params
                        }, defer);
                        return defer.promise;
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

            _calls[method.method] = _call;

            return _calls;
        }, {});
    }
};