import { spawn } from 'child_process';
import dotenv from 'dotenv';

dotenv.config();

console.log('🚨 Starting PaperHands Agent...');
console.log('😰 Initializing extreme anxiety protocols...');

// Validate environment
const requiredEnvVars = ['GEMINI_API_KEY', 'RPC_URL', 'SERVER_WALLET'];
const missingVars = requiredEnvVars.filter(varName => !process.env[varName]);

if (missingVars.length > 0) {
    console.error('❌ Missing required environment variables:');
    missingVars.forEach(varName => {
        console.error(`   - ${varName}`);
    });
    console.error('\n💡 Please check your .env file');
    process.exit(1);
}

console.log('✅ Environment validated');
console.log(`🔗 RPC URL: ${process.env.RPC_URL}`);
console.log(`💰 Server Wallet: ${process.env.SERVER_WALLET}`);
console.log(`🌐 Port: ${process.env.PORT || 4002}`);

// Start the agent server
const agentServer = spawn('node', ['agent-server.js'], {
    stdio: 'inherit',
    env: { ...process.env }
});

agentServer.on('error', (error) => {
    console.error('❌ Failed to start agent server:', error);
    process.exit(1);
});

agentServer.on('close', (code) => {
    console.log(`🚨 Agent server exited with code ${code}`);
    if (code !== 0) {
        console.error('💥 Agent crashed! Check logs above.');
        process.exit(code);
    }
});

// Handle graceful shutdown
process.on('SIGINT', () => {
    console.log('\n🛑 Shutting down PaperHands Agent...');
    agentServer.kill('SIGINT');
    process.exit(0);
});

process.on('SIGTERM', () => {
    console.log('\n🛑 Terminating PaperHands Agent...');
    agentServer.kill('SIGTERM');
    process.exit(0);
});