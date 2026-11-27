// ¿Se pueden ganar los niveles? Búsqueda voraz de disparos (sin usar habilidades, peor caso).
global.planck = require('../www/js/planck.min.js');
var RS = require('../www/js/data.js'); global.RS = RS;
require('../www/js/phys.js'); require('../www/js/levels.js');

function simulate(level, shots, extra) {
  var P = new RS.Phys(level), all = shots.concat(extra ? [extra] : []);
  for (var k = 0; k < all.length; k++) {
    var s = all[k], d = { x: Math.cos(s.a), y: Math.sin(s.a) };
    P.launch(level.arms[k], { x: 0.1 + d.x * 1.62, y: 1.2 + d.y * 1.62 }, s.a, s.p);
    for (var t = 0; t < 60 * 7; t++) {
      P.step(1 / 60); P.drain();
      if (t > 90 && P.settled && P.settled()) break;
    }
    P.balls.forEach(function (u) { u.dead = true; P.dead.push(u.body); }); P.step(1 / 60); P.drain();
    if (P.racs.length ? P.racsLeft() === 0 : P.gemsLeft() === 0) return { win: true, gems: 0, score: P.score, used: k + 1 };
  }
  return { win: false, gems: P.racs.length ? P.racsLeft() : P.gemsLeft(), score: P.score, used: all.length };
}
var CANDS = []; if (process.argv[5] === 'mount' && process.env.NOPAR) RS.NO_PAR = true;
(process.argv[5] === 'mount' || process.argv[2] === 'mount' ? [0.45, 0.65, 0.85, 1.0, 1.15, 1.3, 1.42] : [0.15, 0.35, 0.55, 0.75, 0.95]).forEach(function (a) { for (var p = 0.45; p <= 1.001; p += 0.05) CANDS.push({ a: a, p: p }); });

var sample = process.argv[2] === 'all' ? null : [1, 4, 8, 12, 16, 20];
var res = [], t0 = Date.now();
for (var w = +(process.argv[3] || 1); w <= +(process.argv[4] || RS.WORLDS.length); w++) for (var n = 1; n <= 20; n++) {
  if (sample && sample.indexOf(n) < 0) continue;
  if (process.argv[5] === 'mount' && n > RS.MOUNT_LEVELS) continue;
  var L = process.argv[5] === 'hard' ? RS.makeHardLevel(w, n) : process.argv[5] === 'mount' ? RS.makeMountainLevel(w, n) : RS.makeLevel(w, n), shots = [], best = null;
  for (var k = 0; k < L.arms.length; k++) {
    best = null;
    for (var c = 0; c < CANDS.length; c++) {
      var r = simulate(L, shots, CANDS[c]);
      var sc = (r.win ? 1e7 - r.used * 1e5 : 0) - r.gems * 1e5 + r.score;
      if (!best || sc > best.sc) best = { sc: sc, c: CANDS[c], r: r };
    }
    shots.push(best.c);
    if (best.r.win) break;
  }
  res.push({ lvl: w + '-' + n, win: best.r.win, used: best.r.used, of: L.arms.length, gemsLeft: best.r.gems, gems: L.gems.length });
  console.log(w + '-' + n, best.r.win ? 'GANA con ' + best.r.used + '/' + L.arms.length : 'NO (' + best.r.gems + '/' + L.gems.length + ' gemas quedan)', ((Date.now() - t0) / 1000).toFixed(0) + 's');
}
var lost = res.filter(function (r) { return !r.win; });
console.log('ganables', res.length - lost.length, 'de', res.length, '· perdidos:', lost.map(function (r) { return r.lvl; }).join(' '));
