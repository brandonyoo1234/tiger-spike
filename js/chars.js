'use strict';
/* ===== roster: the real SIS athletes. Every card is generated from the name, so it is the same on every device ===== */
const SIS_POOL={
 S:['Yejun','Chris','Dom','Ryan Park','Chase','Anthony','Seungbie','Lauren'],
 OH:['June','Raisin','Siheon','Aaron','Jaemin','Andrew','McCarthy','Kyle','Eric','Seunghun Lee','Freddy','Aaron Park','Juwon','Bertrin','Yuchan','Sohee','Soojin'],
 MB:['Robert','Brandon','Justin','Doyoon','Minho','Caleb','Yohan','Ryan Lee','Katie','Grace'],
 OPP:['Ryan','Ian','Andy','Sean Kim','Jioong'],
 L:['Tevin','Yumin','Jasmine']};
const POS_NAME={S:'Setter',OH:'Outside',MB:'Middle',OPP:'Opposite',L:'Libero'};
const GIRLS=['Lauren','Sohee','Soojin','Katie','Grace','Jasmine'];
function hsh(s){let h=2166136261;for(let i=0;i<s.length;i++)h=Math.imul(h^s.charCodeAt(i),16777619);return h>>>0}
function srng(seed){let a=seed|0;return()=>{a=a+0x6D2B79F5|0;let t=Math.imul(a^a>>>15,1|a);t=t+Math.imul(t^t>>>7,61|t)^t;return((t^t>>>14)>>>0)/4294967296}}
const spick=(r,a)=>a[Math.floor(r()*a.length)];
const SKINS=['#f3d2b5','#efc8a6','#e8bd97','#ddb088','#c99468','#a8714c','#7d5236'];
const DARKH=['#141010','#1d1513','#261a14','#33221a','#4a2f1e'];
const FXCOL={common:['#ffc36b','#ffd9a0','#ffe28a'],rare:['#7fd8ff','#6fb0ff','#7ef0c8','#ff8a8a'],epic:['#c58cff','#b06bff','#ff6ad5','#5affc8'],legendary:['#ff7a2e','#ffcf3a','#ff5a3a'],mythic:['#ff4d8d','#8a5cff','#3dffd8']};
const TITLES={S:['The Conductor','Silk Hands','Playmaker','Tempo King','The Brain','Quick Fingers','Floor General','The Architect'],
 OH:['The Ace','Cannon Arm','Sky Walker','Tiger Claw','Bullet','The Hammer','Jet','Air Raid','Wildfire','Thunder','Night Hawk','Comet'],
 MB:['The Wall','Skyscraper','Iron Curtain','Rim Rocker','Gatekeeper','Tower','Shut Down','The Roof'],
 OPP:['Big Gun','Right Side Fury','The Closer','Heavy Hitter','Lefty Laser'],
 L:['Floor Guardian','Human Shield','Mr. Dig','No Drop','Quicksilver']};
const ULTS=['Tiger Strike','Sky Crusher','Thunder Fang','Meteor Drop','Inferno Comet','Storm Breaker','Sun Breaker','Ghost Fang','Supernova','Void Eclipse','Dragon Spike','Orange Fury','Black Tiger','Lightning Axe','Gravity Slam','Phoenix Dive'];
const SIGS=['Tiger Toss','Silk Lift','Moon Arc','Gravity Set','Zero Tempo','Golden Lift','Phantom Back','Velvet Touch','Time Stop Set','Orange Blossom'];
const SIGL=['Tiger Dig','Steel Receive','Ghost Step','Event Horizon','Iron Floor','Pancake Save','Last Stand','Mirror Dig','Wall of Hands','Sunrise Save'];
const ROSTER=[],BRIGHTH=['#c8701e','#e8d7b0','#8a3a1a','#2f6bff','#ff4d6a','#e9e9f2','#7a3cff','#1fc9a8','#ffcf3a'];
{const all=[];for(const pos in SIS_POOL)for(const n of SIS_POOL[pos])all.push({n,pos});
 // official rarity list
 const RLIST={mythic:['Dom','Lauren','McCarthy','Freddy','Brandon','Yumin'],legendary:['Chase','Seunghun Lee','Yuchan','Justin','Jasmine'],
  epic:['Raisin','Siheon','Kyle','Sohee','Minho','Grace','Ian'],
  rare:['Yejun','Anthony','Seungbie','June','Aaron','Jaemin','Bertrin','Robert','Yohan','Katie','Ryan','Tevin']},rk={};
 for(const r in RLIST)for(const n of RLIST[r])rk[n]=r;
 for(const o of all)rk[o.n]=rk[o.n]||'common';
 const BASE_ST={common:[4,6.2],rare:[5,7.4],epic:[6,8.4],legendary:[7,9.3],mythic:[8.4,10]};
 // [power,speed,jump,control] bias per position
 const BIAS={S:[-1,.8,-.4,2],OH:[1.2,.4,1,-.6],MB:[1.4,-1,1.6,-1],OPP:[1.8,-.2,.8,-1.2],L:[-2.5,2,-2,1.6]};
 for(const {n,pos} of all){const r=srng(hsh(n)),rar=rk[n],[lo,hi]=BASE_ST[rar];
  const st=n==='Brandon'?[10,9,10,8]:BIAS[pos].map(b=>Math.round(clamp(lo+r()*(hi-lo)+b,2,10)));
  const girl=GIRLS.includes(n),id=n.toLowerCase().replace(/[^a-z]/g,'');
  const r2=srng(hsh('look'+n)),fx=spick(r,FXCOL[rar]),hair=r2()<({legendary:.75,epic:.4,rare:.18}[rar]||0)?spick(r2,BRIGHTH):spick(r,DARKH),
   gear=n==='Brandon'?'goggles+sleeve':spick(r2,['band','band','goggles','sleeve','band+sleeve','goggles+sleeve','none']);
  ROSTER.push({id,name:n,girl,pos,num:1+Math.floor(r()*24),title:spick(r,TITLES[pos]),rar,st,skin:spick(r,SKINS),hair,
   style:girl?spick(r,['pony','pony','bun','long','bob']):spick(r,['short','short','fade','fade','spike','mohawk','afro']),
   acc:spick(r,['#ffffff','#ffd23d','#ff7a18','#7fd8ff','#ff5a6a','#7ef0c8',fx]),fx,gear,ult:spick(r,ULTS),rainbow:rar==='mythic',
   toss:pos==='S'?spick(r,['high','quick','quick','back']):spick(r,['high','high','quick','back']),sigS:spick(r,SIGS),sigL:spick(r,SIGL),
   spk:pos==='OH'?spick(r,['cross','speed','sky']):pos==='MB'?spick(r,['pierce','sky','speed']):pos==='OPP'?spick(r,['pierce','pierce','speed']):spick(r,['cross','speed','sky','pierce'])})}}
const CH={};ROSTER.forEach(c=>CH[c.id]=c);

/* ===== schools ===== */
const SCHOOLS={SIS:{name:'SIS',full:'Seoul International School',c:'#ff7a18',c2:'#171822',lib:'#f2f2f6'},
 KIS:{name:'KIS',full:'Korea International School',c:'#9fd0ff',c2:'#16233f',lib:'#ffd23d'},
 YISS:{name:'YISS',full:'Yongsan International School',c:'#2447c9',c2:'#151515',lib:'#f2f2f6'},
 CDS:{name:'CDS',full:'CDS',c:'#2f6bff',c2:'#ffd23d',lib:'#ffd23d'},
 SFS:{name:'SFS',full:'Seoul Foreign School',c:'#e0303f',c2:'#1a1418',lib:'#f2f2f6'},
 CI:{name:'CI',full:'Chadwick International',c:'#00c8e8',c2:'#10202a',lib:'#ff8a2e'},
 GSIS:{name:'GSIS',full:'Gyeonggi Suwon Intl',c:'#2bbf5a',c2:'#1b1b1b',lib:'#f2f2f6'}};
