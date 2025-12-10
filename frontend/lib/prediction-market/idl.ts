import { Idl } from "@coral-xyz/anchor"

export const PREDICTION_MARKET_PROGRAM_ID = "FiPoWJW4Rvmk6iqteDQghKCk97sGCb6zhnuAqwhQ314Y"

// IDL converted from Anchor-generated JSON to match TypeScript Idl type
// Note: The JSON IDL has a top-level "address" field, but TypeScript Idl type doesn't support it
// We pass the program ID explicitly to Program constructor instead
export const predictionMarketIdl = {
  version: "0.1.0",
  name: "prediction_market",
  instructions: [
    {
      name: "buy_shares",
      accounts: [
        { name: "market", isMut: true, isSigner: false },
        { name: "buyer", isMut: true, isSigner: true },
        { name: "yes_mint", isMut: false, isSigner: false },
        { name: "no_mint", isMut: false, isSigner: false },
        { name: "buyer_token_account", isMut: true, isSigner: false },
        { name: "pool_yes_account", isMut: false, isSigner: false },
        {
          name: "pool_vault",
          isMut: true,
          isSigner: false,
        },
        {
          name: "pool_authority",
          isMut: false,
          isSigner: false,
        },
        { name: "token_program", isMut: false, isSigner: false },
      ],
      args: [
        { name: "side", type: { defined: "Side" } },
        { name: "amount", type: "u64" },
      ],
      returns: "u64",
    },
    {
      name: "initialize_market",
      accounts: [
        { name: "market", isMut: true, isSigner: true },
        { name: "agent", isMut: false, isSigner: false },
        {
          name: "pool_authority",
          isMut: false,
          isSigner: false,
        },
        { name: "yes_mint", isMut: true, isSigner: true },
        { name: "no_mint", isMut: true, isSigner: true },
        { name: "pool_yes_account", isMut: true, isSigner: true },
        { name: "pool_no_account", isMut: true, isSigner: true },
        {
          name: "pool_vault",
          isMut: true,
          isSigner: false,
          pda: {
            seeds: [
              { kind: "const", value: [112, 111, 111, 108, 95, 118, 97, 117, 108, 116] },
              { kind: "account", path: "market" },
            ],
          },
        },
        { name: "authority", isMut: true, isSigner: true },
        { name: "token_program", isMut: false, isSigner: false },
        { name: "system_program", isMut: false, isSigner: false },
        { name: "rent", isMut: false, isSigner: false },
      ],
      args: [
        { name: "statement", type: "string" },
        { name: "closes_at", type: "i64" },
        { name: "initial_liquidity", type: "u64" },
        { name: "fee_bps", type: "u16" },
      ],
    },
    {
      name: "resolve_market",
      accounts: [
        { name: "market", isMut: true, isSigner: false },
        { name: "authority", isMut: false, isSigner: true },
      ],
      args: [
        { name: "outcome", type: { defined: "MarketOutcome" } },
      ],
    },
    {
      name: "sell_shares",
      accounts: [
        { name: "market", isMut: true, isSigner: false },
        { name: "seller", isMut: true, isSigner: true },
        { name: "yes_mint", isMut: false, isSigner: false },
        { name: "no_mint", isMut: false, isSigner: false },
        { name: "seller_token_account", isMut: true, isSigner: false },
        { name: "pool_yes_account", isMut: false, isSigner: false },
        {
          name: "pool_vault",
          isMut: true,
          isSigner: false,
        },
        {
          name: "pool_authority",
          isMut: false,
          isSigner: false,
        },
        { name: "token_program", isMut: false, isSigner: false },
      ],
      args: [
        { name: "side", type: { defined: "Side" } },
        { name: "shares", type: "u64" },
      ],
      returns: "u64",
    },
  ],
  accounts: [
    {
      name: "Market",
      // Type definition is in types array, not here
      // Anchor expects accounts to reference types, not define them inline
    } as any,
  ],
  events: [
    {
      name: "MarketCreated",
      fields: [
        { name: "market", type: "publicKey", index: false },
        { name: "agent", type: "publicKey", index: false },
        { name: "statement", type: "string", index: false },
        { name: "closes_at", type: "i64", index: false },
        { name: "initial_liquidity", type: "u64", index: false },
      ],
    },
    {
      name: "MarketResolved",
      fields: [
        { name: "market", type: "publicKey", index: false },
        { name: "outcome", type: "u8", index: false },
      ],
    },
    {
      name: "SharesBought",
      fields: [
        { name: "market", type: "publicKey", index: false },
        { name: "buyer", type: "publicKey", index: false },
        { name: "side", type: "u8", index: false },
        { name: "amount", type: "u64", index: false },
        { name: "shares", type: "u64", index: false },
        { name: "new_reserve_yes", type: "u64", index: false },
        { name: "new_reserve_no", type: "u64", index: false },
      ],
    },
    {
      name: "SharesSold",
      fields: [
        { name: "market", type: "publicKey", index: false },
        { name: "seller", type: "publicKey", index: false },
        { name: "side", type: "u8", index: false },
        { name: "shares", type: "u64", index: false },
        { name: "sol_out", type: "u64", index: false },
        { name: "new_reserve_yes", type: "u64", index: false },
        { name: "new_reserve_no", type: "u64", index: false },
      ],
    },
  ],
  errors: [
    { code: 12000, name: "MarketNotActive", msg: "Market is not active" },
    { code: 12001, name: "MarketAlreadyResolved", msg: "Market already resolved" },
    { code: 12002, name: "InsufficientReserves", msg: "Insufficient reserves" },
    { code: 12003, name: "InvalidAmount", msg: "Invalid amount" },
    { code: 12004, name: "MathOverflow", msg: "Math overflow" },
    { code: 12005, name: "InvalidOutcome", msg: "Invalid outcome" },
    { code: 12006, name: "UnauthorizedResolution", msg: "Unauthorized to resolve market" },
    { code: 12007, name: "StatementTooLong", msg: "Statement too long" },
    { code: 12008, name: "InvalidCloseTime", msg: "Invalid close time" },
    { code: 12009, name: "InvalidFee", msg: "Invalid fee" },
  ],
  types: [
    {
      name: "Market",
      type: {
        kind: "struct",
        fields: [
          { name: "authority", type: "publicKey" as any },
          { name: "agent", type: "publicKey" as any },
          { name: "market_id", type: { array: ["u8", 32] } },
          { name: "statement", type: "string" },
          { name: "closes_at", type: "i64" },
          { name: "reserve_yes", type: "u64" },
          { name: "reserve_no", type: "u64" },
          { name: "fee_bps", type: "u16" },
          { name: "yes_mint", type: "publicKey" as any },
          { name: "no_mint", type: "publicKey" as any },
          { name: "pool_yes_account", type: "publicKey" as any },
          { name: "pool_no_account", type: "publicKey" as any },
          { name: "pool_vault", type: "publicKey" as any },
          { name: "pool_authority", type: "publicKey" as any },
          { name: "state", type: { defined: "MarketState" } },
          { name: "outcome", type: { option: { defined: "MarketOutcome" } } },
          { name: "bump", type: "u8" },
        ],
      },
    },
    {
      name: "MarketCreated",
      type: {
        kind: "struct",
        fields: [
          { name: "market", type: "publicKey" as any },
          { name: "agent", type: "publicKey" as any },
          { name: "statement", type: "string" },
          { name: "closes_at", type: "i64" },
          { name: "initial_liquidity", type: "u64" },
        ],
      },
    },
    {
      name: "MarketOutcome",
      type: {
        kind: "enum",
        variants: [
          { name: "Yes" },
          { name: "No" },
        ],
      },
    },
    {
      name: "MarketResolved",
      type: {
        kind: "struct",
        fields: [
          { name: "market", type: "publicKey" as any },
          { name: "outcome", type: "u8" },
        ],
      },
    },
    {
      name: "MarketState",
      type: {
        kind: "enum",
        variants: [
          { name: "Active" },
          { name: "Resolved" },
          { name: "Frozen" },
        ],
      },
    },
    {
      name: "SharesBought",
      type: {
        kind: "struct",
        fields: [
          { name: "market", type: "publicKey" as any },
          { name: "buyer", type: "publicKey" as any },
          { name: "side", type: "u8" },
          { name: "amount", type: "u64" },
          { name: "shares", type: "u64" },
          { name: "new_reserve_yes", type: "u64" },
          { name: "new_reserve_no", type: "u64" },
        ],
      },
    },
    {
      name: "SharesSold",
      type: {
        kind: "struct",
        fields: [
          { name: "market", type: "publicKey" as any },
          { name: "seller", type: "publicKey" as any },
          { name: "side", type: "u8" },
          { name: "shares", type: "u64" },
          { name: "sol_out", type: "u64" },
          { name: "new_reserve_yes", type: "u64" },
          { name: "new_reserve_no", type: "u64" },
        ],
      },
    },
    {
      name: "Side",
      type: {
        kind: "enum",
        variants: [
          { name: "Yes" },
          { name: "No" },
        ],
      },
    },
  ],
} satisfies Idl

export type PredictionMarketIdl = typeof predictionMarketIdl

// Helpful reference for client components that want the initialize_market shape
type InstructionDef = PredictionMarketIdl["instructions"][number]
type InitializeMarketDefinition = InstructionDef & { name: "initialize_market" }

export const initializeMarketDefinition: InitializeMarketDefinition | undefined =
  predictionMarketIdl.instructions?.find(
    (ix): ix is InitializeMarketDefinition => ix?.name === "initialize_market"
  )
