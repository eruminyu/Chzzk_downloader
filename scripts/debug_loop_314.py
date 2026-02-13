import asyncio
import sys

async def test():
    loop = asyncio.get_running_loop()
    print(f"DEBUG: Current loop type: {type(loop)}")
    
    print("DEBUG: Attempting to run 'cmd /c echo hello' via asyncio...")
    try:
        proc = await asyncio.create_subprocess_exec(
            "cmd", "/c", "echo hello",
            stdout=asyncio.subprocess.PIPE,
            stderr=asyncio.subprocess.PIPE
        )
        stdout, stderr = await proc.communicate()
        print(f"DEBUG: stdout: {stdout.decode().strip()}")
        print("DEBUG: Success!")
    except NotImplementedError:
        print("DEBUG: FAILED with NotImplementedError (SelectorEventLoop used?)")
    except Exception as e:
        print(f"DEBUG: FAILED with unexpected error: {e}")
        import traceback
        traceback.print_exc()

if __name__ == "__main__":
    print(f"DEBUG: Python version: {sys.version}")
    print(f"DEBUG: Platform: {sys.platform}")
    
    if sys.platform == "win32":
        print("DEBUG: Setting WindowsProactorEventLoopPolicy...")
        asyncio.set_event_loop_policy(asyncio.WindowsProactorEventLoopPolicy())
    
    asyncio.run(test())
