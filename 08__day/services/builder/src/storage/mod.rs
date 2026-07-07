use serde_json::{json, Value};
use std::time::Duration;
use tokio::time::sleep;

pub async fn upload_artifact(deployment_id: &str) -> Value {
    println!("[BUILDER] [{}] Uploading ABI and Bytecode build artifacts to mock storage...", deployment_id);
    sleep(Duration::from_secs(1)).await;
    println!("[BUILDER] [{}] Artifact uploaded successfully.", deployment_id);
    json!({
        "abi": [],
        "bytecode": "0x608060405234801561001057600080fd5b50610150806100206000396000f3fe"
    })
}
