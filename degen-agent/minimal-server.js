import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import { simulateTrade } from './sim/trading-simulator.js';

dotenv.config();

const app = express();
const PORT = 4003;

// Middleware
app.use(cors());
app.use(express.json());

// Simple portfolio state
let portfolio = {
    capitalUsd: parseFloat(process.env.SIM_CAPITAL_USD) || 100,
    tradeHistory: [],
    createdAt: new Date(),
    lastUpdated: new Date()
};

// Health check
app.get('/health', (req, res) => {
    console.log('Health check requested');
    res.json({ 
        status: 'healthy', 
        agent: 'degen-agent-minimal',
        timestamp: new Date().toISOString()
    });
});

// Portfolio endpoint
app.get('/api/portfolio', (req, res) => {
    console.log('Portfolio requested');
    res.json({
        ...portfolio,
        meta: {
            disclaimer: 'SIMULATION - NO REAL TXS',
            totalTrades: portfolio.tradeHistory.length,
            timestamp: new Date().toISOString()
        }
    });
});

// Trades endpoint
app.get('/api/trades', (req, res) => {
    console.log('Trades requested');
    res.json({
        trades: portfolio.tradeHistory,
        meta: {
            disclaimer: 'SIMULATION - NO REAL TXS',
            count: portfolio.tradeHistory.length,
            timestamp: new Date().toISOString()
        }
    });
});

// Status endpoint
app.get('/api/status', (req, res) => {
    console.log('Status requested');
    res.json({
        status: 'IDLE',
        mission: 'RektOrRich - AI-powered crypto prediction market with payment-gated insights',
        lastUpdate: Date.now(),
        emotion: 'CURIOUS'
    });
});

// Simple analysis endpoint (without AI for now)
app.post('/api/analyze', async (req, res) => {
    try {
        console.log('Analysis requested:', req.body);
        const { tokenSymbol, currentPrice } = req.body;
        
        if (!tokenSymbol) {
            return res.status(400).json({ error: 'Token symbol is required' });
        }
        
        // Create a simple mock analysis
        const analysis = {
            id: Date.now(),
            tokenSymbol: tokenSymbol,
            currentPrice: currentPrice || 100,
            timestamp: new Date(),
            publicSummary: `${tokenSymbol} looking bullish! 🚀 Strong momentum detected.`,
            decision: Math.random() > 0.5 ? 'LONG' : 'SHORT',
            confidence: Math.floor(Math.random() * 40) + 60,
            premiumAnalysis: '[PREMIUM CONTENT - PAYMENT REQUIRED]',
            isUnlocked: false
        };

        // Run simulation
        console.log('Running simulation...');
        const simulation = await simulateTrade({
            token: tokenSymbol,
            decision: analysis.decision,
            entryPrice: analysis.currentPrice,
            capitalUsd: portfolio.capitalUsd,
            sizingPercent: parseFloat(process.env.SIM_SIZING_PERCENT) || 0.5,
            horizons: [60, 300, 3600, 86400],
            options: {
                seed: Date.now() % 10000,
                impactCoeff: parseFloat(process.env.SIM_IMPACT_COEFF) || 0.0005,
                feeRate: parseFloat(process.env.SIM_FEE_RATE) || 0.001,
                liquidityUsd: parseFloat(process.env.SIM_DEFAULT_LIQUIDITY) || 20000
            }
        });
        
        analysis.simulation = simulation;
        
        // Add to trade history
        const tradeRecord = {
            id: analysis.id,
            token: tokenSymbol,
            decision: analysis.decision,
            entryPrice: simulation.entryPrice,
            entryFillPrice: simulation.entryFillPrice,
            positionUsd: simulation.positionUsd,
            finalPnlUsd: simulation.finalPnlUsd,
            finalRoi: simulation.finalRoi,
            createdAt: new Date()
        };
        
        portfolio.tradeHistory.push(tradeRecord);
        portfolio.lastUpdated = new Date();
        
        console.log(`Simulation complete: ${simulation.finalPnlUsd >= 0 ? '+' : ''}${simulation.finalPnlUsd.toFixed(2)} (${(simulation.finalRoi * 100).toFixed(1)}% ROI)`);
        
        res.json({
            success: true,
            analysis: {
                ...analysis,
                premiumAnalysis: '[PREMIUM CONTENT - PAYMENT REQUIRED]',
                simulationSummary: {
                    finalPnlUsd: simulation.finalPnlUsd,
                    finalRoi: simulation.finalRoi,
                    positionUsd: simulation.positionUsd,
                    priceSource: simulation.meta?.priceSource,
                    disclaimer: 'SIMULATION - NO REAL TXS'
                }
            },
            meta: {
                disclaimer: 'SIMULATION - NO REAL TXS',
                timestamp: new Date().toISOString()
            }
        });
        
    } catch (error) {
        console.error('Analysis error:', error);
        res.status(500).json({ error: 'Analysis failed', message: error.message });
    }
});

// Error handling
app.use((err, req, res, next) => {
    console.error('Server error:', err);
    res.status(500).json({ error: 'Internal server error', message: err.message });
});

// Start server
app.listen(PORT, () => {
    console.log(`🚀 Minimal Degen Agent running on http://localhost:${PORT}`);
    console.log('📊 Available endpoints:');
    console.log('  GET /health');
    console.log('  GET /api/portfolio');
    console.log('  GET /api/trades');
    console.log('  GET /api/status');
    console.log('  POST /api/analyze');
});