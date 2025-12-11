#!/usr/bin/env node

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

console.log('🎯 Validating Contrarian Agent Setup...\n');

let hasErrors = false;
let hasWarnings = false;

function error(message) {
  console.log(`❌ ERROR: ${message}`);
  hasErrors = true;
}

function warning(message) {
  console.log(`⚠️  WARNING: ${message}`);
  hasWarnings = true;
}

function success(message) {
  console.log(`✅ ${message}`);
}

function info(message) {
  console.log(`ℹ️  ${message}`);
}

// Check required files
const requiredFiles = [
  'package.json',
  'agent-server.js',
  'startup.js',
  '.env.example',
  'src/agents/contrarian.ts',
  'src/lib/sentiment-fetcher.ts',
  'src/lib/signal-generator.ts',
  'src/lib/contrarian-brain.ts',
  'src/lib/payment-verification.ts',
  'src/lib/market-integration.ts',
  'src/types/index.ts'
];

console.log('📁 Checking required files...');
for (const file of requiredFiles) {
  const filePath = path.join(__dirname, file);
  if (fs.existsSync(filePath)) {
    success(`${file} exists`);
  } else {
    error(`${file} is missing`);
  }
}

// Check test files
const testFiles = [
  'src/__tests__/interface-compliance.test.ts',
  'src/__tests__/sentiment-fetcher.test.ts',
  'src/__tests__/signal-generator.test.ts',
  'src/__tests__/contrarian-brain.test.ts',
  'src/__tests__/payment-verification.test.ts',
  'src/__tests__/market-integration.test.ts',
  'src/__tests__/contrarian-agent.test.ts'
];

console.log('\n🧪 Checking test files...');
for (const file of testFiles) {
  const filePath = path.join(__dirname, file);
  if (fs.existsSync(filePath)) {
    success(`${file} exists`);
  } else {
    error(`${file} is missing`);
  }
}

// Check package.json configuration
console.log('\n📦 Checking package.json configuration...');
try {
  const packageJson = JSON.parse(fs.readFileSync(path.join(__dirname, 'package.json'), 'utf8'));
  
  if (packageJson.name === 'contrarian-agent') {
    success('Package name is correct');
  } else {
    error('Package name should be "contrarian-agent"');
  }
  
  if (packageJson.type === 'module') {
    success('Package type is set to "module"');
  } else {
    error('Package type should be "module" for ES6 imports');
  }
  
  const requiredScripts = ['server', 'dev:server', 'test', 'validate'];
  for (const script of requiredScripts) {
    if (packageJson.scripts[script]) {
      success(`Script "${script}" is defined`);
    } else {
      error(`Script "${script}" is missing`);
    }
  }
  
  const requiredDeps = [
    '@coral-xyz/anchor',
    '@google/generative-ai',
    '@solana/web3.js',
    'express',
    'cors',
    'dotenv',
    'bs58'
  ];
  
  for (const dep of requiredDeps) {
    if (packageJson.dependencies[dep]) {
      success(`Dependency "${dep}" is installed`);
    } else {
      error(`Dependency "${dep}" is missing`);
    }
  }
  
  const requiredDevDeps = [
    'typescript',
    'jest',
    'ts-jest',
    'fast-check',
    '@types/jest'
  ];
  
  for (const dep of requiredDevDeps) {
    if (packageJson.devDependencies[dep]) {
      success(`Dev dependency "${dep}" is installed`);
    } else {
      error(`Dev dependency "${dep}" is missing`);
    }
  }
  
} catch (err) {
  error('Failed to read or parse package.json');
}

// Check environment configuration
console.log('\n🔧 Checking environment configuration...');
const envExamplePath = path.join(__dirname, '.env.example');
if (fs.existsSync(envExamplePath)) {
  const envExample = fs.readFileSync(envExamplePath, 'utf8');
  
  const requiredEnvVars = [
    'GEMINI_API_KEY',
    'COINGECKO_API_KEY',
    'RPC_URL',
    'SOLANA_PRIVATE_KEY',
    'SERVER_WALLET',
    'FRONTEND_URL',
    'PORT',
    'FEAR_GREED_SELL_THRESHOLD',
    'EXTREME_CONDITION_THRESHOLD'
  ];
  
  for (const envVar of requiredEnvVars) {
    if (envExample.includes(envVar)) {
      success(`Environment variable "${envVar}" is documented`);
    } else {
      error(`Environment variable "${envVar}" is missing from .env.example`);
    }
  }
}

const envPath = path.join(__dirname, '.env');
if (fs.existsSync(envPath)) {
  success('.env file exists');
  info('Remember to configure your actual API keys and wallet addresses');
} else {
  warning('.env file not found - copy from .env.example and configure');
}

