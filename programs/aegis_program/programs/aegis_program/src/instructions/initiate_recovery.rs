use anchor_lang::prelude::*;

use crate::error::ErrorCode;
use crate::state::{RecoveryState, Vault};

#[derive(Accounts)]
pub struct InitiateRecovery<'info> {
    #[account(mut)]
    pub vault: Account<'info, Vault>,

    pub guardian: Signer<'info>,
}

pub(crate) fn handler(ctx: Context<InitiateRecovery>, proposed_owner: Pubkey) -> Result<()> {
    let vault = &mut ctx.accounts.vault;
    let clock = Clock::get()?;

    require!(
        vault.guardians.contains(&ctx.accounts.guardian.key()),
        ErrorCode::GuardianNotFound
    );
    require!(
        !vault.is_recovery_active(),
        ErrorCode::RecoveryAlreadyActive
    );

    let elapsed = clock.unix_timestamp - vault.last_activity;
    require!(
        elapsed >= vault.inactivity_window,
        ErrorCode::InactivityWindowNotElapsed
    );

    vault.recovery_state = RecoveryState::RecoveryPending;
    vault.proposed_owner = Some(proposed_owner);
    vault.initiated_at = clock.unix_timestamp;
    vault.approvals = Vec::new();

    Ok(())
}
