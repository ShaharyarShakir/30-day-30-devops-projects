from typing import Any

from loguru import logger

from kubernetes.kubectl_executor import run_kubectl

DNS_DEPLOYMENT_NAMES = {"coredns", "kube-dns"}


def _pod_matches_selector(pod: dict[str, Any], selector: dict[str, str]) -> bool:
    labels = pod.get("metadata", {}).get("labels", {}) or {}
    return all(labels.get(key) == value for key, value in selector.items())


def _endpoint_address_count(endpoint: dict[str, Any]) -> int:
    count = 0
    for subset in endpoint.get("subsets", []) or []:
        count += len(subset.get("addresses", []) or [])
        count += len(subset.get("notReadyAddresses", []) or [])
    return count


def inspect_network(context: str | None = None) -> dict[str, Any]:
    """Inspect services, endpoints, and basic DNS-related signals."""
    logger.info("Inspecting cluster networking")

    services_result = run_kubectl(["get", "svc", "-A", "-o", "json"], context=context)
    endpoints_result = run_kubectl(["get", "endpoints", "-A", "-o", "json"], context=context)
    pods_result = run_kubectl(["get", "pods", "-A", "-o", "json"], context=context)


    if not services_result.success:
        return {
            "healthy": False,
            "error": services_result.stderr.strip() or "Failed to fetch services",
            "findings": [],
        }

    services_data = services_result.parse_json() or {"items": []}
    endpoints_data = endpoints_result.parse_json() or {"items": []} if endpoints_result.success else {"items": []}
    pods_data = pods_result.parse_json() or {"items": []} if pods_result.success else {"items": []}

    endpoints_by_key = {
        (
            item.get("metadata", {}).get("namespace", "default"),
            item.get("metadata", {}).get("name", ""),
        ): item
        for item in endpoints_data.get("items", [])
    }

    pods_by_namespace: dict[str, list[dict[str, Any]]] = {}
    for pod in pods_data.get("items", []):
        namespace = pod.get("metadata", {}).get("namespace", "default")
        pods_by_namespace.setdefault(namespace, []).append(pod)

    findings: list[dict[str, Any]] = []

    for service in services_data.get("items", []):
        metadata = service.get("metadata", {})
        name = metadata.get("name", "unknown")
        namespace = metadata.get("namespace", "default")
        spec = service.get("spec", {})
        service_type = spec.get("type", "ClusterIP")
        selector = spec.get("selector") or {}

        if service_type == "ExternalName" or not selector:
            continue

        endpoint = endpoints_by_key.get((namespace, name))
        address_count = _endpoint_address_count(endpoint) if endpoint else 0

        if address_count == 0:
            findings.append(
                {
                    "type": "missing_endpoints",
                    "namespace": namespace,
                    "service": name,
                    "message": f"Service '{name}' has no ready endpoints",
                }
            )

        namespace_pods = pods_by_namespace.get(namespace, [])
        matching_pods = [pod for pod in namespace_pods if _pod_matches_selector(pod, selector)]

        if not matching_pods:
            findings.append(
                {
                    "type": "selector_mismatch",
                    "namespace": namespace,
                    "service": name,
                    "selector": selector,
                    "message": f"Service '{name}' selector does not match any pods",
                }
            )

    dns_issues: list[dict[str, str]] = []
    for pod in pods_data.get("items", []):
        name = pod.get("metadata", {}).get("name", "")
        namespace = pod.get("metadata", {}).get("namespace", "")
        if namespace != "kube-system":
            continue
        if not any(dns_name in name for dns_name in DNS_DEPLOYMENT_NAMES):
            continue

        phase = pod.get("status", {}).get("phase", "")
        if phase != "Running":
            dns_issues.append(
                {
                    "pod": name,
                    "namespace": namespace,
                    "phase": phase,
                    "message": f"DNS pod '{name}' is not Running (phase: {phase})",
                }
            )

    if dns_issues:
        findings.append(
            {
                "type": "dns_related",
                "issues": dns_issues,
            }
        )

    logger.info("Found {} networking finding(s)", len(findings))

    return {
        "healthy": len(findings) == 0,
        "total_services": len(services_data.get("items", [])),
        "findings": findings,
    }
