use anchor_lang::prelude::*;

use crate::constants::MIN_INACTIVITY_WINDOW;
use crate::error::ErrorCode;
use crate::state::Vault;

#[derive(Accounts)]
pub struct SetInactivityWindow<'info> {
    #[account(
        mut,
        has_one = owner @ ErrorCode::Unauthorized,
    )]
    pub vault: Account<'info, Vault>,

    pub owner: Signer<'info>,
}

pub(crate) fn handler(ctx: Context<SetInactivityWindow>, seconds: i64) -> Result<()> {
    require!(
        seconds >= MIN_INACTIVITY_WINDOW,
        ErrorCode::InactivityWindowTooShort
    );

    ctx.accounts.vault.inactivity_window = seconds;

    Ok(())
}
