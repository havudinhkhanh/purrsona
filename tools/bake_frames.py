"""
Xuất KHUNG HÌNH từ mèo vector (na na) ra file WebP trong suốt.
Dùng để: (1) tạo mèo mẫu kiểu sprite (assets/cats/bong) chứng minh đường ống khung hình chạy được;
         (2) làm KHUNG THAM CHIẾU gửi Gemini / ChatGPT: đúng cỡ, đúng điểm neo, đúng chu kỳ → AI vẽ lại đẹp hơn rồi thả vào.

Cài: pip install playwright pillow && playwright install chromium
Chạy (từ thư mục gốc dự án, đang mở `python3 -m http.server 8765`):
  python3 tools/bake_frames.py --cat nana --out raw/bong --fur "#F4F0EA" --eye "#6FB3D9" --stroke "#BDB3A6"
Sau đó: node tools/pack-frames.mjs raw/bong bong "Bông"
"""
import argparse, asyncio, io, json, os
from playwright.async_api import async_playwright
from PIL import Image

# clip: (fps xuất, tốc độ đi đơn vị/giây – chỉ clip di chuyển, số khung tối đa, loop)
PLAN = {
    "idle": (24, 0, 48, True), "walk": (30, 165, 40, True), "run": (30, 560, 32, True), "stalk": (16, 70, 48, True),
    "loaf": (6, 0, 24, True), "look_up": (6, 0, 24, True), "lie": (6, 0, 24, True), "sleep": (5, 0, 28, True),
    "groom": (24, 0, 20, True), "crouch": (24, 0, 8, True), "eat": (24, 0, 16, True), "stretch": (10, 0, 22, True),
    "play_yarn": (16, 0, 24, True), "scratch": (24, 0, 10, True), "jump": (1, 0, 1, True), "chase": (1, 0, 1, True),
    "groom_full": (24, 0, 48, False), "roll_play": (24, 0, 60, False),
}

async def main(a):
    os.makedirs(a.out, exist_ok=True)
    async with async_playwright() as p:
        b = await p.chromium.launch(executable_path=a.chrome, args=["--no-sandbox"]) if a.chrome else await p.chromium.launch()
        pg = await b.new_page(viewport={"width": 600, "height": 400})
        q = f"cat={a.cat}&scale={a.scale}" + "".join(f"&{k}={v.replace('#', '%23')}" for k, v in (("fur", a.fur), ("eye", a.eye), ("stroke", a.stroke)) if v)
        await pg.goto(f"{a.base}/tools/bake.html?{q}"); await pg.wait_for_function("document.title==='ready'", timeout=30000)
        info = await pg.evaluate("({size:BAKE.size,anchor:BAKE.anchor,upp:BAKE.unitsPerPixel})")
        el = await pg.query_selector("#box")
        meta = {"frameSize": info["size"], "anchor": [round(v, 1) for v in info["anchor"]], "unitsPerPixel": round(info["upp"], 4), "clips": {}}
        for name, (fps, v, nmax, loop) in PLAN.items():
            per = await pg.evaluate(f"BAKE.period('{name}', {v})")
            if not per: continue
            n = max(1, min(nmax, round(per * fps))); dt = per / n
            await pg.evaluate(f"BAKE.start('{name}', {v})"); d = os.path.join(a.out, name); os.makedirs(d, exist_ok=True)
            for i in range(n):
                png = await el.screenshot(omit_background=True)
                Image.open(io.BytesIO(png)).save(os.path.join(d, f"{i + 1:04d}.webp"), "WEBP", quality=80, method=6)
                await pg.evaluate(f"BAKE.step({dt}, {v})")
            meta["clips"][name] = {"fps": round(n / per, 3), "loop": loop, **({"speed": v} if v else {}), **({"blend": True} if n / per < 12 else {})}
            print(f"{name:11s} {n:3d} khung · chu kỳ {per:.2f}s")
        json.dump(meta, open(os.path.join(a.out, "_bake.json"), "w"), indent=1)
        await b.close()

if __name__ == "__main__":
    ap = argparse.ArgumentParser()
    ap.add_argument("--cat", default="nana"); ap.add_argument("--out", default="raw/bake"); ap.add_argument("--scale", default="0.6")
    ap.add_argument("--fur"); ap.add_argument("--eye"); ap.add_argument("--stroke")
    ap.add_argument("--base", default="http://localhost:8765"); ap.add_argument("--chrome", default=os.environ.get("CHROME"))
    asyncio.run(main(ap.parse_args()))
