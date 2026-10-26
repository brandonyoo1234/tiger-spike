/* ===== ultimate spikes: scripted, flashy ball paths that nobody can touch until they land =====
   Each ULT drives the ball along waypoints (gravity off) and gets tick / land / draw hooks.
   While B.ult.lock is set, defenders and blockers can't touch the ball. */
const headY=P=>FLOOR-P.h-168;
const oppsOf=P=>TM[1-P.team].players;
const zapSnd=()=>{AU.noise(.25,5000,.18,'highpass');AU.tone(1400,.18,'sawtooth',.1,-900)};
const bonkSnd=()=>{AU.tone(1800,.08,'square',.16,-600);AU.tone(420,.3,'triangle',.22,-200,.03);AU.noise(.12,2500,.2,'bandpass')};
// pick the defender who is easiest to hit: on the ground, closest to mid-court
function headTarget(P){const d=dirOf(P.team),mid=NETX+d*480;let best=null,bv=1e9;
 for(const q of oppsOf(P)){const v=Math.abs(q.x-mid)+(q.h>0?300:0);if(v<bv){bv=v;best=q}}return best}
// waypoints: the ball flies point to point at `sp`, a waypoint can also hold the ball still for `hold` seconds
function wp(x,y,sp,o){return Object.assign({x,y,sp},o||{})}
function overNet(P,x0,y0,d){return (NETX-x0)*d>40||y0>NETTOP-70?[wp(NETX+d*30,NETTOP-110,3400)]:[]}
function follow(B,u,h){const w=u.path[u.i];if(!w)return;
 if(w.hold){B.vx=B.vy=0;B.gs=0;w.ht=(w.ht||0)+h;if(w.ht>=w.hold){u.i++;w.on&&w.on(B,u)}return}
 if(w.home){w.x=w.home.x+w.home.face*8;w.y=headY(w.home)}
 const dx=w.x-B.x,dy=w.y-B.y,l=Math.hypot(dx,dy);
 if(l<w.sp*h*1.2+2&&!w.floor){B.x=w.x;B.y=w.y;u.i++;w.on&&w.on(B,u);return}
 B.gs=0;B.vx=dx/l*w.sp;B.vy=dy/l*w.sp}
const floorPt=(x,sp)=>wp(x,FLOOR+40,sp,{floor:true});
const stunP=(q,t,k)=>{q.stun=Math.max(q.stun,t);q.swing=null;q.pending=null;q.dive=null;q[k||'zap']=t};
function shockwave(x,d,pow,col){
 FX.ring(x,FLOOR-4,10,700*pow,'#ffffff',.6,8);FX.ring(x,FLOOR-4,10,1000*pow,col,.9,4);
 FX.burst(x,FLOOR-6,40,{col:'#d9c9a8',v0:200,v1:900*pow,ang:-Math.PI/2,spread:1.5,l0:.3,l1:.8,s0:3,s1:9,drag:2.5,add:false,kind:'dot'});
 FX.burst(x,FLOOR-6,26,{col,v0:400,v1:1500*pow,ang:-Math.PI/2,spread:1.4,l0:.2,l1:.5,s0:2,s1:5,drag:3,kind:'streak'});
 for(const q of G.players){if(Math.abs(q.x-x)<900*pow&&(q.x-NETX)*d>0){q.vh=Math.max(q.vh,420+380*pow);q.h=Math.max(q.h,1);stunP(q,1.1,'bonk');q.vx=sgn(q.x-x||1)*500}}
 shake(24*pow);flash('#ffffff',.5);impactFrame(.12);hitstop(.1);AU.boom();AU.boom()}
