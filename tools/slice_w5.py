"""Mares Bandidos (13-18), eventos Halloween/Navidad y clanes Vikingo/Nilo."""
import json
src = open(__file__.replace('slice_w5.py', 'slice.py')).read()
exec(src[:src.index('# ---------- armadillos ----------')])

def gridsheet(name, upload, rows, cols, scale=0.75, inset=6):
    """Corte uniforme (las hojas con rejilla rompen la detección automática)."""
    rgba = key(Image.open(U + upload)); H, W = rgba.shape[:2]
    rects = []
    for r in range(rows):
        for c in range(cols):
            x0, x1 = int(W * c / cols), int(W * (c + 1) / cols); y0, y1 = int(H * r / rows), int(H * (r + 1) / rows)
            rgba[y0:y0 + inset, x0:x1, 3] = 0; rgba[y1 - inset:y1, x0:x1, 3] = 0
            rgba[y0:y1, x0:x0 + inset, 3] = 0; rgba[y0:y1, x1 - inset:x1, 3] = 0
            m = ndimage.binary_opening(rgba[y0:y1, x0:x1, 3] > 40, iterations=1)
            ys, xs = np.where(m)
            if len(ys) == 0: rects.append([x0, y0, 1, 1]); continue
            rects.append([x0 + int(xs.min()), y0 + int(ys.min()), int(xs.max() - xs.min() + 1), int(ys.max() - ys.min() + 1)])
    im = Image.fromarray(rgba, 'RGBA')
    if scale != 1.0:
        im = im.resize((int(im.width * scale), int(im.height * scale)), Image.LANCZOS)
        rects = [[int(v * scale) for v in r] for r in rects]
    im.save(os.path.join(OUT, name + '.webp'), 'WEBP', quality=88, method=6)
    ATLAS[name] = rects

W3 = {13: ('da4b29fe', '2d70410c'), 14: ('3e434863', '298dc8c1'), 15: ('c80fd96f', '27549ed6'),
      16: ('e862e437', 'eda87cf3'), 17: ('5b2f62ef', '2b9d0a8f'), 18: ('0c686989', 'a9778cef')}
for w, (far, nr) in W3.items():
    bg(f'bg_w{w}', far + '-image.png'); near(f'bg_w{w}', nr + '-image.png')
bg('map3', '8e779041-image.png')
for k, (far, nr) in {'hal': ('420b8e0d', 'f01de988'), 'nav': ('8347310f', 'dcd70d6b'),
                     'vikingo': ('a2479bb3', '8cce43a2'), 'pirata': ('7df2e452', 'fe365b9c'), 'nilo': ('03f5db21', '8f205857')}.items():
    bg(f'bg_{k}', far + '-image.png'); near(f'bg_{k}', nr + '-image.png')
for k, up in {'rac7': '59919ee8', 'rac8': '28050d92', 'rac9': 'a111242d', 'rac10': '71b39612',
              'boss5': '5c33aab9', 'boss6': 'bae0d460'}.items():
    gridsheet(k, up + '-image.png', 3, 8)
gridsheet('arm_skins_hal', '386a7678-image.png', 3, 4, 0.6)
gridsheet('arm_skins_nav', 'ff567696-image.png', 3, 4, 0.6)
for k, up in (('rob', 'e9ae727f'), ('dep', 'f158cfd6'), ('mit', '6fbb0fbc')):
    gridsheet('arm_skins_' + k, up + '-image.png', 3, 4, 0.6)
gridsheet('deco_hal', '48b5cbec-image.png', 2, 6, 0.6)
gridsheet('deco_nav', '3b63d8ed-image.png', 2, 6, 0.6)
for st, ups in {'vikingo': ['b67ed968', 'fa22828f', '64a2a535'], 'nilo': ['9adf79b0', 'fcb7bc54', '18459bba'], 'pirata': ['b84dd51b', 'd4b4812c', '3ed56b51']}.items():
    for k, up in enumerate(ups): sheet(f'blk_{st}{k}', up + '-image.png', 4, 8)
gridsheet('can_vikingo', 'e2941627-image.png', 3, 4, 1.0)
gridsheet('can_nilo', '1a512fa7-image.png', 3, 4, 1.0)
gridsheet('can_pirata', '0dd508a8-image.png', 3, 4, 1.0)
sheet('deco_vikingo', '4555acd8-image.png', 4, 6, per_row_cols=[6, 6, 6, 8])
sheet('deco_nilo', 'c20baf69-image.png', 4, 6, per_row_cols=[6, 6, 6, 8])
sheet('deco_pirata', 'f328f194-image.png', 4, 6, per_row_cols=[6, 6, 6, 8])
A = json.load(open(os.path.join(OUT, 'atlas.json'))); A.update(ATLAS)
json.dump(A, open(os.path.join(OUT, 'atlas.json'), 'w'))
print({k: len(v) for k, v in ATLAS.items()})
