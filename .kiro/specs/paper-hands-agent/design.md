# Design Document

## Overview

The PaperHands_Agent is a specialized AI trading agent module designed to exhibit extreme financial anxiety and risk aversion within the RektOrRich Solana dApp ecosystem. This agent serves as an entertaining and educational counterpoint to aggressive trading strategies by demonstrating overly cautious behavior that users can observe, learn from, and bet against through prediction markets.

The system integrates seamlessly with the existing RektOrRich architecture, leveraging established patterns for payment gating, blockchain interactions, and frontend communication while introducing new personality-driven trading logic and technical analysis capabilities.

## Architecture

The PaperHands_Agent follows a modular architecture that integrates with the existing RektOrRich system:

```
┌─────────────────────────────────────────────────────────────┐
│                    Frontend Layer                           │
│  ┌─────────────────┐  ┌─────────────────┐  ┌─────────────┐ │
│  │ Agent Dashboard │  │ Prediction UI   │  │ Payment UI  │ │
│  └─────────────────┘  └─────────────────┘  └─────────────┘ │
└─────────────────────────────────────────────────────────────┘
                              │
┌─────────────────────────────────────────────────────────────┐
│                     API Layer                               │
│  ┌─────────────────┐  ┌─────────────────┐  ┌─────────────┐ │
│  │ Agent Endpoints │  │ Market Endpoints│  │ X402 Gates  │ │
│  └─────────────────┘  └─────────────────┘  └─────────────┘ │
└─────────────────────────────────────────────────────────────┘
                              │
┌─────────────────────────────────────────────────────────────┐
│                   Business Logic Layer                      │
│  ┌─────────────────┐  ┌─────────────────┐  ┌─────────────┐ │
│  │ PaperHands Core │  │ Technical       │  │ Personality │ │
│  │ Agent Engine    │  │ Analysis Engine │  │ Generator   │ │
│  └─────────────────┘  └─────────────────┘  └─────────────┘ │
│  ┌─────────────────┐  ┌─────────────────┐  ┌─────────────┐ │
│  │ Signal Generator│  │ Chain of Thought│  │ Content     │ │
│  │                 │  │ Processor       │  │ Encryption  │ │
│  └─────────────────┘  └─────────────────┘  └─────────────┘ │
└─────────────────────────────────────────────────────────────┘
                              │
┌─────────────────────────────────────────────────────────────┐
│                    Data Layer                               │
│  ┌─────────────────┐  ┌─────────────────┐  ┌─────────────┐ │
│  │ Market Data     │  │ Agent State     │  │ Blockchain  │ │
│  │ Provider        │  │ Storage         │  │ Interface   │ │
│  └─────────────────┘  └─────────────────┘  └─────────────┘ │
└─────────────────────────────────────────────────────────────┘
```

## Components and Interfaces

### Core Agent Engine
The `PaperHandsAgent` class serves as the main orchestrator, implementing the `IAgent` interface from the existing RektOrRich system. It coordinates between technical analysis, personality generation, and signal creation.

**Key Methods:**
- `initialize(tokenSymbol: string)`: Sets up monitoring for a specific token
- `processMarketData(data: MarketData)`: Analyzes incoming price data
- `generateSignal()`: Creates panic sell signals when conditions are met
- `getPersonalityResponse(context: string)`: Generates anxious personality responses

### Technical Analysis Engine
Implements real-time calculation of technical indicators using market data streams.

**Indicators Supported:**
- RSI (Relative Strength Index) with 14-period default
- Bollinger Bands (20-period SMA with 2 standard deviations)
- Simple Moving Averages (multiple timeframes)
- Price change percentage calculations

**Interface:**
```typescript
interface ITechnicalAnalysis {
  calculateRSI(prices: number[], period: number): number;
  calculateBollingerBands(prices: number[], period: number): BollingerBands;
  getCurrentProfit(entryPrice: number, currentPrice: number): number;
  isVolatilityHigh(data: MarketData): boolean;
}
```

### Personality Generator
Creates authentic anxious responses and reasoning chains that reflect the agent's fearful nature.

