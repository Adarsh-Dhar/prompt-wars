use anchor_lang::prelude::*;
use anchor_spl::token::{self, Mint, Token, TokenAccount, MintTo, Burn, Transfer};

declare_id!("66wZsPVBASArR5zZ77PpHACecUpyD3Jc97BcKq2aUy9m");

#[program]
pub mod prediction_market {
    use super::*;

    pub fn initialize_market(
        ctx: Context<InitializeMarket>,
        question: String,
        end_time: i64,
        market_id: u64,
        bump: u8,
    ) -> Result<()> {
        let market = &mut ctx.accounts.market;
        
        require!(question.len() <= 200, ErrorCode::QuestionTooLong);
        require!(end_time > Clock::get()?.unix_timestamp, ErrorCode::InvalidEndTime);

        market.authority = ctx.accounts.authority.key();
        market.market_id = market_id;
        market.question = question;
        market.yes_mint = ctx.accounts.yes_mint.key();
        market.no_mint = ctx.accounts.no_mint.key();
        market.collateral_vault = ctx.accounts.collateral_vault.key();
        market.end_time = end_time;
        market.is_resolved = false;
        market.winning_outcome = None;
        market.total_yes_supply = 0;
        market.total_no_supply = 0;
        market.bump = bump;

        Ok(())
    }

    pub fn buy_tokens(
        ctx: Context<BuyTokens>,
        amount: u64,
        outcome: Outcome,
    ) -> Result<()> {
        let market = &mut ctx.accounts.market;
        
        require!(!market.is_resolved, ErrorCode::MarketResolved);
        require!(
            Clock::get()?.unix_timestamp < market.end_time,
            ErrorCode::MarketEnded
        );
        require!(amount > 0, ErrorCode::InvalidAmount);

        // Transfer collateral from user to vault
        let cpi_accounts = Transfer {
            from: ctx.accounts.user_collateral.to_account_info(),
            to: ctx.accounts.collateral_vault.to_account_info(),
            authority: ctx.accounts.user.to_account_info(),
        };
        let cpi_program = ctx.accounts.token_program.to_account_info();
        let cpi_ctx = CpiContext::new(cpi_program, cpi_accounts);
        token::transfer(cpi_ctx, amount)?;

        // Mint outcome tokens to user
        let seeds = &[
            b"market".as_ref(),
            market.authority.as_ref(),
            &market.market_id.to_le_bytes(),
            &[market.bump],
        ];
        let signer = &[&seeds[..]];

        match outcome {
            Outcome::Yes => {
                let cpi_accounts = MintTo {
                    mint: ctx.accounts.yes_mint.to_account_info(),
                    to: ctx.accounts.user_yes_account.to_account_info(),
                    authority: market.to_account_info(),
                };
                let cpi_program = ctx.accounts.token_program.to_account_info();
                let cpi_ctx = CpiContext::new_with_signer(cpi_program, cpi_accounts, signer);
                token::mint_to(cpi_ctx, amount)?;
                market.total_yes_supply += amount;
            }
            Outcome::No => {
                let cpi_accounts = MintTo {
                    mint: ctx.accounts.no_mint.to_account_info(),
                    to: ctx.accounts.user_no_account.to_account_info(),
                    authority: market.to_account_info(),
                };
                let cpi_program = ctx.accounts.token_program.to_account_info();
                let cpi_ctx = CpiContext::new_with_signer(cpi_program, cpi_accounts, signer);
                token::mint_to(cpi_ctx, amount)?;
                market.total_no_supply += amount;
            }
        }

        emit!(TokensPurchased {
            user: ctx.accounts.user.key(),
            outcome,
            amount,
        });

        Ok(())
    }

