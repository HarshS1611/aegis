use {
    anchor_lang::{
        prelude::Pubkey, solana_program::instruction::Instruction, AccountDeserialize,
        InstructionData, ToAccountMetas,
    },
    litesvm::LiteSVM,
    solana_clock::Clock,
    solana_keypair::Keypair,
    solana_message::{Message, VersionedMessage},
    solana_signer::Signer,
    solana_transaction::versioned::VersionedTransaction,
};

use aegis_program::{RecoveryState, Vault, MAX_GUARDIANS, MIN_INACTIVITY_WINDOW};

fn extract_custom_error_code(err: &impl std::fmt::Debug) -> Option<u32> {
    let debug = format!("{:?}", err);
    let after = debug.split_once("Custom(")?.1;
    let digits = after.split(')').next()?;
    digits.parse::<u32>().ok()
}

fn send_tx(svm: &mut LiteSVM, payer: &Keypair, ix: Instruction) -> Result<(), u32> {
    let blockhash = svm.latest_blockhash();
    let msg = Message::new_with_blockhash(&[ix], Some(&payer.pubkey()), &blockhash);
    let tx = VersionedTransaction::try_new(VersionedMessage::Legacy(msg), &[payer]).unwrap();

    svm.send_transaction(tx).map(|_| ()).map_err(|failed| {
        extract_custom_error_code(&failed.err)
            .unwrap_or_else(|| panic!("transaction failed with non-custom error: {:?}", failed.err))
    })
}

fn send_tx_raw(svm: &mut LiteSVM, payer: &Keypair, ix: Instruction) -> Result<(), ()> {
    let blockhash = svm.latest_blockhash();
    let msg = Message::new_with_blockhash(&[ix], Some(&payer.pubkey()), &blockhash);
    let tx = VersionedTransaction::try_new(VersionedMessage::Legacy(msg), &[payer]).unwrap();

    svm.send_transaction(tx).map(|_| ()).map_err(|_| ())
}

fn vault_pda(owner: &Pubkey, program_id: &Pubkey) -> Pubkey {
    Pubkey::find_program_address(&[b"vault", owner.as_ref()], program_id).0
}

fn get_vault(svm: &LiteSVM, vault: &Pubkey) -> Vault {
    let data = svm.get_account(vault).unwrap().data;
    Vault::try_deserialize(&mut data.as_slice()).unwrap()
}

fn warp_clock_to(svm: &mut LiteSVM, unix_timestamp: i64) {
    let mut clock = svm.get_sysvar::<Clock>();
    clock.unix_timestamp = unix_timestamp;
    svm.set_sysvar::<Clock>(&clock);
}

fn new_svm(program_id: Pubkey, owner: &Keypair) -> LiteSVM {
    let mut svm = LiteSVM::new();
    let bytes = include_bytes!("../../../target/deploy/aegis_program.so");
    svm.add_program(program_id, bytes).unwrap();
    svm.airdrop(&owner.pubkey(), 1_000_000_000).unwrap();
    svm
}

fn initialize_vault_ix(program_id: Pubkey, owner: &Keypair) -> (Pubkey, Instruction) {
    let vault = vault_pda(&owner.pubkey(), &program_id);

    let ix = Instruction::new_with_bytes(
        program_id,
        &aegis_program::instruction::InitializeVault {}.data(),
        aegis_program::accounts::InitializeVault {
            vault,
            owner: owner.pubkey(),
            system_program: anchor_lang::solana_program::system_program::ID,
        }
        .to_account_metas(None),
    );

    (vault, ix)
}

fn initialize_vault(svm: &mut LiteSVM, program_id: Pubkey, owner: &Keypair) -> Pubkey {
    let (vault, ix) = initialize_vault_ix(program_id, owner);
    send_tx(svm, owner, ix).expect("initialize_vault should succeed");
    vault
}

fn setup_vault(program_id: Pubkey, owner: &Keypair) -> (LiteSVM, Pubkey) {
    let mut svm = new_svm(program_id, owner);
    let vault = initialize_vault(&mut svm, program_id, owner);
    (svm, vault)
}

