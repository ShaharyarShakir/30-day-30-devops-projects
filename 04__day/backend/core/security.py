from fastapi import Header, HTTPException, status
import httpx
from core.config import settings
from loguru import logger

async def get_current_user(authorization: str = Header(None)) -> dict:
    if not authorization or not authorization.startswith("Bearer "):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Missing or invalid authentication token"
        )
    
    token = authorization.split(" ")[1]
    url = f"{settings.insforge_api_base_url}/api/auth/sessions/current"
    headers = {"Authorization": f"Bearer {token}"}
    
    try:
        async with httpx.AsyncClient() as client:
            response = await client.get(url, headers=headers)
            if response.status_code != 200:
                logger.warning(f"Auth token validation failed with status {response.status_code}: {response.text}")
                raise HTTPException(
                    status_code=status.HTTP_401_UNAUTHORIZED,
                    detail="Invalid authentication token"
                )
            
            data = response.json()
            user = data.get("user")
            if not user:
                raise HTTPException(
                    status_code=status.HTTP_401_UNAUTHORIZED,
                    detail="No user associated with this token"
                )
            # Attach the access token to the user dict so downstream route can use it
            user["access_token"] = token
            return user
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error validating authentication token: {e}")
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Authentication check failed"
        )
