#![no_std]

use soroban_sdk::{
    contract, contractimpl, contracttype,
    Address, Env,
};

#[derive(Clone)]
#[contracttype]
pub struct Escrow {
    pub buyer: Address,
    pub farmer: Address,
    pub amount: i128,
    pub status: u32,
}

pub const ESCROW_KEY: u32 = 1;

pub enum Status {
    Created = 0,
    Locked = 1,
    Completed = 2,
}

#[contract]
pub struct GlobalVillageMarketplace;

#[contractimpl]
impl GlobalVillageMarketplace {

    // Buyer creates order
    pub fn create_order(
        env: Env,
        buyer: Address,
        farmer: Address,
        amount: i128,
    ) {
        buyer.require_auth();

        let escrow = Escrow {
            buyer,
            farmer,
            amount,
            status: Status::Created as u32,
        };

        env.storage().persistent().set(&ESCROW_KEY, &escrow);
    }

    // Buyer locks payment
    pub fn lock_payment(env: Env, buyer: Address) {
        buyer.require_auth();

        let mut escrow: Escrow =
            env.storage()
                .persistent()
                .get(&ESCROW_KEY)
                .unwrap();

        if escrow.status != Status::Created as u32 {
            panic!("Order not in CREATED state");
        }

        escrow.status = Status::Locked as u32;

        env.storage().persistent().set(
            &ESCROW_KEY,
            &escrow,
        );
    }

    // Admin confirms delivery
    pub fn confirm_delivery(env: Env) {

        let mut escrow: Escrow =
            env.storage()
                .persistent()
                .get(&ESCROW_KEY)
                .unwrap();

        if escrow.status != Status::Locked as u32 {
            panic!("Payment not locked");
        }

        escrow.status = Status::Completed as u32;

        env.storage().persistent().set(
            &ESCROW_KEY,
            &escrow,
        );
    }

    // View escrow
    pub fn get_order(env: Env) -> Escrow {
        env.storage()
            .persistent()
            .get(&ESCROW_KEY)
            .unwrap()
    }
}