fn add_guardian(svm: &mut LiteSVM, program_id: Pubkey, owner: &Keypair, vault: Pubkey, guardian: Pubkey) {
    let ix = Instruction::new_with_bytes(
        program_id,
        &aegis_program::instruction::AddGuardian { guardian }.data(),
        aegis_program::accounts::AddGuardian {
            vault,
            owner: owner.pubkey(),
        }
        .to_account_metas(None),
    );

    send_tx(svm, owner, ix).expect("add_guardian should succeed");
}

fn add_guardian_result(
    svm: &mut LiteSVM,
    program_id: Pubkey,
    owner: &Keypair,
    vault: Pubkey,
    guardian: Pubkey,
) -> Result<(), u32> {
    let ix = Instruction::new_with_bytes(
        program_id,
        &aegis_program::instruction::AddGuardian { guardian }.data(),
        aegis_program::accounts::AddGuardian {
            vault,
            owner: owner.pubkey(),
        }
        .to_account_metas(None),
    );

    send_tx(svm, owner, ix)
}

fn set_threshold(svm: &mut LiteSVM, program_id: Pubkey, owner: &Keypair, vault: Pubkey, threshold: u8) {
    let ix = Instruction::new_with_bytes(
        program_id,
        &aegis_program::instruction::SetThreshold { threshold }.data(),
        aegis_program::accounts::SetThreshold {
            vault,
            owner: owner.pubkey(),
        }
        .to_account_metas(None),
    );

    send_tx(svm, owner, ix).expect("set_threshold should succeed");
}

fn set_threshold_result(
    svm: &mut LiteSVM,
    program_id: Pubkey,
    owner: &Keypair,
    vault: Pubkey,
    threshold: u8,
) -> Result<(), u32> {
    let ix = Instruction::new_with_bytes(
        program_id,
        &aegis_program::instruction::SetThreshold { threshold }.data(),
        aegis_program::accounts::SetThreshold {
            vault,
            owner: owner.pubkey(),
        }
        .to_account_metas(None),
    );

    send_tx(svm, owner, ix)
}

fn set_inactivity_window_result(
    svm: &mut LiteSVM,
    program_id: Pubkey,
    owner: &Keypair,
    vault: Pubkey,
    seconds: i64,
) -> Result<(), u32> {
    let ix = Instruction::new_with_bytes(
        program_id,
        &aegis_program::instruction::SetInactivityWindow { seconds }.data(),
        aegis_program::accounts::SetInactivityWindow {
            vault,
            owner: owner.pubkey(),
        }
        .to_account_metas(None),
    );

    send_tx(svm, owner, ix)
}

fn setup_vault_for_recovery(
    svm: &mut LiteSVM,
    program_id: Pubkey,
    owner: &Keypair,
    guardians: &[Keypair],
    threshold: u8,
) -> Pubkey {
    let vault = initialize_vault(svm, program_id, owner);

    for guardian in guardians {
        svm.airdrop(&guardian.pubkey(), 1_000_000_000).unwrap();
        add_guardian(svm, program_id, owner, vault, guardian.pubkey());
    }
    set_threshold(svm, program_id, owner, vault, threshold);

    let vault_state = get_vault(svm, &vault);
    warp_clock_to(
        svm,
        vault_state.last_activity + vault_state.inactivity_window + 1,
    );

    vault
}

fn initiate_recovery(
    svm: &mut LiteSVM,
    program_id: Pubkey,
    guardian: &Keypair,
    vault: Pubkey,
    proposed_owner: Pubkey,
) -> Result<(), u32> {
    let ix = Instruction::new_with_bytes(
        program_id,
        &aegis_program::instruction::InitiateRecovery { proposed_owner }.data(),
        aegis_program::accounts::InitiateRecovery {
            vault,
            guardian: guardian.pubkey(),
        }
        .to_account_metas(None),
    );

    send_tx(svm, guardian, ix)
}

fn approve_recovery(
    svm: &mut LiteSVM,
    program_id: Pubkey,
    guardian: &Keypair,
    vault: Pubkey,
) -> Result<(), u32> {
    let ix = Instruction::new_with_bytes(
        program_id,
        &aegis_program::instruction::ApproveRecovery {}.data(),
        aegis_program::accounts::ApproveRecovery {
            vault,
            guardian: guardian.pubkey(),
        }
        .to_account_metas(None),
    );

    send_tx(svm, guardian, ix)
}

