"""Download the two self-hosted web fonts (Latin subset, variable woff2).

Why Google Fonts rather than the GitHub releases: the releases ship the full
character set (~350 KB for Inter), and subsetting them needs fontTools, which is
not installed here. Google Fonts already serves a Latin-only cut of the same
families (Inter with its opsz + wght axes, JetBrains Mono with wght).

Run once:  python tools/fetch_fonts.py
"""
from __future__ import annotations

import re
import sys
import urllib.request
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
OUT = ROOT / "assets" / "fonts"

# A modern browser user agent makes Google serve woff2 with variable axes.
UA = "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/140.0 Safari/537.36"

FAMILIES = {
    "inter-latin-var.woff2": "family=Inter:opsz,wght@14..32,100..900",
    "jetbrains-mono-latin-var.woff2": "family=JetBrains+Mono:wght@100..800",
}


def fetch(url: str) -> bytes:
    req = urllib.request.Request(url, headers={"User-Agent": UA})
    with urllib.request.urlopen(req, timeout=30) as res:
        return res.read()


def latin_block(css: str) -> tuple[str, str]:
    """Return (woff2 url, unicode-range) of the block labelled /* latin */."""
    for block in css.split("/* ")[1:]:
        label, _, body = block.partition(" */")
        if label.strip() == "latin":
            url = re.search(r"url\((https://[^)]+\.woff2)\)", body).group(1)
            rng = re.search(r"unicode-range:\s*([^;]+);", body).group(1).strip()
            return url, rng
    raise SystemExit("No latin block found in the Google Fonts CSS")


def main() -> None:
    OUT.mkdir(parents=True, exist_ok=True)
    for name, query in FAMILIES.items():
        css = fetch(f"https://fonts.googleapis.com/css2?{query}&display=swap").decode()
        url, rng = latin_block(css)
        data = fetch(url)
        (OUT / name).write_bytes(data)
        print(f"{name:34} {len(data)/1024:7.1f} KB  unicode-range: {rng}")


if __name__ == "__main__":
    sys.exit(main())
