// Física del juego (sin dibujo): construye la fortaleza, daño de bloques, gemas, disparo y habilidades.
// Se usa en el juego, en el constructor y en los tests de Node.
var RS = typeof RS !== 'undefined' ? RS : require('./data.js');
var planck = typeof planck !== 'undefined' ? planck : require('./planck.min.js');
(function (RS, pl) {
  var V = pl.Vec2;

  function pieceSize(p) { var s = RS.SHAPES[p.s]; return (p.rot % 2) ? { w: s.h, h: s.w } : { w: s.w, h: s.h }; }
  RS.pieceSize = pieceSize;
  RS.pieceAABB = function (p) { var z = pieceSize(p); return { x0: p.x - z.w / 2, x1: p.x + z.w / 2, y0: p.y - z.h / 2, y1: p.y + z.h / 2 }; };

  function addShapeFixtures(body, s, flip, fd) {
    if (s.kind === 'box') body.createFixture(pl.Box(s.w / 2, s.h / 2), fd);
    else if (s.kind === 'circle') body.createFixture(pl.Circle(s.r), fd);
    else if (s.kind === 'poly') body.createFixture(pl.Polygon(s.pts.map(function (q) { return V(flip ? -q[0] : q[0], q[1]); })), fd);
    else if (s.kind === 'L') {
      body.createFixture(pl.Box(0.16, 0.5, V(flip ? 0.34 : -0.34, 0), 0), fd);
      body.createFixture(pl.Box(0.5, 0.16, V(0, -0.34), 0), fd);
    } else if (s.kind === 'brace') body.createFixture(pl.Box(1.32, 0.14, V(0, 0), flip ? -Math.PI / 4 : Math.PI / 4), fd);
    else if (s.kind === 'arch') {
      body.createFixture(pl.Box(0.225, 0.3, V(-0.775, -0.2), 0), fd);
      body.createFixture(pl.Box(0.225, 0.3, V(0.775, -0.2), 0), fd);
      body.createFixture(pl.Box(1, 0.2, V(0, 0.3), 0), fd);
    }
  }

  function Phys(layout, opts) {
    opts = opts || {};
    var self = this;
    this.world = new pl.World({ gravity: V(0, RS.PHYS.gravity) });
    this.blocks = []; this.gems = []; this.balls = []; this.events = []; this.dead = []; this.joints = []; this.traps = []; this.shells = []; this.booms = [];
    this.time = 0; this.score = 0; this.destroyed = 0; this.totalValue = 0; this.destroyedValue = 0;
    this.noDamage = !!opts.noDamage;
    var ground = this.world.createBody({ type: 'static' });
    ground.createFixture(pl.Edge(V(-80, 0), V(300, 0)), { friction: 0.8 });
    ground.setUserData({ ground: true });
    this.ground = ground;
    (layout.pieces || []).forEach(function (p, i) { self.addPiece(p, i); });
    (layout.gems || []).forEach(function (g, i) { self.addGem(g, i); });
    if (!opts.noWeld) this.makeWelds(layout.pieces || []);
    this.world.on('post-solve', function (c, imp) { self.onPostSolve(c, imp); });
    this.world.on('pre-solve', function (c) { self.onPreSolve(c); });
  }
  RS.Phys = Phys;

  RS.pieceMat = function (p) { var s = RS.SHAPES[p.s]; return s.mat != null ? s.mat : p.m; };
  Phys.prototype.addPiece = function (p, i) {
    var s = RS.SHAPES[p.s], mi = RS.pieceMat(p), m = RS.MATS[mi];
    var b = this.world.createBody({ type: s.static ? 'static' : 'dynamic', position: V(p.x, p.y), angle: (p.rot || 0) * Math.PI / 2 });
    addShapeFixtures(b, s, p.flip, { density: m.dens * (s.dens || 1), friction: m.fr, restitution: m.rest });
    var hp = m.hp * (s.static ? 1.6 : 1) * (s.explosive ? 0.25 : 1);
    var ud = { block: true, p: p, idx: i, s: p.s, m: mi, hp: hp, hp0: hp, fragile: m.fragile || 1, frozen: false, body: b, trap: s.trap || null, cd: 0, shots: 0, fr: 0, explosive: s.explosive || 0 };
    if (s.trap) this.traps.push(ud);
    b.setUserData(ud); this.blocks.push(ud); this.totalValue += 100 * m.cost;
    return ud;
  };

  Phys.prototype.addGem = function (g, i) {
    var b = this.world.createBody({ type: 'dynamic', position: V(g.x, g.y) });
    b.createFixture(pl.Circle(0.33), { density: 0.7, friction: 0.5, restitution: 0.2 });
    var ud = { gem: true, idx: i, c: g.c || 0, x0: g.x, y0: g.y, freed: false, body: b };
    b.setUserData(ud); this.gems.push(ud);
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
      other.cd = 0.6; other.fr = 0.5; ball.springV = V(-Math.max(6, Math.abs(bv.x) * 0.85), Math.max(7, Math.abs(bv.y) * 0.5 + 6));
      this.events.push({ t: 'spring', x: other.body.getPosition().x, y: other.body.getPosition().y });
    }
    if (ball.ghostT > 0) { c.setEnabled(false); return; }
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
      if (!me.block) return;
      if (other && other.shell) return;
      var mult = (other && other.ball) ? other.mult : 1;
      var dmg = (n - 0.9) * 6 * mult * me.fragile;
      if (dmg > 2) self.damage(me, dmg, pt);
    });
  };

  Phys.prototype.damage = function (u, dmg, pt) {
    if (u.dead) return;
    var before = u.hp; u.hp -= dmg;
    if (before > u.hp0 * 0.5 && u.hp <= u.hp0 * 0.5 && u.hp > 0) this.events.push({ t: 'crack', m: u.m, u: u, x: pt.x, y: pt.y });
    else if (dmg > 6) this.events.push({ t: 'hit', m: u.m, x: pt.x, y: pt.y, d: dmg });
    if (u.hp <= 0) {
      u.dead = true; this.dead.push(u.body);
      var v = 100 * RS.MATS[u.m].cost; this.score += v; this.destroyedValue += v; this.destroyed++;
      var pos = u.body.getPosition();
      this.events.push({ t: 'break', m: u.m, s: u.s, x: pos.x, y: pos.y, a: u.body.getAngle(), u: u });
      if (u.explosive) this.booms.push({ x: pos.x, y: pos.y, k: u.explosive });
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

  Phys.prototype.ability = function (u) {
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
    this.world.step(dt, 8, 3);
    this.time += dt;
    while (this.booms.length) { var bm = this.booms.shift(); this.explode(bm.x, bm.y, 2.6 + bm.k, 140 * bm.k, 22 * bm.k); }
    this.balls.forEach(function (u) { if (u.springV) { u.body.setLinearVelocity(u.springV); u.springV = null; u.mult = 1; } });
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
      if (t.dead) return; t.cd -= dt; t.fr = Math.max(0, t.fr - dt);
      var tp = t.body.getPosition(), dir = t.p.flip ? 1 : -1;
      balls.forEach(function (u) {
        var b = u.body, q = b.getPosition(), dx = q.x - tp.x, dy = q.y - tp.y, d = Math.hypot(dx, dy);
        if (t.trap === 'fan') {
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
        } else if (t.trap === 'shield' && !t.popped && d < 2.3) {
          t.popped = true; var v = b.getLinearVelocity(); b.setLinearVelocity(V(v.x * 0.2, v.y * 0.2)); u.mult = 0.6;
          self.events.push({ t: 'shield', x: tp.x, y: tp.y });
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
      if (b.getLinearVelocity().length() > 0.25 || Math.abs(b.getAngularVelocity()) > 0.4) moving++;
    }
    return moving === 0;
  };

  Phys.prototype.drain = function () { var e = this.events; this.events = []; return e; };
})(RS, planck);
if (typeof module !== 'undefined') module.exports = RS;
