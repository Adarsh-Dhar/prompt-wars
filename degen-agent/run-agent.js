#!/usr/bin/env node

import { spawn } from 'child_process';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

console.log('🚀 Starting RektOrRich Degen Agent...');

// Start the agent server
const agentServer = spawn('node', ['agent-server.js'], {
  cwd: __dirname,
  stdio: 'inherit',
  env: { ...process.env }
});

agentServer.on('error', (error) => {
  console.error('❌ Failed to start agent server:', error);
  process.exit(1);
});

agentServer.on('close', (code) => {
  console.log(`🔄 Agent server exited with code ${code}`);
  if (code !== 0) {
    process.exit(code);
  }
});

// Handle graceful shutdown
process.on('SIGINT', () => {
  console.log('\n🛑 Shutting down Degen Agent...');
  agentServer.kill('SIGINT');
  process.exit(0);
});

process.on('SIGTERM', () => {
  console.log('\n🛑 Shutting down Degen Agent...');
  agentServer.kill('SIGTERM');
  process.exit(0);
});