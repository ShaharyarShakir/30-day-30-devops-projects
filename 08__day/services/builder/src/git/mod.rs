use std::time::Duration;
use tokio::time::sleep;

pub async fn clone_repo(repo_url: &str, branch: &str, deployment_id: &str) {
    println!(
        "[BUILDER] [{}] Cloning repository: {} on branch: {}...",
        deployment_id, repo_url, branch
    );
    sleep(Duration::from_secs(1)).await;
    println!("[BUILDER] [{}] Repository cloned successfully.", deployment_id);
}
