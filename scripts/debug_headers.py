import asyncio
import os
import httpx
from app.engine.auth import AuthManager

async def test_ffmpeg_headers():
    auth = AuthManager()
    headers = auth.get_http_headers()
    
    # We need a fresh stream URL
    from app.engine.downloader import StreamLinkEngine
    engine = StreamLinkEngine(auth=auth)
    
    channel_id = "6d16804cf98da47ba82bd13c0c029723"
    try:
        url = engine.get_stream_url(channel_id)
        print(f"Stream URL: {url[:100]}...")
    except Exception as e:
        print(f"Failed to get URL: {e}")
        return

    print(f"Headers: {headers}")

    configs = [
        # 1. Simple headers string
        {"name": "Simple headers", "args": ["-headers", f"Cookie: {headers.get('Cookie')}\r\nUser-Agent: {headers.get('User-Agent')}\r\n"]},
        # 2. Only Cookies
        {"name": "Only Cookies", "args": ["-headers", f"Cookie: {headers.get('Cookie')}\r\n"]},
    ]

    for config in configs:
        print(f"\nTesting Config: {config['name']}")
        cmd = ["C:\\ffmpeg\\bin\\ffmpeg.exe"] + config["args"] + ["-i", url, "-t", "1", "-f", "null", "-"]
        print(f"CMD: {' '.join(cmd)}")
        
        proc = await asyncio.create_subprocess_exec(
            *cmd,
            stdout=asyncio.subprocess.PIPE,
            stderr=asyncio.subprocess.PIPE
        )
        _, stderr = await proc.communicate()
        err_out = stderr.decode(errors='replace')
        
        if "Invalid data found when processing input" in err_out:
            print(f"❌ FAILED: Invalid data")
        elif "Error opening input" in err_out:
             print(f"❌ FAILED: Open error")
             print(err_out[-200:])
        else:
            print(f"✅ SUCCESS (probably)")

if __name__ == "__main__":
    asyncio.run(test_ffmpeg_headers())
