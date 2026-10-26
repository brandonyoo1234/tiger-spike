'use strict';
/* ===== director state (camera / slow-mo / banners) ===== */
const CAM={x:WW/2,y:FLOOR-(H/2-60)/.56,z:.56,shake:0,sx:0,sy:0,flash:0,flashCol:'#fff',lb:0,lbT:0,lines:0,linesCol:'#fff',slow:1,hs:0,dim:0,spot:null,tint:null,tintA:0,imp:0};
const D={clock:0,tl:[],slowT:0,slowV:1,focus:null};
const BAN=[],DECAL=[];
const hitstop=s=>{CAM.hs=Math.max(CAM.hs,s)},slowmo=(v,dur)=>{D.slowV=v;D.slowT=dur},shake=a=>{CAM.shake=Math.max(CAM.shake,a)};
const flash=(col,a)=>{CAM.flash=a;CAM.flashCol=col},after=(t,fn)=>D.tl.push({at:D.clock+t,fn});
const impactFrame=s=>{CAM.imp=Math.max(CAM.imp,s)};
let NOBAN=0;const NETEV=[];const nev=e=>{if(G.net&&!G.puppet)NETEV.push(e)};
const banner=o=>{if(NOBAN)return;if(!o.nf)nev({k:'ban',o});if(o.to!=null&&(!G.ctrl||o.to!==G.ctrl.id))return;if(o.big)for(let i=BAN.length-1;i>=0;i--)if(BAN[i].big||BAN[i].text.startsWith('FIRST'))BAN.splice(i,1);BAN.push(Object.assign({t:0,dur:1.4,col:'#fff',text:'',sub:'',big:false},o))};
const letterbox=on=>{CAM.lbT=on?1:0};

/* ===== match state ===== */
const TM=[{next:null,players:[]},{next:null,players:[]}];
let ball=null;
const NET={sway:0,v:0};
const G={on:false,paused:false,state:'idle',mode:'demo',humanTeam:-1,score:[0,0],target:11,serving:0,srv:[0,0],players:[],ctrl:null,rally:0,best:0,hype:0,
 aiSkill:[.6,.5],stats:{},timer:0,cineCd:0,onEnd:null,level:1,t:0,hint:'',lastKind:'',over:false,ultReady:false,time:0,role:'WS',cue:''};
const dirOf=t=>t?-1:1;
const sideLo=t=>t?NETX+66:LINE_L-170,sideHi=t=>t?LINE_R+170:NETX-66;
const roleP=(t,r)=>TM[t].players[ROLES.indexOf(r)];
// how far from the net each role stands
const BASE={S:150,WS:430,L:720};

function mkBall(){return{x:WW/2,y:300,vx:0,vy:0,gs:1,rot:0,vr:0,live:false,dead:false,serving:false,lastTeam:-1,lastHitter:null,touches:0,cd:0,hot:0,hits:0,evt:0,trail:[],fx:null,unstop:false,kind:'',cross:false,toss:'high',sig:false,sigTeam:-1,sigBy:null}}
function mkPlayer(id,t,idx,inp){const role=ROLES[idx],ch=abilFor(CH[id],role),rs=roleStats(ch),ri=RAR[ch.rar].i,spec=role==='WS'?specOf(ch):'';
 const P={id:t*3+idx,team:t,idx,role,ch,rs,ri,spec,x:0,h:0,vx:0,vh:0,face:dirOf(t),swing:null,dive:null,pending:null,stun:0,armed:false,human:!!inp,in:inp||null,hype:0,pn:'',
  spd:(role==='L'?rs.lspd:290+ch.st[1]*34)*1.35*(has({ch},'feet')?1.12:1)*RSPD[ri],
  jv:(role==='WS'?1000+rs.jump*22:role==='S'?900+ch.st[2]*20:820+ch.st[2]*18)*(has({ch},'boom')?1.05:1)*RJMP[ri]*(spec==='jump'?1.04:spec==='mythic'?1.06:1)*(ch.name==='Brandon'?1.06:1),pow:ch.st[0]+(ch.name==='Brandon'?1.5:0),ctl:ch.st[3],
  A:{mx:0,thT:0,p:null,nx:0,jit:0,evt:-1,srvT:1.2,aim:0,blkOn:false,blkD:.1,blkT:0},name:ch.name};
 if(inp)P.spd*=1.1;
 setupVisual(P);return P}

/* ===== ballistic helpers (gravity scaled per ball: drives fly flat) ===== */
const gB=()=>GB*ball.gs;
const ballAt=t=>({x:ball.x+ball.vx*t,y:ball.y+ball.vy*t+.5*gB()*t*t});
function etaY(y){const B=ball,a=.5*gB(),b=B.vy,c=B.y-y,dc=b*b-4*a*c;if(dc<0)return null;const t=(-b+Math.sqrt(dc))/(2*a);return t>=0?t:null}
function arc(x0,y0,tx,ty,ay){ay=Math.min(ay,Math.min(y0,ty)-40);const vy=-Math.sqrt(2*GB*(y0-ay)),tu=-vy/GB,td=Math.sqrt(2*(ty-ay)/GB),T=tu+td;return{vx:(tx-x0)/T,vy,T}}
function shot(x0,y0,tx,ty,T,margin){let vx,vy;for(let i=0;i<44;i++){vx=(tx-x0)/T;vy=(ty-y0-.5*GB*T*T)/T;const tc=(NETX-x0)/vx;if(!(tc>0&&tc<T))break;const yc=y0+vy*tc+.5*GB*tc*tc;if(yc<NETTOP-BR-margin)break;T+=.035}return{vx,vy,T}}
// a driven spike: near-straight line. If the net is in the way it adds topspin (more dip) and a touch more time.
function drive(x0,y0,tx,ty,T,gs,margin){let vx,vy;for(let i=0;i<60;i++){vx=(tx-x0)/T;vy=(ty-y0-.5*GB*gs*T*T)/T;const tc=(NETX-x0)/vx;if(!(tc>0&&tc<T))break;
 const yc=y0+vy*tc+.5*GB*gs*tc*tc;if(yc<NETTOP-BR-margin)break;if(gs<2.6)gs+=.1;else T+=.015}return{vx,vy,T,gs}}

/* ===== geometry of hit zones ===== */
function ideal(P,pose){const f=P.face;
 if(pose==='dive')return{x:P.x+f*40,y:FLOOR-P.h-40,r:82};
 if(pose==='bump')return{x:P.x+f*36,y:FLOOR-P.h-92,r:P.role==='L'?82:72};
 if(pose==='set')return{x:P.x+f*18,y:FLOOR-P.h-178,r:P.role==='S'?80:70};
 if(pose==='block')return{x:P.x+f*18,y:FLOOR-P.h-190,r:92};
 return{x:P.x+f*26,y:FLOOR-P.h-172,r:80}}
// a dive's slide: fast for .3s, then it stops. Only throw yourself at a ball the slide will actually meet
const diveV=P=>(P.role==='L'?1100:950)*(has(P,'burn')?1.3:1)*(P.role==='L'&&P.ch.rar==='mythic'?1.35:1)*(diveBoost(P)?1.25:1);
const diveX=(P,t)=>{const u=Math.min(t,.3),V=diveV(P);return V*(u-u*u/4)};
function diveHits(P,dir){const V=P.spd*.95;
 for(let t=0;t<=.45;t+=.01){const b=ballAt(t);if(b.y>FLOOR-BR)return false;const ix=P.x+dir*(diveX(P,t)+40);if(Math.hypot(b.x-ix,b.y-(FLOOR-45))<70)return true}return false}
// dive now? only when running there won't make it but the slide will
function wantDive(P,lat,e){if(e===null||e>.45||Math.abs(lat)<30)return false;const dir=sgn(lat);if(Math.abs(lat)-60<P.spd*.8*Math.max(0,e-.06))return false;return diveHits(P,dir)}
const peakH=P=>P.jv*P.jv/(2*GP);
const hitY=P=>FLOOR-peakH(P)*.92-172; // where this hitter meets a set at full reach (sets aim here, AI times its jump to it)

/* ===== match setup ===== */
function positionForServe(first){
 const sv=TM[G.serving].players[G.srv[G.serving]];if(D.pre)endPre();
 for(const P of G.players){const d=dirOf(P.team);P.h=0;P.vh=0;P.vx=0;P.swing=null;P.dive=null;P.pending=null;P.stun=0;P.armed=false;P.face=d;P.mood='';P.serveStage='';P.land=0;P.A.p=null;P.A.evt=-1;
  if(P===sv){P.x=P.team?LINE_R+140:LINE_L-140;P.serveStage='ready';P.tossT=0;P.A.srvT=.9+rnd(0,.9)}
  else if(P.in&&!first)P.x=clamp(P.x,P.team?NETX+80:LINE_L,P.team?LINE_R:NETX-80);
  else P.x=NETX-d*BASE[P.role]+(P.team!==G.serving&&P.role==='L'?-d*10:0);
  P.ready=false}
 TM[0].next=TM[1].next=null;
 const B=ball=mkBall();B.lastTeam=-1;placeBall(sv);
 G.rally=0;G.hint=''}
function placeBall(sv){const B=ball;B.x=sv.x+sv.face*22;B.y=FLOOR-sv.h-108;B.vx=B.vy=0}
function newMatch(o){
 G.on=true;G.paused=false;G.over=false;G.mode=o.mode||'quick';G.target=o.target||11;G.level=o.level||1;G.score=[0,0];G.onEnd=o.onEnd||null;
 G.stats={perfects:0,aces:0,spikes:0,blocks:0,digs:0,ults:0,hits:0,best:0,sets:0};G.net=o.net||null;G.puppet=!!o.puppet;
 const me=o.me??(o.demo?-1:ROLES.indexOf(o.role||'WS')),hum=o.hum||(me<0?{}:{[me]:IN});G.me=me;
 G.humanTeam=me>=0?(me/3|0):-1;G.role=me>=0?ROLES[me%3]:'WS';
 setSchools(o.school0||'SIS',o.school1||'KIS');floorCv=null;G.school=[o.school0||'SIS',o.school1||'KIS'];
 TM[0].players=o.team0.map((id,i)=>mkPlayer(id,0,i,hum[i]));TM[1].players=o.team1.map((id,i)=>mkPlayer(id,1,i,hum[3+i]));
 G.players=[...TM[0].players,...TM[1].players];if(o.names)G.players.forEach((P,i)=>{if(o.names[i])P.pn=o.names[i]});G.ins=G.players.filter(P=>P.in).map(P=>P.in);
 G.aiSkill=[o.skill0??.72,o.skill1??.5];G.ctrl=null;G.best=0;G.ultReady=false;
 G.serving=o.demo?rndi(0,1):0;G.srv=[0,0];G.t=0;G.cineCd=0;
 FX.clear();BAN.length=0;DECAL.length=0;D.tl.length=0;D.focus=null;D.pre=false;CAM.slow=1;D.slowT=0;CAM.hs=0;CAM.lbT=0;CAM.lb=0;CAM.dim=0;CAM.spot=null;CAM.tintA=0;CAM.lines=0;CAM.flash=0;CAM.imp=0;
 ball=mkBall();
 if(!G.net&&me>=0&&G.role!=='L')G.srv[0]=me; // you serve first unless you're the libero
 positionForServe(true);
 G.state='intro';G.timer=o.demo?.2:2.4;
 if(!o.demo){banner({text:G.school[0]+' vs '+G.school[1],sub:'FIRST TO '+G.target+(me>=0?'  ·  YOU ARE THE '+ROLE_NAME[G.role].toUpperCase()+'  ·  '+G.players[me].name.toUpperCase():'  ·  SPECTATING'),col:'#ffb02e',dur:2.2,nf:true});AU.whistle()}
 if(me>=0)G.ctrl=G.players[me];
 AU.inten=o.demo?0:1;AU.crowd(.35)}

/* ===== actions ===== */
// when will the ball be closest to the white circle (the spike hit point) if we keep flying? {t, dd}
function predictHit(P,maxT){const f=P.face,a=P.human?2200:1500;let x=P.x,h=P.h,vh=P.vh,vx=P.vx,best={t:0,dd:1e9};
 for(let t=0;t<=maxT;t+=.005){const b=ballAt(t),dd=Math.hypot((b.x-(x+f*26))*.55,b.y-(FLOOR-h-172));if(dd<best.dd)best={t,dd};
  vh-=GP*.005;h=Math.max(0,h+vh*.005);vx-=clamp(vx,-a*.005,a*.005);x+=vx*.005}
 return best}
function startSwing(P,pose,auto){const s=P.swing={t:0,pose,best:1e9,pd:1e9,done:false,auto:!!auto,safe:auto==='safe',R:70,dur:pose==='block'?.52:SWING};
 if(pose==='spike'||pose==='serve'){const pr=predictHit(P,.5);s.hitAt=clamp(pr.t,.05,.5);s.early=Math.max(0,pr.t-.3);s.dur=s.hitAt+.3;s.pred=pr.dd;
  if(P.human&&pose==='spike')preSpike(P,s)}
 else AU.whoosh()}
// a perfect read on the second press: time slows into a close-up of your swing, then the hit
function preSpike(P,s){if(G.cineCd>0||s.pred>18||s.early>0||s.hitAt>.32||G.ctrl!==P||G.net)return;D.pre=true;G.cineCd=1;
 slowmo(.22,s.hitAt/.22+.08);D.focus={kind:'player',P,z:1.4};letterbox(true);CAM.spot={P,r:300};CAM.dim=.45}
