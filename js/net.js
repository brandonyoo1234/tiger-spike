'use strict';
/* ===== online: lobby, parties, and host-run matches =====
 Everyone who opens the shared page lands in one lobby. A party is a named room with a leader.
 The leader's page runs the real match; everyone else draws what it sends (presence, ~20/s) and sends back their buttons. */
const NT={room:null,lobby:null,party:null,code:'',me:'',nm:'',view:'off',qp:false,joinedAt:0,lead:false,cfg:null,
 go:null,goId:'',host:false,slot:-1,rin:{},pe:[0,0,0,0,0,0],evs:[],seq:0,acc:0,lastS:-1,rtt:.12,pgSent:0,pgSeen:0,
 inSent:'',inT:0,pc:0,overT:-1,lastSnap:0,lastFrame:0,result:'',msg:'',renderT:0};
const NT_CH='abcdefghjkmnpqrstuvwxyz23456789';
const ntCode=()=>Array.from({length:4},()=>NT_CH[Math.floor(Math.random()*NT_CH.length)]).join('');
const cmpPeer=(a,b)=>a.peer<b.peer?-1:a.peer>b.peer?1:0;
const r2=v=>Math.round((+v||0)*100)/100,r0=v=>Math.round(+v||0);
const esc=s=>String(s==null?'':s).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const cleanNm=s=>Array.from(String(s||'')).filter(c=>{const n=c.codePointAt(0);return n>=32&&!(n>=127&&n<=159)&&!(n>=0x200b&&n<=0x200f)&&!(n>=0x2028&&n<=0x202e)&&!(n>=0x2060&&n<=0x206f)&&n!==0xfeff}).join('').trim().slice(0,14);

/* ---- transport: claude.ai rooms, or a same-browser stand-in for local testing ---- */
function localRoom(){
 const bc=new BroadcastChannel('tsv-net'),id='p'+Math.random().toString(36).slice(2,10),rooms={};
 function mk(name){
  const R={name,mine:{},pm:new Map(),subs:new Set(),dirty:false,
   all(){return[{peer:id,by:null,isMe:true,sameTab:true,kind:'human',guest:false,presence:R.mine,updatedAt:Date.now()},...R.pm.values()]},
   peers(){return R.all()},
   presence(patch){for(const k in patch){if(patch[k]===null)delete R.mine[k];else R.mine[k]=patch[k]}
    if(!R.dirty){R.dirty=true;setTimeout(()=>{R.dirty=false;bc.postMessage({r:name,from:id,p:R.mine})},33)}R.note();return Promise.resolve()},
   onPeers(fn){R.subs.add(fn);setTimeout(()=>fn({peers:R.all(),joined:[],left:[],updated:[]}),0);return()=>R.subs.delete(fn)},
   note(){if(R.nq)return;R.nq=true;setTimeout(()=>{R.nq=false;const ps=R.all();for(const f of R.subs)f({peers:ps,joined:[],left:[],updated:[]})},0)},
   connected:()=>true,onConnection(fn){fn(true);return()=>{}},
   leave(){bc.postMessage({r:name,from:id,bye:1});clearInterval(R.hb);delete rooms[name];R.subs.clear();return Promise.resolve()}};
  R.hb=setInterval(()=>{bc.postMessage({r:name,from:id,p:R.mine});const t=Date.now();for(const [k,v] of R.pm)if(t-v.updatedAt>3500){R.pm.delete(k);R.note()}},1000);
  bc.postMessage({r:name,from:id,p:R.mine,hi:1});rooms[name]=R;return R}
 bc.onmessage=e=>{const m=e.data,R=rooms[m.r];if(!R||m.from===id)return;
  if(m.bye){R.pm.delete(m.from);R.note();return}
  R.pm.set(m.from,{peer:m.from,by:null,isMe:false,sameTab:false,kind:'human',guest:false,presence:m.p||{},updatedAt:Date.now()});
  if(m.hi)bc.postMessage({r:m.r,from:id,p:R.mine});R.note()};
 const L=mk('lobby');L.join=async name=>rooms[name]||mk(name);return L}

// anyone, no sign-in: browsers find each other through public relays, then talk directly (WebRTC)
// Minimal MQTT 3.1.1 over WebSocket (QoS 0 only)
function mqConn(url,onMsg,onUp){const te=new TextEncoder(),td=new TextDecoder();let ws,buf=new Uint8Array(0),ping,up=false,subs=new Set(),dead=false,retry=1000;
 const str=s=>{const b=te.encode(s);return[b.length>>8,b.length&255,...b]};
 const len=n=>{const o=[];do{let d=n%128;n=Math.floor(n/128);if(n>0)d|=128;o.push(d)}while(n>0);return o};
 const pkt=(h,body)=>{const b=body instanceof Uint8Array?body:Uint8Array.from(body),o=new Uint8Array(1+len(b.length).length+b.length);o[0]=h;o.set(len(b.length),1);o.set(b,1+len(b.length).length);return o};
 const send=p=>{if(ws&&ws.readyState===1)ws.send(p)};
 const sub=t=>send(pkt(0x82,[0,1,...str(t),0]));
 function open(){if(dead)return;try{ws=new WebSocket(url,'mqtt')}catch(e){return later()}ws.binaryType='arraybuffer';
  ws.onopen=()=>{const id='ts'+Math.random().toString(36).slice(2,12);send(pkt(0x10,[...str('MQTT'),4,2,0,30,...str(id)]))};
  ws.onmessage=e=>{const d=new Uint8Array(e.data),n=new Uint8Array(buf.length+d.length);n.set(buf);n.set(d,buf.length);buf=n;
   for(;;){let m=1,v=0,i=1,b;do{if(i>=buf.length)return;b=buf[i++];v+=(b&127)*m;m*=128}while(b&128);if(buf.length<i+v)return;
    const h=buf[0],body=buf.subarray(i,i+v);buf=buf.slice(i+v);
    if((h>>4)===2){up=true;retry=1000;for(const t of subs)sub(t);ping=setInterval(()=>send(Uint8Array.of(0xc0,0)),20000);onUp&&onUp(true)}
    else if((h>>4)===3){const tl=(body[0]<<8)|body[1],t=td.decode(body.subarray(2,2+tl));let p=2+tl;if(h&6)p+=2;try{onMsg(t,td.decode(body.subarray(p)))}catch(e){}}}};
  ws.onclose=()=>{up=false;clearInterval(ping);onUp&&onUp(false);later()};ws.onerror=()=>{}}
 function later(){if(!dead)setTimeout(open,retry=Math.min(retry*2,15000))}
 open();
 return{get up(){return up},sub(t){subs.add(t);if(up)sub(t)},unsub(t){subs.delete(t);if(up)send(pkt(0xa2,[0,2,...str(t)]))},
  pub(t,s){if(up)send(pkt(0x30,[...str(t),...te.encode(s)]))},close(){dead=true;clearInterval(ping);try{ws.close()}catch(e){}}}}
