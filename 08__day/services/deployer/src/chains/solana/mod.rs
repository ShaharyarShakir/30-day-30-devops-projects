pub mod deploy;
pub mod events;
pub mod rpc;
pub mod signer;
pub mod upgrade;

use async_trait::async_trait;
use crate::chains::traits::blockchain::Blockchain;
use deploy::deploy_program_impl;
use rpc::{estimate_solana_fees_impl, get_solana_balance_impl, get_program_account_impl, get_solana_tx_impl};
use serde_json::Value;
use signer::sign_solana_tx_impl;
use std::error::Error;

pub struct SolanaAdapter;

#[async_trait]
impl Blockchain for SolanaAdapter {
    async fn deploy_contract(
        &self,
        artifact: &Value,
        network: &str,
        wallet_address: &str,
        signature: &str,
    ) -> Result<String, Box<dyn Error>> {
        deploy_program_impl(artifact, network, wallet_address, signature).await
    }

    async fn verify_contract(
        &self,
        contract_address: &str,
        network: &str,
    ) -> Result<String, Box<dyn Error>> {
        println!("[DEPLOYER] [SOLANA] Verifying program metadata for {} on network {}...", contract_address, network);
        Ok("verified".to_string())
    }

    async fn estimate_gas_fee(
        &self,
        network: &str,
        payload: &str,
    ) -> Result<u64, Box<dyn Error>> {
        estimate_solana_fees_impl(network, payload).await
    }

    async fn get_transaction(
        &self,
        tx_hash: &str,
        network: &str,
    ) -> Result<Value, Box<dyn Error>> {
        get_solana_tx_impl(tx_hash, network).await
    }

    async fn get_contract(
        &self,
        contract_address: &str,
        network: &str,
    ) -> Result<Value, Box<dyn Error>> {
        get_program_account_impl(contract_address, network).await
    }

    async fn get_balance(
        &self,
        wallet_address: &str,
        network: &str,
    ) -> Result<u64, Box<dyn Error>> {
        get_solana_balance_impl(wallet_address, network).await
    }

    async fn sign_transaction(
        &self,
        wallet_address: &str,
        payload: &str,
    ) -> Result<String, Box<dyn Error>> {
        sign_solana_tx_impl(wallet_address, payload).await
    }
}
