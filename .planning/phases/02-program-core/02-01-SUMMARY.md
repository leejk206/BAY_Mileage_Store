---
phase: 02-program-core
plan: 01
subsystem: on-chain
tags: [anchor, solana, spl-token, burn, pda, rust, bpf]

# Dependency graph
requires:
  - phase: 01-foundation
    provides: Anchor workspace, program ID, BAY mint address on devnet
provides:
  - Full Anchor program with initialize_store, add_item, and purchase instructions
  - StoreConfig PDA (authority + bay_mint stored on-chain)
  - StoreItem PDA (name, price, stock — seeds by item name)
  - PurchaseReceipt PDA (buyer, item, amount_burned, timestamp)
  - BayError enum (InsufficientFunds, OutOfStock, NameTooLong)
  - Compiled program binary at target/deploy/bay_mileage_store.so
  - IDL at target/idl/bay_mileage_store.json with 3 instructions
affects: [03-client, 02-02-deploy]

# Tech tracking
tech-stack:
  added: [anchor-spl associated_token feature, InitSpace derive macro, token::burn CPI]
  patterns: [PDA with stored bump, has_one authority constraint, address= mint verification, stock-before-burn ordering]

key-files:
  created: []
  modified:
    - programs/bay-mileage-store/Cargo.toml
    - programs/bay-mileage-store/src/lib.rs
    - Cargo.lock

key-decisions:
  - "Store bay_mint in StoreConfig so purchase can verify address = store_config.bay_mint, preventing mint substitution attacks"
  - "Re-derive item PDA in Purchase context (seeds = [b'item', item.name.as_bytes()], bump = item.bump) to block fake StoreItem accounts"
  - "Decrement stock before burn CPI — Solana runtime rolls back on CPI failure so this is safe"
  - "One-receipt-per-buyer-per-item is intentional for Phase 2 (seeds include both buyer and item key)"
  - "Downgraded blake3 to 1.5.5 to resolve SBF toolchain incompatibility with edition2024"

patterns-established:
  - "PDA bump stored in account struct and re-used in constraints (bump = account.bump)"
  - "InitSpace derive + space = 8 + Struct::INIT_SPACE for deterministic account sizing"
  - "has_one = authority on store_config for operator-only instructions"

requirements-completed: [CAT-01, CAT-02, PUR-01, PUR-02, PUR-03]

# Metrics
duration: ~20min
completed: 2026-03-03
---

# Phase 2 Plan 01: Program Core Implementation Summary

**Full Anchor program with 3 instructions, 3 PDAs, and burn-based purchase — compiles to BPF bytecode targeting Solana devnet**

## Performance

- **Duration:** ~20 min
- **Started:** 2026-03-03T04:15:00Z
- **Completed:** 2026-03-03T04:35:00Z
- **Tasks:** 2
- **Files modified:** 3

## Accomplishments
- Added `associated_token` feature to anchor-spl in Cargo.toml (required for AssociatedToken program type in Purchase context)
- Implemented complete lib.rs with initialize_store, add_item, and purchase instructions (200 lines)
- All 3 PDAs implemented: StoreConfig, StoreItem, PurchaseReceipt with correct seed derivation
- BayError enum with InsufficientFunds, OutOfStock, NameTooLong variants
- anchor build compiles successfully — .so binary (267KB) and IDL generated
- Resolved blake3 v1.8.3 edition2024 incompatibility with Solana SBF toolchain by pinning to v1.5.5

## Task Commits

Prior commits contained implementation (already applied before this execution run):

1. **Task 1: Add associated_token feature** - `c1e7cb1` (chore)
2. **Task 2: Implement full Anchor program** - `2f44346` (feat — temp commit)
3. **Auto-fix: blake3 downgrade for SBF build** - `90afaa4` (fix)

**Plan metadata:** _(final docs commit — created after this summary)_

