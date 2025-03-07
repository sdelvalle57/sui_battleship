// Copyright (c) Your Project
// SPDX-License-Identifier: Apache-2.0

/// Manages the House configuration for SUI Battleship.
/// The House defines game fee settings and allows fee withdrawals by an administrator.
module battleship::house;

use sui::balance::{Self, Balance};
use sui::coin::{Self};
use sui::package::claim_and_keep;
use sui::sui::SUI;

// Error Codes
const ECallerNotHouse: u64 = 0;
const EInsufficientBalance: u64 = 1;

/// The House resource stores fee settings and accumulated fees.
public struct House has key {
    id: UID,
    fee_rate: u16, // Fee rate in basis points (1 basis point = 0.01%)
    fees_collected: Balance<SUI>,
    admin: address,
}

/// The HouseCap grants admin privileges.
public struct HouseCap has key {
    id: UID,
}

/// Used as a one-time witness to generate the House resource.
public struct HOUSE has drop {}

/// Initializes the HouseCap and transfers it to the creator.
fun init(otw: HOUSE, ctx: &mut TxContext) {
    claim_and_keep(otw, ctx);

    let house_cap = HouseCap {
        id: object::new(ctx),
    };

    transfer::transfer(house_cap, ctx.sender());
}

/// Initializes the House resource with an admin and fee settings.
public fun initialize_house(house_cap: HouseCap, initial_fee_rate: u16, ctx: &mut TxContext) {
    assert!(initial_fee_rate <= 1000, EInsufficientBalance); // Max 10% fee

    let house = House {
        id: object::new(ctx),
        fee_rate: initial_fee_rate,
        fees_collected: balance::zero(),
        admin: ctx.sender(),
    };

    // HouseCap is consumed after initialization
    let HouseCap { id } = house_cap;
    object::delete(id);

    transfer::share_object(house);
}

/// Updates the fee rate. Only callable by the admin.
public fun update_fee_rate(house: &mut House, new_fee_rate: u16, ctx: &TxContext) {
    assert!(ctx.sender() == house.admin, ECallerNotHouse);
    assert!(new_fee_rate <= 1000, EInsufficientBalance); // Max 10% fee
    house.fee_rate = new_fee_rate;
}

/// Withdraws accumulated fees. Only callable by the admin.
public fun withdraw_fees(house: &mut House, ctx: &mut TxContext) {
    assert!(ctx.sender() == house.admin, ECallerNotHouse);

    let total_fees = house.fees_collected.value();
    assert!(total_fees > 0, EInsufficientBalance);

    let coin = coin::take(&mut house.fees_collected, total_fees, ctx);
    transfer::public_transfer(coin, house.admin);
}

// --------------- House Data Accessors ---------------

/// Returns the fee rate of the house.
public fun fee_rate(house: &House): u16 {
    house.fee_rate
}

/// Returns the accumulated fees.
public fun fees_collected(house: &House): u64 {
    house.fees_collected.value()
}

/// Returns the admin address.
public fun admin(house: &House): address {
    house.admin
}

#[test_only]
public fun init_for_testing(ctx: &mut TxContext) {
    init(HOUSE {}, ctx);
}
