/* ================= Main: tabs, views, the loop ================= */
const out=document.getElementById('out'),octx=out.getContext('2d'),stage=document.getElementById('stage'),v3=document.getElementById('v3');
let cur=null,view='bild',T0=performance.now(),last=T0,frameNo=0;
const VIEWS=[['bild',{sv:'Bild',en:'Image'}],['ramar',{sv:'Bild + ramar',en:'Image + frames'}],['3d',{sv:'Fönster 3D',en:'Window 3D'}]];

function fitOut(){const r=stage.getBoundingClientRect(),d=Math.min(2,devicePixelRatio||1);out.width=Math.max(2,Math.round(r.width*d));out.height=Math.max(2,Math.round(r.height*d));}
new ResizeObserver(fitOut).observe(stage);

/* where the screen canvas sits inside the output canvas */
function placement(){
  const W=out.width,H=out.height;
  const k=view==='ramar'?.8:1,s=Math.min(W/F.W,H/F.H)*k;
  return {s,ox:(W-F.W*s)/2,oy:view==='ramar'?(H-F.H*s)*.36:(H-F.H*s)/2};
}
function drawFrames(c,{s,ox,oy}){
  c.save();c.translate(ox,oy);c.scale(s,s);
  const W=out.width/s,H=out.height/s,X0=-ox/s,Y0=-oy/s;
  const wall=c.createLinearGradient(0,Y0,0,Y0+H);wall.addColorStop(0,'#2a2925');wall.addColorStop(1,'#1d1c19');
  c.fillStyle=wall;c.beginPath();c.rect(X0,Y0,W,H);
  for(const u of F.units)c.rect(u.x1,0,u.x0-u.x1,F.H);   // reversed rects cut the holes
  c.fill('evenodd');
  c.fillStyle='#121210';c.fillRect(X0,F.H+F.SILL,W,H);
  c.fillStyle='#3a3b3c';c.fillRect(-.06,F.H,F.W+.12,.05);
  c.fillStyle='#16181b';
  for(const u of F.units){
    c.fillRect(u.x0,0,u.x1-u.x0,F.K);c.fillRect(u.x0,F.bot,u.x1-u.x0,F.K);c.fillRect(u.x0,0,F.K,F.H);c.fillRect(u.ix1,0,F.K,F.H);
    c.fillRect(u.ix0,F.trY0,u.ix1-u.ix0,F.TR);
    for(let k=1;k<3;k++)c.fillRect(u.ix0+k*F.PW+(k-1)*F.MU,0,F.MU,F.H);
  }
  c.fillStyle='rgba(255,255,255,.05)';for(const p of F.panes)c.fillRect(p.x,p.y,p.w,.012);
  c.restore();
}
let styleOn=true;
function present(){
  const T=(performance.now()-T0)/1000,src=styleOn?POST.run(cur.post,T):scr;
  if(view==='3d'){View3D.render(T,src);return;}
  const P=placement();
  octx.setTransform(1,0,0,1,0,0);octx.fillStyle='#000';octx.fillRect(0,0,out.width,out.height);
  octx.imageSmoothingQuality='high';
  octx.drawImage(src,P.ox,P.oy,F.W*P.s,F.H*P.s);
  if(view==='ramar')drawFrames(octx,P);
}
function setView(v){
  view=v;v3.hidden=v!=='3d';out.hidden=v==='3d';
  document.querySelectorAll('#viewseg button').forEach(b=>b.setAttribute('aria-pressed',b.dataset.v===v));
  setTip();
}
function setTip(){
  document.getElementById('tip').textContent=view==='3d'?L({sv:'Dra för att snurra · scrolla för att zooma',en:'Drag to orbit · scroll to zoom'}):
    cur&&cur.pointer?L(cur.pointerTip||{sv:'Klicka och dra i bilden',en:'Click and drag on the image'}):
    CROWD.mouse?L({sv:'Musen är en besökare: rör den för att gå, håll nere för att vinka',en:'Your mouse is a visitor: move to walk, hold to wave'}):'';
}

