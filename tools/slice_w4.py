import json
src = open(__file__.replace('slice_w4.py', 'slice.py')).read()
exec(src[:src.index('# ---------- armadillos ----------')])
for k, up in {'arm2_anim0': 'd56fe754', 'arm2_anim1': 'd9501af4', 'arm2_anim2': '3f887ab7'}.items(): sheet(k, up + '-image.png', 3, 8, scale=0.75)
A = json.load(open(os.path.join(OUT, 'atlas.json'))); A.update(ATLAS); json.dump(A, open(os.path.join(OUT, 'atlas.json'), 'w'))
print({k: len(v) for k, v in ATLAS.items()})
