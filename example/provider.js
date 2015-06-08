var IPC = require('../');
var ipc = new IPC('com.starvox.core.Telephony', 'com.starvox.core.Telephony');

function suma(a, b, callback) {
    callback(null, a + b);
}

ipc.add('suma', suma);

ipc.register()
    .then(function (response) {
        console.log('Successfully register to the server');
    }, function (err) {
        console.log('Could not connect to the server %s', err.message);
    }, function (cont) {
        console.log('Server not reponse, trying to connect, attempt %s', cont);
    });