var IPC = require('../');
var ipc = new IPC('com.starvox.core.telephony', 'com.starvox.core.telephony');
ipc.register().then(function (response) {
    console.log('the promise was resolve with the value', response);
}, null, function (cont) {
    console.log('intento numero %s', cont);
}).
catch (function (err) {
    console.log(err);
});