'use strict';
/* ===== glow sprite cache ===== */
const _gs={};
function glowSpr(col){let s=_gs[col];if(s)return s;s=document.createElement('canvas');s.width=s.height=64;const g=s.getContext('2d'),r=g.createRadialGradient(32,32,0,32,32,32);
 r.addColorStop(0,col);r.addColorStop(.35,col);r.addColorStop(1,'rgba(0,0,0,0)');g.fillStyle=r;g.globalAlpha=1;g.fillRect(0,0,64,64);
 // soften core
 const g2=g.createRadialGradient(32,32,0,32,32,32);g2.addColorStop(0,'rgba(255,255,255,.55)');g2.addColorStop(.25,'rgba(255,255,255,0)');g.fillStyle=g2;g.fillRect(0,0,64,64);
 _gs[col]=s;return s}
function glow(g,x,y,r,col,a=1){g.globalAlpha=a;g.drawImage(glowSpr(col),x-r,y-r,r*2,r*2)}
function star4(g,x,y,r,rot){g.beginPath();for(let i=0;i<8;i++){const a=rot+i*Math.PI/4,rr=i%2?r*.28:r;g.lineTo(x+Math.cos(a)*rr,y+Math.sin(a)*rr)}g.closePath()}

const FX={list:[],pop:[],bolts:[],
add(o){const p=Object.assign({x:0,y:0,vx:0,vy:0,ay:0,drag:0,life:1,s:6,s1:0,col:'#fff',kind:'glow',rot:0,vr:0,add:true,a:1,fade:1},o);p.max=p.life;if(this.list.length>1600)this.list.splice(0,200);this.list.push(p);return p},
burst(x,y,n,o={}){for(let i=0;i<n;i++){const a=o.ang!=null?o.ang+rnd(-(o.spread||Math.PI),(o.spread||Math.PI)):rnd(0,Math.PI*2),sp=rnd(o.v0||80,o.v1||400);
 this.add({x,y,vx:Math.cos(a)*sp,vy:Math.sin(a)*sp,ay:o.ay||0,drag:o.drag!=null?o.drag:2.2,life:rnd(o.l0||.3,o.l1||.8),s:rnd(o.s0||4,o.s1||10),s1:o.send||0,col:o.col||'#fff',kind:o.kind||'glow',add:o.add!==false,rot:rnd(0,6.28),vr:rnd(-8,8)})}},
ring(x,y,r0,r1,col,life=.5,w=6){this.add({x,y,kind:'ring',s:r0,s1:r1,life,col,w,add:true})},
text(x,y,text,col,size=44,life=1,vy=-60){this.pop.push({x,y,text,col,size,life,max:life,vy})},
bolt(x1,y1,x2,y2,col,life=.2,w=3,jag=22){const pts=[[x1,y1]],n=Math.max(3,Math.floor(Math.hypot(x2-x1,y2-y1)/28));for(let i=1;i<n;i++){const t=i/n;pts.push([lerp(x1,x2,t)+rnd(-jag,jag),lerp(y1,y2,t)+rnd(-jag,jag)])}pts.push([x2,y2]);this.bolts.push({pts,col,life,max:life,w})},
clear(){this.list.length=0;this.pop.length=0;this.bolts.length=0},
update(dt){const L=this.list;for(let i=L.length-1;i>=0;i--){const p=L[i];p.life-=dt;if(p.life<=0){L[i]=L[L.length-1];L.pop();continue}
 if(p.drag){const d=Math.exp(-p.drag*dt);p.vx*=d;p.vy*=d}p.vy+=p.ay*dt;p.x+=p.vx*dt;p.y+=p.vy*dt;p.rot+=p.vr*dt}
 for(let i=this.pop.length-1;i>=0;i--){const p=this.pop[i];p.life-=dt;p.y+=p.vy*dt;p.vy*=Math.exp(-3*dt);if(p.life<=0)this.pop.splice(i,1)}
 for(let i=this.bolts.length-1;i>=0;i--){const b=this.bolts[i];b.life-=dt;if(b.life<=0)this.bolts.splice(i,1)}},
draw(g){g.save();let add=null;
 for(const p of this.list){const t=1-p.life/p.max,k=p.life/p.max;const want=p.add?'lighter':'source-over';if(want!==add){g.globalCompositeOperation=want;add=want}
  const s=lerp(p.s,p.s1,t),a=p.a*(p.fade?Math.min(1,k*2.2):1);
  switch(p.kind){
   case 'glow':glow(g,p.x,p.y,s*1.8,p.col,a);break;
   case 'dot':g.globalAlpha=a;g.fillStyle=p.col;g.beginPath();g.arc(p.x,p.y,Math.max(.5,s),0,6.3);g.fill();break;
   case 'star':g.globalAlpha=a;g.fillStyle=p.col;star4(g,p.x,p.y,s,p.rot);g.fill();break;
   case 'shard':g.globalAlpha=a;g.fillStyle=p.col;g.save();g.translate(p.x,p.y);g.rotate(p.rot);g.beginPath();g.moveTo(s,0);g.lineTo(-s*.5,s*.35);g.lineTo(-s*.5,-s*.35);g.closePath();g.fill();g.restore();break;
   case 'ring':g.globalAlpha=a;g.strokeStyle=p.col;g.lineWidth=p.w*k;g.beginPath();g.arc(p.x,p.y,Math.max(1,s),0,6.3);g.stroke();break;
   case 'confetti':g.globalAlpha=Math.min(1,k*3);g.fillStyle=p.col;g.save();g.translate(p.x,p.y);g.rotate(p.rot);g.scale(1,Math.abs(Math.sin(p.rot*1.7+p.x*.02)));g.fillRect(-s,-s*.5,s*2,s);g.restore();break;
   case 'streak':{g.globalAlpha=a;g.strokeStyle=p.col;g.lineWidth=s;g.lineCap='round';g.beginPath();g.moveTo(p.x,p.y);g.lineTo(p.x-p.vx*.04,p.y-p.vy*.04);g.stroke();break}
  }}
 g.globalCompositeOperation='lighter';g.lineJoin='round';g.lineCap='round';
 for(const b of this.bolts){const k=b.life/b.max;g.globalAlpha=k;g.strokeStyle=b.col;g.lineWidth=b.w*3;g.beginPath();b.pts.forEach((q,i)=>i?g.lineTo(q[0],q[1]):g.moveTo(q[0],q[1]));g.globalAlpha=k*.35;g.stroke();g.globalAlpha=k;g.strokeStyle='#fff';g.lineWidth=b.w;g.stroke()}
 g.restore();g.globalAlpha=1},
drawPop(g){for(const p of this.pop){const t=1-p.life/p.max,sc=t<.14?lerp(.4,1.25,t/.14):t<.28?lerp(1.25,1,(t-.14)/.14):1,a=Math.min(1,p.life/p.max*3);g.save();g.translate(p.x,p.y);g.scale(sc,sc);g.globalAlpha=a;g.font=`800 ${p.size}px "Barlow Condensed","Arial Narrow",Impact,sans-serif`;g.textAlign='center';g.textBaseline='middle';g.lineJoin='round';g.lineWidth=p.size*.2;g.strokeStyle='rgba(8,6,16,.85)';g.strokeText(p.text,0,0);g.fillStyle=p.col;g.fillText(p.text,0,0);g.restore()}g.globalAlpha=1}
};
