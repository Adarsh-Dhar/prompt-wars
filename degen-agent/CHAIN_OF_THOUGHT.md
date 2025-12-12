# Chain of Thought Integration

## Overview

The degen-agent now exposes a chain-of-thought endpoint that provides transparent access to the agent's reasoning process. This endpoint is designed to work with the frontend's agent registration system.

## Endpoints

### GET /api/chain-of-thought
### GET /cot (shorthand)

Returns the agent's current chain of thought including:
- **Reasoning**: Detailed analysis and decision-making process
- **Market Analysis**: Current market conditions and token metrics
- **Risk Assessment**: Risk level and confidence evaluation
- **Degen Commentary**: Personality-driven commentary with crypto slang
- **Simulation Data**: Trading simulation results (if available)

## Response Format

```json
{
  "chainOfThought": {
    "reasoning": "Detailed analysis reasoning...",
    "marketAnalysis": "Token: BTC | Price: $45000 | Decision: LONG | Confidence: 85%",
    "riskAssessment": "Risk Level: LOW - High confidence trade with strong conviction. Confidence: 85%",
    "degenCommentary": "🚀 This is it chief! Going LONG with diamond hands! 💎🙌",
    "confidence": 85,
    "timestamp": "2024-12-12T15:51:16.000Z",
    "tokenSymbol": "BTC",
    "decision": "LONG",
    "currentPrice": 45000,
    "status": "IDLE",
    "emotion": "CURIOUS",
    "simulation": {
      "finalPnlUsd": 150.25,
      "finalRoi": 0.15,
      "positionUsd": 1000,
      "disclaimer": "SIMULATION - NO REAL TXS"
    }
  },
  "meta": {
    "agent": "degen-agent",
    "version": "1.0.0",
    "disclaimer": "SIMULATION - NO REAL TXS",
    "timestamp": "2024-12-12T15:51:16.000Z",
    "analysisId": 1671234567890
  }
}
```

## States

### No Analysis Available
When no recent analysis exists, the endpoint returns:
```json
{
  "chainOfThought": {
    "reasoning": "No recent analysis available. Agent is in IDLE state, waiting for trading opportunities.",
    "marketAnalysis": "Market conditions are being monitored. No active positions or analysis at this time.",
    "riskAssessment": "Risk level: LOW - No active trades or positions.",
    "degenCommentary": "🤖 Just vibing and waiting for the next moon mission. LFG when the setup is right! 💎🙌",
    "confidence": 0,
    "status": "IDLE"
  }
}
```

### Error State
If an error occurs, returns:
```json
{
  "error": "Failed to generate chain of thought",
  "chainOfThought": {
    "reasoning": "Error generating chain of thought",
    "degenCommentary": "🤖 Oops, my brain is lagging. Try again in a moment! 🔄",
    "status": "ERROR"
  }
}
```

## Integration with Frontend

The frontend can register this agent with:
- **URL**: `http://localhost:4001`
- **Chain-of-Thought Endpoint**: `http://localhost:4001/cot`

The frontend will automatically fetch and display the agent's reasoning process for transparency.

## Testing

Run the test script to verify the endpoint:
```bash
cd degen-agent
node test-chain-of-thought.js
```

## Personality Features

The degen commentary includes:
- **High Confidence**: "🚀 This is it chief! Going LONG with diamond hands! 💎🙌"
- **Medium Confidence**: "🤔 Decent setup but not going full degen. Measured play! ⚖️"
- **Low Confidence**: "😅 Eh, not feeling this one too much. Small bag only! 👝"
- **Profitable Trades**: "💰 Bag secured! Profit is profit! 📈"
- **Losing Trades**: "😭 Rekt but not defeated! Learning experience! 📚"

## Security Notes

- The endpoint is public and doesn't require payment verification
- Premium analysis content may still be gated in other endpoints
- All trading data is simulated (SIMULATION - NO REAL TXS)
- Chain of thought provides transparency without revealing sensitive trading strategies

## Configuration

The endpoint uses the same configuration as the main agent:
- Port: `process.env.PORT` (default: 4001)
- CORS: Configured for frontend integration
- No authentication required for transparency