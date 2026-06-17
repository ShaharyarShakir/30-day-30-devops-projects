import json
import subprocess
from dataclasses import dataclass
from typing import Any

from loguru import logger

from core.config import settings


@dataclass
class KubectlResult:
    success: bool
    stdout: str
    stderr: str
    returncode: int
    command: list[str]

    def parse_json(self) -> dict[str, Any] | None:
        if not self.success or not self.stdout.strip():
            return None
        try:
            return json.loads(self.stdout)
        except json.JSONDecodeError:
            logger.warning("Failed to parse kubectl JSON output for command: {}", self.command)
            return None


def run_kubectl(args: list[str], timeout: int = 60, context: str | None = None) -> KubectlResult:
    """Run a kubectl command and return structured output."""
    command = ["kubectl", *args]

    if settings.kubeconfig_path:
        command.extend(["--kubeconfig", settings.kubeconfig_path])
    if context:
        command.extend(["--context", context])

    logger.info("Running kubectl command: {}", " ".join(command))

    try:
        completed = subprocess.run(
            command,
            capture_output=True,
            text=True,
            timeout=timeout,
            check=False,
        )
    except FileNotFoundError:
        message = "kubectl executable not found on PATH"
        logger.error(message)
        return KubectlResult(
            success=False,
            stdout="",
            stderr=message,
            returncode=127,
            command=command,
        )
    except subprocess.TimeoutExpired:
        message = f"kubectl command timed out after {timeout}s"
        logger.error("{}: {}", message, " ".join(command))
        return KubectlResult(
            success=False,
            stdout="",
            stderr=message,
            returncode=124,
            command=command,
        )

    result = KubectlResult(
        success=completed.returncode == 0,
        stdout=completed.stdout,
        stderr=completed.stderr,
        returncode=completed.returncode,
        command=command,
    )

    if result.success:
        logger.debug("kubectl command succeeded: {}", " ".join(command))
    else:
        logger.warning(
            "kubectl command failed (exit {}): {} | stderr: {}",
            result.returncode,
            " ".join(command),
            result.stderr.strip() or "(empty)",
        )

    return result


def list_kubeconfig_contexts() -> dict[str, Any]:
    """Fetch contexts and active context from kubeconfig."""
    args = ["config", "view", "-o", "json"]
    result = run_kubectl(args, timeout=15)
    if not result.success:
        return {
            "contexts": [],
            "current_context": None,
            "error": result.stderr.strip() or "Failed to run kubectl config view"
        }
    
    data = result.parse_json()
    if not data:
        return {
            "contexts": [],
            "current_context": None,
            "error": "Failed to parse kubeconfig JSON"
        }
    
    contexts = [c.get("name") for c in data.get("contexts", []) if c.get("name")]
    current_context = data.get("current-context")
    
    return {
        "contexts": contexts,
        "current_context": current_context
    }

