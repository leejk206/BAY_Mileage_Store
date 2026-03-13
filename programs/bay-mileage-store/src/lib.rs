use anchor_lang::prelude::*;
use anchor_spl::{
    associated_token::AssociatedToken,
    token::{self, Burn, Mint, Token, TokenAccount},
};

declare_id!("8vLkdQq3Ya6ZRx4ApVLsBC6s1aLbS5dkEH29fJa8oMuW");

#[program]
pub mod bay_mileage_store {
    use super::*;

    pub fn initialize_store(ctx: Context<InitializeStore>) -> Result<()> {
        let config = &mut ctx.accounts.store_config;
        config.authority = ctx.accounts.authority.key();
        config.bay_mint = ctx.accounts.bay_mint.key();
        config.bump = ctx.bumps.store_config;
        // 첫 관리자 목록에 초기 authority 를 추가
        config.admins = vec![ctx.accounts.authority.key()];
        Ok(())
    }

    pub fn add_item(
        ctx: Context<AddItem>,
        name: String,
        display_name: String,
        price: u64,
        stock: u64,
        image_url: String,
    ) -> Result<()> {
        // name 은 PDA seed 용 ID 이므로 32바이트 이하, ASCII 로 제한
        require!(name.len() <= 32, BayError::NameTooLong);
        // 간단한 길이 체크 (표시용 이름은 64자 정도 허용)
        require!(display_name.len() <= 64, BayError::NameTooLong);
        // 이미지 URL 은 1024자까지 허용
        require!(image_url.len() <= 1024, BayError::NameTooLong);

        // 관리자 목록에 포함된 지갑만 아이템을 추가할 수 있음
        let config = &ctx.accounts.store_config;
        require!(
            config.admins.contains(&ctx.accounts.authority.key()),
            BayError::UnauthorizedAdmin
        );

        let item = &mut ctx.accounts.item;
        item.name = name;
        item.display_name = display_name;
        item.price = price;
        item.stock = stock;
        item.image_url = image_url;
        item.is_active = true;
        item.bump = ctx.bumps.item;
        Ok(())
    }

    pub fn update_item(
        ctx: Context<UpdateItem>,
        display_name: String,
        price: u64,
        stock: u64,
        image_url: String,
    ) -> Result<()> {
        require!(display_name.len() <= 64, BayError::NameTooLong);
        require!(image_url.len() <= 1024, BayError::NameTooLong);

        let config = &ctx.accounts.store_config;
        require!(
            config.admins.contains(&ctx.accounts.authority.key()),
            BayError::UnauthorizedAdmin
        );

        let item = &mut ctx.accounts.item;
        item.display_name = display_name;
        item.price = price;
        item.stock = stock;
        item.image_url = image_url;
        Ok(())
    }

    pub fn update_config(
        ctx: Context<UpdateConfig>,
        new_bay_mint: Pubkey,
    ) -> Result<()> {
        let config = &mut ctx.accounts.store_config;
        require!(
            config.admins.contains(&ctx.accounts.authority.key()),
            BayError::UnauthorizedAdmin
        );
        config.bay_mint = new_bay_mint;
        Ok(())
    }

    pub fn add_admin(ctx: Context<AddAdmin>, new_admin: Pubkey) -> Result<()> {
        let config = &mut ctx.accounts.store_config;
        // 루트 authority 만 관리자 목록 갱신 가능
        require_keys_eq!(config.authority, ctx.accounts.authority.key());
        if !config.admins.contains(&new_admin) {
            require!(
                config.admins.len() < StoreConfig::MAX_ADMINS,
                BayError::TooManyAdmins
            );
            config.admins.push(new_admin);
        }
        Ok(())
    }

    pub fn remove_admin(ctx: Context<RemoveAdmin>, admin_to_remove: Pubkey) -> Result<()> {
        let config = &mut ctx.accounts.store_config;
        require_keys_eq!(config.authority, ctx.accounts.authority.key());
        // authority 자신은 제거할 수 없도록 보호
        require!(
            admin_to_remove != config.authority,
            BayError::CannotRemoveRootAdmin
        );
        if let Some(pos) = config.admins.iter().position(|k| *k == admin_to_remove) {
            config.admins.remove(pos);
        }
        Ok(())
    }

    pub fn toggle_item_status(ctx: Context<ToggleItemStatus>) -> Result<()> {
        let config = &ctx.accounts.store_config;
        require!(
            config.admins.contains(&ctx.accounts.authority.key()),
            BayError::UnauthorizedAdmin
        );

        let item = &mut ctx.accounts.item;
        item.is_active = !item.is_active;
        Ok(())
    }

