use anchor_lang::prelude::*;
use anchor_lang::solana_program::hash::hash;
use anchor_spl::token::{self, Mint, MintTo, Token, TokenAccount, SetAuthority};
use anchor_spl::token::Burn;

declare_id!("4gLvyjTChD7X1BRv2Q2djtT9yuYqU3f5uK3biu6KKjph");

// Seeds
const MARKET_SEED: &[u8] = b"market";
const POOL_AUTHORITY_SEED: &[u8] = b"pool_authority";

// Constants
const MAX_STATEMENT_LEN: usize = 256;

#[program]
pub mod prediction_market {
    use super::*;

    /// Initialize a new prediction market
    pub fn initialize_market(
        ctx: Context<InitializeMarket>,
        statement: String,
        closes_at: i64,
        initial_liquidity: u64,
        fee_bps: u16,
    ) -> Result<()> {
        require!(
            statement.len() <= MAX_STATEMENT_LEN,
            PredictionMarketError::StatementTooLong
        );
        require!(
            closes_at > Clock::get()?.unix_timestamp,
            PredictionMarketError::InvalidCloseTime
        );
        require!(initial_liquidity > 0, PredictionMarketError::InvalidAmount);
        require!(fee_bps <= 10000, PredictionMarketError::InvalidFee);

        // Compute expected market PDA and verify
        let statement_hash = hash(statement.as_bytes());
        let (expected_market, market_bump) = Pubkey::find_program_address(
            &[
                MARKET_SEED,
                ctx.accounts.agent.key().as_ref(),
                statement_hash.as_ref(),
            ],
            ctx.program_id,
        );
        require_keys_eq!(
            ctx.accounts.market.key(),
            expected_market,
            PredictionMarketError::InvalidOutcome
        );

        // Verify pool_authority PDA
        let (expected_pool_authority, _pool_authority_bump) = Pubkey::find_program_address(
            &[POOL_AUTHORITY_SEED, expected_market.as_ref()],
            ctx.program_id,
        );
        require_keys_eq!(
            ctx.accounts.pool_authority.key(),
            expected_pool_authority,
            PredictionMarketError::InvalidOutcome
        );

        // Verify pool_vault PDA
        let (expected_pool_vault, _pool_vault_bump) = Pubkey::find_program_address(
            &[b"pool_vault", expected_market.as_ref()],
            ctx.program_id,
        );
        require_keys_eq!(
            ctx.accounts.pool_vault.key(),
            expected_pool_vault,
            PredictionMarketError::InvalidOutcome
        );

        let market = &mut ctx.accounts.market;

        // Set market data
        market.authority = ctx.accounts.authority.key();
        market.agent = ctx.accounts.agent.key();
        market.statement = statement.clone();
        market.closes_at = closes_at;
        market.fee_bps = fee_bps;
        market.yes_mint = ctx.accounts.yes_mint.key();
        market.no_mint = ctx.accounts.no_mint.key();
        market.pool_yes_account = ctx.accounts.pool_yes_account.key();
        market.pool_no_account = ctx.accounts.pool_no_account.key();
        market.pool_vault = ctx.accounts.pool_vault.key();
        market.pool_authority = ctx.accounts.pool_authority.key();
        // Store market bump seed
        market.bump = market_bump;
        
        market.state = MarketState::Active;
        market.outcome = None;

        // Set market_id to the market PDA address
        market.market_id = market.key().to_bytes();

        // Transfer mint and token account authorities from authority to pool_authority PDA

        // Transfer YES mint authority
        token::set_authority(
            CpiContext::new(
                ctx.accounts.token_program.to_account_info(),
                SetAuthority {
                    current_authority: ctx.accounts.authority.to_account_info(),
                    account_or_mint: ctx.accounts.yes_mint.to_account_info(),
                },
            ),
            anchor_spl::token::spl_token::instruction::AuthorityType::MintTokens,
            Some(ctx.accounts.pool_authority.key()),
        )?;

        // Transfer NO mint authority
        token::set_authority(
            CpiContext::new(
                ctx.accounts.token_program.to_account_info(),
                SetAuthority {
                    current_authority: ctx.accounts.authority.to_account_info(),
                    account_or_mint: ctx.accounts.no_mint.to_account_info(),
                },
            ),
            anchor_spl::token::spl_token::instruction::AuthorityType::MintTokens,
            Some(ctx.accounts.pool_authority.key()),
        )?;

        // Transfer token account authorities to pool_authority PDA
        token::set_authority(
            CpiContext::new(
                ctx.accounts.token_program.to_account_info(),
                SetAuthority {
                    current_authority: ctx.accounts.authority.to_account_info(),
                    account_or_mint: ctx.accounts.pool_yes_account.to_account_info(),
                },
            ),
            anchor_spl::token::spl_token::instruction::AuthorityType::AccountOwner,
            Some(ctx.accounts.pool_authority.key()),
        )?;

        token::set_authority(
            CpiContext::new(
                ctx.accounts.token_program.to_account_info(),
                SetAuthority {
                    current_authority: ctx.accounts.authority.to_account_info(),
                    account_or_mint: ctx.accounts.pool_no_account.to_account_info(),
                },
            ),
            anchor_spl::token::spl_token::instruction::AuthorityType::AccountOwner,
            Some(ctx.accounts.pool_authority.key()),
        )?;

        // Initialize reserves with half/half split
        let half_liquidity = initial_liquidity
            .checked_div(2)
            .ok_or(PredictionMarketError::MathOverflow)?;
        market.reserve_yes = half_liquidity;
        market.reserve_no = half_liquidity;

        // Transfer initial liquidity to pool vault (PDA system account)
        // (No signer needed for direct lamport transfer)

        // Transfer SOL to pool vault PDA
        **ctx.accounts.pool_vault.to_account_info().try_borrow_mut_lamports()? +=
            initial_liquidity;
        **ctx.accounts.authority.to_account_info().try_borrow_mut_lamports()? -=
            initial_liquidity;

        emit!(MarketCreated {
            market: market.key(),
            agent: market.agent,
            statement: market.statement.clone(),
            closes_at: market.closes_at,
            initial_liquidity,
        });

        Ok(())
    }

