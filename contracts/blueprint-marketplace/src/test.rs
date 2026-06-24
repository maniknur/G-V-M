#![cfg(test)]

use crate::{BlueprintMarketplace, BlueprintMarketplaceClient};
use soroban_sdk::{testutils::Address as _, token, Address, Env, String};

fn deploy_token(env: &Env, admin: &Address) -> Address {
    env.register_stellar_asset_contract_v2(admin.clone())
        .address()
}

fn create_client(env: &Env) -> (BlueprintMarketplaceClient, Address) {
    let admin = Address::generate(env);
    let contract_id = env.register(BlueprintMarketplace, ());
    let client = BlueprintMarketplaceClient::new(env, &contract_id);
    env.mock_all_auths();
    client.initialize(&admin);
    (client, admin)
}

#[test]
fn test_initialize() {
    let env = Env::default();
    let admin = Address::generate(&env);
    let contract_id = env.register(BlueprintMarketplace, ());
    let client = BlueprintMarketplaceClient::new(&env, &contract_id);
    env.mock_all_auths();
    client.initialize(&admin);

    let stored_admin = client.get_admin();
    assert_eq!(stored_admin, admin);
}

#[test]
#[should_panic(expected = "HostError")]
fn test_reinitialize_panics() {
    let env = Env::default();
    let admin = Address::generate(&env);
    let contract_id = env.register(BlueprintMarketplace, ());
    let client = BlueprintMarketplaceClient::new(&env, &contract_id);
    env.mock_all_auths();
    client.initialize(&admin);
    client.initialize(&admin);
}

#[test]
fn test_add_blueprint() {
    let env = Env::default();
    let (client, _admin) = create_client(&env);

    let creator = Address::generate(&env);
    let ipfs_hash = String::from_str(&env, "bafybeihv.../blueprint-007");

    let bp_id = client.add_blueprint(&creator, &38i128, &ipfs_hash);

    assert_eq!(bp_id, 0);

    let bp = client.get_blueprint(&bp_id);
    assert_eq!(bp.creator, creator);
    assert_eq!(bp.price, 38i128);
    assert_eq!(bp.ipfs_hash, ipfs_hash);
    assert!(!bp.is_verified);
}

#[test]
fn test_add_blueprint_always_unverified() {
    let env = Env::default();
    let (client, _admin) = create_client(&env);

    let creator = Address::generate(&env);
    let hash = String::from_str(&env, "ipfs://test");

    let bp_id = client.add_blueprint(&creator, &50i128, &hash);

    let bp = client.get_blueprint(&bp_id);
    assert!(!bp.is_verified);
}

#[test]
fn test_add_multiple_blueprints() {
    let env = Env::default();
    let (client, _admin) = create_client(&env);

    let creator = Address::generate(&env);
    let hash = String::from_str(&env, "ipfs://test");

    let id0 = client.add_blueprint(&creator, &50i128, &hash);
    let id1 = client.add_blueprint(&creator, &100i128, &hash);

    assert_eq!(id0, 0);
    assert_eq!(id1, 1);

    let bp0 = client.get_blueprint(&0u32);
    let bp1 = client.get_blueprint(&1u32);
    assert_eq!(bp0.price, 50i128);
    assert_eq!(bp1.price, 100i128);
}

#[test]
#[should_panic(expected = "HostError")]
fn test_get_nonexistent_blueprint_panics() {
    let env = Env::default();
    let contract_id = env.register(BlueprintMarketplace, ());
    let client = BlueprintMarketplaceClient::new(&env, &contract_id);
    let admin = Address::generate(&env);
    env.mock_all_auths();
    client.initialize(&admin);

    client.get_blueprint(&999u32);
}

