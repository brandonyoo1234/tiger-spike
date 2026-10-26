'use strict';
const scr=id=>document.getElementById(id);
function show(id){$$('#stage>.scr').forEach(e=>e.classList.remove('show'));if(id)scr(id).classList.add('show')}
const pSrc=id=>aiPort(id)||portrait(id,CH[id]&&CH[id].school?1:0);
const pSty=id=>{const c=CH[id];if(!c||!aiPort(id))return '';const v=portVar(id),gr={common:'saturate(.75) brightness(.95)',rare:'saturate(1.1)',epic:'saturate(1.25) contrast(1.05)',legendary:'saturate(1.35) contrast(1.1) sepia(.15)',mythic:'saturate(1.5) contrast(1.15)'}[c.rar];
 return `style="transform:scaleX(${v.flip?-1:1});object-position:${v.px}% ${v.py}%;filter:${gr} hue-rotate(${v.hue}deg)" class="${c.rar==='mythic'?'zap':''}"`};
function refreshTitle(){
 scr('tStat').innerHTML=`Level ${S.level} · Streak ${S.streak} · W ${S.wins} L ${S.losses} · <span class="coin">${S.coins}</span>`;
 scr('bMute').textContent='Sound: '+(S.mute?'Off':'On')}
function toTitle(){Game.demo();show('title');document.body.classList.remove('playing');refreshTitle()}

/* ===== role select ===== */
const ROLE_INFO={
 S:{ico:'✋',d:'Run the offense. Your toss decides the attack.',k:['SPACE — set the ball','↑ quick · ↓ back row · none = your signature toss','Block at the net too']},
 WS:{ico:'💥',d:'The scorer. Jump, hang, and smash it.',k:['SPACE to jump, then SPACE again in the air to hit','Ball over/behind you = deep · out in front = short','SPACE near the net to block']},
 L:{ico:'🛡',d:'Fastest on the floor. Nothing hits the ground.',k:['Auto-runs to the ball','Tap SPACE on time for PERFECT, or hold SPACE','Dive saves when you are late — and your libero backs YOU up if you miss']}};
function openRole(){AU.resume();AU.click();const box=scr('roles');box.innerHTML='';
 for(const r of ROLES){const I=ROLE_INFO[r],d=document.createElement('div');d.className='rcard'+(S.role===r?' sel':'');d.style.setProperty('--c',ROLE_COL[r]);
  d.innerHTML=`<div class="ri">${I.ico}</div><div class="rn">${ROLE_NAME[r]}</div><div class="rd">${I.d}</div><ul>${I.k.map(x=>`<li>${x}</li>`).join('')}</ul>`;
  d.onclick=()=>{AU.click();S.role=r;save();openRoll()};box.appendChild(d)}
 show('role')}

/* ===== gacha roll: one player per role ===== */
function rollRar(){S.pityR++;S.pityE++;let r;
 if(S.pityE>=30){r=Math.random()<.2?(Math.random()<.3?'mythic':'legendary'):'epic'}
 else if(S.pityR>=10){r=pick(['rare','rare','rare','epic','epic','legendary'])}
 else{let x=Math.random()*100,t=0;r='common';for(const k in RAR){t+=RAR[k].w;if(x<t){r=k;break}}}
 if(RAR[r].i>=1)S.pityR=0;if(RAR[r].i>=2)S.pityE=0;return r}
const ROLE_POS={S:['S'],WS:['OH','OPP','MB'],L:['L']};
function rollOne(ex,role){const r=rollRar();let pool=ROSTER.filter(c=>c.rar===r&&!ex.includes(c.id)&&(!role||ROLE_POS[role].includes(c.pos)));if(!pool.length)pool=ROSTER.filter(c=>c.rar===r&&!ex.includes(c.id));if(!pool.length)pool=ROSTER.filter(c=>!ex.includes(c.id));return pick(pool).id}
function roleLines(c,r){const rs=roleStats(c);
 const my=c.rar==='mythic'&&MYTH[r]?[[MYTH[r].n,MYTH[r].d]]:[];
 if(r==='S')return[['TOSS',TOSS[c.toss].n],['SET',rs.set]].concat(my);
 if(r==='WS'){const sp=specOf(c);return[['STYLE',TRAIT[c.spk].n],['SPIKE',rs.spike]].concat(sp?[[SPEC[sp].n,SPEC[sp].d]]:[])}
 return[['SPEED',r1(rs.lspd/70)],['DIG',rs.dig]].concat(my)}
// active + passives, each with a plain-English description so you know how to use it
function abilHTML(c){const A=ABIL[c.act],M=c.mpas&&MYTH_PAS[c.name];
 return `<div class="ab">${M?`<div class="my"><span>MYTHIC PASSIVE · only ${c.name}</span><b>${M.n}</b><p>${M.d}</p></div>`:''}<div class="act"><span>ACTIVE · full HYPE</span><b>${A.n}</b><p>${A.d}</p></div>${(c.pas||[]).map(k=>`<div class="pas"><span>PASSIVE</span><b>${ABIL[k].n}</b><p>${ABIL[k].d}</p></div>`).join('')}</div>`}
