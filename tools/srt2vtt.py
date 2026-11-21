"""Convert an SRT caption file to WebVTT.

WebVTT is SRT with two differences that matter here: a "WEBVTT" header line,
and a dot instead of a comma before the milliseconds in each timestamp.

Usage:  python tools/srt2vtt.py _raw/on-screen-text.srt assets/video/flow-film.en.vtt
"""
import re
import sys
from pathlib import Path

TIMESTAMP = re.compile(r"(\d{2}:\d{2}:\d{2}),(\d{3})")


def convert(srt: str) -> str:
    # Normalise line endings and drop a UTF-8 BOM if the editor added one.
    text = srt.replace("\r\n", "\n").replace("\r", "\n").lstrip("﻿")
    lines = []
    for line in text.split("\n"):
        if "-->" in line:
            line = TIMESTAMP.sub(r"\1.\2", line)
        lines.append(line)
    return "WEBVTT\n\n" + "\n".join(lines).strip() + "\n"


def main() -> None:
    if len(sys.argv) != 3:
        raise SystemExit(__doc__)
    src, dst = Path(sys.argv[1]), Path(sys.argv[2])
    dst.parent.mkdir(parents=True, exist_ok=True)
    dst.write_text(convert(src.read_text(encoding="utf-8")), encoding="utf-8")
    print(f"wrote {dst} ({dst.stat().st_size} bytes)")


if __name__ == "__main__":
    main()
