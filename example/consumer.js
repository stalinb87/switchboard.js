var IPC = require('../');
var consumer = new IPC('com.batman.baticueva', 'com.batman.baticueva');

consumer.consume('com.starvox.core.telephony', ['call']).then(function (response) {
    console.log('The consumer %s was resolve', consumer);
}).
catch (function (err) {
    console.log(err);
});