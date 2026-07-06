pub mod compiler;
pub mod config;
pub mod git;
pub mod handlers;
pub mod queue;
pub mod storage;

use axum::{routing::get, Json, Router};
use config::Config;
use handlers::handle_build_job;
use queue::BuildJobPayload;
use redis::Commands;
use serde_json::json;
use sqlx::postgres::PgPoolOptions;
use std::net::SocketAddr;
use std::time::Duration;
use tokio::time::sleep;

#[tokio::main]
async fn main() {
    println!("[BUILDER] Starting Builder Worker...");
    let config = Config::load();

    // 1. Initialize PostgreSQL connection pool
    let db_pool = PgPoolOptions::new()
        .max_connections(5)
        .connect(&config.database_url)
        .await
        .expect("Failed to connect to Postgres");
    println!("[BUILDER] Connected to PostgreSQL DB.");

    // 2. Initialize Redis client
    let redis_client = redis::Client::open(config.redis_url.clone()).expect("Failed to create Redis client");
    println!("[BUILDER] Connected to Redis at {}", config.redis_url);

    // 3. Spawn Axum Health HTTP Server
    let health_pool = db_pool.clone();
    let health_app = Router::new()
        .route("/health", get(move || {
            let pool = health_pool.clone();
            async move {
                let db_status = pool.acquire().await.is_ok();
                Json(json!({
                    "status": if db_status { "up" } else { "down" },
                    "worker": "builder",
                    "details": { "database": if db_status { "up" } else { "down" } }
                }))
            }
        }))
        .route("/ready", get(|| async { Json(json!({ "status": "ready" })) }))
        .route("/metrics", get(|| async {
            Json(json!({
                "queue_size": 0,
                "active_jobs": 1,
                "build_duration_seconds": 3.0
            }))
        }));

    let addr = SocketAddr::from(([0, 0, 0, 0], 3001));
    tokio::spawn(async move {
        let listener = tokio::net::TcpListener::bind(addr).await.unwrap();
        println!("[BUILDER] Health server listening on {}", addr);
        axum::serve(listener, health_app).await.unwrap();
    });

    // 4. Start Queue Consumer Loop
    let mut conn = redis_client.get_connection().expect("Failed to get Redis connection");
    let pubsub_client = redis_client.clone();

    loop {
        println!("[BUILDER] Waiting for build jobs...");
        let pop_res: Result<Option<(String, String)>, redis::RedisError> = 
            conn.blpop("bull:build.queue:wait", 0.0);

        match pop_res {
            Ok(Some((_list, job_id))) => {
                println!("[BUILDER] Found job ID: {}", job_id);
                let job_key = format!("bull:build.queue:{}", job_id);
                let data_str_res: Result<String, redis::RedisError> = conn.hget(&job_key, "data");

                if let Ok(data_str) = data_str_res {
                    if let Ok(payload) = serde_json::from_str::<BuildJobPayload>(&data_str) {
                        println!(
                            "[BUILDER] Processing deployment: {} | contract: {} | source_path: {}",
                            payload.deployment_id, payload.contract_id, payload.source_path
                        );

                        if let Err(e) = handle_build_job(
                            &db_pool,
                            &mut conn,
                            &pubsub_client,
                            &payload
                        ).await {
                            eprintln!("[BUILDER] Error processing build job: {:?}", e);
                        }
                    } else {
                        eprintln!("[BUILDER] Failed to deserialize job payload: {}", data_str);
                    }
                } else {
                    eprintln!("[BUILDER] Failed to fetch job details for key: {}", job_key);
                }
            }
            Err(e) => {
                eprintln!("[BUILDER] Redis BLPOP error: {:?}", e);
                sleep(Duration::from_secs(2)).await;
            }
            _ => {}
        }
    }
}
