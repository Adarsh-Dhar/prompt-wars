# Implementation Plan

- [x] 1. Set up project structure and core interfaces
  - Create contrarian-agent directory with standard structure
  - Set up package.json with required dependencies (express, fast-check, jest)
  - Create TypeScript configuration matching existing agents
  - Define core interfaces in src/types/index.ts
  - _Requirements: 5.1, 5.2_

- [x] 1.1 Write property test for interface compliance
  - **Property 17: Interface pattern compliance**
  - **Validates: Requirements 5.2**

- [x] 2. Implement sentiment data fetching
- [x] 2.1 Create sentiment fetcher module
  - Implement API client for api.alternative.me Fear & Greed Index
  - Implement API client for CoinGecko community sentiment
  - Add request timeout and retry logic with exponential backoff
  - _Requirements: 1.1, 1.2, 1.3, 6.5_

- [x] 2.2 Write property test for API call consistency
  - **Property 1: API call consistency**
  - **Validates: Requirements 1.1**

- [x] 2.3 Write property test for token sentiment retrieval
  - **Property 2: Token sentiment retrieval**
  - **Validates: Requirements 1.2**

- [x] 2.4 Write property test for network error resilience
  - **Property 3: Network error resilience**
  - **Validates: Requirements 1.3**

- [x] 2.5 Write property test for rate limit backoff strategy
  - **Property 25: Rate limit backoff strategy**
  - **Validates: Requirements 6.5**

- [x] 2.6 Implement data validation and caching
  - Add validation for Fear & Greed Index values (0-100 range)
  - Implement 5-minute cache refresh mechanism
  - Add fallback to cached data when APIs are unavailable
  - _Requirements: 1.4, 1.5, 6.4_

- [x] 2.7 Write property test for sentiment data validation
  - **Property 4: Sentiment data validation**
  - **Validates: Requirements 1.4**

- [x] 2.8 Write property test for cache refresh timing
  - **Property 5: Cache refresh timing**
  - **Validates: Requirements 1.5**

- [x] 2.9 Write property test for cached data fallback
  - **Property 24: Cached data fallback**
  - **Validates: Requirements 6.4**

- [x] 3. Implement contrarian signal generation logic
- [x] 3.1 Create signal generator module
  - Implement core contrarian logic (>60 = SELL, ≤60 = BUY)
  - Add sentiment reinforcement logic for extreme conditions
  - Calculate confidence levels based on sentiment alignment
  - _Requirements: 2.1, 2.2, 2.3, 2.4, 6.1, 6.2, 6.3_

- [x] 3.2 Write property test for contrarian sell logic
  - **Property 6: Contrarian sell logic**
  - **Validates: Requirements 2.1**

- [x] 3.3 Write property test for contrarian buy logic
  - **Property 7: Contrarian buy logic**
  - **Validates: Requirements 2.2**

- [x] 3.4 Write property test for bullish sentiment reinforcement
  - **Property 8: Bullish sentiment reinforcement**
  - **Validates: Requirements 2.3**

- [x] 3.5 Write property test for bearish sentiment reinforcement
  - **Property 9: Bearish sentiment reinforcement**
  - **Validates: Requirements 2.4**

- [x] 3.6 Write property test for extreme fear signal intensity
  - **Property 21: Extreme fear signal intensity**
  - **Validates: Requirements 6.1**

- [x] 3.7 Write property test for extreme greed signal intensity
  - **Property 22: Extreme greed signal intensity**
  - **Validates: Requirements 6.2**

- [x] 3.8 Write property test for confidence adjustment in extremes
  - **Property 23: Confidence adjustment in extremes**
  - **Validates: Requirements 6.3**

- [x] 3.9 Implement JSON output formatting
  - Create structured JSON output compatible with frontend
  - Include all required fields for trading signals
  - _Requirements: 2.5_

- [x] 3.10 Write property test for JSON output format consistency
  - **Property 10: JSON output format consistency**
  - **Validates: Requirements 2.5**

- [x] 4. Checkpoint - Ensure all tests pass
  - Ensure all tests pass, ask the user if questions arise.

