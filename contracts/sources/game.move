// Copyright (c) 2025-2026 sdelvalle57
// SPDX-License-Identifier: Apache-2.0

/// Games of SUI Battleship: one shared object per game holding the creator's stake until the game is
/// cancelled, rejected or resolved.
module battleship::game;

use battleship::house::House;
use sui::balance::Balance;
use sui::coin::{Self, Coin};
use sui::event;
use sui::random::Random;
use sui::sui::SUI;

// Abort codes: stable numbers, never reused for another condition.
const EBetTooLow: u64 = 0; // stake value < house.min_bet()
const EBetTooHigh: u64 = 1; // stake value > house.max_bet()
const ESelfInvite: u64 = 2; // opponent == some(sender)
const ENotCreator: u64 = 3; // sender != game.creator
const ENotPending: u64 = 4; // game state != Pending
const ENotInvited: u64 = 5; // game.opponent == some(a) && sender != a
const ENoInvitation: u64 = 6; // reject on an open game (opponent == none)
const EVersionMismatch: u64 = 7; // game.version != house.version()
const EWrongHouse: u64 = 8; // object::id(house) != game.house_id
const ESelfPlay: u64 = 9; // sender == game.creator
const EWrongStake: u64 = 10; // payment value != game.bet

const BPS_DENOMINATOR: u128 = 10_000; // basis points per unit

/// One shared game. No `store`: only this module can share it; nobody can transfer, wrap or freeze it.
public struct Game has key {
    id: UID,
    /// Package version that created the game (`house.version()` at creation). Never read by refund paths.
    version: u64,
    /// House the game settles against; `accept_game` requires this one (`EWrongHouse`).
    house_id: ID,
    creator: address,
    /// `none` = open game; `some(a)` = direct invitation to `a`.
    opponent: Option<address>,
    /// Bet in MIST; constant for the whole life of the object.
    bet: u64,
    /// Equals `bet` while `Pending`; 0 once `Cancelled` or `Resolved` (PROY-8).
    stake: Balance<SUI>,
    /// Fee in basis points copied from the House at creation (D-20261030-06 §3).
    fee_rate: u16,
    state: GameState,
}

/// Lifecycle (D-20261030-06 §1): Pending -> Cancelled (cancel/reject) | Resolved (accept, atomic with the coinflip).
public enum GameState has copy, drop, store {
    Pending,
    Cancelled,
    Resolved { acceptor: address, winner: address },
}

/// Emitted by `create_game`.
public struct GameCreated has copy, drop {
    game_id: ID,
    creator: address,
    opponent: Option<address>,
    bet: u64,
    fee_rate: u16,
}

/// Emitted by `cancel_game` (`cancelled_by` = creator) and `reject_game` (`cancelled_by` = invitee).
public struct GameCancelled has copy, drop {
    game_id: ID,
    creator: address,
    cancelled_by: address,
    refund: u64,
}

/// Emitted by `accept_game`: the game was accepted and resolved in the same transaction
/// (`pot == payout + fee`).
public struct GameResolved has copy, drop {
    game_id: ID,
    creator: address,
    acceptor: address,
    winner: address,
    pot: u64,
    fee: u64,
    payout: u64,
}

/// Creates a game with the whole `stake` as the bet (open if `opponent` is none, or an invitation).
/// The bet must be within the House limits; the House fee rate is copied into the game.
/// Emits `GameCreated`.
entry fun create_game(
    house: &House,
    stake: Coin<SUI>,
    opponent: Option<address>,
    ctx: &mut TxContext,
) {
    // Version-checked House reads go first (D-20261030-12 §2): an old package aborts here after `migrate`.
    let min_bet = house.min_bet();
    let max_bet = house.max_bet();
    let fee_rate = house.fee_rate();
    let bet = stake.value();
    assert!(bet >= min_bet, EBetTooLow);
    assert!(bet <= max_bet, EBetTooHigh);
    let creator = ctx.sender();
    assert!(opponent != option::some(creator), ESelfInvite);
    let game = Game {
        id: object::new(ctx),
        // Equals house::VERSION here: the reads above already checked it (single source of truth).
        version: house.version(),
        house_id: object::id(house),
        creator,
        opponent,
        bet,
        stake: stake.into_balance(),
        fee_rate,
        state: GameState::Pending,
    };
    event::emit(GameCreated { game_id: object::id(&game), creator, opponent, bet, fee_rate });
    transfer::share_object(game);
}

