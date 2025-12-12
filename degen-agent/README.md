# RektOrRich Degen Agent

AI-powered crypto prediction market agent with payment-gated insights. This agent integrates with the frontend prediction market system to provide trading analysis and create prediction markets.

## Features

- 🤖 AI-powered token analysis using Google Gemini
- 💰 Payment-gated premium insights (HTTP 402)
- 📊 Automatic prediction market creation
- 🔗 Integration with frontend prediction market system
- 💎 Degen personality with crypto slang
- 🔄 Real-time WebSocket updates
- 🔐 Solana blockchain payment verification
- 📈 **Trading Simulator** - Realistic position simulation with PnL tracking (**SIMULATION - NO REAL TXS**)

## Architecture

The degen-agent consists of two main components:

1. **Backend Server** (`agent-server.js`) - Express.js server that handles:
   - AI analysis generation
   - Payment verification
   - API endpoints for frontend integration
   - WebSocket communication

2. **Frontend Integration** (`src/lib/frontend-integration.ts`) - Utilities for:
   - Agent registration with the main frontend
   - Prediction market creation
   - Real-time updates and notifications

## Setup

### 1. Install Dependencies

```bash
pnpm install
```

### 2. Environment Configuration

Copy the example environment file and configure it:

```bash
cp .env.example .env
```

Edit `.env` with your configuration:

```env
# AI Configuration
GEMINI_API_KEY=your_gemini_api_key_here

# Solana Configuration
RPC_URL=https://api.devnet.solana.com
SOLANA_PRIVATE_KEY=your_base58_private_key_here
SERVER_WALLET=your_receiving_wallet_address_here

# Pricing Configuration (in SOL)
PRICE_SOL=0.001
PEEK_PRICE=0.05
GOD_MODE_PRICE=1.0

# Server Configuration
PORT=4001
FRONTEND_URL=http://localhost:3000
AGENT_SERVER_URL=http://localhost:4001

# Integration with Frontend
PREDICTION_MARKET_PROGRAM_ID=your_program_id_here
AGENT_REGISTRY_PROGRAM_ID=your_registry_program_id_here
```

### 3. Get Required API Keys