// Check TypeScript configuration
console.log('\n📝 Checking TypeScript configuration...');
const tsconfigPath = path.join(__dirname, 'tsconfig.json');
if (fs.existsSync(tsconfigPath)) {
  try {
    const tsconfig = JSON.parse(fs.readFileSync(tsconfigPath, 'utf8'));
    
    if (tsconfig.compilerOptions?.module === 'esnext') {
      success('TypeScript module configuration is correct');
    } else {
      error('TypeScript module should be "esnext" for ES6 compatibility');
    }
    
    if (tsconfig.compilerOptions?.moduleResolution === 'bundler') {
      success('TypeScript module resolution is configured');
    } else {
      warning('TypeScript module resolution should be "bundler"');
    }
    
    if (tsconfig.compilerOptions?.paths && tsconfig.compilerOptions.paths['@/*']) {
      success('TypeScript path mapping is configured');
    } else {
      warning('TypeScript path mapping for @/* is not configured');
    }
    
  } catch (err) {
    error('Failed to parse tsconfig.json');
  }
} else {
  error('tsconfig.json is missing');
}

// Check Jest configuration
console.log('\n🧪 Checking Jest configuration...');
const jestConfigPath = path.join(__dirname, 'jest.config.js');
if (fs.existsSync(jestConfigPath)) {
  success('Jest configuration exists');
  
  try {
    const jestConfig = fs.readFileSync(jestConfigPath, 'utf8');
    if (jestConfig.includes('extensionsToTreatAsEsm')) {
      success('Jest is configured for ES modules');
    } else {
      error('Jest should be configured for ES modules');
    }
    
    if (jestConfig.includes('fast-check')) {
      success('Jest is configured for property-based testing');
    } else {
      warning('Jest should include fast-check for property-based testing');
    }
  } catch (err) {
    warning('Could not validate Jest configuration details');
  }
} else {
  error('jest.config.js is missing');
}

// Check contrarian agent structure
console.log('\n🎯 Checking Contrarian Agent structure...');
const agentPath = path.join(__dirname, 'src/agents/contrarian.ts');
if (fs.existsSync(agentPath)) {
  const agent = fs.readFileSync(agentPath, 'utf8');
  
  if (agent.includes('class ContrarianAgent')) {
    success('ContrarianAgent class is defined');
  } else {
    error('ContrarianAgent class is missing');
  }
  
  if (agent.includes('IContrarianAgent')) {
    success('IContrarianAgent interface is implemented');
  } else {
    error('IContrarianAgent interface implementation is missing');
  }
  
  if (agent.includes('generateSignal')) {
    success('Signal generation method is defined');
  } else {
    error('Signal generation method is missing');
  }
  
  if (agent.includes('generateSmugRant')) {
    success('Smug rant generation method is defined');
  } else {
    error('Smug rant generation method is missing');
  }
}

// Check server structure
console.log('\n🖥️  Checking server structure...');
const serverPath = path.join(__dirname, 'agent-server.js');
if (fs.existsSync(serverPath)) {
  const server = fs.readFileSync(serverPath, 'utf8');
  
  if (server.includes('express')) {
    success('Express server is configured');
  } else {
    error('Express server configuration is missing');
  }
  
  if (server.includes('/api/status')) {
    success('Status API endpoint is defined');
  } else {
    error('Status API endpoint is missing');
  }
  
  if (server.includes('/api/analyze')) {
    success('Analysis API endpoint is defined');
  } else {
    error('Analysis API endpoint is missing');
  }
  
  if (server.includes('/api/unlock')) {
    success('Unlock API endpoint is defined');
  } else {
    error('Unlock API endpoint is missing');
  }
  
  if (server.includes('/api/sentiment')) {
    success('Sentiment API endpoint is defined');
  } else {
    error('Sentiment API endpoint is missing');
  }
  
  if (server.includes('verifyPayment')) {
    success('Payment verification is implemented');
  } else {
    error('Payment verification is missing');
  }
  
  if (server.includes('PORT = process.env.PORT || 4002')) {
    success('Unique port (4002) is configured');
  } else {
    warning('Port should be 4002 to avoid conflicts with other agents');
  }
}

// Check module integration
console.log('\n🔗 Checking module integration...');
const modules = [
  'sentiment-fetcher.ts',
  'signal-generator.ts',
  'contrarian-brain.ts',
  'payment-verification.ts',
  'market-integration.ts'
];

