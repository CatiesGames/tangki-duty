#!/usr/bin/env python3
"""Generate remaining asset-manifest assets when AI quota is full."""
from pathlib import Path
from PIL import Image, ImageDraw, ImageFilter, ImageEnhance
import math, random

ROOT = Path(__file__).resolve().parents[1] / 'public'
BEL = ROOT / 'believers'
CAS = ROOT / 'casino'

def save_jpg(img, path, quality=88):
    path.parent.mkdir(parents=True, exist_ok=True)
    if img.mode != 'RGB':
        img = img.convert('RGB')
    img.save(path, 'JPEG', quality=quality, optimize=True)

def save_png(img, path):
    path.parent.mkdir(parents=True, exist_ok=True)
    img.save(path, 'PNG', optimize=True)

def grade_copy(src, dst, brightness=1.0, contrast=1.0, saturation=1.0, hue_shift=0):
    img = Image.open(src).convert('RGB')
    if brightness != 1.0:
        img = ImageEnhance.Brightness(img).enhance(brightness)
    if contrast != 1.0:
        img = ImageEnhance.Contrast(img).enhance(contrast)
    if saturation != 1.0:
        img = ImageEnhance.Color(img).enhance(saturation)
    if hue_shift:
        r, g, b = img.split()
        img = Image.merge('RGB', (g, b, r)) if hue_shift == 1 else img
    save_jpg(img, dst)

def neon_casino_base(w, h):
    img = Image.new('RGB', (w, h))
    draw = ImageDraw.Draw(img)
    for y in range(h):
        t = y / h
        r = int(18 + 40 * t)
        g = int(4 + 12 * (1 - t))
        b = int(28 + 55 * t)
        draw.line([(0, y), (w, y)], fill=(r, g, b))
    # gold pillars
    for x in (int(w * 0.12), int(w * 0.88)):
        draw.rectangle([x - 18, 0, x + 18, h], fill=(120, 85, 20))
        draw.rectangle([x - 12, 0, x + 12, h], fill=(200, 150, 40))
    # lantern glows
    random.seed(7)
    for _ in range(14):
        cx, cy = random.randint(40, w - 40), random.randint(40, h - 40)
        glow = Image.new('RGBA', (w, h), (0, 0, 0, 0))
        gd = ImageDraw.Draw(glow)
        gd.ellipse([cx - 30, cy - 18, cx + 30, cy + 18], fill=(255, 60, 40, 90))
        img = Image.alpha_composite(img.convert('RGBA'), glow).convert('RGB')
    return img

def gen_scene_fortune():
    w, h = 1200, 900
    img = neon_casino_base(w, h)
    draw = ImageDraw.Draw(img)
    cx, cy, r = w // 2, h // 2, min(w, h) // 3
    draw.ellipse([cx - r - 20, cy - r - 20, cx + r + 20, cy + r + 20], fill=(180, 120, 20), outline=(255, 220, 80), width=8)
    colors = [(180, 20, 30), (220, 170, 40), (90, 30, 120), (200, 50, 60)] * 2
    for i in range(8):
        a0, a1 = i * math.pi / 4, (i + 1) * math.pi / 4
        pts = [(cx, cy)]
        pts.append((cx + r * math.cos(a0), cy + r * math.sin(a0)))
        pts.append((cx + r * math.cos(a1), cy + r * math.sin(a1)))
        draw.polygon(pts, fill=colors[i])
    draw.ellipse([cx - 28, cy - 28, cx + 28, cy + 28], fill=(255, 230, 120))
    save_jpg(img, CAS / 'scene-fortune.jpg')

def gen_scene_jiao():
    w, h = 1200, 900
    img = neon_casino_base(w, h)
    draw = ImageDraw.Draw(img)
    draw.rectangle([80, h - 220, w - 80, h - 80], fill=(20, 90, 45))
    draw.rectangle([100, h - 200, w - 100, h - 100], fill=(30, 120, 60))
    for ox in (-120, 120):
        cx = w // 2 + ox
        cy = h - 150
        draw.pieslice([cx - 70, cy - 35, cx + 70, cy + 35], 200, 340, fill=(200, 25, 25), outline=(255, 200, 60), width=4)
    save_jpg(img, CAS / 'scene-jiao.jpg')

