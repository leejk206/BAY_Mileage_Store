# Project State: BAY Mileage Store

## Project Reference

See: .planning/PROJECT.md (updated 2026-02-18)

**Core value:** BAY 토큰 소각을 통한 학회 마일리지 스토어
**Current focus:** Phase 1 Foundation — executing

## Current Status

- **Milestone:** v1.0
- **Active Phase:** 1
- **Phase Status:** Verifying
- **Last Plan:** 01-01 (Initialize Anchor workspace + BAY token)

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
| 1 | Foundation | Verifying | — |

## Key Decisions

- BAY token uses 6 decimals (standard utility token format)
- Test wallet separate from deployer for realistic testing
- Mint authority retained on deployer for future minting
- anchor-spl dependency added proactively for Phase 2

## Notes

- Setup completed via SETUP.md automation script
- Toolchain: Anchor 0.32.1, Solana CLI, spl-token-cli
- All on-chain artifacts verified on devnet
