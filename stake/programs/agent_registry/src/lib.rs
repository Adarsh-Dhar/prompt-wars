use anchor_lang::prelude::*;
use anchor_lang::system_program::{transfer, Transfer};

declare_id!("AgNtRgstry111111111111111111111111111111111");

// Seeds
const REGISTRY_SEED: &[u8] = b"registry";
const AGENT_SEED: &[u8] = b"agent";
const VAULT_SEED: &[u8] = b"vault";
const REQUEST_SEED: &[u8] = b"request";

// Max lengths to keep accounts bounded
const MAX_NAME: usize = 32;
const MAX_URL: usize = 128;
const MAX_TAGS: usize = 8;
const MAX_TAG_LEN: usize = 24;
const MAX_PROOF_URI: usize = 256;

#[program]
pub mod agent_registry {
    use super::*;

    pub fn initialize_registry(
        ctx: Context<InitializeRegistry>,
        bond_lamports: u64,
        slash_penalty_lamports: u64,
    ) -> Result<()> {
        let registry = &mut ctx.accounts.registry;
        registry.authority = ctx.accounts.authority.key();
        registry.bond_lamports = bond_lamports;
        registry.slash_penalty_lamports = slash_penalty_lamports.min(bond_lamports);
        registry.bump = *ctx.bumps.get("registry").unwrap();
        Ok(())
    }

    pub fn register_agent(
        ctx: Context<RegisterAgent>,
        name: String,
        url: String,
        tags: Vec<String>,
    ) -> Result<()> {
        validate_metadata(&name, &url, &tags)?;

        let registry = &ctx.accounts.registry;
        let payer = &ctx.accounts.payer;
        let vault = &ctx.accounts.vault;

        // Transfer bond into escrow vault PDA
        transfer(
            CpiContext::new(
                ctx.accounts.system_program.to_account_info(),
                Transfer {
                    from: payer.to_account_info(),
                    to: vault.to_account_info(),
                },
            ),
            registry.bond_lamports,
        )?;

        let agent = &mut ctx.accounts.agent;
        agent.authority = payer.key();
        agent.agent_wallet = ctx.accounts.agent_wallet.key();
        agent.name = name;
        agent.url = url;
        agent.tags = tags;
        agent.bond_lamports = registry.bond_lamports;
        agent.request_count = 0;
        agent.pending_request = None;
        agent.bump = *ctx.bumps.get("agent").unwrap();
        Ok(())
    }

    pub fn update_metadata(ctx: Context<UpdateMetadata>, name: String, url: String, tags: Vec<String>) -> Result<()> {
        validate_metadata(&name, &url, &tags)?;
        let agent = &mut ctx.accounts.agent;
        require_keys_eq!(agent.authority, ctx.accounts.authority.key(), AgentRegistryError::Unauthorized);
        agent.name = name;
        agent.url = url;
        agent.tags = tags;
        Ok(())
    }

    pub fn request_proof(ctx: Context<RequestProof>, market_id: [u8; 32], deadline_ts: i64) -> Result<()> {
        require_gte!(deadline_ts, Clock::get()?.unix_timestamp, AgentRegistryError::DeadlineInPast);

        let request = &mut ctx.accounts.proof_request;
        request.agent = ctx.accounts.agent.key();
        request.market_id = market_id;
        request.requester = ctx.accounts.requester.key();
        request.requested_at = Clock::get()?.unix_timestamp;
        request.deadline_ts = deadline_ts;
        request.fulfilled = false;
        request.slashable = true;
        request.proof_uri = String::new();
        request.log_root = [0u8; 32];
        request.bump = *ctx.bumps.get("proof_request").unwrap();

        let agent = &mut ctx.accounts.agent;
        agent.request_count = agent.request_count.checked_add(1).ok_or(AgentRegistryError::Overflow)?;
        agent.pending_request = Some(request.key());

        emit!(RequestProof {
            agent: agent.key(),
            market_id,
            deadline_ts,
            request: request.key()
        });

        Ok(())
    }

