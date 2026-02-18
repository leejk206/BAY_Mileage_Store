# Phase 1: Foundation - Research

**Researched:** 2026-02-18
**Domain:** Solana + Anchor Framework + SPL Token CLI (devnet setup)
**Confidence:** HIGH

## Summary

Phase 1 covers two distinct but sequential concerns: (1) initializing an Anchor workspace so that `anchor build` succeeds and a program keypair is generated, and (2) creating a BAY SPL Token mint on devnet and minting tokens to a test wallet. Neither task requires writing any custom Anchor program logic yet — this phase is purely infrastructure.

The standard approach is well-established. Anchor 0.32.1 (via AVM) is the current stable version. `anchor init` generates the full workspace structure. The first build requires a two-step dance to lock in the program ID: build once to generate the keypair, then run `anchor keys sync` (or manually update `declare_id!` in `lib.rs`), then build again. For the SPL token, `spl-token create-token --decimals 6` is the exact CLI command required by the success criteria; the `spl-token` binary ships with `spl-token-cli` and is installed via `cargo install spl-token-cli`.

**Primary recommendation:** Use `anchor init` for workspace initialization, `anchor keys sync` to lock the program ID after first build, and `spl-token` CLI for all token operations on devnet. Do not hand-roll token creation in Rust — this phase is about CLI operations only.

## Standard Stack

### Core

| Tool/Library | Version | Purpose | Why Standard |
|--------------|---------|---------|--------------|
| Anchor CLI (via AVM) | 0.32.1 | Initialize, build, and deploy the Anchor workspace | The leading Solana program framework; required by project constraints |
| Solana CLI | 3.0.10 (stable) | Config, keypair generation, airdrop, balance check | Official Solana toolchain |
| spl-token-cli | latest (cargo install) | Create mint, create token account, mint tokens on devnet | Official SPL token CLI; ships with Solana Program Library |
| Rust | 1.91.1 | Compile Anchor programs (BPF target) | Required by Anchor; managed via rustup |

### Supporting

| Tool | Version | Purpose | When to Use |
|------|---------|---------|-------------|
| AVM (Anchor Version Manager) | latest | Install and switch Anchor versions | Installing Anchor; avoids global version conflicts |
| Node.js | v24.x LTS | Run Anchor test scripts (TypeScript) | Required by `anchor test`; not needed for Phase 1 itself |
| Yarn | 1.22.x | Package manager for Anchor workspace | Auto-detected by Anchor; install alongside Node.js |

### Alternatives Considered

| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| spl-token-cli (cargo) | Anchor program instruction to create token | CLI is simpler and correct for a one-time devnet setup; Anchor-based creation is needed only if mint creation must be on-chain and repeatable via program |
| `anchor keys sync` | Manual edit of `declare_id!` | `anchor keys sync` is automatable; manual edit is error-prone |
| `solana airdrop` CLI | faucet.solana.com web UI | CLI can hit rate limits on devnet; web UI has its own rate limit (2x/8h); both are needed as fallback |

### Installation

```bash
# 1. Install Rust (if not installed)
curl --proto '=https' --tlsv1.2 -sSf https://sh.rustup.rs | sh

# 2. Install Solana CLI (stable)
sh -c "$(curl -sSfL https://release.anza.xyz/stable/install)"

# 3. Install Anchor via AVM
cargo install --git https://github.com/coral-xyz/anchor avm --force
avm install latest
avm use latest  # sets to 0.32.1

# 4. Install spl-token-cli
cargo install spl-token-cli

# 5. Verify
rustc --version && solana --version && anchor --version
spl-token --version
```

## Architecture Patterns

### Recommended Project Structure

After `anchor init bay-mileage-store`, the workspace looks like:

```
bay-mileage-store/
├── Anchor.toml              # Workspace config: cluster, wallet, program IDs
├── Cargo.toml               # Rust workspace manifest
├── package.json             # Node.js dependencies for tests
├── programs/
│   └── bay-mileage-store/
│       ├── Cargo.toml       # Program crate: anchor-lang, anchor-spl deps
│       └── src/
│           ├── lib.rs       # declare_id!, #[program] module
│           ├── constants.rs # (generated, for program constants)
│           ├── error.rs     # (generated, for custom errors)
│           ├── instructions/ # (generated, instruction handlers)
│           └── state/       # (generated, account structs)
├── tests/
│   └── bay-mileage-store.ts # TypeScript integration tests
├── target/
│   ├── deploy/
│   │   ├── bay_mileage_store.so       # Compiled program binary
│   │   └── bay_mileage_store-keypair.json  # Program keypair (DO NOT LOSE)
│   └── idl/
│       └── bay_mileage_store.json     # Generated IDL
└── .anchor/
    └── program-logs/        # Test run logs
```

For Phase 1, only the top level and `programs/` are relevant. The `target/deploy/` directory is created by `anchor build`.

### Pattern 1: First-Build Program ID Workflow

**What:** The first `anchor build` generates a new keypair in `target/deploy/`. The program ID in `lib.rs` (`declare_id!`) must match this keypair's public key. After first build, run `anchor keys sync` to update `declare_id!` automatically, then build again to embed the correct ID in the binary.

**When to use:** Every time you initialize a new Anchor workspace from scratch (i.e., not cloning an existing one).

**Example:**

```bash
# Step 1: Initialize workspace
anchor init bay-mileage-store
cd bay-mileage-store

# Step 2: First build (generates keypair)
anchor build

# Step 3: Sync program ID into lib.rs and Anchor.toml
anchor keys sync

# Step 4: Second build (embeds correct program ID)
anchor build

# Verify program ID
anchor keys list
```

### Pattern 2: Anchor.toml for Devnet

**What:** Change `[provider]` cluster to `devnet` and add a `[programs.devnet]` section with the program ID before deploying.

**Example:**

```toml
# Anchor.toml (after keys sync, before deploy)

[toolchain]
anchor_version = "0.32.1"

[features]
resolution = true
skip-lint = false

[programs.localnet]
bay_mileage_store = "PROGRAM_ID_HERE"

[programs.devnet]
bay_mileage_store = "PROGRAM_ID_HERE"

[registry]
url = "https://api.apr.dev"

[provider]
cluster = "devnet"
wallet = "~/.config/solana/id.json"

[scripts]
test = "yarn run ts-mocha -p ./tsconfig.json -t 1000000 tests/**/*.ts"
```

### Pattern 3: SPL Token Creation Workflow

**What:** Three sequential CLI commands to create a mint, create a token account, and mint tokens.

**When to use:** One-time setup on devnet for BAY token.

**Example:**

```bash
# 0. Configure CLI for devnet
solana config set --url devnet

# 1. Fund the deployer wallet (mint authority = default keypair)
solana airdrop 2
# If rate-limited, use: https://faucet.solana.com/

# 2. Create BAY mint with 6 decimals
spl-token create-token --decimals 6
# Output: Creating token <MINT_ADDRESS>
# Save this address — it is the BAY mint address

# 3. Create a token account for the test wallet
spl-token create-account <MINT_ADDRESS>
# Output: Creating account <TOKEN_ACCOUNT_ADDRESS>

# 4. Mint BAY tokens to the test wallet (e.g., 1,000,000 BAY = 1_000_000_000_000 raw units)
spl-token mint <MINT_ADDRESS> 1000000
# Note: amount is in whole tokens, not raw units — CLI handles decimals

# 5. Verify balance
spl-token balance <MINT_ADDRESS>
```

### Anti-Patterns to Avoid

