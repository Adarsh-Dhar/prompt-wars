import * as anchor from "@coral-xyz/anchor";
import { AnchorProvider, BN, Program, Wallet } from "@coral-xyz/anchor";
import { TOKEN_PROGRAM_ID } from "@solana/spl-token";
import { 
  predictionMarketIdl, 
  PREDICTION_MARKET_PROGRAM_ID, 
  PredictionMarketIdl,
  MarketAccount,
  Outcome
} from "./prediction-idl";

const PROGRAM_ID = new anchor.web3.PublicKey(PREDICTION_MARKET_PROGRAM_ID);
const MARKET_SEED = Buffer.from("market");

/**
 * Generate a unique market ID based on timestamp and random component
 * @returns number - A unique market ID
 */
export function generateMarketId(): number {
  // Use timestamp + random component to ensure uniqueness
  const timestamp = Math.floor(Date.now() / 1000); // Unix timestamp
  const random = Math.floor(Math.random() * 1000); // Random component 0-999
  return timestamp * 1000 + random;
}

/**
 * Creates an Anchor program instance for the prediction market program
 * @param connection - Solana connection
 * @param wallet - Wallet for signing transactions (required for write operations)
 * @returns Program instance
 */
export function getProgram(connection: anchor.web3.Connection, wallet: Wallet) {
  const provider = new AnchorProvider(connection, wallet, {
    commitment: "confirmed",
  });
  return new Program(predictionMarketIdl as PredictionMarketIdl, provider);
}

/**
 * Generate market PDA for a given authority and market ID
 * @param authority - The authority public key for the market
 * @param marketId - The unique market ID (u64)
 * @returns Market PDA public key
 */
export function getMarketPda(authority: anchor.web3.PublicKey, marketId: number | BN): anchor.web3.PublicKey {
  const marketIdBN = typeof marketId === "number" ? new BN(marketId) : marketId;
  const marketIdBuffer = marketIdBN.toArrayLike(Buffer, "le", 8);
  
  return anchor.web3.PublicKey.findProgramAddressSync(
    [MARKET_SEED, authority.toBuffer(), marketIdBuffer], 
    PROGRAM_ID
  )[0];
}

/**
 * Check if a wallet can create a new market with a specific market ID
 * @param connection - Solana connection
 * @param authority - The authority public key to check
 * @param marketId - The market ID to check
 * @param wallet - Optional wallet for program instance
 * @returns Promise<boolean> - True if wallet can create a market with this ID, false if one already exists
 */
export async function canCreateMarket(
  connection: anchor.web3.Connection,
  authority: anchor.web3.PublicKey,
  marketId: number | BN,
  wallet?: Wallet
): Promise<boolean> {
  try {
    const marketPda = getMarketPda(authority, marketId);
    
    // Simple check: if the account exists, assume it's a market
    const accountInfo = await connection.getAccountInfo(marketPda);
    return accountInfo === null;
  } catch (error) {
    console.error("Error checking if wallet can create market:", error);
    // If we can't check, assume they can create (fail open)
    return true;
  }
}

/**
 * Get market information for a wallet and specific market ID
 * @param connection - Solana connection
 * @param authority - The authority public key to check
 * @param marketId - The market ID to check
 * @param wallet - Optional wallet for program instance
 * @returns Promise<object> - Market status information
 */
export async function getWalletMarketStatus(
  connection: anchor.web3.Connection,
  authority: anchor.web3.PublicKey,
  marketId: number | BN,
  wallet?: Wallet
) {
  try {
    const marketPda = getMarketPda(authority, marketId);
    
    // Check if account exists
    const accountInfo = await connection.getAccountInfo(marketPda);
    const hasExistingMarket = accountInfo !== null;
    
    // Try to fetch the market data if it exists
    let existingMarket = null;
    if (hasExistingMarket) {
      existingMarket = await fetchMarket(connection, marketPda, wallet);
    }
    
    return {
      canCreateMarket: !hasExistingMarket,
      hasExistingMarket: hasExistingMarket,
      marketPda: marketPda.toString(),
      existingMarket: existingMarket,
      accountExists: hasExistingMarket,
      marketId: typeof marketId === "number" ? marketId : marketId.toNumber()
    };
  } catch (error) {
    console.error("Error getting wallet market status:", error);
    const marketPda = getMarketPda(authority, marketId);
    return {
      canCreateMarket: true, // Fail open
      hasExistingMarket: false,
      marketPda: marketPda.toString(),
      existingMarket: null,
      accountExists: false,
      marketId: typeof marketId === "number" ? marketId : marketId.toNumber(),
      error: error instanceof Error ? error.message : 'Unknown error'
    };
  }
}

