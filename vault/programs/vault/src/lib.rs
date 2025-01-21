use anchor_lang::{prelude::*, system_program::{transfer, Transfer}};

declare_id!("BfbSEiML6f23QyDjsFjUBUCnAHXFSq9Hmtg2nSLdXP3N");

#[program]
pub mod vault {
    use super::*;

    pub fn initialize(ctx: Context<Initialize>) -> Result<()> {
        let _ = ctx.accounts.initialize(ctx.bumps);
        Ok(())
    }

    pub fn deposit(ctx: Context<Deposit>, amount: u64) -> Result<()> {
        let _ = ctx.accounts.deposit(amount);
        Ok(())
    }

    pub fn withdraw(ctx: Context<Withdraw>, amount: u64) -> Result<()> {
        let _ = ctx.accounts.withdraw(amount);
        Ok(())
    }

    pub fn close(ctx: Context<Close>) -> Result<()> {
        let _ = ctx.accounts.close();
        Ok(())
    }
}

#[account]
#[derive(InitSpace)]
pub struct VaultState{
    pub vault_bump: u8,
    pub state_bump: u8
}

#[derive(Accounts)]
pub struct Initialize<'info> {

    #[account(mut)]
    pub signer: Signer<'info>,

    #[account(
        init,
        payer = signer,
        space = 8 + VaultState::INIT_SPACE,
        seeds = [b"state", signer.key().as_ref()],
        bump 
    )]
    pub vault_state: Account<'info, VaultState>,

    #[account(
        seeds = [b"vault", vault_state.key().as_ref()],
        bump
    )]
    pub vault: SystemAccount<'info>,

    pub system_program: Program<'info, System>,
}

impl<'info> Initialize <'info> {

    pub fn initialize(&mut self, bumps: InitializeBumps) -> Result<()>{
        self.vault_state.vault_bump = bumps.vault;
        self.vault_state.state_bump = bumps.vault_state;

        Ok(())
    }
}

#[derive(Accounts)]
pub struct Deposit<'info> {

    #[account(mut)]
    pub signer: Signer<'info>,

    #[account(
        seeds = [b"state", signer.key().as_ref()],
        bump = vault_state.state_bump
    )]
    pub vault_state: Account<'info, VaultState>,

    #[account(
        mut,
        seeds = [b"vault", vault_state.key().as_ref()],
        bump = vault_state.vault_bump
    )]
    pub vault: SystemAccount<'info>,

    pub system_program: Program<'info, System>,
}

impl<'info> Deposit <'info> {

    pub fn deposit(&mut self, amount: u64) -> Result<()>{
        let system_program= self.system_program.to_account_info();
        let accounts = Transfer {
            from: self.signer.to_account_info(),
            to: self.vault.to_account_info(),
        };

        let cpi_context = CpiContext::new(system_program, accounts);

        transfer(cpi_context, amount)?;
        Ok(())
    }
}

#[derive(Accounts)]
pub struct Withdraw<'info> {

    #[account(mut)]
    pub signer: Signer<'info>,

    #[account(
        seeds = [b"state", signer.key().as_ref()],
        bump = vault_state.state_bump
    )]
    pub vault_state: Account<'info, VaultState>,

    #[account(
        mut,
        seeds = [b"vault", vault_state.key().as_ref()],
        bump = vault_state.vault_bump
    )]
    pub vault: SystemAccount<'info>,

    pub system_program: Program<'info, System>,
}

impl<'info> Withdraw <'info> {

    pub fn withdraw(&mut self, amount: u64) -> Result<()>{
        let system_program= self.system_program.to_account_info();
        let accounts = Transfer {
            from: self.vault.to_account_info(),
            to: self.signer.to_account_info(),
        };

        let vault_bump = self.vault_state.vault_bump;
        let vault_state_key = self.vault_state.to_account_info().key;
        let seeds = &[
            b"vault", 
            vault_state_key.as_ref(), 
            &[vault_bump]];
        let signer_seeds = &[&seeds[..]];

        let cpi_context = CpiContext::new_with_signer(system_program, accounts, signer_seeds);

        transfer(cpi_context, amount)?;
        Ok(())
    }
}

#[derive(Accounts)]
pub struct Close <'info> {

    #[account(mut)]
    pub signer: Signer<'info>,

    #[account(
        mut,
        seeds = [b"state", signer.key().as_ref()],
        bump = vault_state.state_bump
    )]
    pub vault_state: Account<'info, VaultState>,

    #[account(
        mut,
        seeds = [b"vault",vault_state.key().as_ref()],
        bump = vault_state.vault_bump
    )]
    pub vault: SystemAccount<'info>,

    pub system_program: Program<'info, System>,
}

impl<'info> Close <'info> {

    pub fn close(&mut self) -> Result<()>{
        let system_program= self.system_program.to_account_info();
        let accounts = Transfer {
            from: self.vault.to_account_info(),
            to: self.signer.to_account_info(),
        };

        let vault_bump = self.vault_state.vault_bump;
        let vault_state_key = self.vault_state.to_account_info().key;
        let seeds = &[
            b"vault", 
            vault_state_key.as_ref(), 
            &[vault_bump]];
        let signer_seeds = &[&seeds[..]];

        let cpi_context = CpiContext::new_with_signer(system_program, accounts, signer_seeds);

        transfer(cpi_context, self.vault.lamports())?;
        Ok(())
    }
}
