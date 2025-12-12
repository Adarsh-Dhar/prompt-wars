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
            // Check for payment authorization
            const authHeader = req.headers.authorization;
            
            if (authHeader && authHeader.startsWith('Signature ')) {
                // Payment provided, return premium logs
                res.writeHead(200);
                res.end(JSON.stringify({
                    status: "ACTIVE",
                    logs: [
                        {
                            id: "premium-1",
                            timestamp: new Date().toISOString(),
                            message: "🧠 Analyzing market sentiment... detecting FOMO patterns in retail traders",
                            type: "thought"
                        },
                        {
                            id: "premium-2", 
                            timestamp: new Date().toISOString(),
                            message: "📊 Technical analysis: RSI oversold, potential bounce incoming",
                            type: "thought"
                        },
                        {
                            id: "premium-3",
                            timestamp: new Date().toISOString(),
                            message: "💎 Diamond hands detected: whale accumulation at support levels",
                            type: "thought"
                        },
                        {
                            id: "premium-4",
                            timestamp: new Date().toISOString(),
                            message: "🚀 DEGEN MODE: High conviction play identified - LFG! 💎🙌",
                            type: "thought"
                        }
                    ],
                    lastUpdate: Date.now(),
                    signature: authHeader.replace('Signature ', ''),
                    chain_root_hash: "mock_chain_hash_" + Date.now(),
                    agent_public_key: "11111111111111111111111111111112"
                }));
            } else {
                // No payment, return 402
                res.writeHead(402);
                res.end(JSON.stringify({
                    error: 'Payment Required',
                    price: 0.05,
                    currency: 'SOL',
                    recipient: '11111111111111111111111111111112',
                    memo: 'Premium CoT Access'
                }));
            }
        } else if (path === '/api/logs/premium') {
            // Check for payment authorization
            const authHeader = req.headers.authorization;
            
            if (authHeader && authHeader.startsWith('Signature ')) {
                // Payment provided, return premium logs
                res.writeHead(200);
                res.end(JSON.stringify({
                    status: "ACTIVE",
                    logs: [
                        {
                            id: "premium-1",
                            timestamp: new Date().toISOString(),
                            message: "🧠 Analyzing market sentiment... detecting FOMO patterns in retail traders",
                            type: "thought"
                        },
                        {
                            id: "premium-2", 
                            timestamp: new Date().toISOString(),
                            message: "📊 Technical analysis: RSI oversold, potential bounce incoming",
                            type: "thought"
                        },
                        {
                            id: "premium-3",
                            timestamp: new Date().toISOString(),
                            message: "💎 Diamond hands detected: whale accumulation at support levels",
                            type: "thought"
                        },
                        {
                            id: "premium-4",
                            timestamp: new Date().toISOString(),
                            message: "🚀 DEGEN MODE: High conviction play identified - LFG! 💎🙌",
                            type: "thought"
                        }
                    ],
                    lastUpdate: Date.now(),
                    signature: authHeader.replace('Signature ', ''),
                    chain_root_hash: "mock_chain_hash_" + Date.now(),
                    agent_public_key: "11111111111111111111111111111112"
                }));
            } else {
                // No payment, return 402
                res.writeHead(402);
                res.end(JSON.stringify({
                    error: 'Payment Required',
                    price: 0.05,
                    currency: 'SOL',
                    recipient: '11111111111111111111111111111112',
                    memo: 'Premium CoT Access'
                }));
            }
        } else if (path === '/api/stream') {
            // Always return basic logs (no payment required for stream)
            res.writeHead(200);
            res.end(JSON.stringify({
                status: "IDLE",
                logs: [
                    {
                        id: "public-1",
                        timestamp: new Date().toISOString(),
                        message: "Agent initialized and monitoring markets...",
                        type: "system"
                    },
                    {
                        id: "public-2",
                        timestamp: new Date().toISOString(),
                        message: "🤖 Degen Agent online! Ready to find the next moon mission! 🚀",
                        type: "agent_speech"
                    },
                    {
                        id: "redacted-1",
                        timestamp: new Date().toISOString(),
                        message: "[REDACTED - Premium access required]",
                        type: "thought"
                    }
                ],
                lastUpdate: Date.now()
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