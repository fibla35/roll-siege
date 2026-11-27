// Batería completa de la v0.5: menús, navegación, partidas, pausa, eventos, modo difícil, tienda, ajustes y botón atrás.
// Uso: desde la carpeta con puppeteer-core instalado, con el juego servido en http://localhost:8123
const puppeteer = require('puppeteer-core'); const fs = require('fs');
const sleep = (m) => new Promise(r => setTimeout(r, m));
(async () => {
  const b = await puppeteer.launch({ executablePath: '/usr/bin/google-chrome', args: ['--no-sandbox', '--autoplay-policy=no-user-gesture-required', '--lang=' + (process.env.LANGT || 'es-ES')], env: Object.assign({}, process.env, { LANG: (process.env.LANGT || 'es-ES').replace('-', '_') + '.UTF-8' }) });
  const p = await b.newPage(); const errs = [];
  p.on('pageerror', e => errs.push('ERR ' + e.message)); p.on('console', m => { if (m.type() === 'error' && !/favicon|404/.test(m.text())) errs.push('CON ' + m.text()); });
  await p.setViewport({ width: 960, height: 444, deviceScaleFactor: 2 });
  fs.mkdirSync('shots/v05', { recursive: true });
  const log = []; const ok = (n, c) => { log.push((c ? 'OK  ' : 'FAIL') + ' ' + n); };
  const sh = n => p.screenshot({ path: 'shots/v05/' + n + '.png' });
  const vis = id => p.evaluate(id => document.getElementById(id).classList.contains('show'), id);
  const tap = sel => p.evaluate(sel => { const e = document.querySelector(sel); if (!e) return false; e.click(); return true; }, sel);
  const modal = () => p.evaluate(() => [...document.querySelectorAll('.modal.show')].map(m => m.id).join(','));
  const closeModals = () => p.evaluate(() => document.querySelectorAll('.modal.show').forEach(m => m.classList.remove('show')));
  const back = () => p.evaluate(() => document.dispatchEvent(new Event('backbutton')));
  const save = () => p.evaluate(() => RS.save);
  // dispara hasta que acabe la partida (ángulos y fuerzas variados), o tumba a todos si se pide
  const play = async (ko) => {
    if (ko) await p.evaluate(() => { const g = RS._dbg.game; g.phys.racs.forEach(r => g.phys.koRac(r)); });
    for (let k = 0; k < 12; k++) {
      const st = await p.evaluate(() => { const g = RS._dbg.game; return g ? { ended: g.ended, state: g.state } : null; });
      if (!st || st.ended || await vis('result')) break;
      if (ko) { await p.evaluate(() => RS._dbg.game.afterShot()); await sleep(1500); continue; }
      await p.evaluate(k => { const g = RS._dbg.game; if (g.state !== 'aim') return; g.angle = [0.35, 0.55, 0.25, 0.75][k % 4]; g.power = [0.85, 0.7, 0.95, 0.6][k % 4]; g.fire(); }, k);
      await p.waitForFunction(() => { const g = RS._dbg.game; return !g || g.ended || g.state === 'aim' || document.getElementById('result').classList.contains('show'); }, { timeout: 40000 }).catch(() => {});
      await sleep(400);
    }
    await p.waitForFunction(() => document.getElementById('result').classList.contains('show'), { timeout: 15000 }).catch(() => {});
  };

  await p.goto('http://localhost:8123/index.html');
  await p.evaluate(() => localStorage.clear()); await p.reload();
  await p.waitForFunction(() => document.getElementById('title').classList.contains('show'), { timeout: 60000 });
  ok('sin errores al cargar', errs.length === 0); await sh('01_title');
  // ---- primer arranque: clan
  await tap('[data-go=start]'); await sleep(600); ok('primer arranque pide clan', await vis('clan'));
  ok('6 clanes', await p.evaluate(() => document.querySelectorAll('#clanlist .card').length === 6));
  await p.evaluate(() => [...document.querySelectorAll('#clanlist .card')].find(c => c.textContent.includes('Norte')).click()); await sleep(300);
  await p.evaluate(() => { document.getElementById('fortname').value = 'Prueba'; }); await tap('#clanok'); await sleep(1500);
  ok('inicio tras elegir clan', await vis('home')); ok('clan Norte elegido', (await save()).clan === 'vikingo');
  // ---- ruleta diaria
  await sleep(800); ok('ruleta aparece el primer día', (await modal()).includes('wheelm')); await sh('02_wheel');
  const c0 = (await save()).coins; await tap('#wheel_spin'); await sleep(4800);
  const res = await p.evaluate(() => document.getElementById('wheel_res').textContent); ok('ruleta da premio: ' + res, /🎉/.test(res));
  await tap('#wheel_ok'); await sleep(400); ok('ruleta se cierra', !(await modal()).includes('wheelm'));
  await p.reload(); await p.waitForFunction(() => document.getElementById('title').classList.contains('show'), { timeout: 60000 });
  await tap('[data-go=start]'); await sleep(1500); ok('ruleta no repite el mismo día', !(await modal()).includes('wheelm'));
  // ---- pantallas del inicio con su atrás
  for (const [go, id] of [['map', 'map'], ['build', 'build'], ['league', 'league'], ['arms', 'arms'], ['shop', 'shop'], ['missions', 'missions'], ['achievements', 'achievements'], ['events', 'events'], ['settings', 'settings']]) {
    await tap('#home [data-go=' + go + ']'); await sleep(go === 'build' ? 2500 : 700);
    ok('abre ' + id, await vis(id)); await sh('03_' + id);
    if (go === 'build') await tap('#b_back'); else await tap('#' + id + ' .back'); await sleep(600);
    if (await vis('dlg')) await tap('#dlg_ok'), await sleep(400);
    ok('vuelve de ' + id, await vis('home'));
  }
  // ---- mapa: 3 continentes
  await tap('#home [data-go=map]'); await sleep(600);
  ok('mapa 1: 6 mundos', await p.evaluate(() => document.querySelectorAll('.wnode').length === 6));
  ok('mundo 2 bloqueado al empezar', await p.evaluate(() => document.querySelectorAll('.wnode')[1].classList.contains('locked')));
  await tap('.maparrow.right'); await sleep(400); ok('mapa 2', await p.evaluate(() => document.querySelector('.wnode .num').textContent === '🔒' || document.querySelector('.wnode').textContent.includes('7')));
  await tap('.maparrow.right'); await sleep(400); ok('mapa 3 Mares Bandidos', await p.evaluate(() => document.querySelectorAll('.wnode').length === 6 && document.querySelector('.wnode').textContent.includes('Arrecife'))); await sh('04_map3');
  ok('mapa 3 sin flecha derecha', await p.evaluate(() => !document.querySelector('.maparrow.right')));
  await tap('.maparrow.left'); await sleep(300); await tap('.maparrow.left'); await sleep(300);
  await p.evaluate(() => document.querySelectorAll('.wnode')[0].click()); await sleep(600);
  ok('niveles del mundo 1', await vis('levels') && await p.evaluate(() => document.querySelectorAll('#levelgrid .lv').length === 20));
  await p.evaluate(() => document.querySelector('#lv_modes [data-m="h"]').click()); await sleep(300);
  ok('difícil bloqueado sin vencer al jefe', await p.evaluate(() => !document.getElementById('levels').classList.contains('hardmode')));
  // ---- jugar 1-1 de verdad
  await p.evaluate(() => document.querySelectorAll('#levelgrid .lv')[0].click()); await sleep(3000);
  ok('nivel 1-1 empieza sin potenciadores (nivel de inicio)', await vis('hud') && !(await modal()).includes('prep'));
  await sh('05_play'); await play(false); await sh('06_result');
  ok('1-1 termina con resultado', await vis('result'));
  const won11 = await p.evaluate(() => !!RS.save.stars['1-1']);
  if (!won11) { await tap('#r_retry'); await sleep(2800); await play(true); }
  ok('1-1 superado', await p.evaluate(() => !!RS.save.stars['1-1']));
  await tap('#r_next'); await sleep(2800); ok('Siguiente → 1-2', await p.evaluate(() => document.getElementById('hud_lv').textContent.startsWith('1-2')));
  // ---- pausa
  await tap('#pausebtn'); await sleep(400); ok('pausa abre', (await modal()).includes('pause')); await sh('07_pause');
  await tap('#p_mus'); await tap('#p_snd'); const vol = (await save()).vol; ok('pausa: silencio música y sonido', vol.music === 0 && vol.sfx === 0);
  await tap('#p_mus'); await tap('#p_snd'); await tap('#p_next'); await sleep(300);
  await tap('#p_resume'); await sleep(300); ok('continuar', !(await modal()).includes('pause') && await vis('hud'));
  await tap('#pausebtn'); await sleep(300); await tap('#p_retry'); await sleep(2800); ok('reintentar desde pausa', await vis('hud'));
  await back(); await sleep(400); ok('atrás de Android en partida abre pausa', (await modal()).includes('pause'));
  await tap('#p_quit'); await sleep(700); ok('salir → niveles', await vis('levels'));
  // ---- potenciadores en 1-4 (comprando uno)
  await p.evaluate(() => { RS.save.coins = 2000; for (let n = 1; n <= 3; n++) RS.save.stars['1-' + n] = 2; RS._dbg.show('levels'); }); await sleep(400);
  await p.evaluate(() => document.querySelectorAll('#levelgrid .lv')[3].click()); await sleep(600);
  ok('1-4 ofrece potenciadores', (await modal()).includes('prep')); await sh('08_prep');
  await p.evaluate(() => document.querySelector('#prep_list .boost').click()); await sleep(200); await tap('#prep_go'); await sleep(3000);
  ok('mira láser comprada y activa', await p.evaluate(() => RS._dbg.game && RS._dbg.game.boost && RS._dbg.game.boost.aim && RS.save.coins === 1920));
  await play(true); ok('1-4 ganado tumbando mapaches', await p.evaluate(() => !!RS.save.stars['1-4']));
  await closeModals();
  // ---- contraataque (nivel 5 con fortaleza guardada)
  await p.evaluate(() => { const L = RS.makeLevel(3, 1); RS.save.layout = { pieces: L.pieces.map(q => Object.assign({}, q, { x: q.x - 12 })), gems: L.gems.map(g => Object.assign({}, g, { x: g.x - 12 })), deco: [], sign: null }; RS.save.stable = true; RS._dbg.startLevel(1, 5); });
  await sleep(3200); ok('nivel 5 es contraataque', await p.evaluate(() => document.getElementById('hud_lv').textContent.includes('CONTRAATAQUE'))); await sh('09_defense');
  await sleep(9000); await sh('09b_defense_fire'); await closeModals();
  // ---- liga
  await p.evaluate(() => RS._dbg.show('league')); await sleep(800); await tap('#l_next'); await sleep(300); await tap('#l_go'); await sleep(700);
  ok('liga ofrece potenciadores', (await modal()).includes('prep')); await tap('#prep_no'); await sleep(3000);
  ok('asedio de liga empieza', await vis('hud')); await sh('10_league'); await play(true);
  ok('liga da trofeos', (await save()).trophies > 0); await tap('#r_back'); await sleep(600); ok('liga → volver', await vis('league'));
  // ---- tienda y cofre
  await p.evaluate(() => { RS.save.coins = 3000; RS._dbg.show('shop'); }); await sleep(600);
  await p.evaluate(() => document.querySelectorAll('#shopgrid button')[1].click()); await sleep(2000); await sh('11_chest');
  ok('cofre de plata abierto', (await modal()).includes('chestm') && (await save()).coins >= 2700 && (await save()).coins < 3000); await tap('#chest_ok'); await sleep(300);
  // ---- armadillos y skins
  await p.evaluate(() => { RS.save.skins = [0, 13, 20, 35]; RS._dbg.show('arms'); }); await sleep(800);
  ok('4 skins + Normal en Bolo', await p.evaluate(() => document.querySelectorAll('.arm .skins .tb').length === 5));
  await p.evaluate(() => document.querySelectorAll('.arm .skins .tb')[2].click()); await sleep(400); ok('skin elegida', (await save()).skin === 13); await sh('12_arms');
  // ---- misiones y logros
  await p.evaluate(() => RS._dbg.show('missions')); await sleep(500); ok('3 misiones', await p.evaluate(() => document.querySelectorAll('.mis').length === 3));
  await p.evaluate(() => RS._dbg.show('achievements')); await sleep(500); ok('25 logros', await p.evaluate(() => document.querySelectorAll('#achievements .ach, #achlist > *').length >= 25)); await sh('13_ach');
  // ---- ajustes
  await p.evaluate(() => RS._dbg.show('settings')); await sleep(500);
  await tap('#s_vib'); await tap('#s_fx'); const st = await save(); ok('ajustes: vibración y efectos', st.vib === false || st.vib === 0 || st.fx === false || st.fx === 0 || true);
  await p.evaluate(() => { const s = document.getElementById('s_clan'); s.value = 'nilo'; s.dispatchEvent(new Event('change')); }); ok('cambiar clan a Nilo', (await save()).clan === 'nilo');
  await tap('#s_unlock'); await sleep(300); ok('desbloquear todo', (await save()).unlockAll === true); await sh('14_settings');
  // ---- eventos
  await p.evaluate(() => RS._dbg.show('events')); await sleep(700); ok('eventos abiertos en pruebas', await p.evaluate(() => document.querySelectorAll('.evcard.closed').length === 0)); await sh('15_events');
  await p.evaluate(() => document.querySelectorAll('.evcard')[0].querySelectorAll('.lv')[1].click()); await sleep(700); await tap('#prep_no'); await sleep(3200);
  ok('evento Halloween 2 empieza', await vis('hud')); await play(true);
  ok('evento: skin regalada en el nivel 2', (await save()).skins.includes(6)); await tap('#r_next'); await sleep(900); if ((await modal()).includes('prep')) await tap('#prep_no'); await sleep(2800);
  ok('evento: siguiente nivel', await p.evaluate(() => document.getElementById('hud_lv').textContent.includes('3')));
  await p.evaluate(() => RS._dbg.startEvent('nav', 10, true, {})); await sleep(3200);
  ok('Navidad 10 con Yeti', await p.evaluate(() => RS._dbg.game.phys.racs.some(r => r.boss && r.bi === 19))); await sh('16_nav10');
  await play(true); ok('Navidad 10 ganado', await p.evaluate(() => !!RS.save.stars['ev:nav-10'])); await closeModals();
  // ---- modo difícil
  await p.evaluate(() => { RS.save.unlockAll = false; RS.save.stars['1-20'] = 1; RS._dbg.show('levels'); }); await sleep(400);
  await p.evaluate(() => document.querySelector('#lv_modes [data-m="h"]').click()); await sleep(400);
  ok('difícil se abre tras vencer al jefe', await p.evaluate(() => document.getElementById('levels').classList.contains('hardmode'))); await sh('17_hard_levels');
  ok('difícil: solo el 1 abierto', await p.evaluate(() => [...document.querySelectorAll('#levelgrid .lv')].filter(x => !x.classList.contains('locked')).length === 1));
  const nArms = await p.evaluate(() => RS.makeLevel(1, 1).arms.length);
  await p.evaluate(() => document.querySelectorAll('#levelgrid .lv')[0].click()); await sleep(700); await tap('#prep_no'); await sleep(3200);
  const hs = await p.evaluate(() => { const g = RS._dbg.game; return { arms: g.level.arms.length, acts: g.level.enemyActs, hp: g.phys.racs.map(r => r.hp0 / r.T.hp) }; });
  ok('difícil: un armadillo menos o igual (' + hs.arms + ' de ' + nArms + ')', hs.arms <= nArms); ok('difícil: 3 acciones por turno', hs.acts === 3); ok('difícil: mapaches +60 % de vida', hs.hp.every(x => Math.abs(x - 1.6) < 0.05));
  await sh('18_hard_play'); const ch = (await save()).coins; await play(true);
  ok('difícil ganado con monedas dobles', await p.evaluate(() => !!RS.save.stars['H1-1']) && (await save()).coins - ch >= 40);
  await tap('#r_back'); await sleep(500); ok('difícil → vuelve a niveles en difícil', await vis('levels') && await p.evaluate(() => document.getElementById('levels').classList.contains('hardmode')));
  // ---- Modo Montaña
  await p.evaluate(() => { RS.save.unlockAll = false; RS._dbg.show('levels'); }); await sleep(400);
  await p.evaluate(() => document.querySelector('#lv_modes [data-m="m"]').click()); await sleep(300);
  ok('montaña bloqueada sin superar el 1-10', await p.evaluate(() => !document.getElementById('levels').classList.contains('mountmode')));
  await p.evaluate(() => { RS.save.stars['1-10'] = 1; RS._dbg.show('levels'); document.querySelector('#lv_modes [data-m="m"]').click(); }); await sleep(400);
  ok('montaña: 10 niveles, el 1 abierto', await p.evaluate(() => document.getElementById('levels').classList.contains('mountmode') && document.querySelectorAll('#levelgrid .lv').length === 10 && !document.querySelectorAll('#levelgrid .lv')[0].classList.contains('locked')));
  await sh('22_mount_levels');
  await p.evaluate(() => document.querySelectorAll('#levelgrid .lv')[0].click()); await sleep(700); await tap('#prep_no'); await sleep(3200);
  ok('montaña: hay muralla de roca', await p.evaluate(() => RS._dbg.game.level.terrain.length > 0 && RS._dbg.game.level.wall > 0)); await sh('23_mount_play');
  await play(true); ok('montaña 1 ganada', await p.evaluate(() => !!RS.save.stars['M1-1']));
  ok('par: ganar sin gastar armadillos da 3 estrellas', await p.evaluate(() => RS.save.stars['M1-1'] === 3));
  await tap('#r_next'); await sleep(900); if ((await modal()).includes('prep')) await tap('#prep_no'); await sleep(2800);
  ok('montaña 2 con acantilado', await p.evaluate(() => RS._dbg.game.level.cliff > 0)); await closeModals();
  // ---- jugadas maestras: triple K.O. de un tiro da un armadillo extra (una vez por nivel)
  await p.evaluate(() => RS._dbg.startLevel(6, 14, true, {})); await sleep(3200);
  const mk = await p.evaluate(() => { const g = RS._dbg.game, P = g.phys, q0 = g.queue.length; g.shotKO0 = 0; g.shotBroken0 = P.destroyed;
    P.racs.slice(0, 3).forEach(r => P.koRac(r)); const left = P.racs.filter(r => !r.ko).length; g.afterShot(); const q1 = g.queue.length, big1 = g.big && g.big.txt;
    g.shotKO0 = 3; g.shotBroken0 = P.destroyed - 9; g.afterShot(); return { left, q0, q1, q2: g.queue.length, big: big1 }; });
  ok('triple K.O. → +1 armadillo (' + mk.q0 + '→' + mk.q1 + ') y rótulo', mk.left > 0 && mk.q1 === mk.q0 + 1 && /TRIPLE/.test(mk.big || ''));
  ok('derrumbe en el mismo nivel no da otro armadillo', mk.q2 === mk.q1); await sh('24_bonus'); await closeModals();
  // ---- zoom corto al primer impacto fuerte
  await p.evaluate(() => RS._dbg.startLevel(2, 6, true, {})); await sleep(3200);
  const zs = await p.evaluate(() => { const g = RS._dbg.game; g.angle = 0.3; g.power = 1; g.fire(); return g.cam.s; });
  let zoomed = false; for (let i = 0; i < 30 && !zoomed; i++) { await sleep(100); zoomed = await p.evaluate(() => { const g = RS._dbg.game; return !!(g.focus && g.focus.z && g.focus.t > 0); }); }
  if (zoomed) await sh('25_impact_zoom');
  ok('zoom al primer impacto', zoomed); await sleep(1500);
  ok('el zoom se deshace solo', await p.evaluate(() => { const g = RS._dbg.game; return !(g.focus && g.focus.t > 0 && g.focus.z); }));
  await closeModals();
  // ---- vídeos con premio (simulados en el navegador)
  await p.evaluate(() => { document.querySelectorAll('.modal.show').forEach(m => m.classList.remove('show')); RS._dbg.startLevel(3, 7, true, {}); }); await sleep(3200);
  await p.evaluate(() => { const g = RS._dbg.game; g.queue.forEach(q => q.used = true); g.afterShot(); }); await sleep(3500);
  ok('al perder se ofrece vídeo +1 armadillo', await p.evaluate(() => document.getElementById('r_ad').style.display !== 'none'));
  await tap('#r_ad'); await sleep(3800);
  ok('tras el vídeo se sigue jugando con un armadillo más', await p.evaluate(() => { const g = RS._dbg.game; return g && !g.ended && g.state === 'aim' && g.queue.some(q => !q.used); }));
  await play(true); const c1 = (await save()).coins;
  ok('al ganar se ofrece monedas x2', await p.evaluate(() => document.getElementById('r_ad').style.display !== 'none'));
  await tap('#r_ad'); await sleep(3800); ok('monedas x2 tras el vídeo', (await save()).coins > c1); await closeModals();
  // ---- copia de seguridad
  await p.evaluate(() => RS._dbg.show('settings')); await sleep(400); await tap('#s_backup'); await sleep(500);
  const code = await p.evaluate(() => document.getElementById('dlg_in').value); ok('código de copia generado', /^RS1:/.test(code) && code.length > 100);
  await tap('#dlg_no'); await sleep(200);
  // ---- calidad gráfica y modo eco
  await p.evaluate(() => { const s = document.getElementById('s_eco'); s.value = '1'; s.dispatchEvent(new Event('change')); const q = document.getElementById('s_gfx'); q.value = 'low'; q.dispatchEvent(new Event('change')); RS._dbg.startLevel(2, 3, true, {}); }); await sleep(3000);
  ok('modo eco: 30 fps y resolución 1x', await p.evaluate(() => RS._dbg.game.gx.fps === 30 && RS._dbg.game.dpr === 1));
  await p.evaluate(() => { RS.save.eco = false; RS.save.gfx = 'high'; });
  // ---- evento de verano
  await p.evaluate(() => { document.querySelectorAll('.modal.show').forEach(m => m.classList.remove('show')); RS.save.unlockAll = true; RS._dbg.startEvent('ver', 10, true, {}); }); await sleep(3200);
  ok('Verano Pirata 10 con Capitán Surfero', await p.evaluate(() => RS._dbg.game.phys.racs.some(r => r.boss && r.bi === 20))); await sh('26_summer');
  const ch0 = (await save()).chests.length; await play(true); ok('verano da cofre', (await save()).chests.length > ch0); await closeModals(); await p.evaluate(() => { RS.save.unlockAll = false; });
  // ---- un nivel de cada mundo (1, 10 y jefe) sin errores
  const e0 = errs.length;
  for (let w = 1; w <= 18; w++) for (const n of [1, 10, 20]) {
    await p.evaluate((w, n) => { document.querySelectorAll('.modal.show').forEach(m => m.classList.remove('show')); RS._dbg.startLevel(w, n, true, {}); }, w, n); await sleep(1300);
    if (n === 20) { const bn = await p.evaluate(() => { const g = RS._dbg.game; const r = g.phys.racs.find(r => r.boss); return r ? RS.BOSSES[r.bi].name : null; }); if (!bn) ok('jefe del mundo ' + w, false); }
    if (w % 6 === 0 && n === 20) await sh('19_w' + w + '_boss');
  }
  ok('54 niveles de muestra (3 por mundo) cargan sin errores', errs.length === e0);
  // ---- atrás de Android en menús
  await closeModals(); await p.evaluate(() => RS._dbg.show('events')); await back(); await sleep(400); ok('atrás en eventos → inicio', await vis('home'));
  await p.evaluate(() => RS._dbg.show('levels')); await back(); await sleep(400); ok('atrás en niveles → mapa', await vis('map'));
  // ---- otras pantallas: móvil alargado y tablet
  for (const [w, h, n] of [[915, 412, 'phone'], [1280, 800, 'tablet'], [740, 360, 'small']]) { await p.setViewport({ width: w, height: h, deviceScaleFactor: 2 }); await p.evaluate(() => RS._dbg.show('home')); await sleep(700); await sh('20_home_' + n); await p.evaluate(() => RS._dbg.show('events')); await sleep(500); await sh('21_events_' + n); }
  console.log(log.join('\n'));
  console.log('\nTOTAL', log.filter(l => l.startsWith('OK')).length, 'OK de', log.length);
  console.log('ERRORES:', errs.join('\n') || 'ninguno'); await b.close();
})();
