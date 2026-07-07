# Stage 1: Build the Rust workspace binaries
FROM rust:1.96-slim AS builder
WORKDIR /app
RUN apt-get update && apt-get install -y --no-install-recommends \
    pkg-config \
    libssl-dev \
    && rm -rf /var/lib/apt/lists/*

# Copy the workspace configuration and lockfile
COPY Cargo.toml Cargo.lock ./
COPY builder/Cargo.toml ./builder/Cargo.toml
COPY deployer/Cargo.toml ./deployer/Cargo.toml
COPY indexer/Cargo.toml ./indexer/Cargo.toml

# Create dummy sources to cache dependencies compilation
RUN mkdir -p builder/src deployer/src indexer/src && \
    echo "fn main() {}" > builder/src/main.rs && \
    echo "fn main() {}" > deployer/src/main.rs && \
    echo "fn main() {}" > indexer/src/main.rs

# Build workspace dependencies only
RUN cargo build --release

# Remove dummy sources
RUN rm -rf builder/src deployer/src indexer/src

# Copy real sources
COPY builder/src ./builder/src
COPY deployer/src ./deployer/src
COPY indexer/src ./indexer/src

# Rebuild real binaries
RUN touch builder/src/main.rs deployer/src/main.rs indexer/src/main.rs && \
    cargo build --release --bin builder

# Stage 2: Minimal runtime image
FROM debian:bookworm-slim AS runner
RUN apt-get update && apt-get install -y --no-install-recommends \
    libssl3 \
    ca-certificates \
    curl \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /app
COPY --from=builder /app/target/release/builder /app/builder

# Create non-root user
RUN groupadd -g 10001 appgroup && \
    useradd -r -u 10001 -g appgroup appuser && \
    chown -R appuser:appgroup /app
USER appuser

EXPOSE 3001

HEALTHCHECK --interval=30s --timeout=5s --start-period=5s --retries=3 \
  CMD curl -f http://localhost:3001/health || exit 1

CMD ["/app/builder"]
