import numpy as np, sys
from PIL import Image, ImageDraw, ImageFilter

def clean(img, cx, cy, ang, w, h):
    """Стирає напис на лезі: область w×h (вздовж/поперек леза) з центром (cx,cy), лезо під кутом ang° вниз-вправо."""
    R = int(max(w, h) * 1.2) + 60
    box = (cx - R, cy - R, cx + R, cy + R)
    patch = img.crop(box)
    rot = patch.rotate(ang, resample=Image.BICUBIC)            # лезо стає горизонтальним
    a = np.asarray(rot).astype(np.float32)
    c = R
    x0, x1 = c - w // 2, c + w // 2
    y0, y1 = c - h // 2, c + h // 2
    k = 6
    left = a[y0:y1, x0 - k:x0].mean(axis=1)
    right = a[y0:y1, x1:x1 + k].mean(axis=1)
    t = np.linspace(0, 1, x1 - x0)[None, :, None]
    base = left[:, None, :] * (1 - t) + right[:, None, :] * t
    # текстура шліфованої сталі: беремо сусідню ділянку лівіше, прибираємо її плавну складову
    src = a[y0:y1, x0 - (x1 - x0) - k:x0 - k]
    if src.shape[1] != x1 - x0:
        src = a[y0:y1, x1 + k:x1 + k + (x1 - x0)]
    smooth = np.asarray(Image.fromarray(src.clip(0, 255).astype(np.uint8)).filter(ImageFilter.BoxBlur(6))).astype(np.float32)
    tex = (src - smooth) * 0.8
    a[y0:y1, x0:x1] = (base + tex).clip(0, 255)
    rot2 = Image.fromarray(a.astype(np.uint8)).rotate(-ang, resample=Image.BICUBIC)
    m = Image.new('L', rot.size, 0)
    ImageDraw.Draw(m).rectangle((x0 + 3, y0 + 2, x1 - 3, y1 - 2), fill=255)
    m = m.filter(ImageFilter.GaussianBlur(3)).rotate(-ang, resample=Image.BICUBIC)
    out = img.copy()
    out.paste(rot2, box[:2], m)
    return out

if __name__ == '__main__':
    src, dst, cx, cy, ang, w, h = sys.argv[1], sys.argv[2], *map(int, sys.argv[3:8])
    im = Image.open(src).convert('RGB')
    clean(im, cx, cy, ang, w, h).save(dst, quality=95)
