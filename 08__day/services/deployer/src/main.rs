pub mod chains;
pub mod queue;

use axum::{routing::get, Json, Router};
use chrono::Utc;
use redis::Commands;
use queue::{queue_index_job, DeployJobPayload};
use chains::resolve_adapter;
use serde_json::{json, Value};
use sqlx::postgres::PgPoolOptions;
use sqlx::{Pool, Postgres};
use std::env;
use std::net::SocketAddr;
use std::time::Duration;
use tokio::time::sleep;
use uuid::Uuid;

#[tokio::main]
async fn main() {
    dotenvy::dotenv().ok();
    println!("[DEPLOYER] Starting Deployer Worker...");

    // 1. Initialize PostgreSQL connection pool
    let database_url = env::var("DATABASE_URL").expect("DATABASE_URL must be set");
    let db_pool = PgPoolOptions::new()
        .max_connections(5)
        .connect(&database_url)
        .await
        .expect("Failed to connect to Postgres");
    println!("[DEPLOYER] Connected to PostgreSQL DB.");

    // 2. Initialize Redis connection
    let redis_url = env::var("REDIS_URL").unwrap_or_else(|_| "redis://127.0.0.1:6379".to_string());
    let redis_client = redis::Client::open(redis_url.clone()).expect("Failed to create Redis client");
    println!("[DEPLOYER] Connected to Redis at {}", redis_url);

    // 3. Spawn Axum Health HTTP Server
    let health_pool = db_pool.clone();
    let health_app = Router::new()
        .route("/health", get(move || {
            let pool = health_pool.clone();
            async move {
                let db_status = pool.acquire().await.is_ok();
                Json(json!({
                    "status": if db_status { "up" } else { "down" },
                    "worker": "deployer",
                    "details": { "database": if db_status { "up" } else { "down" } }
                }))
            }
        }))
        .route("/ready", get(|| async { Json(json!({ "status": "ready" })) }))
        .route("/metrics", get(|| async {
            Json(json!({
                "queue_size": 0,
                "active_jobs": 0,
                "deployment_duration_seconds": 3.0
            }))
        }));

    let addr = SocketAddr::from(([0, 0, 0, 0], 3002));
    tokio::spawn(async move {
        let listener = tokio::net::TcpListener::bind(addr).await.unwrap();
        println!("[DEPLOYER] Health server listening on {}", addr);
        axum::serve(listener, health_app).await.unwrap();
    });

    // 4. Start Queue Consumer Loop
    let mut conn = redis_client.get_connection().expect("Failed to get Redis connection");
    let pubsub_client = redis_client.clone();

    loop {
        println!("[DEPLOYER] Waiting for deploy jobs...");
        let pop_res: Result<Option<(String, String)>, redis::RedisError> = 
            conn.blpop("bull:deploy.queue:wait", 0.0);

        match pop_res {
            Ok(Some((_list, job_id))) => {
                println!("[DEPLOYER] Found job ID: {}", job_id);
                let job_key = format!("bull:deploy.queue:{}", job_id);
                let data_str_res: Result<String, redis::RedisError> = conn.hget(&job_key, "data");

                if let Ok(data_str) = data_str_res {
                    if let Ok(payload) = serde_json::from_str::<DeployJobPayload>(&data_str) {
                        println!(
                            "[DEPLOYER] Processing deployment: {} | contract: {} | wallet: {}",
                            payload.deployment_id, payload.contract_id, payload.wallet_id
                        );

                        if let Err(e) = process_deploy_job(
                            &db_pool,
                            &mut conn,
                            &pubsub_client,
                            &payload
                        ).await {
                            eprintln!("[DEPLOYER] Error processing deploy job: {:?}", e);
                        }
                    } else {
                        eprintln!("[DEPLOYER] Failed to deserialize job payload: {}", data_str);
                    }
                } else {
                    eprintln!("[DEPLOYER] Failed to fetch job details for key: {}", job_key);
                }
            }
            Err(e) => {
                eprintln!("[DEPLOYER] Redis BLPOP error: {:?}", e);
                sleep(Duration::from_secs(2)).await;
            }
            _ => {}
        }
    }
}

