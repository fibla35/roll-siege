"""Mapaches, jefes, objetos de asedio y armadillos nuevos."""
import json
src = open(__file__.replace('slice_w3.py', 'slice.py')).read()
exec(src[:src.index('# ---------- armadillos ----------')])
S = {
 'rac1': '37e78a1d', 'rac2': '4a097c8a', 'rac3': 'cf3d3d6d', 'rac4': '7d4c5adb', 'rac5': '707f59e6', 'rac6': 'd444880c',
 'boss1': '1386c7df', 'boss2': '3423d85b', 'boss3': '3e5e1273', 'boss4': '67a882b6',
}
for k, up in S.items(): sheet(k, up + '-image.png', 3, 8, scale=0.75)
sheet('siege', '09c48562-image.png', 4, 6, scale=0.75)
sheet('arm2_master', '7099af3b-image.png', 4, 6, scale=0.85)
sheet('arm2_abil', 'bb0fad25-image.png', 4, 6, scale=0.85)
sheet('arm2_anim3', '0a552dd4-image.png', 3, 8, scale=0.75)
A = json.load(open(os.path.join(OUT, 'atlas.json'))); A.update(ATLAS)
json.dump(A, open(os.path.join(OUT, 'atlas.json'), 'w'))
# retratos de los armadillos nuevos para la interfaz (por12..por23)
im = Image.open(os.path.join(OUT, 'arm2_abil.webp'))
for i in range(12):
    r = ATLAS['arm2_abil'][12 + i]; c = im.crop((r[0], r[1], r[0] + r[2], r[1] + r[3])); c.thumbnail((160, 160))
    c.save(os.path.join(OUT, 'ui', f'por{12 + i}.webp'), 'WEBP', quality=88)
print({k: len(v) for k, v in ATLAS.items()})
