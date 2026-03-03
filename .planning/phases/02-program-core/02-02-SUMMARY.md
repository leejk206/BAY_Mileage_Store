---
phase: 02-program-core
plan: "02"
subsystem: infra
tags: [solana, anchor, devnet, smoke-test, spl-token, typescript, mocha]

# Dependency graph
requires:
  - phase: 02-01
    provides: compiled Anchor program binary (bay_mileage_store.so) with initializeStore, addItem, purchase instructions and IDL
  - phase: 01-01
    provides: BAY mint (agYm2drYnvKnGQoXh1iZQ4iWYZPa87qtGe4baTNckdB) and test wallet (GZuFe8aFbJNeg1HAj7fqzCjsRo18S9jaFTAY8cGLV8p3) with BAY balance
provides:
  - Anchor program live on devnet at 3HgyGbc6oQvGMiWxMFCTfk4br1K4Zv6Jy2oR3chCcFag (upgraded binary)
  - StoreConfig PDA initialized on-chain at 9k2Q1pJyDJM5iAQQZpKEn9qWfu9g9BYF2Ypmzoeg6NXn
  - TestBadge StoreItem PDA live on-chain at FbxncLidGgUgzBzK5SwdcsFhuDFCUW2Q2UwnS8hm1wGn
  - PurchaseReceipt PDA for test wallet on-chain (5 BAY burned)
  - STORE_CONFIG_PDA address recorded in .env for Phase 3 client scripts
  - ts-mocha smoke test suite covering all 3 instructions + PUR-03 rejection
affects: [03-client]

# Tech tracking
tech-stack:
  added:
    - "@coral-xyz/anchor — TypeScript Anchor client"
    - "@solana/web3.js — Solana RPC and keypair utilities"
    - "@solana/spl-token — ATA derivation for smoke test"
    - "ts-mocha via tsc+mocha pipeline — test runner for Node 24 ESM compatibility"
    - "yarn.lock — pinned dependency tree"
  patterns:
    - "Smoke test uses tsc+mocha (not ts-mocha directly) for Node 24 ESM compatibility"
    - "require() for JSON IDL import instead of import assertion (Node 24)"
    - "STORE_CONFIG_PDA derived via PublicKey.findProgramAddressSync([Buffer.from('store_config')], programId) and appended to .env"

key-files:
  created:
    - tests/smoke.ts
    - package.json
    - tsconfig.json
    - yarn.lock
  modified:
    - Anchor.toml
    - .env

key-decisions:
  - "Use tsc+mocha pipeline instead of ts-mocha directly — Node 24 ESM compatibility required require() for IDL JSON"
  - "Test wallet had 100 BAY minted; smoke test burned 5 BAY for TestBadge purchase, leaving 95 BAY confirmed on-chain"
  - "PUR-03 failure tested with a fresh keypair (0 BAY) — InsufficientFunds error confirmed"

patterns-established:
  - "Devnet smoke tests: run via npx ts-mocha or tsc+mocha against --skip-local-validator"
  - "PDA derivation in tests mirrors Rust seeds exactly: store_config=[b'store_config'], item=[b'item', name_bytes], receipt=[b'receipt', buyer_pubkey, item_pubkey]"

requirements-completed: [CAT-01, CAT-02, PUR-01, PUR-02, PUR-03]

# Metrics
duration: 60min
completed: 2026-03-03
---

# Phase 2 Plan 02: Program Core Deploy Summary

**Upgraded Anchor program deployed to devnet with all 3 instructions verified on-chain via ts-mocha smoke tests — StoreConfig PDA at 9k2Q1pJyDJM5iAQQZpKEn9qWfu9g9BYF2Ypmzoeg6NXn recorded in .env for Phase 3**

## Performance

- **Duration:** ~60 min
- **Started:** 2026-03-03T04:33:09Z
- **Completed:** 2026-03-03T05:47:31Z
- **Tasks:** 2 (1 auto + 1 human-verify checkpoint)
- **Files modified:** 6 (tests/smoke.ts, package.json, tsconfig.json, yarn.lock, Anchor.toml, .env)

## Accomplishments

