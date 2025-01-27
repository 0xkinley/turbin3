use anchor_lang::prelude::*;

pub mod state;
pub use state::*;

pub mod instructions;
pub use instructions::*;

pub mod errors;
pub use errors::*;

declare_id!("74Uo2Ex7kEDcDFgimfRxyaKBP2bTScRLHsY1MyAKF6Tt");

#[program]
pub mod escrow {
    use super::*;

    pub fn make_offer(ctx: Context<Make>, seed: u64, amount: u64) -> Result<()> {
        ctx.accounts.init_escrow(seed, amount, &ctx.bumps)?;
        ctx.accounts.deposit(amount)?;
        Ok(())
    }

    pub fn refund(ctx: Context<Refund>) -> Result<()> {
        ctx.accounts.refund_and_close_vault()?;
        Ok(())
    }

    pub fn take_offer(ctx: Context<Take>) -> Result<()>{
        let escrow = &ctx.accounts.escrow;
        msg!("Escrow receive_amount: {}", escrow.receive_amount);
        msg!("Escrow vault amount: {}", ctx.accounts.vault.amount);
        msg!("Taker balance: {}", ctx.accounts.taker_ata_b.amount);
        
        ctx.accounts.deposit()?;
        ctx.accounts.withdraw_and_close_vault()?;
        Ok(())
    }
}


