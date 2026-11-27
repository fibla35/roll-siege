// Mi fortaleza: constructor con rejilla, prueba de gravedad, soldaduras, gemas, decoración, pintura y cartel.
(function (RS) {
  var GW = 22, GH = 10, BUDGET = 160;
  RS.BUILD = { GW: GW, GH: GH, BUDGET: BUDGET };
  RS.PAINTS = [null, 'rgba(200,40,40,0.35)', 'rgba(40,90,200,0.35)', 'rgba(30,160,90,0.35)', 'rgba(240,190,30,0.38)', 'rgba(140,60,190,0.35)', 'rgba(20,20,20,0.4)', 'rgba(255,255,255,0.35)'];

  function Builder(canvas, opts) {
    this.cv = canvas; this.ctx = canvas.getContext('2d'); this.o = opts;
    this.clan = opts.clan; this.style = opts.clan;
    var L = opts.layout || { pieces: [], gems: [], deco: [], sign: null };
    this.L = JSON.parse(JSON.stringify(L)); this.L.deco = this.L.deco || []; this.L.gems = this.L.gems || [];
    this.shape = 0; this.mat = 0; this.rot = 0; this.flip = false; this.tool = 'place'; this.paint = 1; this.decoIdx = 0;
    this.ghost = null; this.sim = null; this.marks = null; this.stable = !!opts.stable; this.t = 0;
    this.resize(); this.bind();
    var self = this; this.last = performance.now();
    this.raf = requestAnimationFrame(function f(t) { if (self.dead) return; var dt = Math.min(0.05, (t - self.last) / 1000); self.last = t; self.update(dt); self.draw(); self.raf = requestAnimationFrame(f); });
  }
  RS.Builder = Builder;
  Builder.prototype.destroy = function () { this.dead = true; cancelAnimationFrame(this.raf); this.cv.removeEventListener('pointerdown', this._d); removeEventListener('pointermove', this._m); removeEventListener('pointerup', this._u); removeEventListener('resize', this._r); };
  Builder.prototype.resize = function () {
    var d = Math.min(2, devicePixelRatio || 1); this.dpr = d; this.cv.width = innerWidth * d; this.cv.height = innerHeight * d; this.W = this.cv.width; this.H = this.cv.height;
    var top = this.H * 0.12, bot = this.H * 0.25;
    this.s = Math.min((this.W * 0.97) / (GW + 1), (this.H - top - bot) / (GH + 0.3));
    this.ox = (this.W - GW * this.s) / 2; this.oy = this.H - bot;
  };
  Builder.prototype.sx = function (x) { return this.ox + x * this.s; };
  Builder.prototype.sy = function (y) { return this.oy - y * this.s; };
  Builder.prototype.wx = function (px) { return (px - this.ox) / this.s; };
  Builder.prototype.wy = function (py) { return (this.oy - py) / this.s; };

  Builder.prototype.bind = function () {
    var self = this;
    this._d = function (e) { self.down = true; self.move(e); };
    this._m = function (e) { self.move(e); };
    this._u = function (e) { if (self.down) { self.down = false; self.tap(e); } };
    this._r = function () { self.resize(); };
    this.cv.addEventListener('pointerdown', this._d); addEventListener('pointermove', this._m); addEventListener('pointerup', this._u); addEventListener('resize', this._r);
  };

  Builder.prototype.cost = function () { return this.L.pieces.reduce(function (a, p) { return a + RS.MATS[p.m].cost * (RS.SHAPES[p.s].w * RS.SHAPES[p.s].h >= 2 ? 2 : 1) + (p.weld ? 1 : 0); }, 0); };

  Builder.prototype.snapPiece = function (x, y) {
    var p = { s: this.shape, m: this.mat, rot: this.rot, flip: this.flip }, z = RS.pieceSize(p);
    var x0 = Math.round((x - z.w / 2) * 2) / 2, y0 = Math.max(0, Math.round((y - z.h / 2) * 2) / 2);
    p.x = x0 + z.w / 2; p.y = y0 + z.h / 2; return p;
  };
  Builder.prototype.overlaps = function (p, ignore) {
    var a = RS.pieceAABB(p);
    if (a.x0 < -0.01 || a.x1 > GW + 0.01 || a.y0 < -0.01 || a.y1 > GH + 0.01) return true;
    return this.L.pieces.some(function (q) {
      if (q === ignore) return false; var b = RS.pieceAABB(q);
      return Math.min(a.x1, b.x1) - Math.max(a.x0, b.x0) > 0.02 && Math.min(a.y1, b.y1) - Math.max(a.y0, b.y0) > 0.02;
    }) || this.L.gems.some(function (g) { return g.x > a.x0 && g.x < a.x1 && g.y > a.y0 && g.y < a.y1; });
  };
  Builder.prototype.pieceAt = function (x, y) {
    for (var i = this.L.pieces.length - 1; i >= 0; i--) { var a = RS.pieceAABB(this.L.pieces[i]); if (x >= a.x0 && x <= a.x1 && y >= a.y0 && y <= a.y1) return this.L.pieces[i]; }
    return null;
  };

  Builder.prototype.move = function (e) {
    if (this.sim) return;
    var x = this.wx(e.clientX * this.dpr), y = this.wy(e.clientY * this.dpr);
    if (this.tool === 'place') { var p = this.snapPiece(x, y); p.ok = !this.overlaps(p) && this.cost() + RS.MATS[p.m].cost <= BUDGET; this.ghost = p; }
    else this.ghost = { tool: this.tool, x: x, y: y };
  };
  Builder.prototype.changed = function () { this.stable = false; this.marks = null; if (this.o.onChange) this.o.onChange(); };
  Builder.prototype.tap = function (e) {
    if (this.sim) return;
    var x = this.wx(e.clientX * this.dpr), y = this.wy(e.clientY * this.dpr);
    if (y < -1 || x < -2 || x > GW + 2) return;
    var hit = this.pieceAt(x, y);
    if (this.tool === 'place') {
      var p = this.snapPiece(x, y);
      if (this.overlaps(p)) { RS.Audio.sfx('stone_hit', 0.3); return this.toast('No cabe ahí'); }
      if (this.cost() + RS.MATS[p.m].cost > BUDGET) return this.toast('Sin puntos de construcción');
      this.L.pieces.push(p); RS.Audio.sfx('place', 0.6); this.changed();
    } else if (this.tool === 'erase') {
      var gi = this.L.gems.findIndex(function (g) { return Math.hypot(g.x - x, g.y - y) < 0.5; });
      var di = this.L.deco.findIndex(function (d) { return Math.abs(d.x - x) < d.w / 2 && y > d.y && y < d.y + d.w; });
      if (gi >= 0) this.L.gems.splice(gi, 1);
      else if (hit) this.L.pieces.splice(this.L.pieces.indexOf(hit), 1);
      else if (this.L.sign && Math.abs(this.L.sign.x - x) < 1.5 && Math.abs(this.L.sign.y + 0.5 - y) < 0.8) this.L.sign = null;
      else if (di >= 0) this.L.deco.splice(di, 1);
      else return;
      RS.Audio.sfx('wood_hit', 0.5); this.changed();
    } else if (this.tool === 'weld') { if (hit) { hit.weld = !hit.weld; RS.Audio.sfx('metal_hit', 0.4); this.changed(); } }
    else if (this.tool === 'paint') { if (hit) { hit.tint = RS.PAINTS[this.paint]; RS.Audio.sfx('pour', 0.4); if (this.o.onChange) this.o.onChange(); } }
    else if (this.tool === 'swap') { if (hit) { hit.m = this.mat; RS.Audio.sfx('place', 0.5); this.changed(); } }
    else if (this.tool === 'gem') {
      if (this.L.gems.length >= 3) return this.toast('Máximo 3 gemas');
      var gx = Math.round(x * 2) / 2, floor = 0;
      this.L.pieces.forEach(function (q) { var a = RS.pieceAABB(q); if (gx > a.x0 - 0.2 && gx < a.x1 + 0.2 && a.y1 <= y + 0.3 && a.y1 > floor) floor = a.y1; });
      var gy = floor + 0.34; // la gema cae y se apoya en lo que haya debajo
      if (this.pieceAt(gx, gy)) return this.toast('Ponla en un hueco, no dentro de una pieza');
      this.L.gems.push({ x: gx, y: gy, c: this.L.gems.length }); RS.Audio.sfx('gem', 0.5); this.changed();
    } else if (this.tool === 'deco') {
      var sheet = 'deco_' + this.clan, w = 1.6;
      this.L.deco.push({ d: this.decoIdx, x: Math.round(x * 2) / 2, y: Math.max(0, Math.round(y * 2) / 2), w: w }); RS.Audio.sfx('place', 0.5); if (this.o.onChange) this.o.onChange();
    } else if (this.tool === 'sign') {
      this.L.sign = { x: Math.round(x * 2) / 2, y: Math.max(0, Math.round(y * 2) / 2), name: (this.L.sign && this.L.sign.name) || this.o.name || 'Mi fortaleza' };
      RS.Audio.sfx('place', 0.5); if (this.o.onChange) this.o.onChange();
    }
  };
  Builder.prototype.toast = function (t) { this.msg = { t: t, time: 1.6 }; };

  // prueba de gravedad: se ve en directo
  Builder.prototype.testGravity = function (cb) {
    if (!this.L.pieces.length) return this.toast('Coloca alguna pieza primero');
    var lay = { pieces: this.L.pieces, gems: this.L.gems.map(function (g) { return { x: g.x, y: g.y, c: g.c }; }) };
    this.sim = { P: new RS.Phys(lay), t: 0, cb: cb };
  };
  Builder.prototype.update = function (dt) {
    this.t += dt; if (this.msg) { this.msg.time -= dt; if (this.msg.time <= 0) this.msg = null; }
    if (!this.sim) return;
    var S = this.sim; S.P.step(1 / 60); S.P.step(1 / 60); S.t += 2 / 60; S.P.drain();
    if (S.t > 4) {
      var marks = [], bad = 0;
      S.P.blocks.forEach(function (u) {
        var d = u.dead ? 9 : Math.hypot(u.body.getPosition().x - u.p.x, u.body.getPosition().y - u.p.y) + Math.abs(u.body.getAngle()) * 0.5;
        var lvl = d > 0.25 ? 2 : d > 0.06 ? 1 : 0; if (lvl === 2) bad++;
        marks.push(lvl);
      });
      var gemsLost = S.P.gems.filter(function (g) { return g.freed; }).length;
      this.marks = marks; this.stable = bad === 0 && gemsLost === 0; this.sim = null;
      this.toast(this.stable ? '¡Estable! Ya puedes guardar' : (bad ? bad + ' piezas se caen' : 'Una gema se cae'));
      RS.Audio.sfx(this.stable ? 'star' : 'stone_break', 0.6);
      if (S.cb) S.cb(this.stable);
    }
  };

  Builder.prototype.draw = function () {
    var ctx = this.ctx, W = this.W, H = this.H, s = this.s, self = this;
    var far = RS.img['bg_' + this.clan];
    if (far) { var fs = Math.max(W / far.width, H / far.height); ctx.drawImage(far, (W - far.width * fs) / 2, (H - far.height * fs) / 2, far.width * fs, far.height * fs); }
    var mid = RS.img['bg_' + this.clan + '_mid'];
    if (mid) { var mh = 6 * s, mw = mid.width * mh / mid.height; for (var x = -mw / 3; x < W; x += mw - 1) ctx.drawImage(mid, x, this.sy(0) - mh + 0.3 * s, mw, mh); }
    var gr = RS.img['bg_' + this.clan + '_ground'];
    if (gr) { var gh = 3 * s, gw = gr.width * gh / gr.height; for (var x2 = 0; x2 < W; x2 += gw - 1) ctx.drawImage(gr, x2, this.sy(0) - gh * 0.1, gw, gh); ctx.fillStyle = '#2a1a10'; ctx.fillRect(0, this.sy(0) + gh * 0.88, W, H); }
    // rejilla
    ctx.save(); ctx.strokeStyle = 'rgba(255,255,255,0.18)'; ctx.lineWidth = 1;
    for (var gx = 0; gx <= GW; gx++) { ctx.beginPath(); ctx.moveTo(this.sx(gx), this.sy(0)); ctx.lineTo(this.sx(gx), this.sy(GH)); ctx.stroke(); }
    for (var gy = 0; gy <= GH; gy++) { ctx.beginPath(); ctx.moveTo(this.sx(0), this.sy(gy)); ctx.lineTo(this.sx(GW), this.sy(gy)); ctx.stroke(); }
    ctx.strokeStyle = 'rgba(255,230,120,0.6)'; ctx.lineWidth = 2 * this.dpr; ctx.strokeRect(this.sx(0), this.sy(GH), GW * s, GH * s); ctx.restore();
    // decoración (detrás)
    this.L.deco.forEach(function (d) { var sh = 'deco_' + self.clan, a = RS.spAspect(sh, d.d), w = d.w * s, h = w / a; RS.drawSp(ctx, sh, d.d, self.sx(d.x), self.sy(d.y) - h / 2, w, h); });
    // piezas
    if (this.sim) {
      this.sim.P.blocks.forEach(function (u) { if (u.dead) return; var p = u.body.getPosition(); RS.drawBlock(ctx, self.style, u.p, false, self.sx(p.x), self.sy(p.y), -u.body.getAngle(), s, null, u.p.tint); });
      this.sim.P.gems.forEach(function (g) { if (g.freed) return; var p = g.body.getPosition(); RS.drawSp(ctx, 'items', 6 + g.c, self.sx(p.x), self.sy(p.y), 0.75 * s, 0.75 * s); });
    } else {
      this.L.pieces.forEach(function (p, i) {
        RS.drawBlock(ctx, self.style, p, false, self.sx(p.x), self.sy(p.y), -(p.rot || 0) * Math.PI / 2, s, null, p.tint);
        if (p.weld) { ctx.fillStyle = '#c9cfd6'; ctx.strokeStyle = '#333'; [[-1, -1], [1, -1], [-1, 1], [1, 1]].forEach(function (c) { var z = RS.pieceSize(p); ctx.beginPath(); ctx.arc(self.sx(p.x + c[0] * (z.w / 2 - 0.15)), self.sy(p.y + c[1] * (z.h / 2 - 0.12)), 0.08 * s, 0, 7); ctx.fill(); ctx.stroke(); }); }
        if (self.marks && self.marks[i]) { var a = RS.pieceAABB(p); ctx.fillStyle = self.marks[i] === 2 ? 'rgba(255,40,40,0.45)' : 'rgba(255,210,40,0.4)'; ctx.fillRect(self.sx(a.x0), self.sy(a.y1), (a.x1 - a.x0) * s, (a.y1 - a.y0) * s); }
      });
      this.L.gems.forEach(function (g) { RS.drawSp(ctx, 'items', 6 + g.c, self.sx(g.x), self.sy(g.y), 0.75 * s, 0.75 * s); });
    }
    // cartel con el nombre
    if (this.L.sign) {
      var sg = this.L.sign, sh = 'deco_' + this.clan, idx = RS.CLANS[this.clan].sign, w = 3.2 * s, h = w / RS.spAspect(sh, idx);
      RS.drawSp(ctx, sh, idx, this.sx(sg.x), this.sy(sg.y) - h / 2, w, h);
      ctx.save(); ctx.font = Math.round(h * 0.26) + 'px Lilita, sans-serif'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
      ctx.fillStyle = '#fff4d6'; ctx.strokeStyle = '#3a1e0a'; ctx.lineWidth = 4 * this.dpr;
      ctx.strokeText(sg.name, this.sx(sg.x), this.sy(sg.y) - h * 0.5); ctx.fillText(sg.name, this.sx(sg.x), this.sy(sg.y) - h * 0.5); ctx.restore();
    }
    // fantasma
    var gh2 = this.ghost;
    if (gh2 && !this.sim) {
      if (this.tool === 'place') { RS.drawBlock(ctx, this.style, gh2, false, this.sx(gh2.x), this.sy(gh2.y), -gh2.rot * Math.PI / 2, s, 0.55); var a2 = RS.pieceAABB(gh2); ctx.strokeStyle = gh2.ok ? '#5f5' : '#f44'; ctx.lineWidth = 3 * this.dpr; ctx.strokeRect(this.sx(a2.x0), this.sy(a2.y1), (a2.x1 - a2.x0) * s, (a2.y1 - a2.y0) * s); }
      else { ctx.strokeStyle = '#fff'; ctx.lineWidth = 2 * this.dpr; ctx.beginPath(); ctx.arc(this.sx(gh2.x), this.sy(gh2.y), 0.4 * s, 0, 7); ctx.stroke(); }
    }
    if (this.msg) { ctx.save(); ctx.font = (24 * this.dpr) + 'px Lilita, sans-serif'; ctx.textAlign = 'center'; ctx.fillStyle = 'rgba(0,0,0,0.6)'; var tw = ctx.measureText(this.msg.t).width + 40 * this.dpr; ctx.fillRect(W / 2 - tw / 2, H * 0.12, tw, 44 * this.dpr); ctx.fillStyle = '#fff'; ctx.fillText(this.msg.t, W / 2, H * 0.12 + 30 * this.dpr); ctx.restore(); }
  };
})(RS);
