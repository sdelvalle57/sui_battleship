// Copyright (c) 2025-2026 sdelvalle57
// SPDX-License-Identifier: Apache-2.0

/// Games of SUI Battleship: one shared object per game holding the creator's stake until the game is
/// cancelled, rejected or resolved (#6).
module battleship::game;

use battleship::house::House;
use sui::balance::Balance;
use sui::coin::{Self, Coin};
use sui::event;
use sui::sui::SUI;

// Abort codes: stable numbers, never reused for another condition. #6 continues from 7.
const EBetTooLow: u64 = 0; // stake value < house.min_bet()
const EBetTooHigh: u64 = 1; // stake value > house.max_bet()
const ESelfInvite: u64 = 2; // opponent == some(sender)
const ENotCreator: u64 = 3; // sender != game.creator
const ENotPending: u64 = 4; // game state != Pending
const ENotInvited: u64 = 5; // game.opponent == some(a) && sender != a
const ENoInvitation: u64 = 6; // reject on an open game (opponent == none)

/// One shared game. No `store`: only this module can share it; nobody can transfer, wrap or freeze it.
public struct Game has key {
    id: UID,
    /// Package version that created the game (`house.version()` at creation). Never read by refund paths.
    version: u64,
    /// House the game settles against (#6: `EWrongHouse`).
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

/// Lifecycle (D-20261030-06 §1): Pending -> Cancelled (cancel/reject) | Resolved (accept, #6, atomic).
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

// Used by cancel_game, reject_game and the accept of #6.
fun is_pending(game: &Game): bool {
    match (&game.state) {
        GameState::Pending => true,
        _ => false,
    }
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
