use anchor_lang::prelude::*;
use anchor_spl::token::{self, Mint, Token, TokenAccount, MintTo, Burn};
use anchor_lang::solana_program::hash::hash;

declare_id!("FiPoWJW4Rvmk6iqteDQghKCk97sGCb6zhnuAqwhQ314Y");

#[program]
pub mod prediction_market {
    use super::*;

    pub fn initialize_market(
        ctx: Context<InitializeMarket>,
        statement: String,
        closes_at: i64,
        initial_liquidity: u64,
        fee_bps: u16,
    ) -> Result<()> {
        let clock = Clock::get()?;

        // Validate inputs
        require!(
            statement.len() <= 256,
            ErrorCode::StatementTooLong
        );
        require!(
            closes_at > clock.unix_timestamp,
            ErrorCode::InvalidCloseTime
        );
        require!(
            fee_bps <= 10000,
            ErrorCode::InvalidFee
        );
        require!(
            initial_liquidity > 0,
            ErrorCode::InvalidAmount
        );

        // Get market key and pool authority bump before mutable borrow
        let market_key = ctx.accounts.market.key();
        let (_, pool_authority_bump) = Pubkey::find_program_address(
            &[b"pool_authority", market_key.as_ref()],
            ctx.program_id,
        );

        // Generate market_id from statement hash (sha256)
        let statement_hash = hash(statement.as_bytes());
        let market_id: [u8; 32] = statement_hash.to_bytes();

        // Initialize market
        let market = &mut ctx.accounts.market;
        market.authority = ctx.accounts.authority.key();
        market.agent = ctx.accounts.agent.key();
        market.market_id = market_id;
        market.statement = statement.clone();
        market.closes_at = closes_at;
        market.reserve_yes = initial_liquidity;
        market.reserve_no = initial_liquidity;
        market.fee_bps = fee_bps;
        market.yes_mint = ctx.accounts.yes_mint.key();
        market.no_mint = ctx.accounts.no_mint.key();
        market.pool_yes_account = ctx.accounts.pool_yes_account.key();
        market.pool_no_account = ctx.accounts.pool_no_account.key();
        market.pool_vault = ctx.accounts.pool_vault.key();
        market.pool_authority = ctx.accounts.pool_authority.key();
        market.state = MarketState::Active;
        market.outcome = None;
        market.bump = pool_authority_bump;

        // Mint initial liquidity to pool accounts
        let seeds = &[
            b"pool_authority",
            market_key.as_ref(),
            &[pool_authority_bump],
        ];
        let signer = &[&seeds[..]];

        // Mint YES tokens
        let cpi_accounts = MintTo {
            mint: ctx.accounts.yes_mint.to_account_info(),
            to: ctx.accounts.pool_yes_account.to_account_info(),
            authority: ctx.accounts.pool_authority.to_account_info(),
        };
        let cpi_program = ctx.accounts.token_program.to_account_info();
        let cpi_ctx = CpiContext::new_with_signer(cpi_program, cpi_accounts, signer);
        token::mint_to(cpi_ctx, initial_liquidity)?;

        // Mint NO tokens
        let cpi_accounts = MintTo {
            mint: ctx.accounts.no_mint.to_account_info(),
            to: ctx.accounts.pool_no_account.to_account_info(),
            authority: ctx.accounts.pool_authority.to_account_info(),
        };
        let cpi_program = ctx.accounts.token_program.to_account_info();
        let cpi_ctx = CpiContext::new_with_signer(cpi_program, cpi_accounts, signer);
        token::mint_to(cpi_ctx, initial_liquidity)?;

        // Transfer initial liquidity SOL to pool vault
        anchor_lang::solana_program::program::invoke(
            &anchor_lang::solana_program::system_instruction::transfer(
                ctx.accounts.authority.key,
                ctx.accounts.pool_vault.key,
                initial_liquidity * 2, // Total liquidity for both sides
            ),
            &[
                ctx.accounts.authority.to_account_info(),
                ctx.accounts.pool_vault.to_account_info(),
            ],
        )?;

        emit!(MarketCreated {
            market: market.key(),
            agent: market.agent,
            statement: market.statement.clone(),
            closes_at: market.closes_at,
            initial_liquidity,
        });

        Ok(())
    }

