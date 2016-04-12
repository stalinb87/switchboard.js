var server = require('./Server')({
    redis: {
        port: 6379,
        host: '127.0.0.1'
    },
    namespace: 'com.starvox.core.ipc'
});
server.start();