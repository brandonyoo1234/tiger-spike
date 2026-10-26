'use strict';
/* ===== constants ===== */
// W x H is the screen; the world (court) is WW wide: a long court like The Spike, so spikes can go deep or short
const W=1280,H=720,WW=2400,FLOOR=650,NETX=1200,NETH=240,NETTOP=FLOOR-NETH,GB=1500,GP=2600,BR=20,LINE_L=200,LINE_R=2200;
const STRIKE=0.12,SWING=0.36;
const clamp=(v,a,b)=>v<a?a:v>b?b:v,lerp=(a,b,t)=>a+(b-a)*t,rnd=(a,b)=>a+Math.random()*(b-a),rndi=(a,b)=>Math.floor(rnd(a,b+1));
const pick=a=>a[Math.floor(Math.random()*a.length)],sgn=v=>v<0?-1:1,ease=t=>t<.5?2*t*t:1-Math.pow(-2*t+2,2)/2,easeOut=t=>1-Math.pow(1-t,3);
const gauss=()=>{let u=0,v=0;while(!u)u=Math.random();while(!v)v=Math.random();return Math.sqrt(-2*Math.log(u))*Math.cos(2*Math.PI*v)};
const $=s=>document.querySelector(s),$$=s=>[...document.querySelectorAll(s)];
function hsl(h,s,l,a=1){return `hsla(${h%360},${s}%,${l}%,${a})`}

/* ===== rarity table ===== */
const RAR={
 common:{name:'COMMON',col:'#c4cddb',w:54.3,dupe:30,i:0},
 rare:{name:'RARE',col:'#4aa8ff',w:28,dupe:60,i:1},
 epic:{name:'EPIC',col:'#b06bff',w:12,dupe:100,i:2},
 legendary:{name:'LEGENDARY',col:'#ffb02e',w:4.5,dupe:180,i:3},
 mythic:{name:'MYTHIC',col:'#ff4d8d',w:1.2,dupe:320,i:4}
};

/* ===== save ===== */
const SAVE_KEY='sis_vb_v4';
const DEF={coins:180,unlocked:['riley','sam','luna','ben','zoe'],sel:'riley',level:1,wins:0,losses:0,streak:0,bestStreak:0,pityR:0,pityE:0,perfects:0,aces:0,bestRally:0,points:0,plays:0,mute:false,assist:true,crates:0,role:'WS',team:null,free:1,inv:null,offers:null,claim:null,claimNew:null};
let S=(()=>{try{return Object.assign({},DEF,JSON.parse(localStorage.getItem(SAVE_KEY)||'{}'))}catch(e){return Object.assign({},DEF)}})();
function save(){try{localStorage.setItem(SAVE_KEY,JSON.stringify(S))}catch(e){}}

