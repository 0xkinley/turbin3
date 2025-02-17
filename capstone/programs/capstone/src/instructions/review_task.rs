use anchor_lang::prelude::*;
use anchor_spl::{
    associated_token::AssociatedToken,
    token_interface::{Mint, TokenAccount, TokenInterface, transfer_checked, TransferChecked, close_account, CloseAccount}
};
use crate::{
    error::ErrorCode,
    state::{
        admin::WhitelistEmployer,
        employer::{Project, Task, TaskStatus, ProjectStatus, ProjectDetails},
        Escrow
    }
};

#[derive(Accounts)]
pub struct ReviewTaskContext<'info> {
    #[account(mut)]
    pub employer: Signer<'info>,

    /// CHECK: Only used for authority
    #[account(mut)]
    pub freelancer: SystemAccount<'info>,

    pub token_mint: InterfaceAccount<'info, Mint>,

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
        constraint = project.project_status == ProjectStatus::InProgress @ ErrorCode::InvalidProjectStatus
    )]
    pub project: Account<'info, Project>,

    #[account(
        mut,
        seeds = [b"project_details", project.key().as_ref()],
        bump = project_details.details_bump,
        constraint = project_details.project == project.key() @ ErrorCode::InvalidProject
    )]
    pub project_details: Account<'info, ProjectDetails>,

    #[account(
        mut,
        seeds = [b"task",project.key().as_ref(),task.task_number.to_le_bytes().as_ref()],
        bump = task.task_bump,
        constraint = task.project == project.key() @ ErrorCode::InvalidTask,
        constraint = task.status == TaskStatus::InReview @ ErrorCode::InvalidTaskStatus
    )]
    pub task: Account<'info, Task>,

    #[account(
        mut,
        seeds = [b"escrow", project.key().as_ref()],
        bump = escrow.bump,
    )]
    pub escrow: Account<'info, Escrow>,

    #[account(
        mut,
        constraint = vault.owner == escrow.key() @ ErrorCode::InvalidVaultAccount
    )]
    pub vault: InterfaceAccount<'info, TokenAccount>,

    #[account(
        init_if_needed,
        payer = employer,
        associated_token::mint = token_mint,
        associated_token::authority = freelancer,
    )]
    pub freelancer_token_account: InterfaceAccount<'info, TokenAccount>,

    pub system_program: Program<'info, System>,
    pub token_program: Interface<'info, TokenInterface>,
    pub associated_token_program: Program<'info, AssociatedToken>,
}

impl<'info> ReviewTaskContext<'info> {
    pub fn approve_task(&mut self) -> Result<()> {
        require!(self.task.status == TaskStatus::InReview,ErrorCode::InvalidTaskStatus);

        require!(
            self.task.assigned_freelancer.is_some() &&
            self.freelancer_token_account.owner == self.task.assigned_freelancer.unwrap(),
            ErrorCode::InvalidFreelancer
        );

        require!(self.project.tasks_completed <= self.project.tasks_count, ErrorCode::InvalidTaskSubmission);

        self.project.tasks_completed += 1;
        self.task.status = TaskStatus::Completed;
        self.task.completed_at = Some(Clock::get()?.unix_timestamp);

        let project_key = self.project.key();

        let escrow_seeds = &[
            b"escrow",
            project_key.as_ref(),
            &[self.escrow.bump]
        ];
        let signer = &[&escrow_seeds[..]];

        let cpi_program = self.token_program.to_account_info();
        let cpi_accounts = TransferChecked {
            from: self.vault.to_account_info(),
            mint: self.token_mint.to_account_info(),
            to: self.freelancer_token_account.to_account_info(),
            authority: self.escrow.to_account_info(),
        };

        let cpi_ctx = CpiContext::new_with_signer(
            cpi_program,
            cpi_accounts,
            signer
        );

        transfer_checked(cpi_ctx, self.task.budget, self.token_mint.decimals)?;

        self.project.remaining_budget -= self.task.budget;
        require!(self.escrow.amount == self.project.remaining_budget, ErrorCode::InvalidEscrowAmount);

        if self.project.tasks_completed == self.project.tasks_count {
            require!(self.project.remaining_budget == 0 && self.escrow.amount == 0, ErrorCode::BudgetStillRemaining);
            self.project.project_status = ProjectStatus::Completed;

            let accounts = CloseAccount {
                account: self.vault.to_account_info(),
                destination: self.employer.to_account_info(),
                authority: self.escrow.to_account_info(),
            };

            let ctx = CpiContext::new_with_signer(
                self.token_program.to_account_info(),
                accounts,
                signer,
            );
    
            close_account(ctx)?;
            msg!("closed account");    
        }

        Ok(())
    }

    pub fn reject_task(&mut self) -> Result<()> {
        require!(self.task.status == TaskStatus::InReview,ErrorCode::InvalidTaskStatus);

        self.task.status = TaskStatus::Rejected;
        

        Ok(())
    }
}