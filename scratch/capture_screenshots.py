import asyncio
import json
import os
import subprocess
import aiohttp

async def capture_all():
    os.makedirs("assets", exist_ok=True)
    
    cmd = [
        "/usr/bin/chromium",
        "--headless=new",
        "--remote-debugging-port=9222",
        "--disable-gpu",
        "--no-sandbox",
        "--window-size=1920,1080",
        "http://localhost:5173"
    ]
    proc = subprocess.Popen(cmd, stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)
    print("Launched Chromium with PID", proc.pid)
    
    try:
        ws_url = None
        for _ in range(30):
            await asyncio.sleep(0.5)
            try:
                async with aiohttp.ClientSession() as session:
                    async with session.get("http://127.0.0.1:9222/json") as resp:
                        data = await resp.json()
                        for page in data:
                            if page.get("type") == "page" and "webSocketDebuggerUrl" in page:
                                ws_url = page["webSocketDebuggerUrl"]
                                break
                        if ws_url:
                            break
            except Exception:
                pass
        
        if not ws_url:
            print("Failed to find webSocketDebuggerUrl")
            return

        print("Connected to CDP:", ws_url)
        
        async with aiohttp.ClientSession() as session:
            async with session.ws_connect(ws_url) as ws:
                msg_id = 0
                
                async def send_cmd(method, params=None):
                    nonlocal msg_id
                    msg_id += 1
                    payload = {"id": msg_id, "method": method, "params": params or {}}
                    await ws.send_str(json.dumps(payload))
                    while True:
                        resp_text = await ws.receive_str()
                        resp = json.loads(resp_text)
                        if resp.get("id") == msg_id:
                            return resp.get("result", {})
                
                await send_cmd("Page.enable")
                await send_cmd("Runtime.enable")
                
                # Wait for initial page load
                await asyncio.sleep(3.0)
                
                async def take_screenshot(filename):
                    res = await send_cmd("Page.captureScreenshot", {"format": "png"})
                    import base64
                    data = base64.b64decode(res["data"])
                    filepath = os.path.join("assets", filename)
                    with open(filepath, "wb") as f:
                        f.write(data)
                    print(f"Captured: {filepath} ({len(data)} bytes)")
                
                async def eval_js(expr):
                    return await send_cmd("Runtime.evaluate", {"expression": expr})
                
                # 1. Menu / Boot screen
                await take_screenshot("screenshot-menu.png")
                
                # Skip boot sequence
                await eval_js("window.__terminal3D && window.__terminal3D.skipBoot()")
                await asyncio.sleep(1.0)
                
                # 2. Main Game Terminal CRT
                await eval_js("window.__focusMonitor && window.__focusMonitor()")
                await asyncio.sleep(1.0)
                await take_screenshot("screenshot-game.png")
                
                # 3. Auxiliary Terminal (Min-Heap / Telemetry / Greed)
                await eval_js("window.__focusAux && window.__focusAux()")
                await asyncio.sleep(1.0)
                await take_screenshot("screenshot-aux.png")
                
                # 4. Huffman Notebook Tutorial in Cabinet
                await eval_js("window.__focusManual && window.__focusManual()")
                await asyncio.sleep(1.5)
                await take_screenshot("screenshot-tutorial.png")
                
                # 5. Lore & Propaganda Poster
                await eval_js("window.__focusPoster && window.__focusPoster()")
                await asyncio.sleep(1.5)
                await take_screenshot("screenshot-poster.png")
                
                # 6. Overall Cabin Perspective
                await eval_js("window.__resetCabin && window.__resetCabin()")
                await asyncio.sleep(1.0)
                await take_screenshot("screenshot-cabin.png")
                
                print("All screenshots successfully captured with perfect framing!")
    finally:
        proc.terminate()
        proc.wait()

asyncio.run(capture_all())
