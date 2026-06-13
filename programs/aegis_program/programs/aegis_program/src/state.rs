use anchor_lang::prelude::*;

use crate::constants::MAX_GUARDIANS;

#[derive(AnchorSerialize, AnchorDeserialize, Clone, PartialEq, Eq, Debug)]
pub enum RecoveryState {
    Idle,
    RecoveryPending,
}

#[account]
#[derive(Debug)]
pub struct Vault {
    /// Current owner of the vault. Updated on successful rotation.
    pub owner: Pubkey,

    /// PDA bump seed.
    pub bump: u8,

    /// Registered guardian addresses.
    pub guardians: Vec<Pubkey>,

    /// Minimum guardian approvals required for rotation.
    pub threshold: u8,

    /// Seconds before recovery can be triggered.
    pub inactivity_window: i64,

    /// Unix timestamp of last ping or vault initialisation.
    pub last_activity: i64,

    /// Current recovery state.
    pub recovery_state: RecoveryState,

    /// Proposed new owner address during recovery. None when Idle.
    pub proposed_owner: Option<Pubkey>,

    /// Guardian addresses that have approved the current recovery.
    pub approvals: Vec<Pubkey>,

    /// Unix timestamp when recovery was initiated. Used for 7-day expiry.
    pub initiated_at: i64,
}

impl Vault {
    /// Size of the vault account in bytes (discriminator + fields, with
    /// guardian/approval vecs pre-sized to MAX_GUARDIANS).
    pub const SIZE: usize = 8       // discriminator
        + 32                          // owner
        + 1                           // bump
        + 4 + (MAX_GUARDIANS * 32)    // guardians vec
        + 1                           // threshold
        + 8                           // inactivity_window
        + 8                           // last_activity
        + 1                           // recovery_state enum tag
        + 1 + 32                      // Option<Pubkey> for proposed_owner
        + 4 + (MAX_GUARDIANS * 32)    // approvals vec
        + 8; // initiated_at

    /// Returns true if the vault is currently in a recovery flow.
    pub fn is_recovery_active(&self) -> bool {
        self.recovery_state == RecoveryState::RecoveryPending
    }

    /// Resets all recovery-related fields back to the Idle baseline.
    pub fn reset_recovery(&mut self) {
        self.recovery_state = RecoveryState::Idle;
        self.proposed_owner = None;
        self.approvals.clear();
        self.initiated_at = 0;
    }
}
