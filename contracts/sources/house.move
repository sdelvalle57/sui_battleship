// Copyright (c) Your Project
// SPDX-License-Identifier: Apache-2.0

/// House of SUI Battleship: a single shared object holding the fee rate, the bet limits and the
/// fees collected from games. Administration requires the `HouseCap`.
module battleship::house;

use sui::balance::{Self, Balance};
use sui::coin::{Self, Coin};
use sui::event;
use sui::package::claim_and_keep;
use sui::sui::SUI;

// Abort codes: stable numbers, never reused for another condition.
const EFeeTooHigh: u64 = 0; // new_fee_rate > MAX_FEE_BPS
const EInvalidBetLimits: u64 = 1; // min_bet == 0 || min_bet > max_bet
const ENoFeesToWithdraw: u64 = 2; // fees_collected == 0
const EWrongVersion: u64 = 3; // house.version != VERSION
const ENotUpgrade: u64 = 4; // migrate with house.version >= VERSION

const VERSION: u64 = 1;
const MAX_FEE_BPS: u16 = 1000; // 10 %
// The owner sets the real fee with `update_fee_rate` right after publishing (#8).
const DEFAULT_FEE_BPS: u16 = 0;
const DEFAULT_MIN_BET: u64 = 1_000_000; // 0.001 SUI
const DEFAULT_MAX_BET: u64 = 50_000_000_000; // 50 SUI

/// Shared House configuration and custody of the collected fees.
/// Invariants: `fee_rate <= MAX_FEE_BPS` and `0 < min_bet <= max_bet`.
public struct House has key {
    id: UID,
    /// Package version allowed to read the configuration and write the House.
    version: u64,
    /// Fee in basis points (1 bp = 0.01 %).
    fee_rate: u16,
    fees_collected: Balance<SUI>,
    min_bet: u64,
    max_bet: u64,
}

/// Admin capability of the House. Without `store`: it moves only through `transfer_house_cap`.
public struct HouseCap has key { id: UID }

/// One-time witness of the module.
public struct HOUSE has drop {}

/// Emitted by `update_fee_rate`.
public struct FeeRateUpdated has copy, drop {
    house_id: ID,
    old_fee_rate: u16,
    new_fee_rate: u16,
}

/// Emitted by `update_bet_limits`.
public struct BetLimitsUpdated has copy, drop {
    house_id: ID,
    old_min_bet: u64,
    old_max_bet: u64,
    new_min_bet: u64,
    new_max_bet: u64,
}

/// Emitted by `withdraw_fees`.
public struct FeesWithdrawn has copy, drop {
    house_id: ID,
    amount: u64,
}

/// Emitted by `transfer_house_cap`.
public struct HouseCapTransferred has copy, drop {
    cap_id: ID,
    recipient: address,
}

/// Emitted by `migrate`.
public struct HouseMigrated has copy, drop {
    house_id: ID,
    old_version: u64,
    new_version: u64,
}

/// Shares the single House with the default configuration and sends the `HouseCap` to the publisher.
fun init(otw: HOUSE, ctx: &mut TxContext) {
    claim_and_keep(otw, ctx);
    transfer::share_object(House {
        id: object::new(ctx),
        version: VERSION,
        fee_rate: DEFAULT_FEE_BPS,
        fees_collected: balance::zero(),
        min_bet: DEFAULT_MIN_BET,
        max_bet: DEFAULT_MAX_BET,
    });
    transfer::transfer(HouseCap { id: object::new(ctx) }, ctx.sender());
}

/// Sets the fee rate in basis points (at most `MAX_FEE_BPS`). Requires the `HouseCap`.
/// Emits `FeeRateUpdated`.
entry fun update_fee_rate(house: &mut House, _: &HouseCap, new_fee_rate: u16) {
    assert_current_version(house);
    assert!(new_fee_rate <= MAX_FEE_BPS, EFeeTooHigh);
    let old_fee_rate = house.fee_rate;
    house.fee_rate = new_fee_rate;
    event::emit(FeeRateUpdated { house_id: object::id(house), old_fee_rate, new_fee_rate });
}

