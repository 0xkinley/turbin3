use anchor_lang::prelude::*;
use crate::{
    error::ErrorCode,
    state::admin::{AdminConfig, WhitelistFreelancer}
};

#[derive(Accounts)]
pub struct CheckFreelancerContext<'info> {
    #[account(mut)]
    pub admin: Signer<'info>,

    #[account(
        constraint = admin_config.admin == admin.key() @ ErrorCode::UnauthorizedAdmin
    )]
    pub admin_config: Account<'info, AdminConfig>,

    #[account(
        seeds = [b"freelancer", freelancer_account.freelancer.key().as_ref()],
        bump = freelancer_account.freelancer_bump,
    )]
    pub freelancer_account: Account<'info, WhitelistFreelancer>,
}

impl<'info> CheckFreelancerContext<'info> {
    pub fn contains_freelancer(
        &self,
        freelancer: Pubkey
    ) -> Result<bool> {
        Ok(self.freelancer_account.freelancer == freelancer && 
           self.freelancer_account.is_whitelisted == true)
    }
}