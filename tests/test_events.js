// Niveles de evento: estabilidad y si se pueden ganar (node tests/test_events.js)
global.planck = require('../www/js/planck.min.js');
var RS = require('../www/js/data.js'); global.RS = RS; require('../www/js/phys.js'); require('../www/js/levels.js');
var src = require('fs').readFileSync(__dirname + '/test_win.js', 'utf8');
eval(src.slice(src.indexOf('function simulate'), src.indexOf('var sample')));
var ok = 0, tot = 0, bad = [];
Object.keys(RS.EVENTS).forEach(function (ev) {
  for (var n = 1; n <= RS.EVENT_LEVELS; n++) {
    var L = RS.makeEventLevel(ev, n), P = new RS.Phys(L), moved = 0;
    for (var i = 0; i < 300; i++) P.step(1 / 60);
    P.blocks.forEach(function (u) { var p = u.body.getPosition(); if (Math.hypot(p.x - u.p.x, p.y - u.p.y) > 0.25) moved++; });
    var shots = [], best = null;
    for (var k = 0; k < L.arms.length; k++) {
      best = null;
      for (var c = 0; c < CANDS.length; c++) { var r = simulate(L, shots, CANDS[c]); var sc = (r.win ? 1e7 - r.used * 1e5 : 0) - r.gems * 1e5 + r.score; if (!best || sc > best.sc) best = { sc: sc, c: CANDS[c], r: r }; }
      shots.push(best.c); if (best.r.win) break;
    }
    tot++; if (best.r.win) ok++; else bad.push(ev + '-' + n);
    console.log(ev + '-' + n, 'rac', L.racs.length, 'inestable', moved + P.destroyed, best.r.win ? 'GANA ' + best.r.used + '/' + L.arms.length : 'NO');
  }
});
console.log('eventos ganables', ok, 'de', tot, bad.join(' '));
