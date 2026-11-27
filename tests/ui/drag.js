const puppeteer=require('puppeteer-core');const sleep=m=>new Promise(r=>setTimeout(r,m));
(async()=>{const b=await puppeteer.launch({executablePath:'/usr/bin/google-chrome',args:['--no-sandbox','--lang=es-ES']});const p=await b.newPage();const errs=[];p.on('pageerror',e=>errs.push(e.message));
await p.setViewport({width:891,height:411,deviceScaleFactor:2.625,isMobile:true,hasTouch:true});await p.goto('http://localhost:8123/index.html');
await p.evaluate(()=>{localStorage.setItem('rollsiege_v1',JSON.stringify({lang:'es',clan:'pirata',name:'Fibla',coins:5000,seenHint:5,seenRacs:1,wheelDay:'0'}))});await p.reload();
await p.waitForFunction(()=>document.getElementById('title').classList.contains('show'),{timeout:90000});
await p.evaluate(()=>{const I=RS.SHAPE_IDX;RS.save.layout={pieces:[{s:I.cubo,m:1,x:4.5,y:0.5}],gems:[],deco:[],sign:null};document.querySelectorAll('.modal.show').forEach(m=>m.classList.remove('show'));RS._dbg.show('build')});await sleep(2500);
const log=[];const ok=(n,c)=>log.push((c?'OK  ':'FAIL')+' '+n);
const B=()=>p.evaluate(()=>RS._dbg.builder.L.pieces.map(q=>[RS.SHAPES[q.s].id,q.x,q.y]));
const scr=(x,y)=>p.evaluate((x,y)=>{const b=RS._dbg.builder;return [RS.stage.x+b.sx(x)/b.dpr, RS.stage.y+b.sy(y)/b.dpr]},x,y);
await p.evaluate(()=>{const B=RS._dbg.builder;['extStart','extDrop','tap'].forEach(k=>{const o=B[k];B[k]=function(){console.log('CALL',k,JSON.stringify(arguments[0]&&{x:arguments[0].clientX,y:arguments[0].clientY}));return o.apply(this,arguments)}});});p.on('console',m=>console.log('PAGE',m.text()));await p.evaluate(()=>{['pointerdown','pointerup','pointercancel'].forEach(t=>addEventListener(t,e=>{console.log(t,e.target.className,e.clientX|0,e.clientY|0)},true));addEventListener('pointermove',e=>{window._mv=(window._mv||0)+1},true)});
// 1) arrastrar un bloque desde la paleta hasta x=9
const btn=await p.evaluate(()=>{const bs=[...document.querySelectorAll('#b_pal .tb')].find(x=>x.title==='Bloque').getBoundingClientRect();return [bs.x+bs.width/2,bs.y+bs.height/2]});
const [tx,ty]=await scr(9,1.5);
await p.touchscreen.touchStart(btn[0],btn[1]);for(let k=1;k<=12;k++){await p.touchscreen.touchMove(btn[0]+(tx-btn[0])*k/12,btn[1]+(ty+50-btn[1])*k/12);await sleep(30);}
await sleep(200);console.log('moves',await p.evaluate(()=>window._mv));await p.screenshot({path:'shots/drag_mid.png'});await p.touchscreen.touchEnd();await sleep(300);
let L=await B();ok('arrastre desde la paleta coloca un bloque: '+JSON.stringify(L.slice(1)),L.length===2&&L[1][0]==='bloque'&&Math.abs(L[1][1]-9)<1.1);
// 2) mantener el dedo sobre el cubo y moverlo a x=13
const [cx,cy]=await scr(4.5,0.5);const [dx,dy]=await scr(13,0.5);
await p.touchscreen.touchStart(cx,cy);await sleep(500);for(let k=1;k<=12;k++){await p.touchscreen.touchMove(cx+(dx-cx)*k/12,cy+(dy+50-cy)*k/12);await sleep(30);}await sleep(200);await p.screenshot({path:'shots/drag_hold.png'});await p.touchscreen.touchEnd();await sleep(300);
L=await B();ok('mantener y arrastrar mueve el cubo: '+JSON.stringify(L),L.length===2&&L.some(q=>q[0]==='cubo'&&Math.abs(q[1]-13)<1.1));
// 3) arrastrar el bloque directamente (sin esperar) a x=17
const [bx,by]=await scr(9,0.5);const [ex,ey]=await scr(17,0.5);
await p.touchscreen.touchStart(bx,by);for(let k=1;k<=12;k++){await p.touchscreen.touchMove(bx+(ex-bx)*k/12,by+(ey+50-by)*k/12);await sleep(30);}await p.touchscreen.touchEnd();await sleep(300);
L=await B();ok('arrastrar una pieza la mueve: '+JSON.stringify(L),L.length===2&&L.some(q=>q[0]==='bloque'&&Math.abs(q[1]-17)<1.1));
// 4) toque simple en vacío sigue colocando
const [fx,fy]=await scr(22,0.5);await p.touchscreen.tap(fx,fy);await sleep(300);L=await B();ok('tocar en vacío coloca',L.length===3);
// 5) soltar fuera de la zona devuelve la pieza
const [gx,gy]=await scr(13,0.5);await p.touchscreen.touchStart(gx,gy);await sleep(450);for(let k=1;k<=8;k++){await p.touchscreen.touchMove(gx,gy+(380-gy)*k/8);await sleep(30);}await p.touchscreen.touchEnd();await sleep(300);
L=await B();ok('soltar sobre la barra devuelve la pieza',L.length===3&&L.some(q=>q[0]==='cubo'&&Math.abs(q[1]-13)<1.1));
console.log(log.join('\n'));console.log('ERR',errs.join('|')||'ninguno');await b.close();})();
