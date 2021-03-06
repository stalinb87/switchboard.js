var IPC = require('../../');
var provitions = {
    reload: function (partition, model, before, after, action, cb) {
        console.log('reloading partition %s in %s with action %s', partition, model, action);
        console.log('before', before.label);
        console.log('after', after.label);
        cb(null, 'cool');
    },
    origin: function (to, cb) {
        cb(null, 'calling ' + to);
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

setTimeout(function () {
    console.log('emiting vaina');
    ipc.emit('call', 'Please call me later', 'tutaca');
}, 5000);