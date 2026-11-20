// Copyright (c) 2025-2026 sdelvalle57
// SPDX-License-Identifier: Apache-2.0

/// Common base of the 1 vs 1 games of SUI Battleship: one shared `Duel<G>` per match holding the stakes
/// of both players until the match is cancelled, rejected or resolved, plus the fee collection.
///
/// `G` is the witness of the game that owns the match: only the module that defines `G` can create,
/// activate and settle a `Duel<G>` (every function that mutates one takes `_: G` by value, except the
/// refund paths, which are generic `entry` functions that never depend on the game).
///
/// Permanent restrictions of the layout (D-20261119-05, P-13): `stake` is the only custody of funds; while
/// `Pending` it holds only the creator's bet; no value ever goes into dynamic fields; the states keep their
/// meaning in every future version.
module battleship::duel;

use battleship::house::House;
use sui::balance::Balance;
use sui::clock;
use sui::coin::{Self, Coin};
use sui::event;
use sui::sui::SUI;

// Abort codes: stable numbers, never reused for another condition (PROY-2). One cause per code (LIM-8).
const EBetTooLow: u64 = 0; // stake value < house.min_bet()
const EBetTooHigh: u64 = 1; // stake value > house.max_bet()
const ESelfInvite: u64 = 2; // opponent == some(sender)
const ENotCreator: u64 = 3; // sender != duel.creator
const ENotPending: u64 = 4; // duel state != Pending
const ENotInvited: u64 = 5; // duel.opponent == some(a) && sender != a
const ENoInvitation: u64 = 6; // reject on an open duel (opponent == none)
const EVersionMismatch: u64 = 7; // duel.version != house.version()
const EWrongHouse: u64 = 8; // object::id(house) != duel.house_id
const ESelfPlay: u64 = 9; // sender == duel.creator
const EWrongStake: u64 = 10; // payment value != duel.bet
const ENotActive: u64 = 11; // duel state != Active
const EWrongDuel: u64 = 12; // collected.duel_id != object::id(duel)
const EBadWinnerIndex: u64 = 13; // winner_index > 1
const ENotExpired: u64 = 14; // claim_timeout before deadline_ms: now < deadline_ms
const EBrokenStake: u64 = 15; // an Active duel whose stake != 2 × bet
const EBadControl: u64 = 16; // control id outside the table of time controls
const ENoClock: u64 = 17; // activate / collect on a duel without clock (turn_ms == 0)
const EHasClock: u64 = 18; // activate_atomic on a duel with clock (turn_ms != 0)
const EBadMask: u64 = 19; // to_move mask outside 1..=3
const ENotYourTurn: u64 = 20; // record_move by a player whose bit is not in to_move
const EDeadlinePassed: u64 = 21; // now >= deadline_ms: from the deadline on, only a claim is possible
const EBothPending: u64 = 22; // claim_timeout with to_move == 3: nobody moved, there is no rival to pay
const ENotStalled: u64 = 23; // refund_stalled before the deadline (both pending) or before the grace
const ENotPlayer: u64 = 24; // sender is neither the creator nor the acceptor
const EPhaseMismatch: u64 = 25; // record_move in a simultaneous phase: next_to_move != the other's pending bit

const BPS_DENOMINATOR: u128 = 10_000; // basis points per unit

// Time controls (D-20261119-05, P-2): the contract takes the id of the control (`u8`), never free
// milliseconds. The ids already published never change their meaning (PROY-2); new ids can be added.
// 0 = no clock: only for atomic games, which never leave a persistent `Active` (`activate_atomic`).
const NO_CLOCK_MS: u64 = 0; // id 0
const RAPID_10_MIN_MS: u64 = 600_000; // id 1
const RAPID_20_MIN_MS: u64 = 1_200_000; // id 2
const RAPID_30_MIN_MS: u64 = 1_800_000; // id 3
const RAPID_60_MIN_MS: u64 = 3_600_000; // id 4
const DAILY_1_DAY_MS: u64 = 86_400_000; // id 5
const DAILY_3_DAYS_MS: u64 = 259_200_000; // id 6
const MAX_TURN_MS: u64 = 604_800_000; // id 7: daily 7 days, the longest plazo

// Time the rival has to claim by time before `refund_stalled` opens for a single pending player (D13, S-2):
// 7 days. After it, anyone refunds each player its bet, so a House cut-off can never lock funds in `Active`.
const CLAIM_GRACE_MS: u64 = 604_800_000;

