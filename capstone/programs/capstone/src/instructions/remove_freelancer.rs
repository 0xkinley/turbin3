use anchor_lang::prelude::*;
use crate::{
    error::ErrorCode,
    state::admin::{AdminConfig, WhitelistFreelancer}
};

#[derive(Accounts)]
pub struct RemoveFreelancerContext<'info> {
    #[account(mut)]
    pub admin: Signer<'info>,

    #[account(
        constraint = admin_config.admin == admin.key() @ ErrorCode::UnauthorizedAdmin
    )]
    pub admin_config: Account<'info, AdminConfig>,

    #[account(
        mut,
        seeds = [b"freelancer", freelancer_account.freelancer.key().as_ref()],
        bump = freelancer_account.freelancer_bump,
    )]
    pub freelancer_account: Account<'info, WhitelistFreelancer>,
}

impl<'info> RemoveFreelancerContext<'info> {
    pub fn remove_freelancer(
        &mut self,
        freelancer: Pubkey
    ) -> Result<()> {
        require!(
            self.freelancer_account.freelancer == freelancer && 
            self.freelancer_account.is_whitelisted == true,
            ErrorCode::NotWhitelisted
        );

        self.freelancer_account.is_whitelisted = false;
        Ok(())
    }
}