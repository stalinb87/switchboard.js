var IPC = require('../../');
var provitions = {
    call: function (to, cb) {
        cb(null, 'calling to ' + to);
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