- **Skipping the second build after keys sync:** The binary compiled before `anchor keys sync` contains a wrong program ID. The program will fail to deploy or deploy to the wrong address.
- **Using `anchor deploy` with localnet cluster for devnet work:** Always set `cluster = "devnet"` in Anchor.toml and `solana config set --url devnet` before devnet operations.
- **Losing the program keypair (`target/deploy/bay_mileage_store-keypair.json`):** This file is the proof of upgrade authority. Without it, you cannot upgrade the program. For a devnet experiment this is recoverable, but keep it safe.
- **Confusing the SPL token amount vs raw units in CLI:** `spl-token mint <MINT> 1000000` mints 1,000,000 whole tokens (= 1,000,000 × 10^6 = 10^12 raw units). The CLI abstracts decimals, so specify whole token amounts.

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Creating SPL mint | Custom Anchor instruction to create token | `spl-token create-token` CLI | Phase 1 is setup, not program logic; CLI does the job in one command |
| Program ID management | Manually editing declare_id! everywhere | `anchor keys sync` | Sync updates both lib.rs and Anchor.toml atomically; manual edit misses one |
| Devnet SOL acquisition | N/A | `solana airdrop` + `faucet.solana.com` | These are the only options; no custom solution needed |
| Checking token balance | Custom RPC query | `spl-token balance <MINT>` or `spl-token accounts` | CLI already provides this |

**Key insight:** Phase 1 is entirely CLI operations. All setup is done with standard tools. No custom code is needed until Phase 2.

## Common Pitfalls

### Pitfall 1: Program ID Mismatch (declare_id! vs keypair)

**What goes wrong:** `anchor build` generates a new keypair in `target/deploy/`. If `declare_id!` in `lib.rs` still has the placeholder value (all 1s) or a stale value, the compiled binary will have a wrong program ID. Deploying this binary will deploy to the keypair's address but the running program will think it is at a different address, causing `DeclaredProgramIdMismatch` errors.

**Why it happens:** `anchor init` pre-fills `declare_id!` with a placeholder. `anchor build` does not automatically update it.

**How to avoid:** Always run `anchor keys sync` after the first `anchor build` in a new workspace, then build again.

**Warning signs:** `anchor keys list` shows a mismatch between the keypair address and the `declare_id!` value.

### Pitfall 2: Rust Toolchain / Cargo.lock Version Conflict

**What goes wrong:** Fresh `anchor build` fails with errors like "lock file version 4 requires `-Znext-lockfile-bump`" or "rustc version mismatch".

**Why it happens:** Anchor 0.30+ uses Rust 1.75+ but some Cargo.lock files are written in version 4 format requiring Rust 1.78+. Solana CLI sometimes uses a different Rust toolchain than the system default.

**How to avoid:** If this error occurs, edit `Cargo.lock` and change `version = 4` to `version = 3`. Alternatively, run `anchor clean && cargo update`.

**Warning signs:** Error message contains "lock file version" or "requires rustc X.Y.Z or newer".

### Pitfall 3: Devnet Airdrop Rate Limits

**What goes wrong:** `solana airdrop 2` returns `Too Many Requests` or fails silently. The wallet has 0 SOL. Subsequent `spl-token` commands fail with "insufficient funds".

**Why it happens:** Devnet airdrop RPC is rate-limited per IP. During high traffic periods, even 1 SOL requests fail.

**How to avoid:** Use `faucet.solana.com` (web UI, up to 5 SOL, 2x per 8 hours with GitHub auth) as the primary source for larger SOL needs. Keep `solana airdrop 1` as fallback for small top-ups.

**Warning signs:** `solana balance` shows 0 after airdrop command appeared to succeed. Always check balance explicitly.

### Pitfall 4: Wrong Cluster Configuration

**What goes wrong:** `spl-token create-token` or `anchor deploy` runs against localnet or mainnet instead of devnet. Token is created locally (not persisted) or on mainnet (real cost).

**Why it happens:** `solana config` and `Anchor.toml` are independent. Setting one does not set the other.

**How to avoid:** Always verify both:
- `solana config get` — check "RPC URL" shows devnet endpoint
- `Anchor.toml` — check `cluster = "devnet"` under `[provider]`

**Warning signs:** Mint address from `spl-token create-token` is not visible on Solana Explorer (devnet).

### Pitfall 5: Test Wallet vs Deploy Wallet Confusion

**What goes wrong:** The default keypair (`~/.config/solana/id.json`) acts as both deployer and mint authority. If a "test wallet" is a separate keypair, it needs its own token account, and minting to it requires specifying the recipient account address explicitly.

**Why it happens:** `spl-token create-account` creates a token account for the current wallet by default. A separate test wallet needs its own `create-account` call.

