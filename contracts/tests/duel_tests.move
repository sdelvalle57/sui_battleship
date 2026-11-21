// Copyright (c) 2025-2026 sdelvalle57
// SPDX-License-Identifier: Apache-2.0

#[test_only]
module battleship::duel_tests;

use battleship::duel::{
    Self,
    Duel,
    DuelCreated,
    DuelCancelled,
    DuelActivated,
    DuelResolved,
    DuelTurn,
    DuelTimedOut,
    DuelExpired
};
use battleship::game::{Self, Game};
use battleship::house::{Self, House, HouseCap};
use sui::clock;
use sui::coin::{Self, Coin};
use sui::event;
use sui::sui::SUI;
use sui::test_scenario::{Self, Scenario};

// Witnesses of two test games (never published: they only exist in this test module). A game can only
// create, activate and settle a `Duel<G>` with its own witness: settling a `Duel<TestGame>` with an
// `OtherGame` value does not type-check (`pay<G>` takes `_: G` and `&mut Duel<G>` with the same `G`), so
// that case cannot be written as a test; it is the V-14 probe of TASK-1b.
public struct TestGame has drop {}
public struct OtherGame has drop {}

const PUBLISHER: address = @0xA; // House and HouseCap
const CREATOR: address = @0xB;
const INVITEE: address = @0xC;
const OTHER: address = @0xD;
const ACCEPTOR: address = @0xE; // acceptor of open duels

const MIN_BET: u64 = 1_000_000; // House default
const MAX_BET: u64 = 50_000_000_000; // House default
const BET: u64 = 10_000_000;
const ODD_BET: u64 = 1_000_001; // odd pot: 2_000_002
const NEWER_VERSION: u64 = 2;
const OLDER_VERSION: u64 = 0;
const HUGE_BET: u64 = 9_000_000_000_000_000_000; // pot = 2 × HUGE_BET fits u64; pot × fee_rate does not

// Time controls (R.2): ids and their `turn_ms`.
const CONTROL_NONE: u8 = 0;
const CONTROL_RAPID_10: u8 = 1;
const CONTROL_RAPID_20: u8 = 2;
const CONTROL_RAPID_30: u8 = 3;
const RAPID_10_MS: u64 = 600_000;
const RAPID_20_MS: u64 = 1_200_000;
const RAPID_30_MS: u64 = 1_800_000;

// `to_move` masks (R.1).
const TO_CREATOR: u8 = 1;
const TO_ACCEPTOR: u8 = 2;
const TO_BOTH: u8 = 3;

const WINNER_CREATOR: u8 = 0;
const WINNER_ACCEPTOR: u8 = 1;

// Publishes the package as PUBLISHER and opens the next transaction, also as PUBLISHER.
fun publish(): Scenario {
    let mut scenario = test_scenario::begin(PUBLISHER);
    house::init_for_testing(scenario.ctx());
    scenario.next_tx(PUBLISHER);
    scenario
}

// Sets the House fee rate as PUBLISHER in a new transaction.
fun set_fee_rate(scenario: &mut Scenario, bps: u16) {
    scenario.next_tx(PUBLISHER);
    let mut house = scenario.take_shared<House>();
    let cap = scenario.take_from_sender<HouseCap>();
    house::update_fee_rate(&mut house, &cap, bps);
    scenario.return_to_sender(cap);
    test_scenario::return_shared(house);
}

// Sets the House bet limits as PUBLISHER in a new transaction.
fun set_bet_limits(scenario: &mut Scenario, min: u64, max: u64) {
    scenario.next_tx(PUBLISHER);
    let mut house = scenario.take_shared<House>();
    let cap = scenario.take_from_sender<HouseCap>();
    house::update_bet_limits(&mut house, &cap, min, max);
    scenario.return_to_sender(cap);
    test_scenario::return_shared(house);
}

// Sets the version of the (first) House in a new transaction as PUBLISHER.
fun set_house_version(scenario: &mut Scenario, version: u64) {
    scenario.next_tx(PUBLISHER);
    let mut house = scenario.take_shared<House>();
    house::set_version_for_testing(&mut house, version);
    test_scenario::return_shared(house);
}

// Sets the version of the duel in a new transaction as PUBLISHER.
fun set_duel_version(scenario: &mut Scenario, duel_id: ID, version: u64) {
    scenario.next_tx(PUBLISHER);
    let mut duel = scenario.take_shared_by_id<Duel<TestGame>>(duel_id);
    duel.set_version_for_testing(version);
    test_scenario::return_shared(duel);
}

// Starts a transaction as `sender` with the Clock at exactly `ms` (H-g, measured in TASK-1b: the
// builder comes from the scenario and is bound to a variable; `next_tx` first changes the sender, which
// takes the Clock 1 ms ahead, so `ms` must be greater than that). The transaction stays open.
fun at(scenario: &mut Scenario, sender: address, ms: u64) {
    scenario.next_tx(sender);
    let builder = test_scenario::ctx_builder(scenario).set_clock_timestamp(ms);
    scenario.next_with_context(builder);
}

// Creates a duel of `TestGame` as `creator` with a fresh coin of `bet` MIST, closes the transaction (next
// one as `creator`) and returns the ID of the new shared duel.
fun create(
    scenario: &mut Scenario,
    creator: address,
    bet: u64,
    opponent: Option<address>,
    control: u8,
): ID {
    scenario.next_tx(creator);
    let house = scenario.take_shared<House>();
    let stake = coin::mint_for_testing<SUI>(bet, scenario.ctx());
    duel::create(TestGame {}, &house, stake, opponent, control, scenario.ctx());
    test_scenario::return_shared(house);
    scenario.next_tx(creator);
    test_scenario::most_recent_id_shared<Duel<TestGame>>().destroy_some()
}

// Calls `create` as CREATOR in a new transaction and ends the scenario; for the abort tests.
fun create_expecting_abort(
    mut scenario: Scenario,
    bet: u64,
    opponent: Option<address>,
    control: u8,
) {
    scenario.next_tx(CREATOR);
    let house = scenario.take_shared<House>();
    let stake = coin::mint_for_testing<SUI>(bet, scenario.ctx());
    duel::create(TestGame {}, &house, stake, opponent, control, scenario.ctx());
    test_scenario::return_shared(house);
    scenario.end();
}

// Shares a second House (with its own HouseCap for PUBLISHER) and returns its ID. Duels created before
// keep pointing to the first one.
fun other_house(scenario: &mut Scenario): ID {
    scenario.next_tx(PUBLISHER);
    house::init_for_testing(scenario.ctx());
    scenario.next_tx(PUBLISHER);
    test_scenario::most_recent_id_shared<House>().destroy_some()
}

// Takes the House `house_id`, or the most recent shared House when there is only one. A shared object
// returned in a transaction cannot be taken again in it: callers take the duel and the House once.
fun take_house(scenario: &Scenario, house_id: Option<ID>): House {
    if (house_id.is_some()) {
        scenario.take_shared_by_id<House>(house_id.destroy_some())
    } else {
        scenario.take_shared<House>()
    }
}

// Calls `activate` as the sender of the CURRENT transaction with a fresh coin of `amount` MIST, against
// the House `house_id` (none = the only House). The transaction stays open (events are readable before
// the next `next_tx`).
fun activate_with(
    scenario: &mut Scenario,
    duel_id: ID,
    house_id: Option<ID>,
    amount: u64,
    first_to_move: u8,
) {
    let mut duel = scenario.take_shared_by_id<Duel<TestGame>>(duel_id);
    let house = take_house(scenario, house_id);
    let payment = coin::mint_for_testing<SUI>(amount, scenario.ctx());
    duel::activate(TestGame {}, &mut duel, &house, payment, first_to_move, scenario.ctx());
    test_scenario::return_shared(duel);
    test_scenario::return_shared(house);
}

// `activate_with` against the second House.
fun activate_on_house_now(
    scenario: &mut Scenario,
    duel_id: ID,
    house_id: ID,
    amount: u64,
    first_to_move: u8,
) {
    activate_with(scenario, duel_id, option::some(house_id), amount, first_to_move);
}

// `activate_with` against the only House, in the current transaction.
fun activate_now(scenario: &mut Scenario, duel_id: ID, amount: u64, first_to_move: u8) {
    activate_with(scenario, duel_id, option::none(), amount, first_to_move);
}

// `activate_now` in a new transaction as `acceptor`.
fun activate(
    scenario: &mut Scenario,
    duel_id: ID,
    acceptor: address,
    amount: u64,
    first_to_move: u8,
) {
    scenario.next_tx(acceptor);
    activate_now(scenario, duel_id, amount, first_to_move);
}

// Calls `activate_atomic` and, in the same transaction, `pay` with `winner_index`, as the sender of
// the CURRENT transaction, against the House `house_id` (none = the only House). The transaction stays
// open.
fun atomic_with(
    scenario: &mut Scenario,
    duel_id: ID,
    house_id: Option<ID>,
    amount: u64,
    winner_index: u8,
) {
    let mut duel = scenario.take_shared_by_id<Duel<TestGame>>(duel_id);
    let mut house = take_house(scenario, house_id);
    let payment = coin::mint_for_testing<SUI>(amount, scenario.ctx());
    let c = duel::activate_atomic(TestGame {}, &mut duel, &mut house, payment, scenario.ctx());
    duel::pay(TestGame {}, &mut duel, c, winner_index, scenario.ctx());
    test_scenario::return_shared(duel);
    test_scenario::return_shared(house);
}

// `atomic_with` against the second House.
fun atomic_on_house_now(
    scenario: &mut Scenario,
    duel_id: ID,
    house_id: ID,
    amount: u64,
    winner_index: u8,
) {
    atomic_with(scenario, duel_id, option::some(house_id), amount, winner_index);
}

// `atomic_with` against the only House, in a new transaction as `acceptor`.
fun atomic(
    scenario: &mut Scenario,
    duel_id: ID,
    acceptor: address,
    amount: u64,
    winner_index: u8,
) {
    scenario.next_tx(acceptor);
    atomic_with(scenario, duel_id, option::none(), amount, winner_index);
}

// Calls `collect` and, in the same transaction, `pay` with `winner_index`, as the sender of the CURRENT
// transaction, against the House `house_id` (none = the only House). The transaction stays open.
fun collect_with(
    scenario: &mut Scenario,
    duel_id: ID,
    house_id: Option<ID>,
    winner_index: u8,
) {
    let mut duel = scenario.take_shared_by_id<Duel<TestGame>>(duel_id);
    let mut house = take_house(scenario, house_id);
    let c = duel::collect(TestGame {}, &mut duel, &mut house, scenario.ctx());
    duel::pay(TestGame {}, &mut duel, c, winner_index, scenario.ctx());
    test_scenario::return_shared(duel);
    test_scenario::return_shared(house);
}

// `collect_with` against the second House.
fun collect_on_house_now(
    scenario: &mut Scenario,
    duel_id: ID,
    house_id: ID,
    winner_index: u8,
) {
    collect_with(scenario, duel_id, option::some(house_id), winner_index);
}

// `collect_with` against the only House, in the current transaction.
fun collect_now(scenario: &mut Scenario, duel_id: ID, winner_index: u8) {
    collect_with(scenario, duel_id, option::none(), winner_index);
}

// `collect_now` in a new transaction as `sender`.
fun collect(scenario: &mut Scenario, duel_id: ID, sender: address, winner_index: u8) {
    scenario.next_tx(sender);
    collect_now(scenario, duel_id, winner_index);
}

// Cancels the duel as `sender` in a new transaction.
fun cancel(scenario: &mut Scenario, duel_id: ID, sender: address) {
    scenario.next_tx(sender);
    let mut duel = scenario.take_shared_by_id<Duel<TestGame>>(duel_id);
    duel::cancel(&mut duel, scenario.ctx());
    test_scenario::return_shared(duel);
}

// Asserts that `account` holds exactly one `Coin<SUI>` and that its value is `amount`.
fun assert_single_coin(scenario: &Scenario, account: address, amount: u64) {
    assert!(test_scenario::ids_for_address<Coin<SUI>>(account).length() == 1);
    let coin = scenario.take_from_address<Coin<SUI>>(account);
    assert!(coin.value() == amount);
    test_scenario::return_to_address(account, coin);
}

// Sum of the values of all the `Coin<SUI>` held by `account`.
fun sum_coins(scenario: &Scenario, account: address): u64 {
    let mut total = 0;
    test_scenario::ids_for_address<Coin<SUI>>(account).do!(|id| {
        let coin = scenario.take_from_address_by_id<Coin<SUI>>(account, id);
        total = total + coin.value();
        test_scenario::return_to_address(account, coin);
    });
    total
}

// Fees collected by the (first) House, read in a new transaction as PUBLISHER.
fun fees_of_house(scenario: &mut Scenario): u64 {
    scenario.next_tx(PUBLISHER);
    let house = scenario.take_shared<House>();
    let fees = house.fees_collected();
    test_scenario::return_shared(house);
    fees
}

// Checks the settlement of a duel right after its `pay`, in the still-open transaction (SEG-4):
// `DuelResolved`, one coin of `payout` for the winner (who must have no other coin) as the only transfer
// of the transaction (the loser gets nothing), House fees up by `fee`, empty stake,
// `Resolved { acceptor, winner }` and `payout + fee == 2 × bet`.
fun assert_resolved(
    scenario: &mut Scenario,
    duel_id: ID,
    acceptor: address,
    winner: address,
    fee: u64,
    payout: u64,
    fees_before: u64,
) {
    let resolved_events = event::events_by_type<DuelResolved<TestGame>>();
    // The effects of the settlement transaction: its only transfer is the payout, to the winner.
    let effects = scenario.next_tx(winner);
    let transfers = test_scenario::transferred_to_account(&effects);
    assert!(transfers.length() == 1);
    let (_, recipient) = transfers.get_entry_by_idx(0);
    assert!(*recipient == winner);
    let duel = scenario.take_shared_by_id<Duel<TestGame>>(duel_id);
    let creator = duel.creator_for_testing();
    let pot = 2 * duel.bet_for_testing();
    assert!(payout + fee == pot);
    let expected = duel::new_duel_resolved_for_testing<TestGame>(
        duel_id,
        creator,
        acceptor,
        winner,
        pot,
        fee,
        payout,
    );
    assert!(resolved_events == vector[expected]);
    assert!(duel.stake_value_for_testing() == 0);
    assert!(duel.is_resolved_for_testing());
    assert!(!duel.is_pending_for_testing());
    assert!(!duel.is_cancelled_for_testing());
    assert!(!duel.is_active_for_testing());
    assert!(duel.acceptor_for_testing() == option::some(acceptor));
    assert!(duel.winner_for_testing() == option::some(winner));
    assert!(duel.to_move_for_testing().is_none());
    assert!(duel.deadline_ms_for_testing().is_none());
    test_scenario::return_shared(duel);
    let house = scenario.take_shared<House>();
    assert!(house.fees_collected() == fees_before + fee);
    test_scenario::return_shared(house);
    // The winner holds the payout (callers use a winner with no other coin).
    assert_single_coin(scenario, winner, payout);
}

// ---------------------------------------------------------------------------------------------
// create
// ---------------------------------------------------------------------------------------------

// First test of the helper `at` (sender change with a previous `next_tx`, not exercised in TASK-1b).
#[test]
fun test_clock_helper_sets_exact_timestamp_with_sender_change() {
    let mut scenario = publish();
    at(&mut scenario, CREATOR, 1_000_000);
    assert!(scenario.sender() == CREATOR);
    assert!(clock::borrow().timestamp_ms() == 1_000_000);
    at(&mut scenario, ACCEPTOR, 2_500_000);
    assert!(scenario.sender() == ACCEPTOR);
    assert!(clock::borrow().timestamp_ms() == 2_500_000);
    scenario.next_tx(OTHER);
    assert!(clock::borrow().timestamp_ms() == 2_500_001);
    scenario.end();
}

#[test]
fun test_create_open_duel_stores_fields_and_emits_event() {
    let mut scenario = publish();
    scenario.next_tx(CREATOR);
    let house = scenario.take_shared<House>();
    let house_id = object::id(&house);
    let house_version = house.version();
    let house_fee_rate = house.fee_rate();
    let stake = coin::mint_for_testing<SUI>(BET, scenario.ctx());

    duel::create(TestGame {}, &house, stake, option::none(), CONTROL_RAPID_10, scenario.ctx());

    let created_events = event::events_by_type<DuelCreated<TestGame>>();
    test_scenario::return_shared(house);
    let effects = scenario.next_tx(CREATOR);
    let duel_id = test_scenario::most_recent_id_shared<Duel<TestGame>>().destroy_some();
    assert!(test_scenario::shared(&effects).contains(&duel_id));
    let expected = duel::new_duel_created_for_testing<TestGame>(
        duel_id,
        CREATOR,
        option::none(),
        BET,
        house_fee_rate,
        CONTROL_RAPID_10,
        RAPID_10_MS,
    );
    assert!(created_events == vector[expected]);

    let duel = scenario.take_shared_by_id<Duel<TestGame>>(duel_id);
    assert!(duel.creator_for_testing() == CREATOR);
    assert!(duel.opponent_for_testing().is_none());
    assert!(duel.bet_for_testing() == BET);
    assert!(duel.stake_value_for_testing() == BET);
    assert!(duel.fee_rate_for_testing() == house_fee_rate);
    assert!(duel.turn_ms_for_testing() == RAPID_10_MS);
    assert!(duel.house_id_for_testing() == house_id);
    assert!(duel.version_for_testing() == house_version);
    assert!(duel.is_pending_for_testing());
    assert!(!duel.is_cancelled_for_testing());
    assert!(!duel.is_active_for_testing());
    assert!(duel.to_move_for_testing().is_none());
    assert!(duel.deadline_ms_for_testing().is_none());
    assert!(!test_scenario::has_most_recent_for_address<Coin<SUI>>(CREATOR));
    test_scenario::return_shared(duel);
    scenario.end();
}

