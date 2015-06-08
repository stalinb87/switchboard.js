var IPC = require('./ipc');
var path = require('path');
var fs = require('fs');
var Q = require('q');
var IPCWrapper = function (providers) {
    return Q.Promise(function (resolve, reject, notify) {
        var starvoxPath = path.join(process.cwd(), 'starvox.json');
        var config = JSON.parse(fs.readFileSync(starvoxPath).toString());

        var ipc = new IPC(config.namespace, config.token);
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
            ipc.add(providers);
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
};

module.exports = IPCWrapper;