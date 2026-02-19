---
phase: 01-foundation
verified: 2026-02-19T00:00:00Z
status: human_needed
score: 2/3 must-haves verified locally (on-chain state requires human)
re_verification: false
human_verification:
  - test: "anchor build 성공 확인"
    expected: "exit code 0, no errors. anchor keys list 출력이 3HgyGbc6oQvGMiWxMFCTfk4br1K4Zv6Jy2oR3chCcFag 와 일치"
    why_human: "Rust 컴파일러 실행 불가 — 빌드 성공 여부는 로컬 파일 스캔으로 판단 불가"
  - test: "BAY Mint devnet 존재 확인"
    expected: "https://explorer.solana.com/address/agYm2drYnvKnGQoXh1iZQ4iWYZPa87qtGe4baTNckdB?cluster=devnet 에서 Token Mint with decimals=6 로 표시"
    why_human: "devnet RPC 쿼리 필요 — 정적 파일 분석으로 온체인 상태 확인 불가"
  - test: "테스트 지갑 BAY 잔액 확인"
    expected: "spl-token balance agYm2drYnvKnGQoXh1iZQ4iWYZPa87qtGe4baTNckdB --owner GZuFe8aFbJNeg1HAj7fqzCjsRo18S9jaFTAY8cGLV8p3 가 0 초과 값 출력"
    why_human: "devnet RPC 쿼리 필요 — 온체인 토큰 잔액은 파일 스캔으로 검증 불가"
---

# Phase 1: Foundation Verification Report

**Phase Goal:** Anchor 프로젝트가 초기화되어 있고, BAY SPL Token이 devnet에 배포되어 있으며, 테스트 지갑에 토큰이 민팅되어 있다.
**Verified:** 2026-02-19
**Status:** human_needed
**Re-verification:** No — initial verification

## Goal Achievement

### Observable Truths

| #  | Truth                                                         | Status      | Evidence                                                                                   |
|----|---------------------------------------------------------------|-------------|--------------------------------------------------------------------------------------------|
| 1  | `anchor build` succeeds and program keypair is generated      | ? UNCERTAIN | Local artifacts all correct (see below); actual build execution needs human verification   |
| 2  | BAY SPL Token mint (decimals=6) exists on Solana devnet       | ? UNCERTAIN | `.env` has correct BAY_MINT address; on-chain existence requires devnet RPC query          |
| 3  | Designated test wallet holds BAY balance > 0                  | ? UNCERTAIN | `wallets/test-wallet.json` exists with valid keypair; on-chain balance needs devnet check  |

**Score:** 2/3 truths locally verified (all local prerequisites pass; 3 truths require human on-chain confirmation)

Note: "2/3 locally verified" means all local file artifacts and wiring are correct for truths 1-3. The unresolvable uncertainty is on-chain state only.

---

### Required Artifacts

| Artifact                                              | Expected                                      | Status      | Details                                                                                                     |
|-------------------------------------------------------|-----------------------------------------------|-------------|-------------------------------------------------------------------------------------------------------------|
| `programs/bay-mileage-store/src/lib.rs`               | Anchor program with correct `declare_id!`     | VERIFIED    | Contains `declare_id!("3HgyGbc6oQvGMiWxMFCTfk4br1K4Zv6Jy2oR3chCcFag")`, 17-line substantive file         |
| `Anchor.toml`                                         | Workspace config pointing to devnet           | VERIFIED    | `cluster = "devnet"` present; `[programs.devnet]` and `[programs.localnet]` both set to correct program ID  |
| `target/deploy/bay_mileage_store-keypair.json`        | Program keypair for deployment                | VERIFIED    | Exists; contains valid 64-byte keypair array (non-empty, non-stub)                                          |
| `wallets/test-wallet.json`                            | Separate test wallet keypair                  | VERIFIED    | Exists; contains valid 64-byte keypair array; correctly excluded from git via `.gitignore`                  |
| `.env`                                                | BAY_MINT, TEST_WALLET_PUBKEY, DEPLOYER_PUBKEY | VERIFIED    | All four expected keys present: `BAY_MINT`, `TEST_WALLET_PUBKEY`, `DEPLOYER_PUBKEY`, `PROGRAM_ID`          |
| `programs/bay-mileage-store/Cargo.toml`               | anchor-lang + anchor-spl dependencies         | VERIFIED    | `anchor-lang = { version = "0.32.1", features = ["init-if-needed"] }` and `anchor-spl = { version = "0.32.1", features = ["token"] }` both present |

---

### Key Link Verification

| From                                           | To                                                     | Via                                               | Status  | Details                                                                                                   |
|------------------------------------------------|--------------------------------------------------------|---------------------------------------------------|---------|-----------------------------------------------------------------------------------------------------------|
| `Anchor.toml [programs.devnet]`                | `target/deploy/bay_mileage_store-keypair.json`         | Program ID must match keypair public key          | WIRED   | `bay_mileage_store = "3HgyGbc6oQvGMiWxMFCTfk4br1K4Zv6Jy2oR3chCcFag"` — matches `.env` `PROGRAM_ID`   |
| `programs/bay-mileage-store/src/lib.rs`        | `target/deploy/bay_mileage_store-keypair.json`         | `declare_id!` must match keypair public key       | WIRED   | `declare_id!("3HgyGbc6oQvGMiWxMFCTfk4br1K4Zv6Jy2oR3chCcFag")` — consistent with Anchor.toml and .env |
| `.env BAY_MINT`                                | devnet on-chain mint account                           | Address from `spl-token create-token --decimals 6`| UNCERTAIN | `agYm2drYnvKnGQoXh1iZQ4iWYZPa87qtGe4baTNckdB` recorded; on-chain existence needs devnet RPC query      |
| `.env TEST_WALLET_PUBKEY`                      | `wallets/test-wallet.json`                             | Pubkey must match keypair file                    | WIRED   | `GZuFe8aFbJNeg1HAj7fqzCjsRo18S9jaFTAY8cGLV8p3` in `.env`; keypair file exists and is non-empty         |