fn cancel_recovery(
    svm: &mut LiteSVM,
    program_id: Pubkey,
    owner: &Keypair,
    vault: Pubkey,
) -> Result<(), u32> {
    let ix = Instruction::new_with_bytes(
        program_id,
        &aegis_program::instruction::CancelRecovery {}.data(),
        aegis_program::accounts::CancelRecovery {
            vault,
            owner: owner.pubkey(),
        }
        .to_account_metas(None),
    );

    send_tx(svm, owner, ix)
}

fn execute_rotation(
    svm: &mut LiteSVM,
    program_id: Pubkey,
    guardian: &Keypair,
    vault: Pubkey,
) -> Result<(), u32> {
    let ix = Instruction::new_with_bytes(
        program_id,
        &aegis_program::instruction::ExecuteRotation {}.data(),
        aegis_program::accounts::ExecuteRotation {
            vault,
            guardian: guardian.pubkey(),
        }
        .to_account_metas(None),
    );

    send_tx(svm, guardian, ix)
}

fn ping(svm: &mut LiteSVM, program_id: Pubkey, owner: &Keypair, vault: Pubkey) -> Result<(), u32> {
    let ix = Instruction::new_with_bytes(
        program_id,
        &aegis_program::instruction::Ping {}.data(),
        aegis_program::accounts::Ping {
            vault,
            owner: owner.pubkey(),
        }
        .to_account_metas(None),
    );

    send_tx(svm, owner, ix)
}

fn remove_guardian(
    svm: &mut LiteSVM,
    program_id: Pubkey,
    owner: &Keypair,
    vault: Pubkey,
    guardian: Pubkey,
) -> Result<(), u32> {
    let ix = Instruction::new_with_bytes(
        program_id,
        &aegis_program::instruction::RemoveGuardian { guardian }.data(),
        aegis_program::accounts::RemoveGuardian {
            vault,
            owner: owner.pubkey(),
        }
        .to_account_metas(None),
    );

    send_tx(svm, owner, ix)
}

#[test]
fn initialize_vault_sets_correct_default_state() {
    let program_id = aegis_program::id();
    let owner = Keypair::new();

    let mut svm = new_svm(program_id, &owner);
    warp_clock_to(&mut svm, 1_700_000_000);
    let vault = initialize_vault(&mut svm, program_id, &owner);
    let state = get_vault(&svm, &vault);

    assert_eq!(state.owner, owner.pubkey());
    assert_eq!(state.guardians.len(), 0);
    assert_eq!(state.threshold, 1);
    assert_eq!(state.inactivity_window, MIN_INACTIVITY_WINDOW);
    assert_eq!(state.recovery_state, RecoveryState::Idle);
    assert_eq!(state.proposed_owner, None);
    assert_eq!(state.approvals.len(), 0);
    assert_eq!(state.initiated_at, 0);
    assert!(state.last_activity > 0);
}

#[test]
fn initialize_vault_fails_when_called_twice() {
    let program_id = aegis_program::id();
    let owner = Keypair::new();

    let (mut svm, _vault) = setup_vault(program_id, &owner);

    let (_vault, ix) = initialize_vault_ix(program_id, &owner);
    let result = send_tx_raw(&mut svm, &owner, ix);
    assert!(result.is_err(), "re-initialization should fail");
}

#[test]
fn add_guardian_as_owner_succeeds() {
    let program_id = aegis_program::id();
    let owner = Keypair::new();
    let guardian = Pubkey::new_unique();

    let (mut svm, vault) = setup_vault(program_id, &owner);
    add_guardian(&mut svm, program_id, &owner, vault, guardian);

    let state = get_vault(&svm, &vault);
    assert_eq!(state.guardians.len(), 1);
    assert_eq!(state.guardians[0], guardian);
}

