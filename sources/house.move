module battleship::house;

use sui::balance::Balance;
use sui::sui::SUI;
use sui::package::{Self};

// Error codes
const ECallerNotHouse: u64 = 0;

public struct House has key {
    id: UID,
    balance: Balance<SUI>,
    house: address,
    fees: Balance<SUI>, // The acrued fees from games played.
    base_fee_in_bp: u16, // The default fee in basis points. 1 basis point = 0.01%.
}

/// A one-time use capability to initialize the house data; created and sent
/// to sender in the initializer.
public struct HouseCap has key {
    id: UID,
}

/// Used as a one time witness to generate the publisher.
public struct HOUSE has drop {}

fun init(otw: HOUSE, ctx: &mut TxContext) {
    // Creating and sending the Publisher object to the sender.
    package::claim_and_keep(otw, ctx);

    // Creating and sending the HouseCap object to the sender.
    let house_cap = HouseCap {
        id: object::new(ctx),
    };

    transfer::transfer(house_cap, ctx.sender());
}
