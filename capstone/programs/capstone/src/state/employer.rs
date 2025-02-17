use anchor_lang::prelude::*;
use crate::state::admin::Profession;

#[derive(AnchorDeserialize, AnchorSerialize, Clone, PartialEq)]
pub enum ProjectStatus {
    Open,
    InProgress,
    Completed
}

impl Space for ProjectStatus {
    const INIT_SPACE: usize = 1 + std::mem::size_of::<Self>();
}

#[account]
#[derive(InitSpace)]
pub struct Project{
    pub employer: Pubkey,
    pub project_number: u64,
    #[max_len(100)]
    pub title: String,   
    pub project_status: ProjectStatus,
    pub total_budget: u64,
    pub remaining_budget: u64,
    pub tasks_count: u32,
    pub tasks_completed: u32,
    pub created_at: i64,
    pub project_bump: u8,
}

#[account]
#[derive(InitSpace)]
pub struct ProjectDetails {
    pub project: Pubkey,
    #[max_len(1000)]
    pub description: String,
    pub requirements: Profession,
    pub deadline: i64,
    pub assigned_freelancer: Option<Pubkey>,
    pub details_bump: u8,
}

#[derive(AnchorDeserialize, AnchorSerialize, Clone, PartialEq)]
pub enum TaskStatus {
    Open,
    InProgress,
    InReview,
    Completed,
    Rejected
}

impl Space for TaskStatus {
    const INIT_SPACE: usize = 1 + std::mem::size_of::<Self>();
}

#[account]
#[derive(InitSpace)]
pub struct Task {
    pub project: Pubkey,
    pub task_number: u32,
    #[max_len(100)]
    pub title: String,
    #[max_len(500)]
    pub description: String,
    pub budget: u64,
    pub status: TaskStatus,
    pub assigned_freelancer: Option<Pubkey>,
    pub created_at: i64,
    pub completed_at: Option<i64>,
    pub task_bump: u8,
}

#[derive(AnchorDeserialize, AnchorSerialize, Clone, PartialEq)]
pub enum Rating {
    One = 1,
    Two = 2,
    Three = 3,
    Four = 4,
    Five = 5
}

impl Space for Rating {
    const INIT_SPACE: usize = 1 + std::mem::size_of::<Self>();
}


#[account]
#[derive(InitSpace)]
pub struct FreelancerRating {
    pub employer: Pubkey,
    pub freelancer: Pubkey,
    pub project: Pubkey,
    pub rating: Rating,
    #[max_len(500)]
    pub feedback: String,
    pub rated_at: i64,
    pub rating_bump: u8,
}