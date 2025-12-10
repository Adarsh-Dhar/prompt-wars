# Design Document

## Overview

This design document outlines the architecture and implementation approach for integrating the prediction market Solana program into the frontend application. The integration will create a TypeScript client library that mirrors the existing stake program integration pattern, providing developers with a clean, type-safe interface to interact with prediction markets.

The client will handle all low-level Solana interactions including PDA generation, account management, transaction construction, and error handling, while exposing high-level functions for market operations.

## Architecture

The prediction market frontend integration follows a layered architecture:

1. **Program Layer**: The existing Rust smart contract (`prediction/programs/prediction/src/lib.rs`)
2. **IDL Layer**: Interface Definition Language file describing program structure
3. **Client Layer**: TypeScript client library (`frontend/lib/prediction/client.ts`)
4. **Application Layer**: Frontend components and pages that consume the client

The client layer abstracts Solana complexities and provides a clean API for the application layer, following the established patterns from the stake integration.

## Components and Interfaces

### Core Client Functions

The client will expose the following primary functions:

- `getProgram(connection, wallet?)`: Creates an Anchor program instance
- `getMarketPda(authority)`: Generates market account PDA
- `initializeMarket(params)`: Creates a new prediction market
- `buyTokens(params)`: Purchases outcome tokens
- `sellTokens(params)`: Sells outcome tokens back
- `resolveMarket(params)`: Resolves market with winning outcome
- `claimWinnings(params)`: Claims winnings for resolved markets
- `fetchMarket(params)`: Retrieves market account data
- `checkProgramDeployed(connection)`: Verifies program deployment

### IDL Integration

The client will require an IDL file that describes:
- Program instructions and their parameters
- Account structures (Market, token accounts)
- Event definitions (TokensPurchased, MarketResolved, etc.)
- Error codes and messages

### Type Definitions

Key TypeScript interfaces:
```typescript
interface MarketAccount {
  authority: PublicKey
  question: string
  yesMint: PublicKey
  noMint: PublicKey
  collateralVault: PublicKey
  endTime: BN
  isResolved: boolean
  winningOutcome: Outcome | null
  totalYesSupply: BN
  totalNoSupply: BN
  bump: number
}

enum Outcome {
  Yes = "Yes",
  No = "No"
}
```

## Data Models

### Market Account Structure
- **authority**: PublicKey of market creator
- **question**: String describing the prediction (max 200 chars)
- **yesMint**: PublicKey of YES outcome token mint
- **noMint**: PublicKey of NO outcome token mint  
- **collateralVault**: PublicKey of collateral token account
- **endTime**: Unix timestamp when market ends
- **isResolved**: Boolean indicating resolution status
- **winningOutcome**: Optional outcome (Yes/No) after resolution
- **totalYesSupply**: Total YES tokens minted
- **totalNoSupply**: Total NO tokens minted
- **bump**: PDA bump seed

### PDA Seeds
- Market PDA: `["market", authority.toBuffer()]`
- Token accounts follow SPL token standards

### Event Structures
Events emitted by the program:
- TokensPurchased: user, outcome, amount
- TokensSold: user, outcome, amount  
- MarketResolved: market, winning_outcome
- WinningsClaimed: user, amount

## Correctness Properties

*A property is a characteristic or behavior that should hold true across all valid executions of a system-essentially, a formal statement about what the system should do. Properties serve as the bridge between human-readable specifications and machine-verifiable correctness guarantees.*

Based on the prework analysis, I'll focus on the most critical properties that provide unique validation value:

Property 1: PDA generation consistency
*For any* authority public key, generating market PDAs multiple times should always produce the same addresses
**Validates: Requirements 1.3, 2.2**

Property 2: Market initialization completeness
*For any* valid market parameters, successful initialization should create all required accounts (market, yes_mint, no_mint, collateral_vault) with correct properties
**Validates: Requirements 2.1, 2.3, 2.5**

Property 3: Token purchase balance consistency
*For any* valid token purchase, the collateral should decrease from user account by the purchase amount and increase in vault by the same amount, while outcome tokens should be minted to user
**Validates: Requirements 3.2, 3.3**

Property 4: Token sale balance consistency  
*For any* valid token sale, the outcome tokens should be burned from user account by the sale amount and collateral should transfer from vault to user by the same amount
**Validates: Requirements 4.2, 4.3**

Property 5: Market state validation
*For any* market operation (buy/sell tokens), the operation should be rejected if the market is resolved or past end time
**Validates: Requirements 3.5, 4.5**

Property 6: Resolution authorization
*For any* market resolution attempt, only the market authority should be able to resolve the market, and only after end time has passed
**Validates: Requirements 5.2, 5.5**

Property 7: Winning claims validation
*For any* claim attempt, users should only be able to claim winnings if they hold tokens of the winning outcome and the market is resolved
**Validates: Requirements 6.2, 6.4, 6.5**

Property 8: Market data completeness
*For any* existing market, fetching market data should return all required fields (question, end_time, resolution status, token supplies, account addresses)
**Validates: Requirements 7.2, 7.5**

Property 9: Non-existent market handling
*For any* query for a non-existent market, the system should return null without throwing errors
**Validates: Requirements 7.3**

Property 10: Input validation consistency
*For any* invalid input parameters (negative amounts, empty questions, past end times), the system should reject operations with appropriate error messages
**Validates: Requirements 2.4, 3.4, 4.4**

## Error Handling

The client will implement comprehensive error handling:

1. **Connection Errors**: Handle network failures and RPC timeouts gracefully
2. **Wallet Errors**: Validate wallet connection and signing capabilities
3. **Program Errors**: Map Solana program errors to meaningful messages
4. **Validation Errors**: Client-side validation before submitting transactions
5. **Account Errors**: Handle missing or invalid account states

Error types will include:
- `WalletNotConnectedError`: When wallet is required but not available
- `InvalidParameterError`: When function parameters are invalid
- `MarketNotFoundError`: When querying non-existent markets
- `InsufficientBalanceError`: When user lacks required tokens/SOL
- `MarketEndedError`: When attempting operations on ended markets
- `UnauthorizedError`: When user lacks required permissions

## Testing Strategy

### Unit Testing
Unit tests will verify specific functionality:
- PDA generation with known inputs
- Parameter validation edge cases
- Error handling for various failure scenarios
- Type checking and interface compliance
- Integration with mock Solana connections

### Property-Based Testing
Property-based tests will verify universal properties using fast-check library with minimum 100 iterations per test:

- **Balance Conservation**: Token operations preserve total supply invariants
- **State Transitions**: Market state changes follow valid transition rules  
- **Authorization**: Only authorized users can perform restricted operations
- **Data Integrity**: Account data remains consistent across operations
- **Error Boundaries**: Invalid inputs consistently produce appropriate errors

Each property-based test will be tagged with comments referencing the specific correctness property from this design document using the format: `**Feature: prediction-frontend-integration, Property {number}: {property_text}**`

### Integration Testing
Integration tests will verify end-to-end workflows:
- Complete market lifecycle (create → trade → resolve → claim)
- Multi-user trading scenarios
- Error recovery and retry mechanisms
- Real Solana devnet interactions

The testing approach ensures both concrete examples work correctly (unit tests) and general correctness holds across all inputs (property tests), providing comprehensive coverage of the prediction market client functionality.