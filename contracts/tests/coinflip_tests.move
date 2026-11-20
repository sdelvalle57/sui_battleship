// Copyright (c) 2025-2026 sdelvalle57
// SPDX-License-Identifier: Apache-2.0

#[test_only]
module battleship::coinflip_tests;

use battleship::coinflip::{Self, Coinflip};
use battleship::duel::{Self, Duel, DuelCreated, DuelCancelled, DuelActivated, DuelResolved};
use battleship::game::{Self, Game};
use battleship::house::{Self, House, HouseCap};
use sui::coin::{Self, Coin};
use sui::event;
use sui::random::{Self, Random};
use sui::sui::SUI;
use sui::test_scenario::{Self, Scenario};

const PUBLISHER: address = @0xA; // House and HouseCap
const CREATOR: address = @0xB;
const INVITEE: address = @0xC;
const OTHER: address = @0xD;
const ACCEPTOR: address = @0xE; // acceptor of open duels
const SYSTEM: address = @0x0; // mandatory sender to create and update `Random`

const MIN_BET: u64 = 1_000_000; // House default
const MAX_BET: u64 = 50_000_000_000; // House default
const BET: u64 = 10_000_000;
const ODD_BET: u64 = 1_000_001; // odd pot: 2_000_002
const NEWER_VERSION: u64 = 2;
const OLDER_VERSION: u64 = 0;
const HUGE_BET: u64 = 9_000_000_000_000_000_000; // pot = 2 × HUGE_BET fits u64; pot × fee_rate does not

// Time control of a coinflip: 0 = no clock, `turn_ms` 0.
const CONTROL_NONE: u8 = 0;

// Index of the winner: 0 = creator, 1 = acceptor (the order of `pay`).
const WINNER_CREATOR: u8 = 0;
const WINNER_ACCEPTOR: u8 = 1;

// Randomness round 0 of every scenario (32 fixed bytes).
const SEED: vector<u8> = x"1F1F1F1F1F1F1F1F1F1F1F1F1F1F1F1F1F1F1F1F1F1F1F1F1F1F1F1F1F1F1F1F";
// One duel per seed; duel i is accepted after randomness round i + 1 (SEED is round 0).
const RANDOM_GAMES: u64 = 4;
const RANDOM_SEEDS: vector<vector<u8>> = vector[
    x"0101010101010101010101010101010101010101010101010101010101010101",
    x"0202020202020202020202020202020202020202020202020202020202020202",
    x"0303030303030303030303030303030303030303030303030303030303030303",
    x"0404040404040404040404040404040404040404040404040404040404040404",
];

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
    let mut duel = scenario.take_shared_by_id<Duel<Coinflip>>(duel_id);
    duel.set_version_for_testing(version);
    test_scenario::return_shared(duel);
}

// Creates a coinflip duel as `creator` with a fresh coin of `bet` MIST, closes the transaction (next one
// as `creator`) and returns the ID of the new shared duel.
fun create(scenario: &mut Scenario, creator: address, bet: u64, opponent: Option<address>): ID {
    scenario.next_tx(creator);
    let house = scenario.take_shared<House>();
    let stake = coin::mint_for_testing<SUI>(bet, scenario.ctx());
    coinflip::create(&house, stake, opponent, scenario.ctx());
    test_scenario::return_shared(house);
    scenario.next_tx(creator);
    test_scenario::most_recent_id_shared<Duel<Coinflip>>().destroy_some()
}

// Calls `coinflip::create` as CREATOR in a new transaction and ends the scenario; for the abort tests.
fun create_expecting_abort(mut scenario: Scenario, bet: u64, opponent: Option<address>) {
    scenario.next_tx(CREATOR);
    let house = scenario.take_shared<House>();
    let stake = coin::mint_for_testing<SUI>(bet, scenario.ctx());
    coinflip::create(&house, stake, opponent, scenario.ctx());
    test_scenario::return_shared(house);
    scenario.end();
}

// Creates the shared `Random` and sets randomness round 0 to SEED, as SYSTEM. Once per scenario.
fun random_ready(scenario: &mut Scenario) {
    scenario.next_tx(SYSTEM);
    random::create_for_testing(scenario.ctx());
    scenario.next_tx(SYSTEM);
    let mut r = scenario.take_shared<Random>();
    r.update_randomness_state_for_testing(0, SEED, scenario.ctx());
    test_scenario::return_shared(r);
}

// Sets randomness round `round` (>= 1, consecutive) to `bytes`, as SYSTEM.
fun random_round(scenario: &mut Scenario, round: u64, bytes: vector<u8>) {
    scenario.next_tx(SYSTEM);
    let mut r = scenario.take_shared<Random>();
    r.update_randomness_state_for_testing(round, bytes, scenario.ctx());
    test_scenario::return_shared(r);
}

// Shares a second House (with its own HouseCap for PUBLISHER) and returns its ID. Duels created before
// keep pointing to the first one.
fun other_house(scenario: &mut Scenario): ID {
    scenario.next_tx(PUBLISHER);
    house::init_for_testing(scenario.ctx());
    scenario.next_tx(PUBLISHER);
    test_scenario::most_recent_id_shared<House>().destroy_some()
}

