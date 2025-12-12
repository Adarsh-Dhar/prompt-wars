/**
 * Degen Trading Simulator v2
 * SIMULATION - NO REAL TXS
 */

// Configuration
const DEFAULT_CONFIG = {
  capitalUsd: 100,
  sizingPercent: 0.5,
  impactCoeff: 0.0005,
  feeRate: 0.001,
  defaultLiquidityUsd: 20000,
  horizons: [60, 300, 3600, 86400]
};

// Simple synthetic price generator
function generateSyntheticSeries(seedPrice, points = 100, seed = 42) {
  const series = [];
  let price = seedPrice;
  const startTime = Date.now();
  
  // Simple random walk
  let state = seed;
  function random() {
    state = (state * 1664525 + 1013904223) % Math.pow(2, 32);
    return (state / Math.pow(2, 32) - 0.5) * 0.02; // ±1% moves
  }
  
  for (let i = 0; i < points; i++) {
    price = price * (1 + random());
    series.push({
      timestamp: startTime + (i * 60 * 1000),
      price: Math.max(price, 0.001)
    });
  }
  
  return series;
}

// Calculate price impact
function calculatePriceImpact(positionUsd, liquidityUsd, impactCoeff) {
  return impactCoeff * (positionUsd / liquidityUsd);
}

// Calculate PnL
function calculatePnL(decision, entryPrice, currentPrice, positionUsd, fees) {
  let pnlUsd;
  
  if (decision === 'LONG') {
    pnlUsd = (currentPrice / entryPrice - 1) * positionUsd - fees;
  } else {
    pnlUsd = (entryPrice / currentPrice - 1) * positionUsd - fees;
  }
  
  return { pnlUsd, roi: pnlUsd / positionUsd };
}

// Main simulation function
async function simulateTrade(options) {
  const {
    token,
    decision,
    entryPrice,
    capitalUsd = DEFAULT_CONFIG.capitalUsd,
    sizingPercent = DEFAULT_CONFIG.sizingPercent,
    horizons = [60, 300],
    options: simOptions = {}
  } = options;
  
  // Validation
  if (!token) throw new Error('Token required');
  if (!['LONG', 'SHORT'].includes(decision)) throw new Error('Invalid decision');
  if (entryPrice <= 0) throw new Error('Invalid entry price');
  
  const {
    seed = 42,
    impactCoeff = DEFAULT_CONFIG.impactCoeff,
    feeRate = DEFAULT_CONFIG.feeRate,
    liquidityUsd = DEFAULT_CONFIG.defaultLiquidityUsd
  } = simOptions;
  
  // Generate synthetic price data
  const priceData = generateSyntheticSeries(entryPrice, 1440, seed);
  
  // Calculate position
  const positionUsd = capitalUsd * sizingPercent;
  const priceImpact = calculatePriceImpact(positionUsd, liquidityUsd, impactCoeff);
  const sign = decision === 'LONG' ? 1 : -1;
  const entryFillPrice = entryPrice * (1 + sign * priceImpact);
  const fees = positionUsd * feeRate * 2;
  
  // Generate snapshots
  const snapshots = [];
  const currentTime = Date.now();
  
  for (const horizonSeconds of horizons) {
    const targetIndex = Math.min(
      Math.floor(horizonSeconds / 60),
      priceData.length - 1
    );
    const pricePoint = priceData[targetIndex];
    
    if (pricePoint) {
      const { pnlUsd, roi } = calculatePnL(
        decision,
        entryFillPrice,
        pricePoint.price,
        positionUsd,
        fees
      );
      
      snapshots.push({
        horizonSeconds,
        timestamp: pricePoint.timestamp,
        marketPrice: pricePoint.price,
        pnlUsd,
        roi
      });
    }
  }
  
  const finalSnapshot = snapshots[snapshots.length - 1];
  
  return {
    entryPrice,
    entryFillPrice,
    positionUsd,
    capitalUsd,
    decision,
    snapshots,
    finalPnlUsd: finalSnapshot ? finalSnapshot.pnlUsd : 0,
    finalRoi: finalSnapshot ? finalSnapshot.roi : 0,
    meta: {
      priceSource: 'synthetic',
      impactApplied: priceImpact,
      feesApplied: fees,
      disclaimer: 'SIMULATION - NO REAL TXS'
    }
  };
}

export { simulateTrade, generateSyntheticSeries, calculatePnL, DEFAULT_CONFIG };