#[test]
fn add_guardian_fails_when_signer_is_not_owner() {
    let program_id = aegis_program::id();
    let owner = Keypair::new();
    let intruder = Keypair::new();
    let guardian = Pubkey::new_unique();

    let (mut svm, vault) = setup_vault(program_id, &owner);
    svm.airdrop(&intruder.pubkey(), 1_000_000_000).unwrap();

    const UNAUTHORIZED: u32 = 6003;
    let err = add_guardian_result(&mut svm, program_id, &intruder, vault, guardian)
        .expect_err("non-owner should not be able to add a guardian");
    assert_eq!(err, UNAUTHORIZED);
}

#[test]
fn add_guardian_fails_on_duplicate() {
    let program_id = aegis_program::id();
    let owner = Keypair::new();
    let guardian = Pubkey::new_unique();

    let (mut svm, vault) = setup_vault(program_id, &owner);
    add_guardian(&mut svm, program_id, &owner, vault, guardian);
    svm.expire_blockhash();

    const DUPLICATE_GUARDIAN: u32 = 6000;
    let err = add_guardian_result(&mut svm, program_id, &owner, vault, guardian)
        .expect_err("adding a duplicate guardian should fail");
    assert_eq!(err, DUPLICATE_GUARDIAN);
}

#[test]
fn add_guardian_fails_once_max_guardians_reached() {
    let program_id = aegis_program::id();
    let owner = Keypair::new();

    let (mut svm, vault) = setup_vault(program_id, &owner);

    for _ in 0..MAX_GUARDIANS {
        add_guardian(&mut svm, program_id, &owner, vault, Pubkey::new_unique());
    }

    let state = get_vault(&svm, &vault);
    assert_eq!(state.guardians.len(), MAX_GUARDIANS);

    const MAX_GUARDIANS_REACHED: u32 = 6001;
    let err = add_guardian_result(&mut svm, program_id, &owner, vault, Pubkey::new_unique())
        .expect_err("adding past MAX_GUARDIANS should fail");
    assert_eq!(err, MAX_GUARDIANS_REACHED);
}

#[test]
fn set_threshold_fails_when_zero() {
    let program_id = aegis_program::id();
    let owner = Keypair::new();

    let (mut svm, vault) = setup_vault(program_id, &owner);
    add_guardian(&mut svm, program_id, &owner, vault, Pubkey::new_unique());

    const THRESHOLD_TOO_LOW: u32 = 6007;
    let err = set_threshold_result(&mut svm, program_id, &owner, vault, 0)
        .expect_err("a threshold of zero should fail");
    assert_eq!(err, THRESHOLD_TOO_LOW);
}

#[test]
fn set_threshold_fails_when_exceeding_guardian_count() {
    let program_id = aegis_program::id();
    let owner = Keypair::new();

    let (mut svm, vault) = setup_vault(program_id, &owner);
    add_guardian(&mut svm, program_id, &owner, vault, Pubkey::new_unique());

    const THRESHOLD_EXCEEDS_GUARDIANS: u32 = 6006;
    let err = set_threshold_result(&mut svm, program_id, &owner, vault, 2)
        .expect_err("a threshold exceeding the guardian count should fail");
    assert_eq!(err, THRESHOLD_EXCEEDS_GUARDIANS);
}

#[test]
fn set_threshold_sets_a_valid_value() {
    let program_id = aegis_program::id();
    let owner = Keypair::new();

    let (mut svm, vault) = setup_vault(program_id, &owner);
    for _ in 0..3 {
        add_guardian(&mut svm, program_id, &owner, vault, Pubkey::new_unique());
    }

    set_threshold(&mut svm, program_id, &owner, vault, 2);

    let state = get_vault(&svm, &vault);
    assert_eq!(state.threshold, 2);
}

#[test]
fn remove_guardian_fails_when_not_registered() {
    let program_id = aegis_program::id();
    let owner = Keypair::new();

    let (mut svm, vault) = setup_vault(program_id, &owner);

    const GUARDIAN_NOT_FOUND: u32 = 6002;
    let err = remove_guardian(&mut svm, program_id, &owner, vault, Pubkey::new_unique())
        .expect_err("removing an unregistered guardian should fail");
    assert_eq!(err, GUARDIAN_NOT_FOUND);
}

