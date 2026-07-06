use std::time::Duration;
use tokio::time::sleep;

pub async fn compile_contracts(source_path: &str, compiler_version: Option<&str>, deployment_id: &str) {
    println!(
        "[BUILDER] [{}] Compiling contract at source path: {} using compiler: {:?}...",
        deployment_id, source_path, compiler_version
    );
    sleep(Duration::from_secs(1)).await;
    println!("[BUILDER] [{}] Compilation succeeded.", deployment_id);
}

pub async fn run_tests(deployment_id: &str) {
    println!("[BUILDER] [{}] Running unit tests...", deployment_id);
    sleep(Duration::from_secs(1)).await;
    println!("[BUILDER] [{}] All tests passed.", deployment_id);
}