// `to_move` mask, fixed for every future version (P-13 (v)): 1 = creator, 2 = acceptor, 3 = both. The
// value 0 exists only inside the transaction of an `activate_atomic`.
const CREATOR_MASK: u8 = 1;
const ACCEPTOR_MASK: u8 = 2;
const BOTH_MASK: u8 = 3;

/// One shared match of the game `G`. No `store`: only this module can share it, so nobody can transfer,
/// wrap or freeze it. The field order is frozen by the first publication.
public struct Duel<phantom G> has key {
    id: UID,
    /// Package version that created the duel (`house.version()` at creation). Never read by refund paths.
    version: u64,
    /// House the duel settles against; `activate`, `activate_atomic` and `collect` require this one.
    house_id: ID,
    creator: address,
    /// `none` = open duel; `some(a)` = direct invitation to `a`.
    opponent: Option<address>,
    /// Bet in MIST; constant for the whole life of the object.
    bet: u64,
    /// The only SUI of the duel: `bet` while `Pending`, `2 × bet` while `Active`, 0 in every final state.
    stake: Balance<SUI>,
    /// Fee in basis points copied from the House at creation.
    fee_rate: u16,
    /// Time allowed for each move in ms, from the time control chosen at creation (0 = no clock).
    turn_ms: u64,
    state: DuelState,
}

/// Lifecycle: `Pending` -> `Cancelled` (cancel, reject) | `Active` -> `Resolved` (decided by the game),
/// `TimedOut` (a player let the deadline pass and the rival claimed the pot minus the fee) or `Expired`.
/// `Expired` is reached when nobody moved (both players still pending after `deadline_ms`) **or** when one
/// player is still pending after `deadline_ms + CLAIM_GRACE_MS` and nobody claimed (`refund_stalled`): in
/// both cases each player recovers its bet, without fee.
/// The six variants and their order are frozen by the first publication.
public enum DuelState has copy, drop, store {
    Pending,
    Cancelled,
    /// `to_move` is a mask (1 = creator, 2 = acceptor, 3 = both); `deadline_ms` is absolute, in ms of the
    /// `Clock`.
    Active { acceptor: address, to_move: u8, deadline_ms: u64 },
    Resolved { acceptor: address, winner: address },
    TimedOut { acceptor: address, winner: address },
    Expired { acceptor: address },
}

/// Hot potato (no abilities) returned by `activate_atomic` and `collect` once the fee has been taken. It
/// can only be consumed by `pay`, so the transaction that collects the fee has to pay the winner too.
public struct Collected { duel_id: ID, pot: u64, fee: u64 }

/// Emitted by `create`.
public struct DuelCreated<phantom G> has copy, drop {
    duel_id: ID,
    creator: address,
    opponent: Option<address>,
    bet: u64,
    fee_rate: u16,
    control: u8,
    turn_ms: u64,
}

/// Emitted by `cancel` (`cancelled_by` = creator) and `reject` (`cancelled_by` = invitee).
public struct DuelCancelled<phantom G> has copy, drop {
    duel_id: ID,
    creator: address,
    cancelled_by: address,
    refund: u64,
}

/// Emitted by `activate` and `activate_atomic`.
public struct DuelActivated<phantom G> has copy, drop {
    duel_id: ID,
    creator: address,
    acceptor: address,
    bet: u64,
    turn_ms: u64,
    to_move: u8,
    deadline_ms: u64,
}

/// Emitted by `pay` (`pot == payout + fee`).
public struct DuelResolved<phantom G> has copy, drop {
    duel_id: ID,
    creator: address,
    acceptor: address,
    winner: address,
    pot: u64,
    fee: u64,
    payout: u64,
}

/// Emitted by `record_move`: `actor` is the player that moved, `to_move` and `deadline_ms` the state after.
public struct DuelTurn<phantom G> has copy, drop {
    duel_id: ID,
    actor: address,
    to_move: u8,
    deadline_ms: u64,
}

/// Emitted by `claim_timeout` (`pot == payout + fee`); `claimed_by` is whoever sent the transaction, which
/// may not be the winner.
public struct DuelTimedOut<phantom G> has copy, drop {
    duel_id: ID,
    creator: address,
    acceptor: address,
    winner: address,
    claimed_by: address,
    pot: u64,
    fee: u64,
    payout: u64,
}

/// Emitted by `refund_stalled`: `refund_each` is the bet each player got back.
public struct DuelExpired<phantom G> has copy, drop {
    duel_id: ID,
    creator: address,
    acceptor: address,
    refund_each: u64,
}

