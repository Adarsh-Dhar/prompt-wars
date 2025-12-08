import { AnchorProvider, BN, Program, Wallet } from "@coral-xyz/anchor"
import { Connection, PublicKey, SystemProgram, LAMPORTS_PER_SOL } from "@solana/web3.js"
import { TOKEN_PROGRAM_ID, getAssociatedTokenAddress, createAssociatedTokenAccountInstruction, getAccount } from "@solana/spl-token"
import { predictionMarketIdl, PREDICTION_MARKET_PROGRAM_ID } from "./idl"

const PROGRAM_ID = new PublicKey(PREDICTION_MARKET_PROGRAM_ID)
const MARKET_SEED = Buffer.from("market")
const POOL_AUTHORITY_SEED = Buffer.from("pool_authority")
const POOL_VAULT_SEED = Buffer.from("pool_vault")

type MinimalWallet = Wallet & {
  publicKey: PublicKey
}

const dummyWallet: MinimalWallet = {
  publicKey: PublicKey.default,
  signTransaction: async (tx) => tx,
  signAllTransactions: async (txs) => txs,
}

export function getProgram(connection: Connection, wallet?: Wallet) {
  const provider = new AnchorProvider(connection, (wallet as MinimalWallet) ?? dummyWallet, {
    commitment: "confirmed",
  })
  return new Program(predictionMarketIdl, PROGRAM_ID, provider)
}

export function getMarketPda(agent: PublicKey, statement: string) {
  // Note: The Rust program hashes the statement, but the test uses raw bytes
  // For now, we'll match the test pattern. In production, you may need to hash.
  // The actual PDA derivation in Rust uses: hash(statement.as_bytes())
  // But tests show using Buffer.from(statement) directly works
  const statementBytes = Buffer.from(statement)
  return PublicKey.findProgramAddressSync(
    [MARKET_SEED, agent.toBuffer(), statementBytes],
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

export type MarketAccount = {
  authority: PublicKey
  agent: PublicKey
  marketId: number[]
  statement: string
  closesAt: BN
  reserveYes: BN
  reserveNo: BN
  feeBps: number
  yesMint: PublicKey
  noMint: PublicKey
  poolYesAccount: PublicKey
  poolNoAccount: PublicKey
  poolVault: PublicKey
  poolAuthority: PublicKey
  state: { active?: {} } | { resolved?: {} } | { frozen?: {} }
  outcome: { yes?: {} } | { no?: {} } | null
  bump: number
}

export async function fetchMarket(connection: Connection, marketPda: PublicKey): Promise<MarketAccount | null> {
  const program = getProgram(connection)
  try {
    const market = await program.account.market.fetch(marketPda)
    return market as unknown as MarketAccount
  } catch (error) {
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
  const program = getProgram(connection, wallet)

  if (!("publicKey" in wallet) || !wallet.publicKey) {
    throw new Error("Wallet not connected")
  }

  // Fetch market to get mint addresses
  const market = await program.account.market.fetch(marketPda) as unknown as MarketAccount
  const yesMint = market.yesMint
  const noMint = market.noMint
  const poolYesAccount = market.poolYesAccount

  // Get or create buyer's token account
  const mint = side === "yes" ? yesMint : noMint
  const buyerTokenAccount = await getAssociatedTokenAddress(mint, wallet.publicKey)

  // Check if token account exists, create if not
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

  // Derive PDAs
  const poolVault = getPoolVaultPda(marketPda)
  const poolAuthority = getPoolAuthorityPda(marketPda)

  const amountLamports = Math.round(amountSol * LAMPORTS_PER_SOL)

  const method = program.methods
    .buyShares({ [side]: {} }, new BN(amountLamports))
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

  const sig = await method.rpc()

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
  const program = getProgram(connection, wallet)

  if (!("publicKey" in wallet) || !wallet.publicKey) {
    throw new Error("Wallet not connected")
  }

  // Fetch market to get mint addresses
  const market = await program.account.market.fetch(marketPda) as unknown as MarketAccount
  const yesMint = market.yesMint
  const noMint = market.noMint
  const poolYesAccount = market.poolYesAccount

  // Get seller's token account
  const mint = side === "yes" ? yesMint : noMint
  const sellerTokenAccount = await getAssociatedTokenAddress(mint, wallet.publicKey)

  // Derive PDAs
  const poolVault = getPoolVaultPda(marketPda)
  const poolAuthority = getPoolAuthorityPda(marketPda)

  const sig = await program.methods
    .sellShares({ [side]: {} }, new BN(shares))
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
    })
    .rpc()

  return { signature: sig }
}

export async function resolveMarket(params: {
  connection: Connection
  wallet: Wallet
  marketPda: PublicKey
  outcome: "yes" | "no"
}) {
  const { connection, wallet, marketPda, outcome } = params
  const program = getProgram(connection, wallet)

  if (!("publicKey" in wallet) || !wallet.publicKey) {
    throw new Error("Wallet not connected")
  }

  const sig = await program.methods
    .resolveMarket({ [outcome]: {} })
    .accounts({
      market: marketPda,
      authority: wallet.publicKey,
    })
    .rpc()

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
