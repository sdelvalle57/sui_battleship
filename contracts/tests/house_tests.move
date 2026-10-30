#[test_only]
module battleship::house_tests;

use battleship::house::{
    Self,
    House,
    HouseCap,
    FeeRateUpdated,
    BetLimitsUpdated,
    FeesWithdrawn,
    HouseCapTransferred,
    HouseMigrated
};
use sui::balance;
use sui::coin::Coin;
use sui::event;
use sui::package::Publisher;
use sui::sui::SUI;
use sui::test_scenario::{Self, Scenario};

const PUBLISHER: address = @0xA;
const NEW_ADMIN: address = @0xB;
const OTHER: address = @0xC;

const EXPECTED_VERSION: u64 = 1;
const EXPECTED_DEFAULT_FEE_BPS: u16 = 0;
const EXPECTED_DEFAULT_MIN_BET: u64 = 1_000_000;
const EXPECTED_DEFAULT_MAX_BET: u64 = 50_000_000_000;
const EXPECTED_MAX_FEE_BPS: u16 = 1000;
const NEWER_VERSION: u64 = 2;
const OLDER_VERSION: u64 = 0;

// Publishes the package as PUBLISHER and opens the next transaction, also as PUBLISHER.
fun publish(): Scenario {
    let mut scenario = test_scenario::begin(PUBLISHER);
    house::init_for_testing(scenario.ctx());
    scenario.next_tx(PUBLISHER);
    scenario
}

// Publishes and leaves a House with `amount` MIST of fees, in a new transaction as PUBLISHER.
fun publish_with_fees(amount: u64): Scenario {
    let mut scenario = publish();
    let mut house = scenario.take_shared<House>();
    house.add_fees(balance::create_for_testing<SUI>(amount));
    test_scenario::return_shared(house);
    scenario.next_tx(PUBLISHER);
    scenario
}

#[test]
fun test_init_shares_exactly_one_house_with_defaults() {
    let mut scenario = test_scenario::begin(PUBLISHER);
    house::init_for_testing(scenario.ctx());
    let effects = scenario.next_tx(PUBLISHER);
    assert!(test_scenario::shared(&effects).length() == 1);

    let house = scenario.take_shared<House>();
    assert!(house.version() == EXPECTED_VERSION);
    assert!(house.fee_rate() == EXPECTED_DEFAULT_FEE_BPS);
    assert!(house.min_bet() == EXPECTED_DEFAULT_MIN_BET);
    assert!(house.max_bet() == EXPECTED_DEFAULT_MAX_BET);
    assert!(house.fees_collected() == 0);
    assert!(test_scenario::has_most_recent_for_address<Publisher>(PUBLISHER));
    test_scenario::return_shared(house);
    scenario.end();
}

#[test]
fun test_init_sends_single_house_cap_to_publisher() {
    let scenario = publish();
    assert!(test_scenario::ids_for_address<HouseCap>(PUBLISHER).length() == 1);
    assert!(!test_scenario::has_most_recent_for_address<HouseCap>(OTHER));
    assert!(!test_scenario::has_most_recent_for_address<HouseCap>(NEW_ADMIN));
    scenario.end();
}

#[test]
fun test_update_fee_rate_sets_rate_and_emits_event() {
    let mut scenario = publish();
    let mut house = scenario.take_shared<House>();
    let cap = scenario.take_from_sender<HouseCap>();

    house::update_fee_rate(&mut house, &cap, 250);

    assert!(house.fee_rate() == 250);
    let expected = house::new_fee_rate_updated_for_testing(
        object::id(&house),
        EXPECTED_DEFAULT_FEE_BPS,
        250,
    );
    assert!(event::events_by_type<FeeRateUpdated>() == vector[expected]);
    scenario.return_to_sender(cap);
    test_scenario::return_shared(house);
    scenario.end();
}

#[test]
fun test_update_fee_rate_accepts_max_fee() {
    let mut scenario = publish();
    let mut house = scenario.take_shared<House>();
    let cap = scenario.take_from_sender<HouseCap>();

    house::update_fee_rate(&mut house, &cap, EXPECTED_MAX_FEE_BPS);

    assert!(house.fee_rate() == EXPECTED_MAX_FEE_BPS);
    scenario.return_to_sender(cap);
    test_scenario::return_shared(house);
    scenario.end();
}

