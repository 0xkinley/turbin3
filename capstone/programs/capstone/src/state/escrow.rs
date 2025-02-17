use anchor_lang::prelude::*;

#[account]
#[derive(InitSpace)]
pub struct Escrow {
    pub employer: Pubkey,
    pub token_key: Pubkey,
    pub amount: u64,
    pub bump: u8
}