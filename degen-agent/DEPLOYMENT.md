# Degen Agent Deployment Guide

This guide explains how to deploy the RektOrRich Degen Agent to work with the frontend prediction market system.

## Prerequisites

1. **Node.js** (v18 or higher)
2. **pnpm** package manager
3. **Google Gemini API Key** (with access to Gemini 2.0 Flash Thinking models)
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

# Gemini Flash Thinking Configuration
GEMINI_FLASH_MODEL=gemini-2.0-flash-thinking-exp-01-21
GEMINI_ENABLE_THOUGHTS=true
GEMINI_THOUGHTS_TEMPERATURE=1.0

# Cost Control Configuration
COST_CONTROL_MAX_TOKENS=4000
COST_CONTROL_MAX_THOUGHT_TOKENS=2000

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

## Gemini Flash Thinking Configuration

The Degen Agent supports Gemini 2.0 Flash Thinking for enhanced chain-of-thought reasoning. This feature provides detailed reasoning steps that can be streamed to clients and stored as premium content.

### Feature Flag Control

```env
# Enable/disable Flash Thinking (default: true)
GEMINI_ENABLE_THOUGHTS=true

# Gemini model to use (must support thinking capability)
GEMINI_FLASH_MODEL=gemini-2.0-flash-thinking-exp-01-21

# Temperature for thinking generation (0.0-2.0, higher = more creative)
GEMINI_THOUGHTS_TEMPERATURE=1.0
```

**Important**: Only specific Gemini models support Flash Thinking. Ensure you're using a compatible model like `gemini-2.0-flash-thinking-exp-01-21`.

### Cost Control Configuration

```env
# Maximum tokens per generation (includes thoughts + final answer)
COST_CONTROL_MAX_TOKENS=4000

# Maximum tokens for thoughts only (helps control costs)
COST_CONTROL_MAX_THOUGHT_TOKENS=2000
```

These limits help prevent runaway costs from very long chain-of-thought sequences. The system will truncate thoughts if they exceed the specified limits.

### Feature Rollout Procedures

#### Phase 1: Development Testing
```bash
# Enable Flash Thinking in development
export GEMINI_ENABLE_THOUGHTS=true
export GEMINI_FLASH_MODEL=gemini-2.0-flash-thinking-exp-01-21

# Start with conservative token limits
export COST_CONTROL_MAX_TOKENS=2000
export COST_CONTROL_MAX_THOUGHT_TOKENS=1000

# Test basic functionality
pnpm run agent
curl -X POST http://localhost:4001/api/analyze -d '{"tokenSymbol": "BTC"}'
```

#### Phase 2: Staging Validation
```bash
# Monitor token usage and costs
export COST_CONTROL_MAX_TOKENS=4000
export COST_CONTROL_MAX_THOUGHT_TOKENS=2000

# Test streaming endpoints
curl -N http://localhost:4001/stream/analyze?token=BTC

# Validate payment-gated access
curl -X POST http://localhost:4001/api/chain-of-thought \
  -d '{"transactionSignature": "test_signature"}'
```

#### Phase 3: Production Rollout
```bash
# Gradual rollout to premium users
# Start with 10% of premium users
export GEMINI_ENABLE_THOUGHTS=true

# Monitor metrics:
# - Token usage per request
# - Response times
# - Error rates
# - User engagement with chain-of-thought

# Scale up gradually: 25% -> 50% -> 100%
```

### Rollback Strategy

#### Immediate Rollback (Emergency)
```bash
# Instant disable via environment variable
export GEMINI_ENABLE_THOUGHTS=false

# Restart agent (falls back to standard generation)
pm2 restart degen-agent

# Verify rollback
curl http://localhost:4001/api/status
```

#### Graceful Rollback
```bash
# Reduce token limits first
export COST_CONTROL_MAX_TOKENS=1000
export COST_CONTROL_MAX_THOUGHT_TOKENS=500

# Monitor for stability
# If issues persist, disable completely
export GEMINI_ENABLE_THOUGHTS=false
```

