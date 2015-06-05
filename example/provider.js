var IPC = require('../');
var ipc = new IPC('com.starvox.core.Telephony', 'com.starvox.core.Telephony');

function suma(a, b, callback) {
    callback(null, a + b);
}

ipc.add('suma', suma);

ipc.register()
    .then(function (response) {
        console.log('The promise was resolve with the value', response);
    }, function (err) {
        console.log(err);
    }, function (cont) {
        console.log('Intento numero %s', cont);
    });
