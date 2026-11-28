global.planck=require(''+__dirname+'/../www/js/planck.min.js');var RS=require(''+__dirname+'/../www/js/data.js');global.RS=RS;require(''+__dirname+'/../www/js/phys.js');require(''+__dirname+'/../www/js/levels.js');
var I=RS.SHAPE_IDX, V=planck.Vec2;
function ball(P,x,y,vx,vy){var b=P.world.createBody({type:'dynamic',position:V(x,y),bullet:true});b.createFixture(planck.Circle(0.4),{density:3});b.setLinearVelocity(V(vx,vy));var u={body:b,ghostT:0,mult:1,dead:false};b.setUserData({ball:true});P.balls.push(u);return b;}
try{
var P=new RS.Phys({pieces:[{s:I.escudo,m:4,x:10,y:1}],gems:[{x:10,y:RS.GEM_R,c:0}]});for(var i=0;i<60;i++)P.step(1/60);
var b=ball(P,5,0.6,18,0);for(var i=0;i<120;i++)P.step(1/60);var g=P.gems[0].body.getPosition();console.log('escudo: la gema se mueve',Math.hypot(g.x-10,g.y-RS.GEM_R).toFixed(2),'m · escudo usado',!!P.traps[0].popped,'· bola en x',b.getPosition().x.toFixed(1));
var P2=new RS.Phys({pieces:[],gems:[{x:10,y:RS.GEM_R,c:0}]});var b2=ball(P2,5,0.6,18,0);for(var i=0;i<120;i++)P2.step(1/60);var g2=P2.gems[0].body.getPosition();console.log('sin escudo: la gema se mueve',Math.hypot(g2.x-10,g2.y-RS.GEM_R).toFixed(2),'m');
}catch(e){console.log('ERR escudo',e.message.slice(0,200))}
function fall(rot){var Q=new RS.Phys({pieces:[{s:I.ventilador,m:3,x:10,y:0.5,rot:rot}],gems:[]});var b=ball(Q,10,7,0,0);for(var i=0;i<40;i++)Q.step(1/60);return b.getLinearVelocity().y.toFixed(1)}
try{console.log('caída: ventilador normal',fall(0),'· ventilador hacia arriba',fall(1));}catch(e){console.log('ERR fan',e.message.slice(0,200))}
try{var ps=[];for(var y=0.5;y<4;y++)ps.push({s:I.cubo,m:1,x:12.5,y:y});ps.push({s:I.muelle,m:3,x:11.5,y:2.5,weld:true,wall:true});
var W=new RS.Phys({pieces:ps,gems:[]});for(var i=0;i<300;i++)W.step(1/60);var sp=W.blocks[W.blocks.length-1].body.getPosition();console.log('muelle colgado: se mueve',Math.hypot(sp.x-11.5,sp.y-2.5).toFixed(2));}catch(e){console.log('ERR muelle',e.message.slice(0,200))}
