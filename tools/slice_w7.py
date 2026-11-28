"""Escudo en fases, trampas nuevas, refuerzos nuevos, formas nuevas y materiales goma/acero."""
import json, os
_d = os.path.dirname(os.path.abspath(__file__))
src = open(_d + '/slice.py').read(); exec(src[:src.index('# ---------- armadillos ----------')])
w5 = open(_d + '/slice_w5.py').read(); exec(w5[w5.index('def gridsheet'):w5.index('W3 = {')])

def common(name, rows, cols, groups, ref=None):
    """Mismo recorte en todas las celdas de cada grupo: los fotogramas quedan alineados y a la misma escala."""
    R = ATLAS[name]; im = Image.open(os.path.join(OUT, name + '.webp')); W, H = im.size
    for g in groups:
        rel = []
        for i in (ref or g):
            r, c = divmod(i, cols); x0, y0 = W * c / cols, H * r / rows; q = R[i]
            if q[2] > 1: rel.append((q[0] - x0, q[1] - y0, q[0] + q[2] - x0, q[1] + q[3] - y0))
        a = min(v[0] for v in rel); b = min(v[1] for v in rel); cx = max(v[2] for v in rel); d = max(v[3] for v in rel)
        for i in g:
            r, c = divmod(i, cols); x0, y0 = W * c / cols, H * r / rows
            R[i] = [int(x0 + a), int(y0 + b), int(cx - a), int(d - b)]

gridsheet('shield', '5c36a3e7-image.png', 2, 3)
common('shield', 2, 3, [[0, 1, 2, 4, 5]], ref=[0])  # todas con el recorte de la esfera entera (el estallido, el suyo)
gridsheet('traps2', 'c0273c79-image.png', 4, 3)
# la base del imán se mete en la fila de los pinchos: se borra esa franja y se recalculan sus recortes
_im = Image.open(os.path.join(OUT, 'traps2.webp')).convert('RGBA'); _a = np.array(_im); _H, _W = _a.shape[:2]; _y = _H // 4
_a[_y:_y + int(_H * 0.045), :, 3] = 0
for _c in range(3):
    _x0, _x1 = _W * _c // 3, _W * (_c + 1) // 3; _m = _a[_y:_H // 2, _x0:_x1, 3] > 40; _ys, _xs = np.where(_m)
    ATLAS['traps2'][3 + _c] = [_x0 + int(_xs.min()), _y + int(_ys.min()), int(_xs.max() - _xs.min() + 1), int(_ys.max() - _ys.min() + 1)]
Image.fromarray(_a, 'RGBA').save(os.path.join(OUT, 'traps2.webp'), 'WEBP', quality=88, method=6)
common('traps2', 4, 3, [[0, 1, 2]], ref=[0, 1])  # imán: sin las ondas, que lo encogían
common('traps2', 4, 3, [range(r * 3, r * 3 + 3) for r in range(1, 4)])
gridsheet('refs2', '05b6d58b-image.png', 2, 4)
gridsheet('blk_new', '80f415cc-image.png', 4, 8)
gridsheet('blk_bandido3', 'f17d3933-image.png', 4, 8)
R = ATLAS['blk_bandido3']; N = list(R); sw = {0: 1, 1: 0, 2: 3, 3: 2}
for r in range(4):
    for c in range(4, 8): N[r * 8 + c] = R[sw[r] * 8 + c]   # la mitad del acero venía con las filas cambiadas
ATLAS['blk_bandido3'] = N
A = json.load(open(os.path.join(OUT, 'atlas.json'))); A.update(ATLAS)
json.dump(A, open(os.path.join(OUT, 'atlas.json'), 'w'))
print({k: len(v) for k, v in ATLAS.items()})

# la hoja de goma/acero no sigue la rejilla de 8 columnas: se detectan las piezas fila a fila
def bandsheet(name, upload, rows, per, scale=0.75):
    rgba = key(Image.open(U + upload)); H, W = rgba.shape[:2]; rects = []
    for r in range(rows):
        y0, y1 = int(H * r / rows), int(H * (r + 1) / rows)
        m = ndimage.binary_closing(rgba[y0:y1, :, 3] > 40, iterations=2)
        lab, n = ndimage.label(m); objs = [(s, int((lab[s] > 0).sum())) for s in ndimage.find_objects(lab)]
        objs = sorted([o for o in objs if o[1] > 1500], key=lambda o: -o[1])[:per]
        objs.sort(key=lambda o: o[0][1].start)
        assert len(objs) == per, (name, r, len(objs))
        for s, a in objs: rects.append([s[1].start, y0 + s[0].start, s[1].stop - s[1].start, s[0].stop - s[0].start])
    im = Image.fromarray(rgba, 'RGBA').resize((int(W * scale), int(H * scale)), Image.LANCZOS)
    im.save(os.path.join(OUT, name + '.webp'), 'WEBP', quality=88, method=6)
    ATLAS[name] = [[int(v * scale) for v in q] for q in rects]

ATLAS.clear()
bandsheet('blk_bandido3', 'f17d3933-image.png', 4, 8)
R = ATLAS['blk_bandido3']; N = list(R)
for r in range(4):
    for c in range(4, 8): N[r * 8 + c] = R[sw[r] * 8 + c]
ATLAS['blk_bandido3'] = N
bandsheet('blk_new', '80f415cc-image.png', 4, 8)
A = json.load(open(os.path.join(OUT, 'atlas.json'))); A.update(ATLAS)
json.dump(A, open(os.path.join(OUT, 'atlas.json'), 'w'))
print('bandas', {k: len(v) for k, v in ATLAS.items()})