    pub fn submit_proof(
        ctx: Context<SubmitProof>,
        market_id: [u8; 32],
        log_root: [u8; 32],
        proof_uri: String,
        signature: [u8; 64],
    ) -> Result<()> {
        require!(proof_uri.len() <= MAX_PROOF_URI, AgentRegistryError::ProofUriTooLong);
        let request = &mut ctx.accounts.proof_request;
        require!(!request.fulfilled, AgentRegistryError::RequestAlreadyFulfilled);
        require_keys_eq!(request.agent, ctx.accounts.agent.key(), AgentRegistryError::InvalidRequest);
        require!(request.market_id == market_id, AgentRegistryError::InvalidRequest);

        // Only agent authority or designated wallet may submit
        let agent = &ctx.accounts.agent;
        require_keys_eq!(agent.authority, ctx.accounts.authority.key(), AgentRegistryError::Unauthorized);

        request.proof_uri = proof_uri;
        request.log_root = log_root;
        request.signature = signature;
        request.fulfilled = true;
        request.slashable = false;

        emit!(ProofSubmitted {
            agent: agent.key(),
            market_id,
            request: request.key(),
            proof_uri: request.proof_uri.clone(),
            log_root
        });

        Ok(())
    }

    pub fn slash_agent(ctx: Context<SlashAgent>) -> Result<()> {
        let registry = &ctx.accounts.registry;
        let request = &mut ctx.accounts.proof_request;
        require!(request.slashable, AgentRegistryError::NotSlashable);
        require!(!request.fulfilled, AgentRegistryError::RequestAlreadyFulfilled);
        require!(
            Clock::get()?.unix_timestamp > request.deadline_ts,
            AgentRegistryError::DeadlineNotReached
        );

        let vault = &mut ctx.accounts.vault;

        // Transfer slash penalty to authority
        let bump = ctx.bumps.get("vault").copied().unwrap();
        let vault_seeds: &[&[u8]] = &[
            VAULT_SEED,
            ctx.accounts.agent.key().as_ref(),
            &[bump],
        ];
        let signer = &[vault_seeds];
        let ix = transfer(
            CpiContext::new_with_signer(
                ctx.accounts.system_program.to_account_info(),
                Transfer {
                    from: vault.to_account_info(),
                    to: ctx.accounts.authority.to_account_info(),
                },
                signer,
            ),
            registry.slash_penalty_lamports,
        );
        ix?;

        // Mark request as resolved to prevent double slashing
        request.slashable = false;
        request.fulfilled = true;

        emit!(AgentSlashed {
            agent: ctx.accounts.agent.key(),
            request: request.key(),
            market_id: request.market_id,
            penalty: registry.slash_penalty_lamports,
        });

        Ok(())
    }

    pub fn withdraw_bond(ctx: Context<WithdrawBond>) -> Result<()> {
        let agent = &ctx.accounts.agent;
        require_keys_eq!(agent.authority, ctx.accounts.authority.key(), AgentRegistryError::Unauthorized);
        require!(agent.pending_request.is_none(), AgentRegistryError::ActiveRequestPresent);

        let vault = &mut ctx.accounts.vault;
        let lamports = vault.to_account_info().lamports();
        require!(lamports >= agent.bond_lamports, AgentRegistryError::InsufficientVaultBalance);

        let bump = ctx.bumps.get("vault").copied().unwrap();
        let vault_seeds: &[&[u8]] = &[
            VAULT_SEED,
            agent.key().as_ref(),
            &[bump],
        ];
        let signer = &[vault_seeds];
        transfer(
            CpiContext::new_with_signer(
                ctx.accounts.system_program.to_account_info(),
                Transfer {
                    from: vault.to_account_info(),
                    to: ctx.accounts.authority.to_account_info(),
                },
                signer,
            ),
            lamports,
        )?;

        Ok(())
    }
}