for (const module of modules) {
  const modulePath = path.join(__dirname, 'src/lib', module);
  if (fs.existsSync(modulePath)) {
    const moduleContent = fs.readFileSync(modulePath, 'utf8');
    
    if (moduleContent.includes('export class')) {
      success(`${module} exports a class`);
    } else {
      error(`${module} should export a class`);
    }
    
    if (moduleContent.includes('interface')) {
      success(`${module} defines interfaces`);
    } else {
      warning(`${module} should define interfaces`);
    }
  }
}

// Check property-based tests
console.log('\n🎲 Checking property-based tests...');
const testDir = path.join(__dirname, 'src/__tests__');
if (fs.existsSync(testDir)) {
  const testFiles = fs.readdirSync(testDir).filter(f => f.endsWith('.test.ts'));
  
  for (const testFile of testFiles) {
    const testPath = path.join(testDir, testFile);
    const testContent = fs.readFileSync(testPath, 'utf8');
    
    if (testContent.includes('fc.assert')) {
      success(`${testFile} includes property-based tests`);
    } else {
      warning(`${testFile} should include property-based tests with fast-check`);
    }
    
    if (testContent.includes('Feature: contrarian-agent, Property')) {
      success(`${testFile} includes property validation comments`);
    } else {
      warning(`${testFile} should include property validation comments`);
    }
    
    if (testContent.includes('numRuns: 100')) {
      success(`${testFile} runs sufficient property test iterations`);
    } else {
      warning(`${testFile} should run at least 100 property test iterations`);
    }
  }
}

// Check alignment with other agents
console.log('\n🤝 Checking alignment with other agents...');
const degenAgentPath = path.join(__dirname, '../degen-agent');
const paperHandsPath = path.join(__dirname, '../paper-hands-agent');

for (const [agentName, agentPath] of [['degen-agent', degenAgentPath], ['paper-hands-agent', paperHandsPath]]) {
  if (fs.existsSync(agentPath)) {
    success(`${agentName} directory found`);
    
    const agentPackage = path.join(agentPath, 'package.json');
    if (fs.existsSync(agentPackage)) {
      try {
        const otherPackage = JSON.parse(fs.readFileSync(agentPackage, 'utf8'));
        
        if (otherPackage.type === 'module') {
          success(`Both contrarian-agent and ${agentName} use ES modules`);
        } else {
          warning(`contrarian-agent and ${agentName} have different module types`);
        }
        
      } catch (err) {
        warning(`Could not compare with ${agentName} package.json`);
      }
    }
  } else {
    info(`${agentName} directory not found - this is optional`);
  }
}

// Check frontend integration compatibility
console.log('\n🌐 Checking frontend compatibility...');
const frontendPath = path.join(__dirname, '../frontend');
if (fs.existsSync(frontendPath)) {
  success('frontend directory found');
  
  const frontendPackage = path.join(frontendPath, 'package.json');
  if (fs.existsSync(frontendPackage)) {
    try {
      const fePackage = JSON.parse(fs.readFileSync(frontendPackage, 'utf8'));
      
      const solanaDeps = ['@solana/web3.js', '@coral-xyz/anchor'];
      for (const dep of solanaDeps) {
        if (fePackage.dependencies && fePackage.dependencies[dep]) {
          success(`Frontend has compatible ${dep}`);
        }
      }
      
    } catch (err) {
      warning('Could not check frontend compatibility');
    }
  }
} else {
  warning('frontend directory not found - ensure proper project structure');
}

// Final summary
console.log('\n📊 Validation Summary:');
if (hasErrors) {
  console.log('❌ Setup has errors that need to be fixed before running');
  process.exit(1);
} else if (hasWarnings) {
  console.log('⚠️  Setup is mostly complete but has some warnings');
  console.log('🚀 You can try running the agent, but consider addressing warnings');
} else {
  console.log('✅ Setup looks good! Ready to run the Contrarian Agent');
}

console.log('\n🚀 Next steps:');
console.log('1. Copy .env.example to .env and configure your API keys');
console.log('2. Install dependencies: npm install');
console.log('3. Run tests: npm test');
console.log('4. Start the agent: npm run server');

console.log('\n🎯 Contrarian Agent Features:');
console.log('- Real-time Fear & Greed Index analysis');
console.log('- Community sentiment analysis via CoinGecko');
console.log('- Contrarian signal generation (>60 = SELL, ≤60 = BUY)');
console.log('- Smug reasoning with x402 payment protection');
console.log('- Prediction market integration');
console.log('- Property-based testing with 25+ correctness properties');

console.log('\n📚 Documentation:');
console.log('- .env.example - Environment configuration template');
console.log('- agent-server.js - Main server implementation');
console.log('- src/agents/contrarian.ts - Core agent logic');
console.log('- src/__tests__/ - Comprehensive test suite');