use anchor_lang::prelude::*;

use crate::error::ErrorCode;
use crate::state::Vault;

#[derive(Accounts)]
pub struct RemoveGuardian<'info> {
    #[account(
        mut,
        has_one = owner @ ErrorCode::Unauthorized,
    )]
    pub vault: Account<'info, Vault>,

    pub owner: Signer<'info>,
}

pub(crate) fn handler(ctx: Context<RemoveGuardian>, guardian: Pubkey) -> Result<()> {
    let vault = &mut ctx.accounts.vault;

    require!(
        !vault.is_recovery_active(),
        ErrorCode::BlockedDuringRecovery
    );

    let position = vault
        .guardians
        .iter()
        .position(|g| *g == guardian)
        .ok_or(ErrorCode::GuardianNotFound)?;

    let new_count = vault.guardians.len() - 1;
    require!(
        new_count >= vault.threshold as usize,
        ErrorCode::RemovalBelowThreshold
    );

    vault.guardians.remove(position);

    Ok(())
}
