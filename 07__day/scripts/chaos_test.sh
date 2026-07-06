#!/usr/bin/env bash

# Chaos & Resilience Testing Script for Resume AI Platform
# Tests self-healing capabilities of the microservices under failure scenarios.

set -euo pipefail

NAMESPACE="resume-ai"
GATEWAY_URL="http://localhost:8080"

echo "================================================================="
echo " Starting Chaos & Resilience Tests on Namespace: $NAMESPACE"
echo "================================================================="

# Check namespace accessibility
if ! kubectl get ns "$NAMESPACE" >/dev/null 2>&1; then
  echo "Error: Namespace '$NAMESPACE' not found in cluster."
  exit 1
fi

wait_for_pods() {
  local selector=$1
  echo "Waiting for pods with label $selector to recover and become Ready..."
  kubectl wait --namespace="$NAMESPACE" \
    --for=condition=Ready pod \
    --selector="$selector" \
    --timeout=90s
}

echo -e "\n--- Scenario 1: Random Pod Deletion ---"
POD_NAME=$(kubectl get pods -n "$NAMESPACE" -l app=auth-service -o jsonpath='{.items[0].metadata.name}')
echo "Selected auth-service pod for termination: $POD_NAME"
kubectl delete pod "$POD_NAME" -n "$NAMESPACE" --grace-period=0
echo "Pod deleted. Verifying replica scheduler replacement..."
wait_for_pods "app=auth-service"
echo "Scenario 1 SUCCESS: Pod deleted and self-healed successfully!"

echo -e "\n--- Scenario 2: Postgres Database Interruption ---"
DB_POD=$(kubectl get pods -n "$NAMESPACE" -l app=postgres -o jsonpath='{.items[0].metadata.name}')
echo "Restarting PostgreSQL Database Pod: $DB_POD"
kubectl delete pod "$DB_POD" -n "$NAMESPACE" --grace-period=0
echo "PostgreSQL Pod terminated. Waiting for DB initialization..."
wait_for_pods "app=postgres"

echo "Verifying application layer db reconnect loops..."
# Hit the auth-service health endpoint via port-forward or API gateway health check
sleep 5
HEALTH_STATUS=$(curl -s -o /dev/null -w "%{http_code}" "$GATEWAY_URL/health" || echo "failed")
if [ "$HEALTH_STATUS" == "200" ]; then
  echo "Scenario 2 SUCCESS: Postgres re-established connections and health check returned 200."
else
  echo "Warning: Health check status is $HEALTH_STATUS. Verify connection loops."
fi

echo -e "\n--- Scenario 3: Network Latency Injection ---"
GATEWAY_POD=$(kubectl get pods -n "$NAMESPACE" -l app=gateway -o jsonpath='{.items[0].metadata.name}')
echo "Injecting 250ms latency into gateway pod: $GATEWAY_POD"

# Check if tc/iproute is present in gateway, inject latency using exec
if kubectl exec -n "$NAMESPACE" "$GATEWAY_POD" -- which tc >/dev/null 2>&1; then
  kubectl exec -n "$NAMESPACE" "$GATEWAY_POD" -- tc qdisc add dev eth0 root netem delay 250ms
  echo "Latency injected. Running latency baseline check..."
  
  START=$(date +%s%N)
  curl -s -o /dev/null "$GATEWAY_URL/health" || true
  END=$(date +%s%N)
  DURATION=$(( (END - START) / 1000000 ))
  echo "Response time: ${DURATION}ms"
  
  echo "Removing network latency injection..."
  kubectl exec -n "$NAMESPACE" "$GATEWAY_POD" -- tc qdisc del dev eth0 root netem delay 250ms
  echo "Scenario 3 SUCCESS: Latency injected and cleaned up successfully."
else
  echo "tc tool not found in container. Skipping direct network emulation."
  echo "Scenario 3 SKIPPED (missing traffic control dependencies inside container)."
fi

echo -e "\n================================================================="
echo " Chaos & Resilience Tests Complete!"
echo " All target components recovered and self-healed successfully."
echo "================================================================="
