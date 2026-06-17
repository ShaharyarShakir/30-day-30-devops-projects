from typing import Any, AsyncGenerator

from loguru import logger

from ai.reasoning import analyze_cluster_state
from kubernetes.deployment_inspector import inspect_deployments
from kubernetes.events_analyzer import analyze_events
from kubernetes.logs_collector import collect_logs
from kubernetes.network_inspector import inspect_network
from kubernetes.pod_inspector import inspect_pods


async def run_investigation_stream(context: str | None = None) -> AsyncGenerator[dict[str, Any], None]:
    """Orchestrate Kubernetes investigation with progress updates via async generator."""
    logger.info("Starting Kubernetes investigation for context: {}", context or "default")

    yield {"type": "progress", "step": "Checking Pods", "status": "in_progress"}
    pods = inspect_pods(context=context)
    yield {"type": "progress", "step": "Checking Pods", "status": "completed"}

    # Fail early if cluster is unreachable or config is invalid
    if not pods.get("healthy", True) and "error" in pods:
        logger.error(f"Failed to check pods: {pods['error']}")
        yield {"type": "error", "message": pods["error"]}
        return

    yield {"type": "progress", "step": "Reading Logs", "status": "in_progress"}
    logs = collect_logs(pods.get("problematic_pods", []), context=context)
    yield {"type": "progress", "step": "Reading Logs", "status": "completed"}

    yield {"type": "progress", "step": "Analyzing Events", "status": "in_progress"}
    events = analyze_events(context=context)
    yield {"type": "progress", "step": "Analyzing Events", "status": "completed"}

    yield {"type": "progress", "step": "Inspecting Deployments", "status": "in_progress"}
    deployments = inspect_deployments(context=context)
    yield {"type": "progress", "step": "Inspecting Deployments", "status": "completed"}

    yield {"type": "progress", "step": "Checking Networking", "status": "in_progress"}
    network = inspect_network(context=context)
    yield {"type": "progress", "step": "Checking Networking", "status": "completed"}

    investigation = {
        "pods": pods,
        "logs": logs,
        "events": events,
        "deployments": deployments,
        "network": network,
    }

    logger.info("Kubernetes investigation completed")

    # If the cluster is healthy across the board, bypass AI reasoning
    if pods.get("healthy", True) and deployments.get("healthy", True) and network.get("healthy", True):
        logger.info("Cluster is healthy, bypassing AI reasoning")
        yield {"type": "progress", "step": "AI Reasoning", "status": "completed"}
        diagnosis = {
            "root_cause": "No critical Kubernetes issues detected. Cluster appears healthy.",
            "explanation": "All monitored resources (Pods, Deployments, Services, and Endpoints) are operating normally. No crash loops, image pull errors, resource limitations, or network misconfigurations were detected.",
            "fix": "No action is required.",
            "kubectl_command": "kubectl get pods -A",
            "prevention": "Maintain regular resource monitoring and health checks.",
            "confidence": 100
        }
        yield {"type": "result", "investigation": investigation, "diagnosis": diagnosis}
        return

    yield {"type": "progress", "step": "AI Reasoning", "status": "in_progress"}
    try:
        diagnosis = await analyze_cluster_state(investigation)
        yield {"type": "progress", "step": "AI Reasoning", "status": "completed"}
        logger.info("AI diagnosis completed")
        yield {"type": "result", "investigation": investigation, "diagnosis": diagnosis}
    except Exception as e:
        yield {"type": "progress", "step": "AI Reasoning", "status": "completed"}
        logger.error(f"AI analysis failed: {e}")
        yield {"type": "error", "message": f"AI Reasoning Service is temporarily unavailable. (Details: {str(e)})"}

