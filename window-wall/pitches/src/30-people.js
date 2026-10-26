/* ================= People on the plaza: what the two Orbbec depth cameras would report =================
   person: {id, x (m along the façade), z (m from the glass), vx, speed (m/s, smoothed), still (s without moving),
            wave (s left of waving), jump (s left of a jump), jy (m off the ground), kid, auto, you}
   CROWD.act is the plaza's total movement, smoothed: ~0 empty, ~1 one person walking, 3+ a lively crowd. */
const CROWD={people:[],act:0,energy:0,maxAuto:2,mouse:true,sel:null,_spawn:1.2,_id:1};
const PX0=-1.3,PX1=F.W+1.3,PZ1=6;
function newPerson(o){const kid=o.kid??Math.random()<.22;return Object.assign({id:CROWD._id++,x:F.W/2,z:2,px:null,pz:null,vx:0,vz:0,speed:0,still:0,wave:0,jump:0,jy:0,kid,h:kid?1.15:1.6+Math.random()*.25,auto:false,you:false,mode:'stand',t:0,coat:['#3b4a5c','#5c3b3b','#3b5c46','#4f4f4f','#5c513b','#46395c'][Math.floor(Math.random()*6)]},o);}
function crowdAdd(o={}){const p=newPerson(o);CROWD.people.push(p);return p;}
function crowdRemove(p){CROWD.people=CROWD.people.filter(q=>q!==p);if(CROWD.sel===p)CROWD.sel=null;}
function spawnWalker(){
  const fromL=Math.random()<.5,z=1.4+Math.random()*3.6;
  const p=crowdAdd({auto:true,mode:'walk',x:fromL?PX0:PX1,z,sp:.9+Math.random()*.6});
  if(Math.random()<.6){const pane=F.panes[Math.floor(Math.random()*6)];p.plan=[{x:pane.cx+(Math.random()-.5)*.3,z:.9+Math.random()*1.6,stop:3+Math.random()*6},{x:fromL?PX1:PX0,z:1.4+Math.random()*3.6}];}
  else p.plan=[{x:fromL?PX1:PX0,z:z+(Math.random()-.5)}];
  p.tgt=p.plan.shift();
}
function crowdUpdate(dt){
  CROWD._spawn-=dt;
  const autos=CROWD.people.filter(p=>p.auto).length;
  if(CROWD._spawn<=0){CROWD._spawn=3+Math.random()*6;if(autos<CROWD.maxAuto)spawnWalker();}
  if(autos>CROWD.maxAuto){const p=CROWD.people.find(q=>q.auto&&q.mode!=='leave');if(p){p.plan=[];p.tgt={x:p.x<F.W/2?PX0:PX1,z:p.z};p.mode='walk';p.pause=0;}}
  let act=0;
  for(const p of [...CROWD.people]){
    p.t+=dt;
    if(p.auto){
      if(p.pause>0){p.pause-=dt;if(Math.random()<dt*.25)p.wave=1.6;if(Math.random()<dt*.12)p.jump=.6;if(p.pause<=0){p.tgt=p.plan.shift();p.mode='walk';}}
      else if(p.tgt){const dx=p.tgt.x-p.x,dz=p.tgt.z-p.z,d=Math.hypot(dx,dz),st=Math.min(d,p.sp*dt);
        if(d>.02){p.x+=dx/d*st;p.z+=dz/d*st;}
        if(d<.05){if(p.tgt.stop){p.pause=p.tgt.stop;p.mode='stand';p.tgt.stop=0;}else if(p.plan.length)p.tgt=p.plan.shift();else{crowdRemove(p);continue;}}}
    }
    if(p.px==null){p.px=p.x;p.pz=p.z;}
    const vx=(p.x-p.px)/Math.max(dt,1e-3),vz=(p.z-p.pz)/Math.max(dt,1e-3);p.px=p.x;p.pz=p.z;
    p.vx=approach(p.vx,vx,8,dt);p.vz=approach(p.vz,vz,8,dt);
    p.speed=approach(p.speed,Math.hypot(vx,vz),5,dt);
    p.still=p.speed<.15?p.still+dt:0;
    p.wave=Math.max(0,p.wave-dt);
    if(p.jump>0){p.jump=Math.max(0,p.jump-dt);const k=1-p.jump/.6;p.jy=Math.sin(Math.PI*clamp(k))*.45;}else p.jy=0;
    act+=Math.min(p.speed/1.3,1.8)+(p.wave>0?.7:0)+(p.jump>0?1.4:0);
  }
  CROWD.act=approach(CROWD.act,act,2,dt);
  CROWD.energy+=CROWD.act*dt;
}
/* nearest person in front of column c (within maxZ metres), or null */
function personAtCol(c,maxZ=6){let b=null,d=1e9;for(const p of CROWD.people){if(p.z>maxZ)continue;if(F.colAt(p.x)!==c||Math.abs(p.x-F.cols[c].cx)>.55)continue;if(p.z<d){d=p.z;b=p;}}return b;}