#[test]
fun test_create_invite_duel_stores_opponent() {
    let mut scenario = publish();
    scenario.next_tx(CREATOR);
    let house = scenario.take_shared<House>();
    let house_fee_rate = house.fee_rate();
    let stake = coin::mint_for_testing<SUI>(BET, scenario.ctx());

    duel::create(
        TestGame {},
        &house,
        stake,
        option::some(INVITEE),
        CONTROL_NONE,
        scenario.ctx(),
    );

    let created_events = event::events_by_type<DuelCreated<TestGame>>();
    test_scenario::return_shared(house);
    scenario.next_tx(CREATOR);
    let duel_id = test_scenario::most_recent_id_shared<Duel<TestGame>>().destroy_some();
    let expected = duel::new_duel_created_for_testing<TestGame>(
        duel_id,
        CREATOR,
        option::some(INVITEE),
        BET,
        house_fee_rate,
        CONTROL_NONE,
        0,
    );
    assert!(created_events == vector[expected]);

    let duel = scenario.take_shared_by_id<Duel<TestGame>>(duel_id);
    assert!(duel.opponent_for_testing() == option::some(INVITEE));
    assert!(duel.stake_value_for_testing() == BET);
    assert!(duel.is_pending_for_testing());
    test_scenario::return_shared(duel);
    scenario.end();
}

#[test]
fun test_create_copies_fee_rate_and_turn_ms() {
    let mut scenario = publish();
    set_fee_rate(&mut scenario, 250);
    let duel_id = create(&mut scenario, CREATOR, BET, option::none(), CONTROL_RAPID_30);

    set_fee_rate(&mut scenario, 500);
    scenario.next_tx(PUBLISHER);
    let house = scenario.take_shared<House>();
    assert!(house.fee_rate() == 500);
    test_scenario::return_shared(house);

    scenario.next_tx(CREATOR);
    let duel = scenario.take_shared_by_id<Duel<TestGame>>(duel_id);
    assert!(duel.fee_rate_for_testing() == 250);
    assert!(duel.turn_ms_for_testing() == RAPID_30_MS);
    test_scenario::return_shared(duel);
    scenario.end();
}

#[test]
fun test_create_sets_turn_ms_for_each_control() {
    let mut scenario = publish();
    // R.2: id -> turn_ms. Id 0 = no clock; id 7 = MAX_TURN_MS (7 days).
    let table = vector[
        0,
        600_000,
        1_200_000,
        1_800_000,
        3_600_000,
        86_400_000,
        259_200_000,
        604_800_000,
    ];
    let mut control = 0u8;
    while ((control as u64) < table.length()) {
        scenario.next_tx(CREATOR);
        let house = scenario.take_shared<House>();
        let stake = coin::mint_for_testing<SUI>(BET, scenario.ctx());
        duel::create(TestGame {}, &house, stake, option::none(), control, scenario.ctx());
        let created_events = event::events_by_type<DuelCreated<TestGame>>();
        test_scenario::return_shared(house);
        scenario.next_tx(CREATOR);
        let duel_id = test_scenario::most_recent_id_shared<Duel<TestGame>>().destroy_some();
        let expected_ms = table[control as u64];
        let expected = duel::new_duel_created_for_testing<TestGame>(
            duel_id,
            CREATOR,
            option::none(),
            BET,
            0,
            control,
            expected_ms,
        );
        assert!(created_events == vector[expected]);
        let duel = scenario.take_shared_by_id<Duel<TestGame>>(duel_id);
        assert!(duel.turn_ms_for_testing() == expected_ms);
        test_scenario::return_shared(duel);
        control = control + 1;
    };
    scenario.end();
}

// Functional barrier (R2-1): a sandbox that adds an id 8 to the table has to fail here.
#[test, expected_failure(abort_code = battleship::duel::EBadControl)]
fun test_create_rejects_invalid_control() {
    let scenario = publish();
    create_expecting_abort(scenario, BET, option::none(), 8);
}

#[test, expected_failure(abort_code = battleship::duel::EBadControl)]
fun test_create_rejects_control_255() {
    let scenario = publish();
    create_expecting_abort(scenario, BET, option::none(), 255);
}

#[test]
fun test_create_accepts_bet_equal_to_min_bet() {
    let mut scenario = publish();
    let duel_id = create(&mut scenario, CREATOR, MIN_BET, option::none(), CONTROL_NONE);

    let duel = scenario.take_shared_by_id<Duel<TestGame>>(duel_id);
    assert!(duel.bet_for_testing() == MIN_BET);
    assert!(duel.stake_value_for_testing() == MIN_BET);
    test_scenario::return_shared(duel);
    scenario.end();
}

#[test]
fun test_create_accepts_bet_equal_to_max_bet() {
    let mut scenario = publish();
    let duel_id = create(&mut scenario, CREATOR, MAX_BET, option::none(), CONTROL_NONE);

    let duel = scenario.take_shared_by_id<Duel<TestGame>>(duel_id);
    assert!(duel.bet_for_testing() == MAX_BET);
    assert!(duel.stake_value_for_testing() == MAX_BET);
    test_scenario::return_shared(duel);
    scenario.end();
}

#[test, expected_failure(abort_code = battleship::duel::EBetTooLow)]
fun test_create_rejects_bet_below_min() {
    let scenario = publish();
    create_expecting_abort(scenario, MIN_BET - 1, option::none(), CONTROL_NONE);
}

#[test, expected_failure(abort_code = battleship::duel::EBetTooHigh)]
fun test_create_rejects_bet_above_max() {
    let scenario = publish();
    create_expecting_abort(scenario, MAX_BET + 1, option::none(), CONTROL_NONE);
}

#[test, expected_failure(abort_code = battleship::duel::ESelfInvite)]
fun test_create_rejects_self_invite() {
    let scenario = publish();
    create_expecting_abort(scenario, BET, option::some(CREATOR), CONTROL_NONE);
}

#[test, expected_failure(abort_code = battleship::house::EWrongVersion)]
fun test_create_rejects_house_with_wrong_version() {
    let mut scenario = publish();
    set_house_version(&mut scenario, NEWER_VERSION);

    create_expecting_abort(scenario, BET, option::none(), CONTROL_NONE);
}

#[test, expected_failure(abort_code = battleship::house::EWrongVersion)]
fun test_create_reports_version_before_bet() {
    let mut scenario = publish();
    set_house_version(&mut scenario, NEWER_VERSION);

    create_expecting_abort(scenario, MIN_BET - 1, option::some(CREATOR), 8);
}

#[test, expected_failure(abort_code = battleship::duel::EBetTooLow)]
fun test_create_reports_bet_error_before_self_invite() {
    let scenario = publish();
    create_expecting_abort(scenario, MIN_BET - 1, option::some(CREATOR), CONTROL_NONE);
}

// T-2: a bet ABOVE the maximum is reported before the self-invitation (the test above uses a low bet).
#[test, expected_failure(abort_code = battleship::duel::EBetTooHigh)]
fun test_create_reports_bet_too_high_before_self_invite() {
    let scenario = publish();
    create_expecting_abort(scenario, MAX_BET + 1, option::some(CREATOR), CONTROL_NONE);
}

#[test, expected_failure(abort_code = battleship::duel::ESelfInvite)]
fun test_create_reports_self_invite_before_control() {
    let scenario = publish();
    create_expecting_abort(scenario, BET, option::some(CREATOR), 8);
}

#[test]
fun test_duels_of_same_creator_are_independent() {
    let mut scenario = publish();
    let first_id = create(&mut scenario, CREATOR, BET, option::none(), CONTROL_NONE);
    let second_id = create(&mut scenario, CREATOR, BET, option::some(INVITEE), CONTROL_RAPID_10);
    assert!(first_id != second_id);

    cancel(&mut scenario, first_id, CREATOR);

    scenario.next_tx(CREATOR);
    let first = scenario.take_shared_by_id<Duel<TestGame>>(first_id);
    assert!(first.is_cancelled_for_testing());
    assert!(first.stake_value_for_testing() == 0);
    test_scenario::return_shared(first);
    let second = scenario.take_shared_by_id<Duel<TestGame>>(second_id);
    assert!(second.is_pending_for_testing());
    assert!(second.stake_value_for_testing() == BET);
    assert!(second.opponent_for_testing() == option::some(INVITEE));
    test_scenario::return_shared(second);
    assert_single_coin(&scenario, CREATOR, BET);
    scenario.end();
}

// The base is generic: duels of two games coexist, and `cancel<G>` works for either without a witness.
#[test]
fun test_duels_of_different_games_are_independent() {
    let mut scenario = publish();
    let test_game_id = create(&mut scenario, CREATOR, BET, option::none(), CONTROL_NONE);
    scenario.next_tx(CREATOR);
    let house = scenario.take_shared<House>();
    let stake = coin::mint_for_testing<SUI>(BET, scenario.ctx());
    duel::create(OtherGame {}, &house, stake, option::none(), CONTROL_RAPID_20, scenario.ctx());
    test_scenario::return_shared(house);
    scenario.next_tx(CREATOR);
    let other_game_id = test_scenario::most_recent_id_shared<Duel<OtherGame>>().destroy_some();
    assert!(test_game_id != other_game_id);

    let mut other_duel = scenario.take_shared_by_id<Duel<OtherGame>>(other_game_id);
    duel::cancel(&mut other_duel, scenario.ctx());
    assert!(other_duel.is_cancelled_for_testing());
    assert!(other_duel.turn_ms_for_testing() == RAPID_20_MS);
    test_scenario::return_shared(other_duel);

    scenario.next_tx(CREATOR);
    let test_duel = scenario.take_shared_by_id<Duel<TestGame>>(test_game_id);
    assert!(test_duel.is_pending_for_testing());
    assert!(test_duel.stake_value_for_testing() == BET);
    test_scenario::return_shared(test_duel);
    assert_single_coin(&scenario, CREATOR, BET);
    scenario.end();
}

// ---------------------------------------------------------------------------------------------
// cancel / reject
// ---------------------------------------------------------------------------------------------

#[test]
fun test_cancel_refunds_full_stake_and_emits_event() {
    let mut scenario = publish();
    let duel_id = create(&mut scenario, CREATOR, BET, option::none(), CONTROL_RAPID_10);
    let mut duel = scenario.take_shared_by_id<Duel<TestGame>>(duel_id);

    duel::cancel(&mut duel, scenario.ctx());

    let cancelled_events = event::events_by_type<DuelCancelled<TestGame>>();
    let expected = duel::new_duel_cancelled_for_testing<TestGame>(duel_id, CREATOR, CREATOR, BET);
    assert!(cancelled_events == vector[expected]);
    assert!(duel.stake_value_for_testing() == 0);
    assert!(duel.is_cancelled_for_testing());
    assert!(!duel.is_pending_for_testing());
    test_scenario::return_shared(duel);

    scenario.next_tx(CREATOR);
    assert_single_coin(&scenario, CREATOR, BET);
    scenario.end();
}

#[test]
fun test_cancel_invite_duel_by_creator() {
    let mut scenario = publish();
    let duel_id = create(&mut scenario, CREATOR, BET, option::some(INVITEE), CONTROL_NONE);

    cancel(&mut scenario, duel_id, CREATOR);

    scenario.next_tx(CREATOR);
    assert_single_coin(&scenario, CREATOR, BET);
    assert!(!test_scenario::has_most_recent_for_address<Coin<SUI>>(INVITEE));
    let duel = scenario.take_shared_by_id<Duel<TestGame>>(duel_id);
    assert!(duel.is_cancelled_for_testing());
    test_scenario::return_shared(duel);
    scenario.end();
}

#[test, expected_failure(abort_code = battleship::duel::ENotCreator)]
fun test_cancel_rejects_other_address() {
    let mut scenario = publish();
    let duel_id = create(&mut scenario, CREATOR, BET, option::none(), CONTROL_NONE);

    cancel(&mut scenario, duel_id, OTHER);

    scenario.end();
}

#[test, expected_failure(abort_code = battleship::duel::ENotCreator)]
fun test_cancel_rejects_invitee() {
    let mut scenario = publish();
    let duel_id = create(&mut scenario, CREATOR, BET, option::some(INVITEE), CONTROL_NONE);

    cancel(&mut scenario, duel_id, INVITEE);

    scenario.end();
}

#[test, expected_failure(abort_code = battleship::duel::ENotPending)]
fun test_cancel_rejects_cancelled_duel() {
    let mut scenario = publish();
    let duel_id = create(&mut scenario, CREATOR, BET, option::none(), CONTROL_NONE);
    cancel(&mut scenario, duel_id, CREATOR);

    cancel(&mut scenario, duel_id, CREATOR);

    scenario.end();
}

#[test, expected_failure(abort_code = battleship::duel::ENotPending)]
fun test_cancel_rejects_active_duel() {
    let mut scenario = publish();
    let duel_id = create(&mut scenario, CREATOR, BET, option::none(), CONTROL_RAPID_10);
    activate(&mut scenario, duel_id, ACCEPTOR, BET, TO_CREATOR);

    cancel(&mut scenario, duel_id, CREATOR);

    scenario.end();
}

#[test, expected_failure(abort_code = battleship::duel::ENotCreator)]
fun test_cancel_by_other_on_cancelled_duel_reports_not_creator() {
    let mut scenario = publish();
    let duel_id = create(&mut scenario, CREATOR, BET, option::none(), CONTROL_NONE);
    cancel(&mut scenario, duel_id, CREATOR);

    cancel(&mut scenario, duel_id, OTHER);

    scenario.end();
}

#[test]
fun test_reject_refunds_creator_and_emits_event() {
    let mut scenario = publish();
    let duel_id = create(&mut scenario, CREATOR, BET, option::some(INVITEE), CONTROL_NONE);
    scenario.next_tx(INVITEE);
    let mut duel = scenario.take_shared_by_id<Duel<TestGame>>(duel_id);

    duel::reject(&mut duel, scenario.ctx());

    let cancelled_events = event::events_by_type<DuelCancelled<TestGame>>();
    let expected = duel::new_duel_cancelled_for_testing<TestGame>(duel_id, CREATOR, INVITEE, BET);
    assert!(cancelled_events == vector[expected]);
    assert!(duel.stake_value_for_testing() == 0);
    assert!(duel.is_cancelled_for_testing());
    test_scenario::return_shared(duel);

    scenario.next_tx(CREATOR);
    assert_single_coin(&scenario, CREATOR, BET);
    assert!(!test_scenario::has_most_recent_for_address<Coin<SUI>>(INVITEE));
    scenario.end();
}

#[test, expected_failure(abort_code = battleship::duel::ENotInvited)]
fun test_reject_rejects_other_address() {
    let mut scenario = publish();
    let duel_id = create(&mut scenario, CREATOR, BET, option::some(INVITEE), CONTROL_NONE);
    scenario.next_tx(OTHER);
    let mut duel = scenario.take_shared_by_id<Duel<TestGame>>(duel_id);

    duel::reject(&mut duel, scenario.ctx());

    test_scenario::return_shared(duel);
    scenario.end();
}

#[test, expected_failure(abort_code = battleship::duel::ENotInvited)]
fun test_reject_rejects_creator() {
    let mut scenario = publish();
    let duel_id = create(&mut scenario, CREATOR, BET, option::some(INVITEE), CONTROL_NONE);
    let mut duel = scenario.take_shared_by_id<Duel<TestGame>>(duel_id);

    duel::reject(&mut duel, scenario.ctx());

    test_scenario::return_shared(duel);
    scenario.end();
}

#[test, expected_failure(abort_code = battleship::duel::ENoInvitation)]
fun test_reject_rejects_open_duel() {
    let mut scenario = publish();
    let duel_id = create(&mut scenario, CREATOR, BET, option::none(), CONTROL_NONE);
    scenario.next_tx(OTHER);
    let mut duel = scenario.take_shared_by_id<Duel<TestGame>>(duel_id);

    duel::reject(&mut duel, scenario.ctx());

    test_scenario::return_shared(duel);
    scenario.end();
}

#[test, expected_failure(abort_code = battleship::duel::ENotPending)]
fun test_reject_rejects_cancelled_duel() {
    let mut scenario = publish();
    let duel_id = create(&mut scenario, CREATOR, BET, option::some(INVITEE), CONTROL_NONE);
    cancel(&mut scenario, duel_id, CREATOR);
    scenario.next_tx(INVITEE);
    let mut duel = scenario.take_shared_by_id<Duel<TestGame>>(duel_id);

    duel::reject(&mut duel, scenario.ctx());

    test_scenario::return_shared(duel);
    scenario.end();
}

#[test, expected_failure(abort_code = battleship::duel::ENotInvited)]
fun test_reject_by_other_on_cancelled_invite_reports_not_invited() {
    let mut scenario = publish();
    let duel_id = create(&mut scenario, CREATOR, BET, option::some(INVITEE), CONTROL_NONE);
    cancel(&mut scenario, duel_id, CREATOR);
    scenario.next_tx(OTHER);
    let mut duel = scenario.take_shared_by_id<Duel<TestGame>>(duel_id);

    duel::reject(&mut duel, scenario.ctx());

    test_scenario::return_shared(duel);
    scenario.end();
}

// INV-D2: neither refund reads the House or the versions: they work with a House and a duel written by
// other package versions (the House is only read through its unchecked `version()`).
#[test]
fun test_cancel_refunds_regardless_of_versions() {
    let mut scenario = publish();
    let duel_id = create(&mut scenario, CREATOR, BET, option::none(), CONTROL_RAPID_10);
    set_house_version(&mut scenario, NEWER_VERSION);
    set_duel_version(&mut scenario, duel_id, OLDER_VERSION);

    scenario.next_tx(CREATOR);
    let house = scenario.take_shared<House>();
    assert!(house.version() == NEWER_VERSION);
    test_scenario::return_shared(house);
    let mut duel = scenario.take_shared_by_id<Duel<TestGame>>(duel_id);
    assert!(duel.version_for_testing() == OLDER_VERSION);

    duel::cancel(&mut duel, scenario.ctx());

    assert!(duel.stake_value_for_testing() == 0);
    assert!(duel.is_cancelled_for_testing());
    test_scenario::return_shared(duel);

    scenario.next_tx(CREATOR);
    assert_single_coin(&scenario, CREATOR, BET);
    scenario.end();
}

