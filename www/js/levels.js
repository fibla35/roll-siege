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

  RS.makeLevel = function (w, n, variant) {
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
    // demasiadas gemas: deja como máximo 1 + nivel/7 (máx. 4), salvo jefe
    var maxG = boss ? 5 : Math.min(4, 1 + Math.floor(n / 7) + (w >= 3 ? 1 : 0));
    while (B.gems.length > maxG) B.gems.splice(Math.floor(R() * B.gems.length), 1);
    B.gems.forEach(function (g, i) { g.c = (W.gemFrom + i) % 6; });
    // armadillos disponibles en este mundo
    var avail = RS.ARMS.map(function (a, i) { return i; }).filter(function (i) { return RS.ARMS[i].world <= w && RS.ARMS[i].rare < 3; });
    var count = Math.max(3, Math.min(6, 2 + mods + (boss ? 2 : 0)));
    var arms = [0];
    var pool = avail.slice(1); while (arms.length < count) { if (!pool.length) pool = avail.slice(); arms.push(pool.splice(Math.floor(R() * pool.length), 1)[0]); }
    var span = x - 17;
    var three = Math.round(span * 120 + B.gems.length * 1000);
    return { w: w, n: n, boss: boss, pieces: B.pieces, gems: B.gems, arms: arms, end: x, stars: [1, three * 0.55, three * 0.85] };
  };

  // fortaleza rival para la Liga (estilo de clan aleatorio)
  RS.makeRival = function (seed, trophies) {
    var R = rng(seed * 101 + 5);
    var tier = Math.min(6, 1 + Math.floor((trophies || 0) / 120));
    var lvl = RS.makeLevel(tier, 6 + Math.floor(R() * 14), seed);
    var clans = Object.keys(RS.CLANS);
    lvl.clan = clans[Math.floor(R() * clans.length)];
    lvl.name = RS.RIVAL_NAMES[Math.floor(R() * RS.RIVAL_NAMES.length)];
    lvl.trophies = Math.max(0, (trophies || 0) + Math.floor(R() * 80 - 30));
    lvl.loot = 80 + Math.floor(R() * 120) + tier * 30;
    lvl.arms = [0, 1, 3, 2, 4].slice(0, 5);
    return lvl;
  };
})(RS);
if (typeof module !== 'undefined') module.exports = RS;
