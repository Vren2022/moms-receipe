"""Cut character busts out of mom-son.png onto transparent backgrounds."""
from collections import deque

import numpy as np
from PIL import Image

SRC = r"C:\experiment\cooking\mom-son.png"
OUT = "C:/experiment/cooking/app/assets/images/characters/"
PREVIEW = "C:/Users/piyus/AppData/Local/Temp/claude/C--experiment-cooking/e790f1b6-b2b0-4481-b4ec-d0dddb78e02d/scratchpad/icons/"

# (name, box in original pixels: left, top, right, bottom) — generous margins, background removed below.
CROPS = {
    "maa-smile": (95, 1040, 380, 1430),
    "son-happy": (1520, 1040, 1790, 1430),
}


def remove_bg(img: Image.Image, thresh=232) -> Image.Image:
    """Flood-fill near-white pixels connected to the border -> transparent. Enclosed whites (eyes, teeth) stay."""
    a = np.array(img.convert("RGBA"))
    h, w = a.shape[:2]
    light = (a[:, :, :3] >= thresh).all(axis=2)
    seen = np.zeros((h, w), bool)
    q = deque([(y, x) for x in range(w) for y in (0, h - 1)] + [(y, x) for y in range(h) for x in (0, w - 1)])
    while q:
        y, x = q.popleft()
        if not (0 <= y < h and 0 <= x < w) or seen[y, x] or not light[y, x]:
            continue
        seen[y, x] = True
        q.extend(((y + 1, x), (y - 1, x), (y, x + 1), (y, x - 1)))
    a[seen, 3] = 0
    # soften the 1px fringe next to removed background (anti-aliased outline pixels)
    edge = np.zeros_like(seen)
    edge[1:, :] |= seen[:-1, :]; edge[:-1, :] |= seen[1:, :]; edge[:, 1:] |= seen[:, :-1]; edge[:, :-1] |= seen[:, 1:]
    fringe = edge & ~seen & (a[:, :, :3].min(axis=2) > 200)
    a[fringe, 3] = 120
    out = Image.fromarray(a)
    return out.crop(out.getbbox())


import os
os.makedirs(OUT, exist_ok=True)
sheet = Image.open(SRC)
print("sheet", sheet.size)
for name, box in CROPS.items():
    cut = remove_bg(sheet.crop(box))
    cut.thumbnail((360, 360))  # plenty for a ~120pt slot at 3x
    cut.save(OUT + name + ".png", optimize=True)
    # preview on the app's cream background to eyeball halos
    bg = Image.new("RGBA", cut.size, (250, 238, 218, 255))
    bg.alpha_composite(cut)
    bg.save(PREVIEW + "preview-" + name + ".png")
    print(name, cut.size, os.path.getsize(OUT + name + ".png"), "bytes")