function endPre(){D.pre=false;D.focus=null;letterbox(false);CAM.dim=0;CAM.spot=null}
function startDive(P,dir){P.dive={t:0,dir};P.face=dir;P.vh=300;P.swing={t:0,pose:'dive',best:1e9,pd:1e9,done:false,R:80,dur:.45};AU.dive();FX.burst(P.x,FLOOR-4,10,{col:'#d9c9a8',v0:60,v1:240,ang:-Math.PI/2,spread:1.2,l0:.3,l1:.7,s0:4,s1:9,drag:3,add:false,kind:'dot'})}
function tossBall(P){const B=ball;P.serveStage='toss';B.live=true;B.serving=true;const v=P.jv*.85,ap=FLOOR-v*v/(2*GP)-172-70;B.vx=P.face*110;B.vy=-Math.sqrt(2*GB*Math.max(300,B.y-ap));B.gs=1;B.lastTeam=P.team;P.tossT=0;AU.tick();FX.ring(B.x,B.y,6,36,'#fff',.3,3)}
function doAct(P,a){
 switch(a.t){
  case 'toss':tossBall(P);break;
  case 'jump':if(P.h<=0&&P.vh<=0){P.vh=P.jv*(a.armed?1:a.pose==='block'?.8:.75);P.land=0;P.armed=!!a.armed;if(a.pose)P.pending={pose:a.pose,t:.055};AU.tone(300,.1,'sine',.08,200);
   FX.burst(P.x,FLOOR-3,a.armed?8:4,{col:'#d9c9a8',v0:30,v1:a.armed?180:120,ang:-Math.PI/2,spread:1.2,l0:.2,l1:.4,s0:2,s1:5,drag:3,add:false,kind:'dot'});if(P.ch.rar==='mythic')mythJump(P,a.armed);else if(P.ch.rar==='legendary'&&a.armed)legJump(P)}break;
  case 'srvjump':if(P.h<=0&&P.vh<=0){const v=P.jv*.85;P.vh=v;P.armed=true;P.land=0;P.pending={pose:'serve',t:Math.max(.03,v/GP-.24)};AU.tone(300,.1,'sine',.08,200);
   FX.burst(P.x,FLOOR-3,8,{col:'#d9c9a8',v0:30,v1:180,ang:-Math.PI/2,spread:1.2,l0:.2,l1:.4,s0:2,s1:5,drag:3,add:false,kind:'dot'})}break;
  case 'swing':startSwing(P,a.pose,a.auto);break;
  case 'dive':startDive(P,a.dir);break}}

function oppAttacking(t){const B=ball,O=TM[1-t];if(!B.live||B.serving)return false;
 if(B.lastTeam===1-t&&B.touches===2&&!B.cross&&Math.abs(B.x-NETX)<560)return true;
 return O.players.some(q=>(q.armed&&q.h>3)||(q.swing&&q.swing.pose==='spike'&&q.swing.t<.18))}
function blockable(P){return P.role!=='L'&&oppAttacking(P.team)}
// human Space press -> the right action for the moment
function chooseAct(P){
 const B=ball,T=TM[P.team],d=dirOf(P.team);
 if(P.serveStage==='ready')return{t:'toss'};
 if(P.serveStage==='toss')return P.swing||P.pending||P.h>0?null:{t:'srvjump'};
 if(P.swing||P.dive||P.stun>0||P.pending)return null;
 if(G.state==='point'||G.state==='intro')return null;
 const air=P.h>6,live=B.live&&!B.dead;
 const incoming=B.lastTeam!==P.team,tn=incoming?0:B.touches;
 const nearNet=Math.abs(P.x-NETX)<230,bk=blockable(P)&&nearNet&&!(live&&incoming&&(B.x-NETX)*d<0);
 if(air)return{t:'swing',pose:bk?'block':'spike'};
 const p=P.A.p,mine=T.next===P,over=live&&incoming&&(B.x-NETX)*d<0;
 // the other team's attack is already over the net: SPACE receives it (or dives for it)
 if(over&&!(mine&&p&&p.kind==='play')){const r=reachAct(P,'bump');if(r){if(r.t!=='wait')T.next=P;return r}return null}
 if(bk)return{t:'jump',pose:'block'};
 if(live&&mine&&p&&p.attack){const e=etaY(p.yc);if(e!==null&&e>P.jv/GP+.08){P.autoJ=B.evt;return{t:'hold'}}return{t:'jump',armed:true}}
 if(live&&mine&&p&&p.kind==='play'){
  const e=etaY(p.yc),ip=ideal(P,p.pose);
  if(e===null)return{t:'swing',pose:p.pose};
  const lat=ballAt(e).x-ip.x;
  if(Math.abs(lat)>ip.r*1.05&&wantDive(P,lat,e))return{t:'dive',dir:sgn(lat)};
  if(e>.42)return{t:'hold'}; // too early: wait and auto-time it
  return{t:'swing',pose:p.pose}}
 if(live&&!incoming&&tn===2&&P.role!=='L'&&Math.abs(B.x-NETX)<520&&B.y<FLOOR-160)return{t:'jump',armed:true};
 if(live&&(incoming?(B.x-NETX)*d<0||B.cross:tn<3)){const r=reachAct(P,!incoming&&tn===1?'set':'bump');if(r){if(r.t!=='wait')T.next=P;return r}}
 // the other team has it: the only jump you get is a block at the net
 if(incoming)return nearNet&&P.role!=='L'?{t:'jump',pose:'block'}:null;
 return P.role==='L'?null:{t:'jump'}}
// any ball coming down on your side: in reach = play it, out of reach = dive (and if it's too far, you end up on the floor)
function reachAct(P,pose){const B=ball,d=dirOf(P.team),e=etaY(FLOOR-92);if(e===null)return null;
 const lx=ballAt(e).x;if((lx-NETX)*d>0)return null;
 const ip=ideal(P,pose),lat=lx-ip.x;
 if(Math.abs(lat)<=ip.r*1.05)return e>.3?{t:'wait'}:{t:'swing',pose};
 if(wantDive(P,lx-P.x,e))return{t:'dive',dir:sgn(lx-P.x)};
 return{t:'wait'}}

/* ===== players ===== */
function updPlayer(P,dt){
 const B=ball,d=dirOf(P.team),isH=!!P.in;
 if(isH){humanThink(P,dt)}else aiThink(P,dt);
 const mx=P.A.mx;
 const grounded=P.h<=0&&P.vh<=0;
 const canMove=!P.dive&&!P.serveStage&&G.state!=='point'&&G.state!=='intro'&&P.stun<=0;
 if(P.serveStage==='toss')P.tossT=(P.tossT||0)+dt;
 if(P.dive){const dv=P.dive;dv.t+=dt;P.vx=dv.dir*(dv.t<.3?diveV(P):0)*(1-dv.t*.5);dv.end=dv.hit?.5:.72;if(dv.t>dv.end){P.dive=null;P.face=d;P.stun=dv.hit?.04:.1}}
 else if(P.serveStage==='toss'){ // jump serve: a few steps in under the toss, take off behind the line, carry forward
  if(grounded){if(P.tossT>.22){const gx=P.team?Math.max(LINE_R+12,B.x+B.vx*.45-P.face*34):Math.min(LINE_L-12,B.x+B.vx*.45-P.face*34),w=clamp((gx-P.x)*5,-P.spd*.6,P.spd*.6);P.vx+=clamp(w-P.vx,-3000*dt,3000*dt)}else P.vx*=Math.exp(-14*dt)}
  else P.vx*=Math.exp(-1.2*dt)}
 else if(canMove){const sp=P.spd*(P.swing&&grounded?.5:1)*(grounded?1:.8),a=grounded?5200:(P.armed?(isH?2200:1500):900);P.vx+=clamp(mx*sp-P.vx,-a*dt,a*dt)}
 else P.vx*=Math.exp(-14*dt);
 if(P.stun>0)P.stun-=dt;
 P.x=clamp(P.x+P.vx*dt,sideLo(P.team),sideHi(P.team));
 if(P.x<=sideLo(P.team)+.5||P.x>=sideHi(P.team)-.5)P.vx*=.3;
 // vertical
 if(P.h>0||P.vh>0){P.vh-=GP*dt*(P.armed&&(has(P,'hang')||hasM(P,'wings'))&&Math.abs(P.vh)<380?.6:1);P.h+=P.vh*dt;if(P.h<=0){const imp=-P.vh;P.h=0;P.vh=0;P.armed=false;P.recov=false;if(!P.dive)P.land=.16;if(imp>380&&P.ch.rar==='mythic')mythLand(P);if(imp>380)FX.burst(P.x,FLOOR-3,5,{col:'#d9c9a8',v0:30,v1:140,ang:-Math.PI/2,spread:1.2,l0:.2,l1:.4,s0:2,s1:5,drag:3,add:false,kind:'dot'})}}
 // pending swing (jump-block)
 if(P.pending){P.pending.t-=dt;if(P.pending.t<=0){startSwing(P,P.pending.pose);P.pending=null}}
 // swing
 if(P.swing){const s=P.swing;s.t+=dt;contact(P);if(s.t>=s.dur){if(s.pose==='spike'){P.armed=false;P.recov=P.h>0}if(D.pre&&!s.done&&G.ctrl===P)endPre();P.swing=null}}
 // auto serve if toss missed
 if(P.serveStage==='toss'&&!P.swing&&!P.pending&&B.serving&&B.vy>0&&B.y>FLOOR-150){autoServe(P)}
 P.ready=G.state==='rally'||G.state==='serve';
 P.serveStage&&P.serveStage==='ready'&&placeBall(P);
 updateVisual(P,dt,G.time)}

function contact(P){const s=P.swing,B=ball;if(s.pose==='block'||s.done||!B.live||B.dead||B.cd>0||B.ult&&!B.ult.done)return;
 if(s.hitAt==null&&s.t<.05)return;
 if(B.lastHitter===P&&B.lastTeam===P.team&&!B.serving&&B.touches>0||B.kind==='mblock')return;
 const ip=ideal(P,s.pose==='serve'?'spike':s.pose),R=ip.r*(.86+P.ctl*.025)*(P.human?(P.role==='WS'?1.12:1.25):1)*[.9,.96,1,1.05,1.1][P.ri]+Math.min(24,Math.hypot(B.vx,B.vy)*.02);
 if((B.x-NETX)*dirOf(P.team)>-4)return; // the ball has to be on your side
 // attack swings meet the ball at the planned moment: the hand is where the circle is, and the ball either is there or isn't
 if(s.hitAt!=null){if(s.t<s.hitAt)return;const dd=Math.hypot((B.x-ip.x)*.55,B.y-ip.y);s.R=R;s.done=true;s.hitT=s.t;
  if(P.in)swingFX(P,ip,dd<R*.3,dd>=R*1.1);
  if(dd<R*1.1){AU.whoosh();hitBall(P,s,dd/R+s.early*2)}
  else{if(P===G.ctrl&&D.pre)endPre();AU.whoosh()}
  return}
 const dd=Math.hypot((B.x-ip.x)*(s.pose==='spike'?.55:1),B.y-ip.y);s.R=R;
 if(dd<R){if(s.pose==='dive'){s.done=true;hitBall(P,s,dd/R);return}if(dd<s.best)s.best=dd;else if(dd>s.pd+1){s.done=true;hitBall(P,s,s.best/R);return}s.pd=dd}
 else if(s.best<1e9){s.done=true;hitBall(P,s,s.best/R);return}
 if(s.t>s.dur-.07&&s.best<1e9&&!s.done){s.done=true;hitBall(P,s,s.best/R)}}

// the ring at your hand on an attack swing, and MISS when you whiff (shown only on the swinger's own screen)
function swingFX(P,ip,gold,miss){if(P!==G.ctrl){nev({k:'sw',p:P.id,x:ip.x,y:ip.y,r:ip.r,g:gold,m:miss});return}
 FX.ring(ip.x,ip.y,ip.r*.55,ip.r*.95,gold?'#ffd23d':'#ffffff',.22,4);if(miss)FX.text(P.x,FLOOR-P.h-250,'MISS','#ff7b7b',28,.6)}
function autoServe(P){const s={t:.1,pose:'bump',best:1,R:1,done:true,auto:true,dur:SWING};P.swing=s;hitBall(P,s,.95,true)}

/* ===== the hit ===== */
const QN=['PERFECT!','GREAT','GOOD','WEAK'],QC=['#ffd23d','#7dffb0','#ffffff','#ff7b7b'];
function pickToss(P){if(P.in){if(P.in.u)return'quick';if(P.in.d)return'back';return P.ch.toss}
 // bots: mostly their signature, sometimes mix it up against a set block
 const O=TM[1-P.team],wall=O.players.filter(q=>q.role!=='L'&&Math.abs(q.x-NETX)<110).length;
 if(Math.random()<.65)return P.ch.toss;return wall>=2?pick(['quick','back']):pick(['high','quick','back'])}
