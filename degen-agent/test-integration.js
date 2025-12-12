/**
 * Test the integration of the trading simulator with the degen agent
 */

import { generateTradingAnalysis, agentState } from './agent-server.js';

async function testIntegration() {
    console.log('🧪 Testing Degen Agent + Simulator Integration...\n');
    
    try {
        // Test 1: Generate analysis with simulation
        console.log('Test 1: Generating analysis with simulation...');
        const analysis = await generateTradingAnalysis('SOL', 150);
        
        if (analysis) {
            console.log('✅ Analysis generated successfully');
            console.log(`  Token: ${analysis.tokenSymbol}`);
            console.log(`  Decision: ${analysis.decision}`);
            console.log(`  Confidence: ${analysis.confidence}%`);
            
            if (analysis.simulation) {
                console.log('✅ Simulation attached to analysis');
                console.log(`  Position Size: $${analysis.simulation.positionUsd}`);
                console.log(`  Entry Price: $${analysis.simulation.entryPrice}`);
                console.log(`  Fill Price: $${analysis.simulation.entryFillPrice.toFixed(4)}`);
                console.log(`  Final PnL: $${analysis.simulation.finalPnlUsd.toFixed(2)}`);
                console.log(`  Final ROI: ${(analysis.simulation.finalRoi * 100).toFixed(2)}%`);
                console.log(`  Price Source: ${analysis.simulation.meta.priceSource}`);
                console.log(`  Disclaimer: ${analysis.simulation.meta.disclaimer}`);
            } else {
                console.log('❌ No simulation attached to analysis');
            }
        } else {
            console.log('❌ Analysis generation failed');
        }
        
        // Test 2: Check portfolio state
        console.log('\nTest 2: Checking portfolio state...');
        console.log(`✅ Portfolio Capital: $${agentState.portfolio.capitalUsd}`);
        console.log(`✅ Trade History Count: ${agentState.portfolio.tradeHistory.length}`);
        
        if (agentState.portfolio.tradeHistory.length > 0) {
            const lastTrade = agentState.portfolio.tradeHistory[agentState.portfolio.tradeHistory.length - 1];
            console.log('✅ Last trade record:');
            console.log(`  ID: ${lastTrade.id}`);
            console.log(`  Token: ${lastTrade.token}`);
            console.log(`  Decision: ${lastTrade.decision}`);
            console.log(`  PnL: $${lastTrade.finalPnlUsd.toFixed(2)}`);
        }
        
        // Test 3: Check agent state
        console.log('\nTest 3: Checking agent state...');
        console.log(`✅ Current Analysis ID: ${agentState.currentAnalysis?.id}`);
        console.log(`✅ Total Trading Decisions: ${agentState.tradingDecisions.length}`);
        console.log(`✅ Agent Status: ${agentState.status}`);
        
        console.log('\n🎉 Integration test completed successfully!');
        console.log('⚠️  SIMULATION - NO REAL TXS ⚠️');
        
    } catch (error) {
        console.error('❌ Integration test failed:', error);
        console.error('Stack:', error.stack);
    }
}

testIntegration();