**How to avoid:** Decide upfront whether the test wallet is the same as the default keypair or a separate keypair. If separate, generate it with `solana-keygen new --outfile test-wallet.json`, fund it with SOL, create its token account, and then mint to that token account.

**Warning signs:** `spl-token balance` shows tokens on wrong wallet; test wallet balance is still 0.

## Code Examples

Verified patterns from official sources:

### Full Devnet Setup Sequence

```bash
# Source: Solana CLI docs + anchor-lang.com/docs/references/cli

# --- Solana CLI Setup ---
solana config set --url devnet
solana-keygen new --outfile ~/.config/solana/id.json   # skip if keypair exists
solana airdrop 2                                        # fund deployer
solana balance                                          # verify

# --- Anchor Project Init ---
anchor init bay-mileage-store
cd bay-mileage-store
anchor build                    # generates target/deploy/bay_mileage_store-keypair.json
anchor keys sync                # updates declare_id! in lib.rs
anchor build                    # recompiles with correct program ID
anchor keys list                # verify: both addresses should match

# --- Anchor.toml: switch to devnet ---
# Edit [provider] cluster = "devnet"
# Add [programs.devnet] bay_mileage_store = "<PROGRAM_ID>"

# --- SPL Token Creation ---
spl-token create-token --decimals 6
# -> saves MINT_ADDRESS

spl-token create-account <MINT_ADDRESS>
# -> saves TOKEN_ACCOUNT

spl-token mint <MINT_ADDRESS> 1000000
# -> 1,000,000 BAY minted

spl-token balance <MINT_ADDRESS>
# -> should show 1000000

# --- Verify on Explorer ---
# https://explorer.solana.com/address/<MINT_ADDRESS>?cluster=devnet
```

### Anchor.toml After Setup

```toml
# Source: anchor-lang.com/docs/references/anchor-toml

[toolchain]
anchor_version = "0.32.1"

[programs.localnet]
bay_mileage_store = "<PROGRAM_ID>"

[programs.devnet]
bay_mileage_store = "<PROGRAM_ID>"

[provider]
cluster = "devnet"
wallet = "~/.config/solana/id.json"

[scripts]
test = "yarn run ts-mocha -p ./tsconfig.json -t 1000000 tests/**/*.ts"
```

### Minimal lib.rs After Keys Sync

```rust
// Source: anchor-lang.com/docs/basics/program-structure
use anchor_lang::prelude::*;

declare_id!("<PROGRAM_ID_FROM_KEYPAIR>");

#[program]
pub mod bay_mileage_store {
    use super::*;

    pub fn initialize(ctx: Context<Initialize>) -> Result<()> {
        Ok(())
    }
}

#[derive(Accounts)]
pub struct Initialize {}
```

### Cargo.toml for anchor-spl (Phase 2 prep, add now)

```toml
# Source: crates.io/crates/anchor-spl, anchor-lang.com/docs/tokens
[dependencies]
anchor-lang = { version = "0.32.1", features = ["init-if-needed"] }
anchor-spl = { version = "0.32.1", features = ["token"] }

[features]
idl-build = ["anchor-lang/idl-build", "anchor-spl/idl-build"]
```

Note: `anchor-spl` is not needed for Phase 1 (no Rust token code yet), but adding it now prevents a re-build at Phase 2 start. The `token` feature enables the legacy Token Program CPI support needed for burn.

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| `anchor deploy` generates new program address each run | Use program keypair in `target/deploy/` to maintain stable address | Anchor 0.x baseline | Always keep keypair; never let anchor generate fresh one after first deploy |
| Manual `declare_id!` editing | `anchor keys sync` command | Anchor ~0.28+ | Automates the ID sync; use this instead of manual edit |
| `spl-token create-token` (Token Program v1) | Token 2022 (`--program-id TokenzQdBNbLqP5VEhdkAS6EPFLC1PHnBqCXEpPxuEb`) for new features | 2024 | For BAY, plain Token Program is correct — no extensions needed; Token 2022 adds complexity without benefit for this project |
| `spl.solana.com/token` documentation | `www.solana-program.com/docs/token` | 2025 (301 redirect) | spl.solana.com now redirects; use solana-program.com for SPL Token docs |

