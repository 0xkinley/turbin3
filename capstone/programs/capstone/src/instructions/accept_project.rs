use anchor_lang::prelude::*;
use crate::{
    error::ErrorCode,
    state::{
        admin::WhitelistFreelancer,
        employer::{Project, ProjectDetails, ProjectStatus}
    }
};

#[derive(Accounts)]
pub struct AcceptProjectContext<'info> {
    #[account(mut)]
    pub freelancer: Signer<'info>,

    #[account(
        seeds = [b"freelancer", freelancer.key().as_ref()],
        bump = freelancer_account.freelancer_bump,
        constraint = freelancer_account.freelancer == freelancer.key() && 
                    freelancer_account.is_whitelisted == true @ ErrorCode::UnauthorizedFreelancer
    )]
    pub freelancer_account: Account<'info, WhitelistFreelancer>,

    #[account(
        mut,
        seeds = [b"project",project.employer.as_ref(),project.project_number.to_le_bytes().as_ref()],
        bump = project.project_bump,
        constraint = project.project_status == ProjectStatus::Open @ ErrorCode::ProjectNotCreated
    )]
    pub project: Account<'info, Project>,

    #[account(
        mut,
        seeds = [b"project_details", project.key().as_ref()],
        bump = project_details.details_bump,
        constraint = project_details.project == project.key() @ ErrorCode::InvalidProject,
        constraint = project_details.assigned_freelancer.is_none() @ ErrorCode::ProjectAlreadyAssigned,
        constraint = project_details.requirements == freelancer_account.profession @ ErrorCode::ProfessionMismatch
    )]
    pub project_details: Account<'info, ProjectDetails>,

}

impl<'info> AcceptProjectContext<'info> {
    pub fn accept_project(&mut self) -> Result<()> {
        
        self.project_details.assigned_freelancer = Some(self.freelancer.key());
        self.project.project_status = ProjectStatus::InProgress;

        Ok(())
    }
}