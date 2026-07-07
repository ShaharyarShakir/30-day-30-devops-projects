pub mod ethereum;
pub mod solana;
pub mod traits;

use ethereum::EthereumAdapter;
use solana::SolanaAdapter;
use traits::blockchain::Blockchain;

pub fn resolve_adapter(chain_family: &str) -> Box<dyn Blockchain> {
    match chain_family {
        "solana" => Box::new(SolanaAdapter),
        _ => Box::new(EthereumAdapter),
    }
}
