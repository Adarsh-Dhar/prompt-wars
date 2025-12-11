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
