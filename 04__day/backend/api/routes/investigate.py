import json
import httpx
from fastapi import APIRouter, Depends, HTTPException, status
from loguru import logger

from core.config import settings
from core.security import get_current_user
from services.investigation import run_investigation_stream
from kubernetes import list_kubeconfig_contexts

router = APIRouter(tags=["investigation"])


async def publish_realtime(channel: str, event: str, payload: dict):
    url = f"{settings.insforge_api_base_url}/api/database/advance/rawsql/unrestricted"
    headers = {
        "Authorization": f"Bearer {settings.insforge_api_key}",
        "Content-Type": "application/json",
    }
    body = {
        "query": "SELECT realtime.publish($1, $2, $3::jsonb)",
        "params": [channel, event, json.dumps(payload)],
    }
    try:
        async with httpx.AsyncClient() as client:
            response = await client.post(url, json=body, headers=headers)
            if response.status_code != 200:
                logger.error(
                    f"Failed to publish realtime: {response.status_code} - {response.text}"
                )
    except Exception as e:
        logger.error(f"Error publishing realtime event: {e}")


async def save_investigation_history(
    user_id: str,
    access_token: str,
    namespace: str,
    root_cause: str | None,
    confidence: int | None,
    status_str: str,
    explanation: str | None = None,
    fix: str | None = None,
    kubectl_command: str | None = None,
):
    url = f"{settings.insforge_api_base_url}/api/database/records/investigations"
    headers = {
        "Authorization": f"Bearer {access_token}",
        "Content-Type": "application/json",
    }
    payload = [
        {
            "user_id": user_id,
            "namespace": namespace,
            "root_cause": root_cause,
            "confidence": confidence,
            "status": status_str,
            "explanation": explanation,
            "fix": fix,
            "kubectl_command": kubectl_command,
        }
    ]
    try:
        async with httpx.AsyncClient() as client:
            response = await client.post(url, json=payload, headers=headers)
            if response.status_code not in (200, 201):
                logger.error(
                    f"Failed to save history: {response.status_code} - {response.text}"
                )
    except Exception as e:
        logger.error(f"Error saving history to InsForge: {e}")


@router.get("/clusters")
async def get_clusters(current_user: dict = Depends(get_current_user)):
    """Retrieve available clusters (contexts) configured in the local kubeconfig."""
    logger.info("Fetching available Kubernetes clusters")
    return list_kubeconfig_contexts()


@router.post("/investigate")
async def investigate(cluster: str | None = None, current_user: dict = Depends(get_current_user)):
    user_id = current_user["id"]
    access_token = current_user["access_token"]
    channel = f"investigation:{user_id}"

    logger.info(f"Starting investigation for user {user_id} on cluster context: {cluster or 'default'}")

    diagnosis_res = None
    namespace = "default"

    try:
        async for event in run_investigation_stream(context=cluster):
            if event["type"] == "progress":
                # Publish progress event via InsForge Realtime
                await publish_realtime(
                    channel=channel,
                    event="progress",
                    payload={"step": event["step"], "status": event["status"]},
                )
            elif event["type"] == "error":
                error_msg = event.get("message", "Unknown error occurred")
                if "Reasoning Service" in error_msg:
                    friendly_msg = (
                        "AI Reasoning Service is temporarily unavailable.\n\n"
                        "Please verify:\n"
                        "- OpenRouter API key configuration\n"
                        "- Network connectivity to OpenRouter\n"
                        "- OpenRouter status"
                    )
                else:
                    friendly_msg = (
                        "Unable to connect to Kubernetes cluster.\n\n"
                        "Please verify:\n"
                        "- kubeconfig path\n"
                        "- cluster access\n"
                        "- kubectl permissions"
                    )

                logger.error(f"Investigation encountered error: {error_msg}")

                # Save failed history entry
                await save_investigation_history(
                    user_id=user_id,
                    access_token=access_token,
                    namespace=namespace,
                    root_cause="Cluster/AI Integration Failure",
                    confidence=0,
                    status_str="failed",
                    explanation=f"{friendly_msg}\n\nTechnical details:\n{error_msg}",
                    fix="Fix Kubernetes connectivity or configure the API key.",
                )

                # Publish failed result to realtime channel
                await publish_realtime(
                    channel=channel,
                    event="result",
                    payload={"status": "failed", "error": friendly_msg},
                )

                raise HTTPException(
                    status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                    detail=friendly_msg,
                )

            elif event["type"] == "result":
                diagnosis_res = event.get("diagnosis")

                # Extract namespace from the pod information
                problematic_pods = (
                    event.get("investigation", {})
                    .get("pods", {})
                    .get("problematic_pods", [])
                )
                if problematic_pods:
                    namespace = problematic_pods[0].get("namespace", "default")

        if diagnosis_res:
            # Save successful history entry
            await save_investigation_history(
                user_id=user_id,
                access_token=access_token,
                namespace=namespace,
                root_cause=diagnosis_res.get("root_cause"),
                confidence=int(diagnosis_res.get("confidence") or 0),
                status_str="completed",
                explanation=diagnosis_res.get("explanation"),
                fix=diagnosis_res.get("fix"),
                kubectl_command=diagnosis_res.get("kubectl_command"),
            )
            # Publish final result to realtime channel
            await publish_realtime(
                channel=channel,
                event="result",
                payload={"status": "completed", "diagnosis": diagnosis_res},
            )
            return {"status": "completed", "diagnosis": diagnosis_res}
        else:
            # Investigation completed but no diagnosis returned
            await save_investigation_history(
                user_id=user_id,
                access_token=access_token,
                namespace=namespace,
                root_cause="No problematic pods found or analysis failed",
                confidence=100,
                status_str="failed",
                explanation="No problematic pods were detected in the cluster state, or the AI model failed to generate a diagnosis.",
                fix="Verify your cluster state.",
                kubectl_command="kubectl get pods -A",
            )
            # Publish failed result to realtime channel
            await publish_realtime(
                channel=channel,
                event="result",
                payload={"status": "failed", "diagnosis": None},
            )
            return {"status": "failed", "diagnosis": None}

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Investigation execution failed: {e}")
        friendly_msg = (
            "Unable to connect to Kubernetes cluster.\n\n"
            "Please verify:\n"
            "- kubeconfig path\n"
            "- cluster access\n"
            "- kubectl permissions"
        )
        # Save failed entry
        await save_investigation_history(
            user_id=user_id,
            access_token=access_token,
            namespace=namespace,
            root_cause="Investigation failed with exception",
            confidence=0,
            status_str="failed",
            explanation=str(e),
            fix="Check backend logs.",
        )
        # Publish error to realtime channel
        await publish_realtime(
            channel=channel,
            event="result",
            payload={"status": "failed", "diagnosis": None},
        )
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=friendly_msg,
        )