/* the mouse over the image: a visitor, or a pointer for ideas that take drawing */
function toFacade(e){const r=out.getBoundingClientRect(),d=out.width/r.width,P=placement();return[((e.clientX-r.left)*d-P.ox)/P.s,((e.clientY-r.top)*d-P.oy)/P.s];}
let you=null,ptrDown=false;
stage.addEventListener('pointerdown',e=>{if(view==='3d')return;ptrDown=true;stage.setPointerCapture(e.pointerId);const[x,y]=toFacade(e);
  if(cur.pointer)cur.pointer('down',x,y);else if(you)you.wave=1e9;});
stage.addEventListener('pointermove',e=>{if(view==='3d')return;const[x,y]=toFacade(e);
  if(cur.pointer){cur.pointer(ptrDown?'drag':'move',x,y);return;}
  if(!CROWD.mouse)return;
  if(!you||!CROWD.people.includes(you)){you=crowdAdd({you:true,kid:false,h:1.75,z:1.2,x});}
  you.x=clamp(x,PX0,PX1);you.leave=0;});
stage.addEventListener('pointerup',e=>{ptrDown=false;if(view==='3d')return;const[x,y]=toFacade(e);if(cur.pointer)cur.pointer('up',x,y);else if(you)you.wave=.4;});
stage.addEventListener('pointerleave',()=>{ptrDown=false;if(you)you.leave=.01;if(cur&&cur.pointer)cur.pointer('leave',0,0);});

/* tabs, pitch card and panel */
function buildTabs(){
  const nav=document.getElementById('tabs');nav.innerHTML='';
  for(const id of IDEAS){
    const b=document.createElement('button');b.className='tab';b.role='tab';b.id='tab-'+id.id;b.style.setProperty('--c',id.col);
    b.innerHTML=`<span class="num">${id.n}</span><span class="nm"><b>${esc(L(id.name))}</b><small>${esc(L(id.sub))}</small></span>`;
    b.setAttribute('aria-selected',cur===id);b.addEventListener('click',()=>select(id.id));nav.append(b);
  }
  const vs=document.getElementById('viewseg');vs.innerHTML='';
  for(const[v,l]of VIEWS){const b=document.createElement('button');b.dataset.v=v;b.textContent=L(l);b.addEventListener('click',()=>setView(v));vs.append(b);}
  const sb=document.getElementById('stylebtn');sb.textContent=L({sv:'Stil',en:'Style'});sb.setAttribute('aria-pressed',styleOn);
  sb.onclick=()=>{styleOn=!styleOn;sb.setAttribute('aria-pressed',styleOn);};
  setView(view);
}
function buildPitch(){
  const p=cur.pitch,el=document.getElementById('pitch');el.style.setProperty('--c',cur.col);
  el.innerHTML=`<div><h2>${esc(L(cur.name))}</h2><p class="q">${esc(L(cur.q))}</p><p>${esc(L(p.tagline))}</p>
    <div class="chips">${p.chips.map(([i,l])=>`<span class="chip">${icon(i)}${esc(L(l))}</span>`).join('')}<span class="chip fake">${icon('data')}${esc(L(p.fake))}</span></div></div>
    <div><p class="lbl">${esc(L({sv:'Så funkar det',en:'How it works'}))}</p><ol class="steps">${p.how.map(h=>`<li><span>${esc(L(h))}</span></li>`).join('')}</ol>
    <p class="lbl" style="margin-top:12px">${esc(L({sv:'Fönstren',en:'The windows'}))}</p><p>${esc(L(p.trick))}</p></div>`;
}
function buildPanel(){UI.begin(document.getElementById('ctl'));cur.controls();buildPlazaControls();}
function select(id,keepState){
  const n=IDEAS.find(i=>i.id===id)||IDEAS[0];
  if(cur&&cur.exit)cur.exit();
  cur=n;if(!keepState)cur.init();
  document.querySelectorAll('.tab').forEach(b=>b.setAttribute('aria-selected',b.id==='tab-'+cur.id));
  buildPitch();buildPanel();setTip();
  try{history.replaceState(null,'','#'+cur.id);}catch(e){}
  try{localStorage.setItem('fl-tab',cur.id);}catch(e){}
}
function setLang(l){
  LANG=l;try{localStorage.setItem('fl-lang',l);}catch(e){}
  document.documentElement.lang=l;
  document.querySelectorAll('.lang button').forEach(b=>b.setAttribute('aria-pressed',b.dataset.l===l));
  const t={sub:{sv:'Exploratoriet · 12 rutor · 5 idéer att pitcha',en:'Exploratoriet · 12 panes · 5 ideas to pitch'},'t-ctl':{sv:'Kontroller',en:'Controls'},'t-ctl2':{sv:'webbkontroll för pitchen',en:'web controller for the pitch'},'t-cam':{sv:'Djupkamera',en:'Depth camera'},'t-cam2':{sv:'simulerar 2 × Orbbec',en:'simulates 2 × Orbbec'}};
  for(const k in t)document.getElementById(k).textContent=L(t[k]);
  document.getElementById('fs').setAttribute('aria-label',L({sv:'Helskärm',en:'Fullscreen'}));
  buildTabs();if(cur)select(cur.id,true);
}
document.querySelectorAll('.lang button').forEach(b=>b.addEventListener('click',()=>setLang(b.dataset.l)));
document.getElementById('fs').addEventListener('click',()=>{try{document.fullscreenElement?document.exitFullscreen():stage.requestFullscreen().catch(()=>{});}catch(e){}});