function cardHTML(id,r){const c=abilFor(CH[id],r),ra=RAR[c.rar];
 return `<div class="face h" style="--c:${ra.col}"><img src="${pSrc(id)}" ${pSty(id)}><div class="info"><div class="rar">${ra.name}</div><div class="nm">${c.name}</div><div class="tt">#${c.num} · ${POS_NAME[c.pos]} · ${roleLines(c,r).map(([k,v])=>`${k} <b>${v}</b>`).join(' · ')}</div>
  ${abilHTML(c)}</div></div>`}
const miniHTML=(id,on,owned)=>{const c=CH[id],ra=RAR[c.rar];return `<div class="mini${on?' on':''}" data-id="${id}" style="--c:${ra.col}"><img src="${pSrc(id)}" ${pSty(id)}><b>${c.name}</b><i>${owned?'EQUIPPED':ra.name}</i></div>`};
/* ===== draft: 3 offers per role. Picking one equips it; rerolling renews the 3 offers but keeps whoever is equipped ===== */
let rolling=false;
const rollCost=()=>S.free>0?0:20,roleCost=()=>S.free>0?0:8;
function ensureDraft(){
 if(!S.offers)S.offers={};
 for(const r of ROLES)if(!S.offers[r]||S.offers[r].length!==3||!S.offers[r].every(id=>CH[id]))S.offers[r]=rollOffers(r);
 if(!S.team)S.team=[null,null,null];save()}
function rollOffers(r){const o=[];for(let i=0;i<3;i++)o.push(rollOne(o,r));return o}
function refreshRollBtns(){const c=rollCost();scr('bReroll').textContent=c?`↻ Reroll all — ${c}`:`↻ Reroll all — free (${S.free})`;scr('rCoins').innerHTML=`<span class="coin">${S.coins}</span>`;scr('bGo').disabled=rolling||!S.team||!S.team.every(Boolean)}
function openRoll(){ensureDraft();show('roll');const sl=scr('slots');sl.innerHTML='';
 ROLES.forEach((r,i)=>{const d=document.createElement('div');d.className='slot'+(r===S.role?' you':'');d.id='slot'+i;d.style.setProperty('--rc',ROLE_COL[r]);sl.appendChild(d);drawSlot(i)});
 refreshRollBtns()}
function drawSlot(i,fresh){const r=ROLES[i],d=scr('slot'+i),cur=S.team[i];
 const ra=cur?RAR[CH[cur].rar]:null;d.classList.toggle('done',!!cur);d.classList.toggle('hi',!!ra&&ra.i>=2);if(ra)d.style.setProperty('--gl',ra.col);
 const rc=roleCost();
 d.innerHTML=`<div class="rl">${ROLE_NAME[r]}${r===S.role?' · YOU':' · BOT'}</div>
  <div class="card3">${cur?cardHTML(cur,r):'<div class="face empty">Pick one of the 3 below</div>'}</div>
  <div class="sub">OFFERS <button class="btn ghost xs" data-rr>↻ ${rc?rc+' coins':'free'}</button></div>
  <div class="offers${fresh?' pop':''}">${S.offers[r].map(id=>miniHTML(id,id===cur,id===cur)).join('')}</div>`;
 d.querySelectorAll('.mini').forEach(e=>e.onclick=()=>pickCard(i,e.dataset.id));
 d.querySelector('[data-rr]').onclick=()=>rerollRole(i)}
function pickCard(i,id){AU.click();if(S.team[i]!==id)AU.reveal(RAR[CH[id].rar].i)
 S.team[i]=id;save();drawSlot(i);refreshRollBtns()}
function pay(c){if(c>S.coins){AU.tick();scr('rMsg').textContent='Not enough coins — win matches to earn more!';return false}
 if(S.free>0)S.free--;else S.coins-=c;scr('rMsg').textContent='';return true}
function rerollRole(i){if(!pay(roleCost()))return;const r=ROLES[i];S.offers[r]=rollOffers(r);save();AU.tick();drawSlot(i,true);ROLES.forEach((_,j)=>j!==i&&drawSlot(j));refreshRollBtns()}
function doRoll(){if(!pay(rollCost()))return;ROLES.forEach((r,i)=>{S.offers[r]=rollOffers(r)});save();AU.tick();ROLES.forEach((_,i)=>drawSlot(i,true));refreshRollBtns()}

