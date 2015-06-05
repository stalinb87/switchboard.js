var Telephony;
var IPC = require('../');
var consumer = new IPC('com.batman.baticueva', 'com.batman.baticueva');

consumer.consume('com.starvox.core.Telephony', ['suma'])
    .then(function (response) {
        Telephony = response;
        console.log('>>>>>', Telephony);
        // setInterval(function () {
        var a = Math.round(Math.random() * 100);
        var b = Math.round(Math.random() * 100);

        Telephony.suma
            .a(a)
            .b(b)
            .then(function (res) {
                console.log('%d + %d = %d', a, b, res);
            })
            .catch(function (err) {
                console.error('Ooops!!!', err);
            });
        // }, 1000);
    })
    .catch(function (err) {
        console.log(err);
    });
