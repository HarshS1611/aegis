use anchor_lang::prelude::*;

#[error_code]
pub enum ErrorCode {
    #[msg("Custom error message")]
    CustomError,

    #[msg("Guardian is already registered in this vault.")]
    DuplicateGuardian,

    #[msg("Guardian list has reached the maximum size.")]
    MaxGuardiansReached,

    #[msg("Guardian is not registered in this vault.")]
    GuardianNotFound,

    #[msg("Only the vault owner can perform this action.")]
    Unauthorized,

    #[msg("Cannot remove guardian: would leave count below threshold.")]
    RemovalBelowThreshold,

    #[msg("Inactivity window is below the minimum allowed (86400 seconds).")]
    InactivityWindowTooShort,

    #[msg("Threshold cannot exceed the number of registered guardians.")]
    ThresholdExceedsGuardians,

    #[msg("Threshold must be at least 1.")]
    ThresholdTooLow,

    #[msg("Recovery is already in progress.")]
    RecoveryAlreadyActive,

    #[msg("No recovery is currently in progress.")]
    NoActiveRecovery,

    #[msg("Inactivity window has not yet elapsed.")]
    InactivityWindowNotElapsed,

    #[msg("Guardian has already approved this recovery.")]
    AlreadyApproved,

    #[msg("Recovery has expired (more than 7 days since initiation).")]
    RecoveryExpired,

    #[msg("Not enough guardian approvals to execute rotation.")]
    ThresholdNotMet,

    #[msg("This action is blocked while a recovery is in progress.")]
    BlockedDuringRecovery,
}
