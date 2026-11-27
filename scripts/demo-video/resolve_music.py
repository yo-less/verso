#!/usr/bin/env python3
"""Resolve the published Pixabay track, never redistribute the standalone MP3."""
import hashlib
import html
import re
import sys
from pathlib import Path
from urllib.parse import urlsplit, unquote
from urllib.request import Request, urlopen

PAGE = "https://pixabay.com/music/modern-classical-keys-of-time-no-ai-335937/"
SHA256 = "480cf9dc634e65f799fde5a0d7aa25b609c8c2b9f6bdd43a04a9809b08c27b26"
FILENAME = "good_b_music-keys-of-time-no-ai-335937.mp3"


def read(url, limit):
    with urlopen(Request(url, headers={"User-Agent": "Verso-demo-render/1.0"}), timeout=25) as response:
        if urlsplit(response.geturl()).scheme != "https":
            raise ValueError("Not an HTTPS response")
        return response.read(limit + 1)


def resolve(target):
    source = read(PAGE, 8_000_000)
    if len(source) > 8_000_000:
        raise ValueError("Unexpected track page size")
    page = html.unescape(source.decode("utf-8")).replace(r"\/", "/").replace(r"\u0026", "&")
    urls = list(dict.fromkeys(re.findall(r'https://cdn\.pixabay\.com/[^\s"<>\\]+?\.mp3(?:\?[^\s"<>\\]*)?', page)))
    # Only download candidates from the publisher's own audio CDN.
    # Prefer the explicit original filename; never accept a different file.
    urls.sort(key=lambda url: FILENAME not in unquote(url))
    for url in urls[:8]:
        if urlsplit(url).hostname != "cdn.pixabay.com":
            continue
        try:
            data = read(url, 12_000_000)
        except (OSError, ValueError):
            continue
        if hashlib.sha256(data).hexdigest() == SHA256:
            target.write_bytes(data)
            print("Verified Keys of Time source MP3.")
            return
    raise ValueError("No public media URL matched the original source checksum")


if __name__ == "__main__":
    try:
        resolve(Path(sys.argv[1]))
    except (OSError, ValueError) as error:
        print(f"Soundtrack resolution unavailable: {error}", file=sys.stderr)
        sys.exit(1)