    pub fn buy_shares(
        ctx: Context<BuyShares>,
        side: Side,
        amount: u64,
    ) -> Result<u64> {
        let market = &mut ctx.accounts.market;
        
        // Validate market is active
        require!(
            market.state == MarketState::Active,
            ErrorCode::MarketNotActive
        );

        require!(
            amount > 0,
            ErrorCode::InvalidAmount
        );

        // Calculate fee
        let fee = amount
            .checked_mul(market.fee_bps as u64)
            .and_then(|x| x.checked_div(10000))
            .ok_or(ErrorCode::MathOverflow)?;
        
        let amount_after_fee = amount
            .checked_sub(fee)
            .ok_or(ErrorCode::MathOverflow)?;

        // Calculate shares using CPMM formula
        let shares = match side {
            Side::Yes => {
                // shares = (amount_after_fee * reserve_yes) / (reserve_no + amount_after_fee)
                let numerator = amount_after_fee
                    .checked_mul(market.reserve_yes)
                    .ok_or(ErrorCode::MathOverflow)?;
                let denominator = market.reserve_no
                    .checked_add(amount_after_fee)
                    .ok_or(ErrorCode::MathOverflow)?;
                numerator
                    .checked_div(denominator)
                    .ok_or(ErrorCode::MathOverflow)?
            }
            Side::No => {
                // shares = (amount_after_fee * reserve_no) / (reserve_yes + amount_after_fee)
                let numerator = amount_after_fee
                    .checked_mul(market.reserve_no)
                    .ok_or(ErrorCode::MathOverflow)?;
                let denominator = market.reserve_yes
                    .checked_add(amount_after_fee)
                    .ok_or(ErrorCode::MathOverflow)?;
                numerator
                    .checked_div(denominator)
                    .ok_or(ErrorCode::MathOverflow)?
            }
        };

        require!(
            shares > 0,
            ErrorCode::InvalidAmount
        );

        // Update reserves
        match side {
            Side::Yes => {
                market.reserve_yes = market.reserve_yes
                    .checked_add(amount_after_fee)
                    .ok_or(ErrorCode::MathOverflow)?;
                market.reserve_no = market.reserve_no
                    .checked_sub(shares)
                    .ok_or(ErrorCode::InsufficientReserves)?;
            }
            Side::No => {
                market.reserve_no = market.reserve_no
                    .checked_add(amount_after_fee)
                    .ok_or(ErrorCode::MathOverflow)?;
                market.reserve_yes = market.reserve_yes
                    .checked_sub(shares)
                    .ok_or(ErrorCode::InsufficientReserves)?;
            }
        }

        // Transfer SOL from buyer to pool vault
        anchor_lang::solana_program::program::invoke(
            &anchor_lang::solana_program::system_instruction::transfer(
                ctx.accounts.buyer.key,
                ctx.accounts.pool_vault.key,
                amount,
            ),
            &[
                ctx.accounts.buyer.to_account_info(),
                ctx.accounts.pool_vault.to_account_info(),
            ],
        )?;

        // Mint shares to buyer
        let mint = match side {
            Side::Yes => ctx.accounts.yes_mint.to_account_info(),
            Side::No => ctx.accounts.no_mint.to_account_info(),
        };

        let market_key = market.key();
        let (_, pool_authority_bump) = Pubkey::find_program_address(
            &[b"pool_authority", market_key.as_ref()],
            ctx.program_id,
        );

        let seeds = &[
            b"pool_authority",
            market_key.as_ref(),
            &[pool_authority_bump],
        ];
        let signer = &[&seeds[..]];

        let cpi_accounts = MintTo {
            mint,
            to: ctx.accounts.buyer_token_account.to_account_info(),
            authority: ctx.accounts.pool_authority.to_account_info(),
        };
        let cpi_program = ctx.accounts.token_program.to_account_info();
        let cpi_ctx = CpiContext::new_with_signer(cpi_program, cpi_accounts, signer);
        token::mint_to(cpi_ctx, shares)?;

        emit!(SharesBought {
            market: market.key(),
            buyer: ctx.accounts.buyer.key(),
            side: side as u8,
            amount,
            shares,
            new_reserve_yes: market.reserve_yes,
            new_reserve_no: market.reserve_no,
        });

        Ok(shares)
    }