function megaPop(B,x,d,col){B.vy=-3300;B.vx=d*240;B.gs=1;
 FX.ring(x,FLOOR-4,10,300,'#ffffff',.4,10);FX.ring(x,FLOOR-4,10,480,col,.7,5);
 FX.add({x,y:FLOOR-30,kind:'glow',s:220,s1:10,life:.35,col:'#ffffff',drag:0});
 for(let i=0;i<26;i++){const a=-Math.PI/2+rnd(-.35,.35),sp=rnd(1400,3000);FX.add({x,y:FLOOR-10,vx:Math.cos(a)*sp,vy:Math.sin(a)*sp,drag:3,life:rnd(.25,.5),s:rnd(3,6),col:i%2?col:'#ffffff',kind:'streak'})}
 FX.text(x,FLOOR-220,'MEGA BOUNCE!','#ffe27a',64,1.4);AU.tone(90,.8,'sine',.6,260);shake(26);hitstop(.12)}
function skyBolt(x,y,col,w){FX.bolt(x+rnd(-60,60),-260,x,y,'#ffffff',.22,w+2,40);FX.bolt(x+rnd(-80,80),-260,x,y,col,.3,w,55);FX.add({x,y,kind:'glow',s:90,s1:8,life:.25,col,drag:0})}
function bonk(B,u,q,d){const col=u.P.ch.fx;
 stunP(q,1.7,'bonk');q.vx=d*420;
 FX.text(q.x,headY(q)-70,'BONK!!','#ffe27a',70,1.3);
 for(let i=0;i<14;i++)FX.add({x:B.x,y:B.y,vx:rnd(-700,700),vy:rnd(-900,-200),ay:1500,life:rnd(.5,.9),s:rnd(8,14),col:i%3?'#ffe27a':'#ffffff',kind:'star',vr:rnd(-12,12)});
 FX.ring(B.x,B.y,8,160,'#ffffff',.3,8);FX.ring(B.x,B.y,8,240,col,.5,4);
 B.x=q.x+q.face*6;B.y=headY(q)-26;B.vx=d*150;B.vy=-1150;B.gs=1;
 bonkSnd();AU.boom();hitstop(.16);slowmo(.25,.6);impactFrame(.12);shake(18);flash('#ffffff',.35);
 D.focus={kind:'player',P:q,z:1.45};after(.6,()=>{if(D.focus&&D.focus.P===q)D.focus={kind:'ball',z:1}})}

