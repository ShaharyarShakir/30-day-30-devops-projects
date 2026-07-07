#!/bin/bash
# ChainDeploy Disaster Recovery Backup Script
set -e

BACKUP_DIR="/var/backups/chaindeploy/$(date +%F-%H%M%S)"
mkdir -p "$BACKUP_DIR"
echo "[BACKUP] Starting backup sequence at $BACKUP_DIR..."

# 1. PostgreSQL backup
echo "[BACKUP] Backing up PostgreSQL database..."
if [ -n "$DATABASE_URL" ]; then
  if command -v pg_dump >/dev/null 2>&1; then
    pg_dump "${DATABASE_URL}" > "$BACKUP_DIR/postgres.sql"
  elif command -v docker >/dev/null 2>&1; then
    docker exec chaindeploy-postgres pg_dump -U postgres chaindeploy > "$BACKUP_DIR/postgres.sql"
  fi
  echo "[BACKUP] PostgreSQL backup complete."
else
  echo "[BACKUP] Warning: DATABASE_URL not set, skipping local dump."
fi

# 2. Vault backup
echo "[BACKUP] Backing up Vault secrets..."
if command -v vault >/dev/null 2>&1; then
  # Try Raft snapshot save
  if vault operator raft snapshot save "$BACKUP_DIR/vault-raft.snap" > /dev/null 2>&1; then
    echo "[BACKUP] Vault Raft snapshot saved."
  else
    # KV v2 JSON dump fallback
    vault kv get -format=json secret/chaindeploy > "$BACKUP_DIR/vault-kv.json" 2>/dev/null || true
    echo "[BACKUP] Vault KV data exported to JSON."
  fi
elif command -v docker >/dev/null 2>&1; then
  docker exec chaindeploy-vault vault operator raft snapshot save /tmp/vault-raft.snap >/dev/null 2>&1 && \
    docker cp chaindeploy-vault:/tmp/vault-raft.snap "$BACKUP_DIR/vault-raft.snap" || true
fi

# 3. Archive backup
echo "[BACKUP] Archiving backup package..."
tar -czf "${BACKUP_DIR}.tar.gz" -C "$BACKUP_DIR" .
rm -rf "$BACKUP_DIR"

echo "[BACKUP] Backup completed successfully: ${BACKUP_DIR}.tar.gz"
