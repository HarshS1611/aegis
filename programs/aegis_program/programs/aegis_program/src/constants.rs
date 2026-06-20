use anchor_lang::prelude::*;

#[constant]
pub const SEED: &str = "anchor";

pub const MAX_GUARDIANS: usize = 10;
pub const MIN_INACTIVITY_WINDOW: i64 = 86_400;
pub const RECOVERY_EXPIRY: i64 = 604_800;
pub const VAULT_SEED: &[u8] = b"vault";
