pub mod database;
pub mod ethereum;
pub mod solana;
pub mod websocket;

use axum::{routing::get, Json, Router};
use redis::Commands;
use serde::{Deserialize, Serialize};
use serde_json::json;
use sqlx::postgres::PgPoolOptions;
use sqlx::{Pool, Postgres};
use std::env;
use std::net::SocketAddr;
use std::time::Duration;
use tokio::time::sleep;
use uuid::Uuid;
use database::store_indexing_audit;
use ethereum::parse_evm_logs;
use solana::parse_solana_instructions;
use websocket::notify_realtime_api;

#[derive(Debug, Deserialize, Serialize)]
struct IndexJobPayload {
    #[serde(rename = "deploymentId")]
    deployment_id: String,
    #[serde(rename = "contractId")]
    contract_id: String,
    #[serde(rename = "txHash")]
    tx_hash: String,
    #[serde(rename = "contractAddress")]
    contract_address: String,
}

#[tokio::main]
async fn main() {
    dotenvy::dotenv().ok();
    println!("[INDEXER] Starting Indexer Worker...");

    // 1. Initialize PostgreSQL connection pool
    let database_url = env::var("DATABASE_URL").expect("DATABASE_URL must be set");
    let db_pool = PgPoolOptions::new()
        .max_connections(5)
        .connect(&database_url)
        .await
        .expect("Failed to connect to Postgres");
    println!("[INDEXER] Connected to PostgreSQL DB.");

    // 2. Initialize Redis connection
    let redis_url = env::var("REDIS_URL").unwrap_or_else(|_| "redis://127.0.0.1:6379".to_string());
    let redis_client = redis::Client::open(redis_url.clone()).expect("Failed to create Redis client");
    println!("[INDEXER] Connected to Redis at {}", redis_url);

    // 3. Spawn Axum Health HTTP Server
    let health_pool = db_pool.clone();
    let health_app = Router::new()
        .route("/health", get(move || {
            let pool = health_pool.clone();
            async move {
                let db_status = pool.acquire().await.is_ok();
                Json(json!({
                    "status": if db_status { "up" } else { "down" },
                    "worker": "indexer",
                    "details": { "database": if db_status { "up" } else { "down" } }
                }))
            }
        }))
        .route("/ready", get(|| async { Json(json!({ "status": "ready" })) }))
        .route("/metrics", get(|| async {
            Json(json!({
                "queue_size": 0,
                "active_jobs": 0,
                "events_indexed": 12
            }))
        }));

    let addr = SocketAddr::from(([0, 0, 0, 0], 3003));
    tokio::spawn(async move {
        let listener = tokio::net::TcpListener::bind(addr).await.unwrap();
        println!("[INDEXER] Health server listening on {}", addr);
        axum::serve(listener, health_app).await.unwrap();
    });

    // 4. Start Queue Consumer Loop
    let mut conn = redis_client.get_connection().expect("Failed to get Redis connection");

    loop {
        println!("[INDEXER] Waiting for index jobs...");
        let pop_res: Result<Option<(String, String)>, redis::RedisError> = 
            conn.blpop("bull:index.queue:wait", 0.0);

        match pop_res {
            Ok(Some((_list, job_id))) => {
                println!("[INDEXER] Found job ID: {}", job_id);
                let job_key = format!("bull:index.queue:{}", job_id);
                let data_str_res: Result<String, redis::RedisError> = conn.hget(&job_key, "data");

                if let Ok(data_str) = data_str_res {
                    if let Ok(payload) = serde_json::from_str::<IndexJobPayload>(&data_str) {
                        println!(
                            "[INDEXER] Indexing deployment: {} | contract: {} | tx: {}",
                            payload.deployment_id, payload.contract_id, payload.tx_hash
                        );

                        if let Err(e) = process_index_job(
                            &db_pool,
                            &payload
                        ).await {
                            eprintln!("[INDEXER] Error processing index job: {:?}", e);
                        }
                    } else {
                        eprintln!("[INDEXER] Failed to deserialize job payload: {}", data_str);
                    }
                } else {
                    eprintln!("[INDEXER] Failed to fetch job details for key: {}", job_key);
                }
            }
            Err(e) => {
                eprintln!("[INDEXER] Redis BLPOP error: {:?}", e);
                sleep(Duration::from_secs(2)).await;
            }
            _ => {}
        }
    }
}

async fn process_index_job(
    db_pool: &Pool<Postgres>,
    payload: &IndexJobPayload,
) -> Result<(), Box<dyn std::error::Error>> {
    let deployment_uuid = Uuid::parse_str(&payload.deployment_id)?;

    // 1. Resolve chain family to invoke correct logs parsing
    let wallet_row: (String,) = sqlx::query_as(
        "SELECT w.chain_family FROM deployments d 
         JOIN wallets w ON d.wallet_id = w.id
         WHERE d.id = $1"
    )
    .bind(deployment_uuid)
    .fetch_one(db_pool)
    .await?;

    let chain_family = wallet_row.0;

    if chain_family == "solana" {
        parse_solana_instructions(&payload.contract_address, &payload.tx_hash).await;
    } else {
        parse_evm_logs(&payload.contract_address, &payload.tx_hash).await;
    }

    // 2. Insert audit log record
    let audit_uuid = store_indexing_audit(
        db_pool,
        deployment_uuid,
        &payload.tx_hash,
        &payload.contract_address
    ).await?;

    // 3. Notify real-time WebSockets
    notify_realtime_api(
        &payload.deployment_id,
        "CONTRACT_DEPLOYED_INDEXED",
        json!({ "auditLogId": audit_uuid.to_string() })
    ).await;

    println!(
        "[INDEXER] [{}] Event indexing complete. Written audit log ID: {}",
        payload.deployment_id, audit_uuid
    );

    Ok(())
}
