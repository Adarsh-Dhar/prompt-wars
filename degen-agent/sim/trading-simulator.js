/**
 * Degen Trading Simulator
 * 
 * SIMULATION - NO REAL TXS
 * 
 * This module simulates trading positions based on AI-generated decisions
 * without executing actual on-chain transactions.
 */

import { getConfig, validateSimulationOptions } from './config.js';

// Get configuration
const DEFAULT_CONFIG = getConfig();

// Token symbol to CoinGecko ID mapping
const COIN_ID_MAP = {
  'BTC': 'bitcoin',
  'ETH': 'ethereum',
  'SOL': 'solana',
  'ADA': 'cardano',
  'DOT': 'polkadot'
};

/**
 * Create seeded random number generator
 */
function createSeededRandom(seed = Date.now()) {
  let state = seed;
  
  function random() {
    state = (state * 1664525 + 1013904223) % Math.pow(2, 32);
    return state / Math.pow(2, 32);
  }
  
  let hasSpare = false;
  let spare = 0;
  
  return function randn_bm() {
    if (hasSpare) {
      hasSpare = false;
      return spare;
    }
    
    hasSpare = true;
    const u = random();
    const v = random();
    const mag = DEFAULT_CONFIG.volatility * Math.sqrt(-2.0 * Math.log(u));
    spare = mag * Math.cos(2.0 * Math.PI * v);
    return mag * Math.sin(2.0 * Math.PI * v);
  };
}

/**
 * Generate synthetic price series using Geometric Brownian Motion
 */
function generateSyntheticSeries(seedPrice, points = 1440, seed = null) {
  const randn = createSeededRandom(seed);
  const series = [];
  const startTime = Date.now() - (points * 60 * 1000);
  
  let currentPrice = seedPrice;
  
  for (let i = 0; i < points; i++) {
    const timestamp = startTime + (i * 60 * 1000);
    
    const drift = (DEFAULT_CONFIG.drift - (DEFAULT_CONFIG.volatility ** 2) / 2) * DEFAULT_CONFIG.timeStep;
    const diffusion = DEFAULT_CONFIG.volatility * Math.sqrt(DEFAULT_CONFIG.timeStep) * randn();
    
    currentPrice = currentPrice * Math.exp(drift + diffusion);
    
    series.push({
      timestamp,
      price: Math.max(currentPrice, 0.001)
    });
  }
  
  return series;
}

/**
 * Fetch price data from CoinGecko API
 */
async function fetchCoinGeckoData(coinId) {
  try {
    const response = await fetch(
      `https://api.coingecko.com/api/v3/coins/${coinId}/market_chart?vs_currency=usd&days=1&interval=minute`
    );
    
    if (!response.ok) {
      throw new Error(`CoinGecko API error: ${response.status}`);
    }
    
    const data = await response.json();
    
    if (!data.prices || !Array.isArray(data.prices)) {
      throw new Error('Invalid CoinGecko response format');
    }
    
    return data.prices.map(([timestamp, price]) => ({
      timestamp,
      price
    }));
    
  } catch (error) {
    console.warn(`CoinGecko fetch failed for ${coinId}:`, error.message);
    return null;
  }
}

/**
 * Map token symbol to CoinGecko coin ID
 */
function mapSymbolToCoinId(symbol) {
  const upperSymbol = symbol.toUpperCase();
  return COIN_ID_MAP[upperSymbol] || symbol.toLowerCase();
}

/**
 * Calculate price impact
 */
function calculatePriceImpact(positionUsd, liquidityUsd, impactCoeff) {
  return impactCoeff * (positionUsd / liquidityUsd);
}

/**
 * Calculate impact decay factor
 */
function calculateDecayFactor(horizonSeconds) {
  return Math.exp(-horizonSeconds / 3600);
}

/**
 * Find closest price point to target timestamp
 */
function findClosestPricePoint(priceData, targetTimestamp) {
  if (!priceData || priceData.length === 0) {
    return null;
  }
  
  let closest = priceData[0];
  let minDiff = Math.abs(priceData[0].timestamp - targetTimestamp);
  
  for (const point of priceData) {
    const diff = Math.abs(point.timestamp - targetTimestamp);
    if (diff < minDiff) {
      minDiff = diff;
      closest = point;
    }
  }
  
  return closest;
}

