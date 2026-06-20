use anchor_lang::prelude::*;

use crate::error::ErrorCode;
use crate::state::Vault;

#[derive(Accounts)]
pub struct WithdrawSol<'info> {
    #[account(
        mut,
        has_one = owner @ ErrorCode::Unauthorized,
    )]
    pub vault: Account<'info, Vault>,

    pub owner: Signer<'info>,

    /// CHECK: any account may receive the withdrawn lamports.
    #[account(mut)]
    pub destination: UncheckedAccount<'info>,

    pub system_program: Program<'info, System>,
}

pub(crate) fn handler(ctx: Context<WithdrawSol>, amount: u64) -> Result<()> {
    let vault_info = ctx.accounts.vault.to_account_info();

    let rent_exempt_minimum = Rent::get()?.minimum_balance(Vault::SIZE);
    let available = vault_info.lamports().saturating_sub(rent_exempt_minimum);
    require!(amount <= available, ErrorCode::InsufficientVaultBalance);

    **vault_info.try_borrow_mut_lamports()? -= amount;
    **ctx
        .accounts
        .destination
        .to_account_info()
        .try_borrow_mut_lamports()? += amount;

    Ok(())
}
