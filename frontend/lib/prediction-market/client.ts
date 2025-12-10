import { AnchorProvider, BN, Program, Wallet } from "@coral-xyz/anchor"
import { Connection, PublicKey, SystemProgram, LAMPORTS_PER_SOL, Keypair } from "@solana/web3.js"
import { utils as anchorUtils } from "@coral-xyz/anchor"
import { createHash } from "crypto"
import {
  TOKEN_PROGRAM_ID,
  MINT_SIZE,
  ACCOUNT_SIZE,
  createAssociatedTokenAccountInstruction,
  createInitializeMintInstruction,
  createInitializeAccountInstruction,
  getAssociatedTokenAddress,
  getAccount,
} from "@solana/spl-token"
import { predictionMarketIdl, PREDICTION_MARKET_PROGRAM_ID, PredictionMarketIdl } from "./idl"

const PROGRAM_ID = new PublicKey(PREDICTION_MARKET_PROGRAM_ID)
const MARKET_SEED = Buffer.from("market")
const POOL_AUTHORITY_SEED = Buffer.from("pool_authority")
const POOL_VAULT_SEED = Buffer.from("pool_vault")
const RENT_SYSVAR = new PublicKey("SysvarRent111111111111111111111111111111111")

// Market account size from lib.rs: Market::LEN
// 32 (authority) + 32 (agent) + 32 (market_id) + 4 + 256 (statement) + 8 (closes_at)
// + 8 (reserve_yes) + 8 (reserve_no) + 2 (fee_bps) + 32 (yes_mint) + 32 (no_mint)
// + 32 (pool_yes_account) + 32 (pool_no_account) + 32 (pool_vault) + 32 (pool_authority)
// + 1 (state) + 2 (outcome Option) + 1 (bump) = 578
// Plus 8 bytes for Anchor's discriminator = 586
const MARKET_ACCOUNT_SIZE = 586

type MinimalWallet = Wallet & {
  publicKey: PublicKey
  sendTransaction?: (transaction: any, connection: Connection, options?: any) => Promise<string>
}

const dummyWallet: MinimalWallet & { payer?: any } = {
  publicKey: PublicKey.default,
  payer: Keypair.generate(),
  signTransaction: async (tx) => tx,
  signAllTransactions: async (txs) => txs,
}

function hasPublicKey(wallet?: Wallet | MinimalWallet | null): wallet is MinimalWallet {
  return !!wallet && "publicKey" in wallet && !!(wallet as any).publicKey
}

function hasSendTransaction(wallet?: Wallet | MinimalWallet | null): wallet is MinimalWallet & { sendTransaction: NonNullable<MinimalWallet["sendTransaction"]> } {
  return !!wallet && typeof (wallet as any).sendTransaction === "function"
}

function normalizeWallet(wallet?: Wallet | MinimalWallet): MinimalWallet {
  if (hasPublicKey(wallet)) {
    // Ensure publicKey is a valid PublicKey instance
    let walletPublicKey = (wallet as any).publicKey
    if (!walletPublicKey) {
      throw new Error("Wallet publicKey is required")
    }
    
    // If it's not already a PublicKey instance, try to create one
    if (!(walletPublicKey instanceof PublicKey)) {
      try {
        walletPublicKey = new PublicKey(walletPublicKey)
      } catch (error) {
        throw new Error(`Wallet publicKey must be a valid PublicKey: ${error}`)
      }
    }
    
    // Create a clean wallet object with all required properties
    const withFallbacks: any = { 
      publicKey: walletPublicKey, // Use the validated PublicKey instance
      signTransaction: (wallet as any).signTransaction || (async (tx: any) => tx),
      signAllTransactions: (wallet as any).signAllTransactions || (async (txs: any[]) => txs),
      sendTransaction: (wallet as any).sendTransaction,
    }
    
    return withFallbacks as MinimalWallet
  }
  return dummyWallet
}