- [x] 5. Implement contrarian personality and reasoning generation
- [x] 5.1 Create contrarian brain module
  - Implement smug, arrogant personality traits
  - Create phrase bank with contrarian catchphrases ("sheep", "retail", "inverse the herd")
  - Add extreme condition phrase enhancement
  - _Requirements: 3.3, 3.4_

- [x] 5.2 Write property test for personality consistency
  - **Property 13: Personality consistency**
  - **Validates: Requirements 3.3**

- [x] 5.3 Write property test for extreme condition catchphrases
  - **Property 14: Extreme condition catchphrases**
  - **Validates: Requirements 3.4**

- [x] 5.4 Implement reasoning generation
  - Create smug rant generator with market analysis
  - Include contrarian logic explanation
  - Add confidence justification based on sentiment data
  - _Requirements: 3.3, 3.4_

- [x] 6. Implement x402 payment integration
- [x] 6.1 Create payment verification module
  - Integrate with existing x402 payment infrastructure
  - Implement content encryption/decryption
  - Add payment transaction logging
  - _Requirements: 3.1, 3.2, 3.5, 5.5_

- [x] 6.2 Write property test for payment verification requirement
  - **Property 11: Payment verification requirement**
  - **Validates: Requirements 3.1**

- [x] 6.3 Write property test for content decryption after payment
  - **Property 12: Content decryption after payment**
  - **Validates: Requirements 3.2**

- [x] 6.4 Write property test for payment transaction logging
  - **Property 15: Payment transaction logging**
  - **Validates: Requirements 3.5**

- [x] 6.5 Write property test for x402 infrastructure compatibility
  - **Property 20: x402 infrastructure compatibility**
  - **Validates: Requirements 5.5**

- [x] 7. Implement prediction market integration
- [x] 7.1 Create market integration module
  - Integrate with existing RektOrRich prediction infrastructure
  - Create "Knife Catcher" and "Alpha God" betting options
  - Implement agent performance tracking
  - _Requirements: 4.1, 4.2, 4.3, 4.4, 4.5_

- [x] 7.2 Write property test for betting market creation
  - **Property 16: Betting market creation**
  - **Validates: Requirements 4.1**

- [x] 8. Implement main contrarian agent class
- [x] 8.1 Create main agent implementation
  - Implement IAgent interface following existing patterns
  - Integrate all modules (sentiment, signals, personality, payments)
  - Add comprehensive error handling using existing mechanisms
  - _Requirements: 5.2, 5.3, 5.4_

- [x] 8.2 Write property test for frontend protocol compliance
  - **Property 18: Frontend protocol compliance**
  - **Validates: Requirements 5.3**

- [x] 8.3 Write property test for error handling consistency
  - **Property 19: Error handling consistency**
  - **Validates: Requirements 5.4**

- [x] 8.4 Implement agent state management
  - Track smugness level, contrarian calls, and performance metrics
  - Maintain compatibility with existing agent patterns
  - _Requirements: 5.2_

- [x] 9. Create Express server and startup scripts
- [x] 9.1 Implement agent server
  - Create Express server following existing agent patterns
  - Add API endpoints for signal generation and reasoning access
  - Implement x402 middleware integration
  - _Requirements: 5.3, 5.5_

- [x] 9.2 Create startup and validation scripts
  - Implement startup.js for agent initialization
  - Create validate-setup.js for environment verification
  - Add deployment documentation
  - _Requirements: 5.2_

- [ ] 10. Final integration and testing
- [x] 10.1 Write integration tests
  - Test end-to-end signal generation flow
  - Test payment verification and content access
  - Test prediction market creation and betting
  - _Requirements: 4.4, 5.3_

- [x] 10.2 Write unit tests for core functionality
  - Test individual module functionality
  - Test error scenarios and edge cases
  - Test API integration with mocked responses
  - _Requirements: 1.3, 5.4_

- [ ] 11. Final Checkpoint - Ensure all tests pass
  - Ensure all tests pass, ask the user if questions arise.