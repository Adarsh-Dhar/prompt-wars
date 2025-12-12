const http = require('http');

const server = http.createServer((req, res) => {
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Content-Type', 'application/json');
    
    if (req.url === '/health' || req.url === '/') {
        res.writeHead(200);
        res.end('{"status":"healthy","agent":"degen-agent"}');
    } else if (req.url === '/cot') {
        res.writeHead(200);
        res.end('{"chainOfThought":{"reasoning":"Test","status":"IDLE"}}');
    } else {
        res.writeHead(404);
        res.end('{"error":"Not found"}');
    }
});

server.listen(4001, () => {
    console.log('Basic server running on port 4001');
});