    pub fn sell_tokens(
        ctx: Context<SellTokens>,
        amount: u64,
        outcome: Outcome,
    ) -> Result<()> {
        let market = &mut ctx.accounts.market;
        
        require!(!market.is_resolved, ErrorCode::MarketResolved);
        require!(
            Clock::get()?.unix_timestamp < market.end_time,
            ErrorCode::MarketEnded
        );
        require!(amount > 0, ErrorCode::InvalidAmount);

        // Burn outcome tokens from user
        match outcome {
            Outcome::Yes => {
                let cpi_accounts = Burn {
                    mint: ctx.accounts.yes_mint.to_account_info(),
                    from: ctx.accounts.user_yes_account.to_account_info(),
                    authority: ctx.accounts.user.to_account_info(),
                };
                let cpi_program = ctx.accounts.token_program.to_account_info();
                let cpi_ctx = CpiContext::new(cpi_program, cpi_accounts);
                token::burn(cpi_ctx, amount)?;
                market.total_yes_supply -= amount;
            }
            Outcome::No => {
                let cpi_accounts = Burn {
                    mint: ctx.accounts.no_mint.to_account_info(),
                    from: ctx.accounts.user_no_account.to_account_info(),
                    authority: ctx.accounts.user.to_account_info(),
                };
                let cpi_program = ctx.accounts.token_program.to_account_info();
                let cpi_ctx = CpiContext::new(cpi_program, cpi_accounts);
                token::burn(cpi_ctx, amount)?;
                market.total_no_supply -= amount;
            }
        }

        // Transfer collateral from vault to user
        let seeds = &[
            b"market".as_ref(),
            market.authority.as_ref(),
            &market.market_id.to_le_bytes(),
            &[market.bump],
        ];
        let signer = &[&seeds[..]];

        let cpi_accounts = Transfer {
            from: ctx.accounts.collateral_vault.to_account_info(),
            to: ctx.accounts.user_collateral.to_account_info(),
            authority: market.to_account_info(),
        };
        let cpi_program = ctx.accounts.token_program.to_account_info();
        let cpi_ctx = CpiContext::new_with_signer(cpi_program, cpi_accounts, signer);
        token::transfer(cpi_ctx, amount)?;

        emit!(TokensSold {
            user: ctx.accounts.user.key(),
            outcome,
            amount,
        });

        Ok(())
    }

    pub fn resolve_market(
        ctx: Context<ResolveMarket>,
        winning_outcome: Outcome,
    ) -> Result<()> {
        let market = &mut ctx.accounts.market;
        
        require!(!market.is_resolved, ErrorCode::MarketAlreadyResolved);
        require!(
            Clock::get()?.unix_timestamp >= market.end_time,
            ErrorCode::MarketNotEnded
        );
        require!(
            ctx.accounts.authority.key() == market.authority,
            ErrorCode::Unauthorized
        );

        market.is_resolved = true;
        market.winning_outcome = Some(winning_outcome);

        emit!(MarketResolved {
            market: market.key(),
            winning_outcome,
        });

        Ok(())
    }

