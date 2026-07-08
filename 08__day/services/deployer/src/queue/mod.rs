use redis::Commands;
use serde::{Deserialize, Serialize};
use serde_json::Value;

#[derive(Debug, Deserialize, Serialize)]
pub struct DeployJobPayload {
    #[serde(rename = "deploymentId")]
    pub deployment_id: String,
    #[serde(rename = "contractId")]
    pub contract_id: String,
    pub network: String,
    #[serde(rename = "walletId")]
    pub wallet_id: String,
}

pub fn queue_index_job(
    redis_conn: &mut redis::Connection,
    payload: &Value,
) -> Result<String, redis::RedisError> {
    let job_id = uuid::Uuid::new_v4().to_string();
    let job_key = format!("bull:index.queue:{}", job_id);

    let _: () = redis_conn.hset(&job_key, "data", serde_json::to_string(payload).unwrap())?;
    let _: () = redis_conn.rpush("bull:index.queue:wait", &job_id)?;

    Ok(job_id)
}