    pub fn sell_shares(
        ctx: Context<SellShares>,
        side: Side,
        shares: u64,
    ) -> Result<u64> {
        let market = &mut ctx.accounts.market;
        
        // Validate market is active
        require!(
            market.state == MarketState::Active,
            ErrorCode::MarketNotActive
        );

        require!(
            shares > 0,
            ErrorCode::InvalidAmount
        );

        // Calculate SOL output using CPMM (inverse of buy)
        let sol_out = match side {
            Side::Yes => {
                // sol_out = (shares * reserve_no) / (reserve_yes + shares)
                let numerator = shares
                    .checked_mul(market.reserve_no)
                    .ok_or(ErrorCode::MathOverflow)?;
                let denominator = market.reserve_yes
                    .checked_add(shares)
                    .ok_or(ErrorCode::MathOverflow)?;
                numerator
                    .checked_div(denominator)
                    .ok_or(ErrorCode::MathOverflow)?
            }
            Side::No => {
                // sol_out = (shares * reserve_yes) / (reserve_no + shares)
                let numerator = shares
                    .checked_mul(market.reserve_yes)
                    .ok_or(ErrorCode::MathOverflow)?;
                let denominator = market.reserve_no
                    .checked_add(shares)
                    .ok_or(ErrorCode::MathOverflow)?;
                numerator
                    .checked_div(denominator)
                    .ok_or(ErrorCode::MathOverflow)?
            }
        };

        // Calculate fee on output
        let fee = sol_out
            .checked_mul(market.fee_bps as u64)
            .and_then(|x| x.checked_div(10000))
            .ok_or(ErrorCode::MathOverflow)?;
        
        let sol_out_after_fee = sol_out
            .checked_sub(fee)
            .ok_or(ErrorCode::MathOverflow)?;

        require!(
            sol_out_after_fee > 0,
            ErrorCode::InvalidAmount
        );

        // Update reserves
        match side {
            Side::Yes => {
                market.reserve_yes = market.reserve_yes
                    .checked_sub(shares)
                    .ok_or(ErrorCode::InsufficientReserves)?;
                market.reserve_no = market.reserve_no
                    .checked_sub(sol_out_after_fee)
                    .ok_or(ErrorCode::InsufficientReserves)?;
            }
            Side::No => {
                market.reserve_no = market.reserve_no
                    .checked_sub(shares)
                    .ok_or(ErrorCode::InsufficientReserves)?;
                market.reserve_yes = market.reserve_yes
                    .checked_sub(sol_out_after_fee)
                    .ok_or(ErrorCode::InsufficientReserves)?;
            }
        }

        // Burn shares from seller
        let mint = match side {
            Side::Yes => ctx.accounts.yes_mint.to_account_info(),
            Side::No => ctx.accounts.no_mint.to_account_info(),
        };

        let market_key = market.key();
        let (_, pool_authority_bump) = Pubkey::find_program_address(
            &[b"pool_authority", market_key.as_ref()],
            ctx.program_id,
        );

        let seeds = &[
            b"pool_authority",
            market_key.as_ref(),
            &[pool_authority_bump],
        ];
        let signer = &[&seeds[..]];

        let cpi_accounts = Burn {
            mint,
            from: ctx.accounts.seller_token_account.to_account_info(),
            authority: ctx.accounts.pool_authority.to_account_info(),
        };
        let cpi_program = ctx.accounts.token_program.to_account_info();
        let cpi_ctx = CpiContext::new_with_signer(cpi_program, cpi_accounts, signer);
        token::burn(cpi_ctx, shares)?;

        // Transfer SOL from pool vault to seller
        **ctx.accounts.pool_vault.to_account_info().try_borrow_mut_lamports()? -= sol_out_after_fee;
        **ctx.accounts.seller.to_account_info().try_borrow_mut_lamports()? += sol_out_after_fee;

        emit!(SharesSold {
            market: market.key(),
            seller: ctx.accounts.seller.key(),
            side: side as u8,
            shares,
            sol_out: sol_out_after_fee,
            new_reserve_yes: market.reserve_yes,
            new_reserve_no: market.reserve_no,
        });

        Ok(sol_out_after_fee)
    }

