import express from 'express';
import cors from 'cors';

const app = express();
const PORT = 4001; // Use the expected port

app.use(cors());
app.use(express.json());

// Simple test endpoint
app.get('/test', (req, res) => {
    res.json({ message: 'Simple test working', timestamp: new Date().toISOString() });
});

// Chain of thought test endpoint
app.get(['/cot', '/api/chain-of-thought'], (req, res) => {
    res.json({
        chainOfThought: {
            reasoning: "Test reasoning - no analysis available yet",
            marketAnalysis: "No market data available",
            riskAssessment: "Risk level: LOW - No active trades",
            degenCommentary: "🤖 Just testing the endpoint! LFG! 💎🙌",
            confidence: 0,
            timestamp: new Date().toISOString(),
            status: "IDLE"
        },
        meta: {
            agent: "degen-agent-test",
            version: "1.0.0",
            disclaimer: "TEST MODE",
            timestamp: new Date().toISOString()
        }
    });
});

// Health check endpoint
app.get('/health', (req, res) => {
    res.json({ 
        status: 'healthy', 
        agent: 'degen-agent-test',
        timestamp: new Date().toISOString()
    });
});

// Status endpoint
app.get('/api/status', (req, res) => {
    res.json({
        status: "IDLE",
        mission: "Test Agent - Chain of Thought Demo",
        logsCount: 0,
        startTime: new Date().toISOString(),
        endTime: null,
        lastUpdate: Date.now(),
        emotion: "CURIOUS",
        lastToken: null
    });
});

// Return 402 for payment-required endpoints (for x402 protocol testing)
app.get('/api/logs', (req, res) => {
    res.status(402).json({
        error: 'Payment Required',
        message: 'This endpoint requires payment to access premium content'
    });
});

app.listen(PORT, () => {
    console.log(`🧪 Test server running on http://localhost:${PORT}`);
    console.log(`Test endpoints:`);
    console.log(`  GET /test - Simple test`);
    console.log(`  GET /cot - Chain of thought test`);
});