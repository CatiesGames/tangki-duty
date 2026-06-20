#!/usr/bin/env python3
"""Generate pixel-perfect casino assets: slot-strip.png & wheel-face.png."""
from __future__ import annotations

import math
from pathlib import Path

from PIL import Image, ImageDraw, ImageFont

ROOT = Path(__file__).resolve().parents[1] / "public" / "casino"

# Match hub.js WHEEL_SEGS order (12 o'clock clockwise)
WHEEL_SEGS = [
    {"icon": "頭獎", "mult": "×8", "color": "#e0301a"},
    {"icon": "天庭", "mult": "×0", "color": "#3a2030"},
    {"icon": "小賺", "mult": "×1.8", "color": "#c9a227"},
    {"icon": "天庭", "mult": "×0", "color": "#3a2030"},
    {"icon": "豐收", "mult": "×3", "color": "#b026ff"},
    {"icon": "小賺", "mult": "×1.8", "color": "#c9a227"},
    {"icon": "回本", "mult": "×1", "color": "#5a6a7a"},
    {"icon": "豐收", "mult": "×3", "color": "#b026ff"},
]


def hex_rgb(h: str) -> tuple[int, int, int]:
    h = h.lstrip("#")
    return tuple(int(h[i : i + 2], 16) for i in (0, 2, 4))


def load_font(size: int, bold: bool = False) -> ImageFont.FreeTypeFont | ImageFont.ImageFont:
    candidates = [
        "/System/Library/Fonts/PingFang.ttc",
        "/System/Library/Fonts/STHeiti Medium.ttc",
        "/System/Library/Fonts/Supplemental/Arial Bold.ttf" if bold else "/System/Library/Fonts/Supplemental/Arial.ttf",
        "/Library/Fonts/Arial Bold.ttf" if bold else "/Library/Fonts/Arial.ttf",
    ]
    for path in candidates:
        if Path(path).exists():
            try:
                return ImageFont.truetype(path, size)
            except OSError:
                continue
    return ImageFont.load_default()


