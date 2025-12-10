# Requirements Document

## Introduction

This document outlines the requirements for integrating the prediction market Solana program into the frontend application. The integration will provide TypeScript client functions to interact with the prediction market smart contract, following the same pattern established by the existing stake program integration in `frontend/lib/stake/client.ts`.

## Glossary

- **Prediction_Market_Program**: The Solana smart contract located in `prediction/programs/prediction/src/lib.rs` that handles prediction market operations
- **Frontend_Client**: The TypeScript client library that will be created at `frontend/lib/prediction/client.ts`
- **Market_Account**: A Solana account that stores prediction market data including question, end time, and resolution status
- **Outcome_Tokens**: SPL tokens representing YES or NO positions in a prediction market
- **Collateral_Vault**: A token account that holds the collateral backing the prediction market
- **IDL**: Interface Definition Language file that describes the program's structure and methods
- **PDA**: Program Derived Address used for deterministic account generation

## Requirements

### Requirement 1

**User Story:** As a frontend developer, I want to interact with prediction markets through a TypeScript client, so that I can build user interfaces for prediction market functionality.

#### Acceptance Criteria

1. WHEN the Frontend_Client is imported, THE system SHALL provide access to all prediction market operations
2. WHEN a developer calls client functions, THE system SHALL handle Solana connection and wallet integration automatically
3. WHEN program interactions occur, THE system SHALL use the correct Program_Derived_Addresses for market accounts
4. WHEN errors occur during program calls, THE system SHALL provide meaningful error messages with proper error handling
5. WHEN the client is used, THE system SHALL follow the same architectural patterns as the existing stake client integration

### Requirement 2

**User Story:** As a developer, I want to create new prediction markets, so that users can participate in prediction trading.

#### Acceptance Criteria

1. WHEN a market is initialized, THE Frontend_Client SHALL call the initialize_market instruction with question, end_time, and bump parameters
2. WHEN market creation occurs, THE system SHALL generate the correct PDAs for market, yes_mint, no_mint, and collateral_vault accounts
3. WHEN market initialization completes, THE system SHALL return the transaction signature and market PDA
4. WHEN invalid parameters are provided, THE system SHALL validate inputs and reject creation with appropriate error messages
5. WHEN the market account is created, THE system SHALL ensure proper token mint and vault account initialization

### Requirement 3

**User Story:** As a trader, I want to buy outcome tokens, so that I can take positions in prediction markets.

#### Acceptance Criteria

1. WHEN buying tokens, THE Frontend_Client SHALL call the buy_tokens instruction with amount and outcome parameters
2. WHEN token purchase occurs, THE system SHALL transfer collateral from user to vault and mint outcome tokens to user
3. WHEN the transaction completes, THE system SHALL emit a TokensPurchased event with user, outcome, and amount
4. WHEN invalid amounts are provided, THE system SHALL reject the transaction with validation errors
5. WHEN the market is resolved or ended, THE system SHALL prevent token purchases

### Requirement 4

**User Story:** As a trader, I want to sell outcome tokens, so that I can exit positions before market resolution.

#### Acceptance Criteria

1. WHEN selling tokens, THE Frontend_Client SHALL call the sell_tokens instruction with amount and outcome parameters
2. WHEN token sale occurs, THE system SHALL burn outcome tokens from user and transfer collateral from vault to user
3. WHEN the transaction completes, THE system SHALL emit a TokensSold event with user, outcome, and amount
4. WHEN insufficient token balance exists, THE system SHALL reject the transaction with balance errors
5. WHEN the market is resolved or ended, THE system SHALL prevent token sales

### Requirement 5

**User Story:** As a market authority, I want to resolve prediction markets, so that winners can claim their rewards.

#### Acceptance Criteria

1. WHEN resolving a market, THE Frontend_Client SHALL call the resolve_market instruction with winning_outcome parameter
2. WHEN market resolution occurs, THE system SHALL verify the caller is the market authority and the end_time has passed
3. WHEN resolution completes, THE system SHALL set is_resolved to true and store the winning_outcome
4. WHEN the market is resolved, THE system SHALL emit a MarketResolved event with market and winning_outcome
5. WHEN unauthorized users attempt resolution, THE system SHALL reject with authorization errors

### Requirement 6

**User Story:** As a winning trader, I want to claim winnings, so that I can receive collateral for my winning tokens.

#### Acceptance Criteria

1. WHEN claiming winnings, THE Frontend_Client SHALL call the claim_winnings instruction with amount parameter
2. WHEN winnings are claimed, THE system SHALL burn winning outcome tokens and transfer equivalent collateral to user
3. WHEN the claim completes, THE system SHALL emit a WinningsClaimed event with user and amount
4. WHEN the market is not resolved, THE system SHALL reject claims with resolution status errors
5. WHEN users hold losing tokens, THE system SHALL prevent claims for non-winning outcomes

### Requirement 7

**User Story:** As a developer, I want to fetch market data, so that I can display current market state in the user interface.

#### Acceptance Criteria

1. WHEN fetching market data, THE Frontend_Client SHALL provide functions to retrieve Market_Account information
2. WHEN market queries occur, THE system SHALL return structured data including question, end_time, resolution status, and token supplies
3. WHEN markets don't exist, THE system SHALL return null values gracefully without throwing errors
4. WHEN multiple markets are queried, THE system SHALL provide batch fetching capabilities for efficiency
5. WHEN market data is retrieved, THE system SHALL include all relevant account addresses and metadata

### Requirement 8

**User Story:** As a developer, I want proper TypeScript types, so that I can build type-safe applications with the prediction market client.

#### Acceptance Criteria

1. WHEN using the client, THE system SHALL provide complete TypeScript type definitions for all functions and data structures
2. WHEN working with market data, THE system SHALL export typed interfaces for Market, Outcome, and event structures
3. WHEN calling functions, THE system SHALL enforce parameter types through TypeScript compilation
4. WHEN handling responses, THE system SHALL provide typed return values for all client operations
5. WHEN integrating with IDL, THE system SHALL generate or define types that match the program's account and instruction structures