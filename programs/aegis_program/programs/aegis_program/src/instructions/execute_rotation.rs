use anchor_lang::prelude::*;

use crate::constants::RECOVERY_EXPIRY;
use crate::error::ErrorCode;
use crate::state::Vault;

#[derive(Accounts)]
pub struct ExecuteRotation<'info> {
    #[account(mut)]
    pub vault: Account<'info, Vault>,

    pub guardian: Signer<'info>,
}

pub(crate) fn handler(ctx: Context<ExecuteRotation>) -> Result<()> {
    let vault = &mut ctx.accounts.vault;
    let clock = Clock::get()?;

    require!(vault.is_recovery_active(), ErrorCode::NoActiveRecovery);

    let elapsed = clock.unix_timestamp - vault.initiated_at;
    require!(elapsed <= RECOVERY_EXPIRY, ErrorCode::RecoveryExpired);

    require!(
        vault.guardians.contains(&ctx.accounts.guardian.key()),
        ErrorCode::GuardianNotFound
    );
    require!(
        vault.approvals.len() >= vault.threshold as usize,
        ErrorCode::ThresholdNotMet
    );

    let proposed = vault
        .proposed_owner
        .ok_or(ErrorCode::NoActiveRecovery)?;

    vault.owner = proposed;
    vault.last_activity = clock.unix_timestamp;
    vault.reset_recovery();

    Ok(())
}
