import asyncio
import httpx
import sys

INSFORGE_BASE_URL = "https://8qkqnu9w.us-east.insforge.app"
API_BASE_URL = "http://127.0.0.1:8000"
TEST_EMAIL = "devops-test-user@example.com"
TEST_PASSWORD = "TestPassword123!"


async def test_flow():
    print("--- Starting Integration Test ---")
    async with httpx.AsyncClient() as client:
        # Step 1: Sign in (or sign up if user doesn't exist)
        print("Attempting to sign in...")
        signin_url = f"{INSFORGE_BASE_URL}/api/auth/sessions?client_type=server"
        signin_payload = {
            "email": TEST_EMAIL,
            "password": TEST_PASSWORD
        }
        
        token = None
        user_id = None
        
        response = await client.post(signin_url, json=signin_payload)
        if response.status_code == 200:
            data = response.json()
            token = data.get("accessToken")
            user_id = data.get("user", {}).get("id")
            print(f"Successfully signed in! User ID: {user_id}")
        else:
            print(f"Sign in failed (status {response.status_code}). Attempting signup...")
            signup_url = f"{INSFORGE_BASE_URL}/api/auth/users?client_type=server"
            signup_payload = {
                "email": TEST_EMAIL,
                "password": TEST_PASSWORD,
                "name": "Test DevOps User"
            }
            signup_resp = await client.post(signup_url, json=signup_payload)
            if signup_resp.status_code in (200, 201):
                print("Signup successful! Retrying sign in...")
                response = await client.post(signin_url, json=signin_payload)
                if response.status_code == 200:
                    data = response.json()
                    token = data.get("accessToken")
                    user_id = data.get("user", {}).get("id")
                    print(f"Successfully signed in after signup! User ID: {user_id}")
                else:
                    print(f"Failed to sign in after signup: {response.text}")
                    sys.exit(1)
            else:
                print(f"Signup failed: {signup_resp.text}")
                sys.exit(1)


        if not token:
            print("Failed to obtain token")
            sys.exit(1)

        headers = {
            "Authorization": f"Bearer {token}",
            "Content-Type": "application/json"
        }

        # Step 2: Fetch Clusters context list
        print("\nFetching clusters list from FastAPI backend...")
        clusters_resp = await client.get(f"{API_BASE_URL}/clusters", headers=headers)
        if clusters_resp.status_code == 200:
            clusters_data = clusters_resp.json()
            print("GET /clusters response:")
            print(clusters_data)
            contexts = clusters_data.get("contexts", [])
            current_context = clusters_data.get("current_context")
            print(f"Available contexts: {contexts}")
            print(f"Current active context: {current_context}")
        else:
            print(f"Failed to fetch clusters: {clusters_resp.status_code} - {clusters_resp.text}")
            sys.exit(1)

        # Step 3: Run cluster investigation
        target_context = "kind-kube-demo-ai"
        print(f"\nRunning cluster investigation on context: {target_context}...")
        
        # We set a large timeout of 120 seconds since it runs full checks and LLM calls
        investigate_resp = await client.post(
            f"{API_BASE_URL}/investigate?cluster={target_context}", 
            headers=headers, 
            timeout=120.0
        )
        if investigate_resp.status_code == 200:
            result = investigate_resp.json()
            print("POST /investigate response:")
            status = result.get("status")
            diagnosis = result.get("diagnosis", {})
            print(f"Status: {status}")
            if diagnosis:
                print("Diagnosis Detail:")
                print(f"  Root Cause: {diagnosis.get('root_cause')}")
                print(f"  Explanation: {diagnosis.get('explanation')}")
                print(f"  Suggested Fix: {diagnosis.get('fix')}")
                print(f"  Resolution Command: {diagnosis.get('kubectl_command')}")
                print(f"  Confidence: {diagnosis.get('confidence')}%")
            else:
                print("No diagnosis returned (Cluster might be healthy or error occurred)")
        else:
            print(f"Investigation request failed: {investigate_resp.status_code} - {investigate_resp.text}")
            sys.exit(1)


if __name__ == "__main__":
    asyncio.run(test_flow())