/* ===== match ===== */
// opponents: the other international schools, in league order
const oppSchool=lv=>SCHOOL_ORDER[(lv-1)%SCHOOL_ORDER.length];
function oppTeam(lv){return schoolTeam(oppSchool(lv),lv)}
let curMatch=null;
function startTour(){AU.resume();if(!S.team||!S.team.every(Boolean)){openRole();return}const lv=S.level;
 const t1=oppTeam(lv),skill=clamp(.45+lv*.04,.45,.85);
 curMatch={lv};show(null);document.body.classList.add('playing');
 Game.start({mode:'tour',role:S.role,school1:oppSchool(lv),team0:S.team.slice(),team1:t1,skill0:.72,skill1:skill,level:lv,target:lv<3?7:11,onEnd:onMatchEnd});S.plays++;save()}
function onMatchEnd(r){const st=r.stats;document.body.classList.remove('playing');
 let coins=0,msg='';
 if(r.win){S.wins++;S.streak++;S.bestStreak=Math.max(S.bestStreak,S.streak);coins=40+S.level*12+st.perfects*3+st.aces*10;S.level++;S.free++;msg='+1 free reroll'}
 else{S.losses++;S.streak=0;coins=15+st.perfects*2}
 S.coins+=coins;S.perfects+=st.perfects;S.aces+=st.aces;S.bestRally=Math.max(S.bestRally,r.best);save();
 scr('rTitle').textContent=r.win?'VICTORY!':'DEFEAT';scr('rTitle').style.color=r.win?'#ffd23d':'#8aa0c8';
 scr('rScore').textContent=`${r.score[0]} – ${r.score[1]}   ·   Level ${r.win?S.level-1:S.level} ${r.win?'cleared':'— try again'}`;
 scr('rStats').innerHTML=[['Perfects',st.perfects],['Spikes',st.spikes],['Blocks',st.blocks],['Digs',st.digs],['Best rally',r.best]].map(([k,v])=>`<div><b>${v}</b>${k}</div>`).join('');
 scr('rCoin').textContent='+'+coins+' coins  ('+S.coins+' total)';scr('rNew').textContent=msg;
 scr('bNext').textContent=r.win?'▶ Next: vs '+oppSchool(S.level):'▶ Rematch vs '+oppSchool(S.level);
 Game.demo();show('result')}

/* ===== wiring ===== */
scr('bPlay').onclick=openRole;
scr('bRBack').onclick=()=>{AU.click();show('title');refreshTitle()};
scr('bLBack').onclick=()=>{AU.click();openRole()};
scr('bReroll').onclick=()=>doRoll(false);
scr('bGo').onclick=()=>{if(rolling)return;AU.click();startTour()};
scr('bMute').onclick=()=>{AU.resume();AU.setMute(!S.mute);refreshTitle()};
scr('ibMute').onclick=()=>{AU.setMute(!S.mute);scr('ibMute').style.opacity=S.mute?.4:1};
scr('ibPause').onclick=()=>Game.togglePause();
scr('bResume').onclick=()=>Game.pause(false);
scr('bQuit').onclick=()=>{Game.pause(false);toTitle()};
scr('pause').classList.remove('show');
const _gp=Game.pause;Game.pause=function(b){_gp.call(Game,b);scr('pause').classList.toggle('show',b)};
scr('bNext').onclick=()=>{AU.click();startTour()};scr('bTeam').onclick=()=>{AU.click();openRoll()};scr('bMenu').onclick=()=>{AU.click();show('title');refreshTitle()};
addEventListener('pointerdown',()=>AU.resume(),{once:true});

/* touch controls */
if(matchMedia('(pointer:coarse)').matches||'ontouchstart' in window)document.body.classList.add('touch');
function hold(id,key){const e=scr(id);const on=ev=>{ev.preventDefault();IN[key]=1;e.classList.add('on')},off=ev=>{ev.preventDefault();IN[key]=0;e.classList.remove('on')};
 e.addEventListener('pointerdown',on);e.addEventListener('pointerup',off);e.addEventListener('pointercancel',off);e.addEventListener('pointerleave',off)}
hold('tL','l');hold('tR','r');hold('tU','u');hold('tD','d');
{const a=scr('tA'),up=ev=>{ev.preventDefault();IN.hold=0};a.addEventListener('pointerdown',ev=>{ev.preventDefault();press()});a.addEventListener('pointerup',up);a.addEventListener('pointercancel',up);a.addEventListener('pointerleave',up)}

/* boot */
if(S.team&&!S.team.every(id=>!id||CH[id]&&!CH[id].school)){S.team=null;save()}
const q=new URLSearchParams(location.search);
if(q.has('demo')){Game.demo();show(null)}
else toTitle();
if(q.has('play')){if(q.get('role'))S.role=q.get('role');if(!S.team||!S.team.every(Boolean)){const t=[];ROLES.forEach(r=>t.push(rollOne(t,r)));S.team=t}startTour()}
