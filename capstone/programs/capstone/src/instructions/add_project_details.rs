use anchor_lang::prelude::*;
use crate::{
    error::ErrorCode,
    state::{
        admin::{WhitelistEmployer, Profession},
        employer::{Project, ProjectDetails, ProjectStatus}
    }
};

#[derive(Accounts)]
pub struct AddProjectDetailsContext<'info>{
    #[account(mut)]
    pub employer: Signer<'info>,

    #[account(
        seeds = [b"employer", employer.key().as_ref()],
        bump = employer_account.employer_bump,
        constraint = employer_account.employer == employer.key() && 
                    employer_account.is_whitelisted == true @ ErrorCode::UnauthorizedEmployer
    )]
    pub employer_account: Account<'info, WhitelistEmployer>,

    #[account(
        mut,
        seeds = [b"project",project.employer.as_ref(),project.project_number.to_le_bytes().as_ref()],
        bump = project.project_bump,
        constraint = project.employer == employer.key() @ ErrorCode::UnauthorizedEmployer,
        constraint = project.project_status == ProjectStatus::Open @ ErrorCode::ProjectNotCreated
    )]
    pub project: Account<'info, Project>,

    #[account(
        init,
        payer = employer,
        space = 8 + ProjectDetails::INIT_SPACE,
        seeds = [b"project_details", project.key().as_ref()],
        bump
    )]
    pub project_details: Account<'info, ProjectDetails>,

    pub system_program: Program<'info, System>,
}

impl<'info> AddProjectDetailsContext<'info> {
    pub fn add_project_details(
        &mut self,
        description: String,
        requirements: Profession,
        deadline: i64,
        bump: &AddProjectDetailsContextBumps
    ) -> Result<()> {
        require!(description.len() <= 1000, ErrorCode::DescriptionTooLong);
        
        let current_time = Clock::get()?.unix_timestamp;
        require!(deadline > current_time, ErrorCode::InvalidDeadline);

        self.project_details.set_inner(ProjectDetails {
            project: self.project.key(),
            description,
            requirements,
            deadline,
            assigned_freelancer: None,
            details_bump: bump.project_details
        });

        Ok(())
    }
}