// Online rooms: Trystero (direct WebRTC) where the networks allow it, plus an MQTT relay that always works.
// Every message goes out with a sequence number; whichever path delivers it first wins.
const MQ_URL='wss://broker.hivemq.com:8884/mqtt';
function p2pRoom(){const T=window.Trystero;if(!T||!window.WebSocket)return null;
 const P2P=!!window.RTCPeerConnection&&!/[?&]relay\b/.test(location.search),me=T.selfId,rooms={},byTopic={},tp=name=>'tsv1/tiger-spike/'+name;
 const cfg={appId:'tiger-spike-sis-volleyball',relayConfig:{urls:['wss://relay.damus.io','wss://nos.lol','wss://relay.primal.net','wss://nostr.mom','wss://offchain.pub','wss://relay.nostr.net'],warnOnRelayFailure:false}};
 const mq=mqConn(MQ_URL,(t,s)=>{const R=byTopic[t];if(!R)return;let m;try{m=JSON.parse(s)}catch(e){return}if(m&&typeof m.i==='string')R.got(m.i,m,false)},
  up=>{for(const k in rooms){if(up)rooms[k].push(true);rooms[k].note()}if(NT.view==='lobby')mpRender()});
 addEventListener('pagehide',()=>{for(const k in rooms)mq.pub(tp(k),JSON.stringify({i:me,bye:1}))});
 function mk(name){let room=null,act=null;const topic=tp(name);
  if(P2P)try{room=T.joinRoom(cfg,name);act=room.makeAction('pr')}catch(e){room=act=null}
  const R={mine:{},pm:new Map(),subs:new Set(),dirty:false,q:0,lq:{},p2pAt:{},
   all(){return[{peer:me,by:null,isMe:true,sameTab:true,kind:'human',guest:false,presence:R.mine,updatedAt:Date.now()},...R.pm.values()]},
   peers(){return R.all()},
   // relay only when someone here can't be reached directly (and always on the heartbeat, so newcomers find us)
   push(full){R.q++;const m={q:R.q,d:R.mine},t=Date.now();if(act)try{act.send(m)}catch(e){}
    if(full||!act||[...R.pm.keys()].some(id=>!(t-(R.p2pAt[id]||0)<4000)))mq.pub(topic,JSON.stringify({i:me,q:m.q,d:m.d}))},
   presence(patch,urgent){for(const k in patch){if(patch[k]===null)delete R.mine[k];else R.mine[k]=patch[k]}
    if(urgent)R.push(false);else if(!R.dirty){R.dirty=true;setTimeout(()=>{R.dirty=false;R.push(false)},33)}R.note();return Promise.resolve()},
   got(id,m,direct){if(id===me||!m||typeof m!=='object')return;const t=Date.now();if(direct)R.p2pAt[id]=t;
    if(m.bye){if(R.pm.delete(id))R.note();delete R.lq[id];return}
    const q=+m.q||0,e=R.pm.get(id);if(e&&q<=(R.lq[id]||0)){e.updatedAt=t;return}
    R.lq[id]=q;R.pm.set(id,{peer:id,by:null,isMe:false,sameTab:false,kind:'human',guest:true,presence:m.d&&typeof m.d==='object'?m.d:{},updatedAt:t});R.note()},
   onPeers(fn){R.subs.add(fn);setTimeout(()=>fn({peers:R.all(),joined:[],left:[],updated:[]}),0);return()=>R.subs.delete(fn)},
   note(){if(R.nq)return;R.nq=true;setTimeout(()=>{R.nq=false;const ps=R.all();for(const f of R.subs)f({peers:ps,joined:[],left:[],updated:[]})},0)},
   connected:()=>mq.up,onConnection(fn){fn(true);return()=>{}},status:()=>({relay:mq.up}),
   leave(){clearInterval(R.hb);mq.pub(topic,JSON.stringify({i:me,bye:1}));mq.unsub(topic);delete byTopic[topic];delete rooms[name];R.subs.clear();
    if(room)try{room.leave()}catch(e){}return Promise.resolve()}};
  if(act){act.onMessage=(data,meta)=>{const id=meta&&meta.peerId||meta;if(typeof id==='string')R.got(id,data,true)};
   room.onPeerJoin=id=>{try{act.send({q:R.q,d:R.mine},{target:id})}catch(e){}};
   // a dropped direct link doesn't mean they left: they may still be on the relay, so let the heartbeat decide
   room.onPeerLeave=id=>{delete R.p2pAt[id]}}
  byTopic[topic]=R;mq.sub(topic);
  R.hb=setInterval(()=>{const t=Date.now();for(const [k,v] of R.pm)if(t-v.updatedAt>12000){R.pm.delete(k);R.note()}R.push(true)},4000);
  rooms[name]=R;return R}
 const L=mk('lobby');L.join=async name=>rooms[name]||mk(name);return L}

