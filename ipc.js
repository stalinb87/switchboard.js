//the pubsub driver

var remoteCall = require('./RemoteCall');

//a promise baby!!!
var Q = require('q');

var uuid = require('uuid');

//the server namespace
var ipcNamespace = 'com.starvox.core.ipc';

//default max attemps for message between process
var maxAttemps = 3;

//default timeout for message between process
var timeout = 5000;


/**
 * Inter process comunication object that allow to register as a provider and/or consumer
 * @param {[type]} namespace [description]
 * @param {[type]} token     [description]
 */
function IPC(namespace, token, starvoxConf) {
    var self = this;
    var registrationResponse;
    //the list of promise that will be save on every message
    this.promises = {};

    //the current namespace
    this.namespace = namespace;

    //the channel to listen for message;
    this.channel = null;
    //the current token for this worker
    this.token = namespace;

    //a flag to know if as provider i am already registered
    this.isRegister = false;

    //when i am a provider, the list of method that i provide
    //should be a key method object ex: {call: function(param1, param2...){}};
    this.methods = {};

    this.pubSub = new(require('./PubSub'))(starvoxConf);

    //handle all message received
    this.pubSub.on('message', function (channel, response) {
        var toResponse = response;
        try {
            switch (response.action) {
            case 'request':
                {

                    return remoteCall.provider(self, response);
                    break;
                }
            case 'response':
                {
                    //basicly if is not still register and is trying to do it
                    if (!self.isRegister && channel === self.namespace) {
                        //subscribe to the new namespace the namespace with the unique value
                        self.channel = response.to;
                        self.pubSub.subscribe(response.to);
                        self.isRegister = true;
                    } else {
                        //llamada a un request
                    }
                    break;
                }
            case 'consume':
                {
                    //here the server send a consume request, is neccesary that
                    //the provider response with the method construction of the request methods
                    //get the namespace to consume
                    var key = Object.keys(response.consume)[0];
                    if (key) {
                        //get the methods that require the consumer
                        var methods = response.consume[key];

                        //this should be temporal after Rilke builds the
                        //method description
                        response.methods = [];
                        response.to = response.from;
                        response.from = self.channel;
                        response.action = 'provides';
                        delete response.consume;
                        delete response.token;

                        for (var method in methods) {
                            method = methods[method];

                            // Validate this method exists
                            if (!self.methods[method]) {
                                response.error = {
                                    code: 'XXXX-1',
                                    message: 'Unknown method called: ' + method
                                };
                                break;
                            }

                            // Extract parameters
                            var params = remoteCall.getParameters(self.methods[method]);

                            response.methods.push({
                                method: method,
                                params: params
                            });
                        }

                        //response with the method construction
                        self.pubSub.publish(response.to, response);
                    }
                    break;
                }

            case 'provides':
                {
                    //@todo build the object and modify toResponse to be the resolve value

                    toResponse = remoteCall.consumer(self, response);

                    break;
                }
            }

            //If there is a promise for this message remove the interval for not calling again, resolve the promise  and remove it
            if (self.promises[response.uid]) {
                clearInterval(self.promises[response.uid].interval);
                //if is registering don't resolve the promise resolve it when
                //subscribe successfully to the new channel, save the value to a variable for
                //send the response  when promise is resolve on the on subscribe event

                if (response.action === 'response' && response.from === ipcNamespace) {

                    registrationResponse = response;
                } else {
                    // toResponse = response;
                    toResponse = toResponse.data ? toResponse.data : toResponse;
                    self.promises[response.uid].promise.resolve(toResponse);
                    delete self.promises[response.uid];
                }
            }
        } catch (err) {
            console.error('PubSub onMessage error.');
            console.error(err.stack);
        }
    });

    this.pubSub.on('subscribe', function (channel) {
        //is subscribing to the new channel, there is a registration response y there is a promise
        //now, can resolve the promise and unsubscribe from the temporal channel
        try {
            if (channel === self.channel && registrationResponse && self.promises[registrationResponse.uid]) {
                self.promises[registrationResponse.uid].promise.resolve(registrationResponse);
                delete self.promises[registrationResponse.uid];
                // self.pubSub.unsubscribe(self.namespace);
            }
        } catch (err) {
            console.error('PubSub subscribe error.');
            console.error(err.stack);
        }
    });
};

/**
 * As a provider, add a method(or methods) to the list of methods that i provide
 * @param {String or Object} key   A string that define the method name, or an object with a key as the method name and the value as the method
 * @param {function} value (optional) if the key is a string, this should be the method
 */
IPC.prototype.add = function (key, value) {
    var self = this;
    if (Object.prototype.toString.call(key) === '[object Object]') {
        Object.keys(key).forEach(function (property) {
            if (Object.prototype.toString.call(key[property]) === '[object Function]') {
                self.methods[property] = key[property];
            }
        });
    } else {
        // is a string
        if (Object.prototype.toString.call(value) === '[object Function]') {
            self.methods[key] = value;
        } else {
            throw new Error('Unknown function name: ' + value);
        }
    }
};

/**
 * Make a call to a specific worker, handle all the attemps and timeout process
 * @param  {Object} request a request object according to the specification of the IPC
 * @param  {Promise} defer   A defered promise
 * @param  {Object} options an list of option that override the default maxAttemps and timeout
 */
IPC.prototype.makeCall = function (request, defer, options) {


    var promises = this.promises;
    var self = this;
    //if this method was call and the promise exist is because the timeout was expired, and is making the call again

    //set the default options or the global one
    options = options || {};
    this.maxAttemps = options.maxAttemps || maxAttemps;
    this.timeout = options.timeout || timeout;

    //the promise exist
    //found the current promise and has reached the max attemp, reject it
    if (promises[request.uid] && promises[request.uid].attemp > this.maxAttemps) {
        clearInterval(promises[request.uid].interval);
        promises[request.uid].promise.reject(new Error('The worker is not available, timeout'));
        delete promises[request.uid];
        return;
    }
    //the promise exist, but is not reached the max attemp yet
    if (promises[request.uid]) {
        promises[request.uid].promise.notify(promises[request.uid].attemp);
        promises[request.uid].attemp++;
    } else {
        // promise not exist create it
        promises[request.uid] = {
            promise: defer,
            interval: setInterval(function () {
                //every time this method will be called again with the same options
                self.makeCall(request, defer, options);
            }, this.timeout),
            //the current attemp is 1 will be incrementing according
            attemp: 1
        };
    }
    //make the call to the worker
    this.pubSub.publish(request.to, request);
};

/**
 * Allow a worker to register as a provider
 * @return {Promise} a promise that will be resolve when the server response correctly or reject if some error
 */
IPC.prototype.register = function () {
    //subscribe temporaly to this namespace
    this.pubSub.subscribe(this.namespace);

    var defer = Q.defer();
    var uid = uuid.v4();
    var request = {
        action: 'register',
        token: this.token,
        from: this.namespace,
        to: ipcNamespace,
        uid: uid
    };
    this.makeCall(request, defer);

    return defer.promise;
};

IPC.prototype.consume = function (namespace, methods) {
    this.pubSub.subscribe(this.namespace);
    var self = this;
    var defer = Q.defer();
    var uid = uuid.v4();
    var consume = {};
    consume[namespace] = methods;
    var request = {
        action: 'consume',
        token: this.token,
        from: this.namespace,
        to: ipcNamespace,
        uid: uid,
        consume: consume
    };
    this.makeCall(request, defer);
    return defer.promise;
};

module.exports = IPC;