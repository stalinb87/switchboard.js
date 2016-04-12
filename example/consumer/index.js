'use strict';
var IPC = require('../../');
var ipc = new IPC();

ipc.connect().then(function (response) {
    response.telephony.on('call', function (message) {
        console.log("receiving message", message);
    });
    response.telephony.origin.to(152).then(function (call) {
        console.log(call);
    });
    response.telephony.forward.from(134)._config({
        timeout: 1000,
        maxAttemps: 1
    }).to(135).then(function (forward) {
        console.log(forward);
        response.telephony.forward.from(134).then(function (re) {
            console.log(re);
        });
    });
    var connector = ipc.connector;
    // connector.pubSub.end();
    // connector.pubSub.on('end', function () {
    //     console.log('ending');
    // });
}).
catch(function (err) {
    console.log(err.stack);
});