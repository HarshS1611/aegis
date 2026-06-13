use anchor_lang::prelude::*;

use crate::error::ErrorCode;
use crate::state::Vault;

#[derive(Accounts)]
pub struct SetThreshold<'info> {
    #[account(
        mut,
        has_one = owner @ ErrorCode::Unauthorized,
    )]
    pub vault: Account<'info, Vault>,

    pub owner: Signer<'info>,
}

pub(crate) fn handler(ctx: Context<SetThreshold>, threshold: u8) -> Result<()> {
    let vault = &mut ctx.accounts.vault;

    require!(threshold >= 1, ErrorCode::ThresholdTooLow);
    require!(
        threshold as usize <= vault.guardians.len(),
        ErrorCode::ThresholdExceedsGuardians
    );

    vault.threshold = threshold;

    Ok(())
}
