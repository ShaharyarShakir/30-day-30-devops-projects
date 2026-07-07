use crate::compiler::{compile_contracts, run_tests};
use crate::git::clone_repo;
use crate::queue::{queue_deploy_job, BuildJobPayload};
use crate::storage::upload_artifact;
use chrono::Utc;
use redis::Commands;
use serde_json::{json, Value};
use sqlx::{Pool, Postgres};
use uuid::Uuid;

pub async fn handle_build_job(
    db_pool: &Pool<Postgres>,
    redis_conn: &mut redis::Connection,
    pubsub_client: &redis::Client,
    payload: &BuildJobPayload,
) -> Result<(), Box<dyn std::error::Error>> {
    let deployment_uuid = Uuid::parse_str(&payload.deployment_id)?;
    let now = Utc::now();

    // 1. Update DB to 'building'
    sqlx::query(
        "UPDATE deployments SET status = 'building', started_at = $1 WHERE id = $2"
    )
    .bind(now)
    .bind(deployment_uuid)
    .execute(db_pool)
    .await?;

    // 2. Publish state to Redis Pub/Sub
    publish_update(
        pubsub_client,
        &payload.deployment_id,
        "building",
        json!({
            "step": "cloning",
            "message": "Cloning smart contract repository..."
        })
    )?;

    // 3. Git Clone
    clone_repo("mock_url", "main", &payload.deployment_id).await;

    // 4. Compile
    publish_update(
        pubsub_client,
        &payload.deployment_id,
        "building",
        json!({
            "step": "compiling",
            "message": "Compiling smart contracts via solidity compiler..."
        })
    )?;
    compile_contracts(&payload.source_path, payload.compiler_version.as_deref(), &payload.deployment_id).await;

    // 5. Test
    publish_update(
        pubsub_client,
        &payload.deployment_id,
        "building",
        json!({
            "step": "testing",
            "message": "Running smart contract unit tests..."
        })
    )?;
    run_tests(&payload.deployment_id).await;

    // 6. Upload
    publish_update(
        pubsub_client,
        &payload.deployment_id,
        "building",
        json!({
            "step": "uploading",
            "message": "Uploading compiled contract artifacts..."
        })
    )?;
    let _artifacts = upload_artifact(&payload.deployment_id).await;

    // 7. Update status to 'deploying' in DB
    sqlx::query(
        "UPDATE deployments SET status = 'deploying' WHERE id = $1"
    )
    .bind(deployment_uuid)
    .execute(db_pool)
    .await?;

    publish_update(
        pubsub_client,
        &payload.deployment_id,
        "deploying",
        json!({
            "step": "queueing_deploy",
            "message": "Build completed. Enqueueing deployment job."
        })
    )?;

    // 8. Place job in deploy.queue wait list in Redis
    let deploy_payload = json!({
        "deploymentId": payload.deployment_id,
        "contractId": payload.contract_id,
        "network": payload.network,
        "walletId": payload.wallet_id,
    });

    let new_job_id = queue_deploy_job(redis_conn, &deploy_payload)?;
    println!(
        "[BUILDER] [{}] Build succeeded. Queued deploy job ID: {}",
        payload.deployment_id, new_job_id
    );

    Ok(())
}

fn publish_update(
    pubsub_client: &redis::Client,
    deployment_id: &str,
    status: &str,
    details: Value,
) -> redis::RedisResult<()> {
    let mut conn = pubsub_client.get_connection()?;
    let event = json!({
        "deploymentId": deployment_id,
        "status": status,
        "details": details
    });

    let message = serde_json::to_string(&event).unwrap();
    let _: () = conn.publish("deployment-updates", message)?;
    Ok(())
}
