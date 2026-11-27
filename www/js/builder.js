// Mi fortaleza: constructor con varios pisos, zoom, plantillas, refuerzos, trampas, mover, deshacer,
// prueba de gravedad, soldaduras, gemas, adornos, pintura y cartel.
(function (RS) {
  var GW = 30, GH = 16;
  RS.BUILD = { GW: GW, GH: GH };
  RS.PAINTS = [null, 'rgba(200,40,40,0.35)', 'rgba(40,90,200,0.35)', 'rgba(30,160,90,0.35)', 'rgba(240,190,30,0.38)', 'rgba(140,60,190,0.35)', 'rgba(20,20,20,0.4)', 'rgba(255,255,255,0.35)'];
  RS.buildBudget = function (S, maxWorld) { return Math.min(480, 160 + 25 * ((maxWorld || 1) - 1) + Math.floor((S.trophies || 0) / 4)); };
  RS.pieceCost = function (p) {
    var s = RS.SHAPES[p.s];
    return (s.cost != null ? s.cost : RS.MATS[p.m].cost * (s.w * s.h >= 2 ? 2 : 1)) + (p.weld && !s.weld ? 1 : 0);
  };
  function I(id) { return RS.SHAPE_IDX[id]; }
  // plantillas: [forma, material (null = el elegido), x, y (centro, desde la esquina inferior izquierda), rot, flip, soldar]
  RS.TEMPLATES = [
    { id: 'piso4', name: 'Piso 4 m', w: 4, h: 2.5, ps: [['bloque', null, 0.5, 1, 1], ['bloque', null, 3.5, 1, 1], ['tablon', null, 2, 2.25]] },
    { id: 'piso6', name: 'Piso 6 m', w: 6, h: 2.5, ps: [['bloque', null, 0.5, 1, 1], ['bloque', null, 3, 1, 1], ['bloque', null, 5.5, 1, 1], ['viga', null, 3, 2.25]] },
    { id: 'pisor', name: 'Piso reforzado', w: 4, h: 2.5, ps: [['bloque', null, 0.5, 1, 1], ['bloque', null, 3.5, 1, 1], ['tablon', null, 2, 2.25, 0, 0, 1], ['escuadra', 3, 1.5, 1.5], ['escuadra', 3, 2.5, 1.5, 0, 1]] },
    { id: 'torre', name: 'Torre', w: 2, h: 4, ps: [['cubo', null, 0.5, 0.5], ['cubo', null, 1.5, 0.5], ['cubo', null, 0.5, 1.5], ['cubo', null, 1.5, 1.5], ['cubo', null, 0.5, 2.5], ['cubo', null, 1.5, 2.5], ['tejado', null, 1, 3.5]] },
    { id: 'muro', name: 'Muro', w: 4, h: 3, ps: [['bloque', null, 1, 0.5], ['bloque', null, 3, 0.5], ['cubo', null, 0.5, 1.5], ['bloque', null, 2, 1.5], ['cubo', null, 3.5, 1.5], ['bloque', null, 1, 2.5], ['bloque', null, 3, 2.5]] },
    { id: 'casa', name: 'Casa', w: 2, h: 3, ps: [['arco', null, 1, 0.5], ['bloque', null, 1, 1.5], ['tejado', null, 1, 2.5]] },
    { id: 'bunker', name: 'Búnker', w: 6, h: 2, ps: [['contrafuerte', 1, 1, 1], ['cimiento', 5, 3, 0.5], ['bloque', null, 3, 1.5], ['contrafuerte', 1, 5, 1, 0, 1]] },
    { id: 'puente', name: 'Puente', w: 6, h: 2.5, ps: [['arco', null, 1, 0.5], ['arco', null, 5, 0.5], ['cubo', null, 0.5, 1.5], ['cubo', null, 5.5, 1.5], ['viga', null, 3, 2.25]] },
    { id: 'almenas', name: 'Almenas', w: 4, h: 1.5, ps: [['tablon', null, 2, 0.25], ['cubo', null, 0.5, 1], ['cubo', null, 2, 1], ['cubo', null, 3.5, 1]] },
  ];

  function Builder(canvas, opts) {
    this.cv = canvas; this.ctx = canvas.getContext('2d'); this.o = opts;
    this.clan = opts.clan; this.style = opts.clan; this.budget = opts.budget || 160;
    var L = opts.layout || { pieces: [], gems: [], deco: [], sign: null };
    this.L = JSON.parse(JSON.stringify(L)); this.L.deco = this.L.deco || []; this.L.gems = this.L.gems || [];
    this.shape = 0; this.mat = 0; this.rot = 0; this.flip = false; this.tool = 'place'; this.paint = 1; this.decoIdx = 0; this.tpl = 0;
    this.cat = 'est'; this.hist = []; this.carry = null;
    this.ghost = null; this.sim = null; this.marks = null; this.stable = !!opts.stable; this.t = 0;
    this.z = 1.8; this.cx = -100; this.cy = 4.6; this.ptrs = {};
    this.resize(); this.bind();
    var self = this; this.last = performance.now();
    this.raf = requestAnimationFrame(function f(t) { if (self.dead) return; var dt = Math.min(0.05, (t - self.last) / 1000); self.last = t; self.update(dt); self.draw(); self.raf = requestAnimationFrame(f); });
  }
  RS.Builder = Builder;
  Builder.prototype.destroy = function () { this.dead = true; cancelAnimationFrame(this.raf); this.cv.removeEventListener('pointerdown', this._d); removeEventListener('pointermove', this._m); removeEventListener('pointerup', this._u); removeEventListener('pointercancel', this._u); this.cv.removeEventListener('wheel', this._w); removeEventListener('resize', this._r); };
  Builder.prototype.resize = function () {
    var d = Math.min(2, devicePixelRatio || 1); this.dpr = d; this.cv.width = RS.stage.w * d; this.cv.height = RS.stage.h * d; this.W = this.cv.width; this.H = this.cv.height;
    var bar = document.querySelector('#build .bbar'), bt = document.querySelector('#build .btop');
    this.top = bt && bt.offsetHeight ? (bt.offsetHeight + 4) * d : this.H * 0.12; this.bot = bar && bar.offsetHeight ? (bar.offsetHeight + 6) * d : this.H * 0.27;
    this.s0 = Math.min((this.W * 0.97) / (GW + 4.5), (this.H - this.top - this.bot) / (GH + 0.3));
    this.clampView();
  };
  Builder.prototype.clampView = function () {
    this.z = Math.max(1, Math.min(3.2, this.z)); this.s = this.s0 * this.z;
    var hw = this.W / 2 / this.s, hh = (this.H - this.top - this.bot) / 2 / this.s;
    this.cx = hw * 2 >= GW + 5 ? GW / 2 - 1.5 : Math.max(hw - 4, Math.min(GW + 1 - hw, this.cx));
    this.cy = hh * 2 >= GH + 1 ? GH / 2 : Math.max(hh - 0.6, Math.min(GH + 0.5 - hh, this.cy));
  };
  Builder.prototype.midY = function () { return this.top + (this.H - this.top - this.bot) / 2; };
  Builder.prototype.sx = function (x) { return this.W / 2 + (x - this.cx) * this.s; };
  Builder.prototype.sy = function (y) { return this.midY() - (y - this.cy) * this.s; };
  Builder.prototype.wx = function (px) { return (px - this.W / 2) / this.s + this.cx; };
  Builder.prototype.wy = function (py) { return (this.midY() - py) / this.s + this.cy; };
  Builder.prototype.zoom = function (k, px, py) {
    px = px == null ? this.W / 2 : px; py = py == null ? this.midY() : py;
    var x = this.wx(px), y = this.wy(py); this.z = Math.max(1, Math.min(3.2, this.z * k)); this.s = this.s0 * this.z;
    this.cx = x - (px - this.W / 2) / this.s; this.cy = y - (this.midY() - py) / this.s; this.clampView();
  };

  // ---------- entrada: un dedo = herramienta; dos dedos = mover la vista y zoom ----------
  Builder.prototype.bind = function () {
    var self = this;
    this._d = function (e) {
      self.ptrs[e.pointerId] = { x: (e.clientX - RS.stage.x) * self.dpr, y: (e.clientY - RS.stage.y) * self.dpr, x0: (e.clientX - RS.stage.x) * self.dpr, y0: (e.clientY - RS.stage.y) * self.dpr };
      if (Object.keys(self.ptrs).length === 2) { self.multi = true; self.pinch = self.pinchInfo(); self.ghost = null; }
      else { self.multi = false; self.moved = 0; self.panStart = { cx: self.cx, cy: self.cy }; self.move(e); }
    };
    this._m = function (e) {
      var P = self.ptrs[e.pointerId];
      if (!P) { if (e.pointerType === 'mouse') self.move(e); return; }
      P.x = (e.clientX - RS.stage.x) * self.dpr; P.y = (e.clientY - RS.stage.y) * self.dpr; self.moved = Math.max(self.moved || 0, Math.hypot(P.x - P.x0, P.y - P.y0));
      if (self.multi && Object.keys(self.ptrs).length === 2) {
        var n = self.pinchInfo(), o = self.pinch;
        self.zoom(n.d / o.d, n.x, n.y);
        self.cx -= (n.x - o.x) / self.s; self.cy += (n.y - o.y) / self.s; self.clampView(); self.pinch = n;
      } else if (self.tool === 'pan') {
        self.cx = self.panStart.cx - (P.x - P.x0) / self.s; self.cy = self.panStart.cy + (P.y - P.y0) / self.s; self.clampView();
      } else self.move(e);
    };
    this._u = function (e) {
      if (!self.ptrs[e.pointerId]) return;
      delete self.ptrs[e.pointerId];
      if (self.multi) { if (!Object.keys(self.ptrs).length) self.multi = false; return; }
      if (self.tool === 'pan' || e.type !== 'pointerup') return;
      // tocar, o arrastrar el fantasma y soltar, coloca
      if ((self.moved || 0) < 40 * self.dpr || self.tool === 'place' || self.tool === 'tpl' || (self.tool === 'move' && self.carry)) self.tap(e);
      if (e.pointerType !== 'mouse') self.ghost = null;
    };
    this._w = function (e) { e.preventDefault(); self.zoom(e.deltaY < 0 ? 1.12 : 1 / 1.12, (e.clientX - RS.stage.x) * self.dpr, (e.clientY - RS.stage.y) * self.dpr); };
    this._r = function () { self.resize(); };
    this.cv.addEventListener('pointerdown', this._d); addEventListener('pointermove', this._m); addEventListener('pointerup', this._u); addEventListener('pointercancel', this._u);
    this.cv.addEventListener('wheel', this._w, { passive: false }); addEventListener('resize', this._r);
  };
  Builder.prototype.pinchInfo = function () {
    var self = this, p = Object.keys(this.ptrs).map(function (k) { return self.ptrs[k]; });
    return { x: (p[0].x + p[1].x) / 2, y: (p[0].y + p[1].y) / 2, d: Math.max(20, Math.hypot(p[0].x - p[1].x, p[0].y - p[1].y)) };
  };

  // ---------- reglas ----------
  Builder.prototype.cost = function () { return this.L.pieces.reduce(function (a, p) { return a + RS.pieceCost(p); }, 0); };
  Builder.prototype.trapCount = function () { return this.L.pieces.filter(function (p) { return RS.SHAPES[p.s].trap; }).length; };
  Builder.prototype.curPiece = function () {
    var s = RS.SHAPES[this.shape];
    var r = s.sprite || s.kind === 'circle' ? 0 : this.rot; if (r >= 2 && s.kind !== 'box') r = r % 2;
    return { s: this.shape, m: s.mat != null ? s.mat : this.mat, rot: r, flip: this.flip };
  };
  // la pieza cae hasta apoyarse en lo que tenga debajo (o en el suelo)
  Builder.prototype.dropY = function (x0, x1, yTap, h) {
    var floor = 0;
    this.L.pieces.forEach(function (q) {
      if (RS.SHAPES[q.s].noTop && !q.rot) return; // no se puede apoyar nada en un pico
      var a = RS.pieceAABB(q);
      if (Math.min(x1, a.x1) - Math.max(x0, a.x0) > 0.05 && a.y1 <= yTap + 0.35 && a.y1 > floor) floor = a.y1;
    });
    return floor + h / 2;
  };
  Builder.prototype.snapPiece = function (p, x, y) {
    var z = RS.pieceSize(p), x0 = Math.round((x - z.w / 2) * 2) / 2;
    p.x = x0 + z.w / 2; p.y = this.dropY(x0, x0 + z.w, y - z.h / 2, z.h);
    return p;
  };
  Builder.prototype.why = function (p, extraCost) {
    var a = RS.pieceAABB(p), s = RS.SHAPES[p.s];
    if (a.x0 < -0.01 || a.x1 > GW + 0.01 || a.y1 > GH + 0.01) return 'Fuera de la zona de construcción';
    if (s.ground && a.y0 > 0.01) return 'Esta pieza solo va en el suelo';
    var oa = RS.pieceOBB(p), diagA = (p.rot || 0) >= 2;
    var hit = this.L.pieces.some(function (q) { var b = RS.pieceAABB(q); var box = Math.min(a.x1, b.x1) - Math.max(a.x0, b.x0) > 0.02 && Math.min(a.y1, b.y1) - Math.max(a.y0, b.y0) > 0.02; if (!box) return false; if (!diagA && (q.rot || 0) < 2) return true; return RS.obbOverlap(oa, RS.pieceOBB(q)); });
    if (hit || this.L.gems.some(function (g) { return g.x > a.x0 && g.x < a.x1 && g.y > a.y0 && g.y < a.y1; })) return 'No cabe ahí';
    if (this.cost() + (extraCost || 0) > this.budget) return 'Sin puntos de construcción';
    return null;
  };
  Builder.prototype.tplPieces = function (x, y) {
    var T = RS.TEMPLATES[this.tpl], self = this, x0 = Math.round((x - T.w / 2) * 2) / 2;
    var y0 = this.dropY(x0, x0 + T.w, y - 0.5, 0);
    return T.ps.map(function (d) {
      var si = I(d[0]), sh = RS.SHAPES[si];
      return { s: si, m: sh.mat != null ? sh.mat : (d[1] != null ? d[1] : self.mat), rot: d[4] || 0, flip: !!d[5], weld: !!d[6], x: x0 + d[2], y: y0 + d[3] };
    });
  };
  Builder.prototype.tplWhy = function (ps) {
    var save = this.L.pieces, cost = ps.reduce(function (a, p) { return a + RS.pieceCost(p); }, 0), r = null;
    for (var i = 0; i < ps.length && !r; i++) { r = this.why(ps[i], 0); this.L.pieces = this.L.pieces.concat([ps[i]]); }
    this.L.pieces = save;
    if (!r && this.cost() + cost > this.budget) r = 'Sin puntos de construcción';
    return r;
  };
  Builder.prototype.pieceAt = function (x, y) {
    for (var i = this.L.pieces.length - 1; i >= 0; i--) { var a = RS.pieceAABB(this.L.pieces[i]); if (x >= a.x0 && x <= a.x1 && y >= a.y0 && y <= a.y1) return this.L.pieces[i]; }
    return null;
  };

  Builder.prototype.move = function (e) {
    if (this.sim) return;
    var x = this.wx((e.clientX - RS.stage.x) * this.dpr), y = this.wy((e.clientY - RS.stage.y) * this.dpr);
    if (this.tool === 'place') { var p = this.snapPiece(this.curPiece(), x, y); p.bad = this.why(p, RS.pieceCost(p)); this.ghost = { p: p }; }
    else if (this.tool === 'tpl') { var ps = this.tplPieces(x, y); this.ghost = { ps: ps, bad: this.tplWhy(ps) }; }
    else if (this.tool === 'move' && this.carry) { var q = this.snapPiece(this.carryCopy(), x, y); q.bad = this.why(q, RS.pieceCost(q)); this.ghost = { p: q }; }
    else this.ghost = { x: x, y: y };
  };
  Builder.prototype.carryCopy = function () { var c = Object.assign({}, this.carry); delete c.orig; return c; };
  Builder.prototype.snap = function () { this.hist.push(JSON.stringify(this.L)); if (this.hist.length > 40) this.hist.shift(); };
  Builder.prototype.undo = function () {
    if (this.carry) { this.L.pieces.push(this.carry.orig); this.carry = null; this.ghost = null; this.hist.pop(); return this.changed(); }
    if (!this.hist.length) return this.toast('Nada que deshacer');
    this.L = JSON.parse(this.hist.pop()); RS.Audio.sfx('whoosh', 0.4); this.changed();
  };
  Builder.prototype.changed = function (struct) { if (struct !== false) { this.stable = false; this.marks = null; } if (this.o.onChange) this.o.onChange(); };
  Builder.prototype.setTool = function (t) {
    if (this.carry && t !== 'move') { this.L.pieces.push(this.carry.orig); this.carry = null; this.hist.pop(); }
    this.tool = t; this.ghost = null;
  };
  Builder.prototype.tap = function (e) {
    if (this.sim) return;
    var x = this.wx((e.clientX - RS.stage.x) * this.dpr), y = this.wy((e.clientY - RS.stage.y) * this.dpr), self = this;
    if (y < -1.5 || x < -2 || x > GW + 2 || (e.clientY - RS.stage.y) * this.dpr > this.H - this.bot + 4 || (e.clientY - RS.stage.y) * this.dpr < this.top * 0.8) return;
    var hit = this.pieceAt(x, y), err;
    if (this.tool === 'place') {
      var p = this.snapPiece(this.curPiece(), x, y), sh = RS.SHAPES[p.s];
      if (sh.trap && this.trapCount() >= RS.MAX_TRAPS) return this.toast('Máximo ' + RS.MAX_TRAPS + ' trampas');
      if ((err = this.why(p, RS.pieceCost(p)))) { RS.Audio.sfx('stone_hit', 0.3); return this.toast(err); }
      this.snap(); this.L.pieces.push(p); RS.Audio.sfx('place', 0.6); this.changed();
    } else if (this.tool === 'tpl') {
      var ps = this.tplPieces(x, y);
      if ((err = this.tplWhy(ps))) { RS.Audio.sfx('stone_hit', 0.3); return this.toast(err); }
      this.snap(); ps.forEach(function (q) { self.L.pieces.push(q); }); RS.Audio.sfx('place', 0.8); this.changed();
    } else if (this.tool === 'move') {
      if (!this.carry) {
        if (!hit) return this.toast('Toca la pieza que quieres mover');
        this.snap(); this.L.pieces.splice(this.L.pieces.indexOf(hit), 1); this.carry = Object.assign({}, hit, { orig: hit });
        RS.Audio.sfx('whoosh', 0.4); this.move(e); this.toast('Ahora toca dónde dejarla'); this.changed();
      } else {
        var q = this.snapPiece(this.carryCopy(), x, y);
        if ((err = this.why(q, RS.pieceCost(q)))) return this.toast(err);
        this.L.pieces.push(q); this.carry = null; this.ghost = null; RS.Audio.sfx('place', 0.6); this.changed();
      }
    } else if (this.tool === 'pick') {
      if (!hit) return; this.shape = hit.s; if (RS.SHAPES[hit.s].mat == null) this.mat = hit.m; this.rot = hit.rot || 0; this.flip = !!hit.flip;
      this.cat = RS.SHAPES[hit.s].cat || 'est'; this.setTool('place'); RS.Audio.sfx('click', 0.5); this.toast('Copiada: ' + RS.SHAPES[hit.s].name); this.changed(false);
    } else if (this.tool === 'erase') {
      var gi = this.L.gems.findIndex(function (g) { return Math.hypot(g.x - x, g.y - y) < 0.5; });
      var di = this.L.deco.findIndex(function (d) { return Math.abs(d.x - x) < d.w / 2 && y > d.y && y < d.y + d.w; });
      this.snap();
      if (gi >= 0) this.L.gems.splice(gi, 1);
      else if (hit) this.L.pieces.splice(this.L.pieces.indexOf(hit), 1);
      else if (this.L.sign && Math.abs(this.L.sign.x - x) < 1.6 && y > this.L.sign.y && y < this.L.sign.y + 1.8) this.L.sign = null;
      else if (di >= 0) this.L.deco.splice(di, 1);
      else { this.hist.pop(); return; }
      RS.Audio.sfx('wood_hit', 0.5); this.changed();
    } else if (this.tool === 'weld') {
      if (!hit) return; if (RS.SHAPES[hit.s].weld) return this.toast('Esta pieza ya se suelda sola');
      if (!hit.weld && this.cost() + 1 > this.budget) return this.toast('Sin puntos de construcción');
      this.snap(); hit.weld = !hit.weld; RS.Audio.sfx('metal_hit', 0.4); this.changed();
    } else if (this.tool === 'paint') { if (hit && !RS.SHAPES[hit.s].sprite) { this.snap(); hit.tint = RS.PAINTS[this.paint]; RS.Audio.sfx('pour', 0.4); this.changed(false); } }
    else if (this.tool === 'swap') {
      if (!hit) return; if (RS.SHAPES[hit.s].mat != null) return this.toast('Esta pieza tiene material fijo');
      var old = hit.m; hit.m = this.mat; var over = this.cost() > this.budget; hit.m = old;
      if (over) return this.toast('Sin puntos de construcción');
      this.snap(); hit.m = this.mat; RS.Audio.sfx('place', 0.5); this.changed();
    } else if (this.tool === 'gem') {
      if (this.L.gems.length >= 3) return this.toast('Máximo 3 gemas');
      var gx = Math.round(x * 2) / 2, gy = this.dropY(gx - 0.3, gx + 0.3, y, 0.68);
      if (this.pieceAt(gx, gy)) return this.toast('Ponla en un hueco, no dentro de una pieza');
      this.snap(); this.L.gems.push({ x: gx, y: gy, c: this.L.gems.length }); RS.Audio.sfx('gem', 0.5); this.changed();
    } else if (this.tool === 'deco') {
      this.snap(); this.L.deco.push({ d: this.decoIdx, x: Math.round(x * 2) / 2, y: Math.max(0, Math.round(y * 2) / 2 - 0.5), w: 1.6 }); RS.Audio.sfx('place', 0.5); this.changed(false);
    } else if (this.tool === 'sign') {
      var sx0 = Math.round(x * 2) / 2; this.snap(); this.L.sign = { x: sx0, y: this.dropY(sx0 - 1.2, sx0 + 1.2, y - 0.5, 0), name: (this.L.sign && this.L.sign.name) || this.o.name || 'Mi fortaleza' };
      RS.Audio.sfx('place', 0.5); this.changed(false);
    }
  };
  Builder.prototype.toast = function (t) { this.msg = { t: t, time: 1.7 }; };

  // ---------- prueba de gravedad (en directo) ----------
  Builder.prototype.testGravity = function (cb) {
    if (this.carry) this.setTool('place');
    if (!this.L.pieces.length) return this.toast('Coloca alguna pieza primero');
    var lay = { pieces: this.L.pieces, gems: this.L.gems.map(function (g) { return { x: g.x, y: g.y, c: g.c }; }) };
    this.sim = { P: new RS.Phys(lay, { noDamage: true }), t: 0, cb: cb };
  };
  Builder.prototype.update = function (dt) {
    this.t += dt; if (this.msg) { this.msg.time -= dt; if (this.msg.time <= 0) this.msg = null; }
    if (!this.sim) return;
    var S = this.sim; S.P.step(1 / 60); S.P.step(1 / 60); S.t += 2 / 60; S.P.drain();
    if (S.t > 4) {
      var marks = [], bad = 0;
      S.P.blocks.forEach(function (u) {
        var d = u.dead ? 9 : Math.hypot(u.body.getPosition().x - u.p.x, u.body.getPosition().y - u.p.y) + Math.abs(u.body.getAngle() - RS.rotAng(u.p)) * 0.5;
        var lvl = d > 0.25 ? 2 : d > 0.06 ? 1 : 0; if (lvl === 2) bad++;
        marks.push(lvl);
      });
      var gemsLost = S.P.gems.filter(function (g) { return g.freed; }).length;
      this.marks = marks; this.stable = bad === 0 && gemsLost === 0; this.sim = null;
      this.toast(this.stable ? (marks.some(function (m) { return m; }) ? '¡Estable! (en amarillo lo que se mueve un poco)' : '¡Estable! Ya puedes guardar') : (bad ? bad + ' piezas se caen (en rojo)' : 'Una gema se cae'));
      RS.Audio.sfx(this.stable ? 'star' : 'stone_break', 0.6);
      if (S.cb) S.cb(this.stable);
    }
  };

  // ---------- dibujo ----------
  // modo plano (pantalla azul): fondo limpio, cuadrícula clara y piezas con contorno
  Builder.prototype.drawBlue = function () {
    var ctx = this.ctx, W = this.W, H = this.H, s = this.s, self = this, d = this.dpr;
    ctx.fillStyle = '#123a6b'; ctx.fillRect(0, 0, W, H);
    ctx.lineWidth = 1;
    for (var gx = -12; gx <= GW + 12; gx += 0.5) { var X = this.sx(gx); if (X < -2 || X > W + 2) continue; ctx.strokeStyle = gx % 1 ? 'rgba(160,200,255,0.10)' : gx % 5 ? 'rgba(160,200,255,0.25)' : 'rgba(200,225,255,0.5)'; ctx.beginPath(); ctx.moveTo(X, 0); ctx.lineTo(X, this.sy(0)); ctx.stroke(); }
    for (var gy = 0; gy <= GH + 8; gy += 0.5) { var Y = this.sy(gy); if (Y < 0) break; ctx.strokeStyle = gy % 1 ? 'rgba(160,200,255,0.10)' : gy % 5 ? 'rgba(160,200,255,0.25)' : 'rgba(200,225,255,0.5)'; ctx.beginPath(); ctx.moveTo(0, Y); ctx.lineTo(W, Y); ctx.stroke(); }
    ctx.fillStyle = '#0b2648'; ctx.fillRect(0, this.sy(0), W, H); ctx.strokeStyle = '#cfe4ff'; ctx.lineWidth = 2 * d; ctx.beginPath(); ctx.moveTo(0, this.sy(0)); ctx.lineTo(W, this.sy(0)); ctx.stroke();
    ctx.setLineDash([8 * d, 6 * d]); ctx.strokeStyle = 'rgba(255,230,120,0.8)'; ctx.strokeRect(this.sx(0), this.sy(GH), GW * s, GH * s); ctx.setLineDash([]);
    ctx.fillStyle = '#cfe4ff'; ctx.font = (11 * d) + 'px Nunito, sans-serif'; ctx.textAlign = 'left';
    for (var hy = 1; hy <= GH; hy++) if (hy % 2 === 0) ctx.fillText(hy + ' m', this.sx(0) + 3 * d, this.sy(hy) + 12 * d);
    for (var wx = 0; wx <= GW; wx += 5) ctx.fillText(wx + '', this.sx(wx) + 2 * d, this.sy(0) + 14 * d);
    var bodies = this.sim ? this.sim.P.blocks.filter(function (u) { return !u.dead; }).map(function (u) { var q = u.body.getPosition(); return { p: u.p, x: q.x, y: q.y, a: u.body.getAngle() }; })
      : this.L.pieces.map(function (p) { return { p: p, x: p.x, y: p.y, a: RS.rotAng(p) }; });
    bodies.forEach(function (o, i) {
      RS.drawBlock(ctx, self.style, o.p, false, self.sx(o.x), self.sy(o.y), -o.a, s, 0.55);
      var q = Object.assign({}, o.p, { x: o.x, y: o.y }), pts = self.sim ? null : RS.pieceOBB(q);
      var mk = !self.sim && self.marks && self.marks[i];
      ctx.strokeStyle = mk === 2 ? '#ff5a5a' : mk === 1 ? '#ffd84a' : o.p.weld || RS.SHAPES[o.p.s].weld ? '#ffd27a' : '#e8f3ff'; ctx.lineWidth = 2 * d;
      if (pts) { ctx.beginPath(); pts.forEach(function (c, k) { var X = self.sx(c[0]), Y = self.sy(c[1]); if (k) ctx.lineTo(X, Y); else ctx.moveTo(X, Y); }); ctx.closePath(); ctx.stroke(); }
    });
    (this.sim ? this.sim.P.gems.filter(function (g) { return !g.freed; }).map(function (g) { var q = g.body.getPosition(); return { x: q.x, y: q.y, c: g.c }; }) : this.L.gems).forEach(function (g) { RS.drawSp(ctx, 'items', 6 + (g.c || 0), self.sx(g.x), self.sy(g.y), 0.75 * s, 0.75 * s); });
    RS.drawSign(ctx, this.clan, this.o.getName ? this.o.getName() : (this.o.name || 'Mi fortaleza'), this.sx(-2.1), this.sy(0), s, d);
    var G = this.ghost;
    if (G && !this.sim) {
      var list = G.p ? [G.p] : G.ps, bad = G.p ? G.p.bad : G.bad;
      if (list) list.forEach(function (p) { RS.drawBlock(ctx, self.style, p, false, self.sx(p.x), self.sy(p.y), -RS.rotAng(p), s, 0.7); var pts = RS.pieceOBB(p); ctx.strokeStyle = bad ? '#ff5a5a' : '#6dff8a'; ctx.lineWidth = 3 * d; ctx.beginPath(); pts.forEach(function (c, k) { var X = self.sx(c[0]), Y = self.sy(c[1]); if (k) ctx.lineTo(X, Y); else ctx.moveTo(X, Y); }); ctx.closePath(); ctx.stroke(); });
    }
    if (this.msg) { ctx.save(); ctx.font = (22 * d) + 'px Lilita, sans-serif'; ctx.textAlign = 'center'; ctx.fillStyle = 'rgba(0,0,0,0.65)'; var tw = ctx.measureText(this.msg.t).width + 40 * d; ctx.fillRect(W / 2 - tw / 2, H * 0.13, tw, 42 * d); ctx.fillStyle = '#fff'; ctx.fillText(this.msg.t, W / 2, H * 0.13 + 29 * d); ctx.restore(); }
  };

  Builder.prototype.draw = function () {
    var ctx = this.ctx, W = this.W, H = this.H, s = this.s, self = this;
    if (this.blue) return this.drawBlue();
    var far = RS.img['bg_' + this.clan];
    if (far) { var fs = Math.max(W / far.width, H / far.height); ctx.drawImage(far, (W - far.width * fs) / 2, (H - far.height * fs) / 2, far.width * fs, far.height * fs); }
    var mid = RS.img['bg_' + this.clan + '_mid'];
    if (mid) { var mh = 6 * s, mw = mid.width * mh / mid.height, mx = this.sx(-12); mx -= Math.ceil((mx + 1) / (mw - 1)) * (mw - 1); for (var x = mx; x < W; x += mw - 1) ctx.drawImage(mid, x, this.sy(0) - mh + 0.3 * s, mw, mh); }
    var gr = RS.img['bg_' + this.clan + '_ground'];
    if (gr) { var gh = 3 * s, gw = gr.width * gh / gr.height, gx0 = this.sx(-12); gx0 -= Math.ceil((gx0 + 1) / (gw - 1)) * (gw - 1); for (var x2 = gx0; x2 < W; x2 += gw - 1) ctx.drawImage(gr, x2, this.sy(0) - gh * 0.1, gw, gh); ctx.fillStyle = '#2a1a10'; ctx.fillRect(0, this.sy(0) + gh * 0.88, W, H); }
    // rejilla con marcas de altura
    ctx.save(); ctx.lineWidth = 1;
    for (var gx = 0; gx <= GW; gx++) { ctx.strokeStyle = gx % 5 ? 'rgba(255,255,255,0.13)' : 'rgba(255,255,255,0.32)'; ctx.beginPath(); ctx.moveTo(this.sx(gx), this.sy(0)); ctx.lineTo(this.sx(gx), this.sy(GH)); ctx.stroke(); }
    for (var gy = 0; gy <= GH; gy++) { ctx.strokeStyle = gy % 5 ? 'rgba(255,255,255,0.13)' : 'rgba(255,255,255,0.32)'; ctx.beginPath(); ctx.moveTo(this.sx(0), this.sy(gy)); ctx.lineTo(this.sx(GW), this.sy(gy)); ctx.stroke(); }
    ctx.strokeStyle = 'rgba(255,230,120,0.7)'; ctx.lineWidth = 2 * this.dpr; ctx.strokeRect(this.sx(0), this.sy(GH), GW * s, GH * s);
    ctx.fillStyle = 'rgba(255,240,200,0.9)'; ctx.font = (11 * this.dpr) + 'px Nunito, sans-serif'; ctx.textAlign = 'left';
    for (var hy = 2; hy <= GH; hy += 2) ctx.fillText(hy + ' m', this.sx(0) + 3 * this.dpr, this.sy(hy) + 12 * this.dpr);
    ctx.restore();
    // adornos (detrás)
    this.L.deco.forEach(function (d) { var sh = 'deco_' + self.clan, a = RS.spAspect(sh, d.d), w = d.w * s, h = w / a; RS.drawSp(ctx, sh, d.d, self.sx(d.x), self.sy(d.y) - h / 2, w, h); });
    // piezas
    if (this.sim) {
      this.sim.P.blocks.forEach(function (u) { if (u.dead) return; var p = u.body.getPosition(); RS.drawBlock(ctx, self.style, u.p, false, self.sx(p.x), self.sy(p.y), -u.body.getAngle(), s, null, u.p.tint); });
      this.sim.P.gems.forEach(function (g) { if (g.freed) return; var p = g.body.getPosition(); RS.drawSp(ctx, 'items', 6 + g.c, self.sx(p.x), self.sy(p.y), 0.75 * s, 0.75 * s); });
    } else {
      this.L.pieces.forEach(function (p, i) {
        var sh = RS.SHAPES[p.s];
        if (sh.trap === 'shield') { ctx.save(); ctx.globalAlpha = 0.16; ctx.fillStyle = '#7fe8ff'; ctx.beginPath(); ctx.arc(self.sx(p.x), self.sy(p.y), 2.3 * s, 0, 7); ctx.fill(); ctx.restore(); }
        if (sh.trap === 'fan') { ctx.save(); ctx.globalAlpha = 0.12; ctx.fillStyle = '#fff'; var dir = p.flip ? 1 : -1; ctx.fillRect(Math.min(self.sx(p.x), self.sx(p.x + dir * 7)), self.sy(p.y + 1.8), 7 * s, 3.6 * s); ctx.restore(); }
        RS.drawBlock(ctx, self.style, p, false, self.sx(p.x), self.sy(p.y), -RS.rotAng(p), s, null, p.tint);
        if (p.weld && !sh.weld) { ctx.fillStyle = '#c9cfd6'; ctx.strokeStyle = '#333'; var z = RS.pieceSize(p); [[-1, -1], [1, -1], [-1, 1], [1, 1]].forEach(function (c) { ctx.beginPath(); ctx.arc(self.sx(p.x + c[0] * (z.w / 2 - 0.15)), self.sy(p.y + c[1] * (z.h / 2 - 0.12)), 0.08 * s, 0, 7); ctx.fill(); ctx.stroke(); }); }
        if (self.marks && self.marks[i]) { var a = RS.pieceAABB(p); ctx.fillStyle = self.marks[i] === 2 ? 'rgba(255,40,40,0.45)' : 'rgba(255,210,40,0.4)'; ctx.fillRect(self.sx(a.x0), self.sy(a.y1), (a.x1 - a.x0) * s, (a.y1 - a.y0) * s); }
      });
      this.L.gems.forEach(function (g) { RS.drawSp(ctx, 'items', 6 + g.c, self.sx(g.x), self.sy(g.y), 0.75 * s, 0.75 * s); });
    }
    // cartel con el nombre
    RS.drawSign(ctx, this.clan, this.o.getName ? this.o.getName() : (this.o.name || 'Mi fortaleza'), this.sx(-2.1), this.sy(0), s, this.dpr);
    // fantasma
    var G = this.ghost;
    if (G && !this.sim) {
      var list = G.p ? [G.p] : G.ps, bad = G.p ? G.p.bad : G.bad;
      if (list) list.forEach(function (p) {
        RS.drawBlock(ctx, self.style, p, false, self.sx(p.x), self.sy(p.y), -RS.rotAng(p), s, 0.6);
        var a2 = RS.pieceAABB(p); ctx.strokeStyle = bad ? '#f44' : '#5f5'; ctx.lineWidth = 3 * self.dpr; ctx.strokeRect(self.sx(a2.x0), self.sy(a2.y1), (a2.x1 - a2.x0) * s, (a2.y1 - a2.y0) * s);
      });
      else { ctx.strokeStyle = '#fff'; ctx.lineWidth = 2 * this.dpr; ctx.beginPath(); ctx.arc(this.sx(G.x), this.sy(G.y), 0.4 * s, 0, 7); ctx.stroke(); }
    }
    if (this.msg) { ctx.save(); ctx.font = (22 * this.dpr) + 'px Lilita, sans-serif'; ctx.textAlign = 'center'; ctx.fillStyle = 'rgba(0,0,0,0.65)'; var tw = ctx.measureText(this.msg.t).width + 40 * this.dpr; ctx.fillRect(W / 2 - tw / 2, H * 0.13, tw, 42 * this.dpr); ctx.fillStyle = '#fff'; ctx.fillText(this.msg.t, W / 2, H * 0.13 + 29 * this.dpr); ctx.restore(); }
  };
})(RS);
