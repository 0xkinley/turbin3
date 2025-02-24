use anchor_lang::{
    prelude::*,
    Space
};
use crate::employer::Rating;

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
    pub submission_bump: u8,
    pub submission_counter: u64
}

#[derive(AnchorDeserialize, AnchorSerialize, Clone, Default)]
pub struct RatingStats {
    pub one_star: u64,
    pub two_star: u64,
    pub three_star: u64,
    pub four_star: u64,
    pub five_star: u64,
}

impl Space for RatingStats {
    const INIT_SPACE: usize = 8 * 5; // 8 bytes for each u64 counter
}

impl RatingStats {
    pub fn add_rating(&mut self, rating: &Rating) {
        match rating {
            Rating::One => self.one_star += 1,
            Rating::Two => self.two_star += 1,
            Rating::Three => self.three_star += 1,
            Rating::Four => self.four_star += 1,
            Rating::Five => self.five_star += 1,
        }
    }

    pub fn calculate_average(&self) -> f64 {
        let total_ratings = self.one_star + self.two_star + self.three_star + 
                          self.four_star + self.five_star;
        
        if total_ratings == 0 {
            return 0.0;
        }

        let weighted_sum = self.one_star * 1 +
                         self.two_star * 2 +
                         self.three_star * 3 +
                         self.four_star * 4 +
                         self.five_star * 5;

        weighted_sum as f64 / total_ratings as f64
    }

    pub fn total_ratings(&self) -> u64 {
        self.one_star + self.two_star + self.three_star + 
        self.four_star + self.five_star
    }
}

#[account]
#[derive(InitSpace)]
pub struct FreelancerOverview {
    pub freelancer: Pubkey,
    pub total_projects_completed: u64,
    pub rating_stats: RatingStats,
    pub average_rating: f64,
    pub overview_bump: u8
}