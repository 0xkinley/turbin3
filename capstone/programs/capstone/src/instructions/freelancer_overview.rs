use anchor_lang::prelude::*;
use crate::{
    error::ErrorCode,
    state::{
        admin::{AdminConfig, WhitelistFreelancer},
        freelancer::{FreelancerOverview, RatingStats}
    }
};

#[derive(Accounts)]
#[instruction(freelancer: Pubkey)]
pub struct InitializeFreelancerOverviewContext<'info> {
    #[account(mut)]
    pub admin: Signer<'info>,

    #[account(
        constraint = admin_config.admin == admin.key() @ ErrorCode::UnauthorizedAdmin
    )]
    pub admin_config: Account<'info, AdminConfig>,

    #[account(
        seeds = [b"freelancer", freelancer.as_ref()],
        bump = freelancer_account.freelancer_bump,
        constraint = freelancer_account.freelancer == freelancer @ ErrorCode::InvalidFreelancer
    )]
    pub freelancer_account: Account<'info, WhitelistFreelancer>,

    #[account(
        init,
        payer = admin,
        space = 8 + FreelancerOverview::INIT_SPACE,
        seeds = [b"freelancer_overview", freelancer.as_ref()],
        bump
    )]
    pub freelancer_overview: Account<'info, FreelancerOverview>,

    pub system_program: Program<'info, System>,
}

impl<'info> InitializeFreelancerOverviewContext<'info> {
        pub fn initialize_overview(
            &mut self, 
            freelancer: Pubkey, 
            bump: &InitializeFreelancerOverviewContextBumps
        ) -> Result<()> {
            self.freelancer_overview.set_inner(FreelancerOverview {
                freelancer,
                total_projects_completed: 0,
                rating_stats: RatingStats::default(),
                average_rating: 0.0,
                overview_bump: bump.freelancer_overview
            });
            
            Ok(())
        }
}