#[test]
fn remove_guardian_fails_when_below_threshold() {
    let program_id = aegis_program::id();
    let owner = Keypair::new();
    let guardian_a = Pubkey::new_unique();
    let guardian_b = Pubkey::new_unique();

    let (mut svm, vault) = setup_vault(program_id, &owner);
    add_guardian(&mut svm, program_id, &owner, vault, guardian_a);
    add_guardian(&mut svm, program_id, &owner, vault, guardian_b);
    set_threshold(&mut svm, program_id, &owner, vault, 2);

    const REMOVAL_BELOW_THRESHOLD: u32 = 6004;
    let err = remove_guardian(&mut svm, program_id, &owner, vault, guardian_a)
        .expect_err("removal that would drop below the threshold should fail");
    assert_eq!(err, REMOVAL_BELOW_THRESHOLD);
}

#[test]
fn remove_guardian_removes_a_registered_guardian() {
    let program_id = aegis_program::id();
    let owner = Keypair::new();
    let guardian_a = Pubkey::new_unique();
    let guardian_b = Pubkey::new_unique();

    let (mut svm, vault) = setup_vault(program_id, &owner);
    add_guardian(&mut svm, program_id, &owner, vault, guardian_a);
    add_guardian(&mut svm, program_id, &owner, vault, guardian_b);

    remove_guardian(&mut svm, program_id, &owner, vault, guardian_a)
        .expect("removing a registered guardian should succeed");

    let state = get_vault(&svm, &vault);
    assert_eq!(state.guardians.len(), 1);
    assert_eq!(state.guardians[0], guardian_b);
}

#[test]
fn set_inactivity_window_fails_below_minimum() {
    let program_id = aegis_program::id();
    let owner = Keypair::new();

    let (mut svm, vault) = setup_vault(program_id, &owner);

    const INACTIVITY_WINDOW_TOO_SHORT: u32 = 6005;
    let err =
        set_inactivity_window_result(&mut svm, program_id, &owner, vault, MIN_INACTIVITY_WINDOW - 1)
            .expect_err("a window below the minimum should fail");
    assert_eq!(err, INACTIVITY_WINDOW_TOO_SHORT);
}

#[test]
fn set_inactivity_window_sets_a_valid_value() {
    let program_id = aegis_program::id();
    let owner = Keypair::new();
    let new_window = MIN_INACTIVITY_WINDOW * 2;

    let (mut svm, vault) = setup_vault(program_id, &owner);

    set_inactivity_window_result(&mut svm, program_id, &owner, vault, new_window)
        .expect("a valid window should succeed");

    let state = get_vault(&svm, &vault);
    assert_eq!(state.inactivity_window, new_window);
}

#[test]
fn ping_updates_last_activity_timestamp() {
    let program_id = aegis_program::id();
    let owner = Keypair::new();

    let (mut svm, vault) = setup_vault(program_id, &owner);
    let before = get_vault(&svm, &vault);

    warp_clock_to(&mut svm, before.last_activity + 10);
    ping(&mut svm, program_id, &owner, vault).expect("ping should succeed");

    let after = get_vault(&svm, &vault);
    assert!(after.last_activity >= before.last_activity);
    assert_eq!(after.last_activity, before.last_activity + 10);
}

#[test]
fn ping_fails_when_signer_is_not_owner() {
    let program_id = aegis_program::id();
    let owner = Keypair::new();
    let intruder = Keypair::new();

    let (mut svm, vault) = setup_vault(program_id, &owner);
    svm.airdrop(&intruder.pubkey(), 1_000_000_000).unwrap();

    const UNAUTHORIZED: u32 = 6003;
    let err = ping(&mut svm, program_id, &intruder, vault).expect_err("ping by non-owner should fail");
    assert_eq!(err, UNAUTHORIZED);
}

#[test]
fn initiate_recovery_fails_when_signer_is_not_a_guardian() {
    let program_id = aegis_program::id();
    let owner = Keypair::new();
    let outsider = Keypair::new();

    let (mut svm, vault) = setup_vault(program_id, &owner);
    svm.airdrop(&outsider.pubkey(), 1_000_000_000).unwrap();

    const GUARDIAN_NOT_FOUND: u32 = 6002;
    let err = initiate_recovery(&mut svm, program_id, &outsider, vault, Pubkey::new_unique())
        .expect_err("a non-guardian should not be able to initiate recovery");
    assert_eq!(err, GUARDIAN_NOT_FOUND);
}

