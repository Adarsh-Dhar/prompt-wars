import { Idl } from "@coral-xyz/anchor"

export const AGENT_REGISTRY_PROGRAM_ID = "CQZEo9zd8QNgT2uUJRn1cdHxc2794xFumQu9ZXL4Syk8"

// Generated IDL from anchor build - matches the deployed program exactly
export const agentRegistryIdl = {
  "address": AGENT_REGISTRY_PROGRAM_ID,
  "metadata": {
    "name": "agent_registry",
    "version": "0.1.0",
    "spec": "0.1.0",
    "description": "Agent registry with staking, proof requests, and slashing."
  },
  "instructions": [
    {
      "name": "initialize_registry",
      "discriminator": [189, 181, 20, 17, 174, 57, 249, 59],
      "accounts": [
        {
          "name": "registry",
          "writable": true,
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [114, 101, 103, 105, 115, 116, 114, 121]
              }
            ]
          }
        },
        {
          "name": "authority",
          "writable": true,
          "signer": true
        },
        {
          "name": "system_program",
          "address": "11111111111111111111111111111111"
        }
      ],
      "args": [
        {
          "name": "bond_lamports",
          "type": "u64"
        },
        {
          "name": "slash_penalty_lamports",
          "type": "u64"
        }
      ]
    },
    {
      "name": "register_agent",
      "discriminator": [135, 157, 66, 195, 2, 113, 175, 30],
      "accounts": [
        {
          "name": "registry",
          "writable": true,
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [114, 101, 103, 105, 115, 116, 114, 121]
              }
            ]
          }
        },
        {
          "name": "agent",
          "writable": true,
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [97, 103, 101, 110, 116]
              },
              {
                "kind": "account",
                "path": "agent_wallet"
              }
            ]
          }
        },
        {
          "name": "agent_wallet"
        },
        {
          "name": "vault",
          "writable": true
        },
        {
          "name": "payer",
          "writable": true,
          "signer": true
        },
        {
          "name": "system_program",
          "address": "11111111111111111111111111111111"
        }
      ],
      "args": [
        {
          "name": "name",
          "type": "string"
        },
        {
          "name": "url",
          "type": "string"
        },
        {
          "name": "tags",
          "type": {
            "vec": "string"
          }
        }
      ]
    }
  ],
  "accounts": [
    {
      "name": "Agent",
      "discriminator": [47, 166, 112, 147, 155, 197, 86, 7]
    },
    {
      "name": "Registry",
      "discriminator": [47, 174, 110, 246, 184, 182, 252, 218]
    }
  ],
  "types": [
    {
      "name": "Agent",
      "type": {
        "kind": "struct",
        "fields": [
          {
            "name": "authority",
            "type": "pubkey"
          },
          {
            "name": "agent_wallet",
            "type": "pubkey"
          },
          {
            "name": "name",
            "type": "string"
          },
          {
            "name": "url",
            "type": "string"
          },
          {
            "name": "tags",
            "type": {
              "vec": "string"
            }
          },
          {
            "name": "bond_lamports",
            "type": "u64"
          },
          {
            "name": "request_count",
            "type": "u64"
          },
          {
            "name": "pending_request",
            "type": {
              "option": "pubkey"
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
      "name": "Registry",
      "type": {
        "kind": "struct",
        "fields": [
          {
            "name": "authority",
            "type": "pubkey"
          },
          {
            "name": "bond_lamports",
            "type": "u64"
          },
          {
            "name": "slash_penalty_lamports",
            "type": "u64"
          },
          {
            "name": "bump",
            "type": "u8"
          }
        ]
      }
    }
  ]
} as any // Use 'as any' to bypass strict IDL typing while maintaining functionality

export type AgentRegistryIdl = typeof agentRegistryIdl