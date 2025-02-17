use anchor_lang::prelude::*;
use crate::state::AdminConfig;

#[derive(Accounts)]
pub struct InitializeAdmin<'info> {
    #[account(mut)]
    pub admin: Signer<'info>,
    
    #[account(
        init,
        payer = admin,
        space = 8 + AdminConfig::INIT_SPACE,
        seeds = [b"admin", admin.key().as_ref()],
        bump
    )]
    pub admin_config: Account<'info, AdminConfig>,
    
    pub system_program: Program<'info, System>,
}

impl<'info> InitializeAdmin<'info> {
    pub fn handle_initialize_admin(&mut self, bump: &InitializeAdminBumps) -> Result<()>{
        self.admin_config.admin = self.admin.key();
        self.admin_config.admin_bump = bump.admin_config;
        Ok(())
    }
}