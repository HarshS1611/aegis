# Aegis Program

A non-custodial key recovery protocol built with Anchor. A wallet owner registers a set of
guardians and an M-of-N approval threshold. If the owner goes inactive for longer than a
configurable window, guardians can collectively rotate the vault to a new owner.

## Accounts

### `Vault` (PDA)

Seeds: `["vault", owner_pubkey]`

| Field | Type | Description |
|---|---|---|
| `owner` | `Pubkey` | Current owner. Updated on a successful rotation. |
| `bump` | `u8` | PDA bump seed. |
| `guardians` | `Vec<Pubkey>` | Registered guardian addresses (max `MAX_GUARDIANS`). |
| `threshold` | `u8` | Minimum guardian approvals required for rotation. |
| `inactivity_window` | `i64` | Seconds of owner inactivity before recovery can be initiated. |
| `last_activity` | `i64` | Unix timestamp of the last `ping` or vault initialization. |
| `recovery_state` | `RecoveryState` | `Idle` or `RecoveryPending`. |
| `proposed_owner` | `Option<Pubkey>` | New owner proposed during an active recovery. |
| `approvals` | `Vec<Pubkey>` | Guardians who approved the current recovery. |
| `initiated_at` | `i64` | Unix timestamp when the current recovery was initiated. |

## Constants

| Constant | Value | Description |
|---|---|---|
| `MAX_GUARDIANS` | 10 | Maximum guardians per vault. |
| `MIN_INACTIVITY_WINDOW` | 86,400s (1 day) | Minimum allowed `inactivity_window`. |
| `RECOVERY_EXPIRY` | 604,800s (7 days) | A pending recovery expires this long after `initiated_at`. |

## Instructions

| Instruction | Signer | Description |
|---|---|---|
| `initialize_vault` | owner | Creates the vault PDA with default state (threshold 1, no guardians). |
| `add_guardian(guardian)` | owner | Registers a guardian address. |
| `remove_guardian(guardian)` | owner | Unregisters a guardian. Blocked during an active recovery. |
| `set_threshold(threshold)` | owner | Sets the M-of-N approval threshold. |
| `set_inactivity_window(seconds)` | owner | Sets the inactivity window (>= `MIN_INACTIVITY_WINDOW`). |
| `ping` | owner | Updates `last_activity` to prove liveness. Blocked during an active recovery. |
| `initiate_recovery(proposed_owner)` | guardian | Starts a recovery once the inactivity window has elapsed. |
| `approve_recovery` | guardian | Adds the caller's approval to the active recovery. |
| `cancel_recovery` | owner | Cancels an active recovery and resets state. |
| `execute_rotation` | guardian | Rotates `owner` to `proposed_owner` once the threshold is met. |

## Errors

| Error | Raised by |
|---|---|
| `DuplicateGuardian` | `add_guardian` if the guardian is already registered. |
| `MaxGuardiansReached` | `add_guardian` if `guardians.len() == MAX_GUARDIANS`. |
| `GuardianNotFound` | `remove_guardian`, `initiate_recovery`, `approve_recovery`, `execute_rotation` for an unknown guardian. |
| `Unauthorized` | Any owner-only instruction called by a non-owner. |
| `RemovalBelowThreshold` | `remove_guardian` if it would drop the guardian count below `threshold`. |
| `InactivityWindowTooShort` | `set_inactivity_window` if `seconds < MIN_INACTIVITY_WINDOW`. |
| `ThresholdExceedsGuardians` | `set_threshold` if `threshold > guardians.len()`. |
| `ThresholdTooLow` | `set_threshold` if `threshold == 0`. |
| `RecoveryAlreadyActive` | `initiate_recovery` if a recovery is already pending. |
| `NoActiveRecovery` | `cancel_recovery`, `approve_recovery`, `execute_rotation` if `recovery_state == Idle`. |
| `InactivityWindowNotElapsed` | `initiate_recovery` if `now - last_activity < inactivity_window`. |
| `AlreadyApproved` | `approve_recovery` if the guardian already approved this recovery. |
| `RecoveryExpired` | `approve_recovery`, `execute_rotation` if `now - initiated_at > RECOVERY_EXPIRY`. |
| `ThresholdNotMet` | `execute_rotation` if `approvals.len() < threshold`. |
| `BlockedDuringRecovery` | `ping`, `remove_guardian` while `recovery_state == RecoveryPending`. |

## Testing

All tests run against [litesvm](https://github.com/LiteSVM/litesvm), an in-process Solana
runtime. Time-dependent flows (inactivity windows, recovery expiry) are tested by warping the
`Clock` sysvar directly, so the entire suite runs in well under a second with no local validator.

```bash
yarn install
anchor build
cargo test
```

or simply:

```bash
yarn test
```

Tests live in `programs/aegis_program/tests/test_aegis.rs` and cover every instruction's happy
path plus all error conditions, including the full guardian recovery flow (initiate → approve →
execute), owner cancellation, recovery expiry, and guard conditions like
`BlockedDuringRecovery` and `RecoveryAlreadyActive`.