/**
 * Validation error class for input parameter errors
 */
export class InvalidParameterError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "InvalidParameterError";
  }
}

/**
 * Validate market question parameter
 * @param question - Market question string
 * @throws InvalidParameterError if question is invalid
 */
export function validateQuestion(question: string): void {
  if (typeof question !== "string") {
    throw new InvalidParameterError("Question must be a string");
  }
  if (question.trim().length === 0) {
    throw new InvalidParameterError("Question cannot be empty");
  }
  if (question.length > 200) {
    throw new InvalidParameterError("Question is too long (max 200 characters)");
  }
}

/**
 * Validate amount parameter
 * @param amount - Amount value (should be positive)
 * @throws InvalidParameterError if amount is invalid
 */
export function validateAmount(amount: number | BN): void {
  const amountBN = typeof amount === "number" ? new BN(amount) : amount;
  if (amountBN.isNeg()) {
    throw new InvalidParameterError("Amount cannot be negative");
  }
  if (amountBN.isZero()) {
    throw new InvalidParameterError("Amount cannot be zero");
  }
}

/**
 * Validate end time parameter
 * @param endTime - End time timestamp (should be in the future)
 * @throws InvalidParameterError if end time is invalid
 */
export function validateEndTime(endTime: number | BN): void {
  const endTimeBN = typeof endTime === "number" ? new BN(endTime) : endTime;
  const currentTime = new BN(Math.floor(Date.now() / 1000));
  
  if (endTimeBN.lte(currentTime)) {
    throw new InvalidParameterError("End time must be in the future");
  }
}

/**
 * Parameters for initializing a new prediction market
 */
export interface InitializeMarketParams {
  question: string;
  endTime: number | BN;
  collateralMint: anchor.web3.PublicKey;
  marketId: number | BN;
}

/**
 * Result of market initialization
 */
export interface InitializeMarketResult {
  txSignature: string;
  marketPda: anchor.web3.PublicKey;
  yesMint: anchor.web3.PublicKey;
  noMint: anchor.web3.PublicKey;
  collateralVault: anchor.web3.PublicKey;
}

/**
 * Check if the program is deployed on-chain
 * @param connection - Solana connection
 * @param verbose - Whether to log deployment status (default: false)
 * @returns Promise<boolean> - True if program exists, false otherwise
 */
export async function isProgramDeployed(connection: anchor.web3.Connection, verbose: boolean = false): Promise<boolean> {
  try {
    const accountInfo = await connection.getAccountInfo(PROGRAM_ID);
    const isDeployed = accountInfo !== null && accountInfo.executable;
    
    if (verbose) {
      console.log("Program deployment status:", {
        programId: PROGRAM_ID.toString(),
        exists: accountInfo !== null,
        executable: accountInfo?.executable || false,
        isDeployed
      });
    }
    
    return isDeployed;
  } catch (error) {
    if (verbose) {
      console.error("Error checking program deployment:", error);
    }
    return false;
  }
}

/**
 * Get program deployment information
 * @param connection - Solana connection
 * @returns Promise<object> - Deployment status information
 */
export async function getProgramInfo(connection: anchor.web3.Connection) {
  try {
    const accountInfo = await connection.getAccountInfo(PROGRAM_ID);
    return {
      programId: PROGRAM_ID.toString(),
      exists: accountInfo !== null,
      executable: accountInfo?.executable || false,
      isDeployed: accountInfo !== null && accountInfo.executable,
      owner: accountInfo?.owner?.toString() || null,
      dataLength: accountInfo?.data?.length || 0
    };
  } catch (error) {
    return {
      programId: PROGRAM_ID.toString(),
      exists: false,
      executable: false,
      isDeployed: false,
      owner: null,
      dataLength: 0,
      error: error instanceof Error ? error.message : 'Unknown error'
    };
  }
}

/**
 * Initialize a new prediction market
 * @param connection - Solana connection
 * @param wallet - Wallet for signing transactions
 * @param params - Market initialization parameters
 * @returns Promise<InitializeMarketResult> - Transaction signature and account addresses
 */
