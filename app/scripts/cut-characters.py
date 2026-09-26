"""Cut every pose out of the owner's character sheet (mom-son.png) onto transparent backgrounds.

Run from anywhere: python app/scripts/cut-characters.py
"""
import os
from collections import deque

import numpy as np
from PIL import Image

HERE = os.path.dirname(os.path.abspath(__file__))
SRC = os.path.join(HERE, "..", "..", "mom-son.png")  # owner-provided character sheet at repo root
OUT = os.path.join(HERE, "..", "assets", "images", "characters") + os.sep
PREVIEW = None  # set to a folder path to also save a contact sheet on the app's cream background

# name: (box in original sheet pixels: left, top, right, bottom), max output size (w, h)
BUST, FULL = (420, 420), (320, 700)
CROPS = {
    # Maa
    "maa-front": ((140, 80, 455, 965), FULL),
    "maa-side": ((615, 85, 910, 960), FULL),
    "maa-three-quarter": ((1030, 85, 1375, 960), FULL),
    "maa-smile": ((95, 1040, 380, 1430), BUST),
    "maa-thinking": ((420, 1045, 670, 1435), BUST),
    "maa-concerned": ((745, 1050, 995, 1430), BUST),
    "maa-cheer": ((1010, 1030, 1440, 1435), BUST),
    # son
    "son-front": ((1550, 255, 1835, 940), FULL),
    "son-side": ((1960, 255, 2225, 930), FULL),
    "son-walking": ((2345, 255, 2705, 940), FULL),
    "son-happy": ((1520, 1040, 1790, 1430), BUST),
    "son-thinking": ((1820, 1045, 2075, 1430), BUST),
    "son-confused": ((2100, 1045, 2380, 1430), BUST),
    "son-jumping": ((2380, 950, 2745, 1500), FULL),
}


def remove_sparkle(sheet: Image.Image) -> Image.Image:
    """Undo the white 4-point sparkle stamped over son-jumping's waist.
    It's white blended at ~31% opacity: original = (seen - 255*a) / (1 - a).
    Which pixels it covers is found by checking which colour, un-blended or as-is, better matches the
    drawing's own palette (sampled from a ring just outside the sparkle). The anti-aliased rim gets
    per-pixel opacity; a 3x3 median then smooths only the repaired patch."""
    from PIL import ImageFilter

    A, (X0, Y0, X1, Y1), (CX, CY), R = 0.31, (2490, 1225, 2670, 1360), (2575, 1290), 62
    img = np.array(sheet.convert("RGB")).astype(float)
    box = img[Y0:Y1, X0:X1]
    h, w = box.shape[:2]
    yy, xx = np.mgrid[0:h, 0:w]
    r = np.hypot(xx + X0 - CX, yy + Y0 - CY)
    pal = np.unique((box[(r > R) & (r < R + 28)] // 6 * 6).astype(int), axis=0).astype(float)

    def palette_dist(c):
        return np.sqrt(((c[:, :, None, :] - pal[None, None]) ** 2).sum(-1).min(-1))

    def unblend(a):
        return (box - 255 * a) / (1 - a)

    cand = unblend(A)
    valid = (cand >= -8).all(-1)
    core = valid & (palette_dist(cand) + 6 < palette_dist(box)) & (r < R)
    m = core.astype(int)
    nb = sum(np.roll(np.roll(m, dy, 0), dx, 1) for dy in (-1, 0, 1) for dx in (-1, 0, 1)) - m
    core = (core | ((nb >= 6) & valid & (r < R))) & ~((nb <= 1) & core)  # fill pinholes, drop specks

    near = core.copy()
    for _ in range(3):
        near |= np.roll(near, 1, 0) | np.roll(near, -1, 0) | np.roll(near, 1, 1) | np.roll(near, -1, 1)
    best_a, best_d = np.zeros((h, w)), np.full((h, w), np.inf)
    for a in np.linspace(0, 0.36, 13):
        c = unblend(a)
        d = palette_dist(c) + 40 * a * ~core  # on the rim, prefer leaving pixels alone
        d[~(c >= -8).all(-1)] = np.inf
        better = d < best_d
        best_d[better], best_a[better] = d[better], a
    best_a[~near] = 0
    best_a[core] = A
    out = np.clip((box - 255 * best_a[..., None]) / (1 - best_a[..., None]), 0, 255)
    med = np.array(Image.fromarray(out.astype(np.uint8)).filter(ImageFilter.MedianFilter(3))).astype(float)
    out[near] = med[near]
    img[Y0:Y1, X0:X1] = out
    return Image.fromarray(img.astype(np.uint8))


def remove_bg(img: Image.Image) -> Image.Image:
    """Flood-fill background connected to the border -> transparent.
    Background = light and low-saturation: white paper plus the soft lavender floor shadows.
    Enclosed light areas (eyes, teeth, sneaker soles) aren't connected to the border, so they stay."""
    a = np.array(img.convert("RGBA"))
    h, w = a.shape[:2]
    rgb = a[:, :, :3].astype(int)
    bg = (rgb.min(axis=2) >= 185) & ((rgb.max(axis=2) - rgb.min(axis=2)) < 60)
    seen = np.zeros((h, w), bool)
    q = deque([(y, x) for x in range(w) for y in (0, h - 1)] + [(y, x) for y in range(h) for x in (0, w - 1)])
    while q:
        y, x = q.popleft()
        if not (0 <= y < h and 0 <= x < w) or seen[y, x] or not bg[y, x]:
            continue
        seen[y, x] = True
        q.extend(((y + 1, x), (y - 1, x), (y, x + 1), (y, x - 1)))
    a[seen, 3] = 0
    # soften the 1px fringe next to removed background (anti-aliased outline pixels)
    edge = np.zeros_like(seen)
    edge[1:, :] |= seen[:-1, :]; edge[:-1, :] |= seen[1:, :]; edge[:, 1:] |= seen[:, :-1]; edge[:, :-1] |= seen[:, 1:]
    fringe = edge & ~seen & (rgb.min(axis=2) > 170)
    a[fringe, 3] = 110
    out = Image.fromarray(a)
    return out.crop(out.getbbox())


os.makedirs(OUT, exist_ok=True)
sheet = remove_sparkle(Image.open(SRC))
print("sheet", sheet.size)
cuts = {}
for name, (box, max_size) in CROPS.items():
    cut = remove_bg(sheet.crop(box))
    cut.thumbnail(max_size)
    cut.save(OUT + name + ".png", optimize=True)
    cuts[name] = cut
    print(f"{name:18} {cut.size}  {os.path.getsize(OUT + name + '.png') // 1024} KB")

# Owner-provided solo images that replace a sheet pose (preferred when present).
SOLO = {"son-jumping": "son-excitement.png"}  # eyes-open excited jump, no watermark
for name, file in SOLO.items():
    path = os.path.join(HERE, "..", "..", file)
    if os.path.exists(path):
        cut = remove_bg(Image.open(path))
        cut.save(OUT + name + ".png", optimize=True)
        cuts[name] = cut
        print(f"{name:18} {cut.size}  from {file}")

if PREVIEW:  # contact sheet on the app's cream background, to eyeball halos and stray shadows
    cell = 240
    grid = Image.new("RGBA", (cell * 7, cell * 2), (250, 238, 218, 255))
    for i, cut in enumerate(cuts.values()):
        c = cut.copy()
        c.thumbnail((cell - 10, cell - 10))
        grid.alpha_composite(c, ((i % 7) * cell + (cell - c.width) // 2, (i // 7) * cell + (cell - c.height) // 2))
    grid.save(os.path.join(PREVIEW, "characters-contact-sheet.png"))
