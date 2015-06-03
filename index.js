//the pubsub driver
var pubSub = require('./PubSub');
//a promise baby!!!
var Q = require('q');

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
function IPC(namespace, token) {
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

    //a flag to know if as provider i am already register
    this.isRegister = false;



    this.pubSub = new(require('./PubSub'))();

    //handle all message receive 
    this.pubSub.on('message', function (channel, response) {
        switch (response.action) {
        case 'response':
            {
                //basicly if is not still register and is trying to do it
                if (self.isRegister === false && channel === self.namespace) {
                    //unsuscribe from the temporal  namespace and subscribe for the new
                    self.channel = response.to;
                    self.pubSub.subscribe(response.to);
                    self.isRegister = true;
                }
                break;
            }
        case 'consume':
            {

                var key = Object.keys(response.consume)[0];
                if (key) {
                    var methods = response.consume[key];
                    response.methods = [];
                    response.to = response.from;
                    response.from = self.channel;
                    response.action = 'provide';
                    delete response.consume;
                    delete response.token;
                    methods.forEach(function (method) {
                        response.methods.push({
                            method: method,
                            params: ['cid']
                        });
                    });
                    self.pubSub.publish(response.to, response);
                }
                // console.log(response);
            }
        case 'provide':
            {
                //@todo build the object
                console.log(response);
            }

        }

        //If there is a promise for this message remove the interval for not calling again, resolve the promise  and remove it
        if (self.promises[response.uid]) {
            console.log('promise found');
            clearInterval(self.promises[response.uid].interval);
            if (response.action === 'response') {
                registrationResponse = response;
            } else {
                self.promises[response.uid].promise.resolve(response);
            }
        }
    });

    this.pubSub.on('subscribe', function (channel) {

        if (channel === self.channel && registrationResponse && self.promises[registrationResponse.uid]) {
            self.promises[registrationResponse.uid].promise.resolve(registrationResponse);
            delete self.promises[registrationResponse.uid];
            self.pubSub.unsubscribe(self.namespace);
        }
    });
};

/**
 * Generate a random unique number
 * @return {int} The random unique number
 */
var getUniqueNumber = function () {
    return new Date().getUTCMilliseconds() * (Math.random() * 1000);
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
        promises[request.uid].promise.reject(new Error('The worker is not availabel, timeout'));
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
    var uid = getUniqueNumber();
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
    var uid = getUniqueNumber();
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