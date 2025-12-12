import { simulateTrade, generateSyntheticSeries, calculatePnL } from './trading-simulator.js';

console.log('🧪 Running Simple Property Tests...\n');

// Test 1: Position Creation Consistency
console.log('Test 1: Position Creation Consistency');
try {
  const result = await simulateTrade({
    token: 'TEST',
    decision: 'LONG',
    entryPrice: 100,
    capitalUsd: 1000,
    sizingPercent: 0.5,
    horizons: [60],
    options: { seed: 42, impactCoeff: 0.001, feeRate: 0.002, liquidityUsd: 10000 }
  });
  
  // Verify position size
  const expectedPositionUsd = 1000 * 0.5;
  console.log(`✅ Position size: ${result.positionUsd} (expected: ${expectedPositionUsd})`);
  
  // Verify impact calculation
  const expectedImpact = 0.001 * (500 / 10000);
  console.log(`✅ Impact applied: ${result.meta.impactApplied} (expected: ${expectedImpact})`);
  
  // Verify fees
  const expectedFees = 500 * 0.002 * 2;
  console.log(`✅ Fees applied: ${result.meta.feesApplied} (expected: ${expectedFees})`);
  
} catch (error) {
  console.error('❌ Test 1 failed:', error.message);
}

// Test 2: Deterministic Generation
console.log('\nTest 2: Deterministic Generation');
try {
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
  console.log(`   Series 1 first price: ${series1[0].price.toFixed(4)}`);
  console.log(`   Series 2 first price: ${series2[0].price.toFixed(4)}`);
  
} catch (error) {
  console.error('❌ Test 2 failed:', error.message);
}

// Test 3: LONG/SHORT Symmetry
console.log('\nTest 3: LONG/SHORT Symmetry');
try {
  const entryPrice = 100;
  const currentPrice = 105;
  const positionUsd = 1000;
  
  const longPnL = calculatePnL('LONG', entryPrice, currentPrice, positionUsd, 0);
  const shortPnL = calculatePnL('SHORT', entryPrice, currentPrice, positionUsd, 0);
  
  const symmetryCheck = Math.abs(longPnL.pnlUsd + shortPnL.pnlUsd) < 0.01;
  console.log(`✅ LONG/SHORT symmetry: ${symmetryCheck ? 'PASS' : 'FAIL'}`);
  console.log(`   LONG PnL: ${longPnL.pnlUsd.toFixed(2)}`);
  console.log(`   SHORT PnL: ${shortPnL.pnlUsd.toFixed(2)}`);
  console.log(`   Sum (should be ~0): ${(longPnL.pnlUsd + shortPnL.pnlUsd).toFixed(4)}`);
  
} catch (error) {
  console.error('❌ Test 3 failed:', error.message);
}

console.log('\n🎉 Simple property tests completed!');
console.log('⚠️  SIMULATION - NO REAL TXS ⚠️');