async function netConnect(){
 if(NT.room)return NT.room;
 let r=null;
 try{if(window.claude&&typeof claude.use==='function')r=await Promise.race([claude.use('room'),new Promise(res=>setTimeout(()=>res(null),8000))])}catch(e){r=null}
 const loc=/^(localhost|127\.0\.0\.1|\[::1\])$/.test(location.hostname);
 if(!r&&!(loc&&/[?&]local\b/.test(location.search)))try{r=p2pRoom()}catch(e){r=null}
 if(!r&&loc)r=localRoom();
 if(!r)return null;
 NT.room=r;NT.lobby=r;
 r.onPeers(()=>onLobby(),()=>{});
 if(!NT.nm){let n=S.mpName||'';
  if(!n&&window.claude&&claude.use){try{const u=await claude.use('user');if(u){const m=await u.me();n=m&&m.name?m.name.split(' ')[0]:''}}catch(e){}}
  NT.nm=cleanNm(n)||'Player'+Math.floor(100+Math.random()*900)}
 lobbyPresence();return r}
const myPeer=R=>{const m=R.peers().find(p=>p.isMe);return m?m.peer:''};

/* ---- lobby: who's around, which parties are open ---- */
function lobbyPresence(){if(!NT.lobby)return;
 const pty=NT.party&&NT.lead?{c:NT.code,n:partyPeers().length,m:NT.cfg?NT.cfg.mode:'vs',ld:NT.nm,ing:NT.go?1:0}:null;
 NT.lobby.presence({nm:NT.nm,pty}).catch(()=>{})}
function openParties(){if(!NT.lobby)return[];
 return NT.lobby.peers().filter(p=>!p.isMe&&p.presence&&p.presence.pty&&typeof p.presence.pty.c==='string'&&/^[a-z0-9]{4}$/.test(p.presence.pty.c))
  .map(p=>({c:p.presence.pty.c,n:+p.presence.pty.n||1,m:p.presence.pty.m==='coop'?'coop':'vs',ld:cleanNm(p.presence.pty.ld),ing:!!p.presence.pty.ing}))}
function onLobby(){
 // two people pressed Quick Play at once and both made a party: the one with the later code folds into the other
 if(NT.qp&&NT.party&&NT.lead&&!NT.go&&partyPeers().length===1){const o=openParties().filter(p=>!p.ing&&p.n<6&&p.c<NT.code)[0];if(o){joinParty(o.c,true);return}}
 if(NT.view==='lobby')mpRender()}

/* ---- party ---- */
function partyPeers(){return NT.party?NT.party.peers().filter(p=>p.presence&&p.presence.nm!=null):[]}
const defCfg=()=>({mode:'vs',tg:11,df:1,auto:1,sl:[null,null,null,null,null,null]});
async function joinParty(code,qp){if(NT.busy)return;NT.busy=true;
 try{await leaveParty(true);NT.code=code;NT.qp=!!qp;NT.lead=false;NT.cfg=null;NT.go=null;NT.goId='';NT.result='';NT.sawLead=false;NT.seek=performance.now();
  NT.party=await NT.room.join('tsv-'+code);NT.me=myPeer(NT.party)||myPeer(NT.room);NT.joinedAt=performance.now();
  setTimeout(()=>seekTimeout(code),SEEK_MS);
  partyPresence();NT.party.onPeers(()=>onParty(),e=>{NT.msg='Lost the party ('+(e&&e.code||'error')+')';leaveParty()});
  NT.view='party';mpRender()}
 catch(e){NT.msg='Could not join: '+(e&&e.code||e&&e.message||'error');NT.party=null;NT.view='lobby';mpRender()}
 finally{NT.busy=false}}
const SEEK_MS=10000;
function seekTimeout(code){if(!NT.party||NT.code!==code||!NT.seek)return;const qp=NT.qp;
 leaveParty(true).then(()=>{if(qp){createParty(true);return}
  NT.msg='No party found with code '+code.toUpperCase()+'. Check the code, and make sure the leader has the party screen open.';NT.view='lobby';mpRender()})}
async function createParty(qp){let c=ntCode();const taken=openParties().map(p=>p.c);while(taken.includes(c))c=ntCode();
 await joinParty(c,qp);if(!NT.party)return;NT.lead=true;NT.seek=0;NT.sawLead=true;NT.cfg=defCfg();NT.joinedAt=-1e9;partyPresence();lobbyPresence();mpRender()}
async function quickPlay(){AU.click();NT.msg='';
 const o=openParties().filter(p=>!p.ing&&p.n<6).sort((a,b)=>b.n-a.n)[0];
 if(o)await joinParty(o.c,true);else await createParty(true)}
async function leaveParty(silent){const P=NT.party;
 if(G.net)endNet('');
 NT.party=null;NT.lead=false;NT.seek=0;NT.sawLead=false;NT.go=null;NT.cfg=null;NT.code='';NT.qp=false;
 if(P){try{await P.leave()}catch(e){}}
 lobbyPresence();if(!silent){NT.view='lobby';mpRender()}}
function partyPresence(){if(!NT.party)return;
 const tm=S.team&&S.team.every(id=>id&&CH[id])?S.team.slice():null;
 NT.party.presence({nm:NT.nm,pr:S.role||'WS',tm,lead:NT.lead?1:null,cfg:NT.lead?NT.cfg:null}).catch(()=>{})}