const SCHOOL_ORDER=['KIS','CI','SFS','CDS','YISS','GSIS'];
function hexMix(hex,k){const n=parseInt(hex.slice(1),16);let c=[n>>16,n>>8&255,n&255];c=c.map(v=>Math.round(k<0?v*(1+k):v+(255-v)*k));return '#'+c.map(v=>v.toString(16).padStart(2,'0')).join('')}
const lum=hex=>{const n=parseInt(hex.slice(1),16);return((n>>16)*.3+(n>>8&255)*.59+(n&255)*.11)/255};
function mkKit(code,lib){const s=SCHOOLS[code],j=lib?s.lib:s.c,sh=lum(s.c2)>.5?'#171822':s.c2;
 return{jersey:j,jd:hexMix(j,-.25),trim:lib?s.c:(lum(j)>.62?s.c2:'#ffffff'),short:sh,sd:hexMix(sh,-.4),num:lum(j)>.62?s.c2:'#ffffff'}}
// kits currently on court: [your team, opponent]
let KITSET=[];
function setSchools(a,b){KITSET=[a,b].map(c=>({code:c,s:SCHOOLS[c],k:mkKit(c,false),l:mkKit(c,true)}))}
setSchools('SIS','KIS');
// opponents: school players are numbered, not named; level sets how good they are
function schoolTeam(code,lv,seed=0){const r=srng(hsh(code+lv+'_'+seed)),pos=['S','OH','L'],ids=[],used=[];
 const rr=()=>{const x=r()*100,m=Math.min(4,lv/3);return x<8*m?'legendary':x<22*m?'epic':x<45+8*m?'rare':'common'};
 for(const p of pos){let num;do num=1+Math.floor(r()*24);while(used.includes(num));used.push(num);
  const girl=r()<.3,rar=lv>=12&&r()<.15?'mythic':rr(),id=code.toLowerCase()+num,BASE_ST={common:[3.5,6],rare:[4.5,7.2],epic:[5.8,8.2],legendary:[6.8,9],mythic:[8,9.8]}[rar],
   BIAS={S:[-1,.8,-.4,2],OH:[1.2,.4,1,-.6],L:[-2.5,2,-2,1.6]}[p];
  const c={id,name:code+' #'+num,pos:p,num,school:code,title:SCHOOLS[code].full,rar,st:BIAS.map(b=>Math.round(clamp(BASE_ST[0]+r()*(BASE_ST[1]-BASE_ST[0])+b,2,10))),
   skin:spick(r,SKINS),hair:spick(r,DARKH),girl,style:girl?spick(r,['pony','bun','long','bob']):spick(r,['short','fade','spike','afro']),acc:spick(r,['#ffffff',SCHOOLS[code].c,'#ffd23d']),fx:spick(r,FXCOL[rar]),
   ult:spick(r,ULTS),rainbow:rar==='mythic',toss:spick(r,['high','quick','back']),sigS:spick(r,SIGS),sigL:spick(r,SIGL),spk:spick(r,['cross','speed','sky','pierce'])};
  if(typeof giveAbil==='function')giveAbil(c);CH[id]=c;ids.push(id)}
 return ids}

/* ===== roles ===== */
const ROLES=['S','WS','L'];
const ROLE_NAME={S:'Setter',WS:'Wing Spiker',L:'Libero'};
// toss types: hx = hitting distance from net, ap = how far above the hitting point the arc peaks, pw = spike power bonus, blk = how readable it is for blockers
const TOSS={high:{n:'High Ball',hx:130,ap:200,pw:0,blk:1},quick:{n:'Quick',hx:70,ap:34,pw:1.6,blk:.4},back:{n:'Back Row',hx:300,ap:150,pw:-.3,blk:.15}};
const TRAIT={cross:{n:'Sharp Cross',d:'Cuts steep angles inside the blockers'},pierce:{n:'Block Buster',d:'Smashes through blocks'},sky:{n:'Sky Walk',d:'Jumps far higher than anyone'},speed:{n:'Bullet Spike',d:'Fastest ball in the game'}};
/* ===== abilities (inspired by the character skills in The Spike). act = active skill (needs a full HYPE bar), pas = passives (always on) ===== */
const ABIL={
 thunder:{n:'4m Thunder Spike',k:'act',d:'Jump from far back and hammer a flat, lightning-fast spike to the very back of their court.',how:'SPIKE WITH A PERFECT HIT'},
 meteor:{n:'Meteor Drop',k:'act',d:'A near-vertical smash that drops right behind the net. Almost impossible to dig.',how:'SPIKE WITH A PERFECT HIT'},
 feint:{n:'Phantom Feint',k:'act',d:'Wind up like a full swing, then tip it softly over the block. Defenders are left standing deep.',how:'SPIKE WITH A PERFECT HIT'},
 cannon:{n:'Cross Cannon',k:'act',d:'The fastest ball in the game, ripped mid-court through the gap.',how:'SPIKE WITH A PERFECT HIT'},
 tempo:{n:'Tempo Strike',k:'act',d:'A perfect, lightning-quick set. Your spiker\'s next hit becomes their active skill.',how:'SET WITH A PERFECT TOUCH'},
 dump:{n:'Setter Dump',k:'act',d:'Instead of setting, you push the 2nd touch straight over the net to an empty spot.',how:'SET WITH A PERFECT TOUCH'},
 launch:{n:'Back-Row Launch',k:'act',d:'A perfect back-row set. Your spiker\'s next hit becomes their active skill.',how:'SET WITH A PERFECT TOUCH'},
 wall:{n:'Iron Wall',k:'act',d:'A flawless receive. Your spiker\'s next hit becomes their active skill.',how:'RECEIVE WITH A PERFECT TOUCH'},
 roll:{n:'Rolling Save',k:'act',d:'While HYPE is full you reach 60% further on dives and dive faster. A perfect receive also powers up the next spike.',how:'DIVE FOR ANYTHING'},
 boom:{n:'Boom Jump',k:'pas',d:'Explosive approach: jumps higher, and spikes from far off the net (back row) hit harder.'},
 palms:{n:'Iron Palms',k:'pas',d:'Blocks are much more likely to stuff the ball straight down.'},
 feet:{n:'Quick Feet',k:'pas',d:'Moves 12% faster around the court.'},
 platform:{n:'Steady Platform',k:'pas',d:'Receives are 40% more accurate, so your setter always gets a good ball.'},
 bigserve:{n:'Big Serve',k:'pas',d:'Serves travel about 12% faster.'},
 spin:{n:'Spin Master',k:'pas',d:'Heavy topspin: spikes dip harder and land sooner.'},
 burn:{n:'Floor Burn',k:'pas',d:'Dives cover 30% more ground.'},
 hang:{n:'Hang Time',k:'pas',d:'Floats at the top of the jump, giving you more time to time the spike.'},
 tool:{n:'Tool Master',k:'pas',d:'Spikes into a block are much more likely to deflect off the hands and out for a point.'},
 clutch:{n:'Clutch',k:'pas',d:'Near the end of a set every touch is one quality level better.'},
 toss:{n:'Sharp Toss',k:'pas',d:'Sets are twice as accurate.'},
 wind:{n:'Second Wind',k:'pas',d:'HYPE fills 30% faster.'}};
const ACT_POOL={WS:['thunder','meteor','feint','cannon'],S:['tempo','dump','launch'],L:['wall','roll']};
// actives by rarity: soft shots stay down low, legendary/mythic only get the big flashy ultimates (no tips or feints up there)
const ACT_TIER={WS:{common:['feint','cannon'],rare:['feint','cannon','thunder','meteor'],epic:['thunder','meteor','tornado','quake'],legendary:['megabounce','skull','phoenix','tornado','quake'],mythic:['skull','megabounce','blackhole','zeus','phoenix']},
 S:{common:['tempo','dump'],rare:['tempo','dump'],epic:['tempo','launch','dump'],legendary:['ignite','launch','hammer'],mythic:['ignite','hammer']},
 L:{common:['wall','roll'],rare:['wall','roll'],epic:['wall','roll'],legendary:['aegis','flash'],mythic:['aegis','flash']}};