    pub fn delete_legacy_item(
        ctx: Context<DeleteLegacyItem>,
        _name: String,
    ) -> Result<()> {
        let config = &ctx.accounts.store_config;
        // 관리자(또는 루트 authority)가 아닌 경우 거부
        require!(
            config.admins.contains(&ctx.accounts.authority.key()),
            BayError::UnauthorizedAdmin
        );

        let legacy = &mut ctx.accounts.legacy_item;
        let authority = &mut ctx.accounts.authority;

        // lamports 회수
        let legacy_lamports = legacy.lamports();
        **authority.lamports.borrow_mut() = authority
            .lamports()
            .checked_add(legacy_lamports)
            .ok_or(ErrorCode::AccountDidNotSerialize)?;
        **legacy.lamports.borrow_mut() = 0;

        // 데이터 0으로 덮어쓰기
        let mut data = legacy.data.borrow_mut();
        for byte in data.iter_mut() {
            *byte = 0;
        }

        Ok(())
    }

    pub fn purchase(ctx: Context<Purchase>) -> Result<()> {
        let item_price = ctx.accounts.item.price;
        let item_stock = ctx.accounts.item.stock;
        let buyer_amount = ctx.accounts.buyer_token_account.amount;

        require_gte!(buyer_amount, item_price, BayError::InsufficientFunds);
        require!(item_stock > 0, BayError::OutOfStock);

        ctx.accounts.item.stock -= 1;

        let cpi_ctx = CpiContext::new(
            ctx.accounts.token_program.to_account_info(),
            Burn {
                mint: ctx.accounts.bay_mint.to_account_info(),
                from: ctx.accounts.buyer_token_account.to_account_info(),
                authority: ctx.accounts.buyer.to_account_info(),
            },
        );
        token::burn(cpi_ctx, item_price)?;

        let counter = &mut ctx.accounts.receipt_counter;
        counter.buyer = ctx.accounts.buyer.key();
        counter.item = ctx.accounts.item.key();
        counter.bump = ctx.bumps.receipt_counter;
        let purchase_index = counter.next_index;

        let receipt = &mut ctx.accounts.receipt;
        receipt.buyer = ctx.accounts.buyer.key();
        receipt.item = ctx.accounts.item.key();
        receipt.amount_burned = item_price;
        receipt.timestamp = Clock::get()?.unix_timestamp;
        receipt.purchase_index = purchase_index;
        receipt.bump = ctx.bumps.receipt;

        counter.next_index = purchase_index
            .checked_add(1)
            .ok_or(ErrorCode::AccountDidNotSerialize)?;

        Ok(())
    }
}

// -- Account Structs ---------------------------------------------------------

#[account]
#[derive(InitSpace)]
pub struct StoreConfig {
    pub authority: Pubkey, // 32 -- root operator wallet
    pub bay_mint: Pubkey,  // 32 -- BAY token mint address
    pub bump: u8,          // 1
    #[max_len(10)]
    pub admins: Vec<Pubkey>, // up to 10 admins
}

impl StoreConfig {
    pub const MAX_ADMINS: usize = 10;
}

#[account]
#[derive(InitSpace)]
pub struct StoreItem {
    #[max_len(32)]
    pub name: String,          // 4 + 32 = 36 (internal ID / PDA seed)
    #[max_len(64)]
    pub display_name: String,  // 4 + 64 = 68 (user-facing name)
    pub price: u64,            // 8 -- raw BAY units (1 BAY = 1_000_000 units)
    pub stock: u64,            // 8
    #[max_len(1024)]
    pub image_url: String,     // 4 + 1024 = 1028 (URL 문자열)
    pub is_active: bool,       // 1 -- whether item is visible/active
    pub bump: u8,              // 1
}

#[account]
#[derive(InitSpace)]
pub struct PurchaseReceipt {
    pub buyer: Pubkey,       // 32
    pub item: Pubkey,        // 32
    pub amount_burned: u64,  // 8 -- raw BAY units burned
    pub timestamp: i64,      // 8 -- Clock::get()?.unix_timestamp (i64, not u64)
    pub purchase_index: u64, // 8 -- monotonically increasing per (buyer, item)
    pub bump: u8,            // 1
}

#[account]
#[derive(InitSpace)]
pub struct ReceiptCounter {
    pub buyer: Pubkey,    // 32
    pub item: Pubkey,     // 32
    pub next_index: u64,  // 8 -- next purchase index for (buyer, item)
    pub bump: u8,         // 1
}

// -- Instruction Contexts ----------------------------------------------------