/// Creates a duel of the game `G` with the whole `stake` as the bet (open if `opponent` is none, or an
/// invitation) and a time `control` id (0 = no clock, 1..=7 = rapid 10/20/30/60 min, daily 1/3/7 days).
/// The bet must be within the House limits; the House fee rate, version and ID are copied into the duel.
/// A `Pending` duel never expires. Emits `DuelCreated`.
///
/// `public(package)` with the witness by value: only the module that owns `G` can create its duels, and
/// each game decides how to expose this (there is no generic `create` entry).
public(package) fun create<G: drop>(
    _: G,
    house: &House,
    stake: Coin<SUI>,
    opponent: Option<address>,
    control: u8,
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
    let turn_ms = turn_ms_of(control);
    let duel = Duel<G> {
        id: object::new(ctx),
        // Equals house::VERSION here: the reads above already checked it (single source of truth).
        version: house.version(),
        house_id: object::id(house),
        creator,
        opponent,
        bet,
        stake: stake.into_balance(),
        fee_rate,
        turn_ms,
        state: DuelState::Pending,
    };
    event::emit(DuelCreated<G> {
        duel_id: object::id(&duel),
        creator,
        opponent,
        bet,
        fee_rate,
        control,
        turn_ms,
    });
    transfer::share_object(duel);
}

/// Cancels a pending duel and refunds the whole stake to the creator, without fee. Only the creator.
/// Emits `DuelCancelled`.
///
/// Generic `entry` without witness: it works for every game, today and in future versions, and takes no
/// House and checks no version, so a refund can never be blocked (INV-D2).
entry fun cancel<G>(duel: &mut Duel<G>, ctx: &mut TxContext) {
    let sender = ctx.sender();
    // AuthZ before state: a third party never learns the duel state (deny by default).
    assert!(sender == duel.creator, ENotCreator);
    assert!(duel.is_pending(), ENotPending);
    duel.refund_creator(sender, ctx);
}

/// Rejects a pending invitation and refunds the whole stake to the creator, without fee. Only the
/// invitee. Emits `DuelCancelled`. Generic `entry` without witness, House or version, like `cancel`.
entry fun reject<G>(duel: &mut Duel<G>, ctx: &mut TxContext) {
    assert!(duel.opponent.is_some(), ENoInvitation);
    let sender = ctx.sender();
    assert!(*duel.opponent.borrow() == sender, ENotInvited);
    assert!(duel.is_pending(), ENotPending);
    duel.refund_creator(sender, ctx);
}

/// Accepts a pending duel of a game with a clock: `payment` (exactly the bet) joins the stake and the
/// duel becomes `Active` with `to_move = first_to_move` (a mask in `1..=3`) and
/// `deadline_ms = now + turn_ms`. Anyone but the creator; for an invitation, only the invitee.
/// Emits `DuelActivated`.
///
/// `public(package)` with the witness by value: only the game that owns `G` activates its duels.
public(package) fun activate<G: drop>(
    _: G,
    duel: &mut Duel<G>,
    house: &House,
    payment: Coin<SUI>,
    first_to_move: u8,
    ctx: &TxContext,
) {
    let acceptor = ctx.sender();
    duel.assert_acceptable(house, &payment, acceptor);
    // After the common checks, in the contract order: a clockless duel cannot be activated here.
    assert!(duel.turn_ms != 0, ENoClock);
    assert!(first_to_move >= CREATOR_MASK && first_to_move <= BOTH_MASK, EBadMask);
    let deadline_ms = now_ms() + duel.turn_ms;
    duel.join_and_activate(payment, acceptor, first_to_move, deadline_ms);
}

/// Accepts a pending duel of a game without clock (`turn_ms == 0`) and takes the fee in the same call:
/// the duel becomes `Active { to_move = 0, deadline_ms = 0 }` only inside this transaction, the House
/// gets `⌊pot × fee_rate / 10_000⌋` (always, also with 0) and the returned `Collected` forces the caller
/// to `pay` the winner before the transaction ends. Emits `DuelActivated`.
///
/// `public(package)` with the witness by value: only the game that owns `G` activates its duels.
public(package) fun activate_atomic<G: drop>(
    _: G,
    duel: &mut Duel<G>,
    house: &mut House,
    payment: Coin<SUI>,
    ctx: &TxContext,
): Collected {
    let acceptor = ctx.sender();
    duel.assert_acceptable(house, &payment, acceptor);
    assert!(duel.turn_ms == 0, EHasClock);
    duel.join_and_activate(payment, acceptor, 0, 0);
    // `add_fees` runs here, before any payment: its House version check (house::EWrongVersion) aborts
    // before the winner is known and before any SUI moves.
    duel.collect_fee(house)
}

