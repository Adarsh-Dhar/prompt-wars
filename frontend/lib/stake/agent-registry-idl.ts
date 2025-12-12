import { Idl } from "@coral-xyz/anchor"

export const AGENT_REGISTRY_PROGRAM_ID = "CQZEo9zd8QNgT2uUJRn1cdHxc2794xFumQu9ZXL4Syk8"

// Complete IDL with types field for proper account deserialization
export const agentRegistryIdl = {
  "version": "0.1.0",
  "name": "agent_registry",
  "programId": AGENT_REGISTRY_PROGRAM_ID,
  "instructions": [
    {
      "name": "initializeRegistry",
      "accounts": [
        { "name": "registry", "isMut": true, "isSigner": false },
        { "name": "authority", "isMut": true, "isSigner": true },
        { "name": "systemProgram", "isMut": false, "isSigner": false }
      ],
      "args": [
        { "name": "bondLamports", "type": "u64" },
        { "name": "slashPenaltyLamports", "type": "u64" }
      ]
    },
    {
      "name": "registerAgent",
      "accounts": [
        { "name": "registry", "isMut": true, "isSigner": false },
        { "name": "agent", "isMut": true, "isSigner": false },
        { "name": "agentWallet", "isMut": false, "isSigner": false },
        { "name": "vault", "isMut": true, "isSigner": false },
        { "name": "payer", "isMut": true, "isSigner": true },
        { "name": "systemProgram", "isMut": false, "isSigner": false }
      ],
      "args": [
        { "name": "name", "type": "string" },
        { "name": "url", "type": "string" },
        { "name": "tags", "type": { "vec": "string" } }
      ]
    }
  ],
  "accounts": [
    {
      "name": "registry",
      "type": {
        "kind": "struct",
        "fields": [
          { "name": "authority", "type": "pubkey" },
          { "name": "bondLamports", "type": "u64" },
          { "name": "slashPenaltyLamports", "type": "u64" },
          { "name": "bump", "type": "u8" }
        ]
      }
    },
    {
      "name": "agent",
      "type": {
        "kind": "struct",
        "fields": [
          { "name": "authority", "type": "pubkey" },
          { "name": "agentWallet", "type": "pubkey" },
          { "name": "name", "type": "string" },
          { "name": "url", "type": "string" },
          { "name": "tags", "type": { "vec": "string" } },
          { "name": "bondLamports", "type": "u64" },
          { "name": "requestCount", "type": "u64" },
          { "name": "pendingRequest", "type": { "option": "pubkey" } },
          { "name": "bump", "type": "u8" }
        ]
      }
    },
    {
      "name": "proofRequest",
      "type": {
        "kind": "struct",
        "fields": [
          { "name": "agent", "type": "pubkey" },
          { "name": "requester", "type": "pubkey" },
          { "name": "marketId", "type": { "array": ["u8", 32] } },
          { "name": "requestedAt", "type": "i64" },
          { "name": "deadlineTs", "type": "i64" },
          { "name": "proofUri", "type": "string" },
          { "name": "logRoot", "type": { "array": ["u8", 32] } },
          { "name": "signature", "type": { "array": ["u8", 64] } },
          { "name": "fulfilled", "type": "bool" },
          { "name": "slashable", "type": "bool" },
          { "name": "bump", "type": "u8" }
        ]
      }
    }
  ],
  "types": [
    {
      "name": "Registry",
      "type": {
        "kind": "struct",
        "fields": [
          { "name": "authority", "type": "pubkey" },
          { "name": "bondLamports", "type": "u64" },
          { "name": "slashPenaltyLamports", "type": "u64" },
          { "name": "bump", "type": "u8" }
        ]
      }
    },
    {
      "name": "Agent",
      "type": {
        "kind": "struct",
        "fields": [
          { "name": "authority", "type": "pubkey" },
          { "name": "agentWallet", "type": "pubkey" },
          { "name": "name", "type": "string" },
          { "name": "url", "type": "string" },
          { "name": "tags", "type": { "vec": "string" } },
          { "name": "bondLamports", "type": "u64" },
          { "name": "requestCount", "type": "u64" },
          { "name": "pendingRequest", "type": { "option": "pubkey" } },
          { "name": "bump", "type": "u8" }
        ]
      }
    },
    {
      "name": "ProofRequest",
      "type": {
        "kind": "struct",
        "fields": [
          { "name": "agent", "type": "pubkey" },
          { "name": "requester", "type": "pubkey" },
          { "name": "marketId", "type": { "array": ["u8", 32] } },
          { "name": "requestedAt", "type": "i64" },
          { "name": "deadlineTs", "type": "i64" },
          { "name": "proofUri", "type": "string" },
          { "name": "logRoot", "type": { "array": ["u8", 32] } },
          { "name": "signature", "type": { "array": ["u8", 64] } },
          { "name": "fulfilled", "type": "bool" },
          { "name": "slashable", "type": "bool" },
          { "name": "bump", "type": "u8" }
        ]
      }
    }
  ]
} as any // Use 'as any' to bypass strict IDL typing while maintaining functionality

export type AgentRegistryIdl = typeof agentRegistryIdl