/// Sets the bet limits in MIST (`0 < min_bet <= max_bet`). Requires the `HouseCap`.
/// Emits `BetLimitsUpdated`.
entry fun update_bet_limits(house: &mut House, _: &HouseCap, min_bet: u64, max_bet: u64) {
    assert_current_version(house);
    assert!(min_bet > 0 && min_bet <= max_bet, EInvalidBetLimits);
    let old_min_bet = house.min_bet;
    let old_max_bet = house.max_bet;
    house.min_bet = min_bet;
    house.max_bet = max_bet;
    event::emit(BetLimitsUpdated {
        house_id: object::id(house),
        old_min_bet,
        old_max_bet,
        new_min_bet: min_bet,
        new_max_bet: max_bet,
    });
}

/// Transfers the `HouseCap` to `recipient`, the only way to move it. Emits `HouseCapTransferred`.
entry fun transfer_house_cap(cap: HouseCap, recipient: address) {
    event::emit(HouseCapTransferred { cap_id: object::id(&cap), recipient });
    transfer::transfer(cap, recipient);
}

/// Moves a House written by an older package version to `VERSION`. Requires the `HouseCap`.
/// Emits `HouseMigrated`.
entry fun migrate(house: &mut House, _: &HouseCap) {
    assert!(house.version < VERSION, ENotUpgrade);
    let old_version = house.version;
    house.version = VERSION;
    event::emit(HouseMigrated { house_id: object::id(house), old_version, new_version: VERSION });
}

/// Withdraws all collected fees as a `Coin`; the transaction decides where it goes.
/// Requires the `HouseCap`. Emits `FeesWithdrawn`.
public fun withdraw_fees(house: &mut House, _: &HouseCap, ctx: &mut TxContext): Coin<SUI> {
    assert_current_version(house);
    assert!(house.fees_collected.value() > 0, ENoFeesToWithdraw);
    let fees = house.fees_collected.withdraw_all();
    event::emit(FeesWithdrawn { house_id: object::id(house), amount: fees.value() });
    coin::from_balance(fees, ctx)
}

/// Deposits game fees into the House. Package-only: the game module is the sole source of fees.
public(package) fun add_fees(house: &mut House, fees: Balance<SUI>) {
    assert_current_version(house);
    house.fees_collected.join(fees);
}

/// Returns the fee rate in basis points.
public fun fee_rate(house: &House): u16 {
    assert_current_version(house);
    house.fee_rate
}

/// Returns the collected fees in MIST.
public fun fees_collected(house: &House): u64 {
    assert_current_version(house);
    house.fees_collected.value()
}

/// Returns the minimum bet in MIST.
public fun min_bet(house: &House): u64 {
    assert_current_version(house);
    house.min_bet
}

/// Returns the maximum bet in MIST.
public fun max_bet(house: &House): u64 {
    assert_current_version(house);
    house.max_bet
}

/// Returns the House version. Not version-checked on purpose: it is the diagnostic read for a
/// House that does not match the calling package.
public fun version(house: &House): u64 {
    house.version
}

// Old package versions stay callable after an upgrade; this closes them once the House migrates.
fun assert_current_version(house: &House) {
    assert!(house.version == VERSION, EWrongVersion);
}

#[test_only]
public fun init_for_testing(ctx: &mut TxContext) {
    init(HOUSE {}, ctx);
}

#[test_only]
public fun set_version_for_testing(house: &mut House, version: u64) {
    house.version = version;
}

#[test_only]
public fun new_fee_rate_updated_for_testing(
    house_id: ID,
    old_fee_rate: u16,
    new_fee_rate: u16,
): FeeRateUpdated {
    FeeRateUpdated { house_id, old_fee_rate, new_fee_rate }
}

#[test_only]
public fun new_bet_limits_updated_for_testing(
    house_id: ID,
    old_min_bet: u64,
    old_max_bet: u64,
    new_min_bet: u64,
    new_max_bet: u64,
): BetLimitsUpdated {
    BetLimitsUpdated { house_id, old_min_bet, old_max_bet, new_min_bet, new_max_bet }
}

#[test_only]
public fun new_fees_withdrawn_for_testing(house_id: ID, amount: u64): FeesWithdrawn {
    FeesWithdrawn { house_id, amount }
}

#[test_only]
public fun new_house_cap_transferred_for_testing(
    cap_id: ID,
    recipient: address,
): HouseCapTransferred {
    HouseCapTransferred { cap_id, recipient }
}

#[test_only]
public fun new_house_migrated_for_testing(
    house_id: ID,
    old_version: u64,
    new_version: u64,
): HouseMigrated {
    HouseMigrated { house_id, old_version, new_version }
}