const actN=P=>(ABIL[P.ch.act]||{}).n||P.ch.ult;
// a libero (human only) with Rolling Save and full hype covers a lot more floor
const diveBoost=P=>!!P.in&&P.hype>=100&&P.ch.act==='roll';
// spike depth comes from where you meet the ball: ball behind/over you = flat and deep, ball out in front = steep and short
const spikeDist=u=>u<0?lerp(520,900,-u):lerp(520,170,u);
const SPK_ACT=['thunder','meteor','feint','cannon'];
function hitBall(P,s,ratio,forceOver){s.hitT=s.t;if(ball.killcam)killCancel();
 const B=ball,T=TM[P.team],d=dirOf(P.team),human=!!P.in,me=P===G.ctrl,incoming=B.lastTeam!==P.team,ra=RAR[P.ch.rar],ri=ra.i;
 let q=ratio<.24?0:ratio<.5?1:ratio<.8?2:3;if(s.auto)q=Math.max(q,!s.safe&&human&&(s.pose==='set'&&P.role==='S'||P.role==='L'&&(s.pose==='bump'||s.pose==='dive'))?1:2);if(s.pose==='dive'&&P.dive)P.dive.hit=true;if(s.pose==='dive')q=Math.max(q,1);
 const myth=P.ch.rar==='mythic';if(myth&&(P.role==='L'&&(s.pose==='bump'||s.pose==='dive')||P.role==='S'&&s.pose==='set'))q=0;
 if(!human&&q===0&&!myth&&Math.random()>.2)q=1; // bots are solid, but perfect is the player's thing
 if(has(P,'clutch')&&q>0&&Math.max(G.score[0],G.score[1])>=G.target-2)q--;
 const bs=Math.hypot(B.vx,B.vy),tn=incoming?0:B.touches,prevKind=B.kind,prevToss=B.toss;
 let kind;
 if(forceOver){kind='over'}
 else if(B.serving&&P.serveStage)kind='serve';
 else if(s.pose==='spike'&&P.h>20&&B.y<NETTOP+40&&Math.abs(B.x-NETX)<560&&(tn>=2||q<=2))kind='spike';
 else if(tn===0)kind='bump';else if(tn===1)kind='set';else kind='over';
 if(!incoming&&tn>=3&&kind!=='serve'){scorePoint(1-P.team,'4 TOUCHES');return}
 // active abilities (hype full): spike = the spiker's active, set/receive = a signature play that powers up the next spike
 const hypeOK=human&&P.hype>=100&&!s.auto;
 let ult=kind==='spike'&&((hypeOK)||(B.sig&&P.team===B.sigTeam));
 const sigPlay=hypeOK&&!ult&&((P.role==='S'&&kind==='set')||(P.role==='L'&&(kind==='bump'||kind==='set')&&incoming));
 const dump=sigPlay&&(P.ch.act==='dump'||P.ch.act==='hammer'||P.ch.act==='aegis');
 if(!human&&kind==='spike'&&!incoming&&ULT[P.ch.act]&&Math.random()<(myth?.14:P.ch.rar==='legendary'?.06:0))ult=true; // star bots throw their ultimate too
 if(ult||sigPlay)q=0;
 if(B.sig&&P.team===B.sigTeam&&kind==='set')q=0;
 const own=P.ch.act,sa=ult?(B.sig&&B.sigAct&&!ULT_TOP.includes(own)?B.sigAct:isSpkAct(own)?own:'cannon'):'';
 const x0=B.x,y0=B.y,sg=[4,16,40,95][q]*RERR[P.ri],ctl=1.6-P.ctl*.075,aimU=human?(P.in.u-P.in.d):(P.A.aim||0);
 let vx=0,vy=0,gs=1,crosses=false;
 if(dump)kind='over';
 switch(kind){
  case 'bump':{const rec=(1.25-P.rs.dig*.07)*(has(P,'platform')?.6:1),tx=NETX-d*(BASE.S+gauss()*sg*rec*(bs>900&&q>1?1.4:1)*.8)+(q===3?rnd(-90,90):0),r=arc(x0,y0,tx,FLOOR-178,[190,210,245,330][q]);vx=r.vx;vy=r.vy;
   if(incoming&&bs>800&&P.team===G.humanTeam)G.stats.digs++;break}
  case 'set':{
   const Hh=roleP(P.team,'WS'),toWS=Hh!==P&&B.lastHitter!==Hh;
   if(P.role==='S'||toWS){const tt=P.role==='S'?(sigPlay&&P.ch.act==='tempo'?'quick':sigPlay&&P.ch.act==='launch'?'back':pickToss(P)):'high',TT=TOSS[tt],pr=P.role==='S'?P.ch.st[3]+(tt===P.ch.toss?3:0)+ri*.25:3;
    const H2=Hh,ty=hitY(H2),apK=1-clamp((peakH(H2)-200)/500,0,.35),err=(15-clamp(pr,1,13))*3.2*[.25,.6,1,2][q]*(has(P,'toss')?.5:1)*(myth&&P.role==='S'?.25:1);
    const tx=NETX-d*(TT.hx+gauss()*err),r=arc(x0,y0,tx,ty+gauss()*err*.5,ty-TT.ap*apK*(myth&&P.role==='S'?.8:1));vx=r.vx;vy=r.vy;B.toss=tt;
    if(me){G.stats.sets++;if(s.auto&&P.role==='S')FX.text(x0,y0-80,'ICONIC SET · '+TT.n.toUpperCase(),'#bff0ff',24,.9);else if(q<=1)FX.text(x0,y0-80,TT.n.toUpperCase(),'#bff0ff',22,.8)}}
   else{const tx=NETX-d*(130+aimU*40)+gauss()*sg*.7*ctl,r=arc(x0,y0,tx,338,[190,205,230,300][q]);vx=r.vx;vy=r.vy;B.toss='high'}break}
  case 'over':{const tx=dump?NETX+d*rnd(120,220):NETX+d*(500+aimU*250)+gauss()*sg*ctl;let ay=dump?NETTOP-60:[230,250,290,360][q],r;for(let i=0;i<16;i++){r=arc(x0,y0,tx,FLOOR-BR,ay);const tc=(NETX-x0)/r.vx,yc=y0+r.vy*tc+.5*GB*tc*tc;if(!(tc>0)||yc<NETTOP-BR-10)break;ay-=28}vx=r.vx;vy=r.vy;crosses=true;break}
  case 'spike':{const tt=TOSS[prevKind==='set'?prevToss:'high']||TOSS.high,trait=P.ch.spk,back=Math.abs(P.x-NETX)>290;
   const pw=P.pow+tt.pw+(q===0?1.2:0)+(P.role==='WS'?0:-1.5)+(back&&has(P,'boom')?1.2:0)+(B.fire===P.team&&B.fireEnd>D.clock?1:0);
   const lat=(B.x-P.x)*d,u=clamp((lat-26)/55,-1,1);
   let dist=spikeDist(u)+aimU*80;if(trait==='cross')dist-=60;
   let T0=lerp(.27,.15,clamp(pw/12,0,1))*[.8,1,1.15,1.5][q]*RSPK[P.ri]*(P.spec==='power'?.85:P.spec==='mythic'?.82:1)*(human&&q===0?.8:1);if(trait==='speed')T0*=.84;
   let g0=(trait==='cross'?1.1:.45)+(has(P,'spin')?.3:0);
   if(sa==='thunder'){dist=940;T0=.16}else if(sa==='meteor'){dist=150;T0=.13;g0=1.6}else if(sa==='cannon'){dist=650;T0=.12}
   dist=clamp(dist+(ult?0:gauss()*sg*ctl),90,980);T0*=.6+dist/700;
   const tx=NETX+d*dist;
   if(!sa)T0=Math.max(T0,Math.hypot(tx-x0,FLOOR-BR-y0)/(5400+300*P.ri)); // even the hardest normal spike stays (barely) trackable and never tunnels through anyone
   if(sa==='feint'){const r=shot(x0,y0,NETX+d*120,FLOOR-BR,.8,6);vx=r.vx;vy=r.vy}
   else if(q===3){const r=shot(x0,y0,tx,FLOOR-BR,.75,4);vx=r.vx;vy=r.vy}
   else{const r=drive(x0,y0,tx,FLOOR-BR,T0,g0,[16,10,2][q]);vx=r.vx;vy=r.vy;gs=r.gs}
   crosses=true;break}
  case 'serve':{const pf=P.pow/10,T0=lerp(1.05,.7,pf)*[.85,1,1.12,1.35][q]*(has(P,'bigserve')?.88:1)*RSRV[P.ri],tx=NETX+d*(560+aimU*300)+gauss()*sg*ctl*1.6,r=shot(x0,y0,tx,FLOOR-BR,T0,[22,16,6,-20][q]);vx=r.vx;vy=r.vy;crosses=true;break}}
 B.vx=vx;B.vy=vy;B.gs=gs;B.x=clamp(B.x,10,WW-10);B.cross=crosses;B.blk=0;
 B.lastTeam=P.team;B.lastHitter=P;B.cd=.18;B.evt++;B.hits++;G.rally++;B.kind=kind;G.lastKind=kind;
 B.touches=(incoming?0:B.touches)+1;
 const wasServe=kind==='serve';if(B.serving){P.serveStage='';B.serving=false;G.state='rally'}
 T.next=null;
 if(kind==='spike'&&B.sig){B.sig=false;B.sigAct=''}
 if(sigPlay&&!dump){B.sig=true;B.sigTeam=P.team;B.sigBy=P;B.sigAct=P.ch.act==='ignite'?'phoenix':''}
 B.hot=(kind==='spike'||kind==='serve')?1:0;B.unstop=!!ult||dump;B.vr=(vx>0?1:-1)*(kind==='spike'?36:7);
 B.ult=null;if(ult&&ULT[sa])startUlt(B,sa,P,x0,y0,d);else if(dump&&ULT[own])startUlt(B,own,P,x0,y0,d);
 B.fx=(B.hot||B.ult)&&(q<=1||ult||B.ult)?{col:P.ch.fx,ri,rar:P.ch.rar,mine:P}:null;
 if(B.sig&&!B.fx&&B.sigBy){const Q=B.sigBy;B.fx={col:Q.ch.fx,ri:RAR[Q.ch.rar].i,rar:Q.ch.rar,mine:Q}}
 if(G.rally>G.best)G.best=G.rally;
 // stats + hype (each human's own touches charge their own bar)
 if(human){if(me){G.stats.hits++;if(q===0){G.stats.perfects++;}if(kind==='spike')G.stats.spikes++}
  const add=([17,9,3,0][q]+(kind==='spike'?4:0))*(has(P,'wind')?1.3:1);
  if(!ult&&!sigPlay){const was=P.hype;P.hype=Math.min(100,P.hype+add);if(was<100&&P.hype>=100){banner({text:'HYPE MAX',sub:actN(P).toUpperCase()+' — '+(ABIL[P.ch.act]?ABIL[P.ch.act].how:'NEXT PERFECT HIT'),col:RAR[P.ch.rar].col,dur:1.8,to:P.id});if(me)AU.ult(0)}}
  else{P.hype=0;if(me)G.stats.ults++}}
 hitFX(P,q,kind,B.x,B.y);mythHit(P,kind,B);
 // cinematics
 const perfSpk=kind==='spike'&&q===0&&human;
 if(D.pre&&!perfSpk)endPre();D.pre=false;
 if(ult)cineUlt(P,ra,ULT[sa]?ULT[sa].n:(ABIL[sa]||{}).n||actN(P));
 else if(sigPlay)cineSig(P,ra,actN(P));
 else if(perfSpk&&(G.cineCd<=1))cineSpike(P,ra);
 else if((kind==='bump'||kind==='set')&&q===0&&bs>950&&G.cineCd<=0&&incoming&&human)cineDig(P,ra);
 if(wasServe&&q===0&&me)banner({text:'PERFECT SERVE',col:'#ffd23d',dur:.9});
 AU.crowd(Math.min(.9,.3+G.rally*.05),.3);AU.inten=G.state==='rally'&&G.rally>5?2:1}
// fx + audio: small and clean (clients replay this from the 'hit' event)
function hitFX(P,q,kind,px,py){const col=P.ch.fx,mine=P.team===G.humanTeam||G.humanTeam<0;nev({k:'hit',p:P.id,q,kind,x:px,y:py});
 FX.burst(px,py,q===0?10:5,{col:q===0?'#ffe27a':col,v0:50,v1:q===0?260:160,l0:.15,l1:.32,s0:2,s1:5,drag:4});
 if(q<=1)FX.ring(px,py,8,q===0?60:40,'#fff',.22,3);
 if(kind==='spike'&&P.ch.rar==='mythic'&&q<=1){const h=D.clock*300;FX.ring(px,py,10,120,hsl(h,100,65),.35,5);FX.ring(px,py,6,70,hsl(h+120,100,70),.25,3);FX.burst(px,py,16,{col:hsl(h+200,100,70),v0:250,v1:750,l0:.15,l1:.3,s0:2,s1:4,drag:4,kind:'streak'});shake(5)}
 if(kind==='bump'||kind==='over')AU.bump(q);else if(kind==='set')AU.set(q);else AU.spike(P.pow,q);
 if(q===0){AU.perfect();}else if(q===1)AU.great();
 if(kind==='spike'){spikeFX(P,q);shake(3+P.pow*.5*(q===0?1.3:1));hitstop(q===0?.05:.025)}
 else if(kind==='serve'){shake(3+P.pow*.4);hitstop(q===0?.04:.02)}else if(q===0)hitstop(.03);
 if(mine||q<=1)FX.text(px,py-46,QN[q],QC[q],q===0?44:q===1?34:26,.8)}
// the hit: a white flash at the hand, a shockwave, speed lines thrown along the shot and sparks kicked back off the palm
function spikeFX(P,q){const B=ball,a=Math.atan2(B.vy,B.vx),col=P.ch.fx;
 FX.ring(B.x,B.y,6,q===0?100:62,'#ffffff',.2,q===0?5:3);
 FX.add({x:B.x,y:B.y,kind:'glow',s:q===0?36:24,s1:4,life:.13,col:'#ffffff',drag:0});
 for(let i=0;i<(q===0?11:6);i++){const aa=a+rnd(-.2,.2),sp=rnd(1000,1900);FX.add({x:B.x,y:B.y,vx:Math.cos(aa)*sp,vy:Math.sin(aa)*sp,drag:7,life:rnd(.1,.2),s:rnd(2,3.5),col:i%2?col:'#ffffff',kind:'streak'})}
 FX.burst(B.x,B.y,q===0?8:4,{col:q===0?'#ffe27a':col,v0:160,v1:430,ang:a+Math.PI,spread:.9,l0:.1,l1:.2,s0:2,s1:3,drag:6,kind:'streak'});
 B.sq=.14}

/* ===== block: the blockers' hands vs the ball at the net. A soft touch doesn't count as one of your 3 ===== */
function blockCheck(B){if(!B.live||B.blk||B.serving||B.lastTeam<0||B.ult&&!B.ult.done)return;
 for(const P of G.players){const s=P.swing;if(!s||s.pose!=='block'||s.done||P.team===B.lastTeam)continue;
  const d=dirOf(P.team);if(B.vx*d>=0)continue;
  const gap=Math.abs(P.x-NETX),cur=hasM(P,'curtain');if(gap>(cur?170:130))continue;
  const px=NETX-d*clamp(gap-30,8,60),top=FLOOR-P.h-178-(cur?90:0);
  if(Math.abs(B.x-px)>BR*(cur?2.2:1))continue;
  if(B.y<top-BR*.5||B.y>NETTOP+12)continue; // over the hands, or below the tape
  blockHit(P,B,s);return}}
