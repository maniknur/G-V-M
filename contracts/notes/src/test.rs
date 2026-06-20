#![cfg(test)]

use super::*;
use soroban_sdk::{
    testutils::{Address as _},
    Address,
    Env,
};

#[test]
fn test_create_order() {
    let env = Env::default();

    let buyer = Address::generate(&env);
    let farmer = Address::generate(&env);

    buyer.require_auth_for_args(());

    GlobalVillageMarketplace::create_order(
        env.clone(),
        buyer.clone(),
        farmer.clone(),
        100,
    );

    let order =
        GlobalVillageMarketplace::get_order(env.clone());

    assert_eq!(order.buyer, buyer);
    assert_eq!(order.farmer, farmer);
    assert_eq!(order.amount, 100);
    assert_eq!(order.status, Status::Created as u32);
}

#[test]
fn test_lock_payment() {
    let env = Env::default();

    let buyer = Address::generate(&env);
    let farmer = Address::generate(&env);

    buyer.require_auth_for_args(());

    GlobalVillageMarketplace::create_order(
        env.clone(),
        buyer.clone(),
        farmer,
        100,
    );

    buyer.require_auth_for_args(());

    GlobalVillageMarketplace::lock_payment(
        env.clone(),
        buyer,
    );

    let order =
        GlobalVillageMarketplace::get_order(env.clone());

    assert_eq!(
        order.status,
        Status::Locked as u32
    );
}

#[test]
fn test_confirm_delivery() {
    let env = Env::default();

    let buyer = Address::generate(&env);
    let farmer = Address::generate(&env);

    buyer.require_auth_for_args(());

    GlobalVillageMarketplace::create_order(
        env.clone(),
        buyer.clone(),
        farmer,
        100,
    );

    buyer.require_auth_for_args(());

    GlobalVillageMarketplace::lock_payment(
        env.clone(),
        buyer,
    );

    GlobalVillageMarketplace::confirm_delivery(
        env.clone(),
    );

    let order =
        GlobalVillageMarketplace::get_order(env);

    assert_eq!(
        order.status,
        Status::Completed as u32
    );
}