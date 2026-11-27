// Comprueba que los 120 niveles son estables al empezar (no se caen solos ni sueltan gemas)
global.planck = require('../www/js/planck.min.js');
const RS = require('../www/js/data.js'); require('../www/js/levels.js'); require('../www/js/phys.js');
function settle(lvl, secs) {
  const P = new RS.Phys(lvl);
  for (let i = 0; i < secs * 60; i++) P.step(1 / 60);
  let moved = 0, broken = P.destroyed;
  P.blocks.forEach(u => { if (u.dead) return; const p = u.body.getPosition(); if (Math.hypot(p.x - u.p.x, p.y - u.p.y) > 0.25) moved++; });
  return { moved, broken, gems: P.gems.length - P.gemsLeft(), pieces: P.blocks.length, settled: P.settled() };
}
let bad = [], t0 = Date.now(), stats = { pieces: 0, gems: 0 };
for (let w = 1; w <= 6; w++) for (let n = 1; n <= 20; n++) {
  const lvl = RS.makeLevel(w, n);
  const r = settle(lvl, 5);
  stats.pieces += r.pieces; stats.gems += lvl.gems.length;
  if (r.moved || r.broken || r.gems) bad.push(`${w}-${n}: moved ${r.moved} broken ${r.broken} gems ${r.gems}`);
}
console.log('niveles inestables:', bad.length); bad.slice(0, 30).forEach(b => console.log(' ', b));
console.log('piezas totales', stats.pieces, 'gemas', stats.gems, 'tiempo', (Date.now() - t0) / 1000, 's');
