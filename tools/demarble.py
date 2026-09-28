"""Приглушує мармур (білі прожилки всередині м'яса), не чіпаючи жировий край і фон.
python3 tools/demarble.py вхід.webp вихід.webp 0.5   — 0.5 = прибрати ~половину мармуру"""
import sys
import numpy as np
from PIL import Image, ImageFilter

def demarble(im, k=0.5):
    a = np.asarray(im.convert('RGB')).astype(np.float32)
    R, G, B = a[..., 0], a[..., 1], a[..., 2]
    lum = 0.3 * R + 0.59 * G + 0.11 * B
    red = (R > G + 45) & (R > 70)                                  # червоне м'ясо
    # «тіло» м'яса: закриваємо червону маску — прожилки всередині потрапляють усередину, товстий жировий край — ні
    m = Image.fromarray((red * 255).astype(np.uint8))
    body = np.asarray(m.filter(ImageFilter.MaxFilter(13)).filter(ImageFilter.MinFilter(13))) > 127
    body = np.asarray(Image.fromarray((body * 255).astype(np.uint8)).filter(ImageFilter.MinFilter(9))) > 127
    fatness = np.clip((lum - 110) / 70, 0, 1) * np.clip(1 - (R - G - 30) / 60, 0, 1)   # світле й не червоне
    fat = fatness * body
    # колір навколишнього м'яса: нормалізоване розмиття лише по червоних пікселях
    w = red.astype(np.float32)
    def box(x, r):
        c = np.cumsum(np.pad(x, ((r + 1, r), (0, 0)), mode='edge'), 0); x = c[2 * r + 1:] - c[:-2 * r - 1]
        c = np.cumsum(np.pad(x, ((0, 0), (r + 1, r)), mode='edge'), 1); return c[:, 2 * r + 1:] - c[:, :-2 * r - 1]
    def blur(x, r=6): return box(box(box(x, r), r), r)            # ≈ гаусове розмиття
    fill = np.stack([blur(a[..., c] * w) for c in range(3)], -1) / (blur(w)[..., None] + 1e-3)
    alpha = (fat * k)[..., None]
    out = a * (1 - alpha) + fill * alpha
    return Image.fromarray(out.clip(0, 255).astype(np.uint8))

if __name__ == '__main__':
    demarble(Image.open(sys.argv[1]), float(sys.argv[3]) if len(sys.argv) > 3 else 0.5).save(sys.argv[2], quality=92)
