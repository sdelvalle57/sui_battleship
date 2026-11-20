// Copyright (c) 2025-2026 sdelvalle57
// SPDX-License-Identifier: Apache-2.0

/// Coinflip on the common base `battleship::duel`: the first game of the multigame platform. Same rules as
/// `battleship::game` (a fair coin decides the winner, the fee is taken over the whole pot with the rate
/// copied at creation), but the funds, the lifecycle and the fee live in `Duel<Coinflip>`.
///
/// The coinflip has no clock: it creates its duels with control 0 and settles them atomically, so no
/// `Duel<Coinflip>` ever stays `Active` between transactions (INV-D5). It never calls `record_move`,
/// `collect`, `claim_timeout` or `refund_stalled`. `cancel` and `reject` are the generic `entry` functions
/// of `duel`, which work on `Duel<Coinflip>` like on any other game.
///
/// Security (SEG-5, R.7): the only function that draws randomness is `accept`, a non-`public` `entry`
/// that creates its generator inside. This module has no `public` function, no `init` and no struct that
/// holds a generator, so no other module (or PTB command) can compose a `Duel<Coinflip>` or the `Collected`
/// of its settlement with a draw and abort on a loss.
module battleship::coinflip;

use battleship::duel::{Self, Duel};
use battleship::house::House;
use sui::coin::Coin;
use sui::random::Random;
use sui::sui::SUI;

// Time control id of `duel::create`: 0 = no clock. The coinflip is atomic, so it never has a deadline.
const NO_CLOCK: u8 = 0;

/// Witness of the coinflip. `drop` only: no `copy`, no `store` and no `public` constructor, so only this
/// module can build one and therefore only this module can create, activate and settle a `Duel<Coinflip>`
/// (the base takes the witness by value in every function that creates, mutates or pays a duel). The name
/// is not the module name in capitals on purpose: that shape is reserved for one-time witnesses.
public struct Coinflip has drop {}

/// Creates a coinflip duel with the whole `stake` as the bet (open if `opponent` is none, or an
/// invitation), without clock. The bet must be within the House limits; the House fee rate, version and
/// ID are copied into the duel. Emits `DuelCreated<Coinflip>`.
entry fun create(
    house: &House,
    stake: Coin<SUI>,
    opponent: Option<address>,
    ctx: &mut TxContext,
) {
    duel::create(Coinflip {}, house, stake, opponent, NO_CLOCK, ctx);
}

/// Accepts a pending coinflip matching its bet exactly and resolves it with a coin flip in the same
/// transaction: the fee goes to the House and the winner gets the pot minus the fee. Anyone but the
/// creator; for an invitation, only the invitee. Emits `DuelActivated<Coinflip>` and
/// `DuelResolved<Coinflip>`. Index 0 of the draw is the creator and index 1 the acceptor.
///
/// Order of the operations (SEG-5, PROY-5), the same as `game::accept_game`:
/// 1. `duel::activate_atomic` validates everything that can abort regardless of the outcome (House
///    version, House, authZ, state, stake) and takes the fee (`add_fees`, whose version check can also
///    abort). Nothing is paid yet and the winner is unknown.
/// 2. The generator is created here, not received, and a single draw by index picks the winner.
/// 3. `duel::pay` pays the winner. Its checks (`EWrongDuel`, `ENotActive`, `EBadWinnerIndex`) are
///    deterministic: the `Collected` comes from this very duel, the duel was just activated and the draw is
///    0 or 1, so none of them can fail here.
///
/// Why this is safe: `accept` is `entry` without `public` (the lint `public_random` does not fire and no
/// other module can call it) and the generator is created inside, so nobody can wrap the draw and abort
/// when they lose. The `Collected` is born in `activate_atomic` and consumed in `pay` inside this same
/// function: it is never returned or stored, so a transaction cannot end between the fee and the payment.
/// Branch-free on the outcome: the index only selects an address inside `pay`. Both outcomes run the same
/// operations (the same state change, event and transfer), so they should cost the same gas whoever wins
/// (SEG-5); the smoke of the localnet measures it per outcome instead of taking it for granted.
///
/// A second defence comes from the protocol, not from this module: in a PTB, after the command that takes
/// `Random`, only `TransferObjects` and `MergeCoins` are allowed, never a `MoveCall`, so no later command
/// can read the result and abort when the caller loses. `accept` also returns nothing and pays to an
/// address, so there is no PTB result that carries the draw.
entry fun accept(
    duel: &mut Duel<Coinflip>,
    house: &mut House,
    payment: Coin<SUI>,
    r: &Random,
    ctx: &mut TxContext,
) {
    let collected = duel::activate_atomic(Coinflip {}, duel, house, payment, ctx);
    let mut generator = r.new_generator(ctx);
    let winner_index = generator.generate_u8_in_range(0, 1);
    duel::pay(Coinflip {}, duel, collected, winner_index, ctx);
}

// Same as `accept` with the winner fixed by `winner_index` (0 = creator, 1 = acceptor) instead of drawn,
// to test the settlement of each outcome without `Random`. `#[test_only]`: it is not in the bytecode that
// gets published.
#[test_only]
public fun accept_with_winner_for_testing(
    duel: &mut Duel<Coinflip>,
    house: &mut House,
    payment: Coin<SUI>,
    winner_index: u8,
    ctx: &mut TxContext,
) {
    let collected = duel::activate_atomic(Coinflip {}, duel, house, payment, ctx);
    duel::pay(Coinflip {}, duel, collected, winner_index, ctx);
}
