use anchor_lang::prelude::*;
use crate::{
    error::ErrorCode,
    state::admin::{AdminConfig, WhitelistEmployer}
};

#[derive(Accounts)]
#[instruction(employer: Pubkey)]
pub struct WhitelistEmployerContext<'info> {
    #[account(mut)]
    pub admin: Signer<'info>,

    #[account(
        constraint = admin_config.admin == admin.key() @ ErrorCode::UnauthorizedAdmin
    )]
    pub admin_config: Account<'info, AdminConfig>,

    #[account(
        init,
        payer = admin,
        space = 8 + WhitelistEmployer::INIT_SPACE,
        seeds = [b"employer", employer.as_ref()],
        bump
    )]
    pub employer_account: Account<'info, WhitelistEmployer>,

    pub system_program: Program<'info, System>,
}

impl<'info> WhitelistEmployerContext<'info> {
    pub fn whitelist_employer(
        &mut self,
        employer: Pubkey,
        user_name: String,
        company_name: String,
        bump: &WhitelistEmployerContextBumps
    ) -> Result<()> {
        require!(user_name.len() <= 50, ErrorCode::UserNameTooLong);
        require!(company_name.len() <= 50, ErrorCode::CompanyNameTooLong);
        require!(self.employer_account.is_whitelisted == false, ErrorCode::AlreadyWhitelisted);

        self.employer_account.set_inner(WhitelistEmployer {
            employer,
            user_name,
            company_name,
            is_whitelisted: true,
            employer_bump: bump.employer_account
        });
        Ok(())
    }
}