**Personality Traits:**
- Extreme risk aversion (sells at 0.5-2% profit)
- Fear of volatility (triggered by RSI > 60)
- Defensive language patterns
- PTSD-like responses to market movements

### Signal Generator
Produces structured trading signals with encrypted reasoning content.

**Signal Types:**
- `PANIC_SELL`: Triggered by fear indicators
- `TAKE_PROFIT`: Triggered by minimal profit thresholds
- `STAY_CASH`: Triggered by general market anxiety

### Chain of Thought Processor
Generates detailed reasoning explanations for agent decisions, formatted for X402 payment gating.

### Content Encryption Service
Handles encryption/decryption of reasoning content using the existing X402 middleware patterns.

## Data Models

### AgentState
```typescript
interface AgentState {
  id: string;
  agentType: 'PAPER_HANDS';
  currentToken: string;
  entryPrice: number | null;
  currentPrice: number;
  position: 'LONG' | 'CASH';
  anxietyLevel: number; // 1-10 scale
  lastSignalTime: Date;
  totalPanicSells: number;
  totalCorrectCalls: number;
}
```

### TechnicalIndicators
```typescript
interface TechnicalIndicators {
  rsi: number;
  bollingerBands: {
    upper: number;
    middle: number;
    lower: number;
  };
  currentProfit: number;
  volatilityScore: number;
  priceChange24h: number;
}
```

### PanicSignal
```typescript
interface PanicSignal {
  id: string;
  agentId: string;
  signalType: 'PANIC_SELL' | 'TAKE_PROFIT' | 'STAY_CASH';
  timestamp: Date;
  triggerConditions: {
    rsi?: number;
    profit?: number;
    volatility?: number;
    fearFactor: number;
  };
  encryptedReasoning: string;
  marketPrice: number;
  predictedOutcome: 'PAPER_HANDS' | 'SAVED_BAG';
}
```

### ChainOfThought
```typescript
interface ChainOfThought {
  signalId: string;
  reasoning: string;
  technicalAnalysis: TechnicalIndicators;
  emotionalFactors: string[];
  riskAssessment: string;
  finalDecision: string;
  confidenceLevel: number;
}
```

## Correctness Properties

*A property is a characteristic or behavior that should hold true across all valid executions of a system-essentially, a formal statement about what the system should do. Properties serve as the bridge between human-readable specifications and machine-verifiable correctness guarantees.*

Property 1: Anxious communication consistency
*For any* agent communication context, the generated response should contain at least one anxious phrase from the set ["Too risky", "Secure the bag", "It's a trap", "Cash is king"]
**Validates: Requirements 1.2**

Property 2: Volatility triggers defensive responses
*For any* market volatility scenario, the agent should generate defensive and sweaty personality responses
**Validates: Requirements 1.3**

Property 3: Character consistency across interactions
*For any* user interaction sequence, the agent should maintain nervous and risk-averse behavior throughout all responses
**Validates: Requirements 1.4**

Property 4: RSI calculation accuracy
*For any* price data sequence, the calculated RSI values should match standard RSI formula results within acceptable precision
**Validates: Requirements 2.1**

Property 5: Bollinger Bands calculation correctness
*For any* price data with sufficient history, Bollinger Bands should be calculated using 20-period SMA and 2 standard deviations
**Validates: Requirements 2.2**

Property 6: RSI sell trigger activation
*For any* market data where RSI exceeds 60, the system should flag a sell trigger condition
**Validates: Requirements 2.3**

Property 7: Profit threshold detection
*For any* position with profit between 0.5% and 2%, the system should identify it as a take-profit opportunity
**Validates: Requirements 2.4**

Property 8: Red candle fear registration
*For any* price movement that creates a red candle, the system should register a fear trigger for the agent
**Validates: Requirements 2.5**

Property 9: Signal generation with encryption
*For any* technical indicator trigger condition, a panic sell signal should be generated with properly encrypted reasoning content
**Validates: Requirements 3.1**

Property 10: Payment wall enforcement
*For any* panic sell signal, the detailed reasoning should be inaccessible without payment verification
**Validates: Requirements 3.2, 3.3**

