#!/usr/bin/env python3
"""Render a deterministic MP4 with original sound effects and optional licensed music using Chromium canvas and FFmpeg."""
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
    target=OUT/"verso-demo.mp4"
    try:
        with sync_playwright() as pw:
            browser=pw.chromium.launch()
            page=browser.new_page(viewport={"width":1920,"height":1080},device_scale_factor=1)
            page.goto(f"http://127.0.0.1:{server.server_port}/")
            page.evaluate("window.ready")
            duration=page.evaluate("window.duration")
            timeline=page.evaluate("window.timeline")
            assert duration == 34, duration
            checks = page.evaluate("window.verifyChecks()")
            assert all(row['ok'] for row in checks), checks
            (OUT/"checkmarks.json").write_text(json.dumps(checks,indent=2))
            for n,t in enumerate((.9,1.6,2.3,3.2,3.85)):
                page.evaluate("(t)=>window.render(t+1.5)",t)
                page.screenshot(path=str(OUT/f"import-step-{n+1}.jpg"),type="jpeg",quality=90)
            page.evaluate("window.render(0.75)")
            page.screenshot(path=str(OUT/"verso-demo-poster.jpg"),type="jpeg",quality=94)
            for i,scene in enumerate(timeline):
                t=sum(x["seconds"] for x in timeline[:i])+scene["seconds"]*.65
                page.evaluate("(t)=>window.render(t)",t)
                page.screenshot(path=str(OUT/f"scene-{i+1:02}-{scene['id']}.jpg"),type="jpeg",quality=85)
            args=["ffmpeg","-hide_banner","-loglevel","error","-y","-f","image2pipe","-framerate",str(FPS),
                  "-vcodec","mjpeg","-i","pipe:0","-an","-c:v","libx264","-preset","fast","-crf","23",
                  "-pix_fmt","yuv420p","-movflags","+faststart",str(target)]
            proc=subprocess.Popen(args,stdin=subprocess.PIPE)
            try:
                for frame in range(round(duration*FPS)):
                    page.evaluate("(t)=>window.render(t)",frame/FPS)
                    proc.stdin.write(page.screenshot(type="jpeg",quality=90))
                    if frame%150==0: print(f"Rendered {frame}/{duration*FPS}",flush=True)
                proc.stdin.close()
                assert proc.wait()==0,"FFmpeg failed"
            finally:
                if proc.poll() is None:
                    proc.kill()
                    proc.wait()
            browser.close()
        if target.stat().st_size>9_100_000:
            # Two-pass bitrate cap provides predictable size; retain 1080p/30 fps.
            tmp=OUT/"bounded.mp4"
            bitrate=int(8_700_000*8/duration)
            cmd=["ffmpeg","-hide_banner","-loglevel","error","-y","-i",str(target),"-an","-c:v","libx264","-preset","slow",
                 "-b:v",str(bitrate),"-pix_fmt","yuv420p","-passlogfile",str(OUT/"encode-pass")]
            subprocess.run(cmd+["-pass","1","-f","null",os.devnull],check=True)
            subprocess.run(cmd+["-pass","2","-movflags","+faststart",str(tmp)],check=True)
            tmp.replace(target)
            for p in OUT.glob("encode-pass*"): p.unlink()
        # Original deterministic foley, created from scratch (no stock audio).
        sr=48000
        rng=random.Random(412)
        samples=[0.0]*round(duration*sr)
        def effect(at,length,kind,gain):
            prev=0.0
            for n in range(round(length*sr)):
                t=n/sr
                env=math.sin(math.pi*t/length)**2
                noise=rng.uniform(-1,1)
                prev=.87*prev+.13*noise
                if kind=="chime":
                    sound=(math.sin(2*math.pi*660*t)+.45*math.sin(2*math.pi*990*t))*math.exp(-8*t)
                else:
                    sound=(noise-prev)*(.6+.4*math.sin(2*math.pi*11*t))
                i=round(at*sr)+n
                if i<len(samples): samples[i]+=gain*env*sound
        effect(1.8,.42,"paper",.045)
        effect(14.35,.5,"chime",.045)
        effect(24.15,.40,"page",.038)
        foley=OUT/"foley-temp.wav"
        with wave.open(str(foley),"wb") as w:
            w.setparams((1,2,sr,0,"NONE","not compressed"))
            w.writeframes(array.array("h",(int(max(-1,min(1,x))*32767) for x in samples)).tobytes())
        music=os.environ.get("DEMO_MUSIC")
        mixed=OUT/"mixed.mp4"
        cmd=["ffmpeg","-hide_banner","-loglevel","error","-y","-i",str(target),"-i",str(foley)]
        if music:
            assert Path(music).is_file(),"DEMO_MUSIC must point to a licensed local file"
            offset=float(os.environ.get("DEMO_MUSIC_OFFSET","0"))
            cmd+=["-ss",str(offset),"-i",music,"-filter_complex",
                  f"[2:a]aresample=48000,atrim=duration={duration},asetpts=PTS-STARTPTS,volume=0.55,afade=t=in:d=0.35,afade=t=out:st={duration-1.2}:d=1.2,apad=whole_dur={duration}[m];[1:a][m]amix=inputs=2:duration=first:normalize=0,alimiter=limit=0.92[a]","-map","0:v:0","-map","[a]"]
        else:
            cmd+=["-map","0:v:0","-map","1:a:0"]
        subprocess.run(cmd+["-c:v","copy","-c:a","aac","-b:a","128k","-t",str(duration),"-movflags","+faststart",str(mixed)],check=True)
        mixed.replace(target)
        foley.unlink()
        probe=json.loads(subprocess.check_output(["ffprobe","-v","error","-show_format","-show_streams","-of","json",str(target)]))
        video=probe["streams"][0]
        assert len(probe["streams"])==2 and video["codec_name"]=="h264" and probe["streams"][1]["codec_name"]=="aac"
        assert (video["width"],video["height"],video["avg_frame_rate"])==(1920,1080,"30/1")
        assert abs(float(probe["format"]["duration"])-duration)<.1
        assert target.stat().st_size<10_000_000
        (OUT/"manifest.json").write_text(json.dumps({"commit":os.getenv("GITHUB_SHA"),"seconds":duration,"fps":FPS,"bytes":target.stat().st_size,"timeline":timeline,
            "soundtrack":"Keys of Time (user-supplied licensed file)" if music else "Original foley only; music pending","source":"actual browser captures of fictional demo library; conceptual import and e-reader animation"},indent=2))
    finally:
        server.shutdown()

if __name__=="__main__":
    run()
