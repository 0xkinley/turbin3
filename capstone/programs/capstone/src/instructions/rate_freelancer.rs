use anchor_lang::prelude::*;
use crate::{
    error::ErrorCode,
    state::{
        admin::{WhitelistEmployer, WhitelistFreelancer,},
        employer::{Project, ProjectDetails, ProjectStatus, FreelancerRating, Rating},
        freelancer::FreelancerOverview
    }
};

#[derive(Accounts)]
pub struct RateFreelancerContext<'info> {
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
        seeds = [
            b"project",
            project.employer.as_ref(),
            project.project_number.to_le_bytes().as_ref()
        ],
        bump = project.project_bump,
        constraint = project.employer == employer.key() @ ErrorCode::UnauthorizedEmployer,
        constraint = project.project_status == ProjectStatus::Completed @ ErrorCode::ProjectNotCompleted
    )]
    pub project: Account<'info, Project>,

    #[account(
        seeds = [b"project_details", project.key().as_ref()],
        bump = project_details.details_bump,
        constraint = project_details.project == project.key() @ ErrorCode::InvalidProject,
        constraint = project_details.assigned_freelancer.is_some() @ ErrorCode::FreelancerNotAssigned,
        constraint = project_details.assigned_freelancer.unwrap() == freelancer_account.freelancer @ ErrorCode::InvalidFreelancer
    )]
    pub project_details: Account<'info, ProjectDetails>,

    #[account(
        seeds = [b"freelancer", project_details.assigned_freelancer.unwrap().as_ref()],
        bump = freelancer_account.freelancer_bump,
        constraint = freelancer_account.is_whitelisted == true @ ErrorCode::UnauthorizedFreelancer
    )]
    pub freelancer_account: Account<'info, WhitelistFreelancer>,

    #[account(
        mut,
        seeds = [b"freelancer_overview", project_details.assigned_freelancer.unwrap().as_ref()],
        bump = freelancer_overview.overview_bump
    )]
    pub freelancer_overview: Account<'info, FreelancerOverview>,

    #[account(
        init,
        payer = employer,
        space = 8 + FreelancerRating::INIT_SPACE,
        seeds = [b"rating",project.key().as_ref(),project_details.assigned_freelancer.unwrap().as_ref()],
        bump
    )]
    pub rating: Account<'info, FreelancerRating>,

    pub system_program: Program<'info, System>,
}

impl<'info> RateFreelancerContext<'info> {
    pub fn rate_freelancer(
        &mut self,
        rating: Rating,
        feedback: String,
        bump: &RateFreelancerContextBumps
    ) -> Result<()> {
        require!(feedback.len() <= 500, ErrorCode::FeedbackTooLong);
        
        require!(
            self.project.tasks_completed == self.project.tasks_count,
            ErrorCode::TasksNotCompleted
        );

        self.freelancer_overview.rating_stats.add_rating(&rating);
        self.freelancer_overview.average_rating = 
            self.freelancer_overview.rating_stats.calculate_average();
       

        self.rating.set_inner(FreelancerRating {
            employer: self.employer.key(),
            freelancer: self.project_details.assigned_freelancer.unwrap(),
            project: self.project.key(),
            rating: rating,
            feedback,
            rated_at: Clock::get()?.unix_timestamp,
            rating_bump: bump.rating
        });

        Ok(())

    }
}