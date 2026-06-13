use anchor_lang::prelude::*;

#[constant]
pub const SEED: &str = "anchor";

/// Maximum number of guardians allowed per vault.
pub const MAX_GUARDIANS: usize = 10;

/// Minimum inactivity window in seconds (1 day).
pub const MIN_INACTIVITY_WINDOW: i64 = 86_400;

/// Maximum time a recovery can stay pending before it expires (7 days).
pub const RECOVERY_EXPIRY: i64 = 604_800;

/// Vault PDA seed prefix.
pub const VAULT_SEED: &[u8] = b"vault";