#### Rollback Verification
```bash
# Ensure standard generation works
curl -X POST http://localhost:4001/api/analyze \
  -H "Content-Type: application/json" \
  -d '{"tokenSymbol": "ETH", "currentPrice": 3000}'

# Check that premium logs still work
curl http://localhost:4001/api/logs

# Verify payment system still functions
curl -X POST http://localhost:4001/api/verify-payment \
  -d '{"signature": "test_signature"}'
```

### Monitoring Flash Thinking

#### Key Metrics to Track

1. **Token Usage Metrics**
   ```bash
   # Monitor token consumption
   grep "Token usage" /var/log/degen-agent.log | tail -100
   
   # Track cost per request
   grep "Cost:" /var/log/degen-agent.log | tail -50
   ```

2. **Performance Metrics**
   ```bash
   # Response times with thinking enabled
   grep "Response time" /var/log/degen-agent.log
   
   # Streaming latency
   grep "Streaming" /var/log/degen-agent.log
   ```

3. **Error Rates**
   ```bash
   # Gemini API errors
   grep "Gemini error" /var/log/degen-agent.log
   
   # Parsing failures
   grep "Parse error" /var/log/degen-agent.log
   ```

4. **User Engagement**
   ```bash
   # Premium feature usage
   grep "Chain-of-thought access" /var/log/degen-agent.log
   
   # Payment conversions
   grep "Premium upgrade" /var/log/degen-agent.log
   ```

#### Monitoring Dashboard Setup

Create monitoring dashboards for:
- Token usage trends (thoughts vs final answer)
- Cost per analysis request
- Response time distribution
- Error rate by endpoint
- Premium user conversion rates

### Testing Flash Thinking

#### Basic Functionality Tests
```bash
# Test standard analysis (should work with or without thinking)
curl -X POST http://localhost:4001/api/analyze \
  -H "Content-Type: application/json" \
  -d '{"tokenSymbol": "BTC", "currentPrice": 45000}'

# Test with thinking enabled (should include chainOfThought)
curl -X POST http://localhost:4001/api/analyze \
  -H "Content-Type: application/json" \
  -d '{"tokenSymbol": "BTC", "currentPrice": 45000, "includeThoughts": true}'
```

#### Streaming Tests
```bash
# Test Server-Sent Events streaming
curl -N http://localhost:4001/stream/analyze?token=BTC \
  -H "Accept: text/event-stream"

# Test WebSocket streaming (requires wscat)
wscat -c ws://localhost:4001/ws/analyze
# Send: {"tokenSymbol": "BTC", "currentPrice": 45000}
```

#### Premium Feature Tests
```bash
# Test chain-of-thought endpoint (requires valid payment)
curl -X POST http://localhost:4001/api/chain-of-thought \
  -H "Content-Type: application/json" \
  -d '{"transactionSignature": "valid_payment_signature"}'

# Test payment verification
curl -X POST http://localhost:4001/api/verify-payment \
  -H "Content-Type: application/json" \
  -d '{"signature": "test_signature", "amount": 0.05}'
```

#### Load Testing
```bash
# Test concurrent requests
for i in {1..10}; do
  curl -X POST http://localhost:4001/api/analyze \
    -H "Content-Type: application/json" \
    -d '{"tokenSymbol": "BTC"}' &
done
wait

# Monitor memory usage during load
ps aux | grep node
```

### Troubleshooting Flash Thinking

#### Common Issues and Solutions

1. **Model Not Available**
   ```bash
   # Error: Model gemini-2.0-flash-thinking-exp-01-21 not found
   
   # Solution: Check available models
   curl -H "Authorization: Bearer $GEMINI_API_KEY" \
     https://generativelanguage.googleapis.com/v1/models
   
   # Update to available thinking model
   export GEMINI_FLASH_MODEL=gemini-2.0-flash-thinking-exp-01-21
   ```

2. **High Token Usage**
   ```bash
   # Error: Token limit exceeded
   
   # Solution: Reduce token limits
   export COST_CONTROL_MAX_TOKENS=2000
   export COST_CONTROL_MAX_THOUGHT_TOKENS=1000
   
   # Monitor usage
   grep "Token count" /var/log/degen-agent.log
   ```