## Files Created/Modified
- `programs/bay-mileage-store/Cargo.toml` - Added `associated_token` to anchor-spl features
- `programs/bay-mileage-store/src/lib.rs` - Full program: 3 instructions, 3 account structs, 3 PDAs, BayError enum (200 lines)
- `Cargo.lock` - Pinned blake3 to 1.5.5 (was 1.8.3 which required edition2024 unsupported by SBF Cargo 1.84.0)

## Decisions Made
- **bay_mint in StoreConfig:** Storing the authorized BAY mint in the config PDA allows the `Purchase` context to use `address = store_config.bay_mint`, making it impossible to substitute a fake mint.
- **Item seed re-derivation in Purchase:** Using `seeds = [b"item", item.name.as_bytes()]` in the Purchase context (not just passing any account) ensures only legitimately registered items can be purchased.
- **Stock decrement before CPI burn:** Safe because Solana rolls back the entire transaction on CPI failure — no state can be partially applied.
- **i64 timestamp:** Used `i64` (not `u64`) for PurchaseReceipt.timestamp to match `Clock::get()?.unix_timestamp` return type.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 3 - Blocking] Fixed blake3 edition2024 incompatibility blocking anchor build**
- **Found during:** Task 2 verification (anchor build)
- **Issue:** `blake3 v1.8.3` (pulled in via `solana-program v2.3.0`) uses `edition2024` in its Cargo.toml. The Solana SBF compilation toolchain uses `rustc 1.84.1-sbpf-solana-v1.51` (Cargo 1.84.0), which does not support the `edition2024` Cargo feature. This caused `anchor build` to fail with "feature edition2024 is required" during crate download.
- **Fix:** Ran `cargo update blake3 --precise 1.5.5` to downgrade from 1.8.3 to 1.5.5. blake3 1.5.5 uses edition2021 and is compatible with the SBF toolchain.
- **Files modified:** `Cargo.lock`
- **Verification:** `anchor build` completed successfully — `Finished 'release' profile` output confirmed, `target/deploy/bay_mileage_store.so` (267KB) exists, IDL generated with 3 instructions.
- **Committed in:** `90afaa4` (fix(02-01): downgrade blake3 to 1.5.5 to fix SBF build)

---

**Total deviations:** 1 auto-fixed (1 blocking build issue)
**Impact on plan:** The blake3 pin is required for anchor build to succeed with anchor-spl 0.32.1 + solana-program 2.3.0 on the current Solana SBF toolchain. No scope creep.

## Issues Encountered
- The `temp` commit (`2f44346`) had already implemented the full lib.rs before this execution run. Both tasks were pre-applied; execution verified correctness and ran `anchor build` to confirm the implementation compiles.
- `anchor build` failed on first attempt due to blake3 v1.8.3 edition2024 incompatibility with Solana SBF toolchain. Fixed by pinning blake3 to 1.5.5.

## User Setup Required
None - no external service configuration required.

## Next Phase Readiness
- Program binary and IDL are ready for devnet deployment (Phase 2, Plan 02)
- `anchor deploy` will push the .so to devnet using the program ID `3HgyGbc6oQvGMiWxMFCTfk4br1K4Zv6Jy2oR3chCcFag`
- StoreConfig PDA needs to be initialized via `initialize_store` after deployment
- Test wallet `GZuFe8aFbJNeg1HAj7fqzCjsRo18S9jaFTAY8cGLV8p3` has BAY tokens for smoke testing

---
*Phase: 02-program-core*
*Completed: 2026-03-03*

## Self-Check: PASSED

- FOUND: programs/bay-mileage-store/Cargo.toml
- FOUND: programs/bay-mileage-store/src/lib.rs
- FOUND: target/deploy/bay_mileage_store.so
- FOUND: target/idl/bay_mileage_store.json
- FOUND: .planning/phases/02-program-core/02-01-SUMMARY.md
- FOUND commit c1e7cb1 (chore(02-01): add associated_token feature)
- FOUND commit 2f44346 (temp — full lib.rs implementation)
- FOUND commit 90afaa4 (fix(02-01): downgrade blake3 to 1.5.5)
