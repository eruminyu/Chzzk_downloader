import asyncio
import streamlink
from app.engine.auth import AuthManager
from app.core.config import get_settings
from pathlib import Path

async def test_hybrid_pipe():
    auth = AuthManager()
    settings = get_settings()
    ffmpeg_path = settings.resolve_ffmpeg_path()
    
    channel_id = "6d16804cf98da47ba82bd13c0c029723"
    url = f"https://chzzk.naver.com/live/{channel_id}"
    
    print(f"--- HYBRID PIPE DEBUG ---")
    print(f"URL: {url}")
    
    # 1. Setup Streamlink
    session = streamlink.Streamlink()
    sl_options = auth.get_streamlink_options()
    for key, value in sl_options.items():
        session.set_option(key, value)
    
    try:
        streams = session.streams(url)
        if not streams or 'best' not in streams:
            print("❌ No streams found or 'best' unavailable")
            return
        stream = streams['best']
        fd = stream.open()
        print(f"✅ Stream opened successfully (Type: {type(stream)})")
    except Exception as e:
        print(f"❌ Streamlink error: {e}")
        return

    # 2. Setup FFmpeg
    output_file = "hybrid_test.ts"
    cmd = [
        ffmpeg_path,
        "-i", "pipe:0",
        "-c", "copy",
        "-y",
        output_file
    ]
    
    try:
        proc = await asyncio.create_subprocess_exec(
            *cmd,
            stdin=asyncio.subprocess.PIPE,
            stdout=asyncio.subprocess.PIPE,
            stderr=asyncio.subprocess.PIPE
        )
        print(f"✅ FFmpeg process started")
        
        # 3. Pipe data (test for 5 seconds)
        print("Piping data for 5 seconds...")
        async def pipe_data():
            try:
                # Run for roughly 5 seconds of data
                # Typically 1MB/s or more
                for _ in range(50): # 50 chunks
                    data = fd.read(1024 * 128) # 128KB chunks
                    if not data:
                        break
                    proc.stdin.write(data)
                    await proc.stdin.drain()
                    await asyncio.sleep(0.1)
                
                # Close stdin to tell FFmpeg we're done
                proc.stdin.close()
                await proc.stdin.wait_closed()
            except Exception as e:
                print(f"Piping error: {e}")
            finally:
                fd.close()

        await pipe_data()
        stdout, stderr = await proc.communicate()
        print(f"✅ FFmpeg finished (code {proc.returncode})")
        if os.path.exists(output_file) and os.path.getsize(output_file) > 0:
             print(f"✅ File created: {output_file} ({os.path.getsize(output_file)} bytes)")
        else:
             print(f"❌ File not created or empty")
             print(stderr.decode()[-500:])

    except Exception as e:
        print(f"❌ FFmpeg error: {e}")

if __name__ == "__main__":
    import os
    asyncio.run(test_hybrid_pipe())
