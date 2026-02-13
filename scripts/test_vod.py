import requests
import time
import sys

BASE_URL = "http://localhost:8000/api/vod"
TEST_URL = "https://chzzk.naver.com/video/11659901"

def test_info():
    print(f"Checking info for: {TEST_URL}")
    try:
        res = requests.post(f"{BASE_URL}/info", json={"url": TEST_URL})
        res.raise_for_status()
        info = res.json()
        print(f"[SUCCESS] Title: {info.get('title')}")
        print(f"          Duration: {info.get('duration')}s")
        return True
    except Exception as e:
        print(f"[FAILED] Info check: {e}")
        try:
             print(f"Response: {res.text}")
        except:
            pass
        return False

def test_download():
    print(f"Starting download for: {TEST_URL}")
    try:
        res = requests.post(f"{BASE_URL}/download", json={"url": TEST_URL, "quality": "best"})
        res.raise_for_status()
        print(f"[SUCCESS] Download started: {res.json().get('message')}")
        return True
    except Exception as e:
        print(f"[FAILED] Download start: {e}")
        try:
             print(f"Response: {res.text}")
        except:
            pass
        return False

def monitor_status():
    print("Monitoring download status...")
    while True:
        try:
            res = requests.get(f"{BASE_URL}/status")
            res.raise_for_status()
            status = res.json()
            state = status.get("state")
            progress = status.get("progress")
            
            sys.stdout.write(f"\r[{state.upper()}] Progress: {progress}%")
            sys.stdout.flush()

            if state == "completed":
                print("\n[SUCCESS] Download completed!")
                break
            elif state == "error":
                print("\n[FAILED] Download error occurred.")
                break
            
            time.sleep(1)
        except Exception as e:
            print(f"\n[ERROR] Status check failed: {e}")
            break

if __name__ == "__main__":
    print("--- VOD API Test Start ---")
    if test_info():
        if test_download():
            monitor_status()
    print("--- Test Finished ---")
