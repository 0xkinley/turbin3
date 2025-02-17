use anchor_lang::prelude::*;
use crate::{
    error::ErrorCode, state::admin::{AdminConfig, Profession, WhitelistFreelancer}
};

#[derive(Accounts)]
#[instruction(freelancer: Pubkey)]
pub struct WhitelistFreelancerContext<'info> {
    #[account(mut)]
    pub admin: Signer<'info>,

    #[account(
        constraint = admin_config.admin == admin.key() @ ErrorCode::UnauthorizedAdmin
    )]
    pub admin_config: Account<'info, AdminConfig>,
    
    #[account(
        init,
        payer = admin,
        space = 8 + WhitelistFreelancer::INIT_SPACE,
        seeds = [b"freelancer", freelancer.as_ref()],
        bump
    )]
    pub freelancer_account: Account<'info, WhitelistFreelancer>,

    
    pub system_program: Program<'info, System>,
}

impl<'info> WhitelistFreelancerContext<'info> {
    pub fn whitelist_freelancer(
        &mut self,
        freelancer: Pubkey,
        user_name: String,
        profession: Profession,
        bump: &WhitelistFreelancerContextBumps
    ) -> Result<()> {

        require!(user_name.len() <= 50, ErrorCode::UserNameTooLong);
        require!(self.freelancer_account.is_whitelisted == false, ErrorCode::AlreadyWhitelisted);

        self.freelancer_account.set_inner(WhitelistFreelancer{
            freelancer,
            user_name,
            profession,
            is_whitelisted: true,
            freelancer_bump: bump.freelancer_account
        });
        Ok(())
    }
}