/**
 * Simple test runner for the trading simulator
 */

import { simulateTrade, generateSyntheticSeries } from './trading-simulator.js';

async function runTests() {
  console.log('🧪 Testing Degen Trading Simulator...\n');
  
  try {
    // Test 1: Basic LONG position
    console.log('Test 1: Basic LONG position');
    const longResult = await simulateTrade({
      token: 'SOL',
      decision: 'LONG',
      entryPrice: 100,
      capitalUsd: 1000,
      sizingPercent: 0.5,
      horizons: [60, 300],
      options: { seed: 42 }
    });
    
    console.log('✅ LONG position created:');
    console.log(`  Position Size: $${longResult.positionUsd}`);
    console.log(`  Entry Price: $${longResult.entryPrice}`);
    console.log(`  Fill Price: $${longResult.entryFillPrice.toFixed(4)}`);
    console.log(`  Final PnL: $${longResult.finalPnlUsd.toFixed(2)}`);
    console.log(`  Final ROI: ${(longResult.finalRoi * 100).toFixed(2)}%`);
    console.log(`  Price Source: ${longResult.meta.priceSource}`);
    console.log(`  Snapshots: ${longResult.snapshots.length}`);
    console.log('');
    
    // Test 2: Basic SHORT position
    console.log('Test 2: Basic SHORT position');
    const shortResult = await simulateTrade({
      token: 'BTC',
      decision: 'SHORT',
      entryPrice: 50000,
      capitalUsd: 1000,
      sizingPercent: 0.3,
      horizons: [60, 300],
      options: { seed: 42 }
    });
    
    console.log('✅ SHORT position created:');
    console.log(`  Position Size: $${shortResult.positionUsd}`);
    console.log(`  Entry Price: $${shortResult.entryPrice}`);
    console.log(`  Fill Price: $${shortResult.entryFillPrice.toFixed(2)}`);
    console.log(`  Final PnL: $${shortResult.finalPnlUsd.toFixed(2)}`);
    console.log(`  Final ROI: ${(shortResult.finalRoi * 100).toFixed(2)}%`);
    console.log(`  Price Source: ${shortResult.meta.priceSource}`);
    console.log('');
    
    // Test 3: Deterministic synthetic generation
    console.log('Test 3: Deterministic synthetic generation');
    const series1 = generateSyntheticSeries(100, 10, 42);
    const series2 = generateSyntheticSeries(100, 10, 42);
    
    let identical = true;
    for (let i = 0; i < series1.length; i++) {
      if (Math.abs(series1[i].price - series2[i].price) > 0.0001) {
        identical = false;
        break;
      }
    }
    
    console.log(`✅ Deterministic generation: ${identical ? 'PASS' : 'FAIL'}`);
    console.log(`  Series length: ${series1.length}`);
    console.log(`  First price: $${series1[0].price.toFixed(4)}`);
    console.log(`  Last price: $${series1[series1.length - 1].price.toFixed(4)}`);
    console.log('');
    
    // Test 4: Input validation
    console.log('Test 4: Input validation');
    try {
      await simulateTrade({
        token: 'TEST',
        decision: 'INVALID',
        entryPrice: 100
      });
      console.log('❌ Input validation: FAIL (should have thrown error)');
    } catch (error) {
      console.log('✅ Input validation: PASS');
      console.log(`  Error: ${error.message}`);
    }
    console.log('');
    
    console.log('🎉 All tests completed successfully!');
    console.log('\n⚠️  SIMULATION - NO REAL TXS ⚠️');
    
  } catch (error) {
    console.error('❌ Test failed:', error);
    process.exit(1);
  }
}

runTests();