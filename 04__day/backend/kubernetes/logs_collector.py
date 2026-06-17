from typing import Any

from loguru import logger

from kubernetes.kubectl_executor import run_kubectl

LOG_KEYWORDS = (
    "exception",
    "error",
    "failed",
    "failure",
    "fatal",
    "panic",
    "connection refused",
    "connection reset",
    "timeout",
    "unable to connect",
    "missing env",
    "environment variable",
    "no such file",
    "imagepullbackoff",
    "errimagepull",
    "crash",
    "startup",
    "back-off",
)

MAX_PODS = 10
MAX_LINES_PER_POD = 40
TAIL_LINES = 200


def _is_relevant_line(line: str) -> bool:
    lowered = line.lower()
    return any(keyword in lowered for keyword in LOG_KEYWORDS)


def _filter_log_lines(log_text: str) -> list[str]:
    lines = [line for line in log_text.splitlines() if line.strip()]
    if not lines:
        return []

    relevant = [line for line in lines if _is_relevant_line(line)]
    if relevant:
        return relevant[-MAX_LINES_PER_POD:]

    return lines[-min(20, len(lines)) :]


def _fetch_pod_logs(namespace: str, pod_name: str, previous: bool = False, context: str | None = None) -> str:
    args = ["logs", pod_name, "-n", namespace, f"--tail={TAIL_LINES}"]
    if previous:
        args.append("--previous")

    result = run_kubectl(args, timeout=30, context=context)
    if result.success:
        return result.stdout

    if previous:
        return ""

    return result.stderr.strip() or result.stdout.strip()


def collect_logs(problematic_pods: list[dict[str, Any]], context: str | None = None) -> dict[str, Any]:
    """Fetch concise logs for failed or unhealthy pods."""
    logger.info("Collecting logs for {} problematic pod(s)", len(problematic_pods))

    if not problematic_pods:
        return {"collected": 0, "pod_logs": []}

    pod_logs: list[dict[str, Any]] = []

    for pod in problematic_pods[:MAX_PODS]:
        name = pod.get("name", "")
        namespace = pod.get("namespace", "default")
        status = pod.get("status", "")

        if not name:
            continue

        logger.info("Fetching logs for pod {}/{}", namespace, name)

        current_logs = _fetch_pod_logs(namespace, name, context=context)
        previous_logs = ""
        if "CrashLoopBackOff" in status or "OOMKilled" in status:
            previous_logs = _fetch_pod_logs(namespace, name, previous=True, context=context)


        combined = current_logs
        if previous_logs:
            combined = f"{current_logs}\n{previous_logs}"

        filtered_lines = _filter_log_lines(combined)

        pod_logs.append(
            {
                "name": name,
                "namespace": namespace,
                "status": status,
                "line_count": len(filtered_lines),
                "logs": filtered_lines,
            }
        )

    return {
        "collected": len(pod_logs),
        "pod_logs": pod_logs,
    }
