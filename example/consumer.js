var Q = require('q');
var total = 0,
    mayor = -1,
    menor = 999999;
var tasks = [];

function test() {
    var namespace = 'com.batman.baticueva' + i;
    var IPC = require('../');
    var consumer = new IPC(namespace, namespace);
    var task = Q.promise(function (resolve, reject) {
        consumer.consume('com.starvox.core.Telephony', ['suma'])
            .then(function (Telephony) {
                var a = Math.round(Math.random() * 100);
                var b = Math.round(Math.random() * 100);
                var t = Date.now();
                return Telephony.suma
                    .a(a)
                    .b(b)
                    .then(function (res) {
                        if ((a + b) === res.data) {
                            console.log('Response to %s with %d + %d=%d', namespace, a, b, res.data);
                        } else {
                            console.log('Response incorrect %s with %d + %d=%d', namespace, a, b, res.data);
                        }
                        t = Date.now() - t;
                        if (t > mayor) {
                            mayor = t;
                        }
                        if (t < menor) {
                            menor = t;
                        }
                        resolve(t);
                    }).
                catch (function (err) {
                    reject(err);
                });

            })
            .
        catch (function (err) {
            reject(err);
        });
    });
    tasks.push(task);
}

for (var i = 0; i < 100; i++) {
    test();
}
Q.all(tasks).then(function (times) {
    console.log();
    console.log('Average: %sms, Mayor: %sms, Menor: %sms', times.reduce(function (total, time) {
        return total + time;
    }, 0) / times.length, mayor, menor);
    console.log('\nSufree Perro !!!!!!!\n\n\n\n\n\n');
}).
catch (function (err) {
    console.error('Couldn\'t not connect the provider', err);
});