function blockHit(P,B,s){const d=dirOf(P.team),A=B.lastHitter,sp=sp2(B),human=!!P.in,x0=B.x,y0=B.y;B.blk=1;s.done=true;
 if(B.kind==='spike'&&A&&A.ch.spk==='pierce'&&sp>700&&Math.random()<.5){
  B.vx*=.8;B.vy*=.8;FX.ring(B.x,B.y,6,70,A.ch.fx,.3,3);AU.boom();shake(6);hitstop(.04);
  banner({text:'BLOCK BUSTER!',sub:A.name.toUpperCase()+' SMASHES THROUGH',col:A.ch.fx,dur:1.1});P.stun=.25;return}
 // bots stuff less often (much less against a human hitter); a great block can become a MONSTER BLOCK that nobody digs
 const timing=s.t>.06&&s.t<.38,vsH=!!(A&&A.in),cur=hasM(P,'curtain'),bot=human?1:vsH?.45:.75;
 const stuffP=((timing?.45:.18)+(has(P,'palms')?.2:0)+(s.t<.2?.1:0)-(sp>1500?.15:0))*bot+(cur?.2:0),toolP=.12+(A&&has(A,'tool')?.25:0)+(vsH&&!human?.1:0),r0=Math.random();
 const monP=(B.kind==='spike'?1:.5)*((timing?.08:.02)+(human&&timing?.14:0)+(P.ri>=3?.06:0)+(has(P,'palms')?.06:0))*(human?1:vsH?.4:1)+(cur?.3:0);
 B.cd=.12;B.evt++;B.hits++;B.gs=1;B.lastTeam=P.team;B.fx=null;B.unstop=false;TM[0].next=TM[1].next=null;
 if(Math.random()<monP){ // slammed straight down just over the net, far too fast to dig
  const bx=NETX+d*(BR+6),by=Math.min(y0,NETTOP-BR-8),tx=NETX+d*rnd(90,200),Tt=.2;B.x=bx;B.y=by;B.vx=(tx-bx)/Tt;B.vy=(FLOOR-BR-by-.5*GB*Tt*Tt)/Tt;
  B.lastHitter=P;B.touches=0;B.cross=true;B.kind='mblock';B.hot=1;B.unstop=true;B.fx={col:cur?'#c8d6ff':P.ch.fx,ri:P.ri,rar:P.ch.rar,mine:P};
  if(P===G.ctrl)G.stats.blocks++;pasFX('monster',P,{x:Math.round(bx),y:Math.round(by),c:cur?1:0})}
 else if(r0<stuffP){ // stuffed straight back down on the hitter's side
  const tx=NETX+d*rnd(60,260),Tt=.42;B.vx=(tx-x0)/Tt;B.vy=(FLOOR-BR-y0-.5*GB*Tt*Tt)/Tt;
  B.lastHitter=P;B.touches=0;B.cross=true;B.kind='stuff';B.hot=1;AU.boom();
  if(P===G.ctrl)G.stats.blocks++;
  if(G.cineCd<=0&&human)cineBlock(P,RAR[P.ch.rar]);else{FX.ring(x0,y0,6,60,'#fff',.25,3);shake(5)}}
 else if(r0<stuffP+toolP){ // tooled: off the fingertips and out the back
  const r=arc(x0,y0,NETX-d*rnd(1150,1350),FLOOR-BR,y0-rnd(60,160));B.vx=r.vx;B.vy=r.vy;
  B.lastHitter=P;B.touches=0;B.cross=false;B.kind='tool';B.hot=0;AU.net();
  banner({text:'TOOLED!',sub:(A?A.name.toUpperCase():'')+' USES THE BLOCK',col:'#ffb02e',dur:1,small:true})}
 else{ // soft touch: pops up on the blocker's side, they still get 3 touches
  const r=arc(x0,y0,NETX-d*rnd(150,450),FLOOR-178,Math.min(y0,NETTOP)-rnd(80,180));B.vx=r.vx;B.vy=r.vy;
  B.lastHitter=null;B.touches=0;B.cross=false;B.kind='block';B.hot=0;AU.bump(2);
  FX.text(x0,y0-40,'BLOCK TOUCH','#bff0ff',24,.8);B.blkNote=1.6}
 B.vr=(B.vx>0?1:-1)*6;
 if(human)P.hype=Math.min(100,P.hype+8)}

/* ===== cinematics: short, readable, no screen-filling noise ===== */
function cineSpike(P,ra){nev({k:'cine',c:'spike',p:P.id});const ri=ra.i,col=P.ch.fx,B=ball;G.cineCd=5;
 hitstop(.16);flash('#ffffff',.5);impactFrame(.14);slowmo(.3,.55);letterbox(true);D.focus={kind:'player',P,z:1.5};CAM.spot={P,r:320};CAM.dim=.5;CAM.tint=col;CAM.tintA=.14;
 banner({text:'PERFECT SPIKE',sub:P.ch.name.toUpperCase()+' — '+TRAIT[P.ch.spk].n.toUpperCase(),col:ri>=1?RAR[P.ch.rar].col:'#ffd23d',dur:1.4,big:true,rar:Math.max(ri,1),portrait:P.ch.id});
 FX.ring(B.x,B.y,8,150,'#ffffff',.3,6);FX.ring(B.x,B.y,8,240,col,.5,3);
 FX.burst(B.x,B.y,22,{col,v0:300,v1:900,l0:.15,l1:.35,s0:2,s1:4,drag:4,kind:'streak'});
 AU.ult(Math.min(2,ri));AU.boom();shake(14);
 after(.24,()=>{D.focus={kind:'ball',z:1.2};CAM.spot=null;CAM.dim=.25});
 after(1,()=>{if(!ball.killcam){letterbox(false);CAM.dim=0;CAM.tintA=0;if(D.focus&&D.focus.kind==='ball')D.focus=null}})}
// no-touch kill by you: the camera rides the ball into the floor
function killCancel(){nev({k:'cine',c:'kx'});const B=ball;B.killcam=0;D.focus=null;letterbox(false);CAM.dim=0;CAM.tintA=0;D.slowT=0;D.slowV=1}
function killCam(){nev({k:'cine',c:'kc'});const B=ball;B.killcam=1;D.focus={kind:'ball',z:1.3};slowmo(.35,.5);letterbox(true);CAM.dim=Math.max(CAM.dim,.25);CAM.spot=null}
function killLand(x){flash('#ffffff',.35);impactFrame(.1);hitstop(.1);shake(12);const c=ball.fx?ball.fx.col:'#ff9b3d';
 FX.ring(x,FLOOR-4,10,200,'#fff',.4,5);FX.ring(x,FLOOR-4,10,320,c,.6,3);FX.burst(x,FLOOR-6,20,{col:c,v0:200,v1:700,ang:-Math.PI/2,spread:1.3,l0:.2,l1:.5,s0:2,s1:5,drag:3,kind:'streak'});
 banner({text:'NO-TOUCH KILL',sub:ball.lastHitter?ball.lastHitter.name.toUpperCase():'',col:'#ff9b3d',dur:1.3,big:true});AU.boom();
 D.focus={kind:'pt',x,y:FLOOR-120,z:1.1};after(.9,()=>{letterbox(false);CAM.dim=0;CAM.tintA=0;D.focus=null})}
function cineUlt(P,ra,name){nev({k:'cine',c:'ult',p:P.id,n:name});const ri=ra.i,col=P.ch.fx;G.cineCd=7;
 hitstop(.18);slowmo(.2,.9);letterbox(true);D.focus={kind:'player',P,z:1.25};CAM.spot={P,r:360};CAM.dim=.55;
 flash('#ffffff',.3);CAM.tint=col;CAM.tintA=.18;
 banner({text:name.toUpperCase(),sub:P.ch.name.toUpperCase()+' — ACTIVE SKILL',col,dur:1.8,big:true,rar:Math.max(ri,2),ult:true,portrait:P.ch.id});
 FX.ring(ball.x,ball.y,8,180,col,.45,6);FX.burst(ball.x,ball.y,24,{col,v0:120,v1:520,l0:.3,l1:.7,s0:3,s1:8,drag:3});
 AU.ult(3);AU.boom();shake(12);
 after(.6,()=>{D.focus={kind:'ball',z:1};CAM.spot=null;CAM.dim=.15});
 after(1.6,()=>{letterbox(false);CAM.dim=0;CAM.tintA=0;D.focus={kind:'ball',z:.85}});
 after(2.6,()=>{if(D.focus&&D.focus.kind==='ball')D.focus=null})}
// setter / libero active: freeze, banner, and the next teammate spike becomes an active spike
function cineSig(P,ra,name){nev({k:'cine',c:'sig',p:P.id,n:name});const ri=ra.i,col=P.ch.fx;G.cineCd=5;
 hitstop(.1);slowmo(.3,.55);letterbox(true);D.focus={kind:'player',P,z:1.15};CAM.spot={P,r:380};CAM.dim=.45;
 CAM.tint=col;CAM.tintA=.14;
 banner({text:name.toUpperCase(),sub:P.ch.name.toUpperCase()+' — ACTIVE SKILL',col,dur:1.5,big:true,rar:Math.max(ri,2),ult:true,portrait:P.ch.id});
 FX.ring(ball.x,ball.y,8,140,col,.4,5);AU.ult(2);shake(6);
 after(.55,()=>{D.focus=null;CAM.spot=null;CAM.dim=0;letterbox(false);CAM.tintA=0})}
function cineDig(P,ra){nev({k:'cine',c:'dig',p:P.id});const ri=ra.i,col=P.ch.fx;G.cineCd=4;
 hitstop(.06);slowmo(.4,.4);D.focus={kind:'player',P,z:1.0};
 banner({text:'PERFECT DIG!',sub:P.ch.name.toUpperCase()+' SAVES IT',col:'#7dffe0',dur:1.1,big:true,rar:ri});
 FX.ring(P.x,FLOOR-14,8,90,col,.35,4);AU.perfect();shake(4);
 after(.5,()=>{D.focus=null})}
function cineBlock(P,ra){nev({k:'cine',c:'block',p:P.id});G.cineCd=4;
 hitstop(.08);slowmo(.4,.35);D.focus={kind:'pt',x:(P.x+ball.x)/2,y:ball.y,z:1.0};
 banner({text:'STUFFED!',sub:P.ch.name.toUpperCase()+' — '+P.ch.title.toUpperCase(),col:'#ff9b3d',dur:1.1,big:true,rar:ra.i});
 FX.ring(ball.x,ball.y,8,100,P.ch.fx,.35,5);FX.burst(ball.x,ball.y,12,{col:P.ch.fx,v0:80,v1:320,l0:.2,l1:.45,s0:2,s1:6,drag:3});
 AU.boom();shake(9);
 after(.5,()=>{D.focus={kind:'ball',z:.85}});after(1.2,()=>{if(D.focus&&D.focus.kind==='ball')D.focus=null})}

/* ===== ball physics ===== */
// the net is a 1m mesh from the tape down; below it is open air (crossing there is a fault)
const MESH=100;
function netBump(B){
 const py=clamp(B.y,NETTOP,NETTOP+MESH);let dx=B.x-NETX,dy=B.y-py,dist=Math.hypot(dx,dy);
 if(dist<BR+3){let nx=dx/dist,ny=dy/dist;if(dist<1e-3){nx=B.x<NETX?-1:1;ny=0}
  B.x=NETX+nx*(BR+3);B.y=py+ny*(BR+3);const vn=B.vx*nx+B.vy*ny;
  const tape=ny<-.45;
  // the tape is a springy cord: the ball pops off it and always rolls off one side (it can't balance up there)
  if(tape&&Math.abs(B.vx)<140){const sd=Math.abs(nx)>.08?Math.sign(nx):B.vx?Math.sign(B.vx):(Math.random()<.5?-1:1);B.vx=sd*rnd(150,240)}
  if(vn<0){if(tape){B.vx-=1.5*vn*nx;B.vy-=1.5*vn*ny;B.vx*=.85}else{B.vx-=1.38*vn*nx;B.vy-=1.38*vn*ny;if(ny<.3){B.vx*=.45}}B.gs=1;if(-vn>120){AU.net();NET.v+=clamp(-vn*(B.vx>0?1:-1)*.012*Math.sign(nx),-14,14);B.hot=0;B.fx=null;B.unstop=false;if(-vn>500)shake(3)}}}}
function updBall(dt){
 const B=ball;if(B.cd>0)B.cd-=dt;if(B.blkNote>0)B.blkNote-=dt;ULTframe(dt);
 if(B.live||B.dead){
  const sp=Math.hypot(B.vx,B.vy),n=clamp(Math.ceil(sp*dt/9),1,10),h=dt/n;
  for(let i=0;i<n;i++){const ox=B.x;B.vy+=GB*B.gs*h;B.x+=B.vx*h;B.y+=B.vy*h;ULTstep(B,h);if(!(B.ult&&!B.ult.done))netBump(B);if(B.live){blockCheck(B);
    if((ox-NETX)*(B.x-NETX)<0&&B.y>NETTOP+MESH){B.live=false;B.dead=true;scorePoint(1-Math.max(0,B.lastTeam),'UNDER NET');break}}
   if(B.y>=FLOOR-BR&&B.vy>0){B.y=FLOOR-BR;B.gs=1;if(B.live)landed();else{B.vy*=-.5;B.vx*=.75;B.vr=B.vx/BR;if(Math.abs(B.vy)<90)B.vy=0;if(Math.abs(B.vy)>140)AU.bounce(.5)}}
   if(B.live&&(B.x<-90||B.x>WW+90)){B.live=false;B.dead=true;outBall();break}}
  B.rot+=B.vr*dt;B.vr*=Math.exp(-.8*dt)}
 // trail
 if(B.live&&(B.hot||B.sig||sp2(B)>800)){B.trail.unshift({x:B.x,y:B.y});if(B.trail.length>16)B.trail.pop()}else if(B.trail.length)B.trail.pop();
 if(B.live&&B.fx)trailFX(B,dt);
 if(B.sq>0)B.sq-=dt;
 const H=B.lastHitter&&B.lastHitter.in?B.lastHitter:null;
 if(H&&B.live&&!B.killcam&&B.kind==='spike'&&B.kc!==B.evt){const dd=dirOf(H.team);
  if((B.x-NETX)*dd>60){const e=etaY(FLOOR-BR);if(e!==null&&e<.16){B.kc=B.evt;const lx=ballAt(e).x;
   if(lx>=LINE_L+20&&lx<=LINE_R-20&&!TM[1-H.team].players.some(q=>Math.abs(q.x+q.face*36-lx)<100+(q.role==='L'?700:550)*e||(q.swing&&!q.swing.done&&Math.abs(q.x-lx)<300)||q.dive))killCam()}}}}
const sp2=B=>Math.hypot(B.vx,B.vy);
function trailFX(B,dt){const f=B.fx,c=f.rar==='mythic'?hsl(D.clock*600%360,100,65):f.ri>=1?f.col:'#ffffff';
 if(Math.random()<dt*40)FX.add({x:B.x,y:B.y,life:.22,s:9,s1:1,col:c,kind:'glow',drag:0})}

function outBall(){const B=ball;scorePoint(1-B.lastTeam,'OUT')}
function landed(){const B=ball;B.live=false;B.dead=true;
 const x=B.x,inb=x>=LINE_L-BR*.5&&x<=LINE_R+BR*.5,side=x<NETX?0:1;ULTland(B,x);
 const loser=inb?side:(B.lastTeam<0?side:B.lastTeam);
 nev({k:'land',x,kl:B.killcam&&inb&&side!==B.lastTeam?1:0});impact(x,B);if(B.killcam){if(inb&&side!==B.lastTeam)killLand(x);else killCancel()}
 const ace=B.hits===1&&inb&&B.kind==='serve';
 scorePoint(1-loser,inb?(ace?'ACE':B.hot?'SMASH':'IN'):'OUT',ace,B)}
function impact(x,B){const f=B.fx,hot=B.hot,col=f?f.col:'#f6e7c0',hard=hot&&sp2(B)>1300;
 AU.bounce(hot?1.3:1);FX.burst(x,FLOOR-3,hot?12:6,{col:'#d9c9a8',v0:40,v1:hot?260:140,ang:-Math.PI/2,spread:1.3,l0:.25,l1:.5,s0:3,s1:7,drag:3,add:false,kind:'dot'});
 FX.ring(x,FLOOR-2,8,hot?90:50,'#fff',.3,3);
 if(hot||B.unstop){shake(6+(B.unstop?6:0)+(hard?3:0));DECAL.push({x,t:0,col,r:40+(hard?12:0),crack:hard||B.unstop});if(hard)hitstop(.04)}}