/// Takes the fee of an `Active` duel of a game with clock, to settle it by play or by surrender, and
/// returns the `Collected` that `pay` consumes. Only a player (creator or acceptor), and **not** only
/// the one that has to move: a surrender is made out of turn. Possible only before `deadline_ms`
/// (from the deadline on, the rival can only claim by time).
///
/// `public(package)` with the witness by value: only the game that owns `G` settles its duels.
public(package) fun collect<G: drop>(
    _: G,
    duel: &mut Duel<G>,
    house: &mut House,
    ctx: &TxContext,
): Collected {
    // `ENotActive` goes before `ENotPlayer` on purpose: the acceptor is only known inside `Active`.
    let (acceptor, _, deadline_ms) = duel.active_state();
    let sender = ctx.sender();
    assert!(sender == duel.creator || sender == acceptor, ENotPlayer);
    assert!(duel.turn_ms != 0, ENoClock);
    assert!(now_ms() < deadline_ms, EDeadlinePassed);
    assert!(duel.version == house.version(), EVersionMismatch);
    assert!(object::id(house) == duel.house_id, EWrongHouse);
    // An `Active` duel holds exactly both bets. A different amount would be a broken invariant: abort
    // instead of charging a fee over a wrong pot.
    assert!(duel.stake.value() == duel.bet * 2, EBrokenStake);
    duel.collect_fee(house)
}

/// Pays the pot minus the fee to the winner `[creator, acceptor][winner_index]` and resolves the duel:
/// `Active` -> `Resolved { acceptor, winner }`. It consumes the `Collected` of this same duel. Emits
/// `DuelResolved`.
///
/// `public(package)` with the witness by value. The winner is chosen by index over the stored players,
/// never by an address from the caller, and the payment goes to that stored address.
public(package) fun pay<G: drop>(
    _: G,
    duel: &mut Duel<G>,
    c: Collected,
    winner_index: u8,
    ctx: &mut TxContext,
) {
    let Collected { duel_id, pot, fee } = c;
    assert!(duel_id == object::id(duel), EWrongDuel);
    let (acceptor, _, _) = duel.active_state();
    assert!(winner_index <= 1, EBadWinnerIndex);
    // Branch-free on the outcome (SEG-5): the index only selects an address.
    let players = vector[duel.creator, acceptor];
    let winner = *players.borrow(winner_index as u64);
    let payout = duel.stake.withdraw_all();
    duel.state = DuelState::Resolved { acceptor, winner };
    event::emit(DuelResolved<G> {
        duel_id,
        creator: duel.creator,
        acceptor,
        winner,
        pot,
        fee,
        payout: payout.value(),
    });
    transfer::public_transfer(coin::from_balance(payout, ctx), winner);
}