async function sendAnchorMethod(
  method: any,
  connection: Connection,
  wallet: MinimalWallet,
  signers: Keypair[] = []
) {
  if (hasSendTransaction(wallet)) {
    const tx = await method.transaction()
    const latestBlockhash = await connection.getLatestBlockhash()
    tx.recentBlockhash = latestBlockhash.blockhash
    tx.lastValidBlockHeight = latestBlockhash.lastValidBlockHeight
    tx.feePayer = wallet.publicKey ?? tx.feePayer
    if (signers.length) {
      tx.partialSign(...signers)
    }
    return wallet.sendTransaction(tx, connection, { signers, skipPreflight: false })
  }

  return method.signers(signers).rpc()
}

export function getProgram(connection: Connection, wallet?: Wallet) {
  if (!connection) {
    throw new Error("Connection is required")
  }
  
  // Validate PROGRAM_ID is a valid PublicKey
  if (!PROGRAM_ID || !(PROGRAM_ID instanceof PublicKey)) {
    throw new Error("PROGRAM_ID is not a valid PublicKey")
  }
  
  const normalizedWallet = normalizeWallet(wallet)
  
  // Ensure the wallet has a valid publicKey
  if (!normalizedWallet.publicKey || !(normalizedWallet.publicKey instanceof PublicKey)) {
    throw new Error("Wallet must have a valid publicKey")
  }
  
  try {
    // Log wallet structure for debugging
    console.debug("[getProgram] Creating provider with wallet:", {
      hasPublicKey: !!normalizedWallet.publicKey,
      publicKeyType: normalizedWallet.publicKey?.constructor?.name,
      publicKeyValue: normalizedWallet.publicKey?.toBase58(),
      hasSignTransaction: typeof normalizedWallet.signTransaction === "function",
      hasSignAllTransactions: typeof normalizedWallet.signAllTransactions === "function",
    })
    
    const provider = new AnchorProvider(connection, normalizedWallet, {
      commitment: "confirmed",
    })
    
    // Validate provider was created successfully
    if (!provider) {
      throw new Error("Failed to create AnchorProvider")
    }
    
    // Anchor's Program constructor processes the IDL to set up account clients
    // Create a properly structured IDL object with address field
    // Anchor expects the address field in the IDL when present
    const idlForProgram: any = {
      ...predictionMarketIdl,
      address: PREDICTION_MARKET_PROGRAM_ID,
    }
    
    // Ensure accounts array exists and is properly structured
    if (!idlForProgram.accounts || !Array.isArray(idlForProgram.accounts)) {
      throw new Error("IDL must have an accounts array")
    }
    
    console.debug("[getProgram] Creating Program with:", {
      programId: PROGRAM_ID.toBase58(),
      idlName: idlForProgram.name,
      idlVersion: idlForProgram.version,
      idlHasAddress: !!idlForProgram.address,
      accountsCount: idlForProgram.accounts?.length || 0,
      instructionsCount: idlForProgram.instructions?.length || 0,
    })
    
      return new Program(idlForProgram, PROGRAM_ID, provider)
  } catch (error: any) {
    console.error("[getProgram] Error creating Program:", {
      error: error?.message,
      errorStack: error?.stack,
      programId: PROGRAM_ID?.toBase58(),
      walletPublicKey: normalizedWallet.publicKey?.toBase58(),
      connection: connection?.rpcEndpoint,
      walletStructure: {
        publicKey: normalizedWallet.publicKey ? "exists" : "missing",
        signTransaction: "signTransaction" in normalizedWallet ? "exists" : "missing",
        signAllTransactions: "signAllTransactions" in normalizedWallet ? "exists" : "missing",
      },
    })
    throw new Error(`Failed to create Program: ${error?.message || String(error)}`)
  }
}
/**
 * Use the on-chain PDA derivation formula from prediction_market/target
 */
export function getMarketPda(agent: PublicKey, statement: string) {
  let statementHash: Buffer
  try {
    statementHash = createHash("sha256").update(statement).digest()
  } catch {
    statementHash = Buffer.from(anchorUtils.sha256.hash(statement))
  }
  return PublicKey.findProgramAddressSync(
    [MARKET_SEED, agent.toBuffer(), statementHash],
    PROGRAM_ID
  )[0]
}

