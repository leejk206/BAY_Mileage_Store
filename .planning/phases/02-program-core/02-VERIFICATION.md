---
phase: 02-program-core
verified: 2026-03-03T09:00:00Z
status: passed
score: 5/5 must-haves verified
re_verification: false
gaps: []
human_verification:
  - test: "Confirm devnet on-chain state via Solana Explorer"
    expected: "StoreConfig PDA at 9k2Q1pJyDJM5iAQQZpKEn9qWfu9g9BYF2Ypmzoeg6NXn is owned by program 3HgyGbc6oQvGMiWxMFCTfk4br1K4Zv6Jy2oR3chCcFag; TestBadge item PDA exists with price=5_000_000, stock=9; PurchaseReceipt PDA has buyer=GZuFe8aFbJNeg1HAj7fqzCjsRo18S9jaFTAY8cGLV8p3 and non-zero timestamp"
    why_human: "Cannot programmatically query devnet RPC from a static verifier; on-chain account existence and field values require a live RPC call or Explorer confirmation. The SUMMARY documents human approval was given during task 2 checkpoint."
---

# Phase 02: Program Core Verification Report

**Phase Goal:** Anchor 프로그램에서 운영자가 상품을 등록할 수 있고, 학회원이 BAY를 소각해 구매할 수 있으며, 구매 기록이 온체인 PDA에 저장된다.

(Operator can register items in the Anchor program; association members can purchase by burning BAY; purchase records are stored in on-chain PDAs.)

**Verified:** 2026-03-03T09:00:00Z
**Status:** passed (with one human verification item for live devnet state)
**Re-verification:** No — initial verification

---

## Goal Achievement

### Observable Truths

| # | Truth | Status | Evidence |
|---|-------|--------|----------|
| 1 | Operator can register a store item on-chain with name, price (raw BAY units), and stock | VERIFIED | `add_item(name, price, stock)` instruction in lib.rs lines 21-34; StoreItem PDA seeds `[b"item", name.as_bytes()]`; `has_one = authority` constraint on StoreConfig enforces operator-only access |
| 2 | Item catalog PDAs are readable on-chain via getProgramAccounts with discriminator filter | VERIFIED | StoreItem account struct exported in lib.rs; IDL contains StoreItem type with discriminator `[173, 219, 178, 191, 78, 194, 67, 54]`; account fields name/price/stock fully populated in add_item |
| 3 | Buyer can send a purchase transaction that burns BAY tokens equal to the item price | VERIFIED | `purchase()` instruction lines 36-64; `token::burn(cpi_ctx, item_price)?` at line 54; CpiContext constructed with Burn { mint, from, authority }; burns exactly `item_price` raw units |
| 4 | A successful purchase creates a PurchaseReceipt PDA with buyer, item, and timestamp | VERIFIED | PurchaseReceipt PDA initialized in purchase instruction: `receipt.buyer`, `receipt.item`, `receipt.amount_burned`, `receipt.timestamp = Clock::get()?.unix_timestamp` (lines 56-61); seeds `[b"receipt", buyer.key(), item.key()]` |
| 5 | A purchase with insufficient BAY balance fails with BayError::InsufficientFunds | VERIFIED | `require_gte!(buyer_amount, item_price, BayError::InsufficientFunds)` at line 41; error code 6000 in IDL; smoke test task d confirms rejection with `assert.ok(errorCaught)` |

**Score: 5/5 truths verified**

---

### Required Artifacts

| Artifact | Expected | Status | Details |
|----------|----------|--------|---------|
| `programs/bay-mileage-store/src/lib.rs` | Full Anchor program with 3 instructions and 3 PDAs | VERIFIED | 200 lines; exports initialize_store, add_item, purchase, StoreConfig, StoreItem, PurchaseReceipt, BayError; no stubs or placeholders |
| `programs/bay-mileage-store/Cargo.toml` | anchor-spl with token + associated_token features | VERIFIED | Line 25: `anchor-spl = { version = "0.32.1", features = ["token", "associated_token"] }` |
| `target/idl/bay_mileage_store.json` | IDL with 3 instructions (add_item, initialize_store, purchase) | VERIFIED | 483 lines; 3 instructions, 3 account types (PurchaseReceipt, StoreConfig, StoreItem), 3 error codes |
| `target/deploy/bay_mileage_store.so` | Compiled BPF binary | VERIFIED | 267,808 bytes at target/deploy/bay_mileage_store.so (modified 2026-03-03) |
| `tests/smoke.ts` | Smoke test covering all 3 instructions + PUR-03 rejection | VERIFIED | 321 lines; tests a) initialize_store, b) add_item, c) purchase success, d) PUR-03 failure with errorCaught assertion, e) .env record |
| `.env` | STORE_CONFIG_PDA address recorded | VERIFIED | Contains `STORE_CONFIG_PDA=9k2Q1pJyDJM5iAQQZpKEn9qWfu9g9BYF2Ypmzoeg6NXn` |
| `wallets/test-wallet.json` | Test wallet keypair for smoke tests | VERIFIED | File exists (228 bytes) |

---

### Key Link Verification