#[test]
fun test_reject_refunds_regardless_of_versions() {
    let mut scenario = publish();
    let duel_id = create(&mut scenario, CREATOR, BET, option::some(INVITEE), CONTROL_RAPID_10);
    set_house_version(&mut scenario, NEWER_VERSION);
    set_duel_version(&mut scenario, duel_id, OLDER_VERSION);

    scenario.next_tx(INVITEE);
    let house = scenario.take_shared<House>();
    assert!(house.version() == NEWER_VERSION);
    test_scenario::return_shared(house);
    let mut duel = scenario.take_shared_by_id<Duel<TestGame>>(duel_id);
    assert!(duel.version_for_testing() == OLDER_VERSION);

    duel::reject(&mut duel, scenario.ctx());

    assert!(duel.stake_value_for_testing() == 0);
    assert!(duel.is_cancelled_for_testing());
    test_scenario::return_shared(duel);

    scenario.next_tx(CREATOR);
    assert_single_coin(&scenario, CREATOR, BET);
    assert!(!test_scenario::has_most_recent_for_address<Coin<SUI>>(INVITEE));
    scenario.end();
}

// ---------------------------------------------------------------------------------------------
// activate (games with clock)
// ---------------------------------------------------------------------------------------------

#[test]
fun test_activate_joins_stake_and_sets_clock_state() {
    let mut scenario = publish();
    let duel_id = create(&mut scenario, CREATOR, BET, option::none(), CONTROL_RAPID_10);
    at(&mut scenario, ACCEPTOR, 1_000_000);

    activate_now(&mut scenario, duel_id, BET, TO_BOTH);

    let activated_events = event::events_by_type<DuelActivated<TestGame>>();
    let expected = duel::new_duel_activated_for_testing<TestGame>(
        duel_id,
        CREATOR,
        ACCEPTOR,
        BET,
        RAPID_10_MS,
        TO_BOTH,
        1_600_000,
    );
    assert!(activated_events == vector[expected]);

    scenario.next_tx(CREATOR);
    let duel = scenario.take_shared_by_id<Duel<TestGame>>(duel_id);
    assert!(duel.is_active_for_testing());
    assert!(!duel.is_pending_for_testing());
    assert!(duel.acceptor_for_testing() == option::some(ACCEPTOR));
    assert!(duel.to_move_for_testing() == option::some(TO_BOTH));
    assert!(duel.deadline_ms_for_testing() == option::some(1_600_000));
    assert!(duel.stake_value_for_testing() == 2 * BET);
    assert!(duel.winner_for_testing().is_none());
    test_scenario::return_shared(duel);
    assert!(!test_scenario::has_most_recent_for_address<Coin<SUI>>(ACCEPTOR));
    assert!(!test_scenario::has_most_recent_for_address<Coin<SUI>>(CREATOR));
    scenario.end();
}

#[test]
fun test_activate_accepts_each_valid_first_to_move() {
    let mut scenario = publish();
    let masks = vector[TO_CREATOR, TO_ACCEPTOR, TO_BOTH];
    masks.do!(|mask| {
        let duel_id = create(&mut scenario, CREATOR, BET, option::none(), CONTROL_RAPID_20);
        activate(&mut scenario, duel_id, ACCEPTOR, BET, mask);
        scenario.next_tx(CREATOR);
        let duel = scenario.take_shared_by_id<Duel<TestGame>>(duel_id);
        assert!(duel.to_move_for_testing() == option::some(mask));
        assert!(duel.stake_value_for_testing() == 2 * BET);
        test_scenario::return_shared(duel);
    });
    scenario.end();
}

#[test]
fun test_activate_invite_by_invitee() {
    let mut scenario = publish();
    let duel_id = create(&mut scenario, CREATOR, BET, option::some(INVITEE), CONTROL_RAPID_10);

    activate(&mut scenario, duel_id, INVITEE, BET, TO_CREATOR);

    scenario.next_tx(CREATOR);
    let duel = scenario.take_shared_by_id<Duel<TestGame>>(duel_id);
    assert!(duel.is_active_for_testing());
    assert!(duel.acceptor_for_testing() == option::some(INVITEE));
    assert!(duel.stake_value_for_testing() == 2 * BET);
    test_scenario::return_shared(duel);
    scenario.end();
}

#[test, expected_failure(abort_code = battleship::duel::ESelfPlay)]
fun test_activate_rejects_own_duel() {
    let mut scenario = publish();
    let duel_id = create(&mut scenario, CREATOR, BET, option::none(), CONTROL_RAPID_10);

    activate(&mut scenario, duel_id, CREATOR, BET, TO_CREATOR);

    scenario.end();
}

#[test, expected_failure(abort_code = battleship::duel::ENotInvited)]
fun test_activate_rejects_non_invited() {
    let mut scenario = publish();
    let duel_id = create(&mut scenario, CREATOR, BET, option::some(INVITEE), CONTROL_RAPID_10);

    activate(&mut scenario, duel_id, OTHER, BET, TO_CREATOR);

    scenario.end();
}

#[test, expected_failure(abort_code = battleship::duel::ENotPending)]
fun test_activate_rejects_cancelled_duel() {
    let mut scenario = publish();
    let duel_id = create(&mut scenario, CREATOR, BET, option::none(), CONTROL_RAPID_10);
    cancel(&mut scenario, duel_id, CREATOR);

    activate(&mut scenario, duel_id, ACCEPTOR, BET, TO_CREATOR);

    scenario.end();
}

#[test, expected_failure(abort_code = battleship::duel::ENotPending)]
fun test_activate_rejects_active_duel() {
    let mut scenario = publish();
    let duel_id = create(&mut scenario, CREATOR, BET, option::none(), CONTROL_RAPID_10);
    activate(&mut scenario, duel_id, ACCEPTOR, BET, TO_CREATOR);

    activate(&mut scenario, duel_id, OTHER, BET, TO_CREATOR);

    scenario.end();
}

#[test, expected_failure(abort_code = battleship::duel::EWrongStake)]
fun test_activate_rejects_lower_stake() {
    let mut scenario = publish();
    let duel_id = create(&mut scenario, CREATOR, BET, option::none(), CONTROL_RAPID_10);

    activate(&mut scenario, duel_id, ACCEPTOR, BET - 1, TO_CREATOR);

    scenario.end();
}

#[test, expected_failure(abort_code = battleship::duel::EWrongStake)]
fun test_activate_rejects_higher_stake() {
    let mut scenario = publish();
    let duel_id = create(&mut scenario, CREATOR, BET, option::none(), CONTROL_RAPID_10);

    activate(&mut scenario, duel_id, ACCEPTOR, BET + 1, TO_CREATOR);

    scenario.end();
}

#[test, expected_failure(abort_code = battleship::duel::EWrongHouse)]
fun test_activate_rejects_other_house() {
    let mut scenario = publish();
    let duel_id = create(&mut scenario, CREATOR, BET, option::none(), CONTROL_RAPID_10);
    let second_house_id = other_house(&mut scenario);

    scenario.next_tx(ACCEPTOR);
    activate_on_house_now(&mut scenario, duel_id, second_house_id, BET, TO_CREATOR);

    scenario.end();
}

#[test, expected_failure(abort_code = battleship::duel::EVersionMismatch)]
fun test_activate_rejects_duel_of_older_version() {
    let mut scenario = publish();
    let duel_id = create(&mut scenario, CREATOR, BET, option::none(), CONTROL_RAPID_10);
    set_duel_version(&mut scenario, duel_id, OLDER_VERSION);

    activate(&mut scenario, duel_id, ACCEPTOR, BET, TO_CREATOR);

    scenario.end();
}

// A House of another version aborts in its own version check (the first read), before the comparison
// with the duel's version.
#[test, expected_failure(abort_code = battleship::house::EWrongVersion)]
fun test_activate_rejects_house_of_newer_version() {
    let mut scenario = publish();
    let duel_id = create(&mut scenario, CREATOR, BET, option::none(), CONTROL_RAPID_10);
    set_house_version(&mut scenario, NEWER_VERSION);

    activate(&mut scenario, duel_id, ACCEPTOR, BET, TO_CREATOR);

    scenario.end();
}

#[test, expected_failure(abort_code = battleship::duel::ENoClock)]
fun test_activate_rejects_clockless_duel() {
    let mut scenario = publish();
    let duel_id = create(&mut scenario, CREATOR, BET, option::none(), CONTROL_NONE);

    activate(&mut scenario, duel_id, ACCEPTOR, BET, TO_CREATOR);

    scenario.end();
}

#[test, expected_failure(abort_code = battleship::duel::EBadMask)]
fun test_activate_rejects_invalid_first_to_move() {
    let mut scenario = publish();
    let duel_id = create(&mut scenario, CREATOR, BET, option::none(), CONTROL_RAPID_10);

    activate(&mut scenario, duel_id, ACCEPTOR, BET, 0);

    scenario.end();
}

#[test, expected_failure(abort_code = battleship::duel::EBadMask)]
fun test_activate_rejects_first_to_move_above_both() {
    let mut scenario = publish();
    let duel_id = create(&mut scenario, CREATOR, BET, option::none(), CONTROL_RAPID_10);

    activate(&mut scenario, duel_id, ACCEPTOR, BET, 4);

    scenario.end();
}

#[test, expected_failure(abort_code = battleship::house::EWrongVersion)]
fun test_activate_reports_house_version_first() {
    let mut scenario = publish();
    let duel_id = create(&mut scenario, CREATOR, BET, option::some(INVITEE), CONTROL_NONE);
    set_house_version(&mut scenario, NEWER_VERSION);
    set_duel_version(&mut scenario, duel_id, OLDER_VERSION);

    // Everything else is wrong too (version of the duel, authZ, stake, clock, mask).
    activate(&mut scenario, duel_id, CREATOR, BET - 1, 0);

    scenario.end();
}

#[test, expected_failure(abort_code = battleship::duel::EVersionMismatch)]
fun test_activate_reports_version_before_house() {
    let mut scenario = publish();
    let duel_id = create(&mut scenario, CREATOR, BET, option::none(), CONTROL_RAPID_10);
    let second_house_id = other_house(&mut scenario);
    set_duel_version(&mut scenario, duel_id, OLDER_VERSION);

    // The second House has the current version but is not the duel's House.
    scenario.next_tx(ACCEPTOR);
    activate_on_house_now(&mut scenario, duel_id, second_house_id, BET, TO_CREATOR);

    scenario.end();
}

#[test, expected_failure(abort_code = battleship::duel::EWrongHouse)]
fun test_activate_reports_house_before_authz() {
    let mut scenario = publish();
    let duel_id = create(&mut scenario, CREATOR, BET, option::none(), CONTROL_RAPID_10);
    let second_house_id = other_house(&mut scenario);

    scenario.next_tx(CREATOR);
    activate_on_house_now(&mut scenario, duel_id, second_house_id, BET, TO_CREATOR);

    scenario.end();
}

#[test, expected_failure(abort_code = battleship::duel::ESelfPlay)]
fun test_activate_reports_authz_before_state() {
    let mut scenario = publish();
    let duel_id = create(&mut scenario, CREATOR, BET, option::none(), CONTROL_RAPID_10);
    cancel(&mut scenario, duel_id, CREATOR);

    activate(&mut scenario, duel_id, CREATOR, BET, TO_CREATOR);

    scenario.end();
}

#[test, expected_failure(abort_code = battleship::duel::ENotPending)]
fun test_activate_reports_state_before_stake() {
    let mut scenario = publish();
    let duel_id = create(&mut scenario, CREATOR, BET, option::none(), CONTROL_RAPID_10);
    cancel(&mut scenario, duel_id, CREATOR);

    activate(&mut scenario, duel_id, ACCEPTOR, BET - 1, TO_CREATOR);

    scenario.end();
}

#[test, expected_failure(abort_code = battleship::duel::EWrongStake)]
fun test_activate_reports_stake_before_no_clock() {
    let mut scenario = publish();
    let duel_id = create(&mut scenario, CREATOR, BET, option::none(), CONTROL_NONE);

    activate(&mut scenario, duel_id, ACCEPTOR, BET - 1, TO_CREATOR);

    scenario.end();
}

#[test, expected_failure(abort_code = battleship::duel::ENoClock)]
fun test_activate_reports_no_clock_before_bad_mask() {
    let mut scenario = publish();
    let duel_id = create(&mut scenario, CREATOR, BET, option::none(), CONTROL_NONE);

    activate(&mut scenario, duel_id, ACCEPTOR, BET, 0);

    scenario.end();
}

#[test]
fun test_stake_is_two_bets_after_activate() {
    let mut scenario = publish();
    let duel_id = create(&mut scenario, CREATOR, ODD_BET, option::none(), CONTROL_RAPID_10);
    scenario.next_tx(CREATOR);
    let duel = scenario.take_shared_by_id<Duel<TestGame>>(duel_id);
    assert!(duel.stake_value_for_testing() == ODD_BET);
    test_scenario::return_shared(duel);

    activate(&mut scenario, duel_id, ACCEPTOR, ODD_BET, TO_ACCEPTOR);

    scenario.next_tx(CREATOR);
    let duel = scenario.take_shared_by_id<Duel<TestGame>>(duel_id);
    assert!(duel.is_active_for_testing());
    assert!(duel.stake_value_for_testing() == 2 * ODD_BET);
    assert!(duel.stake_value_for_testing() == 2 * duel.bet_for_testing());
    test_scenario::return_shared(duel);
    scenario.end();
}

// ---------------------------------------------------------------------------------------------
// activate_atomic (games without clock)
// ---------------------------------------------------------------------------------------------

#[test]
fun test_activate_atomic_collects_fee_and_pay_conserves_funds() {
    let mut scenario = publish();
    set_fee_rate(&mut scenario, 250);
    let creator_wins_id = create(&mut scenario, CREATOR, BET, option::none(), CONTROL_NONE);
    let acceptor_wins_id = create(&mut scenario, CREATOR, BET, option::none(), CONTROL_NONE);
    let fees_before = fees_of_house(&mut scenario);
    assert!(fees_before == 0);

    // pot = 20_000_000, fee = 250 bps = 500_000, payout = 19_500_000.
    atomic(&mut scenario, creator_wins_id, ACCEPTOR, BET, WINNER_CREATOR);
    assert_resolved(&mut scenario, creator_wins_id, ACCEPTOR, CREATOR, 500_000, 19_500_000, 0);

    atomic(&mut scenario, acceptor_wins_id, INVITEE, BET, WINNER_ACCEPTOR);
    assert_resolved(
        &mut scenario,
        acceptor_wins_id,
        INVITEE,
        INVITEE,
        500_000,
        19_500_000,
        500_000,
    );
    // Nobody but the winners holds SUI: every MIST is accounted for (2 × 20_000_000 in, out as
    // 2 × 19_500_000 to the winners + 1_000_000 to the House).
    scenario.next_tx(OTHER);
    assert!(sum_coins(&scenario, ACCEPTOR) == 0);
    assert!(sum_coins(&scenario, OTHER) == 0);
    assert!(sum_coins(&scenario, CREATOR) == 19_500_000);
    assert!(sum_coins(&scenario, INVITEE) == 19_500_000);
    assert!(fees_of_house(&mut scenario) == 1_000_000);
    scenario.end();
}

// INV-D7: `to_move` is 0 and `deadline_ms` is 0 only inside the transaction of an `activate_atomic`,
// with the stake already reduced by the fee, and they do not exist once the duel is resolved.
#[test]
fun test_activate_atomic_state_inside_tx_has_zero_mask_and_pending_fee_taken() {
    let mut scenario = publish();
    set_fee_rate(&mut scenario, 1000);
    let duel_id = create(&mut scenario, CREATOR, BET, option::none(), CONTROL_NONE);
    scenario.next_tx(ACCEPTOR);
    let mut duel = scenario.take_shared_by_id<Duel<TestGame>>(duel_id);
    let mut house = scenario.take_shared<House>();
    let payment = coin::mint_for_testing<SUI>(BET, scenario.ctx());

    let c = duel::activate_atomic(TestGame {}, &mut duel, &mut house, payment, scenario.ctx());

    let activated_events = event::events_by_type<DuelActivated<TestGame>>();
    let expected = duel::new_duel_activated_for_testing<TestGame>(
        duel_id,
        CREATOR,
        ACCEPTOR,
        BET,
        0,
        0,
        0,
    );
    assert!(activated_events == vector[expected]);
    assert!(duel.is_active_for_testing());
    assert!(duel.to_move_for_testing() == option::some(0));
    assert!(duel.deadline_ms_for_testing() == option::some(0));
    // pot = 20_000_000, fee = 1000 bps = 2_000_000.
    assert!(duel::collected_pot_for_testing(&c) == 2 * BET);
    assert!(duel::collected_fee_for_testing(&c) == 2_000_000);
    assert!(duel.stake_value_for_testing() == 18_000_000);
    assert!(house.fees_collected() == 2_000_000);

    duel::pay(TestGame {}, &mut duel, c, WINNER_ACCEPTOR, scenario.ctx());

    assert!(duel.to_move_for_testing().is_none());
    assert!(duel.deadline_ms_for_testing().is_none());
    assert!(duel.stake_value_for_testing() == 0);
    test_scenario::return_shared(duel);
    test_scenario::return_shared(house);
    scenario.next_tx(ACCEPTOR);
    assert_single_coin(&scenario, ACCEPTOR, 18_000_000);
    scenario.end();
}

#[test]
fun test_activate_atomic_invite_by_invitee() {
    let mut scenario = publish();
    let duel_id = create(&mut scenario, CREATOR, BET, option::some(INVITEE), CONTROL_NONE);

    atomic(&mut scenario, duel_id, INVITEE, BET, WINNER_CREATOR);

    assert_resolved(&mut scenario, duel_id, INVITEE, CREATOR, 0, 2 * BET, 0);
    scenario.end();
}

#[test, expected_failure(abort_code = battleship::duel::EHasClock)]
fun test_activate_atomic_rejects_clocked_duel() {
    let mut scenario = publish();
    let duel_id = create(&mut scenario, CREATOR, BET, option::none(), CONTROL_RAPID_10);

    atomic(&mut scenario, duel_id, ACCEPTOR, BET, WINNER_CREATOR);

    scenario.end();
}