Property 11: Reasoning encryption round-trip
*For any* chain of thought content, encrypting then decrypting after payment verification should return the original reasoning
**Validates: Requirements 3.4**

Property 12: Reasoning content completeness
*For any* generated reasoning, it should include technical indicator values and fear-based justifications
**Validates: Requirements 3.5**

Property 13: Prediction market creation
*For any* panic sell signal, exactly one prediction market should be created with two betting options
**Validates: Requirements 4.1**

Property 14: Betting options presence
*For any* created prediction market, it should contain both "Paper Hands" and "Saved the Bag" options
**Validates: Requirements 4.2, 4.3**

Property 15: Blockchain bet recording
*For any* user bet placement, the wager should be recorded on the Solana blockchain using the prediction market contract
**Validates: Requirements 4.4**

Property 16: Market resolution accuracy
*For any* prediction market resolution, winners should be determined based on actual price movement following the sell signal
**Validates: Requirements 4.5**

Property 17: JSON output format compliance
*For any* trading signal generation, the output should conform to the standardized JSON schema with required fields
**Validates: Requirements 5.1**

Property 18: Panic state data inclusion
*For any* panic state occurrence, the JSON output should include panic level indicators and emotional state data
**Validates: Requirements 5.2**

Property 19: Technical analysis embedding
*For any* technical analysis performed, current indicator values and thresholds should be embedded in the JSON output
**Validates: Requirements 5.3**

Property 20: Encrypted reasoning formatting
*For any* reasoning generation, the chain of thought should be formatted as encrypted content within the JSON response
**Validates: Requirements 5.4**

Property 21: Frontend JSON consumption
*For any* valid JSON output from the agent, the frontend should be able to render agent states, signals, and prediction markets correctly
**Validates: Requirements 5.5**

## Error Handling

### Market Data Errors
- **Connection Failures**: Implement exponential backoff retry logic for market data API failures
- **Invalid Data**: Validate incoming price data for completeness and reasonable ranges
- **Calculation Errors**: Handle edge cases in technical indicator calculations (insufficient data, division by zero)

### Payment System Errors
- **Payment Verification Failures**: Gracefully handle failed payment verifications with clear error messages
- **Encryption/Decryption Errors**: Implement fallback mechanisms for content encryption failures
- **Timeout Handling**: Set appropriate timeouts for payment processing operations

### Blockchain Interaction Errors
- **Transaction Failures**: Retry failed blockchain transactions with exponential backoff
- **Network Congestion**: Handle Solana network congestion with appropriate fee adjustments
- **Contract Errors**: Validate smart contract interactions and handle revert conditions

### Agent State Errors
- **State Corruption**: Implement state validation and recovery mechanisms
- **Concurrent Access**: Handle concurrent access to agent state with proper locking
- **Persistence Failures**: Implement backup and recovery for agent state storage

## Testing Strategy

### Dual Testing Approach
The PaperHands_Agent will employ both unit testing and property-based testing to ensure comprehensive coverage:

**Unit Tests:**
- Verify specific examples of agent personality responses
- Test integration points with existing RektOrRich components
- Validate error handling scenarios and edge cases
- Test specific technical indicator calculations with known inputs

**Property-Based Tests:**
- Verify universal properties across all valid inputs using **fast-check** library
- Each property-based test will run a minimum of 100 iterations
- Tests will be tagged with comments referencing design document properties
- Format: `**Feature: paper-hands-agent, Property {number}: {property_text}**`

**Testing Framework:**
- **Unit Testing**: Jest with TypeScript support
- **Property-Based Testing**: fast-check library for JavaScript/TypeScript
- **Integration Testing**: Supertest for API endpoint testing
- **Blockchain Testing**: Solana test validator for smart contract interactions

**Test Coverage Requirements:**
- Minimum 90% code coverage for core agent logic
- All correctness properties must have corresponding property-based tests
- Critical paths (signal generation, payment gating) require both unit and property tests
- Integration tests for all external system interactions (blockchain, payment, frontend)