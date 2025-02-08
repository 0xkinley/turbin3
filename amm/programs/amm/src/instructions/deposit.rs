use anchor_lang::prelude::*;
use anchor_spl::{
    associated_token::AssociatedToken,
    token::{mint_to, transfer, Mint, MintTo, Token, TokenAccount, Transfer},
};
use constant_product_curve::ConstantProduct;
use crate::{
    error::AmmError,
    state::Config,
};

#[derive(Accounts)]
pub struct Deposit<'info>{
    #[account(mut)]
    pub lp_provider: Signer<'info>,

    pub mint_x: Account<'info, Mint>,
    pub mint_y: Account<'info, Mint>,

    #[account(
        has_one = mint_x,
        has_one = mint_y,
        seeds = [b"config", config.seed.to_le_bytes().as_ref()],
        bump = config.config_bump,
    )]
    pub config: Account<'info, Config>,

    #[account(
        mut,
        seeds = [b"lp", config.key().as_ref()],
        bump = config.lp_bump,
        mint::decimals = 6,
        mint::authority = config,
    )]
    pub mint_lp: Account<'info, Mint>,

    #[account(
        mut,
        associated_token::mint = mint_x,
        associated_token::authority = config,
    )]
    pub vault_x: Account<'info, TokenAccount>,

    #[account(
        mut,
        associated_token::mint = mint_y,
        associated_token::authority = config,
    )]
    pub vault_y: Account<'info, TokenAccount>,

    #[account(
        mut,
        associated_token::authority = lp_provider,
        associated_token::mint = mint_x
    )]
    pub lp_provider_x: Account<'info, TokenAccount>,

    #[account(
        mut,
        associated_token::authority = lp_provider,
        associated_token::mint = mint_y
    )]
    pub lp_provider_y: Account<'info, TokenAccount>,

    #[account(
        init_if_needed,
        payer = lp_provider,
        associated_token::authority = lp_provider,
        associated_token::mint = mint_lp
    )]
    pub lp_provider_lp: Account<'info, TokenAccount>,

    pub token_program: Program<'info, Token>,
    pub system_program: Program<'info, System>,
    pub associated_token_program: Program<'info, AssociatedToken>,
}

impl<'info> Deposit<'info>{

    pub fn deposit(
        &mut self,
        lp_amount: u64, // amount of mint_lp the user wants to claim
        max_x: u64, // maximum amount of token x the user is willing to deposit
        max_y: u64 // maximum amount of token y the user is willing to deposit
    ) -> Result<()>{
        let condition = self.mint_lp.supply == 0 && self.vault_x.amount == 0 && self.vault_y.amount == 0;
        let(x,y) = match condition{
            true => (max_x, max_y),
            false => {
                let amounts = ConstantProduct::xy_deposit_amounts_from_l(
                    self.vault_x.amount, 
                    self.vault_y.amount, 
                    self.mint_lp.supply, 
                    lp_amount, 
                    6
                ).unwrap();
                (amounts.x, amounts.y)
            },
        };

        require!(x <= max_x && y <= max_y, AmmError::IncorrectAmmount);
        self.deposit_tokens(true, x)?;
        self.deposit_tokens(false, y)?;
        self.mint_lp_tokens(lp_amount)?;
        Ok(())
    }

    pub fn deposit_tokens(
        &mut self,
        is_x: bool,
        amount: u64
    ) -> Result<()>{
        let cpi_program = self.token_program.to_account_info();

        let (from, to) = match is_x {
            true =>( self.lp_provider_x.to_account_info(),  self.vault_x.to_account_info()),
            false => (self.lp_provider_y.to_account_info(), self.vault_y.to_account_info()),           
        };
        let cpi_accounts = Transfer{
            from: from.to_account_info(),
            to: to.to_account_info(),
            authority: self.lp_provider.to_account_info(),
        };

        let ctx = CpiContext::new(cpi_program, cpi_accounts);
        transfer(ctx, amount)?;
        Ok(())
    }

    pub fn mint_lp_tokens(&mut self, amount: u64) -> Result<()> {
        let cpi_program = self.token_program.to_account_info(); 

        let cpi_accounts = MintTo{
            mint: self.mint_lp.to_account_info(),
            to: self.lp_provider_lp.to_account_info(),
            authority: self.config.to_account_info(),
        };

        let config_seeds = self.config.seed.to_le_bytes();

        let seeds = &[
            &b"config"[..],
            &config_seeds.as_ref(),
            &[self.config.config_bump],
        ];

        let signer_seeds = &[&seeds[..]];

        let ctx = CpiContext::new_with_signer(cpi_program, cpi_accounts, signer_seeds);

        mint_to(ctx, amount)?;
        Ok(())
    }
}