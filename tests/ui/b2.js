const puppeteer = require('puppeteer-core');const sleep=(m)=>new Promise(r=>setTimeout(r,m));
(async()=>{const b=await puppeteer.launch({executablePath:'/usr/bin/google-chrome',args:['--no-sandbox']});const p=await b.newPage();
await p.setViewport({width:960,height:444,deviceScaleFactor:2,isMobile:true,isLandscape:true});
const errs=[];p.on('pageerror',e=>errs.push(e.message));p.on('console',m=>{if(m.type()==='error')errs.push(m.text())});
await p.goto('http://localhost:8123/index.html');await p.evaluate(()=>{localStorage.setItem('rollsiege_v1',JSON.stringify({clan:'japon',name:'Castillo Albert',unlockAll:true,trophies:400}))});await p.reload();
await p.waitForFunction(()=>document.getElementById('title').classList.contains('show'),{timeout:30000});
await p.evaluate(()=>RS._dbg.show('build'));await sleep(1500);
await p.screenshot({path:'shots/b0.png'});
const at=async(x,y)=>p.evaluate((x,y)=>{const B=RS._dbg.builder;return [B.sx(x)/B.dpr,B.sy(y)/B.dpr]},x,y);
const tap=async(x,y)=>{const [a,c]=await at(x,y);await p.mouse.move(a,c);await p.mouse.down();await p.mouse.up();await sleep(80);};
const set=async(o)=>p.evaluate((o)=>{const B=RS._dbg.builder;Object.assign(B,o)},o);
// zoom out a bit
await p.evaluate(()=>RS._dbg.builder.zoom(0.75));
// plantillas: piso 6 en piedra, encima otro piso 6, y torre
await p.evaluate(()=>{const B=RS._dbg.builder;B.setTool('tpl');B.tpl=1;B.mat=1});
await tap(5,0.5); await tap(5,3); await tap(5,5.5);
await set({tpl:3});await tap(12,0.5);await tap(12,4.5);
await set({tpl:6,mat:1});await tap(19,0.5);
// refuerzos
await p.evaluate(()=>{const B=RS._dbg.builder;B.setTool('place');B.cat='ref';B.shape=RS.SHAPE_IDX.puntal;B.flip=false});
await tap(10,6);
// trampas
await p.evaluate(()=>{const B=RS._dbg.builder;B.shape=RS.SHAPE_IDX.ventilador});await tap(2.5,8);
await p.evaluate(()=>{const B=RS._dbg.builder;B.shape=RS.SHAPE_IDX.torreta});await tap(8.5,8);
await p.evaluate(()=>{const B=RS._dbg.builder;B.shape=RS.SHAPE_IDX.muelle});await tap(0.5,1);
await p.evaluate(()=>{const B=RS._dbg.builder;B.shape=RS.SHAPE_IDX.escudo});await tap(5,8);
await p.evaluate(()=>{const B=RS._dbg.builder;B.setTool('gem')});await tap(3.75,1);await tap(6.25,3.5);await tap(18,1.5);
await p.evaluate(()=>{const B=RS._dbg.builder;B.setTool('sign')});await tap(25,0.5);
await p.evaluate(()=>{const B=RS._dbg.builder;B.setTool('place');B.cat='est';B.shape=0;B.mat=0;});
await p.evaluate(()=>{const B=RS._dbg.builder;B.changed(false)});await sleep(300);
await p.screenshot({path:'shots/b1.png'});
console.log(await p.evaluate(()=>{const B=RS._dbg.builder;return {n:B.L.pieces.length,cost:B.cost(),budget:B.budget,gems:B.L.gems.length,traps:B.trapCount()}}));
await p.click('#b_test');await p.waitForFunction(()=>!RS._dbg.builder.sim,{timeout:30000});await sleep(200);
console.log('stable',await p.evaluate(()=>RS._dbg.builder.stable));await p.screenshot({path:'shots/b2.png'});
await p.evaluate(()=>{RS._dbg.builder.setTool('tpl')});await sleep(200);await p.screenshot({path:'shots/b3.png'});
await p.click('#b_save');await sleep(300);
await p.click('#b_siege');await sleep(3000);await p.screenshot({path:'shots/b4.png'});
await p.mouse.move(150,250);await p.mouse.down();for(let i=1;i<=10;i++){await p.mouse.move(150-9*i,250+7*i);await sleep(20);}await sleep(100);await p.mouse.up();
await sleep(1300);await p.screenshot({path:'shots/b5.png'});await sleep(2500);await p.screenshot({path:'shots/b6.png'});
console.log('errs',errs);await b.close();})();
