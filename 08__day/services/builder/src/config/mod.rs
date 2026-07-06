use std::env;

pub struct Config {
    pub database_url: String,
    pub redis_url: String,
}

impl Config {
    pub fn load() -> Self {
        dotenvy::dotenv().ok();
        let database_url = env::var("DATABASE_URL").expect("DATABASE_URL must be set");
        let redis_url = env::var("REDIS_URL").unwrap_or_else(|_| "redis://127.0.0.1:6379".to_string());
        Self { database_url, redis_url }
    }
}