    pub fn resolve_market(
        ctx: Context<ResolveMarket>,
        outcome: MarketOutcome,
    ) -> Result<()> {
        let market = &mut ctx.accounts.market;

        // Validate authority
        require!(
            ctx.accounts.authority.key() == market.authority,
            ErrorCode::UnauthorizedResolution
        );

        // Validate market is active
        require!(
            market.state == MarketState::Active,
            ErrorCode::MarketNotActive
        );

        // Validate market not already resolved
        require!(
            market.outcome.is_none(),
            ErrorCode::MarketAlreadyResolved
        );

        // Set outcome and state
        market.outcome = Some(outcome);
        market.state = MarketState::Resolved;

        emit!(MarketResolved {
            market: market.key(),
            outcome: outcome as u8,
        });

        Ok(())
    }
}

#[derive(Accounts)]
pub struct InitializeMarket<'info> {
    #[account(
        init,
        payer = authority,
        space = 8 + Market::LEN
    )]
    pub market: Account<'info, Market>,
    
    /// CHECK: Agent account (not validated)
    pub agent: UncheckedAccount<'info>,
    
    #[account(
        seeds = [b"pool_authority", market.key().as_ref()],
        bump
    )]
    /// CHECK: Pool authority PDA
    pub pool_authority: UncheckedAccount<'info>,
    
    #[account(
        init,
        payer = authority,
        mint::decimals = 0,
        mint::authority = pool_authority,
    )]
    pub yes_mint: Account<'info, Mint>,
    
    #[account(
        init,
        payer = authority,
        mint::decimals = 0,
        mint::authority = pool_authority,
    )]
    pub no_mint: Account<'info, Mint>,
    
    #[account(
        init,
        payer = authority,
        token::mint = yes_mint,
        token::authority = pool_authority,
    )]
    pub pool_yes_account: Account<'info, TokenAccount>,
    
    #[account(
        init,
        payer = authority,
        token::mint = no_mint,
        token::authority = pool_authority,
    )]
    pub pool_no_account: Account<'info, TokenAccount>,
    
    #[account(
        init,
        payer = authority,
        space = 0,
        seeds = [b"pool_vault", market.key().as_ref()],
        bump
    )]
    /// CHECK: Pool vault PDA (holds SOL)
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
    
    /// CHECK: Yes mint
    pub yes_mint: UncheckedAccount<'info>,
    
    /// CHECK: No mint
    pub no_mint: UncheckedAccount<'info>,
    
    #[account(mut)]
    pub buyer_token_account: Account<'info, TokenAccount>,
    
    /// CHECK: Pool yes account
    pub pool_yes_account: UncheckedAccount<'info>,
    
    #[account(
        mut,
        seeds = [b"pool_vault", market.key().as_ref()],
        bump
    )]
    /// CHECK: Pool vault PDA (holds SOL)
    pub pool_vault: UncheckedAccount<'info>,
    
    #[account(
        seeds = [b"pool_authority", market.key().as_ref()],
        bump
    )]
    /// CHECK: Pool authority PDA
    pub pool_authority: UncheckedAccount<'info>,
    
    pub token_program: Program<'info, Token>,
}

