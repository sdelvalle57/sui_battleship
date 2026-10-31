// Copyright (c) 2025-2026 sdelvalle57
// SPDX-License-Identifier: Apache-2.0

#[test_only]
module battleship::game_tests;

use battleship::game::{Self, Game, GameCreated, GameCancelled, GameResolved};
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
const ACCEPTOR: address = @0xE; // acceptor of open games
const SYSTEM: address = @0x0; // mandatory sender to create and update `Random`

const MIN_BET: u64 = 1_000_000; // House default
const MAX_BET: u64 = 50_000_000_000; // House default
const BET: u64 = 10_000_000;
const NEWER_VERSION: u64 = 2;
const OLDER_VERSION: u64 = 0;
const HUGE_BET: u64 = 9_000_000_000_000_000_000; // pot = 2 × HUGE_BET fits u64; pot × fee_rate does not

// Randomness round 0 of every scenario (32 fixed bytes).
const SEED: vector<u8> = x"1F1F1F1F1F1F1F1F1F1F1F1F1F1F1F1F1F1F1F1F1F1F1F1F1F1F1F1F1F1F1F1F";
// Test 37: one game per seed; game i is accepted after randomness round i + 1 (SEED is round 0).
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

// Creates a game as `creator` with a fresh coin of `bet` MIST, closes the transaction (next one as
// `creator`) and returns the ID of the new shared game.
fun create(scenario: &mut Scenario, creator: address, bet: u64, opponent: Option<address>): ID {
    scenario.next_tx(creator);
    let house = scenario.take_shared<House>();
    let stake = coin::mint_for_testing<SUI>(bet, scenario.ctx());
    game::create_game(&house, stake, opponent, scenario.ctx());
    test_scenario::return_shared(house);
    scenario.next_tx(creator);
    test_scenario::most_recent_id_shared<Game>().destroy_some()
}

// Calls `create_game` as CREATOR in a new transaction and ends the scenario; for the abort tests.
fun create_expecting_abort(mut scenario: Scenario, bet: u64, opponent: Option<address>) {
    scenario.next_tx(CREATOR);
    let house = scenario.take_shared<House>();
    let stake = coin::mint_for_testing<SUI>(bet, scenario.ctx());
    game::create_game(&house, stake, opponent, scenario.ctx());
    test_scenario::return_shared(house);
    scenario.end();
}

