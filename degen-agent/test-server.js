import express from 'express';
import cors from 'cors';

const app = express();
const PORT = 4002;

app.use(cors());
app.use(express.json());

app.get('/health', (req, res) => {
    res.json({ 
        status: 'healthy', 
        agent: 'degen-agent-test',
        timestamp: new Date().toISOString()
    });
});

app.get('/api/portfolio', (req, res) => {
    res.json({
        capitalUsd: 100,
        tradeHistory: [],
        meta: {
            disclaimer: 'SIMULATION - NO REAL TXS',
            totalTrades: 0,
            timestamp: new Date().toISOString()
        }
    });
});

app.listen(PORT, () => {
    console.log(`🚀 Test server running on http://localhost:${PORT}`);
});