/// Records a valid move of the player that signs the transaction and hands the turn over: the clock of the
/// duel is applied here, by the base, for every game (INV-D6). The game calls it once per valid move, after
/// its own rules accepted it, and passes in `next_to_move` the mask of who has to move next (1 = creator,
/// 2 = acceptor, 3 = both). Possible only before `deadline_ms`. Emits `DuelTurn`.
///
/// With `rem = to_move` without the mover's bit: if `rem != 0` (a simultaneous phase where the other player
/// is still pending) `next_to_move` must be exactly `rem`, `to_move` becomes `rem` and `deadline_ms` does
/// **not** move (the other player keeps the plazo they had); if `rem == 0` (the mover closes its turn or the
/// phase) `next_to_move` must be in `1..=3` and `deadline_ms = now + turn_ms`, also when the same player
/// keeps the turn: each valid move gets a full plazo. `turn_ms` always comes from the duel.
///
/// `public(package)` with the witness by value: only the game that owns `G` records its moves. It reads
/// `ctx.sender()` itself instead of taking an `actor` from the game: "the mover is the signer" is then a
/// property of the base, not of every game (relayers and referees are out of scope, plan §2.5).
public(package) fun record_move<G: drop>(
    _: G,
    duel: &mut Duel<G>,
    next_to_move: u8,
    ctx: &TxContext,
) {
    // Abort order of R.4. `ENotActive` goes first (the acceptor is only known inside `Active`), then the
    // authZ checks, then the clock, and the mask last: a caller that cannot move never learns more.
    let (acceptor, to_move, deadline_ms) = duel.active_state();
    assert!(duel.turn_ms != 0, ENoClock);
    let actor = ctx.sender();
    assert!(actor == duel.creator || actor == acceptor, ENotPlayer);
    // The creator and the acceptor are different addresses (`ESelfPlay`), so the bit is unambiguous.
    let bit = if (actor == duel.creator) CREATOR_MASK else ACCEPTOR_MASK;
    assert!((to_move & bit) != 0, ENotYourTurn);
    let now = now_ms();
    assert!(now < deadline_ms, EDeadlinePassed);
    // Move has no bitwise NOT: `BOTH_MASK ^ bit` is `!bit` inside the two valid bits.
    let rem = to_move & (BOTH_MASK ^ bit);
    let (new_to_move, new_deadline_ms) = if (rem != 0) {
        assert!(next_to_move == rem, EPhaseMismatch);
        (rem, deadline_ms)
    } else {
        assert!(next_to_move >= CREATOR_MASK && next_to_move <= BOTH_MASK, EBadMask);
        (next_to_move, now + duel.turn_ms)
    };
    duel.state =
        DuelState::Active { acceptor, to_move: new_to_move, deadline_ms: new_deadline_ms };
    event::emit(DuelTurn<G> {
        duel_id: object::id(duel),
        actor,
        to_move: new_to_move,
        deadline_ms: new_deadline_ms,
    });
}

/// Claims a victory by time: once `deadline_ms` has passed with a single player pending (`to_move` 1 or 2),
/// the rival of that player wins the pot minus the fee and the duel becomes `TimedOut { acceptor, winner }`
/// (`to_move = 1` => the acceptor wins, `2` => the creator). **Anyone** can send it (the winner may have no
/// gas or be offline): the destination and the amount are fixed by the state, so the caller gets nothing
/// unless it is the winner. With both players pending (`to_move == 3`) nobody moved and there is no winner:
/// the way out is `refund_stalled`. Emits `DuelTimedOut`.
///
/// Generic `entry` without `public`: no other module can compose it in a transaction with a `Collected` of
/// the same duel (the hot-potato clique, H-14, V-15). It reads the House with its version (the fee goes to
/// `fees_collected`), so a version cut-off blocks it; `refund_stalled` is the exit that no cut-off blocks.
entry fun claim_timeout<G>(duel: &mut Duel<G>, house: &mut House, ctx: &mut TxContext) {
    // Version-checked House read first (discarded value), as in `assert_acceptable`.
    let _ = house.min_bet();
    let (acceptor, to_move, deadline_ms) = duel.active_state();
    assert!(duel.turn_ms != 0, ENoClock);
    assert!(duel.version == house.version(), EVersionMismatch);
    assert!(object::id(house) == duel.house_id, EWrongHouse);
    // `collect` needs `now < deadline_ms` and this needs `now >= deadline_ms`: disjoint (INV-D6).
    assert!(now_ms() >= deadline_ms, ENotExpired);
    assert!(to_move != BOTH_MASK, EBothPending);
    assert!(duel.stake.value() == duel.bet * 2, EBrokenStake);
    // The winner is the rival of the player that has to move; never `ctx.sender()`.
    let winner = if (to_move == CREATOR_MASK) acceptor else duel.creator;
    // This function settles the duel itself, so it consumes the `Collected` by destructuring it (only this
    // module can) instead of handing it to `pay`: the potato never reaches a caller.
    let Collected { duel_id, pot, fee } = duel.collect_fee(house);
    let payout = duel.stake.withdraw_all();
    duel.state = DuelState::TimedOut { acceptor, winner };
    event::emit(DuelTimedOut<G> {
        duel_id,
        creator: duel.creator,
        acceptor,
        winner,
        claimed_by: ctx.sender(),
        pot,
        fee,
        payout: payout.value(),
    });
    transfer::public_transfer(coin::from_balance(payout, ctx), winner);
}

