// Test basic functionality without imports
console.log('Testing basic simulator functionality...');

// Simple test function
function testBasicMath() {
  // Test price impact calculation
  const positionUsd = 500;
  const liquidityUsd = 20000;
  const impactCoeff = 0.0005;
  const priceImpact = impactCoeff * (positionUsd / liquidityUsd);
  
  console.log('Price Impact Test:');
  console.log(`  Position: $${positionUsd}`);
  console.log(`  Liquidity: $${liquidityUsd}`);
  console.log(`  Impact Coeff: ${impactCoeff}`);
  console.log(`  Calculated Impact: ${priceImpact} (${(priceImpact * 100).toFixed(4)}%)`);
  
  // Test PnL calculation
  const entryPrice = 100;
  const currentPrice = 105;
  const fees = 2;
  
  // LONG PnL
  const longPnL = (currentPrice / entryPrice - 1) * positionUsd - fees;
  console.log('\nLONG PnL Test:');
  console.log(`  Entry: $${entryPrice}, Current: $${currentPrice}`);
  console.log(`  PnL: $${longPnL.toFixed(2)}`);
  
  // SHORT PnL
  const shortPnL = (entryPrice / currentPrice - 1) * positionUsd - fees;
  console.log('\nSHORT PnL Test:');
  console.log(`  Entry: $${entryPrice}, Current: $${currentPrice}`);
  console.log(`  PnL: $${shortPnL.toFixed(2)}`);
  
  console.log('\n✅ Basic math tests completed');
}

testBasicMath();