function leaderPeer(ps){const L=ps.filter(p=>p.presence.lead).sort(cmpPeer)[0];return L||null}
function onParty(){if(!NT.party)return;const ps=partyPeers(),now=performance.now();
 let L=leaderPeer(ps);
 if(L){NT.sawLead=true;if(NT.seek){NT.seek=0;NT.msg='';mpRender()}}
 // nobody leads (the leader left): the lowest id takes over, after a moment so a newcomer doesn't grab it.
 // Only someone who has seen this party's leader may, so a mistyped code never turns into an empty party.
 if(!L&&NT.sawLead&&now-NT.joinedAt>1500){const lo=ps.slice().sort(cmpPeer)[0];if(lo&&lo.isMe){NT.lead=true;NT.cfg=NT.cfg||defCfg();partyPresence();lobbyPresence()}}
 else if(L&&!L.isMe&&NT.lead){if(!NT.go){NT.lead=false;partyPresence();lobbyPresence()}}
 L=leaderPeer(partyPeers());
 if(L&&!L.isMe){const c=L.presence.cfg;if(c&&typeof c==='object')NT.cfg=sanCfg(c)}
 if(NT.lead&&NT.cfg){const ids=ps.map(p=>p.peer);let ch=false;
  NT.cfg.sl=NT.cfg.sl.map(s=>{if(s&&!ids.includes(s)){ch=true;return null}return s});
  if(NT.cfg.auto){const a=autoSlots(ps,NT.cfg.mode);if(a.join()!==NT.cfg.sl.join()){NT.cfg.sl=a;ch=true}}
  if(ch&&!NT.go)partyPresence();if(ch)lobbyPresence()}
 // match flow
 if(NT.lead){if(G.net&&NT.host)hostInputs(ps)}
 else{const go=L&&L.presence.go;
  if(go&&typeof go==='object'&&go.id&&go.id!==NT.goId&&!G.net)startNet(sanGo(go),false);
  else if(G.net&&G.puppet){if(!L||!go||go.id!==NT.goId){endNet(G.state==='over'?'fin':'Match ended by the host')}
   else{const s=L.presence.s;if(s&&typeof s==='object'&&s.t!==NT.lastS){NT.lastS=s.t;try{applySnap(s)}catch(e){}}
    for(let i=0;i<6;i++){const p=NT.go.sl[i];if(p&&G.players[i]&&!ps.some(q=>q.peer===p)){G.players[i].human=false;G.players[i].pn=''}}}}}
 if(NT.view==='party'&&!G.net&&now-NT.renderT>120){NT.renderT=now;mpRender()}
 else if(NT.view==='party'&&!G.net){clearTimeout(NT.rt);NT.rt=setTimeout(()=>{if(NT.view==='party'&&!G.net)mpRender()},130)}}
function sanCfg(c){const sl=Array.isArray(c.sl)?c.sl.slice(0,6).map(x=>typeof x==='string'?x:null):[];while(sl.length<6)sl.push(null);
 return{mode:c.mode==='coop'?'coop':'vs',tg:[7,11,15].includes(c.tg)?c.tg:11,df:[0,1,2].includes(c.df)?c.df:1,auto:c.auto?1:0,sl}}
const okIds=a=>Array.isArray(a)&&a.length===3&&a.every(id=>typeof id==='string'&&CH[id]);
function sanGo(g){const sl=Array.isArray(g.sl)?g.sl.slice(0,6).map(x=>typeof x==='string'?x:null):[null,null,null,null,null,null];while(sl.length<6)sl.push(null);
 const sc=s=>SCHOOLS[s]?s:'KIS';
 return{id:String(g.id).slice(0,20),sl,t0:okIds(g.t0)?g.t0:randTeam(),t1:okIds(g.t1)?g.t1:randTeam(),s0:sc(g.s0),s1:sc(g.s1),k0:clamp(+g.k0||.72,.3,.95),k1:clamp(+g.k1||.6,.3,.95),
  tg:[7,11,15].includes(g.tg)?g.tg:11,nm:Array.isArray(g.nm)?g.nm.slice(0,6).map(cleanNm):['','','','','',''],mode:g.mode==='coop'?'coop':'vs'}}
// quick fair split: vs alternates teams, co-op stacks everyone against the bots; each gets the position they asked for if it's free
function autoSlots(ps,mode){const sl=[null,null,null,null,null,null],ord=ps.slice().sort((a,b)=>(b.presence.lead?1:0)-(a.presence.lead?1:0)||cmpPeer(a,b));
 ord.forEach((p,k)=>{let t=mode==='coop'?(k<3?0:1):k%2;const free=i=>sl[t*3+i]===null,pr=ROLES.indexOf(p.presence.pr);
  if(![0,1,2].some(free))t=1-t;if(![0,1,2].some(free))return;
  const i=pr>=0&&free(pr)?pr:[1,0,2].find(free);sl[t*3+i]=p.peer});return sl}
function leaderSetCfg(f){if(!NT.lead||!NT.cfg)return;f(NT.cfg);partyPresence();lobbyPresence();mpRender()}
function cycleSlot(i){leaderSetCfg(c=>{const ps=partyPeers(),opts=[null,...ps.map(p=>p.peer)],cur=opts.indexOf(c.sl[i]),nx=opts[(cur+1)%opts.length];
 if(nx)c.sl=c.sl.map(s=>s===nx?null:s);c.sl[i]=nx;c.auto=0});AU.click()}

/* ---- starting a match ---- */
function teamFor(t,sl,ps){const hs=[0,1,2].map(i=>ps.find(p=>p.peer===sl[t*3+i])).filter(Boolean);
 const base=hs.length&&okIds(hs[0].presence.tm)?hs[0].presence.tm.slice():randTeam();
 return[0,1,2].map(i=>{const p=ps.find(q=>q.peer===sl[t*3+i]);return p&&okIds(p.presence.tm)?p.presence.tm[i]:base[i]})}
function hostStart(){if(!NT.lead||!NT.cfg||G.net)return;AU.click();const ps=partyPeers(),c=NT.cfg,sl=c.sl.slice();
 const t0=teamFor(0,sl,ps),t1=teamFor(1,sl,ps),k=[.5,.66,.82][c.df];
 const s1=pick(SCHOOL_ORDER),go={id:'m'+Date.now().toString(36),sl,t0,t1,s0:'SIS',s1,k0:c.mode==='coop'?.72:.7,k1:c.mode==='coop'?k:.7,tg:c.tg,mode:c.mode,
  nm:sl.map(p=>{const q=ps.find(x=>x.peer===p);return q?cleanNm(q.presence.nm):''})};
 NT.party.presence({go,s:null}).catch(()=>{});startNet(go,true);lobbyPresence()}
const NETAPI={tick:hostTick,puppet:clientFrame};
function startNet(go,host){
 NT.go=go;NT.goId=go.id;NT.host=host;NT.slot=go.sl.indexOf(NT.me);NT.rin={};NT.evs=[];NT.seq=0;NT.acc=0;NT.lastS=-1;NT.overT=-1;NT.lastSnap=performance.now();NT.pe=[0,0,0,0,0,0];NT.pc0=0;NETEV.length=0;
 const hum={};go.sl.forEach((p,i)=>{if(!p)return;if(i===NT.slot)hum[i]=IN;else{const I={l:0,r:0,u:0,d:0,buf:0,hold:0,ht:0};hum[i]=I;if(host)NT.rin[p]={I,pc:null,i}}});
 show(null);
 Game.start({mode:'online',net:NETAPI,puppet:!host,me:NT.slot,hum,names:go.nm,team0:go.t0,team1:go.t1,school0:go.s0,school1:go.s1,skill0:go.k0,skill1:go.k1,target:go.tg,onEnd:()=>{if(NT.host)endNet('fin')}});
 NT.lastFrame=performance.now()}
