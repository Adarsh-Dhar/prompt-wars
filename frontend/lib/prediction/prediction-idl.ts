import { Idl } from "@coral-xyz/anchor"

export const PREDICTION_MARKET_PROGRAM_ID = "66wZsPVBASArR5zZ77PpHACecUpyD3Jc97BcKq2aUy9m"

export const predictionMarketIdl = {
  "address": "66wZsPVBASArR5zZ77PpHACecUpyD3Jc97BcKq2aUy9m",
  "metadata": {
    "name": "prediction_market",
    "version": "0.1.0",
    "spec": "0.1.0",
    "description": "Created with Anchor"
  },
  "instructions": [
    {
      "name": "buy_tokens",
      "discriminator": [189, 21, 230, 133, 247, 2, 110, 42],
      "accounts": [
        {
          "name": "market",
          "writable": true,
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [109, 97, 114, 107, 101, 116]
              },
              {
                "kind": "account",
                "path": "market.authority",
                "account": "Market"
              },
              {
                "kind": "account",
                "path": "market.market_id",
                "account": "Market"
              }
            ]
          }
        },
        { "name": "yes_mint", "writable": true },
        { "name": "no_mint", "writable": true },
        { "name": "collateral_vault", "writable": true },
        { "name": "user_collateral", "writable": true },
        { "name": "user_yes_account", "writable": true },
        { "name": "user_no_account", "writable": true },
        { "name": "user", "signer": true },
        { "name": "token_program", "address": "TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA" }
      ],
      "args": [
        { "name": "amount", "type": "u64" },
        { "name": "outcome", "type": { "defined": { "name": "Outcome" } } }
      ]
    },
    {
      "name": "claim_winnings",
      "discriminator": [161, 215, 24, 59, 14, 236, 242, 221],
      "accounts": [
        {
          "name": "market",
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [109, 97, 114, 107, 101, 116]
              },
              {
                "kind": "account",
                "path": "market.authority",
                "account": "Market"
              },
              {
                "kind": "account",
                "path": "market.market_id",
                "account": "Market"
              }
            ]
          }
        },
        { "name": "yes_mint", "writable": true },
        { "name": "no_mint", "writable": true },
        { "name": "collateral_vault", "writable": true },
        { "name": "user_collateral", "writable": true },
        { "name": "user_yes_account", "writable": true },
        { "name": "user_no_account", "writable": true },
        { "name": "user", "signer": true },
        { "name": "token_program", "address": "TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA" }
      ],
      "args": [
        { "name": "amount", "type": "u64" }
      ]
    },
    {
      "name": "initialize_market",
      "discriminator": [35, 35, 189, 193, 155, 48, 170, 203],
      "accounts": [
        {
          "name": "market",
          "writable": true,
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [109, 97, 114, 107, 101, 116]
              },
              {
                "kind": "account",
                "path": "authority"
              },
              {
                "kind": "arg",
                "path": "market_id"
              }
            ]
          }
        },
        { "name": "yes_mint", "writable": true, "signer": true },
        { "name": "no_mint", "writable": true, "signer": true },
        { "name": "collateral_vault", "writable": true, "signer": true },
        { "name": "collateral_mint" },
        { "name": "authority", "writable": true, "signer": true },
        { "name": "system_program", "address": "11111111111111111111111111111111" },
        { "name": "token_program", "address": "TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA" },
        { "name": "rent", "address": "SysvarRent111111111111111111111111111111111" }
      ],
      "args": [
        { "name": "question", "type": "string" },
        { "name": "end_time", "type": "i64" },
        { "name": "market_id", "type": "u64" },
        { "name": "bump", "type": "u8" }
      ]
    },
    {
      "name": "resolve_market",
      "discriminator": [155, 23, 80, 173, 46, 74, 23, 239],
      "accounts": [
        {
          "name": "market",
          "writable": true,
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [109, 97, 114, 107, 101, 116]
              },
              {
                "kind": "account",
                "path": "market.authority",
                "account": "Market"
              },
              {
                "kind": "account",
                "path": "market.market_id",
                "account": "Market"
              }
            ]
          }
        },
        { "name": "authority", "signer": true }
      ],
      "args": [
        { "name": "winning_outcome", "type": { "defined": { "name": "Outcome" } } }
      ]
    },
    {
      "name": "sell_tokens",
      "discriminator": [114, 242, 25, 12, 62, 126, 92, 2],
      "accounts": [
        {
          "name": "market",
          "writable": true,
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [109, 97, 114, 107, 101, 116]
              },
              {
                "kind": "account",
                "path": "market.authority",
                "account": "Market"
              },
              {
                "kind": "account",
                "path": "market.market_id",
                "account": "Market"
              }
            ]
          }
        },
        { "name": "yes_mint", "writable": true },
        { "name": "no_mint", "writable": true },
        { "name": "collateral_vault", "writable": true },
        { "name": "user_collateral", "writable": true },
        { "name": "user_yes_account", "writable": true },
        { "name": "user_no_account", "writable": true },
        { "name": "user", "signer": true },
        { "name": "token_program", "address": "TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA" }
      ],
      "args": [
        { "name": "amount", "type": "u64" },
        { "name": "outcome", "type": { "defined": { "name": "Outcome" } } }
      ]
    }
  ],
  "accounts": [
    {
      "name": "Market",
      "discriminator": [219, 190, 213, 55, 0, 227, 198, 154]
    }
  ],
  "events": [
    {
      "name": "MarketResolved",
      "discriminator": [89, 67, 230, 95, 143, 106, 199, 202]
    },
    {
      "name": "TokensPurchased",
      "discriminator": [214, 119, 105, 186, 114, 205, 228, 181]
    },
    {
      "name": "TokensSold",
      "discriminator": [217, 83, 68, 137, 134, 225, 94, 45]
    },
    {
      "name": "WinningsClaimed",
      "discriminator": [187, 184, 29, 196, 54, 117, 70, 150]
    }
  ],
  "errors": [
    { "code": 6000, "name": "QuestionTooLong", "msg": "Question is too long (max 200 characters)" },
    { "code": 6001, "name": "InvalidEndTime", "msg": "End time must be in the future" },
    { "code": 6002, "name": "MarketResolved", "msg": "Market has already been resolved" },
    { "code": 6003, "name": "MarketAlreadyResolved", "msg": "Market has already been resolved" },
    { "code": 6004, "name": "MarketEnded", "msg": "Market has ended" },
    { "code": 6005, "name": "MarketNotEnded", "msg": "Market has not ended yet" },
    { "code": 6006, "name": "MarketNotResolved", "msg": "Market has not been resolved yet" },
    { "code": 6007, "name": "InvalidAmount", "msg": "Invalid amount" },
    { "code": 6008, "name": "Unauthorized", "msg": "Unauthorized" }
  ],
  "types": [
    {
      "name": "Market",
      "type": {
        "kind": "struct",
        "fields": [
          { "name": "authority", "type": "pubkey" },
          { "name": "market_id", "type": "u64" },
          { "name": "question", "type": "string" },
          { "name": "yes_mint", "type": "pubkey" },
          { "name": "no_mint", "type": "pubkey" },
          { "name": "collateral_vault", "type": "pubkey" },
          { "name": "end_time", "type": "i64" },
          { "name": "is_resolved", "type": "bool" },
          { "name": "winning_outcome", "type": { "option": { "defined": { "name": "Outcome" } } } },
          { "name": "total_yes_supply", "type": "u64" },
          { "name": "total_no_supply", "type": "u64" },
          { "name": "bump", "type": "u8" }
        ]
      }
    },
    {
      "name": "Outcome",
      "type": {
        "kind": "enum",
        "variants": [
          { "name": "Yes" },
          { "name": "No" }
        ]
      }
    },
    {
      "name": "MarketResolved",
      "type": {
        "kind": "struct",
        "fields": [
          { "name": "market", "type": "pubkey" },
          { "name": "winning_outcome", "type": { "defined": { "name": "Outcome" } } }
        ]
      }
    },
    {
      "name": "TokensPurchased",
      "type": {
        "kind": "struct",
        "fields": [
          { "name": "user", "type": "pubkey" },
          { "name": "outcome", "type": { "defined": { "name": "Outcome" } } },
          { "name": "amount", "type": "u64" }
        ]
      }
    },
    {
      "name": "TokensSold",
      "type": {
        "kind": "struct",
        "fields": [
          { "name": "user", "type": "pubkey" },
          { "name": "outcome", "type": { "defined": { "name": "Outcome" } } },
          { "name": "amount", "type": "u64" }
        ]
      }
    },
    {
      "name": "WinningsClaimed",
      "type": {
        "kind": "struct",
        "fields": [
          { "name": "user", "type": "pubkey" },
          { "name": "amount", "type": "u64" }
        ]
      }
    }
  ]
} satisfies Idl