// the stars each get their own signature ultimate
const ACT_FIX={Brandon:'godspike',McCarthy:'zeus',Freddy:'blackhole',Dom:'ignite',Lauren:'hammer',Yumin:'aegis',Jasmine:'flash','Seunghun Lee':'phoenix',Yuchan:'skull',Justin:'megabounce',Chase:'ignite'};
const PAS_POOL={WS:['boom','hang','spin','tool','clutch','feet','bigserve'],S:['toss','palms','feet','clutch','bigserve','wind'],L:['platform','burn','feet','clutch','wind']};
const posRole=p=>p==='S'?'S':p==='L'?'L':'WS';
function giveAbil(c,ro=posRole(c.pos)){const r=srng(hsh('ab'+c.name+(ro===posRole(c.pos)?'':ro))),n={common:1,rare:1,epic:2,legendary:2,mythic:3}[c.rar];
 c.act=ro===posRole(c.pos)&&ACT_FIX[c.name]?ACT_FIX[c.name]:spick(r,(ACT_TIER[ro][c.rar])||ACT_POOL[ro]);const pool=PAS_POOL[ro].slice(),pas=[];
 if(ro==='WS'&&(c.rar==='legendary'||c.rar==='mythic')){pas.push('boom');pool.splice(pool.indexOf('boom'),1)}
 while(pas.length<n&&pool.length)pas.push(pool.splice(Math.floor(r()*pool.length),1)[0]);
 c.pas=pas;return c}
const has=(P,id)=>!!(P.ch&&P.ch.pas&&P.ch.pas.includes(id));
ROSTER.forEach(c=>giveAbil(c));
// a card drafted into a different role gets that role's skills (a libero never carries a spike skill)
const _rab={};
function abilFor(c,ro){if(!c||posRole(c.pos)===ro)return c;const k=c.id+ro;return _rab[k]||(_rab[k]=giveAbil(Object.create(c),ro))}
const r1=v=>Math.round(v*10)/10;
// role ratings (1-10) shown on cards and used by the sim
function roleStats(c){const [P,S,J,C]=c.st,rb=RAR[c.rar].i*.25;
 const prec=t=>clamp(C+(t===c.toss?3:0)-(t==='quick'&&S<6?1.5:0)+rb,1,13);
 return{set:r1(clamp(C*.7+S*.3+rb,1,10)),dig:r1(clamp(S*.55+C*.45+rb,1,10)),spike:r1(clamp(P*.6+J*.4+rb,1,10)),prec,
  lspd:330+S*40,reach:1+C*.025,jump:J+(c.spk==='sky'?2:0)}}

// rarity is felt on court: commons jump low and hit soft, mythics fly or hit a ball you can barely follow
const RJMP=[.93,.97,1.03,1.09,1.19],RSPD=[.9,.96,1,1.05,1.28],RSPK=[1.28,1.1,.92,.76,.44],RERR=[1.5,1.2,1,.85,.35],RSRV=[1.15,1.05,1,.92,.74];
// legendary cards get a specialty (a huge jump or a huge arm); mythics get both
const specOf=c=>c.rar==='mythic'?'mythic':RAR[c.rar].i>=3?(c.st[2]>=c.st[0]?'jump':'power'):'';
const SPEC={jump:{n:'SKY JUMP',d:'Jumps way above everyone else'},power:{n:'CANNON ARM',d:'Spikes so hard the ball is a blur'},
 mythic:{n:'MYTHIC · SKY CANNON',d:'Jumps far above everyone and spikes a ball you can barely follow'}};
const MYTH={S:{n:'MYTHIC · GOD HANDS',d:'Every set is a fast, high, pin-point toss right to the net. Hold SPACE = perfect set'},
 L:{n:'MYTHIC · NO DROP',d:'Every receive is perfect, and dives cover way more ground'}};
/* ===== color helpers ===== */
function shade(hex,k){const n=parseInt(hex.slice(1),16);let r=n>>16,g=n>>8&255,b=n&255;if(k<0){r*=1+k;g*=1+k;b*=1+k}else{r+=(255-r)*k;g+=(255-g)*k;b+=(255-b)*k}return `rgb(${r|0},${g|0},${b|0})`}

/* ===== rig ===== */
const PK=['lean','head','rot','aN','eN','aF','eF','hN','kN','hF','kF','dv'];
const IDLE={lean:.06,head:0,rot:0,aN:.2,eN:.5,aF:.12,eF:.4,hN:.1,kN:.18,hF:-.1,kF:.12,dv:0};
class Rig{constructor(){this.p=Object.assign({},IDLE)}
 update(dt,tg,rate){const k=1-Math.exp(-rate*dt);for(const key of PK)this.p[key]+=(tg[key]-this.p[key])*k}}

// attack arm path: one big circle. On takeoff both arms swing from behind the hips forward and up, the hitting arm keeps
// circling back over the shoulder into the bow-and-arrow (hand behind the head), then whips forward over the top, through the
// ball and on down past the hip. Body keyframes ride along; the hitting arm itself is driven by swingArm() below.
const ATK={back:{lean:.32,head:-.05,aN:-.95,eN:.2,aF:-.8,eF:.2,hN:.15,kN:.3,hF:-.25,kF:.2},
 lift:{lean:.04,head:-.2,aN:2.2,eN:.6,aF:2.25,eF:.3,hN:.45,kN:.9,hF:.1,kF:.75},
 cock:{lean:-.3,head:-.25,aN:3.75,eN:1.3,aF:2.4,eF:.15,hN:-.12,kN:1.4,hF:.12,kF:1.15},
 con:{lean:.12,head:-.15,aN:2.65,eN:0,aF:.3,eF:.7,hN:.25,kN:.8,hF:.35,kF:.75},
 snap:{lean:.5,head:.05,aN:-.3,eN:.3,aF:-.3,eF:.5,hN:.8,kN:.9,hF:.6,kF:.8},
 rec:{lean:.12,head:0,aN:.4,eN:.5,aF:.3,eF:.5,hN:.12,kN:.3,hF:-.1,kF:.25}};
// swing timing: the pre-contact part accelerates (u^2) and the follow-through decelerates (1-(1-w)^2) at the same
// angular speed at contact, so the arm never stops at the top
const swPre=sw=>sw.tp||(sw.tp=clamp(sw.hitAt,.12,.2)),swPost=sw=>swPre(sw)*1.7;
// the whip, keyframed: every step of a real arm swing. Phase 0..1 = approach to contact, 1..2 = follow-through.
// Hips and trunk fire first, the elbow drives forward high while the forearm and hand lag behind the head ("racket drop"),
// then the forearm lashes over the top to full reach at contact, pronates and snaps down across the body.
const WK=(()=>{const C=ATK.cock,K=ATK.con,F=ATK.snap,k=(t,b,o)=>({t,p:Object.assign({},b,o)});return[
 k(0,C,{}),                                                                     // bow and arrow: elbow back, hand by the ear
 k(.22,C,{lean:-.38,aN:3.9,eN:1.6,aF:2.1,hN:-.18,kN:1.5,head:-.28}),           // load: chest opens, arch deepens, off arm starts pulling
 k(.45,C,{lean:-.22,aN:3.5,eN:1.85,aF:1.35,eF:.6,hN:-.02,kN:1.3,head:-.22}),     // hips fire: elbow drives forward, hand drops behind the back
 k(.66,K,{lean:-.05,aN:3.1,eN:1.55,aF:.75,eF:.9,hN:.1,kN:1.05,head:-.2}),       // elbow leads high, forearm still lagging
 k(.84,K,{lean:.05,aN:2.82,eN:.7,aF:.45,eF:.8,head:-.17}),                      // the forearm lashes over the top
 k(1,K,{}),                                                                      // CONTACT: arm fully long, high in front
 k(1.28,K,{lean:.3,aN:2.05,eN:.04,aF:.1,eF:.6,hN:.45,head:-.05}),               // pronation snap, wrist over the ball
 k(1.6,F,{lean:.45,aN:.85,eN:.12,aF:-.15}),                                     // drive down through the ball
 k(2,F,{})]})();                                                                // follow through across the body, past the hip
function wkAt(o,ph){let i=0;while(i<WK.length-2&&ph>WK[i+1].t)i++;
 const a=WK[Math.max(0,i-1)].p,b=WK[i].p,c=WK[i+1].p,d=WK[Math.min(WK.length-1,i+2)].p,t=clamp((ph-WK[i].t)/(WK[i+1].t-WK[i].t),0,1),t2=t*t,t3=t2*t;
 for(const key in b)o[key]=.5*(2*b[key]+(-a[key]+c[key])*t+(2*a[key]-5*b[key]+4*c[key]-d[key])*t2+(-a[key]+3*b[key]-3*c[key]+d[key])*t3)} // Catmull-Rom: no stops between keys
