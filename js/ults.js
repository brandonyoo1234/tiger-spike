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
 if(w.curve)return curveStep(B,u,w,h);
 const dx=w.x-B.x,dy=w.y-B.y,l=Math.hypot(dx,dy);
 if(l<w.sp*h*1.2+2&&!w.floor){B.x=w.x;B.y=w.y;u.i++;w.on&&w.on(B,u);return}
 B.gs=0;B.vx=dx/l*w.sp;B.vy=dy/l*w.sp}
// a direct line to the target; if that line would clip the net it bends up just enough to skim over the tape (quadratic bezier)
function curveStep(B,u,w,h){if(!w.p0)w.p0={x:B.x,y:B.y},w.s=0;const p0=w.p0,x2=w.x,y2=w.y;let cx=(p0.x+x2)/2,cy=(p0.y+y2)/2;
 const a=(NETX-p0.x)*u.d,b=(x2-NETX)*u.d;
 if(a>0&&b>0){const t=1/(1+Math.sqrt(b/Math.max(a,20))),yl=lerp(p0.y,y2,a/(a+b)),Y=NETTOP-70;
  if(yl>Y){const k=2*t*(1-t);cx=NETX;cy=(Y-(1-t)*(1-t)*p0.y-t*t*y2)/k}}
 const L=(Math.hypot(cx-p0.x,cy-p0.y)+Math.hypot(x2-cx,y2-cy)+Math.hypot(x2-p0.x,y2-p0.y))/2;
 w.s=Math.min(1,w.s+w.sp*h/Math.max(L,1));const t=w.s,m=1-t,nx=m*m*p0.x+2*m*t*cx+t*t*x2,ny=m*m*p0.y+2*m*t*cy+t*t*y2;
 B.gs=0;B.vx=(nx-B.x)/h;B.vy=(ny-B.y)/h;B.x=nx;B.y=ny;if(t>=1){u.i++;w.on&&w.on(B,u)}}
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
// SKULL CRACK: the ball smashes off the defender's head, their skull "cracks" (cartoon), the point is scored on the spot and the ball rockets away
function skullFX(x,y,col,big){
 for(let i=0;i<9;i++){const a=i/9*6.28+rnd(-.2,.2),r=rnd(70,130)*(big?1.4:1);FX.bolt(x,y,x+Math.cos(a)*r,y+Math.sin(a)*r,i%2?'#ffffff':col,.45,3,12)}
 for(let i=0;i<22;i++)FX.add({x,y,vx:rnd(-900,900),vy:rnd(-1100,-150),ay:2200,life:rnd(.5,1),s:rnd(8,16),col:i%3?'#f4ecd8':'#ffffff',kind:'shard',vr:rnd(-14,14),add:false});
 for(let i=0;i<12;i++)FX.add({x,y,vx:rnd(-700,700),vy:rnd(-900,-200),ay:1500,life:rnd(.5,.9),s:rnd(8,14),col:i%3?'#ffe27a':'#ffffff',kind:'star',vr:rnd(-12,12)});
 FX.add({x,y,kind:'glow',s:big?260:180,s1:10,life:.3,col:'#ffffff',drag:0});
 FX.ring(x,y,8,big?320:220,'#ffffff',.35,9);FX.ring(x,y,8,big?440:300,col,.55,4);
 FX.text(x,y-110,'CRACK!!','#ffffff',big?96:80,1.3);
 bonkSnd();AU.noise(.3,900,.35,'lowpass');AU.boom();AU.boom();shake(big?30:22);flash('#ffffff',.45);impactFrame(.16);hitstop(.2);slowmo(.35,.7)}