// Asserts that `account` holds exactly one `Coin<SUI>` and that its value is `amount`.
fun assert_single_coin(scenario: &Scenario, account: address, amount: u64) {
    assert!(test_scenario::ids_for_address<Coin<SUI>>(account).length() == 1);
    let coin = scenario.take_from_address<Coin<SUI>>(account);
    assert!(coin.value() == amount);
    test_scenario::return_to_address(account, coin);
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

// Shares a second House (with its own HouseCap for PUBLISHER) and returns its ID. Games created before
// keep pointing to the first one.
fun other_house(scenario: &mut Scenario): ID {
    scenario.next_tx(PUBLISHER);
    house::init_for_testing(scenario.ctx());
    scenario.next_tx(PUBLISHER);
    test_scenario::most_recent_id_shared<House>().destroy_some()
}

// Calls the real `accept_game` as `acceptor` against the House `house_id` with a fresh coin of `amount`
// MIST, in a new transaction that stays open (events are readable before the next `next_tx`).
fun accept_on_house(
    scenario: &mut Scenario,
    game_id: ID,
    house_id: ID,
    acceptor: address,
    amount: u64,
) {
    scenario.next_tx(acceptor);
    let mut game = scenario.take_shared_by_id<Game>(game_id);
    let mut house = scenario.take_shared_by_id<House>(house_id);
    let random = scenario.take_shared<Random>();
    let payment = coin::mint_for_testing<SUI>(amount, scenario.ctx());
    game::accept_game(&mut game, &mut house, payment, &random, scenario.ctx());
    test_scenario::return_shared(game);
    test_scenario::return_shared(house);
    test_scenario::return_shared(random);
}

// `accept_on_house` against the House of the game.
fun accept(scenario: &mut Scenario, game_id: ID, acceptor: address, amount: u64) {
    scenario.next_tx(acceptor);
    let game = scenario.take_shared_by_id<Game>(game_id);
    let house_id = game.house_id_for_testing();
    test_scenario::return_shared(game);
    accept_on_house(scenario, game_id, house_id, acceptor, amount);
}

// Like `accept` but through `accept_with_winner_for_testing`: no `Random`, `winner_index` 0 = creator,
// 1 = acceptor.
fun accept_forced(
    scenario: &mut Scenario,
    game_id: ID,
    acceptor: address,
    amount: u64,
    winner_index: u64,
) {
    scenario.next_tx(acceptor);
    let mut game = scenario.take_shared_by_id<Game>(game_id);
    let mut house = scenario.take_shared<House>();
    let payment = coin::mint_for_testing<SUI>(amount, scenario.ctx());
    game.accept_with_winner_for_testing(&mut house, payment, winner_index, scenario.ctx());
    test_scenario::return_shared(game);
    test_scenario::return_shared(house);
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

// Checks the settlement of a single game right after its acceptance, in the still-open accept transaction
// (SEG-4): `GameResolved`, one coin of `payout` for the winner and none for the loser, House fees up by
// `fee`, empty stake, `Resolved { acceptor, winner }` and `payout + fee == 2 × bet`.
fun assert_resolved(
    scenario: &mut Scenario,
    game_id: ID,
    acceptor: address,
    winner: address,
    fee: u64,
    payout: u64,
    fees_before: u64,
) {
    let resolved_events = event::events_by_type<GameResolved>();
    scenario.next_tx(winner);
    let game = scenario.take_shared_by_id<Game>(game_id);
    let creator = game.creator_for_testing();
    let pot = 2 * game.bet_for_testing();
    assert!(payout + fee == pot);
    let expected = game::new_game_resolved_for_testing(
        game_id,
        creator,
        acceptor,
        winner,
        pot,
        fee,
        payout,
    );
    assert!(resolved_events == vector[expected]);
    assert!(game.stake_value_for_testing() == 0);
    assert!(game.is_resolved_for_testing());
    assert!(!game.is_pending_for_testing());
    assert!(!game.is_cancelled_for_testing());
    assert!(game.acceptor_for_testing() == option::some(acceptor));
    assert!(game.winner_for_testing() == option::some(winner));
    test_scenario::return_shared(game);
    let house = scenario.take_shared<House>();
    assert!(house.fees_collected() == fees_before + fee);
    test_scenario::return_shared(house);
    let loser = if (winner == creator) acceptor else creator;
    assert_single_coin(scenario, winner, payout);
    assert!(!test_scenario::has_most_recent_for_address<Coin<SUI>>(loser));
}

#[test]
fun test_create_open_game_stores_fields_and_emits_event() {
    let mut scenario = publish();
    scenario.next_tx(CREATOR);
    let house = scenario.take_shared<House>();
    let house_id = object::id(&house);
    let house_version = house.version();
    let house_fee_rate = house.fee_rate();
    let stake = coin::mint_for_testing<SUI>(BET, scenario.ctx());

    game::create_game(&house, stake, option::none(), scenario.ctx());

    let created_events = event::events_by_type<GameCreated>();
    test_scenario::return_shared(house);
    let effects = scenario.next_tx(CREATOR);
    let game_id = test_scenario::most_recent_id_shared<Game>().destroy_some();
    assert!(test_scenario::shared(&effects).contains(&game_id));
    let expected = game::new_game_created_for_testing(
        game_id,
        CREATOR,
        option::none(),
        BET,
        house_fee_rate,
    );
    assert!(created_events == vector[expected]);

    let game = scenario.take_shared_by_id<Game>(game_id);
    assert!(game.creator_for_testing() == CREATOR);
    assert!(game.opponent_for_testing().is_none());
    assert!(game.bet_for_testing() == BET);
    assert!(game.stake_value_for_testing() == BET);
    assert!(game.fee_rate_for_testing() == house_fee_rate);
    assert!(game.house_id_for_testing() == house_id);
    assert!(game.version_for_testing() == house_version);
    assert!(game.is_pending_for_testing());
    assert!(!game.is_cancelled_for_testing());
    assert!(!test_scenario::has_most_recent_for_address<Coin<SUI>>(CREATOR));
    test_scenario::return_shared(game);
    scenario.end();
}

#[test]
fun test_create_invite_game_stores_opponent() {
    let mut scenario = publish();
    scenario.next_tx(CREATOR);
    let house = scenario.take_shared<House>();
    let house_fee_rate = house.fee_rate();
    let stake = coin::mint_for_testing<SUI>(BET, scenario.ctx());

    game::create_game(&house, stake, option::some(INVITEE), scenario.ctx());

    let created_events = event::events_by_type<GameCreated>();
    test_scenario::return_shared(house);
    scenario.next_tx(CREATOR);
    let game_id = test_scenario::most_recent_id_shared<Game>().destroy_some();
    let expected = game::new_game_created_for_testing(
        game_id,
        CREATOR,
        option::some(INVITEE),
        BET,
        house_fee_rate,
    );
    assert!(created_events == vector[expected]);

    let game = scenario.take_shared_by_id<Game>(game_id);
    assert!(game.opponent_for_testing() == option::some(INVITEE));
    assert!(game.stake_value_for_testing() == BET);
    assert!(game.is_pending_for_testing());
    test_scenario::return_shared(game);
    scenario.end();
}

#[test]
fun test_create_copies_fee_rate_at_creation() {
    let mut scenario = publish();
    let mut house = scenario.take_shared<House>();
    let cap = scenario.take_from_sender<HouseCap>();
    house::update_fee_rate(&mut house, &cap, 250);
    scenario.return_to_sender(cap);
    test_scenario::return_shared(house);

    let game_id = create(&mut scenario, CREATOR, BET, option::none());

    scenario.next_tx(PUBLISHER);
    let mut house = scenario.take_shared<House>();
    let cap = scenario.take_from_sender<HouseCap>();
    house::update_fee_rate(&mut house, &cap, 500);
    assert!(house.fee_rate() == 500);
    scenario.return_to_sender(cap);
    test_scenario::return_shared(house);

    scenario.next_tx(CREATOR);
    let game = scenario.take_shared_by_id<Game>(game_id);
    assert!(game.fee_rate_for_testing() == 250);
    test_scenario::return_shared(game);
    scenario.end();
}

#[test]
fun test_create_accepts_bet_equal_to_min_bet() {
    let mut scenario = publish();
    let game_id = create(&mut scenario, CREATOR, MIN_BET, option::none());

    let game = scenario.take_shared_by_id<Game>(game_id);
    assert!(game.bet_for_testing() == MIN_BET);
    assert!(game.stake_value_for_testing() == MIN_BET);
    assert!(game.is_pending_for_testing());
    test_scenario::return_shared(game);
    scenario.end();
}

#[test]
fun test_create_accepts_bet_equal_to_max_bet() {
    let mut scenario = publish();
    let game_id = create(&mut scenario, CREATOR, MAX_BET, option::none());

    let game = scenario.take_shared_by_id<Game>(game_id);
    assert!(game.bet_for_testing() == MAX_BET);
    assert!(game.stake_value_for_testing() == MAX_BET);
    assert!(game.is_pending_for_testing());
    test_scenario::return_shared(game);
    scenario.end();
}

#[test, expected_failure(abort_code = battleship::game::EBetTooLow)]
fun test_create_rejects_bet_below_min() {
    let scenario = publish();
    create_expecting_abort(scenario, MIN_BET - 1, option::none());
}

#[test, expected_failure(abort_code = battleship::game::EBetTooHigh)]
fun test_create_rejects_bet_above_max() {
    let scenario = publish();
    create_expecting_abort(scenario, MAX_BET + 1, option::none());
}

#[test, expected_failure(abort_code = battleship::game::ESelfInvite)]
fun test_create_rejects_self_invite() {
    let scenario = publish();
    create_expecting_abort(scenario, BET, option::some(CREATOR));
}

#[test, expected_failure(abort_code = battleship::house::EWrongVersion)]
fun test_create_rejects_house_with_wrong_version() {
    let scenario = publish();
    let mut house = scenario.take_shared<House>();
    house::set_version_for_testing(&mut house, NEWER_VERSION);
    test_scenario::return_shared(house);

    // Invalid bet too: the House version check must be reported first.
    create_expecting_abort(scenario, MIN_BET - 1, option::none());
}

#[test]
fun test_cancel_refunds_full_stake_and_emits_event() {
    let mut scenario = publish();
    let game_id = create(&mut scenario, CREATOR, BET, option::none());
    let house = scenario.take_shared<House>();
    let fees_before = house.fees_collected();
    assert!(fees_before == 0);
    let mut game = scenario.take_shared_by_id<Game>(game_id);

    game::cancel_game(&mut game, scenario.ctx());

    assert!(game.stake_value_for_testing() == 0);
    assert!(game.is_cancelled_for_testing());
    assert!(!game.is_pending_for_testing());
    assert!(game.bet_for_testing() == BET);
    assert!(house.fees_collected() == fees_before);
    let expected = game::new_game_cancelled_for_testing(game_id, CREATOR, CREATOR, BET);
    assert!(event::events_by_type<GameCancelled>() == vector[expected]);
    test_scenario::return_shared(game);
    test_scenario::return_shared(house);

    scenario.next_tx(CREATOR);
    assert_single_coin(&scenario, CREATOR, BET);
    scenario.end();
}

#[test]
fun test_cancel_invite_game_by_creator() {
    let mut scenario = publish();
    let game_id = create(&mut scenario, CREATOR, BET, option::some(INVITEE));
    let mut game = scenario.take_shared_by_id<Game>(game_id);

    game::cancel_game(&mut game, scenario.ctx());

    assert!(game.stake_value_for_testing() == 0);
    assert!(game.is_cancelled_for_testing());
    let expected = game::new_game_cancelled_for_testing(game_id, CREATOR, CREATOR, BET);
    assert!(event::events_by_type<GameCancelled>() == vector[expected]);
    test_scenario::return_shared(game);

    scenario.next_tx(CREATOR);
    assert_single_coin(&scenario, CREATOR, BET);
    assert!(!test_scenario::has_most_recent_for_address<Coin<SUI>>(INVITEE));
    scenario.end();
}

#[test, expected_failure(abort_code = battleship::game::ENotCreator)]
fun test_cancel_rejects_other_address() {
    let mut scenario = publish();
    let game_id = create(&mut scenario, CREATOR, BET, option::none());
    scenario.next_tx(OTHER);
    let mut game = scenario.take_shared_by_id<Game>(game_id);

    game::cancel_game(&mut game, scenario.ctx());

    test_scenario::return_shared(game);
    scenario.end();
}

#[test, expected_failure(abort_code = battleship::game::ENotCreator)]
fun test_cancel_rejects_invitee() {
    let mut scenario = publish();
    let game_id = create(&mut scenario, CREATOR, BET, option::some(INVITEE));
    scenario.next_tx(INVITEE);
    let mut game = scenario.take_shared_by_id<Game>(game_id);

    game::cancel_game(&mut game, scenario.ctx());

    test_scenario::return_shared(game);
    scenario.end();
}

#[test, expected_failure(abort_code = battleship::game::ENotPending)]
fun test_cancel_rejects_cancelled_game() {
    let mut scenario = publish();
    let game_id = create(&mut scenario, CREATOR, BET, option::none());
    let mut game = scenario.take_shared_by_id<Game>(game_id);
    game::cancel_game(&mut game, scenario.ctx());
    test_scenario::return_shared(game);

    scenario.next_tx(CREATOR);
    let mut game = scenario.take_shared_by_id<Game>(game_id);

    game::cancel_game(&mut game, scenario.ctx());

    test_scenario::return_shared(game);
    scenario.end();
}

#[test, expected_failure(abort_code = battleship::game::ENotPending)]
fun test_cancel_rejects_rejected_game() {
    let mut scenario = publish();
    let game_id = create(&mut scenario, CREATOR, BET, option::some(INVITEE));
    scenario.next_tx(INVITEE);
    let mut game = scenario.take_shared_by_id<Game>(game_id);
    game::reject_game(&mut game, scenario.ctx());
    test_scenario::return_shared(game);

    scenario.next_tx(CREATOR);
    let mut game = scenario.take_shared_by_id<Game>(game_id);

    game::cancel_game(&mut game, scenario.ctx());

    test_scenario::return_shared(game);
    scenario.end();
}

#[test]
fun test_reject_refunds_creator_and_emits_event() {
    let mut scenario = publish();
    let game_id = create(&mut scenario, CREATOR, BET, option::some(INVITEE));
    scenario.next_tx(INVITEE);
    let house = scenario.take_shared<House>();
    let fees_before = house.fees_collected();
    assert!(fees_before == 0);
    let mut game = scenario.take_shared_by_id<Game>(game_id);

    game::reject_game(&mut game, scenario.ctx());

    assert!(game.stake_value_for_testing() == 0);
    assert!(game.is_cancelled_for_testing());
    assert!(!game.is_pending_for_testing());
    assert!(house.fees_collected() == fees_before);
    let expected = game::new_game_cancelled_for_testing(game_id, CREATOR, INVITEE, BET);
    assert!(event::events_by_type<GameCancelled>() == vector[expected]);
    test_scenario::return_shared(game);
    test_scenario::return_shared(house);

    scenario.next_tx(CREATOR);
    assert_single_coin(&scenario, CREATOR, BET);
    assert!(!test_scenario::has_most_recent_for_address<Coin<SUI>>(INVITEE));
    scenario.end();
}

#[test, expected_failure(abort_code = battleship::game::ENotInvited)]
fun test_reject_rejects_other_address() {
    let mut scenario = publish();
    let game_id = create(&mut scenario, CREATOR, BET, option::some(INVITEE));
    scenario.next_tx(OTHER);
    let mut game = scenario.take_shared_by_id<Game>(game_id);

    game::reject_game(&mut game, scenario.ctx());

    test_scenario::return_shared(game);
    scenario.end();
}

#[test, expected_failure(abort_code = battleship::game::ENotInvited)]
fun test_reject_rejects_creator() {
    let mut scenario = publish();
    let game_id = create(&mut scenario, CREATOR, BET, option::some(INVITEE));
    let mut game = scenario.take_shared_by_id<Game>(game_id);

    game::reject_game(&mut game, scenario.ctx());

    test_scenario::return_shared(game);
    scenario.end();
}

#[test, expected_failure(abort_code = battleship::game::ENoInvitation)]
fun test_reject_rejects_open_game() {
    let mut scenario = publish();
    let game_id = create(&mut scenario, CREATOR, BET, option::none());
    scenario.next_tx(OTHER);
    let mut game = scenario.take_shared_by_id<Game>(game_id);

    game::reject_game(&mut game, scenario.ctx());

    test_scenario::return_shared(game);
    scenario.end();
}

#[test, expected_failure(abort_code = battleship::game::ENotPending)]
fun test_reject_rejects_cancelled_game() {
    let mut scenario = publish();
    let game_id = create(&mut scenario, CREATOR, BET, option::some(INVITEE));
    let mut game = scenario.take_shared_by_id<Game>(game_id);
    game::cancel_game(&mut game, scenario.ctx());
    test_scenario::return_shared(game);

    scenario.next_tx(INVITEE);
    let mut game = scenario.take_shared_by_id<Game>(game_id);

    game::reject_game(&mut game, scenario.ctx());

    test_scenario::return_shared(game);
    scenario.end();
}

#[test]
fun test_cancel_refunds_regardless_of_versions() {
    let mut scenario = publish();
    let game_id = create(&mut scenario, CREATOR, BET, option::none());
    let mut house = scenario.take_shared<House>();
    house::set_version_for_testing(&mut house, NEWER_VERSION);
    test_scenario::return_shared(house);
    let mut game = scenario.take_shared_by_id<Game>(game_id);
    game.set_version_for_testing(OLDER_VERSION);
    test_scenario::return_shared(game);

    // The House is version-mismatched, so only its unchecked `version()` is read here.
    scenario.next_tx(CREATOR);
    let house = scenario.take_shared<House>();
    assert!(house.version() == NEWER_VERSION);
    test_scenario::return_shared(house);
    let mut game = scenario.take_shared_by_id<Game>(game_id);
    assert!(game.version_for_testing() == OLDER_VERSION);

    game::cancel_game(&mut game, scenario.ctx());

    assert!(game.stake_value_for_testing() == 0);
    assert!(game.is_cancelled_for_testing());
    test_scenario::return_shared(game);

    scenario.next_tx(CREATOR);
    assert_single_coin(&scenario, CREATOR, BET);
    scenario.end();
}

#[test]
fun test_reject_refunds_regardless_of_versions() {
    let mut scenario = publish();
    let game_id = create(&mut scenario, CREATOR, BET, option::some(INVITEE));
    let mut house = scenario.take_shared<House>();
    house::set_version_for_testing(&mut house, NEWER_VERSION);
    test_scenario::return_shared(house);
    let mut game = scenario.take_shared_by_id<Game>(game_id);
    game.set_version_for_testing(OLDER_VERSION);
    test_scenario::return_shared(game);

    // The House is version-mismatched, so only its unchecked `version()` is read here.
    scenario.next_tx(INVITEE);
    let house = scenario.take_shared<House>();
    assert!(house.version() == NEWER_VERSION);
    test_scenario::return_shared(house);
    let mut game = scenario.take_shared_by_id<Game>(game_id);
    assert!(game.version_for_testing() == OLDER_VERSION);

    game::reject_game(&mut game, scenario.ctx());

    assert!(game.stake_value_for_testing() == 0);
    assert!(game.is_cancelled_for_testing());
    test_scenario::return_shared(game);

    scenario.next_tx(CREATOR);
    assert_single_coin(&scenario, CREATOR, BET);
    assert!(!test_scenario::has_most_recent_for_address<Coin<SUI>>(INVITEE));
    scenario.end();
}

#[test]
fun test_games_of_same_creator_are_independent() {
    let mut scenario = publish();
    let first_id = create(&mut scenario, CREATOR, BET, option::none());
    let second_id = create(&mut scenario, CREATOR, BET, option::some(INVITEE));
    assert!(first_id != second_id);
    let mut first = scenario.take_shared_by_id<Game>(first_id);

    game::cancel_game(&mut first, scenario.ctx());

    assert!(first.is_cancelled_for_testing());
    assert!(first.stake_value_for_testing() == 0);
    test_scenario::return_shared(first);

    scenario.next_tx(CREATOR);
    let second = scenario.take_shared_by_id<Game>(second_id);
    assert!(second.is_pending_for_testing());
    assert!(second.stake_value_for_testing() == BET);
    assert!(second.opponent_for_testing() == option::some(INVITEE));
    test_scenario::return_shared(second);
    assert_single_coin(&scenario, CREATOR, BET);
    scenario.end();
}

#[test, expected_failure(abort_code = battleship::game::ENotCreator)]
fun test_cancel_by_other_on_cancelled_game_reports_not_creator() {
    let mut scenario = publish();
    let game_id = create(&mut scenario, CREATOR, BET, option::none());
    let mut game = scenario.take_shared_by_id<Game>(game_id);
    game::cancel_game(&mut game, scenario.ctx());
    test_scenario::return_shared(game);

    scenario.next_tx(OTHER);
    let mut game = scenario.take_shared_by_id<Game>(game_id);

    game::cancel_game(&mut game, scenario.ctx());

    test_scenario::return_shared(game);
    scenario.end();
}

#[test, expected_failure(abort_code = battleship::game::EBetTooLow)]
fun test_create_reports_bet_error_before_self_invite() {
    let scenario = publish();
    create_expecting_abort(scenario, MIN_BET - 1, option::some(CREATOR));
}

#[test, expected_failure(abort_code = battleship::game::ENotInvited)]
fun test_reject_by_other_on_cancelled_invite_reports_not_invited() {
    let mut scenario = publish();
    let game_id = create(&mut scenario, CREATOR, BET, option::some(INVITEE));
    let mut game = scenario.take_shared_by_id<Game>(game_id);
    game::cancel_game(&mut game, scenario.ctx());
    test_scenario::return_shared(game);

    scenario.next_tx(OTHER);
    let mut game = scenario.take_shared_by_id<Game>(game_id);

    game::reject_game(&mut game, scenario.ctx());

    test_scenario::return_shared(game);
    scenario.end();
}

#[test]
fun test_accept_open_game_creator_wins_pays_payout_and_fee() {
    let mut scenario = publish();
    set_fee_rate(&mut scenario, 250);
    let game_id = create(&mut scenario, CREATOR, BET, option::none());
    let game = scenario.take_shared_by_id<Game>(game_id);
    assert!(!game.is_resolved_for_testing());
    assert!(game.acceptor_for_testing().is_none());
    assert!(game.winner_for_testing().is_none());
    test_scenario::return_shared(game);

    accept_forced(&mut scenario, game_id, ACCEPTOR, BET, 0);

    assert_resolved(&mut scenario, game_id, ACCEPTOR, CREATOR, 500_000, 19_500_000, 0);
    scenario.end();
}

#[test]
fun test_accept_open_game_acceptor_wins_pays_payout_and_fee() {
    let mut scenario = publish();
    set_fee_rate(&mut scenario, 250);
    let game_id = create(&mut scenario, CREATOR, BET, option::none());

    accept_forced(&mut scenario, game_id, ACCEPTOR, BET, 1);

    assert_resolved(&mut scenario, game_id, ACCEPTOR, ACCEPTOR, 500_000, 19_500_000, 0);
    scenario.end();
}

#[test]
fun test_accept_invite_by_invitee_resolves() {
    let mut scenario = publish();
    set_fee_rate(&mut scenario, 250);
    let game_id = create(&mut scenario, CREATOR, BET, option::some(INVITEE));

    accept_forced(&mut scenario, game_id, INVITEE, BET, 1);

    assert_resolved(&mut scenario, game_id, INVITEE, INVITEE, 500_000, 19_500_000, 0);
    scenario.end();
}

#[test]
fun test_accept_with_zero_fee_pays_whole_pot() {
    let mut scenario = publish();
    let game_id = create(&mut scenario, CREATOR, BET, option::none());
    let game = scenario.take_shared_by_id<Game>(game_id);
    assert!(game.fee_rate_for_testing() == 0);
    test_scenario::return_shared(game);

    accept_forced(&mut scenario, game_id, ACCEPTOR, BET, 1);

    assert_resolved(&mut scenario, game_id, ACCEPTOR, ACCEPTOR, 0, 2 * BET, 0);
    scenario.end();
}

#[test]
fun test_accept_with_max_fee_charges_ten_percent() {
    let mut scenario = publish();
    set_fee_rate(&mut scenario, 1000);
    let game_id = create(&mut scenario, CREATOR, BET, option::none());

    accept_forced(&mut scenario, game_id, ACCEPTOR, BET, 0);

    assert_resolved(&mut scenario, game_id, ACCEPTOR, CREATOR, 2 * BET / 10, 18_000_000, 0);
    scenario.end();
}

#[test]
fun test_accept_rounds_fee_down_on_indivisible_pot() {
    let mut scenario = publish();
    set_fee_rate(&mut scenario, 250);
    // pot = 2_000_002; 2_000_002 × 250 / 10_000 = 50_000.05 -> 50_000, the remainder goes to the winner.
    let game_id = create(&mut scenario, CREATOR, 1_000_001, option::none());

    accept_forced(&mut scenario, game_id, ACCEPTOR, 1_000_001, 1);

    assert_resolved(&mut scenario, game_id, ACCEPTOR, ACCEPTOR, 50_000, 1_950_002, 0);
    scenario.end();
}

#[test]
fun test_accept_max_bet_with_max_fee_does_not_overflow() {
    let mut scenario = publish();
    set_fee_rate(&mut scenario, 1000);
    let game_id = create(&mut scenario, CREATOR, MAX_BET, option::none());

    accept_forced(&mut scenario, game_id, ACCEPTOR, MAX_BET, 0);

    assert_resolved(&mut scenario, game_id, ACCEPTOR, CREATOR, 10_000_000_000, 90_000_000_000, 0);
    scenario.end();
}

#[test]
fun test_accept_uses_fee_rate_copied_at_creation() {
    let mut scenario = publish();
    set_fee_rate(&mut scenario, 250);
    let game_id = create(&mut scenario, CREATOR, BET, option::none());
    set_fee_rate(&mut scenario, 500);

    accept_forced(&mut scenario, game_id, ACCEPTOR, BET, 1);

    // 250 bps (copied at creation), not the House's current 500.
    assert_resolved(&mut scenario, game_id, ACCEPTOR, ACCEPTOR, 500_000, 19_500_000, 0);
    scenario.next_tx(PUBLISHER);
    let house = scenario.take_shared<House>();
    assert!(house.fee_rate() == 500);
    test_scenario::return_shared(house);
    scenario.end();
}

#[test]
fun test_fees_from_two_games_accumulate_and_withdraw_exactly() {
    let mut scenario = publish();
    set_fee_rate(&mut scenario, 250);
    let first_id = create(&mut scenario, CREATOR, BET, option::none());
    let second_id = create(&mut scenario, CREATOR, 1_000_001, option::none());

    accept_forced(&mut scenario, first_id, ACCEPTOR, BET, 0);
    accept_forced(&mut scenario, second_id, ACCEPTOR, 1_000_001, 1);

    scenario.next_tx(PUBLISHER);
    let total_fee = 500_000 + 50_000;
    let total_payout = 19_500_000 + 1_950_002;
    let creator_coins = sum_coins(&scenario, CREATOR);
    let acceptor_coins = sum_coins(&scenario, ACCEPTOR);
    assert!(creator_coins == 19_500_000);
    assert!(acceptor_coins == 1_950_002);
    assert!(creator_coins + acceptor_coins == total_payout);
    assert!(total_payout + total_fee == 2 * BET + 2 * 1_000_001);
    let first = scenario.take_shared_by_id<Game>(first_id);
    let second = scenario.take_shared_by_id<Game>(second_id);
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
fun test_accept_with_random_resolves_and_conserves_funds() {
    let mut scenario = publish();
    set_fee_rate(&mut scenario, 250);
    random_ready(&mut scenario);
    let game_id = create(&mut scenario, CREATOR, BET, option::none());

    accept(&mut scenario, game_id, ACCEPTOR, BET);

    let resolved_events = event::events_by_type<GameResolved>();
    assert!(resolved_events.length() == 1);
    scenario.next_tx(ACCEPTOR);
    let game = scenario.take_shared_by_id<Game>(game_id);
    let winner = game.winner_for_testing().destroy_some();
    assert!(winner == CREATOR || winner == ACCEPTOR);
    assert!(game.stake_value_for_testing() == 0);
    assert!(game.is_resolved_for_testing());
    assert!(game.acceptor_for_testing() == option::some(ACCEPTOR));
    test_scenario::return_shared(game);
    // Same settlement whoever won, checked against the drawn winner.
    let expected = game::new_game_resolved_for_testing(
        game_id,
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
    let seeds = RANDOM_SEEDS;
    assert!(seeds.length() == RANDOM_GAMES);
    let mut game_ids = vector[];
    let mut creator_wins = 0;
    let mut acceptor_wins = 0;
    RANDOM_GAMES.do!(|i| {
        let game_id = create(&mut scenario, CREATOR, BET, option::none());
        random_round(&mut scenario, i + 1, seeds[i]);
        accept(&mut scenario, game_id, ACCEPTOR, BET);
        scenario.next_tx(ACCEPTOR);
        let game = scenario.take_shared_by_id<Game>(game_id);
        assert!(game.stake_value_for_testing() == 0);
        assert!(game.is_resolved_for_testing());
        let winner = game.winner_for_testing().destroy_some();
        if (winner == CREATOR) creator_wins = creator_wins + 1
        else if (winner == ACCEPTOR) acceptor_wins = acceptor_wins + 1;
        test_scenario::return_shared(game);
        game_ids.push_back(game_id);
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
    game_ids.do!(|game_id| {
        let game = scenario.take_shared_by_id<Game>(game_id);
        assert!(game.stake_value_for_testing() == 0);
        test_scenario::return_shared(game);
    });
    scenario.end();
}

#[test, expected_failure(abort_code = battleship::game::ESelfPlay)]
fun test_accept_rejects_own_game() {
    let mut scenario = publish();
    random_ready(&mut scenario);
    let game_id = create(&mut scenario, CREATOR, BET, option::none());

    accept(&mut scenario, game_id, CREATOR, BET);

    scenario.end();
}

#[test, expected_failure(abort_code = battleship::game::ENotInvited)]
fun test_accept_rejects_non_invited() {
    let mut scenario = publish();
    random_ready(&mut scenario);
    let game_id = create(&mut scenario, CREATOR, BET, option::some(INVITEE));

    accept(&mut scenario, game_id, OTHER, BET);

    scenario.end();
}

#[test, expected_failure(abort_code = battleship::game::EWrongStake)]
fun test_accept_rejects_lower_stake() {
    let mut scenario = publish();
    random_ready(&mut scenario);
    let game_id = create(&mut scenario, CREATOR, BET, option::none());

    accept(&mut scenario, game_id, ACCEPTOR, BET - 1);

    scenario.end();
}

#[test, expected_failure(abort_code = battleship::game::EWrongStake)]
fun test_accept_rejects_higher_stake() {
    let mut scenario = publish();
    random_ready(&mut scenario);
    let game_id = create(&mut scenario, CREATOR, BET, option::none());

    accept(&mut scenario, game_id, ACCEPTOR, BET + 1);

    scenario.end();
}

#[test, expected_failure(abort_code = battleship::game::ENotPending)]
fun test_accept_rejects_cancelled_game() {
    let mut scenario = publish();
    random_ready(&mut scenario);
    let game_id = create(&mut scenario, CREATOR, BET, option::none());
    let mut game = scenario.take_shared_by_id<Game>(game_id);
    game::cancel_game(&mut game, scenario.ctx());
    test_scenario::return_shared(game);

    accept(&mut scenario, game_id, ACCEPTOR, BET);

    scenario.end();
}

#[test, expected_failure(abort_code = battleship::game::ENotPending)]
fun test_accept_rejects_resolved_game() {
    let mut scenario = publish();
    random_ready(&mut scenario);
    let game_id = create(&mut scenario, CREATOR, BET, option::none());
    accept(&mut scenario, game_id, ACCEPTOR, BET);

    accept(&mut scenario, game_id, OTHER, BET);

    scenario.end();
}

#[test, expected_failure(abort_code = battleship::game::EWrongHouse)]
fun test_accept_rejects_other_house() {
    let mut scenario = publish();
    random_ready(&mut scenario);
    let game_id = create(&mut scenario, CREATOR, BET, option::none());
    let second_house_id = other_house(&mut scenario);
    let game = scenario.take_shared_by_id<Game>(game_id);
    assert!(game.house_id_for_testing() != second_house_id);
    test_scenario::return_shared(game);

    accept_on_house(&mut scenario, game_id, second_house_id, ACCEPTOR, BET);

    scenario.end();
}

#[test, expected_failure(abort_code = battleship::game::EVersionMismatch)]
fun test_accept_rejects_game_of_older_version() {
    let mut scenario = publish();
    random_ready(&mut scenario);
    let game_id = create(&mut scenario, CREATOR, BET, option::none());
    let mut game = scenario.take_shared_by_id<Game>(game_id);
    game.set_version_for_testing(OLDER_VERSION);
    test_scenario::return_shared(game);

    accept(&mut scenario, game_id, ACCEPTOR, BET);

    scenario.end();
}

#[test, expected_failure(abort_code = battleship::game::EVersionMismatch)]
fun test_accept_rejects_house_of_newer_version() {
    let mut scenario = publish();
    random_ready(&mut scenario);
    let game_id = create(&mut scenario, CREATOR, BET, option::none());
    let mut house = scenario.take_shared<House>();
    house::set_version_for_testing(&mut house, NEWER_VERSION);
    test_scenario::return_shared(house);

    accept(&mut scenario, game_id, ACCEPTOR, BET);

    scenario.end();
}

#[test, expected_failure(abort_code = battleship::house::EWrongVersion)]
fun test_accept_from_old_package_aborts_in_fee_collection() {
    let mut scenario = publish();
    random_ready(&mut scenario);
    let game_id = create(&mut scenario, CREATOR, BET, option::none());
    // Game and House both written by a newer package: the game checks pass and the current (old) code
    // aborts in `add_fees` inside `collect_pot`, before the draw.
    let mut house = scenario.take_shared<House>();
    house::set_version_for_testing(&mut house, NEWER_VERSION);
    test_scenario::return_shared(house);
    let mut game = scenario.take_shared_by_id<Game>(game_id);
    game.set_version_for_testing(NEWER_VERSION);
    test_scenario::return_shared(game);

    accept(&mut scenario, game_id, ACCEPTOR, BET);

    scenario.end();
}

#[test, expected_failure(abort_code = battleship::game::ENotInvited)]
fun test_accept_by_other_on_cancelled_invite_reports_not_invited() {
    let mut scenario = publish();
    random_ready(&mut scenario);
    let game_id = create(&mut scenario, CREATOR, BET, option::some(INVITEE));
    let mut game = scenario.take_shared_by_id<Game>(game_id);
    game::cancel_game(&mut game, scenario.ctx());
    test_scenario::return_shared(game);

    accept(&mut scenario, game_id, OTHER, BET);

    scenario.end();
}

#[test, expected_failure(abort_code = battleship::game::ESelfPlay)]
fun test_accept_by_creator_on_cancelled_game_reports_self_play() {
    let mut scenario = publish();
    random_ready(&mut scenario);
    let game_id = create(&mut scenario, CREATOR, BET, option::none());
    let mut game = scenario.take_shared_by_id<Game>(game_id);
    game::cancel_game(&mut game, scenario.ctx());
    test_scenario::return_shared(game);

    accept(&mut scenario, game_id, CREATOR, BET);

    scenario.end();
}

#[test, expected_failure(abort_code = battleship::game::ESelfPlay)]
fun test_accept_by_creator_on_own_invite_reports_self_play() {
    let mut scenario = publish();
    random_ready(&mut scenario);
    let game_id = create(&mut scenario, CREATOR, BET, option::some(INVITEE));

    accept(&mut scenario, game_id, CREATOR, BET);

    scenario.end();
}

#[test, expected_failure(abort_code = battleship::game::EVersionMismatch)]
fun test_accept_reports_version_before_authz() {
    let mut scenario = publish();
    random_ready(&mut scenario);
    let game_id = create(&mut scenario, CREATOR, BET, option::some(INVITEE));
    let mut game = scenario.take_shared_by_id<Game>(game_id);
    game.set_version_for_testing(OLDER_VERSION);
    test_scenario::return_shared(game);

    accept(&mut scenario, game_id, OTHER, BET);

    scenario.end();
}

#[test, expected_failure(abort_code = battleship::game::EWrongHouse)]
fun test_accept_reports_house_before_authz() {
    let mut scenario = publish();
    random_ready(&mut scenario);
    let game_id = create(&mut scenario, CREATOR, BET, option::none());
    let second_house_id = other_house(&mut scenario);

    accept_on_house(&mut scenario, game_id, second_house_id, CREATOR, BET);

    scenario.end();
}

#[test, expected_failure(abort_code = battleship::game::EVersionMismatch)]
fun test_accept_reports_version_before_house() {
    let mut scenario = publish();
    random_ready(&mut scenario);
    let game_id = create(&mut scenario, CREATOR, BET, option::none());
    let second_house_id = other_house(&mut scenario);
    let mut second_house = scenario.take_shared_by_id<House>(second_house_id);
    house::set_version_for_testing(&mut second_house, NEWER_VERSION);
    test_scenario::return_shared(second_house);

    accept_on_house(&mut scenario, game_id, second_house_id, ACCEPTOR, BET);

    scenario.end();
}

#[test, expected_failure(abort_code = battleship::game::ENotPending)]
fun test_accept_reports_state_before_stake() {
    let mut scenario = publish();
    random_ready(&mut scenario);
    let game_id = create(&mut scenario, CREATOR, BET, option::none());
    let mut game = scenario.take_shared_by_id<Game>(game_id);
    game::cancel_game(&mut game, scenario.ctx());
    test_scenario::return_shared(game);

    accept(&mut scenario, game_id, ACCEPTOR, BET - 1);

    scenario.end();
}

#[test, expected_failure(abort_code = battleship::game::ENotPending)]
fun test_cancel_rejects_resolved_game() {
    let mut scenario = publish();
    let game_id = create(&mut scenario, CREATOR, BET, option::none());
    accept_forced(&mut scenario, game_id, ACCEPTOR, BET, 1);

    scenario.next_tx(CREATOR);
    let mut game = scenario.take_shared_by_id<Game>(game_id);

    game::cancel_game(&mut game, scenario.ctx());

    test_scenario::return_shared(game);
    scenario.end();
}

#[test, expected_failure(abort_code = battleship::game::ENotPending)]
fun test_reject_rejects_resolved_game() {
    let mut scenario = publish();
    let game_id = create(&mut scenario, CREATOR, BET, option::some(INVITEE));
    accept_forced(&mut scenario, game_id, INVITEE, BET, 0);

    scenario.next_tx(INVITEE);
    let mut game = scenario.take_shared_by_id<Game>(game_id);

    game::reject_game(&mut game, scenario.ctx());

    test_scenario::return_shared(game);
    scenario.end();
}

#[test]
fun test_accept_huge_pot_needs_u128_intermediate() {
    let mut scenario = publish();
    // Before creating: the fee rate is copied into the game at creation.
    set_bet_limits(&mut scenario, MIN_BET, HUGE_BET);
    set_fee_rate(&mut scenario, 1000);
    let game_id = create(&mut scenario, CREATOR, HUGE_BET, option::none());

    accept_forced(&mut scenario, game_id, ACCEPTOR, HUGE_BET, 1);

    // pot = 18_000_000_000_000_000_000: pot × 1000 overflows u64, so this only passes with the u128 path.
    assert_resolved(
        &mut scenario,
        game_id,
        ACCEPTOR,
        ACCEPTOR,
        1_800_000_000_000_000_000,
        16_200_000_000_000_000_000,
        0,
    );
    scenario.end();
}