    /// Buy YES or NO shares
    pub fn buy_shares(
        ctx: Context<BuyShares>,
        side: Side,
        amount: u64,
    ) -> Result<u64> {
        let market = &mut ctx.accounts.market;
        require!(
            market.state == MarketState::Active,
            PredictionMarketError::MarketNotActive
        );
        require!(amount > 0, PredictionMarketError::InvalidAmount);

        // Calculate shares using CPMM
        let (shares_out, new_reserve_yes, new_reserve_no) =
            calculate_buy_shares(side, amount, market.reserve_yes, market.reserve_no, market.fee_bps)?;

        require!(shares_out > 0, PredictionMarketError::InsufficientReserves);

        // Transfer SOL from buyer to pool vault
        **ctx.accounts.buyer.to_account_info().try_borrow_mut_lamports()? -= amount;
        **ctx.accounts.pool_vault.to_account_info().try_borrow_mut_lamports()? += amount;

        // Mint tokens to buyer
        // Compute pool_authority bump
        let market_key = market.key();
        let (_, pool_authority_bump) = Pubkey::find_program_address(
            &[POOL_AUTHORITY_SEED, market_key.as_ref()],
            ctx.program_id,
        );
        let pool_authority_seeds: &[&[u8]] = &[
            POOL_AUTHORITY_SEED,
            market_key.as_ref(),
            &[pool_authority_bump],
        ];
        let pool_authority_signer = &[&pool_authority_seeds[..]];

        let mint = match side {
            Side::Yes => &ctx.accounts.yes_mint,
            Side::No => &ctx.accounts.no_mint,
        };

        token::mint_to(
            CpiContext::new_with_signer(
                ctx.accounts.token_program.to_account_info(),
                MintTo {
                    mint: mint.to_account_info(),
                    to: ctx.accounts.buyer_token_account.to_account_info(),
                    authority: ctx.accounts.pool_authority.to_account_info(),
                },
                pool_authority_signer,
            ),
            shares_out,
        )?;

        // Update reserves
        market.reserve_yes = new_reserve_yes;
        market.reserve_no = new_reserve_no;

        emit!(SharesBought {
            market: market.key(),
            buyer: ctx.accounts.buyer.key(),
            side: match side {
                Side::Yes => 0,
                Side::No => 1,
            },
            amount,
            shares: shares_out,
            new_reserve_yes,
            new_reserve_no,
        });

        Ok(shares_out)
    }

