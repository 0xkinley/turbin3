use anchor_lang::{
    prelude::*,
    Space
};

#[derive(AnchorDeserialize, AnchorSerialize, Clone, PartialEq)]
pub enum PocType {
    UnitTests,
    DesignLink,
    DocumentLink
}

impl Space for PocType {
    const INIT_SPACE: usize = 1 + std::mem::size_of::<Self>();
}

#[account]
#[derive(InitSpace)]
pub struct TaskSubmission {
    pub task: Pubkey,
    pub freelancer: Pubkey,
    pub poc_type: PocType,
    #[max_len(1000)]
    pub description: String,
    #[max_len(100)]
    pub proof_of_work: String,   // this could be a POC link
    pub submitted_at: i64,
    pub submission_bump: u8
}