from typing import Any

from loguru import logger

from kubernetes.kubectl_executor import run_kubectl

PROBLEMATIC_WAITING_REASONS = {
    "CrashLoopBackOff",
    "ImagePullBackOff",
    "ErrImagePull",
    "CreateContainerConfigError",
    "InvalidImageName",
}

PROBLEMATIC_TERMINATED_REASONS = {
    "OOMKilled",
    "Error",
}

PROBLEMATIC_PHASES = {
    "Pending",
    "Failed",
}


def _container_status_issues(status: dict[str, Any]) -> list[str]:
    issues: list[str] = []

    state = status.get("state", {})
    waiting = state.get("waiting", {})
    if waiting:
        reason = waiting.get("reason", "Waiting")
        if reason in PROBLEMATIC_WAITING_REASONS or reason == "ContainerCreating":
            issues.append(reason)

    terminated = state.get("terminated", {})
    if terminated:
        reason = terminated.get("reason", "Terminated")
        if reason in PROBLEMATIC_TERMINATED_REASONS:
            issues.append(reason)

    last_state = status.get("lastState", {})
    last_terminated = last_state.get("terminated", {})
    if last_terminated:
        reason = last_terminated.get("reason")
        if reason in PROBLEMATIC_TERMINATED_REASONS and reason not in issues:
            issues.append(reason)

    return issues


def inspect_pods(context: str | None = None) -> dict[str, Any]:
    """Get pod status and detect unhealthy pods across all namespaces."""
    logger.info("Inspecting pods")

    result = run_kubectl(["get", "pods", "-A", "-o", "json"], context=context)

    if not result.success:
        return {
            "healthy": False,
            "error": result.stderr.strip() or "Failed to fetch pods",
            "total_pods": 0,
            "problematic_pods": [],
        }

    data = result.parse_json()
    if not data:
        return {
            "healthy": False,
            "error": "Failed to parse pod data",
            "total_pods": 0,
            "problematic_pods": [],
        }

    items = data.get("items", [])
    problematic_pods: list[dict[str, str]] = []
    seen: set[tuple[str, str]] = set()

    for pod in items:
        metadata = pod.get("metadata", {})
        name = metadata.get("name", "unknown")
        namespace = metadata.get("namespace", "default")
        phase = pod.get("status", {}).get("phase", "Unknown")

        issues: list[str] = []
        if phase in PROBLEMATIC_PHASES:
            issues.append(phase)

        for container_status in pod.get("status", {}).get("containerStatuses", []) or []:
            issues.extend(_container_status_issues(container_status))

        for container_status in pod.get("status", {}).get("initContainerStatuses", []) or []:
            issues.extend(_container_status_issues(container_status))

        if not issues:
            continue

        key = (namespace, name)
        if key in seen:
            continue
        seen.add(key)

        problematic_pods.append(
            {
                "name": name,
                "namespace": namespace,
                "status": issues[0] if len(issues) == 1 else ", ".join(dict.fromkeys(issues)),
                "issues": list(dict.fromkeys(issues)),
            }
        )

    logger.info("Found {} problematic pod(s) out of {}", len(problematic_pods), len(items))

    return {
        "healthy": len(problematic_pods) == 0,
        "total_pods": len(items),
        "problematic_pods": problematic_pods,
    }
