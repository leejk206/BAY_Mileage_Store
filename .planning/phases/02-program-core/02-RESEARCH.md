# Phase 2: Program Core - Research

**Researched:** 2026-02-19
**Domain:** Anchor 0.32 / Solana — on-chain catalog, SPL Token burn CPI, PDA purchase record
**Confidence:** HIGH

---

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|-----------------|
| CAT-01 | 운영자가 상품을 온체인에 등록할 수 있다 (이름, 가격(BAY), 재고) | `add_item` instruction with `#[account(init)]` + PDA seeded on item name; `StoreItem` account struct stores name, price, stock |
| CAT-02 | 상품 목록과 가격을 온체인에서 읽을 수 있다 | No program instruction needed; client reads PDA accounts directly via `getProgramAccounts` using account discriminator filter |
| PUR-01 | 학회원이 BAY 토큰을 소각(burn)하는 구매 트랜잭션을 전송할 수 있다 | `purchase` instruction calls `token::burn` CPI; user ATA is the `from` account; user is the authority signer |
| PUR-02 | 구매 성공 시 온체인에 구매 기록(PDA)이 생성된다 (구매자, 상품, 타임스탬프) | `PurchaseReceipt` account initialized via `#[account(init)]` seeded on buyer pubkey + item pubkey; `Clock::get()?.unix_timestamp` for timestamp |
| PUR-03 | 잔액 부족 시 구매 트랜잭션이 실패한다 | `require_gte!(buyer_token_account.amount, item.price, BayError::InsufficientFunds)` before burn CPI; SPL Token program also natively rejects insufficient balance |
</phase_requirements>

---

## Summary

Phase 2 builds the on-chain Anchor program logic that Phase 1's skeleton currently lacks. Three concerns must be addressed: (1) a catalog of store items that an operator can add to on-chain, (2) a burn-based purchase instruction that destroys BAY tokens equal to the item price, and (3) a PDA-backed purchase receipt that is created on success.

All three concerns map cleanly to standard Anchor 0.32 patterns. Item catalog entries are PDAs seeded by a static prefix plus item name, initialized via `#[account(init)]` and storing name/price/stock as fields. The purchase instruction performs a CPI to the SPL Token Program's `burn` instruction via `anchor-spl`'s `token::burn` helper; the user must be the signer and the authority of their token account. Purchase receipts are new PDAs created within the same purchase transaction, seeded by the buyer's public key and the item's PDA address, and storing buyer, item, and unix timestamp.

**Primary recommendation:** Use one Anchor program with three instructions: `initialize_store` (one-time operator setup with authority), `add_item` (operator-only), and `purchase` (user-facing, burns BAY and creates receipt PDA). Keep the program in a single `lib.rs` for Phase 2 scope; refactor into modules in a future phase if needed.

---

## Standard Stack

### Core

| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| anchor-lang | 0.32.1 | Program framework, account macros, CPI, error handling | Already declared in Cargo.toml; the project's primary framework |
| anchor-spl | 0.32.1 (feature: `token`) | SPL Token CPI wrappers (`token::burn`, `Token` program type, `Mint`, `TokenAccount`) | Already declared in Cargo.toml; provides type-safe burn CPI |
| solana-program | (transitive, via anchor-lang) | `Clock` sysvar for unix timestamp | Part of the standard Anchor prelude |

### Supporting

| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| anchor-spl (feature: `associated_token`) | 0.32.1 | `AssociatedToken` program type and `associated_token::*` constraints | Use in the `purchase` instruction when the buyer's token account is an ATA |

Note: Add `associated_token` to the features list in `programs/bay-mileage-store/Cargo.toml` alongside `token`:

```toml
anchor-spl = { version = "0.32.1", features = ["token", "associated_token"] }
```

### Alternatives Considered

| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| `token::burn` CPI (burns tokens permanently) | Transfer to treasury wallet | burn is the correct semantic — it permanently destroys tokens and is the stated project design decision |
| PDA seeded by `[b"receipt", buyer, item]` | Sequential counter per buyer | Seeds-based derivation is deterministic and stateless; counter requires a separate counter account; seeds approach is simpler |
| Separate `StoreState` authority account | Hardcode operator pubkey in program | PDA-based authority account is upgradeable without redeploying the program |

### Installation

No new dependencies needed. The existing `programs/bay-mileage-store/Cargo.toml` already declares:

```toml
anchor-lang = { version = "0.32.1", features = ["init-if-needed"] }
anchor-spl = { version = "0.32.1", features = ["token"] }
```

Add `associated_token` feature:

```toml
anchor-spl = { version = "0.32.1", features = ["token", "associated_token"] }
```

---

## Architecture Patterns

### Recommended Program Structure

For Phase 2 scope (single `lib.rs` is sufficient):

```
programs/bay-mileage-store/src/
├── lib.rs              # declare_id!, #[program] module with all 3 instructions
│                       # account structs, error enum — all in one file for now
```

Optional modular layout (if lib.rs becomes too long — defer to Phase 3):

```
programs/bay-mileage-store/src/
├── lib.rs              # declare_id!, #[program] module, re-exports
├── state.rs            # StoreConfig, StoreItem, PurchaseReceipt account structs
├── errors.rs           # #[error_code] BayError enum
└── instructions/
    ├── mod.rs
    ├── initialize.rs   # InitializeStore instruction
    ├── add_item.rs     # AddItem instruction
    └── purchase.rs     # Purchase instruction
```

### Pattern 1: Singleton Store Config Account (Operator Authority)

**What:** A single PDA with seeds `[b"store_config"]` acts as the program's global configuration. It stores the operator's public key (`authority: Pubkey`). Every admin instruction checks `has_one = authority` to ensure only the operator can call it.

**When to use:** For all instructions that must be restricted to the operator (CAT-01: `add_item`).

**Example:**

```rust
// Source: anchor-lang.com/docs/references/account-constraints
#[account]
#[derive(InitSpace)]
pub struct StoreConfig {
    pub authority: Pubkey,   // 32 bytes — the operator's wallet
    pub bump: u8,            // 1 byte
}

#[derive(Accounts)]
pub struct InitializeStore<'info> {
    #[account(
        init,
        payer = authority,
        space = 8 + StoreConfig::INIT_SPACE,
        seeds = [b"store_config"],
        bump,
    )]
    pub store_config: Account<'info, StoreConfig>,

    #[account(mut)]
    pub authority: Signer<'info>,

    pub system_program: Program<'info, System>,
}
```

### Pattern 2: Item Catalog Entry (CAT-01, CAT-02)

**What:** Each store item is a PDA seeded by `[b"item", name_bytes]`. The name serves as a natural unique key. `InitSpace` + `#[max_len(32)]` on the `name: String` field handles space calculation automatically.

**When to use:** `add_item` instruction — only callable by the operator (checked via `has_one = authority` on `store_config`).

**Example:**

```rust
// Source: anchor-lang.com/docs/references/space, anchor-lang.com/docs/basics/pda
#[account]
#[derive(InitSpace)]
pub struct StoreItem {
    #[max_len(32)]
    pub name: String,     // 4 + 32 bytes (InitSpace handles this)
    pub price: u64,       // 8 bytes — BAY raw units (price in BAY × 10^6)
    pub stock: u64,       // 8 bytes
    pub bump: u8,         // 1 byte — stored for efficient future lookups
}

#[derive(Accounts)]
#[instruction(name: String)]
pub struct AddItem<'info> {
    #[account(
        init,
        payer = authority,
        space = 8 + StoreItem::INIT_SPACE,
        seeds = [b"item", name.as_bytes()],
        bump,
    )]
    pub item: Account<'info, StoreItem>,

    #[account(
        seeds = [b"store_config"],
        bump = store_config.bump,
        has_one = authority,
    )]
    pub store_config: Account<'info, StoreConfig>,

    #[account(mut)]
    pub authority: Signer<'info>,

    pub system_program: Program<'info, System>,
}
```

