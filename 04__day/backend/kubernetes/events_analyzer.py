from collections import Counter
from typing import Any

from loguru import logger

from kubernetes.kubectl_executor import run_kubectl

WATCH_REASONS = {
    "FailedScheduling",
    "BackOff",
    "FailedMount",
    "FailedPull",
    "ErrImagePull",
    "Unhealthy",
}


def _event_summary(event: dict[str, Any]) -> dict[str, str]:
    involved = event.get("involvedObject", {})
    return {
        "namespace": event.get("metadata", {}).get("namespace", "default"),
        "name": involved.get("name", "unknown"),
        "kind": involved.get("kind", "Unknown"),
        "reason": event.get("reason", "Unknown"),
        "type": event.get("type", "Normal"),
        "message": event.get("message", ""),
        "count": str(event.get("count", 1)),
    }


def analyze_events(context: str | None = None) -> dict[str, Any]:
    """Read cluster events and summarize troubleshooting signals."""
    logger.info("Analyzing Kubernetes events")

    result = run_kubectl(["get", "events", "-A", "--sort-by=.lastTimestamp", "-o", "json"], context=context)

    if not result.success:
        return {
            "healthy": False,
            "error": result.stderr.strip() or "Failed to fetch events",
            "summary": {},
            "findings": [],
        }

    data = result.parse_json()
    if not data:
        return {
            "healthy": False,
            "error": "Failed to parse event data",
            "summary": {},
            "findings": [],
        }

    items = data.get("items", [])
    findings: list[dict[str, str]] = []
    reason_counter: Counter[str] = Counter()

    for event in items:
        reason = event.get("reason", "")
        if reason not in WATCH_REASONS:
            continue

        reason_counter[reason] += 1
        findings.append(_event_summary(event))

    findings = findings[-20:]

    logger.info("Found {} relevant event(s)", len(findings))

    return {
        "healthy": len(findings) == 0,
        "total_events": len(items),
        "summary": dict(reason_counter),
        "findings": findings,
    }
