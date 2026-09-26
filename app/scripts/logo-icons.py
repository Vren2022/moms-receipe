# Builds the app icon set from the owner's logo (repo-root app-logo.png).
# Keeps only the heart + Maa/son glyph: everything outside its bounding box
# (incl. the Gemini sparkle watermark, bottom-right) is dropped.
# Run (from repo root): python app/scripts/logo-icons.py [out_dir]   default: app/assets/images
import sys
from pathlib import Path
from PIL import Image, ImageChops, ImageFilter

ROOT = Path(__file__).resolve().parents[2]
OUT = Path(sys.argv[1]) if len(sys.argv) > 1 else ROOT / 'app/assets/images'
OUT.mkdir(parents=True, exist_ok=True)
CREAM = (255, 248, 240)  # theme bg, same as splash

src = Image.open(ROOT / 'app-logo.png').convert('RGB')
w, h = src.size
bg = src.getpixel((10, 10))

# Glyph mask: pixels clearly different from the paper background.
diff = ImageChops.difference(src, Image.new('RGB', src.size, bg)).convert('L')
mask = diff.point(lambda v: 255 if v > 40 else 0)
# Only look in the middle band; the sparkle sits near the right edge.
band = (int(w * 0.2), 0, int(w * 0.8), h)
l, t, r, b = mask.crop(band).getbbox()
box = (band[0] + l, t, band[0] + r, b)

glyph = src.crop(box)
alpha = diff.crop(box).point(lambda v: min(255, v * 4)).filter(ImageFilter.GaussianBlur(0.6))
glyph.putalpha(alpha)
print('glyph box', box)


def compose(size, fill, bgcolor=None, mono=False):
    """Glyph centered on a size x size canvas, taking `fill` of the side."""
    canvas = Image.new('RGBA', (size, size), bgcolor + (255,) if bgcolor else (0, 0, 0, 0))
    g = glyph
    if mono:
        g = Image.new('RGBA', glyph.size, (255, 255, 255, 255))
        g.putalpha(glyph.getchannel('A'))
    s = size * fill / max(g.size)
    g = g.resize((round(g.width * s), round(g.height * s)), Image.LANCZOS)
    canvas.alpha_composite(g, ((size - g.width) // 2, (size - g.height) // 2))
    return canvas


def save(name, im):
    im.save(OUT / name)
    print('wrote', OUT / name, im.size)


save('icon.png', compose(1024, 0.78, CREAM))                      # iOS/Android mask corners
save('android-icon-foreground.png', compose(512, 0.6))           # 66% safe zone
save('android-icon-background.png', Image.new('RGBA', (512, 512), CREAM + (255,)))
save('android-icon-monochrome.png', compose(432, 0.6, mono=True))
save('splash-icon.png', compose(512, 0.95))                      # on cream splash bg
save('favicon.png', compose(48, 0.9, CREAM))