Space breakdown: `8 (discriminator) + 4 + 32 (String) + 8 (price) + 8 (stock) + 1 (bump) = 61 bytes`. Using `INIT_SPACE` removes the need for manual arithmetic.

### Pattern 3: SPL Token Burn CPI (PUR-01)

**What:** The `purchase` instruction calls `token::burn` with a CpiContext. The buyer is the signer and authority of their own token account. The `authority` field in the `Burn` struct is the buyer's account info.

**When to use:** Inside the `purchase` instruction after all validations pass.

**Example:**

```rust
// Source: solana.com/developers/guides/games/interact-with-tokens
// Source: github.com/solana-foundation/anchor/blob/master/tests/spl/token-proxy/programs/token-proxy/src/lib.rs

use anchor_spl::token::{self, Burn, Token, TokenAccount, Mint};

#[derive(Accounts)]
pub struct Purchase<'info> {
    #[account(mut)]
    pub buyer: Signer<'info>,

    #[account(
        mut,
        associated_token::mint = bay_mint,
        associated_token::authority = buyer,
    )]
    pub buyer_token_account: Account<'info, TokenAccount>,

    #[account(
        mut,
        address = BAY_MINT_PUBKEY,  // or pass as an account with address constraint
    )]
    pub bay_mint: Account<'info, Mint>,

    #[account(
        mut,
        seeds = [b"item", item.name.as_bytes()],
        bump = item.bump,
    )]
    pub item: Account<'info, StoreItem>,

    #[account(
        init,
        payer = buyer,
        space = 8 + PurchaseReceipt::INIT_SPACE,
        seeds = [b"receipt", buyer.key().as_ref(), item.key().as_ref()],
        bump,
    )]
    pub receipt: Account<'info, PurchaseReceipt>,

    pub token_program: Program<'info, Token>,
    pub associated_token_program: Program<'info, AssociatedToken>,
    pub system_program: Program<'info, System>,
}

pub fn purchase(ctx: Context<Purchase>) -> Result<()> {
    let item = &mut ctx.accounts.item;
    let buyer_token = &ctx.accounts.buyer_token_account;

    // PUR-03: Fail if insufficient balance
    require_gte!(
        buyer_token.amount,
        item.price,
        BayError::InsufficientFunds
    );

    // Decrement stock (optional: add OutOfStock check)
    require!(item.stock > 0, BayError::OutOfStock);
    item.stock -= 1;

    // PUR-01: Burn BAY tokens equal to item price
    let cpi_ctx = CpiContext::new(
        ctx.accounts.token_program.to_account_info(),
        Burn {
            mint: ctx.accounts.bay_mint.to_account_info(),
            from: ctx.accounts.buyer_token_account.to_account_info(),
            authority: ctx.accounts.buyer.to_account_info(),
        },
    );
    token::burn(cpi_ctx, item.price)?;

    // PUR-02: Record the purchase receipt
    let receipt = &mut ctx.accounts.receipt;
    receipt.buyer = ctx.accounts.buyer.key();
    receipt.item = item.key();
    receipt.amount_burned = item.price;
    receipt.timestamp = Clock::get()?.unix_timestamp;
    receipt.bump = ctx.bumps.receipt;

    Ok(())
}
```

### Pattern 4: Purchase Receipt PDA (PUR-02)

**What:** A PDA seeded by `[b"receipt", buyer_pubkey, item_pubkey]` is created inside the purchase transaction. It stores buyer, item address, amount burned, and unix timestamp.

**Important:** This seed combination makes each buyer/item pair unique — a buyer can only hold one receipt per item with this design. If multiple purchases of the same item per buyer are required, add a counter or use a different seed. For the current requirements (which do not mention multiple purchases), this is appropriate.

**Example:**