/// Cancels a pending game and refunds the whole stake to the creator, without fee. Only the creator.
/// Emits `GameCancelled`.
entry fun cancel_game(game: &mut Game, ctx: &mut TxContext) {
    let sender = ctx.sender();
    // AuthZ before state: a third party never learns the game state (deny by default).
    assert!(sender == game.creator, ENotCreator);
    assert!(game.is_pending(), ENotPending);
    game.refund_creator(sender, ctx);
}

/// Rejects a pending invitation and refunds the whole stake to the creator, without fee. Only the invitee.
/// Emits `GameCancelled`.
entry fun reject_game(game: &mut Game, ctx: &mut TxContext) {
    assert!(game.opponent.is_some(), ENoInvitation);
    let sender = ctx.sender();
    assert!(*game.opponent.borrow() == sender, ENotInvited);
    assert!(game.is_pending(), ENotPending);
    game.refund_creator(sender, ctx);
}

/// Accepts a pending game matching its bet exactly and resolves it with a coinflip in the same transaction:
/// the fee goes to the House and the winner gets the pot minus the fee. Anyone but the creator; for an
/// invitation, only the invitee. Emits `GameResolved`.
entry fun accept_game(
    game: &mut Game,
    house: &mut House,
    payment: Coin<SUI>,
    r: &Random,
    ctx: &mut TxContext,
) {
    let acceptor = ctx.sender();
    game.assert_acceptable(house, &payment, acceptor);
    // Everything that can abort regardless of the outcome (checks and the fee, which does not depend on it)
    // runs before the draw. Non-public `entry` + generator created here (SEG-5): no other module can call
    // this and abort on a loss. After the draw nothing that depends on the outcome can abort; the global
    // transaction limits and gas affect both outcomes alike.
    let (payout, pot, fee) = game.collect_pot(house, payment);
    let mut generator = r.new_generator(ctx);
    let winner_index = generator.generate_u8_in_range(0, 1);
    game.pay_winner(payout, pot, fee, acceptor, winner_index as u64, ctx);
}

// Refunds the whole stake to the creator, without fee. Takes no House and checks no version on purpose:
// a refund path can never be blocked by an upgrade (D-20261030-12 §4).
fun refund_creator(game: &mut Game, cancelled_by: address, ctx: &mut TxContext) {
    let refund = game.stake.withdraw_all();
    game.state = GameState::Cancelled;
    event::emit(GameCancelled {
        game_id: object::id(game),
        creator: game.creator,
        cancelled_by,
        refund: refund.value(),
    });
    transfer::public_transfer(coin::from_balance(refund, ctx), game.creator);
}

// Used by cancel_game, reject_game and accept_game.
fun is_pending(game: &Game): bool {
    match (&game.state) {
        GameState::Pending => true,
        _ => false,
    }
}

// All accept checks, in contract order (README), before any randomness is drawn.
fun assert_acceptable(game: &Game, house: &House, payment: &Coin<SUI>, acceptor: address) {
    assert!(game.version == house.version(), EVersionMismatch);
    assert!(object::id(house) == game.house_id, EWrongHouse);
    // AuthZ before state: an unauthorized caller never learns the game state (deny by default).
    assert!(acceptor != game.creator, ESelfPlay);
    assert!(game.opponent.is_none() || *game.opponent.borrow() == acceptor, ENotInvited);
    assert!(game.is_pending(), ENotPending);
    assert!(payment.value() == game.bet, EWrongStake);
}

// Joins both stakes and sends the fee to the House; returns (payout balance, pot, fee). Runs before the draw:
// `add_fees` is always called, even with a zero fee, and its House version check (house::EWrongVersion,
// D-20261030-12 §2) aborts here, never after the outcome is known.
fun collect_pot(game: &mut Game, house: &mut House, payment: Coin<SUI>): (Balance<SUI>, u64, u64) {
    let mut pot = game.stake.withdraw_all();
    pot.join(payment.into_balance());
    let pot_value = pot.value();
    let fee = pot.split(fee_amount(pot_value, game.fee_rate));
    let fee_value = fee.value();
    house.add_fees(fee);
    (pot, pot_value, fee_value)
}