/**
 * Calculate PnL for a position
 */
function calculatePnL(decision, entryFillPrice, effectivePrice, positionUsd, fees) {
  let pnlUsd;
  
  if (decision === 'LONG') {
    pnlUsd = (effectivePrice / entryFillPrice - 1) * positionUsd - fees;
  } else {
    pnlUsd = (entryFillPrice / effectivePrice - 1) * positionUsd - fees;
  }
  
  const roi = pnlUsd / positionUsd;
  
  return { pnlUsd, roi };
}

/**
 * Main simulation function
 */
async function simulateTrade(options) {
  try {
    // Validate input options
    validateSimulationOptions(options);
    
    const {
      token,
      decision,
      entryPrice,
      capitalUsd = DEFAULT_CONFIG.capitalUsd,
      sizingPercent = DEFAULT_CONFIG.sizingPercent,
      horizons = DEFAULT_CONFIG.horizons,
      options: simOptions = {}
    } = options;
    
    const {
      seed = null,
      impactCoeff = DEFAULT_CONFIG.impactCoeff,
      feeRate = DEFAULT_CONFIG.feeRate,
      liquidityUsd = DEFAULT_CONFIG.defaultLiquidityUsd
    } = simOptions;
    
    // Fetch price data
    const coinId = mapSymbolToCoinId(token);
    let priceData = await fetchCoinGeckoData(coinId);
    let priceSource = 'coingecko';
    
    if (!priceData || priceData.length === 0) {
      console.log(`Generating synthetic price data for ${token}`);
      priceData = generateSyntheticSeries(entryPrice, 1440, seed);
      priceSource = 'synthetic';
    }
    
    // Calculate position parameters
    const positionUsd = capitalUsd * sizingPercent;
    const priceImpact = calculatePriceImpact(positionUsd, liquidityUsd, impactCoeff);
    const sign = decision === 'LONG' ? 1 : -1;
    const entryFillPrice = entryPrice * (1 + sign * priceImpact);
    const fees = positionUsd * feeRate * 2;
    
    // Generate snapshots
    const snapshots = [];
    const currentTime = Date.now();
    
    for (const horizonSeconds of horizons) {
      const targetTimestamp = currentTime + (horizonSeconds * 1000);
      const pricePoint = findClosestPricePoint(priceData, targetTimestamp);
      
      if (pricePoint) {
        const decayFactor = calculateDecayFactor(horizonSeconds);
        const effectivePrice = pricePoint.price * (1 + sign * priceImpact * decayFactor);
        const { pnlUsd, roi } = calculatePnL(decision, entryFillPrice, effectivePrice, positionUsd, fees);
        
        snapshots.push({
          horizonSeconds,
          timestamp: pricePoint.timestamp,
          marketPrice: pricePoint.price,
          effectivePrice,
          pnlUsd,
          roi,
          decayFactor
        });
      }
    }
    
    const finalSnapshot = snapshots[snapshots.length - 1];
    const finalPnlUsd = finalSnapshot ? finalSnapshot.pnlUsd : 0;
    const finalRoi = finalSnapshot ? finalSnapshot.roi : 0;
    
    return {
      entryPrice,
      entryFillPrice,
      positionUsd,
      capitalUsd,
      decision,
      snapshots,
      finalPnlUsd,
      finalRoi,
      meta: {
        priceSource,
        impactApplied: priceImpact,
        feesApplied: fees,
        timestamp: new Date().toISOString(),
        disclaimer: 'SIMULATION - NO REAL TXS'
      }
    };
    
  } catch (error) {
    console.error('Simulation error:', error);
    throw new Error(`Simulation failed: ${error.message}`);
  }
}

// Named exports
export { simulateTrade };
export { generateSyntheticSeries };
export { fetchCoinGeckoData };
export { mapSymbolToCoinId };
export { calculatePriceImpact };
export { calculateDecayFactor };
export { calculatePnL };
export { DEFAULT_CONFIG };