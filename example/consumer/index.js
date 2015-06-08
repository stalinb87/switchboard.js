var IPC = require('../../');
var ipc = new IPC();
ipc.then(function (response) {
    response.telephony.call.to(152).then(function (call) {
        console.log(call);
    });
    response.telephony.forward.from(134).to(135).then(function (forward) {
        console.log(forward);
    });
}).
catch (function (err) {
    console.log(err.stack);
});