/* ---------- the plaza widget in the panel ---------- */
const Plaza=(()=>{
  const cv=document.getElementById('plaza'),ctx=cv.getContext('2d');let W=0,H=0,drag=null,lastTap=0;
  const fit=()=>{const r=cv.getBoundingClientRect(),d=Math.min(2,devicePixelRatio||1);W=r.width;H=Math.round(W*.52);cv.style.height=H+'px';cv.width=Math.round(W*d);cv.height=Math.round(H*d);ctx.setTransform(d,0,0,d,0,0);};
  const TOP=26;
  const sx=x=>(x-PX0)/(PX1-PX0)*W,sz=z=>TOP+z/PZ1*(H-TOP-6);
  const ix=px=>PX0+px/W*(PX1-PX0),iz=py=>clamp((py-TOP)/(H-TOP-6)*PZ1,.3,PZ1);
  const hit=(px,py)=>{let b=null,d=18;for(const p of CROWD.people){const e=Math.hypot(sx(p.x)-px,sz(p.z)-py);if(e<d){d=e;b=p;}}return b;};
  const pos=e=>{const r=cv.getBoundingClientRect();return[e.clientX-r.left,e.clientY-r.top];};
  cv.addEventListener('pointerdown',e=>{const[px,py]=pos(e);if(py<TOP-4)return;let p=hit(px,py);const now=performance.now();
    if(p&&now-lastTap<320&&CROWD.sel===p){crowdRemove(p);lastTap=0;return;}lastTap=now;
    if(!p)p=crowdAdd({x:ix(px),z:iz(py)});
    if(p.auto){p.auto=false;p.plan=[];p.tgt=null;p.pause=0;}
    p.mode='drag';CROWD.sel=p;drag=p;cv.setPointerCapture(e.pointerId);cv.style.cursor='grabbing';});
  cv.addEventListener('pointermove',e=>{if(!drag)return;const[px,py]=pos(e);drag.x=clamp(ix(px),PX0,PX1);drag.z=iz(py);});
  const up=()=>{if(drag)drag.mode='stand';drag=null;cv.style.cursor='grab';};
  cv.addEventListener('pointerup',up);cv.addEventListener('pointercancel',up);
  new ResizeObserver(fit).observe(cv);
  function draw(T){
    if(!W)fit();if(!W)return;
    ctx.clearRect(0,0,W,H);
    // paving grid
    ctx.strokeStyle='#14170f';ctx.lineWidth=1;
    for(let x=Math.ceil(PX0);x<=PX1;x++){ctx.beginPath();ctx.moveTo(sx(x),TOP);ctx.lineTo(sx(x),H);ctx.stroke();}
    for(let z=1;z<=PZ1;z++){ctx.beginPath();ctx.moveTo(0,sz(z));ctx.lineTo(W,sz(z));ctx.stroke();}
    ctx.fillStyle='#3d4236';ctx.font="10px 'IBM Plex Mono',monospace";ctx.textAlign='left';
    for(let z=2;z<=PZ1;z+=2)ctx.fillText(z+' m',4,sz(z)-3);
    // camera cones
    for(const u of F.units){const cx=sx(u.cx);const gr=ctx.createRadialGradient(cx,TOP,0,cx,TOP,H);gr.addColorStop(0,'rgba(202,254,3,.10)');gr.addColorStop(1,'rgba(202,254,3,0)');
      ctx.fillStyle=gr;ctx.beginPath();ctx.moveTo(cx,TOP);ctx.lineTo(cx-H*1.05,H);ctx.lineTo(cx+H*1.05,H);ctx.closePath();ctx.fill();
      ctx.fillStyle='#CAFE03';ctx.fillRect(cx-6,TOP-6,12,5);}
    // façade strip
    ctx.fillStyle='#262a21';ctx.fillRect(0,0,W,TOP-6);
    for(const p of F.panes)if(p.r===0){ctx.fillStyle='#0e100c';ctx.fillRect(sx(p.x),4,sx(p.x+p.w)-sx(p.x),TOP-14);}
    ctx.fillStyle='#8a907e';ctx.textAlign='center';ctx.font="600 9px 'IBM Plex Mono',monospace";
    for(const c of F.cols)ctx.fillText(c.c+1,sx(c.cx),TOP-11);
    // people
    for(const p of CROWD.people){
      const x=sx(p.x),y=sz(p.z),r=(p.kid?6:8)*(1+p.jy*.8);
      if(p.speed>.2){ctx.strokeStyle='rgba(255,255,255,.25)';ctx.lineWidth=2;ctx.beginPath();ctx.moveTo(x,y);ctx.lineTo(x-p.vx*9,y-p.vz*9);ctx.stroke();}
      if(p.wave>0){ctx.strokeStyle='#ffb21e';ctx.lineWidth=2;for(let k=1;k<3;k++){ctx.beginPath();ctx.arc(x,y,r+4*k+Math.sin(T*12)*1.5,-2.4,-.7);ctx.stroke();}}
      if(p.jump>0){ctx.strokeStyle='#2fd6e0';ctx.lineWidth=2;ctx.beginPath();ctx.arc(x,y,r+10*(1-p.jump/.6),0,TAU);ctx.stroke();}
      ctx.fillStyle=p.you?'#CAFE03':p.auto?'#8f9682':'#eef1e4';ctx.beginPath();ctx.arc(x,y,r,0,TAU);ctx.fill();
      if(CROWD.sel===p){ctx.strokeStyle='#CAFE03';ctx.lineWidth=2;ctx.beginPath();ctx.arc(x,y,r+3,0,TAU);ctx.stroke();}
      if(p.you){ctx.fillStyle='#000';ctx.font="700 8px 'IBM Plex Mono',monospace";ctx.fillText(LANG==='sv'?'du':'you',x,y+3);}
    }
    if(!CROWD.people.length){ctx.fillStyle='#5d6356';ctx.font="12px 'IBM Plex Mono',monospace";ctx.textAlign='center';ctx.fillText(L({sv:'Klicka för att ställa ut en person',en:'Click to place a person'}),W/2,H/2+10);}
  }
  return {draw};
})();

