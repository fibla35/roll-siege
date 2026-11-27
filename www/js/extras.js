// Tienda y cofres, cartas y mejoras, skins, misiones diarias y logros.
(function (RS) {
  var $ = function (id) { return document.getElementById(id); };
  var E = RS.Extras = {};
  function S() { return RS.save; }
  function save() { RS.persist(); }
  function toast(t) { RS.toast(t); }

  // ---------- cofres ----------
  E.CHESTS = [
    { id: 0, name: 'Cofre de madera', price: 120, cards: 4, coins: [20, 60], skin: 0, img: 'chest0', open: 'chest0o', rare: [70, 25, 5, 0] },
    { id: 1, name: 'Cofre de plata', price: 300, cards: 9, coins: [50, 120], skin: 0.08, img: 'chest1', open: 'chest1o', rare: [55, 33, 10, 2] },
    { id: 2, name: 'Cofre de oro', price: 700, cards: 18, coins: [100, 250], skin: 0.3, img: 'chest2', open: 'chest2', rare: [40, 38, 17, 5] },
    { id: 3, name: 'Cofre legendario', price: 1600, cards: 35, coins: [250, 500], skin: 0.75, img: 'chest3', open: 'chest3', rare: [25, 35, 28, 12] },
  ];
  E.SKINS = ['Samurái', 'Ninja', 'Sheriff', 'Forajido', 'Guerrero Águila', 'Guerrero Jaguar',
    'Calabaza', 'Momia', 'Frankenstein', 'Diablillo', 'Fantasma', 'Vampiro',
    'Papá Noel', 'Reno', 'Duende', 'Muñeco de nieve', 'Regalo', 'Rey de las Nieves',
    'Robot', 'Mecha samurái', 'Cohete cromado', 'Imán de neón', 'Rayo androide', 'Titán tanque',
    'Jugador de bolos', 'Baloncesto', 'Fútbol', 'Pesas', 'Natación', 'Atletismo',
    'Guerrero griego', 'Dios del trueno', 'Gigante de escarcha', 'Demonio de fuego', 'Deidad estelar', 'Faraón dorado'];
  E.EVENT_SKIN = function (k) { return k >= 6 && k < 18; };
  E.CARDS_NEED = [0, 0, 3, 6, 12, 24]; // cartas para pasar al nivel n
  E.COST_UP = [0, 0, 80, 200, 450, 900];

  function init() {
    var s = S();
    s.cards = s.cards || {}; s.armLv = s.armLv || {}; s.skins = s.skins || []; if (s.skin == null) s.skin = -1;
    s.chests = s.chests || []; s.ach = s.ach || {}; s.st = s.st || {}; if (s.vib == null) s.vib = true;
  }
  E.init = init;

  function rollChest(c) {
    var s = S(), out = { coins: 0, cards: {}, skin: null };
    out.coins = c.coins[0] + Math.floor(Math.random() * (c.coins[1] - c.coins[0]));
    var open = RS.ARMS.map(function (a, i) { return i; }).filter(function (i) { return E.armOpen(i); });
    var byR = [0, 1, 2, 3].map(function (r) { return open.filter(function (i) { return RS.ARMS[i].rare === r; }); });
    for (var k = 0; k < c.cards; k++) {
      var x = Math.random() * 100, r = 0, acc = 0; for (var j = 0; j < 4; j++) { acc += c.rare[j]; if (x < acc) { r = j; break; } }
      while (r > 0 && !byR[r].length) r--; var pool = byR[r].length ? byR[r] : open; var a = pool[Math.floor(Math.random() * pool.length)];
      out.cards[a] = (out.cards[a] || 0) + 1;
    }
    var free = E.SKINS.map(function (n, i) { return i; }).filter(function (i) { return s.skins.indexOf(i) < 0 && !E.EVENT_SKIN(i); });
    if (free.length && Math.random() < c.skin) out.skin = free[Math.floor(Math.random() * free.length)];
    s.coins += out.coins; Object.keys(out.cards).forEach(function (a) { s.cards[a] = (s.cards[a] || 0) + out.cards[a]; });
    if (out.skin != null) s.skins.push(out.skin);
    E.stat('chest', c.id);
    save(); return out;
  }
  E.openChest = function (cid, paid) {
    var c = E.CHESTS[cid], s = S();
    if (paid) { if (s.coins < c.price) return toast('Te faltan ' + (c.price - s.coins) + ' monedas'); s.coins -= c.price; }
    var res = rollChest(c), m = $('chestm');
    $('chest_img').src = 'img/ui/' + c.img + '.webp'; $('chest_img').className = 'chestimg shake'; $('chest_res').innerHTML = ''; $('chest_ok').style.display = 'none';
    m.classList.add('show'); RS.Audio.sfx('whoosh', 0.7); RS.vib([30, 40, 30]);
    setTimeout(function () {
      $('chest_img').src = 'img/ui/' + c.open + '.webp'; $('chest_img').className = 'chestimg pop'; RS.Audio.sfx('star', 0.9); RS.vib(80);
      var html = '<div class="rw"><img src="img/ui/coin.webp"><b>+' + res.coins + '</b></div>';
      Object.keys(res.cards).forEach(function (a) { html += '<div class="rw"><img src="img/ui/por' + a + '.webp"><b>×' + res.cards[a] + '</b><span>' + RS.ARMS[a].name + '</span></div>'; });
      if (res.skin != null) html += '<div class="rw skin"><span>✨ Skin nueva para Bolo: <b>' + E.SKINS[res.skin] + '</b></span></div>';
      $('chest_res').innerHTML = html; $('chest_ok').style.display = '';
    }, 1100);
  };
  $('chest_ok').onclick = function () { $('chestm').classList.remove('show'); if (RS.curScreen() === 'shop') E.shop(); };

  E.shop = function () {
    var s = S(); $('sh_coins').textContent = s.coins;
    var box = $('shopgrid'); box.innerHTML = '';
    var free = s.chests.slice();
    free.forEach(function (cid, k) {
      var c = E.CHESTS[cid], b = document.createElement('div'); b.className = 'shopc free';
      b.innerHTML = '<span class="tag">¡GRATIS!</span><img src="img/ui/' + c.img + '.webp"><b>' + c.name + '</b><button class="btn green sm">Abrir</button>';
      b.querySelector('button').onclick = function () { s.chests.splice(s.chests.indexOf(cid), 1); E.openChest(cid, false); };
      box.appendChild(b);
    });
    E.CHESTS.forEach(function (c) {
      var b = document.createElement('div'); b.className = 'shopc';
      b.innerHTML = '<img src="img/ui/' + c.img + '.webp"><b>' + c.name + '</b><span>' + c.cards + ' cartas · ' + c.coins[0] + '-' + c.coins[1] + ' monedas' + (c.skin ? ' · ' + Math.round(c.skin * 100) + '% skin' : '') + '</span><button class="btn ' + (s.coins >= c.price ? 'orange' : 'red') + ' sm"><img src="img/ui/coin.webp">' + c.price + '</button>';
      b.querySelector('button').onclick = function () { E.openChest(c.id, true); };
      box.appendChild(b);
    });
  };

  // ---------- mejoras de armadillos (en la pantalla de colección) ----------
  E.armInfo = function (i) {
    var s = S(), lv = s.armLv[i] || 1, have = s.cards[i] || 0, need = E.CARDS_NEED[lv + 1], cost = E.COST_UP[lv + 1];
    return { lv: lv, have: have, need: need, cost: cost, max: lv >= 5, can: lv < 5 && have >= need && s.coins >= cost };
  };
  E.upgrade = function (i) {
    var s = S(), A = E.armInfo(i);
    if (A.max) return toast('Ya está al máximo');
    if (A.have < A.need) return toast('Necesitas ' + A.need + ' cartas (tienes ' + A.have + ')');
    if (s.coins < A.cost) return toast('Te faltan ' + (A.cost - s.coins) + ' monedas');
    s.cards[i] -= A.need; s.coins -= A.cost; s.armLv[i] = A.lv + 1; save();
    RS.Audio.sfx('star', 0.9); RS.vib(60); toast(RS.ARMS[i].name + ' sube a nivel ' + (A.lv + 1) + ' · +8 % de fuerza');
    E.stat('upgrade', A.lv + 1);
  };

  // ---------- misiones diarias ----------
  var POOL = [
    { id: 'ko', txt: 'Derriba {n} mapaches', n: [8, 15, 25], rw: [60, 100, 150] },
    { id: 'win', txt: 'Gana {n} niveles', n: [2, 4, 6], rw: [60, 110, 160] },
    { id: 'abil', txt: 'Usa {n} habilidades', n: [5, 10, 15], rw: [50, 90, 130] },
    { id: 'gem', txt: 'Recupera {n} gemas', n: [3, 6, 10], rw: [50, 90, 140] },
    { id: 'combo', txt: 'Haz {n} combos de x3 o más', n: [1, 3, 5], rw: [60, 110, 170] },
    { id: 'koarm', txt: 'Derriba {n} mapaches con {arm}', n: [3, 5, 8], rw: [70, 110, 160] },
    { id: 'league', txt: 'Gana {n} asedios de Liga', n: [1, 2, 3], rw: [70, 120, 180] },
    { id: 'stars3', txt: 'Consigue 3 estrellas en {n} niveles', n: [1, 3, 5], rw: [70, 120, 180] },
  ];
  function dayKey() { var d = new Date(); return d.getFullYear() + '-' + (d.getMonth() + 1) + '-' + d.getDate(); }
  E.daily = function () {
    var s = S(), k = dayKey();
    if (!s.daily || s.daily.day !== k) {
      var seed = k.split('-').reduce(function (a, b) { return a * 31 + +b; }, 7), R = RS.rng(seed), ids = POOL.slice(), list = [];
      for (var i = 0; i < 3; i++) {
        var p = ids.splice(Math.floor(R() * ids.length), 1)[0], lv = i, arm = null;
        if (p.id === 'koarm') { var op = RS.ARMS.map(function (a, j) { return j; }).filter(function (j) { return E.armOpen(j); }); arm = op[Math.floor(R() * op.length)]; }
        list.push({ id: p.id, goal: p.n[lv], rw: p.rw[lv], prog: 0, claimed: false, arm: arm, txt: p.txt.replace('{n}', p.n[lv]).replace('{arm}', arm != null ? RS.ARMS[arm].name : '') });
      }
      s.daily = { day: k, list: list, bonus: false }; save();
    }
    return s.daily;
  };
  function prog(id, v, arm) {
    var D = E.daily(), ch = false;
    D.list.forEach(function (m) {
      if (m.id !== id || m.prog >= m.goal) return;
      if (id === 'koarm' && m.arm !== arm) return;
      m.prog = Math.min(m.goal, m.prog + (v || 1)); ch = true;
      if (m.prog >= m.goal) toast('✅ Misión completada: ' + m.txt);
    });
    if (ch) { save(); E.badges(); }
  }
  E.missions = function () {
    var D = E.daily(), box = $('misslist'); box.innerHTML = '';
    D.list.forEach(function (m) {
      var done = m.prog >= m.goal, d = document.createElement('div'); d.className = 'mis' + (m.claimed ? ' claimed' : '');
      d.innerHTML = '<div class="mt"><b></b><div class="mbar"><i style="width:' + (100 * m.prog / m.goal) + '%"></i></div><span>' + m.prog + ' / ' + m.goal + '</span></div><button class="btn sm ' + (m.claimed ? 'blue' : done ? 'green' : 'orange') + '"' + (done && !m.claimed ? '' : ' disabled') + '><img src="img/ui/coin.webp">' + m.rw + '</button>';
      d.querySelector('b').textContent = m.txt;
      d.querySelector('button').onclick = function () { if (!done || m.claimed) return; m.claimed = true; S().coins += m.rw; save(); RS.Audio.sfx('star'); E.missions(); E.badges(); };
      box.appendChild(d);
    });
    var all = D.list.every(function (m) { return m.claimed; });
    $('miss_bonus').style.display = all && !D.bonus ? '' : 'none';
    $('miss_bonus').onclick = function () { D.bonus = true; S().chests.push(1); save(); toast('🎁 Cofre de plata gratis en la Tienda'); E.missions(); E.badges(); };
    var now = new Date(), end = new Date(now); end.setHours(24, 0, 0, 0); var h = Math.floor((end - now) / 3600000), mn = Math.floor((end - now) / 60000) % 60;
    $('miss_time').textContent = 'Nuevas misiones en ' + h + ' h ' + mn + ' min';
  };

  // ---------- logros ----------
  E.ACH = [
    { id: 'ko1', name: 'Primer golpe', d: 'Derriba tu primer mapache', rw: 50, chk: function (s) { return (s.st.ko || 0) >= 1; } },
    { id: 'ko100', name: 'Terror de los mapaches', d: 'Derriba 100 mapaches', rw: 200, chk: function (s) { return (s.st.ko || 0) >= 100; } },
    { id: 'ko500', name: 'Leyenda del asedio', d: 'Derriba 500 mapaches', rw: 500, chk: function (s) { return (s.st.ko || 0) >= 500; } },
    { id: 'boss1', name: 'Cazajefes', d: 'Vence a un jefe', rw: 100, chk: function (s) { return (s.st.boss || 0) >= 1; } },
    { id: 'boss12', name: 'Rey de reyes', d: 'Vence a los 12 jefes', rw: 1000, chk: function (s) { for (var w = 1; w <= 12; w++) if (!s.stars[w + '-20']) return false; return true; } },
    { id: 'one', name: 'Un solo disparo', d: 'Gana un nivel con un solo armadillo', rw: 150, chk: function (s) { return !!s.st.one; } },
    { id: 'combo5', name: 'Reacción en cadena', d: 'Haz un combo x5', rw: 120, chk: function (s) { return (s.st.comboMax || 0) >= 5; } },
    { id: 'combo10', name: 'Demolición total', d: 'Haz un combo x10', rw: 300, chk: function (s) { return (s.st.comboMax || 0) >= 10; } },
    { id: 'cage', name: 'Libertador', d: 'Libera un armadillo de una jaula', rw: 80, chk: function (s) { return (s.st.cage || 0) >= 1; } },
    { id: 'def', name: 'Muralla firme', d: 'Defiende tu fortaleza en un contraataque', rw: 120, chk: function (s) { return (s.st.def || 0) >= 1; } },
    { id: 'league10', name: 'Campeón de Liga', d: 'Gana 10 asedios de Liga', rw: 250, chk: function (s) { return (s.st.league || 0) >= 10; } },
    { id: 'stars60', name: 'Lluvia de estrellas', d: 'Consigue 60 estrellas', rw: 200, chk: function (s) { return E.totalStars() >= 60; } },
    { id: 'stars300', name: 'Firmamento', d: 'Consigue 300 estrellas', rw: 600, chk: function (s) { return E.totalStars() >= 300; } },
    { id: 'storm', name: 'Bajo la tormenta', d: 'Gana un nivel con tormenta o ventisca', rw: 100, chk: function (s) { return !!s.st.storm; } },
    { id: 'night', name: 'Asalto nocturno', d: 'Gana un nivel de noche', rw: 80, chk: function (s) { return !!s.st.night; } },
    { id: 'lv5', name: 'Veterano', d: 'Sube un armadillo a nivel 5', rw: 300, chk: function (s) { return Object.keys(s.armLv).some(function (k) { return s.armLv[k] >= 5; }); } },
    { id: 'legchest', name: 'Tesoro legendario', d: 'Abre un cofre legendario', rw: 150, chk: function (s) { return !!s.st.chest3; } },
    { id: 'skin', name: 'A la moda', d: 'Consigue una skin', rw: 100, chk: function (s) { return s.skins.length > 0; } },
    { id: 'hard1', name: 'Sin piedad', d: 'Gana un nivel en modo difícil', rw: 150, chk: function (s) { return Object.keys(s.stars).some(function (k) { return k[0] === 'H'; }); } },
    { id: 'hardboss', name: 'Pesadilla', d: 'Vence a un jefe en modo difícil', rw: 400, chk: function (s) { return Object.keys(s.stars).some(function (k) { return /^H\d+-20$/.test(k); }); } },
    { id: 'event', name: 'De temporada', d: 'Completa un evento entero', rw: 300, chk: function (s) { return !!(s.stars['ev:hal-10'] || s.stars['ev:nav-10']); } },
    { id: 'multiko', name: 'Dos de un tiro', d: 'Tumba 2 mapaches con un solo armadillo', rw: 120, chk: function (s) { return (s.st.multiko || 0) >= 2; } },
    { id: 'collapse', name: '¡Derrumbe!', d: 'Rompe 8 piezas con un solo tiro', rw: 150, chk: function (s) { return (s.st.collapse || 0) >= 8; } },
    { id: 'mount', name: 'Rey de la montaña', d: 'Completa los 10 niveles de Montaña de un mundo', rw: 300, chk: function (s) { return Object.keys(s.stars).some(function (k) { return /^M\d+-10$/.test(k); }); } },
    { id: 'sea', name: 'Lobo de mar', d: 'Llega a los Mares Bandidos', rw: 250, chk: function (s) { return !!s.stars['12-20']; } },
    { id: 'abil100', name: 'Maestro de habilidades', d: 'Usa 100 habilidades', rw: 200, chk: function (s) { return (s.st.abil || 0) >= 100; } },
    { id: 'gems50', name: 'Guardián de gemas', d: 'Recupera 50 gemas', rw: 200, chk: function (s) { return (s.st.gem || 0) >= 50; } },
  ];
  E.totalStars = function () { var s = S(); return Object.keys(s.stars).reduce(function (a, k) { return a + s.stars[k]; }, 0); };
  E.checkAch = function () {
    var s = S(), got = [];
    E.ACH.forEach(function (a) { if (!s.ach[a.id] && a.chk(s)) { s.ach[a.id] = 1; got.push(a); } });
    if (got.length) { save(); got.forEach(function (a, i) { setTimeout(function () { toast('🏅 Logro: ' + a.name + ' — recógelo en Logros'); RS.Audio.sfx('star', 0.7); }, i * 1900); }); E.badges(); }
  };
  E.achievements = function () {
    var s = S(), box = $('achlist'); box.innerHTML = '';
    var done = E.ACH.filter(function (a) { return s.ach[a.id]; }).length;
    $('ach_count').textContent = done + ' / ' + E.ACH.length;
    E.ACH.forEach(function (a) {
      var st = s.ach[a.id], d = document.createElement('div'); d.className = 'ach' + (st ? ' got' : '');
      d.innerHTML = '<span class="medal">' + (st ? '🏅' : '🔒') + '</span><div><b class="an"></b><span class="ad"></span></div>' + (st === 1 ? '<button class="btn green sm"><img src="img/ui/coin.webp">' + a.rw + '</button>' : st === 2 ? '<span class="ok">✔</span>' : '<span class="rwd"><img src="img/ui/coin.webp">' + a.rw + '</span>');
      d.querySelector('.an').textContent = a.name; d.querySelector('.ad').textContent = a.d;
      var bt = d.querySelector('button'); if (bt) bt.onclick = function () { s.ach[a.id] = 2; s.coins += a.rw; save(); RS.Audio.sfx('star'); E.achievements(); E.badges(); };
      box.appendChild(d);
    });
  };

  // ---------- estadísticas (llamado desde la partida) ----------
  E.stat = function (k, v) {
    var s = S(); init();
    if (k === 'ko') { s.st.ko = (s.st.ko || 0) + 1; if (v && v.boss) s.st.boss = (s.st.boss || 0) + 1; prog('ko'); if (v) prog('koarm', 1, v.arm); }
    else if (k === 'abil') { s.st.abil = (s.st.abil || 0) + 1; prog('abil'); }
    else if (k === 'gem') { s.st.gem = (s.st.gem || 0) + 1; prog('gem'); }
    else if (k === 'combo') { s.st.comboMax = Math.max(s.st.comboMax || 0, v); prog('combo'); }
    else if (k === 'cage') s.st.cage = (s.st.cage || 0) + 1;
    else if (k === 'multiko') s.st.multiko = Math.max(s.st.multiko || 0, v);
    else if (k === 'collapse') s.st.collapse = Math.max(s.st.collapse || 0, v);
    else if (k === 'chest' && v === 3) s.st.chest3 = 1;
    save(); E.checkAch();
  };
  // al acabar un nivel
  E.levelEnd = function (ctx, r) {
    var s = S(), L = ctx.level || {};
    if (!r.win) return;
    if (ctx.defense) s.st.def = (s.st.def || 0) + 1;
    else {
      prog('win');
      if (r.stars === 3) prog('stars3');
      if (ctx.kind === 'league') { s.st.league = (s.st.league || 0) + 1; prog('league'); }
      if (r.used === 1 && L.racs && L.racs.length) s.st.one = 1;
      if (L.weather === 'storm' || L.weather === 'blizzard') s.st.storm = 1;
      if (L.tod === 'night') s.st.night = 1;
      if (ctx.kind === 'camp' && ctx.n === 20) { s.chests.push(ctx.w >= 7 ? 3 : 2); setTimeout(function () { toast('🎁 ¡Cofre ' + (ctx.w >= 7 ? 'legendario' : 'de oro') + ' gratis en la Tienda!'); }, 2400); }
    }
    save(); E.checkAch();
  };

  // ---------- potenciadores ----------
  E.BOOSTS = [
    { id: 'aim', name: 'Mira láser', ico: '🎯', img: 'ico_aim', price: 80, d: 'Ves la trayectoria completa (con viento)' },
    { id: 'power', name: 'Pólvora extra', ico: '💥', img: 'ico_power', price: 60, d: '+15 % de fuerza en todos los disparos' },
    { id: 'extra', name: 'Armadillo extra', ico: '🛡', img: 'ico_extra', price: 120, d: 'Un armadillo más en la cola' },
  ];
  var sel = {};
  E.prep = function (title, cb) {
    var s = S(); s.boosts = s.boosts || {}; sel = {};
    $('prep_t').textContent = title;
    var draw = function () {
      var box = $('prep_list'); box.innerHTML = '';
      E.BOOSTS.forEach(function (B) {
        var have = s.boosts[B.id] || 0, d = document.createElement('button'); d.className = 'boost' + (sel[B.id] ? ' sel' : '');
        d.innerHTML = '<span class="bi">' + (B.img ? '<img src="img/ui/' + B.img + '.webp" alt="">' : B.ico) + '</span><b>' + B.name + '</b><span class="bd">' + B.d + '</span><span class="bp">' + (have ? '🎁 Tienes ' + have : '<img src="img/ui/coin.webp">' + B.price) + '</span>' + (sel[B.id] ? '<span class="chk">✔</span>' : '');
        d.onclick = function () {
          if (!sel[B.id] && !have && s.coins < B.price) return toast('Te faltan ' + (B.price - s.coins) + ' monedas');
          sel[B.id] = !sel[B.id]; RS.Audio.sfx('click'); draw();
        };
        box.appendChild(d);
      });
      var cost = E.BOOSTS.reduce(function (a, B) { return a + (sel[B.id] && !(s.boosts[B.id] > 0) ? B.price : 0); }, 0);
      $('prep_go').innerHTML = '¡Al asedio!' + (cost ? ' <img src="img/ui/coin.webp">' + cost : '');
    };
    draw(); $('prep').classList.add('show');
    var go = function (use) {
      $('prep').classList.remove('show'); var b = {};
      if (use) E.BOOSTS.forEach(function (B) { if (!sel[B.id]) return; if (s.boosts[B.id] > 0) s.boosts[B.id]--; else { if (s.coins < B.price) return; s.coins -= B.price; } b[B.id] = true; });
      save(); cb(b);
    };
    $('prep_go').onclick = function () { go(true); }; $('prep_no').onclick = function () { go(false); };
  };

  // ---------- ruleta de premio diario ----------
  // 9 casillas del disco dibujado (radios medidos en la imagen, grados en sentido antihorario desde la derecha)
  E.WHEEL_B = [15.1, 54.7, 90, 123.6, 163.9, 206.1, 244.6, 289, 332.6];
  E.PRIZES = [
    { ico: 'ico_bag', t: '50', w: 14, give: function (s) { s.coins += 50; return '+50 monedas'; } },
    { ico: 'ico_aim', t: 'x2', w: 12, give: function (s) { s.boosts.aim = (s.boosts.aim || 0) + 2; return '2 Miras láser'; } },
    { ico: 'ico_bag', t: '100', w: 14, give: function (s) { s.coins += 100; return '+100 monedas'; } },
    { ico: 'ico_chest', t: '', w: 8, give: function (s) { s.chests.push(0); return 'Cofre de madera (en la Tienda)'; } },
    { ico: 'ico_power', t: 'x2', w: 12, give: function (s) { s.boosts.power = (s.boosts.power || 0) + 2; return '2 Pólvoras extra'; } },
    { ico: 'ico_coins', t: '200', w: 10, give: function (s) { s.coins += 200; return '+200 monedas'; } },
    { ico: 'ico_gem', t: '500', w: 3, give: function (s) { s.coins += 500; return '¡PREMIO GORDO! +500 monedas'; } },
    { ico: 'ico_extra', t: '', w: 8, give: function (s) { s.boosts.extra = (s.boosts.extra || 0) + 1; return '1 Armadillo extra'; } },
    { ico: 'ico_cards', t: 'x4', w: 10, give: function (s) { var k = Math.floor(Math.random() * 6); s.cards[k] = (s.cards[k] || 0) + 4; return '4 cartas de ' + RS.ARMS[k].name; } },
  ];
  function secMid(i) { var B = E.WHEEL_B, a0 = B[i], a1 = i + 1 < B.length ? B[i + 1] : B[0] + 360; return (a0 + a1) / 2 * Math.PI / 180; }
  function wimg(n) { if (!RS.img[n]) RS.loadImg(n, 'img/ui/' + n + '.webp'); return RS.img[n]; }
  function drawWheel(rot) {
    var cv = $('wheel'), c = cv.getContext('2d'), S0 = 520, disc = wimg('wheel_disc');
    c.clearRect(0, 0, S0, S0); c.save(); c.translate(S0 / 2, S0 / 2); c.rotate(rot);
    var dw = 500, dh = disc ? dw * disc.height / disc.width : 500, R = dw / 2;
    if (disc) c.drawImage(disc, -dw / 2, -dh / 2, dw, dh);
    E.PRIZES.forEach(function (P, i) {
      var th = secMid(i), ic = wimg(P.ico);
      c.save(); c.rotate(-th); c.translate(R * 0.6, 0); c.rotate(Math.PI / 2);
      if (ic) { var s = 78, h = s * ic.height / ic.width; c.drawImage(ic, -s / 2, -h / 2 - (P.t ? 10 : 0), s, h); }
      if (P.t) { c.font = '30px Lilita, sans-serif'; c.textAlign = 'center'; c.textBaseline = 'middle'; c.lineWidth = 6; c.strokeStyle = '#3a1e0a'; c.strokeText(P.t, 0, 36); c.fillStyle = '#fff'; c.fillText(P.t, 0, 36); }
      c.restore();
    });
    c.restore();
    var bt = wimg('wheel_btn'); if (bt) c.drawImage(bt, S0 / 2 - 50, S0 / 2 - 50, 100, 100);
  }
  E.UI_IMGS = ['wheel_disc', 'wheel_ptr', 'wheel_btn', 'ribbon2', 'ico_bag', 'ico_coins', 'ico_cards', 'ico_chest', 'ico_aim', 'ico_power', 'ico_extra', 'ico_gem', 'ico_events', 'ico_hal', 'ico_nav', 'ico_skin'];
  E.loadUI = function () { return Promise.all(E.UI_IMGS.map(function (n) { return RS.loadImg(n, 'img/ui/' + n + '.webp'); })); };
  E.wheelDue = function () { return S().wheelDay !== dayKey(); };
  E.wheel = function () {
    var s = S(); s.boosts = s.boosts || {};
    E.loadUI().then(function () { drawWheel(0); }); $('wheel_res').textContent = 'Gira una vez al día'; $('wheel_spin').style.display = ''; $('wheel_ok').style.display = 'none';
    $('wheelm').classList.add('show');
    $('wheel_spin').onclick = function () {
      if (!E.wheelDue()) return;
      $('wheel_spin').style.display = 'none'; s.wheelDay = dayKey(); save();
      var n = E.PRIZES.length, w = E.PRIZES.map(function (p) { return p.w; }), tot = w.reduce(function (a, b) { return a + b; }, 0), x = Math.random() * tot, k = 0;
      for (var i = 0; i < n; i++) { x -= w[i]; if (x < 0) { k = i; break; } }
      var target = secMid(k) - Math.PI / 2 + (Math.random() - 0.5) * 0.25 + 2 * Math.PI * 6, t0 = performance.now(), dur = 3800, last = -1;
      (function anim(t) {
        var p = Math.min(1, (t - t0) / dur), e2 = 1 - Math.pow(1 - p, 3), r = target * e2; drawWheel(r);
        var seg = Math.floor(((r % (2 * Math.PI)) / (2 * Math.PI / n))); if (seg !== last) { last = seg; RS.Audio.sfx('click', 0.3); }
        if (p < 1) requestAnimationFrame(anim);
        else { var txt = E.PRIZES[k].give(s); save(); RS.Audio.sfx('star'); RS.vib(80); $('wheel_res').textContent = '🎉 ' + txt; $('wheel_ok').style.display = ''; E.badges(); }
      })(t0);
    };
    $('wheel_ok').onclick = function () { $('wheelm').classList.remove('show'); if (RS.curScreen() === 'home') RS.refreshHome(); };
  };

  // ---------- tutorial de los primeros niveles ----------
  var TUT = [
    { id: 'drag', when: function (g) { return g.state === 'aim' && !g.aim; }, txt: 'Arrastra hacia atrás para cargar pólvora y suelta para disparar', hand: 'drag' },
    { id: 'abil', when: function (g) { return g.state === 'flight' && g.flightT > 0.25 && g.flightT < 1.6; }, txt: '¡Toca la pantalla ahora para usar su habilidad!', hand: 'tap', slow: true },
    { id: 'queue', when: function (g) { return g.state === 'aim' && !g.aim && g.queue.filter(function (q) { return q.used; }).length >= 1; }, txt: 'Toca un retrato para elegir qué armadillo disparas', hand: 'queue' },
    { id: 'zoom', when: function (g) { return g.state === 'aim' && !g.aim && (g.level.n || 0) >= 3; }, txt: 'Pellizca con dos dedos para acercar · arrastra a la derecha para mirar la fortaleza', hand: 'pinch' },
  ];
  E.tutTick = function (g) {
    var s = S(); s.tut = s.tut || {}; var el = $('tut');
    if (!g || g.ended || g.defense || (g.level.w && g.level.w > 1)) { el.classList.remove('show'); return; }
    var cur = E._tut;
    if (cur) {
      if (!cur.when(g) || (cur.id === 'drag' && g.aim)) { s.tut[cur.id] = 1; save(); E._tut = null; el.classList.remove('show'); if (cur.slow) g.slowT = 0; }
      return;
    }
    for (var i = 0; i < TUT.length; i++) {
      var T = TUT[i]; if (s.tut[T.id]) continue;
      if (T.when(g)) {
        E._tut = T; $('tut_txt').textContent = T.txt; el.className = 'tut show ' + T.hand; $('hint').style.opacity = 0; $('armtip').classList.remove('show');
        if (T.slow) g.slowT = 1.4;
        if (T.id === 'queue') s.tut.queue = 1;
        if (T.id === 'zoom') { s.tut.zoom = 1; setTimeout(function () { el.classList.remove('show'); E._tut = null; }, 4500); }
        save();
      }
      break;
    }
  };

  // ---------- puntos rojos de aviso en el inicio ----------
  E.badges = function () {
    var s = S(); if (!s || !s.st) return;
    var D = s.daily && s.daily.day === dayKey() ? s.daily : null;
    var miss = D ? D.list.some(function (m) { return m.prog >= m.goal && !m.claimed; }) || (D.list.every(function (m) { return m.claimed; }) && !D.bonus) : false;
    var ach = Object.keys(s.ach).some(function (k) { return s.ach[k] === 1; });
    var shop = s.chests.length > 0;
    [['hb_shop', shop], ['hb_miss', miss], ['hb_ach', ach]].forEach(function (b) { var el = $(b[0]); if (el) el.style.display = b[1] ? 'block' : 'none'; });
  };
})(RS);