#[test, expected_failure(abort_code = battleship::house::EFeeTooHigh)]
fun test_update_fee_rate_rejects_fee_above_max() {
    let mut scenario = publish();
    let mut house = scenario.take_shared<House>();
    let cap = scenario.take_from_sender<HouseCap>();

    house::update_fee_rate(&mut house, &cap, EXPECTED_MAX_FEE_BPS + 1);

    scenario.return_to_sender(cap);
    test_scenario::return_shared(house);
    scenario.end();
}

#[test]
fun test_update_bet_limits_sets_limits_and_emits_event() {
    let mut scenario = publish();
    let mut house = scenario.take_shared<House>();
    let cap = scenario.take_from_sender<HouseCap>();

    house::update_bet_limits(&mut house, &cap, 2_000_000, 10_000_000_000);

    assert!(house.min_bet() == 2_000_000);
    assert!(house.max_bet() == 10_000_000_000);
    let expected = house::new_bet_limits_updated_for_testing(
        object::id(&house),
        EXPECTED_DEFAULT_MIN_BET,
        EXPECTED_DEFAULT_MAX_BET,
        2_000_000,
        10_000_000_000,
    );
    assert!(event::events_by_type<BetLimitsUpdated>() == vector[expected]);
    scenario.return_to_sender(cap);
    test_scenario::return_shared(house);
    scenario.end();
}

#[test]
fun test_update_bet_limits_accepts_equal_min_and_max() {
    let mut scenario = publish();
    let mut house = scenario.take_shared<House>();
    let cap = scenario.take_from_sender<HouseCap>();

    house::update_bet_limits(&mut house, &cap, 5_000_000, 5_000_000);

    assert!(house.min_bet() == 5_000_000);
    assert!(house.max_bet() == 5_000_000);
    scenario.return_to_sender(cap);
    test_scenario::return_shared(house);
    scenario.end();
}

#[test, expected_failure(abort_code = battleship::house::EInvalidBetLimits)]
fun test_update_bet_limits_rejects_zero_min() {
    let mut scenario = publish();
    let mut house = scenario.take_shared<House>();
    let cap = scenario.take_from_sender<HouseCap>();

    house::update_bet_limits(&mut house, &cap, 0, EXPECTED_DEFAULT_MAX_BET);

    scenario.return_to_sender(cap);
    test_scenario::return_shared(house);
    scenario.end();
}

#[test, expected_failure(abort_code = battleship::house::EInvalidBetLimits)]
fun test_update_bet_limits_rejects_min_above_max() {
    let mut scenario = publish();
    let mut house = scenario.take_shared<House>();
    let cap = scenario.take_from_sender<HouseCap>();

    house::update_bet_limits(&mut house, &cap, 2_000_001, 2_000_000);

    scenario.return_to_sender(cap);
    test_scenario::return_shared(house);
    scenario.end();
}

#[test]
fun test_add_fees_accumulates_balance() {
    let mut scenario = publish();
    let mut house = scenario.take_shared<House>();

    house.add_fees(balance::create_for_testing<SUI>(700));
    house.add_fees(balance::zero<SUI>());
    assert!(house.fees_collected() == 700);
    house.add_fees(balance::create_for_testing<SUI>(300));
    assert!(house.fees_collected() == 1_000);

    test_scenario::return_shared(house);
    scenario.end();
}

#[test]
fun test_withdraw_fees_returns_all_fees_and_emits_event() {
    let mut scenario = publish_with_fees(1_500);
    let mut house = scenario.take_shared<House>();
    let cap = scenario.take_from_sender<HouseCap>();
    let fees_before = house.fees_collected();
    assert!(fees_before == 1_500);

    let coin = house.withdraw_fees(&cap, scenario.ctx());

    assert!(coin.value() == fees_before);
    assert!(house.fees_collected() == 0);
    let expected = house::new_fees_withdrawn_for_testing(object::id(&house), fees_before);
    assert!(event::events_by_type<FeesWithdrawn>() == vector[expected]);
    transfer::public_transfer(coin, OTHER);
    scenario.return_to_sender(cap);
    test_scenario::return_shared(house);

    scenario.next_tx(OTHER);
    let received = scenario.take_from_sender<Coin<SUI>>();
    assert!(received.value() == fees_before);
    scenario.return_to_sender(received);
    scenario.end();
}

