use anchor_lang::prelude::*;
use crate::{
    error::ErrorCode,
    state::{
        admin::{WhitelistFreelancer, Profession},
        employer::{Project, ProjectDetails, Task, TaskStatus},
        freelancer::{TaskSubmission, PocType}
    }
};

#[derive(Accounts)]
pub struct SubmitTaskContext<'info> {
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
        seeds = [b"project",project.employer.as_ref(),project.project_number.to_le_bytes().as_ref()],
        bump = project.project_bump,
    )]
    pub project: Account<'info, Project>,

    #[account(
        seeds = [b"project_details", project.key().as_ref()],
        bump = project_details.details_bump,
        constraint = project_details.project == project.key() @ ErrorCode::InvalidProject,
        constraint = project_details.assigned_freelancer == Some(freelancer.key()) @ ErrorCode::UnauthorizedFreelancer
    )]
    pub project_details: Account<'info, ProjectDetails>,

    #[account(
        mut,
        seeds = [b"task",project.key().as_ref(),task.task_number.to_le_bytes().as_ref()],
        bump = task.task_bump,
        constraint = task.project == project.key() @ ErrorCode::InvalidTask,
        constraint = task.status == TaskStatus::Open || task.status == TaskStatus::Rejected @ ErrorCode::InvalidTaskStatus
    )]
    pub task: Account<'info, Task>,

    #[account(
        init,
        payer = freelancer,
        space = 8 + TaskSubmission::INIT_SPACE,
        seeds = [b"submission",freelancer.key().as_ref(), task.key().as_ref()],
        bump
    )]
    pub submission: Account<'info, TaskSubmission>,

    pub system_program: Program<'info, System>,
}

impl<'info> SubmitTaskContext<'info> {
    pub fn submit_task(
        &mut self,
        description: String,
        poc_type: PocType,
        proof_of_work: String,
        bump: &SubmitTaskContextBumps
    ) -> Result<()> {
        require!(self.task.status != TaskStatus::Completed, ErrorCode::TaskAlreadyAccepted);
        require!(description.len() <= 1000, ErrorCode::DescriptionTooLong);
        require!(proof_of_work.len() <= 100, ErrorCode::ProofOfWorkTooLong);

        // Validate POC type matches freelancer profession
        match (self.freelancer_account.profession.clone(), &poc_type) {
            (Profession::Developer, PocType::UnitTests) => (),
            (Profession::Designer, PocType::DesignLink) => (),
            (Profession::ContentWriter, PocType::DocumentLink) => (),
            _ => return Err(ErrorCode::InvalidPocType.into())
        }

        // Create submission
        self.submission.set_inner(TaskSubmission {
            task: self.task.key(),
            freelancer: self.freelancer.key(),
            poc_type,
            description,
            proof_of_work,
            submitted_at: Clock::get()?.unix_timestamp,
            submission_bump: bump.submission
        });

        // Update task status and assign freelancer
        self.task.status = TaskStatus::InReview;
        self.task.assigned_freelancer = Some(self.freelancer.key());

        Ok(())
    }
}