function bonk(B,u,q,d,keep){const col=u.P.ch.fx;
 stunP(q,2.2,'bonk');q.crack=1.6;q.vx=d*520;q.vh=Math.max(q.vh,260);q.h=Math.max(q.h,1);
 B.x=q.x+q.face*6;B.y=headY(q)-26;skullFX(B.x,B.y,col,keep);
 nev({k:'skull',x:Math.round(B.x),y:Math.round(B.y),p:q.id,big:keep?1:0});
 // ricochet: far up and away toward the back of their court, then it bounces on like any dead ball
 B.vx=d*rnd(950,1150);B.vy=-rnd(1350,1550);B.gs=1;B.vr=d*40;
 if(!keep)u.done=true;B.dead=true;scorePoint(u.P.team,'SMASH');
 D.focus={kind:'player',P:q,z:1.5};after(.7,()=>{if(D.focus&&D.focus.P===q)D.focus={kind:'ball',z:.9}})}

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
 skull:{n:'Skull Crusher',tier:'legendary',d:'The spike locks onto a defender and flies straight at their head. CRACK. The point is yours and the ball rockets off into the stands.',
  launch(P,x0,y0,d){const q=headTarget(P);stunP(q,.55,'fear');return{q,path:[wp(0,0,3400,{home:q,curve:1,on:(B,u)=>{bonk(B,u,q,d);u.free=1}})]}},
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
 godspike:{n:'God Spike',tier:'mythic',d:'Brandon only. Charges with lightning and zaps everyone, cracks a defender\'s skull for the point, then the ball mega-bounces with an earthquake.',
  launch(P,x0,y0,d){const q=headTarget(P);return{q,path:[wp(0,0,0,{hold:.42,on:(B,u)=>{for(const o of oppsOf(P)){skyBolt(o.x,headY(o),'#ffd23d',4);if(o!==q)stunP(o,1.6,'zap')}stunP(q,.6,'fear');flash('#fff2b0',.6);zapSnd();AU.boom();shake(16)}}),wp(0,0,4000,{home:q,curve:1,on:(B,u)=>{bonk(B,u,q,d,1);u.free=1;B.vx=d*420;B.vy=-700}})]}},
  tick(B,u,h){if(u.free){if(B.vy>0&&B.y>=FLOOR-BR-1){B.y=FLOOR-BR;u.done=true;ULT.godspike.land(B,u,B.x,u.d)}return}
   const w=u.path[u.i];if(w&&w.hold){if(Math.random()<h*18)skyBolt(B.x,B.y,Math.random()<.5?'#ffd23d':'#ffffff',3);CAM.dim=Math.max(CAM.dim,.45)}
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
function ULTdraw(g){const B=ball,u=B.ult;mythDraw(g);
 if(u&&!u.done){const U=ULT[u.id];U.draw&&U.draw(g,B,u)}
 // status: dizzy stars (bonk), electric crackle (zap), a red "!" (fear)
 for(const q of G.players){const y=headY(q)-30;
  if(q.bonk>0){for(let i=0;i<4;i++){const a=D.clock*5+i*Math.PI/2;g.save();g.translate(q.x+Math.cos(a)*34,y+Math.sin(a)*9);g.rotate(D.clock*4+i);g.fillStyle=i%2?'#ffe27a':'#ffffff';g.beginPath();for(let k=0;k<10;k++){const r=k%2?4:10,b=k*Math.PI/5;g.lineTo(Math.cos(b)*r,Math.sin(b)*r)}g.fill();g.restore()}}
  if(q.zap>0){if(Math.random()<.5)FX.bolt(q.x+rnd(-30,30),y-20+rnd(-20,20),q.x+rnd(-40,40),y+80+rnd(0,80),'#bff0ff',.06,2,12)}
  if(q.crack>0)drawCrack(g,q);
  if(q.fear>0){g.save();g.fillStyle='#ff4060';g.font='bold 40px sans-serif';g.textAlign='center';g.fillText('!',q.x,y-30);g.restore()}}}
// cartoon cracked skull over a bonked player's head: it pops in, a zigzag crack splits it and the halves fall apart
function drawCrack(g,q){const T=1.6-q.crack,x=q.x,y=headY(q)-96,pop=T<.12?T/.12*1.25:T<.22?lerp(1.25,1,(T-.12)/.1):1,sp=Math.max(0,T-.35)*90,a=Math.min(1,q.crack*2.5);
 g.save();g.translate(x,y);g.scale(pop,pop);g.globalAlpha=a;g.lineJoin='round';
 for(const sd of[-1,1]){g.save();g.translate(sd*sp,sp*sp*.012);g.rotate(sd*Math.min(.6,sp*.006));
  g.beginPath();g.moveTo(0,-34);if(sd<0){g.arc(0,-4,30,-Math.PI/2,Math.PI,true);g.lineTo(-18,26);g.lineTo(-4,26)}else{g.arc(0,-4,30,-Math.PI/2,0);g.lineTo(18,26);g.lineTo(4,26)}
  const zz=[[0,-34],[6,-22],[-5,-10],[7,2],[-4,14],[4,26]];for(let i=zz.length-1;i>=0;i--)g.lineTo(sd<0?Math.min(zz[i][0],0)-2:Math.max(zz[i][0],0)+2,zz[i][1]);
  g.closePath();g.fillStyle='#f4ecd8';g.fill();g.lineWidth=3;g.strokeStyle='#1a1418';g.stroke();
  g.fillStyle='#1a1418';g.beginPath();g.arc(sd*12,-6,7,0,7);g.fill();g.restore()}
 if(T<.35){g.strokeStyle='#1a1418';g.lineWidth=3;g.beginPath();[[0,-34],[6,-22],[-5,-10],[7,2],[-4,14],[4,26]].forEach((p,i)=>i?g.lineTo(p[0],p[1]):g.moveTo(p[0],p[1]));g.stroke()}
 g.restore()}
// Flash Step: the human libero teleports under a ball that would otherwise land out of reach
function ULTframe(dt){const B=ball;
 mythFrame(dt);
 for(const q of G.players){if(q.crack>0)q.crack-=dt;if(q.bonk>0)q.bonk-=dt;if(q.zap>0)q.zap-=dt;if(q.fear>0)q.fear-=dt}
 for(const H of G.players){
 if(!H.in||H.role!=='L'||H.ch.act!=='flash'||H.hype<100||!B.live||B.serving||B.ult&&B.ult.lock)continue;
 if(B.lastTeam===H.team||H.dive||H.h>0||H.stun>0||(H.swing&&!H.swing.done)||G.state!=='rally')continue;
 const d=dirOf(H.team),e=etaY(FLOOR-150);if(e===null||e>.05)continue;const b=ballAt(e);if((b.x-NETX)*d>-60||b.x<LINE_L-40||b.x>LINE_R+40)continue;
 const tx=b.x+d*28;if(Math.abs(tx-H.x)<110)continue;
 FX.bolt(H.x,FLOOR-100,tx,FLOOR-100,'#7fd8ff',.3,5,26);FX.bolt(H.x,FLOOR-60,tx,FLOOR-140,'#ffffff',.25,2,30);
 for(let i=0;i<6;i++)FX.add({x:lerp(H.x,tx,i/5),y:FLOOR-90,kind:'glow',s:60,s1:4,life:.3,col:'#7fd8ff',drag:0});
 FX.text(tx,FLOOR-260,'FLASH STEP','#7fd8ff',44,.9);zapSnd();
 H.x=tx;H.vx=0;H.face=d;const s=H.swing={t:.1,pose:'bump',best:0,pd:0,done:true,R:70,dur:SWING};hitBall(H,s,0);return}}

/* ===== mythic passives: one per mythic, each with its own look. The host decides, pasFX shows it everywhere ===== */
const feathers=(x,y,n,col)=>{for(let i=0;i<n;i++)FX.add({x:x+rnd(-20,20),y:y+rnd(-20,20),vx:rnd(-260,260),vy:rnd(-320,40),ay:160,drag:2.4,life:rnd(.8,1.5),s:rnd(7,12),col:i%3?col:'#ffffff',kind:'shard',vr:rnd(-6,6),add:false})};
function pasFX(k,P,o={}){nev(Object.assign({k:'mp',m:k,p:P.id},o));pasShow(k,P,o)}
function pasShow(k,P,o){const x=+o.x||P.x,y=+o.y||headY(P)+40;
 if(k==='storm'){P.chg=clamp(+o.n||0,0,3);FX.ring(P.x,headY(P)+70,12,60,'#bff0ff',.3,3);AU.tone(900+P.chg*300,.12,'square',.06,400);
  if(P.chg>=3){FX.text(P.x,headY(P)-50,'STORM CHARGED','#bff0ff',28,1);FX.bolt(P.x,headY(P)-500,P.x,headY(P)+20,'#bff0ff',.25,4,30);zapSnd()}}
 else if(k==='chain'){P.chg=0;flash('#bff0ff',.3);shake(12);zapSnd();AU.boom();FX.text(x,y-90,'CHAIN LIGHTNING','#bff0ff',46,1.1);
  FX.bolt(x,-200,x,y,'#ffffff',.35,6,40);let fx=x,fy=y;
  for(const id of o.t||[]){const q=G.players[id];if(!q)continue;const qy=headY(q)+60;FX.bolt(fx,fy,q.x,qy,'#7fd8ff',.45,5,34);FX.bolt(fx,fy,q.x,qy,'#ffffff',.35,2,44);
   FX.ring(q.x,qy,10,90,'#bff0ff',.35,5);FX.burst(q.x,qy,14,{col:'#bff0ff',v0:200,v1:600,l0:.1,l1:.3,s0:2,s1:4,drag:5,kind:'streak'});q.zap=Math.max(q.zap||0,.6);fx=q.x;fy=qy}}
 else if(k==='fire'){ball.fireEnd=D.clock+2;FX.burst(x,y,18,{col:'#ff7a18',v0:80,v1:340,l0:.25,l1:.6,s0:5,s1:10,drag:3});FX.ring(x,y,8,80,'#ffcf3a',.3,4);
  FX.text(x,y-70,'WILDFIRE SET','#ffb02e',30,.9);AU.noise(.35,1200,.2,'lowpass');AU.tone(160,.3,'sawtooth',.1,300)}
 else if(k==='blaze'){ball.fireEnd=0;flash('#ff7a18',.3);shake(14);hitstop(.08);AU.boom();AU.noise(.5,700,.4,'lowpass');
  FX.ring(x,y,10,170,'#ffcf3a',.4,8);FX.ring(x,y,6,110,'#ff3a1a',.3,5);FX.add({x,y,kind:'glow',s:90,s1:10,life:.3,col:'#ff7a18',drag:0});
  FX.burst(x,y,34,{col:'#ff7a18',v0:250,v1:900,l0:.2,l1:.5,s0:5,s1:12,drag:4});FX.burst(x,y,16,{col:'#ffe27a',v0:500,v1:1300,l0:.12,l1:.25,s0:2,s1:4,drag:5,kind:'streak'});
  FX.text(x,y-80,'INFERNO!','#ff7a18',48,1)}
 else if(k==='wings'){feathers(x,y,16,'#ffd23d');FX.ring(x,y,10,110,'#ffd23d',.3,5);P.wingT=D.clock+.6}
 else if(k==='angel'){const ox=+o.ox||P.x;P.angelU=1;P.angelEnd=D.clock+1.4;flash('#fff6c8',.35);hitstop(.1);slowmo(.4,.4);
  for(let i=0;i<14;i++)FX.add({x:P.x+rnd(-30,30),y:FLOOR-i*60,kind:'glow',s:70,s1:10,life:rnd(.4,.8),col:'#fff6c8',drag:0});
  FX.bolt(ox,FLOOR-110,P.x,FLOOR-110,'#ffffff',.35,4,6);for(let i=0;i<8;i++)FX.add({x:lerp(ox,P.x,i/7),y:FLOOR-110,kind:'glow',s:50,s1:4,life:.4,col:'#ffe9a8',drag:0});
  feathers(P.x,FLOOR-170,26,'#fff6c8');FX.ring(P.x,FLOOR-120,10,160,'#ffe9a8',.45,6);
  FX.text(P.x,FLOOR-330,'GUARDIAN ANGEL','#fff1b0',46,1.2);AU.tone(880,.6,'sine',.12,440);AU.tone(1320,.7,'sine',.08,660,.05);AU.perfect()}
 else if(k==='monster')monsterFX(P,x,y,!!o.c)}
// a block so big the ball comes straight back down like a meteor. Nobody digs it
function monsterFX(P,x,y,cur){const col=cur?'#c8d6ff':P.ch.fx;P.mbEnd=D.clock+.7;
 flash('#ffffff',.5);impactFrame(.14);hitstop(.16);shake(24);slowmo(.3,.45);AU.boom();AU.boom();AU.noise(.4,600,.45,'lowpass');AU.crowd(1,.6);
 FX.add({x,y,kind:'glow',s:120,s1:10,life:.3,col:'#ffffff',drag:0});FX.ring(x,y,10,200,'#ffffff',.4,9);FX.ring(x,y,8,140,col,.5,6);
 FX.burst(x,y,30,{col,v0:300,v1:1100,l0:.15,l1:.35,s0:2,s1:5,drag:5,kind:'streak'});FX.burst(x,y,14,{col:'#ffffff',v0:200,v1:600,l0:.3,l1:.6,s0:4,s1:9,drag:3,kind:'shard'});
 for(let i=0;i<5;i++){const a=rnd(-2.6,-.5);FX.bolt(x,y,x+Math.cos(a)*rnd(120,220),y+Math.sin(a)*rnd(120,220),col,.3,3,16)}
 FX.text(x,y-120,'MONSTER BLOCK!!',cur?'#dfe8ff':'#ff5a6a',62,1.3);
 banner({text:'MONSTER BLOCK',sub:P.name.toUpperCase()+(cur?' · IRON CURTAIN':' SHUTS IT DOWN'),col:cur?'#c8d6ff':'#ff5a6a',dur:1.4,big:true,nf:true})}

// host, every frame: Freddy's black hole pulls the ball in, Yumin's angel catches the one that got away
function mythFrame(dt){const B=ball;if(!B.live||B.serving||B.unstop||B.ult||G.state!=='rally')return;
 for(const F of G.players){const m=F.ch.mpas;if(!m||B.lastTeam===F.team||F.stun>0)continue;const d=dirOf(F.team);
  if(m==='horizon'){if((B.x-NETX)*d>-40||B.vy<0||B.x<LINE_L||B.x>LINE_R||!(TM[F.team].next===F||F.in))continue;
   const dx=F.x+d*20-B.x,dy=FLOOR-F.h-150-B.y;if(Math.abs(dx)>340||dy>420||dy<-40)continue;
   B.vx+=clamp(dx*7,-1100,1100)*dt;B.vx*=Math.exp(-1.6*dt);B.vy*=Math.exp(-.9*dt);F.pullEnd=D.clock+.15}
  else if(m==='angel'){if(F.angelU||F.dive||F.h>0||(F.swing&&!F.swing.done))continue;
   const e=etaY(FLOOR-150);if(e===null||e>.05)continue;const b=ballAt(e);if((b.x-NETX)*d>-60||b.x<LINE_L-30||b.x>LINE_R+30)continue;
   const tx=b.x+d*28;if(Math.abs(tx-F.x)<110||TM[F.team].players.some(q=>q!==F&&!q.stun&&Math.abs(q.x-b.x)<80))continue;
   const ox=F.x;F.x=tx;F.vx=0;F.face=d;pasFX('angel',F,{ox:Math.round(ox)});
   const s=F.swing={t:.1,pose:'bump',best:0,pd:0,done:true,R:70,dur:SWING};hitBall(F,s,0);return}}}
// after every touch (host): storm charges, wildfire sets, golden feathers
function mythHit(P,kind,B){const m=P.ch.mpas,lit=B.fire===P.team&&B.fireEnd>D.clock;B.fire=-1;B.fireEnd=0;
 if(lit&&kind==='spike')pasFX('blaze',P,{x:Math.round(B.x),y:Math.round(B.y)});if(!m)return;
 if(m==='storm'){if(kind==='spike'&&(P.chg|0)>=3){const t=oppsOf(P).slice().sort((a,b)=>Math.abs(a.x-B.x)-Math.abs(b.x-B.x)).slice(0,2);
   for(const q of t)stunP(q,.55,'zap');pasFX('chain',P,{x:Math.round(B.x),y:Math.round(B.y),t:t.map(q=>q.id)})}
  else pasFX('storm',P,{n:Math.min(3,(P.chg|0)+1)})}
 else if(m==='wildfire'&&kind==='set'){B.fire=P.team;pasFX('fire',P,{x:Math.round(B.x),y:Math.round(B.y)})}
 else if(m==='wings'&&kind==='spike')pasFX('wings',P,{x:Math.round(B.x),y:Math.round(B.y)})}

// drawn on every screen from synced state
function wing(g,x,y,sd,open,col,a){g.save();g.translate(x,y);g.scale(sd,1);g.rotate(-open*.9+.2);g.globalAlpha=a;
 for(let i=0;i<6;i++){const L=70+i*16-(i>3?(i-3)*22:0),r=-.15-i*.17;g.save();g.rotate(r);const gr=g.createLinearGradient(0,0,L,0);gr.addColorStop(0,'#fff8dc');gr.addColorStop(1,col);g.fillStyle=gr;
  g.beginPath();g.ellipse(L*.55,0,L*.55,9+i*1.2,0,0,7);g.fill();g.restore()}
 g.restore()}
function mythDraw(g){const B=ball,t=D.clock;
 if(B.fireEnd>t&&B.live){for(let i=0;i<2;i++)FX.add({x:B.x+rnd(-10,10),y:B.y+rnd(-10,10),vx:rnd(-40,40)-B.vx*.08,vy:-rnd(80,200),life:rnd(.25,.45),s:rnd(9,16),s1:2,col:pick(['#ff7a18','#ffcf3a','#ff3a1a']),kind:'glow',drag:1})}
 for(const q of G.players){const m=q.ch.mpas;if(!m)continue;const hy=headY(q),d=dirOf(q.team);if(G.state==='serve')q.angelU=0;
  g.save();g.globalCompositeOperation='lighter';
  if(m==='wings'&&(q.h>25||q.wingT>t)){const open=clamp(q.h/220,0,1),fl=Math.sin(t*14)*.12*(q.vh>0?1:.4);
   glow(g,q.x,hy+60,110,'#ffd23d',.25*open);wing(g,q.x-q.face*6,hy+54,-1,open+fl,'#ffcf3a',.85*open);wing(g,q.x-q.face*6,hy+54,1,open+fl,'#ffcf3a',.85*open);
   if(Math.random()<.25*open)FX.add({x:q.x+rnd(-80,80),y:hy+rnd(40,120),vy:rnd(20,80),vx:rnd(-30,30),ay:60,life:1,s:7,col:'#ffe9a8',kind:'shard',vr:4,add:false})}
  else if(m==='storm'&&q.chg>0){for(let i=0;i<q.chg;i++){const a=t*6+i*Math.PI*2/q.chg,px=q.x+Math.cos(a)*46,py=hy+80+Math.sin(a)*18;glow(g,px,py,16,'#bff0ff',.9)}
   if(q.chg>=3){glow(g,q.x,hy+80,90,'#7fd8ff',.25+.1*Math.sin(t*20));if(Math.random()<.2)FX.bolt(q.x+rnd(-40,40),hy+rnd(20,60),q.x+rnd(-50,50),hy+rnd(100,170),'#bff0ff',.06,2,10)}}
  else if(m==='horizon'){const k=q.pullEnd>t?1:.3,cx=q.x+d*20,cy=FLOOR-q.h-150;g.lineWidth=3;
   for(let i=0;i<3;i++){g.globalAlpha=k*(.5-i*.12);g.strokeStyle=i%2?'#b06bff':'#3dffd8';g.beginPath();const r=40+i*26+Math.sin(t*3+i)*4;g.ellipse(cx,cy,r,r*.35,0,t*(3+i)+i,t*(3+i)+i+3.6);g.stroke()}
   glow(g,cx,cy,60+k*40,'#8a5cff',.25*k);g.globalCompositeOperation='source-over';g.globalAlpha=.55*k;g.fillStyle='#0a0614';g.beginPath();g.ellipse(cx,cy,12+k*10,(12+k*10)*.5,0,0,7);g.fill();
   if(k>.5&&Math.random()<.6){const a=rnd(0,6.3),r=rnd(90,160);FX.add({x:cx+Math.cos(a)*r,y:cy+Math.sin(a)*r*.4,vx:-Math.cos(a)*r*3,vy:-Math.sin(a)*r*1.2,life:.3,s:4,s1:1,col:'#c58cff',kind:'streak'})}}
  else if(m==='wildfire'){if(Math.random()<.18)FX.add({x:q.x+rnd(-20,20),y:hy+rnd(60,140),vy:-rnd(40,100),life:.6,s:5,s1:1,col:'#ff9a3a',kind:'glow',drag:1})}
  else if(m==='curtain'){const s=q.swing;if(s&&s.pose==='block'&&q.h>10){const k=clamp(s.t/.12,0,1)*clamp((.52-s.t)/.1,0,1),x=NETX-d*18,y=FLOOR-q.h-250;
    for(const sd of[-1,1]){g.globalAlpha=.35*k;g.fillStyle='#c8d6ff';g.beginPath();g.roundRect(x+sd*34-26,y-70*k,52,110,18);g.fill();for(let f=0;f<4;f++){g.beginPath();g.roundRect(x+sd*34-24+f*13,y-70*k-34,11,40,6);g.fill()}}
    glow(g,x,y,120*k,'#c8d6ff',.3*k)}
   if(q.mbEnd>t){const k=(q.mbEnd-t)/.7,x=NETX+d*90,y=lerp(NETTOP+180,NETTOP-120,k);g.globalAlpha=.4*k;g.fillStyle='#ffffff';g.beginPath();g.roundRect(x-80,y-40,160,120,36);g.fill();glow(g,x,y,200,'#c8d6ff',.4*k)}}
  else if(m==='angel'){const hx=q.x,yy=hy-6+Math.sin(t*3)*3,a=q.angelU?.25:.9;g.globalAlpha=a;g.strokeStyle='#ffe9a8';g.lineWidth=5;g.beginPath();g.ellipse(hx,yy,26,7,0,0,7);g.stroke();glow(g,hx,yy,40,'#fff1b0',a*.5);
   if(q.angelEnd>t){const k=clamp((q.angelEnd-t)/.5,0,1);wing(g,q.x,hy+56,-1,1.1,'#fff1b0',.9*k);wing(g,q.x,hy+56,1,1.1,'#fff1b0',.9*k);glow(g,q.x,hy+60,180,'#fff6c8',.35*k)}}
  g.restore()}
 // any monster block (not just Lauren's): a ghost palm slamming down
 for(const q of G.players){if(q.ch.mpas==='curtain'||!(q.mbEnd>t))continue;const k=(q.mbEnd-t)/.7,d=dirOf(q.team),x=NETX+d*90,y=lerp(NETTOP+180,NETTOP-120,k);
  g.save();g.globalCompositeOperation='lighter';g.globalAlpha=.35*k;g.fillStyle=q.ch.fx;g.beginPath();g.roundRect(x-70,y-36,140,110,32);g.fill();glow(g,x,y,170,q.ch.fx,.35*k);g.restore()}}
