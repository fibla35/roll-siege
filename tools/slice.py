"""Recorta las hojas de GPT: quita el verde, detecta cada sprite y genera hojas webp + atlas.json."""
import json, os, sys
import numpy as np
from PIL import Image
from scipy import ndimage

U = '/mnt/user-data/uploads/'
OUT = os.path.join(os.path.dirname(__file__), '..', 'www', 'img')
os.makedirs(OUT, exist_ok=True)

def key(img):
    a = np.array(img.convert('RGB')).astype(np.float32)
    r, g, b = a[..., 0], a[..., 1], a[..., 2]
    d = np.sqrt(r**2 + (255 - g)**2 + b**2)
    alpha = np.clip((d - 70) / 70, 0, 1)
    # quitar el reflejo verde de los bordes
    spill = (alpha < 1) | (g > np.maximum(r, b) + 40) & (d < 200)
    g2 = np.where(spill, np.minimum(g, np.maximum(r, b) * 1.05), g)
    out = np.dstack([r, g2, b, alpha * 255]).astype(np.uint8)
    return out

def bands(mask, axis, expected, min_gap=6):
    proj = mask.any(axis=axis)
    segs, inside = [], False
    for i, v in enumerate(proj):
        if v and not inside: start, inside = i, True
        if not v and inside: segs.append([start, i]); inside = False
    if inside: segs.append([start, len(proj)])
    segs = [s for s in segs if s[1] - s[0] > 4]
    while len(segs) > expected:  # unir los trozos con menos hueco entre ellos
        gaps = [segs[i+1][0] - segs[i][1] for i in range(len(segs) - 1)]
        i = int(np.argmin(gaps)); segs[i] = [segs[i][0], segs[i+1][1]]; del segs[i+1]
    if len(segs) < expected:  # reparto uniforme si se tocan
        n = len(proj); segs = [[int(n*k/expected), int(n*(k+1)/expected)] for k in range(expected)]
    return segs

def grid_rects(rgba, rows, cols, per_row_cols=None):
    m = rgba[..., 3] > 40
    m = ndimage.binary_opening(m, iterations=1)
    rects = []
    for r0, r1 in bands(m, 1, rows):
        sub = m[r0:r1]
        nc = cols if per_row_cols is None else per_row_cols.pop(0)
        for c0, c1 in bands(sub, 0, nc):
            cell = sub[:, c0:c1]
            ys = np.where(cell.any(axis=1))[0]
            if len(ys) == 0: rects.append([c0, r0, 1, 1]); continue
            rects.append([int(c0), int(r0 + ys[0]), int(c1 - c0), int(ys[-1] - ys[0] + 1)])
    return rects

ATLAS = {}
def sheet(name, upload, rows, cols, per_row_cols=None, scale=1.0):
    img = Image.open(U + upload)
    rgba = key(img)
    rects = grid_rects(rgba, rows, cols, list(per_row_cols) if per_row_cols else None)
    im = Image.fromarray(rgba, 'RGBA')
    if scale != 1.0:
        im = im.resize((int(im.width*scale), int(im.height*scale)), Image.LANCZOS)
        rects = [[int(v*scale) for v in r] for r in rects]
    im.save(os.path.join(OUT, name + '.webp'), 'WEBP', quality=88, method=6)
    ATLAS[name] = rects
    return rects

def bg(name, upload, w=1600):
    im = Image.open(U + upload).convert('RGB'); im = im.resize((w, int(im.height * w / im.width)), Image.LANCZOS)
    im.save(os.path.join(OUT, name + '.webp'), 'WEBP', quality=84, method=6)

def near(name, upload):
    """Primer plano: franja de capa media y franja de suelo, separadas por verde."""
    rgba = key(Image.open(U + upload)); m = rgba[..., 3] > 40
    rows = m.mean(axis=1)
    segs = bands(rows[:, None] > 0.02, 1, 2)
    mid, ground = segs[0], segs[1]
    ys = rgba[mid[0]:mid[1]]; gs = rgba[ground[0]:ground[1]]
    Image.fromarray(ys, 'RGBA').save(os.path.join(OUT, name + '_mid.webp'), 'WEBP', quality=86, method=6)
    Image.fromarray(gs, 'RGBA').save(os.path.join(OUT, name + '_ground.webp'), 'WEBP', quality=86, method=6)