function endNet(why){if(!G.net)return;const my=NT.slot<0?-1:NT.slot/3|0,sc=G.score.slice(),w0=sc[0]>sc[1];
 NT.result=why==='fin'?(my<0?(w0?G.school[0]:G.school[1])+' win':(my?!w0:w0)?'VICTORY':'DEFEAT')+'  '+sc[0]+' – '+sc[1]:why;
 const wasHost=NT.host;G.net=null;G.puppet=false;NT.host=false;NT.go=null;Game.stop();
 if(wasHost&&NT.party)NT.party.presence({go:null,s:null}).catch(()=>{});
 lobbyPresence();Game.demo();NT.view=NT.party?'party':'lobby';show('mp');mpRender()}

/* ---- host: read everyone's buttons, send the state ---- */
function hostInputs(ps){for(const p of ps){const R=NT.rin[p.peer],v=p.presence.in;if(!R)continue;
 if(v&&typeof v==='object'){const I=R.I;I.l=v.l?1:0;I.r=v.r?1:0;I.u=v.u?1:0;I.d=v.d?1:0;I.hold=v.h?1:0;
  if(R.pc!==null&&+v.pc>R.pc)I.buf=.16;R.pc=+v.pc||0;
  // each player moves themselves on their own screen; the host takes where they say they are
  const P=G.players[R.i];if(P&&isFinite(v.x)&&(v.x!==R.lx||v.vx!==R.lvx)){R.lx=v.x;R.lvx=v.vx;
   if(!P.dive&&!P.serveStage&&(G.state==='rally'||G.state==='serve')){P.x=clamp(+v.x,sideLo(P.team),sideHi(P.team));if(isFinite(v.vx))P.vx=clamp(+v.vx,-P.spd*1.3,P.spd*1.3)}}}
 if(p.presence.pg)NT.pe[R.i]=+p.presence.pg||0}
 // someone left mid-match: a bot takes their spot
 for(const k in NT.rin)if(!ps.some(p=>p.peer===k)){const R=NT.rin[k],P=G.players[R.i];if(P){P.in=null;P.human=false;P.pn=''}G.ins=G.players.filter(q=>q.in).map(q=>q.in);delete NT.rin[k]}}
function hostTick(rdt){NT.lastFrame=performance.now();
 for(const e of NETEV.splice(0))NT.evs.push({q:++NT.seq,t:G.time,e});
 while(NT.evs.length&&(NT.evs.length>14||G.time-NT.evs[0].t>1.5))NT.evs.shift();
 NT.acc+=rdt;if(NT.acc<.05||!NT.party)return;NT.acc=0;
 let s=snap();while(JSON.stringify(s).length>3600&&NT.evs.length){NT.evs.shift();s=snap()}
 NT.party.presence({s}).catch(()=>{})}
function snap(){const B=ball;
 return{t:r2(G.time),
  g:[['intro','serve','rally','point','over'].indexOf(G.state),G.score[0],G.score[1],G.serving,r2(G.timer),G.rally,G.over?1:0,TM[0].next?TM[0].next.id:-1,TM[1].next?TM[1].next.id:-1],
  p:G.players.map(P=>{const s=P.swing,d=P.dive;return[r0(P.x),r0(P.h),r0(P.vx),r0(P.vh),P.face,
   s?[s.pose,r2(s.t),s.done?1:0,s.hitAt==null?-1:r2(s.hitAt),r2(s.dur)]:0,d?[r2(d.t),d.dir,r2(d.end||.72),d.hit?1:0]:0,
   (P.armed?1:0)|(P.recov?2:0)|(P.ready?4:0)|(P.human?8:0),P.serveStage||'',r2(P.tossT),P.mood||'',r2(P.land),r0(P.hype),r2(P.bonk),r2(P.zap),r2(P.fear)]}),
  b:[r0(B.x),r0(B.y),r0(B.vx),r0(B.vy),r2(B.gs),r2(B.rot),(B.live?1:0)|(B.dead?2:0)|(B.serving?4:0)|(B.unstop?8:0)|(B.sig?16:0)|(B.cross?32:0),
   B.lastTeam,B.lastHitter?B.lastHitter.id:-1,B.touches,r2(B.hot),B.evt,B.kind||'',B.fx&&B.fx.mine?B.fx.mine.id:-1,r2(B.sq),r2(B.blkNote),r2(B.vr)],
  e:NT.evs.map(x=>[x.q,x.e]),pe:NT.pe}}

