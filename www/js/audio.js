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
  A.play = function (code) {
    var st = STYLE[(RS.save && RS.save.musicStyle) || 'mezcla'];
    if (st && st[code]) code = st[code];
    if (A.cur === code && A.music) { A.music.volume = A.vol.music; if (A.music.paused && A.vol.music > 0) A.music.play().catch(function () {}); return; }
    var old = A.music; A.cur = code;
    if (old) { var fo = setInterval(function () { old.volume = Math.max(0, old.volume - 0.08); if (old.volume <= 0.01) { old.pause(); clearInterval(fo); } }, 50); }
    var m = new Audio('audio/' + code + '.ogg'); m.loop = true; m.volume = 0; A.music = m;
    if (A.vol.music > 0) m.play().catch(function () {});
    var fi = setInterval(function () { m.volume = Math.min(A.vol.music, m.volume + 0.05); if (m.volume >= A.vol.music - 0.01) clearInterval(fi); }, 60);
  };
  A.setVol = function (k, v) {
    A.vol[k] = v;
    if (k === 'music' && A.music) { A.music.volume = v; if (v > 0 && A.music.paused) A.music.play().catch(function () {}); if (v === 0) A.music.pause(); }
  };
  document.addEventListener('visibilitychange', function () { if (!A.music) return; if (document.hidden) A.music.pause(); else if (A.vol.music > 0) A.music.play().catch(function () {}); });
})(RS);