```rust
// Source: anchor-lang.com/docs/references/space (type sizes)
// Clock: solana.com/developers/cookbook/programs/clock
#[account]
#[derive(InitSpace)]
pub struct PurchaseReceipt {
    pub buyer: Pubkey,         // 32 bytes
    pub item: Pubkey,          // 32 bytes
    pub amount_burned: u64,    // 8 bytes — raw BAY units burned
    pub timestamp: i64,        // 8 bytes — Clock::get()?.unix_timestamp (i64, not u64)
    pub bump: u8,              // 1 byte
}
// INIT_SPACE = 32 + 32 + 8 + 8 + 1 = 81 bytes
// Total space = 8 (discriminator) + 81 = 89 bytes
```

### Pattern 5: Custom Error Codes (PUR-03)

**What:** Anchor's `#[error_code]` enum provides named errors starting at code 6000. Use `require!` / `require_gte!` macros to validate conditions.

**Example:**

```rust
// Source: anchor-lang.com/docs/features/errors
#[error_code]
pub enum BayError {
    #[msg("BAY token balance is insufficient for this purchase")]
    InsufficientFunds,

    #[msg("Item is out of stock")]
    OutOfStock,

    #[msg("Item name exceeds maximum length of 32 characters")]
    NameTooLong,
}
```

### Anti-Patterns to Avoid

- **Using `u64` for `timestamp`:** `Clock::get()?.unix_timestamp` returns `i64`. Store as `i64` to match the type without casting.
- **Not storing `bump` in account data:** Re-deriving bumps is expensive in compute. Store the bump in each account at initialization time.
- **Using `item.name.as_bytes()` as a seed without length validation:** A name longer than 32 bytes will cause the PDA derivation to work but the stored name to be truncated or exceed INIT_SPACE. Validate name length in the instruction before init.
- **Forgetting `#[instruction(name: String)]` on the Accounts struct:** Anchor needs this annotation to reference instruction arguments as seeds. Without it, the `name` variable is not in scope in seed constraints.
- **Re-initialization attack with `init_if_needed`:** Do not use `init_if_needed` for purchase receipts — use `init` to prevent the same buyer from resetting a receipt. `init_if_needed` should only be used with re-initialization guards.
- **Price as BAY whole tokens vs raw units:** The BAY mint has 6 decimals. Store prices as raw units (e.g., `price = 5_000_000` means 5 BAY). The CLI/UI must multiply by 10^6 when displaying. This avoids floating-point in the program.
- **Using `address = <HARDCODED_PUBKEY>` for bay_mint:** Hardcoding the mint pubkey in the program binary ties the program to devnet. Prefer passing it as an account with a stored expected address in `StoreConfig`, or verify it against the `address` stored in `store_config.bay_mint`.

---

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Token burn | Custom raw SPL instruction bytes | `anchor_spl::token::burn` + `CpiContext` | Handles CPI plumbing, account validation, error forwarding |
| Space calculation | Manual byte counting | `#[derive(InitSpace)]` + `INIT_SPACE` constant | Eliminates off-by-one errors, especially with String fields |
| Timestamp | Pass timestamp as instruction argument | `Clock::get()?.unix_timestamp` | Client-provided timestamps are spoofable; sysvar is authoritative |
| Operator auth check | Custom authority comparison | `has_one = authority` constraint on `store_config` | Anchor verifies at deserialization time before your instruction body runs |
| Balance check | `if buyer_token.amount < price { return Err(...) }` | `require_gte!(buyer_token.amount, price, BayError::InsufficientFunds)` | SPL Token program also catches this, but the Anchor check gives a readable custom error code |

**Key insight:** `anchor-spl::token::burn` handles the entire CPI to the SPL Token Program. You only need to provide the three accounts (`mint`, `from`, `authority`) and the amount in raw units. The Token Program itself will reject the transaction if the balance is insufficient (PUR-03 is partially guaranteed by the runtime), but an explicit `require_gte!` gives a better error code.

---

## Common Pitfalls

### Pitfall 1: Seeds Containing Variable-Length Data (String as Seed)

