"use strict";
/**
 * Create a wrapper that read a starvox.json file and
 * make all the connection with the ipc for you
 */

var IPC = require('./ipc');
var path = require('path');
var fs = require('fs');
var Q = require('q');
var starvox = require('../starvox-conf')();

var IPCWrapper = function (providers, conf) {
    this.providers = providers || {};
    this.connector = null;
    this.isConnected = false;
    this.conf = conf;
};
/**
 * Add methods to the ipc as a provider
 * @param {Object} providers a key value object of functions to add
 */
IPCWrapper.prototype.addMethods = function (providers) {
    if (this.isConnected && this.connector) {
        this.connector.add(providers);
    }
    this.providers = providers;
};

IPCWrapper.prototype.emit = function (eventType, message) {
    if (this.isConnected) {
        var uuid = this.connector.channel.replace(this.connector.namespace);
        var channel = this.connector.namespace + '.event.' + ':' + uuid;
        this.connector.publish(channel, message);
    }
};

/**
 * Add a method to the ipc as a provider
 * @param {string}   key the method name
 * @param {Function} fn  the function to add
 */
IPCWrapper.prototype.addMethod = function (key, fn) {
    if (this.isConnected && this.connector) {
        this.connector.add(key, fn);
    }
    this.providers[key] = fn;
};
/**
 * Connect to the ipc and start to listen for event according
 * to the configuration
 * @return {promise} A promise with all the resolution object and registration process response
 */
IPCWrapper.prototype.connect = function () {
    var self = this;
    var _promise = Q.Promise(function (resolve, reject, notify) {
        var starvoxPath = path.join(process.cwd(), 'starvox.json');
        var config;
        if (self.conf) {
            config = self.conf;
        } else {
            config = JSON.parse(fs.readFileSync(starvoxPath).toString());
        }
        var ipc = self.connector = new IPC(config.namespace, config.token, starvox);
        var tasks = [];

        //count how many promise are
        var count = config.provide ? 1 : 0;

        //count how many promises fail
        var failCounts = 0;

        var fail = false;

        //handle the registration process        
        if (config.provide) {
            var registration = ipc.register().
            catch (function (err) {
                //if fail add a fail count
                failCounts += 1;
                //fails count is the number of total promise,
                //fail completly the promise
                if (failCounts === count) {
                    fail = true;
                    reject(err);
                } else {
                    notify(err);
                }
            });
            ipc.add(self.providers);
            tasks.push(registration);
        }

        //the worker consume something
        if (config.consumes) {

            //get the namespace to consume
            var namespaces = Object.keys(config.consumes);
            //increases the number promise to count
            count += namespaces.length;
            namespaces.forEach(function (namespace, ind) {
                var task = ipc.consume(namespace, config.consumes[namespace]).then(function (response) {
                    return response;
                }).
                catch (function (err) {
                    //if fails remove the namespace from the list of namespace
                    //for not count it in the sucess objects
                    namespaces.splice(ind, 1);
                    failCounts += 1;
                    if (failCounts === count) {
                        fail = true;
                        reject(err);
                    } else {
                        notify(new Error('The namespace ' + namespace + ' fail:' + err.message));
                    }
                });
                tasks.push(task);
            });
        }
        //after collects all task calle it
        Q.all(tasks).then(function (response) {
            //the resolutions objects
            var resolution = {};

            //the registration response
            var registration = null;

            //the first element if the registration response, 
            //was the first promise that call            
            if (config.provide) {
                registration = response.shift();
            }

            if (config.consumes) {
                //create an object like this
                //from namespace com.starvox.core.telephony and com.starvox.core.chat
                //{
                //  telephony: {
                //      call: fn,
                //      forward: fn
                //  },
                //  chat: {
                //      method1: fn,
                //      method2: fn
                //  }
                //}
                response.forEach(function (obj, ind) {
                    var key = namespaces[ind].split('.').pop();
                    resolution[key] = obj;
                });
            }
            //resolve the promise
            resolve(resolution, registration);
        }).
        catch (function (err) {
            reject(err);
        });

    });
    return _promise.then(function (resolution, registration) {
        //after all promise has been resolve
        //connected
        self.isConnected = true;
        //return a new promise with the values
        return Q.promise(function (resolve) {
            resolve(resolution, registration);
        });
    });
};
module.exports = IPCWrapper;