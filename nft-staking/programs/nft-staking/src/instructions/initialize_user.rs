use anchor_lang::prelude::*;
use crate::state::UserAccount;

#[derive(Accounts)]
pub struct InitializeUser<'info> {
    #[account(mut)]
    pub user: Signer<'info>,

    #[account(
        init,
        payer = user, 
        space = 8 + UserAccount::INIT_SPACE, 
        seeds = [b"user".as_ref(), user.key().as_ref()], 
        bump
    )]
    pub user_account: Account<'info, UserAccount>,

    pub system_program: Program<'info, System>,
}

impl<'info> InitializeUser<'info> {

    pub fn initialize_user(
        &mut self, 
        bumps: &InitializeUserBumps
    ) -> Result<()> {
        self.user_account.set_inner(UserAccount {
            points: 0,
            amount_stake: 0,
            bump: bumps.user_account,
        });

        Ok(())
    }
    
}