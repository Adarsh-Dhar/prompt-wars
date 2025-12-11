# Contrarian Agent Deployment Guide

## Overview

The Contrarian Agent is an AI-powered counter-trading bot that implements contrarian investment strategies by opposing market sentiment. This guide covers deployment, configuration, and integration with the RektOrRich ecosystem.

## Prerequisites

- Node.js 18+ with ES modules support
- Solana CLI tools (for wallet management)
- API keys for external services
- Access to Solana RPC endpoint

## Environment Configuration

### Required Environment Variables

Create a `.env` file based on `.env.example`:

```bash
# AI Configuration
GEMINI_API_KEY=your_gemini_api_key_here

# API Keys for Market Data
COINGECKO_API_KEY=your_coingecko_api_key_here

# Solana Configuration
RPC_URL=https://api.devnet.solana.com
SOLANA_PRIVATE_KEY=your_base58_private_key_here
SERVER_WALLET=your_receiving_wallet_address_here

# Pricing Configuration (in SOL)
PRICE_SOL=0.001

# Server Configuration
PORT=4002
FRONTEND_URL=http://localhost:3000

# Integration with Frontend
PREDICTION_MARKET_PROGRAM_ID=your_program_id_here
AGENT_REGISTRY_PROGRAM_ID=your_registry_program_id_here

# Contrarian Agent Specific Settings
FEAR_GREED_SELL_THRESHOLD=60
EXTREME_CONDITION_THRESHOLD=80
BULLISH_REINFORCEMENT_THRESHOLD=70
BEARISH_REINFORCEMENT_THRESHOLD=30
CACHE_REFRESH_MINUTES=5
```

### API Key Setup