function buildPlazaControls(){
  UI.begin(document.getElementById('plazactl'));
  UI.group(null,'row');
  UI.button({label:{sv:'+ Person',en:'+ Person'},onClick:()=>{CROWD.sel=crowdAdd({x:.6+Math.random()*(F.W-1.2),z:1+Math.random()*2});}});
  const who=()=>CROWD.sel?[CROWD.sel]:CROWD.people.filter(p=>!p.auto);
  UI.button({label:{sv:'Vinka',en:'Wave'},onClick:()=>who().forEach(p=>p.wave=2)});
  UI.button({label:{sv:'Hoppa',en:'Jump'},onClick:()=>who().forEach(p=>p.jump=.6)});
  UI.button({label:{sv:'Töm',en:'Clear'},onClick:()=>{CROWD.people=CROWD.people.filter(p=>p.you);CROWD.sel=null;}});
  UI.group();
  UI.slider({obj:CROWD,key:'maxAuto',label:{sv:'Förbipasserande',en:'Passers-by'},min:0,max:8,step:1,fmt:v=>v===0?L({sv:'inga',en:'none'}):v});
  UI.toggle({obj:CROWD,key:'mouse',label:{sv:'Musen över bilden är en besökare',en:'Mouse over the image is a visitor'}});
  UI.note({sv:'Dra personer, dubbelklicka för att ta bort. Markera en och tryck Vinka eller Hoppa.',en:'Drag people, double-click to remove. Select one and press Wave or Jump.'});
}