#[derive(Accounts)]
pub struct SellShares<'info> {
    #[account(mut)]
    pub market: Account<'info, Market>,
    
    #[account(mut)]
    pub seller: Signer<'info>,
    
    /// CHECK: Yes mint
    pub yes_mint: UncheckedAccount<'info>,
    
    /// CHECK: No mint
    pub no_mint: UncheckedAccount<'info>,
    
    #[account(mut)]
    pub seller_token_account: Account<'info, TokenAccount>,
    
    /// CHECK: Pool yes account
    pub pool_yes_account: UncheckedAccount<'info>,
    
    #[account(
        mut,
        seeds = [b"pool_vault", market.key().as_ref()],
        bump
    )]
    /// CHECK: Pool vault PDA (holds SOL)
    pub pool_vault: UncheckedAccount<'info>,
    
    #[account(
        seeds = [b"pool_authority", market.key().as_ref()],
        bump
    )]
    /// CHECK: Pool authority PDA
    pub pool_authority: UncheckedAccount<'info>,
    
    pub token_program: Program<'info, Token>,
}

#[derive(Accounts)]
pub struct ResolveMarket<'info> {
    #[account(mut)]
    pub market: Account<'info, Market>,
    
    pub authority: Signer<'info>,
}

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
    pub const LEN: usize = 8 + // discriminator
        32 + // authority
        32 + // agent
        32 + // market_id
        4 + 256 + // statement (4 byte length + 256 chars max)
        8 + // closes_at
        8 + // reserve_yes
        8 + // reserve_no
        2 + // fee_bps
        32 + // yes_mint
        32 + // no_mint
        32 + // pool_yes_account
        32 + // pool_no_account
        32 + // pool_vault
        32 + // pool_authority
        1 + // state
        2 + // outcome Option (1 byte tag + 1 byte variant)
        1; // bump
}

#[derive(AnchorSerialize, AnchorDeserialize, Clone, Copy, PartialEq, Eq)]
pub enum Side {
    Yes = 0,
    No = 1,
}

#[derive(AnchorSerialize, AnchorDeserialize, Clone, Copy, PartialEq, Eq)]
pub enum MarketState {
    Active = 0,
    Resolved = 1,
    Frozen = 2,
}

#[derive(AnchorSerialize, AnchorDeserialize, Clone, Copy, PartialEq, Eq)]
pub enum MarketOutcome {
    Yes = 0,
    No = 1,
}

#[event]
pub struct MarketCreated {
    pub market: Pubkey,
    pub agent: Pubkey,
    pub statement: String,
    pub closes_at: i64,
    pub initial_liquidity: u64,
}

#[event]
pub struct MarketResolved {
    pub market: Pubkey,
    pub outcome: u8,
}

#[event]
pub struct SharesBought {
    pub market: Pubkey,
    pub buyer: Pubkey,
    pub side: u8,
    pub amount: u64,
    pub shares: u64,
    pub new_reserve_yes: u64,
    pub new_reserve_no: u64,
}

#[event]
pub struct SharesSold {
    pub market: Pubkey,
    pub seller: Pubkey,
    pub side: u8,
    pub shares: u64,
    pub sol_out: u64,
    pub new_reserve_yes: u64,
    pub new_reserve_no: u64,
}

#[error_code]
pub enum ErrorCode {
    #[msg("Market is not active")]
    MarketNotActive = 6000,
    #[msg("Market already resolved")]
    MarketAlreadyResolved = 6001,
    #[msg("Insufficient reserves")]
    InsufficientReserves = 6002,
    #[msg("Invalid amount")]
    InvalidAmount = 6003,
    #[msg("Math overflow")]
    MathOverflow = 6004,
    #[msg("Invalid outcome")]
    InvalidOutcome = 6005,
    #[msg("Unauthorized to resolve market")]
    UnauthorizedResolution = 6006,
    #[msg("Statement too long")]
    StatementTooLong = 6007,
    #[msg("Invalid close time")]
    InvalidCloseTime = 6008,
    #[msg("Invalid fee")]
    InvalidFee = 6009,
}

