const puppeteer=require('puppeteer-core');const sleep=m=>new Promise(r=>setTimeout(r,m));
(async()=>{const b=await puppeteer.launch({executablePath:'/usr/bin/google-chrome',args:['--no-sandbox','--lang=es-ES','--autoplay-policy=no-user-gesture-required']});const p=await b.newPage();const errs=[];p.on('pageerror',e=>errs.push(e.message));
await p.setViewport({width:891,height:411,deviceScaleFactor:2.625,isMobile:true,hasTouch:true});await p.goto('http://localhost:8123/index.html');
await p.evaluate(()=>{localStorage.setItem('rollsiege_v1',JSON.stringify({lang:'es',clan:'japon',name:'Fortaleza Sol Naciente',coins:5000,seenHint:5,seenRacs:1,wheelDay:'0',unlockAll:true,blueprint:true,tut:{drag:1,abil:1,queue:1,zoom:1}}))});await p.reload();
await p.waitForFunction(()=>document.getElementById('title').classList.contains('show'),{timeout:90000});
const log=[];const ok=(n,c)=>log.push((c?'OK  ':'FAIL')+' '+n);
await p.evaluate(()=>{const I=RS.SHAPE_IDX,ps=[];for(let y=0.5;y<4;y++){ps.push({s:I.cubo,m:1,x:5.5,y});ps.push({s:I.cubo,m:1,x:8.5,y});}ps.push({s:I.viga,m:1,x:7,y:4.25});RS.save.layout={pieces:ps,gems:[{x:7,y:RS.GEM_R,c:0}],deco:[],sign:null};document.querySelectorAll('.modal.show').forEach(m=>m.classList.remove('show'));RS._dbg.show('build')});await sleep(2500);
const scr=(x,y)=>p.evaluate((x,y)=>{const b=RS._dbg.builder;return [RS.stage.x+b.sx(x)/b.dpr, RS.stage.y+b.sy(y)/b.dpr]},x,y);
// 1) arco encima de la gema
await p.evaluate(()=>{const B=RS._dbg.builder;B.shape=RS.SHAPE_IDX.arco;B.setTool('place')});let [x,y]=await scr(7,0.8);await p.touchscreen.tap(x,y);await sleep(300);
ok('arco colocado sobre la gema',await p.evaluate(()=>RS._dbg.builder.L.pieces.some(q=>RS.SHAPES[q.s].id==='arco'&&q.x===7)));
await p.screenshot({path:'shots/gemarch.png'});
await p.evaluate(()=>document.querySelector('#b_test').click());await sleep(4500);ok('estable con la gema bajo el arco',await p.evaluate(()=>RS._dbg.builder.stable));
// 2) mano: tocar no pone nada
await p.evaluate(()=>{const b=[...document.querySelectorAll('#b_tools .tb')][0];b.click()});await sleep(200);
const n0=await p.evaluate(()=>RS._dbg.builder.L.pieces.length);[x,y]=await scr(12,0.5);await p.touchscreen.tap(x,y);await sleep(300);
ok('con la mano tocar no coloca',await p.evaluate(n0=>RS._dbg.builder.L.pieces.length===n0,n0));
// 3) arrastrar la gema fuera del arco a x=11
[x,y]=await scr(7,0.27);const [tx,ty]=await scr(11,0.3);await p.touchscreen.touchStart(x,y);for(let k=1;k<=10;k++){await p.touchscreen.touchMove(x+(tx-x)*k/10,y+(ty+50-y)*k/10);await sleep(30);}await p.touchscreen.touchEnd();await sleep(300);
ok('gema arrastrada a x=11: '+JSON.stringify(await p.evaluate(()=>RS._dbg.builder.L.gems)),await p.evaluate(()=>RS._dbg.builder.L.gems.length===1&&RS._dbg.builder.L.gems[0].x===11));
// 4) deseleccionar tocando la pieza elegida
await p.evaluate(()=>{const B=RS._dbg.builder;B.setTool('place');B.shape=RS.SHAPE_IDX.cubo;});await p.evaluate(()=>RS._dbg.show('build'));await sleep(2000);
await p.evaluate(()=>{const b=[...document.querySelectorAll('#b_pal .tb')].find(x=>x.classList.contains('sel')&&x.title);b&&b.click()});await sleep(200);
ok('tocar la pieza elegida la suelta (mano)',await p.evaluate(()=>RS._dbg.builder.tool==='hand'));
// 5) victoria: la sintonía no se repite
await p.evaluate(()=>{RS._dbg.startLevel(1,2,true,{})});await sleep(3000);await p.evaluate(()=>{const g=RS._dbg.game;g.phys.racs.forEach(r=>g.phys.koRac(r));g.afterShot()});await sleep(3500);
ok('sintonía de victoria sin bucle',await p.evaluate(()=>RS.Audio.cur&&RS.Audio.cur.indexOf('victoria')>=0&&RS.Audio.music&&RS.Audio.music.loop===false));
console.log(log.join('\n'));console.log('ERR',errs.join('|')||'ninguno');await b.close();})();
