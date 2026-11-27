"""Reduce las hojas más grandes de lo que se ven en pantalla (ahorra memoria) y ajusta atlas.json."""
import json, os
from PIL import Image
OUT = os.path.join(os.path.dirname(__file__), '..', 'www', 'img')
A = json.load(open(os.path.join(OUT, 'atlas.json')))
F = {'arm_master': .75, 'arm_abil': .75, 'arm2_master': .88, 'arm2_abil': .88, 'arm_skins': .6,
     'deco_japon': .75, 'deco_oeste': .75, 'deco_azteca': .75, 'deco_vikingo': .75, 'deco_nilo': .75, 'deco_pirata': .75,
     'can_japon': .75, 'can_oeste': .75, 'can_azteca': .75, 'can_vikingo': .75, 'can_nilo': .75, 'can_pirata': .75}
for k, f in F.items():
    p = os.path.join(OUT, k + '.webp'); im = Image.open(p); im.load()
    if im.width < 1300 * f: continue  # ya reducida
    im = im.resize((round(im.width * f), round(im.height * f)), Image.LANCZOS); im.save(p, 'WEBP', quality=88, method=6)
    A[k] = [[round(v * f) for v in r] for r in A[k]]; print(k, im.size)
json.dump(A, open(os.path.join(OUT, 'atlas.json'), 'w'))