#[test]
fn initiate_recovery_fails_when_inactivity_window_not_elapsed() {
    let program_id = aegis_program::id();
    let owner = Keypair::new();
    let guardian = Keypair::new();

    let (mut svm, vault) = setup_vault(program_id, &owner);
    svm.airdrop(&guardian.pubkey(), 1_000_000_000).unwrap();
    add_guardian(&mut svm, program_id, &owner, vault, guardian.pubkey());

    const INACTIVITY_WINDOW_NOT_ELAPSED: u32 = 6010;
    let err = initiate_recovery(&mut svm, program_id, &guardian, vault, Pubkey::new_unique())
        .expect_err("recovery should not be initiable before the inactivity window elapses");
    assert_eq!(err, INACTIVITY_WINDOW_NOT_ELAPSED);
}

#[test]
fn cancel_recovery_fails_when_no_active_recovery() {
    let program_id = aegis_program::id();
    let owner = Keypair::new();

    let (mut svm, vault) = setup_vault(program_id, &owner);

    const NO_ACTIVE_RECOVERY: u32 = 6009;
    let err = cancel_recovery(&mut svm, program_id, &owner, vault)
        .expect_err("cancelling with no active recovery should fail");
    assert_eq!(err, NO_ACTIVE_RECOVERY);
}

#[test]
fn approve_recovery_fails_when_no_active_recovery() {
    let program_id = aegis_program::id();
    let owner = Keypair::new();
    let guardian = Keypair::new();

    let (mut svm, vault) = setup_vault(program_id, &owner);
    svm.airdrop(&guardian.pubkey(), 1_000_000_000).unwrap();
    add_guardian(&mut svm, program_id, &owner, vault, guardian.pubkey());

    const NO_ACTIVE_RECOVERY: u32 = 6009;
    let err = approve_recovery(&mut svm, program_id, &guardian, vault)
        .expect_err("approving with no active recovery should fail");
    assert_eq!(err, NO_ACTIVE_RECOVERY);
}

#[test]
fn execute_rotation_fails_when_no_active_recovery() {
    let program_id = aegis_program::id();
    let owner = Keypair::new();
    let guardian = Keypair::new();

    let (mut svm, vault) = setup_vault(program_id, &owner);
    svm.airdrop(&guardian.pubkey(), 1_000_000_000).unwrap();
    add_guardian(&mut svm, program_id, &owner, vault, guardian.pubkey());

    const NO_ACTIVE_RECOVERY: u32 = 6009;
    let err = execute_rotation(&mut svm, program_id, &guardian, vault)
        .expect_err("executing rotation with no active recovery should fail");
    assert_eq!(err, NO_ACTIVE_RECOVERY);
}

#[test]
fn full_recovery_flow_happy_path() {
    let program_id = aegis_program::id();
    let owner = Keypair::new();
    let new_owner = Pubkey::new_unique();
    let guardians = [Keypair::new(), Keypair::new(), Keypair::new()];

    let mut svm = new_svm(program_id, &owner);
    let vault = setup_vault_for_recovery(&mut svm, program_id, &owner, &guardians, 2);

    initiate_recovery(&mut svm, program_id, &guardians[0], vault, new_owner)
        .expect("initiate_recovery should succeed");

    approve_recovery(&mut svm, program_id, &guardians[0], vault)
        .expect("first approval should succeed");
    approve_recovery(&mut svm, program_id, &guardians[1], vault)
        .expect("second approval should succeed");

    execute_rotation(&mut svm, program_id, &guardians[2], vault)
        .expect("execute_rotation should succeed once the threshold is met");

    let state = get_vault(&svm, &vault);
    assert_eq!(state.owner, new_owner);
    assert!(!state.is_recovery_active());
    assert_eq!(state.proposed_owner, None);
    assert!(state.approvals.is_empty());
    assert_eq!(state.initiated_at, 0);
}

