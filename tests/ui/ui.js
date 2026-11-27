const puppeteer = require('puppeteer-core');
const OUT = '/home/claude/rs-test/shots/';
require('fs').mkdirSync(OUT, { recursive: true });
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
(async () => {
  const b = await puppeteer.launch({ executablePath: '/usr/bin/google-chrome', args: ['--no-sandbox', '--autoplay-policy=no-user-gesture-required', '--use-gl=swiftshader'] });
  const p = await b.newPage();
  await p.setViewport({ width: 960, height: 444, deviceScaleFactor: 2, isMobile: true, hasTouch: false, isLandscape: true });
  const errs = [];
  p.on('pageerror', (e) => errs.push('PAGEERR ' + e.message));
  p.on('console', (m) => { if (m.type() === 'error' || m.type() === 'warning') errs.push(m.type() + ' ' + m.text()); });
  p.on('requestfailed', (r) => errs.push('REQFAIL ' + r.url()));
  await p.goto('http://localhost:8123/index.html');
  await p.evaluate(() => localStorage.clear());
  await p.reload();
  await p.waitForFunction(() => document.getElementById('title').classList.contains('show'), { timeout: 30000 });
  await sleep(500); await p.screenshot({ path: OUT + '01_title.png' });
  await p.click('[data-go=start]'); await sleep(400);
  await p.screenshot({ path: OUT + '02_clan.png' });
  await p.click('#clanlist .card:nth-child(1)'); await sleep(200);
  await p.type('#fortname', 'Castillo Albert');
  await p.click('#clanok'); await sleep(600);
  await p.screenshot({ path: OUT + '03_home.png' });
  await p.click('[data-go=map]'); await sleep(600);
  await p.screenshot({ path: OUT + '04_map.png' });
  await p.click('.wnode'); await sleep(400);
  await p.screenshot({ path: OUT + '05_levels.png' });
  await p.click('.lv'); await sleep(1500);
  await p.screenshot({ path: OUT + '06_game.png' });
  // apuntar: arrastrar hacia atrás-abajo
  const drag = async (dx, dy, hold) => {
    await p.mouse.move(400, 250); await p.mouse.down();
    for (let i = 1; i <= 10; i++) { await p.mouse.move(400 - dx * i / 10, 250 + dy * i / 10); await sleep(25); }
    if (hold) await sleep(hold);
  };
  await drag(110, 90, 200);
  await p.screenshot({ path: OUT + '07_aim.png' });
  await p.mouse.up(); await sleep(700);
  await p.screenshot({ path: OUT + '08_flight.png' });
  await sleep(4000);
  await p.screenshot({ path: OUT + '09_after.png' });
  const st = await p.evaluate(() => { const g = RS._dbg.game; return g && { state: g.state, score: g.phys.score, gems: g.phys.gemsLeft(), used: g.queue.map(q => q.used) }; });
  console.log('state after shot', JSON.stringify(st));
  // pausa
  await p.click('#pausebtn'); await sleep(300); await p.screenshot({ path: OUT + '10_pause.png' });
  await p.click('#p_quit'); await sleep(400);
  // ajustes desbloquear todo
  await p.evaluate(() => RS._dbg.show('settings')); await sleep(300);
  await p.screenshot({ path: OUT + '11_settings.png' });
  await p.click('#s_unlock'); await sleep(200);
  await p.evaluate(() => RS._dbg.show('arms')); await sleep(500);
  await p.screenshot({ path: OUT + '12_arms.png' });
  await p.evaluate(() => RS._dbg.show('league')); await sleep(800);
  await p.screenshot({ path: OUT + '13_league.png' });
  await p.evaluate(() => RS._dbg.show('build')); await sleep(1500);
  await p.screenshot({ path: OUT + '14_build.png' });
  // construir: suelo de piedra y torre
  const bpos = await p.evaluate(() => { const B = RS._dbg.builder; return { ox: B.ox / B.dpr, oy: B.oy / B.dpr, s: B.s / B.dpr }; });
  const at = (x, y) => [bpos.ox + x * bpos.s, bpos.oy - y * bpos.s];
  const tap = async (x, y) => { const [a, c] = at(x, y); await p.mouse.move(a, c); await p.mouse.down(); await p.mouse.up(); await sleep(60); };
  await p.evaluate(() => { const B = RS._dbg.builder; B.shape = 1; B.mat = 1; });
  for (const x of [4, 8, 12]) await tap(x, 0.5);
  await p.evaluate(() => { const B = RS._dbg.builder; B.shape = 0; B.mat = 0; });
  for (const x of [3.5, 4.5, 11.5, 12.5]) await tap(x, 1.5);
  await p.evaluate(() => { const B = RS._dbg.builder; B.shape = 3; B.mat = 0; });
  await tap(8, 2.25);
  await p.evaluate(() => { const B = RS._dbg.builder; B.tool = 'gem'; });
  await tap(8, 1.2);
  await p.evaluate(() => { const B = RS._dbg.builder; B.tool = 'sign'; });
  await tap(17, 0);
  await p.evaluate(() => { const B = RS._dbg.builder; B.tool = 'deco'; B.decoIdx = 2; });
  await tap(1, 0);
  await sleep(300);
  await p.screenshot({ path: OUT + '15_built.png' });
  await p.click('#b_test'); await sleep(5000);
  await p.screenshot({ path: OUT + '16_gravity.png' });
  const bs = await p.evaluate(() => ({ stable: RS._dbg.builder.stable, n: RS._dbg.builder.L.pieces.length, cost: RS._dbg.builder.cost() }));
  console.log('builder', JSON.stringify(bs));
  await p.click('#b_save'); await sleep(300);
  await p.click('#b_siege'); await sleep(1500);
  await p.screenshot({ path: OUT + '17_ownsiege.png' });
  // nivel jefe mundo 6
  await p.evaluate(() => RS._dbg.startLevel(6, 20)); await sleep(2000);
  await p.screenshot({ path: OUT + '18_boss6.png' });
  for (const w of [2, 3, 4, 5]) { await p.evaluate((w) => RS._dbg.startLevel(w, 7), w); await sleep(1500); await p.screenshot({ path: OUT + '19_w' + w + '.png' }); }
  console.log('ERRORS', errs.length ? errs.join('\n') : 'none');
  await b.close();
})();
