# Contrarian Agent Design Document

## Overview

The Contrarian Agent is a counter-trading AI bot that implements contrarian investment strategies by opposing market sentiment. It fetches real-time Fear & Greed Index data and community sentiment to generate trading signals that go against the crowd. The agent embodies a smug, arrogant personality that mocks retail traders while providing reasoning through x402 payments. Users can bet on whether the agent's contrarian calls will be profitable through integrated prediction markets.

## Architecture

The Contrarian Agent follows the established agent pattern in the RektOrRich ecosystem with these core components:

```
contrarian-agent/
├── src/
│   ├── agents/
│   │   └── contrarian.ts          # Main agent implementation
│   ├── lib/
│   │   ├── sentiment-fetcher.ts   # API clients for market data
│   │   ├── contrarian-brain.ts    # Decision logic and personality
│   │   ├── signal-generator.ts    # Trading signal generation
│   │   └── frontend-integration.ts # x402 and market integration
│   ├── types/
│   │   └── index.ts              # TypeScript interfaces
│   └── __tests__/
│       └── contrarian.test.ts    # Test suite
├── agent-server.js               # Express server
├── startup.js                   # Initialization script
└── package.json                 # Dependencies
```

## Components and Interfaces

### Core Agent Interface
The Contrarian Agent implements the standard agent interface while adding contrarian-specific functionality:

```typescript
interface IContrarianAgent extends IAgent {
  fetchMarketSentiment(tokenSymbol?: string): Promise<SentimentData>;
  generateContrarianSignal(sentimentData: SentimentData): Promise<ContrarianSignal>;
  generateSmugRant(signal: ContrarianSignal): Promise<string>;
}
```

### Sentiment Fetcher
Handles API calls to external sentiment sources:

```typescript
interface ISentimentFetcher {
  getFearGreedIndex(): Promise<FearGreedData>;
  getCommunitysentiment(tokenSymbol: string): Promise<CommunityData>;
  validateSentimentData(data: any): boolean;
}
```

### Signal Generator
Processes sentiment data into contrarian trading signals:

```typescript
interface ISignalGenerator {
  processContrarianLogic(sentimentData: SentimentData): ContrarianDecision;
  calculateConfidence(fearGreed: number, community: number): number;
  determineExtremeConditions(fearGreed: number): boolean;
}
```

## Data Models

### Sentiment Data
```typescript
interface SentimentData {
  fearGreedIndex: {
    value: number;        // 0-100 scale
    classification: string; // "Extreme Fear", "Fear", "Neutral", "Greed", "Extreme Greed"
    timestamp: Date;
  };
  communityData?: {
    tokenSymbol: string;
    sentiment: number;    // 0-100 scale
    bullishPercentage: number;
    bearishPercentage: number;
    source: 'coingecko' | 'alternative';
  };
}
```

### Contrarian Signal
```typescript
interface ContrarianSignal {
  id: string;
  agentId: string;
  signalType: 'BUY' | 'SELL';
  timestamp: Date;
  confidence: number;   // 0-100
  triggerConditions: {
    fearGreedValue: number;
    communityBullish?: number;
    isExtremeCondition: boolean;
  };
  encryptedReasoning: string;
  marketPrice?: number;
  predictionOptions: {
    knifeChatcher: string;  // "Agent buying too early (Rekt)"
    alphaGod: string;       // "Agent buying the bottom (Rich)"
  };
}
```

### Agent State
```typescript
interface ContrarianAgentState {
  id: string;
  agentType: 'CONTRARIAN';
  currentToken?: string;
  lastSignalTime: Date;
  smugnessLevel: number;  // 1-10 scale
  totalContrarianCalls: number;
  correctCalls: number;
  extremeConditionCalls: number;
  personalityMode: 'SMUG' | 'SUPERIOR' | 'CYNICAL';
}
```

## Correctness Properties

*A property is a characteristic or behavior that should hold true across all valid executions of a system-essentially, a formal statement about what the system should do. Properties serve as the bridge between human-readable specifications and machine-verifiable correctness guarantees.*

<function_calls>
<invoke name="prework">
<parameter name="featureName">contrarian-agent

Property 1: API call consistency
*For any* analysis cycle execution, the system should successfully fetch Fear and Greed Index data from api.alternative.me and return valid data within the expected format
**Validates: Requirements 1.1**

Property 2: Token sentiment retrieval
*For any* valid token symbol, the system should successfully retrieve community sentiment data from CoinGecko API
**Validates: Requirements 1.2**

Property 3: Network error resilience
*For any* network failure scenario, the system should retry failed API requests up to 3 times before failing gracefully
**Validates: Requirements 1.3**

Property 4: Sentiment data validation
*For any* API response, the system should validate that Fear and Greed Index values are within the 0-100 range
**Validates: Requirements 1.4**

Property 5: Cache refresh timing
*For any* cached sentiment data, the system should refresh the data every 5 minutes to maintain accuracy
**Validates: Requirements 1.5**

Property 6: Contrarian sell logic
*For any* Fear and Greed Index value exceeding 60, the agent should generate a SELL trading signal
**Validates: Requirements 2.1**

