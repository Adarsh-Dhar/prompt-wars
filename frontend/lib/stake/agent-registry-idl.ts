import { Idl } from "@coral-xyz/anchor"

export const AGENT_REGISTRY_PROGRAM_ID = "CQZEo9zd8QNgT2uUJRn1cdHxc2794xFumQu9ZXL4Syk8"

export const agentRegistryIdl = {
  version: "0.1.0",
  name: "agent_registry",
  instructions: [
    {
      name: "initializeRegistry",
      accounts: [
        { name: "registry", isMut: true, isSigner: false },
        { name: "authority", isMut: true, isSigner: true },
        { name: "systemProgram", isMut: false, isSigner: false },
      ],
      args: [
        { name: "bondLamports", type: "u64" },
        { name: "slashPenaltyLamports", type: "u64" },
      ],
    },
    {
      name: "registerAgent",
      accounts: [
        { name: "registry", isMut: true, isSigner: false },
        { name: "agent", isMut: true, isSigner: false },
        { name: "agentWallet", isMut: false, isSigner: false },
        { name: "vault", isMut: true, isSigner: false },
        { name: "payer", isMut: true, isSigner: true },
        { name: "systemProgram", isMut: false, isSigner: false },
      ],
      args: [
        { name: "name", type: "string" },
        { name: "url", type: "string" },
        { name: "tags", type: { vec: "string" } },
      ],
    },
    {
      name: "updateMetadata",
      accounts: [
        { name: "agent", isMut: true, isSigner: false },
        { name: "authority", isMut: false, isSigner: true },
      ],
      args: [
        { name: "name", type: "string" },
        { name: "url", type: "string" },
        { name: "tags", type: { vec: "string" } },
      ],
    },
    {
      name: "requestProof",
      accounts: [
        { name: "agent", isMut: true, isSigner: false },
        { name: "registry", isMut: false, isSigner: false },
        { name: "proofRequest", isMut: true, isSigner: false },
        { name: "requester", isMut: true, isSigner: true },
        { name: "systemProgram", isMut: false, isSigner: false },
      ],
      args: [
        { name: "marketId", type: { array: ["u8", 32] } },
        { name: "deadlineTs", type: "i64" },
      ],
    },
    {
      name: "submitProof",
      accounts: [
        { name: "agent", isMut: true, isSigner: false },
        { name: "proofRequest", isMut: true, isSigner: false },
        { name: "authority", isMut: false, isSigner: true },
        { name: "systemProgram", isMut: false, isSigner: false },
      ],
      args: [
        { name: "marketId", type: { array: ["u8", 32] } },
        { name: "logRoot", type: { array: ["u8", 32] } },
        { name: "proofUri", type: "string" },
        { name: "signature", type: { array: ["u8", 64] } },
      ],
    },
    {
      name: "slashAgent",
      accounts: [
        { name: "registry", isMut: false, isSigner: false },
        { name: "agent", isMut: true, isSigner: false },
        { name: "proofRequest", isMut: true, isSigner: false },
        { name: "vault", isMut: true, isSigner: false },
        { name: "authority", isMut: true, isSigner: true },
        { name: "systemProgram", isMut: false, isSigner: false },
      ],
      args: [],
    },
    {
      name: "withdrawBond",
      accounts: [
        { name: "agent", isMut: true, isSigner: false },
        { name: "vault", isMut: true, isSigner: false },
        { name: "authority", isMut: true, isSigner: true },
        { name: "systemProgram", isMut: false, isSigner: false },
      ],
      args: [],
    },
  ],
  accounts: [
    {
      name: "registry",
      type: {
        kind: "struct",
        fields: [
          { name: "authority", type: "publicKey" },
          { name: "bondLamports", type: "u64" },
          { name: "slashPenaltyLamports", type: "u64" },
          { name: "bump", type: "u8" },
        ],
      },
    },
    {
      name: "agent",
      type: {
        kind: "struct",
        fields: [
          { name: "authority", type: "publicKey" },
          { name: "agentWallet", type: "publicKey" },
          { name: "name", type: "string" },
          { name: "url", type: "string" },
          { name: "tags", type: { vec: "string" } },
          { name: "bondLamports", type: "u64" },
          { name: "requestCount", type: "u64" },
          { name: "pendingRequest", type: { option: "publicKey" } },
          { name: "bump", type: "u8" },
        ],
      },
    },
    {
      name: "proofRequest",
      type: {
        kind: "struct",
        fields: [
          { name: "agent", type: "publicKey" },
          { name: "requester", type: "publicKey" },
          { name: "marketId", type: { array: ["u8", 32] } },
          { name: "requestedAt", type: "i64" },
          { name: "deadlineTs", type: "i64" },
          { name: "proofUri", type: "string" },
          { name: "logRoot", type: { array: ["u8", 32] } },
          { name: "signature", type: { array: ["u8", 64] } },
          { name: "fulfilled", type: "bool" },
          { name: "slashable", type: "bool" },
          { name: "bump", type: "u8" },
        ],
      },
    },
  ],
  events: [
    {
      name: "RequestProof",
      fields: [
        { name: "agent", type: "publicKey", index: false },
        { name: "marketId", type: { array: ["u8", 32] }, index: false },
        { name: "deadlineTs", type: "i64", index: false },
        { name: "request", type: "publicKey", index: false },
      ],
    },
    {
      name: "ProofSubmitted",
      fields: [
        { name: "agent", type: "publicKey", index: false },
        { name: "marketId", type: { array: ["u8", 32] }, index: false },
        { name: "request", type: "publicKey", index: false },
        { name: "proofUri", type: "string", index: false },
        { name: "logRoot", type: { array: ["u8", 32] }, index: false },
      ],
    },
    {
      name: "AgentSlashed",
      fields: [
        { name: "agent", type: "publicKey", index: false },
        { name: "request", type: "publicKey", index: false },
        { name: "marketId", type: { array: ["u8", 32] }, index: false },
        { name: "penalty", type: "u64", index: false },
      ],
    },
  ],
  errors: [
    { code: 6000, name: "NameTooLong", msg: "Name is too long or empty" },
    { code: 6001, name: "UrlTooLong", msg: "URL is too long or empty" },
    { code: 6002, name: "TooManyTags", msg: "Too many tags" },
    { code: 6003, name: "TagTooLong", msg: "A tag is too long or empty" },
    { code: 6004, name: "Unauthorized", msg: "Only the agent authority may perform this action" },
    { code: 6005, name: "DeadlineInPast", msg: "Deadline must be in the future" },
    { code: 6006, name: "Overflow", msg: "Math overflow" },
    { code: 6007, name: "RequestAlreadyFulfilled", msg: "Request already fulfilled" },
    { code: 6008, name: "InvalidRequest", msg: "Invalid request reference" },
    { code: 6009, name: "NotSlashable", msg: "Request is not slashable" },
    { code: 6010, name: "DeadlineNotReached", msg: "Deadline not reached" },
    { code: 6011, name: "ActiveRequestPresent", msg: "Agent has active requests" },
    { code: 6012, name: "InsufficientVaultBalance", msg: "Vault balance too low" },
    { code: 6013, name: "ProofUriTooLong", msg: "Proof URI too long" },
  ],
} satisfies Idl

export type AgentRegistryIdl = typeof agentRegistryIdl