/* ---- clients: draw the host's state a little ahead (by the round trip) so your SPACE lands on time there ---- */
function applySnap(s){const now=performance.now();NT.lastSnap=now;
 const pe=Array.isArray(s.pe)?+s.pe[NT.slot]||0:0;if(pe&&pe!==NT.pgSeen){NT.pgSeen=pe;const r=(now-pe)/1000;if(r>0&&r<2)NT.rtt+=(r-NT.rtt)*.3}
 const L=clamp(NT.rtt,0,.3),g=s.g||[];
 const st=['intro','serve','rally','point','over'][g[0]]||G.state;
 if(st==='over'&&G.state!=='over')NT.overT=3.4;
 G.state=st;G.score=[+g[1]||0,+g[2]||0];G.serving=g[3]?1:0;G.timer=+g[4]||0;G.rally=+g[5]||0;G.over=!!g[6];
 TM[0].next=G.players[g[7]]||null;TM[1].next=G.players[g[8]]||null;
 (s.p||[]).forEach((a,i)=>{const P=G.players[i];if(!P||!Array.isArray(a))return;
  const tx=a[0]+a[2]*L,air=a[1]>0||a[3]>0,th=air?Math.max(0,a[1]+a[3]*L-.5*GP*L*L):0;
  if(P.own){P.vh=+a[3]||0;if(!(IN.r-IN.l))P.face=a[4]<0?-1:1;P.eh=th-P.h;if(Math.abs(P.eh)>200){P.h=th;P.eh=0}}else{
  P.vx=+a[2]||0;P.vh=+a[3]||0;P.face=a[4]<0?-1:1;
  P.ex=tx-P.x;P.eh=th-P.h;if(Math.abs(P.ex)>260){P.x=tx;P.ex=0}if(Math.abs(P.eh)>200){P.h=th;P.eh=0}}
  const sw=a[5];if(Array.isArray(sw)){const t=+sw[1]+L;if(!P.swing||P.swing.pose!==sw[0]||Math.abs(P.swing.t-t)>.08)P.swing={pose:String(sw[0]),t,done:!!sw[2],hitAt:sw[3]<0?null:+sw[3],dur:+sw[4]||.3,best:0,pd:0,R:70};else P.swing.done=!!sw[2]}else P.swing=null;
  const dv=a[6];if(Array.isArray(dv)){const t=+dv[0]+L;if(!P.dive||Math.abs(P.dive.t-t)>.08)P.dive={t,dir:dv[1]<0?-1:1,end:+dv[2]||.72,hit:!!dv[3]};else P.dive.hit=!!dv[3]}else P.dive=null;
  const f=+a[7]||0;P.armed=!!(f&1);P.recov=!!(f&2);P.ready=!!(f&4);if(i!==NT.slot)P.human=!!(f&8);
  P.serveStage=String(a[8]||'');P.tossT=+a[9]||0;P.mood=String(a[10]||'');P.land=+a[11]||0;P.hype=+a[12]||0;P.bonk=+a[13]||0;P.zap=+a[14]||0;P.fear=+a[15]||0});
 const b=s.b,B=ball;if(Array.isArray(b)){const f=+b[6]||0,live=!!(f&1);
  const tx=b[0]+b[2]*L,ty=b[1]+b[3]*L+.5*GB*(+b[4]||0)*L*L;
  B.vx=+b[2]||0;B.vy=+b[3]||0;B.gs=+b[4]||0;B.rot=+b[5]||0;B.vr=+b[17]||0;
  B.ex=tx-B.x;B.ey=Math.min(FLOOR-BR,ty)-B.y;if(Math.hypot(B.ex,B.ey)>420||!live&&!B.live){B.x=tx;B.y=Math.min(FLOOR-BR,ty);B.ex=B.ey=0}
  if(!live)B.trail.length=0;
  B.live=live;B.dead=!!(f&2);B.serving=!!(f&4);B.unstop=!!(f&8);B.sig=!!(f&16);B.cross=!!(f&32);
  B.lastTeam=+b[7];B.lastHitter=G.players[b[8]]||null;B.touches=+b[9]||0;B.hot=+b[10]||0;B.evt=+b[11]||0;B.kind=String(b[12]||'');
  const Q=G.players[b[13]];B.fx=Q?{col:Q.ch.fx,ri:RAR[Q.ch.rar].i,rar:Q.ch.rar,mine:Q}:null;B.sq=+b[14]||0;B.blkNote=+b[15]||0}
 // replay what happened since the last update: banners, hits, cut-ins, landings, points
 for(const x of s.e||[]){if(!Array.isArray(x)||!(x[0]>NT.pc0))continue;NT.pc0=x[0];try{replay(x[1])}catch(e){}}}
NT.pc0=0;
function replay(e){if(!e||typeof e!=='object')return;const P=G.players[e.p];
 if(e.k==='ban'&&e.o&&typeof e.o==='object'){const o=e.o;if(o.to!=null&&o.to!==NT.slot)return;
  banner({text:String(o.text||''),sub:o.sub?String(o.sub):'',col:String(o.col||'#fff'),dur:clamp(+o.dur||1,.2,4),big:!!o.big,small:!!o.small,ult:!!o.ult,portrait:typeof o.portrait==='string'&&CH[o.portrait]?o.portrait:undefined,nf:true})}
 else if(e.k==='hit'&&P)hitFX(P,+e.q||0,String(e.kind||''),+e.x||0,+e.y||0);
 else if(e.k==='sw'&&P&&P===G.ctrl)swingFX(P,{x:+e.x,y:+e.y,r:+e.r},!!e.g,!!e.m);
 else if(e.k==='land'){impact(+e.x||0,ball);if(e.kl){NOBAN=1;try{killLand(+e.x||0)}finally{NOBAN=0}}}
 else if(e.k==='mp'&&P)pasShow(String(e.m),P,e);
 else if(e.k==='skull'){if(P)P.crack=1.6;skullFX(+e.x||0,+e.y||0,P?P.ch.fx:'#ff4060',!!e.big)}
 else if(e.k==='pt')ptFX(e.w?1:0);
 else if(e.k==='end')endFX();
 else if(e.k==='cine'){NOBAN=1;try{
  if(e.c==='spike'&&P)cineSpike(P,RAR[P.ch.rar]);else if(e.c==='ult'&&P)cineUlt(P,RAR[P.ch.rar],String(e.n||''));else if(e.c==='sig'&&P)cineSig(P,RAR[P.ch.rar],String(e.n||''));
  else if(e.c==='dig'&&P)cineDig(P,RAR[P.ch.rar]);else if(e.c==='block'&&P)cineBlock(P,RAR[P.ch.rar]);else if(e.c==='kc')killCam();else if(e.c==='kx')killCancel()}finally{NOBAN=0}}}
// your own player runs on your screen with no wait: arrows, and the auto-run to the ball the host would do for you
function ownMove(P,dt){const I=IN,B=ball,grounded=P.h<=0&&P.vh<=0;
 if(P.dive||P.serveStage||!(G.state==='rally'||G.state==='serve'))return false;
 let mx=I.r-I.l;
 if(!mx&&B.live&&!B.dead&&!B.serving){const p=P.A.p,easy=P.role!=='WS';if(p&&P.h<=6&&(easy?p.kind!=='idle':I.hold&&p.kind==='play'))mx=Math.abs(p.gx-P.x)<6?0:clamp((p.gx-P.x)/48,-1,1)}
 const sp=P.spd*(P.swing&&grounded?.5:1)*(grounded?1:.8),a=grounded?5200:(P.armed?2200:900);
 P.vx+=clamp(mx*sp-P.vx,-a*dt,a*dt);if(mx)P.face=mx>0?1:-1;
 P.x=clamp(P.x+P.vx*dt,sideLo(P.team),sideHi(P.team));if(P.x<=sideLo(P.team)+.5||P.x>=sideHi(P.team)-.5)P.vx*=.3;
 P.ex=0;return true}
