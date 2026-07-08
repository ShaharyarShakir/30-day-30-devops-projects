use std::error::Error;

pub async fn sign_transaction_impl(
    wallet_address: &str,
    payload: &str,
) -> Result<String, Box<dyn Error>> {
    println!("[DEPLOYER] [EVM] Signing payload: {} using wallet: {}...", payload, wallet_address);
    let sig = format!("evm_sig_{}", uuid::Uuid::new_v4().simple());
    Ok(sig)
}