// Pays the winner. Branch-free on the outcome (SEG-5, D-20261030-16 D6): `winner_index` (0 or 1) only selects
// an address; both outcomes run the same state change, event and transfer, and nothing that depends on the
// outcome can abort here (transaction limits and gas weigh the same on both paths).
fun pay_winner(
    game: &mut Game,
    payout: Balance<SUI>,
    pot: u64,
    fee: u64,
    acceptor: address,
    winner_index: u64,
    ctx: &mut TxContext,
) {
    let players = vector[game.creator, acceptor];
    let winner = *players.borrow(winner_index);
    game.state = GameState::Resolved { acceptor, winner };
    event::emit(GameResolved {
        game_id: object::id(game),
        creator: game.creator,
        acceptor,
        winner,
        pot,
        fee,
        payout: payout.value(),
    });
    transfer::public_transfer(coin::from_balance(payout, ctx), winner);
}

// Fee in basis points over the whole pot (D-20261030-16 D3). u128 intermediate (SEG-6): with a high `max_bet`
// the product pot × fee_rate overflows u64. Integer division rounds down: the remainder goes to the winner and
// the House never charges more than the rate (D-20261030-16 D2).
fun fee_amount(pot: u64, fee_rate: u16): u64 {
    ((pot as u128) * (fee_rate as u128) / BPS_DENOMINATOR) as u64
}

#[test_only]
public fun creator_for_testing(game: &Game): address {
    game.creator
}

#[test_only]
public fun opponent_for_testing(game: &Game): Option<address> {
    game.opponent
}

#[test_only]
public fun bet_for_testing(game: &Game): u64 {
    game.bet
}

#[test_only]
public fun stake_value_for_testing(game: &Game): u64 {
    game.stake.value()
}

#[test_only]
public fun fee_rate_for_testing(game: &Game): u16 {
    game.fee_rate
}

#[test_only]
public fun house_id_for_testing(game: &Game): ID {
    game.house_id
}

#[test_only]
public fun version_for_testing(game: &Game): u64 {
    game.version
}

#[test_only]
public fun is_pending_for_testing(game: &Game): bool {
    game.is_pending()
}

#[test_only]
public fun is_cancelled_for_testing(game: &Game): bool {
    match (&game.state) {
        GameState::Cancelled => true,
        _ => false,
    }
}

#[test_only]
public fun set_version_for_testing(game: &mut Game, version: u64) {
    game.version = version;
}

#[test_only]
public fun new_game_created_for_testing(
    game_id: ID,
    creator: address,
    opponent: Option<address>,
    bet: u64,
    fee_rate: u16,
): GameCreated {
    GameCreated { game_id, creator, opponent, bet, fee_rate }
}

#[test_only]
public fun new_game_cancelled_for_testing(
    game_id: ID,
    creator: address,
    cancelled_by: address,
    refund: u64,
): GameCancelled {
    GameCancelled { game_id, creator, cancelled_by, refund }
}

#[test_only]
public fun accept_with_winner_for_testing(
    game: &mut Game,
    house: &mut House,
    payment: Coin<SUI>,
    winner_index: u64,
    ctx: &mut TxContext,
) {
    let acceptor = ctx.sender();
    game.assert_acceptable(house, &payment, acceptor);
    let (payout, pot, fee) = game.collect_pot(house, payment);
    game.pay_winner(payout, pot, fee, acceptor, winner_index, ctx);
}

#[test_only]
public fun is_resolved_for_testing(game: &Game): bool {
    match (&game.state) {
        GameState::Resolved { .. } => true,
        _ => false,
    }
}

#[test_only]
public fun acceptor_for_testing(game: &Game): Option<address> {
    match (&game.state) {
        GameState::Resolved { acceptor, .. } => option::some(*acceptor),
        _ => option::none(),
    }
}

#[test_only]
public fun winner_for_testing(game: &Game): Option<address> {
    match (&game.state) {
        GameState::Resolved { winner, .. } => option::some(*winner),
        _ => option::none(),
    }
}

#[test_only]
public fun new_game_resolved_for_testing(
    game_id: ID,
    creator: address,
    acceptor: address,
    winner: address,
    pot: u64,
    fee: u64,
    payout: u64,
): GameResolved {
    GameResolved { game_id, creator, acceptor, winner, pot, fee, payout }
}
