// Simple test to check if the simulator works
console.log('Testing simulator import...');

try {
  const module = await import('./trading-simulator.js');
  console.log('Available exports:', Object.keys(module));
  
  if (module.simulateTrade) {
    console.log('✅ simulateTrade function found');
    
    // Test basic functionality
    const result = await module.simulateTrade({
      token: 'TEST',
      decision: 'LONG',
      entryPrice: 100,
      capitalUsd: 1000,
      sizingPercent: 0.5,
      horizons: [60],
      options: { seed: 42 }
    });
    
    console.log('✅ Simulation completed successfully');
    console.log('Result keys:', Object.keys(result));
    console.log('Position USD:', result.positionUsd);
    console.log('Final PnL:', result.finalPnlUsd);
    console.log('Meta:', result.meta);
  } else {
    console.log('❌ simulateTrade function not found');
  }
} catch (error) {
  console.error('❌ Error:', error.message);
}