#[test]
fn owner_cancels_active_recovery() {
    let program_id = aegis_program::id();
    let owner = Keypair::new();
    let new_owner = Pubkey::new_unique();
    let guardians = [Keypair::new(), Keypair::new(), Keypair::new()];

    let mut svm = new_svm(program_id, &owner);
    let vault = setup_vault_for_recovery(&mut svm, program_id, &owner, &guardians, 2);

    initiate_recovery(&mut svm, program_id, &guardians[0], vault, new_owner)
        .expect("initiate_recovery should succeed");
    approve_recovery(&mut svm, program_id, &guardians[0], vault)
        .expect("approval should succeed");

    cancel_recovery(&mut svm, program_id, &owner, vault).expect("cancel_recovery should succeed");

    let state = get_vault(&svm, &vault);
    assert!(!state.is_recovery_active());
    assert_eq!(state.proposed_owner, None);
    assert!(state.approvals.is_empty());
    assert_eq!(state.initiated_at, 0);
    assert_eq!(state.owner, owner.pubkey());
}

#[test]
fn blocks_ping_while_recovery_is_active() {
    let program_id = aegis_program::id();
    let owner = Keypair::new();
    let new_owner = Pubkey::new_unique();
    let guardians = [Keypair::new(), Keypair::new(), Keypair::new()];

    let mut svm = new_svm(program_id, &owner);
    let vault = setup_vault_for_recovery(&mut svm, program_id, &owner, &guardians, 2);

    initiate_recovery(&mut svm, program_id, &guardians[0], vault, new_owner)
        .expect("initiate_recovery should succeed");

    const BLOCKED_DURING_RECOVERY: u32 = 6014;
    let err = ping(&mut svm, program_id, &owner, vault).expect_err("ping should be blocked");
    assert_eq!(err, BLOCKED_DURING_RECOVERY);
}

#[test]
fn blocks_remove_guardian_while_recovery_is_active() {
    let program_id = aegis_program::id();
    let owner = Keypair::new();
    let new_owner = Pubkey::new_unique();
    let guardians = [Keypair::new(), Keypair::new(), Keypair::new()];

    let mut svm = new_svm(program_id, &owner);
    let vault = setup_vault_for_recovery(&mut svm, program_id, &owner, &guardians, 2);

    initiate_recovery(&mut svm, program_id, &guardians[0], vault, new_owner)
        .expect("initiate_recovery should succeed");

    const BLOCKED_DURING_RECOVERY: u32 = 6014;
    let err = remove_guardian(&mut svm, program_id, &owner, vault, guardians[2].pubkey())
        .expect_err("remove_guardian should be blocked");
    assert_eq!(err, BLOCKED_DURING_RECOVERY);
}

#[test]
fn fails_to_initiate_a_second_recovery_while_one_is_active() {
    let program_id = aegis_program::id();
    let owner = Keypair::new();
    let new_owner = Pubkey::new_unique();
    let guardians = [Keypair::new(), Keypair::new(), Keypair::new()];

    let mut svm = new_svm(program_id, &owner);
    let vault = setup_vault_for_recovery(&mut svm, program_id, &owner, &guardians, 2);

    initiate_recovery(&mut svm, program_id, &guardians[0], vault, new_owner)
        .expect("initiate_recovery should succeed");

    const RECOVERY_ALREADY_ACTIVE: u32 = 6008;
    let err = initiate_recovery(
        &mut svm,
        program_id,
        &guardians[1],
        vault,
        Pubkey::new_unique(),
    )
    .expect_err("a second initiate_recovery should fail");
    assert_eq!(err, RECOVERY_ALREADY_ACTIVE);
}

#[test]
fn rejects_a_duplicate_approval_from_the_same_guardian() {
    let program_id = aegis_program::id();
    let owner = Keypair::new();
    let new_owner = Pubkey::new_unique();
    let guardians = [Keypair::new(), Keypair::new(), Keypair::new()];

    let mut svm = new_svm(program_id, &owner);
    let vault = setup_vault_for_recovery(&mut svm, program_id, &owner, &guardians, 2);

    initiate_recovery(&mut svm, program_id, &guardians[0], vault, new_owner)
        .expect("initiate_recovery should succeed");
    approve_recovery(&mut svm, program_id, &guardians[0], vault)
        .expect("first approval should succeed");
    svm.expire_blockhash();

    const ALREADY_APPROVED: u32 = 6011;
    let err = approve_recovery(&mut svm, program_id, &guardians[0], vault)
        .expect_err("duplicate approval should fail");
    assert_eq!(err, ALREADY_APPROVED);
}

