/**
 * Trading Simulator Configuration
 * 
 * SIMULATION - NO REAL TXS
 * 
 * Centralized configuration management for the trading simulator.
 * All settings can be overridden via environment variables.
 */

import dotenv from 'dotenv';

// Load environment variables
dotenv.config();

/**
 * Default configuration values
 */
const DEFAULTS = {
  // Portfolio settings
  capitalUsd: 100,
  sizingPercent: 0.5,
  
  // Trading model parameters
  impactCoeff: 0.0005,
  feeRate: 0.001,
  defaultLiquidityUsd: 20000,
  
  // Time horizons for PnL snapshots (seconds)
  horizons: [60, 300, 3600, 86400], // 1min, 5min, 1hr, 1day
  
  // Synthetic price generation (GBM parameters)
  drift: 0.0001,
  volatility: 0.02,
  timeStep: 1/1440, // 1 minute in days
  
  // Safety settings
  autoApplyPnL: false
};

/**
 * Load configuration from environment variables with validation
 */
function loadConfig() {
  const config = {
    // Portfolio settings
    capitalUsd: parseFloat(process.env.SIM_CAPITAL_USD) || DEFAULTS.capitalUsd,
    sizingPercent: parseFloat(process.env.SIM_SIZING_PERCENT) || DEFAULTS.sizingPercent,
    
    // Trading model parameters
    impactCoeff: parseFloat(process.env.SIM_IMPACT_COEFF) || DEFAULTS.impactCoeff,
    feeRate: parseFloat(process.env.SIM_FEE_RATE) || DEFAULTS.feeRate,
    defaultLiquidityUsd: parseFloat(process.env.SIM_DEFAULT_LIQUIDITY) || DEFAULTS.defaultLiquidityUsd,
    
    // Time horizons
    horizons: DEFAULTS.horizons,
    
    // GBM parameters
    drift: DEFAULTS.drift,
    volatility: DEFAULTS.volatility,
    timeStep: DEFAULTS.timeStep,
    
    // Safety settings
    autoApplyPnL: process.env.SIM_AUTO_APPLY_PNL === 'true'
  };
  
  // Validation
  const errors = validateConfig(config);
  if (errors.length > 0) {
    throw new Error(`Invalid simulator configuration: ${errors.join(', ')}`);
  }
  
  return config;
}

/**
 * Validate configuration values
 */
function validateConfig(config) {
  const errors = [];
  
  if (config.capitalUsd <= 0) {
    errors.push('capitalUsd must be positive');
  }
  
  if (config.sizingPercent <= 0 || config.sizingPercent > 1) {
    errors.push('sizingPercent must be between 0 and 1');
  }
  
  if (config.impactCoeff < 0) {
    errors.push('impactCoeff must be non-negative');
  }
  
  if (config.feeRate < 0 || config.feeRate > 0.1) {
    errors.push('feeRate must be between 0 and 0.1 (10%)');
  }
  
  if (config.defaultLiquidityUsd <= 0) {
    errors.push('defaultLiquidityUsd must be positive');
  }
  
  if (config.volatility <= 0) {
    errors.push('volatility must be positive');
  }
  
  return errors;
}

/**
 * Get current configuration
 */
function getConfig() {
  return loadConfig();
}

/**
 * Get configuration summary for logging/debugging
 */
function getConfigSummary() {
  const config = getConfig();
  
  return {
    capitalUsd: config.capitalUsd,
    sizingPercent: `${(config.sizingPercent * 100).toFixed(1)}%`,
    impactCoeff: config.impactCoeff,
    feeRate: `${(config.feeRate * 100).toFixed(2)}%`,
    defaultLiquidityUsd: config.defaultLiquidityUsd,
    autoApplyPnL: config.autoApplyPnL,
    horizons: config.horizons.map(h => {
      if (h < 60) return `${h}s`;
      if (h < 3600) return `${Math.floor(h/60)}m`;
      if (h < 86400) return `${Math.floor(h/3600)}h`;
      return `${Math.floor(h/86400)}d`;
    }).join(', ')
  };
}

/**
 * Validate and normalize simulation options
 */
function validateSimulationOptions(options) {
  if (!options || typeof options !== 'object') {
    throw new Error('Invalid simulation options');
  }
  
  const { token, decision, entryPrice, capitalUsd, sizingPercent } = options;
  
  if (!token || typeof token !== 'string') {
    throw new Error('Token symbol is required');
  }
  
  if (!decision || !['LONG', 'SHORT'].includes(decision)) {
    throw new Error('Decision must be LONG or SHORT');
  }
  
  if (!entryPrice || entryPrice <= 0) {
    throw new Error('Entry price must be positive');
  }
  
  if (capitalUsd !== undefined && capitalUsd <= 0) {
    throw new Error('Capital must be positive');
  }
  
  if (sizingPercent !== undefined && (sizingPercent <= 0 || sizingPercent > 1)) {
    throw new Error('Sizing percent must be between 0 and 1');
  }
  
  return true;
}

export {
  getConfig,
  getConfigSummary,
  validateConfig,
  validateSimulationOptions,
  DEFAULTS
};