fn validate_metadata(name: &str, url: &str, tags: &[String]) -> Result<()> {
    require!(!name.is_empty() && name.len() <= MAX_NAME, AgentRegistryError::NameTooLong);
    require!(!url.is_empty() && url.len() <= MAX_URL, AgentRegistryError::UrlTooLong);
    require!(tags.len() <= MAX_TAGS, AgentRegistryError::TooManyTags);
    for t in tags {
        require!(!t.is_empty() && t.len() <= MAX_TAG_LEN, AgentRegistryError::TagTooLong);
    }
    Ok(())
}

// Accounts
#[derive(Accounts)]
pub struct InitializeRegistry<'info> {
    #[account(init, payer = authority, seeds = [REGISTRY_SEED], bump, space = 8 + Registry::LEN)]
    pub registry: Account<'info, Registry>,
    #[account(mut)]
    pub authority: Signer<'info>,
    pub system_program: Program<'info, System>,
}

#[derive(Accounts)]
pub struct RegisterAgent<'info> {
    #[account(mut, seeds = [REGISTRY_SEED], bump = registry.bump)]
    pub registry: Account<'info, Registry>,
    #[account(
        init,
        payer = payer,
        seeds = [AGENT_SEED, agent_wallet.key().as_ref()],
        bump,
        space = 8 + Agent::LEN
    )]
    pub agent: Account<'info, Agent>,
    /// Agent wants funds to flow to this wallet; doesn't need to be signer.
    pub agent_wallet: UncheckedAccount<'info>,
    #[account(
        init,
        payer = payer,
        seeds = [VAULT_SEED, agent.key().as_ref()],
        bump,
        space = 8
    )]
    pub vault: SystemAccount<'info>,
    #[account(mut)]
    pub payer: Signer<'info>,
    pub system_program: Program<'info, System>,
}

#[derive(Accounts)]
pub struct UpdateMetadata<'info> {
    #[account(mut, seeds = [AGENT_SEED, agent.agent_wallet.as_ref()], bump = agent.bump)]
    pub agent: Account<'info, Agent>,
    pub authority: Signer<'info>,
}

#[derive(Accounts)]
pub struct RequestProof<'info> {
    #[account(mut, seeds = [AGENT_SEED, agent.agent_wallet.as_ref()], bump = agent.bump)]
    pub agent: Account<'info, Agent>,
    #[account(seeds = [REGISTRY_SEED], bump = registry.bump)]
    pub registry: Account<'info, Registry>,
    #[account(
        init,
        payer = requester,
        seeds = [REQUEST_SEED, agent.key().as_ref(), &market_id],
        bump,
        space = 8 + ProofRequest::LEN
    )]
    pub proof_request: Account<'info, ProofRequest>,
    #[account(mut)]
    pub requester: Signer<'info>,
    pub system_program: Program<'info, System>,
}

#[derive(Accounts)]
pub struct SubmitProof<'info> {
    #[account(mut, seeds = [AGENT_SEED, agent.agent_wallet.as_ref()], bump = agent.bump)]
    pub agent: Account<'info, Agent>,
    #[account(mut, seeds = [REQUEST_SEED, agent.key().as_ref(), &proof_request.market_id], bump = proof_request.bump)]
    pub proof_request: Account<'info, ProofRequest>,
    pub authority: Signer<'info>,
    pub system_program: Program<'info, System>,
}

#[derive(Accounts)]
pub struct SlashAgent<'info> {
    #[account(seeds = [REGISTRY_SEED], bump = registry.bump)]
    pub registry: Account<'info, Registry>,
    #[account(mut, seeds = [AGENT_SEED, agent.agent_wallet.as_ref()], bump = agent.bump)]
    pub agent: Account<'info, Agent>,
    #[account(
        mut,
        seeds = [REQUEST_SEED, agent.key().as_ref(), &proof_request.market_id],
        bump = proof_request.bump
    )]
    pub proof_request: Account<'info, ProofRequest>,
    #[account(
        mut,
        seeds = [VAULT_SEED, agent.key().as_ref()],
        bump
    )]
    pub vault: SystemAccount<'info>,
    /// Registry authority receives penalties
    #[account(mut)]
    pub authority: Signer<'info>,
    pub system_program: Program<'info, System>,
}

