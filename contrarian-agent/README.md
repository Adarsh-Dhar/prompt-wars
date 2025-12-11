# Contrarian Agent

An AI-powered counter-trading bot that implements contrarian investment strategies by opposing market sentiment. Embodies the "Inverse Cramer" meme philosophy with a smug, arrogant personality.

## 🎯 Core Concept

The Contrarian Agent actively hates the majority opinion:
- **Market Greedy** → Agent goes SHORT
- **Market Fearful** → Agent goes BUY
- **Extreme Conditions** → Maximum contrarian opportunity

## 🧠 How It Works

### The Game Loop

1. **Fetch Real Data**: Gets Fear & Greed Index from api.alternative.me
2. **Analyze Sentiment**: Retrieves community sentiment from CoinGecko API  
3. **Generate Signal**: 
   - Fear & Greed > 60 → SELL signal
   - Fear & Greed ≤ 60 → BUY signal
4. **Smug Reasoning**: Pay 0.001 SOL to unlock the full contrarian rant
5. **Prediction Market**: Users bet on agent's timing:
   - **Knife Catcher**: Agent buying/selling too early (Rekt)
   - **Alpha God**: Agent timing the bottom/top perfectly (Rich)

### Agent Personality ("The Smug Contrarian")

- **Tone**: Arrogant, superior, cynical
- **Calls everyone**: "Sheep", "Retail", "Weak hands"
- **Key Phrases**: 
  - "Inverse the herd"
  - "Liquidity exit" 
  - "Max pain for retail"
  - "Thanks for the cheap coins"
- **Extreme Conditions**: When Fear/Greed > 80, maximum smugness activated

## 🚀 Quick Start

### Prerequisites

- Node.js 18+
- Solana CLI tools
- API keys (Gemini AI, optional CoinGecko)

### Installation

```bash
# Clone and install
git clone <repo>
cd contrarian-agent
npm install

# Setup environment
cp .env.example .env
# Edit .env with your API keys and wallet

# Validate setup
npm run validate

# Run tests
npm test

# Start the agent
npm run server
```

### Environment Setup

```bash
# Required API Keys
GEMINI_API_KEY=your_gemini_api_key
COINGECKO_API_KEY=your_coingecko_key  # Optional but recommended

# Solana Configuration  
RPC_URL=https://api.devnet.solana.com
SOLANA_PRIVATE_KEY=your_base58_private_key
SERVER_WALLET=your_receiving_wallet_address

# Agent Configuration
PORT=4002
PRICE_SOL=0.001  # Price for premium reasoning
FEAR_GREED_SELL_THRESHOLD=60
EXTREME_CONDITION_THRESHOLD=80
```

## 📡 API Endpoints

### Core Endpoints

```bash
# Get agent status and performance
GET /api/status

# Generate contrarian analysis
POST /api/analyze
{
  "tokenSymbol": "BTC"
}

# Unlock premium reasoning (requires payment)
POST /api/unlock  
{
  "signature": "transaction_signature",
  "analysisId": "signal_id", 
  "walletAddress": "sender_wallet"
}

# Get current market sentiment
GET /api/sentiment?token=BTC

# Get personality response
POST /api/personality
{
  "context": "market conditions"
}
```

### Health & Monitoring

```bash
# Health check
GET /health

# Performance metrics
GET /api/status
```

## 🧪 Testing

The agent includes comprehensive property-based testing with 25+ correctness properties:

```bash
# Run all tests
npm test

# Run specific test suites
npm test -- --testNamePattern="Property"
npm test -- --testNamePattern="Contrarian"

# Run with coverage
npm test -- --coverage
```

### Property-Based Testing

Tests validate universal properties across random inputs:
- **API call consistency** - Fear & Greed Index fetching
- **Contrarian logic** - >60 = SELL, ≤60 = BUY  
- **Payment verification** - x402 protocol compliance
- **Personality consistency** - Smug tone with contrarian phrases
- **Extreme conditions** - Enhanced smugness for extreme markets

## 🏗️ Architecture

### Core Modules

```
src/
├── agents/
│   └── contrarian.ts          # Main agent implementation
├── lib/
│   ├── sentiment-fetcher.ts   # API clients for market data
│   ├── signal-generator.ts    # Contrarian signal logic
│   ├── contrarian-brain.ts    # Personality and reasoning
│   ├── payment-verification.ts # x402 payment system
│   └── market-integration.ts  # Prediction market integration
├── types/
│   └── index.ts              # TypeScript interfaces
└── __tests__/
    └── *.test.ts             # Property-based test suite
```

### Key Components

- **SentimentFetcher**: Fetches Fear & Greed Index and community sentiment
- **SignalGenerator**: Implements contrarian logic with confidence scoring
- **ContrarianBrain**: Generates smug reasoning with personality modes
- **PaymentService**: Handles x402 payments and content encryption
- **MarketIntegration**: Creates prediction markets and tracks performance

## 💰 Payment System

### x402 Protocol

Premium reasoning requires payment verification:

1. **User sends SOL** to agent wallet
2. **Transaction signature** provided in API call
3. **On-chain verification** confirms payment
4. **Content decryption** reveals full contrarian analysis

### Payment Flow

```javascript
// 1. Get preview (free)
const preview = await fetch('/api/analyze', {
  method: 'POST',
  body: JSON.stringify({ tokenSymbol: 'BTC' })
});

// 2. Send payment (0.001 SOL to SERVER_WALLET)
const signature = await sendSolanaTransaction(/* ... */);

// 3. Unlock full reasoning
const fullAnalysis = await fetch('/api/unlock', {
  method: 'POST', 
  body: JSON.stringify({
    signature,
    analysisId: preview.analysis.id,
    walletAddress: userWallet
  })
});
```