Property 7: Contrarian buy logic
*For any* Fear and Greed Index value at or below 60, the agent should generate a BUY trading signal
**Validates: Requirements 2.2**

Property 8: Bullish sentiment reinforcement
*For any* community sentiment above 70% bullish, the agent should reinforce SELL signals with higher confidence
**Validates: Requirements 2.3**

Property 9: Bearish sentiment reinforcement
*For any* community sentiment below 30% bullish, the agent should reinforce BUY signals with higher confidence
**Validates: Requirements 2.4**

Property 10: JSON output format consistency
*For any* generated trading signal, the output should conform to the established JSON schema compatible with the frontend
**Validates: Requirements 2.5**

Property 11: Payment verification requirement
*For any* user request for reasoning content, the system should require valid x402 payment verification before revealing content
**Validates: Requirements 3.1**

Property 12: Content decryption after payment
*For any* verified payment, the system should successfully decrypt and display the agent's reasoning content
**Validates: Requirements 3.2**

Property 13: Personality consistency
*For any* generated reasoning text, the content should include arrogant, superior tone with contrarian phrases like "sheep" and "retail"
**Validates: Requirements 3.3**

Property 14: Extreme condition catchphrases
*For any* extreme market condition (Fear/Greed > 80), the agent should include specific contrarian catchphrases in the reasoning
**Validates: Requirements 3.4**

Property 15: Payment transaction logging
*For any* content access event, the system should create audit logs of the payment transaction
**Validates: Requirements 3.5**

Property 16: Betting market creation
*For any* generated trading signal, the system should create exactly two betting options for users
**Validates: Requirements 4.1**

Property 17: Interface pattern compliance
*For any* agent instantiation, the implementation should follow the same interface patterns as existing agents
**Validates: Requirements 5.2**

Property 18: Frontend protocol compliance
*For any* agent communication, the system should use established frontend integration protocols
**Validates: Requirements 5.3**

Property 19: Error handling consistency
*For any* error condition, the system should use existing error handling and logging mechanisms
**Validates: Requirements 5.4**

Property 20: x402 infrastructure compatibility
*For any* agent operation, the system should maintain compatibility with current x402 payment infrastructure
**Validates: Requirements 5.5**

Property 21: Extreme fear signal intensity
*For any* Fear and Greed Index above 80 (extreme fear), the agent should trigger aggressive BUY signals with maximum confidence
**Validates: Requirements 6.1**

Property 22: Extreme greed signal intensity
*For any* Fear and Greed Index above 80 (extreme greed), the agent should trigger aggressive SELL signals with maximum confidence
**Validates: Requirements 6.2**

Property 23: Confidence adjustment in extremes
*For any* extreme market condition detection, the agent should adjust confidence levels and reasoning intensity appropriately
**Validates: Requirements 6.3**

Property 24: Cached data fallback
*For any* scenario where market data is unavailable, the system should use cached data with appropriate staleness warnings
**Validates: Requirements 6.4**

Property 25: Rate limit backoff strategy
*For any* API rate limit encounter, the system should implement exponential backoff retry strategies
**Validates: Requirements 6.5**

## Error Handling

The Contrarian Agent implements comprehensive error handling following established patterns:

### API Error Handling
- Network timeouts: 30-second timeout with exponential backoff
- Rate limiting: Exponential backoff starting at 1 second, max 60 seconds
- Invalid responses: Graceful degradation to cached data
- Authentication errors: Clear error messages with retry mechanisms

### Data Validation Errors
- Invalid Fear/Greed values: Reject and use cached data
- Malformed JSON responses: Log error and retry
- Missing required fields: Use default values where appropriate

### Payment Processing Errors
- Invalid x402 payments: Return 402 status with payment requirements
- Decryption failures: Log error and request new payment
- Transaction verification failures: Clear error messaging

## Testing Strategy

The Contrarian Agent uses a dual testing approach combining unit tests and property-based tests:

### Unit Testing
- API integration tests with mocked responses
- Signal generation logic with specific scenarios
- Payment verification with known transaction data
- Error handling with simulated failure conditions
- Personality text generation with expected phrases

### Property-Based Testing
The system uses **fast-check** for JavaScript/TypeScript property-based testing with minimum 100 iterations per property. Each property-based test includes a comment referencing the design document property:

- **Feature: contrarian-agent, Property 1**: API call consistency across random execution scenarios
- **Feature: contrarian-agent, Property 6**: Contrarian sell logic with random Fear/Greed values > 60
- **Feature: contrarian-agent, Property 7**: Contrarian buy logic with random Fear/Greed values ≤ 60
- **Feature: contrarian-agent, Property 13**: Personality consistency across random reasoning generation
- **Feature: contrarian-agent, Property 21**: Extreme fear signal intensity with random extreme values

### Integration Testing
- End-to-end signal generation and market creation
- x402 payment flow with real transaction simulation
- Frontend integration with actual API responses
- Performance testing under various load conditions

The testing strategy ensures both concrete behavior verification through unit tests and universal correctness guarantees through property-based testing, providing comprehensive coverage of the agent's functionality.