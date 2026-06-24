# Global Village Marketplace (GVM)

> **Decentralized sustainability blueprints. Admin-verified. On-chain ownership. Zero borders.**

Turn local eco-innovations into tradeable, verifiable IP assets — powered by Stellar Soroban smart contracts.

---

## The Problem

Off-grid and rural communities build brilliant, climate-resilient innovations — gravity-fed irrigation, automated insect protein farms, solar dehydrators — yet have no secure mechanism to protect or monetise their intellectual property.

| Barrier | Impact |
|---|---|
| No IP protection | Creators cannot prove ownership |
| High intermediary fees | Middlemen siphon 30–60% of revenue |
| Slow cross-border settlement | Payments take days, not seconds |
| Zero trust in strangers | Buyers fear plagiarism; sellers fear non-payment |

**Result:** The world's most practical sustainability blueprints remain hidden in village notebooks — unshared, unfunded, and unscaled.

---

## Our Solution

GVM is a decentralised blueprint marketplace on **Stellar Soroban** that provides:

- **Admin-verified reputation** — every blueprint receives a blue-tick badge after admin review, establishing trust between anonymous buyers and creators
- **On-chain ownership records** — purchasers receive a verifiable transaction hash stored on Stellar's ledger, creating an immutable proof of license
- **Automated fee-split escrow** — the Soroban contract locks buyer funds and atomically distributes 95% to the creator and 5% to the platform
- **~5-second finality** — Stellar settlement completes at sub-cent cost with near-instant confirmation
- **IPFS-based storage** — blueprint metadata, build guides, CAD files, and wiring diagrams live on IPFS via Pinata with dual-layer encryption

### How it works

```
Creator uploads blueprint  →  Stored on-chain (IPFS hash + admin-encrypted payload)
        │
        ▼
Admin reviews & verifies   →  Blue-tick badge awarded on-chain
        │
        ▼
Buyer purchases via escrow →  Funds locked in Soroban smart contract
        │
        ▼
Payment executes atomically →  95% creator, 5% platform (SAC token transfer)
        │
        ▼
Access granted on-chain    →  Download link served via backend API
```

---

## Live Deployment (Stellar Testnet)

```text
Contract ID   : CASY2CBFQ2FO722F5FLMSIUYV5RGFDP2J2N4LU7W7M6P4I7LGM6H3C2P
Wasm Hash     : 5205e1f299130c368e3a0fa48729b515360846a6bb04b696c67aa2832974cad1
Network       : Stellar Testnet
Status        : Deployed · Verified · 13/13 tests passing
```

