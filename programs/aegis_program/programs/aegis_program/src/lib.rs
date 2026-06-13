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

    /// Create a new vault PDA for the calling owner.
    pub fn initialize_vault(ctx: Context<InitializeVault>) -> Result<()> {
        instructions::initialize_vault::handler(ctx)
    }

    /// Owner adds a guardian wallet address to the vault.
    pub fn add_guardian(ctx: Context<AddGuardian>, guardian: Pubkey) -> Result<()> {
        instructions::add_guardian::handler(ctx, guardian)
    }

    /// Owner removes a guardian wallet address from the vault.
    pub fn remove_guardian(ctx: Context<RemoveGuardian>, guardian: Pubkey) -> Result<()> {
        instructions::remove_guardian::handler(ctx, guardian)
    }

    /// Owner sets the inactivity window in seconds (min 86400).
    pub fn set_inactivity_window(
        ctx: Context<SetInactivityWindow>,
        seconds: i64,
    ) -> Result<()> {
        instructions::set_inactivity_window::handler(ctx, seconds)
    }

    /// Owner sets the approval threshold (M of N).
    pub fn set_threshold(ctx: Context<SetThreshold>, threshold: u8) -> Result<()> {
        instructions::set_threshold::handler(ctx, threshold)
    }

    /// Owner pings the vault to prove liveness.
    pub fn ping(ctx: Context<Ping>) -> Result<()> {
        instructions::ping::handler(ctx)
    }

    /// Owner cancels an in-progress recovery.
    pub fn cancel_recovery(ctx: Context<CancelRecovery>) -> Result<()> {
        instructions::cancel_recovery::handler(ctx)
    }

    /// Guardian initiates a recovery after the inactivity window has elapsed.
    pub fn initiate_recovery(
        ctx: Context<InitiateRecovery>,
        proposed_owner: Pubkey,
    ) -> Result<()> {
        instructions::initiate_recovery::handler(ctx, proposed_owner)
    }

    /// Guardian adds their approval to the active recovery.
    pub fn approve_recovery(ctx: Context<ApproveRecovery>) -> Result<()> {
        instructions::approve_recovery::handler(ctx)
    }

    /// Guardian executes the key rotation once threshold is met.
    pub fn execute_rotation(ctx: Context<ExecuteRotation>) -> Result<()> {
        instructions::execute_rotation::handler(ctx)
    }
}
