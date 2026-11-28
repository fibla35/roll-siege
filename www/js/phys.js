// Física del juego (sin dibujo): construye la fortaleza, daño de bloques, gemas, disparo y habilidades.
// Se usa en el juego, en el constructor y en los tests de Node.
var RS = typeof RS !== 'undefined' ? RS : require('./data.js');
var planck = typeof planck !== 'undefined' ? planck : require('./planck.min.js');
(function (RS, pl) {
  var V = pl.Vec2;

  // giros: 0 = normal, 1 = vertical (90°), 2 = diagonal subiendo (45°), 3 = diagonal bajando (-45°)
  RS.GEM_R = 0.27; // radio de la gema (cabe en el hueco de un arco)
  // partes sólidas de una pieza (el arco es hueco por debajo) como cajas en coordenadas del mundo
  RS.pieceParts = function (p) {
    var s = RS.SHAPES[p.s];
    if (s.kind === 'arch' && !p.rot) { var W = s.w / 2, H = s.h, lw = 0.45 * W; return [[p.x - W, p.y - 0.5 * H, p.x - W + lw, p.y + 0.1 * H], [p.x + W - lw, p.y - 0.5 * H, p.x + W, p.y + 0.1 * H], [p.x - W, p.y + 0.1 * H, p.x + W, p.y + 0.5 * H]]; }
    if (s.kind === 'step' && !p.rot) return [[p.x - 1, p.y - 1, p.x + 1, p.y], p.flip ? [p.x - 1, p.y, p.x, p.y + 1] : [p.x, p.y, p.x + 1, p.y + 1]];
    var a = RS.pieceAABB(p); return [[a.x0, a.y0, a.x1, a.y1]];
  };
  RS.gemHits = function (p, g, r) { r = r == null ? RS.GEM_R - 0.03 : r; return RS.pieceParts(p).some(function (b) { var dx = Math.max(b[0] - g.x, 0, g.x - b[2]), dy = Math.max(b[1] - g.y, 0, g.y - b[3]); return dx * dx + dy * dy < r * r; }); };
  RS.ANG = [0, Math.PI / 2, Math.PI / 4, -Math.PI / 4, Math.PI, -Math.PI / 2]; // 4 = boca abajo, 5 = girado a la derecha (trampas colgadas en una pared a su izquierda); 4 = boca abajo (triángulos en esquinas altas)
  RS.rotAng = function (p) { return RS.ANG[p.rot || 0] || 0; };
  function pieceSize(p) {
    var s = RS.SHAPES[p.s], r = p.rot || 0, sw = p.len || s.w; // len: cadenas y cuerdas, que miden lo que el hueco
    if (r === 2 || r === 3) { var d = (sw + s.h) * Math.SQRT1_2; return { w: Math.round(d * 2) / 2, h: Math.round(d * 2) / 2, diag: true }; }
    return (r % 2) ? { w: s.h, h: sw } : { w: sw, h: s.h };
  }
  // rectángulo girado real (para no chocar con la caja grande de una diagonal)
  RS.pieceOBB = function (p) {
    var s = RS.SHAPES[p.s], a = RS.rotAng(p), c = Math.cos(a), n = Math.sin(a), hw = (p.len || s.w) / 2 - 0.02, hh = s.h / 2 - 0.02;
    return [[-hw, -hh], [hw, -hh], [hw, hh], [-hw, hh]].map(function (q) { return [p.x + q[0] * c - q[1] * n, p.y + q[0] * n + q[1] * c]; });
  };
  RS.obbOverlap = function (A, B) {
    var polys = [A, B];
    for (var i = 0; i < 2; i++) { var P = polys[i]; for (var k = 0; k < 4; k++) {
      var p1 = P[k], p2 = P[(k + 1) % 4], ax = p2[1] - p1[1], ay = p1[0] - p2[0], mn = [1e9, 1e9], mx = [-1e9, -1e9];
      polys.forEach(function (Q, j) { Q.forEach(function (q) { var d = q[0] * ax + q[1] * ay; if (d < mn[j]) mn[j] = d; if (d > mx[j]) mx[j] = d; }); });
      if (mx[0] <= mn[1] || mx[1] <= mn[0]) return false;
    } }
    return true;
  };
  RS.pieceSize = pieceSize;
  RS.pieceAABB = function (p) { var z = pieceSize(p); return { x0: p.x - z.w / 2, x1: p.x + z.w / 2, y0: p.y - z.h / 2, y1: p.y + z.h / 2 }; };

  function addShapeFixtures(body, s, flip, fd) {
    if (s.fixH) body.createFixture(pl.Box(s.w / 2 * 0.96, s.fixH / 2, V(0, -s.h / 2 + s.fixH / 2), 0), fd); // trampas bajas: solo la base es sólida
    else if (s.kind === 'box') body.createFixture(pl.Box(s.w / 2, s.h / 2), fd);
    else if (s.kind === 'circle') body.createFixture(pl.Circle(s.r), fd);
    else if (s.kind === 'poly') body.createFixture(pl.Polygon(s.pts.map(function (q) { return V(flip ? -q[0] : q[0], q[1]); })), fd);
    else if (s.kind === 'L') {
      body.createFixture(pl.Box(0.16, 0.5, V(flip ? 0.34 : -0.34, 0), 0), fd);
      body.createFixture(pl.Box(0.5, 0.16, V(0, -0.34), 0), fd);
    } else if (s.kind === 'brace') body.createFixture(pl.Box(1.32, 0.14, V(0, 0), flip ? -Math.PI / 4 : Math.PI / 4), fd);
    else if (s.kind === 'arch') {
      var W = s.w / 2, H = s.h;
      body.createFixture(pl.Box(0.225 * W, 0.3 * H, V(-0.775 * W, -0.2 * H), 0), fd);
      body.createFixture(pl.Box(0.225 * W, 0.3 * H, V(0.775 * W, -0.2 * H), 0), fd);
      body.createFixture(pl.Box(W, 0.2 * H, V(0, 0.3 * H), 0), fd);
    } else if (s.kind === 'battle') {
      body.createFixture(pl.Box(1, 0.3, V(0, -0.2), 0), fd);
      [-0.8, 0, 0.8].forEach(function (tx) { body.createFixture(pl.Box(0.2, 0.2, V(tx, 0.3), 0), fd); });
    } else if (s.kind === 'step') {
      body.createFixture(pl.Box(1, 0.5, V(0, -0.5), 0), fd);
      body.createFixture(pl.Box(0.5, 0.5, V(flip ? -0.5 : 0.5, 0.5), 0), fd);
    } else if (s.kind === 'T') {
      body.createFixture(pl.Box(s.w / 2, 0.2, V(0, 0.3), 0), fd);
      body.createFixture(pl.Box(0.3, 0.3, V(0, -0.2), 0), fd);
    }
  }

  function Phys(layout, opts) {
    opts = opts || {};
    var self = this;
    this.world = new pl.World({ gravity: V(0, RS.PHYS.gravity) });
    this.blocks = []; this.ties = []; this.gems = []; this.balls = []; this.events = []; this.dead = []; this.joints = []; this.traps = []; this.shells = []; this.booms = [];
    this.time = 0; this.score = 0; this.destroyed = 0; this.totalValue = 0; this.destroyedValue = 0;
    this.noDamage = !!opts.noDamage;
    var ground = this.world.createBody({ type: 'static' });
    ground.createFixture(pl.Edge(V(-80, 0), V(300, 0)), { friction: 0.8 });
    ground.setUserData({ ground: true });
    this.ground = ground;
    // terreno del Modo Montaña: polígonos convexos estáticos (murallas de roca y acantilados)
    (layout.terrain || []).forEach(function (t) {
      var tb = self.world.createBody({ type: 'static' });
      tb.createFixture(pl.Polygon(t.pts.map(function (q) { return V(q[0], q[1]); })), { friction: 0.9 });
      tb.setUserData({ ground: true, terrain: true });
    });
    (layout.pieces || []).forEach(function (p, i) { self.addPiece(p, i); });
    (layout.gems || []).forEach(function (g, i) { self.addGem(g, i); });
    this.racs = []; (layout.racs || []).forEach(function (r, i) { self.addRac(r, i); });
    this.wind = layout.wind || 0;
    this.ballGrav = layout.ballGrav || 1; // Modo Montaña: el mortero lanza en una parábola más alta
    if (!opts.noWeld) this.makeWelds(layout.pieces || []);
    this.makeTies();
    this.world.on('post-solve', function (c, imp) { self.onPostSolve(c, imp); });
    this.world.on('pre-solve', function (c) { self.onPreSolve(c); });
  }
  RS.Phys = Phys;

  RS.pieceMat = function (p) { var s = RS.SHAPES[p.s]; return s.mat != null ? s.mat : p.m; };
  Phys.prototype.addPiece = function (p, i) {
    var s = RS.SHAPES[p.s], mi = RS.pieceMat(p), m = RS.MATS[mi];
    if (s.tie) { this.ties.push({ p: p, s: s }); return null; } // cadenas y cuerdas: no son un cuerpo, atan a sus vecinas
    var b = this.world.createBody({ type: s.static ? 'static' : 'dynamic', position: V(p.x, p.y), angle: RS.rotAng(p) });
    addShapeFixtures(b, s, p.flip, { density: m.dens * (s.dens || 1), friction: m.fr, restitution: m.rest, isSensor: !!s.sensor });
    var hp = m.hp * (s.static ? 1.6 : 1) * (s.explosive ? 0.25 : 1);
    var ud = { block: true, p: p, idx: i, s: p.s, m: mi, hp: hp, hp0: hp, fragile: m.fragile || 1, frozen: false, body: b, trap: s.trap || null, cd: 0, shots: 0, fr: 0, explosive: s.explosive || 0, armor: !!s.armor, roller: s.roller || 0 };
    if (s.trap) this.traps.push(ud);
    b.setUserData(ud); this.blocks.push(ud); this.totalValue += 100 * m.cost;
    return ud;
  };

  Phys.prototype.addGem = function (g, i) {
    var b = this.world.createBody({ type: 'dynamic', position: V(g.x, g.y) });
    b.createFixture(pl.Circle(RS.GEM_R), { density: 0.7, friction: 0.5, restitution: 0.2 });
    var ud = { gem: true, idx: i, c: g.c || 0, x0: g.x, y0: g.y, freed: false, body: b };
    b.setUserData(ud); this.gems.push(ud);
  };

  // ---------- mapaches ----------
  Phys.prototype.addRac = function (r, i) {
    var T = RS.RACS[r.t] || RS.RACS[0], k = r.boss ? 1.9 : 1, w = T.w * k, h = T.h * k;
    var b = this.world.createBody({ type: 'dynamic', position: V(r.x, r.y + h / 2), fixedRotation: false });
    b.createFixture(pl.Box(w / 2 * 0.9, h / 2 * 0.95), { density: T.dens * (r.boss ? 1.6 : 1), friction: 0.8, restitution: 0.05 });
    if (T.fly && !r.boss) b.setGravityScale(0);
    var hp = Math.round((r.boss ? 420 + 30 * (r.w || 1) : T.hp) * (r.hpMul || 1));
    var ud = { rac: true, idx: i, t: r.t, T: T, boss: !!r.boss, bi: r.boss ? (r.bi != null ? r.bi : RS.bossIdx(r.w || 1)) : 0, w: w, h: h, hp: hp, hp0: hp, x0: r.x, y0: r.y + h / 2, ko: false, body: b, flying: !!T.fly && !r.boss, shield: false, helmet: false, koT: 0 };
    b.setUserData(ud); this.racs.push(ud);
  };
  Phys.prototype.racsLeft = function () { return this.racs.filter(function (r) { return !r.ko; }).length; };
  Phys.prototype.hurtRac = function (r, dmg, fromLeft) {
    if (r.ko || this.time < 1.2) return;
    if (r.shield) { r.shield = false; this.events.push({ t: 'shieldpop', x: r.body.getPosition().x, y: r.body.getPosition().y }); return; }
    if (r.T.shieldFront && fromLeft) dmg *= 0.35;
    if (r.helmet) dmg *= 0.6;
    if (r.flying) { r.flying = false; r.body.setGravityScale(1); }
    r.hp -= dmg;
    var p = r.body.getPosition();
    if (r.hp <= 0) this.koRac(r);
    else if (dmg > 4) { r.hurtT = 0.6; this.events.push({ t: 'rachit', x: p.x, y: p.y, boss: r.boss }); }
  };
  Phys.prototype.koRac = function (r) {
    if (r.ko) return; r.ko = true; r.koT = 0;
    var v = r.boss ? 10000 : 2000; this.score += v;
    var p = r.body.getPosition(); this.events.push({ t: 'racko', x: p.x, y: p.y, v: v, boss: r.boss });
  };

  Phys.prototype.makeWelds = function (pieces) {
    var self = this;
    for (var i = 0; i < this.blocks.length; i++) for (var j = i + 1; j < this.blocks.length; j++) {
      var A = this.blocks[i], B = this.blocks[j];
      if (!A.p.weld && !B.p.weld && !RS.SHAPES[A.s].weld && !RS.SHAPES[B.s].weld) continue;
      if (A.body.isStatic() && B.body.isStatic()) continue;
      var a = RS.pieceAABB(A.p), b = RS.pieceAABB(B.p), e = 0.06;
      var ox = Math.min(a.x1, b.x1) - Math.max(a.x0, b.x0), oy = Math.min(a.y1, b.y1) - Math.max(a.y0, b.y0);
      if (ox > -e && oy > -e && (ox > 0.2 || oy > 0.2)) {
        var anchor = V((Math.max(a.x0, b.x0) + Math.min(a.x1, b.x1)) / 2, (Math.max(a.y0, b.y0) + Math.min(a.y1, b.y1)) / 2);
        var jt = this.world.createJoint(pl.WeldJoint({ frequencyHz: 0, dampingRatio: 0 }, A.body, B.body, anchor));
        var lim = 40 + 25 * Math.min(RS.MATS[A.m].cost, RS.MATS[B.m].cost);
        self.joints.push({ j: jt, lim: lim });
      }
    }
  };

  // cadenas y cuerdas: una cuerda (RopeJoint) entre las dos piezas que tocan sus extremos
  Phys.prototype.makeTies = function () {
    var self = this;
    this.ties.forEach(function (T) {
      var p = T.p, a = RS.pieceAABB(p), vert = (p.rot || 0) % 2 === 1, ends = vert ? [[p.x, a.y0 - 0.05], [p.x, a.y1 + 0.05]] : [[a.x0 - 0.05, p.y], [a.x1 + 0.05, p.y]];
      var bodies = ends.map(function (e) {
        var hit = null; self.blocks.forEach(function (u) { if (hit || u.dead) return; var q = RS.pieceAABB(u.p); if (e[0] >= q.x0 - 0.01 && e[0] <= q.x1 + 0.01 && e[1] >= q.y0 - 0.01 && e[1] <= q.y1 + 0.01) hit = u; });
        return hit;
      });
      if (!bodies[0] || !bodies[1] || bodies[0] === bodies[1]) { T.broken = true; return; }
      var A = V(ends[0][0] + (vert ? 0 : 0.05), ends[0][1] + (vert ? 0.05 : 0)), B = V(ends[1][0] - (vert ? 0 : 0.05), ends[1][1] - (vert ? 0.05 : 0));
      var jd = pl.RopeJoint({ maxLength: Math.hypot(B.x - A.x, B.y - A.y) + 0.02, localAnchorA: bodies[0].body.getLocalPoint(A), localAnchorB: bodies[1].body.getLocalPoint(B) }, bodies[0].body, bodies[1].body);
      T.j = self.world.createJoint(jd); T.A = bodies[0]; T.B = bodies[1]; T.lim = T.s.tie;
    });
  };
  Phys.prototype.tieEnds = function (T) {
    if (!T.j || T.broken) return null;
    return [T.j.getAnchorA(), T.j.getAnchorB()];
  };

  Phys.prototype.onPreSolve = function (c) {
    var A = c.getFixtureA().getBody(), Bd = c.getFixtureB().getBody();
    var wm = c.getWorldManifold();
    if (wm && wm.points[0]) {
      var p0 = wm.points[0], nrm = wm.normal;
      var va = A.getLinearVelocityFromWorldPoint(p0), vb = Bd.getLinearVelocityFromWorldPoint(p0);
      c.__vn = Math.abs((vb.x - va.x) * nrm.x + (vb.y - va.y) * nrm.y);
    } else c.__vn = 0;
    var a = A.getUserData(), b = Bd.getUserData();
    var ball = a && a.ball ? a : (b && b.ball ? b : null), other = ball === a ? b : a;
    if (!ball || !other || !other.block) return;
    if (other.trap === 'spring' && !other.dead && other.cd <= 0 && ball.ghostT <= 0) {
      var bv = ball.body.getLinearVelocity();
      other.cd = 0.6; other.fr = 0.5; var sr = other.p.rot || 0;
      if (sr === 1 || sr === 5) ball.springV = V((sr === 1 ? -1 : 1) * Math.max(9, Math.abs(bv.x) * 0.95), Math.max(2.5, Math.abs(bv.y) * 0.3 + 2)); // en la pared: rebota de lado, lejos de la pared
      else ball.springV = V(-Math.max(6, Math.abs(bv.x) * 0.85), Math.max(7, Math.abs(bv.y) * 0.5 + 6));
      this.events.push({ t: 'spring', x: other.body.getPosition().x, y: other.body.getPosition().y });
    }
    if (other.trap === 'spikes' && !other.dead && ball.ghostT <= 0) { ball.stopV = V(0, 0); ball.mult = 0.15; other.up = 1; if (!other.hitOnce) { other.hitOnce = true; this.events.push({ t: 'spikes', x: other.body.getPosition().x, y: other.body.getPosition().y }); } }
    if (ball.ghostT > 0) { c.setEnabled(false); return; }
    if (ball.cutT > 0 && [0, 2, 4].indexOf(other.m) >= 0) { c.setEnabled(false); if (!other.drilled) { other.drilled = true; this.damage(other, 999, other.body.getPosition()); } return; }
    if (ball.stickT > 0 && !ball.stuck && !other.body.isStatic()) { ball.stuck = other; var om = other.body.getMass(); other.body.applyLinearImpulse(V(0, -12 * om), other.body.getPosition(), true); this.damage(other, 40, other.body.getPosition()); }
    if (ball.drillT > 0 && [0, 1, 2, 4].indexOf(other.m) >= 0) {
      c.setEnabled(false);
      if (!other.drilled) { other.drilled = true; this.damage(other, other.m === 1 ? 160 : 999, other.body.getPosition()); }
    }
  };

  Phys.prototype.onPostSolve = function (c, imp) {
    if (this.noDamage || this.time < 1.2) return;
    var n = Math.max(imp.normalImpulses[0] || 0, imp.normalImpulses[1] || 0);
    if (n < 0.9 || (c.__vn || 0) < 1.1) return;  // solo golpes, no el peso que soportan
    var a = c.getFixtureA().getBody().getUserData(), b = c.getFixtureB().getBody().getUserData();
    var wm = c.getWorldManifold(), pt = wm && wm.points[0] ? wm.points[0] : c.getFixtureA().getBody().getPosition();
    var self = this;
    [[a, b], [b, a]].forEach(function (pair) {
      var me = pair[0], other = pair[1];
      if (!me) return;
      if (me.gem && !me.freed && n > 2.2) self.freeGem(me);
      if (me.rac) { var vn = c.__vn || 0, mlt = (other && other.ball) ? other.mult * 1.6 : (other && other.roller ? 2.5 * other.roller : 1); if (n > 0.5 && vn > 0.9) { var q = me.body.getPosition(); self.hurtRac(me, (n - 0.5) * 9 * mlt, pt.x < q.x); } return; }
      if (!me.block) return;
      if (other && other.shell) return;
      var mult = (other && other.ball) ? other.mult : 1;
      var dmg = (n - 0.9) * 6 * mult * me.fragile;
      if (dmg > 2) self.damage(me, dmg, pt);
    });
  };

  Phys.prototype.damage = function (u, dmg, pt) {
    if (u.dead) return;
    if (u.armor && !u.dented && dmg > 6) { u.dented = true; dmg = Math.max(dmg * 0.2, u.hp - u.hp0 * 0.45); this.events.push({ t: 'hit', m: u.m, x: pt.x, y: pt.y, d: 30 }); } // el blindaje se abolla con el primer golpe
    var before = u.hp; u.hp -= dmg;
    if (before > u.hp0 * 0.5 && u.hp <= u.hp0 * 0.5 && u.hp > 0) this.events.push({ t: 'crack', m: u.m, u: u, x: pt.x, y: pt.y });
    else if (dmg > 6) this.events.push({ t: 'hit', m: u.m, x: pt.x, y: pt.y, d: dmg });
    if (u.hp <= 0) {
      u.dead = true; this.dead.push(u.body);
      var v = 100 * RS.MATS[u.m].cost; this.score += v; this.destroyedValue += v; this.destroyed++;
      var pos = u.body.getPosition();
      this.events.push({ t: 'break', m: u.m, s: u.s, x: pos.x, y: pos.y, a: u.body.getAngle(), u: u });
      if (u.explosive) this.booms.push({ x: pos.x, y: pos.y, k: u.explosive });
      if (RS.SHAPES[u.s].cage) this.events.push({ t: 'cage', x: pos.x, y: pos.y, arm: u.p.arm });
    }
  };

  Phys.prototype.freeGem = function (g) {
    if (g.freed) return; g.freed = true; this.dead.push(g.body); this.score += 1000;
    var p = g.body.getPosition(); this.events.push({ t: 'gem', x: p.x, y: p.y, c: g.c });
  };

  Phys.prototype.gemsLeft = function () { return this.gems.filter(function (g) { return !g.freed; }).length; };

  // ---------- disparo ----------
  Phys.prototype.launch = function (armIdx, origin, angle, power, opts) {
    opts = opts || {};
    var sp = RS.PHYS.vMax * Math.max(0.15, power) * (opts.speedMul || 1);
    var b = this.world.createBody({ type: 'dynamic', position: V(origin.x, origin.y), bullet: true });
    var r = opts.r || RS.PHYS.ballR;
    b.createFixture(pl.Circle(r), { density: RS.PHYS.ballDens, friction: 0.5, restitution: 0.25 });
    b.setLinearVelocity(V(Math.cos(angle) * sp, Math.sin(angle) * sp));
    b.setAngularVelocity(-8);
    if (this.ballGrav !== 1) b.setGravityScale(this.ballGrav);
    var ud = { ball: true, arm: armIdx, body: b, r: r, used: false, mult: armIdx === 0 ? 1.25 : 1, t: 0, rest: 0, ghostT: 0, drillT: 0, magT: 0, dashT: 0, fire: false, frozenFx: 0, child: !!opts.child };
    b.setUserData(ud); this.balls.push(ud);
    return ud;
  };

  Phys.prototype.setRadius = function (u, r, dens) {
    var b = u.body, f = b.getFixtureList();
    var rest = f.getRestitution();
    b.destroyFixture(f);
    b.createFixture(pl.Circle(r), { density: dens || RS.PHYS.ballDens, friction: 0.5, restitution: rest });
    u.r = r;
  };

  Phys.prototype.ability = function (u, tgt) {
    if (!u || u.used || u.dead) return null;
    u.used = true;
    var b = u.body, v = b.getLinearVelocity(), p = b.getPosition(), sp = v.length(), self = this;
    var kind = RS.ARMS[u.arm].abil;
    switch (kind) {
      case 'slam': b.setLinearVelocity(V(v.x * 0.35, -Math.max(16, sp))); u.mult = 1.8; break;
      case 'split':
        [-0.22, 0.22].forEach(function (da) {
          var ang = Math.atan2(v.y, v.x) + da;
          var c = self.launch(u.arm, p, ang, 1, { r: 0.36, child: true }); c.used = true;
          c.body.setLinearVelocity(V(Math.cos(ang) * sp, Math.sin(ang) * sp));
        });
        this.setRadius(u, 0.36); break;
      case 'drill': u.drillT = 1.3; b.setLinearVelocity(V(v.x * 1.15, v.y * 1.15)); break;
      case 'boom': this.explode(p.x, p.y, 3.4, 190, 32); u.dead = true; this.dead.push(b); break;
      case 'bounce': b.getFixtureList().setRestitution(0.88); b.setLinearVelocity(V(v.x * 1.15, v.y * 1.15)); break;
      case 'magnet': u.magT = 1.6; break;
      case 'grow': this.setRadius(u, RS.PHYS.ballR * 2.4); u.mult = 1.3; break;
      case 'boomerang': b.setLinearVelocity(V(-Math.abs(v.x) * 1.15, Math.abs(v.y) * 0.3 + 5)); u.mult = 1.4; break;
      case 'freeze':
        this.blocks.forEach(function (bl) {
          if (bl.dead) return; var q = bl.body.getPosition(), d = Math.hypot(q.x - p.x, q.y - p.y);
          if (d < 3.8 && !bl.frozen) { bl.frozen = true; bl.hp *= 0.45; bl.fragile *= 2; }
        });
        break;
      case 'meteor': this.setRadius(u, RS.PHYS.ballR * 1.15, RS.PHYS.ballDens * 3); b.setLinearVelocity(V(v.x * 1.4, v.y * 1.4)); u.mult = 2.2; u.fire = true; break;
      case 'dash': var n = sp || 1; u.dashT = 0.4; u.dashV = V(v.x / n * 40, v.y / n * 40); u.mult = 1.8; break;
      case 'ghost': u.ghostT = 0.75; break;
      case 'stick': u.stickT = 2.5; u.mult = 1.3; break;
      case 'tornado':
        this.blocks.forEach(function (bl) { if (bl.dead || bl.body.isStatic()) return; var q = bl.body.getPosition(), dx = q.x - p.x, dy = q.y - p.y, d = Math.hypot(dx, dy); if (d < 4.5) { var m = bl.body.getMass(), k = (1 - d / 4.5) * Math.min(1, 4 / (m + 0.5)); bl.body.applyLinearImpulse(V(-dy * 2 * m * k, (9 + Math.random() * 4) * m * k), q, true); bl.body.applyAngularImpulse(m * 2 * k, true); } });
        this.racs.forEach(function (r) { if (r.ko) return; var q = r.body.getPosition(); if (Math.hypot(q.x - p.x, q.y - p.y) < 4.5) r.body.applyLinearImpulse(V(0, 7 * r.body.getMass()), q, true); });
        break;
      case 'bubble': b.setGravityScale(0); u.bubbleT = 1.8; var n0 = sp || 1; b.setLinearVelocity(V(v.x / n0 * Math.max(sp, 14), v.y / n0 * Math.max(sp, 14) * 0.3)); break;
      case 'cut': u.cutT = 1.0; u.mult = 1.5; b.setLinearVelocity(V(v.x * 1.25, v.y * 1.25)); break;
      case 'magma':
        this.explode(p.x, p.y, 2.6, 90, 14);
        this.blocks.forEach(function (bl) { if (bl.dead || RS.MATS[bl.m].id !== 'madera') return; var q = bl.body.getPosition(); if (Math.hypot(q.x - p.x, q.y - p.y) < 4.2) self.damage(bl, 999, q); });
        u.dead = true; this.dead.push(b); break;
      case 'mirror': var cl = this.launch(u.arm, V(p.x, p.y + 1.2), Math.atan2(v.y, v.x), 1, { child: true }); cl.used = true; cl.body.setLinearVelocity(V(v.x, v.y)); break;
      case 'lead': this.setRadius(u, RS.PHYS.ballR, RS.PHYS.ballDens * 6); b.setLinearVelocity(V(v.x * 0.15, -22)); u.mult = 2.4; break;
      case 'rocket': var tx = tgt ? tgt.x - p.x : v.x, ty = tgt ? tgt.y - p.y : v.y, tn = Math.hypot(tx, ty) || 1; u.dashT = 0.45; u.dashV = V(tx / tn * 30, ty / tn * 30); u.mult = 1.7; break;
      case 'vine':
        this.blocks.forEach(function (bl) { if (bl.dead || bl.body.isStatic()) return; var q = bl.body.getPosition(), dx = p.x - q.x, dy = p.y - q.y, d = Math.hypot(dx, dy); if (d < 5 && d > 0.3) { var m = bl.body.getMass(); bl.body.applyLinearImpulse(V(dx / d * 7 * m, dy / d * 5 * m), q, true); } });
        this.racs.forEach(function (r) { if (r.ko) return; var q = r.body.getPosition(), dx = p.x - q.x, d = Math.hypot(dx, p.y - q.y); if (d < 5) r.body.applyLinearImpulse(V(dx / (d + 0.1) * 6 * r.body.getMass(), 2 * r.body.getMass()), q, true); });
        break;
      case 'shard':
        this.blocks.forEach(function (bl) { if (bl.dead) return; var q = bl.body.getPosition(), d = Math.hypot(q.x - p.x, q.y - p.y), id = RS.MATS[bl.m].id; if (d < 4) self.damage(bl, (id === 'hielo' || id === 'cristal' ? 400 : 45) * (1 - d / 5), q); });
        this.explode(p.x, p.y, 2.2, 30, 10); u.dead = true; this.dead.push(b); break;
      case 'astral':
        var fl = this.floaters = [];
        this.blocks.concat(this.racs).forEach(function (bl) { if (bl.dead || bl.ko || bl.body.isStatic()) return; var q = bl.body.getPosition(); if (Math.hypot(q.x - p.x, q.y - p.y) < 5.5) { bl.body.setGravityScale(-0.25); fl.push(bl); } });
        this.floatT = 1.6; break;
      case 'royal':
        for (var k = 0; k < 5; k++) { var mb = this.launch(u.arm, V(p.x - 1.6 + k * 0.8, p.y + 3), -Math.PI / 2, 0.4, { r: 0.3, child: true }); mb.used = true; mb.mult = 1.4; }
        break;
    }
    this.events.push({ t: 'ability', kind: kind, x: p.x, y: p.y, u: u });
    return kind;
  };

  Phys.prototype.explode = function (x, y, R, dmg, push) {
    var self = this;
    this.blocks.concat(this.gems).forEach(function (u) {
      if (u.dead || u.freed) return;
      var q = u.body.getPosition(), dx = q.x - x, dy = q.y - y, d = Math.hypot(dx, dy);
      if (d > R) return;
      var k = 1 - d / R, m = u.body.getMass();
      u.body.applyLinearImpulse(V(dx / (d + 0.1) * push * k * Math.sqrt(m), (dy / (d + 0.1) + 0.4) * push * k * Math.sqrt(m)), q, true);
      if (u.block) self.damage(u, dmg * k * u.fragile, q);
      if (u.gem && k > 0.35) self.freeGem(u);
    });
    this.racs.forEach(function (r) { if (r.ko) return; var q = r.body.getPosition(), d = Math.hypot(q.x - x, q.y - y); if (d < R) { var k = 1 - d / R; self.hurtRac(r, dmg * 0.6 * k, false); r.body.applyLinearImpulse(V((q.x - x) / (d + 0.1) * push * k * 0.6, push * k * 0.5), q, true); } });
    this.events.push({ t: 'explode', x: x, y: y });
  };

  // ---------- paso ----------
  Phys.prototype.step = function (dt) {
    var self = this;
    this.balls.forEach(function (u) {
      if (u.dead) return;
      var b = u.body; u.t += dt;
      if (u.ghostT > 0) u.ghostT -= dt;
      if (u.drillT > 0) u.drillT -= dt;
      if (u.dashT > 0) { u.dashT -= dt; b.setLinearVelocity(u.dashV); }
      if (u.cutT > 0) u.cutT -= dt;
      if (u.bubbleT > 0) { u.bubbleT -= dt; if (u.bubbleT <= 0) b.setGravityScale(1); }
      if (u.stuck && u.stickT > 0) { u.stickT -= dt; if (!u.stuck.dead) { var sq = u.stuck.body.getPosition(); b.setLinearVelocity(V((sq.x - b.getPosition().x) * 6, (sq.y - b.getPosition().y) * 6)); u.stuck.body.applyForceToCenter(V(0, -40 * u.stuck.body.getMass()), true); } }
      if (u.magT > 0) {
        u.magT -= dt; var p = b.getPosition();
        self.blocks.forEach(function (bl) {
          if (bl.dead || !RS.MATS[bl.m].metal) return;
          var q = bl.body.getPosition(), dx = p.x - q.x, dy = p.y - q.y, d = Math.hypot(dx, dy);
          if (d < 8) bl.body.applyForceToCenter(V(dx / d * 90 * bl.body.getMass() / (d + 1), dy / d * 60 * bl.body.getMass() / (d + 1) - 20), true);
        });
      }
      var v = b.getLinearVelocity().length();
      u.rest = v < 0.4 ? u.rest + dt : 0;
      var pos = b.getPosition();
      if (pos.y < -8 || pos.x > 140 || pos.x < -40) { u.dead = true; self.dead.push(b); }
    });
    this.stepTraps(dt);
    if (this.floatT > 0) { this.floatT -= dt; if (this.floatT <= 0) (this.floaters || []).forEach(function (bl) { if (bl.body) bl.body.setGravityScale(bl.flying ? 0 : 1); }); }
    var W = this.wind;
    if (W) this.balls.forEach(function (u) { if (!u.dead) u.body.applyForceToCenter(V(W * u.body.getMass(), 0), true); });
    this.racs.forEach(function (r) {
      if (r.ko) { r.koT += dt; if (r.koT > 1.4 && !r.gone) { r.gone = true; self.dead.push(r.body); } return; }
      var q = r.body.getPosition();
      if (r.flying) r.body.setLinearVelocity(V(0, Math.sin(self.time * 1.6 + r.idx) * 0.8));
      if (self.time > 1.2 && (Math.abs(r.body.getAngle()) > 1.15 || q.y < r.y0 - 1.3 || q.y < -1)) self.koRac(r);
      if (r.hurtT) r.hurtT = Math.max(0, r.hurtT - dt);
    });
    this.world.step(dt, 8, 3);
    this.time += dt;
    while (this.booms.length) { var bm = this.booms.shift(); this.explode(bm.x, bm.y, 2.6 + bm.k, 140 * bm.k, 22 * bm.k); }
    this.balls.forEach(function (u) { if (u.springV) { u.body.setLinearVelocity(u.springV); u.springV = null; u.mult = 1; } if (u.stopV) { u.body.setLinearVelocity(u.stopV); u.body.setAngularVelocity(0); u.stopV = null; } });
    // cadenas y cuerdas: se rompen con un tirón muy fuerte o si muere una de sus piezas
    this.ties.forEach(function (T) {
      if (!T.j || T.broken) return;
      if (T.A.dead || T.B.dead || T.j.getReactionForce(1 / dt).length() > T.lim * 60) { if (!T.A.dead && !T.B.dead) self.world.destroyJoint(T.j); T.broken = true; T.j = null; self.events.push({ t: 'weldbreak' }); }
    });
    this.shells = this.shells.filter(function (sh) { sh.t += dt; if (sh.t > 2.5 || sh.body.getPosition().y < -2) { self.dead.push(sh.body); return false; } return true; });
    // romper soldaduras sobrecargadas
    this.joints = this.joints.filter(function (J) {
      if (!J.j) return false;
      var f = J.j.getReactionForce(1 / dt).length();
      if (f > J.lim * 60) { self.world.destroyJoint(J.j); self.events.push({ t: 'weldbreak' }); return false; }
      return true;
    });
    // gemas desplazadas o caídas
    this.gems.forEach(function (g) {
      if (g.freed) return; var p = g.body.getPosition();
      if (Math.hypot(p.x - g.x0, p.y - g.y0) > 1.3 || p.y < g.y0 - 0.9) self.freeGem(g);
    });
    // bloques que caen fuera
    this.blocks.forEach(function (u) { if (!u.dead && u.body.getPosition().y < -6) { u.dead = true; self.dead.push(u.body); } });
    var seen = new Set();
    this.dead.forEach(function (b) { if (!seen.has(b)) { seen.add(b); self.world.destroyBody(b); } });
    this.dead = [];
    this.balls = this.balls.filter(function (u) { return !u.dead; });
  };

  // trampas: muelle (en pre-solve), ventilador, torreta, escudo y gema trampa
  Phys.prototype.stepTraps = function (dt) {
    var self = this, balls = this.balls.filter(function (u) { return !u.dead; });
    this.traps.forEach(function (t) {
      if (t.dead) return; t.cd -= dt; t.fr = Math.max(0, t.fr - dt); if (t.up) t.upT = (t.upT || 0) + dt;
      var tp = t.body.getPosition(), dir = t.p.flip ? 1 : -1;
      balls.forEach(function (u) {
        var b = u.body, q = b.getPosition(), dx = q.x - tp.x, dy = q.y - tp.y, d = Math.hypot(dx, dy);
        if (t.trap === 'fan' && (t.p.rot === 1 || t.p.rot === 5)) { // colgado de una pared: sopla hacia arriba
          if (dy > 0 && dy < 7 && Math.abs(dx) < 1.8) { var ku = 1 - dy / 7; b.applyForceToCenter(V(-8 * b.getMass() * ku, 55 * b.getMass() * ku), true); t.fr = 0.3; }
        } else if (t.trap === 'fan') {
          var ahead = dx * dir;
          if (ahead > 0 && ahead < 7 && Math.abs(dy) < 1.8) { var k = 1 - ahead / 7; b.applyForceToCenter(V(dir * 45 * b.getMass() * k, 4 * b.getMass() * k), true); t.fr = 0.3; if (Math.random() < 0.3) self.events.push({ t: 'wind', x: tp.x + dir * (0.8 + Math.random() * ahead), y: tp.y + (Math.random() - 0.5), dir: dir }); }
        } else if (t.trap === 'turret' && t.shots < 3 && t.cd <= 0 && d < 10 && d > 1.2 && !u.child) {
          var sp = 19, tt = d / sp, vx = b.getLinearVelocity();
          var ax = q.x + vx.x * tt * 0.7 - tp.x, ay = q.y + vx.y * tt * 0.7 - 0.5 * RS.PHYS.gravity * tt * tt * 0.6 - (tp.y + 0.2), n = Math.hypot(ax, ay) || 1;
          var sb = self.world.createBody({ type: 'dynamic', position: V(tp.x + ax / n * 0.7, tp.y + 0.2 + ay / n * 0.7), bullet: true });
          sb.createFixture(pl.Circle(0.2), { density: 6, restitution: 0.2 });
          sb.setLinearVelocity(V(ax / n * sp, ay / n * sp)); sb.setUserData({ shell: true });
          self.shells.push({ body: sb, t: 0 }); t.shots++; t.cd = 1.1; t.fr = 0.4;
          self.events.push({ t: 'turret', x: tp.x + ax / n * 0.8, y: tp.y + 0.2 + ay / n * 0.8, a: Math.atan2(ay, ax) });
        } else if (t.trap === 'shield' && !t.popped && d < 1.5) {
          t.popped = true; // la burbuja se gasta y se rompe; el generador apagado se queda
          var ex = dx / (d || 1), ey = dy / (d || 1); b.setLinearVelocity(V(ex * 9 - 2, Math.max(3, ey * 6 + 4))); u.mult = 0.3; // rebota hacia fuera
          self.events.push({ t: 'shield', x: tp.x, y: tp.y });
        } else if (t.trap === 'magnet' && (t.energy == null ? (t.energy = 1.6) : t.energy) > 0 && d < 5 && d > 0.4) {
          var km = (1 - d / 5); t.energy -= dt; t.fr = 0.3;
          b.applyForceToCenter(V(-dx / d * 40 * b.getMass() * km, (-dy / d * 40 - 25) * b.getMass() * km), true); // tira del armadillo hacia el imán y hacia abajo
        } else if (t.trap === 'spikes' && !t.up && d < 3.2) { t.up = 1; t.upT = 0;
        } else if (t.trap === 'tar' && Math.abs(dx) < 1 && dy > -0.3 && dy < 0.35 + u.r) {
          var tv = b.getLinearVelocity(); if (!u.tarred) { u.tarred = true; t.fr = 0.6; self.events.push({ t: 'tar', x: tp.x, y: tp.y }); }
          b.setLinearVelocity(V(tv.x * 0.2, Math.min(0, tv.y) * 0.2)); b.setAngularVelocity(0); u.mult = 0.1; b.getFixtureList().setRestitution(0); // se queda pegado
        } else if (t.trap === 'wall' && !t.up && dx < 0 && dx > -7 && Math.abs(dy) < 5) {
          t.up = 1; t.upT = 0; var bd = t.body; bd.destroyFixture(bd.getFixtureList()); var sh = RS.SHAPES[t.s], M = RS.MATS[t.m];
          bd.createFixture(pl.Box(0.8, sh.h / 2, V(0, 0), 0), { density: M.dens * 5, friction: 0.9, restitution: M.rest }); bd.setAwake(true); // sube el muro (pesado: aguanta el golpe)
          self.events.push({ t: 'wallup', x: tp.x, y: tp.y });
        } else if (t.trap === 'decoy' && d < 1.25) {
          t.dead = true; self.dead.push(t.body);
          balls.forEach(function (o) { var r = o.body.getPosition(), ex = r.x - tp.x, ey = r.y - tp.y, e = Math.hypot(ex, ey) || 1; if (e < 4) o.body.setLinearVelocity(V(-Math.abs(ex / e) * 14 - 4, Math.abs(ey / e) * 6 + 7)); o.mult = 0.5; });
          self.events.push({ t: 'explode', x: tp.x, y: tp.y });
        }
      });
    });
  };

  Phys.prototype.activeBall = function () { return this.balls.filter(function (u) { return !u.child; })[0] || this.balls[0]; };

  Phys.prototype.settled = function () {
    var moving = 0;
    for (var b = this.world.getBodyList(); b; b = b.getNext()) {
      if (b.isStatic()) continue;
      var ud = b.getUserData(); if (ud && ud.rac && (ud.flying || ud.ko)) continue;
      if (b.getLinearVelocity().length() > 0.25 || Math.abs(b.getAngularVelocity()) > 0.4) moving++;
    }
    return moving === 0;
  };

  Phys.prototype.drain = function () { var e = this.events; this.events = []; return e; };
})(RS, planck);
if (typeof module !== 'undefined') module.exports = RS;