function swingArm(o,sw,s){const tp=swPre(sw);
 if(!sw.done){const u=clamp((s-(sw.hitAt-tp))/tp,0,1);wkAt(o,u*(.55+.45*u));return u} // the arm keeps accelerating into the ball
 const v=s-(sw.hitT||sw.hitAt),w=clamp(v/swPost(sw),0,1);
 if(w<1){wkAt(o,1+(1-(1-w)*(1-w)));return 1}
 setK(o,ATK.snap,ATK.rec,sstep(clamp((v-swPost(sw))/.3,0,1)));return 2}
const sstep=t=>t*t*(3-2*t);
function setK(o,a,b,k){for(const key in a)o[key]=a[key]+(b[key]-a[key])*k}
function poseTarget(P,t){
 const o=Object.assign({},IDLE),sw=P.swing,air=P.h>3||P.vh>40,mv=P.vx*P.face;let rate=14;
 const spd=Math.abs(P.vx);
 if(P.mood==='win'){const b=Math.sin(t*9+P.id*2);Object.assign(o,{lean:-.05,aN:3.0+b*.35,eN:.3,aF:2.8-b*.35,eF:.3,hN:.12,kN:.3+Math.max(0,b)*.5,hF:-.1,kF:.3});rate=10}
 else if(P.mood==='lose'){Object.assign(o,{lean:.34,head:.35,aN:.1,eN:.2,aF:.0,eF:.15,hN:.08,kN:.15,hF:-.05,kF:.1});rate=6}
 else if(P.dive){const d=P.dive,end=d.end||.72;
  if(d.t<.08){Object.assign(o,{rot:.75,dv:.55,lean:.1,head:-.3,aN:2.3,eN:.1,aF:2.1,eF:.15,hN:.5,kN:.9,hF:-.2,kF:.5});rate=26}
  else if(d.t<end-.2){Object.assign(o,{rot:1.47,dv:1,lean:0,head:-.75,aN:2.95,eN:.05,aF:2.8,eF:.1,hN:.05,kN:.12,hF:-.12,kF:.45});rate=24}
  else{Object.assign(o,{rot:.3,dv:.6,lean:.25,head:-.2,aN:.7,eN:.4,aF:.5,eF:.5,hN:1.1,kN:1.8,hF:.3,kF:.9});rate=18}}
 else if(air&&P.armed){const up=P.vh/P.jv;
  // attack jump: arms whip from behind up overhead on takeoff, then load the bow-and-arrow toward the top
  if(up>.8)setK(o,ATK.back,ATK.lift,sstep(clamp((1-up)/.2,0,1)));
  else setK(o,ATK.lift,ATK.cock,sstep(clamp((.8-up)/.5,0,1)));
  rate=32}
 else if(air&&P.recov){Object.assign(o,ATK.rec);if(P.vh<0&&P.h<90)o.kN=o.kF=.2;rate=12}
 else if(air){
  if(P.vh>0)Object.assign(o,{lean:.12,aN:2.55,eN:.4,aF:2.3,eF:.5,hN:.55,kN:1.05,hF:.1,kF:.6});
  else Object.assign(o,{lean:.08,aN:1.9,eN:.3,aF:1.5,eF:.4,hN:.2,kN:.35,hF:-.1,kF:.25});
  rate=13}
 else if(P.land>0)Object.assign(o,{lean:.34,aN:.9,eN:.1,aF:.8,eF:.1,hN:.78,kN:1.45,hF:.35,kF:1.2}),rate=22;
 else if(spd>60){const ph=P.runPh,s=Math.sin(ph),c=Math.cos(ph),bk=mv<-40?-1:1,am=clamp(spd/420,.35,1.2);
  Object.assign(o,{lean:bk>0?.2+am*.06:-.02,hN:.85*s*am*bk,kN:.25+.95*Math.max(0,c*bk)*am,hF:-.85*s*am*bk,kF:.25+.95*Math.max(0,-c*bk)*am,aN:-.9*s*am+.15,eN:.9,aF:.9*s*am+.1,eF:.9});rate=18}
 else if(P.ready){Object.assign(o,{lean:.26,aN:.95,eN:.25,aF:.85,eF:.3,hN:.5,kN:.95,hF:-.12,kF:.8});o.aN+=Math.sin(t*5+P.id)*.05;rate=11}
 else{const b=Math.sin(t*2.4+P.id*3);o.lean+=b*.012;o.aN+=b*.04;o.eN+=b*.05;o.aF-=b*.03;rate=8}
 // hold-ball pose for server
 if(P.serveStage==='ready'||P.serveStage==='toss'&&(P.tossT||0)<.28&&!air){Object.assign(o,{lean:.02,aF:P.serveStage==='ready'?1.3:3.05,eF:P.serveStage==='ready'?.5:.15,aN:P.serveStage==='ready'?.6:3.5,eN:P.serveStage==='ready'?.9:1.2,hN:.18,kN:.2,hF:-.2,kF:.1});rate=14}
 if(sw){const s=sw.t,ph=s<.1?0:s<.2?1:2;
  if(sw.pose==='spike'||sw.pose==='serve'){
   // pro arm swing, one continuous circle: bow-and-arrow cock, elbow leads high, the arm whips out to full reach exactly at contact, then snaps down across the body
   if(sw.hitAt!=null){const pre=!sw.done;o.dv=0;o.rot=0;
    const ph=swingArm(o,sw,s);rate=pre?(ph>0?150:24):ph<2?150:30}
   else if(!sw.done)Object.assign(o,{lean:.12,head:-.1,aN:2.92,eN:.02,aF:.35,eF:.4,hN:.35,kN:1.0,hF:.4,kF:.9}),rate=75;
   else Object.assign(o,{lean:.45,head:.1,aN:.1,eN:.25,aF:-.35,eF:.3,hN:.75,kN:.85,hF:.55,kF:.75}),rate=16}
  else if(sw.pose==='block'){Object.assign(o,{lean:.12,aN:2.78,eN:.05,aF:2.72,eF:.05,hN:.15,kN:.4,hF:-.05,kF:.3});rate=40}
  else if(sw.pose==='bump'){
   // platform pass: arms locked together and angled at the target, legs do the work
   if(ph===0)Object.assign(o,{lean:.38,head:.1,aN:.55,eN:.0,aF:.5,eF:.0,hN:.95,kN:1.6,hF:.35,kF:1.25}),rate=34;
   else if(ph===1)Object.assign(o,{lean:.22,head:-.05,aN:.95,eN:.0,aF:.9,eF:.0,hN:.6,kN:1.0,hF:.1,kF:.7}),rate=55;
   else Object.assign(o,{lean:.12,head:-.1,aN:1.15,eN:.0,aF:1.1,eF:.0,hN:.3,kN:.45,hF:-.05,kF:.3}),rate=12}
  else if(sw.pose==='set'){
   // hands form a window above the forehead, then extend up through the ball
   if(ph===0)Object.assign(o,{lean:-.02,head:-.3,aN:2.3,eN:1.05,aF:2.2,eF:1.1,hN:.5,kN:.95,hF:-.05,kF:.65}),rate=32;
   else if(ph===1)Object.assign(o,{lean:-.1,head:-.35,aN:2.95,eN:.12,aF:2.88,eF:.14,hN:.15,kN:.2,hF:-.1,kF:.12}),rate=55;
   else Object.assign(o,{lean:-.06,head:-.25,aN:2.85,eN:.2,aF:2.78,eF:.22,hN:.12,kN:.15,hF:-.1,kF:.1}),rate=12}
 }
 return [o,rate]}