    pub fn claim_winnings(ctx: Context<ClaimWinnings>, amount: u64) -> Result<()> {
        let market = &ctx.accounts.market;
        
        require!(market.is_resolved, ErrorCode::MarketNotResolved);
        require!(amount > 0, ErrorCode::InvalidAmount);

        let winning_outcome = market.winning_outcome.unwrap();

        // Burn winning tokens
        match winning_outcome {
            Outcome::Yes => {
                let cpi_accounts = Burn {
                    mint: ctx.accounts.yes_mint.to_account_info(),
                    from: ctx.accounts.user_yes_account.to_account_info(),
                    authority: ctx.accounts.user.to_account_info(),
                };
                let cpi_program = ctx.accounts.token_program.to_account_info();
                let cpi_ctx = CpiContext::new(cpi_program, cpi_accounts);
                token::burn(cpi_ctx, amount)?;
            }
            Outcome::No => {
                let cpi_accounts = Burn {
                    mint: ctx.accounts.no_mint.to_account_info(),
                    from: ctx.accounts.user_no_account.to_account_info(),
                    authority: ctx.accounts.user.to_account_info(),
                };
                let cpi_program = ctx.accounts.token_program.to_account_info();
                let cpi_ctx = CpiContext::new(cpi_program, cpi_accounts);
                token::burn(cpi_ctx, amount)?;
            }
        }

        // Transfer collateral to winner
        let seeds = &[
            b"market".as_ref(),
            market.authority.as_ref(),
            &market.market_id.to_le_bytes(),
            &[market.bump],
        ];
        let signer = &[&seeds[..]];

        let cpi_accounts = Transfer {
            from: ctx.accounts.collateral_vault.to_account_info(),
            to: ctx.accounts.user_collateral.to_account_info(),
            authority: market.to_account_info(),
        };
        let cpi_program = ctx.accounts.token_program.to_account_info();
        let cpi_ctx = CpiContext::new_with_signer(cpi_program, cpi_accounts, signer);
        token::transfer(cpi_ctx, amount)?;

        emit!(WinningsClaimed {
            user: ctx.accounts.user.key(),
            amount,
        });

        Ok(())
    }
}

#[derive(Accounts)]
#[instruction(question: String, end_time: i64, market_id: u64, bump: u8)]
pub struct InitializeMarket<'info> {
    #[account(
        init,
        payer = authority,
        space = 8 + Market::LEN,
        seeds = [b"market", authority.key().as_ref(), &market_id.to_le_bytes()],
        bump
    )]
    pub market: Account<'info, Market>,
    
    #[account(
        init,
        payer = authority,
        mint::decimals = 9,
        mint::authority = market,
    )]
    pub yes_mint: Account<'info, Mint>,
    
    #[account(
        init,
        payer = authority,
        mint::decimals = 9,
        mint::authority = market,
    )]
    pub no_mint: Account<'info, Mint>,
    
    #[account(
        init,
        payer = authority,
        token::mint = collateral_mint,
        token::authority = market,
    )]
    pub collateral_vault: Account<'info, TokenAccount>,
    
    pub collateral_mint: Account<'info, Mint>,
    
    #[account(mut)]
    pub authority: Signer<'info>,
    
    pub system_program: Program<'info, System>,
    pub token_program: Program<'info, Token>,
    pub rent: Sysvar<'info, Rent>,
}

#[derive(Accounts)]
#[instruction(amount: u64, outcome: Outcome)]
pub struct BuyTokens<'info> {
    #[account(
        mut,
        seeds = [b"market", market.authority.as_ref(), &market.market_id.to_le_bytes()],
        bump = market.bump,
    )]
    pub market: Account<'info, Market>,
    
    #[account(mut)]
    pub yes_mint: Account<'info, Mint>,
    
    #[account(mut)]
    pub no_mint: Account<'info, Mint>,
    
    #[account(mut)]
    pub collateral_vault: Account<'info, TokenAccount>,
    
    #[account(mut)]
    pub user_collateral: Account<'info, TokenAccount>,
    
    #[account(mut)]
    pub user_yes_account: Account<'info, TokenAccount>,
    
    #[account(mut)]
    pub user_no_account: Account<'info, TokenAccount>,
    
    pub user: Signer<'info>,
    pub token_program: Program<'info, Token>,
}

#[derive(Accounts)]
#[instruction(amount: u64, outcome: Outcome)]
pub struct SellTokens<'info> {
    #[account(
        mut,
        seeds = [b"market", market.authority.as_ref(), &market.market_id.to_le_bytes()],
        bump = market.bump,
    )]
    pub market: Account<'info, Market>,
    
    #[account(mut)]
    pub yes_mint: Account<'info, Mint>,
    
    #[account(mut)]
    pub no_mint: Account<'info, Mint>,
    
    #[account(mut)]
    pub collateral_vault: Account<'info, TokenAccount>,
    
    #[account(mut)]
    pub user_collateral: Account<'info, TokenAccount>,
    
    #[account(mut)]
    pub user_yes_account: Account<'info, TokenAccount>,
    
    #[account(mut)]
    pub user_no_account: Account<'info, TokenAccount>,
    
    pub user: Signer<'info>,
    pub token_program: Program<'info, Token>,
}

