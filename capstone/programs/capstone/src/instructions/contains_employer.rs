use anchor_lang::prelude::*;
use crate::{
    error::ErrorCode,
    state::admin::{AdminConfig, WhitelistEmployer}
};

#[derive(Accounts)]
pub struct CheckEmployerContext<'info> {
    #[account(mut)]
    pub admin: Signer<'info>,

    #[account(
        constraint = admin_config.admin == admin.key() @ ErrorCode::UnauthorizedAdmin
    )]
    pub admin_config: Account<'info, AdminConfig>,

    #[account(
        seeds = [b"employer", employer_account.employer.as_ref()],
        bump = employer_account.employer_bump,
    )]
    pub employer_account: Account<'info, WhitelistEmployer>,
}

impl<'info> CheckEmployerContext<'info> {
    pub fn contains_employer(
        &self,
        employer: Pubkey
    ) -> Result<bool> {
        Ok(self.employer_account.employer == employer && 
           self.employer_account.is_whitelisted == true)
    }
}