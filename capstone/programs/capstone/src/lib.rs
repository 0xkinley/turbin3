pub mod constants;
pub mod error;
pub mod instructions;
pub mod state;
pub mod events;

use anchor_lang::prelude::*;

pub use constants::*;
pub use instructions::*;
pub use state::*;
pub use events::*;

declare_id!("Ft5868yfEPHCTHTHXxyxMXKRGFdmUBcK6dyGCu2uXCpi");

#[program]
pub mod capstone {
    use super::*;

    pub fn initialize_admin(
        ctx: Context<InitializeAdmin>,
    ) -> Result<()> {
        ctx.accounts.handle_initialize_admin(&ctx.bumps)?;
        emit!(AdminInitialized {
            admin: ctx.accounts.admin.key(),
            timestamp: Clock::get()?.unix_timestamp,
        });
        Ok(())
    }

    pub fn whitelist_freelancer(
        ctx: Context<WhitelistFreelancerContext>,
        freelancer: Pubkey,
        user_name: String,
        profession: Profession,
    ) -> Result<()> {
        ctx.accounts.whitelist_freelancer(freelancer, user_name.clone(), profession.clone(), &ctx.bumps)?;
        emit!(FreelancerWhitelisted {
            freelancer,
            user_name,
            profession,
            timestamp: Clock::get()?.unix_timestamp,
        });
        Ok(())
    }

    pub fn remove_freelancer(
        ctx: Context<RemoveFreelancerContext>,
        freelancer: Pubkey,
    ) -> Result<()> {
        ctx.accounts.remove_freelancer(freelancer)?;
        emit!(FreelancerRemoved {
            freelancer,
            timestamp: Clock::get()?.unix_timestamp,
        });
        Ok(())
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
        ctx.accounts.whitelist_employer(employer, user_name.clone(), company_name.clone(), &ctx.bumps)?;
        emit!(EmployerWhitelisted {
            employer,
            user_name,
            company_name,
            timestamp: Clock::get()?.unix_timestamp,
        });
        Ok(())
    }

    pub fn remove_employer(
        ctx: Context<RemoveEmployerContext>,
        employer: Pubkey,
    ) -> Result<()> {
        ctx.accounts.remove_employer(employer)?;
        emit!(EmployerRemoved {
            employer,
            timestamp: Clock::get()?.unix_timestamp,
        });
        Ok(())
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
        ctx.accounts.initialiaze_project(project_id, title.clone(), total_budget, &ctx.bumps)?;
        ctx.accounts.transfer_project_budget_to_vault()?;
        emit!(ProjectInitialized {
            project: ctx.accounts.project.key(),
            employer: ctx.accounts.employer.key(),
            project_number: project_id,
            title,
            total_budget,
            timestamp: Clock::get()?.unix_timestamp,
        });
        Ok(())
    }

    pub fn add_project_details(
        ctx: Context<AddProjectDetailsContext>,
        description: String,
        requirements: Profession,
        deadline: i64,
    ) -> Result<()> {
        ctx.accounts.add_project_details(description.clone(), requirements.clone(), deadline, &ctx.bumps)?;
        emit!(ProjectDetailsAdded {
            project: ctx.accounts.project.key(),
            description,
            requirements,
            deadline,
            timestamp: Clock::get()?.unix_timestamp,
        });
        Ok(())
    }

    pub fn add_task(
        ctx: Context<AddTaskContext>,
        task_number: u64,
        title: String,
        description: String,
        budget: u64,
    ) -> Result<()> {
        ctx.accounts.add_task(task_number, title.clone(), description, budget, &ctx.bumps)?;
        emit!(TaskAdded {
            project: ctx.accounts.project.key(),
            task: ctx.accounts.task.key(),
            task_number,
            title,
            budget,
            timestamp: Clock::get()?.unix_timestamp,
        });
        Ok(())
    }