/* ===== audio (all synthesized) ===== */
const AU={ctx:null,master:null,mus:null,sfxG:null,crowdG:null,crowdLvl:0,tempo:112,step:0,next:0,inten:0,timer:null,
init(){if(this.ctx)return;const C=window.AudioContext||window.webkitAudioContext;if(!C)return;
 try{this.ctx=new C()}catch(e){return}
 const c=this.ctx;this.master=c.createGain();this.master.gain.value=S.mute?0:.85;
 const comp=c.createDynamicsCompressor();this.master.connect(comp);comp.connect(c.destination);
 this.sfxG=c.createGain();this.sfxG.gain.value=.9;this.sfxG.connect(this.master);
 this.mus=c.createGain();this.mus.gain.value=.5;this.mus.connect(this.master);
 // crowd noise
 const len=c.sampleRate*2,buf=c.createBuffer(1,len,c.sampleRate),d=buf.getChannelData(0);let b=0;
 for(let i=0;i<len;i++){b=.97*b+.03*(Math.random()*2-1);d[i]=b*9}
 const src=c.createBufferSource();src.buffer=buf;src.loop=true;
 const bp=c.createBiquadFilter();bp.type='bandpass';bp.frequency.value=700;bp.Q.value=.5;
 this.crowdG=c.createGain();this.crowdG.gain.value=.0;src.connect(bp);bp.connect(this.crowdG);this.crowdG.connect(this.master);src.start();
 this.nbuf=c.createBuffer(1,c.sampleRate,c.sampleRate);const nd=this.nbuf.getChannelData(0);for(let i=0;i<nd.length;i++)nd[i]=Math.random()*2-1;
 this.next=c.currentTime+.1;this.timer=setInterval(()=>this.sched(),30);
},
resume(){this.init();if(this.ctx&&this.ctx.state!=='running')this.ctx.resume()},
setMute(m){S.mute=m;save();if(this.master)this.master.gain.setTargetAtTime(m?0:.85,this.ctx.currentTime,.05)},
crowd(l,t=.4){if(!this.ctx)return;this.crowdLvl=l;this.crowdG.gain.setTargetAtTime(l*.11,this.ctx.currentTime,t)},
tone(f,d=.15,type='sine',v=.2,slide=0,delay=0,out){if(!this.ctx)return;const c=this.ctx,t=c.currentTime+delay,o=c.createOscillator(),g=c.createGain();
 o.type=type;o.frequency.setValueAtTime(f,t);if(slide)o.frequency.exponentialRampToValueAtTime(Math.max(20,f+slide),t+d);
 g.gain.setValueAtTime(0,t);g.gain.linearRampToValueAtTime(v,t+.008);g.gain.exponentialRampToValueAtTime(.0001,t+d);
 o.connect(g);g.connect(out||this.sfxG);o.start(t);o.stop(t+d+.05)},
noise(d=.15,f=2000,v=.2,type='bandpass',delay=0,q=1,sweep=0,out){if(!this.ctx)return;const c=this.ctx,t=c.currentTime+delay,s=c.createBufferSource(),fl=c.createBiquadFilter(),g=c.createGain();
 s.buffer=this.nbuf;fl.type=type;fl.frequency.setValueAtTime(f,t);if(sweep)fl.frequency.exponentialRampToValueAtTime(Math.max(40,f+sweep),t+d);fl.Q.value=q;
 g.gain.setValueAtTime(v,t);g.gain.exponentialRampToValueAtTime(.0001,t+d);s.connect(fl);fl.connect(g);g.connect(out||this.sfxG);s.start(t);s.stop(t+d+.05)},
/* sfx */
bump(q){this.tone(170-q*10,.14,'sine',.45,-90);this.noise(.07,900,.25,'lowpass')},
set(q){this.tone(520,.08,'triangle',.22,160);this.noise(.05,2400,.12,'highpass')},
spike(p=1,q=0){this.noise(.1,3000,.4,'highpass');this.tone(120,.2,'sine',.6,-80);this.tone(300+p*40,.09,'square',.12,-200);if(q===0)this.noise(.35,600,.25,'bandpass',0,1,2400)},
whoosh(){this.noise(.28,500,.18,'bandpass',0,1.5,3000)},
net(){this.noise(.18,500,.3,'lowpass');this.tone(90,.15,'sine',.3,-30)},
bounce(v=1){this.tone(110,.18,'sine',.5*v,-60);this.noise(.08,600,.2*v,'lowpass')},
whistle(){const c=this.ctx;if(!c)return;for(let i=0;i<2;i++)this.tone(i?2600:2750,.5,'sine',.07,0,i*.01);this.tone(2900,.12,'sine',.09,0,.34)},
perfect(){[660,880,1320].forEach((f,i)=>this.tone(f,.28,'triangle',.16,0,i*.07));this.noise(.25,6000,.12,'highpass',.1)},
great(){[660,990].forEach((f,i)=>this.tone(f,.2,'triangle',.12,0,i*.06))},
point(own){(own?[523,659,784,1047]:[392,330,262]).forEach((f,i)=>this.tone(f,.28,own?'triangle':'sawtooth',own?.15:.08,0,i*.09))},
ult(r=0){this.tone(55,1.2,'sawtooth',.4,-20);this.noise(.9,200,.4,'lowpass',0,1,3000);[0,1,2,3].slice(0,2+r).forEach((k,i)=>this.tone(220*Math.pow(1.5,k),.8,'sawtooth',.1,0,.25+i*.1))},
boom(){this.tone(60,.6,'sine',.7,-30);this.noise(.5,300,.5,'lowpass')},
click(){this.tone(900,.05,'square',.07,200)},
tick(){this.tone(1500,.03,'square',.05)},
coin(i=0){this.tone(1200+i*80,.12,'square',.07,400);this.tone(1800+i*80,.2,'square',.06,0,.06)},
rumble(d=1){this.noise(d,90,.5,'lowpass',0,1,200);this.tone(45,d,'sawtooth',.2,10)},
reveal(r){const n=2+r*1.5;for(let i=0;i<n;i++)this.tone(330*Math.pow(1.26,i*(r>2?1:1.4)),.7,'triangle',.12,0,i*.08);if(r>=3)this.noise(.9,4000,.2,'highpass',.1);this.boom()},
dive(){this.noise(.3,900,.18,'bandpass',0,.8,-500)},
/* music: tiny sequencer */
sched(){const c=this.ctx;if(!c||S.mute)return;const spb=60/this.tempo/4;
 while(this.next<c.currentTime+.12){this.play(this.step,this.next);this.next+=spb;this.step++}},
play(s,t){const c=this.ctx,i=this.inten;if(i<=0)return;const st=s%16,bar=Math.floor(s/16)%4;
 const nt=(f,d,ty,v,dl=0)=>{const o=c.createOscillator(),g=c.createGain();o.type=ty;o.frequency.value=f;g.gain.setValueAtTime(0,t+dl);g.gain.linearRampToValueAtTime(v,t+dl+.01);g.gain.exponentialRampToValueAtTime(.0001,t+dl+d);o.connect(g);g.connect(this.mus);o.start(t+dl);o.stop(t+dl+d+.05)};
 if(st%4===0){const o=c.createOscillator(),g=c.createGain();o.frequency.setValueAtTime(130,t);o.frequency.exponentialRampToValueAtTime(42,t+.12);g.gain.setValueAtTime(.5*(i>1?1:.7),t);g.gain.exponentialRampToValueAtTime(.001,t+.2);o.connect(g);g.connect(this.mus);o.start(t);o.stop(t+.22)}
 if(i>=1&&(st===4||st===12)){const s2=c.createBufferSource(),f=c.createBiquadFilter(),g=c.createGain();s2.buffer=this.nbuf;f.type='highpass';f.frequency.value=1200;g.gain.setValueAtTime(.22,t);g.gain.exponentialRampToValueAtTime(.001,t+.12);s2.connect(f);f.connect(g);g.connect(this.mus);s2.start(t);s2.stop(t+.15)}
 if(i>=1&&st%2===0){const s2=c.createBufferSource(),f=c.createBiquadFilter(),g=c.createGain();s2.buffer=this.nbuf;f.type='highpass';f.frequency.value=7000;g.gain.setValueAtTime(st%4===2?.1:.05,t);g.gain.exponentialRampToValueAtTime(.001,t+.04);s2.connect(f);f.connect(g);g.connect(this.mus);s2.start(t);s2.stop(t+.05)}
 const roots=[55,55,43.65,49];const r=roots[bar];
 if(st%8===0||st%8===3||st%8===6)nt(r*(st%8===6?1.5:1),.22,'sawtooth',.13);
 if(i>=2&&st%2===1){const sc=[1,1.19,1.5,1.78,2,2.38];nt(r*8*sc[(st*3+bar*2)%6],.14,'square',.035)}
 if(i<1.5&&st===0)nt(r*4,1.4,'sine',.05)}
};