/* ===== hair ===== */
function hairBack(g,P,r){const c=P.ch,col=P.hairCol(),dk=shade(col.replace(/hsla?\(.*/,'#000000')==='#000000'&&col[0]==='h'?'#444444':col,-.35),sw=P.hairAng;g.fillStyle=col;g.strokeStyle=dk;g.lineWidth=1.5;
 const st=c.style;
 if(st==='pony'){g.save();g.translate(-r*.62,-r*.45);g.rotate(sw*.9+.3);g.beginPath();g.moveTo(0,0);g.bezierCurveTo(-r*.6,r*.1,-r*.9,r*.8,-r*.35+sw*8,r*1.55);g.bezierCurveTo(-r*.05,r*1.0,r*.2,r*.4,r*.2,0);g.closePath();g.fill();g.stroke();g.fillStyle=P.ch.acc;g.beginPath();g.arc(r*.05,0,r*.17,0,6.3);g.fill();g.restore()}
 else if(st==='long'){g.save();g.translate(-r*.5,-r*.5);g.rotate(sw*.6);g.beginPath();g.moveTo(r*.4,0);g.bezierCurveTo(-r*.9,r*.2,-r*1.0+sw*14,r*1.4,-r*.5+sw*20,r*2.05);g.lineTo(r*.35,r*1.7);g.bezierCurveTo(r*.5,r*1.1,r*.5,r*.5,r*.4,0);g.closePath();g.fill();g.stroke();g.restore()}
 else if(st==='bun'){g.beginPath();g.arc(-r*.35,-r*1.12,r*.42,0,6.3);g.fill();g.stroke()}
 else if(st==='afro'){g.beginPath();g.arc(-r*.2,-r*.35,r*1.28,0,6.3);g.fill()}
 else if(st==='bob'){g.beginPath();g.moveTo(r*.35,-r*.7);g.bezierCurveTo(-r*1.4,-r*.9,-r*1.35,r*.9,-r*.55,r*1.05);g.lineTo(r*.3,r*.55);g.closePath();g.fill();g.stroke()}
}
function hairFront(g,P,r){const c=P.ch,col=P.hairCol(),st=c.style;g.fillStyle=col;
 g.beginPath();g.arc(0,0,r+1.6,Math.PI*.96,Math.PI*2-.38);
 if(st==='fade'){g.quadraticCurveTo(r*.45,-r*.66,-r*.2,-r*.35);g.quadraticCurveTo(-r*.8,-r*.1,-r*.98,r*.1)}
 else if(st==='bob'||st==='long'){g.quadraticCurveTo(r*.2,-r*.2,r*.1,r*.1);g.quadraticCurveTo(-r*.5,-r*.5,-r*.95,r*.05)}
 else g.quadraticCurveTo(r*.15,-r*.55,-r*.98,r*.08);
 g.closePath();g.fill();
 if(st==='spike'){for(let i=0;i<5;i++){const a=-Math.PI*.9+i*.5;g.beginPath();g.moveTo(Math.cos(a-.2)*r,Math.sin(a-.2)*r);g.lineTo(Math.cos(a)*r*1.62,Math.sin(a)*r*1.62-4);g.lineTo(Math.cos(a+.2)*r,Math.sin(a+.2)*r);g.fill()}}
 else if(st==='mohawk'){g.fillStyle=col;for(let i=0;i<6;i++){const a=-Math.PI*.82+i*.3;g.beginPath();g.moveTo(Math.cos(a-.17)*r,Math.sin(a-.17)*r);g.lineTo(Math.cos(a)*r*1.5,Math.sin(a)*r*1.5-6);g.lineTo(Math.cos(a+.17)*r,Math.sin(a+.17)*r);g.fill()}
  g.fillStyle=shade(P.ch.acc,-.1);g.beginPath();g.arc(-r*.02,-r*.98,r*.1,0,6.3);g.fill()}
 else if(st==='afro'){g.beginPath();g.arc(-r*.1,-r*.45,r*1.18,Math.PI*.9,Math.PI*2.05);g.quadraticCurveTo(r*.2,-r*.5,-r*.9,0);g.closePath();g.fill()}
}

/* ===== player entity visuals ===== */
function setupVisual(P){
 P.rig=new Rig();P.hairAng=0;P.hairV=0;P.runPh=Math.random()*6;P.mood='';P.land=0;P.ready=false;P.serveStage='';P.after=[];P.afT=0;
 const c=P.ch,ks=KITSET[P.team?1:0]||KITSET[0],kit=P.role==='L'?ks.l:ks.k,ra=RAR[c.rar];
 P.skinD=shade(c.skin,-.18);P.kit=kit;
 P.hairCol=()=>c.rainbow?hsl(P.hueT*60,85,62):c.hair;
 P.hueT=0}
function updateVisual(P,dt,t){
 P.hueT+=dt;
 const [tg,rate]=poseTarget(P,t);P.rig.update(dt,tg,rate);
 if(P.h<=0&&Math.abs(P.vx)>60&&!P.dive)P.runPh+=Math.abs(P.vx)*dt*.034;
 // hair spring
 const tgt=clamp(-P.vx*P.face*.0011-P.vh*.00055,-.7,.7),acc=(tgt-P.hairAng)*160-P.hairV*11;P.hairV+=acc*dt;P.hairAng+=P.hairV*dt;
 if(P.land>0)P.land-=dt;
 // mythic afterimages
 if(P.ch.rar==='mythic'){P.afT-=dt;if(P.afT<=0){P.afT=.045;P.after.unshift({x:P.x,h:P.h,p:Object.assign({},P.rig.p),a:1});if(P.after.length>6)P.after.pop()}for(const a of P.after)a.a-=dt*3.2}}

const TH=40,SH=39,UA=31,FA=30,TOR=58,HR=19,FOOT=7;
const pt=(x,y,L,a)=>[x+L*Math.sin(a),y+L*Math.cos(a)];
function cap(g,x1,y1,x2,y2,w,col,out){g.lineCap='round';g.beginPath();g.moveTo(x1,y1);g.lineTo(x2,y2);if(out){g.strokeStyle='rgba(18,12,30,.48)';g.lineWidth=w+2.4;g.stroke()}g.strokeStyle=col;g.lineWidth=w;g.stroke()}
function seg(g,x1,y1,x2,y2,w,col,a,b){const dx=x2-x1,dy=y2-y1;cap(g,x1+dx*a,y1+dy*a,x1+dx*b,y1+dy*b,w,col,false)}

function limbArm(g,P,sx,sy,a,e,far,pz){
 const skin=far?P.skinD:P.ch.skin,sleeve=far?P.kit.jd:P.kit.jersey;
 const [ex,ey]=pt(sx,sy,UA,a),[wx,wy]=pt(ex,ey,FA,a+e);
 cap(g,sx,sy,ex,ey,11.5,skin,true);cap(g,ex,ey,wx,wy,10.2,skin,true);
 seg(g,sx,sy,ex,ey,14,sleeve,0,.58);
 if((P.ch.gear||'').includes('sleeve')){const sc=far?shade(P.ch.acc,-.3):P.ch.acc;seg(g,sx,sy,ex,ey,12.2,sc,.5,1);seg(g,ex,ey,wx,wy,10.8,sc,0,.8)}
 else seg(g,ex,ey,wx,wy,11,far?'#9a9aa8':P.ch.acc,.66,.84);
 g.fillStyle=skin;g.beginPath();g.arc(wx+Math.sin(a+e)*3,wy+Math.cos(a+e)*3,6.4,0,6.3);g.fill();
 return [wx,wy]}
function limbLeg(g,P,hx,hy,h,k,far){
 const skin=far?P.skinD:P.ch.skin,sh=far?P.kit.sd:P.kit.short;
 const [kx,ky]=pt(hx,hy,TH,h),th=h-k,[ax,ay]=pt(kx,ky,SH,th);
 cap(g,hx,hy,kx,ky,15,skin,true);cap(g,kx,ky,ax,ay,12,skin,true);
 seg(g,hx,hy,kx,ky,19,sh,0,.78);
 seg(g,kx,ky,ax,ay,13.4,far?'#bdbdc8':'#ffffff',.5,1);
 // knee pad
 g.fillStyle=far?'#22222c':'#2b2b38';g.beginPath();g.arc(kx+Math.sin(h)*1.5,ky+Math.cos(h)*1.5,8.2,0,6.3);g.fill();g.strokeStyle='rgba(255,255,255,.18)';g.lineWidth=1.2;g.stroke();
 // shoe
 const fa=Math.PI/2+th*.5-P.rig.p.rot*.35,[tx,ty]=pt(ax,ay,15,fa);
 g.save();g.lineCap='round';g.beginPath();g.moveTo(ax-Math.sin(fa)*0,ay);g.lineTo(tx,ty);g.strokeStyle='rgba(18,12,30,.7)';g.lineWidth=14.5;g.stroke();g.strokeStyle=far?shade(P.ch.acc,-.35):P.ch.acc;g.lineWidth=11.5;g.stroke();
 g.strokeStyle=far?'#aaa':'#fff';g.lineWidth=3;g.beginPath();g.moveTo(ax+Math.sin(fa+1.57)*5.5,ay+Math.cos(fa+1.57)*5.5);g.lineTo(tx+Math.sin(fa+1.57)*5.5,ty+Math.cos(fa+1.57)*5.5);g.stroke();g.restore();
 return [ax,ay]}

function drawHead(g,P,r,mood){
 const c=P.ch,ol='rgba(18,12,30,.5)';
 g.save();g.translate(0,-r*.08);hairBack(g,P,r);g.restore();
 // head profile: cranium + jaw + nose in one path, lit from the front-top
 const grd=g.createLinearGradient(-r,0,r*1.1,-r*.2);grd.addColorStop(0,P.skinD);grd.addColorStop(.55,c.skin);grd.addColorStop(1,shade(c.skin,.12));
 const hp=new Path2D();hp.arc(0,-r*.08,r,2.1,Math.PI*2+.32,false);
 hp.lineTo(r*1.1,r*.34);hp.lineTo(r*.96,r*.47);hp.quadraticCurveTo(r*1.0,r*.56,r*.93,r*.64);
 hp.quadraticCurveTo(r*.92,r*.9,r*.66,r*.96);hp.quadraticCurveTo(r*.15,r*1.02,-r*.5,r*.78);hp.closePath();
 g.fillStyle=grd;g.strokeStyle=ol;g.lineWidth=1.8;g.lineJoin='round';g.fill(hp);g.stroke(hp);
 // jaw shadow + ear
 g.fillStyle='rgba(0,0,0,.08)';g.beginPath();g.moveTo(-r*.5,r*.78);g.quadraticCurveTo(r*.1,r*.98,r*.6,r*.94);g.quadraticCurveTo(r*.1,r*.7,-r*.3,r*.45);g.closePath();g.fill();
 g.fillStyle=P.skinD;g.beginPath();g.ellipse(-r*.08,r*.18,r*.13,r*.19,-.15,0,6.3);g.fill();
 g.strokeStyle='rgba(0,0,0,.18)';g.lineWidth=1.2;g.beginPath();g.arc(-r*.06,r*.18,r*.07,-.8,1.6);g.stroke();
 g.save();g.translate(0,-r*.08);hairFront(g,P,r*1.02);g.restore();
 const gr=c.gear||'band';if(gr.includes('band')){g.save();g.clip(hp);g.strokeStyle=c.acc;g.lineWidth=r*.22;g.beginPath();g.moveTo(-r*1.1,-r*.3);g.quadraticCurveTo(0,-r*.62,r*1.2,-r*.4);g.stroke();g.restore()}
 // eye: small almond, iris looking forward
 const blink=(P.hueT+P.id*1.7)%3.6<.1,ex=r*.6,ey=r*.08,brow=shade(c.hair[0]==='#'?c.hair:'#3a2a20',-.45);
 if(blink){g.strokeStyle='rgba(30,16,20,.8)';g.lineWidth=1.6;g.beginPath();g.moveTo(ex-r*.13,ey);g.quadraticCurveTo(ex,ey+r*.05,ex+r*.12,ey);g.stroke()}
 else{g.fillStyle='#f4efe9';g.beginPath();g.moveTo(ex-r*.14,ey);g.quadraticCurveTo(ex,ey-r*.13,ex+r*.13,ey-r*.01);g.quadraticCurveTo(ex,ey+r*.08,ex-r*.14,ey);g.fill();
  g.fillStyle='#2a1a14';g.beginPath();g.arc(ex+r*.05,ey-r*.02,r*.065,0,6.3);g.fill();
  g.strokeStyle='rgba(25,12,14,.85)';g.lineWidth=1.6;g.beginPath();g.moveTo(ex-r*.15,ey+r*.005);g.quadraticCurveTo(ex,ey-r*.14,ex+r*.14,ey-r*.01);g.stroke();
  if(c.girl){g.lineWidth=1.3;for(let i=0;i<3;i++){const lx=ex+r*(.04+i*.05);g.beginPath();g.moveTo(lx,ey-r*.1+i*r*.015);g.lineTo(lx+r*.06,ey-r*.17+i*r*.03);g.stroke()}}}
 if(gr.includes('goggles')){g.save();g.clip(hp);g.strokeStyle='#15131c';g.lineWidth=r*.14;g.beginPath();g.moveTo(-r*1.1,-r*.12);g.quadraticCurveTo(0,-r*.28,ex,ey-r*.04);g.stroke();g.restore();
  g.fillStyle=c.acc;g.globalAlpha*=.55;g.beginPath();g.ellipse(ex+r*.05,ey-r*.03,r*.27,r*.2,-.1,0,6.3);g.fill();g.globalAlpha/=.55;g.strokeStyle='#15131c';g.lineWidth=r*.07;g.stroke();
  g.strokeStyle='rgba(255,255,255,.75)';g.lineWidth=1.4;g.beginPath();g.moveTo(ex-r*.06,ey-r*.13);g.lineTo(ex+r*.06,ey-r*.15);g.stroke()}
 // brow
 g.strokeStyle=brow;g.lineWidth=2.4;g.lineCap='round';g.beginPath();
 const bA=mood==='shout'||mood==='win'||mood==='focus'?.1:mood==='lose'?-.12:0;
 g.moveTo(ex-r*.17,ey-r*.2+bA*r*-.6);g.lineTo(ex+r*.16,ey-r*.22+bA*r*.9);g.stroke();
 // mouth
 g.strokeStyle='rgba(90,30,36,.8)';g.lineWidth=1.6;g.beginPath();
 if(mood==='shout'||mood==='win'){g.fillStyle='#3a1418';g.ellipse(r*.8,r*.68,r*.09,r*.1,0,0,6.3);g.fill()}
 else if(mood==='lose'){g.moveTo(r*.68,r*.72);g.quadraticCurveTo(r*.8,r*.66,r*.9,r*.71);g.stroke()}
 else{g.moveTo(r*.7,r*.68);g.quadraticCurveTo(r*.8,r*.71,r*.9,r*.67);g.stroke()}
}

function drawPlayer(g,P,alpha=1,flip=false,afterPose=null){
 const pz=afterPose||P.rig.p,f=P.face;
 g.save();g.globalAlpha=alpha;g.translate(P.x,FLOOR-(afterPose?afterPose.__h:P.h));g.scale(f,1);
 const ext=(h,k)=>TH*Math.cos(h)+SH*Math.cos(h-k);
 let hipY=-(Math.max(ext(pz.hN,pz.kN),ext(pz.hF,pz.kF))+FOOT);hipY=lerp(hipY,-(44-26*clamp((pz.rot-.9)/.57,0,1)),pz.dv);
 if(P.mood==='win')hipY-=Math.max(0,Math.sin(P.hueT*9+P.id*2))*10;
 g.translate(0,hipY);g.rotate(pz.rot);
 const mood=P.mood||(P.swing&&P.swing.t>.08&&P.swing.t<.3?'shout':P.ready?'focus':'');
 // far limbs
 const [sx,sy]=pt(0,0,TOR,Math.PI-pz.lean);
 limbArm(g,P,sx-2,sy+3,pz.aF,pz.eF,true,pz);
 limbLeg(g,P,-2,0,pz.hF,pz.kF,true);
 // torso
 const ta=Math.PI-pz.lean,nx=Math.cos(ta)*-1,ny=Math.sin(ta);// perpendicular (approx)
 g.save();
 g.beginPath();
 const gl=P.ch.girl,bw=gl?12:13.5,sw=gl?14.5:17;
 const px=-Math.cos(pz.lean),py=-Math.sin(pz.lean);// perpendicular to torso axis (forward = +)
 const fx=Math.cos(pz.lean),fy=-Math.sin(pz.lean);
 g.moveTo(-fx*bw*.9,-fy*bw*.9+2);
 g.quadraticCurveTo(-fx*(bw+4)+sx*.4,-fy*(bw+4)+sy*.5,sx-fx*sw,sy-fy*sw);
 g.quadraticCurveTo(sx,sy-6,sx+fx*sw,sy+fy*sw);
 g.quadraticCurveTo(fx*(bw+3)+sx*.5,fy*(bw+3)+sy*.5,fx*bw*.9,fy*bw*.9+2);
 g.closePath();
 const gr=g.createLinearGradient(-fx*16,0,fx*16,0);gr.addColorStop(0,P.kit.jd);gr.addColorStop(.55,P.kit.jersey);gr.addColorStop(1,shade(P.kit.jersey,.22));
 g.fillStyle=gr;g.fill();g.strokeStyle='rgba(18,12,30,.48)';g.lineWidth=2;g.stroke();
 g.clip();
 // jersey stripe in rarity/accent
 const ra=RAR[P.ch.rar];g.strokeStyle=P.ch.rar==='common'?P.kit.trim:ra.col;g.lineWidth=7;g.globalAlpha=alpha*.95;g.beginPath();g.moveTo(-18,-6);g.lineTo(sx+18,sy*.5+4);g.stroke();
 g.strokeStyle=P.kit.trim;g.lineWidth=2;g.beginPath();g.moveTo(-18,6);g.lineTo(sx+18,sy*.5+14);g.stroke();g.globalAlpha=alpha;
 if(P.ch.num){g.save();g.translate(sx*.45,sy*.5);g.scale(f,1);g.font='800 17px "Barlow Condensed",Impact,sans-serif';g.textAlign='center';g.textBaseline='middle';g.fillStyle=P.kit.num||'#fff';g.globalAlpha=alpha*.9;g.fillText(P.ch.num,0,0);g.restore()}
 g.restore();
 // shorts block
 g.fillStyle=P.kit.short;g.strokeStyle='rgba(18,12,30,.6)';g.lineWidth=2.2;g.beginPath();g.moveTo(-17,-6);g.quadraticCurveTo(0,-10,17,-6);g.lineTo(18,10);g.quadraticCurveTo(0,15,-18,10);g.closePath();g.fill();g.stroke();
 // neck + head
 const [nx2,ny2]=pt(sx,sy,6,Math.PI-pz.lean-pz.head),[hx,hy]=pt(sx,sy,HR+9,Math.PI-pz.lean-pz.head*1.2);
 cap(g,sx,sy,nx2,ny2,10.5,P.skinD,false);cap(g,sx,sy,(sx+hx)/2,(sy+hy)/2,10.5,P.skinD,false);
 g.save();g.translate(hx,hy);g.rotate(pz.head*.7+pz.lean*-.2);drawHead(g,P,HR,mood);g.restore();
 // near leg then arm
 limbLeg(g,P,2,0,pz.hN,pz.kN,false);
 const hand=limbArm(g,P,sx+1,sy+3,pz.aN,pz.eN,false,pz);
 if(!afterPose)swoosh(g,P,hand);
 g.restore();
 return hand}

// the hitting hand leaves a short tapered swoosh through the attack swing
function swoosh(g,P,hand){const sw=P.swing,tr=P.htr||(P.htr=[]);
 if(sw&&sw.hitAt!=null&&(sw.done?sw.t-(sw.hitT||sw.hitAt)<swPost(sw)*.8:sw.t>sw.hitAt-swPre(sw)*.6))tr.unshift([hand[0],hand[1]]);else tr.pop();
 if(tr.length>9)tr.pop();if(tr.length<3)return;
 g.save();g.globalCompositeOperation='lighter';g.lineCap='round';
 for(let i=1;i<tr.length;i++){const k=1-i/tr.length;g.globalAlpha=.6*k;g.strokeStyle=i<3?'#ffffff':P.ch.fx;g.lineWidth=2+11*k;g.beginPath();g.moveTo(tr[i-1][0],tr[i-1][1]);g.lineTo(tr[i][0],tr[i][1]);g.stroke()}
 g.restore()}

/* ===== rarity auras (drawn behind players) ===== */
function drawAura(g,P,t){
 const r=P.ch.rar;if(r==='common')return;const col=P.ch.fx,cx=P.x,cy=FLOOR-P.h-95;
 g.save();g.globalCompositeOperation='lighter';
 const pulse=.75+.25*Math.sin(t*4+P.id);
 if(r==='rare'){glow(g,cx,cy,120,col,.16*pulse);for(let i=0;i<5;i++){const a=t*1.6+i*1.26,rx=Math.cos(a)*58,ry=Math.sin(a*1.3)*86;g.globalAlpha=.8;g.fillStyle='#fff';star4(g,cx+rx,cy+ry,3.4+Math.sin(t*5+i)*1.4,t+i);g.fill()}}
 else if(r==='epic'){glow(g,cx,cy,140,col,.22*pulse);glow(g,cx,FLOOR-8,90,col,.3*pulse)}
 else if(r==='legendary'){glow(g,cx,cy,150,col,.26*pulse);glow(g,cx,FLOOR-6,110,'#ffd25a',.3*pulse);g.globalAlpha=.55*pulse;g.strokeStyle='#ffd25a';g.lineWidth=3;g.beginPath();g.ellipse(cx,FLOOR-2,70+Math.sin(t*3)*5,13,0,0,6.3);g.stroke()}
 else if(r==='mythic'){const hue=(t*70+P.id*40)%360;glow(g,cx,cy,170,hsl(hue,95,60),.3*pulse);glow(g,cx,FLOOR-6,130,hsl(hue+120,95,60),.35*pulse);
  for(let i=0;i<3;i++){const a=t*1.9+i*2.1;g.globalAlpha=.9;g.fillStyle=hsl(hue+i*90,100,75);star4(g,cx+Math.cos(a)*62,cy+Math.sin(a)*92,5+Math.sin(t*6+i)*1.5,t*2+i);g.fill()}
  g.globalAlpha=.5;g.strokeStyle=hsl(hue,100,70);g.lineWidth=3;g.beginPath();g.ellipse(cx,FLOOR-2,82,14,0,0,6.3);g.stroke()}
 g.restore();g.globalAlpha=1}
// continuous aura particles
function auraParticles(P,dt,t){const r=P.ch.rar;if(r==='common'||P.team===1&&!P.showFx&&false)return;const cx=P.x,fy=FLOOR-P.h;
 if(r==='rare'&&Math.random()<dt*12)FX.add({x:cx+rnd(-30,30),y:fy-rnd(10,170),vy:-rnd(10,40),vx:rnd(-10,10),life:rnd(.6,1.1),s:rnd(2,4),col:'#bfeaff',kind:'star',vr:3,drag:0});
 else if(r==='epic'){if(Math.random()<dt*2.6){const a=rnd(0,6.28),R=rnd(30,60);FX.bolt(cx+Math.cos(a)*20,fy-95+Math.sin(a)*40,cx+Math.cos(a)*R*1.4,fy-95+Math.sin(a)*R*2,P.ch.fx,.14,2,10)}
  if(Math.random()<dt*10)FX.add({x:cx+rnd(-25,25),y:fy-rnd(0,40),vy:-rnd(30,90),life:.5,s:rnd(2,4),col:P.ch.fx,kind:'dot',drag:1})}
 else if(r==='legendary'){if(Math.random()<dt*55)FX.add({x:cx+rnd(-26,26),y:fy-rnd(5,150),vy:-rnd(60,160),vx:rnd(-20,20),life:rnd(.4,.8),s:rnd(8,16),s1:2,col:Math.random()<.5?'#ff7a1a':'#ffc233',kind:'glow',drag:.5});
  if(Math.random()<dt*10)FX.add({x:cx+rnd(-30,30),y:fy-rnd(0,170),vy:-rnd(90,200),life:rnd(.7,1.3),s:2.2,col:'#ffe07a',kind:'dot',drag:.3})}
 else if(r==='mythic'){const hue=(t*90+rnd(0,120))%360;if(Math.random()<dt*35)FX.add({x:cx+rnd(-30,30),y:fy-rnd(0,180),vy:-rnd(20,90),vx:rnd(-30,30),life:rnd(.6,1.2),s:rnd(2,5),col:hsl(hue,100,70),kind:'star',vr:4,drag:.6});
  if(Math.random()<dt*14)FX.add({x:cx+rnd(-30,30),y:fy-rnd(0,170),vy:-rnd(20,60),life:.9,s:rnd(10,20),s1:2,col:hsl(hue,95,60),kind:'glow',drag:.5});
  // crackling electricity on the body, much more of it in the air
  if(Math.random()<dt*(P.h>20?26:7)){const a=rnd(0,6.28),y0=fy-rnd(30,170);FX.bolt(cx+rnd(-14,14),y0,cx+Math.cos(a)*rnd(40,85),y0+Math.sin(a)*rnd(30,70),Math.random()<.5?'#bff4ff':hsl(hue,100,72),.1,2,11)}
  if(P.h>20&&Math.random()<dt*30)FX.add({x:cx+rnd(-12,12),y:fy+rnd(-6,8),vy:rnd(60,160),vx:rnd(-40,40),life:.35,s:rnd(6,11),s1:1,col:'#9ff0ff',kind:'glow',drag:2})}}
// mythics leave the floor in a thunderclap and land with a shockwave
function mythJump(P,big){const x=P.x,y=FLOOR-4,hue=(P.hueT*90)%360;FX.ring(x,y,10,big?150:100,'#bff4ff',.35,7);FX.ring(x,y,6,big?95:60,hsl(hue,100,70),.3,5);
 for(let i=0;i<(big?7:4);i++){const s=i%2?1:-1;FX.bolt(x+rnd(-10,10),y-rnd(10,60),x+s*rnd(60,170),y+rnd(-4,4),i%3?'#bff4ff':hsl(hue+i*40,100,70),.22,3,16)}
 FX.burst(x,y,big?26:14,{col:'#9ff0ff',v0:80,v1:big?520:340,ang:-Math.PI/2,spread:1.4,l0:.2,l1:.5,s0:4,s1:9,drag:3});
 if(typeof AU!=='undefined'){AU.noise(.18,2600,.08,'highpass');AU.tone(1400,.12,'sawtooth',.05,180)}}
function mythLand(P){const x=P.x,y=FLOOR-3,hue=(P.hueT*90)%360;FX.ring(x,y,8,170,hsl(hue,100,70),.4,8);FX.ring(x,y,4,110,'#fff',.25,4);
 for(let i=0;i<6;i++){const s=i%2?1:-1;FX.bolt(x,y-rnd(0,20),x+s*rnd(90,220),y-rnd(0,14),i%2?'#bff4ff':hsl(hue+i*50,100,70),.2,3,12)}
 FX.burst(x,y,18,{col:hsl(hue,100,75),v0:120,v1:420,ang:-Math.PI/2,spread:1.5,l0:.2,l1:.45,s0:3,s1:7,drag:3});if(typeof AU!=='undefined')AU.noise(.12,1800,.07,'bandpass')}
// legendary takeoff: a burst of flame off the floor
function legJump(P){FX.burst(P.x,FLOOR-4,16,{col:'#ff9a2e',v0:60,v1:300,ang:-Math.PI/2,spread:1.1,l0:.25,l1:.5,s0:6,s1:12,drag:3});FX.ring(P.x,FLOOR-4,8,90,'#ffcf3a',.3,5)}

function drawAfter(g,P){if(P.ch.rar!=='mythic')return;g.save();g.globalCompositeOperation='lighter';P.after.forEach((a,i)=>{if(a.a<=0||i<1)return;const pz=Object.assign({},a.p);pz.__h=a.h;const sv=P.x;P.x=a.x;drawPlayer(g,P,Math.max(0,a.a)*.22,false,pz);P.x=sv});g.restore()}

/* ===== ball ===== */
function drawBallSprite(g,x,y,r,rot,glowCol){
 if(glowCol)glow(g,x,y,r*3,glowCol,.45);
 g.save();g.translate(x,y);g.globalAlpha=1;
 const gr=g.createRadialGradient(-r*.35,-r*.4,r*.1,0,0,r*1.05);gr.addColorStop(0,'#fffdf6');gr.addColorStop(.6,'#f1ece0');gr.addColorStop(1,'#bdb6a4');
 g.fillStyle=gr;g.beginPath();g.arc(0,0,r,0,6.3);g.fill();
 g.save();g.beginPath();g.arc(0,0,r,0,6.3);g.clip();g.rotate(rot);
 g.fillStyle='#ff8a1e';
 for(let i=0;i<3;i++){g.rotate(Math.PI*2/3);g.beginPath();g.moveTo(-r*.15,-r*1.1);g.bezierCurveTo(r*.5,-r*.6,r*.5,r*.2,-r*.25,r*.55);g.bezierCurveTo(r*.2,r*.1,r*.15,-r*.5,-r*.55,-r*1.05);g.closePath();g.fill()}
 g.strokeStyle='rgba(90,50,10,.45)';g.lineWidth=1.3;for(let i=0;i<3;i++){g.rotate(Math.PI*2/3);g.beginPath();g.moveTo(-r*.15,-r*1.1);g.bezierCurveTo(r*.5,-r*.6,r*.5,r*.2,-r*.25,r*.55);g.stroke()}
 g.restore();
 const sh=g.createRadialGradient(r*.3,r*.35,r*.2,0,0,r*1.05);sh.addColorStop(0,'rgba(0,0,0,0)');sh.addColorStop(1,'rgba(20,10,40,.4)');g.fillStyle=sh;g.beginPath();g.arc(0,0,r,0,6.3);g.fill();
 g.fillStyle='rgba(255,255,255,.7)';g.beginPath();g.ellipse(-r*.38,-r*.42,r*.2,r*.12,-.7,0,6.3);g.fill();
 g.strokeStyle='rgba(18,12,30,.7)';g.lineWidth=1.8;g.beginPath();g.arc(0,0,r,0,6.3);g.stroke();
 g.restore()}

/* ===== portraits for UI (cached data urls) ===== */
const _port={};
function portrait(id,team=0,mood=''){const key=id+team+mood;if(_port[key])return _port[key];
 const cv=document.createElement('canvas');cv.width=240;cv.height=300;const g=cv.getContext('2d');
 const c=CH[id],P={team,id:team,ch:c,x:120,h:0,vh:0,vx:0,face:1,swing:null,dive:null,ready:true,mood};setupVisual(P);
 const [tg]=poseTarget(P,0);Object.assign(P.rig.p,tg);P.rig.p.aN=.35;P.rig.p.aF=.2;
 g.translate(0,0);g.save();g.translate(0,300-FLOOR+0);
 g.translate(120,0);g.scale(1.45,1.45);g.translate(-120,0);g.translate(0,FLOOR*(1-1/1.45)*0+0);
 g.restore();
 g.save();g.scale(1.5,1.5);g.translate(0,-FLOOR+195);P.x=80;drawPlayer(g,P);g.restore();
 return _port[key]=cv.toDataURL()}
// AI-drawn portraits: girls get girl art, boys get boy art, picked from the name so a player always keeps the same face
const AI_G=['aiko','luna','nova','riley','vega','zoe'],AI_B=['ben','diego','kai','marcus','ryu','sam'];
const AI_OWN=new Set(['dom','chase','lauren','mccarthy','seunghunlee','freddy','yuchan','brandon','justin','yumin','jasmine']);
function portVar(id){if(AI_OWN.has(id))return{flip:0,px:50,py:20,hue:0};const h=hsh('pv'+id);return{flip:h&1,px:30+(h>>1)%5*10,py:10+(h>>4)%3*10,hue:((h>>6)%7-3)*6}}
function aiPort(id){const c=CH[id];if(!c)return null;if(AI_OWN.has(id))return 'assets/portraits/p_'+id+'.jpg';const gi=GIRLS.indexOf(c.name);
 return 'assets/portraits/'+(c.girl?(gi>=0?AI_G[gi]:AI_G[hsh('f'+id)%6]):AI_B[hsh('m'+id)%6])+'.jpg'}