function clientFrame(rdt){const now=performance.now();
 G.time+=rdt;G.t+=rdt;if(CAM.hs>0)CAM.hs-=rdt;if(D.slowT>0){D.slowT-=rdt;if(D.slowT<=0)D.slowV=1}CAM.slow=1;
 NET.v+=(-NET.sway*180-NET.v*6)*rdt;NET.sway+=NET.v*rdt;
 for(let i=DECAL.length-1;i>=0;i--){DECAL[i].t+=rdt;if(DECAL[i].t>6)DECAL.splice(i,1)}
 const k=1-Math.exp(-14*rdt);
 for(const P of G.players){
  P.own=P===G.ctrl&&ownMove(P,rdt);
  if(!P.own){if(!P.dive&&!P.serveStage&&G.state!=='point'&&G.state!=='intro')P.x+=P.vx*rdt;else if(P.dive)P.x+=P.vx*rdt;
   if(P.ex){const c=P.ex*k;P.x+=c;P.ex-=c}P.x=clamp(P.x,sideLo(P.team),sideHi(P.team))}
  if(P.h>0||P.vh>0){P.vh-=GP*rdt;P.h+=P.vh*rdt;if(P.h<=0){P.h=0;P.vh=0}}
  if(P.eh){const c=P.eh*k;P.h=Math.max(0,P.h+c);P.eh-=c}
  if(P.swing)P.swing.t+=rdt;if(P.dive)P.dive.t+=rdt;if(P.land>0)P.land-=rdt;
  for(const f of ['bonk','zap','fear','crack'])if(P[f]>0)P[f]-=rdt;
  updateVisual(P,rdt,G.time)}
 const B=ball;
 if(B.live||B.dead){B.vy+=GB*B.gs*rdt;B.x+=B.vx*rdt;B.y+=B.vy*rdt;if(B.ex||B.ey){const cx=B.ex*k,cy=B.ey*k;B.x+=cx;B.y+=cy;B.ex-=cx;B.ey-=cy}
  if(B.y>FLOOR-BR){B.y=FLOOR-BR;if(B.vy>0)B.vy*=B.live?0:-.5}B.rot+=(B.vr||0)*rdt}
 else if(B.ex||B.ey){const cx=B.ex*k,cy=B.ey*k;B.x+=cx;B.y+=cy;B.ex-=cx;B.ey-=cy}
 if(B.live&&(B.hot||B.sig||sp2(B)>800)){B.trail.unshift({x:B.x,y:B.y});if(B.trail.length>16)B.trail.pop()}else if(B.trail.length)B.trail.pop();
 if(B.live&&B.fx)trailFX(B,rdt);if(B.sq>0)B.sq-=rdt;if(B.blkNote>0)B.blkNote-=rdt;
 if(G.ctrl&&B.live&&G.state==='rally')aiPlan(G.ctrl,1);else if(G.ctrl)G.ctrl.A.p=null;
 FX.update(rdt);
 // send my buttons (only when they change) and a ping now and then
 if(NT.party&&NT.slot>=0){const P=G.ctrl,v={l:IN.l,r:IN.r,u:IN.u,d:IN.d,h:IN.hold,pc:NT.pc};if(P&&P.own){v.x=Math.round(P.x);v.vx=Math.round(P.vx)}
  const ks=JSON.stringify(v),hit=NT.pc!==NT.pcSent;NT.inT-=rdt;
  if(hit||ks!==NT.inSent&&NT.inT<=0||now-NT.pgSent>500){const pa={in:v};NT.inSent=ks;NT.pcSent=NT.pc;NT.inT=.025;if(now-NT.pgSent>500){NT.pgSent=now;pa.pg=Math.round(now)}NT.party.presence(pa,hit).catch(()=>{})}}
 if(NT.overT>0){NT.overT-=rdt;if(NT.overT<=0)endNet('fin')}
 else if(now-NT.lastSnap>8000)endNet('Lost connection to the host')}
// count presses (keyboard + touch both go through press())
{const _press=press;press=function(){_press();NT.pc++}}
// the host keeps the match running even if its tab is in the background
{let lastBg=0;const bg=()=>{const now=performance.now();if(!G.on||!G.net||G.puppet||now-NT.lastFrame<150){lastBg=now;return}
  const dt=Math.min(.1,(now-(lastBg||now))/1000);lastBg=now;if(dt<=0)return;const n=Math.ceil(dt/.0084);for(let i=0;i<n;i++)simStep(dt/n);hostTick(dt);NT.lastFrame=now-200};
 try{const w=new Worker(URL.createObjectURL(new Blob(['setInterval(()=>postMessage(0),33)'],{type:'text/javascript'})));w.onmessage=bg}catch(e){setInterval(bg,33)}}

/* ---- screens ---- */
const MODE_NAME={vs:'VS — friends on both sides',coop:'CO-OP — together vs bots'};
async function openMP(){AU.resume();AU.click();show('mp');
 if(NT.party){NT.view='party';mpRender();return}
 NT.view='connecting';mpRender();const r=await netConnect();NT.view=r?'lobby':'off';mpRender()}
