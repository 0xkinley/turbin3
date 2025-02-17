use anchor_lang::prelude::*;

#[error_code]
pub enum ErrorCode {
    #[msg("User name must be 50 characters or less")]
    UserNameTooLong,
    #[msg("Company name must be 50 characters or less")]
    CompanyNameTooLong,
    #[msg("Only the admin can perform this action")]
    UnauthorizedAdmin,
    #[msg("Account is already whitelisted")]
    AlreadyWhitelisted,
    #[msg("Account is not whitelisted")]
    NotWhitelisted,
    #[msg("Only the whitelisted employer can perform this action")]
    UnauthorizedEmployer,
    #[msg("Only the whitelisted freelancer can perform this action")]
    UnauthorizedFreelancer,
    #[msg("Title must be 100 characters or less")]
    TitleTooLong,
    #[msg("Invalid budget")]
    InvalidBudget,
    #[msg("Only the admin or the employer can set the project status")]
    UnauthorizedProjectStatusChange,
    #[msg("Only the admin can remove an employer")]
    UnauthorizedRemoveEmployer,
    #[msg("Project is not yet created")]
    ProjectNotCreated,
    #[msg("Description must be 1000 characters or less")]
    DescriptionTooLong,
    #[msg("Requirements must be 500 characters or less")]
    RequirementsTooLong,
    #[msg("Invalid deadline")]
    InvalidDeadline,
    #[msg("Invalid project")]
    InvalidProject,
    #[msg("Project already assigned")]
    ProjectAlreadyAssigned,
    #[msg("Profession mismatch")]
    ProfessionMismatch,
    #[msg("Invalid task")]
    InvalidTask,
    #[msg("Invalid task status")]
    InvalidTaskStatus,
    #[msg("Proof of work too large")]
    ProofOfWorkTooLong,
    #[msg("Invalid POC type")]
    InvalidPocType,
    #[msg("Invalid task submission")]
    InvalidTaskSubmission,
    #[msg("Invalid Project Status")]
    InvalidProjectStatus,
    #[msg("Task already accepted")]
    TaskAlreadyAccepted,
    #[msg("Invalid Vault Account")]
    InvalidVaultAccount,
    #[msg("Invalid Freelancer")]
    InvalidFreelancer,
    #[msg("Invalid Escrow Account")]
    InvalidEscrowAccount,
    #[msg("Budget Still Remaining")]
    BudgetStillRemaining,
    #[msg("Invalid Escrow Amount")]
    InvalidEscrowAmount,
    #[msg("Invalid Payment Amount")]
    InvalidPaymentAmount,
    #[msg("Project Not Completed")]
    ProjectNotCompleted,
    #[msg("Freelancer Not Available")]
    FreelancerNotAssigned,
    #[msg("Feedback too long")]
    FeedbackTooLong,
    #[msg("Tasks Not Completed")]
    TasksNotCompleted
}