## 🎲 Prediction Markets

### Market Creation

For each contrarian signal, the agent creates a prediction market:

- **Question**: "Will this contrarian call be perfect timing or knife catching?"
- **Options**: 
  - Knife Catcher (Rekt) - Agent timing is wrong
  - Alpha God (Rich) - Agent timing is perfect
- **Resolution**: 24 hours based on price action

### Performance Tracking

- **Win Rate**: Percentage of correct contrarian calls
- **Reputation Score**: Starts at 1000, +50 for correct, -25 for wrong
- **Extreme Condition Accuracy**: Performance during high volatility
- **Smugness Level**: Adjusts based on recent performance (1-10 scale)

## 🔧 Configuration

### Contrarian Thresholds

```bash
FEAR_GREED_SELL_THRESHOLD=60        # Above this = SELL signal
EXTREME_CONDITION_THRESHOLD=80      # Above this = extreme conditions  
BULLISH_REINFORCEMENT_THRESHOLD=70  # Community bullish reinforcement
BEARISH_REINFORCEMENT_THRESHOLD=30  # Community bearish reinforcement
```

### Personality Settings

```bash
SMUGNESS_LEVEL=8                    # 1-10 scale of arrogance
PERSONALITY_MODE=SMUG               # SMUG, SUPERIOR, or CYNICAL
CACHE_REFRESH_MINUTES=5             # Sentiment data refresh rate
```

## 🚀 Deployment

### Development

```bash
npm run dev:server  # Auto-restart on changes
```

### Production

```bash
# PM2 Process Manager
npm install -g pm2
pm2 start agent-server.js --name contrarian-agent
pm2 save && pm2 startup

# Docker
docker build -t contrarian-agent .
docker run -d -p 4002:4002 --env-file .env contrarian-agent

# Cloud Platforms (Railway, Render, Heroku)
# Set environment variables in platform dashboard
```

See [DEPLOYMENT.md](./DEPLOYMENT.md) for detailed deployment instructions.

## 🔍 Monitoring

### Health Checks

```bash
# Agent health
curl http://localhost:4002/health

# Performance metrics  
curl http://localhost:4002/api/status
```

### Key Metrics

- **Signal Accuracy**: Win rate of contrarian calls
- **Payment Success**: x402 verification rate  
- **API Latency**: External API response times
- **Cache Performance**: Hit rates and refresh cycles
- **Smugness Level**: Current personality intensity

## 🤝 Integration

### Frontend Integration

The agent automatically integrates with the RektOrRich frontend:

- **Agent Registration**: Auto-registers on startup
- **Signal Submission**: Sends contrarian signals to frontend
- **Market Creation**: Creates prediction markets for signals
- **Performance Updates**: Reports win/loss outcomes

### WebSocket Events

Real-time updates sent to frontend:
- `contrarian_signal` - New signal generated
- `market_created` - Prediction market created  
- `performance_update` - Win/loss recorded
- `extreme_conditions` - High volatility detected

## 🐛 Troubleshooting

### Common Issues

1. **Agent won't start**
   ```bash
   npm run validate  # Check setup
   ```

2. **API errors**
   ```bash
   # Test Fear & Greed API
   curl "https://api.alternative.me/fng/"
   ```

3. **Payment verification fails**
   - Check `SERVER_WALLET` address
   - Verify transaction confirmation
   - Ensure sufficient SOL balance

4. **Tests failing**
   ```bash
   # Check Jest configuration
   npm test -- --verbose
   ```

### Debug Mode

```bash
DEBUG=contrarian-agent:* npm run server
```

## 📚 Documentation

- [DEPLOYMENT.md](./DEPLOYMENT.md) - Production deployment guide
- [src/types/index.ts](./src/types/index.ts) - TypeScript interfaces
- [.env.example](./.env.example) - Environment configuration template

## 🎯 Example Usage

### Basic Analysis

```bash
# Request contrarian analysis
curl -X POST http://localhost:4002/api/analyze \
  -H "Content-Type: application/json" \
  -d '{"tokenSymbol": "BTC"}'

# Response (preview only)
{
  "success": true,
  "analysis": {
    "signalType": "BUY",
    "confidence": 85,
    "reasoningPreview": "📉 The sheep are panicking again...\n🔒 Pay 0.001 SOL for full contrarian analysis"
  }
}
```

### Premium Unlock

```bash
# After sending 0.001 SOL payment
curl -X POST http://localhost:4002/api/unlock \
  -H "Content-Type: application/json" \
  -d '{
    "signature": "5J7X...",
    "analysisId": "contrarian_1234_abc",
    "walletAddress": "9WzD..."
  }'

# Response (full reasoning)
{
  "success": true,
  "fullReasoning": "🩸 BLOOD IN THE STREETS! EXTREME CONTRARIAN BUY SIGNAL ACTIVATED! 🩸\n\n📊 MARKET ANALYSIS:\n• Fear & Greed Index: 15/100 (Extreme Fear)\n• Market is in EXTREME FEAR territory - classic accumulation phase\n• Retail is panic selling while smart money accumulates...",
  "agentResponse": "Another sheep pays for alpha. Thanks for the SOL! 💰"
}
```

## 🏆 Performance

The Contrarian Agent tracks its performance across multiple dimensions:

- **Overall Win Rate**: 67.3% (example)
- **Extreme Condition Accuracy**: 78.9% 
- **Average Confidence**: 82.1%
- **Current Smugness Level**: 8.7/10
- **Total Contrarian Calls**: 156
- **Reputation Score**: 1,247

---

**"While retail panics, smart money accumulates. Inverse the herd, secure the bag."** 😏

*The Contrarian Agent - Because someone has to be right when everyone else is wrong.*