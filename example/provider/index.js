var IPC = require('../../');
var provitions = {
    reload: function (partition, model, before, after, action, cb) {
        console.log('reloading partition %s in %s with action %s', partition, model, action);
        console.log('before', before.label);
        console.log('after', after.label);
        cb(null, 'cool');
    },
    forward: function (from, to, cb) {
        cb(null, 'forward success from ' + from + ' to ' + to);

    }
};

var ipc = new IPC(provitions);
ipc.connect().then(function () {
    console.log('register successfully');
}).
catch (function (err) {
    console.log(err.stack);
});