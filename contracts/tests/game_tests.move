// Copyright (c) 2025-2026 sdelvalle57
// SPDX-License-Identifier: Apache-2.0

#[test_only]
module battleship::game_tests;

use battleship::game::{Self, Game, GameCreated, GameCancelled};
use battleship::house::{Self, House, HouseCap};
use sui::coin::{Self, Coin};
use sui::event;
use sui::sui::SUI;
use sui::test_scenario::{Self, Scenario};

const PUBLISHER: address = @0xA; // House and HouseCap
const CREATOR: address = @0xB;
const INVITEE: address = @0xC;
const OTHER: address = @0xD;

const MIN_BET: u64 = 1_000_000; // House default
const MAX_BET: u64 = 50_000_000_000; // House default
const BET: u64 = 10_000_000;
const NEWER_VERSION: u64 = 2;
const OLDER_VERSION: u64 = 0;

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
