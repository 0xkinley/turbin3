pub mod constants;
pub mod error;
pub mod instructions;
pub mod state;

use anchor_lang::prelude::*;

pub use constants::*;
pub use instructions::*;
pub use state::*;

declare_id!("9oGo5sdbuwuRpEudTqkW5GYiiy7FbmpRooLXpwFjQ4yz");

#[program]
pub mod dice {
    use super::*;

}