🔎 [View on Stellar Laboratory](https://lab.stellar.org/r/testnet/contract/CASY2CBFQ2FO722F5FLMSIUYV5RGFDP2J2N4LU7W7M6P4I7LGM6H3C2P)

### Deploy Transactions

| Step | Transaction |
|---|---|
| Upload WASM | [200ed9c8...](https://stellar.expert/explorer/testnet/tx/200ed9c86347b3c80f3540ca54aaec4be2d584626ff492f2812872bababb8cc0) |
| Deploy Instance | [524d3b99...](https://stellar.expert/explorer/testnet/tx/524d3b996a5bb52dbf60b0c478f04c61d1f9528afb54d662250e842323b55e42) |

---

## Tech Stack

| Layer | Technology |
|---|---|
| Blockchain | Stellar + Soroban (Rust, `soroban-sdk = "25"`) |
| Smart Contract | Rust — 7 exported functions, 7 error variants, 3 contract events |
| Frontend | React 19 + TypeScript + Vite + Tailwind CSS v4 |
| Wallet | Freighter API (`@stellar/freighter-api`) |
| Token | SAC (Stellar Asset Contract) — USDC |
| Storage | IPFS via Pinata (dual-layer encryption: buyer key + admin review key) |
| Backend | Express.js + TypeScript — purchase verification, event watcher, download API |
| RPC Infrastructure | Multi-node with auto-failover (BlockDaemon + Soroban Public RPC + Futurenet) |
| Test Framework | `cargo test` + `soroban-sdk` testutils (13 unit tests) |

---

## Key Features

### Admin-Verified Reputation System

Each blueprint is initially unverified (`is_verified = false`). An admin-controlled endpoint calls `verify_blueprint()` on-chain to toggle a blue-tick badge. Only verified blueprints can be purchased — eliminating fraudulent listings before funds ever move.

### On-Chain Ownership via Transaction Hashes

Purchases produce a unique Stellar transaction hash stored in the backend database. The hash serves as an immutable proof-of-license that anyone can independently verify on Stellar Expert or any block explorer.

### Multi-Provider RPC with Auto-Failover

The frontend RPC configuration (`frontend/src/config/rpc.ts`) manages three providers:

1. **BlockDaemon** (priority 0, configurable via `VITE_BLOCKDAEMON_RPC_URL`)
2. **Soroban Public RPC** (priority 1, `VITE_RPC_URL`)
3. **Futurenet Fallback** (priority 2)

Health checks run every 30 seconds. On failure, the active node automatically rotates. Rate-limit (HTTP 429) responses trigger immediate failover. All RPC calls include 3 retry attempts with exponential back-off.

### Gasless / Escrow-Based Purchasing Flow

Buyers interact with a clean UI — no manual fee estimation, no direct gas management. The Soroban contract handles the token transfer atomically:

```
PLATFORM_FEE_BPS = 500  (5%)
Buyer pays 1000 USDC → 950 USDC to creator, 50 USDC to platform
```

### Dual-Layer IPFS Encryption

Each blueprint stores two IPFS hashes on-chain:

- **`ipfs_hash`** — buyer-accessible content, unlocked after purchase
- **`admin_encrypted_hash`** — admin-key encrypted copy, used during the review workflow before a blueprint goes live

---

## Soroban Contract Architecture

### Exported Functions

| Function | Access | Purpose |
|---|---|---|
| `initialize(admin)` | admin auth | One-time setup; stores admin address and initialises counter |
| `add_blueprint(creator, price, ipfs_hash, admin_encrypted_hash)` | creator auth | Register a new blueprint with dual IPFS hashes |
| `buy_blueprint(token, buyer, bp_id)` | buyer auth | Escrow purchase — SAC token transfer + ownership record |
| `verify_blueprint(admin, bp_id, status)` | admin only | Award or revoke blue-tick verification badge |
| `get_blueprint(bp_id)` | public | Read blueprint metadata (price, creator, is_verified) |
| `has_access(bp_id, user)` | public | Check if an address holds ownership of a blueprint |
| `get_admin()` | public | Retrieve platform admin address |

### Error Variants

| Code | Variant | Trigger |
|---|---|---|
| 1 | `NotInitialized` | Called before `initialize()` |
| 2 | `BlueprintNotFound` | Referenced a non-existent blueprint ID |
| 3 | `Unauthorized` | Non-admin attempted `verify_blueprint()` |
| 4 | `InvalidPrice` | Price ≤ 0 during blueprint creation |
| 5 | `AlreadyOwned` | Buyer attempted re-purchase of an owned blueprint |
| 6 | `AlreadyInitialized` | `initialize()` called twice |
| 7 | `BlueprintNotVerified` | Purchase attempted on an unverified blueprint |

### Contract Events

- `BlueprintAdded { blueprint_id }` — emitted on `add_blueprint()`
- `BlueprintVerified { blueprint_id, status }` — emitted on `verify_blueprint()`
- `BlueprintPurchasedEvent { blueprint_id, buyer, price, platform_fee, creator_share }` — emitted on `buy_blueprint()`

### Security

- **Re-initialisation guard** — `AlreadyInitialized` panic prevents admin takeover
- **Blue-tick forgery prevention** — `is_verified` is hardcoded `false` on creation; only the admin can toggle it
- **Persistent storage** — blueprint data and ownership records stored in Soroban's `persistent` storage tier
- **`require_auth()` on all mutating functions** — every state change requires cryptographic proof of the caller's identity
- **`#[contracterror]` enum** — all 7 error variants are typed and documented

---

## Project Structure

```
G-V-M/
├── contracts/
│   └── blueprint-marketplace/         # Soroban smart contract (Rust)
│       ├── src/
│       │   ├── lib.rs                 # 7 exported functions, 7 errors, 3 events
│       │   └── test.rs                # 13 unit tests
│       ├── Cargo.toml
│       ├── Makefile
│       └── rust-toolchain.toml
├── frontend/                          # React 19 + Vite + Tailwind CSS v4
│   ├── src/
│   │   ├── App.tsx                    # Root component — state-driven routing + wallet modal
│   │   ├── main.tsx                   # Entry point with Buffer polyfill
│   │   ├── components/
│   │   │   ├── landing-page/          # Hero section + 3D globe (react-globe.gl)
│   │   │   ├── dashboard/
│   │   │   │   ├── BrowseSolutions.tsx    # Blueprint catalog with buy flow
│   │   │   │   ├── BlueprintDetailModal.jsx
│   │   │   │   ├── DashboardLayout.tsx    # Multi-tab dashboard (buy/innovate/purchases)
│   │   │   │   ├── InnovatorBlueprint.tsx # Creator publish form
│   │   │   │   └── MyPurchases.jsx        # Purchase history with download links
│   │   │   ├── WalletConnect.jsx
│   │   │   └── WalletStatus.jsx
│   │   ├── config/
│   │   │   └── rpc.ts                # Multi-node RPC manager with auto-failover
│   │   ├── contracts/
│   │   │   └── gvm/                   # Auto-generated Soroban TypeScript bindings
│   │   ├── data/
│   │   │   └── blueprints/            # 19 seed blueprints (bp-001 through bp-019)
│   │   ├── hooks/
│   │   │   └── useSorobanContract.ts  # Contract interaction hook
│   │   └── utils/                     # XLM helpers, balance, encryption mocks
│   ├── tsconfig.json
│   ├── tsconfig.app.json
│   ├── tsconfig.node.json
│   └── vite.config.ts
├── backend/                           # Express.js + TypeScript API server
│   ├── src/
│   │   ├── index.ts                   # Server entry — 7 REST endpoints (port 4000)
│   │   ├── rpc.ts                     # Event watcher — polls Soroban events every 15s
│   │   ├── db.ts                      # In-memory store for verified purchases
│   │   ├── seed-to-soroban.ts         # Bulk seed script for blueprints
│   │   ├── seed-blueprints.ts
│   │   └── validate-blueprints.ts
│   ├── package.json
│   └── tsconfig.json
├── scripts/                           # Standalone utility scripts
├── Cargo.toml                         # Rust workspace root
└── README.md
```

---

## Quick Start

### Prerequisites

```bash
# Rust toolchain
rustup install nightly-2025-07-01
rustup target add wasm32v1-none --toolchain nightly-2025-07-01
cargo install stellar-cli --version 27

# Node.js >= 18
node --version
```

### 1. Build & Test the Smart Contract

```bash
cd contracts/blueprint-marketplace

# Compile
stellar contract build

# Run 13 unit tests
cargo test
```

### 2. Deploy to Testnet

```bash
stellar contract deploy \
  --wasm target/wasm32v1-none/release/blueprint_marketplace.wasm \
  --source YOUR_KEY_ALIAS \
  --network testnet
```

Update the `CONTRACT_ID` in:
- `backend/src/rpc.ts` (line 9)
- `frontend/src/contracts/gvm/src/index.ts` (`networks.testnet.contractId`)

### 3. Install Frontend Dependencies

```bash
cd frontend
npm install
npm run dev          # Start Vite dev server
```

### 4. Install Backend Dependencies

```bash
cd backend
npm install
npm run dev          # Start Express server on :4000
```

---

## Deployment Guide

### Environment Variables

Create a `.env` file at the repository root (or in `backend/`):

```bash
# IPFS / Pinata
PINATA_API_KEY=your_pinata_api_key
PINATA_SECRET_API_KEY=your_pinata_secret

# RPC Providers
VITE_BLOCKDAEMON_RPC_URL=https://your-blockdaemon-endpoint
VITE_RPC_URL=https://soroban-testnet.stellar.org
QUICKNODE_RPC_URL=https://your-quicknode-endpoint

# Admin
ADMIN_SECRET=SXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXX
```

### Seeding Blueprints

GVM ships with **19 pre-designed sustainability blueprints** in `frontend/src/data/blueprints/`. Each blueprint has a `metadata.json` with title, description, category, and pricing.

To register them all on-chain and verify them automatically:

```bash
cd backend
npm run seed
```

This script:
1. Reads all `bp-XXX/metadata.json` files
2. Calls `add_blueprint()` for each one
3. Immediately calls `verify_blueprint()` to grant the blue-tick badge
4. Writes transaction hashes to `frontend/src/data/seed-results.json`

### Running the Full Stack

```bash
# Terminal 1 — Frontend
cd frontend && npm run dev

# Terminal 2 — Backend
cd backend && npm run dev
```

The backend starts an **event watcher** that polls Soroban contract events every 15 seconds, detecting new purchases and recording them with on-chain verification.

---

## Verification & Provenance

### Contract Build Provenance

The WASM deployed at `5205e1f299...` was built from the exact source in `contracts/blueprint-marketplace/src/lib.rs` with:

```toml
[profile.release]
opt-level = "z"      # Optimise for size
lto = true           # Link-time optimisation
panic = "abort"      # Minimal panic handler
strip = "symbols"    # Strip debug symbols
```

Reproducible build verification:

```bash
cd contracts/blueprint-marketplace
stellar contract build
stellar contract install --wasm target/wasm32v1-none/release/blueprint_marketplace.wasm
# Compare the resulting Wasm hash with the deployed hash above
```

### Blueprint Verification

Every blueprint registered on-chain is permanently verifiable:

1. **On-chain record** — `get_blueprint(bp_id)` returns the full `BlueprintInfo` struct (creator, price, IPFS hash, verification status)
2. **Ownership proof** — `has_access(bp_id, user)` confirms whether an address holds a valid license
3. **Transaction history** — every purchase emits a `BlueprintPurchasedEvent` with price, fee split, buyer, and blueprint ID
4. **Block explorer** — all transaction hashes are linked to Stellar Expert for independent audit

---

## Collaborate

We are building for real-world impact. If you are:

- A **blockchain developer** — audit the Soroban contract, propose fee model improvements, or contribute to the event watcher
- A **frontend engineer** — improve the Freighter wallet UX, add dynamic IPFS rendering, or optimise the RPC health-check pipeline
- A **sustainability practitioner** — we want to onboard your blueprints as listings in the marketplace
- A **researcher or auditor** — review the dual-layer encryption model, the state machine, and the escrow flow

Open issues, fork the repository, and submit PRs. Attribution guaranteed.

---

## License

MIT