#[test, expected_failure(abort_code = battleship::house::EWrongVersion)]
fun test_activate_atomic_aborts_with_house_of_other_version() {
    let mut scenario = publish();
    let duel_id = create(&mut scenario, CREATOR, BET, option::none(), CONTROL_NONE);
    set_house_version(&mut scenario, NEWER_VERSION);

    atomic(&mut scenario, duel_id, ACCEPTOR, BET, WINNER_CREATOR);

    scenario.end();
}

#[test, expected_failure(abort_code = battleship::duel::ESelfPlay)]
fun test_activate_atomic_rejects_own_duel() {
    let mut scenario = publish();
    let duel_id = create(&mut scenario, CREATOR, BET, option::none(), CONTROL_NONE);

    atomic(&mut scenario, duel_id, CREATOR, BET, WINNER_CREATOR);

    scenario.end();
}

#[test, expected_failure(abort_code = battleship::duel::ENotInvited)]
fun test_activate_atomic_rejects_non_invited() {
    let mut scenario = publish();
    let duel_id = create(&mut scenario, CREATOR, BET, option::some(INVITEE), CONTROL_NONE);

    atomic(&mut scenario, duel_id, OTHER, BET, WINNER_CREATOR);

    scenario.end();
}

#[test, expected_failure(abort_code = battleship::duel::ENotPending)]
fun test_activate_atomic_rejects_cancelled_duel() {
    let mut scenario = publish();
    let duel_id = create(&mut scenario, CREATOR, BET, option::none(), CONTROL_NONE);
    cancel(&mut scenario, duel_id, CREATOR);

    atomic(&mut scenario, duel_id, ACCEPTOR, BET, WINNER_CREATOR);

    scenario.end();
}

#[test, expected_failure(abort_code = battleship::duel::ENotPending)]
fun test_activate_atomic_rejects_resolved_duel() {
    let mut scenario = publish();
    let duel_id = create(&mut scenario, CREATOR, BET, option::none(), CONTROL_NONE);
    atomic(&mut scenario, duel_id, ACCEPTOR, BET, WINNER_CREATOR);

    atomic(&mut scenario, duel_id, OTHER, BET, WINNER_CREATOR);

    scenario.end();
}

#[test, expected_failure(abort_code = battleship::duel::EWrongStake)]
fun test_activate_atomic_rejects_lower_stake() {
    let mut scenario = publish();
    let duel_id = create(&mut scenario, CREATOR, BET, option::none(), CONTROL_NONE);

    atomic(&mut scenario, duel_id, ACCEPTOR, BET - 1, WINNER_CREATOR);

    scenario.end();
}

#[test, expected_failure(abort_code = battleship::duel::EWrongStake)]
fun test_activate_atomic_rejects_higher_stake() {
    let mut scenario = publish();
    let duel_id = create(&mut scenario, CREATOR, BET, option::none(), CONTROL_NONE);

    atomic(&mut scenario, duel_id, ACCEPTOR, BET + 1, WINNER_CREATOR);

    scenario.end();
}

#[test, expected_failure(abort_code = battleship::duel::EWrongHouse)]
fun test_activate_atomic_rejects_other_house() {
    let mut scenario = publish();
    let duel_id = create(&mut scenario, CREATOR, BET, option::none(), CONTROL_NONE);
    let second_house_id = other_house(&mut scenario);

    scenario.next_tx(ACCEPTOR);
    atomic_on_house_now(&mut scenario, duel_id, second_house_id, BET, WINNER_CREATOR);

    scenario.end();
}

#[test, expected_failure(abort_code = battleship::duel::EVersionMismatch)]
fun test_activate_atomic_rejects_duel_of_older_version() {
    let mut scenario = publish();
    let duel_id = create(&mut scenario, CREATOR, BET, option::none(), CONTROL_NONE);
    set_duel_version(&mut scenario, duel_id, OLDER_VERSION);

    atomic(&mut scenario, duel_id, ACCEPTOR, BET, WINNER_CREATOR);

    scenario.end();
}

#[test, expected_failure(abort_code = battleship::duel::EWrongStake)]
fun test_activate_atomic_reports_stake_before_has_clock() {
    let mut scenario = publish();
    let duel_id = create(&mut scenario, CREATOR, BET, option::none(), CONTROL_RAPID_10);

    atomic(&mut scenario, duel_id, ACCEPTOR, BET - 1, WINNER_CREATOR);

    scenario.end();
}

// ---------------------------------------------------------------------------------------------
// collect / pay (settling by play or surrender)
// ---------------------------------------------------------------------------------------------

#[test]
fun test_collect_then_pay_resolves_by_play_and_conserves_funds() {
    let mut scenario = publish();
    set_fee_rate(&mut scenario, 250);
    let duel_id = create(&mut scenario, CREATOR, BET, option::none(), CONTROL_RAPID_10);
    at(&mut scenario, ACCEPTOR, 1_000_000);
    activate_now(&mut scenario, duel_id, BET, TO_ACCEPTOR);
    at(&mut scenario, ACCEPTOR, 1_300_000);
    let mut duel = scenario.take_shared_by_id<Duel<TestGame>>(duel_id);
    let mut house = scenario.take_shared<House>();

    let c = duel::collect(TestGame {}, &mut duel, &mut house, scenario.ctx());

    // Between `collect` and `pay`: still `Active`, with `2 × bet - fee` in the stake and the fee already
    // in the House (INV-D1, INV-D4).
    assert!(duel.is_active_for_testing());
    assert!(duel::collected_pot_for_testing(&c) == 2 * BET);
    assert!(duel::collected_fee_for_testing(&c) == 500_000);
    assert!(duel.stake_value_for_testing() == 19_500_000);
    assert!(house.fees_collected() == 500_000);

    duel::pay(TestGame {}, &mut duel, c, WINNER_ACCEPTOR, scenario.ctx());
    test_scenario::return_shared(duel);
    test_scenario::return_shared(house);

    assert_resolved(&mut scenario, duel_id, ACCEPTOR, ACCEPTOR, 500_000, 19_500_000, 0);
    assert!(sum_coins(&scenario, CREATOR) == 0);
    scenario.end();
}

#[test, expected_failure(abort_code = battleship::duel::ENotPlayer)]
fun test_collect_rejects_third_party() {
    let mut scenario = publish();
    let duel_id = create(&mut scenario, CREATOR, BET, option::none(), CONTROL_RAPID_10);
    activate(&mut scenario, duel_id, ACCEPTOR, BET, TO_CREATOR);

    collect(&mut scenario, duel_id, OTHER, WINNER_ACCEPTOR);

    scenario.end();
}

#[test, expected_failure(abort_code = battleship::duel::ENotPlayer)]
fun test_collect_rejects_invitee_that_did_not_accept() {
    let mut scenario = publish();
    let duel_id = create(&mut scenario, CREATOR, BET, option::none(), CONTROL_RAPID_10);
    activate(&mut scenario, duel_id, ACCEPTOR, BET, TO_CREATOR);

    collect(&mut scenario, duel_id, INVITEE, WINNER_ACCEPTOR);

    scenario.end();
}

// A surrender is made out of turn: neither player has to be the one in `to_move`.
#[test]
fun test_collect_by_player_out_of_turn_succeeds() {
    let mut scenario = publish();
    // Duel 1: the acceptor has to move and the creator surrenders: the acceptor wins.
    let first_id = create(&mut scenario, CREATOR, BET, option::none(), CONTROL_RAPID_10);
    activate(&mut scenario, first_id, ACCEPTOR, BET, TO_ACCEPTOR);
    collect(&mut scenario, first_id, CREATOR, WINNER_ACCEPTOR);
    assert_resolved(&mut scenario, first_id, ACCEPTOR, ACCEPTOR, 0, 2 * BET, 0);

    // Duel 2: the creator has to move and the acceptor surrenders: the creator wins.
    let second_id = create(&mut scenario, INVITEE, BET, option::none(), CONTROL_RAPID_10);
    activate(&mut scenario, second_id, OTHER, BET, TO_CREATOR);
    collect(&mut scenario, second_id, OTHER, WINNER_CREATOR);
    assert_resolved(&mut scenario, second_id, OTHER, INVITEE, 0, 2 * BET, 0);
    scenario.end();
}

#[test, expected_failure(abort_code = battleship::duel::ENoClock)]
fun test_collect_rejects_clockless_duel() {
    let mut scenario = publish();
    let duel_id = create(&mut scenario, CREATOR, BET, option::none(), CONTROL_NONE);
    scenario.next_tx(ACCEPTOR);
    let mut duel = scenario.take_shared_by_id<Duel<TestGame>>(duel_id);
    let mut house = scenario.take_shared<House>();
    let payment = coin::mint_for_testing<SUI>(BET, scenario.ctx());
    // Active without clock exists only between `activate_atomic` and `pay`: `collect` cannot be used
    // there (its `deadline_ms` is 0, so `ENoClock` has to come before the deadline check).
    let first = duel::activate_atomic(TestGame {}, &mut duel, &mut house, payment, scenario.ctx());

    let second = duel::collect(TestGame {}, &mut duel, &mut house, scenario.ctx());

    duel::pay(TestGame {}, &mut duel, first, WINNER_CREATOR, scenario.ctx());
    duel::pay(TestGame {}, &mut duel, second, WINNER_CREATOR, scenario.ctx());
    test_scenario::return_shared(duel);
    test_scenario::return_shared(house);
    scenario.end();
}

#[test, expected_failure(abort_code = battleship::duel::EDeadlinePassed)]
fun test_collect_rejects_after_deadline() {
    let mut scenario = publish();
    let duel_id = create(&mut scenario, CREATOR, BET, option::none(), CONTROL_RAPID_10);
    at(&mut scenario, ACCEPTOR, 1_000_000);
    activate_now(&mut scenario, duel_id, BET, TO_CREATOR);
    // deadline_ms = 1_000_000 + 600_000
    at(&mut scenario, CREATOR, 1_600_001);

    collect_now(&mut scenario, duel_id, WINNER_CREATOR);

    scenario.end();
}

#[test, expected_failure(abort_code = battleship::duel::ENotActive)]
fun test_collect_rejects_not_active() {
    let mut scenario = publish();
    let duel_id = create(&mut scenario, CREATOR, BET, option::none(), CONTROL_RAPID_10);

    collect(&mut scenario, duel_id, CREATOR, WINNER_CREATOR);

    scenario.end();
}

#[test, expected_failure(abort_code = battleship::duel::ENotActive)]
fun test_collect_rejects_resolved_duel() {
    let mut scenario = publish();
    let duel_id = create(&mut scenario, CREATOR, BET, option::none(), CONTROL_RAPID_10);
    activate(&mut scenario, duel_id, ACCEPTOR, BET, TO_CREATOR);
    collect(&mut scenario, duel_id, CREATOR, WINNER_CREATOR);

    collect(&mut scenario, duel_id, CREATOR, WINNER_CREATOR);

    scenario.end();
}

#[test, expected_failure(abort_code = battleship::duel::EWrongHouse)]
fun test_collect_rejects_other_house() {
    let mut scenario = publish();
    let duel_id = create(&mut scenario, CREATOR, BET, option::none(), CONTROL_RAPID_10);
    activate(&mut scenario, duel_id, ACCEPTOR, BET, TO_CREATOR);
    let second_house_id = other_house(&mut scenario);

    scenario.next_tx(CREATOR);
    collect_on_house_now(&mut scenario, duel_id, second_house_id, WINNER_CREATOR);

    scenario.end();
}

#[test, expected_failure(abort_code = battleship::duel::EVersionMismatch)]
fun test_collect_rejects_duel_of_older_version() {
    let mut scenario = publish();
    let duel_id = create(&mut scenario, CREATOR, BET, option::none(), CONTROL_RAPID_10);
    activate(&mut scenario, duel_id, ACCEPTOR, BET, TO_CREATOR);
    set_duel_version(&mut scenario, duel_id, OLDER_VERSION);

    collect(&mut scenario, duel_id, CREATOR, WINNER_CREATOR);

    scenario.end();
}

#[test, expected_failure(abort_code = battleship::duel::EBrokenStake)]
fun test_collect_rejects_broken_stake() {
    let mut scenario = publish();
    let duel_id = create(&mut scenario, CREATOR, BET, option::none(), CONTROL_RAPID_10);
    activate(&mut scenario, duel_id, ACCEPTOR, BET, TO_CREATOR);
    scenario.next_tx(PUBLISHER);
    let mut duel = scenario.take_shared_by_id<Duel<TestGame>>(duel_id);
    duel.add_to_stake_for_testing(coin::mint_for_testing<SUI>(1, scenario.ctx()));
    assert!(duel.stake_value_for_testing() == 2 * BET + 1);
    test_scenario::return_shared(duel);

    collect(&mut scenario, duel_id, CREATOR, WINNER_CREATOR);

    scenario.end();
}

// Duel and House both written by a newer package: the checks of the duel pass and the current (old) code
// aborts in `add_fees`, before any payment.
#[test, expected_failure(abort_code = battleship::house::EWrongVersion)]
fun test_collect_aborts_in_fee_collection_with_house_of_other_version() {
    let mut scenario = publish();
    let duel_id = create(&mut scenario, CREATOR, BET, option::none(), CONTROL_RAPID_10);
    activate(&mut scenario, duel_id, ACCEPTOR, BET, TO_CREATOR);
    set_house_version(&mut scenario, NEWER_VERSION);
    set_duel_version(&mut scenario, duel_id, NEWER_VERSION);

    collect(&mut scenario, duel_id, CREATOR, WINNER_CREATOR);

    scenario.end();
}

#[test, expected_failure(abort_code = battleship::duel::EVersionMismatch)]
fun test_collect_reports_version_mismatch_for_house_of_newer_version() {
    let mut scenario = publish();
    let duel_id = create(&mut scenario, CREATOR, BET, option::none(), CONTROL_RAPID_10);
    activate(&mut scenario, duel_id, ACCEPTOR, BET, TO_CREATOR);
    set_house_version(&mut scenario, NEWER_VERSION);

    collect(&mut scenario, duel_id, CREATOR, WINNER_CREATOR);

    scenario.end();
}

#[test, expected_failure(abort_code = battleship::duel::ENotActive)]
fun test_collect_reports_not_active_before_not_player() {
    let mut scenario = publish();
    let duel_id = create(&mut scenario, CREATOR, BET, option::none(), CONTROL_RAPID_10);

    collect(&mut scenario, duel_id, OTHER, WINNER_CREATOR);

    scenario.end();
}

#[test, expected_failure(abort_code = battleship::duel::ENotPlayer)]
fun test_collect_reports_not_player_before_deadline() {
    let mut scenario = publish();
    let duel_id = create(&mut scenario, CREATOR, BET, option::none(), CONTROL_RAPID_10);
    at(&mut scenario, ACCEPTOR, 1_000_000);
    activate_now(&mut scenario, duel_id, BET, TO_CREATOR);
    at(&mut scenario, OTHER, 1_600_001);

    collect_now(&mut scenario, duel_id, WINNER_CREATOR);

    scenario.end();
}

// T-2: a duel of an older version AND another House in the same call: the version mismatch comes first.
#[test, expected_failure(abort_code = battleship::duel::EVersionMismatch)]
fun test_collect_reports_version_mismatch_before_wrong_house() {
    let mut scenario = publish();
    let duel_id = create(&mut scenario, CREATOR, BET, option::none(), CONTROL_RAPID_10);
    activate(&mut scenario, duel_id, ACCEPTOR, BET, TO_CREATOR);
    set_duel_version(&mut scenario, duel_id, OLDER_VERSION);
    let second_house_id = other_house(&mut scenario);

    scenario.next_tx(CREATOR);
    collect_on_house_now(&mut scenario, duel_id, second_house_id, WINNER_CREATOR);

    scenario.end();
}

#[test, expected_failure(abort_code = battleship::duel::EDeadlinePassed)]
fun test_collect_reports_deadline_before_version() {
    let mut scenario = publish();
    let duel_id = create(&mut scenario, CREATOR, BET, option::none(), CONTROL_RAPID_10);
    at(&mut scenario, ACCEPTOR, 1_000_000);
    activate_now(&mut scenario, duel_id, BET, TO_CREATOR);
    set_duel_version(&mut scenario, duel_id, OLDER_VERSION);
    at(&mut scenario, CREATOR, 1_600_001);

    collect_now(&mut scenario, duel_id, WINNER_CREATOR);

    scenario.end();
}

#[test, expected_failure(abort_code = battleship::duel::EWrongHouse)]
fun test_collect_reports_house_before_broken_stake() {
    let mut scenario = publish();
    let duel_id = create(&mut scenario, CREATOR, BET, option::none(), CONTROL_RAPID_10);
    activate(&mut scenario, duel_id, ACCEPTOR, BET, TO_CREATOR);
    scenario.next_tx(PUBLISHER);
    let mut duel = scenario.take_shared_by_id<Duel<TestGame>>(duel_id);
    duel.add_to_stake_for_testing(coin::mint_for_testing<SUI>(1, scenario.ctx()));
    test_scenario::return_shared(duel);
    let second_house_id = other_house(&mut scenario);

    scenario.next_tx(CREATOR);
    collect_on_house_now(&mut scenario, duel_id, second_house_id, WINNER_CREATOR);

    scenario.end();
}

#[test]
fun test_pay_pays_creator_when_index_is_zero() {
    let mut scenario = publish();
    set_fee_rate(&mut scenario, 1000);
    let duel_id = create(&mut scenario, CREATOR, BET, option::none(), CONTROL_RAPID_10);
    activate(&mut scenario, duel_id, ACCEPTOR, BET, TO_BOTH);

    collect(&mut scenario, duel_id, ACCEPTOR, WINNER_CREATOR);

    // The winner is the creator even though the acceptor is the one who signs.
    assert_resolved(&mut scenario, duel_id, ACCEPTOR, CREATOR, 2_000_000, 18_000_000, 0);
    scenario.end();
}

#[test]
fun test_pay_pays_acceptor_when_index_is_one() {
    let mut scenario = publish();
    set_fee_rate(&mut scenario, 1000);
    let duel_id = create(&mut scenario, CREATOR, BET, option::none(), CONTROL_RAPID_10);
    activate(&mut scenario, duel_id, ACCEPTOR, BET, TO_BOTH);

    collect(&mut scenario, duel_id, CREATOR, WINNER_ACCEPTOR);

    // The winner is the acceptor even though the creator is the one who signs.
    assert_resolved(&mut scenario, duel_id, ACCEPTOR, ACCEPTOR, 2_000_000, 18_000_000, 0);
    scenario.end();
}

