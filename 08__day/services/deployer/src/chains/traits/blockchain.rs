use async_trait::async_trait;
use serde_json::Value;
use std::error::Error;

#[async_trait]
pub trait Blockchain: Send + Sync {
    async fn deploy_contract(
        &self,
        artifact: &Value,
        network: &str,
        wallet_address: &str,
        signature: &str,
    ) -> Result<String, Box<dyn Error>>;

    async fn verify_contract(
        &self,
        contract_address: &str,
        network: &str,
    ) -> Result<String, Box<dyn Error>>;

    async fn estimate_gas_fee(
        &self,
        network: &str,
        payload: &str,
    ) -> Result<u64, Box<dyn Error>>;

    async fn get_transaction(
        &self,
        tx_hash: &str,
        network: &str,
    ) -> Result<Value, Box<dyn Error>>;

    async fn get_contract(
        &self,
        contract_address: &str,
        network: &str,
    ) -> Result<Value, Box<dyn Error>>;

    async fn get_balance(
        &self,
        wallet_address: &str,
        network: &str,
    ) -> Result<u64, Box<dyn Error>>;

    async fn sign_transaction(
        &self,
        wallet_address: &str,
        payload: &str,
    ) -> Result<String, Box<dyn Error>>;
}