#[test]
fn fails_to_execute_rotation_when_threshold_is_not_met() {
    let program_id = aegis_program::id();
    let owner = Keypair::new();
    let new_owner = Pubkey::new_unique();
    let guardians = [Keypair::new(), Keypair::new(), Keypair::new()];

    let mut svm = new_svm(program_id, &owner);
    let vault = setup_vault_for_recovery(&mut svm, program_id, &owner, &guardians, 2);

    initiate_recovery(&mut svm, program_id, &guardians[0], vault, new_owner)
        .expect("initiate_recovery should succeed");
    approve_recovery(&mut svm, program_id, &guardians[0], vault)
        .expect("first approval should succeed");

    const THRESHOLD_NOT_MET: u32 = 6013;
    let err = execute_rotation(&mut svm, program_id, &guardians[2], vault)
        .expect_err("execute_rotation should fail without enough approvals");
    assert_eq!(err, THRESHOLD_NOT_MET);
}

#[test]
fn approve_recovery_fails_after_expiry() {
    let program_id = aegis_program::id();
    let owner = Keypair::new();
    let new_owner = Pubkey::new_unique();
    let guardians = [Keypair::new(), Keypair::new(), Keypair::new()];

    let mut svm = new_svm(program_id, &owner);
    let vault = setup_vault_for_recovery(&mut svm, program_id, &owner, &guardians, 2);

    initiate_recovery(&mut svm, program_id, &guardians[0], vault, new_owner)
        .expect("initiate_recovery should succeed");

    let state = get_vault(&svm, &vault);
    warp_clock_to(&mut svm, state.initiated_at + 604_800 + 1);

    const RECOVERY_EXPIRED: u32 = 6012;
    let err = approve_recovery(&mut svm, program_id, &guardians[0], vault)
        .expect_err("approval after expiry should fail");
    assert_eq!(err, RECOVERY_EXPIRED);
}

#[test]
fn execute_rotation_fails_after_expiry() {
    let program_id = aegis_program::id();
    let owner = Keypair::new();
    let new_owner = Pubkey::new_unique();
    let guardians = [Keypair::new(), Keypair::new(), Keypair::new()];

    let mut svm = new_svm(program_id, &owner);
    let vault = setup_vault_for_recovery(&mut svm, program_id, &owner, &guardians, 2);

    initiate_recovery(&mut svm, program_id, &guardians[0], vault, new_owner)
        .expect("initiate_recovery should succeed");
    approve_recovery(&mut svm, program_id, &guardians[0], vault)
        .expect("first approval should succeed");
    approve_recovery(&mut svm, program_id, &guardians[1], vault)
        .expect("second approval should succeed");

    let state = get_vault(&svm, &vault);
    warp_clock_to(&mut svm, state.initiated_at + 604_800 + 1);

    const RECOVERY_EXPIRED: u32 = 6012;
    let err = execute_rotation(&mut svm, program_id, &guardians[2], vault)
        .expect_err("rotation after expiry should fail even with threshold met");
    assert_eq!(err, RECOVERY_EXPIRED);
}

#[test]
fn approve_recovery_fails_when_signer_is_not_a_guardian() {
    let program_id = aegis_program::id();
    let owner = Keypair::new();
    let outsider = Keypair::new();
    let guardians = [Keypair::new(), Keypair::new(), Keypair::new()];

    let mut svm = new_svm(program_id, &owner);
    let vault = setup_vault_for_recovery(&mut svm, program_id, &owner, &guardians, 2);
    svm.airdrop(&outsider.pubkey(), 1_000_000_000).unwrap();

    initiate_recovery(&mut svm, program_id, &guardians[0], vault, Pubkey::new_unique())
        .expect("initiate_recovery should succeed");

    const GUARDIAN_NOT_FOUND: u32 = 6002;
    let err = approve_recovery(&mut svm, program_id, &outsider, vault)
        .expect_err("non-guardian should not be able to approve");
    assert_eq!(err, GUARDIAN_NOT_FOUND);
}