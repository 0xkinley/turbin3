use anchor_lang::prelude::*;
use crate::{
    error::ErrorCode,
    state::{
        admin::WhitelistEmployer,
        employer::{Project, Task, TaskStatus, ProjectStatus}
    }
};

#[derive(Accounts)]
#[instruction(task_number: u64)]
pub struct AddTaskContext<'info> {
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
        space = 8 + Task::INIT_SPACE,
        seeds = [b"task",project.key().as_ref(),task_number.to_le_bytes().as_ref()
        ],
        bump
    )]
    pub task: Account<'info, Task>,

    pub system_program: Program<'info, System>,
}

impl<'info> AddTaskContext<'info> {
    pub fn add_task(
        &mut self,
        task_number: u32,
        title: String,
        description: String,
        budget: u64,
        bump: &AddTaskContextBumps
    ) -> Result<()> {
        require!(title.len() <= 100, ErrorCode::TitleTooLong);
        require!(description.len() <= 500, ErrorCode::DescriptionTooLong);
        require!(budget > 0 && budget <= self.project.remaining_budget, ErrorCode::InvalidBudget);
        
        self.task.set_inner(Task {
            project: self.project.key(),
            task_number,
            title,
            description,
            budget,
            status: TaskStatus::Open,
            assigned_freelancer: None,
            created_at: Clock::get()?.unix_timestamp,
            completed_at: None,
            task_bump: bump.task
        });

        self.project.tasks_count += 1;
        self.project.remaining_budget -= budget;

        Ok(())
    }
}