| From | To | Via | Status | Details |
|------|----|-----|--------|---------|
| `purchase` instruction | `anchor_spl::token::burn` | `CpiContext::new` with `Burn { mint, from, authority }` | VERIFIED | `token::burn(cpi_ctx, item_price)?` at lib.rs line 54; burns `item_price` raw units, not a stub |
| `purchase` instruction | PurchaseReceipt PDA | `account(init)` with seeds `[b"receipt", buyer.key(), item.key()]` | VERIFIED | lib.rs line 178: `seeds = [b"receipt", buyer.key().as_ref(), item.key().as_ref()]`; fields populated lines 57-61 |
| `add_item` instruction | StoreConfig authority check | `has_one = authority` constraint | VERIFIED | lib.rs line 133: `has_one = authority` in AddItem context; prevents non-operator registration |
| `purchase` instruction | bay_mint address verification | `address = store_config.bay_mint` constraint | VERIFIED | lib.rs line 157: `address = store_config.bay_mint`; prevents mint substitution attack |
| `smoke.ts` test d | InsufficientFunds error path | try/catch with error message pattern match | VERIFIED | smoke.ts lines 265-296; checks for "InsufficientFunds", "0x1770", or "BAY token balance is insufficient"; `assert.ok(errorCaught)` ensures test fails if error not thrown |
| `.env` | STORE_CONFIG_PDA | appended by test task e | VERIFIED | .env line 5: `STORE_CONFIG_PDA=9k2Q1pJyDJM5iAQQZpKEn9qWfu9g9BYF2Ypmzoeg6NXn` |

---

### Requirements Coverage

| Requirement | Source Plan | Description | Status | Evidence |
|-------------|------------|-------------|--------|----------|
| CAT-01 | 02-01-PLAN.md, 02-02-PLAN.md | 운영자가 상품을 온체인에 등록할 수 있다 (이름, 가격(BAY), 재고) | SATISFIED | `add_item(name: String, price: u64, stock: u64)` instruction with `has_one = authority` enforces operator-only access; StoreItem PDA stores all three fields |
| CAT-02 | 02-01-PLAN.md, 02-02-PLAN.md | 상품 목록과 가격을 온체인에서 읽을 수 있다 | SATISFIED | StoreItem account struct and discriminator in IDL enable `getProgramAccounts` filtering; name, price, stock fields are public and readable |
| PUR-01 | 02-01-PLAN.md, 02-02-PLAN.md | 학회원이 BAY 토큰을 소각(burn)하는 구매 트랜잭션을 전송할 수 있다 | SATISFIED | `purchase()` instruction performs `token::burn(cpi_ctx, item_price)` CPI; any signer with sufficient BAY balance can call it |
| PUR-02 | 02-01-PLAN.md, 02-02-PLAN.md | 구매 성공 시 온체인에 구매 기록(PDA)이 생성된다 (구매자, 상품, 타임스탬프) | SATISFIED | PurchaseReceipt PDA initialized with buyer, item, amount_burned, timestamp (Clock::get().unix_timestamp); smoke test task c confirms on-chain creation |
| PUR-03 | 02-01-PLAN.md, 02-02-PLAN.md | 잔액 부족 시 구매 트랜잭션이 실패한다 | SATISFIED | `require_gte!(buyer_amount, item_price, BayError::InsufficientFunds)` at lib.rs line 41; error code 6000 in IDL; smoke test task d verifies rejection with `assert.ok(errorCaught)` |

**All 5 requirements satisfied. No orphaned requirements.**

---

### Anti-Patterns Found

| File | Pattern | Severity | Impact |
|------|---------|----------|--------|
| None | — | — | No TODO, FIXME, placeholder, empty handler, or stub return patterns found in lib.rs or smoke.ts |

---

### Human Verification Required

#### 1. Devnet On-Chain State Confirmation

**Test:** Visit Solana Explorer (devnet) and verify:
- StoreConfig PDA `9k2Q1pJyDJM5iAQQZpKEn9qWfu9g9BYF2Ypmzoeg6NXn` is owned by program `3HgyGbc6oQvGMiWxMFCTfk4br1K4Zv6Jy2oR3chCcFag`
- TestBadge item PDA (derive: seeds=[b"item", b"TestBadge"], programId=3HgyGbc6...) exists with price=5_000_000 and stock decremented to 9
- A PurchaseReceipt PDA exists for test wallet `GZuFe8aFbJNeg1HAj7fqzCjsRo18S9jaFTAY8cGLV8p3` with a non-zero unix_timestamp

**Expected:** All three accounts exist on devnet with correct field values. Test wallet BAY balance is 95 BAY (100 minted minus 5 burned).

**Why human:** Cannot query a live devnet RPC from this static verifier. The 02-02-SUMMARY.md documents that the human checkpoint (Task 2) was approved after observing the smoke test output and confirming on-chain accounts. This verification item is a re-confirmation gate for the auditor.

---

### Gaps Summary

No gaps. All 5 observable truths are verified against the actual codebase:

- `lib.rs` is a fully substantive 200-line implementation (not a stub): 3 instructions with complete logic, 3 PDA account structs, 3 custom error variants.
- All key links are present and wired: burn CPI executes `token::burn` with the actual `item_price` amount; receipt PDA is initialized with all required fields including `Clock::get()` timestamp; authority gating via `has_one` is enforced in AddItem context.
- The IDL is generated from actual compilation (267KB .so binary present), not hand-crafted — it reflects the real program.
- The smoke test suite is substantive: it exercises all 3 instructions against devnet RPC, uses `assert.ok()` for each, and verifies PUR-03 with a proper `errorCaught` assertion (not just a log).
- `.env` contains `STORE_CONFIG_PDA` value confirming the deploy-and-initialize cycle completed.

The only item requiring human confirmation is live devnet state, which cannot be verified statically. The SUMMARY documents that a human checkpoint was passed during execution.

---

_Verified: 2026-03-03T09:00:00Z_
_Verifier: Claude (gsd-verifier)_