const ULT={
 tornado:{n:'Tornado Spike',tier:'epic',d:'The ball rips across the net inside a spinning cyclone that wobbles past every defender.',
  launch(P,x0,y0,d){return{path:[...overNet(P,x0,y0,d),floorPt(NETX+d*rnd(560,760),2300)]}},
  tick(B,u,h){B.y+=Math.cos(u.t*30)*1100*h*Math.max(0,1-u.t*1.2);B.x+=Math.sin(u.t*30)*500*h;
   if(Math.random()<h*70){const a=u.t*30+rnd(0,6);FX.add({x:B.x+Math.cos(a)*50,y:B.y+Math.sin(a)*30,vx:-Math.sin(a)*500,vy:Math.cos(a)*300,life:.3,s:3,col:'#d8f6ff',kind:'streak',drag:3})}
   if(Math.random()<h*14)FX.ring(B.x,B.y,10,70,'#bff0ff',.25,2)},
  land(B,u,x,d){FX.burst(x,FLOOR-40,30,{col:'#d8f6ff',v0:300,v1:900,ang:-Math.PI/2,spread:1.6,l0:.3,l1:.6,s0:2,s1:4,drag:3,kind:'streak'});FX.ring(x,FLOOR-30,10,260,'#bff0ff',.5,5);shake(14);
   for(const q of oppsOf(u.P))if(Math.abs(q.x-x)<320){q.vx=sgn(q.x-x||1)*900;stunP(q,.6,'bonk')}}},
 quake:{n:'Earthquake Slam',tier:'epic',d:'A crushing downward smash. When it lands a shockwave throws every nearby defender off their feet.',
  launch(P,x0,y0,d){return{path:[...overNet(P,x0,y0,d),floorPt(NETX+d*rnd(330,480),3700)]}},
  tick(B,u,h){if(Math.random()<h*50)FX.add({x:B.x,y:B.y,life:.3,s:16,s1:2,col:'#ffb35a',kind:'glow',drag:0})},
  land(B,u,x,d){shockwave(x,d,.75,'#ffb35a');FX.text(x,FLOOR-200,'EARTHQUAKE!','#ffb35a',56,1.2)}},
 megabounce:{n:'Mega Bounce',tier:'legendary',d:'Hammered into the floor so hard it rockets back into the sky. A crater is left where it hit.',
  launch(P,x0,y0,d){return{path:[...overNet(P,x0,y0,d),floorPt(NETX+d*rnd(250,380),4600)]}},
  tick(B,u,h){if(Math.random()<h*60)FX.add({x:B.x,y:B.y,life:.25,s:18,s1:2,col:u.P.ch.fx,kind:'glow',drag:0})},
  land(B,u,x,d){megaPop(B,x,d,u.P.ch.fx);for(const q of oppsOf(u.P))if(Math.abs(q.x-x)<260)stunP(q,1,'bonk')}},
 skull:{n:'Skull Crusher',tier:'legendary',d:'The spike locks onto a defender and smashes off their head. BONK. They\'re seeing stars and the ball drops dead.',
  launch(P,x0,y0,d){const q=headTarget(P);stunP(q,.55,'fear');return{q,path:[...overNet(P,x0,y0,d),wp(0,0,3600,{home:q,on:(B,u)=>{bonk(B,u,q,d);u.free=1}})]}},
  tick(B,u,h){if(!u.free&&Math.random()<h*60)FX.add({x:B.x,y:B.y,life:.2,s:14,s1:2,col:'#ff5a6a',kind:'glow',drag:0})},
  draw(g,B,u){if(u.free||!u.q)return;const q=u.q,x=q.x,y=headY(q),r=36+Math.sin(D.clock*20)*4;
   g.save();g.strokeStyle='#ff4060';g.lineWidth=3;g.globalAlpha=.85;g.beginPath();g.arc(x,y,r,0,7);g.moveTo(x-r-12,y);g.lineTo(x-r+8,y);g.moveTo(x+r-8,y);g.lineTo(x+r+12,y);g.moveTo(x,y-r-12);g.lineTo(x,y-r+8);g.moveTo(x,y+r-8);g.lineTo(x,y+r+12);g.stroke();g.restore()}},
 phoenix:{n:'Phoenix Dive',tier:'legendary',d:'The ball soars into the sky wrapped in fire, spreads its wings, then dives like a falling star.',
  launch(P,x0,y0,d){return{path:[wp(x0+d*80,80,2600),wp(0,0,0,{hold:.28,on:B=>{FX.ring(B.x,B.y,10,220,'#ff7a18',.4,6);AU.tone(300,.4,'sawtooth',.2,600);shake(8)}}),floorPt(NETX+d*rnd(420,720),4400)]}},
  tick(B,u,h){if(Math.random()<h*90){FX.add({x:B.x+rnd(-8,8),y:B.y+rnd(-8,8),vx:rnd(-80,80),vy:rnd(-160,-40),life:rnd(.25,.45),s:rnd(14,24),s1:2,col:Math.random()<.5?'#ff7a18':'#ffd23d',kind:'glow',drag:1})}},
  draw(g,B,u){const fl=1+Math.sin(D.clock*26)*.15,s=u.i>=2?1.5:1.1;g.save();g.translate(B.x,B.y);g.globalCompositeOperation='lighter';
   for(const sd of[-1,1]){g.fillStyle=sd<0?'rgba(255,120,24,.55)':'rgba(255,210,61,.5)';g.beginPath();g.moveTo(0,0);g.quadraticCurveTo(sd*70*s,-90*fl*s,sd*150*s,-40*s);g.quadraticCurveTo(sd*90*s,-20*s,sd*120*s,10*s);g.quadraticCurveTo(sd*60*s,0,0,0);g.fill()}
   g.restore()},
  land(B,u,x,d){for(let i=0;i<30;i++)FX.add({x:x+rnd(-40,40),y:FLOOR-10,vx:rnd(-120,120),vy:rnd(-1400,-500),drag:1.5,life:rnd(.4,.8),s:rnd(16,30),s1:2,col:i%2?'#ff7a18':'#ffd23d',kind:'glow'});
   FX.ring(x,FLOOR-4,10,380,'#ff7a18',.6,6);shake(18);flash('#ff9b3d',.3);AU.boom();for(const q of oppsOf(u.P))if(Math.abs(q.x-x)<300)stunP(q,.8,'bonk')}},
 blackhole:{n:'Black Hole',tier:'mythic',d:'The ball stops dead over their court and becomes a black hole, dragging every defender in, then crushes straight down.',
  launch(P,x0,y0,d){const hx=NETX+d*rnd(420,560);return{hx,path:[...overNet(P,x0,y0,d),wp(hx,300,3000),wp(0,0,0,{hold:1.05,on:B=>{FX.ring(B.x,B.y,300,4,'#c07bff',.3,6);flash('#000000',.4);AU.boom()}}),floorPt(hx,5600)]}},
  tick(B,u,h){const w=u.path[u.i];if(w&&w.hold){const k=w.ht/w.hold;
    for(const q of oppsOf(u.P)){q.x=lerp(q.x,u.hx,Math.min(1,h*2.2));q.stun=Math.max(q.stun,.2);if(Math.random()<h*4)q.zap=.3}
    if(Math.random()<h*120){const a=rnd(0,7),r=rnd(140,300);FX.add({x:B.x+Math.cos(a)*r,y:B.y+Math.sin(a)*r*.6,vx:-Math.cos(a)*r*2.6+Math.sin(a)*400,vy:-Math.sin(a)*r*1.6-Math.cos(a)*240,life:.38,s:rnd(2,4),col:Math.random()<.5?'#c07bff':'#7fd8ff',kind:'streak',drag:0})}
    if(Math.random()<h*6)FX.bolt(B.x,B.y,B.x+rnd(-260,260),B.y+rnd(-200,200),'#c07bff',.12,2,26);
    CAM.dim=Math.max(CAM.dim,.35*k);shake(3)}},
  draw(g,B,u){const w=u.path[u.i];if(!w||!w.hold&&u.i<u.path.length-1&&u.i<2)return;const k=w.hold?Math.min(1,w.ht/.3):.7,R=(w.hold?100:50)*k,t=D.clock;
   g.save();g.translate(B.x,B.y);g.globalCompositeOperation='lighter';
   for(let i=0;i<3;i++){g.strokeStyle=['#c07bff','#7fd8ff','#ff7bd8'][i];g.lineWidth=5-i;g.globalAlpha=.7;g.beginPath();g.ellipse(0,0,R*(1.9+i*.35),R*(.55+i*.12),t*(2+i)*.6,0,7);g.stroke()}
   g.globalCompositeOperation='source-over';g.globalAlpha=1;const gr=g.createRadialGradient(0,0,R*.2,0,0,R*1.1);gr.addColorStop(0,'#000');gr.addColorStop(.75,'#05000c');gr.addColorStop(1,'rgba(90,30,160,0)');g.fillStyle=gr;g.beginPath();g.arc(0,0,R*1.1,0,7);g.fill();g.restore()},
  land(B,u,x,d){FX.ring(x,FLOOR-4,500,6,'#c07bff',.35,8);after(.18,()=>shockwave(x,d,1,'#c07bff'));FX.text(x,FLOOR-230,'SINGULARITY','#c07bff',60,1.4)}},
 zeus:{n:'Wrath of Zeus',tier:'mythic',d:'Hangs in the air charging with lightning, strikes every defender with a bolt, then fires like a thunderbolt.',
  launch(P,x0,y0,d){return{path:[wp(0,0,0,{hold:.5,on:(B,u)=>{for(const q of oppsOf(P)){skyBolt(q.x,headY(q),'#7fd8ff',4);FX.bolt(B.x,B.y,q.x,headY(q),'#ffffff',.25,3,30);stunP(q,1.4,'zap')}flash('#bff0ff',.6);zapSnd();AU.boom();shake(16)}}),...overNet(P,x0,y0,d),floorPt(NETX+d*rnd(520,720),6000)]}},
  tick(B,u,h){const w=u.path[u.i];if(w&&w.hold){if(Math.random()<h*16)skyBolt(B.x,B.y,'#7fd8ff',3);if(Math.random()<h*10)zapSnd();CAM.dim=Math.max(CAM.dim,.4)}
   else if(Math.random()<h*40)FX.bolt(B.x,B.y,B.x-B.vx*.03+rnd(-20,20),B.y-B.vy*.03+rnd(-20,20),'#bff0ff',.1,3,18)},
  draw(g,B,u){g.save();g.globalCompositeOperation='lighter';glow(g,B.x,B.y,BR*4,'#7fd8ff',.6);g.restore()},
  land(B,u,x,d){skyBolt(x,FLOOR-10,'#7fd8ff',9);skyBolt(x+60,FLOOR-10,'#ffffff',5);shockwave(x,d,.8,'#7fd8ff');FX.text(x,FLOOR-230,'THUNDERSTRUCK','#bff0ff',58,1.3)}},
 godspike:{n:'God Spike',tier:'mythic',d:'Brandon only. Charges with lightning and zaps everyone, smashes a defender\'s head, then mega-bounces with an earthquake.',
  launch(P,x0,y0,d){const q=headTarget(P);return{q,path:[wp(0,0,0,{hold:.42,on:(B,u)=>{for(const o of oppsOf(P)){skyBolt(o.x,headY(o),'#ffd23d',4);if(o!==q)stunP(o,1.6,'zap')}stunP(q,.6,'fear');flash('#fff2b0',.6);zapSnd();AU.boom();shake(16)}}),...overNet(P,x0,y0,d),wp(0,0,4200,{home:q,on:(B,u)=>{bonk(B,u,q,d);u.free=1;B.vy=-900}})]}},
  tick(B,u,h){const w=u.path[u.i];if(w&&w.hold){if(Math.random()<h*18)skyBolt(B.x,B.y,Math.random()<.5?'#ffd23d':'#ffffff',3);CAM.dim=Math.max(CAM.dim,.45)}
   else{if(Math.random()<h*90)FX.add({x:B.x,y:B.y,life:.3,s:20,s1:2,col:hsl(D.clock*600%360,100,65),kind:'glow',drag:0});if(Math.random()<h*30)FX.bolt(B.x,B.y,B.x+rnd(-90,90),B.y+rnd(-90,90),'#ffd23d',.1,2,18)}},
  draw(g,B,u){g.save();g.globalCompositeOperation='lighter';glow(g,B.x,B.y,BR*4.5,hsl(D.clock*500%360,100,65),.55);g.restore();ULT.skull.draw(g,B,u)},
  land(B,u,x,d){megaPop(B,x,d,'#ffd23d');shockwave(x,d,1.1,'#ffd23d');skyBolt(x,FLOOR-10,'#ffffff',10);FX.text(x,FLOOR-300,'GOD SPIKE','#ffd23d',80,1.6)}},
 // setter: a lightning hammer slams the second touch straight down over the net
 hammer:{n:'Thunder Hammer',tier:'legendary',set:1,d:'Instead of setting, a giant lightning hammer slams the 2nd touch straight down just over the net. Unstoppable.',
  launch(P,x0,y0,d){return{path:[wp(x0+d*20,Math.min(y0,NETTOP-150)-60,2200),wp(0,0,0,{hold:.3,on:B=>{skyBolt(B.x,B.y,'#ffd23d',6);zapSnd();shake(12)}}),wp(NETX+d*30,NETTOP-70,5000),floorPt(NETX+d*rnd(110,220),5000)]}},
  draw(g,B,u){if(u.i>2)return;const w=u.path[u.i],k=w&&w.hold?Math.min(1,w.ht/.15):u.i<1?.4:1;g.save();g.translate(B.x,B.y-60*k);g.rotate(-.5*(1-k)*dirOf(u.P.team));g.globalAlpha=.9*k;
   g.fillStyle='#fff2b0';g.fillRect(-8,-10,16,-110*k);g.fillStyle='#ffd23d';g.fillRect(-52,-130*k,104,-60*k);g.strokeStyle='#ffffff';g.lineWidth=3;g.strokeRect(-52,-130*k,104,-60*k);g.restore()},
  tick(B,u,h){if(Math.random()<h*25)FX.bolt(B.x,B.y-100,B.x+rnd(-80,80),B.y+rnd(-40,60),'#ffd23d',.1,2,16)},
  land(B,u,x,d){skyBolt(x,FLOOR-10,'#ffd23d',8);shockwave(x,d,.55,'#ffd23d');FX.text(x,FLOOR-200,'HAMMER DOWN','#ffd23d',54,1.2)}},
 // libero: a dome shield turns the receive into an instant counter-kill
 aegis:{n:'Aegis Counter',tier:'legendary',rec:1,d:'A golden dome shield blocks the spike and fires it straight back over the net as an unstoppable kill.',
  launch(P,x0,y0,d){FX.ring(P.x,FLOOR-80,20,180,'#ffe27a',.5,8);FX.ring(P.x,FLOOR-80,20,260,'#ffffff',.35,4);shake(10);AU.tone(880,.4,'triangle',.2,440);
   return{sx:P.x,path:[wp(x0-d*10,y0-30,0,{hold:.3}),wp(NETX-d*120,NETTOP-150,3600),floorPt(NETX+d*rnd(520,760),4600)]}},
  draw(g,B,u){const w=u.path[0];if(u.i>0&&!(u.i===1))return;const k=u.i===0?Math.min(1,(w.ht||0)/.12):Math.max(0,1-u.t*1.5);if(k<=0)return;
   g.save();g.globalCompositeOperation='lighter';g.globalAlpha=.6*k;g.strokeStyle='#ffe27a';g.lineWidth=5;g.beginPath();g.arc(u.sx,FLOOR,170,Math.PI,0);g.stroke();
   g.globalAlpha=.18*k;g.fillStyle='#ffe27a';g.beginPath();g.arc(u.sx,FLOOR,170,Math.PI,0);g.fill();g.globalAlpha=.4*k;
   for(let i=0;i<6;i++){const a=Math.PI+i/5*Math.PI;g.beginPath();g.moveTo(u.sx,FLOOR);g.lineTo(u.sx+Math.cos(a)*170,FLOOR+Math.sin(a)*170);g.stroke()}g.restore()},
  tick(B,u,h){if(u.i>0&&Math.random()<h*50)FX.add({x:B.x,y:B.y,life:.25,s:16,s1:2,col:'#ffe27a',kind:'glow',drag:0})},
  land(B,u,x,d){FX.ring(x,FLOOR-4,10,320,'#ffe27a',.5,6);shake(16);flash('#fff2b0',.3);AU.boom();FX.text(x,FLOOR-200,'COUNTER!','#ffe27a',56,1.2)}}};

