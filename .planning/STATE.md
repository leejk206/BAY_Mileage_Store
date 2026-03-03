# Project State: BAY Mileage Store

## Project Reference

See: .planning/PROJECT.md (updated 2026-02-18)

**Core value:** BAY 토큰 소각을 통한 학회 마일리지 스토어
**Current focus:** Phase 2 Program Core — Plan 01 complete, Plan 02 pending

## Current Status

- **Milestone:** v1.0
- **Active Phase:** 2
- **Phase Status:** In Progress (1/2 plans complete)
- **Last Plan:** 02-01 (Implement full Anchor program — all 3 instructions + PDAs + errors)
- **Stopped At:** Completed 02-program-core/02-01-PLAN.md
- **Last Session:** 2026-03-03

## On-Chain State

| Resource | Address |
|----------|---------|
| Program ID | `3HgyGbc6oQvGMiWxMFCTfk4br1K4Zv6Jy2oR3chCcFag` |
| BAY Mint | `agYm2drYnvKnGQoXh1iZQ4iWYZPa87qtGe4baTNckdB` |
| Test Wallet | `GZuFe8aFbJNeg1HAj7fqzCjsRo18S9jaFTAY8cGLV8p3` |
| Deployer | `7otn8Pmbwys4gEAX5SwAFc9p695SJ9vDJyt2Biw9BDXA` |

## Phase History

| Phase | Name | Status | Completed |
|-------|------|--------|-----------|
| 1 | Foundation | Complete | 2026-02-19 |
| 2 | Program Core | In Progress | — |

## Key Decisions

- BAY token uses 6 decimals (standard utility token format)
- Test wallet separate from deployer for realistic testing
- Mint authority retained on deployer for future minting
- anchor-spl dependency added proactively for Phase 2
- bay_mint stored in StoreConfig so Purchase can verify address = store_config.bay_mint (prevents mint substitution)
- Item PDA re-derived in Purchase context using seeds = [b"item", item.name.as_bytes()] (blocks fake StoreItem accounts)
- Stock decremented before CPI burn — safe because Solana rolls back on CPI failure
- blake3 pinned to 1.5.5 to resolve SBF toolchain incompatibility with edition2024

## Notes

- Setup completed via SETUP.md automation script
- Toolchain: Anchor 0.32.1, Solana CLI, spl-token-cli
- All on-chain artifacts verified on devnet
- Program binary: target/deploy/bay_mileage_store.so (267KB) — ready for deploy
- IDL: target/idl/bay_mileage_store.json — contains initializeStore, addItem, purchase
- Next: 02-02-PLAN.md — Deploy to devnet, run smoke tests, record StoreConfig PDA