export function getPoolAuthorityPda(market: PublicKey) {
  return PublicKey.findProgramAddressSync(
    [POOL_AUTHORITY_SEED, market.toBuffer()],
    PROGRAM_ID
  )[0]
}

export function getPoolVaultPda(market: PublicKey) {
  return PublicKey.findProgramAddressSync(
    [POOL_VAULT_SEED, market.toBuffer()],
    PROGRAM_ID
  )[0]
}

type InitMarketParams = {
  connection: Connection
  wallet: Wallet
  agent: PublicKey
  statement: string
  closesAt: number // unix seconds
  initialLiquidityLamports: number
  feeBps: number
}

type InitMarketResult = {
  marketPda: PublicKey
  yesMint: PublicKey
  noMint: PublicKey
  poolYesAccount: PublicKey
  poolNoAccount: PublicKey
  poolAuthority: PublicKey
  poolVault: PublicKey
  signature: string
}

export async function initializeOnChainMarket(params: InitMarketParams): Promise<InitMarketResult> {
  const { connection, wallet, agent, statement, closesAt, initialLiquidityLamports, feeBps } = params

  if (!hasPublicKey(wallet)) {
    throw new Error("Wallet not connected")
  }

  const normalizedWallet = normalizeWallet(wallet)
  const program = getProgram(connection, normalizedWallet)

  // Derive addresses
  const marketPda = getMarketPda(agent, statement)
  const poolAuthority = getPoolAuthorityPda(marketPda)
  const poolVault = getPoolVaultPda(marketPda)

  // Generate signers for mints and token accounts
  const marketKeypair = Keypair.generate()
  const yesMint = Keypair.generate()
  const noMint = Keypair.generate()
  const poolYesAccount = Keypair.generate()
  const poolNoAccount = Keypair.generate()

  const rentMint = await connection.getMinimumBalanceForRentExemption(MINT_SIZE)
  const rentAccount = await connection.getMinimumBalanceForRentExemption(ACCOUNT_SIZE)
  // Use constant size instead of program.account.market.size to avoid Anchor type resolution issues
  const rentMarket = await connection.getMinimumBalanceForRentExemption(MARKET_ACCOUNT_SIZE)

  const createMintAccount = (kp: Keypair) =>
    SystemProgram.createAccount({
      fromPubkey: normalizedWallet.publicKey as PublicKey,
      newAccountPubkey: kp.publicKey,
      space: MINT_SIZE,
      lamports: rentMint,
      programId: TOKEN_PROGRAM_ID,
    })

  const createTokenAccount = (kp: Keypair) =>
    SystemProgram.createAccount({
      fromPubkey: normalizedWallet.publicKey as PublicKey,
      newAccountPubkey: kp.publicKey,
      space: ACCOUNT_SIZE,
      lamports: rentAccount,
      programId: TOKEN_PROGRAM_ID,
    })

  const preInstructions = [
    // Market account
    SystemProgram.createAccount({
      fromPubkey: normalizedWallet.publicKey as PublicKey,
      newAccountPubkey: marketKeypair.publicKey,
      space: MARKET_ACCOUNT_SIZE,
      lamports: rentMarket,
      programId: PROGRAM_ID,
    }),
    // Mints
    createMintAccount(yesMint),
    createMintAccount(noMint),
    createInitializeMintInstruction(yesMint.publicKey, 0, normalizedWallet.publicKey as PublicKey, null),
    createInitializeMintInstruction(noMint.publicKey, 0, normalizedWallet.publicKey as PublicKey, null),
    // Token accounts
    createTokenAccount(poolYesAccount),
    createTokenAccount(poolNoAccount),
    createInitializeAccountInstruction(poolYesAccount.publicKey, yesMint.publicKey, normalizedWallet.publicKey as PublicKey),
    createInitializeAccountInstruction(poolNoAccount.publicKey, noMint.publicKey, normalizedWallet.publicKey as PublicKey),
  ]

  const method = program.methods
    .initializeMarket(statement, new BN(closesAt), new BN(initialLiquidityLamports), feeBps)
    .accounts({
      market: marketKeypair.publicKey,
      agent,
      poolAuthority,
      yesMint: yesMint.publicKey,
      noMint: noMint.publicKey,
      poolYesAccount: poolYesAccount.publicKey,
      poolNoAccount: poolNoAccount.publicKey,
      poolVault,
      authority: normalizedWallet.publicKey as PublicKey,
      tokenProgram: TOKEN_PROGRAM_ID,
      systemProgram: SystemProgram.programId,
      rent: RENT_SYSVAR,
    })
    .preInstructions(preInstructions)
    .signers([marketKeypair, yesMint, noMint, poolYesAccount, poolNoAccount])

  const tx = await sendAnchorMethod(method, connection, normalizedWallet, [
    marketKeypair,
    yesMint,
    noMint,
    poolYesAccount,
    poolNoAccount,
  ])

  return {
    marketPda,
    yesMint: yesMint.publicKey,
    noMint: noMint.publicKey,
    poolYesAccount: poolYesAccount.publicKey,
    poolNoAccount: poolNoAccount.publicKey,
    poolAuthority,
    poolVault,
    signature: tx,
  }
}

