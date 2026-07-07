use redis::Commands;
use serde::{Deserialize, Serialize};
use serde_json::Value;

#[derive(Debug, Deserialize, Serialize)]
pub struct BuildJobPayload {
    #[serde(rename = "deploymentId")]
    pub deployment_id: String,
    #[serde(rename = "contractId")]
    pub contract_id: String,
    pub network: String,
    #[serde(rename = "walletId")]
    pub wallet_id: String,
    #[serde(rename = "sourcePath")]
    pub source_path: String,
    pub language: String,
    #[serde(rename = "compilerVersion")]
    pub compiler_version: Option<String>,
}

pub fn queue_deploy_job(
    redis_conn: &mut redis::Connection,
    payload: &Value,
) -> Result<String, redis::RedisError> {
    let job_id = uuid::Uuid::new_v4().to_string();
    let job_key = format!("bull:deploy.queue:{}", job_id);

    let _: () = redis_conn.hset(&job_key, "data", serde_json::to_string(payload).unwrap())?;
    let _: () = redis_conn.rpush("bull:deploy.queue:wait", &job_id)?;

    Ok(job_id)
}
