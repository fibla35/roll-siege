const puppeteer=require('puppeteer-core');const sleep=m=>new Promise(r=>setTimeout(r,m));
(async()=>{const b=await puppeteer.launch({executablePath:'/usr/bin/google-chrome',args:['--no-sandbox','--lang=es-ES']});const p=await b.newPage();const errs=[];p.on('pageerror',e=>errs.push(e.message));
await p.setViewport({width:891,height:411,deviceScaleFactor:2.625,isMobile:true,hasTouch:true});await p.goto('http://localhost:8123/index.html');
await p.evaluate(()=>{localStorage.setItem('rollsiege_v1',JSON.stringify({lang:'es',clan:'pirata',name:'Fibla',coins:5000,seenHint:5,seenRacs:1,wheelDay:'0',unlockAll:true}))});await p.reload();
await p.waitForFunction(()=>document.getElementById('title').classList.contains('show'),{timeout:90000});
// dos marcos de 4 m de alto y 6 de ancho interior
await p.evaluate(()=>{const I=RS.SHAPE_IDX,ps=[];[[0.5,7.5],[9.5,16.5]].forEach(([l,r])=>{for(let y=0.5;y<4;y++){ps.push({s:I.cubo,m:1,x:l,y});ps.push({s:I.cubo,m:1,x:r,y});}ps.push({s:I.viga,m:0,x:(l+r)/2,y:4.25});});ps.push({s:I.cubo,m:1,x:21.5,y:0.5},{s:I.cubo,m:1,x:21.5,y:1.5},{s:I.cubo,m:1,x:21.5,y:2.5});RS.save.layout={pieces:ps,gems:[],deco:[],sign:null};document.querySelectorAll('.modal.show').forEach(m=>m.classList.remove('show'));RS._dbg.show('build')});await sleep(2500);
await p.evaluate(()=>{const B=RS._dbg.builder;B.z=1.25;B.s=B.s0*B.z;B.cx=11;B.clampView();});await sleep(200);
const scr=(x,y)=>p.evaluate((x,y)=>{const b=RS._dbg.builder;return [RS.stage.x+b.sx(x)/b.dpr, RS.stage.y+b.sy(y)/b.dpr]},x,y);
const put=async(id,x,y)=>{await p.evaluate(id=>{const B=RS._dbg.builder;B.shape=RS.SHAPE_IDX[id];B.autoOrient=true;B.setTool('place')},id);const [a,c]=await scr(x,y);await p.touchscreen.tap(a,c);await sleep(250);};
await put('escuadra',1.4,3.4); await put('escuadra',6.6,3.4); await put('escuadra',1.4,1.3); await put('escuadra',6.6,1.3);
await put('puntal',11.2,3.0); await put('puntal',14.8,3.0); await put('puntalh',11.2,1.0); await put('puntalh',14.8,1.0);
await put('tri',3.6,3.4); await put('tri',4.4,3.4);
await put('contrafuerte',19.5,1.0); await put('contrafuerte',23.5,1.0);
const L=await p.evaluate(()=>RS._dbg.builder.L.pieces.filter(q=>RS.SHAPES[q.s].cat==='ref'||RS.SHAPES[q.s].id==='tri').map(q=>RS.SHAPES[q.s].id+'@'+q.x+','+q.y+' r'+(q.rot||0)+(q.flip?'F':'')));console.log(L.length,'colocados:\n'+L.join('\n'));
await p.screenshot({path:'shots/refs.png'});
await p.evaluate(()=>document.querySelector('#b_test').click());await sleep(4500);console.log('estable:',await p.evaluate(()=>RS._dbg.builder.stable));await p.screenshot({path:'shots/refs_test.png'});
console.log('ERR',errs.join('|')||'ninguno');await b.close();})();
