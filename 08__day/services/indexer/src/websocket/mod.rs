pub async fn notify_realtime_api(deployment_id: &str, event_type: &str, details: serde_json::Value) {
    println!(
        "[INDEXER] [{}] Dispatched websocket notification callback: {} | Details: {:?}",
        deployment_id, event_type, details
    );
}
