# 🌍 Global Village Marketplace (GVM)

**Global Village Marketplace (GVM)** is a blockchain-based escrow marketplace built on **Stellar Soroban** that connects local farmers with global buyers through secure and transparent smart contracts.

The project demonstrates how decentralized escrow can reduce trust requirements in agricultural trade while enabling low-cost cross-border payments.

---

## 🎯 Vision

Millions of smallholder farmers lose a significant portion of their profits due to long intermediary chains, expensive international payment systems, and limited access to global markets.

Global Village Marketplace aims to create a transparent marketplace where:

* Farmers can access international buyers directly.
* Buyers can securely lock payments in escrow.
* Smart contracts automate transaction settlement.
* Trust is minimized through blockchain verification.

---

## 🚀 MVP Smart Contract

This repository contains a simplified Soroban escrow contract deployed on the **Stellar Testnet**.

### Contract Functions

| Function           | Description                       |
| ------------------ | --------------------------------- |
| `create_order`     | Creates a new escrow order        |
| `lock_payment`     | Locks buyer funds into escrow     |
| `confirm_delivery` | Marks delivery as completed       |
| `get_order`        | Returns current order information |

---

## 🔄 Escrow Workflow

```text
Buyer
   │
   ▼
Create Order
   │
   ▼
Lock Payment
   │
   ▼
Farmer Ships Goods
   │
   ▼
Confirm Delivery
   │
   ▼
Release Payment
```

---

## 📊 State Machine

```text
CREATED
   │
   ▼
LOCKED
   │
   ▼
COMPLETED
```

---

## 🛠 Technology Stack

* Rust
* Soroban SDK
* Stellar Testnet
* Stellar Laboratory
* Smart Contracts

---

## 📦 Build Information

### WASM

* File Size: **3124 bytes**
* WASM Hash:

```text
48b6f438c7f3eec07ed70d60b2fcf06b085da12aba36e23774a8a6904494677b
```

---

## 🌐 Deployment

### Network

Stellar Testnet

### Contract ID

```text
CBEFNVNNEC7Z5QY6AHZCJJYG3QPYFTWHE46LXZY5RZZEK3BLJRZA2O45
```

### Contract Explorer

https://lab.stellar.org/r/testnet/contract/CBEFNVNNEC7Z5QY6AHZCJJYG3QPYFTWHE46LXZY5RZZEK3BLJRZA2O45

---

## 🔗 Deployment Transactions

### WASM Upload

https://stellar.expert/explorer/testnet/tx/dbd4672c3381ce46a2b1b9a4ee32df5164ae9dce7f1d9d875bc24d059f3cad5f

### Contract Deployment

https://stellar.expert/explorer/testnet/tx/0b69066b8e7ae9765977320f176ba9d8d4c9e76b9654d0604d7b3b175e12c1b4

---

## 🧪 Tested Features

✅ Contract compilation

✅ WASM deployment

✅ Contract deployment

✅ create_order()

✅ lock_payment()

✅ confirm_delivery()

✅ get_order()

✅ State transition validation

---

## 🗺 Roadmap

### Phase 1 (Current MVP)

* Single escrow contract
* Basic order lifecycle
* Stellar Testnet deployment

### Phase 2

* Stablecoin integration (USDC/TUSDC)
* Refund mechanism
* Multi-order support

### Phase 3

* Farmer dashboard
* Buyer dashboard
* Freighter wallet integration
* Delivery tracking

### Phase 4

* Cooperative verification
* Anchor integration
* Production deployment on Stellar Mainnet

---

## 🏆 Hackathon Context

This project is inspired by the idea of enabling direct agricultural trade between Southeast Asian farmers and international buyers using Stellar's fast and low-cost blockchain infrastructure.

The long-term vision is to support financial inclusion, transparent trade, and global market access for underserved farming communities.

---

## 📄 License

MIT License
