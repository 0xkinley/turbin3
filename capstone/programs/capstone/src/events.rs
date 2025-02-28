use anchor_lang::prelude::*;
use crate::state::{
    admin::Profession,
    employer::{ProjectStatus, TaskStatus, Rating},
    freelancer::PocType
};

#[event]
pub struct FreelancerWhitelisted {
    pub freelancer: Pubkey,
    pub user_name: String,
    pub profession: Profession,
    pub timestamp: i64,
}

#[event]
pub struct FreelancerRemoved {
    pub freelancer: Pubkey,
    pub timestamp: i64,
}

#[event]
pub struct EmployerWhitelisted {
    pub employer: Pubkey,
    pub user_name: String,
    pub company_name: String,
    pub timestamp: i64,
}

#[event]
pub struct EmployerRemoved {
    pub employer: Pubkey,
    pub timestamp: i64,
}

#[event]
pub struct AdminInitialized {
    pub admin: Pubkey,
    pub timestamp: i64,
}

#[event]
pub struct ProjectInitialized {
    pub project: Pubkey,
    pub employer: Pubkey,
    pub project_number: u64,
    pub title: String,
    pub total_budget: u64,
    pub timestamp: i64,
}

#[event]
pub struct ProjectDetailsAdded {
    pub project: Pubkey,
    pub description: String,
    pub requirements: Profession,
    pub deadline: i64,
    pub timestamp: i64,
}

#[event]
pub struct TaskAdded {
    pub project: Pubkey,
    pub task: Pubkey,
    pub task_number: u64,
    pub title: String,
    pub budget: u64,
    pub timestamp: i64,
}

#[event]
pub struct ProjectAccepted {
    pub project: Pubkey,
    pub freelancer: Pubkey,
    pub timestamp: i64,
}

#[event]
pub struct TaskSubmitted {
    pub task: Pubkey,
    pub freelancer: Pubkey,
    pub project: Pubkey,
    pub poc_type: PocType,
    pub proof_of_work: String,
    pub timestamp: i64,
}

#[event]
pub struct TaskApproved {
    pub task: Pubkey,
    pub project: Pubkey,
    pub freelancer: Pubkey,
    pub employer: Pubkey,
    pub budget: u64,
    pub timestamp: i64,
}

#[event]
pub struct TaskRejected {
    pub task: Pubkey,
    pub project: Pubkey,
    pub freelancer: Pubkey,
    pub employer: Pubkey,
    pub timestamp: i64,
}

#[event]
pub struct ProjectStatusChanged {
    pub project: Pubkey,
    pub old_status: ProjectStatus,
    pub new_status: ProjectStatus,
    pub timestamp: i64,
}

#[event]
pub struct TaskStatusChanged {
    pub task: Pubkey,
    pub project: Pubkey,
    pub old_status: TaskStatus,
    pub new_status: TaskStatus,
    pub timestamp: i64,
}

#[event]
pub struct FreelancerRated {
    pub freelancer: Pubkey,
    pub employer: Pubkey,
    pub project: Pubkey,
    pub rating: Rating,
    pub timestamp: i64,
}

#[event]
pub struct FreelancerOverviewInitialized {
    pub freelancer: Pubkey,
    pub timestamp: i64,
}

#[event]
pub struct POSCollectionCreated {
    pub collection: Pubkey,
    pub name: String,
    pub uri: String,
    pub timestamp: i64,
}

#[event]
pub struct POSTokenMinted {
    pub asset: Pubkey,
    pub freelancer: Pubkey,
    pub name: String,
    pub profession: Profession,
    pub completed_projects: u64,
    pub average_rating: f64,
    pub timestamp: i64,
}