def draw_god(draw: ImageDraw.ImageDraw, cx: int, cy: int, r: int) -> None:
    draw.ellipse([cx - r, cy - r - 8, cx + r, cy + r - 8], fill="#f0c040", outline="#8a5a00", width=3)
    draw.ellipse([cx - r // 2, cy - r, cx + r // 2, cy - r // 3], fill="#ffe890", outline="#8a5a00", width=2)
    draw.rectangle([cx - r // 3, cy - r // 4, cx + r // 3, cy + r // 2], fill="#c41e1e", outline="#6a0808", width=2)


def draw_ingot(draw: ImageDraw.ImageDraw, cx: int, cy: int, s: int) -> None:
    w, h = s, s // 2
    pts = [(cx - w, cy), (cx - w // 3, cy - h), (cx + w // 3, cy - h), (cx + w, cy),
           (cx + w // 3, cy + h), (cx - w // 3, cy + h)]
    draw.polygon(pts, fill="#f5d060", outline="#9a6800")


def draw_incense(draw: ImageDraw.ImageDraw, cx: int, cy: int, s: int) -> None:
    bw, bh = s, s * 3 // 5
    draw.rectangle([cx - bw // 2, cy - bh // 2, cx + bw // 2, cy + bh // 2], fill="#8b1a12", outline="#d4a820", width=3)
    for dx in (-bw // 3, 0, bw // 3):
        draw.rectangle([cx + dx - 4, cy + bh // 2, cx + dx + 4, cy + bh // 2 + s // 5], fill="#d4a820")
    draw.ellipse([cx - 6, cy - bh // 2 - 10, cx + 6, cy - bh // 2 + 2], fill="#888")


def draw_envelope(draw: ImageDraw.ImageDraw, cx: int, cy: int, s: int) -> None:
    w, h = s, int(s * 1.2)
    draw.rectangle([cx - w // 2, cy - h // 2, cx + w // 2, cy + h // 2], fill="#d4121f", outline="#ffd64d", width=3)
    draw.polygon([(cx - w // 2, cy - h // 2), (cx, cy), (cx + w // 2, cy - h // 2)], fill="#ff6060")
    draw.ellipse([cx - 8, cy - 4, cx + 8, cy + 12], fill="#ffd64d")


def draw_turtle(draw: ImageDraw.ImageDraw, cx: int, cy: int, s: int) -> None:
    draw.ellipse([cx - s, cy - s * 3 // 4, cx + s, cy + s * 3 // 4], fill="#c9a227", outline="#6a4800", width=3)
    for i in range(-2, 3):
        for j in range(-1, 2):
            draw.rectangle([cx + i * 12 - 5, cy + j * 12 - 5, cx + i * 12 + 5, cy + j * 12 + 5], fill="#8a5a00")
    draw.ellipse([cx - s - 8, cy + s // 3, cx - s + 8, cy + s // 2 + 8], fill="#c9a227")
    draw.ellipse([cx + s - 8, cy + s // 3, cx + s + 8, cy + s // 2 + 8], fill="#c9a227")


def draw_seven(draw: ImageDraw.ImageDraw, cx: int, cy: int, s: int, font: ImageFont.ImageFont) -> None:
    text = "7"
    bbox = draw.textbbox((0, 0), text, font=font)
    tw, th = bbox[2] - bbox[0], bbox[3] - bbox[1]
    x, y = cx - tw // 2 - bbox[0], cy - th // 2 - bbox[1]
    for ox, oy in ((2, 2), (-2, 2), (2, -2), (-2, -2)):
        draw.text((x + ox, y + oy), text, fill="#5a3a00", font=font)
    draw.text((x, y), text, fill="#ffd64d", font=font)


def gen_slot_strip() -> None:
    w, cells, cell_h = 128, 6, 128
    h = cells * cell_h
    img = Image.new("RGBA", (w, h), (0, 0, 0, 255))
    draw = ImageDraw.Draw(img)
    font7 = load_font(72, bold=True)

    drawers = [draw_god, draw_ingot, draw_incense, draw_envelope, draw_turtle,
               lambda d, cx, cy, s: draw_seven(d, cx, cy, s, font7)]

    for i, fn in enumerate(drawers):
        y0, y1 = i * cell_h, (i + 1) * cell_h
        draw.rectangle([0, y0, w - 1, y1 - 1], outline=(40, 20, 10, 80))
        fn(draw, w // 2, y0 + cell_h // 2, 36)

    out = ROOT / "slot-strip.png"
    img.save(out, "PNG", optimize=True)
    print(f"slot-strip -> {out} ({w}x{h})")


def gen_wheel_face() -> None:
    size = 512
    cx = cy = size // 2
    outer_r, inner_r = 230, 52
    img = Image.new("RGBA", (size, size), (0, 0, 0, 0))
    draw = ImageDraw.Draw(img)
    font_l = load_font(18, bold=True)
    font_m = load_font(14, bold=True)

    for i, seg in enumerate(WHEEL_SEGS):
        # Pillow pieslice: 0°=3 o'clock, CCW+. Seg 0 at 12 o'clock = 247.5°–292.5°, then clockwise.
        a0 = 247.5 + i * 45
        a1 = a0 + 45
        color = hex_rgb(seg["color"]) + (255,)
        draw.pieslice([cx - outer_r, cy - outer_r, cx + outer_r, cy + outer_r], a0, a1, fill=color)
        draw.pieslice([cx - outer_r, cy - outer_r, cx + outer_r, cy + outer_r], a0, a1, outline="#ffd64d", width=2)

        mid = math.radians(a0 + 22.5)
        tx = cx + math.cos(mid) * (outer_r * 0.62)
        ty = cy + math.sin(mid) * (outer_r * 0.62)
        label = seg["icon"]
        mult = seg["mult"]
        bbox = draw.textbbox((0, 0), label, font=font_l)
        lw = bbox[2] - bbox[0]
        draw.text((tx - lw / 2, ty - 14), label, fill="#ffffff", font=font_l, stroke_width=1, stroke_fill="#000000")
        bbox2 = draw.textbbox((0, 0), mult, font=font_m)
        mw = bbox2[2] - bbox2[0]
        draw.text((tx - mw / 2, ty + 4), mult, fill="#ffd64d", font=font_m, stroke_width=1, stroke_fill="#000000")

    draw.ellipse([cx - outer_r - 6, cy - outer_r - 6, cx + outer_r + 6, cy + outer_r + 6],
                 outline="#ffd64d", width=8)
    draw.ellipse([cx - inner_r, cy - inner_r, cx + inner_r, cy + inner_r],
                 fill="#ffe08a", outline="#ffffff", width=3)
    hub_font = load_font(22, bold=True)
    hb = draw.textbbox((0, 0), "轉", font=hub_font)
    draw.text((cx - (hb[2] - hb[0]) / 2, cy - (hb[3] - hb[1]) / 2 - 2), "轉",
              fill="#7a3a00", font=hub_font)

    out = ROOT / "wheel-face.png"
    img.save(out, "PNG", optimize=True)
    print(f"wheel-face -> {out} ({size}x{size})")


def main() -> None:
    ROOT.mkdir(parents=True, exist_ok=True)
    gen_slot_strip()
    gen_wheel_face()
    print("done")


if __name__ == "__main__":
    main()