#[test, expected_failure(abort_code = battleship::duel::EWrongDuel)]
fun test_pay_rejects_collected_of_other_duel() {
    let mut scenario = publish();
    let first_id = create(&mut scenario, CREATOR, BET, option::none(), CONTROL_RAPID_10);
    let second_id = create(&mut scenario, CREATOR, BET, option::none(), CONTROL_RAPID_10);
    activate(&mut scenario, first_id, ACCEPTOR, BET, TO_CREATOR);
    activate(&mut scenario, second_id, ACCEPTOR, BET, TO_CREATOR);
    scenario.next_tx(CREATOR);
    let mut first = scenario.take_shared_by_id<Duel<TestGame>>(first_id);
    let mut second = scenario.take_shared_by_id<Duel<TestGame>>(second_id);
    let mut house = scenario.take_shared<House>();
    let c = duel::collect(TestGame {}, &mut first, &mut house, scenario.ctx());

    duel::pay(TestGame {}, &mut second, c, WINNER_CREATOR, scenario.ctx());

    test_scenario::return_shared(first);
    test_scenario::return_shared(second);
    test_scenario::return_shared(house);
    scenario.end();
}

#[test, expected_failure(abort_code = battleship::duel::EBadWinnerIndex)]
fun test_pay_rejects_bad_winner_index() {
    let mut scenario = publish();
    let duel_id = create(&mut scenario, CREATOR, BET, option::none(), CONTROL_NONE);

    atomic(&mut scenario, duel_id, ACCEPTOR, BET, 2);

    scenario.end();
}

#[test, expected_failure(abort_code = battleship::duel::ENotActive)]
fun test_pay_rejects_not_active() {
    let mut scenario = publish();
    let duel_id = create(&mut scenario, CREATOR, BET, option::none(), CONTROL_NONE);
    scenario.next_tx(CREATOR);
    let mut duel = scenario.take_shared_by_id<Duel<TestGame>>(duel_id);
    // No function of the API produces a `Collected` for a `Pending` duel: forged for the test.
    let c = duel::new_collected_for_testing(duel_id, 2 * BET, 0);

    duel::pay(TestGame {}, &mut duel, c, WINNER_CREATOR, scenario.ctx());

    test_scenario::return_shared(duel);
    scenario.end();
}

#[test, expected_failure(abort_code = battleship::duel::EWrongDuel)]
fun test_pay_reports_wrong_duel_before_not_active() {
    let mut scenario = publish();
    let duel_id = create(&mut scenario, CREATOR, BET, option::none(), CONTROL_NONE);
    scenario.next_tx(CREATOR);
    let mut duel = scenario.take_shared_by_id<Duel<TestGame>>(duel_id);
    let c = duel::new_collected_for_testing(object::id_from_address(@0x1), 2 * BET, 0);

    duel::pay(TestGame {}, &mut duel, c, 2, scenario.ctx());

    test_scenario::return_shared(duel);
    scenario.end();
}

#[test, expected_failure(abort_code = battleship::duel::ENotActive)]
fun test_pay_reports_not_active_before_bad_winner_index() {
    let mut scenario = publish();
    let duel_id = create(&mut scenario, CREATOR, BET, option::none(), CONTROL_NONE);
    scenario.next_tx(CREATOR);
    let mut duel = scenario.take_shared_by_id<Duel<TestGame>>(duel_id);
    let c = duel::new_collected_for_testing(duel_id, 2 * BET, 0);

    duel::pay(TestGame {}, &mut duel, c, 2, scenario.ctx());

    test_scenario::return_shared(duel);
    scenario.end();
}

// ---------------------------------------------------------------------------------------------
// Fee and funds
// ---------------------------------------------------------------------------------------------

#[test]
fun test_fee_is_floor_of_pot_times_rate() {
    let mut scenario = publish();
    // pot = 2_000_002 (odd bet).
    let rates = vector[0u16, 250, 1000];
    let fees = vector[0u64, 50_000, 200_000]; // floor(2_000_002 × rate / 10_000)
    let payouts = vector[2_000_002u64, 1_950_002, 1_800_002];
    let acceptors = vector[@0x20, @0x21, @0x22];
    let mut total_fees = 0;
    let mut i = 0;
    while (i < rates.length()) {
        set_fee_rate(&mut scenario, rates[i]);
        let duel_id = create(&mut scenario, CREATOR, ODD_BET, option::none(), CONTROL_NONE);
        atomic(&mut scenario, duel_id, acceptors[i], ODD_BET, WINNER_ACCEPTOR);
        assert_resolved(
            &mut scenario,
            duel_id,
            acceptors[i],
            acceptors[i],
            fees[i],
            payouts[i],
            total_fees,
        );
        total_fees = total_fees + fees[i];
        i = i + 1;
    };
    assert!(fees_of_house(&mut scenario) == 250_000);
    // The creator never won: it only ever put its bets in.
    assert!(sum_coins(&scenario, CREATOR) == 0);
    scenario.end();
}

#[test]
fun test_fee_is_floor_of_pot_times_rate_when_settling_by_play() {
    let mut scenario = publish();
    set_fee_rate(&mut scenario, 250);
    let duel_id = create(&mut scenario, CREATOR, ODD_BET, option::none(), CONTROL_RAPID_10);
    activate(&mut scenario, duel_id, ACCEPTOR, ODD_BET, TO_CREATOR);

    collect(&mut scenario, duel_id, CREATOR, WINNER_CREATOR);

    assert_resolved(&mut scenario, duel_id, ACCEPTOR, CREATOR, 50_000, 1_950_002, 0);
    scenario.end();
}

#[test]
fun test_fee_with_max_bet_and_max_fee_does_not_overflow() {
    let mut scenario = publish();
    // Before creating: the fee rate is copied into the duel at creation.
    set_bet_limits(&mut scenario, MIN_BET, HUGE_BET);
    set_fee_rate(&mut scenario, 1000);
    let duel_id = create(&mut scenario, CREATOR, HUGE_BET, option::none(), CONTROL_NONE);

    atomic(&mut scenario, duel_id, ACCEPTOR, HUGE_BET, WINNER_ACCEPTOR);

    // pot = 18_000_000_000_000_000_000: pot × 1000 overflows u64, so this only passes with the u128 path.
    assert_resolved(
        &mut scenario,
        duel_id,
        ACCEPTOR,
        ACCEPTOR,
        1_800_000_000_000_000_000,
        16_200_000_000_000_000_000,
        0,
    );
    scenario.end();
}

#[test]
fun test_fee_with_max_bet_and_max_fee_does_not_overflow_when_settling_by_play() {
    let mut scenario = publish();
    set_bet_limits(&mut scenario, MIN_BET, HUGE_BET);
    set_fee_rate(&mut scenario, 1000);
    let duel_id = create(&mut scenario, CREATOR, HUGE_BET, option::none(), CONTROL_RAPID_10);
    activate(&mut scenario, duel_id, ACCEPTOR, HUGE_BET, TO_CREATOR);

    collect(&mut scenario, duel_id, CREATOR, WINNER_CREATOR);

    assert_resolved(
        &mut scenario,
        duel_id,
        ACCEPTOR,
        CREATOR,
        1_800_000_000_000_000_000,
        16_200_000_000_000_000_000,
        0,
    );
    scenario.end();
}

#[test]
fun test_fee_rate_copied_at_creation_is_the_one_charged() {
    let mut scenario = publish();
    set_fee_rate(&mut scenario, 250);
    let atomic_id = create(&mut scenario, CREATOR, BET, option::none(), CONTROL_NONE);
    let clocked_id = create(&mut scenario, CREATOR, BET, option::none(), CONTROL_RAPID_10);
    activate(&mut scenario, clocked_id, ACCEPTOR, BET, TO_CREATOR);
    // The House changes its rate after creation: both duels keep charging the 250 bps they copied.
    set_fee_rate(&mut scenario, 1000);

    atomic(&mut scenario, atomic_id, INVITEE, BET, WINNER_CREATOR);
    assert_resolved(&mut scenario, atomic_id, INVITEE, CREATOR, 500_000, 19_500_000, 0);

    collect(&mut scenario, clocked_id, ACCEPTOR, WINNER_ACCEPTOR);
    assert_resolved(&mut scenario, clocked_id, ACCEPTOR, ACCEPTOR, 500_000, 19_500_000, 500_000);
    scenario.end();
}

// One House, one fee jar: a `Game` (coinflip viejo) and a `Duel` both add to the same `fees_collected`.
#[test]
fun test_fees_from_duel_and_game_accumulate_in_same_house() {
    let mut scenario = publish();
    set_fee_rate(&mut scenario, 250);

    scenario.next_tx(CREATOR);
    let house = scenario.take_shared<House>();
    let stake = coin::mint_for_testing<SUI>(BET, scenario.ctx());
    game::create_game(&house, stake, option::none(), scenario.ctx());
    test_scenario::return_shared(house);
    scenario.next_tx(CREATOR);
    let game_id = test_scenario::most_recent_id_shared<Game>().destroy_some();
    scenario.next_tx(INVITEE);
    let mut old_game = scenario.take_shared_by_id<Game>(game_id);
    let mut house = scenario.take_shared<House>();
    let payment = coin::mint_for_testing<SUI>(BET, scenario.ctx());
    old_game.accept_with_winner_for_testing(&mut house, payment, 1, scenario.ctx());
    assert!(house.fees_collected() == 500_000);
    test_scenario::return_shared(old_game);
    test_scenario::return_shared(house);

    let duel_id = create(&mut scenario, CREATOR, BET, option::none(), CONTROL_NONE);
    atomic(&mut scenario, duel_id, ACCEPTOR, BET, WINNER_CREATOR);

    assert_resolved(&mut scenario, duel_id, ACCEPTOR, CREATOR, 500_000, 19_500_000, 500_000);
    assert!(fees_of_house(&mut scenario) == 1_000_000);
    scenario.end();
}

// INV-D1: every final state holds nothing in the stake, whichever way the duel got there.
#[test]
fun test_terminal_states_hold_no_stake() {
    let mut scenario = publish();
    let cancelled_id = create(&mut scenario, CREATOR, BET, option::none(), CONTROL_NONE);
    cancel(&mut scenario, cancelled_id, CREATOR);
    let rejected_id = create(&mut scenario, CREATOR, BET, option::some(INVITEE), CONTROL_NONE);
    scenario.next_tx(INVITEE);
    let mut rejected = scenario.take_shared_by_id<Duel<TestGame>>(rejected_id);
    duel::reject(&mut rejected, scenario.ctx());
    test_scenario::return_shared(rejected);
    let atomic_id = create(&mut scenario, CREATOR, BET, option::none(), CONTROL_NONE);
    atomic(&mut scenario, atomic_id, ACCEPTOR, BET, WINNER_CREATOR);
    let played_id = create(&mut scenario, CREATOR, BET, option::none(), CONTROL_RAPID_10);
    activate(&mut scenario, played_id, ACCEPTOR, BET, TO_CREATOR);
    collect(&mut scenario, played_id, ACCEPTOR, WINNER_ACCEPTOR);

    scenario.next_tx(CREATOR);
    let cancelled = scenario.take_shared_by_id<Duel<TestGame>>(cancelled_id);
    assert!(cancelled.is_cancelled_for_testing());
    assert!(cancelled.stake_value_for_testing() == 0);
    assert!(cancelled.to_move_for_testing().is_none());
    test_scenario::return_shared(cancelled);
    let rejected = scenario.take_shared_by_id<Duel<TestGame>>(rejected_id);
    assert!(rejected.is_cancelled_for_testing());
    assert!(rejected.stake_value_for_testing() == 0);
    test_scenario::return_shared(rejected);
    let by_atomic = scenario.take_shared_by_id<Duel<TestGame>>(atomic_id);
    assert!(by_atomic.is_resolved_for_testing());
    assert!(by_atomic.stake_value_for_testing() == 0);
    assert!(by_atomic.deadline_ms_for_testing().is_none());
    test_scenario::return_shared(by_atomic);
    let played = scenario.take_shared_by_id<Duel<TestGame>>(played_id);
    assert!(played.is_resolved_for_testing());
    assert!(played.stake_value_for_testing() == 0);
    assert!(played.to_move_for_testing().is_none());
    assert!(played.deadline_ms_for_testing().is_none());
    test_scenario::return_shared(played);
    scenario.end();
}

// INV-D4: the fee is charged only when the duel ends in `Resolved`: creating, cancelling, rejecting and
// activating a clocked duel never touch `fees_collected`, even with the highest fee rate.
#[test]
fun test_fee_is_charged_only_when_resolving() {
    let mut scenario = publish();
    set_fee_rate(&mut scenario, 1000);
    let cancelled_id = create(&mut scenario, CREATOR, BET, option::none(), CONTROL_NONE);
    cancel(&mut scenario, cancelled_id, CREATOR);
    let rejected_id = create(&mut scenario, CREATOR, BET, option::some(INVITEE), CONTROL_NONE);
    scenario.next_tx(INVITEE);
    let mut rejected = scenario.take_shared_by_id<Duel<TestGame>>(rejected_id);
    duel::reject(&mut rejected, scenario.ctx());
    test_scenario::return_shared(rejected);
    let active_id = create(&mut scenario, CREATOR, BET, option::none(), CONTROL_RAPID_10);
    activate(&mut scenario, active_id, ACCEPTOR, BET, TO_BOTH);

    assert!(fees_of_house(&mut scenario) == 0);
    scenario.end();
}

// =============================================================================================
// Clock per move (TASK-2b): `record_move`, `claim_timeout`, `refund_stalled`
//
// Every duel below is a `TestGame` duel with the control RAPID_10 (600_000 ms per move) activated by
// ACCEPTOR at 1_000_000 ms, so its first `deadline_ms` is 1_600_000. The boundary tests write the
// deadline and the grace (604_800_000 ms) as literals, not through the constants of the module: they are
// the functional barrier against a shortened clock (R2-1).
// =============================================================================================

// ---------------------------------------------------------------------------------------------
// Helpers of the clock suite and the test game
// ---------------------------------------------------------------------------------------------

// Calls `record_move` as the sender of the CURRENT transaction. The transaction stays open.
fun record_now(scenario: &mut Scenario, duel_id: ID, next_to_move: u8) {
    let mut duel = scenario.take_shared_by_id<Duel<TestGame>>(duel_id);
    duel::record_move(TestGame {}, &mut duel, next_to_move, scenario.ctx());
    test_scenario::return_shared(duel);
}

// `record_now` as `sender` with the Clock at exactly `ms`.
fun record(scenario: &mut Scenario, duel_id: ID, sender: address, ms: u64, next_to_move: u8) {
    at(scenario, sender, ms);
    record_now(scenario, duel_id, next_to_move);
}

// Calls `claim_timeout` as the sender of the CURRENT transaction against the House `house_id` (none = the
// only House). The transaction stays open.
fun claim_with(scenario: &mut Scenario, duel_id: ID, house_id: Option<ID>) {
    let mut duel = scenario.take_shared_by_id<Duel<TestGame>>(duel_id);
    let mut house = take_house(scenario, house_id);
    duel::claim_timeout(&mut duel, &mut house, scenario.ctx());
    test_scenario::return_shared(duel);
    test_scenario::return_shared(house);
}

// `claim_with` against the only House, as `sender` with the Clock at exactly `ms`.
fun claim(scenario: &mut Scenario, duel_id: ID, sender: address, ms: u64) {
    at(scenario, sender, ms);
    claim_with(scenario, duel_id, option::none());
}

// Calls `refund_stalled` as the sender of the CURRENT transaction. The transaction stays open.
fun refund_now(scenario: &mut Scenario, duel_id: ID) {
    let mut duel = scenario.take_shared_by_id<Duel<TestGame>>(duel_id);
    duel::refund_stalled(&mut duel, scenario.ctx());
    test_scenario::return_shared(duel);
}

// `refund_now` as `sender` with the Clock at exactly `ms`.
fun refund(scenario: &mut Scenario, duel_id: ID, sender: address, ms: u64) {
    at(scenario, sender, ms);
    refund_now(scenario, duel_id);
}

// A RAPID_10 duel created by CREATOR and activated by ACCEPTOR at `activated_ms` with `first_to_move`:
// `deadline_ms = activated_ms + 600_000`. The activation transaction stays open.
fun active_duel_at(scenario: &mut Scenario, first_to_move: u8, activated_ms: u64): ID {
    let duel_id = create(scenario, CREATOR, BET, option::none(), CONTROL_RAPID_10);
    at(scenario, ACCEPTOR, activated_ms);
    activate_now(scenario, duel_id, BET, first_to_move);
    duel_id
}

// `active_duel_at` with the activation at 1_000_000 ms (deadline 1_600_000).
fun active_duel(scenario: &mut Scenario, first_to_move: u8): ID {
    active_duel_at(scenario, first_to_move, 1_000_000)
}

// Breaks `stake == 2 × bet` of an `Active` duel (+1 MIST), which the API never allows.
fun break_stake(scenario: &mut Scenario, duel_id: ID) {
    scenario.next_tx(PUBLISHER);
    let mut duel = scenario.take_shared_by_id<Duel<TestGame>>(duel_id);
    duel.add_to_stake_for_testing(coin::mint_for_testing<SUI>(1, scenario.ctx()));
    test_scenario::return_shared(duel);
}

// A `Resolved` duel (settled by play at 1_200_000). The settlement transaction stays open.
fun resolved_duel(scenario: &mut Scenario): ID {
    let duel_id = active_duel(scenario, TO_CREATOR);
    at(scenario, CREATOR, 1_200_000);
    collect_now(scenario, duel_id, WINNER_CREATOR);
    duel_id
}

// A `TimedOut` duel (the creator did not move; the acceptor claimed at the deadline). The transaction
// stays open.
fun timed_out_duel(scenario: &mut Scenario): ID {
    let duel_id = active_duel(scenario, TO_CREATOR);
    claim(scenario, duel_id, ACCEPTOR, 1_600_000);
    duel_id
}

