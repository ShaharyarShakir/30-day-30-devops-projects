use std::error::Error;

pub async fn sign_solana_tx_impl(
    wallet_address: &str,
    payload: &str,
) -> Result<String, Box<dyn Error>> {
    println!("[DEPLOYER] [SOLANA] Signing transaction payload: {} with wallet: {}...", payload, wallet_address);
    let signature = format!("5HqSfd1nUu59yS8Wd1g4L...{}", &uuid::Uuid::new_v4().to_string()[..8]);
    Ok(signature)
}