/* ===== scoring ===== */
function scorePoint(winner,why,ace,B){
 if(G.state==='point'||G.state==='over')return;
 ball.live=false;ball.serving=false;G.score[winner]++;G.state='point';G.timer=2.1;
 const hum=G.humanTeam,mine=winner===hum;
 if(winner!==G.serving){G.serving=winner;G.srv[winner]^=1}
 for(const P of G.players){P.mood=P.team===winner?'win':'lose';P.serveStage='';if(!(P.swing&&P.swing.done&&P.swing.hitAt!=null))P.swing=null; // a finished attack swing plays out its follow-through
 P.pending=null;if(P.team!==winner)P.armed=false}
 ptFX(winner);
 if(why==='UNDER NET')banner({text:'UNDER THE NET',sub:'Ball crossed below the net',col:'#ff7b7b',dur:1.2});
 let txt=why==='ACE'?'ACE!':why==='SMASH'?'SMASH!':why==='OUT'?'OUT!':why==='4 TOUCHES'?'4 TOUCHES':'POINT';
 if(why==='4 TOUCHES'||why==='OUT')banner({text:txt,sub:why==='OUT'?'Landed out':'Only 3 hits allowed',col:'#ff7b7b',dur:1.2});
 else if(ace){banner({text:'ACE!',sub:ball.lastHitter?ball.lastHitter.name.toUpperCase()+' SERVES IT UNTOUCHED':'',col:'#ffd23d',dur:1.4,big:true});if(winner===hum)G.stats.aces++;shake(10);FX.burst(ball.x,FLOOR-20,14,{col:'#ffd23d',v0:80,v1:360,l0:.4,l1:.8,s0:3,s1:7,drag:2})}
 else if(why==='SMASH'&&!ball.unstop&&!ball.killcam&&(winner===hum||G.net)&&G.rally>1)banner({text:'KILL!',sub:ball.lastHitter?ball.lastHitter.name.toUpperCase():'',col:'#ff9b3d',dur:.9});
 if(ball.unstop)banner({text:'UNSTOPPABLE',col:'#fff',dur:1.2});
 if((mine||G.net)&&G.rally>=8)banner({text:G.rally+' HIT RALLY',col:'#7dffe0',dur:1.2});
 for(const q of TM[winner].players)if(q.in)q.hype=Math.min(100,q.hype+(G.rally>6?10:5));
 if(G.rally>=4&&hum>=0)S.bestRally=Math.max(S.bestRally||0,G.rally);
 const sc=G.score,mx=Math.max(sc[0],sc[1]),df=Math.abs(sc[0]-sc[1]);
 if((mx>=G.target&&df>=2)||mx>=G.target+4){G.over=true;G.timer=2.6}
 else if(mx>=G.target-1&&(hum>=0||G.net)&&sc[0]!==sc[1])banner({text:(sc[winner]>=G.target-1?'MATCH POINT':'GAME POINT'),col:'#ff4d8d',dur:1.1,small:true});
 if(!ace&&!G.over&&G.rally>3)G.timer=2.3}

// point sounds + confetti, relative to whoever is watching this screen
function ptFX(w){const hum=G.humanTeam,mine=w===hum;nev({k:'pt',w});
 AU.point(mine||hum<0);AU.whistle();AU.crowd(1,.1);setTimeout(()=>AU.crowd(.35,1.5),700);
 if(mine)for(let i=0;i<24;i++)FX.add({x:CAM.x+rnd(-1000,1000),y:CAM.y-rnd(500,700),vx:rnd(-60,60),vy:rnd(40,200),ay:100,life:rnd(1.4,2.4),s:rnd(5,9),col:hsl(rndi(0,360),90,60),kind:'confetti',vr:rnd(-6,6),drag:.4,add:false})}
function afterPoint(){
 if(G.over){endMatch();return}
 positionForServe();G.state='serve';G.timer=0;G.cineCd=Math.max(0,G.cineCd-1)}
function endMatch(){
 G.state='over';endFX();G.timer=G.humanTeam>=0||G.net?3.2:1.6;
 G.endT=G.timer}
function endFX(){nev({k:'end'});const hum=G.humanTeam,w0=G.score[0]>G.score[1],win=hum<0?true:hum?!w0:w0;
 if(hum>=0||G.net){letterbox(true);banner({text:hum<0?G.school[w0?0:1].toUpperCase()+' WIN':win?'VICTORY!':'DEFEAT',sub:G.score[0]+' – '+G.score[1],col:win?'#ffd23d':'#8aa0c8',dur:3,big:true,nf:true});if(win){AU.point(true);for(let i=0;i<90;i++)FX.add({x:CAM.x+rnd(-1100,1100),y:CAM.y-rnd(600,900),vx:rnd(-80,80),vy:rnd(80,300),ay:120,life:rnd(2,4),s:rnd(5,10),col:hsl(rndi(0,360),90,60),kind:'confetti',vr:rnd(-6,6),drag:.3,add:false})}}}

/* ===== who plays the ball next (role based: libero digs, setter sets, spiker hits) ===== */
function landingX(){const B=ball,e=etaY(FLOOR-92);return e===null?B.x:ballAt(e).x}
const ROLE_BIAS={L:-.12,WS:0,S:.32};
function pickNext(t){const T=TM[t],B=ball,inc=B.lastTeam!==t,tn=inc?0:B.touches,last=B.lastHitter;
 if(!inc&&tn>=3)return null;
 const [Sp,Wp,Lp]=T.players;
 const ok=p=>!(p.h>4&&!p.armed)&&(inc||p!==last);
 if(tn===1){if(last!==Sp)return Sp;return Lp}
 if(tn===2){
  // the spiker attacks, unless the ball has already dropped past them
  const miss=Wp.human&&B.vy>0&&B.y>FLOOR-Wp.h-140&&!(Wp.swing&&!Wp.swing.done);
  if(last!==Wp&&!miss)return Wp;
  const c=[Lp,Sp,Wp].filter(p=>p!==last&&!(miss&&p===Wp));if(!c.length)return null;return c.reduce((a,b)=>Math.abs(a.x-B.x)<Math.abs(b.x-B.x)?a:b)}
 // receive: whoever gets there first, liberos preferred, setter last
 if((B.x-NETX)*dirOf(t)>0&&!B.cross)return null; // ball still on the other side, not coming yet: everyone holds their spot
 const xl=clamp(landingX(),sideLo(t),sideHi(t));let best=null,bc=1e9;
 for(const p of T.players){if(!ok(p))continue;const c=Math.abs(p.x-xl)/p.spd+ROLE_BIAS[p.role]+(p.swing&&p.swing.pose==='block'?1:0);if(c<bc){bc=c;best=p}}
 return best}
function updNext(){const B=ball;if(!B.live||B.serving)return;
 for(const t of [0,1]){const T=TM[t],cur=T.next;
  if(cur&&(cur.swing||cur.dive)&&cur.swing&&cur.swing.pose!=='block'){continue}
  let nx=pickNext(t);
  // a little stickiness so two players don't swap back and forth
  if(cur&&nx&&cur!==nx&&B.lastTeam!==t&&cur.h<=4){const xl=landingX(),cc=Math.abs(cur.x-xl)/cur.spd+ROLE_BIAS[cur.role],cn=Math.abs(nx.x-xl)/nx.spd+ROLE_BIAS[nx.role];if(cc<cn+.12)nx=cur}
  // holding SPACE on an incoming ball = you want it
  for(const H0 of T.players)if(H0.in&&H0.in.hold&&B.lastTeam!==t&&!(H0.swing&&H0.swing.pose==='block')&&H0.h<=4&&!H0.dive&&!H0.stun){nx=H0;break}
  // libero backs you up: if you're the one on it but aren't playing it, the backup dives in at the last moment
  for(const H of T.players)if(H.in&&(T.next===H||T.cover===B.evt&&T.coverH===H)&&!H.swing&&!H.dive&&H.h<=6&&B.vy>0&&(B.x-NETX)*dirOf(t)<0){
   const e=etaY(FLOOR-92),ipH=ideal(H,'bump'),far=Math.abs(landingX()-ipH.x)>ipH.r*1.05;if(T.cover===B.evt||(e!==null&&(e<.05||e<.18&&far))){const bk=backupOf(T,H);if(bk){nx=bk;T.cover=B.evt;T.coverH=H;break}}}
  T.next=nx}}
function backupOf(T,H){const B=ball,last=B.lastTeam===TM.indexOf(T)?B.lastHitter:null,ord=['L','WS','S'];
 for(const r of ord){const p=T.players.find(q=>q.role===r);if(p&&p!==H&&!p.in&&p!==last&&!(p.h>4&&!p.armed))return p}return null}
function updCtrl(){if(G.humanTeam<0||G.net)return;const want=TM[G.humanTeam].players[ROLES.indexOf(G.role)];if(G.ctrl!==want)G.ctrl=want}

/* ===== AI ===== */
const moveTo=(P,gx)=>{P.A.mx=Math.abs(gx-P.x)<6?0:clamp((gx-P.x)/48,-1,1)};
function aiServe(P,dt,sk){const A=P.A;
 if(P.serveStage==='ready'){A.srvT-=dt;if(A.srvT<=0){A.jit=gauss()*lerp(.06,.012,sk);A.aim=rnd(-1,1);doAct(P,{t:'toss'})}}
 else if(P.serveStage==='toss'&&!P.swing&&!P.pending&&P.h<=0&&P.tossT>.3){const v=P.jv*.85,e=etaY(FLOOR-v*v/(2*GP)-172);if(e!==null&&e<=v/GP+A.jit)doAct(P,{t:'srvjump'})}}
// where each role stands when it isn't playing the ball
function formX(P){const d=dirOf(P.team),B=ball,t=P.team,T=TM[t],ours=B.lastTeam===t,r=P.role;
 if(!B.live||B.serving&&ours)return{gx:NETX-d*BASE[r]};
 // backing up the human: sit just behind where the ball is coming down
 const H=T.next&&T.next.in?T.next:null,lxB=landingX();if(H&&P!==H&&(lxB-NETX)*d<-40&&backupOf(T,H)===P){const gx=lxB-d*130;return{gx:r==='L'?(d>0?clamp(gx,sideLo(t),NETX-260):clamp(gx,NETX+260,sideHi(t))):clamp(gx,sideLo(t),sideHi(t))}}
 if(ours&&!B.cross){const tt=TOSS[roleP(t,'S').ch.toss];return{gx:NETX-d*(r==='S'?BASE.S:r==='WS'?tt.hx+260:560)}}
 if(ours&&B.cross)return{gx:NETX-d*(r==='S'?110:r==='WS'?330:700)};
 // the other team has it
 if(!B.cross&&(B.x-NETX)*d>0){
  if(r!=='L'&&B.touches>=1&&T.players.some(h=>h.in&&h!==P&&h.role!=='L'&&Math.abs(h.x-NETX)<220))return{gx:NETX-d*420};
  if(B.touches>=2&&r!=='L')return{gx:NETX-d*(r==='S'?72:90),block:true};
  if(B.touches>=1&&r!=='L')return{gx:NETX-d*(r==='S'?72:330),block:r==='S'};
  return{gx:NETX-d*(r==='S'?110:r==='WS'?330:700)}}
 // incoming to us
 return{gx:NETX-d*(r==='S'?BASE.S:r==='WS'?420:700)}}
function aiPlan(P,sk){
 const A=P.A,T=TM[P.team],O=TM[1-P.team],d=dirOf(P.team),B=ball,incoming=B.lastTeam!==P.team,tn=incoming?0:B.touches;
 if(B.unstop&&incoming&&!P.human){A.p={kind:'idle'};return}
 if(T.next===P){
  let pose='bump',yc=FLOOR-92,attack=false;const bs=Math.hypot(B.vx,B.vy);
  if(tn===0){if(P.role!=='L'&&B.y<FLOOR-260&&bs<700){pose='set';yc=FLOOR-178}}
  else if(tn===1){pose='set';yc=FLOOR-178}
  else if(P.role!=='L'){const ya=hitY(P);if(etaY(ya)!==null&&(B.x-NETX)*d<0){pose='spike';yc=ya;attack=true}}
  if(etaY(yc)===null){pose='bump';yc=FLOOR-92;attack=false}
  const e2=etaY(yc),ix=e2===null?B.x:ballAt(e2).x;let off=pose==='bump'?36:pose==='set'?18:26;
  if(attack&&!P.human){ // pick deep or short by where to meet the ball, aiming away from the defenders
   let bestU=0,bestS=-1;for(let u=-1;u<=1.01;u+=.25){const tx=NETX+d*spikeDist(u);const m=Math.min(...O.players.map(q=>Math.abs(q.x-tx)))+rnd(0,90*(1.1-sk));if(m>bestS){bestS=m;bestU=u}}
   off=26+bestU*50;A.aim=0}
  else A.aim=rnd(-.4,.4);
  A.p={kind:'play',pose,yc,attack,gx:clamp(ix-P.face*off+(P.human?0:A.nx),sideLo(P.team),sideHi(P.team))};return}
 const f=formX(P);A.p={kind:f.block?'block':'cover',gx:f.gx}}
function aiThink(P,dt){
 const A=P.A,d=dirOf(P.team),B=ball,sk=G.aiSkill[P.team],O=TM[1-P.team];A.mx=0;
 if(G.state==='intro'||G.state==='point'||P.dive||P.stun>0)return;
 if(P.serveStage){aiServe(P,dt,sk);return}
 const live=B.live&&!B.dead&&!B.serving;
 if(!live){moveTo(P,NETX-d*BASE[P.role]);return}
 if(A.evt!==B.evt){A.evt=B.evt;A.nx=gauss()*lerp(55,5,sk)*(Math.random()<lerp(.2,.02,sk)?3:1);A.jit=gauss()*lerp(.065,.012,sk);
  const tt=TOSS[B.toss]||TOSS.high;A.blkOn=hasM(P,'curtain')||Math.random()<lerp(.4,.9,sk)*(.35+.65*tt.blk);A.blkD=lerp(.2,.09,sk)+Math.abs(gauss())*.04+(B.toss==='quick'?.13:0);A.blkT=0;A.thT=0}
 A.thT-=dt;if(A.thT<=0||!A.p){A.thT=lerp(.15,.04,sk);aiPlan(P,sk)}
 const p=A.p;if(!p)return;const grounded=P.h<=0&&P.vh<=0;
 if(p.kind==='play'){
  moveTo(P,p.gx);const e=etaY(p.yc);
  if(p.attack){const tAp=P.jv/GP;
   if(grounded&&!P.swing&&e!==null&&e<=tAp+.1+A.jit&&e>.05)doAct(P,{t:'jump',armed:true});
   else if(!grounded&&!P.swing&&e!==null&&e<=.19+A.jit*.6&&e>-.06)doAct(P,{t:'swing',pose:'spike'})}
  else if(grounded&&!P.swing&&e!==null){
   const ip=ideal(P,p.pose),lat=ballAt(e).x-ip.x;
   if(e<=.13+A.jit&&Math.abs(lat)<ip.r*.95)doAct(P,{t:'swing',pose:p.pose});
   else if(Math.abs(lat)>ip.r*1.0&&sk>.25&&(B.x-NETX)*d<60&&wantDive(P,ballAt(e).x-P.x,e))doAct(P,{t:'dive',dir:sgn(ballAt(e).x-P.x)})}}
 else if(p.kind==='block'){moveTo(P,p.gx);
  const att=O.players.find(q=>q.armed&&q.h>3);
  if(att){A.blkT+=dt;if(grounded&&!P.swing&&!P.pending&&A.blkOn&&A.blkT>=A.blkD&&Math.abs(P.x-NETX)<170)doAct(P,{t:'jump',pose:'block'})}else A.blkT=0}
 else if(p.kind==='cover'||p.kind==='idle'){moveTo(P,p.kind==='idle'?P.x:p.gx)}}
