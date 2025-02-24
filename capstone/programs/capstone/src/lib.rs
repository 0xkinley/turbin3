pub mod constants;
pub mod error;
pub mod instructions;
pub mod state;

use anchor_lang::prelude::*;

pub use constants::*;
pub use instructions::*;
pub use state::*;

declare_id!("Ft5868yfEPHCTHTHXxyxMXKRGFdmUBcK6dyGCu2uXCpi");

#[program]
pub mod capstone {
    use super::*;

    pub fn initialize_admin(
        ctx: Context<InitializeAdmin>,
    ) -> Result<()> {
        ctx.accounts.handle_initialize_admin(&ctx.bumps)
    }

    pub fn whitelist_freelancer(
        ctx: Context<WhitelistFreelancerContext>,
        freelancer: Pubkey,
        user_name: String,
        profession: Profession,
    ) -> Result<()> {
        ctx.accounts.whitelist_freelancer(freelancer, user_name, profession, &ctx.bumps)
    }

    pub fn remove_freelancer(
        ctx: Context<RemoveFreelancerContext>,
        freelancer: Pubkey,
    ) -> Result<()> {
        ctx.accounts.remove_freelancer(freelancer)
    }

    pub fn contains_freelancer(
        ctx: Context<CheckFreelancerContext>,
        freelancer: Pubkey,
    ) -> Result<bool> {
        ctx.accounts.contains_freelancer(freelancer)
    }

    pub fn whitelist_employer(
        ctx: Context<WhitelistEmployerContext>,
        employer: Pubkey,
        user_name: String,
        company_name: String,
    ) -> Result<()> {
        ctx.accounts.whitelist_employer(employer, user_name, company_name, &ctx.bumps)
    }

    pub fn remove_employer(
        ctx: Context<RemoveEmployerContext>,
        employer: Pubkey,
    ) -> Result<()> {
        ctx.accounts.remove_employer(employer)
    }

    pub fn contains_employer(
        ctx: Context<CheckEmployerContext>,
        employer: Pubkey,
    ) -> Result<bool> {
        ctx.accounts.contains_employer(employer)
    }

    pub fn initialize_project(
        ctx: Context<InitializeProjectContext>,
        project_id: u64,
        title: String,
        total_budget: u64,
    ) -> Result<()> {
        ctx.accounts.initialiaze_project(project_id, title, total_budget, &ctx.bumps)?;
        ctx.accounts.transfer_project_budget_to_vault()
    }

    pub fn add_project_details(
        ctx: Context<AddProjectDetailsContext>,
        description: String,
        requirements: Profession,
        deadline: i64,
    ) -> Result<()> {
        ctx.accounts.add_project_details(description, requirements, deadline, &ctx.bumps)
    }

    pub fn add_task(
        ctx: Context<AddTaskContext>,
        task_number: u64,
        title: String,
        description: String,
        budget: u64,
    ) -> Result<()> {
        ctx.accounts.add_task(task_number, title, description, budget, &ctx.bumps)
    }

    pub fn accept_project(
        ctx: Context<AcceptProjectContext>,
    ) -> Result<()> {
        ctx.accounts.accept_project()
    }

    pub fn submit_task(
        ctx: Context<SubmitTaskContext>,
        description: String,
        poc_type: PocType,
        proof_of_work: String,
    ) -> Result<()> {
        ctx.accounts.submit_task(description, poc_type, proof_of_work, &ctx.bumps)
    }

    pub fn approve_task(
        ctx: Context<ReviewTaskContext>,
    ) -> Result<()> {
        ctx.accounts.approve_task()
    }

    pub fn reject_task(
        ctx: Context<ReviewTaskContext>,
    ) -> Result<()> {
        ctx.accounts.reject_task()
    }

    pub fn rate_freelancer(
        ctx: Context<RateFreelancerContext>,
        rating: Rating,
        feedback: String,
    ) -> Result<()> {
        ctx.accounts.rate_freelancer(rating, feedback, &ctx.bumps)
    }

    pub fn initialize_freelancer_overview(
        ctx: Context<InitializeFreelancerOverviewContext>,
        freelancer: Pubkey,
    ) -> Result<()> {
        ctx.accounts.initialize_overview(freelancer, &ctx.bumps)
    }

    pub fn create_pos_token(
        ctx: Context<CreatePOSToken>,
        name: String,
        uri: String,
    ) -> Result<()> {
        ctx.accounts.create_pos_token(name, uri)
    }

    pub fn mint_pos_token(
        ctx: Context<MintPosToken>,
        name: String,
        uri: String,
    ) -> Result<()> {
        ctx.accounts.mint_pos_token(name, uri)
    }
}
