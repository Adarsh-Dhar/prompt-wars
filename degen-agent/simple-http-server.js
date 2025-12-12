import http from 'http';
import url from 'url';

const PORT = 4001;

const server = http.createServer((req, res) => {
    // Set CORS headers
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
    res.setHeader('Content-Type', 'application/json');

    const parsedUrl = url.parse(req.url, true);
    const path = parsedUrl.pathname;

    try {
        if (req.method === 'OPTIONS') {
            res.writeHead(200);
            res.end();
            return;
        }

        if (path === '/' || path === '/health') {
            res.writeHead(200);
            res.end(JSON.stringify({ 
                status: 'healthy', 
                agent: 'degen-agent',
                timestamp: new Date().toISOString()
            }));
        } else if (path === '/api/status') {
            res.writeHead(200);
            res.end(JSON.stringify({
                status: "IDLE",
                mission: "RektOrRich - AI-powered crypto prediction market agent",
                logsCount: 0,
                startTime: new Date().toISOString(),
                endTime: null,
                lastUpdate: Date.now(),
                emotion: "CURIOUS",
                lastToken: null
            }));
        } else if (path === '/cot' || path === '/api/chain-of-thought') {
            res.writeHead(200);
            res.end(JSON.stringify({
                chainOfThought: {
                    reasoning: "No recent analysis available. Agent is in IDLE state, waiting for trading opportunities.",
                    marketAnalysis: "Market conditions are being monitored. No active positions or analysis at this time.",
                    riskAssessment: "Risk level: LOW - No active trades or positions.",
                    degenCommentary: "🤖 Just vibing and waiting for the next moon mission. LFG when the setup is right! 💎🙌",
                    confidence: 0,
                    timestamp: new Date().toISOString(),
                    status: "IDLE"
                },
                meta: {
                    agent: "degen-agent",
                    version: "1.0.0",
                    disclaimer: "SIMULATION - NO REAL TXS",
                    timestamp: new Date().toISOString()
                }
            }));
        } else if (path === '/api/logs') {
            res.writeHead(402);
            res.end(JSON.stringify({
                error: 'Payment Required',
                message: 'This endpoint requires payment to access premium content',
                paymentRequired: true
            }));
        } else {
            res.writeHead(404);
            res.end(JSON.stringify({ error: 'Not found' }));
        }
    } catch (error) {
        console.error('Server error:', error);
        res.writeHead(500);
        res.end(JSON.stringify({ error: 'Internal server error', message: error.message }));
    }
});

server.listen(PORT, () => {
    console.log(`🚀 Simple HTTP Degen Agent running on http://localhost:${PORT}`);
    console.log(`🔗 Endpoints available:`);
    console.log(`  GET / - Server info`);
    console.log(`  GET /health - Health check`);
    console.log(`  GET /api/status - Agent status`);
    console.log(`  GET /cot - Chain of thought`);
    console.log(`  GET /api/logs - Payment required (402)`);
});