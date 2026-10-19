/* Window Wall app: three.js façade, plaza people, idea menu, pitch card and the main loop.
   Don't change this file when adding an idea. Ideas talk to it only through the hooks in CLAUDE.md. */
(function(){
'use strict';
const W=window.WW;
const {LIME,PC,FONT,PW,FR,MUL,TR,PHB,Y0,UW,UH,X0,UX,colX,SX0,SX1,SY0,SY1,SW,SH,scr,clamp,esc,ICONS,ic,AUD,MODE,CATS,people}=W;
const IDEAS=W.ideas;
const RM=matchMedia('(prefers-reduced-motion: reduce)').matches;
const owned=d=>d.by?`${d.by}${/s$/i.test(d.by)?'’':'’s'} ${d.name}`:d.name;

/* ---------- Scene ---------- */
const glCanvas=document.getElementById('gl'),stage=document.getElementById('stage');
const renderer=new THREE.WebGLRenderer({canvas:glCanvas,antialias:true});
renderer.setPixelRatio(Math.min(window.devicePixelRatio||1,2));
renderer.outputEncoding=THREE.sRGBEncoding;
const scene=new THREE.Scene();scene.background=new THREE.Color(0x06070a);scene.fog=new THREE.Fog(0x06070a,30,80);
const camera=new THREE.PerspectiveCamera(45,1,0.1,250);
const controls=new THREE.OrbitControls(camera,glCanvas);
controls.enableDamping=true;controls.dampingFactor=0.08;controls.minDistance=2.5;controls.maxDistance=36;
controls.maxPolarAngle=Math.PI*0.495;controls.minAzimuthAngle=-1.3;controls.maxAzimuthAngle=1.3;
scene.add(new THREE.HemisphereLight(0x8a96b8,0x1c1a14,0.6));
const moon=new THREE.DirectionalLight(0xc4ceff,0.5);moon.position.set(-18,26,24);scene.add(moon);

const BX0=-12,BX1=16,BH=11.4;
const plaster=new THREE.MeshStandardMaterial({color:0xdcb7a4,roughness:0.95});
const frameMat=new THREE.MeshStandardMaterial({color:0xeeeeea,roughness:0.6});
const glassMat=new THREE.MeshStandardMaterial({color:0x0e121a,roughness:0.2,metalness:0.6,emissive:0x05070b});
const litGlass=new THREE.MeshStandardMaterial({color:0x2a2014,roughness:0.4,emissive:0x5a3a14,emissiveIntensity:0.9});
const concrete=new THREE.MeshStandardMaterial({color:0x7d7c77,roughness:1});
function box(w,h,d,mat,x,y,z){const m=new THREE.Mesh(new THREE.BoxGeometry(w,h,d),mat);m.position.set(x,y,z);scene.add(m);return m;}

const facade=new THREE.Shape();facade.moveTo(BX0,0);facade.lineTo(BX1,0);facade.lineTo(BX1,BH);facade.lineTo(BX0,BH);facade.lineTo(BX0,0);
function hole(x,y,w,h){const p=new THREE.Path();p.moveTo(x,y);p.lineTo(x,y+h);p.lineTo(x+w,y+h);p.lineTo(x+w,y);p.lineTo(x,y);facade.holes.push(p);}
hole(UX[0],Y0,UW,UH);hole(UX[1],Y0,UW,UH);
const glassWins=[];
function gwin(x,y,w,h,cols,rows,lit){hole(x,y,w,h);glassWins.push({x,y,w,h,cols,rows,lit});}
[-11,-8.8,-6.6,-4.4,-2.2,0].forEach((x,k)=>gwin(x,5.6,1.5,2.4,2,2,k===2));
[5.2,8.4,11.6].forEach((x,k)=>gwin(x,5.4,2.3,3.4,3,3,k===1));
[5.6,8.4,11.2].forEach(x=>gwin(x,2.4,2.0,1.0,3,1,false));
[-10.8,-8.8].forEach(x=>gwin(x,2.4,1.6,1.0,2,1,false));
[5.6,8.4,11.2,14.0].forEach(x=>gwin(x,0.45,1.6,0.6,2,1,false));
const wall=new THREE.Mesh(new THREE.ExtrudeGeometry(facade,{depth:0.4,bevelEnabled:false}),plaster);wall.position.z=-0.4;scene.add(wall);
box(BX1-BX0,BH,14,plaster,(BX0+BX1)/2,BH/2,-0.4-7.001);
box(BX1-BX0+0.5,0.28,14.5,new THREE.MeshStandardMaterial({color:0x2c2c2c,roughness:0.7}),(BX0+BX1)/2,BH+0.14,-7.15);
box(BX1-BX0+0.1,0.12,0.2,frameMat,(BX0+BX1)/2,BH-0.2,0.08);
function frameRect(x,y,w,h,z,t,cols,rows){
  box(w,t,0.06,frameMat,x+w/2,y+t/2,z);box(w,t,0.06,frameMat,x+w/2,y+h-t/2,z);box(t,h,0.06,frameMat,x+t/2,y+h/2,z);box(t,h,0.06,frameMat,x+w-t/2,y+h/2,z);
  for(let i=1;i<cols;i++)box(t*0.8,h,0.05,frameMat,x+w*i/cols,y+h/2,z);for(let j=1;j<rows;j++)box(w,t*0.8,0.05,frameMat,x+w/2,y+h*j/rows,z);
}
for(const gw of glassWins){const m=new THREE.Mesh(new THREE.PlaneGeometry(gw.w,gw.h),gw.lit?litGlass:glassMat);m.position.set(gw.x+gw.w/2,gw.y+gw.h/2,-0.3);scene.add(m);frameRect(gw.x,gw.y,gw.w,gw.h,-0.26,0.06,gw.cols,gw.rows);}
// the two projection window units: outer frame, two mullions, one transom, a sill
for(let u=0;u<2;u++){const x=UX[u],z=-0.19;
  box(UW,FR,0.08,frameMat,x+UW/2,Y0+FR/2,z);box(UW,FR,0.08,frameMat,x+UW/2,Y0+UH-FR/2,z);box(FR,UH,0.08,frameMat,x+FR/2,Y0+UH/2,z);box(FR,UH,0.08,frameMat,x+UW-FR/2,Y0+UH/2,z);
  for(let i=1;i<3;i++)box(MUL,UH-2*FR,0.08,frameMat,x+FR+i*PW+(i-0.5)*MUL,Y0+UH/2,z);
  box(UW-2*FR,TR,0.08,frameMat,x+UW/2,Y0+FR+PHB+TR/2,z);
  box(UW+0.1,0.05,0.2,frameMat,x+UW/2,Y0-0.02,-0.02);
}
const screenTex=new THREE.CanvasTexture(scr);screenTex.encoding=THREE.sRGBEncoding;screenTex.anisotropy=4;
const screen=new THREE.Mesh(new THREE.PlaneGeometry(SX1-SX0,SY1-SY0),new THREE.MeshBasicMaterial({map:screenTex,toneMapped:false}));
screen.position.set((SX0+SX1)/2,(SY0+SY1)/2,-0.25);scene.add(screen);

const bannerX=UX[1]+UW+1.35;
const bc=document.createElement('canvas');bc.width=256;bc.height=1024;const bctx=bc.getContext('2d');
function drawBanner(){bctx.fillStyle='#f4f2ee';bctx.fillRect(0,0,256,1024);bctx.save();bctx.translate(128,512);bctx.rotate(-Math.PI/2);bctx.fillStyle='#E8641E';bctx.font=`800 128px ${FONT}`;bctx.textAlign='center';bctx.textBaseline='middle';bctx.fillText('Exploratoriet',0,-14);
  bctx.fillStyle='#555';bctx.font=`600 30px ${FONT}`;bctx.fillText('SKELLEFTEÅ SCIENCE CENTER',30,72);bctx.restore();}
drawBanner();
const bannerTex=new THREE.CanvasTexture(bc);bannerTex.encoding=THREE.sRGBEncoding;
const bannerFront=new THREE.MeshStandardMaterial({map:bannerTex,roughness:0.7,emissive:0x222222,emissiveMap:bannerTex});
const bannerSide=new THREE.MeshStandardMaterial({color:0xdddddd});
const banner=new THREE.Mesh(new THREE.BoxGeometry(1.7,6.6,0.15),[bannerSide,bannerSide,bannerSide,bannerSide,bannerFront,bannerSide]);banner.position.set(bannerX,4.25+3.3,0.1);scene.add(banner);
box(2.2,2.7,1.2,glassMat,bannerX,1.35,0.6);frameRect(bannerX-1.1,0,2.2,2.7,1.22,0.07,2,1);
box(2.8,0.18,1.7,new THREE.MeshStandardMaterial({color:0x4e8a6a,roughness:0.6}),bannerX,2.85,0.75);
const warm=new THREE.PointLight(0xffbe7a,1.1,9,2);warm.position.set(bannerX,2.6,1.9);scene.add(warm);

const ground=new THREE.Mesh(new THREE.PlaneGeometry(180,180),new THREE.MeshStandardMaterial({color:0x111211,roughness:1}));ground.rotation.x=-Math.PI/2;scene.add(ground);
const plaza=new THREE.Mesh(new THREE.PlaneGeometry(BX1-BX0+6,12),new THREE.MeshStandardMaterial({color:0x262624,roughness:1}));plaza.rotation.x=-Math.PI/2;plaza.position.set((BX0+BX1)/2,0.005,6);scene.add(plaza);
[[-9,4,2.4,0.7,0],[-6.5,9.2,2.8,0.8,0.1],[2.2,10.2,2.2,0.7,-0.1],[6.4,5.6,3,0.8,0],[10,7.2,2.6,0.8,0.2],[13,4,2.2,0.7,0],[-9,10.4,2,0.7,-0.2],[5.4,9.4,1.6,1.6,0]].forEach(([x,z,w,d,ry])=>{const m=box(w,0.45,d,concrete,x,0.225,z);m.rotation.y=ry;});
const metal=new THREE.MeshStandardMaterial({color:0x9a9c9e,roughness:0.4,metalness:0.6});
const rx0=UX[0]-0.5,rx1=UX[1]+UW+0.2,rz=1.6;
for(let x=rx0;x<=rx1+1e-3;x+=1.1){const p=new THREE.Mesh(new THREE.CylinderGeometry(0.025,0.025,0.95,6),metal);p.position.set(x,0.475,rz);scene.add(p);}
[0.95,0.5].forEach(y=>{const r=new THREE.Mesh(new THREE.CylinderGeometry(0.022,0.022,rx1-rx0,6),metal);r.rotation.z=Math.PI/2;r.position.set((rx0+rx1)/2,y,rz);scene.add(r);});
const barkMat=new THREE.MeshStandardMaterial({color:0x8f8d86,roughness:1});
function tree(x,z,h){const grp=new THREE.Group();const t=new THREE.Mesh(new THREE.CylinderGeometry(0.06,0.15,h,6),barkMat);t.position.y=h/2;grp.add(t);
  for(let i=0;i<8;i++){const L=h*(0.18+Math.random()*0.22);const b=new THREE.Mesh(new THREE.CylinderGeometry(0.012,0.045,L,4),barkMat);b.position.y=h*(0.4+Math.random()*0.55);b.rotation.set(0,Math.random()*6.28,(Math.random()<.5?-1:1)*(0.35+Math.random()*0.5));b.translateY(L/2);grp.add(b);}
  grp.position.set(x,0,z);scene.add(grp);}
[[-14,-2,9],[-15.5,1.5,10],[-17,-1,8.5],[-14.6,4.5,7.5],[-19,3,9.5],[-21,-0.5,10],[-18,7,8]].forEach(a=>tree(...a));
{const n=500,pos=new Float32Array(n*3);for(let i=0;i<n;i++){const th=Math.random()*Math.PI*2,ph=Math.random()*1.3,R=110;pos[i*3]=R*Math.sin(ph)*Math.cos(th);pos[i*3+1]=R*Math.cos(ph)+5;pos[i*3+2]=R*Math.sin(ph)*Math.sin(th);}
 const gm=new THREE.BufferGeometry();gm.setAttribute('position',new THREE.BufferAttribute(pos,3));scene.add(new THREE.Points(gm,new THREE.PointsMaterial({color:0xe8ffba,size:0.35,fog:false,transparent:true,opacity:0.7})));}

const spW=160,spH=40,sp=document.createElement('canvas');sp.width=spW;sp.height=spH;const spx=sp.getContext('2d');
const spillTex=new THREE.CanvasTexture(sp);spillTex.encoding=THREE.sRGBEncoding;
const spill=new THREE.Mesh(new THREE.PlaneGeometry(SX1-SX0+1.2,4.4),new THREE.MeshBasicMaterial({map:spillTex,transparent:true,blending:THREE.AdditiveBlending,depthWrite:false,opacity:0.75}));
spill.rotation.x=-Math.PI/2;spill.position.set(X0,0.015,2.2);scene.add(spill);
function updateSpill(){spx.globalCompositeOperation='source-over';spx.clearRect(0,0,spW,spH);spx.save();spx.translate(0,spH);spx.scale(1,-1);spx.drawImage(scr,0,0,spW,spH);spx.restore();
  spx.globalCompositeOperation='destination-in';const gr=spx.createLinearGradient(0,0,0,spH);gr.addColorStop(0,'rgba(0,0,0,1)');gr.addColorStop(1,'rgba(0,0,0,0)');spx.fillStyle=gr;spx.fillRect(0,0,spW,spH);spillTex.needsUpdate=true;}

/* ---------- People: 6 players at the column spots + 9 spectators ---------- */
const bodyMat=new THREE.MeshStandardMaterial({color:0x1c1d1a,roughness:0.9});
const ringGeo=new THREE.RingGeometry(0.3,0.39,40);
function addPerson(x,z,s,isPlayer){
  const grp=new THREE.Group(),inner=new THREE.Group();grp.add(inner);
  [-0.09,0.09].forEach(dx=>{const l=new THREE.Mesh(new THREE.CylinderGeometry(0.07,0.07,0.8,8),bodyMat);l.position.set(dx,0.4,0);inner.add(l);});
  const t=new THREE.Mesh(new THREE.CylinderGeometry(0.2,0.17,0.66,10),bodyMat);t.position.y=1.12;inner.add(t);
  const headMat=new THREE.MeshBasicMaterial({color:0x7d7f78});const h=new THREE.Mesh(new THREE.SphereGeometry(0.15,16,12),headMat);h.position.y=1.6;inner.add(h);
  grp.scale.setScalar(s);grp.position.set(x,0,z);scene.add(grp);
  const p={grp,inner,headMat,x,z,hx:x,hz:z,tx:x,tz:z,px:x,vx:0,wait:Math.random()*2,speed:0.55+Math.random()*0.5,walk:0,jump:0,lean:0,ring:null};
  if(isPlayer){p.ring=new THREE.Mesh(ringGeo,new THREE.MeshBasicMaterial({color:0xCAFE03,transparent:true,opacity:0.85}));p.ring.rotation.x=-Math.PI/2;p.ring.position.set(x,0.02,z);scene.add(p.ring);}
  people.push(p);
}
for(let i=0;i<6;i++)addPerson(colX(i),6.2,0.92+((i*37)%10)/60,true);
[[-8.5,7.6,0.9],[-7.8,8.4,0.7],[3.4,8.1,1],[5.4,7.1,0.95],[6.2,7.7,0.68],[9.2,9.3,1],[-4.6,10.6,0.97],[0.5,11.2,0.75],[11.6,8.5,0.95]].forEach(([x,z,s])=>addPerson(x,z,s,false));

/* ---------- Camera ---------- */
const DEF_T=new THREE.Vector3(X0+0.5,1.9,2.6);
const DEF_DIR=new THREE.Vector3(-0.36,0.3,1).normalize();
function defaultPos(){const a=camera.aspect||1.5;let d=7/(Math.tan(THREE.MathUtils.degToRad(camera.fov/2))*a);d=clamp(d,14,32);const p=DEF_T.clone().addScaledVector(DEF_DIR,d);p.y=Math.max(p.y,1.4);return p;}
let tween=null;
function flyTo(pos,tgt,dur){if(RM||!dur){camera.position.copy(pos);controls.target.copy(tgt);controls.update();return;}tween={p0:camera.position.clone(),t0:controls.target.clone(),p1:pos,t1:tgt,t:0,dur};}
W.view.reset=anim=>flyTo(defaultPos(),DEF_T.clone(),anim?1.1:0);
W.view.seat=i=>flyTo(new THREE.Vector3(colX(i),2.45,8.6),new THREE.Vector3(colX(i),2.35,0),1.2);
function resize(){const w=stage.clientWidth,h=stage.clientHeight;if(!w||!h)return;renderer.setSize(w,h,false);camera.aspect=w/h;camera.updateProjectionMatrix();}
new ResizeObserver(resize).observe(stage);resize();W.view.reset(false);

/* Click on the façade → cur.click(px,py) in screen-canvas pixels */
const ray=new THREE.Raycaster(),ndc=new THREE.Vector2();let downAt=null;
glCanvas.addEventListener('pointerdown',e=>{downAt=[e.clientX,e.clientY];});
glCanvas.addEventListener('pointerup',e=>{
  if(!downAt)return;const d=Math.hypot(e.clientX-downAt[0],e.clientY-downAt[1]);downAt=null;if(d>6||!cur.click)return;
  const r=glCanvas.getBoundingClientRect();ndc.set(((e.clientX-r.left)/r.width)*2-1,-((e.clientY-r.top)/r.height)*2+1);ray.setFromCamera(ndc,camera);
  const hit=ray.intersectObjects([wall,screen],false)[0];if(hit&&hit.object===screen&&hit.uv)cur.click(hit.uv.x*SW,(1-hit.uv.y)*SH);
});

/* ---------- UI ---------- */
const ideasEl=document.getElementById('ideas'),pitchEl=document.getElementById('pitch'),hudEl=document.getElementById('hud'),padEl=document.getElementById('pad');
let cur=null;
function renderIdeas(){
  ideasEl.innerHTML=CATS.map(c=>{const list=IDEAS.filter(d=>d.cat===c.id);if(!list.length)return '';
    return `<section class="cat"><div class="cat-head">${ic(c.icon)}<h3>${c.name}</h3><span>${c.desc}</span></div>
    <div class="cat-row">${list.map(d=>`<button class="idea" type="button" id="idea-${esc(d.id)}" data-id="${esc(d.id)}" aria-current="${d===cur}">${d.playable?'<span class="play" title="Playable"></span>':''}${esc(d.short)}${d.by?`<span class="by">${esc(d.by)}</span>`:''}</button>`).join('')}</div></section>`;}).join('');
}
const dots=n=>`<span class="dots" aria-label="${n} of 5">${[1,2,3,4,5].map(k=>`<i class="${k<=n?'on':''}"></i>`).join('')}</span>`;
const chip=(icon,label,main)=>`<span class="ichip${main?' main':''}">${ic(icon)}${esc(label)}</span>`;
function renderPitch(){
  const p=cur.pitch,cat=CATS.find(c=>c.id===cur.cat)||CATS[0],md=MODE[p.mode]||MODE.coop;
  const endless=/^(All|Always|Drop)/.test(p.round);
  pitchEl.innerHTML=`
    <div class="pitch-head"><div class="chips-top"><span class="chip">${ic(cat.icon)}${cat.name}</span><span class="chip ghost">${cur.playable?'Playable':'Animated sketch'}</span>${cur.by?`<span class="chip ghost">${ic('person')}${esc(cur.by)}</span>`:''}</div>
      <h2>${esc(owned(cur))}</h2><p class="tag">${esc(p.tagline)}</p></div>
    <div class="stats">
      <div class="stat">${ic(p.players[0])}<b>${esc(p.players[1])}</b><span>Players</span></div>
      <div class="stat">${ic(endless?'infinity':'clock')}<b>${esc(p.round)}</b><span>Round</span></div>
      <div class="stat">${ic(md[0])}<b>${md[1]}</b><span>Mode</span></div>
    </div>
    <div class="row"><span class="lbl">Input</span><div class="chips">${p.input.map((x,i)=>(i?'<span class="or">or</span>':'')+chip(x[0],x[1],i===0)).join('')}</div></div>
    <div class="row"><span class="lbl">Best for</span><div class="chips">${p.for.map(a=>AUD[a]?chip(AUD[a][0],AUD[a][1]):'').join('')}</div></div>
    <ol class="steps">${p.how.map(h=>`<li><span>${esc(h)}</span></li>`).join('')}</ol>
    <section class="trick"><svg class="sm" viewBox="0 0 321 322" aria-hidden="true"><use href="#tnt-smile"/></svg><p>${esc(p.trick)}</p></section>
    ${cur.panel?cur.panel():''}
    <div class="row"><span class="lbl">Needs</span><div class="chips">${p.needs.map(x=>chip(x[0],x[1])).join('')}</div></div>
    <ul class="qs">${p.open.map(q=>`<li>${ic('question')}<span>${esc(q)}</span></li>`).join('')}</ul>
    <section class="meters">
      <div class="meter">${ic('eye')}<span>Readable from 20 m</span>${dots(p.meters.read)}</div>
      <div class="meter">${ic('crowd')}<span>Crowd pull</span>${dots(p.meters.crowd)}</div>
      <div class="meter">${ic('wrench')}<span>Build effort</span>${dots(p.meters.effort)}</div>
    </section>`;
}
function updatePad(){padEl.hidden=!(cur.padVisible&&cur.padVisible());}
W.ui.refresh=()=>{renderPitch();updatePad();};
function select(id){
  const next=IDEAS.find(d=>d.id===id)||IDEAS[0];
  if(cur&&cur!==next&&cur.exit)cur.exit();
  cur=next;try{cur.init();}catch(err){console.error(err);}renderIdeas();renderPitch();updatePad();hudEl.textContent=cur.hud();
  glCanvas.style.cursor=cur.click?'pointer':'';
  try{localStorage.setItem('ww-idea',cur.id);}catch(e){}
}
ideasEl.addEventListener('click',e=>{const b=e.target.closest('[data-id]');if(b)select(b.dataset.id);});
pitchEl.addEventListener('click',e=>{const b=e.target.closest('[data-act]');if(b&&cur.panelClick){cur.panelClick(b.dataset.act,b);b.blur();}});
document.getElementById('btn-reset').addEventListener('click',()=>{if(!(cur.resetView&&cur.resetView()))W.view.reset(true);});
addEventListener('keydown',e=>{if(cur.key&&cur.key(e.key,true))e.preventDefault();});
addEventListener('keyup',e=>{if(cur.key)cur.key(e.key,false);});
padEl.addEventListener('pointerdown',e=>{const b=e.target.closest('[data-k]');if(!b||!cur.pad)return;e.preventDefault();cur.pad(b.dataset.k,true);});
padEl.addEventListener('pointerup',e=>{const b=e.target.closest('[data-k]');if(b&&cur.pad)cur.pad(b.dataset.k,false);});
padEl.addEventListener('pointerleave',()=>{if(cur.pad)cur.pad('soft',false);});

/* ---------- Loop ---------- */
let T=0,last=performance.now(),hudT=0;
function updatePeople(dt){
  const crowd=!!cur.crowd;
  people.forEach((p,k)=>{
    let tx=p.hx,tz=p.hz,sp=1.8;
    if(crowd){sp=p.speed;if(p.wait>0){p.wait-=dt;tx=p.x;tz=p.z;}else{tx=p.tx;tz=p.tz;}}
    const dx=tx-p.x,dz=tz-p.z,d=Math.hypot(dx,dz),moving=d>0.02;
    if(moving){const s=Math.min(d,sp*dt);p.x+=dx/d*s;p.z+=dz/d*s;p.walk+=dt*9;}
    else if(crowd&&p.wait<=0){p.wait=0.4+Math.random()*3.5;p.tx=SX0-0.6+Math.random()*(SX1-SX0+1.2);p.tz=2.6+Math.random()*5;}
    p.vx=p.vx*0.85+((p.x-p.px)/Math.max(dt,1e-3))*0.15;p.px=p.x;
    const col=cur.cast?cur.cast(k):null,st=(cur.fig&&cur.fig(k,T))||{};
    p.headMat.color.set(col||'#7d7f78');
    if(p.ring){p.ring.visible=!crowd&&!!col&&col!=='#3d3f3a';if(p.ring.visible)p.ring.material.color.set(col);}
    p.jump+=((st.jump||0)-p.jump)*Math.min(1,dt*12);p.lean+=((st.slump?0.32:0)-p.lean)*Math.min(1,dt*6);
    p.grp.position.set(p.x,0,p.z);p.inner.position.y=p.jump+(moving?Math.abs(Math.sin(p.walk))*0.05:0);p.inner.rotation.x=p.lean;
  });
}
function frame(now){
  const dt=Math.min(0.05,(now-last)/1000);last=now;T+=dt;
  updatePeople(dt);
  try{cur.update(dt);cur.draw(T);}catch(err){W.g.fillStyle='#300';W.g.fillRect(0,0,SW,SH);W.text('Idea crashed: '+err.message,SW/2,SH/2,28,'#fff',600);if(!frame.warned){console.error(err);frame.warned=true;}}
  screenTex.needsUpdate=true;updateSpill();
  hudT-=dt;if(hudT<=0){hudT=0.25;try{hudEl.textContent=cur.hud();}catch(e){}}
  if(tween){tween.t+=dt;const k=Math.min(1,tween.t/tween.dur),e=k<.5?4*k*k*k:1-Math.pow(-2*k+2,3)/2;camera.position.lerpVectors(tween.p0,tween.p1,e);controls.target.lerpVectors(tween.t0,tween.t1,e);camera.lookAt(controls.target);if(k>=1){tween=null;controls.update();}}
  else{const t=controls.target;t.x=clamp(t.x,-12,16);t.y=clamp(t.y,0.5,9);t.z=clamp(t.z,-0.5,9);controls.update();}
  renderer.render(scene,camera);requestAnimationFrame(frame);
}
let saved=null;try{saved=localStorage.getItem('ww-idea');}catch(e){}
const fromHash=location.hash.slice(1);
select((fromHash&&IDEAS.some(d=>d.id===fromHash))?fromHash:(saved||IDEAS[0].id));
addEventListener('hashchange',()=>{const id=location.hash.slice(1);if(IDEAS.some(d=>d.id===id))select(id);});
if(document.fonts&&document.fonts.load)document.fonts.load('800 40px Alegreya').then(()=>{drawBanner();bannerTex.needsUpdate=true;if(cur.fontsReady)cur.fontsReady();}).catch(()=>{});
requestAnimationFrame(frame);
})();
