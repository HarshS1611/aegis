use anchor_lang::prelude::*;

use crate::constants::RECOVERY_EXPIRY;
use crate::error::ErrorCode;
use crate::state::Vault;

#[derive(Accounts)]
pub struct ApproveRecovery<'info> {
    #[account(mut)]
    pub vault: Account<'info, Vault>,

    pub guardian: Signer<'info>,
}

pub(crate) fn handler(ctx: Context<ApproveRecovery>) -> Result<()> {
    let vault = &mut ctx.accounts.vault;
    let clock = Clock::get()?;
    let signer = ctx.accounts.guardian.key();

    require!(vault.is_recovery_active(), ErrorCode::NoActiveRecovery);

    let elapsed = clock.unix_timestamp - vault.initiated_at;
    require!(elapsed <= RECOVERY_EXPIRY, ErrorCode::RecoveryExpired);

    require!(
        vault.guardians.contains(&signer),
        ErrorCode::GuardianNotFound
    );
    require!(
        !vault.approvals.contains(&signer),
        ErrorCode::AlreadyApproved
    );

    vault.approvals.push(signer);

    Ok(())
}
