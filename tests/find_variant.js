// Busca una variante ganable para un nivel: node tests/find_variant.js 4 5
global.planck = require('../www/js/planck.min.js');
var RS = require('../www/js/data.js'); global.RS = RS; require('../www/js/phys.js'); require('../www/js/levels.js');
var src = require('fs').readFileSync(__dirname + '/test_win.js', 'utf8');
eval(src.slice(src.indexOf('function simulate'), src.indexOf('var sample')));
var w = +process.argv[2], n = +process.argv[3];
for (var v = 1; v <= 8; v++) {
  var L = RS.makeLevel(w, n, v), shots = [], best = null;
  for (var k = 0; k < L.arms.length; k++) {
    best = null;
    for (var c = 0; c < CANDS.length; c++) { var r = simulate(L, shots, CANDS[c]); var sc = (r.win ? 1e7 - r.used * 1e5 : 0) - r.gems * 1e5 + r.score; if (!best || sc > best.sc) best = { sc: sc, c: CANDS[c], r: r }; }
    shots.push(best.c); if (best.r.win) break;
  }
  if (best.r.win) { console.log(w + '-' + n, 'variante', v, 'GANA con', best.r.used + '/' + L.arms.length); process.exit(0); }
  console.log(w + '-' + n, 'variante', v, 'no');
}
console.log(w + '-' + n, 'SIN variante');