#[test, expected_failure(abort_code = battleship::house::ENoFeesToWithdraw)]
fun test_withdraw_fees_rejects_empty_house() {
    let mut scenario = publish();
    let mut house = scenario.take_shared<House>();
    let cap = scenario.take_from_sender<HouseCap>();

    let coin = house.withdraw_fees(&cap, scenario.ctx());

    coin.burn_for_testing();
    scenario.return_to_sender(cap);
    test_scenario::return_shared(house);
    scenario.end();
}

#[test]
fun test_transfer_house_cap_moves_cap_and_emits_event() {
    let mut scenario = publish();
    let cap = scenario.take_from_sender<HouseCap>();
    let cap_id = object::id(&cap);

    house::transfer_house_cap(cap, NEW_ADMIN);

    let expected = house::new_house_cap_transferred_for_testing(cap_id, NEW_ADMIN);
    assert!(event::events_by_type<HouseCapTransferred>() == vector[expected]);
    scenario.next_tx(NEW_ADMIN);
    assert!(test_scenario::ids_for_address<HouseCap>(PUBLISHER).length() == 0);
    assert!(!test_scenario::has_most_recent_for_address<HouseCap>(PUBLISHER));
    assert!(test_scenario::ids_for_address<HouseCap>(NEW_ADMIN) == vector[cap_id]);
    scenario.end();
}

#[test]
fun test_transferred_cap_lets_new_holder_administer() {
    let mut scenario = publish_with_fees(900);
    let cap = scenario.take_from_sender<HouseCap>();
    house::transfer_house_cap(cap, NEW_ADMIN);

    scenario.next_tx(NEW_ADMIN);
    let mut house = scenario.take_shared<House>();
    let cap = scenario.take_from_sender<HouseCap>();
    house::update_fee_rate(&mut house, &cap, 300);
    let fees_before = house.fees_collected();
    let coin = house.withdraw_fees(&cap, scenario.ctx());
    assert!(coin.value() == fees_before);
    assert!(house.fee_rate() == 300);
    assert!(house.fees_collected() == 0);
    transfer::public_transfer(coin, NEW_ADMIN);
    scenario.return_to_sender(cap);
    test_scenario::return_shared(house);

    scenario.next_tx(NEW_ADMIN);
    let received = scenario.take_from_sender<Coin<SUI>>();
    assert!(received.value() == 900);
    scenario.return_to_sender(received);
    scenario.end();
}

#[test, expected_failure(abort_code = battleship::house::EWrongVersion)]
fun test_update_fee_rate_rejects_wrong_version() {
    let mut scenario = publish();
    let mut house = scenario.take_shared<House>();
    let cap = scenario.take_from_sender<HouseCap>();
    house::set_version_for_testing(&mut house, NEWER_VERSION);

    // Invalid fee too: the version check must be reported first.
    house::update_fee_rate(&mut house, &cap, EXPECTED_MAX_FEE_BPS + 1);

    scenario.return_to_sender(cap);
    test_scenario::return_shared(house);
    scenario.end();
}

#[test, expected_failure(abort_code = battleship::house::EWrongVersion)]
fun test_update_bet_limits_rejects_wrong_version() {
    let mut scenario = publish();
    let mut house = scenario.take_shared<House>();
    let cap = scenario.take_from_sender<HouseCap>();
    house::set_version_for_testing(&mut house, NEWER_VERSION);

    // Invalid limits too: the version check must be reported first.
    house::update_bet_limits(&mut house, &cap, 0, 0);

    scenario.return_to_sender(cap);
    test_scenario::return_shared(house);
    scenario.end();
}

#[test, expected_failure(abort_code = battleship::house::EWrongVersion)]
fun test_withdraw_fees_rejects_wrong_version() {
    let mut scenario = publish_with_fees(1_000);
    let mut house = scenario.take_shared<House>();
    let cap = scenario.take_from_sender<HouseCap>();
    house::set_version_for_testing(&mut house, NEWER_VERSION);

    let coin = house.withdraw_fees(&cap, scenario.ctx());

    coin.burn_for_testing();
    scenario.return_to_sender(cap);
    test_scenario::return_shared(house);
    scenario.end();
}

