const puppeteer = require('puppeteer-core');const sleep=(m)=>new Promise(r=>setTimeout(r,m));
(async()=>{const b=await puppeteer.launch({executablePath:'/usr/bin/google-chrome',args:['--no-sandbox']});const p=await b.newPage();
await p.setViewport({width:960,height:444,deviceScaleFactor:2,isMobile:true,isLandscape:true});
const errs=[];p.on('pageerror',e=>errs.push(e.message));
await p.goto('http://localhost:8123/index.html');await p.evaluate(()=>{localStorage.setItem('rollsiege_v1',JSON.stringify({clan:'oeste',name:'Fuerte Albert',unlockAll:true}))});await p.reload();
await p.waitForFunction(()=>document.getElementById('title').classList.contains('show'),{timeout:30000});
await p.evaluate(()=>RS._dbg.show('build'));await sleep(1500);
// estructura correcta: 2 bloques piedra base + cubos + tablón encima que apoya en ambos
await p.evaluate(()=>{const B=RS._dbg.builder;const L=B.L;
L.pieces.push({s:1,m:1,rot:0,x:5,y:0.5},{s:1,m:1,rot:0,x:9,y:0.5},{s:0,m:0,rot:0,x:4.5,y:1.5},{s:0,m:0,rot:0,x:5.5,y:1.5},{s:0,m:0,rot:0,x:9.5,y:1.5},{s:3,m:0,rot:0,x:7,y:2.25},{s:5,m:3,rot:0,x:5,y:3});
L.gems.push({x:7,y:2.84,c:0});L.sign={x:15,y:0,name:'Fuerte Albert'};L.deco.push({d:3,x:1,y:0,w:1.6});
L.pieces[4].weld=true;L.pieces[0].tint=RS.PAINTS[2];B.changed();});
await sleep(300);await p.screenshot({path:'shots/g1.png'});
await p.click('#b_test');await p.waitForFunction(()=>!RS._dbg.builder.sim,{timeout:30000});await sleep(200);
console.log('stable',await p.evaluate(()=>RS._dbg.builder.stable));await p.screenshot({path:'shots/g2.png'});
await p.click('#b_save');await sleep(300);
await p.evaluate(()=>RS._dbg.show('arms'));await sleep(500);await p.screenshot({path:'shots/g3.png'});
await p.evaluate(()=>RS._dbg.show('home'));await sleep(500);await p.screenshot({path:'shots/g4.png'});
await p.evaluate(()=>RS._dbg.show('build'));await sleep(1200);await p.click('#b_siege');await sleep(3000);await p.screenshot({path:'shots/g5.png'});
// disparo fuerte a la fortaleza propia
await p.mouse.move(300,250);await p.mouse.down();for(let i=1;i<=10;i++){await p.mouse.move(300-12*i,250+4*i);await sleep(20);}await sleep(100);await p.mouse.up();
await sleep(900);await p.screenshot({path:'shots/g6.png'});await sleep(5000);await p.screenshot({path:'shots/g7.png'});
console.log('errs',errs);await b.close();})();