/// Refunds each player its bet, without fee, when the duel is stalled: with both players pending
/// (`to_move == 3`, nobody moved) from `deadline_ms` on; with a single player pending, from
/// `deadline_ms + CLAIM_GRACE_MS` on, when the rival did not claim in time. The creator gets `bet` and the
/// acceptor the rest of the stake; `Active` -> `Expired { acceptor }`. **Anyone** can send it; the payments
/// go to the stored players. Emits `DuelExpired`.
///
/// Generic `entry` without `public`, no House and no version read: no cut-off can block this exit
/// (INV-D2, INV-D3). It does **not** assert `stake == 2 × bet` on purpose: an abort here would lock funds,
/// so whatever is in the stake leaves it. Before the grace a lone pending player cannot use it to escape a
/// claim by time: the rival has `CLAIM_GRACE_MS` to claim (a documented race afterwards).
entry fun refund_stalled<G>(duel: &mut Duel<G>, ctx: &mut TxContext) {
    let (acceptor, to_move, deadline_ms) = duel.active_state();
    assert!(duel.turn_ms != 0, ENoClock);
    let stalled_from = if (to_move == BOTH_MASK) deadline_ms else deadline_ms + CLAIM_GRACE_MS;
    assert!(now_ms() >= stalled_from, ENotStalled);
    let creator_refund = duel.stake.split(duel.bet);
    let acceptor_refund = duel.stake.withdraw_all();
    duel.state = DuelState::Expired { acceptor };
    event::emit(DuelExpired<G> {
        duel_id: object::id(duel),
        creator: duel.creator,
        acceptor,
        refund_each: duel.bet,
    });
    transfer::public_transfer(coin::from_balance(creator_refund, ctx), duel.creator);
    transfer::public_transfer(coin::from_balance(acceptor_refund, ctx), acceptor);
}

// Refunds the whole stake to the creator, without fee. Takes no House and checks no version on purpose:
// a refund path can never be blocked by an upgrade (D-20261030-12 §4). The payment goes to the stored
// creator, never to `ctx.sender()` (an invitee that rejects gets nothing).
fun refund_creator<G>(duel: &mut Duel<G>, cancelled_by: address, ctx: &mut TxContext) {
    let refund = duel.stake.withdraw_all();
    duel.state = DuelState::Cancelled;
    event::emit(DuelCancelled<G> {
        duel_id: object::id(duel),
        creator: duel.creator,
        cancelled_by,
        refund: refund.value(),
    });
    transfer::public_transfer(coin::from_balance(refund, ctx), duel.creator);
}

fun is_pending<G>(duel: &Duel<G>): bool {
    match (&duel.state) {
        DuelState::Pending => true,
        _ => false,
    }
}

// (acceptor, to_move, deadline_ms) of an `Active` duel; aborts `ENotActive` in any other state.
fun active_state<G>(duel: &Duel<G>): (address, u8, u64) {
    match (&duel.state) {
        DuelState::Active { acceptor, to_move, deadline_ms } => (*acceptor, *to_move, *deadline_ms),
        _ => abort ENotActive,
    }
}

// Checks common to `activate` and `activate_atomic`, in contract order, before any state change.
fun assert_acceptable<G>(
    duel: &Duel<G>,
    house: &House,
    payment: &Coin<SUI>,
    acceptor: address,
) {
    // First, a version-checked House read (discarded value): a House written by another package version
    // aborts with house::EWrongVersion before anything else, as in `create`.
    let _ = house.min_bet();
    assert!(duel.version == house.version(), EVersionMismatch);
    assert!(object::id(house) == duel.house_id, EWrongHouse);
    // AuthZ before state: an unauthorized caller never learns the duel state (deny by default).
    assert!(acceptor != duel.creator, ESelfPlay);
    assert!(duel.opponent.is_none() || *duel.opponent.borrow() == acceptor, ENotInvited);
    assert!(duel.is_pending(), ENotPending);
    assert!(payment.value() == duel.bet, EWrongStake);
}

// Joins the acceptor's bet to the stake (`2 × bet`) and moves `Pending` -> `Active`. Only called after
// every assertion has passed.
fun join_and_activate<G>(
    duel: &mut Duel<G>,
    payment: Coin<SUI>,
    acceptor: address,
    to_move: u8,
    deadline_ms: u64,
) {
    duel.stake.join(payment.into_balance());
    duel.state = DuelState::Active { acceptor, to_move, deadline_ms };
    event::emit(DuelActivated<G> {
        duel_id: object::id(duel),
        creator: duel.creator,
        acceptor,
        bet: duel.bet,
        turn_ms: duel.turn_ms,
        to_move,
        deadline_ms,
    });
}