async fn process_deploy_job(
    db_pool: &Pool<Postgres>,
    redis_conn: &mut redis::Connection,
    pubsub_client: &redis::Client,
    payload: &DeployJobPayload,
) -> Result<(), Box<dyn std::error::Error>> {
    let deployment_uuid = Uuid::parse_str(&payload.deployment_id)?;

    // 1. Fetch wallet info from DB
    let wallet_uuid = Uuid::parse_str(&payload.wallet_id)?;
    let wallet_row: (String, String) = sqlx::query_as(
        "SELECT chain_family, address FROM wallets WHERE id = $1"
    )
    .bind(wallet_uuid)
    .fetch_one(db_pool)
    .await?;

    let chain_family = wallet_row.0; // "evm" or "solana"
    let wallet_address = wallet_row.1;

    println!(
        "[DEPLOYER] [{}] Selected wallet family: {} | Address: {}",
        payload.deployment_id, chain_family, wallet_address
    );

    // Resolve adapter dynamically
    let adapter = resolve_adapter(&chain_family);

    // 2. Publish state: 'estimating_gas'
    publish_update(
        pubsub_client,
        &payload.deployment_id,
        "deploying",
        json!({
            "step": "estimating_gas",
            "message": format!("Estimating gas and fees on network: {}...", payload.network)
        })
    )?;
    
    let gas_fee = adapter.estimate_gas_fee(&payload.network, "deploy_payload").await?;
    println!("[DEPLOYER] [{}] Estimated gas/fee: {}", payload.deployment_id, gas_fee);

    // 3. Publish state: 'signing_tx'
    publish_update(
        pubsub_client,
        &payload.deployment_id,
        "deploying",
        json!({
            "step": "signing_tx",
            "message": format!("Signing deployment transaction using wallet {}...", wallet_address)
        })
    )?;
    let tx_sig = adapter.sign_transaction(&wallet_address, "deploy_payload").await?;

    // 4. Publish state: 'broadcasting'
    publish_update(
        pubsub_client,
        &payload.deployment_id,
        "deploying",
        json!({
            "step": "broadcasting",
            "message": format!("Broadcasting transaction to network. Signature/Hash: {}", tx_sig)
        })
    )?;
    
    // 5. Deploy & retrieve contract address
    let contract_address = adapter.deploy_contract(&json!({}), &payload.network, &wallet_address, &tx_sig).await?;

    // 6. Verify Contract
    let _verification_status = adapter.verify_contract(&contract_address, &payload.network).await?;

    // 7. Update DB: succeeded status, finished_at, and contract_address
    let now = Utc::now();
    sqlx::query(
        "UPDATE deployments SET status = 'succeeded', contract_address = $1, finished_at = $2, verification_status = 'verified' WHERE id = $3"
    )
    .bind(&contract_address)
    .bind(now)
    .bind(deployment_uuid)
    .execute(db_pool)
    .await?;

    // 8. Write to transactions table
    let tx_uuid = Uuid::new_v4();
    let gas_used = sqlx::types::BigDecimal::from(gas_fee);
    let fee_lamports = gas_fee as i64;

    sqlx::query(
        "INSERT INTO transactions (id, deployment_id, tx_hash, chain_family, gas_used, fee_lamports) VALUES ($1, $2, $3, $4, $5, $6)"
    )
    .bind(tx_uuid)
    .bind(deployment_uuid)
    .bind(&tx_sig)
    .bind(&chain_family)
    .bind(&gas_used)
    .bind(fee_lamports)
    .execute(db_pool)
    .await?;

    // 9. Publish finished state to Redis Pub/Sub
    publish_update(
        pubsub_client,
        &payload.deployment_id,
        "succeeded",
        json!({
            "step": "completed",
            "message": "Deployment confirmed and contract successfully verified!",
            "contractAddress": contract_address,
            "txHash": tx_sig
        })
    )?;

    // 10. Queue job to index.queue
    let index_payload = json!({
        "deploymentId": payload.deployment_id,
        "contractId": payload.contract_id,
        "txHash": tx_sig,
        "contractAddress": contract_address,
    });

    let new_job_id = queue_index_job(redis_conn, &index_payload)?;
    println!(
        "[DEPLOYER] [{}] Deployment succeeded. Contract: {} | tx: {}. Queueing Indexer job: {}",
        payload.deployment_id, contract_address, tx_sig, new_job_id
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
