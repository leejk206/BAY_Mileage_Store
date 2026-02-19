use anchor_lang::prelude::*;

declare_id!("3HgyGbc6oQvGMiWxMFCTfk4br1K4Zv6Jy2oR3chCcFag");

#[program]
pub mod bay_mileage_store {
    use super::*;

    pub fn initialize(ctx: Context<Initialize>) -> Result<()> {
        msg!("Greetings from: {:?}", ctx.program_id);
        Ok(())
    }
}

#[derive(Accounts)]
pub struct Initialize {}
