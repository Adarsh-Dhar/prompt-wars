import express from 'express';
import cors from 'cors';

const app = express();
const PORT = 4001;

// CORS configuration
app.use(cors({
    origin: process.env.FRONTEND_URL || 'http://localhost:3000',
    credentials: true,
    allowedHeaders: ['Content-Type', 'Authorization']
}));

app.use(express.json());

// Basic test endpoint
app.get('/', (req, res) => {
    res.json({ message: 'Degen Agent Test Server', status: 'running' });
});

// Health check
app.get('/health', (req, res) => {
    res.json({ 
        status: 'healthy', 
        agent: 'degen-agent',
        timestamp: new Date().toISOString()
    });
});

// Status endpoint
app.get('/api/status', (req, res) => {
    res.json({
        status: "IDLE",
        mission: "RektOrRich - AI-powered crypto prediction market agent",
        logsCount: 0,
        startTime: new Date().toISOString(),
        endTime: null,
        lastUpdate: Date.now(),
        emotion: "CURIOUS",
        lastToken: null
    });
});

// Chain of thought endpoints
app.get(['/cot', '/api/chain-of-thought'], (req, res) => {
    res.json({
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
    });
});

// Return 402 for payment-required endpoints (x402 protocol compliance)
app.get('/api/logs', (req, res) => {
    res.status(402).json({
        error: 'Payment Required',
        message: 'This endpoint requires payment to access premium content',
        paymentRequired: true
    });
});

// Catch-all error handler
app.use((err, req, res, next) => {
    console.error('Server error:', err);
    res.status(500).json({ error: 'Internal server error', message: err.message });
});

app.listen(PORT, () => {
    console.log(`🚀 Minimal Degen Agent running on http://localhost:${PORT}`);
    console.log(`🔗 Endpoints available:`);
    console.log(`  GET / - Server info`);
    console.log(`  GET /health - Health check`);
    console.log(`  GET /api/status - Agent status`);
    console.log(`  GET /cot - Chain of thought`);
    console.log(`  GET /api/logs - Payment required (402)`);
});