use anchor_lang::prelude::*;

use crate::constants::{MIN_INACTIVITY_WINDOW, VAULT_SEED};
use crate::state::{RecoveryState, Vault};

#[derive(Accounts)]
pub struct InitializeVault<'info> {
    #[account(
        init,
        payer = owner,
        space = Vault::SIZE,
        seeds = [VAULT_SEED, owner.key().as_ref()],
        bump
    )]
    pub vault: Account<'info, Vault>,

    #[account(mut)]
    pub owner: Signer<'info>,

    pub system_program: Program<'info, System>,
}

pub(crate) fn handler(ctx: Context<InitializeVault>) -> Result<()> {
    let vault = &mut ctx.accounts.vault;
    let clock = Clock::get()?;

    vault.owner = ctx.accounts.owner.key();
    vault.bump = ctx.bumps.vault;
    vault.guardians = Vec::new();
    vault.threshold = 1;
    vault.inactivity_window = MIN_INACTIVITY_WINDOW;
    vault.last_activity = clock.unix_timestamp;
    vault.recovery_state = RecoveryState::Idle;
    vault.proposed_owner = None;
    vault.approvals = Vec::new();
    vault.initiated_at = 0;

    Ok(())
}
