use serde_json::json;
use sqlx::{Pool, Postgres};
use uuid::Uuid;

pub async fn store_indexing_audit(
    db_pool: &Pool<Postgres>,
    deployment_uuid: Uuid,
    tx_hash: &str,
    contract_address: &str,
) -> Result<Uuid, Box<dyn std::error::Error>> {
    // 1. Fetch owner user_id from DB
    let owner_row: (Uuid,) = sqlx::query_as(
        "SELECT p.owner_id FROM deployments d 
         JOIN contracts c ON d.contract_id = c.id
         JOIN projects p ON c.project_id = p.id
         WHERE d.id = $1"
    )
    .bind(deployment_uuid)
    .fetch_one(db_pool)
    .await?;

    let owner_id = owner_row.0;

    // 2. Insert audit log record
    let audit_uuid = Uuid::new_v4();
    let metadata = json!({
        "deploymentId": deployment_uuid.to_string(),
        "contractAddress": contract_address,
        "txHash": tx_hash,
        "indexedEvents": ["ContractDeployed", "OwnershipTransferred"]
    });

    sqlx::query(
        "INSERT INTO audit_logs (id, user_id, action, metadata) VALUES ($1, $2, $3, $4)"
    )
    .bind(audit_uuid)
    .bind(owner_id)
    .bind("CONTRACT_DEPLOYED_INDEXED")
    .bind(metadata)
    .execute(db_pool)
    .await?;

    Ok(audit_uuid)
}