// An `Expired` duel (nobody moved; a third party refunded at the deadline). The transaction stays open.
fun expired_duel(scenario: &mut Scenario): ID {
    let duel_id = active_duel(scenario, TO_BOTH);
    refund(scenario, duel_id, OTHER, 1_600_000);
    duel_id
}

// The mask of the rival of `player`. The test game below hands the turn to the rival after every move.
fun rival_mask(player: address): u8 {
    if (player == CREATOR) TO_ACCEPTOR else TO_CREATOR
}

// Test game, by turns: `mover` plays at `ms` and the turn goes to the rival (a full new plazo).
fun play_turn(scenario: &mut Scenario, duel_id: ID, mover: address, ms: u64) {
    record(scenario, duel_id, mover, ms, rival_mask(mover));
}

// Test game, simultaneous phase: the FIRST player to commit leaves the other one pending (`next` = the
// other's bit, the only value `record_move` accepts then).
fun commit_first(scenario: &mut Scenario, duel_id: ID, player: address, ms: u64) {
    record(scenario, duel_id, player, ms, rival_mask(player));
}

// Test game, simultaneous phase: the LAST player to commit closes the phase and chooses who moves first.
fun commit_last(
    scenario: &mut Scenario,
    duel_id: ID,
    player: address,
    ms: u64,
    first_mover: u8,
) {
    record(scenario, duel_id, player, ms, first_mover);
}

// The state of an `Active` duel: `to_move`, `deadline_ms` and `stake == 2 × bet`. The duel is taken, so
// it has to run in a transaction where the duel was not returned yet (after a `next_tx`).
fun assert_clock(scenario: &Scenario, duel_id: ID, to_move: u8, deadline_ms: u64) {
    let duel = scenario.take_shared_by_id<Duel<TestGame>>(duel_id);
    assert!(duel.is_active_for_testing());
    assert!(duel.to_move_for_testing() == option::some(to_move));
    assert!(duel.deadline_ms_for_testing() == option::some(deadline_ms));
    assert!(duel.stake_value_for_testing() == 2 * duel.bet_for_testing());
    test_scenario::return_shared(duel);
}

// Right after a `record_move`, in the still-open transaction: the `DuelTurn` event and the state it left.
fun assert_turn(
    scenario: &mut Scenario,
    duel_id: ID,
    actor: address,
    to_move: u8,
    deadline_ms: u64,
) {
    let turn_events = event::events_by_type<DuelTurn<TestGame>>();
    scenario.next_tx(actor);
    let expected = duel::new_duel_turn_for_testing<TestGame>(duel_id, actor, to_move, deadline_ms);
    assert!(turn_events == vector[expected]);
    assert_clock(scenario, duel_id, to_move, deadline_ms);
}

// Checks the claim by time right after `claim_timeout`, in the still-open transaction (SEG-4):
// `DuelTimedOut`, one coin of `payout` for the winner (who must have no other coin) as the only transfer
// of the transaction, House fees up by `fee`, empty stake, `TimedOut { acceptor, winner }` and
// `payout + fee == 2 × bet`.
fun assert_timed_out(
    scenario: &mut Scenario,
    duel_id: ID,
    acceptor: address,
    winner: address,
    claimed_by: address,
    fee: u64,
    payout: u64,
    fees_before: u64,
) {
    let timed_out_events = event::events_by_type<DuelTimedOut<TestGame>>();
    let effects = scenario.next_tx(winner);
    let transfers = test_scenario::transferred_to_account(&effects);
    assert!(transfers.length() == 1);
    let (_, recipient) = transfers.get_entry_by_idx(0);
    assert!(*recipient == winner);
    let duel = scenario.take_shared_by_id<Duel<TestGame>>(duel_id);
    let creator = duel.creator_for_testing();
    let pot = 2 * duel.bet_for_testing();
    assert!(payout + fee == pot);
    let expected = duel::new_duel_timed_out_for_testing<TestGame>(
        duel_id,
        creator,
        acceptor,
        winner,
        claimed_by,
        pot,
        fee,
        payout,
    );
    assert!(timed_out_events == vector[expected]);
    assert!(duel.stake_value_for_testing() == 0);
    assert!(duel.is_timed_out_for_testing());
    assert!(!duel.is_resolved_for_testing());
    assert!(!duel.is_expired_for_testing());
    assert!(!duel.is_active_for_testing());
    assert!(!duel.is_pending_for_testing());
    assert!(!duel.is_cancelled_for_testing());
    assert!(duel.acceptor_for_testing() == option::some(acceptor));
    assert!(duel.winner_for_testing() == option::some(winner));
    assert!(duel.to_move_for_testing().is_none());
    assert!(duel.deadline_ms_for_testing().is_none());
    test_scenario::return_shared(duel);
    let house = scenario.take_shared<House>();
    assert!(house.fees_collected() == fees_before + fee);
    test_scenario::return_shared(house);
    assert_single_coin(scenario, winner, payout);
}

// Checks the refund right after `refund_stalled`, in the still-open transaction (SEG-4): `DuelExpired`
// with `refund_each == bet`, exactly two transfers (one to each stored player, nothing to the caller),
// one coin of `creator_refund` for the creator and one of `acceptor_refund` for the acceptor (neither may
// hold another coin), empty stake and `Expired { acceptor }`. The fees of the House are checked by the
// caller (`fees_of_house`): a House of another version cannot be read.
fun assert_expired(
    scenario: &mut Scenario,
    duel_id: ID,
    acceptor: address,
    creator_refund: u64,
    acceptor_refund: u64,
) {
    let expired_events = event::events_by_type<DuelExpired<TestGame>>();
    let effects = scenario.next_tx(PUBLISHER);
    let transfers = test_scenario::transferred_to_account(&effects);
    let duel = scenario.take_shared_by_id<Duel<TestGame>>(duel_id);
    let creator = duel.creator_for_testing();
    let bet = duel.bet_for_testing();
    assert!(transfers.length() == 2);
    let (_, first) = transfers.get_entry_by_idx(0);
    let (_, second) = transfers.get_entry_by_idx(1);
    let in_order = *first == creator && *second == acceptor;
    let reversed = *first == acceptor && *second == creator;
    assert!(in_order || reversed);
    let expected = duel::new_duel_expired_for_testing<TestGame>(duel_id, creator, acceptor, bet);
    assert!(expired_events == vector[expected]);
    assert!(duel.stake_value_for_testing() == 0);
    assert!(duel.is_expired_for_testing());
    assert!(!duel.is_timed_out_for_testing());
    assert!(!duel.is_resolved_for_testing());
    assert!(!duel.is_active_for_testing());
    assert!(!duel.is_pending_for_testing());
    assert!(!duel.is_cancelled_for_testing());
    assert!(duel.acceptor_for_testing() == option::some(acceptor));
    assert!(duel.winner_for_testing().is_none());
    assert!(duel.to_move_for_testing().is_none());
    assert!(duel.deadline_ms_for_testing().is_none());
    test_scenario::return_shared(duel);
    assert_single_coin(scenario, creator, creator_refund);
    assert_single_coin(scenario, acceptor, acceptor_refund);
}

// ---------------------------------------------------------------------------------------------
// Edge of the deadline, on both sides, for every function with a deadline (T-1, INV-D6)
// ---------------------------------------------------------------------------------------------

#[test]
fun test_record_move_passes_one_ms_before_deadline() {
    let mut scenario = publish();
    let duel_id = active_duel(&mut scenario, TO_CREATOR);

    play_turn(&mut scenario, duel_id, CREATOR, 1_599_999);

    // deadline_ms of the next move = 1_599_999 + 600_000
    assert_turn(&mut scenario, duel_id, CREATOR, TO_ACCEPTOR, 2_199_999);
    scenario.end();
}

#[test, expected_failure(abort_code = battleship::duel::ENotExpired)]
fun test_claim_timeout_rejects_one_ms_before_deadline() {
    let mut scenario = publish();
    let duel_id = active_duel(&mut scenario, TO_CREATOR);

    claim(&mut scenario, duel_id, ACCEPTOR, 1_599_999);

    scenario.end();
}

#[test, expected_failure(abort_code = battleship::duel::EDeadlinePassed)]
fun test_record_move_rejects_at_deadline() {
    let mut scenario = publish();
    let duel_id = active_duel(&mut scenario, TO_CREATOR);

    play_turn(&mut scenario, duel_id, CREATOR, 1_600_000);

    scenario.end();
}

#[test, expected_failure(abort_code = battleship::duel::EDeadlinePassed)]
fun test_record_move_rejects_after_deadline() {
    let mut scenario = publish();
    let duel_id = active_duel(&mut scenario, TO_CREATOR);

    play_turn(&mut scenario, duel_id, CREATOR, 2_000_000);

    scenario.end();
}

// The edge of the claim with the acceptor pending (`to_move = 2`): one ms before the deadline it is early.
#[test, expected_failure(abort_code = battleship::duel::ENotExpired)]
fun test_claim_timeout_rejects_one_ms_before_deadline_when_acceptor_pending() {
    let mut scenario = publish();
    let duel_id = active_duel(&mut scenario, TO_ACCEPTOR);

    claim(&mut scenario, duel_id, CREATOR, 1_599_999);

    scenario.end();
}

// Both pending, well past the deadline: the refund is open (and stays open).
#[test]
fun test_refund_stalled_both_pending_succeeds_after_deadline() {
    let mut scenario = publish();
    let duel_id = active_duel(&mut scenario, TO_BOTH);

    refund(&mut scenario, duel_id, OTHER, 2_000_000);

    assert_expired(&mut scenario, duel_id, ACCEPTOR, BET, BET);
    assert!(sum_coins(&scenario, OTHER) == 0);
    scenario.end();
}

#[test, expected_failure(abort_code = battleship::duel::EDeadlinePassed)]
fun test_collect_rejects_at_deadline() {
    let mut scenario = publish();
    let duel_id = active_duel(&mut scenario, TO_CREATOR);
    at(&mut scenario, CREATOR, 1_600_000);

    collect_now(&mut scenario, duel_id, WINNER_CREATOR);

    scenario.end();
}

#[test]
fun test_claim_timeout_succeeds_at_deadline() {
    let mut scenario = publish();
    set_fee_rate(&mut scenario, 250);
    let duel_id = active_duel(&mut scenario, TO_CREATOR);

    claim(&mut scenario, duel_id, ACCEPTOR, 1_600_000);

    assert_timed_out(&mut scenario, duel_id, ACCEPTOR, ACCEPTOR, ACCEPTOR, 500_000, 19_500_000, 0);
    scenario.end();
}

#[test]
fun test_collect_passes_one_ms_before_deadline() {
    let mut scenario = publish();
    set_fee_rate(&mut scenario, 250);
    let duel_id = active_duel(&mut scenario, TO_CREATOR);
    at(&mut scenario, CREATOR, 1_599_999);

    collect_now(&mut scenario, duel_id, WINNER_ACCEPTOR);

    assert_resolved(&mut scenario, duel_id, ACCEPTOR, ACCEPTOR, 500_000, 19_500_000, 0);
    scenario.end();
}

// ---------------------------------------------------------------------------------------------
// claim_timeout
// ---------------------------------------------------------------------------------------------

// Creator pending => the acceptor wins by time, with each fee rate and an odd pot (2_000_002).
#[test]
fun test_claim_timeout_pays_acceptor_when_creator_pending() {
    let mut scenario = publish();
    let rates = vector[0u16, 250, 1000];
    let fees = vector[0u64, 50_000, 200_000]; // floor(2_000_002 × rate / 10_000)
    let payouts = vector[2_000_002u64, 1_950_002, 1_800_002];
    let acceptors = vector[@0x20, @0x21, @0x22];
    let mut total_fees = 0;
    let mut i = 0;
    while (i < rates.length()) {
        set_fee_rate(&mut scenario, rates[i]);
        let duel_id = create(&mut scenario, CREATOR, ODD_BET, option::none(), CONTROL_RAPID_10);
        let base = 10_000_000 * (i + 1);
        at(&mut scenario, acceptors[i], base);
        activate_now(&mut scenario, duel_id, ODD_BET, TO_CREATOR);
        claim(&mut scenario, duel_id, acceptors[i], base + 600_000);
        assert_timed_out(
            &mut scenario,
            duel_id,
            acceptors[i],
            acceptors[i],
            acceptors[i],
            fees[i],
            payouts[i],
            total_fees,
        );
        total_fees = total_fees + fees[i];
        i = i + 1;
    };
    assert!(fees_of_house(&mut scenario) == 250_000);
    // The pending creator only ever put its bets in.
    assert!(sum_coins(&scenario, CREATOR) == 0);
    scenario.end();
}

// Acceptor pending => the creator wins by time, with each fee rate and an odd pot (2_000_002).
#[test]
fun test_claim_timeout_pays_creator_when_acceptor_pending() {
    let mut scenario = publish();
    let rates = vector[0u16, 250, 1000];
    let fees = vector[0u64, 50_000, 200_000];
    let payouts = vector[2_000_002u64, 1_950_002, 1_800_002];
    let creators = vector[@0x30, @0x31, @0x32];
    let mut total_fees = 0;
    let mut i = 0;
    while (i < rates.length()) {
        set_fee_rate(&mut scenario, rates[i]);
        let duel_id = create(&mut scenario, creators[i], ODD_BET, option::none(), CONTROL_RAPID_10);
        let base = 10_000_000 * (i + 1);
        at(&mut scenario, ACCEPTOR, base);
        activate_now(&mut scenario, duel_id, ODD_BET, TO_ACCEPTOR);
        claim(&mut scenario, duel_id, creators[i], base + 600_000);
        assert_timed_out(
            &mut scenario,
            duel_id,
            ACCEPTOR,
            creators[i],
            creators[i],
            fees[i],
            payouts[i],
            total_fees,
        );
        total_fees = total_fees + fees[i];
        i = i + 1;
    };
    assert!(fees_of_house(&mut scenario) == 250_000);
    // The pending acceptor only ever put its bets in.
    assert!(sum_coins(&scenario, ACCEPTOR) == 0);
    scenario.end();
}

// S-3: anyone sends the claim and the pay goes to the rival of the pending player, never to the caller.
#[test]
fun test_claim_timeout_by_third_party_pays_the_rival_not_the_caller() {
    let mut scenario = publish();
    set_fee_rate(&mut scenario, 250);
    let duel_id = active_duel(&mut scenario, TO_CREATOR);

    claim(&mut scenario, duel_id, OTHER, 1_600_000);

    assert_timed_out(&mut scenario, duel_id, ACCEPTOR, ACCEPTOR, OTHER, 500_000, 19_500_000, 0);
    assert!(sum_coins(&scenario, OTHER) == 0);
    assert!(sum_coins(&scenario, CREATOR) == 0);
    scenario.end();
}

// The player that let the plazo pass cannot redirect the pot to itself by sending the claim.
#[test]
fun test_claim_timeout_by_the_pending_player_still_pays_the_rival() {
    let mut scenario = publish();
    set_fee_rate(&mut scenario, 1000);
    let duel_id = active_duel(&mut scenario, TO_ACCEPTOR);

    claim(&mut scenario, duel_id, ACCEPTOR, 1_700_000);

    assert_timed_out(
        &mut scenario,
        duel_id,
        ACCEPTOR,
        CREATOR,
        ACCEPTOR,
        2_000_000,
        18_000_000,
        0,
    );
    assert!(sum_coins(&scenario, ACCEPTOR) == 0);
    scenario.end();
}

#[test]
fun test_claim_timeout_stores_timed_out_state_and_event() {
    let mut scenario = publish();
    set_fee_rate(&mut scenario, 250);
    let duel_id = active_duel(&mut scenario, TO_ACCEPTOR);

    claim(&mut scenario, duel_id, OTHER, 1_650_000);

    let timed_out_events = event::events_by_type<DuelTimedOut<TestGame>>();
    let expected = duel::new_duel_timed_out_for_testing<TestGame>(
        duel_id,
        CREATOR,
        ACCEPTOR,
        CREATOR, // winner: the rival of the pending acceptor
        OTHER, // claimed_by
        20_000_000,
        500_000,
        19_500_000,
    );
    assert!(timed_out_events == vector[expected]);
    scenario.next_tx(OTHER);
    let duel = scenario.take_shared_by_id<Duel<TestGame>>(duel_id);
    assert!(duel.is_timed_out_for_testing());
    assert!(!duel.is_active_for_testing());
    assert!(duel.acceptor_for_testing() == option::some(ACCEPTOR));
    assert!(duel.winner_for_testing() == option::some(CREATOR));
    assert!(duel.to_move_for_testing().is_none());
    assert!(duel.deadline_ms_for_testing().is_none());
    assert!(duel.stake_value_for_testing() == 0);
    test_scenario::return_shared(duel);
    assert_single_coin(&scenario, CREATOR, 19_500_000);
    scenario.end();
}

#[test, expected_failure(abort_code = battleship::duel::EBothPending)]
fun test_claim_timeout_rejects_both_pending() {
    let mut scenario = publish();
    let duel_id = active_duel(&mut scenario, TO_BOTH);

    claim(&mut scenario, duel_id, ACCEPTOR, 1_600_000);

    scenario.end();
}

#[test, expected_failure(abort_code = battleship::duel::ENotActive)]
fun test_claim_timeout_rejects_not_active() {
    let mut scenario = publish();
    let duel_id = create(&mut scenario, CREATOR, BET, option::none(), CONTROL_RAPID_10);

    claim(&mut scenario, duel_id, ACCEPTOR, 1_600_000);

    scenario.end();
}

#[test, expected_failure(abort_code = battleship::duel::ENoClock)]
fun test_claim_timeout_rejects_clockless_duel() {
    let mut scenario = publish();
    let duel_id = create(&mut scenario, CREATOR, BET, option::none(), CONTROL_NONE);
    scenario.next_tx(ACCEPTOR);
    let mut duel = scenario.take_shared_by_id<Duel<TestGame>>(duel_id);
    let mut house = scenario.take_shared<House>();
    let payment = coin::mint_for_testing<SUI>(BET, scenario.ctx());
    // `Active` without clock exists only between `activate_atomic` and `pay`.
    let c = duel::activate_atomic(TestGame {}, &mut duel, &mut house, payment, scenario.ctx());

    duel::claim_timeout(&mut duel, &mut house, scenario.ctx());

    duel::pay(TestGame {}, &mut duel, c, WINNER_CREATOR, scenario.ctx());
    test_scenario::return_shared(duel);
    test_scenario::return_shared(house);
    scenario.end();
}