export async function initializeMarket(
  connection: anchor.web3.Connection,
  wallet: Wallet,
  params: InitializeMarketParams
): Promise<InitializeMarketResult> {
  // Validate parameters
  validateQuestion(params.question);
  validateEndTime(params.endTime);
  
  if (!wallet || !wallet.publicKey) {
    throw new InvalidParameterError("Wallet is required for market initialization");
  }

  const program = getProgram(connection, wallet);
  const authority = wallet.publicKey;

  // Generate PDAs and keypairs
  const marketPda = getMarketPda(authority, params.marketId);
  
  // Check if a market already exists for this authority and market ID
  const accountInfo = await connection.getAccountInfo(marketPda);
  if (accountInfo) {
    throw new InvalidParameterError(
      `A market already exists for this wallet with market ID ${params.marketId}. ` +
      `Market PDA: ${marketPda.toString()}`
    );
  }
  const yesMint = anchor.web3.Keypair.generate();
  const noMint = anchor.web3.Keypair.generate();
  const collateralVault = anchor.web3.Keypair.generate();

  // Get PDA bump
  const marketIdBN = typeof params.marketId === "number" ? new BN(params.marketId) : params.marketId;
  const marketIdBuffer = marketIdBN.toArrayLike(Buffer, "le", 8);
  const [, bump] = anchor.web3.PublicKey.findProgramAddressSync(
    [MARKET_SEED, authority.toBuffer(), marketIdBuffer],
    PROGRAM_ID
  );

  // Convert endTime to BN if needed
  const endTimeBN = typeof params.endTime === "number" ? new BN(params.endTime) : params.endTime;

  try {
    // Create the transaction
    const tx = await program.methods
      .initializeMarket(params.question, endTimeBN, marketIdBN, bump)
      .accounts({
        market: marketPda,
        yesMint: yesMint.publicKey,
        noMint: noMint.publicKey,
        collateralVault: collateralVault.publicKey,
        collateralMint: params.collateralMint,
        authority: authority,
        systemProgram: anchor.web3.SystemProgram.programId,
        tokenProgram: TOKEN_PROGRAM_ID,
        rent: anchor.web3.SYSVAR_RENT_PUBKEY,
      })
      .signers([yesMint, noMint, collateralVault])
      .rpc();

    return {
      txSignature: tx,
      marketPda,
      yesMint: yesMint.publicKey,
      noMint: noMint.publicKey,
      collateralVault: collateralVault.publicKey,
    };
  } catch (error) {
    console.error("Failed to initialize market:", error);
    
    // Check for specific error types
    if (error instanceof Error) {
      // Program ID mismatch error
      if (error.message.includes('DeclaredProgramIdMismatch')) {
        console.error("Program ID mismatch detected!");
        console.error("Expected program ID:", PREDICTION_MARKET_PROGRAM_ID);
        console.error("Actual program ID:", program.programId.toString());
        console.error("This usually means the program needs to be redeployed or the IDL needs to be updated.");
        
        throw new Error(`Program ID mismatch: Expected ${PREDICTION_MARKET_PROGRAM_ID}, got ${program.programId.toString()}. Please redeploy the program or update the IDL.`);
      }
      
      // Account already in use error (the original issue)
      if (error.message.includes('already in use') || error.message.includes('custom program error: 0x0')) {
        throw new Error(
          `This wallet already has a market. Each wallet can only create one market. ` +
          `Please use a different wallet to create additional markets. ` +
          `Market PDA: ${marketPda.toString()}`
        );
      }
      
      // Insufficient funds error
      if (error.message.includes('insufficient funds') || error.message.includes('Attempt to debit an account but found no record of a prior credit')) {
        throw new Error(
          `Insufficient SOL balance to create market. Please add SOL to your wallet to cover transaction fees and rent.`
        );
      }
    }
    
    throw new Error(`Market initialization failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}

/**
 * Fetch market account data
 * @param connection - Solana connection
 * @param marketPda - Market PDA public key
 * @param wallet - Optional wallet for program instance
 * @returns Promise<MarketAccount | null> - Market data or null if not found
 */
export async function fetchMarket(
  connection: anchor.web3.Connection,
  marketPda: anchor.web3.PublicKey,
  wallet?: Wallet
): Promise<MarketAccount | null> {
  try {
    // First, check if the account exists at all
    const accountInfo = await connection.getAccountInfo(marketPda);
    if (!accountInfo) {
      return null; // Account doesn't exist
    }

    // Create a dummy wallet if none provided for read-only operations
    const dummyWallet: Wallet = {
      publicKey: anchor.web3.PublicKey.default,
      signTransaction: async (tx: any) => tx,
      signAllTransactions: async (txs: any[]) => txs,
    } as Wallet;
    
    const program = getProgram(connection, wallet || dummyWallet);
    
    // Try to fetch the market account using the program
    try {
      // Check if program.account exists
      if (!program.account) {
        console.warn("Program account structure not available, account exists but can't deserialize");
        return null;
      }
      
      // Try to access the market account with proper typing
      const marketAccount = await (program.account as any).market?.fetchNullable?.(marketPda);
      return marketAccount;
    } catch (fetchError) {
      // If the program account fetch fails, the account might exist but not be a market account
      console.warn("Account exists but couldn't fetch as market:", fetchError);
      return null;
    }
  } catch (error) {
    console.error("Failed to fetch market:", error);
    return null;
  }
}

/**
 * Fetch market account data by authority and market ID
 * @param connection - Solana connection
 * @param authority - Authority public key
 * @param marketId - Market ID
 * @param wallet - Optional wallet for program instance
 * @returns Promise<MarketAccount | null> - Market data or null if not found
 */
export async function fetchMarketByAuthority(
  connection: anchor.web3.Connection,
  authority: anchor.web3.PublicKey,
  marketId: number | BN,
  wallet?: Wallet
): Promise<MarketAccount | null> {
  const marketPda = getMarketPda(authority, marketId);
  return fetchMarket(connection, marketPda, wallet);
}

/**
 * Parameters for buying tokens
 */
export interface BuyTokensParams {
  marketPda: anchor.web3.PublicKey;
  amount: number | BN;
  outcome: Outcome;
  userCollateralAccount: anchor.web3.PublicKey;
  userYesAccount: anchor.web3.PublicKey;
  userNoAccount: anchor.web3.PublicKey;
}

/**
 * Buy outcome tokens in a prediction market
 * @param connection - Solana connection
 * @param wallet - Wallet for signing transactions
 * @param params - Token purchase parameters
 * @returns Promise<string> - Transaction signature
 */
export async function buyTokens(
  connection: anchor.web3.Connection,
  wallet: Wallet,
  params: BuyTokensParams
): Promise<string> {
  if (!wallet || !wallet.publicKey) {
    throw new InvalidParameterError("Wallet is required for token purchase");
  }

  // Validate amount
  validateAmount(params.amount);

  const program = getProgram(connection, wallet);
  
  // Fetch market data to get mint addresses
  const marketData = await fetchMarket(connection, params.marketPda, wallet);
  if (!marketData) {
    throw new Error("Market not found");
  }

  // Convert amount to BN if needed
  const amountBN = typeof params.amount === "number" ? new BN(params.amount) : params.amount;

  try {
    const tx = await program.methods
      .buyTokens(amountBN, params.outcome)
      .accounts({
        market: params.marketPda,
        yesMint: marketData.yesMint,
        noMint: marketData.noMint,
        collateralVault: marketData.collateralVault,
        userCollateral: params.userCollateralAccount,
        userYesAccount: params.userYesAccount,
        userNoAccount: params.userNoAccount,
        user: wallet.publicKey,
        tokenProgram: TOKEN_PROGRAM_ID,
      })
      .rpc();

    return tx;
  } catch (error) {
    console.error("Failed to buy tokens:", error);
    throw new Error(`Token purchase failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}

/**
 * Parameters for selling tokens
 */
export interface SellTokensParams {
  marketPda: anchor.web3.PublicKey;
  amount: number | BN;
  outcome: Outcome;
  userCollateralAccount: anchor.web3.PublicKey;
  userYesAccount: anchor.web3.PublicKey;
  userNoAccount: anchor.web3.PublicKey;
}

/**
 * Sell outcome tokens in a prediction market
 * @param connection - Solana connection
 * @param wallet - Wallet for signing transactions
 * @param params - Token sale parameters
 * @returns Promise<string> - Transaction signature
 */
export async function sellTokens(
  connection: anchor.web3.Connection,
  wallet: Wallet,
  params: SellTokensParams
): Promise<string> {
  if (!wallet || !wallet.publicKey) {
    throw new InvalidParameterError("Wallet is required for token sale");
  }

  // Validate amount
  validateAmount(params.amount);

  const program = getProgram(connection, wallet);
  
  // Fetch market data to get mint addresses
  const marketData = await fetchMarket(connection, params.marketPda, wallet);
  if (!marketData) {
    throw new Error("Market not found");
  }

  // Convert amount to BN if needed
  const amountBN = typeof params.amount === "number" ? new BN(params.amount) : params.amount;

  try {
    const tx = await program.methods
      .sellTokens(amountBN, params.outcome)
      .accounts({
        market: params.marketPda,
        yesMint: marketData.yesMint,
        noMint: marketData.noMint,
        collateralVault: marketData.collateralVault,
        userCollateral: params.userCollateralAccount,
        userYesAccount: params.userYesAccount,
        userNoAccount: params.userNoAccount,
        user: wallet.publicKey,
        tokenProgram: TOKEN_PROGRAM_ID,
      })
      .rpc();

    return tx;
  } catch (error) {
    console.error("Failed to sell tokens:", error);
    throw new Error(`Token sale failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}

/**
 * Parameters for resolving a market
 */
export interface ResolveMarketParams {
  marketPda: anchor.web3.PublicKey;
  winningOutcome: Outcome;
}

/**
 * Resolve a prediction market with the winning outcome
 * @param connection - Solana connection
 * @param wallet - Wallet for signing transactions (must be market authority)
 * @param params - Market resolution parameters
 * @returns Promise<string> - Transaction signature
 */
export async function resolveMarket(
  connection: anchor.web3.Connection,
  wallet: Wallet,
  params: ResolveMarketParams
): Promise<string> {
  if (!wallet || !wallet.publicKey) {
    throw new InvalidParameterError("Wallet is required for market resolution");
  }

  const program = getProgram(connection, wallet);

  try {
    const tx = await program.methods
      .resolveMarket(params.winningOutcome)
      .accounts({
        market: params.marketPda,
        authority: wallet.publicKey,
      })
      .rpc();

    return tx;
  } catch (error) {
    console.error("Failed to resolve market:", error);
    throw new Error(`Market resolution failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}

/**
 * Parameters for claiming winnings
 */
export interface ClaimWinningsParams {
  marketPda: anchor.web3.PublicKey;
  amount: number | BN;
  userCollateralAccount: anchor.web3.PublicKey;
  userYesAccount: anchor.web3.PublicKey;
  userNoAccount: anchor.web3.PublicKey;
}

/**
 * Claim winnings from a resolved prediction market
 * @param connection - Solana connection
 * @param wallet - Wallet for signing transactions
 * @param params - Winnings claim parameters
 * @returns Promise<string> - Transaction signature
 */
export async function claimWinnings(
  connection: anchor.web3.Connection,
  wallet: Wallet,
  params: ClaimWinningsParams
): Promise<string> {
  if (!wallet || !wallet.publicKey) {
    throw new InvalidParameterError("Wallet is required for claiming winnings");
  }

  // Validate amount
  validateAmount(params.amount);

  const program = getProgram(connection, wallet);
  
  // Fetch market data to get mint addresses
  const marketData = await fetchMarket(connection, params.marketPda, wallet);
  if (!marketData) {
    throw new Error("Market not found");
  }

  // Convert amount to BN if needed
  const amountBN = typeof params.amount === "number" ? new BN(params.amount) : params.amount;

  try {
    const tx = await program.methods
      .claimWinnings(amountBN)
      .accounts({
        market: params.marketPda,
        yesMint: marketData.yesMint,
        noMint: marketData.noMint,
        collateralVault: marketData.collateralVault,
        userCollateral: params.userCollateralAccount,
        userYesAccount: params.userYesAccount,
        userNoAccount: params.userNoAccount,
        user: wallet.publicKey,
        tokenProgram: TOKEN_PROGRAM_ID,
      })
      .rpc();

    return tx;
  } catch (error) {
    console.error("Failed to claim winnings:", error);
    throw new Error(`Winnings claim failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}

/**
 * Batch fetch multiple markets
 * @param connection - Solana connection
 * @param marketPdas - Array of market PDA public keys
 * @param wallet - Optional wallet for program instance
 * @returns Promise<(MarketAccount | null)[]> - Array of market data or null for each PDA
 */
export async function fetchMarkets(
  connection: anchor.web3.Connection,
  marketPdas: anchor.web3.PublicKey[],
  wallet?: Wallet
): Promise<(MarketAccount | null)[]> {
  if (marketPdas.length === 0) {
    return [];
  }

  try {
    // Create a dummy wallet if none provided for read-only operations
    const dummyWallet: Wallet = {
      publicKey: anchor.web3.PublicKey.default,
      signTransaction: async (tx: any) => tx,
      signAllTransactions: async (txs: any[]) => txs,
    } as Wallet;
    
    const program = getProgram(connection, wallet || dummyWallet);
    
    // Use Promise.allSettled to handle partial failures gracefully
    const results = await Promise.allSettled(
      marketPdas.map(pda => (program.account as any).Market.fetchNullable(pda))
    );
    
    return results.map(result => {
      if (result.status === 'fulfilled') {
        return result.value;
      } else {
        console.warn('Failed to fetch market:', result.reason);
        return null;
      }
    });
  } catch (error) {
    console.error("Failed to batch fetch markets:", error);
    // Return array of nulls if batch fetch fails completely
    return new Array(marketPdas.length).fill(null);
  }
}

