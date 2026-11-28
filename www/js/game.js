// Partida: dibujo, cámara, cañón de pólvora, cola de armadillos, efectos y final del nivel.
(function (RS) {
  var TAU = Math.PI * 2;
  RS.img = {}; RS.atlas = {};
  RS.vib = function (ms) { try { if (RS.save && RS.save.vib !== false && navigator.vibrate) navigator.vibrate(ms); } catch (e) {} };
  function stat(self, k, v) { if (self.o.onStat) self.o.onStat(k, v); }

  // calidad gráfica (Alta/Media/Baja) y Modo Eco: resolución, partículas, clima, nubes, brillos y fotogramas
  RS.gfx = function () {
    var S = RS.save || {}, q = S.gfx || RS.gfxAuto(), eco = !!S.eco;
    return { q: q, eco: eco, dpr: eco ? 1 : q === 'high' ? 2 : q === 'med' ? 1.5 : 1, wx: eco ? 0.35 : q === 'high' ? 1 : q === 'med' ? 0.7 : 0.4,
      parts: eco || q === 'low' ? 70 : q === 'med' ? 160 : 400, clouds: eco || q === 'low' ? 2 : q === 'med' ? 4 : 6, glow: q === 'high' && !eco, fps: eco ? 30 : 60, mid: !(q === 'low' && eco) };
  };
  RS.gfxAuto = function () {
    var mem = navigator.deviceMemory || 4, cores = navigator.hardwareConcurrency || 4;
    return mem <= 3 || cores <= 4 ? 'low' : mem >= 8 && cores >= 8 ? 'high' : 'med';
  };
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
    if (RS.SHAPES[s] && RS.SHAPES[s].spr != null) s = RS.SHAPES[s].spr;
    var half = m % 2, row = (s < 4 ? 0 : 1) + (broken ? 2 : 0), col = (s % 4) + half * 4;
    return { sheet: 'blk_' + style + Math.floor(m / 2), idx: row * 8 + col };
  };
  // pieza alargada: extremos sin deformar y tramo central estirado; piezas especiales con su sprite
  var tmp = null;
  RS.drawBlock = function (ctx, style, p, broken, x, y, ang, sc, alpha, tint, fr) {
    var s = RS.SHAPES[p.s];
    if (s.cage) { RS.drawCage(ctx, x, y, ang, sc, broken); return; }
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

  // mapache provisional dibujado por código (se cambiará por los sprites de GPT)
  RS.drawRac = function (ctx, r, x, y, ang, s, t) {
    var ti = r.boss ? (r.bi || 0) : RS.RACS.indexOf(r.T), sh = r.boss ? 'boss' + (Math.floor(ti / 3) + 1) : 'rac' + (Math.floor(ti / 3) + 1);
    if (RS.atlas[sh] && RS.img[sh]) {
      var row = ti % 3, f;
      if (r.ko) f = 6; else if (r.hurtT > 0) f = 4; else if (r.actT > 0) f = 3; else if (r.win) f = 7;
      else { var c = (t + r.idx * 1.7) % 5; f = c < 0.15 ? 1 : (c > 3.6 && c < 4.4 && !r.boss) ? 2 : (r.boss && c > 3.6 && c < 4.4) ? 2 : 0; }
      var idx = row * 8 + f, H = r.h * s * 1.32, Wd = H * RS.spAspect(sh, idx);
      ctx.save(); ctx.translate(x, y); ctx.rotate(ang);
      if (r.ko) ctx.globalAlpha = Math.max(0, 1 - Math.max(0, r.koT - 0.6) / 0.8);
      var bob = r.ko ? 0 : Math.sin(t * 3 + r.idx) * 0.012 * s;
      RS.drawSp(ctx, sh, idx, 0, r.h * s / 2 - H / 2 + bob, Wd, H);
      if (r.helmet && !r.ko) { ctx.fillStyle = '#9aa0a8'; ctx.strokeStyle = '#555'; ctx.lineWidth = Math.max(1, s * 0.03); ctx.beginPath(); ctx.arc(0, r.h * s / 2 - H * 0.86, r.w * s * 0.42, Math.PI, 0); ctx.fill(); ctx.stroke(); }
      ctx.restore();
      if (r.shield && !r.ko) { ctx.save(); ctx.globalAlpha = 0.3 + 0.1 * Math.sin(t * 4); ctx.fillStyle = '#9ff3ff'; ctx.strokeStyle = '#e8fdff'; ctx.lineWidth = 2; ctx.beginPath(); ctx.arc(x, y, Math.max(r.w, r.h) * s * 0.85, 0, 7); ctx.fill(); ctx.stroke(); ctx.restore(); }
      return;
    }
    var T = r.T, w = r.w * s, h = r.h * s, ko = r.ko, hurt = r.hurtT > 0, k = Math.min(1, w / (0.7 * s)) ;
    ctx.save(); ctx.translate(x, y); ctx.rotate(ang);
    if (ko) ctx.globalAlpha = Math.max(0, 1 - r.koT / 1.4);
    var bob = ko ? 0 : Math.sin(t * 3 + r.idx) * 0.015 * s;
    // cola anillada (detrás, a la derecha porque mira a la izquierda)
    ctx.save(); ctx.translate(w * 0.38, h * 0.18); ctx.rotate(-0.6 + Math.sin(t * 2 + r.idx) * 0.15);
    for (var i = 0; i < 5; i++) { ctx.fillStyle = i % 2 ? '#2b2b2b' : '#9a9a9e'; ctx.beginPath(); ctx.ellipse(0, -i * h * 0.09, w * 0.13, h * 0.07, 0, 0, 7); ctx.fill(); }
    ctx.restore();
    // cuerpo
    ctx.fillStyle = '#8d8f94'; ctx.beginPath(); ctx.ellipse(0, h * 0.18 + bob, w * 0.42, h * 0.32, 0, 0, 7); ctx.fill();
    ctx.fillStyle = '#d9d6cf'; ctx.beginPath(); ctx.ellipse(-w * 0.06, h * 0.22 + bob, w * 0.24, h * 0.22, 0, 0, 7); ctx.fill();
    // ropa del tipo (franja de color)
    ctx.fillStyle = T.col; ctx.fillRect(-w * 0.4, h * 0.02 + bob, w * 0.8, h * 0.1);
    // cabeza
    var hy = -h * 0.2 + bob, hr = w * 0.36;
    ctx.fillStyle = '#9a9a9e'; ctx.beginPath(); ctx.arc(-w * 0.04, hy, hr, 0, 7); ctx.fill();
    ctx.beginPath(); ctx.moveTo(-w * 0.32, hy - hr * 0.55); ctx.lineTo(-w * 0.2, hy - hr * 1.25); ctx.lineTo(-w * 0.06, hy - hr * 0.75); ctx.fill();
    ctx.beginPath(); ctx.moveTo(w * 0.06, hy - hr * 0.75); ctx.lineTo(w * 0.2, hy - hr * 1.2); ctx.lineTo(w * 0.3, hy - hr * 0.45); ctx.fill();
    // hocico hacia la izquierda
    ctx.fillStyle = '#e8e4dc'; ctx.beginPath(); ctx.ellipse(-w * 0.3, hy + hr * 0.3, hr * 0.5, hr * 0.32, 0, 0, 7); ctx.fill();
    ctx.fillStyle = '#111'; ctx.beginPath(); ctx.arc(-w * 0.5, hy + hr * 0.22, hr * 0.13, 0, 7); ctx.fill();
    // antifaz
    ctx.fillStyle = '#1d1d1f'; ctx.beginPath(); ctx.ellipse(-w * 0.1, hy - hr * 0.05, hr * 0.85, hr * 0.3, 0, 0, 7); ctx.fill();
    // ojos
    var ex = [-w * 0.26, w * 0.02], ey = hy - hr * 0.05;
    ex.forEach(function (X) {
      if (ko) { ctx.strokeStyle = '#fff'; ctx.lineWidth = Math.max(1, hr * 0.1); var e = hr * 0.14; ctx.beginPath(); ctx.moveTo(X - e, ey - e); ctx.lineTo(X + e, ey + e); ctx.moveTo(X + e, ey - e); ctx.lineTo(X - e, ey + e); ctx.stroke(); }
      else if (hurt) { ctx.strokeStyle = '#fff'; ctx.lineWidth = Math.max(1, hr * 0.09); ctx.beginPath(); ctx.moveTo(X - hr * 0.15, ey); ctx.lineTo(X + hr * 0.15, ey); ctx.stroke(); }
      else { ctx.fillStyle = '#fff'; ctx.beginPath(); ctx.arc(X, ey, hr * 0.17, 0, 7); ctx.fill(); ctx.fillStyle = '#111'; ctx.beginPath(); ctx.arc(X - hr * 0.05, ey, hr * 0.08, 0, 7); ctx.fill(); }
    });
    // sombrero según tipo
    var hat = r.boss ? 'crown' : T.hat; ctx.fillStyle = T.col;
    if (hat === 'pot' || r.helmet) { ctx.fillStyle = '#9aa0a8'; ctx.fillRect(-w * 0.36, hy - hr * 1.05, w * 0.64, hr * 0.5); ctx.fillRect(-w * 0.44, hy - hr * 0.6, w * 0.8, hr * 0.12); }
    else if (hat === 'crown') { ctx.fillStyle = '#ffd23f'; ctx.beginPath(); ctx.moveTo(-w * 0.32, hy - hr * 0.7); ctx.lineTo(-w * 0.28, hy - hr * 1.35); ctx.lineTo(-w * 0.14, hy - hr * 0.95); ctx.lineTo(-w * 0.04, hy - hr * 1.45); ctx.lineTo(w * 0.07, hy - hr * 0.95); ctx.lineTo(w * 0.2, hy - hr * 1.35); ctx.lineTo(w * 0.24, hy - hr * 0.7); ctx.fill(); }
    else if (hat === 'cowboy' || hat === 'pirate' || hat === 'captain') { ctx.fillStyle = hat === 'cowboy' ? '#8b5a2b' : '#1a1a1a'; ctx.fillRect(-w * 0.5, hy - hr * 0.72, w * 0.92, hr * 0.14); ctx.fillRect(-w * 0.3, hy - hr * 1.2, w * 0.5, hr * 0.5); }
    else if (hat === 'witch') { ctx.fillStyle = '#2f4f2f'; ctx.beginPath(); ctx.moveTo(-w * 0.42, hy - hr * 0.65); ctx.lineTo(-w * 0.02, hy - hr * 1.9); ctx.lineTo(w * 0.3, hy - hr * 0.65); ctx.fill(); }
    else if (hat === 'feathers') { ['#e74c3c', '#f1c40f', '#1f9e7a'].forEach(function (c, i) { ctx.fillStyle = c; ctx.beginPath(); ctx.ellipse(-w * 0.18 + i * w * 0.14, hy - hr * 1.15, hr * 0.12, hr * 0.42, (i - 1) * 0.3, 0, 7); ctx.fill(); }); }
    else if (hat === 'miner') { ctx.fillStyle = '#e0b030'; ctx.beginPath(); ctx.arc(-w * 0.04, hy - hr * 0.55, hr * 0.62, Math.PI, 0); ctx.fill(); ctx.fillStyle = '#fff6a0'; ctx.beginPath(); ctx.arc(-w * 0.3, hy - hr * 0.75, hr * 0.14, 0, 7); ctx.fill(); }
    else if (hat === 'royal') { ctx.fillStyle = '#d4af37'; ctx.beginPath(); ctx.arc(-w * 0.04, hy - hr * 0.5, hr * 0.66, Math.PI, 0); ctx.fill(); ctx.fillStyle = '#c0392b'; ctx.fillRect(-w * 0.08, hy - hr * 1.5, w * 0.08, hr * 0.5); }
    else if (hat === 'clown') { ctx.fillStyle = '#e84393'; ctx.beginPath(); ctx.moveTo(-w * 0.3, hy - hr * 0.7); ctx.lineTo(-w * 0.04, hy - hr * 1.6); ctx.lineTo(w * 0.2, hy - hr * 0.7); ctx.fill(); ctx.fillStyle = '#e53935'; ctx.beginPath(); ctx.arc(-w * 0.5, hy + hr * 0.22, hr * 0.17, 0, 7); ctx.fill(); }
    else if (hat !== 'none') { ctx.fillStyle = T.col; ctx.fillRect(-w * 0.38, hy - hr * 0.62, w * 0.68, hr * 0.2); }
    if (T.shieldFront) { ctx.fillStyle = '#8a5a2b'; ctx.strokeStyle = '#5a3a1a'; ctx.lineWidth = Math.max(1, w * 0.04); ctx.beginPath(); ctx.ellipse(-w * 0.48, h * 0.12, w * 0.13, h * 0.3, 0, 0, 7); ctx.fill(); ctx.stroke(); }
    if (T.fly && !ko) { ctx.strokeStyle = '#555'; ctx.lineWidth = Math.max(1, w * 0.05); var pa = t * 30; ctx.beginPath(); ctx.moveTo(-Math.cos(pa) * w * 0.4, hy - hr * 1.3); ctx.lineTo(Math.cos(pa) * w * 0.4, hy - hr * 1.3); ctx.stroke(); }
    ctx.restore();
    if (r.shield && !ko) { ctx.save(); ctx.globalAlpha = 0.3 + 0.1 * Math.sin(t * 4); ctx.fillStyle = '#9ff3ff'; ctx.strokeStyle = '#e8fdff'; ctx.lineWidth = 2; ctx.beginPath(); ctx.arc(x, y, Math.max(w, h) * 0.75, 0, 7); ctx.fill(); ctx.stroke(); ctx.restore(); }
  };
  RS.drawCage = function (ctx, x, y, ang, s, broken) {
    if (RS.img.siege && RS.atlas.siege) { var a0 = RS.spAspect('siege', broken ? 1 : 0), h0 = s * 1.02; RS.drawSp(ctx, 'siege', broken ? 1 : 0, x, y, h0 * a0, h0, ang); return; }
    var w = s, h = s; ctx.save(); ctx.translate(x, y); ctx.rotate(ang);
    ctx.fillStyle = 'rgba(40,25,10,0.35)'; ctx.fillRect(-w / 2, -h / 2, w, h);
    // armadillo triste dentro
    ctx.fillStyle = '#b08850'; ctx.beginPath(); ctx.ellipse(0, h * 0.12, w * 0.26, h * 0.22, 0, 0, 7); ctx.fill();
    ctx.fillStyle = '#7a5a30'; for (var i = -1; i <= 1; i++) ctx.fillRect(i * w * 0.08 - w * 0.02, -h * 0.05, w * 0.04, h * 0.32);
    ctx.fillStyle = '#c9a26a'; ctx.beginPath(); ctx.arc(w * 0.18, -h * 0.05, w * 0.12, 0, 7); ctx.fill();
    ctx.strokeStyle = '#3a3a3a'; ctx.lineWidth = Math.max(2, s * 0.06);
    for (var b = 0; b < 5; b++) { var X = -w / 2 + w * (0.1 + b * 0.2); ctx.beginPath(); ctx.moveTo(X, -h / 2); ctx.lineTo(X, h / 2); ctx.stroke(); }
    ctx.fillStyle = '#6b4422'; ctx.fillRect(-w / 2, -h / 2, w, h * 0.12); ctx.fillRect(-w / 2, h * 0.38, w, h * 0.12);
    ctx.fillStyle = '#d4af37'; ctx.fillRect(-w * 0.08, -h * 0.05, w * 0.16, h * 0.16);
    ctx.restore();
  };

  // cartel fijo dibujado por código: dos postes clavados en el suelo y una tabla con el nombre (no choca con nada)
  RS.drawSign = function (ctx, clan, name, x, yBottom, s, dpr) {
    var St = { japon: { wood: ['#7a2a1c', '#4a120c'], frame: '#c8352a', trim: '#f2c14e', ink: '#fff4d6' },
      oeste: { wood: ['#b4743a', '#7a4620'], frame: '#5a3214', trim: '#c9cfd6', ink: '#fff4d6' },
      azteca: { wood: ['#d9c59a', '#a8916a'], frame: '#6f5b3e', trim: '#1f9e7a', ink: '#3a240e' } }[clan] || null;
    St = St || { wood: ['#b4743a', '#7a4620'], frame: '#5a3214', trim: '#c9cfd6', ink: '#fff4d6' };
    var bw = 3.2 * s, bh = 1.05 * s, by = yBottom - 1.95 * s, pw = 0.2 * s, d = dpr || 1;
    ctx.save();
    // sombra en el suelo
    ctx.fillStyle = 'rgba(0,0,0,0.25)'; ctx.beginPath(); ctx.ellipse(x, yBottom, bw * 0.45, 0.12 * s, 0, 0, 7); ctx.fill();
    // postes
    [-1, 1].forEach(function (k) { var px = x + k * bw * 0.33 - pw / 2, g = ctx.createLinearGradient(px, 0, px + pw, 0); g.addColorStop(0, St.wood[1]); g.addColorStop(0.5, St.wood[0]); g.addColorStop(1, St.wood[1]); ctx.fillStyle = g; ctx.fillRect(px, by + bh * 0.2, pw, yBottom - by - bh * 0.2); ctx.fillStyle = 'rgba(0,0,0,0.3)'; ctx.fillRect(px, yBottom - 0.18 * s, pw, 0.18 * s); });
    // tabla
    var r = 0.12 * s, x0 = x - bw / 2, gr = ctx.createLinearGradient(0, by, 0, by + bh); gr.addColorStop(0, St.wood[0]); gr.addColorStop(1, St.wood[1]);
    ctx.beginPath(); ctx.moveTo(x0 + r, by); ctx.lineTo(x0 + bw - r, by); ctx.quadraticCurveTo(x0 + bw, by, x0 + bw, by + r); ctx.lineTo(x0 + bw, by + bh - r); ctx.quadraticCurveTo(x0 + bw, by + bh, x0 + bw - r, by + bh); ctx.lineTo(x0 + r, by + bh); ctx.quadraticCurveTo(x0, by + bh, x0, by + bh - r); ctx.lineTo(x0, by + r); ctx.quadraticCurveTo(x0, by, x0 + r, by); ctx.closePath();
    ctx.fillStyle = gr; ctx.fill(); ctx.lineWidth = Math.max(2, 0.07 * s); ctx.strokeStyle = St.frame; ctx.stroke();
    // vetas
    ctx.strokeStyle = 'rgba(0,0,0,0.12)'; ctx.lineWidth = Math.max(1, 0.02 * s);
    for (var k = 1; k < 3; k++) { var yy = by + bh * k / 3; ctx.beginPath(); ctx.moveTo(x0 + 0.1 * s, yy); ctx.lineTo(x0 + bw - 0.1 * s, yy); ctx.stroke(); }
    // clavos / adornos en las esquinas
    ctx.fillStyle = St.trim; [[0.08, 0.2], [0.92, 0.2], [0.08, 0.8], [0.92, 0.8]].forEach(function (c) { ctx.beginPath(); ctx.arc(x0 + bw * c[0], by + bh * c[1], 0.06 * s, 0, 7); ctx.fill(); });
    // nombre ajustado a la tabla
    var maxW = bw * 0.78, fs = bh * 0.55;
    ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.font = Math.round(fs) + 'px Lilita, sans-serif';
    var tw = ctx.measureText(name).width; if (tw > maxW) { fs *= maxW / tw; ctx.font = Math.round(fs) + 'px Lilita, sans-serif'; }
    ctx.lineWidth = Math.max(2, fs * 0.16); ctx.strokeStyle = St.ink === '#fff4d6' ? '#2a1408' : 'rgba(255,245,220,0.85)'; ctx.fillStyle = St.ink;
    ctx.strokeText(name, x, by + bh * 0.54); ctx.fillText(name, x, by + bh * 0.54);
    ctx.restore();
  };

  function Game(canvas, level, opts) {
    this.cv = canvas; this.ctx = canvas.getContext('2d'); this.level = level; this.o = opts || {};
    this.style = this.o.style || 'bandido'; this.clan = this.o.clan || 'japon'; this.bg = this.o.bg || 'w1';
    this.cannonLvl = this.o.cannonLvl || 0;
    this.phys = new RS.Phys(level);
    this.queue = level.arms.map(function (a) { return { arm: a, used: false }; });
    this.boost = this.o.boost || {};
    if (this.boost.extra) { var pool = [3, 2, 6, 8, 1]; this.queue.push({ arm: pool[Math.floor(Math.random() * pool.length)], used: false, freed: true }); }
    this.sel = 0; this.state = 'aim'; this.parts = []; this.pops = []; this.shake = 0;
    this.defense = !!this.o.defense; if (this.defense) { this.state = 'dwait'; this.dT = -1.5; this.dShots = 3; this.intercepts = 2; }
    this.aim = null; this.power = 0; this.angle = level.mortar ? 1.0 : 0.6; this.recoil = 0; this.fireAnim = 0; this.flightT = 0; this.settleT = 0;
    this.cannonX = 0; this.clouds = []; this.t = 0; this.paused = false; this.ended = false;
    for (var i = 0, nc = RS.gfx().clouds; i < nc; i++) this.clouds.push({ i: i % 8, x: Math.random() * 60 - 10, y: 9 + Math.random() * 6, v: 0.2 + Math.random() * 0.4, s: 2 + Math.random() * 2 });
    this.uz = 1; this.ptrs = {};
    var top = 3; (level.pieces || []).forEach(function (p) { var a = RS.pieceAABB(p); if (a.y1 > top) top = a.y1; }); (level.terrain || []).forEach(function (t) { if (t.top + 1 > top) top = t.top + 1; }); this.topY = top;
    this.resize(); this.camHome(true); this.intro = 0;
    this.bind(); this.last = performance.now(); this.acc = 0; this.initWeather();
    var self = this; this.gx = RS.gfx(); this.lastDraw = 0;
    this.raf = requestAnimationFrame(function f(t) { if (self.dead) return; if (self.gx.fps < 60 && t - self.lastDraw < 1000 / self.gx.fps - 2) { self.raf = requestAnimationFrame(f); return; } self.lastDraw = t; self.frame(t); self.raf = requestAnimationFrame(f); });
  }
  RS.Game = Game;

  Game.prototype.destroy = function () { this.dead = true; cancelAnimationFrame(this.raf); this.unbind(); if (RS.Audio.amb) RS.Audio.amb(null); };

  // ---------- clima y ambiente (partículas en pantalla) ----------
  var WXDEF = {
    rain: { n: 110, col: 'rgba(200,220,255,0.55)', snd: 'rain' }, storm: { n: 160, col: 'rgba(220,235,255,0.7)', snd: 'rain', flash: true },
    snow: { n: 70, col: 'rgba(255,255,255,0.9)', snd: 'wind' }, blizzard: { n: 170, col: 'rgba(255,255,255,0.95)', snd: 'wind' }, leaves: { n: 14, cols: ['#e07a2c', '#c9462b', '#e8b33a', '#7fa33a'] },
    dust: { n: 40, col: 'rgba(240,190,120,0.35)', snd: 'wind' }, embers: { n: 45, cols: ['#ffb030', '#ff6a1a', '#ffd25a'] },
    neon: { n: 26, cols: ['#ff4fd8', '#4fe3ff', '#b46bff'] }, fireflies: { n: 34, cols: ['#d8ff6a', '#fff59a'], snd: 'night' },
    petals: { n: 22, cols: ['#ffc2d9', '#ffe1ec', '#fff'] }, sparkles: { n: 34, cols: ['#c48bff', '#6fd3ff', '#ff9bf2'] },
    confetti: { n: 40, cols: ['#ff4d4d', '#ffd24d', '#4dd2ff', '#7dff6a', '#ff7de0'] }, gold: { n: 36, cols: ['#ffd23f', '#fff2a8', '#ffb020'] },
  };
  Game.prototype.initWeather = function () {
    var k = this.level.weather; this.wx = null; if (!k || !WXDEF[k] || RS.save.fx === false) return;
    var D = WXDEF[k], ps = [];
    for (var i = 0, nn = Math.max(4, Math.round(D.n * RS.gfx().wx)); i < nn; i++) ps.push(this.newDrop(k, true));
    this.wx = { k: k, D: D, ps: ps, flash: 0, nextFlash: 4 + Math.random() * 6 };
    if (D.snd && RS.Audio.amb) RS.Audio.amb(D.snd);
  };
  Game.prototype.newDrop = function (k, any) {
    var W = this.W, H = this.H, d = this.dpr, r = Math.random;
    var p = { x: r() * W, y: any ? r() * H : -10 * d, c: 0, s: 1, ph: r() * 7 };
    if (k === 'rain' || k === 'storm') { p.vx = -60 * d; p.vy = (k === 'storm' ? 900 : 650) * d * (0.8 + r() * 0.4); p.l = (k === 'storm' ? 22 : 15) * d; }
    else if (k === 'snow' || k === 'blizzard') { p.vx = (k === 'blizzard' ? -160 : -20) * d; p.vy = (35 + r() * 40) * d; p.s = (1.5 + r() * 2.5) * d; }
    else if (k === 'dust') { p.vx = (70 + r() * 60) * d; p.vy = (r() - 0.5) * 10 * d; p.s = (1 + r() * 2) * d; p.y = any ? H * (0.4 + r() * 0.55) : H * (0.4 + r() * 0.55); if (!any) p.x = -10; }
    else if (k === 'embers' || k === 'gold' || k === 'sparkles') { p.vx = (r() - 0.5) * 20 * d; p.vy = -(25 + r() * 45) * d; p.s = (2 + r() * 3) * d; if (!any) p.y = H + 10; if (k !== 'embers') { p.vy *= 0.4; } }
    else if (k === 'fireflies' || k === 'neon') { p.vx = (r() - 0.5) * 25 * d; p.vy = (r() - 0.5) * 20 * d; p.s = (2.4 + r() * 2.6) * d; p.y = r() * H * 0.85; }
    else { p.vx = (-25 - r() * 40) * d; p.vy = (30 + r() * 40) * d; p.s = (3 + r() * 4) * d; p.rot = r() * 7; p.vr = (r() - 0.5) * 4; }
    var D = WXDEF[k]; if (D.cols) p.c = D.cols[Math.floor(r() * D.cols.length)];
    return p;
  };
  Game.prototype.updateWeather = function (dt) {
    var w = this.wx; if (!w) return; var self = this, W = this.W, H = this.H, wind = (this.phys.wind || 0) * 25 * this.dpr;
    w.ps.forEach(function (p, i) {
      p.ph += dt; p.x += (p.vx + wind) * dt; p.y += p.vy * dt; if (p.vr) p.rot += p.vr * dt;
      if (w.k === 'fireflies' || w.k === 'neon') { p.vx += Math.sin(p.ph * 1.3) * 6 * self.dpr * dt * 10; p.vy += Math.cos(p.ph) * 5 * self.dpr * dt * 10; p.vx *= 0.98; p.vy *= 0.98; }
      if (p.y > H + 20 || p.y < -30 || p.x < -40 || p.x > W + 40) w.ps[i] = self.newDrop(w.k, w.k === 'fireflies' || w.k === 'neon' || w.k === 'dust');
    });
    if (w.D.flash) { w.nextFlash -= dt; if (w.nextFlash <= 0) { w.flash = 1; w.nextFlash = 5 + Math.random() * 8; setTimeout(function () { RS.Audio.sfx('explode', 0.25); }, 350 + Math.random() * 600); } w.flash = Math.max(0, w.flash - dt * 3); }
  };
  Game.prototype.drawWeather = function (ctx) {
    var w = this.wx; if (!w) return; var t = this.t;
    ctx.save();
    if (w.k === 'rain' || w.k === 'storm') {
      ctx.fillStyle = w.k === 'storm' ? 'rgba(20,30,60,0.22)' : 'rgba(40,60,90,0.12)'; ctx.fillRect(0, 0, this.W, this.H);
      ctx.strokeStyle = w.D.col; ctx.lineWidth = 1.4 * this.dpr; ctx.beginPath();
      w.ps.forEach(function (p) { ctx.moveTo(p.x, p.y); ctx.lineTo(p.x + p.vx * 0.02, p.y + p.l); }); ctx.stroke();
      if (w.flash > 0) { ctx.fillStyle = 'rgba(255,255,255,' + (w.flash * 0.55) + ')'; ctx.fillRect(0, 0, this.W, this.H); }
    } else {
      w.ps.forEach(function (p) {
        var glow = w.k === 'fireflies' || w.k === 'embers' || w.k === 'gold' || w.k === 'sparkles' || w.k === 'neon';
        var a = glow ? 0.55 + 0.45 * Math.sin(p.ph * 4) : 1;
        ctx.globalAlpha = a; ctx.fillStyle = p.c || w.D.col;
        if (w.k === 'leaves' || w.k === 'petals' || w.k === 'confetti') { ctx.save(); ctx.translate(p.x, p.y); ctx.rotate(p.rot); if (w.k === 'confetti') ctx.fillRect(-p.s / 2, -p.s / 4, p.s, p.s / 2); else { ctx.beginPath(); ctx.ellipse(0, 0, p.s, p.s * 0.5, 0, 0, 7); ctx.fill(); } ctx.restore(); }
        else { if (glow) { ctx.shadowColor = p.c; ctx.shadowBlur = RS.gfx().glow ? 12 * (window.devicePixelRatio > 1 ? 2 : 1) : 0; } ctx.beginPath(); ctx.arc(p.x, p.y, p.s, 0, 7); ctx.fill(); ctx.shadowBlur = 0; }
      });
    }
    ctx.restore();
  };

  Game.prototype.resize = function () {
    var d = Math.min(RS.gfx().dpr, window.devicePixelRatio || 1);
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
    if (this.level.mortar) { tl = 2.1; th *= 1.45; } // mortero: tubo corto y ancho para tiros altos
    var pivot = { x: this.cannonX + 0.1, y: bh * 0.78 };
    var dir = { x: Math.cos(this.angle), y: Math.sin(this.angle) };
    return { sheet: sheet, bw: bw, bh: bh, tl: tl, th: th, pivot: pivot, muzzle: { x: pivot.x + dir.x * tl * 0.56, y: pivot.y + dir.y * tl * 0.56 }, dir: dir };
  };

  // ---------- entrada ----------
  Game.prototype.bind = function () {
    var self = this;
    this._down = function (e) { self.onDown(e); }; this._move = function (e) { self.onMove(e); }; this._up = function (e) { self.onUp(e); };
    this._rs = function () { self.resize(); self.camHome(false); };
    this._wh = function (e) { e.preventDefault(); self.setZoom(self.uz * (e.deltaY < 0 ? 1.12 : 1 / 1.12)); };
    this.cv.addEventListener('wheel', this._wh, { passive: false }); addEventListener('pointercancel', this._up);
    this.cv.addEventListener('pointerdown', this._down); addEventListener('pointermove', this._move); addEventListener('pointerup', this._up);
    addEventListener('resize', this._rs);
  };
  Game.prototype.unbind = function () {
    this.cv.removeEventListener('pointerdown', this._down); removeEventListener('pointermove', this._move); removeEventListener('pointerup', this._up); removeEventListener('resize', this._rs); this.cv.removeEventListener('wheel', this._wh); removeEventListener('pointercancel', this._up);
  };
  Game.prototype.onDown = function (e) {
    this.ptrs[e.pointerId] = { x: e.clientX, y: e.clientY };
    var ids = Object.keys(this.ptrs);
    if (ids.length === 2) { this.aim = null; this.power = 0; this.pan = null; this.pinch = this.pinchD(); this.pinchZ = this.uz; return; }
    if (this.paused || this.ended) return;
    var x = (e.clientX - RS.stage.x) * this.dpr, y = (e.clientY - RS.stage.y) * this.dpr;
    if (this.defense) {
      if (this.state === 'flight' && this.intercepts > 0) {
        var wx = (x - this.W / 2) / this.cam.s + this.cam.x, wy = (this.H * 0.86 + this.camLift() - y) / this.cam.s, P = this.phys, self = this;
        P.balls.forEach(function (u) { if (u.dead || self.intercepts <= 0) return; var q = u.body.getPosition(); if (Math.hypot(q.x - wx, q.y - wy) < 1.6) { self.intercepts--; u.dead = true; P.dead.push(u.body); self.parts.push({ fx: 'fx', fr: [0, 1, 2, 3], x: q.x, y: q.y, w: 2.4, life: 0.5, t: 0 }); RS.Audio.sfx('explode', 0.7); self.pops.push({ x: q.x, y: q.y + 1, t: 0, txt: '¡Desviado!', gold: true }); } });
      }
      return;
    }
    if (this.state === 'aim' && this.intro > 0) { this.intro = 0; }
    if (this.state === 'aim' && x > this.W * 0.55 && this.camMaxX() > this.camHomeX() + 0.5) { this.pan = { x0: x, cx0: this.cam.x, d: 0 }; return; }
    if (this.state === 'aim' && !this.queue[this.sel].used) { this.view = 0; this.aim = { sx: x, sy: y, cx: x, cy: y, full: 0 }; RS.Audio.sfx('click', 0.4); if (this.o.onAim) this.o.onAim(); }
    else if (this.state === 'flight') {
      var b = this.phys.activeBall();
      if (b && !b.used) { var tw = { x: (x - this.W / 2) / this.cam.s + this.cam.x, y: (this.H * 0.86 + this.camLift() - y) / this.cam.s }; var k = this.phys.ability(b, tw); if (k) this.abilityFx(k, b); }
    }
  };
  Game.prototype.pinchD = function () { var self = this, p = Object.keys(this.ptrs).map(function (k) { return self.ptrs[k]; }); return Math.max(20, Math.hypot(p[0].x - p[1].x, p[0].y - p[1].y)); };
  Game.prototype.setZoom = function (z) { this.uz = Math.max(1, Math.min(2.6, z)); this.camT.s = this.baseScale(); if (this.uz > 1.02) this.view = 3; };
  Game.prototype.onMove = function (e) {
    if (this.ptrs[e.pointerId]) { this.ptrs[e.pointerId].x = e.clientX; this.ptrs[e.pointerId].y = e.clientY; }
    if (this.pinch && Object.keys(this.ptrs).length === 2) { this.setZoom(this.pinchZ * this.pinchD() / this.pinch); return; }
    if (this.pan) { this.pan.d = (this.pan.x0 - (e.clientX - RS.stage.x) * this.dpr) / this.cam.s; this.view = 2.5; return; }
    if (!this.aim) return;
    this.aim.cx = (e.clientX - RS.stage.x) * this.dpr; this.aim.cy = (e.clientY - RS.stage.y) * this.dpr;
    var dx = this.aim.sx - this.aim.cx, dy = this.aim.cy - this.aim.sy; // tirar hacia atrás → disparar hacia delante
    var len = Math.hypot(dx, dy);
    if (len < 8) return;
    var a = Math.atan2(dy, dx); if (dx < 0) a = dy > 0 ? Math.PI / 2 : -0.17;
    this.angle = this.level.mortar ? Math.max(0.3, Math.min(1.45, a)) : Math.max(-0.17, Math.min(1.4, a));
    var p = Math.min(1, len / (this.H * 0.32));
    if (p > this.power + 0.04 && this.t - (this.pourT || 0) > 0.18) { RS.Audio.sfx('pour', 0.25 + p * 0.3); this.pourT = this.t; }
    this.power = p;
  };
  Game.prototype.onUp = function (e) {
    if (e && this.ptrs) delete this.ptrs[e.pointerId];
    if (this.pinch) { if (!Object.keys(this.ptrs).length) this.pinch = null; return; }
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
    var ang = this.angle + (over ? (Math.random() - 0.5) * 0.07 : 0) + (this.jitter ? (Math.random() - 0.5) * this.jitter : 0);
    var g = this.cannonGeo(), pw = this.power * (over ? 1.08 : 1) * (this.boost.power ? 1.15 : 1);
    if (this.cap) pw = Math.min(pw, this.cap);
    this.cap = 0; this.jitter = 0; if (this.o.onDebuff) this.o.onDebuff(null);
    var ub = this.phys.launch(q.arm, g.muzzle, ang, pw); ub.mult *= 1 + 0.08 * (((RS.save && RS.save.armLv && RS.save.armLv[q.arm]) || 1) - 1);
    this.lastArm = q.arm; this.combo = 0; this.comboPts = 0; this.impactZoom = false;
    this.shotKO0 = this.phys.racs.filter(function (r) { return r.ko; }).length; this.shotBroken0 = this.phys.destroyed; RS.vib(30); stat(this, 'shot', q.arm);
    q.used = true; this.state = 'flight'; this.flightT = 0; this.recoil = 1; this.shake = 10 * this.dpr;
    (this.level.mortar && RS.Audio.synth ? RS.Audio.synth('mortar', 0.9) : RS.Audio.sfx('cannon', 0.9));
    this.parts.push({ fx: 'pow', fr: [6, 7, 8, 9, 10, 11], x: g.muzzle.x + g.dir.x * 0.9, y: g.muzzle.y + g.dir.y * 0.9, w: 2.4, life: 0.45, t: 0, ang: -ang });
    this.parts.push({ fx: 'pow', fr: [12, 13, 14, 15, 16, 17], x: g.muzzle.x, y: g.muzzle.y + 0.3, w: 2.2, life: 1.1, t: 0, vy: 0.6 });
    this.power = 0; this.overT = 0;
    if (this.o.onQueue) this.o.onQueue();
  };

  Game.prototype.abilityFx = function (kind, b) {
    var p = b.body.getPosition();
    var snd = { stick: 'pour', tornado: 'whoosh', bubble: 'magic', cut: 'zap', magma: 'explode', mirror: 'magic', lead: 'whoosh', rocket: 'cannon', vine: 'wood_hit', shard: 'glass_break', astral: 'magic', royal: 'star', slam: 'whoosh', split: 'magic', drill: 'zap', boom: 'explode', bounce: 'bounce', magnet: 'magic', grow: 'magic', boomerang: 'whoosh', freeze: 'ice_break', meteor: 'explode', dash: 'zap', ghost: 'magic' }[kind];
    RS.Audio.sfx(snd, 0.8); stat(this, 'abil', b.arm); if (kind === 'boom' || kind === 'meteor' || kind === 'magma') RS.vib(70);
    var asp0 = RS.armSprite(b.arm, 'abil'); this.parts.push({ fx: asp0[0], fr: [asp0[1]], x: p.x, y: p.y, w: 2.2, life: 0.35, t: 0, fade: true });
    if (kind === 'freeze') for (var i = 0; i < 8; i++) this.parts.push({ fx: 'fx', fr: [12, 13, 14, 15], x: p.x + (Math.random() - 0.5) * 6, y: p.y + (Math.random() - 0.5) * 5, w: 1.6, life: 0.7, t: 0 });
    if (this.o.onAbility) this.o.onAbility(kind);
  };

  // ---------- bucle ----------
  Game.prototype.frame = function (now) {
    var dt = Math.min(0.05, (now - this.last) / 1000); this.last = now;
    if (this.slowT > 0) { this.slowT -= dt; dt *= 0.28; }
    if (!this.paused) { this.acc += dt; while (this.acc >= 1 / 60) { this.update(1 / 60); this.acc -= 1 / 60; } }
    this.draw();
  };

  Game.prototype.update = function (dt) {
    this.t += dt; var P = this.phys; this.updateWeather(dt);
    var cap = (this.gx || RS.gfx()).parts; if (this.parts && this.parts.length > cap) this.parts.splice(0, this.parts.length - cap);
    if (this.state !== 'end' || P.time < 60) P.step(dt);
    this.handleEvents(P.drain());
    if (this.aim && this.power >= 0.999) this.overT = (this.overT || 0) + dt; else this.overT = 0;
    this.recoil = Math.max(0, this.recoil - dt * 3); this.shake = Math.max(0, this.shake - dt * 40);
    this.clouds.forEach(function (c) { c.x += c.v * dt; if (c.x > 90) c.x = -20; });
    var self = this;
    this.parts = this.parts.filter(function (p) {
      p.t += dt;
      if (p.proj) { if (p.t >= p.life && !p.fired) { p.fired = true; if (p.done) p.done(); } return p.t < p.life; } if (p.vx != null) { p.x += p.vx * dt; p.y += p.vy * dt; if (p.g) p.vy -= p.g * dt; p.ang = (p.ang || 0) + (p.va || 0) * dt; }
      else if (p.vy) p.y += p.vy * dt;
      return p.t < p.life;
    });
    this.pops = this.pops.filter(function (p) { p.t += dt; p.y += dt * 1.2; return p.t < 1.2; });
    // cámara
    if (this.state === 'flight') {
      this.flightT += dt;
      var b = P.activeBall();
      if (b) { var bp = b.body.getPosition();
        if (this.level.mortar) { var bs = this.baseScale(), zs = Math.max(bs * 0.45, Math.min(bs, this.H * 0.82 / (bp.y + 2))); this.camT = { x: Math.min(this.camMaxX(), Math.max(this.camHomeX(), bp.x + 2)), y: 0, s: zs, lift: 0 }; }
        else this.camT = { x: Math.min(this.camMaxX(), Math.max(this.camHomeX(), bp.x + 2)), y: 0, s: this.baseScale(), lift: Math.max(0, (bp.y - this.viewTop()) * this.cam.s) }; }
      var endX = (this.level.end || 30) + 4; var alive = P.balls.filter(function (u) { var q = u.body.getPosition(); return u.rest < 1.0 && q.x < endX && q.x > -12; });
      if (!P.balls.length || !alive.length || this.flightT > 9) {
        P.balls.forEach(function (u) { var q = u.body.getPosition(); self.dust(q.x, q.y, 1.4); u.dead = true; P.dead.push(u.body); });
        this.state = 'settle'; this.settleT = 0;
      }
    } else if (this.state === 'dwait') {
      this.dT += dt; this.camHome(false);
      if (this.dT > 1.2) this.enemyFire();
    } else if (this.state === 'enemy') {
      this.enemyT += dt; this.camHome(false); P.racs.forEach(function (r) { if (r.actT > 0) r.actT -= dt; });
      if (this.enemyT > 2.0) { this.state = 'aim'; if (this.o.onQueue) this.o.onQueue(); }
    } else if (this.state === 'settle') {
      this.settleT += dt;
      if ((P.settled() && this.settleT > 0.8) || this.settleT > 4.5) this.afterShot();
    } else if (this.state === 'aim') {
      if (this.intro > 0) { this.intro -= dt; this.camT = { x: this.camMaxX(), y: 0, s: this.baseScale(), lift: 0 }; if (this.intro <= 0) this.view = 0; }
      else if (this.pan) this.camT.x = Math.min(this.camMaxX(), Math.max(this.camHomeX(), this.pan.cx0 + this.pan.d));
      else if (!this.view) { this.camHome(false); }
      else this.view = Math.max(0, this.view - dt);
    }
    if (this.focus && this.focus.t > 0) { this.focus.t -= dt; var fs = this.baseScale() * (this.focus.z || 1.35); this.camT = { x: this.focus.x, y: 0, s: fs, lift: Math.max(0, (this.focus.y - 3) * fs) }; }
    if (this.big) { this.big.t += dt; if (this.big.t > this.big.life) this.big = null; }
    var c = this.cam, T = this.camT, k = Math.min(1, dt * 3.5);
    c.x += (T.x - c.x) * k; c.s += (T.s - c.s) * k; c.lift = (c.lift || 0) + ((T.lift || 0) - (c.lift || 0)) * k;
    if (this.o.onTick) this.o.onTick();
  };
  // zoom base: que quepan a la vez el cañón y toda la fortaleza; el jugador puede acercar con pellizco o rueda
  Game.prototype.fitScale = function () { var span = (this.level.end || 30) + 2.5 - (this.cannonX - 3.5); return Math.min(this.W / span, this.H * 0.7 / (this.topY + 1.5), this.H / 8); };
  Game.prototype.baseScale = function () { return this.fitScale() * (this.uz || 1); };
  Game.prototype.viewTop = function () { return this.H * 0.86 / this.cam.s - 1.8; };
  Game.prototype.camHomeX = function () { return this.cannonX - 3.5 + this.W / 2 / this.cam.s; };

  // contraataque: la catapulta de los mapaches dispara a tu fortaleza
  Game.prototype.enemyFire = function () {
    var P = this.phys, gems = P.gems.filter(function (g) { return !g.freed; }), g = this.cannonGeo();
    var tgt = gems.length ? gems[Math.floor(Math.random() * gems.length)].body.getPosition() : { x: (this.level.end || 30) - 5, y: 1 };
    var a = 0.62 + Math.random() * 0.25, mx = g.pivot.x + Math.cos(a) * 1.6, my = g.pivot.y + Math.sin(a) * 1.6;
    var dx = tgt.x - mx, dy = tgt.y - my, den = 2 * Math.cos(a) * Math.cos(a) * (dx * Math.tan(a) - dy);
    var v = den > 0 ? Math.sqrt(-RS.PHYS.gravity * dx * dx / den) : RS.PHYS.vMax * 0.8;
    var pw = Math.min(1, v / RS.PHYS.vMax) * (0.93 + Math.random() * 0.12);
    this.angle = a; var u = P.launch(0, { x: mx, y: my }, a, pw); u.enemy = true; u.used = true; u.mult = 1.5;
    this.dShots--; this.state = 'flight'; this.flightT = 0; this.recoil = 1; this.shake = 8 * this.dpr; RS.Audio.sfx('cannon', 0.8);
    if (this.o.onQueue) this.o.onQueue();
  };
  Game.prototype.won = function () { var P = this.phys; return P.racs.length ? P.racsLeft() === 0 : P.gemsLeft() === 0; };
  // vídeo con premio tras perder: un armadillo más y se sigue jugando
  Game.prototype.revive = function () {
    this.queue.push({ arm: this.lastArm != null ? this.lastArm : 0, used: false, freed: true });
    this.phys.racs.forEach(function (r) { r.win = false; }); this.ended = false; this.result = null; this.sel = this.queue.length - 1; this.state = 'aim'; this.slowT = 0; this.big = { txt: '🎁 +1 ARMADILLO', t: 0, life: 1.6 };
    if (this.o.onQueue) this.o.onQueue();
  };
  Game.prototype.afterShot = function () {
    var P = this.phys;
    var msgs = [];
    if (!this.defense && this.combo >= 3) {
      var cb = Math.min(10, this.combo), bonus = cb * 250; P.score += bonus;
      msgs.push('¡COMBO x' + cb + '!  +' + bonus); stat(this, 'combo', cb);
    }
    // jugadas maestras de un solo tiro: varios K.O. o un gran derrumbe (como mucho 1 armadillo extra por nivel)
    if (!this.defense && this.shotKO0 != null) {
      var kos = P.racs.filter(function (r) { return r.ko; }).length - this.shotKO0, broke = P.destroyed - this.shotBroken0, gift = false;
      if (kos >= 3) { P.score += 2500; msgs.push('¡TRIPLE K.O.!  +2500'); gift = true; stat(this, 'multiko', kos); }
      else if (kos === 2) { P.score += 1000; msgs.push('¡DOBLE K.O.!  +1000'); stat(this, 'multiko', 2); }
      if (broke >= 8) { P.score += 800; msgs.push('¡DERRUMBE! ' + broke + ' piezas  +800'); gift = true; stat(this, 'collapse', broke); }
      if (gift && !this.giftArm && !this.won()) {
        this.giftArm = true; this.queue.push({ arm: this.lastArm != null ? this.lastArm : 0, used: false, freed: true });
        msgs.push('🎁 +1 ARMADILLO'); if (this.o.onQueue) this.o.onQueue(); RS.vib(60); if (RS.Audio.synth) setTimeout(function () { RS.Audio.synth('gift'); }, 450);
      }
      this.shotKO0 = null;
    }
    if (msgs.length) { this.big = { txt: msgs.join('\n'), t: 0, life: 1.4 + msgs.length * 0.4 }; if (msgs.length > 1 || /K\.O\.|DERRUMBE/.test(msgs[0])) { if (RS.Audio.synth) RS.Audio.synth('fanfare', 0.8); } else RS.Audio.sfx('star', 0.8); }
    this.combo = 0;
    if (this.defense) {
      if (P.gemsLeft() === 0) return this.finish(false);
      if (this.dShots <= 0) return this.finish(true);
      this.state = 'dwait'; this.dT = 0; return;
    }
    if (this.won()) return this.finish(true);
    var next = this.queue.findIndex(function (q) { return !q.used; });
    if (next < 0) return this.finish(false);
    this.sel = next;
    if (this.enemyTurn()) { this.state = 'enemy'; this.enemyT = 0; return; }
    this.state = 'aim'; if (this.o.onQueue) this.o.onQueue();
  };
  // turno de los mapaches: cada especialista vivo hace su jugada (como mucho 2 por turno)
  Game.prototype.enemyTurn = function () {
    var self = this, P = this.phys, alive = P.racs.filter(function (r) { return !r.ko; }), acts = [];
    alive.forEach(function (r) { var a = r.boss ? RS.BOSSES[r.bi != null ? r.bi : RS.bossIdx(self.level.w || 1)].act : r.T.act; if (a) acts.push({ r: r, a: a }); });
    if (!acts.length) return false;
    acts.sort(function () { return Math.random() - 0.5; }); acts = acts.slice(0, this.level.enemyActs || 2);
    var g = this.cannonGeo();
    acts.forEach(function (A, i) {
      var r = A.r, q = r.body.getPosition(), a = A.a, delay = i * 0.55; r.actT = 1.2 + delay;
      var fly = function (kind, cb) { self.parts.push({ proj: kind, x0: q.x, y0: q.y + 0.4, x1: g.pivot.x, y1: g.pivot.y + 0.3, t: -delay, life: 0.9, done: cb }); };
      if (a === 'sling') fly('pina', function () { self.cap = 0.82; self.debuff('🌰 ¡Pólvora mojada! Máx. 82 %'); });
      else if (a === 'bomb') fly('bomba', function () { self.jitter = 0.16; self.shake = 14 * self.dpr; RS.Audio.sfx('explode', 0.6); self.parts.push({ fx: 'fx', fr: [0, 1, 2, 3], x: g.pivot.x, y: g.pivot.y, w: 2.6, life: 0.5, t: 0 }); self.debuff('💣 ¡Cañón torcido! Puntería inestable'); });
      else if (a === 'freezeCannon') fly('hielo', function () { self.cap = 0.72; self.debuff('❄ ¡Cañón congelado! Máx. 72 %'); });
      else if (a === 'pie') fly('tarta', function () { if (self.o.onSplat) self.o.onSplat(true); RS.Audio.sfx('bounce', 0.6); });
      else if (a === 'repair' || a === 'repairAll') {
        var bl = P.blocks.filter(function (b) { return !b.dead && b.hp < b.hp0; });
        if (a === 'repair') { bl.sort(function (x, y) { return x.hp / x.hp0 - y.hp / y.hp0; }); bl = bl.slice(0, 1); }
        if (!bl.length) return;
        setTimeout(function () { bl.forEach(function (b) { b.hp = b.hp0; b.frozen = false; var p = b.body.getPosition(); self.parts.push({ fx: 'fx', fr: [8, 9, 10, 11], x: p.x, y: p.y, w: 1.2, life: 0.4, t: 0 }); }); RS.Audio.sfx('metal_hit', 0.6); self.pops.push({ x: q.x, y: q.y + 1.2, t: 0, txt: '🔨 ¡Reparado!' }); }, delay * 1000);
      } else if (a === 'steal') { setTimeout(function () { var v = Math.min(500, P.score); P.score -= v; self.pops.push({ x: q.x, y: q.y + 1.2, t: 0, txt: '💰 -' + v }); RS.Audio.sfx('gem', 0.4); }, delay * 1000); }
      else if (a === 'alarm') { setTimeout(function () { alive.forEach(function (o) { o.helmet = true; }); self.pops.push({ x: q.x, y: q.y + 1.2, t: 0, txt: '📯 ¡Alarma! Cascos' }); RS.Audio.sfx('whoosh', 0.6); }, delay * 1000); }
      else if (a === 'ward' || a === 'wardAll') { setTimeout(function () { var tg = alive.filter(function (o) { return o !== r && !o.shield; }); if (a === 'ward') tg = tg.slice(0, 1); if (!tg.length) tg = [r]; tg.forEach(function (o) { o.shield = true; }); self.pops.push({ x: q.x, y: q.y + 1.2, t: 0, txt: '✨ ¡Escudo mágico!' }); RS.Audio.sfx('magic', 0.6); }, delay * 1000); }
    });
    return true;
  };
  Game.prototype.debuff = function (txt) { if (this.o.onDebuff) this.o.onDebuff(txt); RS.Audio.sfx('stone_hit', 0.5); };

  Game.prototype.finish = function (win) {
    if (this.ended) return; this.ended = true; this.state = 'end';
    if (!win) this.phys.racs.forEach(function (r) { if (!r.ko) r.win = true; });
    var left = this.queue.filter(function (q) { return !q.used; }).length;
    var bonus = win ? left * 1500 : 0, score = this.phys.score + bonus;
    var st = this.level.stars, stars = win ? 1 + (score >= st[1] ? 1 : 0) + (score >= st[2] ? 1 : 0) : 0;
    // con par: las estrellas dependen de los armadillos gastados (★★★ = tiro perfecto)
    var usedN = this.queue.filter(function (q) { return q.used; }).length, par = this.level.par;
    if (win && par) stars = usedN <= par ? 3 : usedN <= par + 1 ? 2 : 1;
    if (this.defense) { var gl = this.phys.gemsLeft(), gt = this.phys.gems.length || 1; stars = win ? Math.max(1, Math.round(3 * gl / gt)) : 0; score = 1000 * gl + 500 * this.intercepts; bonus = 0; }
    var destr = this.phys.totalValue ? this.phys.destroyedValue / this.phys.totalValue : 0;
    this.result = { used: this.queue.filter(function (q) { return q.used; }).length, win: win, stars: stars, score: score, bonus: bonus, left: left, destr: destr, racs: this.phys.racs.length, ko: this.phys.racs.filter(function (r) { return r.ko; }).length, gems: this.phys.gems.length, gemsGot: this.phys.gems.filter(function (g) { return g.freed; }).length };
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
        self.pops.push({ x: e.x, y: e.y + 0.5, t: 0, txt: '+' + 100 * M.cost }); self.combo = (self.combo || 0) + 1;
      } else if (e.t === 'crack') {
        RS.Audio.sfx({ wood: 'wood_hit', stone: 'stone_hit', ice: 'ice_break', metal: 'metal_hit', glass: 'glass_break' }[M.sfx], 0.35);
      } else if (e.t === 'hit') {
        // zoom corto en el primer golpe fuerte de cada tiro, para ver bien el impacto
        if (e.d > 25 && !self.impactZoom && !self.defense && !(self.focus && self.focus.t > 0) && self.state === 'flight' && !(RS.save && RS.save.zoomFx === false)) { self.impactZoom = true; self.focus = { x: e.x, y: e.y, t: 0.7, z: 1.22 }; }
        if (e.d > 25) { self.parts.push({ fx: 'fx', fr: [8, 9, 10, 11], x: e.x, y: e.y, w: 1.3, life: 0.3, t: 0 }); RS.Audio.sfx({ wood: 'wood_hit', stone: 'stone_hit', ice: 'stone_hit', metal: 'metal_hit', glass: 'stone_hit' }[M.sfx], Math.min(0.5, e.d / 120)); }
      } else if (e.t === 'racko') {
        RS.Audio.sfx(e.boss ? 'explode' : 'star', 0.7); self.dust(e.x, e.y, 1.4); self.pops.push({ x: e.x, y: e.y + 1, t: 0, txt: '+' + e.v, gold: true });
        self.combo = (self.combo || 0) + 2; stat(self, 'ko', { arm: self.lastArm, boss: e.boss }); RS.vib(e.boss ? 160 : 40);
        if (!self.defense && (e.boss || self.phys.racsLeft() === 0)) { self.slowT = 1.6; self.big = { txt: e.boss ? '¡JEFE DERROTADO!' : '¡K.O.!', t: 0, life: 2.2 }; self.focus = { x: e.x, y: e.y, t: 1.6 }; }
        if (self.o.onQueue) self.o.onQueue();
      } else if (e.t === 'rachit') { RS.Audio.sfx('wood_hit', 0.4);
      } else if (e.t === 'shieldpop') { RS.Audio.sfx('glass_break', 0.7); self.parts.push({ fx: 'fx', fr: [12, 13, 14, 15], x: e.x, y: e.y, w: 2.2, life: 0.4, t: 0, fade: true });
      } else if (e.t === 'cage') {
        self.parts.push({ fx: 'siege', fr: [1], x: e.x, y: e.y, w: 1.1, life: 1.2, t: 0, fade: true, vy: -0.2 });
        stat(self, 'cage'); var arm = e.arm != null ? e.arm : 1; self.queue.push({ arm: arm, used: false, freed: true });
        RS.Audio.sfx('magic', 0.9); self.pops.push({ x: e.x, y: e.y + 1.2, t: 0, txt: '¡' + RS.ARMS[arm].name + ' liberado!', gold: true });
        if (self.o.onQueue) self.o.onQueue();
      } else if (e.t === 'gem') {
        RS.Audio.sfx('gem', 0.8); stat(self, 'gem');
        self.parts.push({ fx: 'items', fr: [6 + e.c], x: e.x, y: e.y, w: 0.9, vx: -4, vy: 9, g: 6, life: 1.2, t: 0, fade: true });
        self.parts.push({ fx: 'fx', fr: [8, 9, 10, 11], x: e.x, y: e.y, w: 2, life: 0.4, t: 0 });
        self.pops.push({ x: e.x, y: e.y + 0.8, t: 0, txt: '+1000', gold: true });
        if (self.o.onQueue) self.o.onQueue();
      } else if (e.t === 'spring') { RS.Audio.sfx('bounce', 0.8); self.pops.push({ x: e.x, y: e.y + 1, t: 0, txt: '¡BOING!' });
      } else if (e.t === 'wind') { self.parts.push({ fx: 'fx', fr: [4, 5, 6, 7], x: e.x, y: e.y, w: 0.6, vx: e.dir * 9, vy: 0, life: 0.5, t: 0, fade: true });
      } else if (e.t === 'turret') { RS.Audio.sfx('cannon', 0.5); self.parts.push({ fx: 'pow', fr: [6, 7, 8, 9, 10, 11], x: e.x, y: e.y, w: 1.2, life: 0.3, t: 0, ang: -e.a });
      } else if (e.t === 'shield') { RS.Audio.sfx('glass_break', 0.8); self.parts.push({ fx: 'fx', fr: [12, 13, 14, 15], x: e.x, y: e.y, w: 4.6, life: 0.5, t: 0, fade: true }); self.pops.push({ x: e.x, y: e.y + 1.5, t: 0, txt: '¡Escudo!' });
      } else if (e.t === 'explode') {
        self.parts.push({ fx: 'fx', fr: [0, 1, 2, 3], x: e.x, y: e.y, w: 5.5, life: 0.6, t: 0 }); self.shake = 14 * self.dpr; RS.vib(60);
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
    if (mid && (this.gx || RS.gfx()).mid && RS.save && RS.save.decor) { // decorado intermedio: desactivado por defecto para ver bien cañón y fortaleza
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
    // terreno del Modo Montaña: roca con la textura del suelo del mundo y la hierba arriba
    var L = this.level;
    (L.terrain || []).forEach(function (t) {
      ctx.save(); ctx.beginPath(); t.pts.forEach(function (q, k) { var X = self.sx(q[0]), Y = self.sy(q[1]); if (k) ctx.lineTo(X, Y); else ctx.moveTo(X, Y); }); ctx.closePath();
      ctx.fillStyle = '#3b2a20'; ctx.fill(); ctx.save(); ctx.clip();
      if (gr) { var th = 3.2 * s, tw = gr.width * th / gr.height, x0 = self.sx(Math.min.apply(null, t.pts.map(function (q) { return q[0]; }))) - tw * 0.3;
        for (var yy = self.sy(t.top) - th * 0.12, row = 0; yy < self.sy(0) + th; yy += th * 0.72, row++) for (var xx = x0 - (row % 2) * tw * 0.4; xx < self.sx(Math.max.apply(null, t.pts.map(function (q) { return q[0]; }))) + tw; xx += tw - 1) ctx.drawImage(gr, xx, yy, tw, th); }
      ctx.fillStyle = 'rgba(0,0,0,0.12)'; ctx.fillRect(0, self.sy(t.top) + 1.2 * s, W, H);
      ctx.restore(); ctx.lineWidth = Math.max(2, s * 0.06); ctx.strokeStyle = 'rgba(30,18,10,0.85)'; ctx.stroke(); ctx.restore();
    });
    // adornos y cartel (fortalezas de jugador)
    (L.deco || []).forEach(function (d) { var sh = L.decoSheet || ('deco_' + self.style), a = RS.spAspect(sh, d.d), w = d.w * s, h = w / a; RS.drawSp(ctx, sh, d.d, self.sx(d.x), self.sy(d.y) - h / 2, w, h); });
    if (L.sign && RS.CLANS[this.style]) RS.drawSign(ctx, this.style, L.sign.name, this.sx(L.sign.x), this.sy(L.sign.y), s, this.dpr);
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
      RS.drawSp(ctx, 'items', 6 + g.c, self.sx(p.x), self.sy(p.y), 0.66 * s * pulse, 0.66 * s * pulse, -g.body.getAngle());
    });
    // mapaches
    this.phys.racs.forEach(function (r) { if (r.gone) return; var q = r.body.getPosition(); RS.drawRac(ctx, r, self.sx(q.x), self.sy(q.y), -r.body.getAngle(), s, self.t); });
    // cañón y armadillo en espera
    this.drawCannon(ctx);
    // bolas
    this.phys.balls.forEach(function (u) {
      var p = u.body.getPosition(), r = u.r * s * 2.15;
      if (u.enemy) { ctx.fillStyle = '#6b6158'; ctx.beginPath(); ctx.arc(self.sx(p.x), self.sy(p.y), u.r * s * 1.05, 0, TAU); ctx.fill(); ctx.fillStyle = '#8d8378'; ctx.beginPath(); ctx.arc(self.sx(p.x) - u.r * s * 0.3, self.sy(p.y) - u.r * s * 0.3, u.r * s * 0.35, 0, TAU); ctx.fill(); if (self.intercepts > 0) { ctx.strokeStyle = 'rgba(255,80,60,' + (0.5 + 0.4 * Math.sin(self.t * 12)) + ')'; ctx.lineWidth = 3 * self.dpr; ctx.beginPath(); ctx.arc(self.sx(p.x), self.sy(p.y), u.r * s * 2.2, 0, TAU); ctx.stroke(); } return; }
      if (u.fire && Math.random() < 0.6) self.parts.push({ fx: 'fx', fr: [1, 2, 3], x: p.x, y: p.y, w: u.r * 3, life: 0.3, t: 0 });
      if (u.drillT > 0) { ctx.save(); ctx.globalAlpha = 0.5; ctx.strokeStyle = '#ffcf40'; ctx.lineWidth = 4 * self.dpr; ctx.beginPath(); ctx.arc(self.sx(p.x), self.sy(p.y), r * 0.6, self.t * 20, self.t * 20 + 4); ctx.stroke(); ctx.restore(); }
      if (u.magT > 0) { ctx.save(); ctx.globalAlpha = 0.4; ctx.strokeStyle = '#ff5a5a'; ctx.lineWidth = 3 * self.dpr; for (var k = 1; k <= 3; k++) { ctx.beginPath(); ctx.arc(self.sx(p.x), self.sy(p.y), r * (0.6 + k * 0.5 + (self.t * 2 % 0.5)), 0, TAU); ctx.stroke(); } ctx.restore(); }
      var bsp = RS.armSprite(u.arm, 'ball'); RS.drawSp(ctx, bsp[0], bsp[1], self.sx(p.x), self.sy(p.y), r, r, -u.body.getAngle(), false, u.ghostT > 0 ? 0.45 : 1);
      if (u.bubbleT > 0) { ctx.save(); ctx.globalAlpha = 0.35; ctx.fillStyle = '#d8f4ff'; ctx.strokeStyle = '#fff'; ctx.lineWidth = 2 * self.dpr; ctx.beginPath(); ctx.arc(self.sx(p.x), self.sy(p.y), r * 0.85, 0, TAU); ctx.fill(); ctx.stroke(); ctx.restore(); }
    });
    // balas de torreta
    this.phys.shells.forEach(function (sh) { var q = sh.body.getPosition(); ctx.fillStyle = '#222'; ctx.beginPath(); ctx.arc(self.sx(q.x), self.sy(q.y), 0.22 * s, 0, TAU); ctx.fill(); });
    // partículas
    this.parts.forEach(function (p) {
      if (p.proj) { if (p.t < 0) return; var k = p.t / p.life, X = p.x0 + (p.x1 - p.x0) * k, Y = p.y0 + (p.y1 - p.y0) * k + Math.sin(k * Math.PI) * 4; var spi = { pina: 4, bomba: 5, hielo: 8 }[p.proj]; if (spi != null && RS.img.siege) { RS.drawSp(ctx, 'siege', spi, self.sx(X), self.sy(Y), 0.7 * s, 0.7 * s, p.t * 8); return; } var col = { pina: '#8b5a2b', bomba: '#1a1a1a', hielo: '#bfefff', tarta: '#f8e1b0' }[p.proj]; ctx.fillStyle = col; ctx.beginPath(); ctx.arc(self.sx(X), self.sy(Y), 0.25 * s, 0, TAU); ctx.fill(); if (p.proj === 'bomba') { ctx.fillStyle = '#ffb030'; ctx.beginPath(); ctx.arc(self.sx(X) + 0.15 * s, self.sy(Y) - 0.2 * s, 0.07 * s, 0, TAU); ctx.fill(); } if (p.proj === 'tarta') { ctx.fillStyle = '#e84393'; ctx.beginPath(); ctx.arc(self.sx(X), self.sy(Y) - 0.1 * s, 0.12 * s, 0, TAU); ctx.fill(); } return; }
      var f = p.fr[Math.min(p.fr.length - 1, Math.floor(p.t / p.life * p.fr.length))];
      var w = p.w * s, h = w / RS.spAspect(p.fx, f);
      RS.drawSp(ctx, p.fx, f, self.sx(p.x), self.sy(p.y), w, h, p.ang || 0, false, p.fade ? Math.max(0, 1 - p.t / p.life) : 1);
    });
    // puntos de trayectoria y barra de pólvora
    if (this.state === 'aim') this.drawAim(ctx);
    if (this.level.tod) this.drawNight(ctx);
    this.drawWeather(ctx);
    if (this.big) { var bk = this.big.t / this.big.life, sc = 1 + Math.max(0, 0.4 - this.big.t * 2); ctx.save(); ctx.globalAlpha = bk > 0.8 ? (1 - bk) * 5 : 1; ctx.font = Math.round(46 * this.dpr * sc) + 'px Lilita, sans-serif'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.lineWidth = 8 * this.dpr; ctx.strokeStyle = '#3a1e0a'; ctx.fillStyle = '#ffd23f'; var lines = String(this.big.txt).split('\n'), lh = 52 * this.dpr * sc, y0 = this.H * 0.3 - (lines.length - 1) * lh / 2, self2 = this; lines.forEach(function (ln, i) { if (i) ctx.font = Math.round(36 * self2.dpr * sc) + 'px Lilita, sans-serif'; ctx.strokeText(ln, self2.W / 2, y0 + i * lh); ctx.fillText(ln, self2.W / 2, y0 + i * lh); }); ctx.restore(); }
    this.drawHudExtra(ctx);
    // textos flotantes
    ctx.textAlign = 'center'; ctx.font = (22 * this.dpr) + 'px Lilita, sans-serif';
    this.pops.forEach(function (p) {
      ctx.globalAlpha = Math.max(0, 1 - p.t / 1.2); ctx.lineWidth = 4 * self.dpr; ctx.strokeStyle = '#3a1e0a';
      ctx.fillStyle = p.gold ? '#ffd84a' : '#fff'; ctx.strokeText(p.txt, self.sx(p.x), self.sy(p.y)); ctx.fillText(p.txt, self.sx(p.x), self.sy(p.y));
    });
    ctx.globalAlpha = 1; ctx.restore();
  };

  // atardecer / noche: tinte sobre la escena y luces cálidas en gemas, cañón y mapaches
  Game.prototype.drawNight = function (ctx) {
    var night = this.level.tod === 'night', self = this, s = this.cam.s;
    ctx.save(); ctx.globalCompositeOperation = 'multiply'; ctx.fillStyle = night ? '#5868a8' : '#f0b08a'; ctx.fillRect(0, 0, this.W, this.H);
    ctx.globalCompositeOperation = 'lighter';
    var glow = function (x, y, r, col) { var gr = ctx.createRadialGradient(x, y, 0, x, y, r); gr.addColorStop(0, col); gr.addColorStop(1, 'rgba(0,0,0,0)'); ctx.fillStyle = gr; ctx.fillRect(x - r, y - r, r * 2, r * 2); };
    if (night) {
      this.phys.gems.forEach(function (g) { if (g.freed) return; var q = g.body.getPosition(); glow(self.sx(q.x), self.sy(q.y), 1.6 * s, 'rgba(255,240,170,0.35)'); });
      this.phys.racs.forEach(function (r) { if (r.ko) return; var q = r.body.getPosition(); glow(self.sx(q.x), self.sy(q.y + 0.6), 1.3 * s, 'rgba(255,180,90,0.22)'); });
      glow(this.sx(this.cannonX), this.sy(1), 3 * s, 'rgba(255,190,110,0.3)');
      if (this.wx === null || !this.wx) { var t = this.t; for (var i = 0; i < 40; i++) { var X = (i * 97 % 100) / 100 * this.W, Y = (i * 37 % 45) / 100 * this.H; ctx.fillStyle = 'rgba(255,255,255,' + (0.4 + 0.4 * Math.sin(t * 2 + i)) + ')'; ctx.fillRect(X, Y, 2 * this.dpr, 2 * this.dpr); } }
    }
    ctx.restore();
  };
  Game.prototype.drawHudExtra = function (ctx) {
    var d = this.dpr, W = this.W, self = this, P = this.phys;
    var boss = P.racs.filter(function (r) { return r.boss; })[0];
    if (boss) {
      var bw = Math.min(W * 0.34, 360 * d), bh = 14 * d, bx = W / 2 - bw / 2, by = 54 * d, k = Math.max(0, boss.hp / boss.hp0);
      ctx.fillStyle = 'rgba(0,0,0,0.6)'; ctx.fillRect(bx - 3 * d, by - 3 * d, bw + 6 * d, bh + 6 * d);
      ctx.fillStyle = '#4a1010'; ctx.fillRect(bx, by, bw, bh); ctx.fillStyle = boss.ko ? '#555' : '#e53935'; ctx.fillRect(bx, by, bw * k, bh);
      ctx.font = (13 * d) + 'px Lilita, sans-serif'; ctx.textAlign = 'center'; ctx.fillStyle = '#fff'; ctx.fillText('👑 ' + (this.level.racs.filter(function (r) { return r.boss; })[0] || {}).name, W / 2, by + bh + 16 * d);
    }
    if (P.wind) {
      var x = W / 2, y = boss ? 100 * d : 62 * d, dir = P.wind > 0 ? 1 : -1;
      ctx.font = (14 * d) + 'px Lilita, sans-serif'; ctx.textAlign = 'center'; ctx.fillStyle = 'rgba(0,0,0,0.55)'; ctx.fillRect(x - 60 * d, y - 14 * d, 120 * d, 22 * d);
      ctx.fillStyle = '#dff4ff'; ctx.fillText('🌬 Viento ' + (dir > 0 ? '→' : '←') + ' ' + Math.abs(P.wind).toFixed(1), x, y + 3 * d);
      if (Math.random() < 0.25) this.parts.push({ fx: 'items', fr: [23], x: this.cam.x + (dir > 0 ? -this.W / 2 / this.cam.s : this.W / 2 / this.cam.s), y: 2 + Math.random() * 8, w: 0.35, vx: dir * (5 + Math.abs(P.wind) * 2), vy: -0.3, va: 3, life: 4, t: 0 });
    }
  };
  Game.prototype.drawCannon = function (ctx) {
    var g = this.cannonGeo(), s = this.cam.s, lv = this.cannonLvl, self = this;
    // armadillo esperando a la izquierda
    var q = this.queue[this.sel];
    if (q && !q.used && this.state !== 'flight') {
      var a = q.arm, f;
      if (this.ended) f = this.result && this.result.win ? 6 : 7;
      else if (this.aim) f = this.power > 0.5 ? 4 : 3;
      else { var cyc = this.t % 4; f = cyc < 0.15 ? 1 : (Math.floor(this.t * 1.5) % 2 ? 2 : 0); }
      var asp1 = RS.armSprite(a, f), sh = asp1[0], idx = asp1[1], hgt = 1.5, wdt = hgt * RS.spAspect(sh, idx);
      RS.drawSp(ctx, sh, idx, this.sx(this.cannonX - 2.1), this.sy(hgt / 2), wdt * s, hgt * s);
    } else if (this.ended && this.result) {
      var a2 = (this.queue.find(function (q) { return !q.used; }) || this.queue[0] || { arm: 0 }).arm, asp2 = RS.armSprite(a2, this.result.win ? 6 : 7), sh2 = asp2[0], idx2 = asp2[1];
      RS.drawSp(ctx, sh2, idx2, this.sx(this.cannonX - 2.1), this.sy(0.75), 1.5 * s * RS.spAspect(sh2, idx2), 1.5 * s);
    }
    if (this.defense) {
      if (!this._gunner) this._gunner = { T: RS.RACS[0], w: 0.7, h: 0.9, idx: 0, koT: 0 };
      this._gunner.actT = this.state === 'flight' && this.flightT < 0.6 ? 1 : 0;
      RS.drawRac(ctx, this._gunner, this.sx(this.cannonX - 2.3), this.sy(0.45), 0, s, this.t);
      if (RS.img.siege) { var cf = this.state === 'flight' && this.flightT < 0.5 ? 14 : this.state === 'dwait' && this.dT > 0.5 ? 13 : 12, ch = 2.2; RS.drawSp(ctx, 'siege', cf, this.sx(this.cannonX), this.sy(ch / 2), ch * RS.spAspect('siege', cf) * s, ch * s); return; }
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
      var v = RS.PHYS.vMax * this.power * (this.boost.power ? 1.15 : 1), n = Math.round(4 + this.power * 10);
      if (this.boost.aim) {
        // mira láser: trayectoria completa hasta el suelo, teniendo en cuenta el viento
        var wnd = this.phys.wind || 0; ctx.save(); ctx.strokeStyle = 'rgba(255,60,40,0.85)'; ctx.lineWidth = 3 * dpr; ctx.setLineDash([10 * dpr, 7 * dpr]); ctx.beginPath();
        for (var k = 0; k < 160; k++) { var tt = k * 0.03, X = g.muzzle.x + g.dir.x * v * tt + 0.5 * wnd * tt * tt, Y = g.muzzle.y + g.dir.y * v * tt + 0.5 * RS.PHYS.gravity * (this.phys.ballGrav || 1) * tt * tt; if (k) ctx.lineTo(this.sx(X), this.sy(Y)); else ctx.moveTo(this.sx(X), this.sy(Y)); if (Y < 0) break; }
        ctx.stroke(); ctx.restore();
      } else for (var i = 1; i <= n; i++) {
        var t = i * 0.075, x = g.muzzle.x + g.dir.x * v * t, y = g.muzzle.y + g.dir.y * v * t + 0.5 * RS.PHYS.gravity * (this.phys.ballGrav || 1) * t * t;
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
