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
    'GEMINI_FLASH_MODEL', 
    'GEMINI_ENABLE_THOUGHTS',
    'GEMINI_THOUGHTS_TEMPERATURE',
    'COST_CONTROL_MAX_TOKENS',
    'COST_CONTROL_MAX_THOUGHT_TOKENS',
    'RPC_URL',
    'SOLANA_PRIVATE_KEY',
    'SERVER_WALLET',
    'FRONTEND_URL',
    'AGENT_SERVER_URL',
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
  
  // Validate Gemini Flash Thinking configuration
  const envContent = fs.readFileSync(envPath, 'utf8');
  
  // Check API key format
  const apiKeyMatch = envContent.match(/GEMINI_API_KEY=(.+)/);
  if (apiKeyMatch && apiKeyMatch[1] && apiKeyMatch[1] !== 'your_gemini_api_key_here') {
    const apiKey = apiKeyMatch[1].replace(/"/g, '');
    if (apiKey.startsWith('AIza') && apiKey.length > 30) {
      success('Gemini API key appears to be properly formatted');
    } else {
      warning('Gemini API key format may be incorrect (should start with "AIza")');
    }
  } else {
    warning('Gemini API key not configured - update from .env.example');
  }
  
  if (envContent.includes('GEMINI_ENABLE_THOUGHTS=true')) {
    success('Gemini Flash Thinking is enabled');
    
    // Validate model configuration
    const modelMatch = envContent.match(/GEMINI_FLASH_MODEL=(.+)/);
    if (modelMatch && modelMatch[1]) {
      const model = modelMatch[1].replace(/"/g, '');
      if (model.includes('gemini-2.0-flash-thinking')) {
        success('Gemini Flash Thinking model is properly configured');
      } else if (model.includes('thinking')) {
        success('Thinking-capable model is configured');
      } else {
        warning('Model may not support Flash Thinking - use gemini-2.0-flash-thinking-exp-01-21');
      }
    } else {
      error('GEMINI_FLASH_MODEL is required when Flash Thinking is enabled');
    }
    
    // Validate temperature setting
    const tempMatch = envContent.match(/GEMINI_THOUGHTS_TEMPERATURE=(.+)/);
    if (tempMatch && tempMatch[1]) {
      const temp = parseFloat(tempMatch[1]);
      if (temp >= 0.0 && temp <= 2.0) {
        success(`Temperature is set to ${temp} (valid range)`);
      } else {
        warning(`Temperature ${temp} is outside recommended range (0.0-2.0)`);
      }
    } else {
      warning('GEMINI_THOUGHTS_TEMPERATURE should be set (recommended: 1.0)');
    }
    
    // Validate cost control
    const maxTokensMatch = envContent.match(/COST_CONTROL_MAX_TOKENS=(.+)/);
    const maxThoughtTokensMatch = envContent.match(/COST_CONTROL_MAX_THOUGHT_TOKENS=(.+)/);
    
    if (maxTokensMatch && maxThoughtTokensMatch) {
      const maxTokens = parseInt(maxTokensMatch[1]);
      const maxThoughtTokens = parseInt(maxThoughtTokensMatch[1]);
      
      if (maxTokens > 0 && maxThoughtTokens > 0) {
        success('Cost control limits are configured');
        
        if (maxThoughtTokens <= maxTokens) {
          success('Token limits are properly configured');
        } else {
          warning('COST_CONTROL_MAX_THOUGHT_TOKENS should not exceed COST_CONTROL_MAX_TOKENS');
        }
        
        if (maxTokens > 8000) {
          warning('High token limit detected - monitor costs carefully');
        }
      } else {
        error('Cost control limits must be positive integers');
      }
    } else {
      warning('Cost control variables should be set to manage token usage');
    }
    
  } else if (envContent.includes('GEMINI_ENABLE_THOUGHTS=false')) {
    info('Gemini Flash Thinking is disabled - using standard generation');
    info('To enable Flash Thinking, set GEMINI_ENABLE_THOUGHTS=true');
  } else {
    warning('GEMINI_ENABLE_THOUGHTS should be explicitly set to true or false');
  }
  
  // Check server URL configuration
  if (envContent.includes('AGENT_SERVER_URL')) {
    success('Agent server URL is configured');
  } else {
    warning('AGENT_SERVER_URL should be set for proper frontend integration');
  }
  
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

// Test Gemini API connectivity (optional)
console.log('\n🌐 Testing Gemini API connectivity...');
if (fs.existsSync(envPath)) {
  try {
    const envContent = fs.readFileSync(envPath, 'utf8');
    const apiKeyMatch = envContent.match(/GEMINI_API_KEY=(.+)/);
    
    if (apiKeyMatch && apiKeyMatch[1] && !apiKeyMatch[1].includes('your_gemini_api_key_here')) {
      info('Gemini API key found - connectivity test available');
      info('Run "node -e "import(\'./startup.js\').then(m => m.initializeAgentIntegration())"" to test connectivity');
    } else {
      info('Configure GEMINI_API_KEY in .env to test connectivity');
    }
  } catch (err) {
    info('Configure .env file to enable connectivity testing');
  }
} else {
  info('Create .env file to enable connectivity testing');
}

console.log('\n🚀 Next steps:');
console.log('1. Copy .env.example to .env and configure your API keys');
console.log('2. Configure Gemini Flash Thinking settings in .env:');
console.log('   - GEMINI_API_KEY: Get from https://aistudio.google.com/app/apikey');
console.log('   - GEMINI_ENABLE_THOUGHTS: Set to true for Flash Thinking');
console.log('   - GEMINI_FLASH_MODEL: Use gemini-2.0-flash-thinking-exp-01-21');
console.log('3. Install dependencies: pnpm install');
console.log('4. Test connectivity: node startup.js');
console.log('5. Start the agent: pnpm run agent');
console.log('6. Test Flash Thinking: curl -X POST http://localhost:4001/api/analyze -d \'{"tokenSymbol":"BTC"}\'');
console.log('7. Test streaming: curl -N http://localhost:4001/stream/analyze?token=BTC');
console.log('8. Check integration: pnpm test');

console.log('\n📚 Documentation:');
console.log('- README.md - Setup and usage guide');
console.log('- DEPLOYMENT.md - Production deployment guide with Flash Thinking rollout procedures');
console.log('- .env.example - Environment configuration template with Gemini settings');
console.log('- validate-setup.js - This validation script');

console.log('\n🧠 Flash Thinking Features:');
console.log('- Chain-of-thought reasoning with step-by-step analysis');
console.log('- Real-time streaming of thinking process');
console.log('- Premium content with payment-gated access');
console.log('- Cost control with configurable token limits');
console.log('- Feature flag for instant enable/disable');