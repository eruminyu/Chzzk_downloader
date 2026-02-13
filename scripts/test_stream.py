import requests
import time
import sys

BASE_URL = "http://localhost:8000/api/stream"
CHANNEL_ID = "test_channel_id" 

def test_stream_api():
    print(f"--- Stream API Test Start ---")
    
    # 1. Start Monitor
    print(f"[1] Starting Conductor Monitor...")
    try:
        res = requests.post(f"{BASE_URL}/monitor/start")
        res.raise_for_status()
        print(f"    SUCCESS: {res.json()}")
    except Exception as e:
        print(f"    FAILED: {e}")

    # 2. Add Channel
    print(f"[2] Adding Channel '{CHANNEL_ID}'...")
    try:
        res = requests.post(f"{BASE_URL}/channels", json={"channel_id": CHANNEL_ID, "auto_record": False})
        res.raise_for_status()
        print(f"    SUCCESS: {res.json()}")
    except Exception as e:
        print(f"    FAILED: {e}")

    # 3. List Channels
    print(f"[3] Listing Channels...")
    try:
        res = requests.get(f"{BASE_URL}/channels")
        res.raise_for_status()
        channels = res.json()
        found = any(c['channel_id'] == CHANNEL_ID for c in channels)
        status = "FOUND" if found else "NOT FOUND"
        print(f"    SUCCESS: Found {len(channels)} channels. Target: {status}")
    except Exception as e:
        print(f"    FAILED: {e}")

    # 4. Try Recording (Expect Fail/Error if offline)
    print(f"[4] Attempting to Start Recording '{CHANNEL_ID}'...")
    try:
        res = requests.post(f"{BASE_URL}/record/{CHANNEL_ID}/start")
        # Note: 500 might be returned if exception raised, or 200 with error dict
        if res.status_code == 200:
            print(f"    RESPONSE: {res.json()}")
        else:
            print(f"    HTTP {res.status_code}: {res.text}")
    except Exception as e:
        print(f"    FAILED: {e}")

    # 5. Stop Monitor
    print(f"[5] Stopping Conductor Monitor...")
    try:
        res = requests.post(f"{BASE_URL}/monitor/stop")
        res.raise_for_status()
        print(f"    SUCCESS: {res.json()}")
    except Exception as e:
        print(f"    FAILED: {e}")

if __name__ == "__main__":
    test_stream_api()