    pub fn accept_project(
        ctx: Context<AcceptProjectContext>,
    ) -> Result<()> {
        ctx.accounts.accept_project()?;
        emit!(ProjectAccepted {
            project: ctx.accounts.project.key(),
            freelancer: ctx.accounts.freelancer.key(),
            timestamp: Clock::get()?.unix_timestamp,
        });
        Ok(())
    }

    pub fn submit_task(
        ctx: Context<SubmitTaskContext>,
        description: String,
        poc_type: PocType,
        proof_of_work: String,
    ) -> Result<()> {
        ctx.accounts.submit_task(description, poc_type.clone(), proof_of_work.clone(), &ctx.bumps)?;
        emit!(TaskSubmitted {
            task: ctx.accounts.task.key(),
            freelancer: ctx.accounts.freelancer.key(),
            project: ctx.accounts.project.key(),
            poc_type,
            proof_of_work,
            timestamp: Clock::get()?.unix_timestamp,
        });
        Ok(())
    }

    pub fn approve_task(
        ctx: Context<ReviewTaskContext>,
    ) -> Result<()> {
        ctx.accounts.approve_task()?;
        emit!(TaskApproved {
            task: ctx.accounts.task.key(),
            project: ctx.accounts.project.key(),
            freelancer: ctx.accounts.freelancer.key(),
            employer: ctx.accounts.employer.key(),
            budget: ctx.accounts.task.budget,
            timestamp: Clock::get()?.unix_timestamp,
        });
        Ok(())
    }

    pub fn reject_task(
        ctx: Context<ReviewTaskContext>,
    ) -> Result<()> {
        ctx.accounts.reject_task()?;
        emit!(TaskRejected {
            task: ctx.accounts.task.key(),
            project: ctx.accounts.project.key(),
            freelancer: ctx.accounts.freelancer.key(),
            employer: ctx.accounts.employer.key(),
            timestamp: Clock::get()?.unix_timestamp,
        });
        Ok(())
    }

    pub fn rate_freelancer(
        ctx: Context<RateFreelancerContext>,
        rating: Rating,
        feedback: String,
    ) -> Result<()> {
        ctx.accounts.rate_freelancer(rating.clone(), feedback, &ctx.bumps)?;
        emit!(FreelancerRated {
            freelancer: ctx.accounts.freelancer_account.freelancer,
            employer: ctx.accounts.employer.key(),
            project: ctx.accounts.project.key(),
            rating,
            timestamp: Clock::get()?.unix_timestamp,
        });
        Ok(())
    }

    pub fn initialize_freelancer_overview(
        ctx: Context<InitializeFreelancerOverviewContext>,
        freelancer: Pubkey,
    ) -> Result<()> {
        ctx.accounts.initialize_overview(freelancer, &ctx.bumps)?;
        emit!(FreelancerOverviewInitialized {
            freelancer,
            timestamp: Clock::get()?.unix_timestamp,
        });
        Ok(())       
    }

    pub fn create_pos_token(
        ctx: Context<CreatePOSToken>,
        name: String,
        uri: String,
    ) -> Result<()> {
        ctx.accounts.create_pos_token(name.clone(), uri.clone())?;
        emit!(POSCollectionCreated {
            collection: ctx.accounts.pos_token_account.key(),
            name,
            uri,
            timestamp: Clock::get()?.unix_timestamp,
        });
        Ok(())
    }

    pub fn mint_pos_token(
        ctx: Context<MintPosToken>,
        name: String,
        uri: String,
    ) -> Result<()> {
        ctx.accounts.mint_pos_token(name.clone(), uri.clone())?;
        emit!(POSTokenMinted {
            asset: ctx.accounts.asset.key(),
            freelancer: ctx.accounts.freelancer.key(),
            name,
            profession: ctx.accounts.freelancer_account.profession.clone(),
            completed_projects: ctx.accounts.freelancer_overview.total_projects_completed,
            average_rating: ctx.accounts.freelancer_overview.average_rating,
            timestamp: Clock::get()?.unix_timestamp,
        });
        Ok(())
    }
}
