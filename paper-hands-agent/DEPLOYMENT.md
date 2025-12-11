# PaperHands Agent Deployment Guide

This guide explains how to deploy the RektOrRich PaperHands Agent to work with the frontend prediction market system.

## Prerequisites

1. **Node.js** (v18 or higher)
2. **pnpm** package manager
3. **Google Gemini API Key**
4. **Solana Wallet** (for agent identity and payments)
5. **Running Frontend System** (at http://localhost:3000 or configured URL)

## Quick Start

### 1. Clone and Setup

```bash
# Navigate to the paper-hands-agent directory
cd paper-hands-agent

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
PORT=4002
FRONTEND_URL=http://localhost:3000
AGENT_SERVER_URL=http://localhost:4002

# Agent Personality (High anxiety settings)
ANXIETY_LEVEL=9
PANIC_THRESHOLD_RSI=60
PANIC_THRESHOLD_PROFIT=1.5
```

### 3. Generate Solana Keypair (if needed)

```bash
# Install Solana CLI if not already installed
sh -c "$(curl -sSfL https://release.solana.com/v1.18.4/install)"

# Generate a new keypair
solana-keygen new --outfile ~/.config/solana/paper-hands-agent.json

# Get the base58 private key
solana-keygen pubkey ~/.config/solana/paper-hands-agent.json
```

### 4. Validate Setup

```bash
# Validate your configuration
pnpm run validate

# This will check:
# - Environment variables
# - Solana connection
# - Wallet addresses
# - Agent personality settings
```

### 5. Start the Agent

```bash
# Start the agent (includes backend server and frontend integration)
pnpm run agent

# Or start just the backend server
pnpm run server

# For development with auto-restart
pnpm run dev:agent
```

## Integration with Frontend

The paper-hands-agent automatically integrates with the main frontend system:

### 1. Agent Registration

When started, the agent will:
- Register itself with the frontend at `/api/agents/register`
- Provide its anxious personality and capabilities
- Establish WebSocket connection for real-time panic updates

### 2. Panic Sell Markets

For high-anxiety decisions (≥8 anxiety level), the agent will:
- Create prediction markets automatically
- Set 24-hour expiration times
- Provide initial liquidity (0.1 SOL)
- Options: "Paper Hands" vs "Saved the Bag"

### 3. Real-time Panic Updates

The agent provides real-time updates via:
- WebSocket connections to frontend
- HTTP API endpoints for panic triggers
- Event notifications for anxiety spikes

## API Integration

### Frontend → Agent Communication

The frontend can interact with the agent via:

```javascript
// Trigger panic mode (for testing)
const response = await fetch('http://localhost:4002/api/panic', {
  method: 'POST'
});

// Get agent status
const status = await fetch('http://localhost:4002/api/status');

// Get panic logs
const logs = await fetch('http://localhost:4002/api/logs');

// Request token analysis (always bearish)
const analysis = await fetch('http://localhost:4002/api/analyze', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    tokenSymbol: 'BTC',
    currentPrice: 45000
  })
});
```

### Agent → Frontend Communication

The agent communicates with the frontend via:

```javascript
// Register agent
POST /api/agents/register
{
  "id": "paper-hands-agent",
  "name": "PaperHands Agent", 
  "description": "AI-powered paper hands agent with extreme anxiety",
  "personality": {
    "type": "PAPER_HANDS",
    "anxietyLevel": 9,
    "riskTolerance": "EXTREMELY_LOW"
  }
}

// Submit panic decision
POST /api/agents/paper-hands-agent/decisions
{
  "tokenSymbol": "BTC",
  "decision": "PANIC_SELL",
  "confidence": 85,
  "reasoning": "Market looks too volatile! RSI is 62!",
  "anxietyLevel": 9
}

// Create prediction market
POST /api/markets/create
{
  "question": "Will BTC increase after PaperHands Agent's panic sell?",
  "endTime": 1640995200,
  "initialLiquidity": 0.1,
  "agentId": "paper-hands-agent"
}
```

## Agent Personality

### Panic Triggers

The PaperHands Agent will panic sell when:
- RSI > 60 (configurable, default very low)
- Profit > 1.5% (takes profits early)
- Any red candle appears
- Market volatility increases
- Anxiety level reaches 8+

### Fear Responses

The agent uses anxious language:
- "Too risky!"
- "Secure the bag!"
- "It's a trap!"
- "Cash is king!"
- "Better safe than sorry!"

### Behavioral Patterns

- **Extreme Risk Aversion**: Sells at minimal profits
- **High Anxiety**: Constantly worried about losses
- **Paper Hands**: Never holds through dips
- **Cash Preference**: Prefers staying in stablecoins

## Monitoring and Logging

### Health Checks

```bash
# Check agent health
curl http://localhost:4002/health

# Check agent status (includes anxiety level)
curl http://localhost:4002/api/status
```

### Log Monitoring

```bash
# View logs in real-time
pnpm run agent

# Or check specific log files
tail -f logs/paper-hands-agent.log
```

## Production Deployment

### Using PM2

```bash
# Install PM2 globally
npm install -g pm2

# Start agent with PM2
pm2 start agent-server.js --name "paper-hands-agent"

# Monitor
pm2 status
pm2 logs paper-hands-agent

# Auto-restart on system reboot
pm2 startup
pm2 save
```

### Environment Variables

Production environment should include:

```env
NODE_ENV=production
PORT=4002
GEMINI_API_KEY=your_production_api_key
RPC_URL=https://api.mainnet-beta.solana.com
SOLANA_PRIVATE_KEY=your_production_private_key
SERVER_WALLET=your_production_wallet
FRONTEND_URL=https://your-frontend-domain.com
ANXIETY_LEVEL=10
```

## Troubleshooting

### Common Issues

1. **Agent won't start**
   - Check environment variables with `pnpm run validate`
   - Verify Solana connection
   - Ensure port 4002 is available

2. **No panic sells happening**
   - Check anxiety level (should be 8+)
   - Verify panic thresholds are set low enough
   - Monitor logs for trigger conditions

3. **Frontend integration failing**
   - Verify FRONTEND_URL is correct
   - Check if frontend is running
   - Ensure agent registration endpoint is available

### Debug Mode

```bash
# Set debug environment
export DEBUG=paper-hands-agent:*

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

# Test panic triggers
curl -X POST http://localhost:4002/api/panic
```

## Security Considerations

1. **Private Key Security**
   - Never commit private keys to version control
   - Use environment variables or secure key management
   - Use a dedicated wallet for the agent (not your main wallet)

2. **API Key Protection**
   - Secure Gemini API key
   - Monitor API usage and quotas
   - Implement rate limiting

3. **Panic Prevention**
   - Set reasonable anxiety levels
   - Monitor for excessive panic selling
   - Implement circuit breakers if needed

## Performance Optimization

1. **Anxiety Management**
   - Tune panic thresholds for optimal behavior
   - Monitor anxiety level trends
   - Implement anxiety cooldown periods

2. **Market Monitoring**
   - Optimize polling intervals
   - Cache technical indicator calculations
   - Implement efficient panic detection

## Support

For issues and questions:

1. Check the logs: `pnpm run agent` or `pm2 logs paper-hands-agent`
2. Run validation: `pnpm run validate`
3. Test panic mode: `curl -X POST http://localhost:4002/api/panic`
4. Verify configuration: Check `.env` file and anxiety settings