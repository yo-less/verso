#!/usr/bin/env python3
"""Render a deterministic MP4 with optional licensed music using Chromium canvas and FFmpeg."""
import functools
import math
import random
import wave
import array
import http.server
import json
import os
from pathlib import Path
import shutil
import subprocess
import threading
from playwright.sync_api import sync_playwright

ROOT = Path(__file__).resolve().parents[2]
CAPTURES = Path(os.environ["DEMO_OUT"])
OUT = Path(os.environ["VIDEO_OUT"])
FPS = 30
VIDEO_CRF = 13
VIDEO_PRESET = "slow"

class Server(http.server.SimpleHTTPRequestHandler):
    def translate_path(self, path):
        from urllib.parse import urlsplit, unquote
        p = unquote(urlsplit(path).path)
        for prefix, root in (("/captures/",CAPTURES),("/static/",ROOT/"cps/static"),("/",Path(__file__).parent)):
            if p.startswith(prefix):
                rel = p[len(prefix):] or "index.html"
                target = (root/rel).resolve()
                if target.is_relative_to(root.resolve()):
                    return str(target)
        return str(Path(__file__).parent/"missing")
    def log_message(self,*args):
        pass

def run():
    OUT.mkdir(parents=True,exist_ok=True)
    server=http.server.ThreadingHTTPServer(("127.0.0.1",0),Server)
    threading.Thread(target=server.serve_forever,daemon=True).start()
    target=OUT/("verso-demo.mp4" if os.environ.get("DEMO_MUSIC") else "verso-demo-SILENT-RENDER.mp4")
    try:
        with sync_playwright() as pw:
            browser=pw.chromium.launch()
            page=browser.new_page(viewport={"width":1920,"height":1080},device_scale_factor=1)
            page.goto(f"http://127.0.0.1:{server.server_port}/")
            page.evaluate("window.ready")
            duration=page.evaluate("window.duration")
            timeline=page.evaluate("window.timeline")
            assert timeline and len({s["id"] for s in timeline}) == len(timeline), timeline
            assert duration > 0 and math.isclose(duration, sum(s["seconds"] for s in timeline)), duration
            sidebar_check = page.evaluate("window.verifyDetailSidebar()")
            (OUT/"sidebar-check.json").write_text(json.dumps(sidebar_check,indent=2))
            assert sidebar_check["ok"], sidebar_check
            # Validate timeline even when optional review images are disabled.
            for scene in timeline:
                assert scene["seconds"] > 0 and all(0 <= t < scene["seconds"] for t in scene["review"]), scene
            if os.getenv("DEMO_REVIEW", "0") == "1":
                start = 0
                for scene in timeline:
                    scene_id = scene["id"]
                    for n, t in enumerate(scene["review"]):
                        page.evaluate("(t)=>window.render(t)",start+t)
                        page.screenshot(path=str(OUT/f"review-{scene_id}-{n+1}.jpg"),type="jpeg",quality=90)
                    start += scene["seconds"]
                page.evaluate("window.render(2.75)")
                page.screenshot(path=str(OUT/"verso-demo-poster.jpg"),type="jpeg",quality=94)
                for i,scene in enumerate(timeline):
                    t=sum(x["seconds"] for x in timeline[:i])+scene["seconds"]*.65
                    page.evaluate("(t)=>window.render(t)",t)
                    page.screenshot(path=str(OUT/f"scene-{i+1:02}-{scene['id']}.jpg"),type="jpeg",quality=85)
            args=["ffmpeg","-hide_banner","-loglevel","error","-y","-f","image2pipe","-framerate",str(FPS),
                  "-vcodec","png","-i","pipe:0","-an","-c:v","libx264","-preset",VIDEO_PRESET,"-crf",str(VIDEO_CRF),
                  "-pix_fmt","yuv420p","-color_primaries","bt709","-color_trc","bt709","-colorspace","bt709","-movflags","+faststart",str(target)]
            proc=subprocess.Popen(args,stdin=subprocess.PIPE)
            try:
                for frame in range(round(duration*FPS)):
                    page.evaluate("(t)=>window.render(t)",frame/FPS)
                    proc.stdin.write(page.screenshot(type="png"))
                    if frame%150==0: print(f"Rendered {frame}/{duration*FPS}",flush=True)
                proc.stdin.close()
                assert proc.wait()==0,"FFmpeg failed"
            finally:
                if proc.poll() is None:
                    proc.kill()
                    proc.wait()
            browser.close()
        # The final edit uses music alone. Do not redistribute the standalone track.
        music=os.environ.get("DEMO_MUSIC")
        if music:
            assert Path(music).is_file(),"DEMO_MUSIC must point to a licensed local file"
            offset=float(os.environ.get("DEMO_MUSIC_OFFSET","28.5"))
            mixed=OUT/"mixed.mp4"
            subprocess.run(["ffmpeg","-hide_banner","-loglevel","error","-y","-i",str(target),
                            "-ss",str(offset),"-i",music,"-map","0:v:0","-map","1:a:0",
                            "-af",f"atrim=duration={duration},asetpts=PTS-STARTPTS,loudnorm=I=-17:TP=-1.5:LRA=9,aresample=48000,afade=t=in:d=0.9:curve=qsin,afade=t=out:st={duration-4.15}:d=4:curve=hsin",
                            "-ac","2","-c:v","copy","-c:a","aac","-b:a","256k","-t",str(duration),
                            "-movflags","+faststart",str(mixed)],check=True)
            mixed.replace(target)
        probe=json.loads(subprocess.check_output(["ffprobe","-v","error","-show_format","-show_streams","-of","json",str(target)]))
        video=probe["streams"][0]
        assert len(probe["streams"])==(2 if music else 1) and video["codec_name"]=="h264"
        if music: assert probe["streams"][1]["codec_name"]=="aac"
        assert (video["width"],video["height"],video["avg_frame_rate"])==(1920,1080,"30/1")
        assert video.get("field_order") == "progressive", video.get("field_order")
        assert abs(float(probe["format"]["duration"])-duration)<.1
        (OUT/"manifest.json").write_text(json.dumps({"commit":os.getenv("GITHUB_SHA"),"seconds":duration,"fps":FPS,"bytes":target.stat().st_size,"timeline":timeline,
            "encoding":{"codec":"h264","crf":VIDEO_CRF,"preset":VIDEO_PRESET,"frame_format":"png","pixel_format":"yuv420p"},
            "music_offset_seconds":offset if music else None,"music_fade_in_seconds":0.9 if music else None,"music_fade_out_seconds":4.0 if music else None,"music_silent_tail_seconds":0.15 if music else None,
            "soundtrack":"Keys of Time (user-supplied licensed file)" if music else "SILENT INTERMEDIATE — not for review or publication","source":"actual browser captures of fictional demo library; conceptual import and e-reader animation"},indent=2))
    finally:
        server.shutdown()

if __name__=="__main__":
    run()
