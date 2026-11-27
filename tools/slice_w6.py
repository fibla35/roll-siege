"""Ruleta por piezas, iconos de premios/eventos y jefes de evento."""
import json
_d = os.path.dirname(os.path.abspath(__file__)) if 'os' in dir() else __import__('os').path.dirname(__import__('os').path.abspath(__file__))
src = open(_d + '/slice.py').read(); exec(src[:src.index('# ---------- armadillos ----------')])
w5 = open(_d + '/slice_w5.py').read(); exec(w5[w5.index('def gridsheet'):w5.index('W3 = {')])
UI = os.path.join(OUT, 'ui')
# ruleta: 4 piezas sueltas (disco, flecha, botón, cinta)
rgba = key(Image.open(U + '7bced972-image.png')); m = rgba[..., 3] > 40
lab, n = ndimage.label(ndimage.binary_closing(m, iterations=3))
objs = sorted([(s, (s[0].stop - s[0].start) * (s[1].stop - s[1].start)) for s in ndimage.find_objects(lab)], key=lambda o: -o[1])[:4]
im = Image.fromarray(rgba, 'RGBA'); pieces = {}
for s, a in objs:
    cx, cy = (s[1].start + s[1].stop) / 2, (s[0].start + s[0].stop) / 2
    pieces[(cx, cy)] = im.crop((s[1].start, s[0].start, s[1].stop, s[0].stop))
ks = sorted(pieces, key=lambda p: (p[0] > 900, p[1]))
names = ['wheel_disc', 'wheel_ptr', 'wheel_btn', 'ribbon2']
for nm, k in zip(names, ks):
    c = pieces[k]
    if nm == 'wheel_disc': c = c.resize((720, int(720 * c.height / c.width)), Image.LANCZOS)
    else: c.thumbnail((360, 360))
    c.save(os.path.join(UI, nm + '.webp'), 'WEBP', quality=90); print(nm, c.size)
# iconos
ICO = ['ico_bag', 'ico_coins', 'ico_cards', 'ico_chest', 'ico_aim', 'ico_power', 'ico_extra', 'ico_gem', 'ico_events', 'ico_hal', 'ico_nav', 'ico_skin']
rgba = key(Image.open(U + 'd100abee-image.png')); H, W = rgba.shape[:2]; im = Image.fromarray(rgba, 'RGBA')
for i, nm in enumerate(ICO):
    r, c = divmod(i, 6); cell = im.crop((int(W * c / 6), int(H * r / 2), int(W * (c + 1) / 6), int(H * (r + 1) / 2)))
    cell = cell.crop(cell.getbbox()); cell.thumbnail((160, 160)); cell.save(os.path.join(UI, nm + '.webp'), 'WEBP', quality=90)
gridsheet('boss7', '2934e8e7-image.png', 3, 8)
A = json.load(open(os.path.join(OUT, 'atlas.json'))); A.update(ATLAS)
json.dump(A, open(os.path.join(OUT, 'atlas.json'), 'w'))
print({k: len(v) for k, v in ATLAS.items()})