const ULT_TOP=['skull','megabounce','phoenix','blackhole','zeus','godspike'];
const isSpkAct=id=>SPK_ACT.includes(id)||!!(ULT[id]&&!ULT[id].set&&!ULT[id].rec);
// the ABIL cards for every new skill (+ two new active skills handled in game.js)
for(const k in ULT)ABIL[k]={n:ULT[k].n,k:'act',d:ULT[k].d,how:ULT[k].set?'SET WITH A PERFECT TOUCH':ULT[k].rec?'RECEIVE WITH A PERFECT TOUCH':'SPIKE WITH A PERFECT HIT'};
Object.assign(ABIL,{
 setkill:ABIL.hammer,
 ignite:{n:'Ignite Set',k:'act',d:'A blazing set that sets your spiker on fire: their next hit becomes a Phoenix Dive (or their own skill if it\'s stronger).',how:'SET WITH A PERFECT TOUCH'},
 flash:{n:'Flash Step',k:'act',d:'With HYPE full, if a ball is about to land out of reach you teleport under it in a flash of lightning and receive it perfectly.',how:'AUTOMATIC WHEN HYPE IS FULL'}});

function startUlt(B,id,P,x0,y0,d){const U=ULT[id],st=U.launch(P,x0,y0,d);B.ult=Object.assign({id,t:0,P,d,i:0,lock:true},st);B.unstop=true;B.vx=B.vy=0;B.gs=0}
// per substep: move along the path + the ult's own effects
function ULTstep(B,h){const u=B.ult;if(!u||u.done)return;u.t+=h;
 if(!u.free)follow(B,u,h);const U=ULT[u.id];U.tick&&U.tick(B,u,h)}
