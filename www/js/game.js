// Partida: dibujo, cámara, cañón de pólvora, cola de armadillos, efectos y final del nivel.
(function (RS) {
  var TAU = Math.PI * 2;
  RS.img = {}; RS.atlas = {};

  RS.drawSp = function (ctx, sheet, idx, x, y, w, h, ang, flip, alpha) {
    var im = RS.img[sheet], r = RS.atlas[sheet] && RS.atlas[sheet][idx];
    if (!im || !r) return;
    ctx.save(); ctx.translate(x, y); if (ang) ctx.rotate(ang); if (flip) ctx.scale(-1, 1);
    if (alpha != null) ctx.globalAlpha = alpha;
    ctx.drawImage(im, r[0], r[1], r[2], r[3], -w / 2, -h / 2, w, h);
    ctx.restore();
  };
  RS.spAspect = function (sheet, idx) { var r = RS.atlas[sheet] && RS.atlas[sheet][idx]; return r ? r[2] / r[3] : 1; };
  RS.blockSprite = function (style, m, s, broken) {
    var half = m % 2, row = (s < 4 ? 0 : 1) + (broken ? 2 : 0), col = (s % 4) + half * 4;
    return { sheet: 'blk_' + style + Math.floor(m / 2), idx: row * 8 + col };
  };
  // pieza alargada: extremos sin deformar y tramo central estirado; piezas especiales con su sprite
  var tmp = null;
  RS.drawBlock = function (ctx, style, p, broken, x, y, ang, sc, alpha, tint, fr) {
    var s = RS.SHAPES[p.s];
    if (s.sprite) {
      var sh = s.sprite[0], idx = fr != null ? fr : s.sprite[1], a = RS.spAspect(sh, idx);
      var bw = s.w * sc, bh = s.h * sc, w = bw, h = w / a;
      if (h > bh) { h = bh; w = h * a; }
      if (s.kind === 'brace' || s.kind === 'poly') { w = bw; h = bh; }
      ctx.save(); ctx.translate(x, y); ctx.rotate(ang); if (p.flip) ctx.scale(-1, 1);
      if (alpha != null) ctx.globalAlpha = alpha;
      if (broken) ctx.filter = 'brightness(0.75) saturate(0.7)';
      RS.drawSp(ctx, sh, idx, 0, bh / 2 - h / 2, w, h);
      ctx.restore();
      return;
    }
    var sp = RS.blockSprite(style, p.m, p.s, broken);
    var im = RS.img[sp.sheet], r = RS.atlas[sp.sheet] && RS.atlas[sp.sheet][sp.idx];
    if (!im || !r) return;
    var w2 = s.w * sc, h2 = s.h * sc, c = ctx, ox = 0, oy = 0;
    if (tint) { // se pinta en un lienzo aparte para que el color no manche el fondo
      tmp = tmp || document.createElement('canvas');
      tmp.width = Math.ceil(w2) + 2; tmp.height = Math.ceil(h2) + 2; c = tmp.getContext('2d'); ox = tmp.width / 2; oy = tmp.height / 2;
    } else { ctx.save(); ctx.translate(x, y); ctx.rotate(ang); if (p.flip) ctx.scale(-1, 1); if (alpha != null) ctx.globalAlpha = alpha; }
    c.save(); c.translate(ox, oy);
    if (s.slice) {
      var cap = Math.min(r[3] * 0.9, r[2] * 0.3), dc = h2 * cap / r[3];
      c.drawImage(im, r[0], r[1], cap, r[3], -w2 / 2, -h2 / 2, dc, h2);
      c.drawImage(im, r[0] + cap, r[1], r[2] - 2 * cap, r[3], -w2 / 2 + dc - 0.5, -h2 / 2, w2 - 2 * dc + 1, h2);
      c.drawImage(im, r[0] + r[2] - cap, r[1], cap, r[3], w2 / 2 - dc, -h2 / 2, dc, h2);
    } else c.drawImage(im, r[0], r[1], r[2], r[3], -w2 / 2, -h2 / 2, w2, h2);
    if (tint) { c.globalCompositeOperation = 'source-atop'; c.fillStyle = tint; c.fillRect(-w2 / 2 - 1, -h2 / 2 - 1, w2 + 2, h2 + 2); }
    c.restore();
    if (tint) { ctx.save(); ctx.translate(x, y); ctx.rotate(ang); if (p.flip) ctx.scale(-1, 1); if (alpha != null) ctx.globalAlpha = alpha; ctx.drawImage(tmp, -tmp.width / 2, -tmp.height / 2); }
    ctx.restore();
  };

  function Game(canvas, level, opts) {
    this.cv = canvas; this.ctx = canvas.getContext('2d'); this.level = level; this.o = opts || {};
    this.style = this.o.style || 'bandido'; this.clan = this.o.clan || 'japon'; this.bg = this.o.bg || 'w1';
    this.cannonLvl = this.o.cannonLvl || 0;
    this.phys = new RS.Phys(level);
    this.queue = level.arms.map(function (a) { return { arm: a, used: false }; });
    this.sel = 0; this.state = 'aim'; this.parts = []; this.pops = []; this.shake = 0;
    this.aim = null; this.power = 0; this.angle = 0.6; this.recoil = 0; this.fireAnim = 0; this.flightT = 0; this.settleT = 0;
    this.cannonX = 0; this.clouds = []; this.t = 0; this.paused = false; this.ended = false;
    for (var i = 0; i < 6; i++) this.clouds.push({ i: i % 8, x: Math.random() * 60 - 10, y: 9 + Math.random() * 6, v: 0.2 + Math.random() * 0.4, s: 2 + Math.random() * 2 });
    this.resize(); this.camHome(true); this.intro = 1.6; this.cam.x = this.camMaxX(); this.camT.x = this.cam.x;
    this.bind(); this.last = performance.now(); this.acc = 0;
    var self = this; this.raf = requestAnimationFrame(function f(t) { if (self.dead) return; self.frame(t); self.raf = requestAnimationFrame(f); });
  }
  RS.Game = Game;

  Game.prototype.destroy = function () { this.dead = true; cancelAnimationFrame(this.raf); this.unbind(); };

  Game.prototype.resize = function () {
    var d = Math.min(2, window.devicePixelRatio || 1);
    this.dpr = d; this.cv.width = Math.round(RS.stage.w * d); this.cv.height = Math.round(RS.stage.h * d);
    this.W = this.cv.width; this.H = this.cv.height;
  };

  Game.prototype.camHome = function (snap) {
    var sc = this.baseScale();
    this.camT = { x: this.cannonX - 3.5 + this.W / 2 / sc, y: 0, s: sc, lift: 0 };
    if (snap) this.cam = { x: this.camT.x, y: 0, s: sc, lift: 0 };
  };
  Game.prototype.camMaxX = function () { return Math.max(this.camHomeX(), (this.level.end || 30) + 3 - this.W / 2 / this.cam.s); };
  Game.prototype.toS = function (x, y) { var c = this.cam; return { x: (x - c.x) * c.s + this.W / 2, y: this.H * 0.84 - (y - 0) * c.s + (c.y - this.H * 0.34 / c.s) * 0 }; };
  Game.prototype.sx = function (x) { return (x - this.cam.x) * this.cam.s + this.W / 2; };
  Game.prototype.sy = function (y) { return this.H * 0.86 - y * this.cam.s + this.camLift(); };
  Game.prototype.camLift = function () { return this.cam.lift || 0; };

  // ---------- cañón ----------
  Game.prototype.cannonGeo = function () {
    var lv = this.cannonLvl, sheet = 'can_' + this.clan;
    var bw = 2.5, bh = bw / RS.spAspect(sheet, lv);
    var tl = 2.9, th = tl / RS.spAspect(sheet, 4 + lv);
    var pivot = { x: this.cannonX + 0.1, y: bh * 0.78 };
    var dir = { x: Math.cos(this.angle), y: Math.sin(this.angle) };
    return { sheet: sheet, bw: bw, bh: bh, tl: tl, th: th, pivot: pivot, muzzle: { x: pivot.x + dir.x * tl * 0.56, y: pivot.y + dir.y * tl * 0.56 }, dir: dir };
  };

  // ---------- entrada ----------
  Game.prototype.bind = function () {
    var self = this;
    this._down = function (e) { self.onDown(e); }; this._move = function (e) { self.onMove(e); }; this._up = function (e) { self.onUp(e); };
    this._rs = function () { self.resize(); self.camHome(false); };
    this.cv.addEventListener('pointerdown', this._down); addEventListener('pointermove', this._move); addEventListener('pointerup', this._up);
    addEventListener('resize', this._rs);
  };
  Game.prototype.unbind = function () {
    this.cv.removeEventListener('pointerdown', this._down); removeEventListener('pointermove', this._move); removeEventListener('pointerup', this._up); removeEventListener('resize', this._rs);
  };
  Game.prototype.onDown = function (e) {
    if (this.paused || this.ended) return;
    var x = (e.clientX - RS.stage.x) * this.dpr, y = (e.clientY - RS.stage.y) * this.dpr;
    if (this.state === 'aim' && this.intro > 0) { this.intro = 0; }
    if (this.state === 'aim' && x > this.W * 0.55 && this.camMaxX() > this.camHomeX() + 0.5) { this.pan = { x0: x, cx0: this.cam.x, d: 0 }; return; }
    if (this.state === 'aim' && !this.queue[this.sel].used) { this.view = 0; this.aim = { sx: x, sy: y, cx: x, cy: y, full: 0 }; RS.Audio.sfx('click', 0.4); }
    else if (this.state === 'flight') {
      var b = this.phys.activeBall();
      if (b && !b.used) { var k = this.phys.ability(b); if (k) this.abilityFx(k, b); }
    }
  };
  Game.prototype.onMove = function (e) {
    if (this.pan) { this.pan.d = (this.pan.x0 - (e.clientX - RS.stage.x) * this.dpr) / this.cam.s; this.view = 2.5; return; }
    if (!this.aim) return;
    this.aim.cx = (e.clientX - RS.stage.x) * this.dpr; this.aim.cy = (e.clientY - RS.stage.y) * this.dpr;
    var dx = this.aim.sx - this.aim.cx, dy = this.aim.cy - this.aim.sy; // tirar hacia atrás → disparar hacia delante
    var len = Math.hypot(dx, dy);
    if (len < 8) return;
    var a = Math.atan2(dy, dx); if (dx < 0) a = dy > 0 ? Math.PI / 2 : -0.17;
    this.angle = Math.max(-0.17, Math.min(1.4, a));
    var p = Math.min(1, len / (this.H * 0.32));
    if (p > this.power + 0.04 && this.t - (this.pourT || 0) > 0.18) { RS.Audio.sfx('pour', 0.25 + p * 0.3); this.pourT = this.t; }
    this.power = p;
  };
  Game.prototype.onUp = function () {
    if (this.pan) { this.pan = null; this.view = 2.5; return; }
    if (!this.aim) return;
    var a = this.aim; this.aim = null;
    if (this.power < 0.12) { this.power = 0; return; }
    this.fire();
  };

  Game.prototype.selectArm = function (i) {
    if (this.state !== 'aim' || !this.queue[i] || this.queue[i].used) return;
    this.sel = i; RS.Audio.sfx('click', 0.5); if (this.o.onQueue) this.o.onQueue();
  };

  Game.prototype.fire = function () {
    var q = this.queue[this.sel]; if (!q || q.used) return;
    var over = this.overT > 0.45;
    var ang = this.angle + (over ? (Math.random() - 0.5) * 0.07 : 0);
    var g = this.cannonGeo();
    this.phys.launch(q.arm, g.muzzle, ang, this.power * (over ? 1.08 : 1));
    q.used = true; this.state = 'flight'; this.flightT = 0; this.recoil = 1; this.shake = 10 * this.dpr;
    RS.Audio.sfx('cannon', 0.9);
    this.parts.push({ fx: 'pow', fr: [6, 7, 8, 9, 10, 11], x: g.muzzle.x + g.dir.x * 0.9, y: g.muzzle.y + g.dir.y * 0.9, w: 2.4, life: 0.45, t: 0, ang: -ang });
    this.parts.push({ fx: 'pow', fr: [12, 13, 14, 15, 16, 17], x: g.muzzle.x, y: g.muzzle.y + 0.3, w: 2.2, life: 1.1, t: 0, vy: 0.6 });
    this.power = 0; this.overT = 0;
    if (this.o.onQueue) this.o.onQueue();
  };

  Game.prototype.abilityFx = function (kind, b) {
    var p = b.body.getPosition();
    var snd = { slam: 'whoosh', split: 'magic', drill: 'zap', boom: 'explode', bounce: 'bounce', magnet: 'magic', grow: 'magic', boomerang: 'whoosh', freeze: 'ice_break', meteor: 'explode', dash: 'zap', ghost: 'magic' }[kind];
    RS.Audio.sfx(snd, 0.8);
    this.parts.push({ fx: 'arm_abil', fr: [b.arm], x: p.x, y: p.y, w: 2.2, life: 0.35, t: 0, fade: true });
    if (kind === 'freeze') for (var i = 0; i < 8; i++) this.parts.push({ fx: 'fx', fr: [12, 13, 14, 15], x: p.x + (Math.random() - 0.5) * 6, y: p.y + (Math.random() - 0.5) * 5, w: 1.6, life: 0.7, t: 0 });
    if (this.o.onAbility) this.o.onAbility(kind);
  };

  // ---------- bucle ----------
  Game.prototype.frame = function (now) {
    var dt = Math.min(0.05, (now - this.last) / 1000); this.last = now;
    if (!this.paused) { this.acc += dt; while (this.acc >= 1 / 60) { this.update(1 / 60); this.acc -= 1 / 60; } }
    this.draw();
  };

  Game.prototype.update = function (dt) {
    this.t += dt; var P = this.phys;
    if (this.state !== 'end' || P.time < 60) P.step(dt);
    this.handleEvents(P.drain());
    if (this.aim && this.power >= 0.999) this.overT = (this.overT || 0) + dt; else this.overT = 0;
    this.recoil = Math.max(0, this.recoil - dt * 3); this.shake = Math.max(0, this.shake - dt * 40);
    this.clouds.forEach(function (c) { c.x += c.v * dt; if (c.x > 90) c.x = -20; });
    var self = this;
    this.parts = this.parts.filter(function (p) {
      p.t += dt; if (p.vx != null) { p.x += p.vx * dt; p.y += p.vy * dt; if (p.g) p.vy -= p.g * dt; p.ang = (p.ang || 0) + (p.va || 0) * dt; }
      else if (p.vy) p.y += p.vy * dt;
      return p.t < p.life;
    });
    this.pops = this.pops.filter(function (p) { p.t += dt; p.y += dt * 1.2; return p.t < 1.2; });
    // cámara
    if (this.state === 'flight') {
      this.flightT += dt;
      var b = P.activeBall();
      if (b) { var bp = b.body.getPosition(); this.camT = { x: Math.min(this.camMaxX(), Math.max(this.camHomeX(), bp.x + 2)), y: 0, s: this.baseScale(), lift: Math.max(0, (bp.y - 8) * this.baseScale()) }; }
      var endX = (this.level.end || 30) + 4; var alive = P.balls.filter(function (u) { var q = u.body.getPosition(); return u.rest < 1.0 && q.x < endX && q.x > -12; });
      if (!P.balls.length || !alive.length || this.flightT > 9) {
        P.balls.forEach(function (u) { var q = u.body.getPosition(); self.dust(q.x, q.y, 1.4); u.dead = true; P.dead.push(u.body); });
        this.state = 'settle'; this.settleT = 0;
      }
    } else if (this.state === 'settle') {
      this.settleT += dt;
      if ((P.settled() && this.settleT > 0.8) || this.settleT > 4.5) this.afterShot();
    } else if (this.state === 'aim') {
      if (this.intro > 0) { this.intro -= dt; this.camT = { x: this.camMaxX(), y: 0, s: this.baseScale(), lift: 0 }; if (this.intro <= 0) this.view = 0; }
      else if (this.pan) this.camT.x = Math.min(this.camMaxX(), Math.max(this.camHomeX(), this.pan.cx0 + this.pan.d));
      else if (!this.view) { this.camHome(false); }
      else this.view = Math.max(0, this.view - dt);
    }
    var c = this.cam, T = this.camT, k = Math.min(1, dt * 3.5);
    c.x += (T.x - c.x) * k; c.s += (T.s - c.s) * k; c.lift = (c.lift || 0) + ((T.lift || 0) - (c.lift || 0)) * k;
    if (this.o.onTick) this.o.onTick();
  };
  Game.prototype.baseScale = function () { var span = (this.level.end || 30) + 3 - (this.cannonX - 3.5); return Math.max(this.H / 12.5, Math.min(this.W / span, this.H / 9)); };
  Game.prototype.camHomeX = function () { return this.cannonX - 3.5 + this.W / 2 / this.cam.s; };

  Game.prototype.afterShot = function () {
    var P = this.phys;
    if (P.gemsLeft() === 0) return this.finish(true);
    var next = this.queue.findIndex(function (q) { return !q.used; });
    if (next < 0) return this.finish(false);
    this.sel = next; this.state = 'aim'; if (this.o.onQueue) this.o.onQueue();
  };

  Game.prototype.finish = function (win) {
    if (this.ended) return; this.ended = true; this.state = 'end';
    var left = this.queue.filter(function (q) { return !q.used; }).length;
    var bonus = win ? left * 1500 : 0, score = this.phys.score + bonus;
    var st = this.level.stars, stars = win ? 1 + (score >= st[1] ? 1 : 0) + (score >= st[2] ? 1 : 0) : 0;
    var destr = this.phys.totalValue ? this.phys.destroyedValue / this.phys.totalValue : 0;
    this.result = { win: win, stars: stars, score: score, bonus: bonus, left: left, destr: destr };
    RS.Audio.sfx(win ? 'star' : 'stone_hit', 0.6);
    var self = this; setTimeout(function () { if (self.o.onEnd) self.o.onEnd(self.result); }, 900);
  };

  // ---------- eventos de la física ----------
  Game.prototype.handleEvents = function (evs) {
    var self = this;
    evs.forEach(function (e) {
      var M = RS.MATS[e.m] || RS.MATS[0];
      if (e.t === 'break') {
        RS.Audio.sfx({ wood: 'wood_break', stone: 'stone_break', ice: 'ice_break', metal: 'metal_hit', glass: 'glass_break' }[M.sfx], 0.55);
        for (var i = 0; i < 5; i++) self.parts.push({ fx: 'items', fr: [M.debris], x: e.x + (Math.random() - 0.5), y: e.y + (Math.random() - 0.5), w: 0.45 + Math.random() * 0.3, vx: (Math.random() - 0.5) * 7, vy: Math.random() * 6 + 1, g: 14, va: (Math.random() - 0.5) * 12, life: 1.1, t: 0, fade: true });
        self.dust(e.x, e.y, 1.6); self.shake = Math.max(self.shake, 4 * self.dpr);
        self.pops.push({ x: e.x, y: e.y + 0.5, t: 0, txt: '+' + 100 * M.cost });
      } else if (e.t === 'crack') {
        RS.Audio.sfx({ wood: 'wood_hit', stone: 'stone_hit', ice: 'ice_break', metal: 'metal_hit', glass: 'glass_break' }[M.sfx], 0.35);
      } else if (e.t === 'hit') {
        if (e.d > 25) { self.parts.push({ fx: 'fx', fr: [8, 9, 10, 11], x: e.x, y: e.y, w: 1.3, life: 0.3, t: 0 }); RS.Audio.sfx({ wood: 'wood_hit', stone: 'stone_hit', ice: 'stone_hit', metal: 'metal_hit', glass: 'stone_hit' }[M.sfx], Math.min(0.5, e.d / 120)); }
      } else if (e.t === 'gem') {
        RS.Audio.sfx('gem', 0.8);
        self.parts.push({ fx: 'items', fr: [6 + e.c], x: e.x, y: e.y, w: 0.9, vx: -4, vy: 9, g: 6, life: 1.2, t: 0, fade: true });
        self.parts.push({ fx: 'fx', fr: [8, 9, 10, 11], x: e.x, y: e.y, w: 2, life: 0.4, t: 0 });
        self.pops.push({ x: e.x, y: e.y + 0.8, t: 0, txt: '+1000', gold: true });
        if (self.o.onQueue) self.o.onQueue();
      } else if (e.t === 'spring') { RS.Audio.sfx('bounce', 0.8); self.pops.push({ x: e.x, y: e.y + 1, t: 0, txt: '¡BOING!' });
      } else if (e.t === 'wind') { self.parts.push({ fx: 'fx', fr: [4, 5, 6, 7], x: e.x, y: e.y, w: 0.6, vx: e.dir * 9, vy: 0, life: 0.5, t: 0, fade: true });
      } else if (e.t === 'turret') { RS.Audio.sfx('cannon', 0.5); self.parts.push({ fx: 'pow', fr: [6, 7, 8, 9, 10, 11], x: e.x, y: e.y, w: 1.2, life: 0.3, t: 0, ang: -e.a });
      } else if (e.t === 'shield') { RS.Audio.sfx('glass_break', 0.8); self.parts.push({ fx: 'fx', fr: [12, 13, 14, 15], x: e.x, y: e.y, w: 4.6, life: 0.5, t: 0, fade: true }); self.pops.push({ x: e.x, y: e.y + 1.5, t: 0, txt: '¡Escudo!' });
      } else if (e.t === 'explode') {
        self.parts.push({ fx: 'fx', fr: [0, 1, 2, 3], x: e.x, y: e.y, w: 5.5, life: 0.6, t: 0 }); self.shake = 14 * self.dpr;
      } else if (e.t === 'weldbreak') RS.Audio.sfx('metal_hit', 0.4);
    });
  };
  Game.prototype.dust = function (x, y, w) { this.parts.push({ fx: 'fx', fr: [4, 5, 6, 7], x: x, y: y, w: w * 1.4, life: 0.6, t: 0 }); };

  // ---------- dibujo ----------
  Game.prototype.draw = function () {
    var ctx = this.ctx, W = this.W, H = this.H, c = this.cam, s = c.s, self = this;
    ctx.save();
    if (this.shake) ctx.translate((Math.random() - 0.5) * this.shake, (Math.random() - 0.5) * this.shake);
    // fondo lejano (cubre la pantalla)
    var far = RS.img['bg_' + this.bg];
    if (far) { var fs = Math.max(W / far.width, H / far.height) * 1.08, fw = far.width * fs, fh = far.height * fs; ctx.drawImage(far, -(c.x * 3 % 40) - 20, (H - fh) / 2 + (c.lift || 0) * 0.15, fw, fh); }
    else { ctx.fillStyle = '#7ab'; ctx.fillRect(0, 0, W, H); }
    // nubes
    this.clouds.forEach(function (cl) { RS.drawSp(ctx, 'clouds', cl.i, (cl.x - c.x * 0.3) * s * 0.6 + W / 2, self.sy(cl.y) * 0.85, cl.s * s * 1.4, cl.s * s * 1.4 / RS.spAspect('clouds', cl.i), 0, false, 0.9); });
    // capa media (parallax)
    var mid = RS.img['bg_' + this.bg + '_mid'];
    if (mid) {
      var mh = 6.5 * s, mw = mid.width * mh / mid.height, ox = -((c.x * 0.55 * s) % mw) - mw;
      for (var x = ox; x < W + mw; x += mw - 1) ctx.drawImage(mid, x, this.sy(0) - mh + 0.4 * s, mw, mh);
    }
    // suelo
    var gr = RS.img['bg_' + this.bg + '_ground'];
    if (gr) {
      var gh = 3.2 * s, gw = gr.width * gh / gr.height, gx = this.sx(-40), gy = this.sy(0) - gh * 0.1;
      for (var x2 = gx - gw * Math.floor((gx) / gw) - gw; x2 < W; x2 += gw - 1) ctx.drawImage(gr, x2, gy, gw, gh);
      ctx.fillStyle = '#2a1a10'; ctx.fillRect(0, gy + gh - 2, W, H);
    } else { ctx.fillStyle = '#5a4'; ctx.fillRect(0, this.sy(0), W, H); }
    // adornos y cartel (fortalezas de jugador)
    var L = this.level;
    (L.deco || []).forEach(function (d) { var sh = 'deco_' + self.style, a = RS.spAspect(sh, d.d), w = d.w * s, h = w / a; RS.drawSp(ctx, sh, d.d, self.sx(d.x), self.sy(d.y) - h / 2, w, h); });
    if (L.sign && RS.CLANS[this.style]) {
      var sg = L.sign, shs = 'deco_' + this.style, si = RS.CLANS[this.style].sign, sw = 3.2 * s, shh = sw / RS.spAspect(shs, si);
      RS.drawSp(ctx, shs, si, this.sx(sg.x), this.sy(sg.y) - shh / 2, sw, shh);
      ctx.save(); ctx.font = Math.round(shh * 0.26) + 'px Lilita, sans-serif'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.fillStyle = '#fff4d6'; ctx.strokeStyle = '#3a1e0a'; ctx.lineWidth = 3 * this.dpr;
      ctx.strokeText(sg.name, this.sx(sg.x), this.sy(sg.y) - shh * 0.5); ctx.fillText(sg.name, this.sx(sg.x), this.sy(sg.y) - shh * 0.5); ctx.restore();
    }
    // bloques
    this.phys.blocks.forEach(function (u) {
      if (u.dead) return; var b = u.body, p = b.getPosition();
      var an = RS.SHAPES[u.s].anim, fr = an ? an[u.trap === 'fan' ? (u.fr > 0 ? 1 + Math.floor(self.t * 14) % 2 : 0) : u.fr > 0.25 ? 1 : u.fr > 0 ? 2 : 0] : null;
      RS.drawBlock(ctx, self.style, u.p, u.hp < u.hp0 * 0.5, self.sx(p.x), self.sy(p.y), -b.getAngle(), s, null, u.frozen ? 'rgba(120,200,255,0.35)' : (u.p.tint || null), fr);
      if (u.trap === 'shield' && !u.popped) { ctx.save(); ctx.globalAlpha = 0.22 + 0.06 * Math.sin(self.t * 3); ctx.fillStyle = '#7fe8ff'; ctx.strokeStyle = '#bff6ff'; ctx.lineWidth = 3 * self.dpr; ctx.beginPath(); ctx.arc(self.sx(p.x), self.sy(p.y), 2.3 * s, 0, TAU); ctx.fill(); ctx.globalAlpha = 0.6; ctx.stroke(); ctx.restore(); }
    });
    // gemas
    this.phys.gems.forEach(function (g) {
      if (g.freed) return; var p = g.body.getPosition(), pulse = 1 + Math.sin(self.t * 4 + g.idx) * 0.05;
      ctx.save(); ctx.globalAlpha = 0.35 + 0.2 * Math.sin(self.t * 3 + g.idx); ctx.fillStyle = '#fff6a0';
      ctx.beginPath(); ctx.arc(self.sx(p.x), self.sy(p.y), 0.55 * s, 0, TAU); ctx.fill(); ctx.restore();
      RS.drawSp(ctx, 'items', 6 + g.c, self.sx(p.x), self.sy(p.y), 0.8 * s * pulse, 0.8 * s * pulse, -g.body.getAngle());
    });
    // cañón y armadillo en espera
    this.drawCannon(ctx);
    // bolas
    this.phys.balls.forEach(function (u) {
      var p = u.body.getPosition(), r = u.r * s * 2.15;
      if (u.fire && Math.random() < 0.6) self.parts.push({ fx: 'fx', fr: [1, 2, 3], x: p.x, y: p.y, w: u.r * 3, life: 0.3, t: 0 });
      if (u.drillT > 0) { ctx.save(); ctx.globalAlpha = 0.5; ctx.strokeStyle = '#ffcf40'; ctx.lineWidth = 4 * self.dpr; ctx.beginPath(); ctx.arc(self.sx(p.x), self.sy(p.y), r * 0.6, self.t * 20, self.t * 20 + 4); ctx.stroke(); ctx.restore(); }
      if (u.magT > 0) { ctx.save(); ctx.globalAlpha = 0.4; ctx.strokeStyle = '#ff5a5a'; ctx.lineWidth = 3 * self.dpr; for (var k = 1; k <= 3; k++) { ctx.beginPath(); ctx.arc(self.sx(p.x), self.sy(p.y), r * (0.6 + k * 0.5 + (self.t * 2 % 0.5)), 0, TAU); ctx.stroke(); } ctx.restore(); }
      RS.drawSp(ctx, 'arm_master', 12 + u.arm, self.sx(p.x), self.sy(p.y), r, r, -u.body.getAngle(), false, u.ghostT > 0 ? 0.45 : 1);
    });
    // balas de torreta
    this.phys.shells.forEach(function (sh) { var q = sh.body.getPosition(); ctx.fillStyle = '#222'; ctx.beginPath(); ctx.arc(self.sx(q.x), self.sy(q.y), 0.22 * s, 0, TAU); ctx.fill(); });
    // partículas
    this.parts.forEach(function (p) {
      var f = p.fr[Math.min(p.fr.length - 1, Math.floor(p.t / p.life * p.fr.length))];
      var w = p.w * s, h = w / RS.spAspect(p.fx, f);
      RS.drawSp(ctx, p.fx, f, self.sx(p.x), self.sy(p.y), w, h, p.ang || 0, false, p.fade ? Math.max(0, 1 - p.t / p.life) : 1);
    });
    // puntos de trayectoria y barra de pólvora
    if (this.state === 'aim') this.drawAim(ctx);
    // textos flotantes
    ctx.textAlign = 'center'; ctx.font = (22 * this.dpr) + 'px Lilita, sans-serif';
    this.pops.forEach(function (p) {
      ctx.globalAlpha = Math.max(0, 1 - p.t / 1.2); ctx.lineWidth = 4 * self.dpr; ctx.strokeStyle = '#3a1e0a';
      ctx.fillStyle = p.gold ? '#ffd84a' : '#fff'; ctx.strokeText(p.txt, self.sx(p.x), self.sy(p.y)); ctx.fillText(p.txt, self.sx(p.x), self.sy(p.y));
    });
    ctx.globalAlpha = 1; ctx.restore();
  };

  Game.prototype.drawCannon = function (ctx) {
    var g = this.cannonGeo(), s = this.cam.s, lv = this.cannonLvl, self = this;
    // armadillo esperando a la izquierda
    var q = this.queue[this.sel];
    if (q && !q.used && this.state !== 'flight') {
      var a = q.arm, sh = 'arm_anim' + Math.floor(a / 3), row = a % 3, f;
      if (this.ended) f = this.result && this.result.win ? 6 : 7;
      else if (this.aim) f = this.power > 0.5 ? 4 : 3;
      else { var cyc = this.t % 4; f = cyc < 0.15 ? 1 : (Math.floor(this.t * 1.5) % 2 ? 2 : 0); }
      var hgt = 1.5, idx = row * 8 + f, wdt = hgt * RS.spAspect(sh, idx);
      RS.drawSp(ctx, sh, idx, this.sx(this.cannonX - 2.1), this.sy(hgt / 2), wdt * s, hgt * s);
    } else if (this.ended && this.result) {
      var a2 = (this.queue.find(function (q) { return !q.used; }) || this.queue[0]).arm, sh2 = 'arm_anim' + Math.floor(a2 / 3), idx2 = (a2 % 3) * 8 + (this.result.win ? 6 : 7);
      RS.drawSp(ctx, sh2, idx2, this.sx(this.cannonX - 2.1), this.sy(0.75), 1.5 * s * RS.spAspect(sh2, idx2), 1.5 * s);
    }
    // tubo (gira al apuntar) y base
    var rc = this.recoil * 0.35, px = this.sx(g.pivot.x - g.dir.x * rc), py = this.sy(g.pivot.y - g.dir.y * rc);
    var tr = RS.atlas[g.sheet][4 + lv], ti = RS.img[g.sheet];
    if (ti && tr) {
      ctx.save(); ctx.translate(px, py); ctx.rotate(-this.angle);
      var tw = g.tl * s, th = g.th * s; ctx.drawImage(ti, tr[0], tr[1], tr[2], tr[3], -tw * 0.42, -th * 0.55, tw, th); ctx.restore();
    }
    RS.drawSp(ctx, g.sheet, lv, this.sx(this.cannonX), this.sy(g.bh / 2), g.bw * s, g.bh * s);
    if (this.aim) { var fr = 18 + Math.floor(this.t * 12) % 5; RS.drawSp(ctx, 'pow', fr, this.sx(g.pivot.x - g.dir.x * g.tl * 0.45), this.sy(g.pivot.y - g.dir.y * g.tl * 0.45 + 0.35), 0.9 * s, 0.9 * s); }
  };

  Game.prototype.drawAim = function (ctx) {
    var g = this.cannonGeo(), s = this.cam.s, dpr = this.dpr;
    if (this.aim && this.power > 0.05) {
      var v = RS.PHYS.vMax * this.power, n = Math.round(4 + this.power * 10);
      for (var i = 1; i <= n; i++) {
        var t = i * 0.075, x = g.muzzle.x + g.dir.x * v * t, y = g.muzzle.y + g.dir.y * v * t + 0.5 * RS.PHYS.gravity * t * t;
        RS.drawSp(ctx, 'pow', 4, this.sx(x), this.sy(y), (13 - i * 0.5) * dpr, (13 - i * 0.5) * dpr, 0, false, 1 - i / (n + 2));
      }
    }
    // barra de pólvora
    if (this.state !== 'aim' || this.ended) return;
    var bw = Math.min(this.W * 0.2, 230 * dpr), bh = bw / RS.spAspect('pow', 0), bx = 8 * dpr, by = this.H - bh - 6 * dpr;
    RS.drawSp(ctx, 'pow', 0, bx + bw / 2, by + bh / 2, bw, bh);
    var fr = RS.atlas.pow[1], im = RS.img.pow;
    if (im && this.power > 0) {
      var iw = bw * 0.86 * this.power, ih = bh * 0.5;
      ctx.drawImage(im, fr[0], fr[1], fr[2] * this.power, fr[3], bx + bw * 0.07, by + bh * 0.25, iw, ih);
      if (this.power > 0.95) { var fl = this.overT > 0.45 ? (Math.sin(this.t * 30) > 0 ? 1 : 0.4) : 1; RS.drawSp(ctx, 'pow', 2, bx + bw * 0.88, by + bh / 2, bh * 0.9, bh * 0.5, 0, false, fl); }
    }
  };
})(RS);
