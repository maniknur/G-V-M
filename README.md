# 🌍 Global Village Marketplace (GVM)

Global Village Marketplace (GVM) is a blockchain-based escrow marketplace built on the Stellar network using Soroban smart contracts.

The project aims to connect local farmers directly with global buyers through a transparent and trust-minimized escrow system, reducing dependency on intermediaries and enabling secure cross-border trade.

This repository contains a simplified MVP escrow contract deployed and tested on Stellar Testnet.

---

# 🎯 Problem Statement

Smallholder farmers often face:

- Limited access to international markets
- High transaction fees
- Delayed payments
- Long intermediary chains reducing profits

Global Village Marketplace explores how blockchain-based escrow can help create a more transparent and efficient trading process.

---

# 💡 Solution

The platform uses a Soroban smart contract to manage trade agreements between buyers and farmers.

Instead of relying on a central intermediary, transaction states are enforced directly on-chain.

Escrow workflow:

Buyer
→ Create Order

Buyer
→ Lock Payment

Farmer
→ Deliver Goods

Admin / Oracle
→ Confirm Delivery

Smart Contract
→ Complete Transaction

---

# 🚀 Features

### Escrow Order Creation

Buyers can create a trade agreement specifying:

- Buyer address
- Farmer address
- Payment amount

### Payment Locking

The buyer locks funds into escrow before shipment.

### Delivery Confirmation

The order can only be completed after payment has been locked.

### Order Status Tracking

Order states are stored on-chain and can be queried at any time.

### Security Checks

Implemented validations include:

- Amount must be greater than zero
- Buyer and farmer cannot be the same address
- Only the original buyer can lock payment
- Invalid state transitions are prevented
- Safe storage handling without unwrap-related crashes

---

# 🔄 Escrow State Machine

```text
CREATED
   │
   ▼
LOCKED
   │
   ▼
COMPLETED
```

Status Codes:

| Value | Status |
|---------|---------|
| 0 | CREATED |
| 1 | LOCKED |
| 2 | COMPLETED |

---

# 📜 Smart Contract Functions

## create_order()

Creates a new escrow order.

Parameters:

- buyer
- farmer
- amount

---

## lock_payment()

Locks the escrow payment.

Authorization:

- Buyer signature required

---

## confirm_delivery()

Marks the escrow as completed.

Validation:

- Order must be in LOCKED state

---

## get_order()

Returns the current escrow information.

---

# 🛠 Technology Stack

- Rust
- Soroban SDK
- Stellar Testnet
- Stellar Laboratory
- Soroban Smart Contracts

---

# 📦 Deployment Information

## Network

Stellar Testnet

## Contract ID

```text
CBNHLV3A3FD75IDYHTF6JW5IZF46EJECB27KGLKQKYMLRMBLMHPGUT7G
```

## WASM Hash

```text
fd2b5e10e27e948b4cd06b19432060e40aba30f51941c34b43cf4618ff395ca1
```

## WASM Size

```text
3606 bytes
```

---

# 🔗 Contract Explorer

https://lab.stellar.org/r/testnet/contract/CBNHLV3A3FD75IDYHTF6JW5IZF46EJECB27KGLKQKYMLRMBLMHPGUT7G

---

# 🔗 Deployment Transactions

## Upload WASM

https://stellar.expert/explorer/testnet/tx/cdff2942bd17bcd7fe8ad5392ea66db3d3761f503abf399f1fa678f9bdd497a6

## Deploy Contract

https://stellar.expert/explorer/testnet/tx/f8b91a69cbe9940fe1b3e9d9356f8bab3071bb750bc9c30feae09877db5d0a68

---

# 🧪 Tested Functions

Successfully tested on Stellar Testnet:

- ✅ create_order()
- ✅ lock_payment()
- ✅ confirm_delivery()
- ✅ get_order()

---

# 📈 Future Roadmap

## Phase 1 (Current MVP)

- Single escrow order
- On-chain status tracking
- Testnet deployment
- Basic authorization controls

## Phase 2

- Stablecoin integration (USDC)
- Refund mechanism
- Multiple orders
- Escrow expiration

## Phase 3

- Freighter wallet integration
- Farmer dashboard
- Buyer dashboard
- Delivery tracking

## Phase 4

- Cooperative verification
- Anchor integration
- Oracle-based delivery confirmation
- Mainnet deployment

---

# 🌏 Long-Term Vision

Global Village Marketplace seeks to empower farmers by enabling direct access to global buyers through transparent and low-cost blockchain infrastructure.

The long-term goal is to support fair trade, financial inclusion, and trusted agricultural commerce using Stellar technology.

---

# 📄 License

MIT License