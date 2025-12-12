/**
 * Test the configuration system
 */

import { getConfig, getConfigSummary, validateSimulationOptions } from './config.js';

console.log('🧪 Testing Configuration System...\n');

try {
  // Test 1: Load configuration
  console.log('Test 1: Loading configuration');
  const config = getConfig();
  console.log('✅ Configuration loaded successfully');
  console.log('Config keys:', Object.keys(config));
  
  // Test 2: Get configuration summary
  console.log('\nTest 2: Configuration summary');
  const summary = getConfigSummary();
  console.log('✅ Configuration summary:');
  Object.entries(summary).forEach(([key, value]) => {
    console.log(`  ${key}: ${value}`);
  });
  
  // Test 3: Validate valid simulation options
  console.log('\nTest 3: Validating simulation options');
  
  const validOptions = {
    token: 'SOL',
    decision: 'LONG',
    entryPrice: 100,
    capitalUsd: 1000,
    sizingPercent: 0.5
  };
  
  const isValid = validateSimulationOptions(validOptions);
  console.log('✅ Valid options passed validation:', isValid);
  
  // Test 4: Test invalid options
  console.log('\nTest 4: Testing invalid options');
  
  const invalidOptions = [
    { token: '', decision: 'LONG', entryPrice: 100 },
    { token: 'SOL', decision: 'INVALID', entryPrice: 100 },
    { token: 'SOL', decision: 'LONG', entryPrice: -1 },
    { token: 'SOL', decision: 'LONG', entryPrice: 100, capitalUsd: -1 },
    { token: 'SOL', decision: 'LONG', entryPrice: 100, sizingPercent: 1.5 }
  ];
  
  invalidOptions.forEach((opts, i) => {
    try {
      validateSimulationOptions(opts);
      console.log(`❌ Invalid option ${i + 1} should have failed`);
    } catch (error) {
      console.log(`✅ Invalid option ${i + 1} correctly rejected: ${error.message}`);
    }
  });
  
  console.log('\n🎉 Configuration system tests completed!');
  
} catch (error) {
  console.error('❌ Configuration test failed:', error);
  console.error('Stack:', error.stack);
}