**What goes wrong:** Seeds must be byte slices. `name.as_bytes()` works but seeds have a maximum total length of 32 bytes per seed and 10 seeds total. If the item name exceeds 32 bytes, `create_program_address` will panic or return an error.

**Why it happens:** Solana's `find_program_address` silently truncates or errors on seeds > 32 bytes.

**How to avoid:** Validate name length before using it as a seed. Use `require!(name.len() <= 32, BayError::NameTooLong)` at the start of `add_item`. Alternatively, use a hash of the name as the seed (but this complicates client-side PDA derivation).

**Warning signs:** `InvalidSeeds` error from the runtime when name length exceeds 32 bytes.

### Pitfall 2: Missing `#[instruction(...)]` Attribute When Using Args as Seeds

**What goes wrong:** Anchor instruction arguments used in PDA seeds require the `#[instruction(arg1, arg2)]` attribute on the `#[derive(Accounts)]` struct. Without it, the compiler cannot find `name` in the seed expression `seeds = [b"item", name.as_bytes()]`.

**Why it happens:** Instruction arguments are not automatically in scope within the Accounts derive context.

**How to avoid:** Always add `#[instruction(name: String)]` (or whatever arguments are used as seeds) immediately above `#[derive(Accounts)]`.

**Warning signs:** Compile error: `cannot find value 'name' in this scope` inside the seeds constraint.

### Pitfall 3: Operator Authority Not Checked on `add_item`

**What goes wrong:** If `add_item` does not verify the caller is the operator, any wallet can register items with arbitrary prices.

**Why it happens:** Anchor does not auto-restrict instructions — all authority checks must be explicit.

**How to avoid:** The `StoreConfig` PDA pattern with `has_one = authority` ensures that `store_config.authority == authority.key()`. Since `authority` is a `Signer`, the instruction requires both the correct pubkey and a valid signature.

**Warning signs:** Any wallet successfully calling `add_item` without being the original operator.

### Pitfall 4: `PurchaseReceipt` PDA Uniqueness — One Receipt Per Buyer/Item

