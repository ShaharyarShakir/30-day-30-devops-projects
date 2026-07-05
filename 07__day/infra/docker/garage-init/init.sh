#!/bin/bash
set -e

echo "Waiting for Garage S3 endpoint to be ready..."
until garage -c /etc/garage.toml status >/dev/null 2>&1; do
  sleep 1
done
echo "Garage is ready!"

# Show cluster status
STATUS_OUT=$(garage -c /etc/garage.toml status)
echo "$STATUS_OUT"

# Retrieve node ID with NO ROLE ASSIGNED
NODE_ID=$(echo "$STATUS_OUT" | awk '/NO ROLE ASSIGNED/{print $1; exit}')

if [ -n "$NODE_ID" ]; then
  echo "Assigning node $NODE_ID to zone dc1 with 1G capacity..."
  garage -c /etc/garage.toml layout assign -z dc1 -c 1G "$NODE_ID"
  garage -c /etc/garage.toml layout apply --version 1
else
  echo "Node is already assigned or layout has been applied."
fi

# Now import the API key
echo "Importing access key..."
if garage -c /etc/garage.toml key info mlflow-key >/dev/null 2>&1; then
  echo "Key mlflow-key already exists."
else
  echo "Importing key mlflow-key..."
  garage -c /etc/garage.toml key import --yes -n mlflow-key "$GARAGE_ACCESS_KEY_ID" "$GARAGE_SECRET_ACCESS_KEY"
fi

# Create required buckets
for bucket in datasets models artifacts; do
  if garage -c /etc/garage.toml bucket info "$bucket" >/dev/null 2>&1; then
    echo "Bucket $bucket already exists."
  else
    echo "Creating bucket $bucket..."
    garage -c /etc/garage.toml bucket create "$bucket"
  fi
  
  echo "Granting read/write permissions on bucket $bucket to key mlflow-key..."
  garage -c /etc/garage.toml bucket allow "$bucket" --read --write --key mlflow-key
done

echo "Garage initialization complete!"
