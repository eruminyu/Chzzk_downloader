import asyncio
import os
from pathlib import Path
from app.core.config import get_settings

async def test_ffmpeg():
    settings = get_settings()
    ffmpeg_path = settings.resolve_ffmpeg_path()
    download_dir = Path(settings.download_dir)
    
    print(f"--- FFMPEG DEBUG ---")
    print(f"FFmpeg Path: {ffmpeg_path}")
    print(f"Download Dir: {download_dir}")
    
    # Check directory
    try:
        download_dir.mkdir(parents=True, exist_ok=True)
        test_file = download_dir / "write_test.txt"
        test_file.write_text("test")
        test_file.unlink()
        print(f"✅ Download directory is WRITABLE")
    except Exception as e:
        print(f"❌ Download directory check FAILED: {e}")
        return

    # Check FFmpeg process
    print(f"Checking FFmpeg version via subprocess...")
    try:
        proc = await asyncio.create_subprocess_exec(
            ffmpeg_path, "-version",
            stdout=asyncio.subprocess.PIPE,
            stderr=asyncio.subprocess.PIPE
        )
        stdout, stderr = await proc.communicate()
        if proc.returncode == 0:
            print(f"✅ FFmpeg execution SUCCESS")
            print(f"Output: {stdout.decode().splitlines()[0]}")
        else:
            print(f"❌ FFmpeg execution FAILED (code {proc.returncode})")
            print(f"Error: {stderr.decode()}")
    except Exception as e:
        import traceback
        print(f"❌ FFmpeg subprocess creation CRASHED: {type(e).__name__}: {e}")
        traceback.print_exc()

if __name__ == "__main__":
    asyncio.run(test_ffmpeg())