function mpRender(){const el=scr('mpBody');if(!el)return;const v=NT.view;scr('mpMsg').textContent=NT.msg||'';
 if(v==='connecting'){el.innerHTML='<div class="mpnote">Connecting…</div>';return}
 if(v==='off'){el.innerHTML='<div class="mpnote">Online play couldn\'t start in this browser. Try an up-to-date Chrome, Safari or Edge.</div>';return}
 if(v==='lobby'){const ps=openParties(),here=NT.lobby?NT.lobby.peers().length:1;
  el.innerHTML=`<div class="mprow"><label class="mpnm">Your name <input id="mpName" maxlength="14" value="${esc(NT.nm)}"></label><span class="stat">${NT.lobby&&NT.lobby.status&&!NT.lobby.status().relay?'Connecting…':here+' online'}</span></div>
  <button class="btn big" id="bQuick">⚡ Quick play</button>
  <div class="mprow"><button class="btn ghost sm" id="bCreate">＋ New party</button><input id="mpCode" maxlength="4" placeholder="CODE"><button class="btn ghost sm" id="bJoin">Join</button></div>
  <div class="mplist">${ps.length?ps.map(p=>`<div class="mpp"><b>${esc(p.c.toUpperCase())}</b><span>${esc(p.ld||'Someone')}'s party · ${p.n}/6 · ${p.m==='coop'?'Co-op':'VS'}${p.ing?' · in a match':''}</span><button class="btn xs" data-c="${esc(p.c)}">Join</button></div>`).join(''):'<div class="mpnote sm">No open parties yet. Quick play makes one, and your friends can join it.</div>'}</div>`;
  const nm=scr('mpName');nm.onchange=nm.onblur=()=>{NT.nm=cleanNm(nm.value)||NT.nm;S.mpName=NT.nm;save();lobbyPresence()};
  scr('bQuick').onclick=quickPlay;scr('bCreate').onclick=()=>{AU.click();createParty(false)};
  scr('bJoin').onclick=()=>{const c=scr('mpCode').value.trim().toLowerCase();if(/^[a-z0-9]{4}$/.test(c)){AU.click();joinParty(c,false)}else{NT.msg='Codes are 4 letters';mpRender()}};
  el.querySelectorAll('[data-c]').forEach(b=>b.onclick=()=>{AU.click();joinParty(b.dataset.c,false)});
  el.querySelectorAll('input').forEach(i=>i.addEventListener('keydown',e=>{e.stopPropagation();if(e.key==='Enter'&&i.id==='mpCode')scr('bJoin').click()}));return}
 if(NT.seek){el.innerHTML=`<div class="mpnote">Looking for party <b>${esc(NT.code.toUpperCase())}</b>…</div><div class="mprow"><button class="btn ghost xs" id="bLeave">Cancel</button></div>`;
  scr('bLeave').onclick=()=>{AU.click();leaveParty()};return}
 // party
 const ps=partyPeers(),L=leaderPeer(ps),me=NT.lead,c=NT.cfg||defCfg(),nmOf=id=>{const p=ps.find(q=>q.peer===id);return p?cleanNm(p.presence.nm)||'Player':''};
 const slot=(t,i)=>{const id=c.sl[t*3+i],r=ROLES[i];return `<div class="mps${id===NT.me?' me':''}${me?' ed':''}" data-s="${t*3+i}" style="--rc:${ROLE_COL[r]}"><i>${r}</i><b>${id?esc(nmOf(id))+(id===NT.me?' (you)':''):'🤖 Bot'}</b></div>`};
 const seg=(k,opts,cur)=>`<div class="seg">${opts.map(([v,l])=>`<button class="${v===cur?'on':''}" data-k="${k}" data-v="${v}" ${me?'':'disabled'}>${l}</button>`).join('')}</div>`;
 el.innerHTML=`<div class="mprow"><span class="mpcode">PARTY <b>${esc(NT.code.toUpperCase())}</b></span><span class="stat">${ps.length}/6 here · leader: ${esc(L?cleanNm(L.presence.nm):'…')}${L&&L.isMe?' (you)':''}</span></div>
  ${NT.result?`<div class="mpres">${esc(NT.result)}</div>`:''}
  <div class="mprow">${seg('mode',[['vs','VS'],['coop','Co-op']],c.mode)}${seg('tg',[[7,'To 7'],[11,'To 11'],[15,'To 15']],c.tg)}${c.mode==='coop'?seg('df',[[0,'Easy bots'],[1,'Normal'],[2,'Hard']],c.df):''}</div>
  <div class="mpteams"><div class="mpt"><div class="cap">Team A</div>${[0,1,2].map(i=>slot(0,i)).join('')}</div><div class="mpvs">VS</div><div class="mpt"><div class="cap">Team B${c.mode==='coop'?' · bots':''}</div>${[0,1,2].map(i=>slot(1,i)).join('')}</div></div>
  <div class="mprow">${me?`<button class="btn ghost sm" id="bAuto"${c.auto?' disabled':''}>⟳ Auto teams</button><button class="btn big" id="bStart">▶ Start</button>`:`<span class="mpnote sm">${NT.go?'Match in progress…':'Waiting for the leader to start…'}</span>`}</div>
  <div class="mprow"><span class="stat">I want to play</span>${seg('pr',ROLES.map(r=>[r,ROLE_NAME[r]]),S.role||'WS').replace(/ disabled/g,'')}<button class="btn ghost xs" id="bLeave">Leave party</button></div>
  ${me?'<div class="mpnote sm">You lead: click a slot to put someone there (or a bot). Your page runs the match.</div>':''}`;
 el.querySelectorAll('.mps.ed').forEach(d=>d.onclick=()=>cycleSlot(+d.dataset.s));
 el.querySelectorAll('.seg button').forEach(b=>b.onclick=()=>{const k=b.dataset.k,v=b.dataset.v;AU.click();
  if(k==='pr'){S.role=v;save();partyPresence();mpRender();return}
  leaderSetCfg(c=>{if(k==='mode'){c.mode=v;c.auto=1}else c[k]=+v})});
 if(me){scr('bAuto').onclick=()=>{AU.click();leaderSetCfg(c=>{c.auto=1})};scr('bStart').onclick=hostStart}
 scr('bLeave').onclick=()=>{AU.click();leaveParty()};}
scr('bMP').onclick=openMP;
scr('bMPBack').onclick=()=>{AU.click();if(NT.party&&!confirm('Leave the party?'))return;if(NT.party)leaveParty(true);NT.view='lobby';show('title');refreshTitle()};
// quitting an online match takes you back to the party, not the menu
scr('bQuit').onclick=()=>{Game.pause(false);if(G.net){if(NT.host)endNet('You ended the match');else{endNet('You left the match')}}else toTitle()};