function ULTland(B,x){const u=B.ult;if(!u||u.done)return;u.done=true;const U=ULT[u.id];U.land&&U.land(B,u,x,u.d)}
function ULTdraw(g){const B=ball,u=B.ult;
 if(u&&!u.done){const U=ULT[u.id];U.draw&&U.draw(g,B,u)}
 // status: dizzy stars (bonk), electric crackle (zap), a red "!" (fear)
 for(const q of G.players){const y=headY(q)-30;
  if(q.bonk>0){for(let i=0;i<4;i++){const a=D.clock*5+i*Math.PI/2;g.save();g.translate(q.x+Math.cos(a)*34,y+Math.sin(a)*9);g.rotate(D.clock*4+i);g.fillStyle=i%2?'#ffe27a':'#ffffff';g.beginPath();for(let k=0;k<10;k++){const r=k%2?4:10,b=k*Math.PI/5;g.lineTo(Math.cos(b)*r,Math.sin(b)*r)}g.fill();g.restore()}}
  if(q.zap>0){if(Math.random()<.5)FX.bolt(q.x+rnd(-30,30),y-20+rnd(-20,20),q.x+rnd(-40,40),y+80+rnd(0,80),'#bff0ff',.06,2,12)}
  if(q.fear>0){g.save();g.fillStyle='#ff4060';g.font='bold 40px sans-serif';g.textAlign='center';g.fillText('!',q.x,y-30);g.restore()}}}