def gen_scene_slot():
    w, h = 1200, 900
    img = neon_casino_base(w, h)
    draw = ImageDraw.Draw(img)
    cols, rows = 5, 3
    bw = (w - 160) // cols
    bh = (h - 200) // rows
    for row in range(rows):
        for col in range(cols):
            x0 = 80 + col * bw + 8
            y0 = 100 + row * bh + 8
            x1 = x0 + bw - 16
            y1 = y0 + bh - 16
            draw.rounded_rectangle([x0, y0, x1, y1], radius=12, fill=(40, 20, 60), outline=(255, 200, 60), width=3)
            draw.ellipse([x0 + 20, y0 + 20, x1 - 20, y1 - 20], fill=(220, 170, 40))
    save_jpg(img, CAS / 'scene-slot.jpg')

def gen_scene_vip():
    w, h = 1200, 900
    img = Image.new('RGB', (w, h), (12, 8, 16))
    draw = ImageDraw.Draw(img)
    draw.rectangle([60, 120, w - 60, h - 80], fill=(35, 12, 18), outline=(180, 130, 40), width=6)
    draw.ellipse([w // 2 - 90, h // 2 - 50, w // 2 + 90, h // 2 + 70], fill=(160, 20, 30))
    for i in range(6):
        draw.rectangle([140 + i * 55, h - 170, 175 + i * 55, h - 130], fill=(220, 180, 50))
    save_jpg(img, CAS / 'scene-vip.jpg')

def gen_wheel_face():
    s = 512
    img = Image.new('RGBA', (s, s), (0, 0, 0, 0))
    draw = ImageDraw.Draw(img)
    cx = cy = s // 2
    r = 220
    draw.ellipse([cx - r - 16, cy - r - 16, cx + r + 16, cy + r + 16], fill=(200, 150, 40, 255))
    colors = [(200, 30, 40, 255), (240, 200, 60, 255), (100, 40, 140, 255)] * 3 + [(200, 30, 40, 255), (240, 200, 60, 255)]
    for i in range(8):
        a0, a1 = i * math.pi / 4 - math.pi / 2, (i + 1) * math.pi / 4 - math.pi / 2
        pts = [(cx, cy), (cx + r * math.cos(a0), cy + r * math.sin(a0)), (cx + r * math.cos(a1), cy + r * math.sin(a1))]
        draw.polygon(pts, fill=colors[i])
    draw.ellipse([cx - 24, cy - 24, cx + 24, cy + 24], fill=(255, 240, 180, 255))
    save_png(img, CAS / 'wheel-face.png')

def gen_slot_strip():
    w, h = 128, 512
    img = Image.new('RGBA', (w, h), (0, 0, 0, 0))
    draw = ImageDraw.Draw(img)
    icons = [(220, 170, 40), (200, 30, 40), (180, 120, 40), (255, 80, 80), (240, 200, 60)]
    for i in range(5):
        y = i * (h // 5) + 16
        draw.rounded_rectangle([16, y, w - 16, y + 80], radius=10, fill=icons[i] + (255,))
        draw.ellipse([40, y + 18, 88, y + 66], fill=(255, 255, 255, 180))
    save_png(img, CAS / 'slot-strip.png')

def gen_jiao(yang=True):
    s = 256
    img = Image.new('RGBA', (s, s), (0, 0, 0, 0))
    draw = ImageDraw.Draw(img)
    if yang:
        draw.pieslice([40, 90, 216, 170], 20, 160, fill=(200, 25, 25, 255), outline=(255, 210, 80, 255), width=5)
    else:
        draw.pieslice([40, 70, 216, 190], 200, 340, fill=(170, 20, 20, 255), outline=(255, 210, 80, 255), width=5)
    save_png(img, CAS / ('jiao-yang.png' if yang else 'jiao-yin.png'))

def main():
    # 信眾：以相近角色圖調色衍生（AI 配額滿時的務實補圖）
    if not (BEL / 'mayor.jpg').exists():
        grade_copy(BEL / 'councilor.jpg', BEL / 'mayor.jpg', brightness=1.05, contrast=1.1, saturation=0.9)
    if not (BEL / 'superstar.jpg').exists():
        grade_copy(BEL / 'streamer.jpg', BEL / 'superstar.jpg', brightness=0.95, contrast=1.15, saturation=0.85)

    gen_scene_fortune()
    gen_scene_jiao()
    gen_scene_slot()
    gen_scene_vip()
    gen_wheel_face()
    gen_slot_strip()
    gen_jiao(True)
    gen_jiao(False)
    print('done')

if __name__ == '__main__':
    main()