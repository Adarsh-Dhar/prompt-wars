import { Idl } from "@coral-xyz/anchor"

export const PREDICTION_MARKET_PROGRAM_ID = "4gLvyjTChD7X1BRv2Q2djtT9yuYqU3f5uK3biu6KKjph"

export const predictionMarketIdl: Idl = {
  "address": "4gLvyjTChD7X1BRv2Q2djtT9yuYqU3f5uK3biu6KKjph",
  "metadata": {
    "name": "prediction_market",
    "version": "0.1.0",
    "spec": "0.1.0",
    "description": "Created with Anchor"
  },
  "instructions": [
    {
      "name": "buy_shares",
      "docs": [
        "Buy YES or NO shares"
      ],
      "discriminator": [40, 239, 138, 154, 8, 37, 106, 108],
      "accounts": [
        {
          "name": "market",
          "writable": true
        },
        {
          "name": "buyer",
          "writable": true,
          "signer": true
        },
        {
          "name": "yes_mint"
        },
        {
          "name": "no_mint"
        },
        {
          "name": "buyer_token_account",
          "writable": true
        },
        {
          "name": "pool_yes_account",
          "writable": true
        },
        {
          "name": "pool_vault",
          "writable": true,
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [112, 111, 111, 108, 95, 118, 97, 117, 108, 116]
              },
              {
                "kind": "account",
                "path": "market"
              }
            ]
          }
        },
        {
          "name": "pool_authority",
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [112, 111, 111, 108, 95, 97, 117, 116, 104, 111, 114, 105, 116, 121]
              },
              {
                "kind": "account",
                "path": "market"
              }
            ]
          }
        },
        {
          "name": "token_program",
          "address": "TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA"
        }
      ],
      "args": [
        {
          "name": "side",
          "type": {
            "defined": {
              "name": "Side"
            }
          }
        },
        {
          "name": "amount",
          "type": "u64"
        }
      ],
      "returns": "u64"
    },
    {
      "name": "initialize_market",
      "docs": [
        "Initialize a new prediction market"
      ],
      "discriminator": [35, 35, 189, 193, 155, 48, 170, 203],
      "accounts": [
        {
          "name": "market",
          "writable": true,
          "signer": true
        },
        {
          "name": "agent"
        },
        {
          "name": "pool_authority"
        },
        {
          "name": "yes_mint",
          "writable": true,
          "signer": true
        },
        {
          "name": "no_mint",
          "writable": true,
          "signer": true
        },
        {
          "name": "pool_yes_account",
          "writable": true,
          "signer": true
        },
        {
          "name": "pool_no_account",
          "writable": true,
          "signer": true
        },
        {
          "name": "pool_vault"
        },
        {
          "name": "authority",
          "writable": true,
          "signer": true
        },
        {
          "name": "token_program",
          "address": "TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA"
        },
        {
          "name": "system_program",
          "address": "11111111111111111111111111111111"
        },
        {
          "name": "rent",
          "address": "SysvarRent111111111111111111111111111111111"
        }
      ],
      "args": [
        {
          "name": "statement",
          "type": "string"
        },
        {
          "name": "closes_at",
          "type": "i64"
        },
        {
          "name": "initial_liquidity",
          "type": "u64"
        },
        {
          "name": "fee_bps",
          "type": "u16"
        }
      ]
    },
    {
      "name": "resolve_market",
      "docs": [
        "Resolve the market with an outcome"
      ],
      "discriminator": [155, 23, 80, 173, 46, 74, 23, 239],
      "accounts": [
        {
          "name": "market",
          "writable": true
        },
        {
          "name": "authority",
          "signer": true
        }
      ],
      "args": [
        {
          "name": "outcome",
          "type": {
            "defined": {
              "name": "MarketOutcome"
            }
          }
        }
      ]
    },
    {
      "name": "sell_shares",
      "docs": [
        "Sell YES or NO shares back to the pool"
      ],
      "discriminator": [184, 164, 169, 16, 231, 158, 199, 196],
      "accounts": [
        {
          "name": "market",
          "writable": true
        },
        {
          "name": "seller",
          "writable": true,
          "signer": true
        },
        {
          "name": "yes_mint"
        },
        {
          "name": "no_mint"
        },
        {
          "name": "seller_token_account",
          "writable": true
        },
        {
          "name": "pool_yes_account",
          "writable": true
        },
        {
          "name": "pool_vault",
          "writable": true,
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [112, 111, 111, 108, 95, 118, 97, 117, 108, 116]
              },
              {
                "kind": "account",
                "path": "market"
              }
            ]
          }
        },
        {
          "name": "pool_authority",
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [112, 111, 111, 108, 95, 97, 117, 116, 104, 111, 114, 105, 116, 121]
              },
              {
                "kind": "account",
                "path": "market"
              }
            ]
          }
        },
        {
          "name": "token_program",
          "address": "TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA"
        }
      ],
      "args": [
        {
          "name": "side",
          "type": {
            "defined": {
              "name": "Side"
            }
          }
        },
        {
          "name": "shares",
          "type": "u64"
        }
      ],
      "returns": "u64"
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
      "name": "MarketCreated",
      "discriminator": [88, 184, 130, 231, 226, 84, 6, 58]
    },
    {
      "name": "MarketResolved",
      "discriminator": [89, 67, 230, 95, 143, 106, 199, 202]
    },
    {
      "name": "SharesBought",
      "discriminator": [240, 98, 69, 10, 253, 234, 226, 65]
    },
    {
      "name": "SharesSold",
      "discriminator": [35, 231, 5, 53, 228, 158, 113, 251]
    }
  ],
  "errors": [
    {
      "code": 6000,
      "name": "MarketNotActive",
      "msg": "Market is not active"
    },
    {
      "code": 6001,
      "name": "MarketAlreadyResolved",
      "msg": "Market already resolved"
    },
    {
      "code": 6002,
      "name": "InsufficientReserves",
      "msg": "Insufficient reserves"
    },
    {
      "code": 6003,
      "name": "InvalidAmount",
      "msg": "Invalid amount"
    },
    {
      "code": 6004,
      "name": "MathOverflow",
      "msg": "Math overflow"
    },
    {
      "code": 6005,
      "name": "InvalidOutcome",
      "msg": "Invalid outcome"
    },
    {
      "code": 6006,
      "name": "UnauthorizedResolution",
      "msg": "Unauthorized to resolve market"
    },
    {
      "code": 6007,
      "name": "StatementTooLong",
      "msg": "Statement too long"
    },
    {
      "code": 6008,
      "name": "InvalidCloseTime",
      "msg": "Invalid close time"
    },
    {
      "code": 6009,
      "name": "InvalidFee",
      "msg": "Invalid fee"
    }
  ],
  "types": [
    {
      "name": "Market",
      "type": {
        "kind": "struct",
        "fields": [
          {
            "name": "authority",
            "type": "pubkey"
          },
          {
            "name": "agent",
            "type": "pubkey"
          },
          {
            "name": "market_id",
            "type": {
              "array": ["u8", 32]
            }
          },
          {
            "name": "statement",
            "type": "string"
          },
          {
            "name": "closes_at",
            "type": "i64"
          },
          {
            "name": "reserve_yes",
            "type": "u64"
          },
          {
            "name": "reserve_no",
            "type": "u64"
          },
          {
            "name": "fee_bps",
            "type": "u16"
          },
          {
            "name": "yes_mint",
            "type": "pubkey"
          },
          {
            "name": "no_mint",
            "type": "pubkey"
          },
          {
            "name": "pool_yes_account",
            "type": "pubkey"
          },
          {
            "name": "pool_no_account",
            "type": "pubkey"
          },
          {
            "name": "pool_vault",
            "type": "pubkey"
          },
          {
            "name": "pool_authority",
            "type": "pubkey"
          },
          {
            "name": "state",
            "type": {
              "defined": {
                "name": "MarketState"
              }
            }
          },
          {
            "name": "outcome",
            "type": {
              "option": {
                "defined": {
                  "name": "MarketOutcome"
                }
              }
            }
          },
          {
            "name": "bump",
            "type": "u8"
          }
        ]
      }
    },
    {
      "name": "MarketCreated",
      "type": {
        "kind": "struct",
        "fields": [
          {
            "name": "market",
            "type": "pubkey"
          },
          {
            "name": "agent",
            "type": "pubkey"
          },
          {
            "name": "statement",
            "type": "string"
          },
          {
            "name": "closes_at",
            "type": "i64"
          },
          {
            "name": "initial_liquidity",
            "type": "u64"
          }
        ]
      }
    },
    {
      "name": "MarketOutcome",
      "type": {
        "kind": "enum",
        "variants": [
          {
            "name": "Yes"
          },
          {
            "name": "No"
          }
        ]
      }
    },
    {
      "name": "MarketResolved",
      "type": {
        "kind": "struct",
        "fields": [
          {
            "name": "market",
            "type": "pubkey"
          },
          {
            "name": "outcome",
            "type": "u8"
          }
        ]
      }
    },
    {
      "name": "MarketState",
      "type": {
        "kind": "enum",
        "variants": [
          {
            "name": "Active"
          },
          {
            "name": "Resolved"
          },
          {
            "name": "Frozen"
          }
        ]
      }
    },
    {
      "name": "SharesBought",
      "type": {
        "kind": "struct",
        "fields": [
          {
            "name": "market",
            "type": "pubkey"
          },
          {
            "name": "buyer",
            "type": "pubkey"
          },
          {
            "name": "side",
            "type": "u8"
          },
          {
            "name": "amount",
            "type": "u64"
          },
          {
            "name": "shares",
            "type": "u64"
          },
          {
            "name": "new_reserve_yes",
            "type": "u64"
          },
          {
            "name": "new_reserve_no",
            "type": "u64"
          }
        ]
      }
    },
    {
      "name": "SharesSold",
      "type": {
        "kind": "struct",
        "fields": [
          {
            "name": "market",
            "type": "pubkey"
          },
          {
            "name": "seller",
            "type": "pubkey"
          },
          {
            "name": "side",
            "type": "u8"
          },
          {
            "name": "shares",
            "type": "u64"
          },
          {
            "name": "sol_out",
            "type": "u64"
          },
          {
            "name": "new_reserve_yes",
            "type": "u64"
          },
          {
            "name": "new_reserve_no",
            "type": "u64"
          }
        ]
      }
    },
    {
      "name": "Side",
      "type": {
        "kind": "enum",
        "variants": [
          {
            "name": "Yes"
          },
          {
            "name": "No"
          }
        ]
      }
    }
  ]
} as Idl