let rafPending=false;
function schedule(){if(!rafPending){rafPending=true;requestAnimationFrame(t=>{rafPending=false;loop(t);});}}
function loop(now){
  const dt=Math.min(.05,Math.max(0,(now-last)/1000));last=now;const T=(now-T0)/1000;frameNo++;
  if(you&&you.leave>0){you.leave+=dt;if(you.leave>.6){crowdRemove(you);you=null;}}
  if(you&&!CROWD.mouse){crowdRemove(you);you=null;}
  crowdUpdate(dt);
  try{
    cur.update(dt,T);
    clearScr('#000');cur.draw(T);
    if(cur.err){cur.err=null;}
  }catch(e){if(!cur.err){cur.err=e;console.error(e);}g.setTransform(PPM,0,0,PPM,0,0);txt(g,'⚠ '+e.message,F.W/2,F.H/2,.08,{col:'#f55',mono:true});}
  g.setTransform(1,0,0,1,0,0);g.globalAlpha=1;g.globalCompositeOperation='source-over';g.shadowBlur=0;
  present();
  Plaza.draw(T);
  if(frameNo%8===0){const h=cur.hud?cur.hud():'';const el=document.getElementById('hud');if(el.textContent!==h)el.textContent=h;cur.tick&&cur.tick();}
  schedule();
}
/* for headless checks: run n frames by hand when the page is in a hidden tab */
window.__pump=async n=>{for(let i=0;i<n;i++){loop(performance.now());await new Promise(r=>setTimeout(r,16));}};

function boot(){
  setLang(LANG);
  let start=(location.hash||'').slice(1);
  if(!IDEAS.some(i=>i.id===start)){try{start=localStorage.getItem('fl-tab')||'';}catch(e){start='';}}
  select(IDEAS.some(i=>i.id===start)?start:IDEAS[0].id);
  fitOut();last=performance.now();schedule();
}
window.addEventListener('hashchange',()=>{const h=location.hash.slice(1);if(cur&&h!==cur.id&&IDEAS.some(i=>i.id===h))select(h);});
(document.fonts&&document.fonts.ready?document.fonts.ready:Promise.resolve()).then(boot,boot);