    /// Sell YES or NO shares back to the pool
    pub fn sell_shares(
        ctx: Context<SellShares>,
        side: Side,
        shares: u64,
    ) -> Result<u64> {
        let market = &mut ctx.accounts.market;
        require!(
            market.state == MarketState::Active,
            PredictionMarketError::MarketNotActive
        );
        require!(shares > 0, PredictionMarketError::InvalidAmount);

        // Calculate SOL output using CPMM
        let (sol_out, new_reserve_yes, new_reserve_no) =
            calculate_sell_shares(side, shares, market.reserve_yes, market.reserve_no, market.fee_bps)?;

        require!(sol_out > 0, PredictionMarketError::InsufficientReserves);

        // Burn tokens from seller (seller is the authority for their own tokens)

        let mint = match side {
            Side::Yes => &ctx.accounts.yes_mint,
            Side::No => &ctx.accounts.no_mint,
        };

        token::burn(
            CpiContext::new_with_signer(
                ctx.accounts.token_program.to_account_info(),
                Burn {
                    mint: mint.to_account_info(),
                    from: ctx.accounts.seller_token_account.to_account_info(),
                    authority: ctx.accounts.seller.to_account_info(),
                },
                &[],
            ),
            shares,
        )?;

        // Transfer SOL from pool vault to seller
        **ctx.accounts.pool_vault.to_account_info().try_borrow_mut_lamports()? -=
            sol_out;
        **ctx.accounts.seller.to_account_info().try_borrow_mut_lamports()? += sol_out;

        // Update reserves
        market.reserve_yes = new_reserve_yes;
        market.reserve_no = new_reserve_no;

        emit!(SharesSold {
            market: market.key(),
            seller: ctx.accounts.seller.key(),
            side: match side {
                Side::Yes => 0,
                Side::No => 1,
            },
            shares,
            sol_out,
            new_reserve_yes,
            new_reserve_no,
        });

        Ok(sol_out)
    }

    /// Resolve the market with an outcome
    pub fn resolve_market(
        ctx: Context<ResolveMarket>,
        outcome: MarketOutcome,
    ) -> Result<()> {
        let market = &mut ctx.accounts.market;
        let clock = Clock::get()?;

        // Check if market can be resolved
        require!(
            market.state == MarketState::Active,
            PredictionMarketError::MarketNotActive
        );

        // Only authority can resolve before close time, anyone can resolve after
        if clock.unix_timestamp < market.closes_at {
            require_keys_eq!(
                market.authority,
                ctx.accounts.authority.key(),
                PredictionMarketError::UnauthorizedResolution
            );
        }

        let outcome_value = match outcome {
            MarketOutcome::Yes => 0,
            MarketOutcome::No => 1,
        };

        market.state = MarketState::Resolved;
        market.outcome = Some(outcome);

        emit!(MarketResolved {
            market: market.key(),
            outcome: outcome_value,
        });

        Ok(())
    }
}

// AMM Math Functions
fn calculate_buy_shares(
    side: Side,
    amount_in: u64,
    reserve_yes: u64,
    reserve_no: u64,
    fee_bps: u16,
) -> Result<(u64, u64, u64)> {
    // Apply fee: amount_after_fee = amount * (1 - fee_bps / 10000)
    let fee_amount = amount_in
        .checked_mul(fee_bps as u64)
        .and_then(|x| x.checked_div(10000))
        .ok_or(PredictionMarketError::MathOverflow)?;
    let amount_after_fee = amount_in
        .checked_sub(fee_amount)
        .ok_or(PredictionMarketError::MathOverflow)?;

    // Constant product: k = reserve_yes * reserve_no
    let k = reserve_yes
        .checked_mul(reserve_no)
        .ok_or(PredictionMarketError::MathOverflow)?;

    let (new_reserve_yes, new_reserve_no, shares_out) = match side {
        Side::Yes => {
            // Buying YES: add SOL to NO reserve, remove YES tokens
            let new_reserve_no = reserve_no
                .checked_add(amount_after_fee)
                .ok_or(PredictionMarketError::MathOverflow)?;
            let new_reserve_yes = k
                .checked_div(new_reserve_no)
                .ok_or(PredictionMarketError::MathOverflow)?;
            let shares_out = reserve_yes
                .checked_sub(new_reserve_yes)
                .ok_or(PredictionMarketError::MathOverflow)?;
            (new_reserve_yes, new_reserve_no, shares_out)
        }
        Side::No => {
            // Buying NO: add SOL to YES reserve, remove NO tokens
            let new_reserve_yes = reserve_yes
                .checked_add(amount_after_fee)
                .ok_or(PredictionMarketError::MathOverflow)?;
            let new_reserve_no = k
                .checked_div(new_reserve_yes)
                .ok_or(PredictionMarketError::MathOverflow)?;
            let shares_out = reserve_no
                .checked_sub(new_reserve_no)
                .ok_or(PredictionMarketError::MathOverflow)?;
            (new_reserve_yes, new_reserve_no, shares_out)
        }
    };

    Ok((shares_out, new_reserve_yes, new_reserve_no))
}

