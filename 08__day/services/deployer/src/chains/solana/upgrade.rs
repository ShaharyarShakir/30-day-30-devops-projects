use std::error::Error;

pub async fn upgrade_program_impl(
    program_id: &str,
    buffer_address: &str,
    authority_wallet: &str,
) -> Result<String, Box<dyn Error>> {
    println!(
        "[DEPLOYER] [SOLANA] Upgrading Solana program: {} to buffer: {} using authority wallet: {}...",
        program_id, buffer_address, authority_wallet
    );
    let upgrade_tx = format!("upgrade_tx_{}", uuid::Uuid::new_v4().simple());
    Ok(upgrade_tx)
}
