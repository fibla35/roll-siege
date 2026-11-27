// Comprueba en modo difícil una lista de niveles: node tests/test_hard_list.js 2-13 6-4 ...
global.planck = require('../www/js/planck.min.js');
var RS = require('../www/js/data.js'); global.RS = RS; require('../www/js/phys.js'); require('../www/js/levels.js');
var src = require('fs').readFileSync(__dirname + '/test_win.js', 'utf8');
eval(src.slice(src.indexOf('function simulate'), src.indexOf('var sample')));
var bad = [], MODE = process.argv[2]; if (process.env.NOPAR) RS.NO_PAR = true;
process.argv.slice(3).forEach(function (k) {
  var w = +k.split('-')[0], n = +k.split('-')[1], L = (MODE === 'mount' ? RS.makeMountainLevel(w, n) : RS.makeHardLevel(w, n)), shots = [], best = null;
  for (var i = 0; i < L.arms.length; i++) {
    best = null;
    for (var c = 0; c < CANDS.length; c++) { var r = simulate(L, shots, CANDS[c]); var sc = (r.win ? 1e7 - r.used * 1e5 : 0) - r.gems * 1e5 + r.score; if (!best || sc > best.sc) best = { sc: sc, c: CANDS[c], r: r }; }
    shots.push(best.c); if (best.r.win) break;
  }
  console.log(k, best.r.win ? 'GANA ' + best.r.used + '/' + L.arms.length : 'NO'); if (!best.r.win) bad.push(k);
});
console.log('perdidos:', bad.join(' '));
