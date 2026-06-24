# 🌍 Global Village Marketplace (GVM)

> **Decentralized blueprint IP marketplace. Trustless escrow. Instant settlement. Zero borders.**

Turn local eco-innovations into global assets — powered by **Stellar Soroban** smart contracts.

---

## 🎯 The Problem

Global farmers and eco-innovators build brilliant, sustainable blueprints — from *automated BSF protein farms* to *gravity-fed solar irrigation systems*. But they have no secure, transparent way to commercialize their intellectual property.

| Barrier | Impact |
|---------|--------|
| No IP protection | Creators can't prove ownership |
| High intermediary fees | Middlemen eat 30–60% of revenue |
| Slow cross-border payments | Settlements take days or weeks |
| Zero trust in strangers | Buyers fear plagiarism, sellers fear non-payment |

**Result:** The best climate-resilience blueprints stay hidden in village notebooks.

---

## 💡 Our Solution

**GVM** is a decentralized blueprint marketplace on the **Stellar network** that solves this with:

- **Soroban smart contracts** — trustless escrow, automated fee splits, on-chain ownership records
- **NFT-minted blueprints** — each blueprint is a self-contained IPFS folder with media, CAD files, wiring diagrams, and step-by-step build guides
- **t+5 second finality** — Stellar settlement completes in ~5 seconds at sub-cent cost
- **5% platform fee** — creators keep 95%, no hidden charges

### How it works

```
Creator uploads blueprint → Stored on-chain (IPFS hash)
        │
        ▼
Buyer purchases via Escrow → Funds locked in Soroban smart contract
        │
        ▼
Admin verifies blueprint → Blue tick badge awarded
        │
        ▼
Buyer confirms receipt → 95% to creator, 5% to platform
```

---

## 🔗 Live Deployment (Stellar Testnet)

```
✅ Deployed · ✅ Verified · ✅ 13/13 tests passing
```

```text
Contract ID : CASY2CBFQ2FO722F5FLMSIUYV5RGFDP2J2N4LU7W7M6P4I7LGM6H3C2P
Wasm Hash   : 5205e1f299130c368e3a0fa48729b515360846a6bb04b696c67aa2832974cad1
Wasm Size   : 6,921 bytes (optimized)
Network     : Stellar Testnet
```

🔎 [View on Stellar Laboratory](https://lab.stellar.org/r/testnet/contract/CASY2CBFQ2FO722F5FLMSIUYV5RGFDP2J2N4LU7W7M6P4I7LGM6H3C2P)

### Deploy TX

| Step | Transaction |
|------|------------|
| Upload WASM | [200ed9c8...](https://stellar.expert/explorer/testnet/tx/200ed9c86347b3c80f3540ca54aaec4be2d584626ff492f2812872bababb8cc0) |
| Deploy Instance | [524d3b99...](https://stellar.expert/explorer/testnet/tx/524d3b996a5bb52dbf60b0c478f04c61d1f9528afb54d662250e842323b55e42) |

---

## 🏗 Smart Contract Architecture

### Exported Functions (7)

| Function | Access | Purpose |
|----------|--------|---------|
| `initialize(admin)` | admin auth | One-time setup, stores admin address |
| `add_blueprint(creator, price, ipfs_hash)` | creator auth | Register new blueprint, auto-assign ID |
| `buy_blueprint_nft(token, buyer, bp_id)` | buyer auth | Fee-split transfer via SAC token, record ownership |
| `verify_blueprint(admin, bp_id, status)` | admin only | Award/revoke blue-tick badge |
| `get_blueprint(bp_id)` | public view | Retrieve blueprint metadata |
| `get_owner(bp_id)` | public view | Check NFT ownership |
| `get_admin()` | public view | Get platform admin address |

### Security Hardening

- ✅ Re-initialization guard (`AlreadyInitialized` panic)
- ✅ Blue-tick forgery prevention (`is_verified` hardcoded `false`)
- ✅ Persistent storage for Blueprint & Ownership (optimized gas footprint)
- ✅ Anti-double-spend (`AlreadyOwned` check before transfer)
- ✅ `require_auth()` on all mutating functions
- ✅ Custom `#[contracterror]` enum (7 error variants)
- ✅ `#[contractevent]` emissions for all state changes

### Fee Split

```
PLATFORM_FEE_BPS = 500  // 5%
Buyer pays 1000 USDC → Creator receives 950 USDC, Platform receives 50 USDC
```

---

## 🛠 Tech Stack

| Layer | Technology |
|-------|-----------|
| Blockchain | Stellar + Soroban |
| Smart Contract | Rust (`soroban-sdk = "25"`) |
| Frontend | React 19 + Vite + Tailwind CSS v4 |
| Token Standard | SAC (Stellar Asset Contract) — USDC |
| Storage | IPFS (blueprint folder metadata) |
| Wallet | Freighter API |
| Test Framework | `cargo test` + `soroban-sdk` testutils |

---

## 🚀 Quick Start

### Prerequisites

```bash
rustup install nightly-2025-07-01
rustup target add wasm32v1-none --toolchain nightly-2025-07-01
cargo install stellar-cli --version 27
```

### Build & Test

```bash
# Build the contract
cd contracts/blueprint-marketplace
stellar contract build

# Run all 13 tests
cargo test
```

### Deploy

```bash
stellar contract deploy \
  --wasm target/wasm32v1-none/release/blueprint_marketplace.wasm \
  --source YOUR_KEY_ALIAS \
  --network testnet
```

### Frontend

```bash
cd frontend
npm install
npm run dev
```

---

## 📁 Project Structure

```
G-V-M/
├── contracts/
│   └── blueprint-marketplace/     # Soroban smart contract (Rust)
│       ├── src/lib.rs             # 7 exported functions + 4 events
│       ├── src/test.rs            # 13 unit tests
│       ├── Cargo.toml
│       └── Makefile
├── frontend/                      # React + Vite + Tailwind
│   ├── src/components/dashboard/
│   │   ├── LandingPage.jsx        # Hero + globe
│   │   ├── BrowseSolutions.jsx    # Blueprint catalog cards
│   │   ├── BlueprintDetailModal.jsx # IPFS folder detail view
│   │   ├── InnovatorBlueprint.jsx # Creator upload form
│   │   └── MyPurchases.jsx        # Buyer purchase history
│   └── package.json
├── bindings/                      # TypeScript contract bindings
└── README.md
```

---

## 🤝 Collaborate

We're building for impact — not just code. If you're:

- A **blockchain developer** — jump into `contracts/`, write tests, propose fee model optimizations
- A **frontend engineer** — the UI needs Freighter wallet integration and dynamic IPFS rendering
- A **farmer, maker, or eco-innovator** — we want to onboard your blueprints as our alpha listings
- A **researcher / auditor** — audit the Soroban contract, suggest state machine hardening

Open issues, fork the repo, and submit PRs. Attribution guaranteed.

---

## 📬 Call to Action

> **The world's most climate-critical blueprints are sitting in notebooks across villages in Indonesia, Kenya, and the Philippines. Let's tokenize them, protect them, and put them to work.**

**Star this repo. Deploy the contract. List your first blueprint.**

---

MIT License
