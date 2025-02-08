use anchor_lang::prelude::*;

#[error_code]
pub enum AmmError {
    #[msg("Custom error message")]
    IncorrectAmmount,
    #[msg("Still locked")]
    StillLocked,
    #[msg("Zero Amount")]
    ZeroAmount,
}