1. **Gemini AI API Key**
   - Visit [Google AI Studio](https://makersuite.google.com/app/apikey)
   - Create a new API key
   - Add to `GEMINI_API_KEY`

2. **CoinGecko API Key** (Optional but recommended)
   - Visit [CoinGecko API](https://www.coingecko.com/en/api)
   - Sign up for a free or paid plan
   - Add to `COINGECKO_API_KEY`

3. **Solana Wallet Setup**
   ```bash
   # Generate new keypair
   solana-keygen new --outfile ~/.config/solana/contrarian-agent.json
   
   # Get the base58 private key
   solana-keygen pubkey ~/.config/solana/contrarian-agent.json
   
   # Convert to base58 for .env
   cat ~/.config/solana/contrarian-agent.json | jq -r '.[0:32] | @base64'
   ```

## Installation

1. **Clone and Install Dependencies**
   ```bash
   cd contrarian-agent
   npm install
   ```

2. **Validate Setup**
   ```bash
   npm run validate
   ```

3. **Run Tests**
   ```bash
   npm test
   ```

## Deployment Options

### Development Deployment

```bash
# Start in development mode
npm run dev:server

# Or start with nodemon for auto-restart
npm run server
```

### Production Deployment

1. **Build and Start**
   ```bash
   # Install production dependencies
   npm ci --only=production
   
   # Start the server
   NODE_ENV=production npm run server
   ```

2. **Process Management with PM2**
   ```bash
   # Install PM2
   npm install -g pm2
   
   # Create ecosystem file
   cat > ecosystem.config.js << EOF
   module.exports = {
     apps: [{
       name: 'contrarian-agent',
       script: 'agent-server.js',
       env: {
         NODE_ENV: 'production',
         PORT: 4002
       },
       instances: 1,
       autorestart: true,
       watch: false,
       max_memory_restart: '1G'
     }]
   }
   EOF
   
   # Start with PM2
   pm2 start ecosystem.config.js
   pm2 save
   pm2 startup
   ```

### Docker Deployment

1. **Create Dockerfile**
   ```dockerfile
   FROM node:18-alpine
   
   WORKDIR /app
   
   # Copy package files
   COPY package*.json ./
   RUN npm ci --only=production
   
   # Copy source code
   COPY . .
   
   # Expose port
   EXPOSE 4002
   
   # Health check
   HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
     CMD curl -f http://localhost:4002/health || exit 1
   
   # Start the application
   CMD ["npm", "run", "server"]
   ```

2. **Build and Run**
   ```bash
   # Build image
   docker build -t contrarian-agent .
   
   # Run container
   docker run -d \
     --name contrarian-agent \
     -p 4002:4002 \
     --env-file .env \
     contrarian-agent
   ```

### Cloud Deployment (Railway/Render/Heroku)

1. **Railway Deployment**
   ```bash
   # Install Railway CLI
   npm install -g @railway/cli
   
   # Login and deploy
   railway login
   railway init
   railway up
   ```

2. **Environment Variables**
   - Set all required environment variables in the platform dashboard
   - Ensure `PORT` is set to the platform's assigned port
   - Configure custom domain if needed

## Integration with RektOrRich Frontend

### Frontend Integration Setup

1. **Register Agent**
   - The agent automatically registers with the frontend on startup
   - Ensure `FRONTEND_URL` points to your frontend instance
   - Verify `AGENT_SERVER_URL` is accessible from the frontend

2. **Prediction Market Integration**
   - Configure `PREDICTION_MARKET_PROGRAM_ID` for Solana program
   - Set up `AGENT_REGISTRY_PROGRAM_ID` for agent registration
   - Ensure wallet has sufficient SOL for transaction fees

3. **WebSocket Integration** (Optional)
   - Real-time updates are sent to the frontend
   - Configure CORS settings for WebSocket connections

### API Endpoints

The agent exposes these endpoints:

- `GET /api/status` - Agent status and performance metrics
- `POST /api/analyze` - Generate contrarian analysis for a token
- `POST /api/unlock` - Unlock premium reasoning with payment
- `GET /api/sentiment` - Get current market sentiment
- `POST /api/personality` - Get personality response
- `POST /api/performance` - Update agent performance
- `GET /health` - Health check endpoint

## Monitoring and Maintenance

### Health Monitoring

1. **Health Check Endpoint**
   ```bash
   curl http://localhost:4002/health
   ```

2. **Agent Status**
   ```bash
   curl http://localhost:4002/api/status
   ```

3. **Performance Metrics**
   - Win rate tracking
   - Signal accuracy
   - Payment verification success rate
   - API response times

### Logging

The agent logs to console with structured format:
- `[CONTRARIAN-AGENT]: message` - General logs
- Payment verification events
- API errors and retries
- Performance updates

### Maintenance Tasks

1. **Cache Cleanup**
   - Automatic cleanup every hour
   - Manual cleanup via agent methods

2. **Payment Log Management**
   - Logs are automatically cleaned after 24 hours
   - Monitor for payment verification issues

3. **Market Data Refresh**
   - Fear & Greed Index updates every 5 minutes
   - Community sentiment cached per token

## Security Considerations

### API Security

1. **Payment Verification**
   - All premium content requires valid Solana transaction
   - Transaction signatures are verified on-chain
   - Prevent double-spending with transaction tracking

2. **Rate Limiting**
   - Implement rate limiting for API endpoints
   - Monitor for abuse patterns

3. **Environment Security**
   - Never commit `.env` files
   - Use secure key management in production
   - Rotate API keys regularly

### Solana Security

1. **Wallet Management**
   - Use dedicated wallet for agent operations
   - Keep private keys secure and encrypted
   - Monitor wallet balance and transactions

2. **Transaction Verification**
   - Verify all payment transactions on-chain
   - Check transaction finality before unlocking content
   - Validate payment amounts and recipients

## Troubleshooting

### Common Issues

1. **Agent Won't Start**
   ```bash
   # Check environment variables
   npm run validate
   
   # Check dependencies
   npm install
   
   # Check port conflicts
   lsof -i :4002
   ```

2. **API Errors**
   ```bash
   # Check API keys
   curl "https://api.alternative.me/fng/"
   
   # Check Solana connection
   solana cluster-version --url $RPC_URL
   ```

3. **Payment Verification Issues**
   - Verify `SERVER_WALLET` address is correct
   - Check transaction confirmation status
   - Ensure sufficient network confirmations

4. **Frontend Integration Issues**
   - Verify `FRONTEND_URL` is accessible
   - Check CORS configuration
   - Confirm agent registration succeeded

### Debug Mode

Enable debug logging:
```bash
DEBUG=contrarian-agent:* npm run server
```

### Performance Issues

1. **Memory Usage**
   - Monitor cache size and cleanup
   - Check for memory leaks in long-running processes

2. **API Response Times**
   - Monitor external API latency
   - Implement request timeouts and retries

## Scaling Considerations

### Horizontal Scaling

- The agent is stateless except for caches
- Multiple instances can run behind a load balancer
- Shared cache layer (Redis) recommended for multiple instances

### Performance Optimization

1. **Caching Strategy**
   - Implement Redis for shared caching
   - Cache API responses appropriately
   - Monitor cache hit rates

2. **Database Integration**
   - Consider persistent storage for performance metrics
   - Store payment logs in database for audit

## Support and Maintenance

### Monitoring Checklist

- [ ] Agent health endpoint responding
- [ ] Payment verification working
- [ ] API response times acceptable
- [ ] Error rates within normal range
- [ ] Cache performance optimal
- [ ] Wallet balance sufficient

### Regular Maintenance

- Weekly: Review performance metrics and error logs
- Monthly: Update dependencies and security patches
- Quarterly: Review and rotate API keys
- As needed: Scale resources based on usage

For additional support, check the agent logs and health endpoints for diagnostic information.