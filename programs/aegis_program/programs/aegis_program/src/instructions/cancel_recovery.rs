use anchor_lang::prelude::*;

use crate::error::ErrorCode;
use crate::state::Vault;

#[derive(Accounts)]
pub struct CancelRecovery<'info> {
    #[account(
        mut,
        has_one = owner @ ErrorCode::Unauthorized,
    )]
    pub vault: Account<'info, Vault>,

    pub owner: Signer<'info>,
}

pub(crate) fn handler(ctx: Context<CancelRecovery>) -> Result<()> {
    let vault = &mut ctx.accounts.vault;
    let clock = Clock::get()?;

    require!(vault.is_recovery_active(), ErrorCode::NoActiveRecovery);

    vault.reset_recovery();
    vault.last_activity = clock.unix_timestamp;

    Ok(())
}