3. **Streaming Connection Issues**
   ```bash
   # Error: WebSocket connection failed
   
   # Check WebSocket endpoint
   curl -I http://localhost:4001/ws/analyze
   
   # Check SSE endpoint
   curl -I http://localhost:4001/stream/analyze
   
   # Verify CORS settings
   grep "CORS" /var/log/degen-agent.log
   ```

4. **Payment Verification Failures**
   ```bash
   # Error: Invalid payment signature
   
   # Check Solana RPC connection
   curl -X POST -H "Content-Type: application/json" \
     -d '{"jsonrpc":"2.0","id":1,"method":"getHealth"}' \
     $RPC_URL
   
   # Verify wallet configuration
   echo $SERVER_WALLET
   echo $SOLANA_PRIVATE_KEY | wc -c  # Should be ~88 characters
   ```

5. **Encryption/Decryption Issues**
   ```bash
   # Error: Failed to decrypt chain-of-thought
   
   # Check encryption keys
   grep "Encryption" /var/log/degen-agent.log
   
   # Verify key derivation
   curl http://localhost:4001/api/status | jq '.encryption'
   ```

#### Debug Mode

Enable detailed logging for troubleshooting:

```bash
# Set debug environment
export DEBUG=degen-agent:*
export NODE_ENV=development

# Start with verbose logging
pnpm run agent 2>&1 | tee debug.log

# Filter specific components
export DEBUG=degen-agent:gemini,degen-agent:streaming
```

#### Health Checks

Implement comprehensive health checks:

```bash
# Basic health check
curl http://localhost:4001/health

# Detailed status (includes Flash Thinking status)
curl http://localhost:4001/api/status

# Component-specific checks
curl http://localhost:4001/api/status/gemini
curl http://localhost:4001/api/status/payments
curl http://localhost:4001/api/status/streaming
```

## Feature Flag Documentation

### Flash Thinking Feature Flag

The `GEMINI_ENABLE_THOUGHTS` feature flag controls the entire Flash Thinking system:

#### Flag States

| Value | Behavior | Use Case |
|-------|----------|----------|
| `true` | Full Flash Thinking enabled | Production, premium features |
| `false` | Standard generation only | Rollback, cost control |
| unset | Defaults to `false` | Safe default |

#### Flag Dependencies

When `GEMINI_ENABLE_THOUGHTS=true`, these variables become critical:

```env
# Required for Flash Thinking
GEMINI_FLASH_MODEL=gemini-2.0-flash-thinking-exp-01-21
GEMINI_THOUGHTS_TEMPERATURE=1.0
COST_CONTROL_MAX_TOKENS=4000
COST_CONTROL_MAX_THOUGHT_TOKENS=2000
```

#### Runtime Flag Changes

```bash
# Change flag without restart (if supported)
curl -X POST http://localhost:4001/api/admin/config \
  -H "Content-Type: application/json" \
  -d '{"GEMINI_ENABLE_THOUGHTS": "false"}'

# Or restart with new environment
export GEMINI_ENABLE_THOUGHTS=false
pm2 restart degen-agent
```

### Rollout Procedures

#### A/B Testing Setup

```bash
# Route 50% of premium users to Flash Thinking
export GEMINI_ENABLE_THOUGHTS=true
export FLASH_THINKING_ROLLOUT_PERCENT=50

# Monitor metrics for both groups
# - Response times
# - User engagement
# - Cost per request
# - Error rates
```

#### Canary Deployment

```bash
# Phase 1: Internal testing (0% public)
export GEMINI_ENABLE_THOUGHTS=true
export FLASH_THINKING_ROLLOUT_PERCENT=0
export FLASH_THINKING_INTERNAL_ONLY=true

# Phase 2: Limited rollout (10% premium users)
export FLASH_THINKING_ROLLOUT_PERCENT=10
export FLASH_THINKING_INTERNAL_ONLY=false

# Phase 3: Gradual increase (25%, 50%, 100%)
export FLASH_THINKING_ROLLOUT_PERCENT=25
# Monitor, then increase to 50, then 100
```

#### Blue-Green Deployment