- Anchor program binary deployed to devnet — program 3HgyGbc6oQvGMiWxMFCTfk4br1K4Zv6Jy2oR3chCcFag executable and upgraded
- All 3 instructions verified on-chain: initialize_store (StoreConfig PDA created), add_item (TestBadge item PDA created), purchase (5 BAY burned, receipt PDA created)
- PUR-03 confirmed: purchase with 0 BAY balance returns InsufficientFunds error
- Human verified StoreConfig PDA ownership, TestBadge item account data, test wallet BAY balance (100 → 95), and PUR-03 rejection in smoke output
- STORE_CONFIG_PDA=9k2Q1pJyDJM5iAQQZpKEn9qWfu9g9BYF2Ypmzoeg6NXn appended to .env — ready for Phase 3 client scripts

## Task Commits

Each task was committed atomically:

1. **Task 1: Deploy upgraded program to devnet and run on-chain smoke tests** - `05f979f` (chore) + `f9e7181` (feat)

**Plan metadata:** _(this summary commit)_ (docs: complete plan)

_Note: Task 1 has two commits — infrastructure setup then final deploy+test pass after fixes._

## Files Created/Modified

- `tests/smoke.ts` — smoke test script: initializeStore, addItem, purchase (success + PUR-03 failure), appends STORE_CONFIG_PDA to .env
- `package.json` — added @coral-xyz/anchor, @solana/web3.js, @solana/spl-token, ts-mocha, mocha, typescript devDeps; scripts for test runner
- `tsconfig.json` — TypeScript config targeting ES2020 with CommonJS modules for Node 24 compatibility
- `yarn.lock` — pinned dependency tree
- `Anchor.toml` — fixed deployer wallet path from Windows backslash to absolute forward-slash path; added [scripts] test entry
- `.env` — appended STORE_CONFIG_PDA=9k2Q1pJyDJM5iAQQZpKEn9qWfu9g9BYF2Ypmzoeg6NXn

## Decisions Made

- Used `tsc` compile then `mocha dist/` pipeline instead of `ts-mocha` directly — Node 24 requires CommonJS output and `require()` for JSON IDL; `ts-mocha` with `import` assertions fails at runtime
- Fresh keypair (0 SOL/BAY) used for PUR-03 test — simpler than manipulating existing wallet balance; confirms InsufficientFunds path without side effects

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] Fixed ESM/CommonJS import incompatibility for IDL JSON under Node 24**
- **Found during:** Task 1 (deploy and smoke test run)
- **Issue:** `ts-mocha` with TypeScript `import` assertion for IDL JSON failed at runtime under Node 24 — `ERR_IMPORT_ASSERTION_TYPE_UNSUPPORTED`
- **Fix:** Changed IDL import to `require()` call; switched test runner from direct `ts-mocha` to `tsc` compile + `mocha` on output JS
- **Files modified:** `tests/smoke.ts`, `package.json`, `Anchor.toml`
- **Verification:** All 4 smoke test steps passed (3 tx signatures + PUR-03 rejection log)
- **Committed in:** f9e7181 (Task 1 final commit)

---

**Total deviations:** 1 auto-fixed (1 bug)
**Impact on plan:** Fix was necessary for Node 24 compatibility. No scope creep — same test coverage as planned.

## Issues Encountered

- Anchor.toml had Windows backslash path for deployer keypair (`~\.config\solana\id.json`) — fixed to absolute forward-slash path (`C:/solana/id.json`) for cross-shell compatibility
- Deployer needed a small airdrop before deploy could proceed — handled automatically during Task 1

## User Setup Required

None — no external service configuration required beyond what was already in .env.

## Next Phase Readiness

- All Phase 2 requirements (CAT-01, CAT-02, PUR-01, PUR-02, PUR-03) verified on-chain
- STORE_CONFIG_PDA in .env is ready for Phase 3 client scripts to reference
- Program IDL at `target/idl/bay_mileage_store.json` is the source of truth for all 3 instruction ABIs
- Phase 3 can begin immediately: list-items.ts, buy.ts, history.ts client scripts

---
*Phase: 02-program-core*
*Completed: 2026-03-03*

## Self-Check: PASSED

- FOUND: .planning/phases/02-program-core/02-02-SUMMARY.md
- FOUND: tests/smoke.ts
- FOUND: package.json
- FOUND: .env
- FOUND commit: f9e7181 (feat(02-02): deploy program to devnet and pass all smoke tests)
- FOUND commit: 05f979f (chore(02-02): add test infrastructure and smoke test)