#[derive(Accounts)]
#[instruction(winning_outcome: Outcome)]
pub struct ResolveMarket<'info> {
    #[account(
        mut,
        seeds = [b"market", market.authority.as_ref(), &market.market_id.to_le_bytes()],
        bump = market.bump,
    )]
    pub market: Account<'info, Market>,
    
    pub authority: Signer<'info>,
}

#[derive(Accounts)]
#[instruction(amount: u64)]
pub struct ClaimWinnings<'info> {
    #[account(
        seeds = [b"market", market.authority.as_ref(), &market.market_id.to_le_bytes()],
        bump = market.bump,
    )]
    pub market: Account<'info, Market>,
    
    #[account(mut)]
    pub yes_mint: Account<'info, Mint>,
    
    #[account(mut)]
    pub no_mint: Account<'info, Mint>,
    
    #[account(mut)]
    pub collateral_vault: Account<'info, TokenAccount>,
    
    #[account(mut)]
    pub user_collateral: Account<'info, TokenAccount>,
    
    #[account(mut)]
    pub user_yes_account: Account<'info, TokenAccount>,
    
    #[account(mut)]
    pub user_no_account: Account<'info, TokenAccount>,
    
    pub user: Signer<'info>,
    pub token_program: Program<'info, Token>,
}

#[account]
pub struct Market {
    pub authority: Pubkey,
    pub market_id: u64,
    pub question: String,
    pub yes_mint: Pubkey,
    pub no_mint: Pubkey,
    pub collateral_vault: Pubkey,
    pub end_time: i64,
    pub is_resolved: bool,
    pub winning_outcome: Option<Outcome>,
    pub total_yes_supply: u64,
    pub total_no_supply: u64,
    pub bump: u8,
}

impl Market {
    pub const LEN: usize = 32 + // authority
        8 + // market_id
        (4 + 200) + // question (max 200 chars)
        32 + // yes_mint
        32 + // no_mint
        32 + // collateral_vault
        8 + // end_time
        1 + // is_resolved
        (1 + 1) + // winning_outcome (Option<Outcome>)
        8 + // total_yes_supply
        8 + // total_no_supply
        1; // bump
}

#[derive(AnchorSerialize, AnchorDeserialize, Clone, Copy, PartialEq, Eq)]
pub enum Outcome {
    Yes,
    No,
}

#[event]
pub struct TokensPurchased {
    pub user: Pubkey,
    pub outcome: Outcome,
    pub amount: u64,
}

#[event]
pub struct TokensSold {
    pub user: Pubkey,
    pub outcome: Outcome,
    pub amount: u64,
}

#[event]
pub struct MarketResolved {
    pub market: Pubkey,
    pub winning_outcome: Outcome,
}

#[event]
pub struct WinningsClaimed {
    pub user: Pubkey,
    pub amount: u64,
}

#[error_code]
pub enum ErrorCode {
    #[msg("Question is too long (max 200 characters)")]
    QuestionTooLong,
    #[msg("End time must be in the future")]
    InvalidEndTime,
    #[msg("Market has already been resolved")]
    MarketResolved,
    #[msg("Market has already been resolved")]
    MarketAlreadyResolved,
    #[msg("Market has ended")]
    MarketEnded,
    #[msg("Market has not ended yet")]
    MarketNotEnded,
    #[msg("Market has not been resolved yet")]
    MarketNotResolved,
    #[msg("Invalid amount")]
    InvalidAmount,
    #[msg("Unauthorized")]
    Unauthorized,
}