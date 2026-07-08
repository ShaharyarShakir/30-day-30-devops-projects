pub mod deploy;
pub mod events;
pub mod rpc;
pub mod signer;
pub mod verify;

use async_trait::async_trait;
use crate::chains::traits::blockchain::Blockchain;
use deploy::deploy_contract_impl;
use rpc::{estimate_gas_fee_impl, get_balance_impl, get_contract_impl, get_transaction_impl};
use serde_json::Value;
use signer::sign_transaction_impl;
use std::error::Error;
use verify::verify_contract_impl;

pub struct EthereumAdapter;

#[async_trait]
impl Blockchain for EthereumAdapter {
    async fn deploy_contract(
        &self,
        artifact: &Value,
        network: &str,
        wallet_address: &str,
        signature: &str,
    ) -> Result<String, Box<dyn Error>> {
        deploy_contract_impl(artifact, network, wallet_address, signature).await
    }

    async fn verify_contract(
        &self,
        contract_address: &str,
        network: &str,
    ) -> Result<String, Box<dyn Error>> {
        verify_contract_impl(contract_address, network).await
    }

    async fn estimate_gas_fee(
        &self,
        network: &str,
        payload: &str,
    ) -> Result<u64, Box<dyn Error>> {
        estimate_gas_fee_impl(network, payload).await
    }

    async fn get_transaction(
        &self,
        tx_hash: &str,
        network: &str,
    ) -> Result<Value, Box<dyn Error>> {
        get_transaction_impl(tx_hash, network).await
    }

    async fn get_contract(
        &self,
        contract_address: &str,
        network: &str,
    ) -> Result<Value, Box<dyn Error>> {
        get_contract_impl(contract_address, network).await
    }

    async fn get_balance(
        &self,
        wallet_address: &str,
        network: &str,
    ) -> Result<u64, Box<dyn Error>> {
        get_balance_impl(wallet_address, network).await
    }

    async fn sign_transaction(
        &self,
        wallet_address: &str,
        payload: &str,
    ) -> Result<String, Box<dyn Error>> {
        sign_transaction_impl(wallet_address, payload).await
    }
}