// Calls the real `accept` as `acceptor` against the House `house_id` with a fresh coin of `amount` MIST,
// in a new transaction that stays open (events are readable before the next `next_tx`).
fun accept_on_house(
    scenario: &mut Scenario,
    duel_id: ID,
    house_id: ID,
    acceptor: address,
    amount: u64,
) {
    scenario.next_tx(acceptor);
    let mut duel = scenario.take_shared_by_id<Duel<Coinflip>>(duel_id);
    let mut house = scenario.take_shared_by_id<House>(house_id);
    let random = scenario.take_shared<Random>();
    let payment = coin::mint_for_testing<SUI>(amount, scenario.ctx());
    coinflip::accept(&mut duel, &mut house, payment, &random, scenario.ctx());
    test_scenario::return_shared(duel);
    test_scenario::return_shared(house);
    test_scenario::return_shared(random);
}

// `accept_on_house` against the House of the duel.
fun accept(scenario: &mut Scenario, duel_id: ID, acceptor: address, amount: u64) {
    scenario.next_tx(acceptor);
    let duel = scenario.take_shared_by_id<Duel<Coinflip>>(duel_id);
    let house_id = duel.house_id_for_testing();
    test_scenario::return_shared(duel);
    accept_on_house(scenario, duel_id, house_id, acceptor, amount);
}

// Like `accept` but through `accept_with_winner_for_testing`: no `Random`, `winner_index` 0 = creator,
// 1 = acceptor. The transaction stays open.
fun accept_forced(
    scenario: &mut Scenario,
    duel_id: ID,
    acceptor: address,
    amount: u64,
    winner_index: u8,
) {
    scenario.next_tx(acceptor);
    let mut duel = scenario.take_shared_by_id<Duel<Coinflip>>(duel_id);
    let mut house = scenario.take_shared<House>();
    let payment = coin::mint_for_testing<SUI>(amount, scenario.ctx());
    coinflip::accept_with_winner_for_testing(
        &mut duel,
        &mut house,
        payment,
        winner_index,
        scenario.ctx(),
    );
    test_scenario::return_shared(duel);
    test_scenario::return_shared(house);
}

