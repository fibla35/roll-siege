"""Genera www/js/i18n.js a partir de tools/en_dict.py."""
import json, os
exec(open(os.path.join(os.path.dirname(__file__), 'en_dict.py')).read())
JS = r"""// Traducción en tiempo real (generado por tools/build_i18n.py; edita tools/en_dict.py)
(function () {
  var RS = window.RS = window.RS || {};
  var EN = __DICT__;
  var saved = {}; try { saved = JSON.parse(localStorage.getItem('rollsiege_v1') || '{}'); } catch (e) {}
  var nav = (navigator.language || 'es').toLowerCase();
  RS.lang = saved.lang || (/^(es|ca|gl|eu)/.test(nav) ? 'es' : 'en');
  document.documentElement.lang = RS.lang;
  var keys = Object.keys(EN).filter(function (k) { return k.length >= 3 && k !== EN[k]; }).sort(function (a, b) { return b.length - a.length; });
  var LET = /[A-Za-zÀ-ÿ]/, cache = new Map(), outs = new Set();
  function frag(s) {
    var seg = [{ t: s, d: false }];
    for (var i = 0; i < keys.length; i++) {
      var k = keys[i], nseg = [], hit = false;
      for (var j = 0; j < seg.length; j++) {
        var g = seg[j]; if (g.d || g.t.indexOf(k) < 0) { nseg.push(g); continue; }
        var t = g.t, p = 0, q;
        while ((q = t.indexOf(k, p)) >= 0) {
          var b = q > 0 ? t[q - 1] : '', a = t[q + k.length] || '';
          if ((LET.test(k[0]) && LET.test(b)) || (LET.test(k[k.length - 1]) && LET.test(a))) { p = q + 1; continue; }
          if (q > 0) nseg.push({ t: t.slice(0, q), d: false });
          nseg.push({ t: EN[k], d: true }); hit = true; t = t.slice(q + k.length); p = 0;
        }
        if (t) nseg.push({ t: t, d: false });
      }
      if (hit) seg = nseg;
    }
    return seg.map(function (g) { return g.t; }).join('');
  }
  RS.t = function (s) {
    if (RS.lang === 'es' || s == null) return s;
    s = String(s); if (!/[A-Za-zÀ-ÿ]/.test(s) || outs.has(s)) return s;
    var c = cache.get(s); if (c !== undefined) return c;
    var tr = s.trim(), lead = s.slice(0, s.indexOf(tr)), tail = s.slice(s.indexOf(tr) + tr.length), r;
    r = EN.hasOwnProperty(tr) ? lead + EN[tr] + tail : frag(s);
    cache.set(s, r); outs.add(r); return r;
  };
  if (RS.lang === 'es') return;
  // lienzo: todo el texto que dibuja el juego
  var P = CanvasRenderingContext2D.prototype;
  ['fillText', 'strokeText', 'measureText'].forEach(function (fn) { var o = P[fn]; P[fn] = function (t) { var a = Array.prototype.slice.call(arguments); a[0] = RS.t(t); return o.apply(this, a); }; });
  // DOM: textos, opciones y atributos, también los que se crean después
  var SKIP = { SCRIPT: 1, STYLE: 1, TEXTAREA: 1, INPUT: 1 };
  function doNode(n) {
    if (n.nodeType === 3) { var p = n.parentNode; if (p && !SKIP[p.nodeName] && !(p.closest && p.closest('[data-noi18n]'))) { var v = RS.t(n.data); if (v !== n.data) n.data = v; } return; }
    if (n.nodeType !== 1 || SKIP[n.nodeName] && n.nodeName !== 'INPUT') { if (n.nodeName === 'INPUT') attrs(n); return; }
    if (n.hasAttribute && n.hasAttribute('data-noi18n')) return;
    attrs(n); for (var c = n.firstChild; c; c = c.nextSibling) doNode(c);
  }
  function attrs(el) { ['placeholder', 'title', 'aria-label', 'alt'].forEach(function (a) { var v = el.getAttribute && el.getAttribute(a); if (v) { var t = RS.t(v); if (t !== v) el.setAttribute(a, t); } }); }
  function start() {
    doNode(document.body);
    new MutationObserver(function (ms) { ms.forEach(function (m) { if (m.type === 'characterData') doNode(m.target); else m.addedNodes.forEach(doNode); }); })
      .observe(document.body, { childList: true, subtree: true, characterData: true });
  }
  if (document.body) start(); else document.addEventListener('DOMContentLoaded', start);
})();
"""
open(os.path.join(os.path.dirname(__file__), '..', 'www', 'js', 'i18n.js'), 'w').write(JS.replace('__DICT__', json.dumps(EN, ensure_ascii=False)))
print(len(EN), 'entradas')