**What goes wrong:** Seeds `[b"receipt", buyer.key(), item.key()]` create exactly one receipt per buyer per item. A second purchase of the same item by the same buyer will fail because the PDA already exists (it's already initialized).

**Why it happens:** PDA addresses are deterministic. `init` panics if the account already exists.

**How to avoid:** For Phase 2, this is acceptable — the requirements do not specify repeat purchases. Document this limitation. If multiple purchases are needed in future phases, add a counter seed: `[b"receipt", buyer.key(), item.key(), &count.to_le_bytes()]`.

**Warning signs:** `AccountAlreadyInitialized` error on second purchase of the same item.

### Pitfall 5: `price` Field Units — Raw vs Whole Tokens

**What goes wrong:** Storing the price as whole tokens (e.g., `5` for 5 BAY) and burning `5` raw units instead of `5_000_000` raw units results in burning 0.000005 BAY instead of 5 BAY.

**Why it happens:** The SPL Token burn amount is always in raw units (before decimal adjustment).

**How to avoid:** Define a convention: `price` in `StoreItem` is stored as raw BAY units (10^6 per 1 BAY). The operator sets `price = 5_000_000` for a 5 BAY item. The burn call uses `item.price` directly. The CLI in Phase 3 handles the display conversion.

**Warning signs:** Purchase succeeds but explorer shows an unexpectedly small burned amount.

### Pitfall 6: `anchor deploy` Requires an Existing Program Account with Upgrade Authority

**What goes wrong:** First-time deployment to devnet requires the program account to not exist, or to already be owned by the upgrade authority keypair. If the program keypair file (`target/deploy/bay_mileage_store-keypair.json`) is lost, the program cannot be upgraded.

**Why it happens:** Solana upgradeable programs tie the upgrade authority to the original deployer keypair.

**How to avoid:** Keep the keypair file safe (it's in `.gitignore`). For Phase 2, always use `anchor deploy` from the same machine that ran Phase 1 deployment. The command is: `anchor build && anchor deploy`.

**Warning signs:** `Error: There is no existing program at [address]` or `Unauthorized` during deploy.

---

## Code Examples

Verified patterns from official sources:

### Complete `lib.rs` Skeleton for Phase 2

```rust
// Source: anchor-lang.com/docs/basics/program-structure + patterns above
use anchor_lang::prelude::*;
use anchor_spl::{
    associated_token::AssociatedToken,
    token::{self, Burn, Mint, Token, TokenAccount},
};

declare_id!("3HgyGbc6oQvGMiWxMFCTfk4br1K4Zv6Jy2oR3chCcFag");

#[program]
pub mod bay_mileage_store {
    use super::*;

    pub fn initialize_store(ctx: Context<InitializeStore>) -> Result<()> {
        let config = &mut ctx.accounts.store_config;
        config.authority = ctx.accounts.authority.key();
        config.bump = ctx.bumps.store_config;
        Ok(())
    }

    pub fn add_item(
        ctx: Context<AddItem>,
        name: String,
        price: u64,
        stock: u64,
    ) -> Result<()> {
        require!(name.len() <= 32, BayError::NameTooLong);
        let item = &mut ctx.accounts.item;
        item.name = name;
        item.price = price;   // raw BAY units (multiply whole BAY by 1_000_000)
        item.stock = stock;
        item.bump = ctx.bumps.item;
        Ok(())
    }

    pub fn purchase(ctx: Context<Purchase>) -> Result<()> {
        let item = &ctx.accounts.item;
        let buyer_token = &ctx.accounts.buyer_token_account;

        // PUR-03: balance check
        require_gte!(buyer_token.amount, item.price, BayError::InsufficientFunds);
        require!(item.stock > 0, BayError::OutOfStock);

        // Decrement stock
        ctx.accounts.item.stock -= 1;

        // PUR-01: burn CPI
        let cpi_ctx = CpiContext::new(
            ctx.accounts.token_program.to_account_info(),
            Burn {
                mint: ctx.accounts.bay_mint.to_account_info(),
                from: ctx.accounts.buyer_token_account.to_account_info(),
                authority: ctx.accounts.buyer.to_account_info(),
            },
        );
        token::burn(cpi_ctx, item.price)?;

        // PUR-02: write receipt
        let receipt = &mut ctx.accounts.receipt;
        receipt.buyer = ctx.accounts.buyer.key();
        receipt.item = ctx.accounts.item.key();
        receipt.amount_burned = item.price;
        receipt.timestamp = Clock::get()?.unix_timestamp;
        receipt.bump = ctx.bumps.receipt;

        Ok(())
    }
}

// --- Account Structs ---

#[account]
#[derive(InitSpace)]
pub struct StoreConfig {
    pub authority: Pubkey,  // 32
    pub bump: u8,           // 1
}

#[account]
#[derive(InitSpace)]
pub struct StoreItem {
    #[max_len(32)]
    pub name: String,       // 4 + 32 = 36
    pub price: u64,         // 8 (raw BAY units)
    pub stock: u64,         // 8
    pub bump: u8,           // 1
}

#[account]
#[derive(InitSpace)]
pub struct PurchaseReceipt {
    pub buyer: Pubkey,         // 32
    pub item: Pubkey,          // 32
    pub amount_burned: u64,    // 8
    pub timestamp: i64,        // 8 (i64 — matches Clock::unix_timestamp type)
    pub bump: u8,              // 1
}

// --- Instruction Contexts ---

#[derive(Accounts)]
pub struct InitializeStore<'info> {
    #[account(
        init,
        payer = authority,
        space = 8 + StoreConfig::INIT_SPACE,
        seeds = [b"store_config"],
        bump,
    )]
    pub store_config: Account<'info, StoreConfig>,

    #[account(mut)]
    pub authority: Signer<'info>,

    pub system_program: Program<'info, System>,
}

#[derive(Accounts)]
#[instruction(name: String)]
pub struct AddItem<'info> {
    #[account(
        init,
        payer = authority,
        space = 8 + StoreItem::INIT_SPACE,
        seeds = [b"item", name.as_bytes()],
        bump,
    )]
    pub item: Account<'info, StoreItem>,

    #[account(
        seeds = [b"store_config"],
        bump = store_config.bump,
        has_one = authority,
    )]
    pub store_config: Account<'info, StoreConfig>,

    #[account(mut)]
    pub authority: Signer<'info>,

    pub system_program: Program<'info, System>,
}

#[derive(Accounts)]
pub struct Purchase<'info> {
    #[account(mut)]
    pub buyer: Signer<'info>,

    #[account(
        mut,
        associated_token::mint = bay_mint,
        associated_token::authority = buyer,
    )]
    pub buyer_token_account: Account<'info, TokenAccount>,

    #[account(mut)]
    pub bay_mint: Account<'info, Mint>,

    #[account(mut)]
    pub item: Account<'info, StoreItem>,

    #[account(
        init,
        payer = buyer,
        space = 8 + PurchaseReceipt::INIT_SPACE,
        seeds = [b"receipt", buyer.key().as_ref(), item.key().as_ref()],
        bump,
    )]
    pub receipt: Account<'info, PurchaseReceipt>,

    pub token_program: Program<'info, Token>,
    pub associated_token_program: Program<'info, AssociatedToken>,
    pub system_program: Program<'info, System>,
}

// --- Custom Errors ---

#[error_code]
pub enum BayError {
    #[msg("BAY token balance is insufficient for this purchase")]
    InsufficientFunds,

    #[msg("Item is out of stock")]
    OutOfStock,

    #[msg("Item name must be 32 characters or fewer")]
    NameTooLong,
}
```

### Accessing `ctx.bumps` in Anchor 0.32

```rust
// In Anchor 0.28+, bumps are accessed via ctx.bumps.<field_name>
// NOT ctx.bumps.get("field_name") — that is the old API
config.bump = ctx.bumps.store_config;
item.bump = ctx.bumps.item;
receipt.bump = ctx.bumps.receipt;
```

### Deploy to Devnet

```bash
# Source: anchor-lang.com/docs/references/cli
anchor build
anchor deploy
# Anchor 0.32 automatically uploads IDL after deploy.
# To skip IDL upload: anchor deploy --no-idl
```

---

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| `ctx.bumps.get("account_name")` returning `Option<u8>` | `ctx.bumps.account_name` (direct field access) | Anchor ~0.28 | Old API still compiles but produces deprecation warnings; use field syntax |
| Manual space calculation (`8 + 32 + 8 + 8 + 1`) | `#[derive(InitSpace)]` + `8 + Struct::INIT_SPACE` | Anchor 0.28+ | Eliminates arithmetic bugs, especially with String/Vec fields |
| `anchor verify` using Docker image | `anchor verify` using `solana-verify` | Anchor 0.32.0 | Requires `solana-verify` installed; irrelevant for devnet dev |
| `solanafoundation/anchor` Docker for verifiable builds | `solana-verify` binary | Anchor 0.32.0 | No impact on Phase 2 development workflow |
| `nightly` Rust for IDL generation | stable Rust (1.89.0+) | Anchor 0.32.0 | IDL builds no longer require nightly toolchain |
| `token` feature only in anchor-spl | `token` + `associated_token` features | ongoing | Need both features for ATA constraint in purchase instruction |

**Deprecated/outdated:**
- `ctx.bumps.get("name")`: Still compiles in 0.32 but is old-style. Use `ctx.bumps.account_name`.
- `anchor-spl` with only `token` feature: Insufficient for ATA constraints; add `associated_token`.

---

## Open Questions

1. **Does the `purchase` instruction need to verify `bay_mint` is the genuine BAY mint?**
   - What we know: The `bay_mint` account is passed by the caller. Without an address constraint, any mint could be substituted.
   - What's unclear: Should the BAY mint address be stored in `StoreConfig` and checked via `address = store_config.bay_mint`? Or is it acceptable to trust the ATA constraint (which verifies the buyer_token_account is associated with the passed mint)?
   - Recommendation: Store `bay_mint: Pubkey` in `StoreConfig` and add `address = store_config.bay_mint` on the `bay_mint` account in the `Purchase` context. This is the safest approach and only requires one additional `Pubkey` field in `StoreConfig`.

2. **Does `item` account in `Purchase` need a seed re-derivation check?**
   - What we know: Passing an `item` account without seed constraints means any account of type `StoreItem` could be passed.
   - What's unclear: Is it sufficient to rely on Anchor's discriminator check (prevents passing non-StoreItem accounts), or must the item PDA be re-verified via seeds?
   - Recommendation: Add `seeds = [b"item", item.name.as_bytes()], bump = item.bump` to the `item` account in `Purchase` to ensure it is a legitimate item registered by the program. This prevents substituting a manually crafted fake item account.

3. **Can a buyer purchase the same item more than once?**
   - What we know: With seeds `[b"receipt", buyer, item]`, a second purchase of the same item fails with `AccountAlreadyInitialized`.
   - What's unclear: The current requirements do not specify whether repeat purchases are expected.
   - Recommendation: For Phase 2, document this as a one-receipt-per-buyer-per-item limitation. If the business logic requires multiple purchases of the same item, add a counter field to `StoreItem` tracking per-buyer purchases, or use a different seed strategy (e.g., transaction signature as seed — but this breaks client-side PDA derivation).

---

## Sources

### Primary (HIGH confidence)

- `anchor-lang.com/docs/references/account-constraints` — init, payer, space, seeds, bump, has_one, constraint syntax
- `anchor-lang.com/docs/references/space` — type sizes, InitSpace macro, discriminator requirement
- `anchor-lang.com/docs/basics/pda` — PDA seeds, bump, derivation patterns
- `anchor-lang.com/docs/features/errors` — #[error_code], require!, require_gte! macros
- `anchor-lang.com/docs/updates/release-notes/0-32-0` — Anchor 0.32 breaking changes, IDL generation, bump API
- `solana.com/developers/guides/games/interact-with-tokens` — complete burn CPI example with Burn struct + CpiContext
- `github.com/solana-foundation/anchor/blob/master/tests/spl/token-proxy/programs/token-proxy/src/lib.rs` — ProxyBurn accounts struct and CpiContext::new pattern

### Secondary (MEDIUM confidence)

- WebSearch 2026: Anchor 0.32 InitSpace derive macro pattern — confirmed by anchor-lang.com/docs/references/space
- WebSearch 2026: `Clock::get()?.unix_timestamp` returns `i64` — confirmed by solana-program crate docs + multiple tutorials
- WebSearch 2026: `ctx.bumps.account_name` field syntax (not `.get()`) in 0.32 — confirmed by changelog and multiple sources
- WebSearch 2026: `anchor deploy` auto-uploads IDL in 0.32 — confirmed by release notes

### Tertiary (LOW confidence)

- WebSearch: `seeds = [b"item", name.as_bytes()]` seed truncation at 32 bytes — behavior described in Solana docs; exact error message unverified
- WebSearch: Multiple purchases per buyer/item causing `AccountAlreadyInitialized` — inferred from PDA uniqueness mechanics; not tested

---

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH — anchor-lang and anchor-spl versions verified against existing Cargo.toml + official docs
- Architecture: HIGH — PDA patterns verified against anchor-lang.com official docs; burn CPI verified against official Solana guide and Anchor test suite source
- Pitfalls: MEDIUM — seed length limit (32 bytes) and AccountAlreadyInitialized behavior are well-established Solana mechanics; bump API change verified against changelog
- Code examples: HIGH — pattern structure verified against official sources; specific function/type names cross-referenced with docs.rs and anchor-lang.com

**Research date:** 2026-02-19
**Valid until:** 2026-03-19 (Anchor 0.32.x is in maintenance/pre-1.0 freeze; low churn expected)
