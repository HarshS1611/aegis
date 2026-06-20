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
    pub owner: Pubkey,
    pub bump: u8,
    pub guardians: Vec<Pubkey>,
    pub threshold: u8,
    pub inactivity_window: i64,
    pub last_activity: i64,
    pub recovery_state: RecoveryState,
    pub proposed_owner: Option<Pubkey>,
    pub approvals: Vec<Pubkey>,
    pub initiated_at: i64,
    pub creator: Pubkey,
}

impl Vault {
    pub const SIZE: usize = 8
        + 32
        + 1
        + 4 + (MAX_GUARDIANS * 32)
        + 1
        + 8
        + 8
        + 1
        + 1 + 32
        + 4 + (MAX_GUARDIANS * 32)
        + 8
        + 32;

    pub fn is_recovery_active(&self) -> bool {
        self.recovery_state == RecoveryState::RecoveryPending
    }

    pub fn reset_recovery(&mut self) {
        self.recovery_state = RecoveryState::Idle;
        self.proposed_owner = None;
        self.approvals.clear();
        self.initiated_at = 0;
    }
}
