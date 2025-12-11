# Degen Agent Deployment Guide

This guide explains how to deploy the RektOrRich Degen Agent to work with the frontend prediction market system.

## Prerequisites

1. **Node.js** (v18 or higher)
2. **pnpm** package manager
3. **Google Gemini API Key**
4. **Solana Wallet** (for agent identity and payments)
5. **Running Frontend System** (at http://localhost:3000 or configured URL)

## Quick Start

### 1. Clone and Setup

```bash
# Navigate to the degen-agent directory
cd degen-agent

# Install dependencies
pnpm install

# Copy environment template
cp .env.example .env
```

### 2. Configure Environment

Edit `.env` file with your settings:

```env
# Required: Get from Google AI Studio
GEMINI_API_KEY=your_actual_gemini_api_key

# Solana Configuration
RPC_URL=https://api.devnet.solana.com
SOLANA_PRIVATE_KEY=your_base58_encoded_private_key
SERVER_WALLET=your_receiving_wallet_address

# Server Configuration
PORT=4001
FRONTEND_URL=http://localhost:3000
AGENT_SERVER_URL=http://localhost:4001
```

### 3. Generate Solana Keypair (if needed)

```bash
# Install Solana CLI if not already installed
sh -c "$(curl -sSfL https://release.solana.com/v1.18.4/install)"

# Generate a new keypair
solana-keygen new --outfile ~/.config/solana/degen-agent.json

# Get the base58 private key
solana-keygen pubkey ~/.config/solana/degen-agent.json
```

### 4. Start the Agent

```bash
# Start the agent (includes backend server and frontend integration)
pnpm run agent

# Or start just the backend server
pnpm run server

# For development with auto-restart
pnpm run dev:agent
```

## Integration with Frontend

The degen-agent automatically integrates with the main frontend system:

### 1. Agent Registration

When started, the agent will:
- Register itself with the frontend at `/api/agents/register`
- Provide its capabilities and endpoint information
- Establish WebSocket connection for real-time updates

### 2. Prediction Market Creation

For high-confidence predictions (≥75%), the agent will:
- Create prediction markets automatically
- Set 24-hour expiration times
- Provide initial liquidity (0.1 SOL)

### 3. Real-time Updates

The agent provides real-time updates via:
- WebSocket connections to frontend
- HTTP API endpoints
- Event notifications for analysis completion

## API Integration

### Frontend → Agent Communication

The frontend can interact with the agent via:

```javascript
// Request token analysis
const response = await fetch('http://localhost:4001/api/analyze', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    tokenSymbol: 'BTC',
    currentPrice: 45000
  })
});

// Get agent status
const status = await fetch('http://localhost:4001/api/status');

// Get agent logs
const logs = await fetch('http://localhost:4001/api/logs');
```

### Agent → Frontend Communication

The agent communicates with the frontend via:

```javascript
// Register agent
POST /api/agents/register
{
  "name": "RektOrRich Agent",
  "description": "AI-powered crypto prediction market agent",
  "walletAddress": "agent_wallet_address",
  "serverUrl": "http://localhost:4001"
}

// Submit trading decision
POST /api/agents/{agentId}/decisions
{
  "tokenSymbol": "BTC",
  "decision": "LONG",
  "confidence": 85,
  "reasoning": "Analysis details..."
}

// Create prediction market
POST /api/markets/create
{
  "question": "Will BTC increase in value over the next 24h?",
  "endTime": 1640995200,
  "initialLiquidity": 0.1,
  "agentId": "agent_wallet_address"
}
```

## Payment System

### Payment Verification

The agent verifies Solana payments for premium features:

- **Peek Price**: 0.05 SOL - Unlock premium analysis
- **God Mode**: 1.0 SOL - Custom prompt injection

### Payment Flow

1. User initiates payment on frontend
2. Frontend sends transaction signature to agent
3. Agent verifies transaction on Solana blockchain
4. Agent unlocks premium content if payment valid

## Monitoring and Logging

### Health Checks

```bash
# Check agent health
curl http://localhost:4001/health

# Check agent status
curl http://localhost:4001/api/status
```

### Log Monitoring

The agent provides structured logging:

```javascript
// Example log entry
{
  "id": 1640995200123,
  "timestamp": "2024-01-01T12:00:00.000Z",
  "text": "🔍 Analyzing BTC...",
  "isPremium": false,
  "meta": {
    "token": "BTC",
    "stage": "analysis"
  }
}
```

## Production Deployment

### 1. Environment Setup

For production, update `.env`:

```env
# Use mainnet for production
RPC_URL=https://api.mainnet-beta.solana.com

# Use production frontend URL
FRONTEND_URL=https://your-frontend-domain.com
AGENT_SERVER_URL=https://your-agent-domain.com

# Secure wallet with sufficient SOL
SOLANA_PRIVATE_KEY=your_production_private_key
SERVER_WALLET=your_production_receiving_wallet
```

### 2. Process Management

Use PM2 for production process management:

```bash
# Install PM2
npm install -g pm2

# Start agent with PM2
pm2 start run-agent.js --name "degen-agent"

# Monitor
pm2 status
pm2 logs degen-agent

# Auto-restart on system reboot
pm2 startup
pm2 save
```

### 3. Reverse Proxy (Nginx)

```nginx
server {
    listen 80;
    server_name your-agent-domain.com;

    location / {
        proxy_pass http://localhost:4001;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
    }
}
```

### 4. SSL Certificate

```bash
# Install certbot
sudo apt install certbot python3-certbot-nginx

# Get SSL certificate
sudo certbot --nginx -d your-agent-domain.com
```

## Troubleshooting

### Common Issues

1. **Agent not connecting to frontend**
   ```bash
   # Check frontend is running
   curl http://localhost:3000/health
   
   # Check network connectivity
   ping localhost
   
   # Verify FRONTEND_URL in .env
   ```

2. **Payment verification failing**
   ```bash
   # Check RPC connection
   curl -X POST -H "Content-Type: application/json" \
     -d '{"jsonrpc":"2.0","id":1,"method":"getHealth"}' \
     https://api.devnet.solana.com
   
   # Verify wallet has SOL for fees
   solana balance your_wallet_address
   ```

3. **AI analysis not working**
   ```bash
   # Test Gemini API key
   curl -H "Authorization: Bearer $GEMINI_API_KEY" \
     https://generativelanguage.googleapis.com/v1/models
   ```

### Debug Mode

Enable debug logging:

```bash
# Set debug environment
export DEBUG=degen-agent:*

# Start with verbose logging
pnpm run agent
```

### Testing Integration

Run integration tests:

```bash
# Run all tests
pnpm test

# Run only integration tests
pnpm test integration.test.ts

# Run with coverage
pnpm test --coverage
```

## Security Considerations

1. **Private Key Security**
   - Never commit private keys to version control
   - Use environment variables or secure key management
   - Rotate keys regularly

2. **API Key Protection**
   - Secure Gemini API key
   - Monitor API usage and quotas
   - Implement rate limiting

3. **Payment Verification**
   - Always verify payments on-chain
   - Implement proper error handling
   - Log all payment attempts

4. **Network Security**
   - Use HTTPS in production
   - Implement proper CORS policies
   - Monitor for suspicious activity

## Performance Optimization

1. **Caching**
   - Cache AI responses for similar queries
   - Implement Redis for session storage
   - Cache blockchain data when appropriate

2. **Rate Limiting**
   - Limit API requests per user
   - Implement queue for AI analysis requests
   - Monitor resource usage

3. **Monitoring**
   - Set up application monitoring (e.g., New Relic, DataDog)
   - Monitor Solana RPC performance
   - Track AI API usage and costs

## Support

For issues and questions:

1. Check the logs: `pnpm run agent` or `pm2 logs degen-agent`
2. Run tests: `pnpm test`
3. Verify configuration: Check `.env` file
4. Check frontend integration: Verify frontend is running and accessible

## Updates and Maintenance

### Updating the Agent

```bash
# Pull latest changes
git pull origin main

# Update dependencies
pnpm install

# Restart agent
pm2 restart degen-agent
```

### Database Migrations

If using persistent storage:

```bash
# Run any database migrations
npm run migrate

# Backup data before updates
npm run backup
```

### Monitoring Updates

- Monitor Gemini API changes and updates
- Keep Solana dependencies updated
- Watch for frontend API changes
- Update security patches regularly