export type MarketAccount = Awaited<ReturnType<Awaited<ReturnType<typeof getProgram>>["account"]["market"]["fetch"]>>

export async function fetchMarket(connection: Connection, marketPda: PublicKey): Promise<MarketAccount | null> {
  if (!connection) {
    console.debug(`[fetchMarket] Connection is null or undefined`)
    return null
  }

  if (!marketPda) {
    console.debug(`[fetchMarket] marketPda is null or undefined`)
    return null
  }
  try {
    const program = getProgram(connection)
    if (!program) {
      console.debug(`[fetchMarket] Failed to get program instance`)
      return null
    }
    const market = await program.account.market.fetch(marketPda)
    return market as unknown as MarketAccount
  } catch (error) {
    const errorDetails: Record<string, any> = {
      marketPda: marketPda.toBase58(),
    }
    if (error instanceof Error) {
      errorDetails.message = error.message
      errorDetails.name = error.name
      const err = error as any
      if (err.code) errorDetails.code = err.code
      if (err.logs) errorDetails.logs = err.logs
      if (err.programErrorCode) errorDetails.programErrorCode = err.programErrorCode
    } else if (error !== null && error !== undefined) {
      errorDetails.error = String(error)
      errorDetails.type = typeof error
    }
    console.debug(`[fetchMarket] Market not found or error fetching:`, errorDetails)
    return null
  }
}

export async function buyShares(params: {
  connection: Connection
  wallet: Wallet
  marketPda: PublicKey
  side: "yes" | "no"
  amountSol: number
}) {
  const { connection, wallet, marketPda, side, amountSol } = params
  const normalizedWallet = normalizeWallet(wallet)
  const program = getProgram(connection, normalizedWallet)

  if (!hasPublicKey(wallet)) {
    throw new Error("Wallet not connected")
  }

  // Fetch market to get mint addresses
  const market = await program.account.market.fetch(marketPda) as unknown as MarketAccount
  const yesMint = (market as any).yes_mint || (market as any).yesMint // anchor snake-case or camel-case
  const noMint = (market as any).no_mint || (market as any).noMint
  const poolYesAccount = (market as any).pool_yes_account || (market as any).poolYesAccount

  const mint = side === "yes" ? yesMint : noMint
  const buyerTokenAccount = await getAssociatedTokenAddress(mint, wallet.publicKey)

  let createTokenAccountIx
  try {
    await getAccount(connection, buyerTokenAccount)
  } catch {
    createTokenAccountIx = createAssociatedTokenAccountInstruction(
      wallet.publicKey,
      buyerTokenAccount,
      wallet.publicKey,
      mint
    )
  }

  const poolVault = getPoolVaultPda(marketPda)
  const poolAuthority = getPoolAuthorityPda(marketPda)

  const amountLamports = Math.round(amountSol * LAMPORTS_PER_SOL)
  const sideEnum = side === "yes" ? { yes: {} } : { no: {} }

  const method = program.methods
    .buyShares(sideEnum, new BN(amountLamports))
    .accounts({
      market: marketPda,
      buyer: wallet.publicKey,
      yesMint,
      noMint,
      buyerTokenAccount,
      poolYesAccount,
      poolVault,
      poolAuthority,
      tokenProgram: TOKEN_PROGRAM_ID,
    })
  if (createTokenAccountIx) {
    method.preInstructions([createTokenAccountIx])
  }

  const sig = await sendAnchorMethod(method, connection, normalizedWallet)
  return { signature: sig }
}