// you: the game walks you to the ball, you supply the timing (Space). Arrows nudge.
// setter + libero are easier: they always run to their spot, and a ball they'd otherwise let drop gets a safe touch
function humanThink(P,dt){const A=P.A,B=ball,I=P.in,easy=P.role!=='WS';A.mx=0;
 if(G.state==='intro'||G.state==='point'||P.dive||P.stun>0)return;
 // SPACE on your attack ball always counts, even mid-pass: you take off on time for your reach
 if(I.buf>0&&P.h<=0&&!P.dive&&!P.serveStage&&B.live&&!blockable(P)){const T=TM[P.team],pre=P.role==='WS'&&B.lastTeam===P.team&&B.touches===1&&T.next&&T.next!==P&&T.next.role==='S';
  if(P.A.p&&P.A.p.attack||pre){P.autoJ=pre?B.evt+1:B.evt;I.buf=0}}
 if(I.buf>0){const a=chooseAct(P);if(a&&a.t!=='wait'){if(a.t!=='hold')doAct(P,a);I.buf=0}}
 const live=B.live&&!B.dead&&!B.serving;
 if(P.serveStage)return;
 // you move yourself (arrows). Holding SPACE = autopilot: run to the ball and play it safely
 if(!live)A.p=null;
 else{A.thT-=dt;if(A.thT<=0||!A.p){A.thT=.04;aiPlan(P,1)}
  const p=A.p;if(p&&P.h<=6&&(easy?p.kind!=='idle':I.hold&&p.kind==='play'))moveTo(P,p.gx);
  // hold Space = auto-timed receive / set (can't be PERFECT — tap for that)
  const grounded=P.h<=0&&P.vh<=0;I.ht=I.hold?(I.ht||0)+dt:0;
  // a jump pressed early fires at the moment that puts your hand at the set's height
  if(P.autoJ===B.evt&&p&&p.attack&&grounded&&!P.swing&&!P.pending){const e=etaY(p.yc);if(e===null||e<=P.jv/GP+.08){doAct(P,{t:'jump',armed:true});P.autoJ=-1}}
  // keep holding SPACE after the jump = auto-timed spike (GOOD at best; tap for the big one)
  // (the plan can go stale mid-air, so our own set on our side counts too; a late but close ball still gets swung at)
  if(I.ht>.3&&P.armed&&P.h>6&&!P.swing&&(p&&p.attack||B.lastTeam===P.team&&B.kind==='set'&&(B.x-NETX)*dirOf(P.team)<0)){const pr=predictHit(P,.5);if(pr.dd<30&&pr.t<=.2||pr.dd<55&&pr.t<=.06)startSwing(P,'spike',true)}
  if(p&&p.kind==='play'&&!p.attack&&grounded&&!P.swing&&!P.pending){const e=etaY(p.yc);
   if(I.hold&&e!==null&&e<=.12){const ip=ideal(P,p.pose),lat=ballAt(e).x-ip.x;if(Math.abs(lat)<ip.r)startSwing(P,p.pose,true)}
   // safety net: you didn't press anything and it's about to drop — a plain, safe touch
   else if(easy&&e!==null&&TM[P.team].next===P){const bx=ballAt(e).x,ip=ideal(P,p.pose),lat=bx-ip.x;
    if(e<=.08&&Math.abs(lat)<ip.r)startSwing(P,p.pose,'safe');
    else if(P.role==='L'&&Math.abs(lat)>ip.r&&(B.x-NETX)*dirOf(P.team)<60&&wantDive(P,bx-P.x,e))doAct(P,{t:'dive',dir:sgn(bx-P.x)})}}}
 const man=I.r-I.l;if(man)A.mx=man}

/* ===== main sim ===== */
function simStep(dt){
 G.time+=dt;G.t+=dt;
 if(G.cineCd>0)G.cineCd-=dt;
 NET.v+=(-NET.sway*180-NET.v*6)*dt;NET.sway+=NET.v*dt;
 for(let i=DECAL.length-1;i>=0;i--){DECAL[i].t+=dt;if(DECAL[i].t>6)DECAL.splice(i,1)}
 if(G.state==='intro'){G.timer-=dt;if(G.timer<=0){G.state='serve';AU.inten=G.humanTeam>=0||G.net?1:0}}
 else if(G.state==='point'){G.timer-=dt;if(G.timer<=0)afterPoint()}
 else if(G.state==='over'){G.timer-=dt;if(G.timer<=0&&!G.finished){G.finished=true;if(G.onEnd)G.onEnd({win:G.humanTeam===1?G.score[1]>G.score[0]:G.score[0]>G.score[1],score:G.score.slice(),stats:Object.assign({},G.stats),best:G.best,level:G.level})}}
 if(G.state!=='over'&&G.state!=='point')updNext();
 updCtrl();
 for(const P of G.players)updPlayer(P,dt);
 updBall(dt);
 FX.update(dt)}

function startMatch(o){G.finished=false;newMatch(o)}

/* ===== input ===== */
const IN={l:0,r:0,u:0,d:0,buf:0,hold:0,keys:{}};
function press(){IN.buf=.16;IN.hold=1;AU.resume()}
const ACTK=['Space','KeyJ','KeyK'];
addEventListener('keydown',e=>{if(e.repeat){if(['Space','ArrowUp','ArrowDown','ArrowLeft','ArrowRight'].includes(e.code))e.preventDefault();return}
 const c=e.code;
 if(c==='ArrowLeft'||c==='KeyA')IN.l=1;
 else if(c==='ArrowRight'||c==='KeyD')IN.r=1;
 else if(c==='ArrowUp'||c==='KeyW')IN.u=1;
 else if(c==='ArrowDown'||c==='KeyS')IN.d=1;
 else if(ACTK.includes(c)||c==='Enter'&&G.on&&!G.paused)press();
 if(['Space','ArrowUp','ArrowDown','ArrowLeft','ArrowRight'].includes(c))e.preventDefault();
 if(c==='Escape'||c==='KeyP'){if(window.Game)Game.togglePause()}});
addEventListener('keyup',e=>{const c=e.code;
 if(c==='ArrowLeft'||c==='KeyA')IN.l=0;else if(c==='ArrowRight'||c==='KeyD')IN.r=0;else if(c==='ArrowUp'||c==='KeyW')IN.u=0;else if(c==='ArrowDown'||c==='KeyS')IN.d=0;
 else if(ACTK.includes(c)||c==='Enter')IN.hold=0});
addEventListener('blur',()=>{IN.l=IN.r=IN.u=IN.d=IN.hold=0});

/* ===== canvas ===== */
const cv=document.getElementById('cv'),g=cv.getContext('2d');
let VS=1,VX=0,VY=0,DPR=1;
function resize(){DPR=Math.min(2,devicePixelRatio||1);const w=innerWidth,h=innerHeight;cv.width=w*DPR;cv.height=h*DPR;cv.style.width=w+'px';cv.style.height=h+'px';
 VS=Math.min(w/W,h/H);VX=(w-W*VS)/2;VY=(h-H*VS)/2;const st=document.getElementById('stage');if(st){st.style.width=W*VS+'px';st.style.height=H*VS+'px';st.style.left=VX+'px';st.style.top=VY+'px';st.style.setProperty('--u',VS+'px')}}
addEventListener('resize',resize);resize();
const IMG={crowd:new Image(),arena:new Image(),logo:new Image()};IMG.crowd.src='assets/crowd.jpg';IMG.arena.src='assets/arena.jpg';IMG.logo.src='assets/logo.png';
const _pi={};function pimg(id){if(!_pi[id]){const i=new Image(),fb=()=>{i.onerror=null;i.src=portrait(id,CH[id]&&CH[id].school?1:0,'win')};const u=aiPort(id);if(u){i.onerror=fb;i.src=u}else fb();_pi[id]=i}return _pi[id]}

/* ===== camera ===== */
// the rally camera sits wide and low like a broadcast: lots of sky for high sets and big jumps
const ZB=.56,CAMY0=FLOOR-(H/2-60)/ZB;
function updCam(rdt){
 let tx=WW/2,ty=CAMY0,tz=ZB;const f=D.focus;
 if(f){const z=f.z*.8;if(f.kind==='ball'){tx=ball.x;ty=ball.y+40;tz=z}else if(f.kind==='player'){tx=f.P.x+f.P.face*30;ty=FLOOR-f.P.h-110;tz=z}else{tx=f.x;ty=f.y;tz=z}}
 else if(G.on&&ball&&G.state==='rally'){tx=WW/2+(ball.x-WW/2)*.25;ty=CAMY0+Math.min(0,ball.y+250)*.5;tz=ZB-clamp((-250-ball.y)/3000,0,.05)}
 const k=1-Math.exp(-(f?9:3.5)*rdt);CAM.z+=(tz-CAM.z)*k;
 const hw=W/2/CAM.z,hh=H/2/CAM.z;tx=clamp(tx,-150+hw,WW+150-hw);ty=clamp(ty,-900+hh,FLOOR+140-hh);
 CAM.x+=(tx-CAM.x)*k;CAM.y+=(ty-CAM.y)*k;
 CAM.shake*=Math.exp(-7*rdt);if(CAM.shake<.3)CAM.shake=0;CAM.sx=rnd(-1,1)*CAM.shake;CAM.sy=rnd(-1,1)*CAM.shake;
 CAM.flash=Math.max(0,CAM.flash-rdt*2.2);CAM.lb+=(CAM.lbT-CAM.lb)*(1-Math.exp(-8*rdt));CAM.lines=Math.max(0,CAM.lines-rdt*1.1);CAM.imp=Math.max(0,CAM.imp-rdt)}

/* ===== rendering ===== */
let floorCv=null;
// the hardwood is static: render it once to an offscreen canvas. The court is drawn in perspective,
// far sideline just behind the players' feet, near sideline toward the viewer.
const FOX=520,FTOP=26;
function buildFloor(){const c=document.createElement('canvas');c.width=WW+FOX*2;c.height=H-FLOOR+FTOP+150;const f=c.getContext('2d'),ox=FOX,fy=FTOP;
 const gr=f.createLinearGradient(0,0,0,c.height);gr.addColorStop(0,'#2a1c14');gr.addColorStop(.12,'#c88e50');gr.addColorStop(.45,'#b07438');gr.addColorStop(1,'#5a3418');f.fillStyle=gr;f.fillRect(0,0,c.width,c.height);
 // planks with grain, compressed toward the far side
 let y=fy-6;for(let row=0;y<c.height;row++){const hgt=6+row*1.6;for(let x=-((row*53)%180);x<c.width;x+=180){const sh=((x*7+row*13)%9)/9;f.fillStyle=`rgba(${sh>.5?255:60},${sh>.5?220:30},${sh>.5?170:10},${.04+sh*.05})`;f.fillRect(x,y,180,hgt);f.fillStyle='rgba(40,20,5,.22)';f.fillRect(x,y,1.5,hgt)}
  f.fillStyle='rgba(40,20,5,.16)';f.fillRect(0,y+hgt,c.width,1);y+=hgt}
 const yF=fy+8,yN=fy+128,P=(x,yy)=>x+(x-NETX)*((yy-yF)/(yN-yF)*.16-.04);// perspective spread
 const quad=(x0,x1,col)=>{f.fillStyle=col;f.beginPath();f.moveTo(P(x0,yF)+ox,yF);f.lineTo(P(x1,yF)+ox,yF);f.lineTo(P(x1,yN)+ox,yN);f.lineTo(P(x0,yN)+ox,yN);f.closePath();f.fill()};
 // free zone + court paint in the two schools' colours
 quad(LINE_L-150,LINE_R+150,'rgba(30,60,90,.28)');
 quad(LINE_L,NETX,(KITSET[0]?KITSET[0].s.c:'#ff7a18')+'55');quad(NETX,LINE_R,(KITSET[1]?KITSET[1].s.c:'#2f6bff')+'55');
 quad(LINE_L,LINE_R,'rgba(255,200,140,.08)');
 const line=(x0,y0,x1,y1,w,a)=>{f.strokeStyle=`rgba(255,255,255,${a})`;f.lineWidth=w;f.beginPath();f.moveTo(P(x0,y0)+ox,y0);f.lineTo(P(x1,y1)+ox,y1);f.stroke()};
 line(LINE_L,yF,LINE_R,yF,3,.85);line(LINE_L,yN,LINE_R,yN,5,.95);line(LINE_L,yF,LINE_L,yN,5,.95);line(LINE_R,yF,LINE_R,yN,5,.95);line(NETX,yF,NETX,yN,4,.9);
 line(NETX-333,yF,NETX-333,yN,3,.6);line(NETX+333,yF,NETX+333,yN,3,.6);
 // tiger paw at centre of the home half
 f.save();f.translate(P((LINE_L+NETX)/2,yF+70)+ox,yF+70);f.scale(1,.32);f.fillStyle='rgba(255,255,255,.12)';f.beginPath();f.arc(0,8,46,0,6.3);f.fill();for(let i=0;i<4;i++){f.beginPath();f.arc(-54+i*36,-46-(i%3?14:0),18,0,6.3);f.fill()}f.restore();
 // gloss reflection of the arena lights
 const sh=f.createLinearGradient(0,fy,0,fy+60);sh.addColorStop(0,'rgba(255,240,210,.28)');sh.addColorStop(1,'rgba(255,240,210,0)');f.fillStyle=sh;f.fillRect(0,fy,c.width,60);
 for(const lx of [200,600,1000,1400,1800,2200]){const rg=f.createRadialGradient(lx+ox,fy+40,4,lx+ox,fy+40,190);rg.addColorStop(0,'rgba(255,245,220,.18)');rg.addColorStop(1,'rgba(255,245,220,0)');f.fillStyle=rg;f.fillRect(lx+ox-200,fy-20,400,140)}
 // fade to dark at the far edges
 const ed=f.createLinearGradient(0,0,c.width,0);ed.addColorStop(0,'rgba(6,4,12,.95)');ed.addColorStop(.18,'rgba(6,4,12,0)');ed.addColorStop(.82,'rgba(6,4,12,0)');ed.addColorStop(1,'rgba(6,4,12,.95)');f.fillStyle=ed;f.fillRect(0,0,c.width,c.height);
 floorCv=c}
