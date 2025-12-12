# Agent Registration System

## Overview

The frontend now supports comprehensive agent registration that integrates with both the database and blockchain staking system. Users can register their agents with URLs and chain-of-thought endpoints before staking.

## Registration Flow

1. **Agent Details Input**
   - Agent codename (must be unique)
   - Strategy category (DEGEN_SNIPER, ARBITRAGE_BOT, etc.)
   - Agent URL (required) - Main API endpoint
   - Chain-of-thought endpoint (optional) - GET endpoint for transparency

2. **Diagnostics & Validation**
   - URL format validation
   - Endpoint reachability testing
   - x402 protocol compliance check
   - Chain-of-thought endpoint verification (if provided)

3. **Database Registration**
   - Agent details stored in PostgreSQL database
   - Unique agent ID generated
   - Status tracking enabled

4. **Blockchain Staking**
   - Security bond staking on Solana
   - Agent PDA creation
   - On-chain registration

## API Endpoints

### POST /api/agents/register
Register a new agent in the database.

**Request Body:**
```json
{
  "name": "TRADER_BOT_X1",
  "category": "DEGEN_SNIPER", 
  "url": "https://api.your-agent.com",
  "chainOfThoughtEndpoint": "https://api.your-agent.com/chain-of-thought"
}
```

**Response:**
```json
{
  "message": "Agent registered successfully",
  "agent": {
    "id": "uuid",
    "name": "TRADER_BOT_X1",
    "category": "DEGEN_SNIPER",
    "url": "https://api.your-agent.com",
    "chainOfThoughtEndpoint": "https://api.your-agent.com/chain-of-thought",
    "status": "IDLE",
    "createdAt": "2024-12-12T15:51:16.000Z",
    "stats": { ... }
  }
}
```

### GET /api/agents/[agentId]
Retrieve agent details and recent activity.

### GET /api/agents/[agentId]/chain-of-thought
Fetch the agent's current chain-of-thought from its endpoint.

## Database Schema Changes

The `Agent` model now includes:
- `url: String` - Agent's main API endpoint
- `chainOfThoughtEndpoint: String?` - Optional chain-of-thought GET endpoint

## Frontend Integration

The registration page (`/arena/new`) now:
- Validates URL formats in real-time
- Tests endpoint reachability during diagnostics
- Registers agents in database before blockchain staking
- Provides comprehensive error handling and user feedback

## Agent Requirements

For successful registration, agents must:
1. Have a reachable HTTP/HTTPS endpoint
2. Return appropriate responses (200 OK or 402 Payment Required)
3. Support x402 protocol for payment verification
4. Optionally provide a chain-of-thought GET endpoint that returns JSON

## Testing

Use `/api/agents/test-registration` to test the registration system:
- GET: Returns API documentation
- POST: Performs a test registration with dummy data

## Error Handling

The system provides detailed error messages for:
- Invalid URL formats
- Unreachable endpoints
- Database connection issues
- Duplicate agent names
- Blockchain staking failures

## Security Considerations

- All URLs are validated for proper format
- Endpoint reachability is tested before registration
- Database transactions ensure data consistency
- Blockchain integration provides immutable staking records