1. **Google Gemini API Key**: Get from [Google AI Studio](https://makersuite.google.com/app/apikey)
2. **Solana Wallet**: Generate a keypair for the agent or use an existing one
3. **Receiving Wallet**: Solana wallet address to receive payments

## Running the Agent

### Development Mode

Run both the backend server and frontend (if developing the UI):

```bash
# Start the backend server
pnpm run server

# In another terminal, start the Next.js frontend (optional)
pnpm run dev
```

### Production Mode

```bash
# Build the frontend
pnpm run build

# Start the backend server
pnpm run server

# Start the frontend
pnpm run start
```

### With Auto-restart (Development)

```bash
pnpm run dev:server
```

## Integration with Main Frontend

The degen-agent automatically integrates with the main frontend system at `http://localhost:3000`. It will:

1. Register itself as an available agent
2. Submit trading decisions to the prediction market system
3. Create prediction markets for high-confidence predictions
4. Provide real-time updates via WebSocket

### Agent Registration

The agent registers with the frontend using these details:
- **Name**: RektOrRich Agent
- **Description**: AI-powered crypto prediction market agent with payment-gated insights
- **Tags**: crypto, trading, prediction, degen, ai
- **Server URL**: http://localhost:4001

## API Endpoints

### Public Endpoints

- `GET /api/status` - Get agent status and basic info
- `GET /api/logs` - Get agent logs (premium content requires payment)
- `GET /health` - Health check

### Analysis Endpoints

- `POST /api/analyze` - Request token analysis
  ```json
  {
    "tokenSymbol": "BTC",
    "currentPrice": 45000
  }
  ```

- `GET /api/current-analysis` - Get the latest analysis

- `GET /api/chain-of-thought` or `GET /cot` - Get agent's chain of thought
  ```json
  {
    "chainOfThought": {
      "reasoning": "Detailed analysis reasoning...",
      "marketAnalysis": "Token: BTC | Price: $45000 | Decision: LONG | Confidence: 85%",
      "riskAssessment": "Risk Level: LOW - High confidence trade with strong conviction",
      "degenCommentary": "🚀 This is it chief! Going LONG with diamond hands! 💎🙌",
      "confidence": 85,
      "timestamp": "2024-12-12T15:51:16.000Z",
      "tokenSymbol": "BTC",
      "decision": "LONG",
      "status": "IDLE"
    }
  }
  ```

### Payment-Gated Endpoints

- `POST /api/unlock` - Unlock premium content with payment
  ```json
  {
    "signature": "transaction_signature",
    "analysisId": "analysis_id"
  }
  ```

- `POST /api/god-mode` - God Mode injection (high-price feature)
  ```json
  {
    "prompt": "Custom instruction for the agent",
    "signature": "transaction_signature"
  }
  ```

## Trading Simulator

⚠️ **SIMULATION - NO REAL TXS** ⚠️

The degen-agent includes a comprehensive trading simulator that models how a degen trader's capital would evolve based on AI-generated LONG/SHORT decisions. The simulator provides realistic trading conditions without executing actual on-chain transactions.

### Features

- **Realistic Price Data**: Fetches real market data from CoinGecko API with synthetic fallback
- **Price Impact Modeling**: Calculates slippage based on position size and market liquidity
- **Multi-Horizon Analysis**: Tracks PnL across multiple time periods (1min, 5min, 1hr, 1day)
- **Portfolio Management**: Maintains simulated capital and trade history
- **Configurable Parameters**: Adjustable via environment variables
- **Deterministic Testing**: Reproducible results for testing and validation

### Configuration

Add these environment variables to your `.env` file:

```env
# Trading Simulator Configuration
# SIMULATION - NO REAL TXS

# Starting capital for simulated portfolio (USD)
SIM_CAPITAL_USD=100

# Position sizing as percentage of capital (0.1 = 10%, 1.0 = 100%)
SIM_SIZING_PERCENT=0.5

# Price impact coefficient (higher = more impact from large positions)
SIM_IMPACT_COEFF=0.0005

# Trading fee rate (0.001 = 0.1% per side, 0.2% roundtrip)
SIM_FEE_RATE=0.001

# Default market liquidity in USD (affects price impact)
SIM_DEFAULT_LIQUIDITY=20000

# Auto-apply PnL to portfolio capital (true/false)
# WARNING: Keep false for safety - this is just simulation
SIM_AUTO_APPLY_PNL=false
```

### Mathematical Formulas

The simulator implements realistic trading mathematics:

#### Position Sizing
```
positionUsd = capitalUsd × sizingPercent
```

#### Price Impact Model
```
priceImpact = impactCoeff × (positionUsd / marketLiquidityUsd)
entryFillPrice = seedPrice × (1 + sign × priceImpact)
where sign = +1 for LONG, -1 for SHORT
```

#### PnL Calculation
```
fees = positionUsd × feeRate × 2  // roundtrip fees

For LONG positions:
pnlUsd = (effectivePrice / entryFillPrice - 1) × positionUsd - fees

For SHORT positions:
pnlUsd = (entryFillPrice / effectivePrice - 1) × positionUsd - fees

roi = pnlUsd / capitalUsd
```

### API Endpoints

#### Portfolio Management

- `GET /api/portfolio` - Get current portfolio state
  ```json
  {
    "capitalUsd": 100,
    "tradeHistory": [...],
    "createdAt": "2024-01-01T00:00:00.000Z",
    "lastUpdated": "2024-01-01T00:00:00.000Z",
    "meta": {
      "disclaimer": "SIMULATION - NO REAL TXS",
      "totalTrades": 5,
      "timestamp": "2024-01-01T00:00:00.000Z"
    }
  }
  ```

- `GET /api/trades` - Get all trade history
  ```json
  {
    "trades": [
      {
        "id": 1234567890,
        "token": "SOL",
        "decision": "LONG",
        "entryPrice": 100,
        "entryFillPrice": 100.0025,
        "positionUsd": 50,
        "finalPnlUsd": 2.45,
        "finalRoi": 0.049,
        "createdAt": "2024-01-01T00:00:00.000Z"
      }
    ],
    "meta": {
      "disclaimer": "SIMULATION - NO REAL TXS",
      "count": 1
    }
  }
  ```

- `GET /api/trades/:id` - Get specific trade with full simulation data
  ```json
  {
    "id": 1234567890,
    "tokenSymbol": "SOL",
    "decision": "LONG",
    "simulation": {
      "entryPrice": 100,
      "entryFillPrice": 100.0025,
      "positionUsd": 50,
      "snapshots": [
        {
          "horizonSeconds": 60,
          "timestamp": 1704067260000,
          "marketPrice": 102.5,
          "effectivePrice": 102.5025,
          "pnlUsd": 1.24,
          "roi": 0.0248
        }
      ],
      "finalPnlUsd": 2.45,
      "finalRoi": 0.049,
      "meta": {
        "priceSource": "coingecko",
        "impactApplied": 0.0000125,
        "feesApplied": 0.1,
        "disclaimer": "SIMULATION - NO REAL TXS"
      }
    }
  }
  ```

### Integration with Analysis

When you request a trading analysis via `POST /api/analyze`, the response now includes simulation data:

```json
{
  "success": true,
  "analysis": {
    "tokenSymbol": "SOL",
    "decision": "LONG",
    "confidence": 75,
    "publicSummary": "SOL looking bullish...",
    "simulationSummary": {
      "finalPnlUsd": 2.45,
      "finalRoi": 0.049,
      "positionUsd": 50,
      "priceSource": "coingecko",
      "disclaimer": "SIMULATION - NO REAL TXS"
    }
  },
  "meta": {
    "disclaimer": "SIMULATION - NO REAL TXS"
  }
}
```

### Testing the Simulator

Run the simulator tests:

```bash
# Test basic functionality
node sim/test-v2.js

# Test configuration system
node sim/test-config.js

# Run property-based tests
node sim/run-simple-tests.js
```

### Price Data Sources

1. **CoinGecko API** (Primary): Fetches real 24-hour minute-level price data
2. **Synthetic Generation** (Fallback): Uses Geometric Brownian Motion when real data unavailable

### Safety Features

- **Prominent Disclaimers**: All responses include "SIMULATION - NO REAL TXS" warnings
- **No Real Transactions**: Simulator never executes actual blockchain transactions
- **Configurable Limits**: All parameters can be adjusted via environment variables
- **Portfolio Isolation**: Simulated portfolio is separate from any real funds
- **Auto-Apply Disabled**: PnL application to capital is disabled by default

### Limitations

- **Theoretical Results**: Simulations are theoretical and not investment advice
- **Market Conditions**: Real trading involves additional complexities not modeled
- **Slippage Approximation**: Price impact model is simplified
- **No Market Hours**: Simulator doesn't account for market closures or holidays

## Payment System

The agent uses Solana blockchain for payment verification:

- **Peek Price**: 0.05 SOL - Unlock premium analysis content
- **God Mode**: 1.0 SOL - Inject custom prompts to influence agent behavior

Payments are verified by checking Solana transaction signatures and ensuring the correct amount was transferred.

## Testing

Run the test suite:

```bash
# Run all tests
pnpm test

# Run tests in watch mode
pnpm run test:watch

# Run specific test files
pnpm test test-payment-verification.ts
pnpm test test-http-402.ts
pnpm test test-degen-personality.ts
```

## Agent Personality

The RektOrRich agent has a distinct degen personality:

- Uses crypto slang ("LFG", "diamond hands", "sending it", "bag secured")
- Confident but acknowledges risks
- Reacts emotionally to market conditions
- Provides both entertainment and analysis value

## Monitoring

Monitor the agent through:

1. **Console Logs**: Real-time activity and errors
2. **Status Endpoint**: Current agent state and statistics
3. **Frontend Dashboard**: Visual monitoring through the main frontend
4. **Health Check**: Simple endpoint for uptime monitoring

## Troubleshooting

### Common Issues

1. **Agent not connecting to frontend**:
   - Check `FRONTEND_URL` in `.env`
   - Ensure frontend is running on the specified port
   - Verify network connectivity

2. **Payment verification failing**:
   - Check `RPC_URL` is accessible
   - Verify `SERVER_WALLET` address is correct
   - Ensure sufficient SOL for transaction fees

3. **AI analysis not working**:
   - Verify `GEMINI_API_KEY` is valid
   - Check API quota and rate limits
   - Review console logs for specific errors

### Logs and Debugging

Enable verbose logging by setting:
```env
DEBUG=degen-agent:*
```

## Integration Points

The degen-agent integrates with:

1. **Frontend Prediction Market System** - Creates and manages prediction markets
2. **Agent Registry** - Registers as an available agent
3. **Payment System** - Verifies Solana transactions
4. **WebSocket System** - Provides real-time updates

## Development

### Project Structure

```
degen-agent/
├── agent-server.js              # Main backend server
├── startup.js                   # Integration initialization
├── src/
│   ├── lib/
│   │   ├── frontend-integration.ts  # Frontend integration utilities
│   │   ├── content-encryption.ts    # Content encryption for premium features
│   │   ├── payment-verification.ts  # Payment verification logic
│   │   └── ...                      # Other utility modules
│   ├── types/                       # TypeScript type definitions
│   └── __tests__/                   # Test files
├── package.json                     # Dependencies and scripts
└── README.md                        # This file
```

### Adding New Features

1. Add new API endpoints in `agent-server.js`
2. Update integration logic in `src/lib/frontend-integration.ts`
3. Add tests in `src/__tests__/`
4. Update this README with new functionality

## License

This project is part of the RektOrRich prediction market system.
