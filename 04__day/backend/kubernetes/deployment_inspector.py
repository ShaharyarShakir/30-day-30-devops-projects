from typing import Any

from loguru import logger

from kubernetes.kubectl_executor import run_kubectl


def _condition_issues(conditions: list[dict[str, Any]]) -> list[str]:
    issues: list[str] = []

    for condition in conditions:
        condition_type = condition.get("type", "")
        status = condition.get("status", "")
        reason = condition.get("reason", "")
        message = condition.get("message", "")

        if condition_type == "Available" and status != "True":
            issues.append(f"Available=False ({reason or message or 'unknown'})")

        if condition_type == "Progressing" and status != "True":
            issues.append(f"Progressing=False ({reason or message or 'unknown'})")

        if reason == "ProgressDeadlineExceeded":
            issues.append("Rollout deadline exceeded")

    return issues


def inspect_deployments(context: str | None = None) -> dict[str, Any]:
    """Inspect deployments for replica and rollout problems."""
    logger.info("Inspecting deployments")

    result = run_kubectl(["get", "deployments", "-A", "-o", "json"], context=context)

    if not result.success:
        return {
            "healthy": False,
            "error": result.stderr.strip() or "Failed to fetch deployments",
            "total_deployments": 0,
            "unhealthy_deployments": [],
        }

    data = result.parse_json()
    if not data:
        return {
            "healthy": False,
            "error": "Failed to parse deployment data",
            "total_deployments": 0,
            "unhealthy_deployments": [],
        }

    items = data.get("items", [])
    unhealthy_deployments: list[dict[str, Any]] = []

    for deployment in items:
        metadata = deployment.get("metadata", {})
        name = metadata.get("name", "unknown")
        namespace = metadata.get("namespace", "default")

        spec = deployment.get("spec", {})
        status = deployment.get("status", {})

        desired = spec.get("replicas", 0)
        available = status.get("availableReplicas", 0) or 0
        unavailable = status.get("unavailableReplicas", 0) or 0
        updated = status.get("updatedReplicas", 0) or 0

        condition_issues = _condition_issues(status.get("conditions", []) or [])
        replica_issues: list[str] = []

        if available < desired:
            replica_issues.append(f"Available replicas {available}/{desired}")

        if unavailable > 0:
            replica_issues.append(f"Unavailable replicas: {unavailable}")

        if updated < desired:
            replica_issues.append(f"Updated replicas {updated}/{desired}")

        issues = condition_issues + replica_issues
        if not issues:
            continue

        unhealthy_deployments.append(
            {
                "name": name,
                "namespace": namespace,
                "desired_replicas": desired,
                "available_replicas": available,
                "unavailable_replicas": unavailable,
                "updated_replicas": updated,
                "issues": issues,
            }
        )

    logger.info(
        "Found {} unhealthy deployment(s) out of {}",
        len(unhealthy_deployments),
        len(items),
    )

    return {
        "healthy": len(unhealthy_deployments) == 0,
        "total_deployments": len(items),
        "unhealthy_deployments": unhealthy_deployments,
    }
