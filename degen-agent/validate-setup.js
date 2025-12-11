#!/usr/bin/env node

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

console.log('🔍 Validating Degen Agent Setup...\n');

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
  'run-agent.js',
  'startup.js',
  '.env.example',
  'src/lib/frontend-integration.ts',
  'src/__tests__/integration.test.ts'
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

// Check package.json configuration
console.log('\n📦 Checking package.json configuration...');
try {
  const packageJson = JSON.parse(fs.readFileSync(path.join(__dirname, 'package.json'), 'utf8'));
  
  if (packageJson.type === 'module') {
    success('Package type is set to "module"');
  } else {
    error('Package type should be "module" for ES6 imports');
  }
  
  const requiredScripts = ['agent', 'server', 'dev:server', 'test'];
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
    'RPC_URL',
    'SOLANA_PRIVATE_KEY',
    'SERVER_WALLET',
    'FRONTEND_URL',
    'PORT'
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
    
    if (tsconfig.compilerOptions?.module === 'esnext' || tsconfig.compilerOptions?.module === 'ES2022') {
      success('TypeScript module configuration is compatible');
    } else {
      warning('TypeScript module should be "esnext" or "ES2022" for ES6 compatibility');
    }
    
    if (tsconfig.compilerOptions?.moduleResolution === 'bundler' || tsconfig.compilerOptions?.moduleResolution === 'node') {
      success('TypeScript module resolution is configured');
    } else {
      warning('TypeScript module resolution should be configured');
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
      warning('Jest should be configured for ES modules');
    }
  } catch (err) {
    warning('Could not validate Jest configuration details');
  }
} else {
  error('jest.config.js is missing');
}

// Check integration points
console.log('\n🔗 Checking integration points...');
const integrationPath = path.join(__dirname, 'src/lib/frontend-integration.ts');
if (fs.existsSync(integrationPath)) {
  const integration = fs.readFileSync(integrationPath, 'utf8');
  
  if (integration.includes('FrontendIntegration')) {
    success('Frontend integration class is defined');
  } else {
    error('Frontend integration class is missing');
  }
  
  if (integration.includes('RealtimeIntegration')) {
    success('Real-time integration is defined');
  } else {
    error('Real-time integration is missing');
  }
  
  if (integration.includes('MarketCreationRequest')) {
    success('Market creation interface is defined');
  } else {
    error('Market creation interface is missing');
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
  
  if (server.includes('verifyPayment')) {
    success('Payment verification is implemented');
  } else {
    error('Payment verification is missing');
  }
  
  if (server.includes('GoogleGenerativeAI')) {
    success('AI integration is configured');
  } else {
    error('AI integration is missing');
  }
}

// Check alignment with prompt-wars-agent structure
console.log('\n🎯 Checking alignment with prompt-wars-agent...');
const promptWarsPath = path.join(__dirname, '../prompt-wars-agent');
if (fs.existsSync(promptWarsPath)) {
  success('prompt-wars-agent directory found');
  
  const promptWarsPackage = path.join(promptWarsPath, 'package.json');
  if (fs.existsSync(promptWarsPackage)) {
    try {
      const pwPackage = JSON.parse(fs.readFileSync(promptWarsPackage, 'utf8'));
      
      // Check if both agents have similar structure
      if (pwPackage.type === 'module') {
        success('Both agents use ES modules');
      } else {
        warning('prompt-wars-agent and degen-agent have different module types');
      }
      
      // Check for similar dependencies
      const commonDeps = ['express', 'cors', '@coral-xyz/anchor', 'dotenv'];
      for (const dep of commonDeps) {
        if (pwPackage.dependencies && pwPackage.dependencies[dep]) {
          success(`Both agents use ${dep}`);
        }
      }
      
    } catch (err) {
      warning('Could not compare with prompt-wars-agent package.json');
    }
  }
} else {
  warning('prompt-wars-agent directory not found - ensure proper project structure');
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
      
      // Check for Solana dependencies compatibility
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
  console.log('✅ Setup looks good! Ready to run the degen agent');
}

console.log('\n🚀 Next steps:');
console.log('1. Copy .env.example to .env and configure your API keys');
console.log('2. Install dependencies: pnpm install');
console.log('3. Start the agent: pnpm run agent');
console.log('4. Check integration: pnpm test');

console.log('\n📚 Documentation:');
console.log('- README.md - Setup and usage guide');
console.log('- DEPLOYMENT.md - Production deployment guide');
console.log('- .env.example - Environment configuration template');