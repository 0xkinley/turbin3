use anchor_lang::{
    prelude::*,
    Space
};

#[account]
#[derive(InitSpace)]
pub struct AdminConfig {
    pub admin: Pubkey,
    pub admin_bump: u8,
}


#[derive(AnchorDeserialize, AnchorSerialize, Clone, PartialEq)]
pub enum Profession{
    Developer,
    Designer,
    ContentWriter
}

/// The 1 represents one byte for the enum discriminator (which Rust uses to track which variant is active)
/// std::mem::size_of::<Self>() will return the size needed for the largest variant of the enum.
/// We have only unit variants in Profession
impl Space for Profession {
    const INIT_SPACE: usize = 1 + std::mem::size_of::<Self>(); 
}

#[account]
#[derive(InitSpace)]
pub struct WhitelistFreelancer{
    pub freelancer: Pubkey,
    #[max_len(50)]
    pub user_name: String,
    pub profession: Profession,
    pub is_whitelisted: bool,
    pub freelancer_bump: u8
}

#[account]
#[derive(InitSpace)]
pub struct WhitelistEmployer{
    pub employer: Pubkey,
    #[max_len(50)]
    pub user_name: String,
    #[max_len(50)]
    pub company_name: String,
    pub is_whitelisted: bool,
    pub employer_bump: u8
}