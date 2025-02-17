use anchor_lang::prelude::*;
use crate::{
    error::ErrorCode,
    state::admin::{AdminConfig, WhitelistEmployer}
};

#[derive(Accounts)]
pub struct RemoveEmployerContext<'info> {
    #[account(mut)]
    pub admin: Signer<'info>,

    #[account(
        constraint = admin_config.admin == admin.key() @ ErrorCode::UnauthorizedAdmin
    )]
    pub admin_config: Account<'info, AdminConfig>,

    #[account(
        mut,
        seeds = [b"employer", employer_account.employer.as_ref()],
        bump = employer_account.employer_bump,
    )]
    pub employer_account: Account<'info, WhitelistEmployer>,
}

impl<'info> RemoveEmployerContext<'info> {
    pub fn remove_employer(
        &mut self,
        employer: Pubkey
    ) -> Result<()> {
        require!(
            self.employer_account.employer == employer && 
            self.employer_account.is_whitelisted == true,
            ErrorCode::NotWhitelisted
        );

        self.employer_account.is_whitelisted = false;
        Ok(())
    }
}