// Takes the fee from the stake and sends it to the House: `add_fees` is always called, even with a zero
// fee, and it is the only way in which `duel` touches the House's funds (D4). Returns the `Collected`
// with the pot and the fee. Leaves `pot - fee` in the stake for `pay`.
fun collect_fee<G>(duel: &mut Duel<G>, house: &mut House): Collected {
    let pot = duel.stake.value();
    let fee = duel.stake.split(fee_amount(pot, duel.fee_rate));
    let fee_value = fee.value();
    house.add_fees(fee);
    Collected { duel_id: object::id(duel), pot, fee: fee_value }
}

// Milliseconds per move for a time control id. A private function, not a `public` one: its table can
// grow with new ids in a compatible upgrade. Any id outside the table aborts `EBadControl`.
fun turn_ms_of(control: u8): u64 {
    if (control == 0) NO_CLOCK_MS
    else if (control == 1) RAPID_10_MIN_MS
    else if (control == 2) RAPID_20_MIN_MS
    else if (control == 3) RAPID_30_MIN_MS
    else if (control == 4) RAPID_60_MIN_MS
    else if (control == 5) DAILY_1_DAY_MS
    else if (control == 6) DAILY_3_DAYS_MS
    else {
        assert!(control == 7, EBadControl);
        MAX_TURN_MS
    }
}

// Timestamp of the transaction's `Clock` (`0x6`) without taking it as an argument: `clock::borrow()` reads
// the very same clock (V-13), so no caller has to pass one and none can pass a stale one.
fun now_ms(): u64 {
    clock::borrow().timestamp_ms()
}

// Fee in basis points over the whole pot (D-20261030-16 D3). u128 intermediate (SEG-6): with a high
// `max_bet` the product pot × fee_rate overflows u64. Integer division rounds down: the remainder goes
// to the winner and the House never charges more than the rate (D-20261030-16 D2). Duplicated from
// `game::fee_amount` (private) on purpose (LIM-5): that way `game.move` keeps zero diff, since it holds
// funds already published; this copy is the one `duel` uses.
fun fee_amount(pot: u64, fee_rate: u16): u64 {
    ((pot as u128) * (fee_rate as u128) / BPS_DENOMINATOR) as u64
}

#[test_only]
public fun creator_for_testing<G>(duel: &Duel<G>): address {
    duel.creator
}

#[test_only]
public fun opponent_for_testing<G>(duel: &Duel<G>): Option<address> {
    duel.opponent
}

#[test_only]
public fun bet_for_testing<G>(duel: &Duel<G>): u64 {
    duel.bet
}

#[test_only]
public fun stake_value_for_testing<G>(duel: &Duel<G>): u64 {
    duel.stake.value()
}

#[test_only]
public fun fee_rate_for_testing<G>(duel: &Duel<G>): u16 {
    duel.fee_rate
}

#[test_only]
public fun turn_ms_for_testing<G>(duel: &Duel<G>): u64 {
    duel.turn_ms
}

#[test_only]
public fun house_id_for_testing<G>(duel: &Duel<G>): ID {
    duel.house_id
}

#[test_only]
public fun version_for_testing<G>(duel: &Duel<G>): u64 {
    duel.version
}

#[test_only]
public fun is_pending_for_testing<G>(duel: &Duel<G>): bool {
    duel.is_pending()
}

#[test_only]
public fun is_cancelled_for_testing<G>(duel: &Duel<G>): bool {
    match (&duel.state) {
        DuelState::Cancelled => true,
        _ => false,
    }
}

#[test_only]
public fun is_active_for_testing<G>(duel: &Duel<G>): bool {
    match (&duel.state) {
        DuelState::Active { .. } => true,
        _ => false,
    }
}

#[test_only]
public fun is_resolved_for_testing<G>(duel: &Duel<G>): bool {
    match (&duel.state) {
        DuelState::Resolved { .. } => true,
        _ => false,
    }
}

#[test_only]
public fun is_timed_out_for_testing<G>(duel: &Duel<G>): bool {
    match (&duel.state) {
        DuelState::TimedOut { .. } => true,
        _ => false,
    }
}

#[test_only]
public fun is_expired_for_testing<G>(duel: &Duel<G>): bool {
    match (&duel.state) {
        DuelState::Expired { .. } => true,
        _ => false,
    }
}

// `to_move` and `deadline_ms` exist only inside `Active` (INV-D7): `none` in every other state.
#[test_only]
public fun to_move_for_testing<G>(duel: &Duel<G>): Option<u8> {
    match (&duel.state) {
        DuelState::Active { to_move, .. } => option::some(*to_move),
        _ => option::none(),
    }
}