```bash
# Green environment (new Flash Thinking)
export GEMINI_ENABLE_THOUGHTS=true
export DEPLOYMENT_COLOR=green

# Blue environment (stable, no Flash Thinking)
export GEMINI_ENABLE_THOUGHTS=false
export DEPLOYMENT_COLOR=blue

# Switch traffic gradually
# Load balancer routes based on user segments
```

### Monitoring and Alerting

#### Key Metrics Dashboard

Create dashboards tracking:

1. **Feature Flag Status**
   - Current flag state
   - Last change timestamp
   - Rollout percentage

2. **Flash Thinking Metrics**
   - Requests with thinking enabled
   - Average thought length
   - Token usage distribution
   - Cost per request

3. **Performance Impact**
   - Response time comparison (with/without thinking)
   - Error rate by feature flag state
   - User engagement metrics

4. **Business Metrics**
   - Premium conversion rate
   - Revenue per user (thinking vs non-thinking)
   - User retention by feature usage

#### Alerting Rules

```bash
# High error rate with Flash Thinking enabled
if error_rate > 5% AND GEMINI_ENABLE_THOUGHTS=true:
  alert: "Consider disabling Flash Thinking"
  action: "Auto-rollback after 10 minutes"

# Excessive token usage
if avg_tokens_per_request > 6000:
  alert: "High token usage detected"
  action: "Review cost control settings"

# Model availability issues
if gemini_api_errors > 10 in 5_minutes:
  alert: "Gemini API issues"
  action: "Fallback to standard generation"
```

### Documentation Standards

#### Environment Variable Documentation

Each Flash Thinking variable should be documented with:

```env
# GEMINI_ENABLE_THOUGHTS
# Description: Enable/disable Flash Thinking chain-of-thought
# Type: boolean (true/false)
# Default: false
# Impact: Enables premium features, increases token usage
# Dependencies: Requires GEMINI_FLASH_MODEL, cost control vars
GEMINI_ENABLE_THOUGHTS=true
```

#### Change Log

Maintain a change log for feature flag modifications:

```markdown
## Flash Thinking Feature Flag Changes

### 2024-01-15
- Enabled Flash Thinking for 25% of premium users
- Monitoring: Response times increased by 15%, engagement up 30%

### 2024-01-10  
- Initial rollout to internal users only
- Baseline metrics established

### 2024-01-05
- Feature flag infrastructure implemented
- Default state: disabled
```

#### Rollback Procedures Documentation

Document clear rollback procedures:

```markdown
## Emergency Rollback Procedure

### Immediate (< 1 minute)
1. `export GEMINI_ENABLE_THOUGHTS=false`
2. `pm2 restart degen-agent`
3. Verify: `curl http://localhost:4001/api/status`

### Gradual (5-10 minutes)
1. Reduce rollout percentage: `FLASH_THINKING_ROLLOUT_PERCENT=10`
2. Monitor metrics for 5 minutes
3. If stable, continue; if not, full disable

### Communication
- Notify team via Slack/Discord
- Update status page if user-facing
- Document incident for post-mortem
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
// Request token analysis (with Flash Thinking)
const response = await fetch('http://localhost:4001/api/analyze', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    tokenSymbol: 'BTC',
    currentPrice: 45000,
    includeThoughts: true  // Request chain-of-thought (premium)
  })
});

// Stream analysis with real-time thinking
const eventSource = new EventSource('http://localhost:4001/stream/analyze?token=BTC');
eventSource.onmessage = (event) => {
  const data = JSON.parse(event.data);
  if (data.type === 'thinking') {
    console.log('Thinking:', data.text);
  } else if (data.type === 'final') {
    console.log('Final answer:', data.text);
  }
};

// WebSocket streaming (alternative)
const ws = new WebSocket('ws://localhost:4001/ws/analyze');
ws.send(JSON.stringify({ tokenSymbol: 'BTC', currentPrice: 45000 }));

// Get chain-of-thought (premium endpoint)
const cotResponse = await fetch('http://localhost:4001/api/chain-of-thought', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    transactionSignature: 'payment_signature_here'
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

# Get chain of thought
curl http://localhost:4001/cot
curl http://localhost:4001/api/chain-of-thought
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