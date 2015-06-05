var IPC = require('../');
var consumer = new IPC('com.batman.baticueva', 'com.batman.baticueva');

consumer.consume('com.starvox.core.telephony', ['call']).then(function (response) {
    console.log('The consumer %j was resolved', response);
}).
catch(function (err) {
    console.log(err);
});
