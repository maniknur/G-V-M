#![no_std]

#[cfg(test)]
mod test;

use soroban_sdk::{
    contract, contracterror, contractevent, contractimpl, contracttype, panic_with_error, token,
    Address, Env, String,
};

const PLATFORM_FEE_BPS: i128 = 500;

#[contracterror]
#[derive(Copy, Clone, Debug, Eq, PartialEq)]
pub enum MarketplaceError {
    NotInitialized = 1,
    BlueprintNotFound = 2,
    Unauthorized = 3,
    InvalidPrice = 4,
    AlreadyOwned = 5,
    AlreadyInitialized = 6,
    BlueprintNotVerified = 7,
}

#[contracttype]
#[derive(Clone, Debug, Eq, PartialEq)]
pub enum DataKey {
    Admin,
    Blueprint(u32),
    Ownership(u32, Address),
    BlueprintCounter,
}

#[contracttype]
#[derive(Clone, Debug, Eq, PartialEq)]
pub struct BlueprintInfo {
    pub creator: Address,
    pub price: i128,
    // Hash IPFS utama yang berisi file terenkripsi untuk BUYER (hanya bisa dibuka setelah beli)
    pub ipfs_hash: String,
    // Hash IPFS khusus berisi file terenkripsi menggunakan Public Key ADMIN (untuk tahap review awal)
    pub admin_encrypted_hash: String, 
    pub is_verified: bool,
}

#[contractevent]
#[derive(Clone, Debug, Eq, PartialEq)]
pub struct BlueprintAdded {
    pub blueprint_id: u32,
}

#[contractevent]
#[derive(Clone, Debug, Eq, PartialEq)]
pub struct BlueprintVerified {
    pub blueprint_id: u32,
    pub status: bool,
}

#[contractevent]
#[derive(Clone, Debug, Eq, PartialEq)]
pub struct BlueprintPurchasedEvent {
    pub blueprint_id: u32,
    pub buyer: Address,
    pub price: i128,
    pub platform_fee: i128,
    pub creator_share: i128,
}

#[contract]
pub struct BlueprintMarketplace;

#[contractimpl]
impl BlueprintMarketplace {
    pub fn initialize(env: Env, admin: Address) {
        if env.storage().instance().has(&DataKey::Admin) {
            panic_with_error!(&env, MarketplaceError::AlreadyInitialized);
        }
        admin.require_auth();
        env.storage().instance().set(&DataAdmin, &admin);
        env.storage().instance().set(&DataKey::BlueprintCounter, &0u32);
    }

    // Menambahkan parameter `admin_encrypted_hash` dari sisi Frontend
    pub fn add_blueprint(
        env: Env, 
        creator: Address, 
        price: i128, 
        ipfs_hash: String, 
        admin_encrypted_hash: String
    ) -> u32 {
        creator.require_auth();

        if price <= 0 {
            panic_with_error!(&env, MarketplaceError::InvalidPrice);
        }

        let mut counter: u32 = env
            .storage()
            .instance()
            .get(&DataKey::BlueprintCounter)
            .unwrap_or(0);
        
        let blueprint_id = counter;
        counter += 1;
        env.storage().instance().set(&DataKey::BlueprintCounter, &counter);

        let info = BlueprintInfo {
            creator,
            price,
            ipfs_hash,
            admin_encrypted_hash, // Berkas aman terenkripsi key admin
            is_verified: false,
        };

        env.storage().persistent().set(&DataKey::Blueprint(blueprint_id), &info);
        BlueprintAdded { blueprint_id }.publish(&env);

        blueprint_id
    }

    pub fn buy_blueprint(env: Env, token_address: Address, buyer: Address, blueprint_id: u32) {
        buyer.require_auth();

        if env.storage().persistent().has(&DataKey::Ownership(blueprint_id, buyer.clone())) {
            panic_with_error!(&env, MarketplaceError::AlreadyOwned);
        }

        if !env.storage().persistent().has(&DataKey::Blueprint(blueprint_id)) {
            panic_with_error!(&env, MarketplaceError::BlueprintNotFound);
        }
        let blueprint: BlueprintInfo = env.storage().persistent().get(&DataKey::Blueprint(blueprint_id)).unwrap();

        if !blueprint.is_verified {
            panic_with_error!(&env, MarketplaceError::BlueprintNotVerified);
        }

        let platform_fee = (blueprint.price * PLATFORM_FEE_BPS) / 10000;
        let creator_share = blueprint.price - platform_fee;

        let admin: Address = env.storage().instance().get(&DataKey::Admin).unwrap_or_else(|| {
            panic_with_error!(&env, MarketplaceError::NotInitialized);
        });

        let token_client = token::Client::new(&env, &token_address);

        token_client.transfer(&buyer, &admin, &platform_fee);
        token_client.transfer(&buyer, &blueprint.creator, &creator_share);

        env.storage().persistent().set(&DataKey::Ownership(blueprint_id, buyer.clone()), &true);

        BlueprintPurchasedEvent {
            blueprint_id,
            buyer,
            price: blueprint.price,
            platform_fee,
            creator_share,
        }
        .publish(&env);
    }

    pub fn verify_blueprint(env: Env, admin: Address, blueprint_id: u32, status: bool) {
        let stored_admin: Address = env.storage().instance().get(&DataKey::Admin).unwrap_or_else(|| {
            panic_with_error!(&env, MarketplaceError::NotInitialized);
        });

        if admin != stored_admin {
            panic_with_error!(&env, MarketplaceError::Unauthorized);
        }
        admin.require_auth();

        if !env.storage().persistent().has(&DataKey::Blueprint(blueprint_id)) {
            panic_with_error!(&env, MarketplaceError::BlueprintNotFound);
        }
        let mut blueprint: BlueprintInfo = env.storage().persistent().get(&DataKey::Blueprint(blueprint_id)).unwrap();

        blueprint.is_verified = status;
        env.storage().persistent().set(&DataKey::Blueprint(blueprint_id), &blueprint);

        BlueprintVerified { blueprint_id, status }.publish(&env);
    }

    // --- Getters ---
    pub fn get_blueprint(env: Env, blueprint_id: u32) -> BlueprintInfo {
        env.storage().persistent().get(&DataKey::Blueprint(blueprint_id)).unwrap_or_else(|| {
            panic_with_error!(&env, MarketplaceError::BlueprintNotFound);
        })
    }

    pub fn has_access(env: Env, blueprint_id: u32, user: Address) -> bool {
        env.storage().persistent().has(&DataKey::Ownership(blueprint_id, user))
    }

    pub fn get_admin(env: Env) -> Address {
        env.storage().instance().get(&DataKey::Admin).unwrap_or_else(|| {
            panic_with_error!(&env, MarketplaceError::NotInitialized);
        })
    }
}