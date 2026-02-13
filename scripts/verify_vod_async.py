import requests
import time
import sys

BASE_URL = "http://localhost:8000/api/vod"
TEST_URL = "https://chzzk.naver.com/video/11659901"

def test_async_workflow():
    print(f"--- Async VOD Test Start ---")
    
    # 1. Info Check
    print(f"[1] Checking Info...")
    try:
        res = requests.post(f"{BASE_URL}/info", json={"url": TEST_URL}, timeout=5)
        res.raise_for_status()
        print(f"    SUCCESS: {res.json()['title'][:30]}...")
    except Exception as e:
        print(f"    FAILED: {e}")
        return

    # 2. Start Download
    print(f"[2] Starting Download (Expect Immediate Return)...")
    start_time = time.time()
    try:
        res = requests.post(
            f"{BASE_URL}/download", 
            json={"url": TEST_URL, "quality": "best"},
            timeout=5  # Should return instantly
        )
        res.raise_for_status()
        elapsed = time.time() - start_time
        print(f"    SUCCESS: Got response in {elapsed:.2f}s")
        print(f"    Message: {res.json().get('message')}")
    except Exception as e:
        print(f"    FAILED: {e}")
        return

    # 3. Monitor Status
    print(f"[3] Monitoring Status...")
    for _ in range(60): # Monitor for up to 60 seconds
        try:
            res = requests.get(f"{BASE_URL}/status", timeout=2)
            status = res.json()
            state = status['state']
            progress = status['progress']
            print(f"    Status: {state.upper()} ({progress}%)", end='\r')
            
            if state == 'downloading' and progress > 0:
                print(f"\n    SUCCESS: Download is progressing! ({progress}%)")
                break
            if state == 'completed':
                print(f"\n    SUCCESS: Download completed early!")
                break
            
            time.sleep(1)
        except Exception as e:
            print(f"\n    ERROR polling status: {e}")
            break
    else:
        print("\n    TIMEOUT: Download did not progress in 60s")

if __name__ == "__main__":
    test_async_workflow()