#[test]
fn test_buy_blueprint_nft_fee_split() {
    let env = Env::default();
    let admin = Address::generate(&env);
    let token_address = deploy_token(&env, &admin);

    let contract_id = env.register(BlueprintMarketplace, ());
    let client = BlueprintMarketplaceClient::new(&env, &contract_id);
    env.mock_all_auths();
    client.initialize(&admin);

    let creator = Address::generate(&env);
    let buyer = Address::generate(&env);
    let ipfs_hash = String::from_str(&env, "ipfs://bsf-cage");

    let bp_id = client.add_blueprint(&creator, &1000i128, &ipfs_hash);

    let token_admin = token::StellarAssetClient::new(&env, &token_address);
    token_admin.mint(&buyer, &5000i128);

    env.mock_all_auths();

    client.buy_blueprint_nft(&token_address, &buyer, &bp_id);

    let owner = client.get_owner(&bp_id);
    assert_eq!(owner, buyer);

    let buyer_balance = token::Client::new(&env, &token_address).balance(&buyer);
    let creator_balance =
        token::Client::new(&env, &token_address).balance(&creator);
    let admin_balance = token::Client::new(&env, &token_address).balance(&admin);

    assert_eq!(buyer_balance, 4000i128);
    assert_eq!(creator_balance, 950i128);
    assert_eq!(admin_balance, 50i128);
}

#[test]
#[should_panic(expected = "HostError")]
fn test_rebuy_same_blueprint_panics() {
    let env = Env::default();
    let admin = Address::generate(&env);
    let token_address = deploy_token(&env, &admin);

    let contract_id = env.register(BlueprintMarketplace, ());
    let client = BlueprintMarketplaceClient::new(&env, &contract_id);
    env.mock_all_auths();
    client.initialize(&admin);

    let creator = Address::generate(&env);
    let buyer = Address::generate(&env);
    let ipfs_hash = String::from_str(&env, "ipfs://test");

    let bp_id = client.add_blueprint(&creator, &100i128, &ipfs_hash);

    let token_admin = token::StellarAssetClient::new(&env, &token_address);
    token_admin.mint(&buyer, &5000i128);

    env.mock_all_auths();

    client.buy_blueprint_nft(&token_address, &buyer, &bp_id);
    client.buy_blueprint_nft(&token_address, &buyer, &bp_id);
}

#[test]
fn test_verify_blueprint_by_admin() {
    let env = Env::default();
    let (client, admin) = create_client(&env);

    let creator = Address::generate(&env);
    let hash = String::from_str(&env, "ipfs://test");

    let bp_id = client.add_blueprint(&creator, &50i128, &hash);

    let bp = client.get_blueprint(&bp_id);
    assert!(!bp.is_verified);

    client.verify_blueprint(&admin, &bp_id, &true);

    let bp = client.get_blueprint(&bp_id);
    assert!(bp.is_verified);
}

#[test]
#[should_panic(expected = "HostError")]
fn test_verify_blueprint_by_non_admin_panics() {
    let env = Env::default();
    let (client, _admin) = create_client(&env);

    let creator = Address::generate(&env);
    let hash = String::from_str(&env, "ipfs://test");

    let bp_id = client.add_blueprint(&creator, &50i128, &hash);

    let impostor = Address::generate(&env);
    client.verify_blueprint(&impostor, &bp_id, &true);
}

#[test]
fn test_verify_blueprint_toggle() {
    let env = Env::default();
    let (client, admin) = create_client(&env);

    let creator = Address::generate(&env);
    let hash = String::from_str(&env, "ipfs://test");

    let bp_id = client.add_blueprint(&creator, &50i128, &hash);

    client.verify_blueprint(&admin, &bp_id, &true);
    let bp = client.get_blueprint(&bp_id);
    assert!(bp.is_verified);

    client.verify_blueprint(&admin, &bp_id, &false);
    let bp = client.get_blueprint(&bp_id);
    assert!(!bp.is_verified);
}

#[test]
#[should_panic(expected = "HostError")]
fn test_buy_nonexistent_blueprint_panics() {
    let env = Env::default();
    let admin = Address::generate(&env);
    let token_address = deploy_token(&env, &admin);

    let contract_id = env.register(BlueprintMarketplace, ());
    let client = BlueprintMarketplaceClient::new(&env, &contract_id);
    env.mock_all_auths();
    client.initialize(&admin);

    let buyer = Address::generate(&env);

    env.mock_all_auths();

    client.buy_blueprint_nft(&token_address, &buyer, &99u32);
}

#[test]
#[should_panic(expected = "HostError")]
fn test_get_owner_unpurchased_panics() {
    let env = Env::default();
    let (client, _admin) = create_client(&env);

    let creator = Address::generate(&env);
    let hash = String::from_str(&env, "ipfs://test");

    let bp_id = client.add_blueprint(&creator, &50i128, &hash);

    client.get_owner(&bp_id);
}
