"""Encode the launch film for the web with ffmpeg.

H.264 High profile, CRF 23, preset slow, +faststart (so playback can begin
before the whole file arrives), AAC 160 kbit/s. If the result is larger than
the budget, the CRF is stepped up by one and the film is encoded again, until
it fits.

Usage:  python tools/encode_film.py [source.mp4]
"""
from __future__ import annotations

import shutil
import subprocess
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
SRC = ROOT / "_raw" / "video" / "Flow-launch-film-1080p60.mp4"
OUT = ROOT / "assets" / "video" / "flow-film-1080p.mp4"
BUDGET = 12 * 1024 * 1024  # "at most about 12 MB"
START_CRF, MAX_CRF = 23, 32


def encode(src: Path, dst: Path, crf: int) -> int:
    cmd = [
        "ffmpeg", "-hide_banner", "-loglevel", "error", "-y", "-i", str(src),
        "-c:v", "libx264", "-profile:v", "high", "-pix_fmt", "yuv420p",
        "-preset", "slow", "-crf", str(crf),
        # Keep 1080p; scale only if a larger master is ever used as the source.
        "-vf", "scale='min(1920,iw)':-2:flags=lanczos",
        "-c:a", "aac", "-b:a", "160k",
        "-movflags", "+faststart",
        str(dst),
    ]
    subprocess.run(cmd, check=True)
    return dst.stat().st_size


def main() -> None:
    src = Path(sys.argv[1]) if len(sys.argv) > 1 else SRC
    if not shutil.which("ffmpeg"):
        raise SystemExit("ffmpeg is not installed. Install it (winget install Gyan.FFmpeg) and run again.")
    if not src.exists():
        raise SystemExit(f"Source film not found: {src}")
    OUT.parent.mkdir(parents=True, exist_ok=True)
    for crf in range(START_CRF, MAX_CRF + 1):
        size = encode(src, OUT, crf)
        print(f"CRF {crf}: {size / 1048576:.2f} MB")
        if size <= BUDGET:
            print(f"OK  {OUT.relative_to(ROOT)}  CRF {crf}  {size / 1048576:.2f} MB")
            return
    print(f"WARNING: still over budget at CRF {MAX_CRF}; kept the last encode.")


if __name__ == "__main__":
    main()