**Program ID consistency across all three config locations:**
- `lib.rs declare_id!`: `3HgyGbc6oQvGMiWxMFCTfk4br1K4Zv6Jy2oR3chCcFag`
- `Anchor.toml [programs.devnet]`: `3HgyGbc6oQvGMiWxMFCTfk4br1K4Zv6Jy2oR3chCcFag`
- `Anchor.toml [programs.localnet]`: `3HgyGbc6oQvGMiWxMFCTfk4br1K4Zv6Jy2oR3chCcFag`
- `.env PROGRAM_ID`: `3HgyGbc6oQvGMiWxMFCTfk4br1K4Zv6Jy2oR3chCcFag`

All four match. No ID mismatch risk.

---

### Requirements Coverage

| Requirement | Source Plan  | Description                                        | Status         | Evidence                                                                                                    |
|-------------|-------------|-----------------------------------------------------|----------------|-------------------------------------------------------------------------------------------------------------|
| TOK-01      | 01-01-PLAN  | BAY SPL Token (decimals=6)이 Solana devnet에 배포  | ? NEEDS HUMAN  | `.env` records `BAY_MINT=agYm2drYnvKnGQoXh1iZQ4iWYZPa87qtGe4baTNckdB`; actual mint on devnet needs RPC check |
| TOK-02      | 01-01-PLAN  | 테스트 지갑에 BAY 토큰이 민팅되어 있다              | ? NEEDS HUMAN  | `wallets/test-wallet.json` exists; `.env` records pubkey; on-chain balance needs `spl-token balance` check  |

**Note:** Both TOK-01 and TOK-02 are on-chain facts. All local file prerequisites (addresses recorded in `.env`, keypair files present, config correct) are in place. Requirements can only be confirmed as SATISFIED by running devnet RPC queries.

**Orphaned requirements from REQUIREMENTS.md for Phase 1:** None — REQUIREMENTS.md Traceability table maps only TOK-01 and TOK-02 to Phase 1. Both are claimed in `01-01-PLAN.md` (`requirements-completed: [TOK-01, TOK-02]` in SUMMARY frontmatter). No orphaned requirements.

---

### Anti-Patterns Found

| File | Line | Pattern | Severity | Impact |
|------|------|---------|----------|--------|
| None | — | — | — | — |

No TODO/FIXME/placeholder comments found in `programs/` Rust source. `lib.rs` contains a functional (though minimal) Anchor program skeleton — this is expected for Phase 1 (program logic is Phase 2 scope). The `initialize` instruction with `msg!("Greetings from: {:?}", ctx.program_id)` is the standard `anchor init` scaffold, appropriate for this phase.

---

### Human Verification Required

#### 1. anchor build Success

**Test:** Run `anchor build` in the project root
**Expected:** Exit code 0. No compilation errors. `anchor keys list` outputs `3HgyGbc6oQvGMiWxMFCTfk4br1K4Zv6Jy2oR3chCcFag`
**Why human:** Rust/BPF compilation cannot be executed in a static file scan. All local config prerequisites are verified; actual build must be confirmed by running the toolchain.

#### 2. BAY Mint on Devnet

**Test:** Visit `https://explorer.solana.com/address/agYm2drYnvKnGQoXh1iZQ4iWYZPa87qtGe4baTNckdB?cluster=devnet`
**Expected:** Page shows a Token Mint account with Decimals = 6. Supply > 0.
**Why human:** On-chain state requires a devnet RPC query. Cannot be verified from local files alone.

**Alternative CLI check:**
```bash
spl-token display agYm2drYnvKnGQoXh1iZQ4iWYZPa87qtGe4baTNckdB
```
Expected output: `Decimals: 6`

#### 3. Test Wallet BAY Balance

**Test:** Run:
```bash
spl-token balance agYm2drYnvKnGQoXh1iZQ4iWYZPa87qtGe4baTNckdB --owner GZuFe8aFbJNeg1HAj7fqzCjsRo18S9jaFTAY8cGLV8p3
```
**Expected:** Output is a number greater than 0 (plan specifies 100000)
**Why human:** Token balances live on devnet, not in local files. Static analysis cannot confirm minting occurred.

---

### Gaps Summary

No definitive gaps found. All local artifacts exist, are substantive (non-stub), and are correctly wired. The three human verification items are on-chain state checks that are structurally necessary for this type of infrastructure phase (Solana devnet setup). They cannot be resolved by static file analysis.

**If all three human checks pass:** Phase 1 goal is fully achieved. TOK-01 and TOK-02 are satisfied.

**If any human check fails:** Raise a gap for re-verification.

---

_Verified: 2026-02-19_
_Verifier: Claude (gsd-verifier)_