// Flash Step: the human libero teleports under a ball that would otherwise land out of reach
function ULTframe(dt){const B=ball;
 for(const q of G.players){if(q.bonk>0)q.bonk-=dt;if(q.zap>0)q.zap-=dt;if(q.fear>0)q.fear-=dt}
 for(const H of G.players){
 if(!H.in||H.role!=='L'||H.ch.act!=='flash'||H.hype<100||!B.live||B.serving||B.ult&&B.ult.lock)continue;
 if(B.lastTeam===H.team||H.dive||H.h>0||H.stun>0||(H.swing&&!H.swing.done)||G.state!=='rally')continue;
 const d=dirOf(H.team),e=etaY(FLOOR-150);if(e===null||e>.05)continue;const b=ballAt(e);if((b.x-NETX)*d>-60||b.x<LINE_L-40||b.x>LINE_R+40)continue;
 const tx=b.x+d*28;if(Math.abs(tx-H.x)<110)continue;
 FX.bolt(H.x,FLOOR-100,tx,FLOOR-100,'#7fd8ff',.3,5,26);FX.bolt(H.x,FLOOR-60,tx,FLOOR-140,'#ffffff',.25,2,30);
 for(let i=0;i<6;i++)FX.add({x:lerp(H.x,tx,i/5),y:FLOOR-90,kind:'glow',s:60,s1:4,life:.3,col:'#7fd8ff',drag:0});
 FX.text(tx,FLOOR-260,'FLASH STEP','#7fd8ff',44,.9);zapSnd();
 H.x=tx;H.vx=0;H.face=d;const s=H.swing={t:.1,pose:'bump',best:0,pd:0,done:true,R:70,dur:SWING};hitBall(H,s,0);return}}
