const puppeteer=require('puppeteer-core');const sleep=m=>new Promise(r=>setTimeout(r,m));
(async()=>{const b=await puppeteer.launch({executablePath:'/usr/bin/google-chrome',args:['--no-sandbox','--lang=es-ES']});const p=await b.newPage();const errs=[];p.on('pageerror',e=>errs.push(e.message));
await p.setViewport({width:891,height:411,deviceScaleFactor:2.625,isMobile:true,hasTouch:true});await p.goto('http://localhost:8123/index.html');
await p.evaluate(()=>{localStorage.setItem('rollsiege_v1',JSON.stringify({lang:'es',clan:'japon',name:'Prueba',coins:5000,seenHint:5,seenRacs:1,wheelDay:'0',unlockAll:true,stars:{'12-20':3}}))});await p.reload();
await p.waitForFunction(()=>document.getElementById('title').classList.contains('show'),{timeout:90000});
const log=[];const ok=(n,c)=>log.push((c?'OK  ':'FAIL')+' '+n);
await p.evaluate(()=>{const I=RS.SHAPE_IDX,ps=[];for(let y=0.5;y<4;y++){ps.push({s:I.cubo,m:1,x:5.5,y});ps.push({s:I.cubo,m:1,x:9.5,y});}ps.push({s:I.viga,m:1,x:7.5,y:4.25});RS.save.layout={pieces:ps,gems:[{x:12,y:RS.GEM_R,c:0}],deco:[],sign:null};document.querySelectorAll('.modal.show').forEach(m=>m.classList.remove('show'));RS._dbg.show('build')});await sleep(2500);
await p.evaluate(()=>{const B=RS._dbg.builder;B.z=1.3;B.s=B.s0*B.z;B.cx=8;B.clampView();});
const scr=(x,y)=>p.evaluate((x,y)=>{const b=RS._dbg.builder;return [RS.stage.x+b.sx(x)/b.dpr, RS.stage.y+b.sy(y)/b.dpr]},x,y);
const pick=(id,rot,flip)=>p.evaluate((id,rot,flip)=>{const B=RS._dbg.builder;B.shape=RS.SHAPE_IDX[id];B.rot=rot==null?0:rot;B.flip=!!flip;B.autoOrient=rot===undefined;B.setTool('place')},id,rot,flip);
const tap=async(x,y)=>{const [a,c]=await scr(x,y);await p.touchscreen.tap(a,c);await sleep(250);};
const find=id=>p.evaluate(id=>RS._dbg.builder.L.pieces.filter(q=>RS.SHAPES[q.s].id===id).map(q=>({x:q.x,y:q.y,rot:q.rot||0,flip:!!q.flip,weld:!!q.weld,wall:!!q.wall})),id);
await pick('muelle');await tap(4.4,2.6);let m=await find('muelle');ok('muelle colgado por fuera de la pared izquierda, base contra ella: '+JSON.stringify(m),m.length===1&&m[0].wall&&m[0].x===4.5&&m[0].rot===1);
await pick('torreta');await tap(10.6,3.4);m=await find('torreta');ok('torreta tocada junto a la pared: cae al suelo derecha: '+JSON.stringify(m),m.length===1&&!m[0].wall&&m[0].rot===0&&m[0].y===0.5);
await pick('ventilador');await tap(6.6,2.6);m=await find('ventilador');ok('ventilador tocado junto a la pared: va al suelo, derecho: '+JSON.stringify(m),m.length===1&&!m[0].wall&&m[0].rot===0&&m[0].y===0.5);
await pick('muelle');await tap(10.6,2.6);m=await find('muelle');ok('muelle por fuera de la pared derecha, base a la izquierda: '+JSON.stringify(m[1]),m.length===2&&m[1].rot===5&&m[1].x===10.5&&m[1].wall);
await pick('escudo');await tap(12,1);m=await find('escudo');ok('escudo encima de la gema: '+JSON.stringify(m),m.length===1&&Math.abs(m[0].x-12)<0.6);
// escuadra con ⟳: 4 orientaciones en la esquina superior izquierda del marco
const orients=[];for(let o=0;o<4;o++){await pick('escuadra',o,false);await tap(6.4,3.4);const e=await find('escuadra');orients.push(e.length?e[e.length-1].rot+(e[e.length-1].flip?'F':'')+'@'+e[e.length-1].x+','+e[e.length-1].y:'nada');await p.evaluate(()=>{const B=RS._dbg.builder;B.L.pieces=B.L.pieces.filter(q=>RS.SHAPES[q.s].id!=='escuadra')});}
ok('⟳ da 4 orientaciones distintas pegadas a la esquina: '+orients.join(' '),new Set(orients).size===4&&orients.every(s=>s.includes('@6.5,3.5')));
console.log(JSON.stringify(await p.evaluate(()=>RS._dbg.builder.L.pieces.filter(q=>RS.SHAPES[q.s].cat==='trap').map(q=>[RS.SHAPES[q.s].id,q.x,q.y]))));await p.screenshot({path:'shots/traps.png'});
await p.evaluate(()=>document.querySelector('#b_test').click());await sleep(5000);ok('todo estable en la prueba de gravedad',await p.evaluate(()=>RS._dbg.builder.stable));
console.log(log.join('\n'));console.log('ERR',errs.join('|')||'ninguno');await b.close();})();
