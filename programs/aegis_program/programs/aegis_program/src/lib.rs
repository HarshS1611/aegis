pub mod constants;
pub mod error;
pub mod instructions;
pub mod state;

use anchor_lang::prelude::*;

pub use constants::*;
pub use instructions::*;
pub use state::*;

declare_id!("8zA1db5LJmFwUu7dTS1qA4ixqJ5XaTx224x1fRTRSJHA");

#[program]
pub mod aegis_program {
    use super::*;

    pub fn initialize_vault(ctx: Context<InitializeVault>) -> Result<()> {
        instructions::initialize_vault::handler(ctx)
    }

    pub fn add_guardian(ctx: Context<AddGuardian>, guardian: Pubkey) -> Result<()> {
        instructions::add_guardian::handler(ctx, guardian)
    }

    pub fn remove_guardian(ctx: Context<RemoveGuardian>, guardian: Pubkey) -> Result<()> {
        instructions::remove_guardian::handler(ctx, guardian)
    }

    pub fn set_inactivity_window(
        ctx: Context<SetInactivityWindow>,
        seconds: i64,
    ) -> Result<()> {
        instructions::set_inactivity_window::handler(ctx, seconds)
    }

    pub fn set_threshold(ctx: Context<SetThreshold>, threshold: u8) -> Result<()> {
        instructions::set_threshold::handler(ctx, threshold)
    }

    pub fn ping(ctx: Context<Ping>) -> Result<()> {
        instructions::ping::handler(ctx)
    }

    pub fn cancel_recovery(ctx: Context<CancelRecovery>) -> Result<()> {
        instructions::cancel_recovery::handler(ctx)
    }

    pub fn initiate_recovery(
        ctx: Context<InitiateRecovery>,
        proposed_owner: Pubkey,
    ) -> Result<()> {
        instructions::initiate_recovery::handler(ctx, proposed_owner)
    }

    pub fn approve_recovery(ctx: Context<ApproveRecovery>) -> Result<()> {
        instructions::approve_recovery::handler(ctx)
    }

    pub fn execute_rotation(ctx: Context<ExecuteRotation>) -> Result<()> {
        instructions::execute_rotation::handler(ctx)
    }

    pub fn deposit_sol(ctx: Context<DepositSol>, amount: u64) -> Result<()> {
        instructions::deposit_sol::handler(ctx, amount)
    }

    pub fn withdraw_sol(ctx: Context<WithdrawSol>, amount: u64) -> Result<()> {
        instructions::withdraw_sol::handler(ctx, amount)
    }
}