fn calculate_sell_shares(
    side: Side,
    shares_in: u64,
    reserve_yes: u64,
    reserve_no: u64,
    fee_bps: u16,
) -> Result<(u64, u64, u64)> {
    // Constant product: k = reserve_yes * reserve_no
    let k = reserve_yes
        .checked_mul(reserve_no)
        .ok_or(PredictionMarketError::MathOverflow)?;

    let (new_reserve_yes, new_reserve_no, sol_before_fee) = match side {
        Side::Yes => {
            // Selling YES: add YES tokens, remove SOL from NO reserve
            let new_reserve_yes = reserve_yes
                .checked_add(shares_in)
                .ok_or(PredictionMarketError::MathOverflow)?;
            let new_reserve_no = k
                .checked_div(new_reserve_yes)
                .ok_or(PredictionMarketError::MathOverflow)?;
            let sol_before_fee = reserve_no
                .checked_sub(new_reserve_no)
                .ok_or(PredictionMarketError::MathOverflow)?;
            (new_reserve_yes, new_reserve_no, sol_before_fee)
        }
        Side::No => {
            // Selling NO: add NO tokens, remove SOL from YES reserve
            let new_reserve_no = reserve_no
                .checked_add(shares_in)
                .ok_or(PredictionMarketError::MathOverflow)?;
            let new_reserve_yes = k
                .checked_div(new_reserve_no)
                .ok_or(PredictionMarketError::MathOverflow)?;
            let sol_before_fee = reserve_yes
                .checked_sub(new_reserve_yes)
                .ok_or(PredictionMarketError::MathOverflow)?;
            (new_reserve_yes, new_reserve_no, sol_before_fee)
        }
    };

    // Apply fee on output
    let fee_amount = sol_before_fee
        .checked_mul(fee_bps as u64)
        .and_then(|x| x.checked_div(10000))
        .ok_or(PredictionMarketError::MathOverflow)?;
    let sol_out = sol_before_fee
        .checked_sub(fee_amount)
        .ok_or(PredictionMarketError::MathOverflow)?;

    Ok((sol_out, new_reserve_yes, new_reserve_no))
}

// Account Contexts
#[derive(Accounts)]
pub struct InitializeMarket<'info> {
    #[account(
        init,
        payer = authority,
        space = 8 + Market::LEN
    )]
    pub market: Account<'info, Market>,
    /// CHECK: Agent from agent registry
    pub agent: UncheckedAccount<'info>,
    /// CHECK: Pool authority PDA (verified manually in instruction)
    pub pool_authority: UncheckedAccount<'info>,
    #[account(
        init,
        payer = authority,
        mint::decimals = 0,
        mint::authority = authority,
    )]
    pub yes_mint: Account<'info, Mint>,
    #[account(
        init,
        payer = authority,
        mint::decimals = 0,
        mint::authority = authority,
    )]
    pub no_mint: Account<'info, Mint>,
    #[account(
        init,
        payer = authority,
        token::mint = yes_mint,
        token::authority = authority,
    )]
    pub pool_yes_account: Account<'info, TokenAccount>,
    #[account(
        init,
        payer = authority,
        token::mint = no_mint,
        token::authority = authority,
    )]
    pub pool_no_account: Account<'info, TokenAccount>,
    /// CHECK: Pool vault PDA (system account to hold SOL reserves)
    pub pool_vault: UncheckedAccount<'info>,
    #[account(mut)]
    pub authority: Signer<'info>,
    pub token_program: Program<'info, Token>,
    pub system_program: Program<'info, System>,
    pub rent: Sysvar<'info, Rent>,
}

#[derive(Accounts)]
pub struct BuyShares<'info> {
    #[account(mut)]
    pub market: Account<'info, Market>,
    #[account(mut)]
    pub buyer: Signer<'info>,
    /// CHECK: YES or NO mint depending on side
    pub yes_mint: Account<'info, Mint>,
    /// CHECK: YES or NO mint depending on side
    pub no_mint: Account<'info, Mint>,
    #[account(mut)]
    pub buyer_token_account: Account<'info, TokenAccount>,
    #[account(mut)]
    pub pool_yes_account: Account<'info, TokenAccount>,
    /// CHECK: Pool vault PDA (system account holding SOL)
    #[account(
        mut,
        seeds = [b"pool_vault", market.key().as_ref()],
        bump
    )]
    pub pool_vault: UncheckedAccount<'info>,
    /// CHECK: Pool authority PDA
    #[account(
        seeds = [POOL_AUTHORITY_SEED, market.key().as_ref()],
        bump
    )]
    pub pool_authority: UncheckedAccount<'info>,
    pub token_program: Program<'info, Token>,
}