#[derive(Accounts)]
pub struct InitializeStore<'info> {
    #[account(
        init,
        payer = authority,
        space = 8 + StoreConfig::INIT_SPACE,
        // v3: use a new seed so we can create a fresh StoreConfig
        // without conflicting with any existing store_config_v2 PDA.
        seeds = [b"store_config_v3"],
        bump,
    )]
    pub store_config: Account<'info, StoreConfig>,

    pub bay_mint: Account<'info, Mint>,

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
        seeds = [b"item_v2", name.as_bytes()],
        bump,
    )]
    pub item: Account<'info, StoreItem>,

    #[account(
        seeds = [b"store_config_v3"],
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

    #[account(
        mut,
        address = store_config.bay_mint,
    )]
    pub bay_mint: Account<'info, Mint>,

    #[account(
        seeds = [b"store_config_v3"],
        bump = store_config.bump,
    )]
    pub store_config: Account<'info, StoreConfig>,

    #[account(
        mut,
        seeds = [b"item_v2", item.name.as_bytes()],
        bump = item.bump,
    )]
    pub item: Account<'info, StoreItem>,

    #[account(
        init_if_needed,
        payer = buyer,
        space = 8 + ReceiptCounter::INIT_SPACE,
        seeds = [b"receipt_counter", buyer.key().as_ref(), item.key().as_ref()],
        bump,
    )]
    pub receipt_counter: Account<'info, ReceiptCounter>,

    #[account(
        init,
        payer = buyer,
        space = 8 + PurchaseReceipt::INIT_SPACE,
        seeds = [
            b"receipt",
            buyer.key().as_ref(),
            item.key().as_ref(),
            &receipt_counter.next_index.to_le_bytes()
        ],
        bump,
    )]
    pub receipt: Account<'info, PurchaseReceipt>,

    pub token_program: Program<'info, Token>,
    pub associated_token_program: Program<'info, AssociatedToken>,
    pub system_program: Program<'info, System>,
}

#[derive(Accounts)]
pub struct UpdateItem<'info> {
    #[account(
        mut,
        seeds = [b"item_v2", item.name.as_bytes()],
        bump = item.bump,
    )]
    pub item: Account<'info, StoreItem>,

    #[account(
        seeds = [b"store_config_v3"],
        bump = store_config.bump,
        has_one = authority,
    )]
    pub store_config: Account<'info, StoreConfig>,

    #[account(mut)]
    pub authority: Signer<'info>,
}

#[derive(Accounts)]
pub struct UpdateConfig<'info> {
    #[account(
        mut,
        seeds = [b"store_config_v3"],
        bump = store_config.bump,
        has_one = authority,
    )]
    pub store_config: Account<'info, StoreConfig>,

    #[account(mut)]
    pub authority: Signer<'info>,
}

#[derive(Accounts)]
pub struct ToggleItemStatus<'info> {
    #[account(
        mut,
        seeds = [b"item_v2", item.name.as_bytes()],
        bump = item.bump,
    )]
    pub item: Account<'info, StoreItem>,

    #[account(
        seeds = [b"store_config_v3"],
        bump = store_config.bump,
        has_one = authority,
    )]
    pub store_config: Account<'info, StoreConfig>,

    #[account(mut)]
    pub authority: Signer<'info>,
}

#[derive(Accounts)]
pub struct AddAdmin<'info> {
    #[account(
        mut,
        seeds = [b"store_config_v3"],
        bump = store_config.bump,
        has_one = authority,
    )]
    pub store_config: Account<'info, StoreConfig>,

    #[account(mut)]
    pub authority: Signer<'info>,
}

#[derive(Accounts)]
pub struct RemoveAdmin<'info> {
    #[account(
        mut,
        seeds = [b"store_config_v3"],
        bump = store_config.bump,
        has_one = authority,
    )]
    pub store_config: Account<'info, StoreConfig>,

    #[account(mut)]
    pub authority: Signer<'info>,
}

#[derive(Accounts)]
#[instruction(name: String)]
pub struct DeleteLegacyItem<'info> {
    #[account(mut)]
    pub authority: Signer<'info>,

    #[account(
        seeds = [b"store_config_v3"],
        bump = store_config.bump,
        has_one = authority,
    )]
    pub store_config: Account<'info, StoreConfig>,

    /// CHECK: Legacy v1 item to be closed
    #[account(
        mut,
        seeds = [b"item", name.as_bytes()],
        bump,
    )]
    pub legacy_item: AccountInfo<'info>,
}

// -- Custom Errors -----------------------------------------------------------

#[error_code]
pub enum BayError {
    #[msg("BAY token balance is insufficient for this purchase")]
    InsufficientFunds,

    #[msg("Item is out of stock")]
    OutOfStock,

    #[msg("Item name must be 32 characters or fewer")]
    NameTooLong,

    #[msg("Caller is not an authorized admin")]
    UnauthorizedAdmin,

    #[msg("Too many admins configured")]
    TooManyAdmins,

    #[msg("Cannot remove root authority from admins")]
    CannotRemoveRootAdmin,
}
