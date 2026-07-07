#!/bin/bash
# ChainDeploy Disaster Recovery Restore Script
set -e

BACKUP_ARCHIVE="$1"

if [ -z "$BACKUP_ARCHIVE" ]; then
  echo "Usage: $0 <path-to-backup-archive.tar.gz>"
  exit 1
fi

TEMP_DIR="/tmp/chaindeploy-restore-$(date +%s)"
mkdir -p "$TEMP_DIR"
tar -xzf "$BACKUP_ARCHIVE" -C "$TEMP_DIR"

echo "[RESTORE] Starting restore sequence..."

# 1. Restore PostgreSQL
if [ -f "$TEMP_DIR/postgres.sql" ]; then
  echo "[RESTORE] Restoring PostgreSQL database..."
  if command -v psql >/dev/null 2>&1; then
    psql "${DATABASE_URL}" -f "$TEMP_DIR/postgres.sql"
  elif command -v docker >/dev/null 2>&1; then
    docker cp "$TEMP_DIR/postgres.sql" chaindeploy-postgres:/tmp/postgres.sql
    docker exec chaindeploy-postgres psql -U postgres -d chaindeploy -f /tmp/postgres.sql
  fi
  echo "[RESTORE] PostgreSQL DB successfully restored."
else
  echo "[RESTORE] No postgres.sql file found in archive."
fi

# 2. Restore Vault
if [ -f "$TEMP_DIR/vault-raft.snap" ]; then
  echo "[RESTORE] Restoring Vault Raft snapshot..."
  if command -v vault >/dev/null 2>&1; then
    vault operator raft snapshot restore "$TEMP_DIR/vault-raft.snap"
  elif command -v docker >/dev/null 2>&1; then
    docker cp "$TEMP_DIR/vault-raft.snap" chaindeploy-vault:/tmp/vault-raft.snap
    docker exec chaindeploy-vault vault operator raft snapshot restore /tmp/vault-raft.snap
  fi
  echo "[RESTORE] Vault Raft snapshot successfully restored."
elif [ -f "$TEMP_DIR/vault-kv.json" ]; then
  echo "[RESTORE] Restoring Vault KV secrets from JSON..."
  if command -v vault >/dev/null 2>&1; then
    vault kv put secret/chaindeploy @"$TEMP_DIR/vault-kv.json"
  fi
  echo "[RESTORE] Vault KV secrets successfully restored."
fi

rm -rf "$TEMP_DIR"
echo "[RESTORE] Restore completed successfully!"