#[test, expected_failure(abort_code = battleship::duel::EWrongHouse)]
fun test_claim_timeout_rejects_other_house() {
    let mut scenario = publish();
    let duel_id = active_duel(&mut scenario, TO_CREATOR);
    let second_house_id = other_house(&mut scenario);

    at(&mut scenario, ACCEPTOR, 1_600_000);
    claim_with(&mut scenario, duel_id, option::some(second_house_id));

    scenario.end();
}

#[test, expected_failure(abort_code = battleship::duel::EVersionMismatch)]
fun test_claim_timeout_rejects_duel_of_older_version() {
    let mut scenario = publish();
    let duel_id = active_duel(&mut scenario, TO_CREATOR);
    set_duel_version(&mut scenario, duel_id, OLDER_VERSION);

    claim(&mut scenario, duel_id, ACCEPTOR, 1_600_000);

    scenario.end();
}

#[test, expected_failure(abort_code = battleship::duel::EBrokenStake)]
fun test_claim_timeout_rejects_broken_stake() {
    let mut scenario = publish();
    let duel_id = active_duel(&mut scenario, TO_CREATOR);
    break_stake(&mut scenario, duel_id);

    claim(&mut scenario, duel_id, ACCEPTOR, 1_600_000);

    scenario.end();
}

// A House written by a newer package version cuts the claim off (it charges a fee, so it reads the House
// with its version): the exit in that case is `refund_stalled`.
#[test, expected_failure(abort_code = battleship::house::EWrongVersion)]
fun test_claim_timeout_aborts_with_house_of_other_version() {
    let mut scenario = publish();
    let duel_id = active_duel(&mut scenario, TO_CREATOR);
    set_house_version(&mut scenario, NEWER_VERSION);
    set_duel_version(&mut scenario, duel_id, NEWER_VERSION);

    claim(&mut scenario, duel_id, ACCEPTOR, 1_600_000);

    scenario.end();
}

// Order of aborts of `claim_timeout` (R.4): House version, state, clock, version, House, deadline, both
// pending, stake.
#[test, expected_failure(abort_code = battleship::house::EWrongVersion)]
fun test_claim_timeout_reports_house_version_first() {
    let mut scenario = publish();
    let duel_id = create(&mut scenario, CREATOR, BET, option::none(), CONTROL_RAPID_10);
    set_house_version(&mut scenario, NEWER_VERSION);

    claim(&mut scenario, duel_id, ACCEPTOR, 1_600_000);

    scenario.end();
}

#[test, expected_failure(abort_code = battleship::duel::ENoClock)]
fun test_claim_timeout_reports_no_clock_before_version_mismatch() {
    let mut scenario = publish();
    let duel_id = create(&mut scenario, CREATOR, BET, option::none(), CONTROL_NONE);
    scenario.next_tx(ACCEPTOR);
    let mut duel = scenario.take_shared_by_id<Duel<TestGame>>(duel_id);
    let mut house = scenario.take_shared<House>();
    let payment = coin::mint_for_testing<SUI>(BET, scenario.ctx());
    let c = duel::activate_atomic(TestGame {}, &mut duel, &mut house, payment, scenario.ctx());
    duel.set_version_for_testing(OLDER_VERSION);

    duel::claim_timeout(&mut duel, &mut house, scenario.ctx());

    duel::pay(TestGame {}, &mut duel, c, WINNER_CREATOR, scenario.ctx());
    test_scenario::return_shared(duel);
    test_scenario::return_shared(house);
    scenario.end();
}

#[test, expected_failure(abort_code = battleship::duel::EVersionMismatch)]
fun test_claim_timeout_reports_version_mismatch_before_wrong_house() {
    let mut scenario = publish();
    let duel_id = active_duel(&mut scenario, TO_CREATOR);
    set_duel_version(&mut scenario, duel_id, OLDER_VERSION);
    let second_house_id = other_house(&mut scenario);

    at(&mut scenario, ACCEPTOR, 1_600_000);
    claim_with(&mut scenario, duel_id, option::some(second_house_id));

    scenario.end();
}

#[test, expected_failure(abort_code = battleship::duel::EWrongHouse)]
fun test_claim_timeout_reports_wrong_house_before_not_expired() {
    let mut scenario = publish();
    let duel_id = active_duel(&mut scenario, TO_CREATOR);
    let second_house_id = other_house(&mut scenario);

    at(&mut scenario, ACCEPTOR, 1_200_000);
    claim_with(&mut scenario, duel_id, option::some(second_house_id));

    scenario.end();
}

#[test, expected_failure(abort_code = battleship::duel::ENotExpired)]
fun test_claim_timeout_reports_not_expired_before_both_pending() {
    let mut scenario = publish();
    let duel_id = active_duel(&mut scenario, TO_BOTH);

    claim(&mut scenario, duel_id, ACCEPTOR, 1_599_999);

    scenario.end();
}

#[test, expected_failure(abort_code = battleship::duel::EBothPending)]
fun test_claim_timeout_reports_both_pending_before_broken_stake() {
    let mut scenario = publish();
    let duel_id = active_duel(&mut scenario, TO_BOTH);
    break_stake(&mut scenario, duel_id);

    claim(&mut scenario, duel_id, ACCEPTOR, 1_600_000);

    scenario.end();
}

// ---------------------------------------------------------------------------------------------
// refund_stalled
// ---------------------------------------------------------------------------------------------

// Both pending (nobody moved): from the deadline on, each player gets its bet back, without fee, from a
// third party's transaction.
#[test]
fun test_refund_stalled_refunds_both_when_both_pending_at_deadline() {
    let mut scenario = publish();
    // A fee rate that would show if a fee were charged.
    set_fee_rate(&mut scenario, 250);
    let duel_id = active_duel(&mut scenario, TO_BOTH);

    refund(&mut scenario, duel_id, OTHER, 1_600_000);

    assert_expired(&mut scenario, duel_id, ACCEPTOR, BET, BET);
    assert!(sum_coins(&scenario, OTHER) == 0);
    assert!(fees_of_house(&mut scenario) == 0);
    scenario.end();
}

#[test, expected_failure(abort_code = battleship::duel::ENotStalled)]
fun test_refund_stalled_rejects_one_pending_before_grace() {
    let mut scenario = publish();
    let duel_id = active_duel(&mut scenario, TO_CREATOR);

    // Just past the deadline: the rival can claim, but the refund waits for the grace.
    refund(&mut scenario, duel_id, CREATOR, 1_600_000);

    scenario.end();
}

// Barrier against a shortened grace (R2-1): the literal 604_800_000 ms, not the constant.
// deadline 1_600_000 + 604_800_000 = 606_400_000
#[test, expected_failure(abort_code = battleship::duel::ENotStalled)]
fun test_refund_stalled_one_pending_rejects_one_ms_before_grace() {
    let mut scenario = publish();
    let duel_id = active_duel(&mut scenario, TO_CREATOR);

    refund(&mut scenario, duel_id, CREATOR, 606_399_999);

    scenario.end();
}

#[test]
fun test_refund_stalled_one_pending_succeeds_at_deadline_plus_grace() {
    let mut scenario = publish();
    let duel_id = active_duel(&mut scenario, TO_CREATOR);

    refund(&mut scenario, duel_id, OTHER, 606_400_000);

    assert_expired(&mut scenario, duel_id, ACCEPTOR, BET, BET);
    scenario.end();
}

#[test, expected_failure(abort_code = battleship::duel::ENotStalled)]
fun test_refund_stalled_both_pending_rejects_one_ms_before_deadline() {
    let mut scenario = publish();
    let duel_id = active_duel(&mut scenario, TO_BOTH);

    refund(&mut scenario, duel_id, OTHER, 1_599_999);

    scenario.end();
}

#[test, expected_failure(abort_code = battleship::duel::ENotStalled)]
fun test_refund_stalled_rejects_both_pending_before_deadline() {
    let mut scenario = publish();
    let duel_id = active_duel(&mut scenario, TO_BOTH);

    refund(&mut scenario, duel_id, OTHER, 1_200_000);

    scenario.end();
}

// The documented race: past the grace the winner can still claim, if the refund did not come first.
#[test]
fun test_claim_timeout_still_succeeds_after_grace() {
    let mut scenario = publish();
    set_fee_rate(&mut scenario, 250);
    let duel_id = active_duel(&mut scenario, TO_CREATOR);

    claim(&mut scenario, duel_id, ACCEPTOR, 606_400_001);

    assert_timed_out(&mut scenario, duel_id, ACCEPTOR, ACCEPTOR, ACCEPTOR, 500_000, 19_500_000, 0);
    scenario.end();
}

#[test, expected_failure(abort_code = battleship::duel::ENotActive)]
fun test_claim_timeout_after_refund_stalled_aborts_not_active() {
    let mut scenario = publish();
    let duel_id = active_duel(&mut scenario, TO_CREATOR);
    refund(&mut scenario, duel_id, OTHER, 606_400_000);

    claim(&mut scenario, duel_id, ACCEPTOR, 606_500_000);

    scenario.end();
}

#[test]
fun test_refund_stalled_refunds_both_after_grace_with_one_pending() {
    let mut scenario = publish();
    set_fee_rate(&mut scenario, 1000);
    let duel_id = active_duel(&mut scenario, TO_ACCEPTOR);

    // The pending player itself sends it: it only gets its own bet back, not the pot.
    refund(&mut scenario, duel_id, ACCEPTOR, 700_000_000);

    assert_expired(&mut scenario, duel_id, ACCEPTOR, BET, BET);
    assert!(fees_of_house(&mut scenario) == 0);
    scenario.end();
}

#[test]
fun test_refund_stalled_by_third_party_pays_only_the_players() {
    let mut scenario = publish();
    let duel_id = active_duel(&mut scenario, TO_CREATOR);

    refund(&mut scenario, duel_id, INVITEE, 606_400_000);

    assert_expired(&mut scenario, duel_id, ACCEPTOR, BET, BET);
    assert!(sum_coins(&scenario, INVITEE) == 0);
    scenario.end();
}

// No `assert` on `stake == 2 × bet`: whatever sits in the stake leaves it (the creator gets `bet`, the
// acceptor the rest); an abort here would lock funds.
#[test]
fun test_refund_stalled_pays_the_rest_of_the_stake_to_the_acceptor() {
    let mut scenario = publish();
    let duel_id = active_duel(&mut scenario, TO_BOTH);
    break_stake(&mut scenario, duel_id);

    refund(&mut scenario, duel_id, OTHER, 1_600_000);

    assert_expired(&mut scenario, duel_id, ACCEPTOR, BET, BET + 1);
    scenario.end();
}

// A fee already collected stays in the House and the refund of another duel adds nothing to it.
#[test]
fun test_refund_stalled_charges_no_fee() {
    let mut scenario = publish();
    set_fee_rate(&mut scenario, 1000);
    let settled_id = active_duel_at(&mut scenario, TO_CREATOR, 1_000_000);
    at(&mut scenario, CREATOR, 1_100_000);
    collect_now(&mut scenario, settled_id, WINNER_CREATOR);
    assert_resolved(&mut scenario, settled_id, ACCEPTOR, CREATOR, 2_000_000, 18_000_000, 0);
    let stalled_id = active_duel_at(&mut scenario, TO_CREATOR, 2_000_000);

    // deadline 2_000_000 + 600_000, grace 604_800_000
    refund(&mut scenario, stalled_id, OTHER, 607_400_000);

    scenario.next_tx(PUBLISHER);
    let stalled = scenario.take_shared_by_id<Duel<TestGame>>(stalled_id);
    assert!(stalled.is_expired_for_testing());
    assert!(stalled.stake_value_for_testing() == 0);
    test_scenario::return_shared(stalled);
    assert!(fees_of_house(&mut scenario) == 2_000_000);
    assert_single_coin(&scenario, ACCEPTOR, BET);
    // The creator won the first duel (18_000_000) and got its bet back from the second one.
    assert!(sum_coins(&scenario, CREATOR) == 18_000_000 + BET);
    scenario.end();
}

// INV-D2: `refund_stalled` takes no House and reads no version, so it works with a House and a duel
// written by other package versions (the cut-off that blocks `claim_timeout` does not reach it).
#[test]
fun test_refund_stalled_works_with_house_of_other_version() {
    let mut scenario = publish();
    let duel_id = active_duel(&mut scenario, TO_BOTH);
    set_house_version(&mut scenario, NEWER_VERSION);
    set_duel_version(&mut scenario, duel_id, OLDER_VERSION);

    refund(&mut scenario, duel_id, OTHER, 1_600_000);

    assert_expired(&mut scenario, duel_id, ACCEPTOR, BET, BET);
    scenario.end();
}

#[test, expected_failure(abort_code = battleship::duel::ENotActive)]
fun test_refund_stalled_rejects_not_active() {
    let mut scenario = publish();
    let duel_id = create(&mut scenario, CREATOR, BET, option::none(), CONTROL_RAPID_10);

    refund(&mut scenario, duel_id, OTHER, 700_000_000);

    scenario.end();
}

#[test, expected_failure(abort_code = battleship::duel::ENoClock)]
fun test_refund_stalled_rejects_clockless_duel() {
    let mut scenario = publish();
    let duel_id = create(&mut scenario, CREATOR, BET, option::none(), CONTROL_NONE);
    scenario.next_tx(ACCEPTOR);
    let mut duel = scenario.take_shared_by_id<Duel<TestGame>>(duel_id);
    let mut house = scenario.take_shared<House>();
    let payment = coin::mint_for_testing<SUI>(BET, scenario.ctx());
    let c = duel::activate_atomic(TestGame {}, &mut duel, &mut house, payment, scenario.ctx());

    duel::refund_stalled(&mut duel, scenario.ctx());

    duel::pay(TestGame {}, &mut duel, c, WINNER_CREATOR, scenario.ctx());
    test_scenario::return_shared(duel);
    test_scenario::return_shared(house);
    scenario.end();
}

// ---------------------------------------------------------------------------------------------
// record_move: the rule of bits and the order of aborts (R4-1)
// ---------------------------------------------------------------------------------------------

// `rem == 0`, `next` = the rival: the plazo restarts from now.
#[test]
fun test_record_move_turn_handoff_resets_deadline() {
    let mut scenario = publish();
    let duel_id = active_duel(&mut scenario, TO_CREATOR);

    play_turn(&mut scenario, duel_id, CREATOR, 1_200_000);

    assert_turn(&mut scenario, duel_id, CREATOR, TO_ACCEPTOR, 1_800_000);
    scenario.end();
}

// `rem == 0`, `next` = the same player: it also gets a full new plazo.
#[test]
fun test_record_move_same_player_continuing_also_resets_deadline() {
    let mut scenario = publish();
    let duel_id = active_duel(&mut scenario, TO_CREATOR);

    record(&mut scenario, duel_id, CREATOR, 1_200_000, TO_CREATOR);

    assert_turn(&mut scenario, duel_id, CREATOR, TO_CREATOR, 1_800_000);
    scenario.end();
}

// Simultaneous phase, the creator first: the acceptor stays pending with the plazo it already had.
#[test]
fun test_record_move_simultaneous_phase_first_a_keeps_deadline() {
    let mut scenario = publish();
    let duel_id = active_duel(&mut scenario, TO_BOTH);

    commit_first(&mut scenario, duel_id, CREATOR, 1_200_000);

    assert_turn(&mut scenario, duel_id, CREATOR, TO_ACCEPTOR, 1_600_000);
    scenario.end();
}

// Simultaneous phase, the acceptor first: the creator stays pending with the plazo it already had.
#[test]
fun test_record_move_simultaneous_phase_first_b_keeps_deadline() {
    let mut scenario = publish();
    let duel_id = active_duel(&mut scenario, TO_BOTH);

    commit_first(&mut scenario, duel_id, ACCEPTOR, 1_200_000);

    assert_turn(&mut scenario, duel_id, ACCEPTOR, TO_CREATOR, 1_600_000);
    scenario.end();
}

// The case of the MAYOR: whoever commits LAST closes the phase and gets a full plazo, whatever `next` is
// (the closer itself, the rival or both).
#[test]
fun test_record_move_phase_close_resets_deadline_even_if_closer_moves_next() {
    let mut scenario = publish();
    let masks = vector[TO_ACCEPTOR, TO_CREATOR, TO_BOTH];
    let mut i = 0;
    while (i < masks.length()) {
        let base = 10_000_000 * (i + 1);
        let duel_id = create(&mut scenario, CREATOR, BET, option::none(), CONTROL_RAPID_10);
        at(&mut scenario, ACCEPTOR, base);
        activate_now(&mut scenario, duel_id, BET, TO_BOTH);
        commit_first(&mut scenario, duel_id, CREATOR, base + 100_000);
        assert_turn(&mut scenario, duel_id, CREATOR, TO_ACCEPTOR, base + 600_000);
        // The acceptor closes the phase just before its plazo ends: the new one is complete.
        commit_last(&mut scenario, duel_id, ACCEPTOR, base + 500_000, masks[i]);
        assert_turn(&mut scenario, duel_id, ACCEPTOR, masks[i], base + 1_100_000);
        i = i + 1;
    };
    scenario.end();
}

// `rem = 2` (the creator moves, the acceptor is pending): `next` must be exactly 2.
#[test, expected_failure(abort_code = battleship::duel::EPhaseMismatch)]
fun test_record_move_rejects_next_other_than_rem_in_simultaneous_phase() {
    let mut scenario = publish();
    let duel_id = active_duel(&mut scenario, TO_BOTH);

    record(&mut scenario, duel_id, CREATOR, 1_200_000, TO_CREATOR);

    scenario.end();
}

#[test, expected_failure(abort_code = battleship::duel::EPhaseMismatch)]
fun test_record_move_rejects_next_both_in_simultaneous_phase() {
    let mut scenario = publish();
    let duel_id = active_duel(&mut scenario, TO_BOTH);

    record(&mut scenario, duel_id, CREATOR, 1_200_000, TO_BOTH);

    scenario.end();
}

