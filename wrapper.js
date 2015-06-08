var IPC = require('./');
var path = require('path');
var fs = require('fs');
var Q = require('q');
var IPCWrapper = function (providers) {
    return Q.Promise(function (resolve, reject, notify) {
        var starvoxPath = path.join(__dirname, 'starvox.json');
        var config = fs.readFileSync(starvoxPath);
        var ipc = new IPC(config.namespaces, config.token);
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
            tasks.push(registration);
        }

        if (config.consumes) {
            var namespaces = Object.keys(config.consume);
            count += namespaces.length;
            namespaces.forEach(function (namespace, ind) {
                var task = ipc.consume(namespace, config.consume[namespaces]).
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
            var resolution = [];

            if (config.provide) {
                resolution.push(response.shift());
            }
            if (config.consumes) {
                var objects = response.map(function (obj, ind) {
                    var key = namespaces[ind].split('.').pop();
                    var method = {};
                    return method[key] = obj;
                });
                resolution.push(objects);
            }
            resolve(resolution.reverse());
        }).
        catch (function (err) {
            reject(err);
        })
    });

    var ipc;
    var task = [];
    var promise;
    try {
        config = fs.readFileSync(starvoxPath);
        var ipc = new IPC(config.namespace, config.token);
        if (config.provide) {
            task.push(ipc.register());
        }
        if (config.consume) {
            Object.keys(config.consume).forEach(function (key) {
                task.push(ipc.consume(key, config.consume[key]));
            });
        }
        promise = Q.all(task).then(function (response) {
            var toResponse = [];
            if (config.provide) {
                toResponse.push(response.shift());
            }
            if (config.consume) {
                var namespaces = Object.keys(config.consume);
                var consumables = response.map(function (resp, ind) {
                    var key = namespaces[ind].split('.').pop();
                    var obj = {};
                    obj[key] = resp;
                    return obj;
                });
                toResponse.push(consumables);
            }
            return toResponse;
        });
    } catch (err) {
        console.error('file not found');
    }
    return promise;
};

module.exports = IPCWrapper;