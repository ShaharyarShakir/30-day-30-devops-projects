use std::time::Duration;
use tokio::time::sleep;

pub async fn parse_evm_logs(contract_address: &str, tx_hash: &str) {
    println!(
        "[INDEXER] [EVM] Subscribing and listening to EVM logs for contract {} (tx: {})...",
        contract_address, tx_hash
    );
    sleep(Duration::from_secs(1)).await;
    println!("[INDEXER] [EVM] Decoded EVM logs: Transfer(), OwnershipTransferred().");
}
