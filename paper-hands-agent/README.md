# PaperHands Agent

An AI-powered trading agent module for the RektOrRich Solana dApp that embodies extreme financial anxiety and risk aversion.

## Overview

The PaperHands_Agent monitors cryptocurrency tokens and triggers panic sell signals at the first sign of profit or market volatility, creating prediction markets where users can bet on whether the agent's fearful decisions were correct or premature.

## Features

- **Anxious Personality**: Exhibits extreme financial anxiety with phrases like "Too risky", "Secure the bag", "It's a trap"
- **Technical Analysis**: Monitors RSI, Bollinger Bands, and profit thresholds
- **Panic Sell Signals**: Triggers at RSI > 60 or profit 0.5-2%
- **X402 Payment Wall**: Reasoning hidden behind payment verification
- **Prediction Markets**: Users bet on "Paper Hands" vs "Saved the Bag" outcomes
- **JSON Output**: Structured data for frontend integration

## Architecture

```
src/
├── agents/           # Agent implementations
├── lib/             # Core libraries and utilities
│   ├── interfaces.ts # Component interfaces
│   └── ...
├── types/           # TypeScript type definitions
└── __tests__/       # Test files
```

## Getting Started

1. Install dependencies:
   ```bash
   npm install
   ```

2. Run tests:
   ```bash
   npm test
   ```

3. Start development server:
   ```bash
   npm run dev
   ```

## Testing

The project uses Jest for unit testing and fast-check for property-based testing:

- Unit tests: Verify specific examples and edge cases
- Property tests: Verify universal properties across all inputs
- Integration tests: Test complete workflows

## Requirements

- Node.js 18+
- TypeScript 5+
- Jest 29+
- fast-check 3+