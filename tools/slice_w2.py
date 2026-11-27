"""Mundos 7-12 y mapa 2 (lote de mapas nuevos)."""
src = open(__file__.replace('slice_w2.py', 'slice.py')).read()
exec(src[:src.index('# ---------- armadillos ----------')])
W2 = {7: ('653edc7a', '9bad29ac'), 8: ('9fcde2c6', '7c9f8ec1'), 9: ('513c8e5f', 'd7038ac8'),
      10: ('70d98b3f', 'ae3438e2'), 11: ('ddc1472f', '5226dd11'), 12: ('4bc8b3bf', '01f9978d')}
for w, (far, nr) in W2.items():
    bg(f'bg_w{w}', far + '-image.png'); near(f'bg_w{w}', nr + '-image.png')
bg('map2', '10c5671d-image.png')
print('ok')
