const http = require('http');

const options = {
    hostname: 'localhost',
    port: process.env.API_PORT || 3000,
    path: '/health',
    method: 'GET',
    timeout: 2000
};

const req = http.request(options, (res) => {
    if (res.statusCode === 200) {
        console.log('Health check passed');
        process.exit(0);
    } else {
        console.log('Health check failed with status:', res.statusCode);
        process.exit(1);
    }
});

req.on('error', (error) => {
    console.error('Health check error:', error.message);
    process.exit(1);
});

req.on('timeout', () => {
    console.error('Health check timeout');
    req.abort();
    process.exit(1);
});

req.end();