import { simulateTrade } from './trading-simulator.js';

async function test() {
  console.log('🧪 Testing Simulator v2...\n');
  
  try {
    const result = await simulateTrade({
      token: 'SOL',
      decision: 'LONG',
      entryPrice: 100,
      capitalUsd: 1000,
      sizingPercent: 0.5,
      horizons: [60, 300],
      options: { seed: 42 }
    });
    
    console.log('✅ Simulation successful!');
    console.log(`Position: $${result.positionUsd}`);
    console.log(`Entry: $${result.entryPrice} → Fill: $${result.entryFillPrice.toFixed(4)}`);
    console.log(`Final PnL: $${result.finalPnlUsd.toFixed(2)}`);
    console.log(`Final ROI: ${(result.finalRoi * 100).toFixed(2)}%`);
    console.log(`Snapshots: ${result.snapshots.length}`);
    console.log(`Disclaimer: ${result.meta.disclaimer}`);
    
  } catch (error) {
    console.error('❌ Test failed:', error.message);
  }
}

test();