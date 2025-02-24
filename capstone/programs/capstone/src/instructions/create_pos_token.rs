use anchor_lang::prelude::*;
use mpl_core::{
    self,
    ID as MPL_CORE_ID,
    instructions::CreateCollectionV2CpiBuilder ,
    types::{
        Attribute,
        Attributes,
        Plugin,
        PluginAuthority,
        PluginAuthorityPair,
        MasterEdition,
    },
};
use crate::{
    state::AdminConfig,
    error::ErrorCode
};

#[derive(Accounts)]
pub struct CreatePOSToken<'info> {
    #[account(mut)]
    pub admin: Signer<'info>, 

    #[account(mut)]
    pub pos_token_account: Signer<'info>,

    #[account(
        seeds = [b"admin", admin.key().as_ref()], 
        bump = admin_config.admin_bump,
        constraint = admin.key() == admin_config.admin @ ErrorCode::UnauthorizedAdmin
    )]
    pub admin_config: Account<'info, AdminConfig>, 

    /// CHECK: this account is checked by the address constraint
    #[account(address = MPL_CORE_ID)]
    pub mpl_core_program: UncheckedAccount<'info>,

    pub system_program: Program<'info, System>,
}

impl<'info> CreatePOSToken<'info> {
    pub fn create_pos_token(&mut self, name: String, uri: String) -> Result<()> {

        let mut pos_collection_plugin: Vec<PluginAuthorityPair> = vec![];

        let attributes: Vec<Attribute> = vec![
            Attribute{
                key: "name".to_string(),
                value: name.clone(),
            },
            Attribute {
                key: "uri".to_string(),
                value: uri.clone(),
            },
        ];

        let master_edition = MasterEdition{
            max_supply: None,
            name: Some(name.clone()),
            uri: Some(uri.clone()),
        };

        pos_collection_plugin.push(PluginAuthorityPair{
            plugin: Plugin::Attributes(Attributes{attribute_list: attributes}),
            authority: Some(PluginAuthority::UpdateAuthority)
        });

        pos_collection_plugin.push(PluginAuthorityPair{
            plugin: Plugin::MasterEdition(master_edition),
            authority: Some(PluginAuthority::UpdateAuthority)
        });

        CreateCollectionV2CpiBuilder::new(&self.mpl_core_program.to_account_info())
            .collection(&self.pos_token_account.to_account_info())
            .payer(&self.admin.to_account_info())
            .update_authority(Some(&self.admin_config.to_account_info()))
            .system_program(&self.system_program.to_account_info())
            .name(name)
            .uri(uri)
            .plugins(pos_collection_plugin)
            .invoke()?;

        Ok(())
    }
}
