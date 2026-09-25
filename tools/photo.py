"""Готує фото товару для сайту.
Запуск:  python3 tools/photo.py "шлях/до/фото.jpg" bavette
Створює images/bavette.webp (1200px), images/bavette-600.webp і images/thumb/bavette.webp (кругла мініатюра).
Потім у js/products.js у товару:  photo: 'images/bavette.webp'
"""
import sys
from PIL import Image

src, slug = sys.argv[1], sys.argv[2]
im = Image.open(src).convert('RGB')

def save(img, path, w):
    if img.width > w:
        img = img.resize((w, round(img.height * w / img.width)), Image.LANCZOS)
    img.save(path, 'WEBP', quality=80, method=6)
    print('→', path)

save(im, f'images/{slug}.webp', 1200)
save(im, f'images/{slug}-600.webp', 600)
s = min(im.size)
sq = im.crop(((im.width - s) // 2, (im.height - s) // 2, (im.width + s) // 2, (im.height + s) // 2))
sq = sq.crop((int(s * .12), int(s * .12), int(s * .88), int(s * .88)))
save(sq, f'images/thumb/{slug}.webp', 160)
