#!/bin/bash
# setup-garage.sh - Automates Garage S3 initialization

set -e

echo "[Garage Setup] Waiting for Garage container to be healthy..."
max_attempts=30
attempt=1
node_id=""

while [ $attempt -le $max_attempts ]; do
  if docker compose exec -T garage /garage status > /dev/null 2>&1; then
    # Extract Node ID from status (16-char hex word)
    status_output=$(docker compose exec -T garage /garage status)
    node_id=$(echo "$status_output" | grep -o -E '\b[0-9a-fA-F]{16}\b' | head -n 1 || echo "")
    
    if [ ! -z "$node_id" ]; then
      echo "[Garage Setup] Garage is ready! Node ID: $node_id"
      break
    fi
  fi
  echo "[Garage Setup] Attempt $attempt/$max_attempts: Garage not ready yet. Retrying in 2s..."
  sleep 2
  attempt=$((attempt + 1))
done

if [ -z "$node_id" ]; then
  echo "[Garage Setup] Error: Failed to retrieve Garage Node ID or contact cluster."
  exit 1
fi

echo "[Garage Setup] Configuring cluster layout..."
docker compose exec -T garage /garage layout assign -z dc1 -c 1G "$node_id"
docker compose exec -T garage /garage layout apply --version 1

echo "[Garage Setup] Creating bucket 'nomad-media'..."
# Check if bucket already exists
if ! docker compose exec -T garage /garage bucket list | grep -q "nomad-media"; then
  docker compose exec -T garage /garage bucket create nomad-media
else
  echo "[Garage Setup] Bucket 'nomad-media' already exists."
fi

echo "[Garage Setup] Creating credentials key 'nomad-key'..."
key_output=$(docker compose exec -T garage /garage key create nomad-key || echo "")
if [ -z "$key_output" ]; then
  # key might already exist, get its info
  key_output=$(docker compose exec -T garage /garage key info nomad-key)
fi

# Associate key to bucket
docker compose exec -T garage /garage bucket allow nomad-media --key nomad-key --read --write

# Fetch S3 Credentials
access_key_id=$(echo "$key_output" | grep -i "Access key ID:" | awk '{print $4}' || echo "")
secret_access_key=$(echo "$key_output" | grep -i "Secret access key:" | awk '{print $4}' || echo "")

if [ -z "$access_key_id" ] || [ -z "$secret_access_key" ]; then
  # try alternative grep parser
  info_output=$(docker compose exec -T garage /garage key info nomad-key)
  access_key_id=$(echo "$info_output" | grep -i "Access key ID" | awk -F': ' '{print $2}' | tr -d ' ' || echo "")
  secret_access_key=$(echo "$info_output" | grep -i "Secret access key" | awk -F': ' '{print $2}' | tr -d ' ' || echo "")
fi

echo "=========================================="
echo " Garage S3 Credentials Generated Successfully!"
echo " Access Key ID:     $access_key_id"
echo " Secret Access Key: $secret_access_key"
echo " Region:            garage"
echo " Endpoint:          http://localhost:3900"
echo " Bucket Name:       nomad-media"
echo "=========================================="

# Append/Update credentials in local .env if it exists
env_file=".env"
if [ -f "$env_file" ]; then
  # Remove existing S3 env vars to avoid duplicates
  sed -i '/S3_/d' "$env_file"
  
  echo "" >> "$env_file"
  echo "S3_ACCESS_KEY_ID=$access_key_id" >> "$env_file"
  echo "S3_SECRET_ACCESS_KEY=$secret_access_key" >> "$env_file"
  echo "S3_ENDPOINT=http://localhost:3900" >> "$env_file"
  echo "S3_REGION=garage" >> "$env_file"
  echo "S3_BUCKET=nomad-media" >> "$env_file"
  
  echo "[Garage Setup] Credentials written to $env_file"
else
  echo "[Garage Setup] Warning: .env file not found. Please add the S3 credentials manually."
fi
