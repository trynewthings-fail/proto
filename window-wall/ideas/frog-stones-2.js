/* PUZZLE · Frog Stones 2: a moonlit pond across all 12 panes. Visitors raise stepping stones with their bodies (depth cam) so the frogs can cross before dawn. (by Lukas) */
WW.register(W=>{
const {g,PC,LIME,PINK,CYAN,ORANGE,YELLOW,PPM,SW,SH,PW,PHB,PHT,SX0,SX1,PY_BOT,PY_TOP,paneX,paneY,colX,unitCX,wx,wy,text,hexA,clamp,smiley,people,tracked}=W;
const lerp=(a,b,u)=>a+(b-a)*u, rnd=(a,b)=>a+Math.random()*(b-a);
const mix=(a,b,u)=>`rgb(${a.map((v,k)=>Math.round(lerp(v,b[k],u))).join(',')})`;

/* Pond geometry in metres. The water line sits low in the bottom panes; stepping back lifts your stone into the top panes. */
const WATER=paneY(1)+0.42, REACH=1.6, RISE=1.25, ROUND=90, TARGET=4, NFROG=5, END=7, NEAR=6.5;
const HOME_X=paneX(0)+0.2, GOAL_X=paneX(5)+PW-0.2, PIER_R=paneX(3);
const SPANS=[0,1,2,3,4,5].map(c=>[paneX(c)+0.14,paneX(c)+PW-0.14]);     // stones stay out from behind the frames
const LOWMAX=paneY(1)+PHB-0.3-WATER, HIGHMIN=paneY(0)+0.05-WATER;       // ...and their tops skip the transom
const SKY=[[4,8,26],[14,30,58]], DAWN=[[48,34,84],[255,138,60]];
const REEDS=[[paneX(0)+0.04,0.32,0],[paneX(0)+0.1,0.2,1],[paneX(2)+PW-0.06,0.38,2],[paneX(2)+PW-0.13,0.22,3],[paneX(3)+0.05,0.34,4],[paneX(5)+PW-0.05,0.4,5],[paneX(5)+PW-0.12,0.24,6]];
let st={};

function snapX(x){
  x=clamp(x,paneX(0)+0.42,paneX(5)+PW-0.42);let b=x,d=1e9;
  for(const [a,c] of SPANS){const v=clamp(x,a,c);if(Math.abs(v-x)<d){d=Math.abs(v-x);b=v;}}
  return b;
}
function heightFor(z){
  const h=0.16+clamp((z-1.2)/4.5,0,1)*1.95;
  return h>LOWMAX&&h<HIGHMIN?(h-LOWMAX<HIGHMIN-h?LOWMAX:HIGHMIN):h;
}
const ripple=(x,col)=>st.rip.push({x,col,t:0});
const pop=(s,x,y,col,size)=>st.pops.push({s,x,y,col,size,t:0});
function burst(x,y,n,cols,spd,grav,life){
  for(let k=0;k<n;k++){const a=Math.random()*Math.PI*2,v=rnd(0.35,1)*spd;
    st.parts.push({x,y,vx:Math.cos(a)*v,vy:Math.sin(a)*v+(grav?spd*0.7:0),g:grav,t:0,life:rnd(0.6,1)*(life||1),col:cols[k%cols.length],r:rnd(0.02,0.04)});}
}
const newFrog=(id,delay)=>({id,mode:'spawn',t:-delay,up:0,on:'home',x:HOME_X,y:WATER-0.3,sz:rnd(0.92,1.1),sq:0,look:1,stuck:0,croak:0,blink:rnd(1,4),tongue:null,lastI:-1});
function newFly(low){
  const y=low?rnd(WATER+0.45,paneY(1)+PHB-0.2):rnd(paneY(0)+0.3,PY_TOP-0.3);
  return {x:rnd(SX0+0.3,SX1-0.3),y,y0:y,vx:rnd(-0.3,0.3),ph:Math.random()*7};
}

/* Every stone this frame: home pad, goal flower, one drifting pad per unit, one rock per person near the glass. */
function stones(dt){
  const S=[{k:'home',kind:'home',x:HOME_X,top:WATER+0.03},{k:'goal',kind:'goal',x:GOAL_X,top:WATER+0.03}];
  [[paneX(1)+0.1,paneX(2)+0.3],[paneX(3)+0.45,paneX(4)+0.45]].forEach(([a,b],u)=>
    S.push({k:'pad'+u,kind:'pad',x:lerp(a,b,0.5+0.5*Math.sin(st.clock*0.21+u*2.4)),top:WATER+0.03}));
  const tr=new Set(tracked().filter(p=>p.z<NEAR));
  for(const p of tr){
    const i=people.indexOf(p);let s=st.ps.get(p);
    if(!s){s={x:snapX(p.x),h:-0.1,lx:p.x,spd:0,wob:0};st.ps.set(p,s);ripple(s.x,PC[i%6]);burst(s.x,WATER,10,['#bfefff',CYAN],1.6,9);}
    const step=Math.abs(p.x-s.lx);s.lx=p.x;
    s.spd=lerp(s.spd,step>0.5?0:step/Math.max(dt,1e-3),Math.min(1,dt*4));   // running shakes the stone
    s.wob=s.spd>1.7?s.wob+dt:Math.max(0,s.wob-dt*2);
    Object.assign(s,{i,col:PC[i%6],sink:false});
    s.x=lerp(s.x,snapX(p.x),Math.min(1,dt*5));s.h=lerp(s.h,heightFor(p.z),Math.min(1,dt*3));
  }
  for(const [p,s] of st.ps)if(!tr.has(p)){if(!s.sink){s.sink=true;ripple(s.x,s.col);}s.h-=dt*1.4;if(s.h<-0.15)st.ps.delete(p);}
  for(const [p,s] of st.ps)S.push({k:p,kind:'rock',x:s.x,top:WATER+s.h,col:s.col,i:s.i,sink:s.sink,ref:s});
  st.S=S;st.map=new Map(S.map(s=>[s.k,s]));
}

/* Frog brain: hop forward when a stone is in reach, snack on fireflies, wait at the pier for help. */
function choose(s){
  let best=null,bs=-1e9;
  for(const o of st.S){
    if(o===s||o.kind==='home'||o.sink)continue;
    const dx=o.x-s.x,rise=o.top-s.top;
    if(Math.abs(dx)>REACH||rise>RISE||(Math.abs(dx)<0.2&&Math.abs(rise)<0.3))continue;
    if(o.kind!=='goal'&&(st.occ.get(o.k)||0)>=2)continue;
    let sc=dx+(o.kind==='goal'?6:0)+Math.random()*0.5;
    for(const q of st.flies)if(Math.hypot(q.x-o.x,q.y-o.top-0.3)<0.7)sc+=0.7;
    if(sc>bs){bs=sc;best=o;}
  }
  return best&&(bs>0.15||s.sink||Math.random()<0.25)?best:null;
}
function catchFly(f,q,s){
  st.flies.splice(st.flies.indexOf(q),1);st.flyN++;
  f.tongue={t:0,x:q.x,y:q.y};f.look=Math.sign(q.x-f.x)||f.look;f.croak=0.25;
  burst(q.x,q.y,12,[YELLOW,'#ffffff',LIME],1.2,0,0.8);
  const i=s&&s.kind==='rock'?s.i:f.lastI;if(i>=0)st.joy[i]=Math.max(st.joy[i]||0,0.5);
}
function fall(f,vy){Object.assign(f,{mode:'fall',vy,vx:f.look*0.5,on:null,tongue:null});}
function land(f,tg){
  f.sq=0.6;ripple(tg.x,tg.col||LIME);burst(tg.x,tg.top,6,[tg.col||LIME],0.8,4,0.6);
  if(tg.kind==='goal'){
    Object.assign(f,{mode:'home',on:'goal',t:0,croak:0.8});st.home++;st.homeT=st.clock;
    burst(GOAL_X,tg.top+0.3,40,PC,2.4,3,1.4);pop(st.home>=TARGET?'ALL HOME!':'HOME!',GOAL_X-0.15,tg.top+0.75,LIME,0.24);
    if(f.lastI>=0)st.joy[f.lastI]=1.8;
    return;
  }
  Object.assign(f,{mode:'sit',on:tg.k,wait:rnd(0.45,1.3)});
  if(tg.kind==='rock'){f.lastI=tg.i;st.joy[tg.i]=Math.max(st.joy[tg.i]||0,0.6);}
}
function seat(f,s){const n=st.seat.get(f.on)||[],k=n.indexOf(f);f.x=s.x+(k<0?0:(k-(n.length-1)/2)*0.2);f.y=s.top;}

function frogStep(f,dt){
  const play=st.phase==='play';
  f.sq=lerp(f.sq,0,Math.min(1,dt*9));f.croak=Math.max(0,f.croak-dt);
  if((f.blink-=dt)<-0.15)f.blink=rnd(2,5);
  if(f.tongue&&(f.tongue.t+=dt)>0.3)f.tongue=null;
  switch(f.mode){
  case 'spawn':
    if((f.t+=dt)<0)return;
    if(!f.up){f.up=1;ripple(HOME_X,LIME);}
    f.y=WATER-0.3+Math.min(1,f.t/0.4)*0.33;
    if(f.t>0.4)Object.assign(f,{mode:'sit',on:'home',wait:rnd(0.4,1.4),sq:0.5});
    return;
  case 'sit':{
    const s=st.map.get(f.on);if(!s){fall(f,0.5);return;}
    seat(f,s);
    if(!f.tongue){const q=st.flies.find(q=>Math.hypot(q.x-f.x,q.y-f.y-0.2)<0.55);if(q)catchFly(f,q,s);}
    if(s.kind==='rock'&&s.ref.wob>0.45){s.ref.wob=0;st.sad[s.i]=1.6;pop('WHOA',f.x,f.y+0.5,s.col,0.18);fall(f,2.2);return;}
    if(!play){if(st.win&&Math.random()<dt*1.5)f.croak=0.6;return;}
    if(s.sink)f.wait=Math.min(f.wait,0);                       // your stone is sinking: jump now
    if((f.wait-=dt)>0)return;
    const tg=choose(s);
    if(!tg){if(s.sink){fall(f,0.6);return;}f.stuck+=0.4;f.wait=0.4;return;}
    const dx=tg.x-s.x,up=Math.max(0,tg.top-s.top);
    Object.assign(f,{mode:'hop',to:tg.k,from:f.on,u:-0.2,x0:f.x,y0:f.y,tx:tg.x,ty:tg.top,dur:0.42+Math.hypot(dx,tg.top-s.top)*0.16,
      arc:0.28+Math.abs(dx)*0.16+up*0.55,look:Math.sign(dx)||f.look,stuck:0});
    if(s.kind==='rock')f.lastI=s.i;
    return;}
  case 'hop':{
    f.u+=dt/f.dur;const tg=st.map.get(f.to);if(tg&&!tg.sink){f.tx=tg.x;f.ty=tg.top;}
    if(f.u<0){const s=st.map.get(f.from);if(s){f.x0=f.x=s.x;f.y0=f.y=s.top;}f.sq=0.55;return;}   // crouch
    const u=Math.min(f.u,1);
    f.x=lerp(f.x0,f.tx,u);f.y=lerp(f.y0,f.ty,u)+Math.sin(Math.PI*u)*f.arc;
    st.trail.push({x:f.x,y:f.y+0.12*f.sz,t:0});
    const q=st.flies.find(q=>Math.hypot(q.x-f.x,q.y-f.y-0.15)<0.3);if(q)catchFly(f,q);
    if(f.u>=1){if(!tg||tg.sink)fall(f,0);else land(f,tg);}
    return;}
  case 'fall':
    f.vy-=9.8*dt;f.x+=f.vx*dt;f.y+=f.vy*dt;
    if(f.y<=WATER){f.y=WATER;f.mode='swim';st.splash++;ripple(f.x,'#ffffff');
      burst(f.x,WATER+0.05,16,['#ffffff','#bfefff',CYAN],2.2,9);pop('SPLASH',f.x,WATER+0.45,CYAN,0.17);}
    return;
  case 'swim':
    f.x-=0.7*dt;f.y=WATER;f.look=-1;
    if(f.x<=HOME_X){Object.assign(f,{x:HOME_X,mode:'sit',on:'home',wait:rnd(0.6,1.4),sq:0.6});ripple(HOME_X,LIME);}
    return;
  case 'home':
    seat(f,st.map.get('goal'));
    if(Math.random()<dt*2)f.croak=0.5;
    if(play&&(f.t+=dt)>2.2)Object.assign(f,newFrog(f.id,rnd(0.4,1.4)));
  }
}

function startNight(){
  Object.assign(st,{night:st.night+1,t:0,home:0,flyN:0,splash:0,phase:'play',win:false,endT:0});
  st.frogs=[...Array(NFROG)].map((_,k)=>newFrog(k,k*1.1+0.2));
}
function endNight(win){
  Object.assign(st,{phase:'end',win,endT:0,left:Math.max(0,Math.ceil(ROUND-st.t))});
  for(const s of st.ps.values())if(!s.sink)(win?st.joy:st.sad)[s.i]=END;
  if(win)for(let k=0;k<160;k++)st.parts.push({x:rnd(SX0,SX1),y:PY_TOP+rnd(0,0.6),vx:rnd(-0.4,0.4),vy:rnd(-0.6,0),g:1.4,t:0,life:rnd(3.5,5),col:PC[k%6],conf:1,rot:Math.random()*7});
}

/* ---------- Drawing ---------- */
function drawMoon(dawn){
  const m=clamp(st.t/ROUND,0,1),x=lerp(colX(0),colX(4)+0.2,m),y=PY_TOP-0.62+Math.sin(Math.PI*m)*0.3,X=wx(x),Y=wy(y),R=0.24*PPM;
  st.moonX=x;   // the moon is the clock: it crosses the wall, behind every mullion and the pier
  const gl=g.createRadialGradient(X,Y,R*0.8,X,Y,R*4);gl.addColorStop(0,`rgba(255,244,200,${0.35*(1-dawn)})`);gl.addColorStop(1,'rgba(255,244,200,0)');
  g.fillStyle=gl;g.fillRect(X-R*4,Y-R*4,R*8,R*8);
  g.globalAlpha=1-dawn*0.7;g.fillStyle='#FFF4C8';g.beginPath();g.arc(X,Y,R,0,7);g.fill();
  g.fillStyle='rgba(170,160,120,.35)';for(const [a,b,r] of [[-0.3,-0.2,0.2],[0.25,0.1,0.14],[-0.05,0.35,0.11]]){g.beginPath();g.arc(X+a*R,Y+b*R,r*R,0,7);g.fill();}
  g.globalAlpha=1;
}
function drawShore(){
  g.fillStyle='#03070f';g.beginPath();g.moveTo(0,wy(WATER));
  for(let x=SX0;x<=SX1+0.1;x+=0.1)g.lineTo(wx(x),wy(WATER+0.1+0.06*Math.sin(x*2.3)+0.04*Math.sin(x*5.7)));
  g.lineTo(SW,wy(WATER));g.fill();
  for(const [x,h] of st.pines){g.beginPath();g.moveTo(wx(x-0.09),wy(WATER+0.05));g.lineTo(wx(x),wy(WATER+h));g.lineTo(wx(x+0.09),wy(WATER+0.05));g.fill();}
}
function drawWater(T,dawn){
  const y0=wy(WATER),wg=g.createLinearGradient(0,y0,0,SH);wg.addColorStop(0,mix([10,40,70],[90,60,60],dawn));wg.addColorStop(1,'#02070e');
  g.fillStyle=wg;g.fillRect(0,y0,SW,SH-y0);g.fillStyle=hexA(CYAN,0.25);g.fillRect(0,y0-1,SW,3);
  const mx=wx(st.moonX);g.fillStyle=`rgba(255,244,200,${0.4*(1-dawn*0.7)})`;
  for(let k=0;k<6;k++){const w=(0.22-k*0.025)*PPM*(1+0.25*Math.sin(T*2+k));g.fillRect(mx-w/2+Math.sin(T*1.5+k)*8,y0+8+k*13,w,4);}
  g.strokeStyle=hexA(CYAN,0.14);g.lineWidth=3;
  for(let k=0;k<3;k++){const yy=y0+20+k*24;g.beginPath();for(let x=0;x<=SW;x+=16)g.lineTo(x,yy+Math.sin(x*0.02+T*1.4+k*2)*4);g.stroke();}
}
function drawRock(s,T){
  if(s.top<WATER-0.02)return;
  const sh=s.ref.wob>0.1?Math.sin(T*55)*s.ref.wob*14:0,x=wx(s.x)+sh,yt=wy(s.top),yb=wy(WATER-0.08),wt=0.19*PPM,wb=0.25*PPM;
  const gr=g.createLinearGradient(x-wb,0,x+wb,0);gr.addColorStop(0,'#232a35');gr.addColorStop(0.45,'#4d5869');gr.addColorStop(1,'#161b23');
  g.fillStyle=gr;g.beginPath();g.moveTo(x-wb,yb);g.lineTo(x-wt,yt+8);g.quadraticCurveTo(x,yt-12,x+wt,yt+8);g.lineTo(x+wb,yb);g.closePath();g.fill();
  g.strokeStyle='rgba(0,0,0,.4)';g.lineWidth=3;g.beginPath();
  for(let y=yt+0.24*PPM,k=0;y<yb-12;y+=0.24*PPM,k++){g.moveTo(x-wb*0.7,y);g.lineTo(x+(k%2?0.4:-0.1)*wb,y+7);}g.stroke();
  g.fillStyle=hexA(s.col,0.22);for(let k=0;k<3;k++)g.fillRect(x-wb*(0.8-k*0.2),yb+6+k*12,wb*(1.6-k*0.4),4);   // reflection
  g.save();g.shadowBlur=26;g.shadowColor=s.col;g.strokeStyle=s.sink?hexA(s.col,0.4):s.col;g.lineWidth=9;
  g.beginPath();g.ellipse(x,yt+2,wt,0.05*PPM,0,0,7);g.stroke();g.restore();
}
function lily(x,y,rx,rim,glow){
  const X=wx(x),Y=wy(y);g.save();if(glow){g.shadowBlur=26;g.shadowColor=rim;}
  g.fillStyle='#1E6B2C';g.beginPath();g.moveTo(X,Y);g.ellipse(X,Y,rx*PPM,rx*0.28*PPM,0,0.35,Math.PI*2-0.1);g.closePath();g.fill();
  g.lineWidth=6;g.strokeStyle=rim;g.stroke();g.restore();
  g.strokeStyle='rgba(0,0,0,.25)';g.lineWidth=2;g.beginPath();
  for(const a of [1.4,2.2,3,3.8,4.6,5.4]){g.moveTo(X,Y);g.lineTo(X+Math.cos(a)*rx*PPM*0.85,Y+Math.sin(a)*rx*0.28*PPM*0.85);}g.stroke();
}
function flower(x,y,T){
  const X=wx(x)+0.08*PPM,Y=wy(y+0.06),p=1+0.08*Math.sin(T*3);
  g.save();g.shadowBlur=30;g.shadowColor=PINK;g.fillStyle=PINK;
  for(let k=0;k<7;k++){const a=-Math.PI/2+(k-3)*0.42;g.beginPath();g.ellipse(X+Math.cos(a)*0.07*PPM*p,Y+Math.sin(a)*0.07*PPM*p,0.035*PPM,0.09*PPM,a+Math.PI/2,0,7);g.fill();}
  g.fillStyle=YELLOW;g.beginPath();g.arc(X,Y,0.035*PPM,0,7);g.fill();g.restore();
}
function eyes(X,Y,s,sx,lk,f){
  for(const d of[-1,1]){const ex=X+d*0.1*s*sx;
    g.fillStyle=LIME;g.beginPath();g.arc(ex,Y,0.07*s,0,7);g.fill();
    if(f.blink<0){g.strokeStyle='#1d2b00';g.lineWidth=0.02*s;g.beginPath();g.moveTo(ex-0.04*s,Y);g.lineTo(ex+0.04*s,Y);g.stroke();continue;}
    g.fillStyle='#ffffff';g.beginPath();g.arc(ex,Y-0.005*s,0.05*s,0,7);g.fill();
    g.fillStyle='#000000';g.beginPath();g.arc(ex+lk*0.018*s,Y-0.005*s,0.027*s,0,7);g.fill();}
}
function drawFrog(f){
  if(f.mode==='spawn'&&f.t<0)return;
  const s=PPM*f.sz,X=wx(f.x),Y=wy(f.y),lk=f.look;
  g.save();g.shadowColor=LIME;
  if(f.mode==='swim'){   // just the eyes above water, and a wake
    g.strokeStyle='rgba(220,250,255,.55)';g.lineWidth=4;g.beginPath();
    g.moveTo(X+0.12*s,Y);g.lineTo(X+0.45*s,Y-0.06*s);g.moveTo(X+0.12*s,Y);g.lineTo(X+0.45*s,Y+0.06*s);g.stroke();
    g.shadowBlur=14;g.fillStyle=LIME;g.beginPath();g.ellipse(X,Y,0.17*s,0.07*s,0,Math.PI,0);g.fill();
    eyes(X,Y-0.06*s,s,1,-1,f);g.restore();return;
  }
  const air=f.mode==='hop'&&f.u>0||f.mode==='fall',sq=air?-0.22:f.sq,sx=1+sq*0.4,sy=1-sq*0.45,by=Y-0.13*s*sy;
  g.shadowBlur=air?26:12;g.strokeStyle='#8DC400';g.fillStyle='#8DC400';g.lineCap='round';g.lineWidth=0.055*s;
  if(air){g.beginPath();for(const d of[-1,1]){g.moveTo(X+d*0.1*s,by+0.04*s);g.lineTo(X+d*0.2*s-lk*0.06*s,by+0.17*s);g.lineTo(X+d*0.13*s-lk*0.14*s,by+0.3*s);}g.stroke();}
  else for(const d of[-1,1]){g.beginPath();g.ellipse(X+d*0.17*s*sx,Y-0.07*s,0.1*s,0.065*s,d*0.3,0,7);g.fill();g.beginPath();g.ellipse(X+d*0.24*s*sx,Y-0.01*s,0.07*s,0.025*s,0,0,7);g.fill();}
  g.fillStyle=LIME;g.beginPath();g.ellipse(X,by,0.2*s*sx,0.14*s*sy,0,0,7);g.fill();
  g.shadowBlur=0;g.fillStyle='rgba(255,255,220,.45)';g.beginPath();g.ellipse(X,by+0.05*s*sy,0.12*s*sx,0.065*s*sy,0,0,7);g.fill();
  if(f.croak>0){const r=0.075*s*(0.7+0.5*Math.abs(Math.sin(f.croak*14)));g.shadowBlur=18;g.shadowColor=PINK;g.fillStyle=PINK;
    g.beginPath();g.arc(X+lk*0.03*s,by+0.07*s*sy,r,0,7);g.fill();g.shadowBlur=0;}
  g.strokeStyle='#1d2b00';g.lineWidth=0.02*s;g.beginPath();g.arc(X,by-0.02*s,0.1*s*sx,0.3,Math.PI-0.3);g.stroke();
  eyes(X,by-0.11*s*sy,s,sx,lk,f);
  g.restore();
}
function drawTongue(f){
  const k=f.tongue.t/0.3,e=k<0.5?k*2:2-k*2,mx=wx(f.x+f.look*0.08*f.sz),my=wy(f.y+0.12*f.sz);
  const tx=lerp(mx,wx(f.tongue.x),e),ty=lerp(my,wy(f.tongue.y),e);
  g.strokeStyle=PINK;g.fillStyle=PINK;g.lineWidth=7;g.lineCap='round';
  g.beginPath();g.moveTo(mx,my);g.lineTo(tx,ty);g.stroke();g.beginPath();g.arc(tx,ty,9,0,7);g.fill();
}
function drawFlies(T){
  g.save();g.shadowColor=YELLOW;g.shadowBlur=24;
  for(const q of st.flies){const a=0.55+0.45*Math.sin(T*4+q.ph),X=wx(q.x),Y=wy(q.y);
    g.fillStyle=hexA(YELLOW,a);g.beginPath();g.arc(X,Y,0.05*PPM,0,7);g.fill();
    g.fillStyle=hexA('#ffffff',a);g.beginPath();g.arc(X,Y,0.022*PPM,0,7);g.fill();}
  g.restore();
}
function drawParts(){
  for(const p of st.parts){g.globalAlpha=clamp((1-p.t/p.life)*1.5,0,1);g.fillStyle=p.col;
    if(p.conf){g.save();g.translate(wx(p.x),wy(p.y));g.rotate(p.rot);g.fillRect(-8,-4,16,8);g.restore();}
    else{g.beginPath();g.arc(wx(p.x),wy(p.y),p.r*PPM,0,7);g.fill();}}
  g.globalAlpha=1;
}
function drawPierHint(T){   // a frog is waiting: show where a stone is needed on the far side of the pier
  const a=0.4+0.4*Math.sin(T*6),X=wx(paneX(3)+0.3),Y=wy(WATER+0.2);
  g.save();g.setLineDash([12,10]);g.lineDashOffset=-T*40;g.strokeStyle=hexA('#ffffff',a);g.lineWidth=6;
  g.beginPath();g.ellipse(X,Y,0.19*PPM,0.05*PPM,0,0,7);g.stroke();
  g.beginPath();g.moveTo(wx(paneX(2)+PW-0.2),wy(WATER+0.5));g.quadraticCurveTo(wx(paneX(2)+PW+0.45),wy(WATER+1.3),X,Y-0.1*PPM);g.stroke();g.restore();
}
function drawSlots(){   // TARGET lily slots in the top-right pane fill up as frogs get home
  for(let k=0;k<TARGET;k++){
    const X=wx(colX(5)+(k%2?0.14:-0.14)),Y=wy(PY_TOP-0.3-(k>>1)*0.3),on=k<st.home,dt=st.clock-st.homeT;
    const R=0.11*PPM*(on&&k===st.home-1&&dt<0.6?1+0.4*Math.sin(dt*10):1);
    g.save();g.lineWidth=6;g.strokeStyle=on?LIME:hexA(LIME,0.3);g.fillStyle=on?'#1E6B2C':'rgba(0,0,0,.35)';
    if(on){g.shadowBlur=20;g.shadowColor=LIME;}g.beginPath();g.arc(X,Y,R,0,7);g.fill();g.stroke();g.restore();
    if(!on)continue;
    g.fillStyle=LIME;g.beginPath();g.ellipse(X,Y+R*0.15,R*0.6,R*0.42,0,0,7);g.fill();
    for(const d of[-1,1]){g.fillStyle='#ffffff';g.beginPath();g.arc(X+d*R*0.3,Y-R*0.25,R*0.2,0,7);g.fill();g.fillStyle='#000000';g.beginPath();g.arc(X+d*R*0.3,Y-R*0.25,R*0.1,0,7);g.fill();}
  }
}
function drawEnd(T){   // win: the whole right unit becomes one big smile. Lose: the left unit sees the sun come up.
  const k=Math.min(1,st.endT*2.5),u=st.win?1:0,x0=wx(paneX(u*3)),x1=wx(paneX(u*3+2)+PW);
  g.fillStyle=`rgba(0,0,0,${0.5*k})`;g.fillRect(x0,wy(PY_TOP),x1-x0,PHT*PPM);
  const b=st.win?Math.abs(Math.sin(T*5))*0.08*PPM:0;
  smiley(g,wx(unitCX(u)),wy(paneY(0)+PHT/2)-b,0.52*PPM*k,st.win,st.win?LIME:ORANGE,Math.sin(T*3)*0.1);
  g.save();g.shadowBlur=20;g.shadowColor='#000000';g.globalAlpha=k;
  text(st.win?'CHORUS!':'DAWN',wx(unitCX(u)),wy(paneY(1)+PHB-0.3),0.28*PPM,st.win?LIME:ORANGE,800);g.restore();
}
function drawReeds(T){
  g.strokeStyle='#020504';g.lineCap='round';g.lineWidth=7;
  for(const [x,h,ph] of REEDS){const sw=Math.sin(T*1.2+ph)*0.05,tx=wx(x+sw),ty=wy(WATER+h);
    g.beginPath();g.moveTo(wx(x),wy(PY_BOT-0.05));g.quadraticCurveTo(wx(x),wy(WATER),tx,ty);g.stroke();
    if(h>0.3){g.fillStyle='#3a2414';g.beginPath();g.ellipse(tx,ty+0.07*PPM,6,16,sw,0,7);g.fill();}}
}

return {
  id:'frog-stones-2',cat:'puzzle',by:'Lukas',name:{sv:'Grodstenar 2',en:'Frog Stones 2'},short:{sv:'Grodor 2',en:'Frogs 2'},steam:'E',crowd:true,
  fraga:{sv:'Hur bygger man en bro som är för lång för en ensam?',en:'How do you build a bridge too long for one person?'},
  verb:{sv:'lyfta, mötas, rädda',en:'lift, meet, rescue'},
  pitch:{
    tagline:{sv:'Lyft stenarna med kroppen. Få grodorna över dammen innan gryningen.',en:'Raise the stones with your body. Get the frogs across the pond before dawn.'},
    players:['group','2–8'],mode:'coop',round:{sv:'90 s',en:'90 s'},
    input:[['cam',{sv:'Djupkamera: var du står',en:'Depth cam: where you stand'}],['pad',{sv:'Golvplattor',en:'Floor pads'}]],
    for:['kid','family','school'],
    how:[{sv:'Ställ dig vid ett fönster: en sten i din färg stiger ur dammen.',en:'Stand at a window: a stone in your colour rises from the pond.'},{sv:'Ta ett steg bakåt för att lyfta den till de övre rutorna, där eldflugorna är.',en:'Step back to lift it into the top panes, where the fireflies are.'},{sv:'Mötas vid muren: ingen groda klarar hoppet över den ensam.',en:'Meet at the pier: no frog can leap it alone.'}],
    trick:{sv:'En månbelyst damm löper bakom alla 12 rutor. Ta ett steg bakåt så växer din sten förbi tvärposten upp i den övre rutan; grodorna hoppar bakom spröjsen och dyker upp igen. Muren är för bred för alla grodor, så någon måste stå precis bredvid den. Månen är klockan och glider bakom ramarna.',en:'One moonlit pond runs behind all 12 panes. Step back and your stone grows past the transom into the top pane; frogs leap behind mullions and pop out. The pier is too wide for any frog, so someone has to stand right beside it. The moon is the clock and slides behind the frames.'},
    needs:[['projector',{sv:'Projektor',en:'Projector'}],['cam',{sv:'Djupkamera ×2',en:'Depth cam ×2'}],['speaker',{sv:'Kvack och plask',en:'Croaks and splashes'}]],
    open:[{sv:'En natt på 90 s, eller kom när du vill utan klocka?',en:'A 90 s night, or drop in with no clock?'},{sv:'Springer man ramlar grodorna av: rättvist, eller för hårt för små barn?',en:'Running knocks the frogs off: fair, or too harsh for small kids?'},{sv:'Ska eldflugorna räknas mot målet?',en:'Should fireflies count towards the goal?'},{sv:'Förstår man steg-bakåt-för-att-lyfta utan skylt?',en:'Does step-back-to-lift read without a sign?'}],
    meters:{read:5,crowd:4,effort:3}
  },
  init(){
    st={clock:0,night:0,ps:new Map(),flies:[],parts:[],rip:[],pops:[],trail:[],joy:{},sad:{},seat:new Map(),occ:new Map(),moonX:colX(0),homeT:-9,pines:[],
      stars:[...Array(110)].map(()=>[rnd(SX0,SX1),rnd(WATER+0.6,PY_TOP+0.05),Math.random()*7])};
    for(let x=SX0+0.1;x<SX1;x+=rnd(0.18,0.45))st.pines.push([x,rnd(0.22,0.5)]);
    for(let k=0;k<8;k++)st.flies.push(newFly(k<3));
    startNight();stones(0.016);
  },
  update(dt){
    dt=Math.min(dt,0.1);st.clock+=dt;
    stones(dt);
    if(st.phase==='play'){st.t+=dt;if(st.home>=TARGET)endNight(true);else if(st.t>=ROUND)endNight(false);}
    else if((st.endT+=dt)>END)startNight();
    st.seat=new Map();st.occ=new Map();
    for(const f of st.frogs){
      const k=f.mode==='hop'?f.to:(f.mode==='sit'||f.mode==='home')?f.on:null;if(k==null)continue;
      st.occ.set(k,(st.occ.get(k)||0)+1);
      if(f.mode!=='hop'){if(!st.seat.has(k))st.seat.set(k,[]);st.seat.get(k).push(f);}
    }
    for(const f of st.frogs)frogStep(f,dt);
    st.pierWait=st.phase==='play'&&st.frogs.some(f=>f.mode==='sit'&&f.stuck>1.2&&f.x>paneX(2)&&f.x<PIER_R);
    if(st.flies.length<9&&Math.random()<dt*1.2)st.flies.push(newFly(Math.random()<0.3));
    for(const q of st.flies){q.vx=clamp(q.vx+rnd(-1,1)*dt,-0.35,0.35);q.x+=q.vx*dt;
      if(q.x<SX0+0.2||q.x>SX1-0.2){q.vx=-q.vx;q.x=clamp(q.x,SX0+0.2,SX1-0.2);}
      q.y=q.y0+Math.sin(st.clock*1.3+q.ph)*0.1;}
    for(const o of [st.joy,st.sad])for(const k in o)if((o[k]-=dt)<=0)delete o[k];
    for(const p of st.parts){p.t+=dt;p.vy-=p.g*dt;if(p.conf){p.vy=Math.max(p.vy,-0.9);p.rot+=dt*6;}p.x+=p.vx*dt;p.y+=p.vy*dt;}
    st.parts=st.parts.filter(p=>p.t<p.life).slice(-700);
    st.rip=st.rip.filter(r=>(r.t+=dt)<1.2);st.pops=st.pops.filter(p=>(p.t+=dt)<1.2);st.trail=st.trail.filter(p=>(p.t+=dt)<0.35);
  },
  draw(T){
    const dawn=st.phase==='end'&&!st.win?Math.min(1,st.endT/2.5):clamp((st.t-(ROUND-20))/20,0,1)*0.55;
    const sky=g.createLinearGradient(0,0,0,wy(WATER));
    sky.addColorStop(0,mix(SKY[0],DAWN[0],dawn));sky.addColorStop(1,mix(SKY[1],DAWN[1],dawn));
    g.fillStyle=sky;g.fillRect(0,0,SW,SH);
    for(const [x,y,p] of st.stars){g.fillStyle=`rgba(232,255,200,${(0.35+0.35*Math.sin(T*2+p))*(1-dawn)})`;g.fillRect(wx(x),wy(y),3,3);}
    drawMoon(dawn);drawShore();drawWater(T,dawn);
    const gx=wx(GOAL_X),gy=wy(WATER+0.1),gl=g.createRadialGradient(gx,gy,4,gx,gy,0.75*PPM);
    gl.addColorStop(0,hexA(PINK,0.3+0.1*Math.sin(T*3)));gl.addColorStop(1,hexA(PINK,0));g.fillStyle=gl;g.fillRect(gx-0.75*PPM,gy-0.75*PPM,1.5*PPM,1.5*PPM);
    for(const s of st.S.filter(s=>s.kind==='rock').sort((a,b)=>b.top-a.top))drawRock(s,T);   // nearer people = lower stones, drawn in front
    for(const s of st.S){
      if(s.kind==='pad')lily(s.x,s.top,0.26,'#3FA34D',false);
      else if(s.kind==='home')lily(s.x,s.top,0.32,LIME,true);
      else if(s.kind==='goal'){lily(s.x,s.top,0.34,PINK,true);flower(s.x,s.top,T);}
    }
    for(const r of st.rip){const k=r.t/1.2;g.strokeStyle=hexA(r.col,0.8*(1-k));g.lineWidth=4;g.beginPath();g.ellipse(wx(r.x),wy(WATER),(0.18+k*0.6)*PPM,(0.04+k*0.1)*PPM,0,0,7);g.stroke();}
    if(st.pierWait)drawPierHint(T);
    for(const p of st.trail){const a=1-p.t/0.35;g.fillStyle=hexA(LIME,0.35*a);g.beginPath();g.arc(wx(p.x),wy(p.y),0.05*PPM*a,0,7);g.fill();}
    for(const f of st.frogs)drawFrog(f);
    for(const f of st.frogs)if(f.tongue)drawTongue(f);
    drawFlies(T);drawParts();
    if(st.phase==='end')drawEnd(T);
    drawSlots();drawReeds(T);
    for(const p of st.pops){const k=p.t/1.2;g.save();g.globalAlpha=1-clamp((k-0.6)/0.4,0,1);g.shadowBlur=18;g.shadowColor='#000000';
      text(p.s,wx(p.x),wy(p.y+k*0.3),Math.max(1,p.size*PPM*Math.min(1.15,k/0.12)),p.col,800);g.restore();}
  },
  hud(){
    if(!st.frogs)return '';
    const ff=`${st.flyN} firefl${st.flyN===1?'y':'ies'}`;
    if(st.phase==='end'){const k=Math.max(0,Math.ceil(END-st.endT));
      return st.win?`Chorus! All ${TARGET} frogs home with ${st.left} s to spare · ${ff} · next night in ${k} s`
                   :`Dawn came: ${st.home} of ${TARGET} frogs made it · ${ff} · next night in ${k} s`;}
    const left=Math.max(0,Math.ceil(ROUND-st.t)),n=[...st.ps.values()].filter(s=>!s.sink).length;
    const tip=!n?'step up to a window to raise a stone':st.pierWait?'a frog waits at the pier: stand on the other side!':left<=20?'dawn is coming':`${n} stones up`;
    return `Night ${st.night} · ${left} s to dawn · ${st.home} of ${TARGET} frogs home · ${ff} · ${tip}`;
  },
  cast(i){if(!st.ps)return null;const s=st.ps.get(people[i]);return s&&!s.sink?s.col:null;},
  fig(i,T){
    if(!st.joy)return {};
    if(st.sad[i]>0)return {slump:true};
    const j=st.joy[i]||0;return j>0?{jump:Math.abs(Math.sin(T*7+i))*0.3*Math.min(1,j*2)}:{};
  }
};
});
