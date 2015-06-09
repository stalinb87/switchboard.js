var IPC = require('../../');
var ipc = new IPC();

ipc.connect().then(function (response) {
    response.telephony.call.to(152).then(function (call) {
        console.log(call);
    });
    response.telephony.forward.from(134).to(135).then(function (forward) {
        console.log(forward);
    });
    var connector = ipc.connector;
    connector.pubSub.end();
    connector.pubSub.on('end', function () {
        console.log('ending');
    });
}).
catch (function (err) {
    console.log(err.stack);
});