def single(name, upload, scale=1.0):
    rgba = key(Image.open(U + upload)); im = Image.fromarray(rgba, 'RGBA')
    bb = im.getbbox(); im = im.crop(bb)
    if scale != 1: im = im.resize((int(im.width*scale), int(im.height*scale)), Image.LANCZOS)
    im.save(os.path.join(OUT, name + '.webp'), 'WEBP', quality=88, method=6)

# ---------- armadillos ----------
sheet('arm_master', '020f8149-image.png', 4, 6)          # filas 1-2 de pie, 3-4 bola
for i, up in enumerate(['67d8a151-image.png', 'd8442aec-image.png', 'fb5845bd-image.png', '5637feca-image.png']):
    sheet(f'arm_anim{i}', up, 3, 8)                       # 3 armadillos x 8 fotogramas
sheet('arm_abil', '0154bfae-image.png', 4, 6)            # filas 1-2 habilidades, 3-4 retratos
sheet('arm_skins', '9a955cd3-image.png', 3, 4)
# ---------- bloques (8 col x 4 filas: izq material A, der material B) ----------
BLOCKS = {
 'bandido': ['549c60f1-image.png', 'a62d4631-image.png', '6eadb9d4-image.png'],
 'japon': ['413c578f-image.png', '7885ca20-image.png', 'e0083a41-image.png'],
 'oeste': ['68ee8bce-image.png', 'dcf7ae92-image.png', 'f9fe7c26-image.png'],
 'azteca': ['4eac7464-image.png', 'f7fc9e29-image.png', '9adfbd29-image.png'],
}
for st, ups in BLOCKS.items():
    for k, up in enumerate(ups):
        sheet(f'blk_{st}{k}', up, 4, 8)
sheet('items', 'b347e025-image.png', 4, 6)               # especiales, gemas, escombros
sheet('traps', 'cc88ce7b-image.png', 4, 7, per_row_cols=[7, 7, 8, 6])
sheet('fx', '49a2a688-image.png', 4, 8)
sheet('pow', '0e8d144b-image.png', 4, 6)
for st, up in (('japon', 'a0719244-image.png'), ('oeste', '704083f6-image.png'), ('azteca', 'f4ec8815-image.png')):
    sheet(f'can_{st}', up, 3, 4)
for st, up, last in (('japon', '507701f9-image.png', 6), ('oeste', '7b02ed7b-image.png', 8), ('azteca', 'ebe07687-image.png', 8)):
    sheet(f'deco_{st}', up, 4, 6, per_row_cols=[6, 6, 6, last])
sheet('ui_btn', '107e5b1f-image.png', 4, 6)
sheet('ui_pan', 'bcc0d7c8-image.png', 4, 6)
sheet('ui_txt', '356d9e57-image.png', 4, 2)
sheet('clouds', '82035c96-image.png', 3, 4)
# ---------- fondos ----------
FONDOS = {'w1': ('d5f7acc8-image.png', 'f4cb806f-image.png'), 'w2': ('424cbbdd-image.png', 'ff5cc25d-image.png'),
          'w3': ('29b8481f-image.png', 'c7ebe012-image.png'), 'w4': ('5bc4e180-image.png', '3c1bea35-image.png'),
          'w5': ('3e8bdc8c-image.png', '3b0d55e2-image.png'), 'w6': ('5b6b3f5f-image.png', 'c1aca139-image.png'),
          'japon': ('6e38156a-image.png', 'cd6b7914-image.png'), 'oeste': ('b2f44f60-image.png', '8d4dbd47-image.png'),
          'azteca': ('f26af49c-image.png', '51ccf763-image.png')}
for k, (far, nr) in FONDOS.items():
    bg(f'bg_{k}', far); near(f'bg_{k}', nr)
bg('title', '5b69bb37-image.png'); bg('map', '72629f55-image.png')
sheet('logo', '76da04a1-image.png', 2, 1)
# icono: opción 1 (cuadrante superior izquierdo)
ic = Image.open(U + '008772ae-image.png').convert('RGB'); w, h = ic.size
ic.crop((0, 0, w//2, h//2)).resize((512, 512), Image.LANCZOS).save(os.path.join(OUT, 'icon.png'))
json.dump(ATLAS, open(os.path.join(OUT, 'atlas.json'), 'w'))
print({k: len(v) for k, v in ATLAS.items()})
