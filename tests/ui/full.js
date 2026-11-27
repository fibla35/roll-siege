const puppeteer = require('puppeteer-core');const sleep=(m)=>new Promise(r=>setTimeout(r,m));
(async()=>{const b=await puppeteer.launch({executablePath:'/usr/bin/google-chrome',args:['--no-sandbox','--autoplay-policy=no-user-gesture-required']});const p=await b.newPage();
const errs=[];p.on('pageerror',e=>errs.push('ERR '+e.message));p.on('console',m=>{if(m.type()==='error')errs.push('CON '+m.text())});p.on('requestfailed',r=>errs.push('REQ '+r.url()));
await p.setViewport({width:960,height:444,deviceScaleFactor:2});
await p.goto('http://localhost:8123/index.html');await p.evaluate(()=>localStorage.clear());await p.reload();
await p.waitForFunction(()=>document.getElementById('title').classList.contains('show'),{timeout:30000});
await p.evaluate(()=>{window.__sfx={};const o=RS.Audio.sfx;RS.Audio.sfx=function(n,v){__sfx[n]=(__sfx[n]||0)+1;return o.apply(this,arguments)};window.__mus=[];const op=RS.Audio.play;RS.Audio.play=function(c){__mus.push(c);return op.apply(this,arguments)};});
const log=[];const ok=(n,c)=>log.push((c?'OK  ':'FAIL')+' '+n);
const vis=id=>p.evaluate(id=>document.getElementById(id).classList.contains('show'),id);
const sh=n=>p.screenshot({path:'shots/f_'+n+'.png'});
// --- menús ---
await p.click('[data-go=start]');await sleep(400);ok('título → clan',await vis('clan'));
await p.click('#clanok');await sleep(300);ok('sin clan no avanza',await vis('clan'));
await p.click('#clan .back');await sleep(300);ok('atrás en clan → título',await vis('title'));
await p.click('[data-go=start]');await sleep(300);await p.click('#clanlist .card:nth-child(3)');await p.type('#fortname','Templo Fiblas');await p.click('#clanok');await sleep(500);ok('clan → inicio',await vis('home'));
await p.click('[data-go=map]');await sleep(500);ok('inicio → mapa',await vis('map'));
ok('mundo 2 bloqueado',await p.evaluate(()=>document.querySelectorAll('.wnode')[1].classList.contains('locked')));
await p.click('.maparrow');await sleep(400);ok('flecha → nuevo continente',await p.evaluate(()=>document.querySelector('.wnode .num').textContent.includes('🔒')));
await p.click('.maparrow');await sleep(400);
await p.click('.wnode');await sleep(400);ok('mapa → niveles',await vis('levels'));
ok('nivel 2 bloqueado',await p.evaluate(()=>document.querySelectorAll('.lv')[1].classList.contains('locked')));
await p.click('.lv');await sleep(3000);ok('niveles → partida',await vis('hud'));
// --- partida real: disparos ---
const st=await p.evaluate(()=>RS.stage);
async function shoot(dx,dy,abil){await p.mouse.move(st.x+st.w*0.3,st.y+st.h*0.5);await p.mouse.down();for(let i=1;i<=10;i++){await p.mouse.move(st.x+st.w*0.3-dx*i/10,st.y+st.h*0.5+dy*i/10);await sleep(20)}await sleep(80);await p.mouse.up();
 if(abil){await sleep(abil);await p.mouse.click(st.x+st.w*0.6,st.y+st.h*0.4);}
 for(let i=0;i<40;i++){await sleep(250);const s=await p.evaluate(()=>RS._dbg.game&&RS._dbg.game.state);if(s==='aim'||s==='end')break;}}
await shoot(150,70,0);await sh('shot1');
let g=await p.evaluate(()=>{const g=RS._dbg.game;return {st:g.state,used:g.queue.filter(q=>q.used).length,racs:g.phys.racsLeft(),score:g.phys.score}});ok('disparo 1 completado ('+JSON.stringify(g)+')',g.used===1);
await shoot(140,95,700);
g=await p.evaluate(()=>{const g=RS._dbg.game;return {st:g.state,used:g.queue.filter(q=>q.used).length,racs:g.phys.racsLeft(),score:g.phys.score,ended:g.ended}});ok('disparo 2 con habilidad ('+JSON.stringify(g)+')',g.used>=2||g.ended);
// pausa
if(!g.ended){await p.click('#pausebtn');await sleep(300);ok('pausa abre',await p.evaluate(()=>document.getElementById('pause').classList.contains('show')&&RS._dbg.game.paused));await sh('pause');
 const m1=await p.evaluate(()=>RS.Audio.cur);await p.click('#p_next');await sleep(400);ok('otra canción',await p.evaluate(m=>RS.Audio.cur!==m,m1));
 await p.click('#p_mus');ok('silenciar música',await p.evaluate(()=>RS.save.vol.music===0));await p.click('#p_mus');ok('reactivar música',await p.evaluate(()=>RS.save.vol.music>0));
 await p.click('#p_snd');ok('silenciar efectos',await p.evaluate(()=>RS.save.vol.sfx===0));await p.click('#p_snd');
 await p.click('#p_resume');await sleep(200);ok('seguir',await p.evaluate(()=>!RS._dbg.game.paused));
 await p.click('#pausebtn');await sleep(200);await p.click('#p_retry');await sleep(2500);ok('reintentar reinicia cola',await p.evaluate(()=>RS._dbg.game.queue.every(q=>!q.used)));}
// forzar victoria → resultado → siguiente
await p.evaluate(()=>{const g=RS._dbg.game;g.phys.racs.forEach(r=>g.phys.koRac(r));g.afterShot();});await sleep(2200);ok('pantalla de victoria',await p.evaluate(()=>document.getElementById('result').classList.contains('show')));await sh('win');
ok('estrellas guardadas',await p.evaluate(()=>RS.save.stars['1-1']>0));
await p.click('#r_next');await sleep(2800);ok('siguiente nivel 1-2',await p.evaluate(()=>document.getElementById('hud_lv').textContent.startsWith('1-2')));
await p.evaluate(()=>{const g=RS._dbg.game;g.queue.forEach(q=>q.used=true);g.afterShot();});await sleep(2200);ok('pantalla de derrota',await p.evaluate(()=>document.getElementById('r_title').src.includes('derrota')));
await p.click('#r_back');await sleep(500);ok('volver → niveles',await vis('levels'));
// liga
await p.click('#levels .back');await sleep(300);await p.click('#map .back');await sleep(300);
await p.click('[data-go=league]');await sleep(700);ok('liga abre',await vis('league'));await sh('league');
await p.click('#l_next');await sleep(300);await p.click('#l_go');await sleep(2800);ok('asedio de liga',await vis('hud'));await sh('leaguegame');
await p.click('#pausebtn');await p.click('#p_quit');await sleep(500);ok('salir → liga',await vis('league'));
await p.click('#league .back');await sleep(300);
// armadillos y ajustes
await p.click('[data-go=arms]');await sleep(500);ok('armadillos: 24 fichas',await p.evaluate(()=>document.querySelectorAll('.arm').length===24));await p.click('#arms .back');
await p.click('[data-go=settings]');await sleep(400);ok('ajustes',await vis('settings'));
await p.evaluate(()=>document.querySelector('#s_jb .tb:nth-child(16)').click());await sleep(300);ok('tocadiscos',await p.evaluate(()=>RS.Audio.cur==='RSM17'));
await p.select('#s_style','dnb');ok('estilo dnb',await p.evaluate(()=>RS.save.musicStyle==='dnb'));
await p.click('#s_unlock');ok('desbloquear todo',await p.evaluate(()=>RS.save.unlockAll));
await p.click('#settings .back');await sleep(300);
// constructor
await p.click('[data-go=build]');await sleep(1500);ok('constructor',await vis('build'));
const nt=await p.evaluate(()=>document.querySelectorAll('#b_tools .tb').length);
for(let i=1;i<=nt;i++){await p.evaluate(i=>{const b=document.querySelector('#b_tools .tb:nth-child('+i+')');if(b&&!b.textContent.includes('✖')&&!b.textContent.includes('✏'))b.click()},i);await sleep(60);}
ok('todas las herramientas pulsadas ('+nt+')',true);
await p.evaluate(()=>{const B=RS._dbg.builder;B.setTool('tpl');B.tpl=2;B.mat=1;const ps=B.tplPieces(6,0.5);ps.forEach(q=>B.L.pieces.push(q));const p2=B.tplPieces(6,3);p2.forEach(q=>B.L.pieces.push(q));B.L.gems.push({x:6,y:.34,c:0});B.changed();});
await p.click('#b_test');await p.waitForFunction(()=>!RS._dbg.builder.sim,{timeout:20000});ok('prueba de gravedad estable',await p.evaluate(()=>RS._dbg.builder.stable));
await p.click('#b_save');await sleep(200);ok('guardar fortaleza',await p.evaluate(()=>!!RS.save.layout&&RS.save.stable));
await p.evaluate(()=>RS._dbg.builder.L.pieces.pop());await p.click('#b_back');await sleep(300);ok('aviso salir sin guardar',await p.evaluate(()=>document.getElementById('dlg').classList.contains('show')));await p.click('#dlg_ok');await sleep(400);ok('sale tras aceptar',await vis('home'));
// contraataque y clima
await p.evaluate(()=>RS._dbg.startLevel(1,5));await sleep(6000);ok('contraataque en marcha',await p.evaluate(()=>RS._dbg.game.defense));await sh('defense');
const wx={};for(const [w,n] of [[5,2],[3,4],[4,3],[7,3],[11,3],[12,20]]){await p.evaluate((w,n)=>RS._dbg.startLevel(w,n),w,n);await sleep(2600);wx[w+'-'+n]=await p.evaluate(()=>RS._dbg.game.wx&&RS._dbg.game.wx.k);await sh('wx'+w+'_'+n);}
log.push('clima: '+JSON.stringify(wx));
// armadillos nuevos: frames de animación
ok('animaciones armadillos nuevos',await p.evaluate(()=>[12,15,18,21].every(a=>RS.atlas[RS.armSprite(a,0)[0]]&&RS.armSprite(a,0)[0].startsWith('arm2_anim'))));
log.push('sonidos: '+JSON.stringify(await p.evaluate(()=>__sfx)));
log.push('música: '+JSON.stringify(await p.evaluate(()=>[...new Set(__mus)])));
log.push('sfx cargados: '+await p.evaluate(()=>Object.keys(RS.Audio.buf).length)+'/18 · ctx '+await p.evaluate(()=>RS.Audio.ctx&&RS.Audio.ctx.state));
console.log(log.join('\n'));console.log('ERRORES:',errs.length?errs.join('\n'):'ninguno');await b.close();})();
