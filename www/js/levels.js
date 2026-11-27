// Generador de niveles de la campaña y de fortalezas rivales (deterministas por semilla).
var RS = typeof RS !== 'undefined' ? RS : require('./data.js');
(function (RS) {
  function rng(seed) { var s = seed >>> 0 || 1; return function () { s ^= s << 13; s >>>= 0; s ^= s >> 17; s ^= s << 5; s >>>= 0; return (s % 100000) / 100000; }; }
  RS.rng = rng;

  function Builder(R, palette, strong) {
    this.R = R; this.pal = palette; this.strong = strong; this.pieces = []; this.gems = [];
  }
  Builder.prototype.mat = function (core) {
    var p = this.pal; var m = p[Math.floor(this.R() * p.length)];
    if (core && this.strong.length && this.R() < 0.55) m = this.strong[Math.floor(this.R() * this.strong.length)];
    return m;
  };
  Builder.prototype.add = function (shape, x, y, m, rot, flip) { this.pieces.push({ s: RS.SHAPE_IDX[shape], m: m, x: x, y: y, rot: rot || 0, flip: !!flip }); };
  Builder.prototype.gem = function (x, y) { this.gems.push({ x: x, y: y + 0.33, c: this.gems.length % 6 }); };

  // torre: pilares (bloque vertical) + forjado (tablón), varios pisos
  Builder.prototype.tower = function (x0, floors, y) {
    y = y || 0; var mp = this.mat(true), ms = this.mat(false);
    for (var f = 0; f < floors; f++) {
      this.add('bloque', x0 + 0.5, y + 1, mp, 1); this.add('bloque', x0 + 3.5, y + 1, mp, 1);
      if (f === 0 || this.R() < 0.6) this.gem(x0 + 2, y);
      this.add('tablon', x0 + 2, y + 2.25, ms); y += 2.5;
      if (this.R() < 0.4) { mp = this.mat(true); ms = this.mat(false); }
    }
    var top = this.R();
    if (top < 0.4) this.add('tejado', x0 + 2, y + 0.5, this.mat(false));
    else if (top < 0.7) { this.add('cubo', x0 + 0.5, y + 0.5, this.mat(false)); this.add('cubo', x0 + 3.5, y + 0.5, this.mat(false)); this.add('tri', x0 + 0.5, y + 1.5, this.mat(false)); this.add('tri', x0 + 3.5, y + 1.5, this.mat(false), 0, true); }
    else this.add('arco', x0 + 2, y + 0.5, this.mat(false));
    return 4;
  };
  // casa: muros de cubos + tablón + tejado
  Builder.prototype.house = function (x0, h) {
    var mw = this.mat(true);
    for (var k = 0; k < h; k++) { this.add('cubo', x0 + 0.5, k + 0.5, mw); this.add('cubo', x0 + 2.5, k + 0.5, mw); }
    this.gem(x0 + 1.5, 0);
    this.add('tablon', x0 + 1.5, h + 0.25, this.mat(false));
    this.add('tejado', x0 + 1.5, h + 1, this.mat(false));
    return 3;
  };
  Builder.prototype.wall = function (x0, h) {
    var m = this.mat(true);
    for (var k = 0; k < h; k++) this.add('cubo', x0 + 0.5, k + 0.5, m);
    if (this.R() < 0.5) this.add('tri', x0 + 0.5, h + 0.5, this.mat(false));
    return 1;
  };
  Builder.prototype.pyramid = function (x0, n) {
    var m = this.mat(true);
    for (var r = 0; r < n; r++) for (var c = 0; c < n - r; c++) this.add('cubo', x0 + r * 0.5 + c + 0.5, r + 0.5, m);
    this.gem(x0 + n / 2, n);
    return n;
  };
  Builder.prototype.bridge = function (x0) {
    var m = this.mat(false);
    this.add('arco', x0 + 1, 0.5, m); this.add('arco', x0 + 3, 0.5, m);
    this.add('tablon', x0 + 2, 1.25, this.mat(true));
    this.gem(x0 + 2, 1.5);
    return 4;
  };
  Builder.prototype.bigTower = function (x0, floors) {
    // torre ancha: viga de 6 sobre cubos
    var m = this.mat(true), y = 0;
    for (var f = 0; f < floors; f++) {
      for (var k = 0; k < 2; k++) { this.add('cubo', x0 + 0.5, y + k + 0.5, m); this.add('cubo', x0 + 5.5, y + k + 0.5, m); }
      this.add('bloque', x0 + 3, y + 0.5, this.mat(false));
      this.gem(x0 + 3, y + 1);
      this.add('viga', x0 + 3, y + 2.25, this.mat(false)); y += 2.5;
    }
    this.add('tejado', x0 + 2, y + 0.5, this.mat(false)); this.add('tejado', x0 + 4, y + 0.5, this.mat(false));
    return 6;
  };

  // variantes revisadas con tests/find_variant.js (la generada por defecto no era ganable)
  RS.LEVEL_FIX = { '4-5': 1, '4-16': 1, '7-2': 1, '9-6': 1, '9-20': 1, '12-10': 1, '12-17': 1, '12-19': 1, '14-6': 1, '14-12': 1, '15-11': 1, '16-10': 1, '18-9': 2, '18-20': 1 };
  RS.makeLevel = function (w, n, variant) {
    if (variant === undefined && RS.LEVEL_FIX[w + '-' + n]) variant = RS.LEVEL_FIX[w + '-' + n];
    var W = RS.WORLDS[w - 1], R = rng(w * 1000 + n * 37 + (variant || 0) * 7919);
    var strong = W.mats.filter(function (m) { return RS.MATS[m].hp >= 130; });
    var B = new Builder(R, W.mats, strong);
    var boss = n === RS.LEVELS_PER_WORLD;
    var mods = Math.min(4, 1 + Math.floor(n / 6) + (w > 2 ? 1 : 0));
    var floors = Math.min(3, 1 + Math.floor(n / 8) + (w >= 4 ? 1 : 0));
    var x = 17 + Math.floor(R() * 3), R2 = rng(w * 7777 + n * 131 + 3), trapsLeft = Math.min(2, Math.floor((w - 2) / 2) + (n > 12 ? 1 : 0));
    var TRAPS_W = ['escudo', 'muelle', 'ventilador', 'torreta'];
    if (boss) {
      x += B.wall(x, 2) + 1.5; x += B.bigTower(x, Math.min(3, 2 + Math.floor(w / 3))) + 1.5; x += B.tower(x, Math.min(3, floors + 1)) + 1;
    } else {
      var kinds = ['tower', 'house', 'wall', 'pyramid', 'bridge', 'bigTower'];
      for (var i = 0; i < mods; i++) {
        var k = i === 0 ? (R() < 0.5 ? 'house' : 'tower') : kinds[Math.floor(R() * (w >= 2 ? 6 : 5))];
        if (k === 'tower') x += B.tower(x, Math.max(1, floors - (R() < 0.3 ? 1 : 0)));
        else if (k === 'house') x += B.house(x, 1 + Math.floor(R() * 2) + (n > 10 ? 1 : 0));
        else if (k === 'wall') x += B.wall(x, 2 + Math.floor(R() * 2));
        else if (k === 'pyramid') x += B.pyramid(x, 2 + Math.floor(R() * 2));
        else if (k === 'bridge') x += B.bridge(x);
        else x += B.bigTower(x, Math.max(1, floors - 1));
        var gap = 1.5 + Math.floor(R() * 2);
        // en los huecos: barriles/TNT (ayudan) y trampas de los mapaches (más adelante)
        var r2 = R2();
        if (i < mods - 1 || gap >= 2) {
          if (r2 < 0.22 + w * 0.02) B.add(r2 < 0.08 + w * 0.02 && w >= 2 ? 'tnt' : 'barril', x + gap / 2, 0.5, 0);
          else if (w >= 3 && r2 < 0.22 + w * 0.06 && trapsLeft > 0) { trapsLeft--; B.add(TRAPS_W[Math.floor(R2() * Math.min(TRAPS_W.length, w - 2))], x + gap / 2, 0.5, 3); }
        }
        x += gap;
      }
    }


    if (!B.gems.length) B.gem(x - 3, 0);
    // ---- mapaches: ocupan los huecos donde iban las gemas; quedan 1-2 gemas de premio ----
    var R3 = rng(w * 4211 + n * 97 + (variant || 0) * 13), spots = B.gems.slice(), racs = [], cages = [];
    for (var si = spots.length - 1; si > 0; si--) { var sj = Math.floor(R3() * (si + 1)), tmp = spots[si]; spots[si] = spots[sj]; spots[sj] = tmp; }
    var pool = RS.RACS.map(function (r, i) { return i; }).filter(function (i) { var r = RS.RACS[i]; return r.world <= w && (w < 13 || r.sea || (r.id === 'pirata' && n % 3 === 0)); });
    var nRac = Math.min(spots.length, Math.max(1, Math.min(6, 1 + Math.floor(n / 4) + (w >= 4 ? 1 : 0))));
    var cageAt = (n % 4 === 3 && spots.length > nRac) ? 1 : 0;
    function spaceAbove(px, fy) {
      var top = 99; B.pieces.forEach(function (q) { var a = RS.pieceAABB(q); if (px > a.x0 + 0.05 && px < a.x1 - 0.05 && a.y0 >= fy - 0.01 && a.y0 < top) top = a.y0; });
      var side = 9; B.pieces.forEach(function (q) { var a = RS.pieceAABB(q); if (a.y1 > fy + 0.05 && a.y0 < fy + 0.9) { if (a.x1 <= px + 0.01) side = Math.min(side, (px - a.x1) * 2); else if (a.x0 >= px - 0.01) side = Math.min(side, (a.x0 - px) * 2); } });
      return { h: top - fy, w: side };
    }
    var used = 0;
    spots.forEach(function (g, k) {
      var fy = g.y - 0.33, sp = spaceAbove(g.x, fy);
      if (used < nRac) {
        var fits = pool.filter(function (i) { var r = RS.RACS[i]; return r.h < sp.h - 0.06 && r.w < sp.w - 0.04; });
        if (!fits.length) return;
        // los básicos salen más; los especiales del mundo actual, de vez en cuando
        var t = fits[Math.floor(R3() * fits.length)]; if (R3() < 0.45) t = fits.filter(function (i) { return i <= 2; })[0] !== undefined ? fits.filter(function (i) { return i <= 2; })[Math.floor(R3() * fits.filter(function (i) { return i <= 2; }).length)] : t;
        racs.push({ x: g.x, y: fy, t: t }); g.used = true; used++;
      } else if (cageAt && sp.h > 1.06 && sp.w > 1.05) {
        cageAt = 0; g.used = true;
        var avail0 = RS.ARMS.map(function (a, i) { return i; }).filter(function (i) { return RS.ARMS[i].world <= w && RS.ARMS[i].rare < 3; });
        B.pieces.push({ s: RS.SHAPE_IDX.jaula, m: 0, x: g.x, y: fy + 0.5, rot: 0, arm: avail0[Math.floor(R3() * avail0.length)] });
      }
    });
    B.gems = B.gems.filter(function (g) { return !g.used; });
    if (boss) racs.push({ x: x + 0.2, y: 0, t: 0, boss: true, w: w, name: RS.BOSSES[RS.bossIdx(w)].name });
    if (!racs.length && B.gems.length) { var g0 = B.gems.shift(); racs.push({ x: g0.x, y: g0.y - 0.33, t: 0 }); }
    // demasiadas gemas: como mucho 2 de premio (3 en el jefe)
    var maxG = boss ? 3 : 2;
    while (B.gems.length > maxG) B.gems.splice(Math.floor(R() * B.gems.length), 1);
    B.gems.forEach(function (g, i) { g.c = (W.gemFrom + i) % 6; });
    // armadillos disponibles en este mundo
    var avail = RS.ARMS.map(function (a, i) { return i; }).filter(function (i) { return RS.ARMS[i].world <= w && RS.ARMS[i].rare < 3; });
    var count = Math.max(3, Math.min(6, 2 + mods + (boss ? 2 : 0))) + (boss && w >= 9 ? 1 : 0);
    var arms = [0];
    var pool = avail.slice(1); while (arms.length < count) { if (!pool.length) pool = avail.slice(); arms.push(pool.splice(Math.floor(R() * pool.length), 1)[0]); }
    var span = x - 17;
    var three = Math.round(span * 120 + racs.length * 2000 + (boss ? 8000 : 0) + B.gems.length * 1000);
    var wind = RS.WIND[w] ? RS.WIND[w] * (n % 2 ? 1 : -1) * (0.6 + R3() * 0.6) : 0;
    // clima: cada mundo tiene su ambiente y algunos niveles llueve suave
    var WX = { 1: 'leaves', 2: 'dust', 3: 'snow', 4: 'embers', 5: 'rain', 6: 'neon', 7: 'fireflies', 8: 'petals', 9: 'sparkles', 10: 'leaves', 11: 'confetti', 12: 'gold', 13: 'sparkles', 14: 'leaves', 15: 'fireflies', 16: 'rain', 17: 'sparkles', 18: 'embers' };
    var weather = WX[w] || null;
    if ([1, 2, 5, 7, 10, 13, 14].indexOf(w) >= 0 && n % 4 === 2) weather = 'rain';
    if (w === 16 && n % 3 === 0) weather = 'storm';
    if (w === 3 && n % 5 === 4) weather = 'blizzard';
    var tod = w === 15 ? 'night' : [6, 7, 11].indexOf(w) >= 0 ? null : n % 6 === 3 ? 'dusk' : n % 6 === 5 ? 'night' : null;
    if (weather === 'storm' && !tod) tod = 'dusk';
    if (boss) weather = w === 3 ? 'blizzard' : w === 4 || w === 9 || w === 12 || w === 15 || w === 17 || w === 18 ? WX[w] : 'storm';
    return { w: w, n: n, boss: boss, weather: weather, tod: tod, pieces: B.pieces, gems: B.gems, racs: racs, wind: Math.round(wind * 10) / 10, arms: arms, end: boss ? x + 1.5 : x, stars: [1, three * 0.5, three * 0.8] };
  };

  // nivel de evento: fortaleza de dificultad media con los mapaches y el decorado del evento
  RS.makeEventLevel = function (ev, n) {
    var E = RS.EVENTS[ev], L = RS.makeLevel(E.baseW, Math.min(19, n * 2 - 1), 40 + n);
    var pool = RS.RACS.map(function (r, i) { return i; }).filter(function (i) { return RS.RACS[i].event === ev; });
    L.racs.forEach(function (r, i) {
      if (r.boss) { r.boss = false; r.t = pool[i % pool.length]; return; }
      var T0 = RS.RACS[r.t], fit = pool.filter(function (k) { return RS.RACS[k].h <= T0.h + 0.03 && RS.RACS[k].w <= T0.w + 0.03; });
      r.t = fit.length ? fit[(i + n) % fit.length] : pool[0];
    });
    L.arms = L.arms.concat([L.arms[1] || 0]); // un armadillo extra: los eventos son para disfrutar
    L.ev = ev; L.n = n; L.boss = false; L.weather = E.weather; L.tod = n % 2 ? E.tod : null; L.wind = 0;
    L.decoSheet = E.deco; L.deco = [];
    var cnt = RS.atlas && RS.atlas[E.deco] ? RS.atlas[E.deco].length : 12;
    for (var k = 0; k < 3; k++) L.deco.push({ d: (n * 5 + k * 7) % cnt, x: 3 + k * 4.2, y: 0, w: 1.5 });
    L.deco.push({ d: (n * 3 + 4) % cnt, x: L.end + 2.2, y: 0, w: 1.6 });
    return L;
  };

  // fortaleza rival para la Liga (estilo de clan aleatorio)
  RS.makeRival = function (seed, trophies) {
    var R = rng(seed * 101 + 5);
    var tier = Math.min(18, 1 + Math.floor((trophies || 0) / 120));
    var lvl = RS.makeLevel(tier, 6 + Math.floor(R() * 14), seed);
    var clans = Object.keys(RS.CLANS);
    lvl.clan = clans[Math.floor(R() * clans.length)];
    var cr = RS.CLANS[lvl.clan].rac, ct = RS.RACS.findIndex(function (r) { return cr ? r.id === cr : r.clan === lvl.clan; });
    if (ct >= 0) lvl.racs.forEach(function (r, i) { if (!r.boss && i % 2 === 0 && RS.RACS[ct].h <= RS.RACS[r.t].h + 0.03 && RS.RACS[ct].w <= RS.RACS[r.t].w + 0.03) r.t = ct; });
    lvl.name = RS.RIVAL_NAMES[Math.floor(R() * RS.RIVAL_NAMES.length)];
    lvl.trophies = Math.max(0, (trophies || 0) + Math.floor(R() * 80 - 30));
    lvl.loot = 80 + Math.floor(R() * 120) + tier * 30;
    lvl.arms = [0, 1, 3, 2, 4].slice(0, 5);
    return lvl;
  };
})(RS);
if (typeof module !== 'undefined') module.exports = RS;