// Cancels the duel as `sender` in a new transaction (the generic `entry` of `duel`).
fun cancel(scenario: &mut Scenario, duel_id: ID, sender: address) {
    scenario.next_tx(sender);
    let mut duel = scenario.take_shared_by_id<Duel<Coinflip>>(duel_id);
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

// Checks the settlement of a coinflip right after its acceptance, in the still-open accept transaction
// (SEG-4): `DuelResolved<Coinflip>`, one coin of `payout` for the winner (who must have no other coin) as
// the only transfer of the transaction (the loser gets nothing), House fees up by `fee`, empty stake,
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
    let resolved_events = event::events_by_type<DuelResolved<Coinflip>>();
    let effects = scenario.next_tx(winner);
    let transfers = test_scenario::transferred_to_account(&effects);
    assert!(transfers.length() == 1);
    let (_, recipient) = transfers.get_entry_by_idx(0);
    assert!(*recipient == winner);
    let duel = scenario.take_shared_by_id<Duel<Coinflip>>(duel_id);
    let creator = duel.creator_for_testing();
    let pot = 2 * duel.bet_for_testing();
    assert!(payout + fee == pot);
    let expected = duel::new_duel_resolved_for_testing<Coinflip>(
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
    let loser = if (winner == creator) acceptor else creator;
    assert_single_coin(scenario, winner, payout);
    assert!(!test_scenario::has_most_recent_for_address<Coin<SUI>>(loser));
}

// Plays RANDOM_GAMES real coinflips (one per seed, fee 250 bps already set by the caller), each created by
// CREATOR and accepted by ACCEPTOR with the real `accept`, and returns the winner of each, in order.
fun play_random_games(scenario: &mut Scenario): vector<address> {
    let seeds = RANDOM_SEEDS;
    assert!(seeds.length() == RANDOM_GAMES);
    let mut winners = vector[];
    RANDOM_GAMES.do!(|i| {
        let duel_id = create(scenario, CREATOR, BET, option::none());
        random_round(scenario, i + 1, seeds[i]);
        accept(scenario, duel_id, ACCEPTOR, BET);
        scenario.next_tx(ACCEPTOR);
        let duel = scenario.take_shared_by_id<Duel<Coinflip>>(duel_id);
        assert!(duel.stake_value_for_testing() == 0);
        assert!(duel.is_resolved_for_testing());
        winners.push_back(duel.winner_for_testing().destroy_some());
        test_scenario::return_shared(duel);
    });
    winners
}

// ---------------------------------------------------------------------------------------------
// create
// ---------------------------------------------------------------------------------------------

#[test]
fun test_create_makes_clockless_pending_duel_and_emits_event() {
    let mut scenario = publish();
    scenario.next_tx(CREATOR);
    let house = scenario.take_shared<House>();
    let house_id = object::id(&house);
    let house_version = house.version();
    let house_fee_rate = house.fee_rate();
    let stake = coin::mint_for_testing<SUI>(BET, scenario.ctx());

    coinflip::create(&house, stake, option::none(), scenario.ctx());

    let created_events = event::events_by_type<DuelCreated<Coinflip>>();
    test_scenario::return_shared(house);
    let effects = scenario.next_tx(CREATOR);
    let duel_id = test_scenario::most_recent_id_shared<Duel<Coinflip>>().destroy_some();
    assert!(test_scenario::shared(&effects).contains(&duel_id));
    // Control 0 (no clock): `control == 0` and `turn_ms == 0`.
    let expected = duel::new_duel_created_for_testing<Coinflip>(
        duel_id,
        CREATOR,
        option::none(),
        BET,
        house_fee_rate,
        CONTROL_NONE,
        0,
    );
    assert!(created_events == vector[expected]);

    let duel = scenario.take_shared_by_id<Duel<Coinflip>>(duel_id);
    assert!(duel.creator_for_testing() == CREATOR);
    assert!(duel.opponent_for_testing().is_none());
    assert!(duel.bet_for_testing() == BET);
    assert!(duel.stake_value_for_testing() == BET);
    assert!(duel.fee_rate_for_testing() == house_fee_rate);
    assert!(duel.turn_ms_for_testing() == 0);
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
fun test_create_invite_duel() {
    let mut scenario = publish();
    scenario.next_tx(CREATOR);
    let house = scenario.take_shared<House>();
    let house_fee_rate = house.fee_rate();
    let stake = coin::mint_for_testing<SUI>(BET, scenario.ctx());

    coinflip::create(&house, stake, option::some(INVITEE), scenario.ctx());

    let created_events = event::events_by_type<DuelCreated<Coinflip>>();
    test_scenario::return_shared(house);
    scenario.next_tx(CREATOR);
    let duel_id = test_scenario::most_recent_id_shared<Duel<Coinflip>>().destroy_some();
    let expected = duel::new_duel_created_for_testing<Coinflip>(
        duel_id,
        CREATOR,
        option::some(INVITEE),
        BET,
        house_fee_rate,
        CONTROL_NONE,
        0,
    );
    assert!(created_events == vector[expected]);

    let duel = scenario.take_shared_by_id<Duel<Coinflip>>(duel_id);
    assert!(duel.opponent_for_testing() == option::some(INVITEE));
    assert!(duel.stake_value_for_testing() == BET);
    assert!(duel.turn_ms_for_testing() == 0);
    assert!(duel.is_pending_for_testing());
    test_scenario::return_shared(duel);
    scenario.end();
}

#[test]
fun test_create_copies_fee_rate_at_creation() {
    let mut scenario = publish();
    set_fee_rate(&mut scenario, 250);
    let duel_id = create(&mut scenario, CREATOR, BET, option::none());
    set_fee_rate(&mut scenario, 500);

    scenario.next_tx(CREATOR);
    let duel = scenario.take_shared_by_id<Duel<Coinflip>>(duel_id);
    assert!(duel.fee_rate_for_testing() == 250);
    test_scenario::return_shared(duel);
    scenario.end();
}

#[test]
fun test_create_accepts_bet_equal_to_min_bet() {
    let mut scenario = publish();
    let duel_id = create(&mut scenario, CREATOR, MIN_BET, option::none());

    let duel = scenario.take_shared_by_id<Duel<Coinflip>>(duel_id);
    assert!(duel.bet_for_testing() == MIN_BET);
    assert!(duel.stake_value_for_testing() == MIN_BET);
    test_scenario::return_shared(duel);
    scenario.end();
}

#[test]
fun test_create_accepts_bet_equal_to_max_bet() {
    let mut scenario = publish();
    let duel_id = create(&mut scenario, CREATOR, MAX_BET, option::none());

    let duel = scenario.take_shared_by_id<Duel<Coinflip>>(duel_id);
    assert!(duel.bet_for_testing() == MAX_BET);
    assert!(duel.stake_value_for_testing() == MAX_BET);
    test_scenario::return_shared(duel);
    scenario.end();
}

#[test, expected_failure(abort_code = battleship::duel::EBetTooLow)]
fun test_create_rejects_bet_below_min() {
    let scenario = publish();
    create_expecting_abort(scenario, MIN_BET - 1, option::none());
}

#[test, expected_failure(abort_code = battleship::duel::EBetTooHigh)]
fun test_create_rejects_bet_above_max() {
    let scenario = publish();
    create_expecting_abort(scenario, MAX_BET + 1, option::none());
}

#[test, expected_failure(abort_code = battleship::duel::ESelfInvite)]
fun test_create_rejects_self_invite() {
    let scenario = publish();
    create_expecting_abort(scenario, BET, option::some(CREATOR));
}

#[test, expected_failure(abort_code = battleship::house::EWrongVersion)]
fun test_create_rejects_house_with_wrong_version() {
    let mut scenario = publish();
    set_house_version(&mut scenario, NEWER_VERSION);

    create_expecting_abort(scenario, BET, option::none());
}

// ---------------------------------------------------------------------------------------------
// accept: settlement (forced winner, no Random) and fees
// ---------------------------------------------------------------------------------------------

#[test]
fun test_accept_creator_wins_pays_payout_and_fee() {
    let mut scenario = publish();
    set_fee_rate(&mut scenario, 250);
    let duel_id = create(&mut scenario, CREATOR, BET, option::none());

    accept_forced(&mut scenario, duel_id, ACCEPTOR, BET, WINNER_CREATOR);

    assert_resolved(&mut scenario, duel_id, ACCEPTOR, CREATOR, 500_000, 19_500_000, 0);
    scenario.end();
}

#[test]
fun test_accept_acceptor_wins_pays_payout_and_fee() {
    let mut scenario = publish();
    set_fee_rate(&mut scenario, 250);
    let duel_id = create(&mut scenario, CREATOR, BET, option::none());

    accept_forced(&mut scenario, duel_id, ACCEPTOR, BET, WINNER_ACCEPTOR);

    assert_resolved(&mut scenario, duel_id, ACCEPTOR, ACCEPTOR, 500_000, 19_500_000, 0);
    scenario.end();
}

#[test]
fun test_accept_invite_by_invitee_resolves() {
    let mut scenario = publish();
    set_fee_rate(&mut scenario, 250);
    let duel_id = create(&mut scenario, CREATOR, BET, option::some(INVITEE));

    accept_forced(&mut scenario, duel_id, INVITEE, BET, WINNER_ACCEPTOR);

    assert_resolved(&mut scenario, duel_id, INVITEE, INVITEE, 500_000, 19_500_000, 0);
    scenario.end();
}

#[test]
fun test_accept_with_zero_fee_pays_whole_pot() {
    let mut scenario = publish();
    let duel_id = create(&mut scenario, CREATOR, BET, option::none());
    let duel = scenario.take_shared_by_id<Duel<Coinflip>>(duel_id);
    assert!(duel.fee_rate_for_testing() == 0);
    test_scenario::return_shared(duel);

    accept_forced(&mut scenario, duel_id, ACCEPTOR, BET, WINNER_ACCEPTOR);

    assert_resolved(&mut scenario, duel_id, ACCEPTOR, ACCEPTOR, 0, 2 * BET, 0);
    scenario.end();
}

#[test]
fun test_accept_with_max_fee_charges_ten_percent() {
    let mut scenario = publish();
    set_fee_rate(&mut scenario, 1000);
    let duel_id = create(&mut scenario, CREATOR, BET, option::none());

    accept_forced(&mut scenario, duel_id, ACCEPTOR, BET, WINNER_CREATOR);

    assert_resolved(&mut scenario, duel_id, ACCEPTOR, CREATOR, 2 * BET / 10, 18_000_000, 0);
    scenario.end();
}

#[test]
fun test_accept_rounds_fee_down_on_indivisible_pot() {
    let mut scenario = publish();
    set_fee_rate(&mut scenario, 250);
    // pot = 2_000_002; 2_000_002 × 250 / 10_000 = 50_000.05 -> 50_000, the remainder goes to the winner.
    let duel_id = create(&mut scenario, CREATOR, ODD_BET, option::none());

    accept_forced(&mut scenario, duel_id, ACCEPTOR, ODD_BET, WINNER_ACCEPTOR);

    assert_resolved(&mut scenario, duel_id, ACCEPTOR, ACCEPTOR, 50_000, 1_950_002, 0);
    scenario.end();
}

#[test]
fun test_accept_max_bet_with_max_fee_does_not_overflow() {
    let mut scenario = publish();
    set_fee_rate(&mut scenario, 1000);
    let duel_id = create(&mut scenario, CREATOR, MAX_BET, option::none());

    accept_forced(&mut scenario, duel_id, ACCEPTOR, MAX_BET, WINNER_CREATOR);

    assert_resolved(&mut scenario, duel_id, ACCEPTOR, CREATOR, 10_000_000_000, 90_000_000_000, 0);
    scenario.end();
}

#[test]
fun test_accept_huge_pot_needs_u128_intermediate() {
    let mut scenario = publish();
    // Before creating: the fee rate is copied into the duel at creation.
    set_bet_limits(&mut scenario, MIN_BET, HUGE_BET);
    set_fee_rate(&mut scenario, 1000);
    let duel_id = create(&mut scenario, CREATOR, HUGE_BET, option::none());

    accept_forced(&mut scenario, duel_id, ACCEPTOR, HUGE_BET, WINNER_ACCEPTOR);

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
fun test_accept_uses_fee_rate_copied_at_creation() {
    let mut scenario = publish();
    set_fee_rate(&mut scenario, 250);
    let duel_id = create(&mut scenario, CREATOR, BET, option::none());
    set_fee_rate(&mut scenario, 500);

    accept_forced(&mut scenario, duel_id, ACCEPTOR, BET, WINNER_ACCEPTOR);

    // 250 bps (copied at creation), not the House's current 500.
    assert_resolved(&mut scenario, duel_id, ACCEPTOR, ACCEPTOR, 500_000, 19_500_000, 0);
    scenario.next_tx(PUBLISHER);
    let house = scenario.take_shared<House>();
    assert!(house.fee_rate() == 500);
    test_scenario::return_shared(house);
    scenario.end();
}

#[test]
fun test_fees_from_two_coinflips_accumulate_and_withdraw_exactly() {
    let mut scenario = publish();
    set_fee_rate(&mut scenario, 250);
    let first_id = create(&mut scenario, CREATOR, BET, option::none());
    let second_id = create(&mut scenario, CREATOR, ODD_BET, option::none());

    accept_forced(&mut scenario, first_id, ACCEPTOR, BET, WINNER_CREATOR);
    accept_forced(&mut scenario, second_id, ACCEPTOR, ODD_BET, WINNER_ACCEPTOR);

    scenario.next_tx(PUBLISHER);
    let total_fee = 500_000 + 50_000;
    let creator_coins = sum_coins(&scenario, CREATOR);
    let acceptor_coins = sum_coins(&scenario, ACCEPTOR);
    assert!(creator_coins == 19_500_000);
    assert!(acceptor_coins == 1_950_002);
    assert!(creator_coins + acceptor_coins + total_fee == 2 * BET + 2 * ODD_BET);
    let first = scenario.take_shared_by_id<Duel<Coinflip>>(first_id);
    let second = scenario.take_shared_by_id<Duel<Coinflip>>(second_id);
    assert!(first.stake_value_for_testing() == 0);
    assert!(second.stake_value_for_testing() == 0);
    assert!(first.winner_for_testing() == option::some(CREATOR));
    assert!(second.winner_for_testing() == option::some(ACCEPTOR));
    test_scenario::return_shared(first);
    test_scenario::return_shared(second);
    let mut house = scenario.take_shared<House>();
    assert!(house.fees_collected() == total_fee);
    let cap = scenario.take_from_sender<HouseCap>();

    let fees = house::withdraw_fees(&mut house, &cap, scenario.ctx());

    assert!(fees.value() == total_fee);
    assert!(house.fees_collected() == 0);
    fees.burn_for_testing();
    scenario.return_to_sender(cap);
    test_scenario::return_shared(house);
    scenario.end();
}

#[test]
fun test_fees_from_coinflip_and_legacy_game_accumulate_in_same_house() {
    let mut scenario = publish();
    set_fee_rate(&mut scenario, 250);

    // The legacy `game::Game`, resolved first.
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

    // Then a coinflip on the same House: its fee adds to the one of the legacy game.
    let duel_id = create(&mut scenario, CREATOR, BET, option::none());
    accept_forced(&mut scenario, duel_id, ACCEPTOR, BET, WINNER_CREATOR);

    assert_resolved(&mut scenario, duel_id, ACCEPTOR, CREATOR, 500_000, 19_500_000, 500_000);
    assert!(fees_of_house(&mut scenario) == 1_000_000);
    scenario.end();
}

// ---------------------------------------------------------------------------------------------
// accept: the real draw (Random)
// ---------------------------------------------------------------------------------------------

#[test]
fun test_accept_with_random_resolves_and_conserves_funds() {
    let mut scenario = publish();
    set_fee_rate(&mut scenario, 250);
    random_ready(&mut scenario);
    let duel_id = create(&mut scenario, CREATOR, BET, option::none());

    accept(&mut scenario, duel_id, ACCEPTOR, BET);

    let resolved_events = event::events_by_type<DuelResolved<Coinflip>>();
    assert!(resolved_events.length() == 1);
    scenario.next_tx(ACCEPTOR);
    let duel = scenario.take_shared_by_id<Duel<Coinflip>>(duel_id);
    let winner = duel.winner_for_testing().destroy_some();
    assert!(winner == CREATOR || winner == ACCEPTOR);
    assert!(duel.stake_value_for_testing() == 0);
    assert!(duel.is_resolved_for_testing());
    assert!(duel.acceptor_for_testing() == option::some(ACCEPTOR));
    test_scenario::return_shared(duel);
    // Same settlement whoever won, checked against the drawn winner.
    let expected = duel::new_duel_resolved_for_testing<Coinflip>(
        duel_id,
        CREATOR,
        ACCEPTOR,
        winner,
        2 * BET,
        500_000,
        19_500_000,
    );
    assert!(resolved_events == vector[expected]);
    let house = scenario.take_shared<House>();
    assert!(house.fees_collected() == 500_000);
    test_scenario::return_shared(house);
    let loser = if (winner == CREATOR) ACCEPTOR else CREATOR;
    assert_single_coin(&scenario, winner, 19_500_000);
    assert!(!test_scenario::has_most_recent_for_address<Coin<SUI>>(loser));
    scenario.end();
}

#[test]
fun test_accept_with_random_reaches_both_outcomes() {
    let mut scenario = publish();
    set_fee_rate(&mut scenario, 250);
    random_ready(&mut scenario);

    let winners = play_random_games(&mut scenario);

    let mut creator_wins = 0;
    let mut acceptor_wins = 0;
    winners.do!(|winner| {
        if (winner == CREATOR) creator_wins = creator_wins + 1
        else if (winner == ACCEPTOR) acceptor_wins = acceptor_wins + 1;
    });
    assert!(creator_wins > 0);
    assert!(acceptor_wins > 0);
    assert!(creator_wins + acceptor_wins == RANDOM_GAMES);
    scenario.next_tx(PUBLISHER);
    let creator_coins = sum_coins(&scenario, CREATOR);
    let acceptor_coins = sum_coins(&scenario, ACCEPTOR);
    assert!(creator_coins == creator_wins * 19_500_000);
    assert!(acceptor_coins == acceptor_wins * 19_500_000);
    assert!(creator_coins + acceptor_coins == RANDOM_GAMES * 19_500_000);
    let house = scenario.take_shared<House>();
    assert!(house.fees_collected() == RANDOM_GAMES * 500_000);
    test_scenario::return_shared(house);
    scenario.end();
}

// Pins the winner of each seed: with the framework's generator and these seeds the result is fixed, so
// this fails if `accept` maps the draw to the players the other way round (index 0 = creator, 1 =
// acceptor) or stops drawing 0..=1. The pin depends on the generator of the framework AND on the
// sequence of transactions of this test (the generator also mixes the ID of the transaction and the
// counter of created IDs): if the framework changes or a transaction is added or reordered here,
// re-measure the pin and keep it as exact as now, never replace it with a weaker assertion.
#[test]
fun test_accept_with_random_maps_draw_to_the_players_per_seed() {
    let mut scenario = publish();
    set_fee_rate(&mut scenario, 250);
    random_ready(&mut scenario);

    let winners = play_random_games(&mut scenario);

    assert!(winners == vector[ACCEPTOR, ACCEPTOR, CREATOR, CREATOR]);
    scenario.end();
}

#[test]
fun test_accept_with_random_by_invitee_resolves() {
    let mut scenario = publish();
    set_fee_rate(&mut scenario, 250);
    random_ready(&mut scenario);
    let duel_id = create(&mut scenario, CREATOR, BET, option::some(INVITEE));

    accept(&mut scenario, duel_id, INVITEE, BET);

    let resolved_events = event::events_by_type<DuelResolved<Coinflip>>();
    assert!(resolved_events.length() == 1);
    scenario.next_tx(INVITEE);
    let duel = scenario.take_shared_by_id<Duel<Coinflip>>(duel_id);
    assert!(duel.is_resolved_for_testing());
    assert!(duel.acceptor_for_testing() == option::some(INVITEE));
    assert!(duel.stake_value_for_testing() == 0);
    test_scenario::return_shared(duel);
    scenario.end();
}

// INV-D5: no `entry` of the coinflip ends a transaction with a `Duel` in `Active`: the duel goes from
// `Pending` to `Resolved` in `accept`, and `to_move` / `deadline_ms` only existed inside the transaction
// (`DuelActivated` shows `to_move = 0` and `deadline_ms = 0`).
#[test]
fun test_accept_never_leaves_duel_active() {
    let mut scenario = publish();
    set_fee_rate(&mut scenario, 250);
    random_ready(&mut scenario);
    let drawn_id = create(&mut scenario, CREATOR, BET, option::none());
    let creator_wins_id = create(&mut scenario, CREATOR, BET, option::none());
    let acceptor_wins_id = create(&mut scenario, CREATOR, BET, option::none());

    accept(&mut scenario, drawn_id, ACCEPTOR, BET);
    let activated = event::events_by_type<DuelActivated<Coinflip>>();
    let expected = duel::new_duel_activated_for_testing<Coinflip>(
        drawn_id,
        CREATOR,
        ACCEPTOR,
        BET,
        0,
        0,
        0,
    );
    assert!(activated == vector[expected]);
    accept_forced(&mut scenario, creator_wins_id, ACCEPTOR, BET, WINNER_CREATOR);
    accept_forced(&mut scenario, acceptor_wins_id, ACCEPTOR, BET, WINNER_ACCEPTOR);

    scenario.next_tx(OTHER);
    vector[drawn_id, creator_wins_id, acceptor_wins_id].do!(|duel_id| {
        let duel = scenario.take_shared_by_id<Duel<Coinflip>>(duel_id);
        assert!(!duel.is_active_for_testing());
        assert!(!duel.is_pending_for_testing());
        assert!(duel.is_resolved_for_testing());
        assert!(duel.stake_value_for_testing() == 0);
        assert!(duel.to_move_for_testing().is_none());
        assert!(duel.deadline_ms_for_testing().is_none());
        assert!(duel.turn_ms_for_testing() == 0);
        test_scenario::return_shared(duel);
    });
    scenario.end();
}

// ---------------------------------------------------------------------------------------------
// accept: aborts, in the order of `activate_atomic`
// ---------------------------------------------------------------------------------------------

#[test, expected_failure(abort_code = battleship::duel::ESelfPlay)]
fun test_accept_rejects_own_duel() {
    let mut scenario = publish();
    random_ready(&mut scenario);
    let duel_id = create(&mut scenario, CREATOR, BET, option::none());

    accept(&mut scenario, duel_id, CREATOR, BET);

    scenario.end();
}

#[test, expected_failure(abort_code = battleship::duel::ENotInvited)]
fun test_accept_rejects_non_invited() {
    let mut scenario = publish();
    random_ready(&mut scenario);
    let duel_id = create(&mut scenario, CREATOR, BET, option::some(INVITEE));

    accept(&mut scenario, duel_id, OTHER, BET);

    scenario.end();
}

#[test, expected_failure(abort_code = battleship::duel::EWrongStake)]
fun test_accept_rejects_lower_stake() {
    let mut scenario = publish();
    random_ready(&mut scenario);
    let duel_id = create(&mut scenario, CREATOR, BET, option::none());

    accept(&mut scenario, duel_id, ACCEPTOR, BET - 1);

    scenario.end();
}

#[test, expected_failure(abort_code = battleship::duel::EWrongStake)]
fun test_accept_rejects_higher_stake() {
    let mut scenario = publish();
    random_ready(&mut scenario);
    let duel_id = create(&mut scenario, CREATOR, BET, option::none());

    accept(&mut scenario, duel_id, ACCEPTOR, BET + 1);

    scenario.end();
}

#[test, expected_failure(abort_code = battleship::duel::ENotPending)]
fun test_accept_rejects_cancelled_duel() {
    let mut scenario = publish();
    random_ready(&mut scenario);
    let duel_id = create(&mut scenario, CREATOR, BET, option::none());
    cancel(&mut scenario, duel_id, CREATOR);

    accept(&mut scenario, duel_id, ACCEPTOR, BET);

    scenario.end();
}

#[test, expected_failure(abort_code = battleship::duel::ENotPending)]
fun test_accept_rejects_resolved_duel() {
    let mut scenario = publish();
    random_ready(&mut scenario);
    let duel_id = create(&mut scenario, CREATOR, BET, option::none());
    accept(&mut scenario, duel_id, ACCEPTOR, BET);

    accept(&mut scenario, duel_id, OTHER, BET);

    scenario.end();
}

#[test, expected_failure(abort_code = battleship::duel::EWrongHouse)]
fun test_accept_rejects_other_house() {
    let mut scenario = publish();
    random_ready(&mut scenario);
    let duel_id = create(&mut scenario, CREATOR, BET, option::none());
    let second_house_id = other_house(&mut scenario);
    let duel = scenario.take_shared_by_id<Duel<Coinflip>>(duel_id);
    assert!(duel.house_id_for_testing() != second_house_id);
    test_scenario::return_shared(duel);

    accept_on_house(&mut scenario, duel_id, second_house_id, ACCEPTOR, BET);

    scenario.end();
}

#[test, expected_failure(abort_code = battleship::duel::EVersionMismatch)]
fun test_accept_rejects_duel_of_older_version() {
    let mut scenario = publish();
    random_ready(&mut scenario);
    let duel_id = create(&mut scenario, CREATOR, BET, option::none());
    set_duel_version(&mut scenario, duel_id, OLDER_VERSION);

    accept(&mut scenario, duel_id, ACCEPTOR, BET);

    scenario.end();
}

// The House is written by a newer package: the version-checked read of `activate_atomic` aborts with
// `house::EWrongVersion` before the fee is taken, before the draw and before any SUI moves.
#[test, expected_failure(abort_code = battleship::house::EWrongVersion)]
fun test_accept_from_other_house_version_aborts_before_the_draw() {
    let mut scenario = publish();
    random_ready(&mut scenario);
    let duel_id = create(&mut scenario, CREATOR, BET, option::none());
    set_house_version(&mut scenario, NEWER_VERSION);

    accept(&mut scenario, duel_id, ACCEPTOR, BET);

    scenario.end();
}

// Duel and House both written by a newer package: the checks of the duel pass and the current (old) code
// still aborts on the House version, never after the outcome is known.
#[test, expected_failure(abort_code = battleship::house::EWrongVersion)]
fun test_accept_from_old_package_aborts_before_the_draw() {
    let mut scenario = publish();
    random_ready(&mut scenario);
    let duel_id = create(&mut scenario, CREATOR, BET, option::none());
    set_house_version(&mut scenario, NEWER_VERSION);
    set_duel_version(&mut scenario, duel_id, NEWER_VERSION);

    accept(&mut scenario, duel_id, ACCEPTOR, BET);

    scenario.end();
}

#[test, expected_failure(abort_code = battleship::house::EWrongVersion)]
fun test_accept_reports_house_version_before_house_and_authz() {
    let mut scenario = publish();
    random_ready(&mut scenario);
    let duel_id = create(&mut scenario, CREATOR, BET, option::none());
    let second_house_id = other_house(&mut scenario);
    scenario.next_tx(PUBLISHER);
    let mut second_house = scenario.take_shared_by_id<House>(second_house_id);
    house::set_version_for_testing(&mut second_house, NEWER_VERSION);
    test_scenario::return_shared(second_house);

    // Wrong House (newer version) and the creator accepting its own duel: the version is reported first.
    accept_on_house(&mut scenario, duel_id, second_house_id, CREATOR, BET);

    scenario.end();
}

#[test, expected_failure(abort_code = battleship::duel::EWrongHouse)]
fun test_accept_reports_house_before_authz() {
    let mut scenario = publish();
    random_ready(&mut scenario);
    let duel_id = create(&mut scenario, CREATOR, BET, option::none());
    let second_house_id = other_house(&mut scenario);

    accept_on_house(&mut scenario, duel_id, second_house_id, CREATOR, BET);

    scenario.end();
}

#[test, expected_failure(abort_code = battleship::duel::ENotPending)]
fun test_accept_reports_state_before_stake() {
    let mut scenario = publish();
    random_ready(&mut scenario);
    let duel_id = create(&mut scenario, CREATOR, BET, option::none());
    cancel(&mut scenario, duel_id, CREATOR);

    accept(&mut scenario, duel_id, ACCEPTOR, BET - 1);

    scenario.end();
}

// ---------------------------------------------------------------------------------------------
// cancel and reject: the generic `entry` functions of `duel` on a `Duel<Coinflip>`
// ---------------------------------------------------------------------------------------------

#[test]
fun test_cancel_and_reject_work_on_coinflip_duels() {
    let mut scenario = publish();
    let cancelled_id = create(&mut scenario, CREATOR, BET, option::none());
    let rejected_id = create(&mut scenario, CREATOR, 2 * BET, option::some(INVITEE));
    let fees_before = fees_of_house(&mut scenario);

    scenario.next_tx(CREATOR);
    let mut cancelled = scenario.take_shared_by_id<Duel<Coinflip>>(cancelled_id);
    duel::cancel(&mut cancelled, scenario.ctx());
    let cancel_events = event::events_by_type<DuelCancelled<Coinflip>>();
    assert!(cancelled.is_cancelled_for_testing());
    assert!(cancelled.stake_value_for_testing() == 0);
    let expected_cancel = duel::new_duel_cancelled_for_testing<Coinflip>(
        cancelled_id,
        CREATOR,
        CREATOR,
        BET,
    );
    assert!(cancel_events == vector[expected_cancel]);
    test_scenario::return_shared(cancelled);

    scenario.next_tx(INVITEE);
    let mut rejected = scenario.take_shared_by_id<Duel<Coinflip>>(rejected_id);
    duel::reject(&mut rejected, scenario.ctx());
    let reject_events = event::events_by_type<DuelCancelled<Coinflip>>();
    assert!(rejected.is_cancelled_for_testing());
    assert!(rejected.stake_value_for_testing() == 0);
    let expected_reject = duel::new_duel_cancelled_for_testing<Coinflip>(
        rejected_id,
        CREATOR,
        INVITEE,
        2 * BET,
    );
    assert!(reject_events == vector[expected_reject]);
    test_scenario::return_shared(rejected);

    // Both refunds go to the creator, whole and without fee; the invitee gets nothing.
    scenario.next_tx(OTHER);
    assert!(sum_coins(&scenario, CREATOR) == 3 * BET);
    assert!(!test_scenario::has_most_recent_for_address<Coin<SUI>>(INVITEE));
    assert!(fees_of_house(&mut scenario) == fees_before);
    scenario.end();
}

// INV-D2 on a coinflip: a refund takes no House and reads no version, so a House and a duel written by
// another version do not block it.
#[test]
fun test_cancel_and_reject_refund_coinflips_regardless_of_versions() {
    let mut scenario = publish();
    let cancelled_id = create(&mut scenario, CREATOR, BET, option::none());
    let rejected_id = create(&mut scenario, CREATOR, BET, option::some(INVITEE));
    set_house_version(&mut scenario, NEWER_VERSION);
    set_duel_version(&mut scenario, cancelled_id, OLDER_VERSION);
    set_duel_version(&mut scenario, rejected_id, OLDER_VERSION);

    cancel(&mut scenario, cancelled_id, CREATOR);
    scenario.next_tx(INVITEE);
    let mut rejected = scenario.take_shared_by_id<Duel<Coinflip>>(rejected_id);
    duel::reject(&mut rejected, scenario.ctx());
    test_scenario::return_shared(rejected);

    scenario.next_tx(OTHER);
    assert!(sum_coins(&scenario, CREATOR) == 2 * BET);
    scenario.end();
}
