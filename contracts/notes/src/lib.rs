#![no_std]

use soroban_sdk::{
    contract,
    contractimpl,
    contracttype,
    symbol_short,
    Address,
    Env,
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

        if amount <= 0 {
            panic!("Amount must be greater than zero");
        }

        if buyer == farmer {
            panic!("Buyer and farmer cannot be the same");
        }

        let escrow = Escrow {
            buyer: buyer.clone(),
            farmer: farmer.clone(),
            amount,
            status: Status::Created as u32,
        };

        env.storage()
            .persistent()
            .set(&ESCROW_KEY, &escrow);

        env.events().publish(
            (symbol_short!("create"),),
            amount,
        );
    }

    // Buyer locks payment
    pub fn lock_payment(
        env: Env,
        buyer: Address,
    ) {
        buyer.require_auth();

        let mut escrow: Escrow = match env
            .storage()
            .persistent()
            .get(&ESCROW_KEY)
        {
            Some(e) => e,
            None => panic!("Order not found"),
        };

        if escrow.buyer != buyer {
            panic!("Only buyer can lock payment");
        }

        if escrow.status != Status::Created as u32 {
            panic!("Order not in CREATED state");
        }

        escrow.status = Status::Locked as u32;

        env.storage()
            .persistent()
            .set(&ESCROW_KEY, &escrow);

        env.events().publish(
            (symbol_short!("locked"),),
            escrow.amount,
        );
    }

    // Confirm delivery
    pub fn confirm_delivery(
        env: Env,
    ) {
        let mut escrow: Escrow = match env
            .storage()
            .persistent()
            .get(&ESCROW_KEY)
        {
            Some(e) => e,
            None => panic!("Order not found"),
        };

        if escrow.status != Status::Locked as u32 {
            panic!("Payment not locked");
        }

        escrow.status = Status::Completed as u32;

        env.storage()
            .persistent()
            .set(&ESCROW_KEY, &escrow);

        env.events().publish(
            (symbol_short!("done"),),
            escrow.amount,
        );
    }

    // View escrow
    pub fn get_order(
        env: Env,
    ) -> Option<Escrow> {
        env.storage()
            .persistent()
            .get(&ESCROW_KEY)
    }
}