#[derive(Accounts)]
pub struct WithdrawBond<'info> {
    #[account(mut, seeds = [AGENT_SEED, agent.agent_wallet.as_ref()], bump = agent.bump)]
    pub agent: Account<'info, Agent>,
    #[account(
        mut,
        seeds = [VAULT_SEED, agent.key().as_ref()],
        bump
    )]
    pub vault: SystemAccount<'info>,
    #[account(mut)]
    pub authority: Signer<'info>,
    pub system_program: Program<'info, System>,
}

// Data structs
#[account]
pub struct Registry {
    pub authority: Pubkey,
    pub bond_lamports: u64,
    pub slash_penalty_lamports: u64,
    pub bump: u8,
}

impl Registry {
    pub const LEN: usize = 32 + 8 + 8 + 1;
}

#[account]
pub struct Agent {
    pub authority: Pubkey,
    pub agent_wallet: Pubkey,
    pub name: String,
    pub url: String,
    pub tags: Vec<String>,
    pub bond_lamports: u64,
    pub request_count: u64,
    pub pending_request: Option<Pubkey>,
    pub bump: u8,
}

impl Agent {
    pub const LEN: usize = 32 // authority
        + 32 // agent_wallet
        + 4 + MAX_NAME // name
        + 4 + MAX_URL // url
        + 4 + (MAX_TAGS * (4 + MAX_TAG_LEN)) // tags vec cap
        + 8 // bond
        + 8 // request_count
        + 1 + 32 // option pubkey
        + 1; // bump
}

#[account]
pub struct ProofRequest {
    pub agent: Pubkey,
    pub requester: Pubkey,
    pub market_id: [u8; 32],
    pub requested_at: i64,
    pub deadline_ts: i64,
    pub proof_uri: String,
    pub log_root: [u8; 32],
    pub signature: [u8; 64],
    pub fulfilled: bool,
    pub slashable: bool,
    pub bump: u8,
}

impl ProofRequest {
    pub const LEN: usize = 32 + 32 + 32 + 8 + 8 + 4 + MAX_PROOF_URI + 32 + 64 + 1 + 1 + 1;
}

// Events consumed by frontend/agent server
#[event]
pub struct RequestProof {
    pub agent: Pubkey,
    pub market_id: [u8; 32],
    pub deadline_ts: i64,
    pub request: Pubkey,
}

#[event]
pub struct ProofSubmitted {
    pub agent: Pubkey,
    pub market_id: [u8; 32],
    pub request: Pubkey,
    pub proof_uri: String,
    pub log_root: [u8; 32],
}

#[event]
pub struct AgentSlashed {
    pub agent: Pubkey,
    pub request: Pubkey,
    pub market_id: [u8; 32],
    pub penalty: u64,
}

// Errors
#[error_code]
pub enum AgentRegistryError {
    #[msg("Name is too long or empty")]
    NameTooLong,
    #[msg("URL is too long or empty")]
    UrlTooLong,
    #[msg("Too many tags")]
    TooManyTags,
    #[msg("A tag is too long or empty")]
    TagTooLong,
    #[msg("Only the agent authority may perform this action")]
    Unauthorized,
    #[msg("Deadline must be in the future")]
    DeadlineInPast,
    #[msg("Math overflow")]
    Overflow,
    #[msg("Request already fulfilled")]
    RequestAlreadyFulfilled,
    #[msg("Invalid request reference")]
    InvalidRequest,
    #[msg("Request is not slashable")]
    NotSlashable,
    #[msg("Deadline not reached")]
    DeadlineNotReached,
    #[msg("Agent has active requests")]
    ActiveRequestPresent,
    #[msg("Vault balance too low")]
    InsufficientVaultBalance,
    #[msg("Proof URI too long")]
    ProofUriTooLong,
}
