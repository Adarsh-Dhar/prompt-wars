#!/usr/bin/env node

/**
 * Test script for the chain-of-thought endpoint
 */

import fetch from 'node-fetch';

const AGENT_URL = process.env.AGENT_SERVER_URL || 'http://localhost:4001';

async function testChainOfThought() {
    console.log('🧠 Testing Chain of Thought endpoint...\n');
    
    try {
        // Test both endpoint paths
        const endpoints = [
            `${AGENT_URL}/api/chain-of-thought`,
            `${AGENT_URL}/cot`
        ];
        
        for (const endpoint of endpoints) {
            console.log(`📡 Testing: ${endpoint}`);
            
            const response = await fetch(endpoint, {
                method: 'GET',
                headers: {
                    'Accept': 'application/json',
                    'User-Agent': 'ChainOfThought-Test/1.0'
                }
            });
            
            console.log(`Status: ${response.status} ${response.statusText}`);
            
            if (response.ok) {
                const data = await response.json();
                console.log('✅ Response received:');
                console.log('Chain of Thought:', {
                    reasoning: data.chainOfThought.reasoning.substring(0, 100) + '...',
                    confidence: data.chainOfThought.confidence,
                    decision: data.chainOfThought.decision,
                    tokenSymbol: data.chainOfThought.tokenSymbol,
                    status: data.chainOfThought.status,
                    timestamp: data.chainOfThought.timestamp
                });
                console.log('Meta:', data.meta);
            } else {
                const errorData = await response.text();
                console.log('❌ Error:', errorData);
            }
            
            console.log('---\n');
        }
        
        // Test after generating an analysis
        console.log('🔍 Generating analysis first...');
        const analysisResponse = await fetch(`${AGENT_URL}/api/analyze`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                tokenSymbol: 'BTC',
                currentPrice: 45000
            })
        });
        
        if (analysisResponse.ok) {
            console.log('✅ Analysis generated successfully');
            
            // Wait a moment for processing
            await new Promise(resolve => setTimeout(resolve, 1000));
            
            // Test chain of thought again
            console.log('🧠 Testing chain of thought after analysis...');
            const cotResponse = await fetch(`${AGENT_URL}/cot`);
            
            if (cotResponse.ok) {
                const cotData = await cotResponse.json();
                console.log('✅ Chain of Thought with analysis:');
                console.log({
                    tokenSymbol: cotData.chainOfThought.tokenSymbol,
                    decision: cotData.chainOfThought.decision,
                    confidence: cotData.chainOfThought.confidence,
                    reasoning: cotData.chainOfThought.reasoning.substring(0, 150) + '...',
                    degenCommentary: cotData.chainOfThought.degenCommentary,
                    simulation: cotData.chainOfThought.simulation
                });
            } else {
                console.log('❌ Chain of thought failed after analysis');
            }
        } else {
            console.log('❌ Analysis generation failed');
        }
        
    } catch (error) {
        console.error('❌ Test failed:', error.message);
        console.log('\n💡 Make sure the degen-agent server is running on port 4001');
        console.log('   Run: cd degen-agent && npm start');
    }
}

// Run the test
testChainOfThought().then(() => {
    console.log('\n🎉 Chain of Thought test completed!');
}).catch(error => {
    console.error('💥 Test suite failed:', error);
    process.exit(1);
});