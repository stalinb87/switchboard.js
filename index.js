var IPC = require('./ipc');
var path = require('path');
var fs = require('fs');
var Q = require('q');
var starvox = require('../starvox-conf')();

var IPCWrapper = function (providers) {
    this.providers = providers;
    this.connector;
    this.isConnected = false;
};
IPCWrapper.prototype.addMethods = function (providers) {
    if (this.isConnected && this.connector) {
        this.connector.add(providers);
        this.providers = providers;
    }
};
IPCWrapper.prototype.connect = function () {
    var self = this;
    var _promise = Q.Promise(function (resolve, reject, notify) {
        var starvoxPath = path.join(process.cwd(), 'starvox.json');
        var config = JSON.parse(fs.readFileSync(starvoxPath).toString());
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
                failCounts++;
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

        if (config.consumes) {
            var namespaces = Object.keys(config.consumes);
            count += namespaces.length;
            namespaces.forEach(function (namespace, ind) {

                var task = ipc.consume(namespace, config.consumes[namespace]).then(function (response) {
                    return response;
                }).
                catch (function (err) {
                    namespaces.splice(ind, 1);
                    failCounts++;
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
        Q.all(tasks).then(function (response) {
            var resolution = {};
            var registration = null;

            if (config.provide) {
                registration = response.shift();
            }
            if (config.consumes) {
                response.forEach(function (obj, ind) {
                    var key = namespaces[ind].split('.').pop();
                    resolution[key] = obj;
                });
            }
            // console.log(resolution);
            resolve(resolution, registration);
        }).
        catch (function (err) {
            reject(err);
        });

    });
    return _promise.then(function (resolution, registration) {
        self.isConnected = true;
        return Q.promise(function (resolve) {
            resolve(resolution, registration);
        });
    });
};
module.exports = IPCWrapper;