#[derive(Accounts)]
pub struct SellShares<'info> {
    #[account(mut)]
    pub market: Account<'info, Market>,
    #[account(mut)]
    pub seller: Signer<'info>,
    /// CHECK: YES or NO mint depending on side
    pub yes_mint: Account<'info, Mint>,
    /// CHECK: YES or NO mint depending on side
    pub no_mint: Account<'info, Mint>,
    #[account(mut)]
    pub seller_token_account: Account<'info, TokenAccount>,
    #[account(mut)]
    pub pool_yes_account: Account<'info, TokenAccount>,
    /// CHECK: Pool vault PDA (system account holding SOL)
    #[account(
        mut,
        seeds = [b"pool_vault", market.key().as_ref()],
        bump
    )]
    pub pool_vault: UncheckedAccount<'info>,
    /// CHECK: Pool authority PDA
    #[account(
        seeds = [POOL_AUTHORITY_SEED, market.key().as_ref()],
        bump
    )]
    pub pool_authority: UncheckedAccount<'info>,
    pub token_program: Program<'info, Token>,
}

#[derive(Accounts)]
pub struct ResolveMarket<'info> {
    #[account(mut)]
    pub market: Account<'info, Market>,
    pub authority: Signer<'info>,
}

// Account Structs
#[account]
pub struct Market {
    pub authority: Pubkey,
    pub agent: Pubkey,
    pub market_id: [u8; 32],
    pub statement: String,
    pub closes_at: i64,
    pub reserve_yes: u64,
    pub reserve_no: u64,
    pub fee_bps: u16,
    pub yes_mint: Pubkey,
    pub no_mint: Pubkey,
    pub pool_yes_account: Pubkey,
    pub pool_no_account: Pubkey,
    pub pool_vault: Pubkey,
    pub pool_authority: Pubkey,
    pub state: MarketState,
    pub outcome: Option<MarketOutcome>,
    pub bump: u8,
}

impl Market {
    pub const LEN: usize = 32 // authority
        + 32 // agent
        + 32 // market_id
        + 4 + MAX_STATEMENT_LEN // statement
        + 8 // closes_at
        + 8 // reserve_yes
        + 8 // reserve_no
        + 2 // fee_bps
        + 32 // yes_mint
        + 32 // no_mint
        + 32 // pool_yes_account
        + 32 // pool_no_account
        + 32 // pool_vault
        + 32 // pool_authority
        + 1 // state
        + 1 + 1 // outcome (Option<MarketOutcome>)
        + 1; // bump
}

#[derive(AnchorSerialize, AnchorDeserialize, Clone, PartialEq, Eq)]
pub enum MarketState {
    Active,
    Resolved,
    Frozen,
}

#[derive(AnchorSerialize, AnchorDeserialize, Clone, PartialEq, Eq)]
pub enum MarketOutcome {
    Yes,
    No,
}

#[derive(AnchorSerialize, AnchorDeserialize, Clone, Copy, PartialEq, Eq)]
pub enum Side {
    Yes,
    No,
}

// Events
#[event]
pub struct MarketCreated {
    pub market: Pubkey,
    pub agent: Pubkey,
    pub statement: String,
    pub closes_at: i64,
    pub initial_liquidity: u64,
}

#[event]
pub struct SharesBought {
    pub market: Pubkey,
    pub buyer: Pubkey,
    pub side: u8, // 0 = YES, 1 = NO
    pub amount: u64,
    pub shares: u64,
    pub new_reserve_yes: u64,
    pub new_reserve_no: u64,
}

#[event]
pub struct SharesSold {
    pub market: Pubkey,
    pub seller: Pubkey,
    pub side: u8, // 0 = YES, 1 = NO
    pub shares: u64,
    pub sol_out: u64,
    pub new_reserve_yes: u64,
    pub new_reserve_no: u64,
}

#[event]
pub struct MarketResolved {
    pub market: Pubkey,
    pub outcome: u8, // 0 = YES, 1 = NO
}

// Errors
#[error_code]
pub enum PredictionMarketError {
    #[msg("Market is not active")]
    MarketNotActive,
    #[msg("Market already resolved")]
    MarketAlreadyResolved,
    #[msg("Insufficient reserves")]
    InsufficientReserves,
    #[msg("Invalid amount")]
    InvalidAmount,
    #[msg("Math overflow")]
    MathOverflow,
    #[msg("Invalid outcome")]
    InvalidOutcome,
    #[msg("Unauthorized to resolve market")]
    UnauthorizedResolution,
    #[msg("Statement too long")]
    StatementTooLong,
    #[msg("Invalid close time")]
    InvalidCloseTime,
    #[msg("Invalid fee")]
    InvalidFee,
}
