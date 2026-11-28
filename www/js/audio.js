// Música (bucles OGG) y efectos de sonido (Web Audio).
(function (RS) {
  var A = RS.Audio = { music: null, cur: null, buf: {}, ctx: null, vol: { music: 0.6, sfx: 0.8 } };
  var SFX = ['cannon', 'explode', 'wood_hit', 'wood_break', 'stone_hit', 'stone_break', 'glass_break', 'ice_break', 'metal_hit', 'gem', 'pour', 'click', 'whoosh', 'star', 'bounce', 'zap', 'magic', 'place'];
  // estilos de música elegibles en Ajustes
  var STYLE = {
    mezcla: null,
    dnb: { RSM04: 'RSM03', RSM07: 'RSM05', RSM02: 'RSM05', RSM11: 'RSM03', RSM12: 'RSM08', RSM13: 'RSM05' },
    chip: { RSM03: 'RSM04', RSM05: 'RSM07', RSM06: 'RSM04', RSM08: 'RSM07', RSM09: 'RSM04', RSM10: 'RSM07', RSM01: 'RSM07', RSM02: 'RSM04', RSM11: 'RSM07', RSM12: 'RSM04', RSM13: 'RSM07' },
    tranquila: { RSM03: 'RSM02', RSM04: 'RSM11', RSM05: 'RSM13', RSM06: 'RSM12', RSM07: 'RSM12', RSM08: 'RSM02', RSM09: 'RSM01', RSM10: 'RSM02' },
  };
  A.init = function () {
    if (A.ctx) return;
    try { A.ctx = new (window.AudioContext || window.webkitAudioContext)(); } catch (e) { return; }
    SFX.forEach(function (n) {
      fetch('audio/sfx_' + n + '.ogg').then(function (r) { return r.arrayBuffer(); })
        .then(function (b) { return A.ctx.decodeAudioData(b); }).then(function (d) { A.buf[n] = d; }).catch(function () {});
    });
  };
  A.sfx = function (n, v) {
    if (!A.ctx || !A.buf[n] || A.vol.sfx <= 0) return;
    if (A.ctx.state === 'suspended') A.ctx.resume();
    var s = A.ctx.createBufferSource(), g = A.ctx.createGain();
    s.buffer = A.buf[n]; g.gain.value = (v == null ? 1 : v) * A.vol.sfx; s.playbackRate.value = 0.94 + Math.random() * 0.12;
    s.connect(g); g.connect(A.ctx.destination); s.start();
  };
  A.play = function (code, opt) {
    var st = STYLE[(RS.save && RS.save.musicStyle) || 'mezcla'];
    if (st && st[code]) code = st[code];
    if (A.cur === code && A.music && !(opt && opt.once)) { A.music.volume = A.vol.music; if (A.music.paused && A.vol.music > 0) A.music.play().catch(function () {}); return; }
    var old = A.music; A.cur = code;
    if (old) { var fo = setInterval(function () { old.volume = Math.max(0, old.volume - 0.08); if (old.volume <= 0.01) { old.pause(); clearInterval(fo); } }, 50); }
    var m = new Audio('audio/' + code + '.ogg'); m.loop = !(opt && opt.once); m.volume = 0; A.music = m;
    if (opt && opt.once) m.onended = function () { if (A.music === m) { A.music = null; A.cur = null; } }; // sintonía de una vez: luego silencio hasta la siguiente música
    if (A.vol.music > 0) m.play().catch(function () {});
    var fi = setInterval(function () { m.volume = Math.min(A.vol.music, m.volume + 0.05); if (m.volume >= A.vol.music - 0.01) clearInterval(fi); }, 60);
  };
  // ambiente generado en tiempo real: lluvia, viento, noche (grillos)
  A.amb = function (kind) {
    if (A._amb) { try { var o = A._amb; o.g.gain.setTargetAtTime(0, A.ctx.currentTime, 0.3); setTimeout(function () { o.src.stop(); if (o.lfo) o.lfo.stop(); }, 1200); } catch (e) {} A._amb = null; }
    if (!kind || !A.ctx || A.vol.sfx <= 0) return;
    var c = A.ctx, n = c.sampleRate * 2, buf = c.createBuffer(1, n, c.sampleRate), d = buf.getChannelData(0), last = 0;
    for (var i = 0; i < n; i++) { var w = Math.random() * 2 - 1; last = kind === 'wind' ? last * 0.995 + w * 0.05 : w; d[i] = last; }
    var src = c.createBufferSource(); src.buffer = buf; src.loop = true;
    var f = c.createBiquadFilter(), g = c.createGain(), lfo = null;
    if (kind === 'rain') { f.type = 'highpass'; f.frequency.value = 1400; g.gain.value = 0; g.gain.setTargetAtTime(0.06 * A.vol.sfx, c.currentTime, 1); }
    else if (kind === 'wind') { f.type = 'lowpass'; f.frequency.value = 600; g.gain.value = 0; g.gain.setTargetAtTime(0.18 * A.vol.sfx, c.currentTime, 1.5); lfo = c.createOscillator(); var lg = c.createGain(); lfo.frequency.value = 0.15; lg.gain.value = 250; lfo.connect(lg); lg.connect(f.frequency); lfo.start(); }
    else { f.type = 'bandpass'; f.frequency.value = 4800; f.Q.value = 18; g.gain.value = 0; lfo = c.createOscillator(); var lg2 = c.createGain(); lfo.type = 'square'; lfo.frequency.value = 6; lg2.gain.value = 0.05 * A.vol.sfx; lfo.connect(lg2); lg2.connect(g.gain); lfo.start(); }
    src.connect(f); f.connect(g); g.connect(c.destination); src.start();
    A._amb = { src: src, g: g, lfo: lfo };
  };
  // efectos sintetizados: mortero (golpe grave), fanfarria (jugadas maestras) y destello (regalo)
  A.synth = function (kind, v) {
    if (!A.ctx || A.vol.sfx <= 0) return; var c = A.ctx, t = c.currentTime, vol = (v == null ? 1 : v) * A.vol.sfx;
    if (c.state === 'suspended') c.resume();
    function osc(type, f0, f1, t0, dur, g0) { var o = c.createOscillator(), g = c.createGain(); o.type = type; o.frequency.setValueAtTime(f0, t + t0); if (f1) o.frequency.exponentialRampToValueAtTime(f1, t + t0 + dur);
      g.gain.setValueAtTime(0.0001, t + t0); g.gain.exponentialRampToValueAtTime(g0 * vol, t + t0 + 0.01); g.gain.exponentialRampToValueAtTime(0.0001, t + t0 + dur); o.connect(g); g.connect(c.destination); o.start(t + t0); o.stop(t + t0 + dur + 0.05); }
    if (kind === 'mortar') {
      osc('sine', 140, 38, 0, 0.45, 0.9); osc('triangle', 90, 30, 0, 0.3, 0.5);
      var n = c.sampleRate * 0.25, b = c.createBuffer(1, n, c.sampleRate), d = b.getChannelData(0); for (var i = 0; i < n; i++) d[i] = (Math.random() * 2 - 1) * (1 - i / n);
      var s = c.createBufferSource(), f = c.createBiquadFilter(), g = c.createGain(); s.buffer = b; f.type = 'lowpass'; f.frequency.value = 900; g.gain.value = 0.5 * vol; s.connect(f); f.connect(g); g.connect(c.destination); s.start(t);
    } else if (kind === 'fanfare') {
      [523, 659, 784, 1047].forEach(function (f, i) { osc('square', f, 0, i * 0.09, 0.16, 0.12); osc('triangle', f / 2, 0, i * 0.09, 0.18, 0.15); });
      osc('square', 1047, 0, 0.38, 0.4, 0.12); osc('triangle', 784, 0, 0.38, 0.4, 0.12);
    } else if (kind === 'gift') {
      [880, 1175, 1568, 2093].forEach(function (f, i) { osc('sine', f, 0, i * 0.06, 0.25, 0.18); });
    }
  };
  A.setVol = function (k, v) {
    A.vol[k] = v;
    if (k === 'music' && A.music) { A.music.volume = v; if (v > 0 && A.music.paused) A.music.play().catch(function () {}); if (v === 0) A.music.pause(); }
  };
  document.addEventListener('visibilitychange', function () { if (!A.music) return; if (document.hidden) A.music.pause(); else if (A.vol.music > 0) A.music.play().catch(function () {}); });
})(RS);
