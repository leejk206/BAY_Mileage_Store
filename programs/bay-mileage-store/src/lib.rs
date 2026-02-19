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
        config.bay_mint = ctx.accounts.bay_mint.key();
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
        item.price = price;
        item.stock = stock;
        item.bump = ctx.bumps.item;
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

        let receipt = &mut ctx.accounts.receipt;
        receipt.buyer = ctx.accounts.buyer.key();
        receipt.item = ctx.accounts.item.key();
        receipt.amount_burned = item_price;
        receipt.timestamp = Clock::get()?.unix_timestamp;
        receipt.bump = ctx.bumps.receipt;

        Ok(())
    }
}

// -- Account Structs ---------------------------------------------------------

#[account]
#[derive(InitSpace)]
pub struct StoreConfig {
    pub authority: Pubkey, // 32 -- operator wallet
    pub bay_mint: Pubkey,  // 32 -- BAY token mint address
    pub bump: u8,          // 1
}

#[account]
#[derive(InitSpace)]
pub struct StoreItem {
    #[max_len(32)]
    pub name: String,  // 4 + 32 = 36
    pub price: u64,    // 8 -- raw BAY units (1 BAY = 1_000_000 units)
    pub stock: u64,    // 8
    pub bump: u8,      // 1
}

#[account]
#[derive(InitSpace)]
pub struct PurchaseReceipt {
    pub buyer: Pubkey,       // 32
    pub item: Pubkey,        // 32
    pub amount_burned: u64,  // 8 -- raw BAY units burned
    pub timestamp: i64,      // 8 -- Clock::get()?.unix_timestamp (i64, not u64)
    pub bump: u8,            // 1
}

// -- Instruction Contexts ----------------------------------------------------

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

    #[account(
        mut,
        address = store_config.bay_mint,
    )]
    pub bay_mint: Account<'info, Mint>,

    #[account(
        seeds = [b"store_config"],
        bump = store_config.bump,
    )]
    pub store_config: Account<'info, StoreConfig>,

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

// -- Custom Errors -----------------------------------------------------------

#[error_code]
pub enum BayError {
    #[msg("BAY token balance is insufficient for this purchase")]
    InsufficientFunds,

    #[msg("Item is out of stock")]
    OutOfStock,

    #[msg("Item name must be 32 characters or fewer")]
    NameTooLong,
}
