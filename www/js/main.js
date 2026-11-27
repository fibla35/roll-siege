// Pantallas, guardado, campaña, liga, constructor y ajustes.
(function (RS) {
  var $ = function (id) { return document.getElementById(id); };
  // escenario apaisado que siempre cabe en la pantalla (móvil, tableta, navegador o ventana estrecha)
  RS.stage = { x: 0, y: 0, w: innerWidth, h: innerHeight };
  function fitStage() {
    var W = innerWidth, H = innerHeight, a = W / H, w = W, h = H;
    if (a < 1.5) h = W / 1.5; else if (a > 2.3) w = H * 2.3;
    w = Math.floor(w); h = Math.floor(h);
    RS.stage = { x: Math.floor((W - w) / 2), y: Math.floor((H - h) / 2), w: w, h: h };
    var st = document.getElementById('stage'), r = document.documentElement.style;
    st.style.left = RS.stage.x + 'px'; st.style.top = RS.stage.y + 'px'; st.style.width = w + 'px'; st.style.height = h + 'px';
    r.setProperty('--vh', (h / 100) + 'px'); r.setProperty('--vw', (w / 100) + 'px');
  }
  fitStage(); addEventListener('resize', fitStage);
  var cv = $('cv');
  var KEY = 'rollsiege_v1';
  var DEF = { clan: null, name: '', stars: {}, best: {}, coins: 300, trophies: 0, unlockAll: false, layout: null, stable: false, musicStyle: 'mezcla', vol: { music: 0.6, sfx: 0.8 }, cannon: 0, rivalSeed: 1, defLog: [], seenHint: 0 };
  var stored = {}; try { stored = JSON.parse(localStorage.getItem(KEY) || '{}'); } catch (e) {}
  RS.save = Object.assign({}, DEF, stored);
  function persist() { try { localStorage.setItem(KEY, JSON.stringify(RS.save)); } catch (e) {} }
  RS.persist = persist;
  var S = RS.save;
  RS.curScreen = function () { return cur; };
  RS.refreshHome = function () { $('h_coins').textContent = S.coins; };

  // ---------- carga de imágenes ----------
  RS.loadImg = function (name, src) {
    if (RS.img[name]) return Promise.resolve(RS.img[name]);
    return new Promise(function (ok) { var im = new Image(); im.onload = function () { RS.img[name] = im; ok(im); }; im.onerror = function () { ok(null); }; im.src = src || ('img/' + name + '.webp'); });
  };
  RS.loadBg = function (k) { return Promise.all(['', '_mid', '_ground'].map(function (s) { return RS.loadImg('bg_' + k + s); })); };

  // diálogo propio (alert/confirm/prompt no funcionan en todas partes)
  function ask(text, cb, input) {
    var m = $('dlg'); $('dlg_t').textContent = text; var inp = $('dlg_in');
    inp.style.display = input != null ? '' : 'none'; if (input != null) inp.value = input;
    m.classList.add('show');
    $('dlg_ok').onclick = function () { m.classList.remove('show'); cb(input != null ? inp.value : true); };
    $('dlg_no').onclick = function () { m.classList.remove('show'); };
  }
  function toast(t) { var e = $('toast'); e.textContent = t; e.classList.add('show'); clearTimeout(toast.t); toast.t = setTimeout(function () { e.classList.remove('show'); }, 1800); }
  RS.toast = toast;

  // ---------- pantallas ----------
  var cur = null, game = null, builder = null, ctxGame = null;
  function show(id) {
    document.querySelectorAll('.screen').forEach(function (s) { s.classList.toggle('show', s.id === id); });
    cur = id;
    if (id !== 'hud' && game) { game.destroy(); game = null; document.getElementById('tut').classList.remove('show'); RS.Extras._tut = null; }
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
  function maxWorld() { var m = 1; for (var w = 2; w <= RS.WORLDS.length; w++) if (worldOpen(w)) m = w; return m; }
  function armOpen(i) { var a = RS.ARMS[i]; if (S.unlockAll) return true; if (a.rare === 3) return !!S.stars[(i >= 12 ? '12' : '6') + '-20']; return a.world <= maxWorld(); }
  RS.Extras.armOpen = armOpen; RS.Extras.init();
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
      b.innerHTML = '<img src="img/bg_' + k + '.webp" alt=""><div class="ct"><b>' + c.short + '</b><span>' + c.desc + '</span></div>';
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
    $('h_fname').textContent = S.name; RS.Extras.daily(); RS.Extras.badges();
    var liveEv = Object.keys(RS.EVENTS).filter(function (e) { return RS.eventActive(e); })[0];
    $('hb_evi').src = 'img/ui/' + (liveEv ? RS.EVENTS[liveEv].ico : 'ico_events') + '.webp'; $('hb_ev').style.display = liveEv && !S.stars[evKey(liveEv, 10)] ? 'block' : 'none';
    if (RS.Extras.wheelDue()) setTimeout(function () { if (cur === 'home' && !document.querySelector('.modal.show')) RS.Extras.wheel(); }, 700);
  };

  // ---------- mapa ----------
  var MAPS = { 1: { img: 'map.webp', pos: [[24.4, 34], [39.4, 37.5], [53.3, 36], [66.7, 33], [79.4, 41], [91, 29]] },
    2: { img: 'map2.webp', pos: [[14, 53], [26, 36], [41.7, 42], [60, 44.4], [73.6, 34.7], [87.9, 24.4]] },
    3: { img: 'map3.webp', pos: [[14.5, 31], [31.5, 16], [44.5, 56], [57.5, 19], [75, 52], [88.5, 25]] } };
  var MAP_NAMES = { 1: 'Primer continente', 2: 'Nuevo continente', 3: 'Mares Bandidos' };
  var mapPage = 1;
  SCREENS.map = function () {
    RS.Audio.play('RSM19');
    $('m_stars').textContent = totalStars();
    var M = MAPS[mapPage]; $('map').style.backgroundImage = 'url(img/' + M.img + ')';
    var box = $('worldnodes'); box.innerHTML = '';
    var W = RS.stage.w, H = RS.stage.h, sc = Math.max(W / 1600, H / 1066), ox = (W - 1600 * sc) / 2, oy = (H - 1066 * sc) / 2;
    RS.WORLDS.filter(function (w) { return (w.map || 1) === mapPage; }).forEach(function (w, i) {
      var open = worldOpen(w.id), st = 0; for (var n = 1; n <= 20; n++) st += S.stars[w.id + '-' + n] || 0;
      var b = document.createElement('button'); b.className = 'wnode' + (open ? '' : ' locked');
      b.style.left = (ox + M.pos[i][0] / 100 * 1600 * sc) + 'px'; b.style.top = (oy + M.pos[i][1] / 100 * 1066 * sc + 40) + 'px';
      b.innerHTML = '<div class="num">' + (open ? w.id : '🔒') + '</div><div>' + w.name + '</div><div>★ ' + st + '/60</div>';
      b.onclick = function () { if (!open) return toast('Vence al jefe del mundo ' + (w.id - 1)); RS.Audio.sfx('click'); curWorld = w.id; show('levels'); };
      box.appendChild(b);
    });
    [[-1, 'left'], [1, 'right']].forEach(function (d) {
      var to = mapPage + d[0]; if (!MAPS[to]) return;
      var arrow = document.createElement('button'); arrow.className = 'maparrow ' + d[1];
      arrow.innerHTML = d[0] > 0 ? '<span>' + MAP_NAMES[to] + '</span> ❯' : '❮ <span>' + MAP_NAMES[to] + '</span>';
      arrow.onclick = function () { mapPage = to; RS.Audio.sfx('whoosh'); SCREENS.map(); };
      box.appendChild(arrow);
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
      b.innerHTML = (n === 20 ? '☠' : (n % 5 === 0 && canDefend()) ? '⚔' : n) + (open ? '<div class="st">' + stars + '</div>' : '');
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
        style: ctx.style, clan: S.clan, bg: bgKey, cannonLvl: S.cannon, defense: !!ctx.defense, boost: ctx.boost || {},
        onQueue: drawQueue, onTick: hudTick, onEnd: onEnd, onStat: function (k, v) { RS.Extras.stat(k, v); },
        onAbility: function () { $('hint').style.opacity = 0; },
        onDebuff: function (t) { var el = $('debuff'); if (!t) $('splat').classList.remove('show'); if (t) { el.textContent = t; el.classList.add('show'); } else el.classList.remove('show'); },
        onSplat: function (on) { var el = $('splat'); if (on) { el.innerHTML = ''; for (var i = 0; i < 5; i++) { var sp = document.createElement('i'); sp.style.left = (10 + Math.random() * 70) + '%'; sp.style.top = (15 + Math.random() * 55) + '%'; sp.style.transform = 'scale(' + (0.7 + Math.random() * 0.8) + ') rotate(' + Math.random() * 360 + 'deg)'; el.appendChild(sp); } el.classList.add('show'); toast('🥧 ¡Tartazo! Se limpia al disparar'); } else el.classList.remove('show'); },
        onAim: function () { clearTimeout(armTip.t); $('armtip').classList.remove('show'); $('hint').style.opacity = 0; },
      });
      drawQueue();
      $('hint').style.opacity = S.seenHint < 3 ? 1 : 0;
      if (S.seenHint < 3) { S.seenHint++; persist(); setTimeout(function () { $('hint').style.opacity = 0; }, 6000); }
      $('debuff').classList.remove('show'); $('splat').classList.remove('show');
      if (level.racs && level.racs.length && !S.seenRacs && !(ctx.kind === 'camp' && ctx.w === 1 && ctx.n === 1)) { S.seenRacs = 1; persist(); setTimeout(function () { toast('🦝 ¡Derriba a todos los mapaches! Las gemas son premio extra'); }, 1800); }
      RS.Audio.play(ctx.music);
    });
  }
  // música de partida: la del mundo y, entre medias, DnB animadas que van rotando
  var DNB_POOL = ['RSM15', 'RSM16', 'RSM17', 'RSM18', 'RSM19', 'RSM20'];
  var DNB_ALL = ['RSM03', 'RSM05', 'RSM06', 'RSM08', 'RSM10'].concat(DNB_POOL);
  function levelMusic(w, n) {
    if (n === 20) return 'RSM09';
    if (S.musicStyle === 'dnb') return DNB_ALL[(w * 7 + n) % DNB_ALL.length];
    if (S.musicStyle && S.musicStyle !== 'mezcla') return RS.WORLDS[w - 1].music;
    return n % 3 === 1 ? RS.WORLDS[w - 1].music : DNB_POOL[(w * 5 + n) % DNB_POOL.length];
  }
  RS.levelMusic = levelMusic;
  function canDefend() { return S.layout && S.stable && S.layout.gems && S.layout.gems.length && S.layout.pieces.length; }
  function startLevel(w, n, skipPrep, boost) {
    var W = RS.WORLDS[w - 1];
    if (n % 5 === 0 && n < 20 && canDefend()) {
      var dl = ownLevel(); dl.arms = []; dl.w = w; dl.n = n; dl.racs = [];
      startGame(dl, { kind: 'camp', w: w, n: n, style: S.clan, bg: W.bg, music: 'RSM09', label: w + '-' + n + ' CONTRAATAQUE', defense: true });
      setTimeout(function () { toast('⚔ ¡Contraataque! Los mapaches atacan tu fortaleza. Lanzan 3 rocas: tócalas en el aire para desviarlas (2 veces)'); }, 600);
      return;
    }
    var lvl = RS.makeLevel(w, n);
    if (!skipPrep && (w > 1 || n >= 4)) return RS.Extras.prep('Nivel ' + w + '-' + n + (n === 20 ? ' · JEFE' : ''), function (b) { startLevel(w, n, true, b); });
    startGame(lvl, { kind: 'camp', boost: boost || {}, w: w, n: n, style: 'bandido', bg: W.bg, music: levelMusic(w, n), label: w + '-' + n + (n === 20 ? ' JEFE' : '') });
  }
  // ---------- eventos de temporada ----------
  var EV_GIFT = { 2: 0, 4: 1, 5: 2, 7: 3, 9: 4, 10: 5 }; // nivel -> skin del evento que regala al superarlo
  function evOpen(ev) { return S.unlockAll || RS.eventActive(ev); }
  function evKey(ev, n) { return 'ev:' + ev + '-' + n; }
  RS.skinPreview = function (cv, k, ball) {
    var x = cv.getContext('2d'), sh = RS.SKIN_SHEETS[Math.floor(k / 6)], idx = (k % 6) * 2 + (ball ? 1 : 0);
    cv.width = 120; cv.height = 120; if (!RS.atlas[sh]) return;
    var a = RS.spAspect(sh, idx), w = a > 1 ? 104 : 104 * a, h = w / a; RS.drawSp(x, sh, idx, 60, 60, w, h);
  };
  SCREENS.events = function () {
    RS.Audio.play('RSM16');
    var box = $('evlist'); box.innerHTML = '';
    Object.keys(RS.EVENTS).forEach(function (ev) {
      var E = RS.EVENTS[ev], open = evOpen(ev), live = RS.eventActive(ev), d = document.createElement('div');
      d.className = 'evcard' + (open ? '' : ' closed'); d.style.backgroundImage = 'url(img/bg_' + E.bg + '.webp)';
      var m = ['', 'ene', 'feb', 'mar', 'abr', 'may', 'jun', 'jul', 'ago', 'sep', 'oct', 'nov', 'dic'];
      var when = E.from[1] + ' ' + m[E.from[0]] + ' – ' + E.to[1] + ' ' + m[E.to[0]];
      d.innerHTML = '<h3><img src="img/ui/' + E.ico + '.webp" alt="">' + E.name + '</h3><div class="evd">' + (live ? '<b>¡En marcha!</b> · ' : open ? '<b>Modo pruebas</b> · ' : 'Próximamente · ') + when + ' · 10 niveles · gana 6 skins de Bolo</div>';
      var g = document.createElement('div'); g.className = 'evgrid';
      for (var n = 1; n <= RS.EVENT_LEVELS; n++) (function (n) {
        var lo = open && (n === 1 || S.unlockAll || !!S.stars[evKey(ev, n - 1)]), st = S.stars[evKey(ev, n)] || 0, b = document.createElement('button');
        b.className = 'lv' + (n === 10 ? ' boss' : '') + (lo ? '' : ' locked') + (EV_GIFT[n] != null && S.skins.indexOf(E.skins[EV_GIFT[n]]) < 0 ? ' gift' : '');
        var stars = ''; for (var i = 0; i < 3; i++) stars += '<img src="img/ui/star' + (i < st ? 1 : 0) + '.webp">';
        b.innerHTML = n + (lo ? '<div class="st">' + stars + '</div>' : '');
        b.onclick = function () { if (!open) return toast('Este evento abre el ' + when.split(' – ')[0]); if (!lo) return toast('Supera el nivel anterior'); RS.Audio.sfx('click'); startEvent(ev, n); };
        g.appendChild(b);
      })(n);
      d.appendChild(g);
      var sk = document.createElement('div'); sk.className = 'evskins';
      E.skins.forEach(function (k) { var c = document.createElement('canvas'); if (S.skins.indexOf(k) < 0) c.className = 'no'; c.title = RS.Extras.SKINS[k]; RS.skinPreview(c, k); sk.appendChild(c); });
      d.appendChild(sk); box.appendChild(d);
    });
  };
  function startEvent(ev, n, skipPrep, boost) {
    var E = RS.EVENTS[ev];
    if (!skipPrep) return RS.Extras.prep(E.name + ' · ' + n, function (b) { startEvent(ev, n, true, b); });
    startGame(RS.makeEventLevel(ev, n), { kind: 'event', ev: ev, n: n, boost: boost || {}, style: 'bandido', bg: E.bg, music: E.music, label: E.icon + ' ' + n });
  }

  // al elegir armadillo (o al tocarle el turno) se explica qué hace
  var lastTip = null;
  function armTip(force) {
    if (!game || game.ended) return;
    var q = game.queue[game.sel]; if (!q || q.used) return;
    if (!force && lastTip === game.sel + ':' + game.queue.filter(function (x) { return x.used; }).length) return;
    lastTip = game.sel + ':' + game.queue.filter(function (x) { return x.used; }).length;
    var A = RS.ARMS[q.arm], el = $('armtip');
    el.innerHTML = '<img src="img/ui/por' + q.arm + '.webp" alt=""><div><b></b><span></span></div>';
    el.querySelector('b').textContent = A.name + ' · ' + RS.RARE[A.rare];
    el.querySelector('span').textContent = A.desc;
    // justo debajo del retrato elegido
    var qb = $('queue').children[game.sel], st = $('stage').getBoundingClientRect();
    if (qb) { var r = qb.getBoundingClientRect(), cx = r.left + r.width / 2 - st.left; el.style.top = (r.bottom - st.top + 8) + 'px'; el.style.right = 'auto';
      var w = el.offsetWidth || 260; var left = Math.max(6, Math.min(st.width - w - 6, cx - w / 2)); el.style.left = left + 'px'; el.style.setProperty('--ax', (cx - left) + 'px'); }
    el.classList.add('show'); clearTimeout(armTip.t); armTip.t = setTimeout(function () { el.classList.remove('show'); }, 4200);
  }
  function drawQueue() {
    if (!game) return;
    if (game.state === 'aim') armTip(); else $('armtip').classList.remove('show');
    var q = $('queue'); q.innerHTML = '';
    game.queue.forEach(function (it, i) {
      var b = document.createElement('button'); b.className = 'q' + (i === game.sel ? ' sel' : '') + (it.used ? ' used' : '');
      b.innerHTML = '<img src="img/ui/por' + it.arm + '.webp"><div class="nm">' + RS.ARMS[it.arm].name + '</div>';
      b.onpointerdown = function (e) { e.stopPropagation(); game.selectArm(i); armTip(true); };
      q.appendChild(b);
    });
  }
  var lastScore = -1;
  function hudTick() {
    if (!game) return; RS.Extras.tutTick(game);
    var sc = game.phys.score; if (sc !== lastScore) { lastScore = sc; $('hud_score').textContent = sc.toLocaleString('es'); }
    $('hud_gems').textContent = game.phys.gemsLeft();
    var nr = game.phys.racs.length; $('hud_racp').style.display = nr ? '' : 'none'; if (nr) $('hud_racs').textContent = game.phys.racsLeft();
  }
  $('pausebtn').onclick = function () { if (!game || game.ended) return; game.paused = true; if (RS.Audio._amb) RS.Audio._amb.g.gain.value = 0; RS.Audio.sfx('click'); syncAudioBtns(); $('pause').classList.add('show'); };
  $('p_resume').onclick = function () { $('pause').classList.remove('show'); if (game) { game.paused = false; if (game.wx && game.wx.D.snd) RS.Audio.amb(game.wx.D.snd); } };
  $('p_retry').onclick = function () { $('pause').classList.remove('show'); retry(); };
  $('p_quit').onclick = function () { $('pause').classList.remove('show'); back(); };
  function syncAudioBtns() { $('p_mus').classList.toggle('off', S.vol.music === 0); $('p_snd').classList.toggle('off', S.vol.sfx === 0); }
  $('p_mus').onclick = function () { S.vol.music = S.vol.music ? 0 : 0.6; RS.Audio.setVol('music', S.vol.music); persist(); syncAudioBtns(); };
  $('p_next').onclick = function () { RS.Audio.init(); nextTrack(); };
  $('p_snd').onclick = function () { S.vol.sfx = S.vol.sfx ? 0 : 0.8; RS.Audio.setVol('sfx', S.vol.sfx); persist(); syncAudioBtns(); };
  function retry() { var c = ctxGame; if (c.defense || c.kind === 'camp') return startLevel(c.w, c.n); if (c.kind === 'event') return startEvent(c.ev, c.n, true, {}); if (c.kind === 'league') return startLeague(); startGame(c.kind === 'camp' ? RS.makeLevel(c.w, c.n) : c.kind === 'league' ? rivalLevel() : ownLevel(), c); }
  function back() { var k = ctxGame && ctxGame.kind; show(k === 'camp' ? 'levels' : k === 'event' ? 'events' : k === 'league' ? 'league' : 'build'); }

  function onEnd(r) {
    var c = ctxGame, txt = ''; $('hint').style.opacity = 0; $('armtip').classList.remove('show');
    RS.Audio.play(r.win ? 'RSM14_victoria' : 'RSM14_derrota');
    $('r_title').src = 'img/ui/' + (r.win ? 't_victoria' : 't_derrota') + '.webp';
    var st = ''; for (var i = 0; i < 3; i++) st += '<img src="img/ui/star' + (i < r.stars ? 1 : 0) + '.webp">';
    $('r_stars').innerHTML = r.win ? st : '';
    txt = 'Puntos <b>' + r.score.toLocaleString('es') + '</b>';
    var defTxt = '';
    if (c.defense) defTxt = txt = (r.win ? '¡Tu fortaleza resistió!' : 'Los mapaches se llevaron todas tus gemas') + '<br>💎 Gemas salvadas: ' + (r.gems - r.gemsGot) + '/' + r.gems + '<br>Puntos <b>' + r.score.toLocaleString('es') + '</b>';
    else if (r.racs) txt += '<br>🦝 Mapaches derribados: ' + r.ko + '/' + r.racs;
    if (r.gems) txt += ' · 💎 Gemas: ' + r.gemsGot + '/' + r.gems;
    if (r.bonus) txt += '<br>Bonus armadillos sin usar: +' + r.bonus.toLocaleString('es');
    txt += '<br>Destrucción: ' + Math.round(r.destr * 100) + '%';
    $('r_next').style.display = 'none';
    if (c.kind === 'camp') {
      var k = c.w + '-' + c.n;
      if (r.win) {
        var prev = S.stars[k] || 0, coins = 20 + (r.stars - prev > 0 ? (r.stars - prev) * 15 : 0) + (c.n === 20 ? 150 : 0);
        S.stars[k] = Math.max(prev, r.stars); S.coins += coins; txt += '<br>+' + coins + ' monedas';
        if ((S.best[k] || 0) < r.score) { S.best[k] = r.score; if (prev) txt += '<br>¡Nuevo récord!'; }
        if (c.n < 20 || c.w < RS.WORLDS.length) $('r_next').style.display = '';
        if (c.n === 20 && c.w < RS.WORLDS.length) txt += '<br>¡Mundo ' + (c.w + 1) + ' desbloqueado!';
      } else txt += '<br>Te quedaste sin armadillos. ¡Prueba otro orden o rompe una jaula para tener uno más!';
    } else if (c.kind === 'event') {
      var ek = evKey(c.ev, c.n), E = RS.EVENTS[c.ev];
      if (r.win) {
        var pv = S.stars[ek] || 0, ec = 40 + (r.stars - pv > 0 ? (r.stars - pv) * 20 : 0) + (c.n === 10 && !pv ? 300 : 0);
        S.stars[ek] = Math.max(pv, r.stars); S.coins += ec; txt += '<br>+' + ec + ' monedas';
        var gi = EV_GIFT[c.n]; if (gi != null && S.skins.indexOf(E.skins[gi]) < 0) { S.skins.push(E.skins[gi]); txt += '<br>✨ ¡Skin nueva para Bolo: <b>' + RS.Extras.SKINS[E.skins[gi]] + '</b>!'; }
        if (c.n < RS.EVENT_LEVELS) $('r_next').style.display = '';
      } else txt += '<br>¡Casi! Prueba otro orden de armadillos.';
    } else if (c.kind === 'league') {
      var d = r.win ? 25 + r.stars * 5 : -15;
      S.trophies = Math.max(0, S.trophies + d); txt += '<br>Trofeos ' + (d > 0 ? '+' : '') + d;
      if (r.win) { var loot = Math.round(c.level.loot * (0.5 + r.destr * 0.5)); S.coins += loot; txt += ' · Botín +' + loot + ' monedas'; }
      S.rivalSeed++; if (r.win) $('r_next').style.display = '';
    } else {
      txt += '<br>' + (r.win ? 'Tu fortaleza ha caído: refuérzala.' : '¡Tu fortaleza ha resistido!');
    }
    if (c.defense) txt = defTxt + (r.win ? '<br>¡Has defendido tu fortaleza! +' + (20 + r.stars * 15) + ' monedas' : '<br>Refuerza tu fortaleza en «Mi fortaleza» y vuelve a intentarlo.');
    persist(); RS.Extras.levelEnd(c, r);
    $('r_text').innerHTML = txt; $('result').classList.add('show');
  }
  $('r_retry').onclick = function () { $('result').classList.remove('show'); retry(); };
  $('r_back').onclick = function () { $('result').classList.remove('show'); back(); };
  $('r_next').onclick = function () {
    $('result').classList.remove('show'); var c = ctxGame;
    if (c.kind === 'camp') { var w = c.w, n = c.n + 1; if (n > 20) { w++; n = 1; } curWorld = w; startLevel(w, n); }
    else if (c.kind === 'event') startEvent(c.ev, c.n + 1);
    else if (c.kind === 'league') startLeague();
  };

  // ---------- liga ----------
  function rivalLevel() {
    var r = RS.makeRival(S.rivalSeed, S.trophies);
    r.sign = { x: Math.min.apply(null, r.pieces.map(function (p) { return RS.pieceAABB(p).x0; })) - 2.4, y: 0, name: r.name };
    return r;
  }
  function startLeague(skip, boost) {
    if (!skip) return RS.Extras.prep('Asedio de Liga', function (b) { startLeague(true, b); });
    var r = rivalLevel();
    if (0) r.sign = { x: Math.min.apply(null, r.pieces.map(function (p) { return RS.pieceAABB(p).x0; })) - 2.4, y: 0, name: r.name };
    startGame(r, { kind: 'league', boost: boost || {}, style: r.clan, bg: r.clan, music: ['RSM10', 'RSM15', 'RSM17', 'RSM18', 'RSM20'][S.rivalSeed % 5], label: r.name });
  }
  function miniDraw(canvas, lvl, style) {
    var c = canvas.getContext('2d'), W = canvas.width = 400, H = canvas.height = 200;
    var x0 = Infinity, x1 = -Infinity, y1 = 1;
    lvl.pieces.forEach(function (p) { var a = RS.pieceAABB(p); x0 = Math.min(x0, a.x0); x1 = Math.max(x1, a.x1); y1 = Math.max(y1, a.y1); });
    if (!isFinite(x0)) { x0 = 0; x1 = 10; }
    var s = Math.min((W - 20) / (x1 - x0 + 1), (H - 20) / (y1 + 0.5)), ox = (W - (x1 - x0) * s) / 2 - x0 * s;
    lvl.pieces.forEach(function (p) { RS.drawBlock(c, style, p, false, ox + p.x * s, H - 8 - p.y * s, -RS.rotAng(p), s, null, p.tint); });
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
    var xs = pieces.map(function (p) { return RS.pieceAABB(p).x1; }), endX = xs.length ? Math.max.apply(null, xs) : OFF + 10;
    var three = Math.round((endX - OFF) * 120 + gems.length * 1000);
    return { pieces: pieces, gems: gems, arms: [0, 1, 3, 2, 4], end: endX, stars: [1, three * 0.55, three * 0.85], deco: (L.deco || []).map(function (d) { return Object.assign({}, d, { x: d.x + OFF }); }), sign: { x: OFF - 2.1, y: 0, name: S.name } };
  }
  var TOOLS = [['place', '🧱', 'Poner'], ['tpl', '🏠', 'Plantillas'], ['move', '✋', 'Mover'], ['pick', '📋', 'Copiar'], ['erase', '🗑', 'Quitar'], ['weld', '🔩', 'Soldar'], ['swap', '♻', 'Cambiar material'], ['paint', '🎨', 'Pintar'], ['gem', '💎', 'Gema'], ['deco', '🏮', 'Adorno'], ['pan', '👁', 'Mover la vista']];
  var ROTN = ['normal', 'vertical', 'diagonal ↗', 'diagonal ↘'];
  var CATS = [['est', 'Estructura'], ['ref', 'Refuerzos'], ['trap', 'Trampas']];
  function pieceIcon(p, bw, bh) {
    var c = document.createElement('canvas'); c.width = bw; c.height = bh; var x = c.getContext('2d'), sh = RS.SHAPES[p.s];
    var z = RS.pieceSize(p), s = Math.min((bw - 8) / z.w, (bh - 6) / z.h); RS.drawBlock(x, S.clan, p, false, bw / 2, bh / 2, -RS.rotAng(p), s);
    return c;
  }
  function tplIcon(T, mat) {
    var c = document.createElement('canvas'); c.width = 90; c.height = 60; var x = c.getContext('2d'), s = Math.min(84 / T.w, 54 / T.h);
    T.ps.forEach(function (d) { var si = RS.SHAPE_IDX[d[0]], sh = RS.SHAPES[si], p = { s: si, m: sh.mat != null ? sh.mat : (d[1] != null ? d[1] : mat), rot: d[4] || 0, flip: !!d[5] };
      RS.drawBlock(x, S.clan, p, false, 45 - T.w * s / 2 + d[2] * s, 57 - d[3] * s, -RS.rotAng(p), s); });
    return c;
  }
  function tb(txt, sel, fn, cls) { var b = document.createElement('button'); b.className = 'tb' + (sel ? ' sel' : '') + (cls ? ' ' + cls : ''); if (typeof txt === 'string') b.textContent = txt; else b.appendChild(txt); b.onclick = function (e) { e.stopPropagation(); RS.Audio.sfx('click', 0.35); fn(); }; return b; }
  function sep() { return Object.assign(document.createElement('div'), { className: 'sep' }); }
  function matButtons(pal, B) {
    RS.MATS.forEach(function (m, i) {
      var open = matOpen(i);
      pal.appendChild(tb(m.name.replace(' reforzado', '') + ' ' + m.cost, B.mat === i, function () { if (!open) return toast('Se desbloquea en el mundo ' + m.lvl); B.mat = i; buildUI(); }, 'mat' + (open ? '' : ' lock')));
    });
  }
  function buildUI() {
    var B = builder; if (!B) return;
    var tl = $('b_tools'), pal = $('b_pal'); tl.innerHTML = ''; pal.innerHTML = '';
    TOOLS.forEach(function (t) { var b = tb(t[1], B.tool === t[0], function () { B.setTool(t[0]); buildUI(); }, 'ico'); b.title = t[2]; tl.appendChild(b); });
    tl.appendChild(sep());
    function ib(ico, title, sel, fn) { var b = tb(ico, sel, fn, 'ico'); b.title = title; tl.appendChild(b); }
    ib('↶', 'Deshacer', false, function () { B.undo(); updB(); });
    ib('⟳', 'Girar: normal → vertical → diagonales', false, function () { B.rot = (B.rot + 1) % 4; if (B.carry) { var cs = RS.SHAPES[B.carry.s]; if (!cs.sprite && cs.kind !== 'circle') B.carry.rot = ((B.carry.rot || 0) + 1) % (cs.kind === 'box' ? 4 : 2); } toast('Giro: ' + ROTN[B.rot]); buildUI(); });
    ib('⇋', 'Voltear', B.flip, function () { B.flip = !B.flip; if (B.carry) B.carry.flip = !B.carry.flip; buildUI(); });
    ib('−', 'Alejar', false, function () { B.zoom(1 / 1.3); });
    ib('+', 'Acercar', false, function () { B.zoom(1.3); });
    ib('📐', 'Modo plano (pantalla azul)', B.blue, function () { B.blue = !B.blue; S.blueprint = B.blue; persist(); buildUI(); });
    ib('✏', 'Nombre de la fortaleza', false, function () { ask('Nombre de tu fortaleza', function (v) { v = (v || '').trim(); if (v) { S.name = v.slice(0, 20); persist(); if (B.L.sign) B.L.sign.name = S.name; toast('Nombre: ' + S.name); } }, S.name); });
    ib('✖', 'Vaciar todo', false, function () { ask('¿Borrar toda la fortaleza?', function () { B.snap(); B.L.pieces = []; B.L.gems = []; B.L.deco = []; B.L.sign = null; B.changed(); }); });
    var info = '';
    if (B.tool === 'place') {
      CATS.forEach(function (c) { pal.appendChild(tb(c[1], B.cat === c[0], function () { B.cat = c[0]; var first = RS.SHAPES.findIndex(function (sh) { return (sh.cat || 'est') === c[0]; }); if ((RS.SHAPES[B.shape].cat || 'est') !== c[0]) B.shape = first; buildUI(); }, 'cat')); });
      pal.appendChild(sep());
      RS.SHAPES.forEach(function (sh, i) {
        if ((sh.cat || 'est') !== B.cat) return;
        var p = { s: i, m: sh.mat != null ? sh.mat : B.mat, rot: sh.sprite || sh.kind === 'circle' ? 0 : B.rot, flip: B.flip };
        var b = tb(pieceIcon(p, 72, 48), B.shape === i, function () { B.shape = i; buildUI(); });
        b.title = sh.name; pal.appendChild(b);
      });
      var cur = RS.SHAPES[B.shape];
      if (B.cat === 'est') { pal.appendChild(sep()); matButtons(pal, B); }
      info = cur.name + (cur.desc ? ': ' + cur.desc : '') + ' · Coste ' + RS.pieceCost(B.curPiece()) + (cur.trap ? ' · Trampas ' + B.trapCount() + '/' + RS.MAX_TRAPS : '');
    } else if (B.tool === 'tpl') {
      RS.TEMPLATES.forEach(function (T, i) { var b = tb(tplIcon(T, B.mat), B.tpl === i, function () { B.tpl = i; buildUI(); }); b.title = T.name; pal.appendChild(b); });
      pal.appendChild(sep()); matButtons(pal, B);
      info = RS.TEMPLATES[B.tpl].name + ': toca donde quieras y se apoya sola encima de lo que haya. Apila pisos para subir alto.';
    } else if (B.tool === 'swap') { matButtons(pal, B); info = 'Toca una pieza para cambiarle el material.'; }
    else if (B.tool === 'paint') {
      RS.PAINTS.forEach(function (p, i) { var sw = document.createElement('span'); sw.className = 'sw'; sw.style.background = p ? p.replace(/[\d.]+\)$/, '1)') : 'repeating-linear-gradient(45deg,#fff 0 4px,#bbb 4px 8px)'; pal.appendChild(tb(sw, B.paint === i, function () { B.paint = i; buildUI(); })); });
      info = 'Toca piezas para pintarlas (la última muestra quita la pintura).';
    } else if (B.tool === 'deco') {
      var dsh = 'deco_' + S.clan, n = RS.atlas[dsh].length;
      for (var k = 0; k < n; k++) (function (k) {
        if (k === RS.CLANS[S.clan].sign) return;
        var c = document.createElement('canvas'); c.width = 60; c.height = 60; var a = RS.spAspect(dsh, k);
        RS.drawSp(c.getContext('2d'), dsh, k, 30, 30, a > 1 ? 56 : 56 * a, a > 1 ? 56 / a : 56);
        pal.appendChild(tb(c, B.decoIdx === k, function () { B.decoIdx = k; buildUI(); }));
      })(k);
    } else info = { move: 'Toca una pieza para cogerla y luego toca dónde dejarla. Girar y Voltear también funcionan mientras la llevas.', pick: 'Toca una pieza para copiar su forma y material.', erase: 'Toca una pieza, gema, adorno o el cartel para quitarlo.', weld: 'Toca una pieza para soldarla a las que toca (+1 punto). Las soldaduras aguantan, pero un golpe fuerte las rompe.', gem: 'Pon hasta 3 gemas: el rival gana si las tira todas. Escóndelas bien.', sign: 'Toca donde quieras colgar el cartel con el nombre.', pan: 'Arrastra para mover la vista. Con dos dedos también puedes mover y hacer zoom en cualquier herramienta.' }[B.tool] || '';
    var tn = TOOLS.find(function (t) { return t[0] === B.tool; });
    $('b_info').textContent = (tn ? tn[1] + ' ' + tn[2] + ' · ' : '') + info; buildUI.last = B.tool;
    setTimeout(function () { if (builder) builder.resize(); }, 0);
    updB();
  }
  function updB() {
    if (!builder) return;
    $('b_budget').textContent = builder.cost() + '/' + builder.budget;
    $('b_state').textContent = builder.stable ? '✔ Estable' : '⚠ Sin probar';
    $('b_state').style.color = builder.stable ? '#7f7' : '#fd6';
  }
  SCREENS.build = function () {
    RS.Audio.play(RS.CLANS[S.clan].music);
    RS.loadBg(S.clan).then(function () {
      if (cur !== 'build') return;
      if (builder) builder.destroy();
      builder = new RS.Builder(cv, { clan: S.clan, layout: S.layout, stable: S.stable, name: S.name, getName: function () { return S.name; }, budget: RS.buildBudget(S, maxWorld()), onChange: function () { if (builder && builder.tool !== buildUI.last) buildUI(); else updB(); } });
      builder.blue = !!S.blueprint;
      buildUI();
    });
  };
  $('b_back').onclick = function () {
    if (builder && JSON.stringify(builder.L) !== JSON.stringify(S.layout || { pieces: [], gems: [], deco: [], sign: null })) return ask('¿Salir sin guardar los cambios?', function () { show('home'); });
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
    startGame(ownLevel(), { kind: 'own', style: S.clan, bg: S.clan, music: 'RSM15', label: S.name });
  };

  // ---------- armadillos ----------
  SCREENS.arms = function () {
    var g = $('armgrid'); g.innerHTML = '';
    RS.ARMS.forEach(function (a, i) {
      var open = armOpen(i), d = document.createElement('div'); d.className = 'arm' + (open ? '' : ' locked');
      var c = document.createElement('canvas'); c.width = 160; c.height = 160;
      var aspr = RS.armSprite(i, 0), sh = aspr[0], idx = aspr[1]; var asp = RS.spAspect(sh, idx); RS.drawSp(c.getContext('2d'), sh, idx, 80, 80, asp > 1 ? 150 : 150 * asp, asp > 1 ? 150 / asp : 150);
      d.appendChild(c);
      d.insertAdjacentHTML('beforeend', '<b>' + a.name + '</b><span class="rr r' + a.rare + '">' + RS.RARE[a.rare] + '</span><span class="d">' + (open ? a.desc : (a.rare === 3 ? (i >= 12 ? 'Vence al Rey Mapache (12-20)' : 'Vence al jefe del mundo 6') : 'Se desbloquea en el mundo ' + a.world)) + '</span>');
      if (open) {
        var I = RS.Extras.armInfo(i);
        d.insertAdjacentHTML('beforeend', '<span class="lvl">Nv ' + I.lv + (I.max ? ' · MÁX' : ' · 🃏 ' + I.have + '/' + I.need) + '</span>');
        if (!I.max) { var ub = document.createElement('button'); ub.className = 'btn sm ' + (I.can ? 'green' : 'blue'); ub.innerHTML = 'Mejorar <img src="img/ui/coin.webp">' + I.cost; ub.onclick = function () { RS.Extras.upgrade(i); SCREENS.arms(); }; d.appendChild(ub); }
        if (i === 0) {
          var sk = document.createElement('div'); sk.className = 'skins';
          [-1].concat(S.skins.slice().sort()).forEach(function (k) { var b = document.createElement('button'); b.className = 'tb' + (S.skin === k ? ' sel' : ''); if (k < 0) b.textContent = 'Normal'; else { var pc = document.createElement('canvas'); RS.skinPreview(pc, k); b.appendChild(pc); b.appendChild(document.createTextNode(RS.Extras.SKINS[k])); } b.onclick = function () { S.skin = k; persist(); RS.Audio.sfx('click'); SCREENS.arms(); }; sk.appendChild(b); });
          d.appendChild(sk);
        }
      }
      g.appendChild(d);
    });
  };

  SCREENS.shop = function () { RS.Extras.shop(); };
  SCREENS.missions = function () { RS.Extras.missions(); };
  SCREENS.achievements = function () { RS.Extras.achievements(); };
  // ---------- ajustes ----------
  // tocadiscos: escuchar y elegir cualquier canción
  var TRACKS = [['RSM01', 'Tema principal'], ['RSM02', 'Taller'], ['RSM03', 'Bosque del Saqueo (DnB)'], ['RSM04', 'Dunas (8 bits)'], ['RSM05', 'Cumbres Heladas (DnB)'], ['RSM06', 'Volcán (DnB)'], ['RSM07', 'Puerto (8 bits)'], ['RSM08', 'Rapiñópolis (DnB)'], ['RSM09', 'Jefe (DnB)'], ['RSM10', 'Liga (DnB)'], ['RSM11', 'Sol Naciente'], ['RSM12', 'La Frontera'], ['RSM13', 'Sol de Jade'], ['RSM15', 'Cannon Rush (DnB)'], ['RSM16', 'Armadillo Roll (DnB)'], ['RSM17', 'Gem Hunter (DnB)'], ['RSM18', 'Powder Keg (DnB)'], ['RSM19', 'Rolling Thunder (DnB)'], ['RSM20', 'Bandit Breakbeat (DnB)']];
  RS.TRACKS = TRACKS;
  function playTrack(code) { var st = S.musicStyle; S.musicStyle = 'mezcla'; RS.Audio.play(code); S.musicStyle = st; }
  function nextTrack() { var i = TRACKS.findIndex(function (t) { return t[0] === RS.Audio.cur; }); var t = TRACKS[(i + 1) % TRACKS.length]; playTrack(t[0]); toast('♪ ' + t[1]); }
  RS.nextTrack = nextTrack;
  SCREENS.settings = function () {
    var jb = $('s_jb'); jb.innerHTML = '';
    TRACKS.forEach(function (t) { var b = document.createElement('button'); b.className = 'tb' + (RS.Audio.cur === t[0] ? ' sel' : ''); b.textContent = '▶ ' + t[1]; b.onclick = function () { RS.Audio.init(); playTrack(t[0]); SCREENS.settings(); }; jb.appendChild(b); });
    $('s_mus').value = S.vol.music; $('s_sfx').value = S.vol.sfx; $('s_style').value = S.musicStyle; $('s_can').value = S.cannon; $('s_fx').value = S.fx === false ? '0' : '1'; $('s_vib').value = S.vib === false ? '0' : '1';
    var sc = $('s_clan'); sc.innerHTML = ''; Object.keys(RS.CLANS).forEach(function (k) { var o = document.createElement('option'); o.value = k; o.textContent = RS.CLANS[k].short; sc.appendChild(o); }); sc.value = S.clan;
    $('s_unlock').textContent = S.unlockAll ? 'Bloquear de nuevo' : 'Desbloquear todo (pruebas)';
  };
  $('s_mus').oninput = function () { S.vol.music = +this.value; RS.Audio.setVol('music', S.vol.music); persist(); };
  $('s_sfx').oninput = function () { S.vol.sfx = +this.value; RS.Audio.setVol('sfx', S.vol.sfx); persist(); };
  $('s_sfx').onchange = function () { RS.Audio.sfx('gem'); };
  $('s_style').onchange = function () { S.musicStyle = this.value; persist(); var c = RS.Audio.cur; RS.Audio.cur = null; RS.Audio.play('RSM01'); };
  $('s_clan').onchange = function () { S.clan = this.value; persist(); toast('Clan: ' + RS.CLANS[S.clan].short); };
  $('s_vib').onchange = function () { S.vib = this.value === '1'; persist(); RS.vib(80); };
  $('s_fx').onchange = function () { S.fx = this.value === '1'; persist(); };
  $('s_can').onchange = function () { S.cannon = +this.value; persist(); };
  $('s_unlock').onclick = function () { S.unlockAll = !S.unlockAll; persist(); SCREENS.settings(); toast(S.unlockAll ? 'Todo desbloqueado' : 'Bloqueado'); };
  $('s_reset').onclick = function () { ask('¿Borrar toda la partida?', function () { try { localStorage.removeItem(KEY); } catch (e) {} location.reload(); }); };

  // botón atrás de Android
  document.addEventListener('backbutton', function () {
    if ($('result').classList.contains('show')) return $('r_back').click();
    if (cur === 'hud') return $('pausebtn').click();
    if (cur === 'build') return $('b_back').click();
    if (cur === 'levels') return show('map');
    if (cur !== 'home' && cur !== 'title') show('home');
  });
  try { var CapApp = window.Capacitor && window.Capacitor.Plugins && window.Capacitor.Plugins.App; if (CapApp) CapApp.addListener('backButton', function () { if (cur === 'home' || cur === 'title') CapApp.exitApp(); else document.dispatchEvent(new Event('backbutton')); }); } catch (e) {}
  try { if (window.Capacitor) { window.addEventListener('popstate', function () { history.pushState(null, ''); document.dispatchEvent(new Event('backbutton')); }); history.pushState(null, ''); } } catch (e) {}
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
  RS._dbg = { show: show, startLevel: startLevel, startEvent: startEvent, get game() { return game; }, get builder() { return builder; } };
})(RS);
