# Requirements Document

## Introduction

The Degen Trading Simulator is a feature that adds simulated trading capabilities to the degen-agent, allowing it to model how a degen trader's capital would evolve based on AI-generated LONG/SHORT decisions. The simulator uses real or synthetic price data to compute profit and loss (PnL) across multiple time horizons without executing actual on-chain transactions.

## Glossary

- **Trading_Simulator**: The core module that simulates trading positions and computes PnL
- **Degen_Agent**: The AI agent that generates trading analysis and decisions
- **Position_Simulation**: A simulated trading position with entry price, size, and time-based snapshots
- **PnL_Computation**: Profit and loss calculation based on price movements and trading fees
- **Price_Series**: Historical or synthetic price data used for simulation
- **Portfolio_State**: The agent's simulated capital and trade history
- **Impact_Model**: Price impact calculation based on position size and market liquidity

## Requirements

### Requirement 1

**User Story:** As a degen trader, I want the agent to simulate trading positions based on its analysis, so that I can see how the AI's decisions would perform without risking real capital.

#### Acceptance Criteria

1. WHEN the agent generates a LONG or SHORT decision, THE Trading_Simulator SHALL create a simulated position with realistic entry conditions
2. WHEN computing position entry, THE Trading_Simulator SHALL apply price impact based on position size and market liquidity
3. WHEN calculating fees, THE Trading_Simulator SHALL apply roundtrip trading fees to the position
4. WHEN generating snapshots, THE Trading_Simulator SHALL compute PnL at multiple time horizons (60s, 300s, 3600s, 86400s)
5. WHEN returning results, THE Trading_Simulator SHALL provide final PnL and ROI calculations

### Requirement 2

**User Story:** As a user of the degen agent, I want to see realistic price data in simulations, so that the results reflect actual market conditions.

#### Acceptance Criteria

1. WHEN fetching price data, THE Trading_Simulator SHALL attempt to retrieve real price series from CoinGecko API
2. WHEN CoinGecko data is unavailable, THE Trading_Simulator SHALL generate synthetic price series using geometric Brownian motion
3. WHEN mapping token symbols, THE Trading_Simulator SHALL convert symbols to CoinGecko coin IDs (e.g., SOL -> solana)
4. WHEN using synthetic data, THE Trading_Simulator SHALL generate deterministic series for testing purposes
5. WHEN processing timestamps, THE Trading_Simulator SHALL handle millisecond precision consistently

### Requirement 3

**User Story:** As a degen trader, I want to track my simulated portfolio performance over time, so that I can evaluate the agent's trading strategy effectiveness.

#### Acceptance Criteria

1. WHEN initializing portfolio, THE Degen_Agent SHALL create a portfolio with configurable starting capital (default $100)
2. WHEN completing a trade simulation, THE Degen_Agent SHALL record trade summary in portfolio history
3. WHEN storing trade data, THE Degen_Agent SHALL include entry price, fill price, position size, and final PnL
4. WHEN maintaining portfolio state, THE Degen_Agent SHALL preserve capital and trade history in memory
5. WHEN updating capital, THE Degen_Agent SHALL optionally apply realized PnL to portfolio balance

### Requirement 4

**User Story:** As a developer integrating with the degen agent, I want API endpoints to access portfolio and trade data, so that I can build interfaces and analytics.

#### Acceptance Criteria

1. WHEN requesting portfolio data, THE Degen_Agent SHALL provide GET /api/portfolio endpoint returning current capital and trade history
2. WHEN requesting trade list, THE Degen_Agent SHALL provide GET /api/trades endpoint returning all trade summaries
3. WHEN requesting specific trade, THE Degen_Agent SHALL provide GET /api/trades/:id endpoint returning full analysis with simulation snapshots
4. WHEN returning analysis, THE Degen_Agent SHALL include simulation summary in /api/analyze response
5. WHEN providing simulation data, THE Degen_Agent SHALL clearly indicate "SIMULATION - NO REAL TXS" in responses

### Requirement 5

**User Story:** As a system administrator, I want configurable simulation parameters, so that I can adjust the trading model for different scenarios.

#### Acceptance Criteria

1. WHEN configuring capital, THE Trading_Simulator SHALL use SIM_CAPITAL_USD environment variable (default 100)
2. WHEN setting position sizing, THE Trading_Simulator SHALL use SIM_SIZING_PERCENT environment variable (default 0.5)
3. WHEN calculating impact, THE Trading_Simulator SHALL use SIM_IMPACT_COEFF environment variable (default 0.0005)
4. WHEN applying fees, THE Trading_Simulator SHALL use SIM_FEE_RATE environment variable (default 0.001)
5. WHEN modeling liquidity, THE Trading_Simulator SHALL use SIM_DEFAULT_LIQUIDITY environment variable (default 20000)

### Requirement 6

**User Story:** As a developer maintaining the degen agent, I want comprehensive test coverage for the simulator, so that I can ensure correctness and prevent regressions.

#### Acceptance Criteria

1. WHEN testing LONG positions, THE Trading_Simulator SHALL produce deterministic results for fixed input scenarios
2. WHEN testing SHORT positions, THE Trading_Simulator SHALL correctly compute inverse PnL calculations
3. WHEN CoinGecko API fails, THE Trading_Simulator SHALL gracefully fallback to synthetic price generation
4. WHEN running unit tests, THE Trading_Simulator SHALL use deterministic random number generation for reproducible results
5. WHEN validating integration, THE Degen_Agent SHALL correctly attach simulation results to trading analysis

### Requirement 7

**User Story:** As a user of the system, I want clear documentation and safety warnings, so that I understand the simulation nature and limitations.

#### Acceptance Criteria

1. WHEN displaying results, THE Degen_Agent SHALL prominently display "SIMULATION - NO REAL TXS" warnings
2. WHEN documenting features, THE Trading_Simulator SHALL include configuration options and usage examples in README
3. WHEN providing API responses, THE Degen_Agent SHALL include simulation disclaimers in response metadata
4. WHEN explaining behavior, THE Trading_Simulator SHALL document mathematical formulas and assumptions
5. WHEN describing limitations, THE Trading_Simulator SHALL clarify that results are theoretical and not investment advice