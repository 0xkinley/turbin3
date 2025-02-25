use anchor_lang::prelude::*;
use anchor_spl::{
    associated_token::AssociatedToken, 
    token_interface::{transfer_checked, Mint, TokenAccount, TokenInterface, TransferChecked}
};
use crate::{
    error::ErrorCode,
    state::{
        admin::{AdminConfig, WhitelistEmployer},
        employer::{Project, ProjectStatus},
        Escrow
    }
};

#[derive(Accounts)]
#[instruction( project_id: u64)]
pub struct InitializeProjectContext<'info>{
    #[account(mut)]
    pub employer: Signer<'info>,

    pub token_mint: Box<InterfaceAccount<'info, Mint>>,

    #[account(
        mut,
        associated_token::mint = token_mint,
        associated_token::authority = employer,
    )]
    pub token_ata: Box<InterfaceAccount<'info, TokenAccount>>,

    #[account(
        seeds = [b"admin", admin_config.admin.as_ref()],
        bump = admin_config.admin_bump,
    )]
    pub admin_config: Box<Account<'info, AdminConfig>>,

    #[account(
        seeds = [b"employer", employer.key().as_ref()],
        bump = employer_account.employer_bump,
        constraint = employer_account.employer == employer.key() && 
                    employer_account.is_whitelisted == true @ ErrorCode::UnauthorizedEmployer
    )]
    pub employer_account: Box<Account<'info, WhitelistEmployer>>,

    #[account(
        init,
        payer = employer,
        space = 8 + Project::INIT_SPACE,
        seeds = [b"project",employer.key().as_ref(),&project_id.to_le_bytes()],
        bump
    )]
    pub project: Box<Account<'info, Project>>,

    #[account(
        init,
        payer = employer,
        space = 8 + Escrow::INIT_SPACE,
        seeds = [b"escrow", project.key().as_ref()],
        bump
    )]
    pub escrow: Box<Account<'info, Escrow>>,

    #[account(
        init,
        payer = employer,
        associated_token::mint = token_mint,
        associated_token::authority = escrow
    )]
    pub vault: Box<InterfaceAccount<'info, TokenAccount>>,

    pub token_program: Interface<'info, TokenInterface>,
    pub associated_token_program: Program<'info, AssociatedToken>,
    pub system_program: Program<'info, System>,
}

impl<'info> InitializeProjectContext<'info> {

    pub fn initialiaze_project(
        &mut self, 
        project_id: u64, 
        title: String,
        total_budget: u64,
        bumps: &InitializeProjectContextBumps
    ) -> Result<()>{
        require!(title.len() <= 100, ErrorCode::TitleTooLong);
        require!(total_budget > 0, ErrorCode::InvalidBudget);

        self.project.set_inner(Project{
            employer: self.employer.key(),
            project_number: project_id,
            title,   
            project_status: ProjectStatus::Open,
            total_budget,
            remaining_budget: total_budget,
            tasks_count: 0,
            tasks_completed: 0,
            created_at: Clock::get()?.unix_timestamp,
            project_bump: bumps.project,
        });

        self.escrow.set_inner(Escrow{
            employer: self.employer.key(),
            token_key: self.token_mint.key(),
            amount: 0,
            bump: bumps.escrow, 
        });

        Ok(())
    }

    pub fn transfer_project_budget_to_vault(&mut self) -> Result<()>{
        let cpi_program = self.token_program.to_account_info();
        let cpi_accounts = TransferChecked{
            from: self.token_ata.to_account_info(),
            mint: self.token_mint.to_account_info(),
            to: self.vault.to_account_info(),
            authority: self.employer.to_account_info(),
        };

        let cpi_ctx =  CpiContext::new(cpi_program, cpi_accounts);

        transfer_checked(cpi_ctx, self.project.total_budget, self.token_mint.decimals)?;
        self.escrow.amount = self.project.total_budget;
        Ok(())
    }
}