function drawBG(t){
 const sky=g.createLinearGradient(0,-900,0,0);sky.addColorStop(0,'#020208');sky.addColorStop(1,'#0b1532');g.fillStyle=sky;g.fillRect(-900,-1100,WW+1800,1200);
 g.fillStyle='#0b1532';g.fillRect(-900,0,WW+1800,H+300);
 // roof light beams up in the rafters
 g.save();g.globalCompositeOperation='lighter';for(let i=0;i<12;i++){const x=-200+i*240+(CAM.x-WW/2)*-.25,a=.05+.03*Math.sin(t*.7+i);const bg=g.createLinearGradient(0,-800,0,40);bg.addColorStop(0,`rgba(140,180,255,${a})`);bg.addColorStop(1,'rgba(140,180,255,0)');g.fillStyle=bg;g.beginPath();g.moveTo(x-10,-800);g.lineTo(x+10,-800);g.lineTo(x+150,40);g.lineTo(x-150,40);g.closePath();g.fill();glow(g,x,-790,26,'#cfe0ff',.6)}g.restore();
 const im=IMG.arena.complete&&IMG.arena.naturalWidth?IMG.arena:IMG.crowd;
 if(im.complete&&im.naturalWidth){const s=(WW+1100)/im.naturalWidth,w=im.naturalWidth*s,h=im.naturalHeight*s,ox=(WW-w)/2-(CAM.x-WW/2)*.18,oy=FLOOR-h+16-(CAM.y-CAMY0)*.12;
  const top=g.createLinearGradient(0,oy,0,oy+120);g.drawImage(im,ox,oy,w,h);top.addColorStop(0,'#0b1532');top.addColorStop(1,'rgba(11,21,50,0)');g.fillStyle=top;g.fillRect(-900,oy-2,WW+1800,122)}
 // depth haze and vignette so the players pop
 const hz=g.createLinearGradient(0,-200,0,FLOOR);hz.addColorStop(0,'rgba(8,6,20,.5)');hz.addColorStop(.6,'rgba(8,6,20,.28)');hz.addColorStop(1,'rgba(8,6,20,.5)');g.fillStyle=hz;g.fillRect(-900,-200,WW+1800,FLOOR+200);
 // crowd camera flashes during big rallies
 if(G.rally>4&&Math.random()<.3){const x=rnd(-300,WW+300),y=rnd(80,FLOOR-160);glow(g,x,y,rnd(8,18),'#ffffff',.7);g.globalAlpha=1}
 if(!floorCv)buildFloor();g.drawImage(floorCv,-FOX,FLOOR-FTOP);
 // decals
 for(const d of DECAL){const a=Math.max(0,1-d.t/6);g.save();g.globalCompositeOperation='lighter';glow(g,d.x,FLOOR+2,d.r*1.2,d.col,.35*a);g.restore();
  if(d.crack){g.save();g.globalAlpha=.55*a;g.strokeStyle='rgba(30,14,4,.9)';g.lineWidth=2;for(let i=0;i<7;i++){const an=i/7*Math.PI*2+d.x;g.beginPath();g.moveTo(d.x,FLOOR+4);g.lineTo(d.x+Math.cos(an)*d.r*.9,FLOOR+4+Math.sin(an)*d.r*.14);g.stroke()}g.restore()}}
 g.globalAlpha=1}
// the net seen slightly from the side: post, a 1m mesh with tapes, open air below, antennas on top
function drawNet(){
 const sw=NET.sway,k=16,top=NETTOP,bot=NETTOP+MESH;
 g.save();
 g.fillStyle='rgba(10,6,0,.35)';g.beginPath();g.ellipse(NETX,FLOOR+3,26,6,0,0,6.3);g.fill();
 // post
 const pg=g.createLinearGradient(NETX-6,0,NETX+6,0);pg.addColorStop(0,'#3a3648');pg.addColorStop(.5,'#8a86a0');pg.addColorStop(1,'#2c2938');
 g.fillStyle=pg;g.fillRect(NETX-5,top-16,10,FLOOR-top+16);
 g.fillStyle='#1f4fae';g.beginPath();g.roundRect(NETX-9,FLOOR-170,18,170,5);g.fill();g.fillStyle='rgba(255,255,255,.18)';g.fillRect(NETX-7,FLOOR-168,3,166);
 // mesh (a thin skewed panel)
 const o=y=>sw*Math.sin((y-top)/MESH*Math.PI);
 g.beginPath();g.moveTo(NETX-k/2+o(top),top);g.lineTo(NETX+k/2+o(top),top-6);g.lineTo(NETX+k/2+o(bot),bot-6);g.lineTo(NETX-k/2+o(bot),bot);g.closePath();
 g.fillStyle='rgba(12,10,20,.55)';g.fill();
 g.strokeStyle='rgba(255,255,255,.28)';g.lineWidth=1;
 for(let y=top+10;y<bot;y+=10){const oo=o(y);g.beginPath();g.moveTo(NETX-k/2+oo,y);g.lineTo(NETX+k/2+oo,y-6);g.stroke()}
 for(let i=1;i<4;i++){const x=NETX-k/2+i*k/4;g.beginPath();g.moveTo(x+o(top),top-i*1.5);g.lineTo(x+o(bot),bot-i*1.5);g.stroke()}
 // tapes
 g.fillStyle='#f4f4f8';g.beginPath();g.moveTo(NETX-k/2-1+o(top),top-4);g.lineTo(NETX+k/2+1+o(top),top-10);g.lineTo(NETX+k/2+1+o(top),top-2);g.lineTo(NETX-k/2-1+o(top),top+4);g.closePath();g.fill();
 g.fillStyle='#d8d8e4';g.fillRect(NETX-k/2+o(bot),bot-3,k,4);
 // antenna
 for(let i=0;i<6;i++){g.fillStyle=i%2?'#fff':'#ff3d5a';g.fillRect(NETX-1.5+o(top),top-8-80+i*13.4,3,13.4)}
 g.restore()}
function drawShadow(x,h,r){const k=clamp(1-h/420,.25,1);const gr=g.createRadialGradient(x,FLOOR+3,1,x,FLOOR+3,r*k);gr.addColorStop(0,'rgba(15,8,0,'+.5*k+')');gr.addColorStop(1,'rgba(15,8,0,0)');g.fillStyle=gr;g.beginPath();g.ellipse(x,FLOOR+3,r*k,8*k,0,0,6.3);g.fill()}
function drawGuide(P){
 const sw=P.swing,atk=sw&&sw.hitAt!=null&&!sw.done;
 if(!P.ready||G.state!=='rally'||sw&&!atk||P.dive||P.serveStage&&!atk)return;
 const B=ball;if(!B.live)return;
 const p=P.A.p;if(!atk&&(!p||p.kind!=='play'&&!(P.h>6)))return;
 const pose=atk||P.h>6?'spike':p.pose,ip=ideal(P,pose);
 const d=Math.hypot(B.x-ip.x,B.y-ip.y),near=clamp(1-d/420,0,1);
 g.save();g.globalAlpha=.2+.55*near;g.strokeStyle=near>.65?'#ffd23d':'#ffffff';g.lineWidth=3;g.setLineDash([8,8]);g.lineDashOffset=-G.time*40;g.beginPath();g.arc(ip.x,ip.y,ip.r*.55,0,6.3);g.stroke();g.restore()}
// where the ball will land (only for the receiving human, a quiet marker)
function drawLanding(){const B=ball,P=G.ctrl;if(!B.live||B.serving||!P||G.state!=='rally')return;if(B.lastTeam===P.team&&!B.cross)return;
 const e=etaY(FLOOR-BR);if(e===null||e>2)return;const x=ballAt(e).x;if((x-NETX)*dirOf(P.team)>0)return;
 const a=clamp(1-e/1.4,0,1);g.save();g.globalAlpha=.25+.5*a;g.strokeStyle=B.hot?'#ff6a3d':'#fff';g.lineWidth=2.5;g.beginPath();g.ellipse(x,FLOOR+4,26-14*a,6-2*a,0,0,6.3);g.stroke();g.restore()}
function drawBall(){
 const B=ball;if(!B)return;
 const sp=sp2(B);
 for(let i=B.trail.length-1;i>0;i--){const p=B.trail[i],k=1-i/B.trail.length;glow(g,p.x,p.y,BR*(.6+k*.5),B.fx?B.fx.col:'#ffcc88',.16*k)}
 g.globalAlpha=1;
 // a hard-hit ball draws a tapered comet streak behind it
 if(B.hot&&B.trail.length>3&&sp>1200){const n=Math.min(B.trail.length,8),col=B.fx?B.fx.col:'#ffb070';g.save();g.globalCompositeOperation='lighter';g.lineCap='round';
  for(let i=1;i<n;i++){const k=1-i/n,p0=i===1?B:B.trail[i-1],p1=B.trail[i];g.globalAlpha=.5*k;g.strokeStyle=col;g.lineWidth=BR*1.7*k;g.beginPath();g.moveTo(p0.x,p0.y);g.lineTo(p1.x,p1.y);g.stroke();g.globalAlpha=.7*k;g.strokeStyle='#ffffff';g.lineWidth=BR*.6*k;g.stroke()}
  g.restore()}
 // shadow on floor
 g.fillStyle='rgba(20,10,0,.32)';const sk=clamp(1-(FLOOR-B.y)/600,.2,1);g.beginPath();g.ellipse(B.x,FLOOR+4,BR*sk,5*sk,0,0,6.3);g.fill();
 // slight motion stretch along the velocity
 const st=clamp(sp/2200,0,.35)+(B.sq>0?B.sq*1.6:0);g.save();g.translate(B.x,B.y);g.rotate(Math.atan2(B.vy,B.vx));g.scale(1+st,1-st*.5);g.rotate(-Math.atan2(B.vy,B.vx));
 drawBallSprite(g,0,0,BR,B.rot,B.fx?B.fx.col:(B.hot?'#ffb050':null));g.restore();
 if(B.unstop||B.sig){g.save();g.globalCompositeOperation='lighter';glow(g,B.x,B.y,BR*(B.unstop?3:2.4),B.unstop?'#ffffff':B.fx?B.fx.col:'#ffd23d',.5);g.restore()}
 {const top=CAM.y-H/2/CAM.z;if(B.y<top-10){g.fillStyle='#fff';g.globalAlpha=.8;g.beginPath();g.moveTo(B.x,top+8);g.lineTo(B.x-12,top+28);g.lineTo(B.x+12,top+28);g.fill();g.globalAlpha=1}}}
const ROLE_COL={S:'#7fd8ff',WS:'#ff8a5c',L:'#9dff9a'};
// small name tags over everyone so you know who is who
function drawTags(){g.save();g.textBaseline='middle';g.textAlign='center';
 for(const P of G.players){const me=G.ctrl===P,[sx,sy]=w2s(P.x,FLOOR-P.h-205),nm=((P.pn?P.pn+' · ':'')+P.name).toUpperCase();
  g.font='700 12px "Barlow Condensed",sans-serif';const w=g.measureText(nm).width+26;
  g.globalAlpha=me?.95:.8;g.fillStyle='rgba(8,6,20,.72)';g.beginPath();g.roundRect(sx-w/2,sy-9,w,18,9);g.fill();
  if(me||P.pn){g.strokeStyle=me?'#ffd23d':'#5fe6ff';g.lineWidth=1.5;g.stroke()}
  g.fillStyle=ROLE_COL[P.role];g.font='800 11px "Barlow Condensed",sans-serif';g.fillText(P.role,sx-w/2+10,sy+1);
  g.fillStyle=me?'#ffe27a':'#fff';g.font='700 12px "Barlow Condensed",sans-serif';g.fillText(nm,sx+6,sy+1);
  if(me){const y=sy-14+Math.sin(G.time*6)*2;g.fillStyle='#ffd23d';g.beginPath();g.moveTo(sx,y+5);g.lineTo(sx-7,y-5);g.lineTo(sx+7,y-5);g.closePath();g.fill()}}
 g.restore()}
// a timing cue above your head: tells you WHEN, not just what
function drawCue(t){G.cue='';const P=G.ctrl;if(!P||G.humanTeam<0||G.state!=='rally')return;const B=ball,p=P.A.p;if(!B.live||!p)return;let c='',col='#ffd23d';
 if(P.h>6&&P.armed&&!P.swing){const ip=ideal(P,blockable(P)?'block':'spike'),d=Math.hypot(B.x-ip.x,B.y-ip.y);if(d<ip.r*1.3){c=blockable(P)?'BLOCK!':'HIT!';col=d<ip.r*.5?'#ffd23d':'#fff'}}
 else if(p.kind==='play'&&P.h<=0&&!P.swing&&TM[P.team].next===P){const e=etaY(p.yc);
  if(p.attack){const tAp=P.jv/GP;if(e!==null&&e<=tAp+.16&&e>tAp-.08)c='JUMP!'}
  else if(e!==null&&e<.32){c='!';col=e<.16?'#ffd23d':'#fff'}}
 else if(p.kind==='block'&&P.h<=0&&TM[1-P.team].players.some(q=>q.armed&&q.h>40))c='BLOCK!';
 G.cue=c&&col==='#ffd23d'?c:'';if(!c)return;const y=FLOOR-P.h-290,sc=1+.08*Math.sin(t*22);g.save();g.translate(P.x,y);g.scale(sc,sc);txt(c,0,0,c==='!'?40:30,col);g.restore()}
function drawWorld(t){
 drawBG(t);drawNet();
 const ps=[...G.players].sort((a,b)=>(a.human?1:0)-(b.human?1:0)||a.h-b.h);
 for(const P of G.players)drawShadow(P.x,P.h,38);
 drawLanding();
 for(const P of ps){drawPlayer(g,P)}
 if(G.ctrl&&G.humanTeam>=0)drawGuide(G.ctrl);
 drawBall();ULTdraw(g);
 FX.draw(g);FX.drawPop(g);
 if(G.state!=='over'&&G.ctrl&&G.humanTeam>=0)drawCue(t)}