**Deprecated/outdated:**
- `solana-program-library` GitHub repo (`solana-labs/solana-program-library`): Archived March 2025, now read-only. Active repo is `solana-program/token`. CLI tools still work; no action needed for Phase 1.
- Token 2022 for basic fungible tokens: Overkill. Use the original Token Program (`TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA`) via `spl-token create-token --decimals 6` (default).

## Open Questions

1. **Whether `anchor build` for an empty template program is sufficient for success criterion #1**
   - What we know: The success criterion says "`anchor build` succeeds and program ID is generated" — this is satisfied by the default empty program from `anchor init`.
   - What's unclear: Should the Anchor program actually be deployed to devnet in Phase 1, or just built locally? The roadmap says "Anchor 프로젝트가 초기화되어 있고" (initialized), not deployed.
   - Recommendation: Phase 1 success criterion 1 only requires `anchor build` to succeed, not `anchor deploy`. Deploy can be deferred to Phase 2. Keep Phase 1 scope minimal.

2. **Separate test wallet vs default deployer wallet**
   - What we know: Success criterion 3 says "designated test wallet has BAY balance > 0." The phase description doesn't specify whether the test wallet is a new keypair or the default `~/.config/solana/id.json`.
   - What's unclear: Who is the "test wallet" — the operator/deployer or a separate simulated user?
   - Recommendation: Generate a separate test wallet keypair (`solana-keygen new --outfile wallets/test-wallet.json`) to make the distinction explicit. Mint BAY to it, not the deployer wallet. This sets up clean separation for Phase 2 purchase flows.

3. **BAY mint authority retention**
   - What we know: The default deployer keypair becomes the mint authority. Future phases need to mint more BAY for testing.
   - What's unclear: Should mint authority be retained indefinitely or transferred to the Anchor program?
   - Recommendation: Retain mint authority on the deployer keypair for Phase 1 and Phase 2. Phase 1 must not disable it. Do not run `spl-token authorize <MINT> mint --disable`.

## Sources

### Primary (HIGH confidence)
- `anchor-lang.com/docs/references/cli` — anchor init, build, deploy, keys sync commands
- `anchor-lang.com/docs/references/anchor-toml` — all Anchor.toml configuration sections
- `anchor-lang.com/docs/installation` — Anchor 0.32.1 as current version, AVM install
- `anchor-lang.com/docs/quickstart/local` — project structure, build/test workflow
- `solana.com/docs/intro/installation/solana-cli-basics` — config set, keypair new, airdrop, balance
- `solana.com/docs/tokens` — mint account, token account, ATA concepts; spl-token CLI commands
- `www.solana-program.com/docs/token` (redirect from spl.solana.com/token) — create-token, create-account, mint commands
- `anchor-lang.com/docs/tokens` — anchor-spl integration overview

### Secondary (MEDIUM confidence)
- WebSearch 2025: Anchor 0.32.1 is current stable — confirmed by anchor-lang.com installation page
- WebSearch 2025: `solana airdrop` rate limits + faucet.solana.com as fallback — confirmed by multiple sources
- WebSearch 2025: Cargo.lock version 4 conflict with fresh anchor build — confirmed by GitHub issue #3392 on anchor repo

### Tertiary (LOW confidence)
- WebSearch: `anchor keys sync` does not auto-run before build (GitHub issue #3985) — observed behavior, not explicitly documented as official; treat as known quirk
- WebSearch: solana-program-library archived March 2025 — single source; does not affect CLI functionality

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH — versions verified against official anchor-lang.com docs
- Architecture: HIGH — project structure verified against anchor-lang.com/docs/quickstart/local
- Pitfalls: MEDIUM — program ID mismatch is officially documented; Cargo.lock issue from GitHub; others from community reports verified against official behavior
- SPL token workflow: HIGH — commands verified against official Solana token docs

**Research date:** 2026-02-18
**Valid until:** 2026-03-18 (Anchor releases frequently; re-verify if > 30 days old)
