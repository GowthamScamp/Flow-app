"""Turn the raw screenshots and brand files in _raw/ into web-ready assets.

Run once (and again whenever _raw/ changes):  python tools/build_assets.py

What it makes
  assets/img/<name>-<theme>-<width>.webp   story crops of the 3200x2000 screenshots
  assets/img/og-1280x720.jpg               social card
  assets/icons/*                           favicons and app icons

Crops are written as a cropped "master" first and then resized, so every width
shows exactly the same framing. Widths larger than the master are skipped; the
master's own width is added instead so high-DPI screens still get full detail.
"""
from __future__ import annotations

import shutil
from pathlib import Path

from PIL import Image

ROOT = Path(__file__).resolve().parent.parent
RAW = ROOT / "_raw" / "images"
SCREENS = RAW / "screens"
BRAND = RAW / "brand"
IMG = ROOT / "assets" / "img"
ICONS = ROOT / "assets" / "icons"

WIDTHS = (640, 1024, 1600, 2400)
QUALITY = 82

# name -> (screenshot stem, themes, crop box in 3200x2000 pixels or None for full)
# The site is light only. The two dark entries below are the app's own dark
# windows (Review dialog, code map), used as no-JavaScript fallbacks.
# The boxes were measured from the screenshots: each one frames the part of the
# UI that the section on the page talks about.
CROPS: dict[str, tuple[str, tuple[str, ...], tuple[int, int, int, int] | None]] = {
    # Hero: the Home screen down to the end of the Recent work panel.
    "home": ("01-home", ("light",), (0, 0, 3200, 1720)),
    # Mode cards: one crop per mode, all close to the same 1.45 aspect.
    "mode-chat": ("03-chat-thinking", ("light",), (1058, 185, 2750, 1353)),
    "mode-code": ("04-code-changes", ("light",), (666, 159, 2199, 1217)),
    "mode-research": ("08-research", ("light",), (659, 185, 2193, 1243)),
    # Static fallbacks for the demos (shown only when JavaScript is off).
    "chat-answer": ("02b-chat-answer", ("light",), None),
    "code-approval": ("05-code-approval", ("dark",), None),
    "code-graph": ("06c-code-graph-full", ("dark",), None),
    "research-sources": ("10-research-sources", ("light",), None),
    # Research export: the Report panel with its MD/HTML/PDF/DOCX/BIB/RIS row.
    "research-report": ("09-research-report", ("light",), (2221, 152, 3200, 1719)),
}


def kb(path: Path) -> float:
    return path.stat().st_size / 1024


def write_webp(img: Image.Image, path: Path, quality: int = QUALITY) -> None:
    img.save(path, "WEBP", quality=quality, method=6)


def build_screens(report: list[tuple[Path, str]]) -> None:
    IMG.mkdir(parents=True, exist_ok=True)
    for name, (stem, themes, box) in CROPS.items():
        for theme in themes:
            src = SCREENS / f"{stem}-{theme}.png"
            if not src.exists():
                print(f"MISSING  {src.relative_to(ROOT)}  (placeholder needed)")
                continue
            master = Image.open(src).convert("RGB")
            if box:
                master = master.crop(box)
            widths = [w for w in WIDTHS if w <= master.width]
            if master.width not in widths and master.width < WIDTHS[-1]:
                widths.append(master.width)
            for w in widths:
                h = round(master.height * w / master.width)
                out = IMG / f"{name}-{theme}-{w}.webp"
                resized = master if w == master.width else master.resize((w, h), Image.LANCZOS)
                write_webp(resized, out)
                report.append((out, f"{w}x{h}"))


def build_brand(report: list[tuple[Path, str]]) -> None:
    ICONS.mkdir(parents=True, exist_ok=True)
    # The SVG icon goes in exactly as designed.
    svg = ICONS / "flow-icon.svg"
    shutil.copyfile(BRAND / "flow-icon.svg", svg)
    report.append((svg, "svg"))

    icon = Image.open(BRAND / "flow-icon-1024.png").convert("RGBA")
    for size, fname in ((32, "favicon-32.png"), (180, "apple-touch-icon.png"),
                        (192, "icon-192.png"), (512, "icon-512.png")):
        out = ICONS / fname
        icon.resize((size, size), Image.LANCZOS).save(out, "PNG", optimize=True)
        report.append((out, f"{size}x{size}"))

    og = Image.open(BRAND / "flow-thumbnail-1280x720.png").convert("RGB")
    out = IMG / "og-1280x720.jpg"
    og.resize((1280, 720), Image.LANCZOS).save(out, "JPEG", quality=86, optimize=True, progressive=True)
    report.append((out, "1280x720"))



# Budgets: flag anything that would make the page feel heavy.
BUDGET_KB = {".webp": 400, ".jpg": 300, ".png": 120, ".svg": 10}


def main() -> None:
    report: list[tuple[Path, str]] = []
    build_screens(report)
    build_brand(report)
    total = 0.0
    print(f"\n{'file':58} {'size':>10} {'dims':>12}")
    for path, dims in report:
        size = kb(path)
        total += size
        flag = "  OVER BUDGET" if size > BUDGET_KB.get(path.suffix, 1e9) else ""
        print(f"{str(path.relative_to(ROOT)):58} {size:8.1f}KB {dims:>12}{flag}")
    print(f"\n{len(report)} files, {total/1024:.2f} MB total")


if __name__ == "__main__":
    main()