#[test_only]
public fun deadline_ms_for_testing<G>(duel: &Duel<G>): Option<u64> {
    match (&duel.state) {
        DuelState::Active { deadline_ms, .. } => option::some(*deadline_ms),
        _ => option::none(),
    }
}

#[test_only]
public fun acceptor_for_testing<G>(duel: &Duel<G>): Option<address> {
    match (&duel.state) {
        DuelState::Active { acceptor, .. } => option::some(*acceptor),
        DuelState::Resolved { acceptor, .. } => option::some(*acceptor),
        DuelState::TimedOut { acceptor, .. } => option::some(*acceptor),
        DuelState::Expired { acceptor } => option::some(*acceptor),
        _ => option::none(),
    }
}

// The winner of a `Resolved` or `TimedOut` duel (`Expired` has none: both players get their bet back).
#[test_only]
public fun winner_for_testing<G>(duel: &Duel<G>): Option<address> {
    match (&duel.state) {
        DuelState::Resolved { winner, .. } => option::some(*winner),
        DuelState::TimedOut { winner, .. } => option::some(*winner),
        _ => option::none(),
    }
}

#[test_only]
public fun set_version_for_testing<G>(duel: &mut Duel<G>, version: u64) {
    duel.version = version;
}

// Adds SUI to the stake of the duel: breaks `stake == 2 × bet` on an `Active` duel, which the API never
// allows (for the `EBrokenStake` test).
#[test_only]
public fun add_to_stake_for_testing<G>(duel: &mut Duel<G>, extra: Coin<SUI>) {
    duel.stake.join(extra.into_balance());
}

// A `Collected` that no function of the API would produce (for the `ENotActive` test of `pay`).
#[test_only]
public fun new_collected_for_testing(duel_id: ID, pot: u64, fee: u64): Collected {
    Collected { duel_id, pot, fee }
}

#[test_only]
public fun collected_pot_for_testing(c: &Collected): u64 {
    c.pot
}

#[test_only]
public fun collected_fee_for_testing(c: &Collected): u64 {
    c.fee
}

#[test_only]
public fun new_duel_created_for_testing<G>(
    duel_id: ID,
    creator: address,
    opponent: Option<address>,
    bet: u64,
    fee_rate: u16,
    control: u8,
    turn_ms: u64,
): DuelCreated<G> {
    DuelCreated { duel_id, creator, opponent, bet, fee_rate, control, turn_ms }
}

#[test_only]
public fun new_duel_cancelled_for_testing<G>(
    duel_id: ID,
    creator: address,
    cancelled_by: address,
    refund: u64,
): DuelCancelled<G> {
    DuelCancelled { duel_id, creator, cancelled_by, refund }
}

#[test_only]
public fun new_duel_activated_for_testing<G>(
    duel_id: ID,
    creator: address,
    acceptor: address,
    bet: u64,
    turn_ms: u64,
    to_move: u8,
    deadline_ms: u64,
): DuelActivated<G> {
    DuelActivated { duel_id, creator, acceptor, bet, turn_ms, to_move, deadline_ms }
}

#[test_only]
public fun new_duel_resolved_for_testing<G>(
    duel_id: ID,
    creator: address,
    acceptor: address,
    winner: address,
    pot: u64,
    fee: u64,
    payout: u64,
): DuelResolved<G> {
    DuelResolved { duel_id, creator, acceptor, winner, pot, fee, payout }
}

#[test_only]
public fun new_duel_turn_for_testing<G>(
    duel_id: ID,
    actor: address,
    to_move: u8,
    deadline_ms: u64,
): DuelTurn<G> {
    DuelTurn { duel_id, actor, to_move, deadline_ms }
}

#[test_only]
public fun new_duel_timed_out_for_testing<G>(
    duel_id: ID,
    creator: address,
    acceptor: address,
    winner: address,
    claimed_by: address,
    pot: u64,
    fee: u64,
    payout: u64,
): DuelTimedOut<G> {
    DuelTimedOut { duel_id, creator, acceptor, winner, claimed_by, pot, fee, payout }
}

#[test_only]
public fun new_duel_expired_for_testing<G>(
    duel_id: ID,
    creator: address,
    acceptor: address,
    refund_each: u64,
): DuelExpired<G> {
    DuelExpired { duel_id, creator, acceptor, refund_each }
}