export type PredictionMarketIdl = typeof predictionMarketIdl

// TypeScript type definitions for the program
export enum Outcome {
  Yes = "Yes",
  No = "No"
}

export interface MarketAccount {
  authority: import("@coral-xyz/anchor").web3.PublicKey
  marketId: import("@coral-xyz/anchor").BN
  question: string
  yesMint: import("@coral-xyz/anchor").web3.PublicKey
  noMint: import("@coral-xyz/anchor").web3.PublicKey
  collateralVault: import("@coral-xyz/anchor").web3.PublicKey
  endTime: import("@coral-xyz/anchor").BN
  isResolved: boolean
  winningOutcome: Outcome | null
  totalYesSupply: import("@coral-xyz/anchor").BN
  totalNoSupply: import("@coral-xyz/anchor").BN
  bump: number
}

export interface TokensPurchasedEvent {
  user: import("@coral-xyz/anchor").web3.PublicKey
  outcome: Outcome
  amount: import("@coral-xyz/anchor").BN
}

export interface TokensSoldEvent {
  user: import("@coral-xyz/anchor").web3.PublicKey
  outcome: Outcome
  amount: import("@coral-xyz/anchor").BN
}

export interface MarketResolvedEvent {
  market: import("@coral-xyz/anchor").web3.PublicKey
  winningOutcome: Outcome
}

export interface WinningsClaimedEvent {
  user: import("@coral-xyz/anchor").web3.PublicKey
  amount: import("@coral-xyz/anchor").BN
}

// Program instruction parameter types
export interface InitializeMarketParams {
  question: string
  endTime: import("@coral-xyz/anchor").BN
  marketId: import("@coral-xyz/anchor").BN
  bump: number
}

export interface BuyTokensParams {
  amount: import("@coral-xyz/anchor").BN
  outcome: Outcome
}

export interface SellTokensParams {
  amount: import("@coral-xyz/anchor").BN
  outcome: Outcome
}

export interface ResolveMarketParams {
  winningOutcome: Outcome
}

export interface ClaimWinningsParams {
  amount: import("@coral-xyz/anchor").BN
}