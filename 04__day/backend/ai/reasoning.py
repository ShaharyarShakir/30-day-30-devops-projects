import json
from typing import Any

import httpx
from loguru import logger

from core.config import settings


class PromptBuilder:
    """Build structured Kubernetes troubleshooting prompts for LLM."""

    SYSTEM_PROMPT = """You are a Senior Kubernetes SRE with 10+ years of experience troubleshooting production incidents.

Your task is to analyze Kubernetes cluster evidence and provide root cause analysis.

You must:
1. Correlate evidence from pods, logs, events, deployments, and networking
2. Identify the root cause, not just symptoms
3. Provide specific, actionable fixes
4. Generate kubectl commands that are copy-paste ready
5. Suggest prevention strategies
6. Provide a confidence score (0-100) based on evidence strength

Return your response in this exact JSON format:
{
  "root_cause": "Clear, concise root cause statement",
  "explanation": "Detailed explanation of why this happened",
  "fix": "Step-by-step fix instructions",
  "kubectl_command": "Exact kubectl command to fix the issue",
  "prevention": "How to prevent this in the future",
  "confidence": 92
}

Be specific. Avoid generic advice. Use Kubernetes terminology correctly."""

    @staticmethod
    def build_prompt(investigation: dict[str, Any]) -> str:
        """Build structured prompt from investigation payload."""
        prompt = f"""Analyze this Kubernetes cluster state and identify the root cause:

## Pod Status
{json.dumps(investigation.get("pods", {}), indent=2)}

## Logs
{json.dumps(investigation.get("logs", {}), indent=2)}

## Events
{json.dumps(investigation.get("events", {}), indent=2)}

## Deployment Health
{json.dumps(investigation.get("deployments", {}), indent=2)}

## Networking Findings
{json.dumps(investigation.get("network", {}), indent=2)}

Provide your analysis in the required JSON format."""
        return prompt


class LLMClient:
    """OpenRouter LLM client with retry logic and error handling."""

    def __init__(self):
        self.api_key = settings.openrouter_api_key
        self.model = settings.openrouter_model
        self.api_url = "https://openrouter.ai/api/v1/chat/completions"
        self.timeout = 30.0
        self.max_retries = 3

    async def call_llm(self, prompt: str) -> str:
        """Call OpenRouter API with retry logic."""
        if not self.api_key:
            logger.error("OPENROUTER_API_KEY not configured")
            raise ValueError("OpenRouter API key not configured")

        headers = {
            "Authorization": f"Bearer {self.api_key}",
            "Content-Type": "application/json",
        }

        payload = {
            "model": self.model,
            "messages": [
                {"role": "system", "content": PromptBuilder.SYSTEM_PROMPT},
                {"role": "user", "content": prompt},
            ],
            "temperature": 0.3,
        }

        for attempt in range(self.max_retries):
            try:
                async with httpx.AsyncClient(timeout=self.timeout) as client:
                    response = await client.post(
                        self.api_url, json=payload, headers=headers
                    )
                    response.raise_for_status()
                    result = response.json()
                    return result["choices"][0]["message"]["content"]

            except httpx.TimeoutException:
                logger.warning(f"LLM call timeout, attempt {attempt + 1}/{self.max_retries}")
                if attempt == self.max_retries - 1:
                    raise
            except httpx.HTTPStatusError as e:
                logger.error(f"LLM API error: {e.response.status_code}")
                raise
            except Exception as e:
                logger.error(f"LLM call failed: {e}")
                if attempt == self.max_retries - 1:
                    raise

        raise RuntimeError("Failed to call LLM after retries")


class RootCauseAnalyzer:
    """Analyze investigation payload to identify root cause."""

    @staticmethod
    def analyze(investigation: dict[str, Any]) -> dict[str, Any]:
        """Correlate evidence to identify root cause."""
        pods = investigation.get("pods", {})
        logs = investigation.get("logs", {})
        events = investigation.get("events", {})

        analysis = {
            "pod_status": pods.get("status", "unknown"),
            "restart_count": pods.get("restart_count", 0),
            "log_errors": logs.get("errors", []),
            "event_errors": events.get("errors", []),
        }

        return analysis


class FixRecommendationEngine:
    """Generate actionable Kubernetes fixes."""

    @staticmethod
    def generate_fix(root_cause: str, analysis: dict[str, Any]) -> str:
        """Generate specific fix based on root cause and analysis."""
        if "environment variable" in root_cause.lower():
            return "Add missing environment variable to deployment spec."
        elif "image" in root_cause.lower():
            return "Update container image or fix image pull policy."
        elif "resource" in root_cause.lower():
            return "Adjust resource requests/limits or add node capacity."
        elif "network" in root_cause.lower():
            return "Check service configuration, network policies, and DNS."
        elif "permission" in root_cause.lower():
            return "Update RBAC roles and service account permissions."
        else:
            return "Review deployment configuration and logs for specific issue."

    @staticmethod
    def generate_kubectl_command(root_cause: str, pod_name: str = "") -> str:
        """Generate kubectl command for the fix."""
        if "environment variable" in root_cause.lower():
            return f"kubectl edit deployment {pod_name or '<deployment-name>'}"
        elif "image" in root_cause.lower():
            return f"kubectl set image deployment/{pod_name or '<deployment-name>'} <container>=<new-image>"
        elif "resource" in root_cause.lower():
            return f"kubectl edit deployment {pod_name or '<deployment-name>'}"
        else:
            return f"kubectl describe pod {pod_name or '<pod-name>'}"


class ConfidenceEngine:
    """Calculate confidence score based on evidence strength."""

    @staticmethod
    def calculate_confidence(analysis: dict[str, Any]) -> int:
        """Calculate confidence score (0-100)."""
        score = 50

        pod_status = analysis.get("pod_status", "")
        restart_count = analysis.get("restart_count", 0)
        log_errors = analysis.get("log_errors", [])
        event_errors = analysis.get("event_errors", [])

        if pod_status in ["CrashLoopBackOff", "Error", "Failed"]:
            score += 20

        if restart_count > 0:
            score += 10

        if log_errors:
            score += 10

        if event_errors:
            score += 10

        return min(score, 100)


async def analyze_cluster_state(investigation: dict[str, Any]) -> dict[str, Any]:
    """Main entry point for AI Kubernetes analysis."""
    logger.info("Starting AI cluster analysis")

    try:
        prompt = PromptBuilder.build_prompt(investigation)
        llm_client = LLMClient()
        response = await llm_client.call_llm(prompt)

        logger.info("LLM response received")
        return json.loads(response)

    except Exception as e:
        logger.error(f"AI analysis failed: {e}")
        raise


def suggest_fix(root_cause: str, analysis: dict[str, Any], pod_name: str = "") -> dict[str, str]:
    """Generate fix recommendations."""
    fix_engine = FixRecommendationEngine()
    confidence_engine = ConfidenceEngine()

    fix = fix_engine.generate_fix(root_cause, analysis)
    kubectl_command = fix_engine.generate_kubectl_command(root_cause, pod_name)
    confidence = confidence_engine.calculate_confidence(analysis)

    return {
        "fix": fix,
        "kubectl_command": kubectl_command,
        "confidence": str(confidence),
    }
