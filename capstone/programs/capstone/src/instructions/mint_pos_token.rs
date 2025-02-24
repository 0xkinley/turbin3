use anchor_lang::prelude::*;
use mpl_core::{
    ID as MPL_CORE_ID,
    instructions::CreateV2CpiBuilder ,
    accounts::BaseCollectionV1 ,
    types::{
        Attribute,
        Attributes,
        PermanentFreezeDelegate,
        Edition,
        Plugin,
        PluginAuthority,
        PluginAuthorityPair,
    },
};
use crate::{
    state::{ AdminConfig, FreelancerOverview, WhitelistFreelancer, Project, ProjectStatus, ProjectDetails },
    error::ErrorCode
};

#[derive(Accounts)]
pub struct MintPosToken<'info>{
    #[account(mut)]
    pub freelancer: Signer<'info>, 

    #[account(
        seeds = [b"admin", admin_config.admin.as_ref()],
        bump = admin_config.admin_bump,
    )]
    pub admin_config: Box<Account<'info, AdminConfig>>,

    #[account(
        mut,
        seeds = [b"project",project.employer.as_ref(),&project.project_number.to_le_bytes()],
        bump = project.project_bump,
        constraint = project.project_status == ProjectStatus::Completed @ ErrorCode::ProjectNotCreated
    )]
    pub project: Box<Account<'info, Project>>,

    #[account(
        seeds = [b"project_details", project.key().as_ref()],
        bump = project_details.details_bump,
        constraint = project_details.project == project.key() @ ErrorCode::InvalidProject,
        constraint = project_details.assigned_freelancer == Some(freelancer.key()) @ ErrorCode::UnauthorizedFreelancer
    )]
    pub project_details: Box<Account<'info, ProjectDetails>>,

    #[account(
        mut,
        seeds = [b"freelancer_overview", freelancer.key().as_ref()],
        bump = freelancer_overview.overview_bump
    )]
    pub freelancer_overview: Box<Account<'info, FreelancerOverview>>,

    #[account(
        seeds = [b"freelancer", freelancer.key().as_ref()],
        bump = freelancer_account.freelancer_bump,
        constraint = freelancer_account.freelancer == freelancer.key() @ ErrorCode::InvalidFreelancer
    )]
    pub freelancer_account: Box<Account<'info, WhitelistFreelancer>>,

    #[account(
        mut,
        constraint  = collection.update_authority == admin_config.key(),
    )]
     pub collection: Box<Account<'info, BaseCollectionV1>>,

    #[account(mut)]
    pub asset: Signer<'info>,

    /// CHECK: This is checked by the address constraint
    #[account(address = MPL_CORE_ID)]
    pub mpl_core_program: UncheckedAccount<'info>,

    pub system_program: Program<'info, System>,
} 

impl<'info> MintPosToken<'info> {
    pub fn mint_pos_token(&mut self, name: String, uri: String) -> Result<()> {
        let admin = self.admin_config.admin;
        let mut pos_edition_plugin: Vec<PluginAuthorityPair> = vec![];

        let attributes: Vec<Attribute> = vec![
            Attribute{
                key: "profession".to_string(),
                value: self.freelancer_account.profession.to_string()
            },
            Attribute{
                key: "completed_projects".to_string(),
                value: self.freelancer_overview.total_projects_completed.to_string()
            },
            Attribute{
                key: "average_rating".to_string(),
                value: self.freelancer_overview.average_rating.to_string()
            },
            Attribute {
                key: "timestamp".to_string(),
                value: Clock::get()?.unix_timestamp.to_string(),
            }
        ];
        
        pos_edition_plugin.push(PluginAuthorityPair{
            plugin: Plugin::Attributes(Attributes{attribute_list: attributes}),
            authority: Some(PluginAuthority::UpdateAuthority)
        });

        pos_edition_plugin.push(PluginAuthorityPair{
            plugin: Plugin::PermanentFreezeDelegate(PermanentFreezeDelegate { frozen: true }),
            authority: Some(PluginAuthority::UpdateAuthority),
        });

        pos_edition_plugin.push(PluginAuthorityPair{
            plugin: Plugin::Edition(Edition { number: 1 }),
            authority: None
        });

        let signer_seeds: &[&[&[u8]]] = &[
            &[
                b"admin",
                admin.as_ref(),
                &[self.admin_config.admin_bump]
            ]
        ];

        CreateV2CpiBuilder::new(&self.mpl_core_program.to_account_info())
           .asset(&self.asset.to_account_info())
           .collection(Some(&self.collection.to_account_info()))
           .authority(Some(&self.admin_config.to_account_info()))
           .payer(&self.freelancer.to_account_info())
           .owner(Some(&self.freelancer.to_account_info()))
           .system_program(&self.system_program.to_account_info())
           .name(name)
           .uri(uri)
           .plugins(pos_edition_plugin)
           .invoke_signed(&signer_seeds)?;
        

        Ok(())
    }
}