#[test, expected_failure(abort_code = battleship::duel::EPhaseMismatch)]
fun test_record_move_rejects_next_zero_in_simultaneous_phase() {
    let mut scenario = publish();
    let duel_id = active_duel(&mut scenario, TO_BOTH);

    record(&mut scenario, duel_id, CREATOR, 1_200_000, 0);

    scenario.end();
}

// `rem = 1` (the acceptor moves, the creator is pending): `next` must be exactly 1.
#[test, expected_failure(abort_code = battleship::duel::EPhaseMismatch)]
fun test_record_move_rejects_next_other_than_rem_when_rem_is_creator() {
    let mut scenario = publish();
    let duel_id = active_duel(&mut scenario, TO_BOTH);

    record(&mut scenario, duel_id, ACCEPTOR, 1_200_000, TO_ACCEPTOR);

    scenario.end();
}

// The player that already committed cannot commit twice to stretch the phase: its bit is not in
// `to_move` any more.
#[test, expected_failure(abort_code = battleship::duel::ENotYourTurn)]
fun test_record_move_rejects_second_commit_in_simultaneous_phase() {
    let mut scenario = publish();
    let duel_id = active_duel(&mut scenario, TO_BOTH);
    commit_first(&mut scenario, duel_id, CREATOR, 1_200_000);

    commit_first(&mut scenario, duel_id, CREATOR, 1_300_000);

    scenario.end();
}

// `rem == 0`: the mask must be in 1..=3.
#[test, expected_failure(abort_code = battleship::duel::EBadMask)]
fun test_record_move_rejects_next_zero_or_above_three() {
    let mut scenario = publish();
    let duel_id = active_duel(&mut scenario, TO_CREATOR);

    record(&mut scenario, duel_id, CREATOR, 1_200_000, 0);

    scenario.end();
}

#[test, expected_failure(abort_code = battleship::duel::EBadMask)]
fun test_record_move_rejects_next_above_three() {
    let mut scenario = publish();
    let duel_id = active_duel(&mut scenario, TO_CREATOR);

    record(&mut scenario, duel_id, CREATOR, 1_200_000, 4);

    scenario.end();
}

// Closing a simultaneous phase is `rem == 0` too: the mask is checked there.
#[test, expected_failure(abort_code = battleship::duel::EBadMask)]
fun test_record_move_rejects_next_zero_when_closing_a_simultaneous_phase() {
    let mut scenario = publish();
    let duel_id = active_duel(&mut scenario, TO_BOTH);
    commit_first(&mut scenario, duel_id, CREATOR, 1_200_000);

    commit_last(&mut scenario, duel_id, ACCEPTOR, 1_300_000, 0);

    scenario.end();
}

#[test, expected_failure(abort_code = battleship::duel::ENotYourTurn)]
fun test_record_move_rejects_player_outside_to_move() {
    let mut scenario = publish();
    let duel_id = active_duel(&mut scenario, TO_CREATOR);

    play_turn(&mut scenario, duel_id, ACCEPTOR, 1_200_000);

    scenario.end();
}

#[test, expected_failure(abort_code = battleship::duel::ENotPlayer)]
fun test_record_move_rejects_third_party() {
    let mut scenario = publish();
    let duel_id = active_duel(&mut scenario, TO_BOTH);

    record(&mut scenario, duel_id, OTHER, 1_200_000, TO_CREATOR);

    scenario.end();
}

#[test, expected_failure(abort_code = battleship::duel::ENotActive)]
fun test_record_move_rejects_not_active() {
    let mut scenario = publish();
    let duel_id = create(&mut scenario, CREATOR, BET, option::none(), CONTROL_RAPID_10);

    record(&mut scenario, duel_id, CREATOR, 1_200_000, TO_ACCEPTOR);

    scenario.end();
}

#[test, expected_failure(abort_code = battleship::duel::ENoClock)]
fun test_record_move_rejects_clockless_duel() {
    let mut scenario = publish();
    let duel_id = create(&mut scenario, CREATOR, BET, option::none(), CONTROL_NONE);
    scenario.next_tx(ACCEPTOR);
    let mut duel = scenario.take_shared_by_id<Duel<TestGame>>(duel_id);
    let mut house = scenario.take_shared<House>();
    let payment = coin::mint_for_testing<SUI>(BET, scenario.ctx());
    // Inside the transaction of `activate_atomic` the duel is `Active { to_move = 0, deadline_ms = 0 }`:
    // `ENoClock` has to come before the turn and the deadline checks.
    let c = duel::activate_atomic(TestGame {}, &mut duel, &mut house, payment, scenario.ctx());

    duel::record_move(TestGame {}, &mut duel, TO_CREATOR, scenario.ctx());

    duel::pay(TestGame {}, &mut duel, c, WINNER_CREATOR, scenario.ctx());
    test_scenario::return_shared(duel);
    test_scenario::return_shared(house);
    scenario.end();
}

#[test, expected_failure(abort_code = battleship::duel::ENotActive)]
fun test_record_move_reports_not_active_before_not_player() {
    let mut scenario = publish();
    let duel_id = create(&mut scenario, CREATOR, BET, option::none(), CONTROL_RAPID_10);

    record(&mut scenario, duel_id, OTHER, 1_200_000, TO_CREATOR);

    scenario.end();
}

// A third party is not in `to_move` either, after the deadline and with a bad mask: `ENotPlayer` is first.
#[test, expected_failure(abort_code = battleship::duel::ENotPlayer)]
fun test_record_move_reports_not_player_before_not_your_turn() {
    let mut scenario = publish();
    let duel_id = active_duel(&mut scenario, TO_CREATOR);

    record(&mut scenario, duel_id, OTHER, 1_600_000, 0);

    scenario.end();
}

#[test, expected_failure(abort_code = battleship::duel::ENotYourTurn)]
fun test_record_move_reports_not_your_turn_before_deadline() {
    let mut scenario = publish();
    let duel_id = active_duel(&mut scenario, TO_CREATOR);

    play_turn(&mut scenario, duel_id, ACCEPTOR, 1_600_000);

    scenario.end();
}

#[test, expected_failure(abort_code = battleship::duel::EDeadlinePassed)]
fun test_record_move_reports_deadline_before_mask() {
    let mut scenario = publish();
    let duel_id = active_duel(&mut scenario, TO_CREATOR);

    record(&mut scenario, duel_id, CREATOR, 1_600_000, 0);

    scenario.end();
}

#[test, expected_failure(abort_code = battleship::duel::EDeadlinePassed)]
fun test_record_move_reports_deadline_before_phase_mismatch() {
    let mut scenario = publish();
    let duel_id = active_duel(&mut scenario, TO_BOTH);

    record(&mut scenario, duel_id, CREATOR, 1_600_000, TO_CREATOR);

    scenario.end();
}

// `turn_ms` is the one stored at creation (20 minutes here), never the one of a move: every plazo is
// computed from it and it does not change.
#[test]
fun test_turn_ms_is_never_changed_by_record_move() {
    let mut scenario = publish();
    let duel_id = create(&mut scenario, CREATOR, BET, option::none(), CONTROL_RAPID_20);
    at(&mut scenario, ACCEPTOR, 1_000_000);
    activate_now(&mut scenario, duel_id, BET, TO_CREATOR);

    play_turn(&mut scenario, duel_id, CREATOR, 1_100_000);
    assert_turn(&mut scenario, duel_id, CREATOR, TO_ACCEPTOR, 2_300_000);
    // The acceptor keeps the turn: another full plazo of 1_200_000.
    record(&mut scenario, duel_id, ACCEPTOR, 1_500_000, TO_ACCEPTOR);
    assert_turn(&mut scenario, duel_id, ACCEPTOR, TO_ACCEPTOR, 2_700_000);
    play_turn(&mut scenario, duel_id, ACCEPTOR, 2_000_000);
    assert_turn(&mut scenario, duel_id, ACCEPTOR, TO_CREATOR, 3_200_000);

    scenario.next_tx(CREATOR);
    let duel = scenario.take_shared_by_id<Duel<TestGame>>(duel_id);
    assert!(duel.turn_ms_for_testing() == RAPID_20_MS);
    test_scenario::return_shared(duel);
    scenario.end();
}

// ---------------------------------------------------------------------------------------------
// Complete matches with the test game
// ---------------------------------------------------------------------------------------------

// By turns: three alternating moves restart the plazo each time; the last mover wins and settles by play
// (`collect` + `pay`) before its own plazo ends.
#[test]
fun test_turn_based_game_runs_to_resolution_by_collect_and_pay() {
    let mut scenario = publish();
    set_fee_rate(&mut scenario, 250);
    let duel_id = active_duel(&mut scenario, TO_CREATOR);

    play_turn(&mut scenario, duel_id, CREATOR, 1_200_000);
    assert_turn(&mut scenario, duel_id, CREATOR, TO_ACCEPTOR, 1_800_000);
    play_turn(&mut scenario, duel_id, ACCEPTOR, 1_500_000);
    assert_turn(&mut scenario, duel_id, ACCEPTOR, TO_CREATOR, 2_100_000);
    play_turn(&mut scenario, duel_id, CREATOR, 1_900_000);
    assert_turn(&mut scenario, duel_id, CREATOR, TO_ACCEPTOR, 2_500_000);
    at(&mut scenario, ACCEPTOR, 2_000_000);
    collect_now(&mut scenario, duel_id, WINNER_ACCEPTOR);

    assert_resolved(&mut scenario, duel_id, ACCEPTOR, ACCEPTOR, 500_000, 19_500_000, 0);
    assert!(sum_coins(&scenario, CREATOR) == 0);
    scenario.end();
}

// Simultaneous phase first (both commit, the acceptor closes it and the creator moves first), then turns,
// and the acceptor lets its plazo pass: the creator claims by time.
#[test]
fun test_simultaneous_phase_then_turns_then_claim_timeout() {
    let mut scenario = publish();
    set_fee_rate(&mut scenario, 1000);
    let duel_id = active_duel(&mut scenario, TO_BOTH);

    commit_first(&mut scenario, duel_id, CREATOR, 1_100_000);
    assert_turn(&mut scenario, duel_id, CREATOR, TO_ACCEPTOR, 1_600_000);
    commit_last(&mut scenario, duel_id, ACCEPTOR, 1_500_000, TO_CREATOR);
    assert_turn(&mut scenario, duel_id, ACCEPTOR, TO_CREATOR, 2_100_000);
    play_turn(&mut scenario, duel_id, CREATOR, 2_000_000);
    assert_turn(&mut scenario, duel_id, CREATOR, TO_ACCEPTOR, 2_600_000);
    // The acceptor does not move: at exactly its deadline only the claim is possible.
    claim(&mut scenario, duel_id, CREATOR, 2_600_000);

    assert_timed_out(
        &mut scenario,
        duel_id,
        ACCEPTOR,
        CREATOR,
        CREATOR,
        2_000_000,
        18_000_000,
        0,
    );
    assert!(sum_coins(&scenario, ACCEPTOR) == 0);
    scenario.end();
}

// A surrender is made out of turn and before the deadline: the player that has just moved gives up and
// the rival, who has the turn, wins.
#[test]
fun test_surrender_out_of_turn_before_deadline_resolves() {
    let mut scenario = publish();
    set_fee_rate(&mut scenario, 250);
    let duel_id = active_duel(&mut scenario, TO_CREATOR);
    play_turn(&mut scenario, duel_id, CREATOR, 1_200_000);
    // to_move = acceptor, deadline_ms = 1_800_000: the creator surrenders at the last ms.
    at(&mut scenario, CREATOR, 1_799_999);

    collect_now(&mut scenario, duel_id, WINNER_ACCEPTOR);

    assert_resolved(&mut scenario, duel_id, ACCEPTOR, ACCEPTOR, 500_000, 19_500_000, 0);
    assert!(sum_coins(&scenario, CREATOR) == 0);
    scenario.end();
}

// ---------------------------------------------------------------------------------------------
// The three barriers of `claim_timeout` between `collect` and `pay`
// ---------------------------------------------------------------------------------------------

// (a) Inside one transaction the clock is one, so `collect` (before the deadline) and `claim_timeout` (from
// the deadline) cannot both pass: INV-D6. With `fee_rate = 0`, `collect` leaves the stake in `2 × bet`, so
// `EBrokenStake` would not stop a claim in between: only this barrier does (and H-14, V-15, off-chain).
#[test, expected_failure(abort_code = battleship::duel::ENotExpired)]
fun test_claim_timeout_between_collect_and_pay_aborts_not_expired() {
    let mut scenario = publish();
    let duel_id = active_duel(&mut scenario, TO_CREATOR);
    at(&mut scenario, CREATOR, 1_599_999);
    let mut duel = scenario.take_shared_by_id<Duel<TestGame>>(duel_id);
    let mut house = scenario.take_shared<House>();
    let c = duel::collect(TestGame {}, &mut duel, &mut house, scenario.ctx());
    assert!(duel.stake_value_for_testing() == 2 * BET);

    duel::claim_timeout(&mut duel, &mut house, scenario.ctx());

    duel::pay(TestGame {}, &mut duel, c, WINNER_CREATOR, scenario.ctx());
    test_scenario::return_shared(duel);
    test_scenario::return_shared(house);
    scenario.end();
}

// (b) `pay` with a `Collected` on a duel that is no longer `Active` aborts, so a transaction that changed
// the state in between reverts whole: here a `TimedOut` duel.
#[test, expected_failure(abort_code = battleship::duel::ENotActive)]
fun test_pay_rejects_timed_out_duel() {
    let mut scenario = publish();
    let duel_id = timed_out_duel(&mut scenario);
    scenario.next_tx(CREATOR);
    let mut duel = scenario.take_shared_by_id<Duel<TestGame>>(duel_id);
    // No function of the API produces a `Collected` for a `TimedOut` duel: forged for the test.
    let c = duel::new_collected_for_testing(duel_id, 2 * BET, 0);

    duel::pay(TestGame {}, &mut duel, c, WINNER_CREATOR, scenario.ctx());

    test_scenario::return_shared(duel);
    scenario.end();
}

#[test, expected_failure(abort_code = battleship::duel::ENotActive)]
fun test_pay_rejects_expired_duel() {
    let mut scenario = publish();
    let duel_id = expired_duel(&mut scenario);
    scenario.next_tx(CREATOR);
    let mut duel = scenario.take_shared_by_id<Duel<TestGame>>(duel_id);
    let c = duel::new_collected_for_testing(duel_id, 2 * BET, 0);

    duel::pay(TestGame {}, &mut duel, c, WINNER_CREATOR, scenario.ctx());

    test_scenario::return_shared(duel);
    scenario.end();
}

// ---------------------------------------------------------------------------------------------
// After a final state, every function of the clock aborts `ENotActive`
// ---------------------------------------------------------------------------------------------

#[test, expected_failure(abort_code = battleship::duel::ENotActive)]
fun test_claim_timeout_rejects_resolved_duel() {
    let mut scenario = publish();
    let duel_id = resolved_duel(&mut scenario);

    claim(&mut scenario, duel_id, ACCEPTOR, 2_000_000);

    scenario.end();
}

#[test, expected_failure(abort_code = battleship::duel::ENotActive)]
fun test_claim_timeout_rejects_timed_out_duel() {
    let mut scenario = publish();
    let duel_id = timed_out_duel(&mut scenario);

    claim(&mut scenario, duel_id, ACCEPTOR, 2_000_000);

    scenario.end();
}

#[test, expected_failure(abort_code = battleship::duel::ENotActive)]
fun test_claim_timeout_rejects_expired_duel() {
    let mut scenario = publish();
    let duel_id = expired_duel(&mut scenario);

    claim(&mut scenario, duel_id, ACCEPTOR, 2_000_000);

    scenario.end();
}

#[test, expected_failure(abort_code = battleship::duel::ENotActive)]
fun test_refund_stalled_rejects_resolved_duel() {
    let mut scenario = publish();
    let duel_id = resolved_duel(&mut scenario);

    refund(&mut scenario, duel_id, OTHER, 700_000_000);

    scenario.end();
}

#[test, expected_failure(abort_code = battleship::duel::ENotActive)]
fun test_refund_stalled_rejects_timed_out_duel() {
    let mut scenario = publish();
    let duel_id = timed_out_duel(&mut scenario);

    refund(&mut scenario, duel_id, OTHER, 700_000_000);

    scenario.end();
}

#[test, expected_failure(abort_code = battleship::duel::ENotActive)]
fun test_refund_stalled_rejects_expired_duel() {
    let mut scenario = publish();
    let duel_id = expired_duel(&mut scenario);

    refund(&mut scenario, duel_id, OTHER, 700_000_000);

    scenario.end();
}

#[test, expected_failure(abort_code = battleship::duel::ENotActive)]
fun test_record_move_rejects_resolved_duel() {
    let mut scenario = publish();
    let duel_id = resolved_duel(&mut scenario);

    play_turn(&mut scenario, duel_id, CREATOR, 1_300_000);

    scenario.end();
}

#[test, expected_failure(abort_code = battleship::duel::ENotActive)]
fun test_record_move_rejects_timed_out_duel() {
    let mut scenario = publish();
    let duel_id = timed_out_duel(&mut scenario);

    play_turn(&mut scenario, duel_id, CREATOR, 2_000_000);

    scenario.end();
}

#[test, expected_failure(abort_code = battleship::duel::ENotActive)]
fun test_record_move_rejects_expired_duel() {
    let mut scenario = publish();
    let duel_id = expired_duel(&mut scenario);

    play_turn(&mut scenario, duel_id, CREATOR, 2_000_000);

    scenario.end();
}

#[test, expected_failure(abort_code = battleship::duel::ENotActive)]
fun test_collect_rejects_timed_out_duel() {
    let mut scenario = publish();
    let duel_id = timed_out_duel(&mut scenario);

    collect(&mut scenario, duel_id, CREATOR, WINNER_CREATOR);

    scenario.end();
}

#[test, expected_failure(abort_code = battleship::duel::ENotActive)]
fun test_collect_rejects_expired_duel() {
    let mut scenario = publish();
    let duel_id = expired_duel(&mut scenario);

    collect(&mut scenario, duel_id, CREATOR, WINNER_CREATOR);

    scenario.end();
}