export async function sellShares(params: {
  connection: Connection
  wallet: Wallet
  marketPda: PublicKey
  side: "yes" | "no"
  shares: number
}) {
  const { connection, wallet, marketPda, side, shares } = params
  const normalizedWallet = normalizeWallet(wallet)
  const program = getProgram(connection, normalizedWallet)

  if (!hasPublicKey(wallet)) {
    throw new Error("Wallet not connected")
  }

  const market = await program.account.market.fetch(marketPda) as unknown as MarketAccount
  const yesMint = (market as any).yes_mint || (market as any).yesMint
  const noMint = (market as any).no_mint || (market as any).noMint
  const poolYesAccount = (market as any).pool_yes_account || (market as any).poolYesAccount

  const mint = side === "yes" ? yesMint : noMint
  const sellerTokenAccount = await getAssociatedTokenAddress(mint, wallet.publicKey)
  const poolVault = getPoolVaultPda(marketPda)
  const poolAuthority = getPoolAuthorityPda(marketPda)
  const sideEnum = side === "yes" ? { yes: {} } : { no: {} }

  const sig = await sendAnchorMethod(
    program.methods
      .sellShares(sideEnum, new BN(shares))
      .accounts({
        market: marketPda,
        seller: wallet.publicKey,
        yesMint,
        noMint,
        sellerTokenAccount,
        poolYesAccount,
        poolVault,
        poolAuthority,
        tokenProgram: TOKEN_PROGRAM_ID,
      }),
    connection,
    normalizedWallet
  )

  return { signature: sig }
}

export async function resolveMarket(params: {
  connection: Connection
  wallet: Wallet
  marketPda: PublicKey
  outcome: "yes" | "no"
}) {
  const { connection, wallet, marketPda, outcome } = params
  const normalizedWallet = normalizeWallet(wallet)
  const program = getProgram(connection, normalizedWallet)

  if (!hasPublicKey(wallet)) {
    throw new Error("Wallet not connected")
  }
  const outcomeEnum = outcome === "yes" ? { yes: {} } : { no: {} }

  const sig = await sendAnchorMethod(
    program.methods
      .resolveMarket(outcomeEnum)
      .accounts({
        market: marketPda,
        authority: wallet.publicKey,
      }),
    connection,
    normalizedWallet
  )

  return { signature: sig }
}

// Calculate price from reserves (CPMM formula)
export function calculatePrice(reserveYes: number, reserveNo: number): { yesPrice: number; noPrice: number } {
  const totalReserves = reserveYes + reserveNo
  if (totalReserves === 0) {
    return { yesPrice: 0.5, noPrice: 0.5 }
  }
  return {
    yesPrice: reserveNo / totalReserves,
    noPrice: reserveYes / totalReserves,
  }
}

// Get user's token balance
export async function getUserTokenBalance(
  connection: Connection,
  user: PublicKey,
  mint: PublicKey
): Promise<number> {
  try {
    const tokenAccount = await getAssociatedTokenAddress(mint, user)
    const account = await getAccount(connection, tokenAccount)
    return Number(account.amount)
  } catch {
    return 0
  }
}