function w2s(x,y){return[(x-CAM.x)*CAM.z+W/2+CAM.sx,(y-CAM.y)*CAM.z+H/2+CAM.sy]}
function drawOverlay(){
 if(CAM.dim>.01){g.save();if(CAM.spot){const P=CAM.spot.P,[sx,sy]=w2s(P.x,FLOOR-P.h-100),r=CAM.spot.r*CAM.z,gr=g.createRadialGradient(sx,sy,r*.25,sx,sy,r*1.6);gr.addColorStop(0,'rgba(5,3,14,0)');gr.addColorStop(1,'rgba(5,3,14,'+CAM.dim+')');g.fillStyle=gr}else g.fillStyle='rgba(5,3,14,'+CAM.dim+')';g.fillRect(0,0,W,H);g.restore()}
 if(CAM.tintA>.01){g.save();g.globalCompositeOperation='overlay';g.globalAlpha=CAM.tintA;g.fillStyle=CAM.tint;g.fillRect(0,0,W,H);g.restore()}
 if(CAM.flash>.01){g.globalAlpha=Math.min(1,CAM.flash);g.fillStyle=CAM.flashCol;g.fillRect(0,0,W,H);g.globalAlpha=1}
 // vignette
 const vg=g.createRadialGradient(W/2,H/2,H*.45,W/2,H/2,H*.95);vg.addColorStop(0,'rgba(0,0,0,0)');vg.addColorStop(1,'rgba(0,0,0,.35)');g.fillStyle=vg;g.fillRect(0,0,W,H);
 if(CAM.lb>.01){const h=CAM.lb*70;g.fillStyle='#05030c';g.fillRect(0,0,W,h);g.fillRect(0,H-h,W,h)}}

function txt(s,x,y,size,col,align='center',stroke=.2){g.font=`800 ${size}px "Barlow Condensed","Arial Narrow",Impact,sans-serif`;g.textAlign=align;g.textBaseline='middle';g.lineJoin='round';g.lineWidth=size*stroke;g.strokeStyle='rgba(8,6,16,.9)';g.strokeText(s,x,y);g.fillStyle=col;g.fillText(s,x,y)}
function drawBanners(rdt){
 for(let i=BAN.length-1;i>=0;i--){const b=BAN[i];b.t+=rdt;if(b.t>b.dur){BAN.splice(i,1);continue}
  const k=b.t/b.dur,inn=Math.min(1,b.t/.18),out=k>.8?1-(k-.8)/.2:1,a=out;
  g.save();g.globalAlpha=a;
  if(b.big){
   const y=b.ult?200:170,sc=lerp(2.2,1,easeOut(inn)),bh=b.ult?150:110;
   const gr=g.createLinearGradient(0,0,W,0);gr.addColorStop(0,'rgba(0,0,0,0)');gr.addColorStop(.2,'rgba(8,4,20,.82)');gr.addColorStop(.8,'rgba(8,4,20,.82)');gr.addColorStop(1,'rgba(0,0,0,0)');
   g.fillStyle=gr;g.save();g.translate(W/2,y);g.scale(1,easeOut(inn));g.fillRect(-W/2,-bh/2,W,bh);
   // slanted accent bars
   g.fillStyle=b.col;g.globalAlpha=a*.85;g.fillRect(-W/2+lerp(-W,0,easeOut(inn)),-bh/2,W,4);g.fillRect(-W/2+lerp(W,0,easeOut(inn)),bh/2-4,W,4);g.restore();
   g.save();g.globalCompositeOperation='lighter';glow(g,W/2,y,360,b.col,.35*a);g.restore();
   if(b.portrait){const im=pimg(b.portrait);if(im.complete&&im.naturalWidth){const px=lerp(-320,40,easeOut(Math.min(1,b.t/.35))),ph=bh+90,pw=ph*im.naturalWidth/im.naturalHeight;g.save();g.beginPath();g.moveTo(px+40,y-ph/2);g.lineTo(px+pw+40,y-ph/2);g.lineTo(px+pw,y+ph/2);g.lineTo(px,y+ph/2);g.closePath();g.clip();if(portVar(b.portrait).flip){g.translate(px*2+pw,0);g.scale(-1,1)}g.drawImage(im,px,y-ph/2,pw,ph);g.restore();g.strokeStyle=b.col;g.lineWidth=3;g.beginPath();g.moveTo(px+pw+40,y-ph/2);g.lineTo(px+pw,y+ph/2);g.stroke()}}
   g.save();g.translate(W/2,y-8);g.scale(sc,sc);txt(b.text,0,0,b.ult?96:88,b.col,'center',.16);g.restore();
   if(b.sub)txt(b.sub,W/2,y+(b.ult?52:46),b.ult?26:22,'#fff','center',.2);
  }else{
   const y=b.small?120:230,sc=lerp(1.6,1,easeOut(inn));g.save();g.translate(W/2,y);g.scale(sc,sc);txt(b.text,0,0,b.small?44:64,b.col);g.restore();if(b.sub)txt(b.sub,W/2,y+(b.small?30:42),22,'#fff')}
  g.restore()}}

function drawHUD(){
 if(!G.on||!document.body.classList.contains('playing'))return;const demo=G.humanTeam<0;
 const cx=W/2,y=34;
 g.save();
 for(const t of [0,1]){const sx=t?cx+30:cx-30-190,sc=KITSET[t].s;g.fillStyle=hexMix(sc.c,lum(sc.c)>.55?-.45:-.12)+'eb';g.beginPath();g.roundRect(sx,y-24,190,50,12);g.fill();g.strokeStyle='rgba(255,255,255,.35)';g.lineWidth=2;g.stroke();
  txt(String(G.score[t]),t?sx+160:sx+30,y+1,46,'#fff');
  g.font='700 13px "Barlow Condensed",sans-serif';g.textAlign=t?'left':'right';g.textBaseline='middle';
  TM[t].players.forEach((p,i)=>{const ly=y-15+i*14,lx=t?sx+12:sx+178;g.fillStyle=G.ctrl===p?'#ffe27a':p.pn?'#8ff0ff':'rgba(255,255,255,.92)';g.fillText((t?p.role+'  '+p.name:p.name+'  '+p.role).toUpperCase(),lx,ly)});
  txt(sc.name,t?sx+160:sx+30,y+36,16,'#fff');
  if(G.serving===t){g.fillStyle='#ffd23d';g.beginPath();g.arc(t?sx+178:sx+12,y+16,4,0,6.3);g.fill()}}
 g.fillStyle='rgba(8,6,20,.85)';g.beginPath();g.roundRect(cx-30,y-24,60,50,10);g.fill();txt(String(G.target),cx,y-3,24,'#ffcf6a');g.font='700 11px "Barlow Condensed",sans-serif';g.fillStyle='#aab';g.textAlign='center';g.fillText('TO WIN',cx,y+16);
 g.restore();
 if(!demo){
  if(G.rally>=3&&(G.state==='rally')){txt(G.rally+' HITS',cx,y+112,20,'#7dffe0')}
  // touches used by the team that has the ball (a block touch doesn't count)
  const B=ball;if(G.state==='rally'&&B&&B.live&&!B.serving&&B.lastTeam>=0){const tt=B.cross?1-B.lastTeam:B.lastTeam,n=B.cross?0:B.touches,px=tt?cx+60:cx-60-3*22;
   g.font='800 12px "Barlow Condensed",sans-serif';g.textAlign='center';g.fillStyle='#cfd6ea';g.fillText('TOUCHES',px+33,y+44);
   for(let i=0;i<3;i++){g.fillStyle=i<n?(i===2?'#ff8a5c':'#ffd23d'):'rgba(255,255,255,.18)';g.beginPath();g.arc(px+11+i*22,y+60,7,0,6.3);g.fill()}
   if(B.blkNote>0)txt('BLOCK TOUCH — DOESN\'T COUNT',cx,y+84,18,'#bff0ff')}
  const hx=24,hy=H-34,hw=300;g.fillStyle='rgba(8,6,20,.7)';g.beginPath();g.roundRect(hx,hy-12,hw,22,11);g.fill();
  const hp=(G.ctrl?G.ctrl.hype:0)/100,full=hp>=1,gr=g.createLinearGradient(hx,0,hx+hw,0);gr.addColorStop(0,'#ff8a1e');gr.addColorStop(1,full?'#fff2a0':'#ffd23d');
  g.fillStyle=gr;g.beginPath();g.roundRect(hx+3,hy-9,Math.max(0,(hw-6)*hp),16,8);g.fill();
  if(full){g.save();g.globalCompositeOperation='lighter';glow(g,hx+hw/2,hy,170,'#ffd23d',.35+.2*Math.sin(G.time*8));g.restore()}
  const P0=()=>G.ctrl,ul=G.role==='WS'?'SPIKE':G.role==='S'?'SET':'RECEIVE';
  g.font='800 14px "Barlow Condensed",sans-serif';g.textAlign='left';g.fillStyle=full?'#1a1020':'#fff';g.textBaseline='middle';g.fillText(full?(ABIL[P0().ch.act]?ABIL[P0().ch.act].n.toUpperCase()+' READY — '+ABIL[P0().ch.act].how:'SKILL READY — PERFECT '+ul+'!'):'HYPE',hx+14,hy);
  // your role badge
  const P=G.ctrl;if(P){g.textAlign='right';txt(ROLE_NAME[G.role].toUpperCase()+' · '+P.name.toUpperCase(),W-24,H-34,22,ROLE_COL[G.role],'right')}
  if(G.hint)txt(G.hint,cx,H-70,26,'#fff')}}
function updHint(){G.hint='';if(G.humanTeam<0||!G.ctrl)return;const P=G.ctrl,B=ball,early=S.plays<6;
 if(P.serveStage==='ready'){G.hint='SPACE — TOSS';return}
 if(P.serveStage==='toss'){G.hint=P.h>0?'':'SPACE — JUMP SERVE (as the toss starts to drop)';return}
 if(G.state!=='rally'||!early)return;
 const p=P.A.p,mine=TM[P.team].next===P;
 if(P.h>6&&P.armed)G.hint=blockable(P)?'SPACE — BLOCK!':'SPACE — SPIKE!  (ball in front of you = short · ball over/behind you = deep)';
 else if(p&&p.kind==='block')G.hint='SPACE — BLOCK JUMP';
 else if(mine&&p&&p.attack)G.hint='SPACE — JUMP  (then SPACE again to hit)';
 else if(mine&&p&&p.kind==='play')G.hint=P.role==='S'&&p.pose==='set'?'SPACE — SET  (↑ quick · ↓ back row) · HOLD — ICONIC SET':'TAP SPACE — RECEIVE · HOLD — AUTO (good, never perfect)';
 else if(B.lastTeam===P.team)G.hint='';}

function render(rdt){
 g.setTransform(DPR,0,0,DPR,0,0);g.fillStyle='#05030c';g.fillRect(0,0,cv.width,cv.height);
 g.setTransform(DPR*VS,0,0,DPR*VS,DPR*VX,DPR*VY);
 g.save();g.beginPath();g.rect(0,0,W,H);g.clip();
 g.save();g.translate(W/2+CAM.sx,H/2+CAM.sy);g.scale(CAM.z,CAM.z);g.translate(-CAM.x,-CAM.y);
 if(G.on)drawWorld(G.time);
 g.restore();
 if(G.on){if(G.state!=='over')drawTags();drawOverlay();drawBanners(rdt);drawHUD()}
 g.restore()}

/* ===== loop ===== */
let last=performance.now();
function frame(now){
 requestAnimationFrame(frame);
 let rdt=Math.min(.05,(now-last)/1000);last=now;
 if(!G.on||G.paused&&!G.net){if(G.on)render(0);return}
 D.clock+=rdt;
 for(let i=D.tl.length-1;i>=0;i--)if(D.clock>=D.tl[i].at){const f=D.tl[i].fn;D.tl.splice(i,1);f()}
 if(IN.buf>0)IN.buf-=rdt;for(const I of G.ins||[])if(I!==IN&&I.buf>0)I.buf-=rdt;
 // online: clients just draw what the host sends
 if(G.puppet){G.net&&G.net.puppet(rdt);updHint();updCam(rdt);render(rdt);return}
 let sdt=rdt;
 // online the clock never bends (hit-stop and slow-mo would desync everyone); the camera work still plays
 if(G.net){if(CAM.hs>0)CAM.hs-=rdt;if(D.slowT>0){D.slowT-=rdt;if(D.slowT<=0)D.slowV=1}CAM.slow=1}
 else if(CAM.hs>0){CAM.hs-=rdt;sdt=0}
 else if(D.slowT>0){D.slowT-=rdt;CAM.slow+=(D.slowV-CAM.slow)*(1-Math.exp(-14*rdt));sdt=rdt*CAM.slow;if(D.slowT<=0)D.slowV=1}
 else CAM.slow+=(1-CAM.slow)*(1-Math.exp(-6*rdt)),sdt=rdt*CAM.slow;
 if(sdt>0){const n=Math.ceil(sdt/.0084);for(let i=0;i<n;i++)simStep(sdt/n)}
 if(G.net)G.net.tick(rdt);
 updHint();updCam(rdt);render(rdt)}
requestAnimationFrame(frame);

/* ===== public API ===== */
// a random team ordered [setter, wing spiker, libero]
function randTeam(ex=[]){const pick1=p=>{const c=ROSTER.filter(r=>p.includes(r.pos)&&!ex.includes(r.id));return c[Math.floor(Math.random()*c.length)].id};return[pick1(['S']),pick1(['OH','OPP','MB']),pick1(['L'])]}
const Game={
 start(o){AU.resume();startMatch(o);document.body.classList.toggle('playing',!o.demo)},
 demo(){const sc=SCHOOL_ORDER[Math.floor(Math.random()*6)],a=randTeam(),b=schoolTeam(sc,rndi(3,10),rndi(0,99));startMatch({demo:true,mode:'demo',school1:sc,team0:a,team1:b,skill0:.8,skill1:.8,target:7,onEnd:()=>Game.demo()});G.humanTeam=-1},
 pause(b){if(!G.on)return;G.paused=b;const p=document.getElementById('pause');if(p)p.classList.toggle('show',b);if(b)AU.crowd(0,.1);else AU.crowd(.35)},
 togglePause(){if(G.on&&(G.humanTeam>=0||G.net)&&G.state!=='over')Game.pause(!G.paused)},
 stop(){G.on=false;G.paused=false;document.body.classList.remove('playing')},
 get G(){return G}};
