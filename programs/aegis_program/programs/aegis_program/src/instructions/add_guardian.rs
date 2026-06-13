use anchor_lang::prelude::*;

use crate::constants::MAX_GUARDIANS;
use crate::error::ErrorCode;
use crate::state::Vault;

#[derive(Accounts)]
pub struct AddGuardian<'info> {
    #[account(
        mut,
        has_one = owner @ ErrorCode::Unauthorized,
    )]
    pub vault: Account<'info, Vault>,

    pub owner: Signer<'info>,
}

pub(crate) fn handler(ctx: Context<AddGuardian>, guardian: Pubkey) -> Result<()> {
    let vault = &mut ctx.accounts.vault;

    require!(
        vault.guardians.len() < MAX_GUARDIANS,
        ErrorCode::MaxGuardiansReached
    );
    require!(
        !vault.guardians.contains(&guardian),
        ErrorCode::DuplicateGuardian
    );

    vault.guardians.push(guardian);

    Ok(())
}
