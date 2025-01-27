use anchor_lang::prelude::*;

#[error_code]
pub enum ErrorCode {
    #[msg("Insufficient funds for transfer")]
    InsufficientFunds,
    #[msg("Invalid mint")]
    InvalidMint,
}