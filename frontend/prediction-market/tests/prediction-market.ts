import * as anchor from "@coral-xyz/anchor";
import { Program } from "@coral-xyz/anchor";
import { PredictionMarket } from "../target/types/prediction_market";
import { PublicKey, Keypair, SystemProgram, LAMPORTS_PER_SOL } from "@solana/web3.js";
import { TOKEN_PROGRAM_ID, createMint, createAccount, mintTo, getAccount } from "@solana/spl-token";
import { expect } from "chai";

describe("prediction-market", () => {
  // Configure the client to use the local cluster.
  anchor.setProvider(anchor.AnchorProvider.env());

  const program = anchor.workspace.predictionMarket as Program<PredictionMarket>;
  const provider = anchor.getProvider();

  // Test accounts
  let authority: Keypair;
  let agent: Keypair;
  let buyer: Keypair;
  let marketPda: PublicKey;
  let poolVaultPda: PublicKey;
  let poolAuthorityPda: PublicKey;
  let yesMint: PublicKey;
  let noMint: PublicKey;
  let poolYesAccount: PublicKey;
  let poolNoAccount: PublicKey;

  const statement = "Will this test pass?";
  const closesAt = Math.floor(Date.now() / 1000) + 86400; // 24 hours from now
  const initialLiquidity = 10 * LAMPORTS_PER_SOL;
  const feeBps = 100; // 1%

  beforeEach(async () => {
    authority = Keypair.generate();
    agent = Keypair.generate();
    buyer = Keypair.generate();

    // Airdrop SOL to test accounts
    await provider.connection.requestAirdrop(authority.publicKey, 100 * LAMPORTS_PER_SOL);
    await provider.connection.requestAirdrop(buyer.publicKey, 100 * LAMPORTS_PER_SOL);

    // Wait for airdrops to confirm
    await new Promise((resolve) => setTimeout(resolve, 1000));
  });

  it("Initializes a market", async () => {
    // Derive PDAs
    [marketPda] = PublicKey.findProgramAddressSync(
      [
        Buffer.from("market"),
        agent.publicKey.toBuffer(),
        Buffer.from(statement),
      ],
      program.programId
    );

    [poolAuthorityPda] = PublicKey.findProgramAddressSync(
      [Buffer.from("pool_authority"), marketPda.toBuffer()],
      program.programId
    );

    [poolVaultPda] = PublicKey.findProgramAddressSync(
      [Buffer.from("pool_vault"), marketPda.toBuffer()],
      program.programId
    );

    // Create mints and token accounts (these would normally be created by the program)
    // For testing, we'll create them first
    yesMint = await createMint(
      provider.connection,
      authority,
      poolAuthorityPda,
      null,
      0
    );

    noMint = await createMint(
      provider.connection,
      authority,
      poolAuthorityPda,
      null,
      0
    );

    poolYesAccount = await createAccount(
      provider.connection,
      authority,
      yesMint,
      poolAuthorityPda
    );

    poolNoAccount = await createAccount(
      provider.connection,
      authority,
      noMint,
      poolAuthorityPda
    );

    try {
      const tx = await program.methods
        .initializeMarket(statement, new anchor.BN(closesAt), new anchor.BN(initialLiquidity), feeBps)
        .accounts({
          market: marketPda,
          agent: agent.publicKey,
          yesMint: yesMint,
          noMint: noMint,
          poolYesAccount: poolYesAccount,
          poolNoAccount: poolNoAccount,
          poolVault: poolVaultPda,
          poolAuthority: poolAuthorityPda,
          authority: authority.publicKey,
          tokenProgram: TOKEN_PROGRAM_ID,
          systemProgram: SystemProgram.programId,
          rent: anchor.web3.SYSVAR_RENT_PUBKEY,
        })
        .signers([authority])
        .rpc();

      console.log("Market initialization transaction:", tx);

      // Fetch and verify market account
      const market = await program.account.market.fetch(marketPda);
      expect(market.authority.toString()).to.equal(authority.publicKey.toString());
      expect(market.agent.toString()).to.equal(agent.publicKey.toString());
      expect(market.statement).to.equal(statement);
      expect(market.reserveYes.toNumber()).to.equal(initialLiquidity / 2);
      expect(market.reserveNo.toNumber()).to.equal(initialLiquidity / 2);
      expect(market.feeBps).to.equal(feeBps);
      expect(market.state.active).to.not.be.undefined;
      expect(market.marketId).to.not.be.null;
    } catch (error) {
      console.error("Error initializing market:", error);
      throw error;
    }
  });

  it("Buys YES shares", async () => {
    // Ensure market is initialized first
    if (!marketPda) {
      await runInitializeMarket();
    }

    const buyAmount = 1 * LAMPORTS_PER_SOL;
    const buyerTokenAccount = await createAccount(
      provider.connection,
      buyer,
      yesMint,
      buyer.publicKey
    );

    const marketBefore = await program.account.market.fetch(marketPda);
    const reserveYesBefore = marketBefore.reserveYes.toNumber();
    const reserveNoBefore = marketBefore.reserveNo.toNumber();

    const tx = await program.methods
      .buyShares({ yes: {} }, new anchor.BN(buyAmount))
      .accounts({
        market: marketPda,
        buyer: buyer.publicKey,
        yesMint: yesMint,
        noMint: noMint,
        buyerTokenAccount: buyerTokenAccount,
        poolYesAccount: poolYesAccount,
        poolVault: poolVaultPda,
        poolAuthority: poolAuthorityPda,
        tokenProgram: TOKEN_PROGRAM_ID,
      })
      .signers([buyer])
      .rpc();

    console.log("Buy YES shares transaction:", tx);

    const marketAfter = await program.account.market.fetch(marketPda);
    const reserveYesAfter = marketAfter.reserveYes.toNumber();
    const reserveNoAfter = marketAfter.reserveNo.toNumber();

    // Verify reserves changed correctly (YES reserve decreased, NO reserve increased)
    expect(reserveYesAfter).to.be.lessThan(reserveYesBefore);
    expect(reserveNoAfter).to.be.greaterThan(reserveNoBefore);

    // Verify buyer received tokens
    const buyerTokenBalance = await getAccount(provider.connection, buyerTokenAccount);
    expect(buyerTokenBalance.amount).to.be.greaterThan(0);
  });

  it("Buys NO shares", async () => {
    // Ensure market is initialized first
    if (!marketPda) {
      await runInitializeMarket();
    }

    const buyAmount = 1 * LAMPORTS_PER_SOL;
    const buyerTokenAccount = await createAccount(
      provider.connection,
      buyer,
      noMint,
      buyer.publicKey
    );

    const marketBefore = await program.account.market.fetch(marketPda);
    const reserveYesBefore = marketBefore.reserveYes.toNumber();
    const reserveNoBefore = marketBefore.reserveNo.toNumber();

    const tx = await program.methods
      .buyShares({ no: {} }, new anchor.BN(buyAmount))
      .accounts({
        market: marketPda,
        buyer: buyer.publicKey,
        yesMint: yesMint,
        noMint: noMint,
        buyerTokenAccount: buyerTokenAccount,
        poolYesAccount: poolYesAccount,
        poolVault: poolVaultPda,
        poolAuthority: poolAuthorityPda,
        tokenProgram: TOKEN_PROGRAM_ID,
      })
      .signers([buyer])
      .rpc();

    console.log("Buy NO shares transaction:", tx);

    const marketAfter = await program.account.market.fetch(marketPda);
    const reserveYesAfter = marketAfter.reserveYes.toNumber();
    const reserveNoAfter = marketAfter.reserveNo.toNumber();

    // Verify reserves changed correctly (NO reserve decreased, YES reserve increased)
    expect(reserveNoAfter).to.be.lessThan(reserveNoBefore);
    expect(reserveYesAfter).to.be.greaterThan(reserveYesBefore);

    // Verify buyer received tokens
    const buyerTokenBalance = await getAccount(provider.connection, buyerTokenAccount);
    expect(buyerTokenBalance.amount).to.be.greaterThan(0);
  });

  it("Sells YES shares", async () => {
    // Ensure market is initialized and buyer has tokens
    if (!marketPda) {
      await runInitializeMarket();
    }

    // First buy some YES shares
    const buyAmount = 1 * LAMPORTS_PER_SOL;
    const buyerTokenAccount = await createAccount(
      provider.connection,
      buyer,
      yesMint,
      buyer.publicKey
    );

    await program.methods
      .buyShares({ yes: {} }, new anchor.BN(buyAmount))
      .accounts({
        market: marketPda,
        buyer: buyer.publicKey,
        yesMint: yesMint,
        noMint: noMint,
        buyerTokenAccount: buyerTokenAccount,
        poolYesAccount: poolYesAccount,
        poolVault: poolVaultPda,
        poolAuthority: poolAuthorityPda,
        tokenProgram: TOKEN_PROGRAM_ID,
      })
      .signers([buyer])
      .rpc();

    const buyerTokenBalanceBefore = await getAccount(provider.connection, buyerTokenAccount);
    const sharesToSell = buyerTokenBalanceBefore.amount / BigInt(2); // Sell half

    const marketBefore = await program.account.market.fetch(marketPda);
    const reserveYesBefore = marketBefore.reserveYes.toNumber();
    const reserveNoBefore = marketBefore.reserveNo.toNumber();

    const tx = await program.methods
      .sellShares({ yes: {} }, new anchor.BN(sharesToSell.toString()))
      .accounts({
        market: marketPda,
        seller: buyer.publicKey,
        yesMint: yesMint,
        noMint: noMint,
        sellerTokenAccount: buyerTokenAccount,
        poolYesAccount: poolYesAccount,
        poolVault: poolVaultPda,
        poolAuthority: poolAuthorityPda,
        tokenProgram: TOKEN_PROGRAM_ID,
      })
      .signers([buyer])
      .rpc();

    console.log("Sell YES shares transaction:", tx);

    const marketAfter = await program.account.market.fetch(marketPda);
    const reserveYesAfter = marketAfter.reserveYes.toNumber();
    const reserveNoAfter = marketAfter.reserveNo.toNumber();

    // Verify reserves changed correctly (YES reserve increased, NO reserve decreased)
    expect(reserveYesAfter).to.be.greaterThan(reserveYesBefore);
    expect(reserveNoAfter).to.be.lessThan(reserveNoBefore);

    // Verify seller's tokens were burned
    const buyerTokenBalanceAfter = await getAccount(provider.connection, buyerTokenAccount);
    expect(buyerTokenBalanceAfter.amount).to.be.lessThan(buyerTokenBalanceBefore.amount);
  });

  it("Resolves market", async () => {
    // Ensure market is initialized first
    if (!marketPda) {
      await runInitializeMarket();
    }

    const tx = await program.methods
      .resolveMarket({ yes: {} })
      .accounts({
        market: marketPda,
        authority: authority.publicKey,
      })
      .signers([authority])
      .rpc();

    console.log("Resolve market transaction:", tx);

    const market = await program.account.market.fetch(marketPda);
    expect(market.state.resolved).to.not.be.undefined;
    expect(market.outcome).to.not.be.null;
    expect(market.outcome?.yes).to.not.be.undefined;
  });

  // Helper function to initialize market
  async function runInitializeMarket() {
    [marketPda] = PublicKey.findProgramAddressSync(
      [
        Buffer.from("market"),
        agent.publicKey.toBuffer(),
        Buffer.from(statement),
      ],
      program.programId
    );

    [poolAuthorityPda] = PublicKey.findProgramAddressSync(
      [Buffer.from("pool_authority"), marketPda.toBuffer()],
      program.programId
    );

    [poolVaultPda] = PublicKey.findProgramAddressSync(
      [Buffer.from("pool_vault"), marketPda.toBuffer()],
      program.programId
    );

    yesMint = await createMint(
      provider.connection,
      authority,
      poolAuthorityPda,
      null,
      0
    );

    noMint = await createMint(
      provider.connection,
      authority,
      poolAuthorityPda,
      null,
      0
    );

    poolYesAccount = await createAccount(
      provider.connection,
      authority,
      yesMint,
      poolAuthorityPda
    );

    poolNoAccount = await createAccount(
      provider.connection,
      authority,
      noMint,
      poolAuthorityPda
    );

    await program.methods
      .initializeMarket(statement, new anchor.BN(closesAt), new anchor.BN(initialLiquidity), feeBps)
      .accounts({
        market: marketPda,
        agent: agent.publicKey,
        yesMint: yesMint,
        noMint: noMint,
        poolYesAccount: poolYesAccount,
        poolNoAccount: poolNoAccount,
        poolVault: poolVaultPda,
        poolAuthority: poolAuthorityPda,
        authority: authority.publicKey,
        tokenProgram: TOKEN_PROGRAM_ID,
        systemProgram: SystemProgram.programId,
        rent: anchor.web3.SYSVAR_RENT_PUBKEY,
      })
      .signers([authority])
      .rpc();
  }
});
