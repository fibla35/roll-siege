// trampas, refuerzos y formas de la 0.7
global.planck=require(__dirname+'/../www/js/planck.min.js');var RS=require(__dirname+'/../www/js/data.js');global.RS=RS;require(__dirname+'/../www/js/phys.js');
var I=RS.SHAPE_IDX, V=planck.Vec2, ok=0, bad=0;
function chk(n,c,info){console.log((c?'OK  ':'FALLO ')+n+(info!=null?' · '+info:''));c?ok++:bad++;}
function ball(P,x,y,vx,vy){var u=P.launch(0,V(x,y),Math.atan2(vy,vx),1);u.body.setLinearVelocity(V(vx,vy));return u;}
function run(P,n){for(var i=0;i<n;i++)P.step(1/60);}
// imán: tuerce el tiro hacia abajo
function flight(withMag){var P=new RS.Phys({pieces:withMag?[{s:I.iman,m:3,x:12,y:0.5}]:[],gems:[]});run(P,80);P.time=2;var u=ball(P,6,3,16,0);run(P,30);return u.body.getPosition();}
var a=flight(false),b=flight(true);chk('imán baja el tiro',b.y<a.y-0.4,'sin '+a.y.toFixed(2)+' con '+b.y.toFixed(2));
// pinchos: frenan en seco
var P=new RS.Phys({pieces:[{s:I.pinchos,m:3,x:12,y:0.5}],gems:[]});run(P,80);P.time=2;var u=ball(P,8,0.9,14,0);run(P,60);chk('pinchos frenan',Math.abs(u.body.getLinearVelocity().x)<2&&u.body.getPosition().x<12.5,'v '+u.body.getLinearVelocity().x.toFixed(2)+' x '+u.body.getPosition().x.toFixed(2));
// brea: se queda pegado
P=new RS.Phys({pieces:[{s:I.brea,m:3,x:12,y:0.5}],gems:[]});run(P,80);P.time=2;u=ball(P,12,4,0,-6);run(P,90);var q=u.body.getPosition();chk('brea pega',Math.abs(q.x-12)<1&&q.y<1.6&&u.body.getLinearVelocity().length()<1,'pos '+q.x.toFixed(2)+','+q.y.toFixed(2));
// muro: sube y bloquea
P=new RS.Phys({pieces:[{s:I.muro,m:1,x:14,y:0.75}],gems:[]});run(P,80);P.time=2;u=ball(P,5,1.2,16,0);run(P,90);chk('muro sube y bloquea',P.traps[0].up&&u.body.getPosition().x<13.4,'x '+u.body.getPosition().x.toFixed(2));
// escudo: queda el generador
P=new RS.Phys({pieces:[{s:I.escudo,m:4,x:10,y:1}],gems:[{x:10,y:RS.GEM_R,c:0}]});run(P,60);P.time=2;u=ball(P,5,0.8,16,0);run(P,90);chk('escudo se rompe y protege',P.traps[0].popped&&!P.gems[0].freed&&!P.traps[0].dead);
// cadena: ata dos torres
function towers(tie){var ps=[];[3,7].forEach(function(x){for(var y=0.5;y<6;y++)ps.push({s:I.cubo,m:0,x:x,y:y});});if(tie)ps.push({s:I.cadena,m:3,x:5,y:5.25,len:3});
 var P=new RS.Phys({pieces:ps,gems:[]});run(P,60);P.time=2;P.blocks.slice(0,6).forEach(function(bl){bl.body.applyLinearImpulse(V(-6*bl.body.getMass(),0),bl.body.getPosition(),true);});run(P,120);return P;}
var t0=towers(false),t1=towers(true);var top0=t0.blocks[5].body.getPosition().x,top1=t1.blocks[5].body.getPosition().x;
chk('cadena atada',t1.ties.length===1&&t1.ties[0].j,'');chk('cadena sujeta la torre',top1>top0+0.5,'sin '+top0.toFixed(2)+' con '+top1.toFixed(2));
// blindaje: el primer golpe solo abolla
P=new RS.Phys({pieces:[{s:I.blindaje,m:7,x:10,y:1,rot:1}],gems:[]});run(P,60);var bl=P.blocks[0];P.damage(bl,999,V(10,1));chk('blindaje aguanta el primer golpe',!bl.dead&&bl.dented&&bl.hp<bl.hp0*0.5);P.damage(bl,999,V(10,1));chk('y el segundo lo rompe',bl.dead);
// formas: estables apoyadas
['almena','arcog','rampa','escalon','cuarto','ruedag','trapecio','columna','vigat','pilar','abrazadera','cuna'].forEach(function(id){var sh=RS.SHAPES[I[id]];var P=new RS.Phys({pieces:[{s:I[id],m:sh.mat!=null?sh.mat:1,x:10,y:sh.h/2}],gems:[]});run(P,120);var p=P.blocks[0].body.getPosition();chk('forma '+id+' estable',Math.hypot(p.x-10,p.y-sh.h/2)<0.05,'');});
// goma rebota
function bounce(m){var P=new RS.Phys({pieces:[{s:I.bloque,m:m,x:10,y:0.5,}],gems:[]});run(P,60);P.time=2;var u=ball(P,10,4,0,-10);var mx=0;for(var i=0;i<90;i++){P.step(1/60);mx=Math.max(mx,u.body.getLinearVelocity().y);}return mx;}
var g=bounce(6),pd=bounce(1);chk('goma rebota más',g>pd*2,'goma '+g.toFixed(1)+' piedra '+pd.toFixed(1));
// rueda aplasta mapaches
console.log(ok+' bien, '+bad+' fallos');process.exit(bad?1:0);
