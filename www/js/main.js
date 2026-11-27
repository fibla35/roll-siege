// Pantallas, guardado, campaña, liga, constructor y ajustes.
(function (RS) {
  var $ = function (id) { return document.getElementById(id); };
  var cv = $('cv');
  var KEY = 'rollsiege_v1';
  var DEF = { clan: null, name: '', stars: {}, best: {}, coins: 300, trophies: 0, unlockAll: false, layout: null, stable: false, musicStyle: 'mezcla', vol: { music: 0.6, sfx: 0.8 }, cannon: 0, rivalSeed: 1, defLog: [], seenHint: 0 };
  RS.save = Object.assign({}, DEF, JSON.parse(localStorage.getItem(KEY) || '{}'));
  function persist() { try { localStorage.setItem(KEY, JSON.stringify(RS.save)); } catch (e) {} }
  RS.persist = persist;
  var S = RS.save;

  // ---------- carga de imágenes ----------
  RS.loadImg = function (name, src) {
    if (RS.img[name]) return Promise.resolve(RS.img[name]);
    return new Promise(function (ok) { var im = new Image(); im.onload = function () { RS.img[name] = im; ok(im); }; im.onerror = function () { ok(null); }; im.src = src || ('img/' + name + '.webp'); });
  };
  RS.loadBg = function (k) { return Promise.all(['', '_mid', '_ground'].map(function (s) { return RS.loadImg('bg_' + k + s); })); };

  function toast(t) { var e = $('toast'); e.textContent = t; e.classList.add('show'); clearTimeout(toast.t); toast.t = setTimeout(function () { e.classList.remove('show'); }, 1800); }
  RS.toast = toast;

  // ---------- pantallas ----------
  var cur = null, game = null, builder = null, ctxGame = null;
  function show(id) {
    document.querySelectorAll('.screen').forEach(function (s) { s.classList.toggle('show', s.id === id); });
    cur = id;
    if (id !== 'hud' && game) { game.destroy(); game = null; }
    if (id !== 'build' && builder) { builder.destroy(); builder = null; }
    if (id !== 'hud' && id !== 'build') clearCanvas();
    if (SCREENS[id]) SCREENS[id]();
  }
  function clearCanvas() { var c = cv.getContext('2d'); c.clearRect(0, 0, cv.width, cv.height); }
  document.addEventListener('click', function (e) {
    var b = e.target.closest('[data-go]'); if (!b) return;
    RS.Audio.init(); RS.Audio.sfx('click', 0.6);
    var g = b.getAttribute('data-go');
    if (g === 'start') return show(S.clan ? 'home' : 'clan');
    show(g);
  });

  function totalStars() { return Object.keys(S.stars).reduce(function (a, k) { return a + S.stars[k]; }, 0); }
  function worldOpen(w) { if (S.unlockAll || w === 1) return true; return !!S.stars[(w - 1) + '-20']; }
  function levelOpen(w, n) { if (S.unlockAll) return true; if (!worldOpen(w)) return false; return n === 1 || !!S.stars[w + '-' + (n - 1)]; }
  function maxWorld() { var m = 1; for (var w = 2; w <= 6; w++) if (worldOpen(w)) m = w; return m; }
  function armOpen(i) { var a = RS.ARMS[i]; if (S.unlockAll) return true; if (a.rare === 3) return !!S.stars['6-20']; return a.world <= maxWorld(); }
  function matOpen(m) { return S.unlockAll || RS.MATS[m].lvl <= maxWorld(); }

  var SCREENS = {};
  SCREENS.title = function () { RS.Audio.play('RSM01'); };

  // ---------- clan ----------
  var clanSel = null;
  SCREENS.clan = function () {
    RS.Audio.play('RSM01');
    var box = $('clanlist'); box.innerHTML = '';
    Object.keys(RS.CLANS).forEach(function (k) {
      var c = RS.CLANS[k], b = document.createElement('button'); b.className = 'card' + (clanSel === k ? ' sel' : '');
      b.innerHTML = '<img src="img/bg_' + k + '.webp"><b>' + c.short + '</b><span>' + c.desc + '</span>';
      b.onclick = function () { clanSel = k; RS.Audio.sfx('click'); RS.Audio.play(c.music); SCREENS.clan(); };
      box.appendChild(b);
    });
    $('fortname').value = S.name || '';
  };
  $('clanok').onclick = function () {
    if (!clanSel) return toast('Elige un clan');
    S.clan = clanSel; S.name = $('fortname').value.trim() || 'Fortaleza ' + RS.CLANS[clanSel].short; persist(); show('home');
  };

  // ---------- inicio ----------
  SCREENS.home = function () {
    RS.Audio.play('RSM01');
    $('home').style.backgroundImage = 'url(img/bg_' + S.clan + '.webp)';
    $('h_coins').textContent = S.coins; $('h_troph').textContent = S.trophies; $('h_stars').textContent = totalStars();
    $('h_fname').textContent = S.name;
  };

  // ---------- mapa ----------
  var WPOS = [[24.4, 34], [39.4, 37.5], [53.3, 36], [66.7, 33], [79.4, 41], [91, 29]];
  SCREENS.map = function () {
    RS.Audio.play('RSM01');
    $('m_stars').textContent = totalStars();
    var box = $('worldnodes'); box.innerHTML = '';
    var W = innerWidth, H = innerHeight, sc = Math.max(W / 1600, H / 1066), ox = (W - 1600 * sc) / 2, oy = (H - 1066 * sc) / 2;
    RS.WORLDS.forEach(function (w, i) {
      var open = worldOpen(w.id), st = 0; for (var n = 1; n <= 20; n++) st += S.stars[w.id + '-' + n] || 0;
      var b = document.createElement('button'); b.className = 'wnode' + (open ? '' : ' locked');
      b.style.left = (ox + WPOS[i][0] / 100 * 1600 * sc) + 'px'; b.style.top = (oy + WPOS[i][1] / 100 * 1066 * sc + 40) + 'px';
      b.innerHTML = '<div class="num">' + (open ? w.id : '🔒') + '</div><div>' + w.name + '</div><div>★ ' + st + '/60</div>';
      b.onclick = function () { if (!open) return toast('Vence al jefe del mundo ' + (w.id - 1)); RS.Audio.sfx('click'); curWorld = w.id; show('levels'); };
      box.appendChild(b);
    });
  };

  // ---------- niveles ----------
  var curWorld = 1;
  SCREENS.levels = function () {
    var W = RS.WORLDS[curWorld - 1]; RS.Audio.play(W.music);
    $('lv_title').textContent = 'Mundo ' + W.id + ' · ' + W.name;
    var g = $('levelgrid'); g.innerHTML = '';
    for (var n = 1; n <= 20; n++) (function (n) {
      var open = levelOpen(curWorld, n), st = S.stars[curWorld + '-' + n] || 0, b = document.createElement('button');
      b.className = 'lv' + (n === 20 ? ' boss' : '') + (open ? '' : ' locked');
      var stars = ''; for (var i = 0; i < 3; i++) stars += '<img src="img/ui/star' + (i < st ? 1 : 0) + '.webp">';
      b.innerHTML = (n === 20 ? '☠' : n) + (open ? '<div class="st">' + stars + '</div>' : '');
      b.onclick = function () { if (!open) return toast('Supera el nivel anterior'); RS.Audio.sfx('click'); startLevel(curWorld, n); };
      g.appendChild(b);
    })(n);
  };

  // ---------- partida ----------
  function startGame(level, ctx) {
    ctxGame = ctx; ctxGame.level = level;
    var bgKey = ctx.bg;
    RS.loadBg(bgKey).then(function () {
      show('hud');
      $('hud_lv').textContent = ctx.label;
      if (game) game.destroy();
      game = new RS.Game(cv, level, {
        style: ctx.style, clan: S.clan, bg: bgKey, cannonLvl: S.cannon,
        onQueue: drawQueue, onTick: hudTick, onEnd: onEnd,
        onAbility: function () { $('hint').style.opacity = 0; },
      });
      drawQueue();
      $('hint').style.opacity = S.seenHint < 3 ? 1 : 0;
      if (S.seenHint < 3) { S.seenHint++; persist(); setTimeout(function () { $('hint').style.opacity = 0; }, 6000); }
      RS.Audio.play(ctx.music);
    });
  }
  function startLevel(w, n) {
    var lvl = RS.makeLevel(w, n), W = RS.WORLDS[w - 1];
    startGame(lvl, { kind: 'camp', w: w, n: n, style: 'bandido', bg: W.bg, music: n === 20 ? 'RSM09' : W.music, label: w + '-' + n + (n === 20 ? ' JEFE' : '') });
  }
  function drawQueue() {
    if (!game) return;
    var q = $('queue'); q.innerHTML = '';
    game.queue.forEach(function (it, i) {
      var b = document.createElement('button'); b.className = 'q' + (i === game.sel ? ' sel' : '') + (it.used ? ' used' : '');
      b.innerHTML = '<img src="img/ui/por' + it.arm + '.webp"><div class="nm">' + RS.ARMS[it.arm].name + '</div>';
      b.onpointerdown = function (e) { e.stopPropagation(); game.selectArm(i); };
      q.appendChild(b);
    });
  }
  var lastScore = -1;
  function hudTick() {
    if (!game) return;
    var sc = game.phys.score; if (sc !== lastScore) { lastScore = sc; $('hud_score').textContent = sc.toLocaleString('es'); }
    $('hud_gems').textContent = game.phys.gemsLeft();
  }
  $('pausebtn').onclick = function () { if (!game || game.ended) return; game.paused = true; RS.Audio.sfx('click'); syncAudioBtns(); $('pause').classList.add('show'); };
  $('p_resume').onclick = function () { $('pause').classList.remove('show'); if (game) game.paused = false; };
  $('p_retry').onclick = function () { $('pause').classList.remove('show'); retry(); };
  $('p_quit').onclick = function () { $('pause').classList.remove('show'); back(); };
  function syncAudioBtns() { $('p_mus').classList.toggle('off', S.vol.music === 0); $('p_snd').classList.toggle('off', S.vol.sfx === 0); }
  $('p_mus').onclick = function () { S.vol.music = S.vol.music ? 0 : 0.6; RS.Audio.setVol('music', S.vol.music); persist(); syncAudioBtns(); };
  $('p_snd').onclick = function () { S.vol.sfx = S.vol.sfx ? 0 : 0.8; RS.Audio.setVol('sfx', S.vol.sfx); persist(); syncAudioBtns(); };
  function retry() { var c = ctxGame; startGame(c.kind === 'camp' ? RS.makeLevel(c.w, c.n) : c.kind === 'league' ? RS.makeRival(S.rivalSeed, S.trophies) : ownLevel(), c); }
  function back() { var k = ctxGame && ctxGame.kind; show(k === 'camp' ? 'levels' : k === 'league' ? 'league' : 'build'); }

  function onEnd(r) {
    var c = ctxGame, txt = '';
    RS.Audio.play(r.win ? 'RSM14_victoria' : 'RSM14_derrota');
    $('r_title').src = 'img/ui/' + (r.win ? 't_victoria' : 't_derrota') + '.webp';
    var st = ''; for (var i = 0; i < 3; i++) st += '<img src="img/ui/star' + (i < r.stars ? 1 : 0) + '.webp">';
    $('r_stars').innerHTML = r.win ? st : '';
    txt = 'Puntos <b>' + r.score.toLocaleString('es') + '</b>';
    if (r.bonus) txt += '<br>Bonus armadillos sin usar: +' + r.bonus.toLocaleString('es');
    txt += '<br>Destrucción: ' + Math.round(r.destr * 100) + '%';
    $('r_next').style.display = 'none';
    if (c.kind === 'camp') {
      var k = c.w + '-' + c.n;
      if (r.win) {
        var prev = S.stars[k] || 0, coins = 20 + (r.stars - prev > 0 ? (r.stars - prev) * 15 : 0) + (c.n === 20 ? 150 : 0);
        S.stars[k] = Math.max(prev, r.stars); S.coins += coins; txt += '<br>+' + coins + ' monedas';
        if ((S.best[k] || 0) < r.score) { S.best[k] = r.score; if (prev) txt += '<br>¡Nuevo récord!'; }
        if (c.n < 20 || c.w < 6) $('r_next').style.display = '';
        if (c.n === 20 && c.w < 6) txt += '<br>¡Mundo ' + (c.w + 1) + ' desbloqueado!';
      } else txt += '<br>Te quedaste sin armadillos. ¡Prueba otro orden!';
    } else if (c.kind === 'league') {
      var d = r.win ? 25 + r.stars * 5 : -15;
      S.trophies = Math.max(0, S.trophies + d); txt += '<br>Trofeos ' + (d > 0 ? '+' : '') + d;
      if (r.win) { var loot = Math.round(c.level.loot * (0.5 + r.destr * 0.5)); S.coins += loot; txt += ' · Botín +' + loot + ' monedas'; }
      S.rivalSeed++; if (r.win) $('r_next').style.display = '';
    } else {
      txt += '<br>' + (r.win ? 'Tu fortaleza ha caído: refuérzala.' : '¡Tu fortaleza ha resistido!');
    }
    persist();
    $('r_text').innerHTML = txt; $('result').classList.add('show');
  }
  $('r_retry').onclick = function () { $('result').classList.remove('show'); retry(); };
  $('r_back').onclick = function () { $('result').classList.remove('show'); back(); };
  $('r_next').onclick = function () {
    $('result').classList.remove('show'); var c = ctxGame;
    if (c.kind === 'camp') { var w = c.w, n = c.n + 1; if (n > 20) { w++; n = 1; } curWorld = w; startLevel(w, n); }
    else if (c.kind === 'league') startLeague();
  };

  // ---------- liga ----------
  function startLeague() {
    var r = RS.makeRival(S.rivalSeed, S.trophies);
    startGame(r, { kind: 'league', style: r.clan, bg: r.clan, music: 'RSM10', label: r.name });
  }
  function miniDraw(canvas, lvl, style) {
    var c = canvas.getContext('2d'), W = canvas.width = 400, H = canvas.height = 200;
    var x0 = Infinity, x1 = -Infinity, y1 = 1;
    lvl.pieces.forEach(function (p) { var a = RS.pieceAABB(p); x0 = Math.min(x0, a.x0); x1 = Math.max(x1, a.x1); y1 = Math.max(y1, a.y1); });
    if (!isFinite(x0)) { x0 = 0; x1 = 10; }
    var s = Math.min((W - 20) / (x1 - x0 + 1), (H - 20) / (y1 + 0.5)), ox = (W - (x1 - x0) * s) / 2 - x0 * s;
    lvl.pieces.forEach(function (p) { RS.drawBlock(c, style, p, false, ox + p.x * s, H - 8 - p.y * s, -(p.rot || 0) * Math.PI / 2, s, null, p.tint); });
    (lvl.gems || []).forEach(function (g) { RS.drawSp(c, 'items', 6 + (g.c || 0), ox + g.x * s, H - 8 - g.y * s, 0.75 * s, 0.75 * s); });
  }
  SCREENS.league = function () {
    RS.Audio.play('RSM10');
    $('league').style.backgroundImage = 'url(img/bg_w5.webp)';
    $('l_troph').textContent = S.trophies; $('l_coins').textContent = S.coins;
    var r = RS.makeRival(S.rivalSeed, S.trophies), c = RS.CLANS[r.clan];
    $('l_rival').innerHTML = '<canvas id="l_cv"></canvas><div><b>' + r.name + '</b>' + c.name + '<br>🏆 ' + r.trophies + '<br>Botín: hasta ' + r.loot + ' monedas<br>Gemas: ' + r.gems.length + '</div>';
    miniDraw($('l_cv'), r, r.clan);
    $('l_def').textContent = S.layout && S.stable ? 'Tu fortaleza "' + S.name + '" está publicada en la liga. (Las defensas contra otros jugadores llegarán con el servidor online.)' : 'Construye y guarda tu fortaleza estable para que otros jugadores puedan asaltarla.';
  };
  $('l_next').onclick = function () { S.rivalSeed++; persist(); RS.Audio.sfx('whoosh'); SCREENS.league(); };
  $('l_go').onclick = function () { RS.Audio.sfx('click'); startLeague(); };

  // ---------- mi fortaleza ----------
  var OFF = 16;
  function ownLevel() {
    var L = S.layout || { pieces: [], gems: [] };
    var pieces = L.pieces.map(function (p) { var q = Object.assign({}, p); q.x += OFF; return q; });
    var gems = L.gems.map(function (g) { return { x: g.x + OFF, y: g.y, c: g.c }; });
    var three = Math.round(22 * 120 + gems.length * 1000);
    return { pieces: pieces, gems: gems, arms: [0, 1, 3, 2, 4], end: OFF + 22, stars: [1, three * 0.55, three * 0.85], deco: (L.deco || []).map(function (d) { return Object.assign({}, d, { x: d.x + OFF }); }), sign: L.sign ? Object.assign({}, L.sign, { x: L.sign.x + OFF, name: S.name }) : null };
  }
  var TOOLS = [['place', '🧱 Poner'], ['erase', '🗑 Quitar'], ['weld', '🔩 Soldar'], ['swap', '♻ Material'], ['paint', '🎨 Pintar'], ['gem', '💎 Gema'], ['deco', '🏮 Adorno'], ['sign', '🪧 Cartel']];
  function shapeIcon(si, mi) {
    var c = document.createElement('canvas'); c.width = 90; c.height = 60; var x = c.getContext('2d'), sh = RS.SHAPES[si];
    var s = Math.min(80 / sh.w, 50 / sh.h); RS.drawBlock(x, S.clan, { s: si, m: mi, rot: 0 }, false, 45, 30, 0, s);
    return c;
  }
  function buildUI() {
    var B = builder, tb = $('b_tools'), pal = $('b_pal'); tb.innerHTML = ''; pal.innerHTML = '';
    TOOLS.forEach(function (t) { var b = document.createElement('button'); b.className = 'tb' + (B.tool === t[0] ? ' sel' : ''); b.textContent = t[1]; b.onclick = function () { B.tool = t[0]; RS.Audio.sfx('click', 0.4); buildUI(); }; tb.appendChild(b); });
    tb.appendChild(Object.assign(document.createElement('div'), { className: 'sep' }));
    var rot = document.createElement('button'); rot.className = 'tb'; rot.textContent = '⟳ Girar'; rot.onclick = function () { B.rot = (B.rot + 1) % 2; RS.Audio.sfx('click', 0.4); }; tb.appendChild(rot);
    var nm = document.createElement('button'); nm.className = 'tb'; nm.textContent = '✏ Nombre'; nm.onclick = function () { var v = prompt('Nombre de tu fortaleza', S.name); if (v) { S.name = v.slice(0, 20); persist(); if (B.L.sign) B.L.sign.name = S.name; } }; tb.appendChild(nm);
    var clr = document.createElement('button'); clr.className = 'tb'; clr.textContent = '✖ Vaciar'; clr.onclick = function () { if (confirm('¿Borrar toda la fortaleza?')) { B.L.pieces = []; B.L.gems = []; B.L.deco = []; B.L.sign = null; B.changed(); updB(); } }; tb.appendChild(clr);
    if (B.tool === 'place' || B.tool === 'swap') {
      if (B.tool === 'place') RS.SHAPES.forEach(function (sh, i) { var b = document.createElement('button'); b.className = 'tb' + (B.shape === i ? ' sel' : ''); b.appendChild(shapeIcon(i, B.mat)); b.title = sh.name; b.onclick = function () { B.shape = i; buildUI(); }; pal.appendChild(b); });
      if (B.tool === 'place') pal.appendChild(Object.assign(document.createElement('div'), { className: 'sep' }));
      RS.MATS.forEach(function (m, i) {
        var open = matOpen(i), b = document.createElement('button'); b.className = 'tb' + (B.mat === i ? ' sel' : '') + (open ? '' : ' lock');
        b.textContent = m.name + ' · ' + m.cost; b.onclick = function () { if (!open) return toast('Se desbloquea en el mundo ' + m.lvl); B.mat = i; buildUI(); }; pal.appendChild(b);
      });
    } else if (B.tool === 'paint') {
      RS.PAINTS.forEach(function (p, i) { var b = document.createElement('button'); b.className = 'tb' + (B.paint === i ? ' sel' : ''); b.innerHTML = '<span class="sw" style="background:' + (p ? p.replace(/[\d.]+\)$/, '1)') : 'repeating-linear-gradient(45deg,#fff 0 4px,#bbb 4px 8px)') + '"></span>' + (p ? '' : 'Quitar'); b.onclick = function () { B.paint = i; buildUI(); }; pal.appendChild(b); });
    } else if (B.tool === 'deco') {
      var sh = 'deco_' + S.clan, n = RS.atlas[sh].length;
      for (var i = 0; i < n; i++) (function (i) {
        var b = document.createElement('button'); b.className = 'tb' + (B.decoIdx === i ? ' sel' : ''); var c = document.createElement('canvas'); c.width = 60; c.height = 60;
        var a = RS.spAspect(sh, i), w = a > 1 ? 56 : 56 * a, h = a > 1 ? 56 / a : 56; RS.drawSp(c.getContext('2d'), sh, i, 30, 30, w, h);
        b.appendChild(c); b.onclick = function () { B.decoIdx = i; buildUI(); }; pal.appendChild(b);
      })(i);
    } else {
      var help = { erase: 'Toca una pieza, gema, adorno o el cartel para quitarlo.', weld: 'Toca una pieza para soldarla a las que toca: aguanta más, cuesta 1 punto.', gem: 'Coloca hasta 3 gemas en huecos: el rival gana si las tira todas.', sign: 'Toca donde quieras colgar el cartel con el nombre.' }[B.tool];
      pal.innerHTML = '<span class="small" style="text-align:left">' + help + '</span>';
    }
    updB();
  }
  function updB() {
    if (!builder) return;
    $('b_budget').textContent = builder.cost() + '/' + RS.BUILD.BUDGET;
    $('b_state').textContent = builder.stable ? '✔ Estable' : '⚠ Sin probar';
    $('b_state').style.color = builder.stable ? '#7f7' : '#fd6';
  }
  SCREENS.build = function () {
    RS.Audio.play(RS.CLANS[S.clan].music);
    RS.loadBg(S.clan).then(function () {
      if (cur !== 'build') return;
      if (builder) builder.destroy();
      builder = new RS.Builder(cv, { clan: S.clan, layout: S.layout, stable: S.stable, name: S.name, onChange: updB });
      buildUI();
    });
  };
  $('b_back').onclick = function () {
    if (builder && JSON.stringify(builder.L) !== JSON.stringify(S.layout || { pieces: [], gems: [], deco: [], sign: null }) && !confirm('¿Salir sin guardar?')) return;
    show('home');
  };
  $('b_test').onclick = function () { if (builder) builder.testGravity(function () { updB(); }); };
  $('b_save').onclick = function () {
    var B = builder; if (!B) return;
    if (!B.L.gems.length) return toast('Pon al menos una gema');
    if (!B.stable) return toast('Haz la prueba de gravedad primero');
    S.layout = JSON.parse(JSON.stringify(B.L)); S.stable = true; persist(); RS.Audio.sfx('star'); toast('¡Fortaleza guardada!');
  };
  $('b_siege').onclick = function () {
    var B = builder; if (!B) return;
    if (!B.L.gems.length) return toast('Pon al menos una gema');
    S.layout = JSON.parse(JSON.stringify(B.L)); S.stable = B.stable; persist();
    startGame(ownLevel(), { kind: 'own', style: S.clan, bg: S.clan, music: 'RSM10', label: S.name });
  };

  // ---------- armadillos ----------
  SCREENS.arms = function () {
    var g = $('armgrid'); g.innerHTML = '';
    RS.ARMS.forEach(function (a, i) {
      var open = armOpen(i), d = document.createElement('div'); d.className = 'arm' + (open ? '' : ' locked');
      var c = document.createElement('canvas'); c.width = 160; c.height = 160;
      var sh = 'arm_anim' + Math.floor(i / 3), idx = (i % 3) * 8; var asp = RS.spAspect(sh, idx); RS.drawSp(c.getContext('2d'), sh, idx, 80, 80, asp > 1 ? 150 : 150 * asp, asp > 1 ? 150 / asp : 150);
      d.appendChild(c);
      d.insertAdjacentHTML('beforeend', '<b>' + a.name + '</b><span class="rr r' + a.rare + '">' + RS.RARE[a.rare] + '</span><span class="d">' + (open ? a.desc : (a.rare === 3 ? 'Vence al jefe final' : 'Se desbloquea en el mundo ' + a.world)) + '</span>');
      g.appendChild(d);
    });
  };

  // ---------- ajustes ----------
  SCREENS.settings = function () {
    $('s_mus').value = S.vol.music; $('s_sfx').value = S.vol.sfx; $('s_style').value = S.musicStyle; $('s_can').value = S.cannon;
    var sc = $('s_clan'); sc.innerHTML = ''; Object.keys(RS.CLANS).forEach(function (k) { var o = document.createElement('option'); o.value = k; o.textContent = RS.CLANS[k].short; sc.appendChild(o); }); sc.value = S.clan;
    $('s_unlock').textContent = S.unlockAll ? 'Bloquear de nuevo' : 'Desbloquear todo (pruebas)';
  };
  $('s_mus').oninput = function () { S.vol.music = +this.value; RS.Audio.setVol('music', S.vol.music); persist(); };
  $('s_sfx').oninput = function () { S.vol.sfx = +this.value; RS.Audio.setVol('sfx', S.vol.sfx); persist(); };
  $('s_sfx').onchange = function () { RS.Audio.sfx('gem'); };
  $('s_style').onchange = function () { S.musicStyle = this.value; persist(); var c = RS.Audio.cur; RS.Audio.cur = null; RS.Audio.play('RSM01'); };
  $('s_clan').onchange = function () { S.clan = this.value; persist(); toast('Clan: ' + RS.CLANS[S.clan].short); };
  $('s_can').onchange = function () { S.cannon = +this.value; persist(); };
  $('s_unlock').onclick = function () { S.unlockAll = !S.unlockAll; persist(); SCREENS.settings(); toast(S.unlockAll ? 'Todo desbloqueado' : 'Bloqueado'); };
  $('s_reset').onclick = function () { if (confirm('¿Borrar toda la partida?')) { localStorage.removeItem(KEY); location.reload(); } };

  // botón atrás de Android
  document.addEventListener('backbutton', function () {
    if ($('result').classList.contains('show')) return $('r_back').click();
    if (cur === 'hud') return $('pausebtn').click();
    if (cur === 'build') return $('b_back').click();
    if (cur === 'levels') return show('map');
    if (cur !== 'home' && cur !== 'title') show('home');
  });
  try { var CapApp = window.Capacitor && window.Capacitor.Plugins && window.Capacitor.Plugins.App; if (CapApp) CapApp.addListener('backButton', function () { if (cur === 'home' || cur === 'title') CapApp.exitApp(); else document.dispatchEvent(new Event('backbutton')); }); } catch (e) {}
  window.addEventListener('popstate', function () { history.pushState(null, ''); document.dispatchEvent(new Event('backbutton')); });
  history.pushState(null, '');
  window.addEventListener('resize', function () { if (cur === 'map') SCREENS.map(); });
  document.addEventListener('pointerdown', function () { RS.Audio.init(); if (RS.Audio.music && RS.Audio.music.paused && S.vol.music > 0) RS.Audio.music.play().catch(function () {}); }, { once: false, passive: true });

  // ---------- arranque ----------
  RS.Audio.vol.music = S.vol.music; RS.Audio.vol.sfx = S.vol.sfx;
  fetch('img/atlas.json').then(function (r) { return r.json(); }).then(function (atlas) {
    RS.atlas = atlas;
    var names = Object.keys(atlas), done = 0;
    return Promise.all(names.map(function (n) { return RS.loadImg(n).then(function () { done++; $('loadfill').style.width = Math.round(done / names.length * 100) + '%'; }); }));
  }).then(function () { return document.fonts ? document.fonts.load('20px Lilita') : null; }).then(function () {
    show('title');
    RS.loadBg(S.clan || 'w1');
  });
  RS._dbg = { show: show, startLevel: startLevel, get game() { return game; }, get builder() { return builder; } };
})(RS);
