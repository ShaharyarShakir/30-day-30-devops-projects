use std::error::Error;
use serde_json::Value;

pub async fn deploy_contract_impl(
    _artifact: &Value,
    network: &str,
    _wallet_address: &str,
    signature: &str,
) -> Result<String, Box<dyn Error>> {
    println!("[DEPLOYER] [EVM] Deploying contract on network {} with signature {}...", network, signature);
    let mock_address = format!("0x{}", uuid::Uuid::new_v4().simple());
    Ok(mock_address)
}
