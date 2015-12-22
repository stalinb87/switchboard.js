var server = require('../Server')({
    redis: {
        port: 6379,
        host: '127.0.0.1'
    },
    namespace: 'starvox.ipmc.server'
});
server.start();