#[test, expected_failure(abort_code = battleship::house::EWrongVersion)]
fun test_add_fees_rejects_wrong_version() {
    let mut scenario = publish();
    let mut house = scenario.take_shared<House>();
    house::set_version_for_testing(&mut house, NEWER_VERSION);

    house.add_fees(balance::create_for_testing<SUI>(100));

    test_scenario::return_shared(house);
    scenario.end();
}

#[test]
fun test_migrate_bumps_version_and_emits_event() {
    let mut scenario = publish();
    let mut house = scenario.take_shared<House>();
    let cap = scenario.take_from_sender<HouseCap>();
    house::set_version_for_testing(&mut house, OLDER_VERSION);

    house::migrate(&mut house, &cap);

    assert!(house.version() == EXPECTED_VERSION);
    let expected = house::new_house_migrated_for_testing(
        object::id(&house),
        OLDER_VERSION,
        EXPECTED_VERSION,
    );
    assert!(event::events_by_type<HouseMigrated>() == vector[expected]);
    house::update_fee_rate(&mut house, &cap, 150);
    assert!(house.fee_rate() == 150);
    scenario.return_to_sender(cap);
    test_scenario::return_shared(house);
    scenario.end();
}

#[test, expected_failure(abort_code = battleship::house::ENotUpgrade)]
fun test_migrate_rejects_current_version() {
    let mut scenario = publish();
    let mut house = scenario.take_shared<House>();
    let cap = scenario.take_from_sender<HouseCap>();

    house::migrate(&mut house, &cap);

    scenario.return_to_sender(cap);
    test_scenario::return_shared(house);
    scenario.end();
}

#[test, expected_failure(abort_code = battleship::house::ENotUpgrade)]
fun test_migrate_rejects_house_newer_than_package() {
    let mut scenario = publish();
    let mut house = scenario.take_shared<House>();
    let cap = scenario.take_from_sender<HouseCap>();
    house::set_version_for_testing(&mut house, NEWER_VERSION);

    house::migrate(&mut house, &cap);

    scenario.return_to_sender(cap);
    test_scenario::return_shared(house);
    scenario.end();
}

#[test, expected_failure(abort_code = battleship::house::EWrongVersion)]
fun test_fee_rate_rejects_wrong_version() {
    let mut scenario = publish();
    let mut house = scenario.take_shared<House>();
    house::set_version_for_testing(&mut house, NEWER_VERSION);

    house.fee_rate();

    test_scenario::return_shared(house);
    scenario.end();
}

#[test, expected_failure(abort_code = battleship::house::EWrongVersion)]
fun test_fees_collected_rejects_wrong_version() {
    let mut scenario = publish();
    let mut house = scenario.take_shared<House>();
    house::set_version_for_testing(&mut house, NEWER_VERSION);

    house.fees_collected();

    test_scenario::return_shared(house);
    scenario.end();
}

#[test, expected_failure(abort_code = battleship::house::EWrongVersion)]
fun test_min_bet_rejects_wrong_version() {
    let mut scenario = publish();
    let mut house = scenario.take_shared<House>();
    house::set_version_for_testing(&mut house, NEWER_VERSION);

    house.min_bet();

    test_scenario::return_shared(house);
    scenario.end();
}

#[test, expected_failure(abort_code = battleship::house::EWrongVersion)]
fun test_max_bet_rejects_wrong_version() {
    let mut scenario = publish();
    let mut house = scenario.take_shared<House>();
    house::set_version_for_testing(&mut house, NEWER_VERSION);

    house.max_bet();

    test_scenario::return_shared(house);
    scenario.end();
}

#[test]
fun test_version_reads_house_with_wrong_version() {
    let mut scenario = publish();
    let mut house = scenario.take_shared<House>();
    house::set_version_for_testing(&mut house, NEWER_VERSION);

    assert!(house.version() == NEWER_VERSION);

    test_scenario::return_shared(house);
    scenario.end();
}
