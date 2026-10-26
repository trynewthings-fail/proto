/* ================= 5 · JUL: Snöflingefabriken (the snowflake factory) =================
   Why is no snowflake like another? Each one takes its own path through the cloud, and temperature and humidity
   decide how it grows (the Nakaya diagram). Left unit top: three cloud chambers where flakes grow live.
   Left unit bottom: the diagram itself. Where you stand sets the temperature, how close you are sets the humidity.
   Finished flakes fly behind the pier and are hung on the Christmas tree. Twelve flakes and the star lights up. */
(()=>{
const U0=F.units[0],U1=F.units[1];
const s={auto:true,speed:1,target:0,path:[],fill:false,party:0,made:0};
const ND={x:U0.ix0,y:F.trY1,w:U0.ix1-U0.ix0,h:F.HB};             // the Nakaya diagram in the bottom row
const T0=-.5,T1=-26;
const ZONES=[[0,-3.5,'plate'],[-3.5,-9,'needle'],[-9,-12.5,'sector'],[-12.5,-18,'star'],[-18,-23,'plate'],[-23,-26,'column']];
const ZL={plate:{sv:'Plattor',en:'Plates'},needle:{sv:'Nålar',en:'Needles'},sector:{sv:'Sektorer',en:'Sectors'},star:{sv:'Stjärnor',en:'Stars'},column:{sv:'Pelare',en:'Columns'}};
const ZC={plate:'#7fd8ff',needle:'#b5a6ff',sector:'#5fe0c0',star:'#CAFE03',column:'#ff9ad0'};
const tOfU=u=>lerp(T0,T1,u),hOfV=v=>v;                           // diagram: u 0..1 left→right = warm→cold, v 0..1 bottom→top = dry→humid
const dx=t=>ND.x+(t-T0)/(T1-T0)*ND.w,dy=h=>ND.y+ND.h-.12-h*(ND.h-.34);
const chambers=[0,1,2].map(c=>({c,fl:new Flake(81,160),habit:null,t:0,temp:-15,hum:.7,trail:[],who:null,drawn:null,dissolve:0}));
const tree=[],flying=[],falling=[];let snow=[];
/* ornament slots on the tree */
const TX=U1.cx,TTOP=.36,TBOT=2.78;
const SLOTS=(()=>{const o=[],rows=[[1,.17],[2,.32],[3,.48],[3,.66],[3,.84]];for(const[n,v]of rows)for(let i=0;i<n;i++){const y=lerp(TTOP,TBOT,v)+.1,half=lerp(.08,.85,v)*.78;o.push({x:TX+(n===1?0:lerp(-half,half,i/(n-1))),y});}return o.slice(0,12);})();
const LIGHTS=[...Array(46)].map((_,i)=>{const v=.08+.9*hash(i*3.1),half=lerp(.06,.86,v)*(.3+.7*hash(i+9));return{x:TX+(hash(i)<.5?-1:1)*half*hash(i+2),y:lerp(TTOP,TBOT,v),c:[C.lime,C.pink,C.cyan,C.amber,'#ffffff'][i%5],ph:hash(i+5)*TAU};});

function snapshot(ch){const c=document.createElement('canvas');c.width=c.height=200;const x=c.getContext('2d');drawFlake(x,ch.fl,ch.habit==='needle'||ch.habit==='column'?ch.habit:'plate',100,100,92,0);return c;}
function startFlake(ch){const nk=nakaya(ch.temp,ch.hum);ch.fl.reset(nk.beta,nk.gamma);ch.habit=nk.habit;ch.seed=nk.habit;ch.t=0;ch.trail=[];ch.dissolve=0;}
function release(ch){
  if(ch.fl.size<.25){ch.dissolve=1;return;}
  const free=SLOTS.findIndex((_,i)=>!tree.some(o=>o.slot===i)&&!flying.some(f=>f.slot===i));
  if(free<0){ch.dissolve=1;return;}
  const p=F.pane(ch.c,0);flying.push({img:snapshot(ch),slot:free,x0:p.cx,y0:p.cy,t:0,rot:0,habit:ch.seed,temp:ch.temp,size:ch.fl.size});
  s.made++;startFlake(ch);
}
function growStep(ch,dt){
  const nk=nakaya(ch.temp,ch.hum),seed=ch.seed||nk.habit;
  if(seed==='needle'||seed==='column')ch.fl.grow(dt*(ch.who||ch.drawn?.06:.03)*s.speed*(.5+ch.hum));
  else if(nk.habit!=='needle'&&nk.habit!=='column'){ch.fl.set(nk.beta,nk.gamma);ch.fl.step(Math.max(1,Math.round((ch.who||ch.drawn?6:3)*s.speed)));}
  ch.habit=seed==='needle'||seed==='column'?seed:nk.habit;
  ch.t+=dt;
}

function drawChamber(ch,t){
  const p=F.pane(ch.c,0);
  const bg=g.createLinearGradient(0,p.y,0,p.y+p.h);bg.addColorStop(0,'#081626');bg.addColorStop(1,'#10263c');g.fillStyle=bg;g.fillRect(p.x,p.y,p.w,p.h);
  g.save();clipPane(g,p);
  for(let i=0;i<14;i++){const ph=t*.05+i*.37,x=p.x+((hash(i+ch.c*20)+ph*.3)%1)*p.w,y=p.y+((hash(i*7+ch.c)+ph*.13)%1)*p.h;glowDot(g,x,y,.12+hash(i)*.1,'#9fc8ee',.06);}
  const cy=p.y+p.h*.47,R=.27,k=ch.dissolve>0?ch.dissolve:1;
  glowDot(g,p.cx,cy,R*1.6,'#7fd8ff',.12*k);
  drawFlake(g,ch.fl,ch.habit||'plate',p.cx,cy,R,t*.05+ch.c,k);
  g.restore();
  const col=ZC[ch.habit]||'#fff';
  txt(g,`${ch.temp.toFixed(0).replace('-','−')} °C · ${Math.round(ch.hum*100)} %`,p.cx,p.y+.11,.042,{mono:true,w:600,col:'#dff6ff'});
  txt(g,ch.habit?L(HABIT[ch.habit]):'',p.cx,p.y+p.h-.22,.075,{w:900,col});
  g.fillStyle='rgba(255,255,255,.15)';g.fillRect(p.x+.1,p.y+p.h-.12,p.w-.2,.016);g.fillStyle=col;g.fillRect(p.x+.1,p.y+p.h-.12,(p.w-.2)*clamp(ch.fl.size),.016);
  if(ch.who){g.fillStyle=C.lime;g.beginPath();g.arc(p.x+p.w-.07,p.y+.11,.018,0,TAU);g.fill();}
  else txt(g,'AUTO',p.x+p.w-.08,p.y+.11,.026,{mono:true,col:'#6d8aa6'});
}
function drawDiagram(t){
  g.save();g.beginPath();for(let c=0;c<3;c++){const p=F.pane(c,1);g.rect(p.x,p.y,p.w,p.h);}g.clip();
  g.fillStyle='#050b14';g.fillRect(ND.x,ND.y,ND.w,ND.h);
  for(const[a,b,k]of ZONES){const x0=dx(a),x1=dx(b);const gr=g.createLinearGradient(0,dy(1),0,dy(0));gr.addColorStop(0,rgba(ZC[k],.3));gr.addColorStop(1,rgba(ZC[k],.06));g.fillStyle=gr;g.fillRect(x0,dy(1),x1-x0,dy(0)-dy(1));
    if(k==='star'){g.fillStyle=rgba(ZC.sector,.12);g.fillRect(x0,dy(.45),x1-x0,dy(0)-dy(.45));}
    g.save();g.translate((x0+x1)/2,dy(1)+.13);txt(g,L(ZL[k]),0,0,(x1-x0)<.3?.034:.042,{w:800,col:ZC[k]});g.restore();}
  // axis
  g.strokeStyle='rgba(255,255,255,.3)';g.lineWidth=.004;g.beginPath();g.moveTo(ND.x,dy(0));g.lineTo(ND.x+ND.w,dy(0));g.stroke();
  for(const v of[-5,-10,-15,-20,-25]){const x=dx(v);g.beginPath();g.moveTo(x,dy(0));g.lineTo(x,dy(0)+.02);g.stroke();txt(g,v.toString().replace('-','−')+'°',x,dy(0)+.05,.03,{mono:true,col:'#9fb4c8'});}
  txt(g,L({sv:'FUKTIGT ↑',en:'HUMID ↑'}),ND.x+.03,dy(1)+.02,.028,{align:'left',mono:true,w:600,col:'#9fb4c8'});
  // paths of the three flakes
  chambers.forEach(ch=>{if(ch.trail.length<2)return;g.strokeStyle=rgba(ZC[ch.habit]||'#fff',.8);g.lineWidth=.008;g.lineJoin='round';g.beginPath();ch.trail.forEach(([tt,hh],i)=>i?g.lineTo(dx(tt),dy(hh)):g.moveTo(dx(tt),dy(hh)));g.stroke();
    const x=dx(ch.temp),y=dy(ch.hum);glowDot(g,x,y,.07,ZC[ch.habit]||'#fff',.6);g.fillStyle='#fff';g.beginPath();g.arc(x,y,.016,0,TAU);g.fill();txt(g,String(ch.c+1),x,y-.045,.03,{mono:true,w:600,col:'#fff'});});
  g.restore();
}
function drawTree(t){
  const z={x:U1.ix0,y:F.top,w:U1.ix1-U1.ix0,h:F.bot-F.top};
  g.save();g.beginPath();for(let c=3;c<6;c++)for(let r=0;r<2;r++){const p=F.pane(c,r);g.rect(p.x,p.y,p.w,p.h);}g.clip();
  const bg=g.createLinearGradient(0,z.y,0,z.y+z.h);bg.addColorStop(0,'#040a18');bg.addColorStop(.7,'#0b1a30');bg.addColorStop(1,'#16263c');g.fillStyle=bg;g.fillRect(z.x,z.y,z.w,z.h);
  for(let i=0;i<16;i++){const x=z.x+hash(i*1.7)*z.w,y=z.y+.2+hash(i*2.3)*1.2;glowDot(g,x,y,.08+hash(i)*.08,['#ffcf7a','#ff9a5a','#9fc8ff'][i%3],.08);}
  // falling snow
  for(const f of snow){f.y+=f.v/60;f.x+=Math.sin(t+f.ph)*.002;if(f.y>z.y+z.h)f.y=z.y-.05;g.fillStyle=rgba('#ffffff',f.a);g.beginPath();g.arc(f.x,f.y,f.r,0,TAU);g.fill();}
  // snowy ground and presents
  g.fillStyle='#e4eef8';g.beginPath();g.moveTo(z.x,TBOT+.05);for(let x=0;x<=z.w;x+=.05)g.lineTo(z.x+x,TBOT+.04-Math.sin(x*3)*.02);g.lineTo(z.x+z.w,z.y+z.h);g.lineTo(z.x,z.y+z.h);g.fill();
  // tree tiers
  g.fillStyle='#3a2212';g.fillRect(TX-.06,TBOT-.12,.12,.2);
  for(let k=4;k>=0;k--){const top=lerp(TTOP,TBOT-.55,k/5),bot=lerp(TTOP+.55,TBOT-.05,k/5+.08),half=lerp(.25,.9,k/4);
    const gr=g.createLinearGradient(TX-half,0,TX+half,0);gr.addColorStop(0,'#0d3a22');gr.addColorStop(.5,'#1f6a3b');gr.addColorStop(1,'#0b2f1c');g.fillStyle=gr;
    g.beginPath();g.moveTo(TX,top);for(let i=0;i<=10;i++){const u=i/10,x=TX-half+u*half*2,y=bot+Math.sin(u*Math.PI*5)*.035;g.lineTo(x,y);}g.closePath();g.fill();
    g.fillStyle='rgba(235,245,255,.9)';g.beginPath();for(let i=0;i<=10;i++){const u=i/10,x=TX-half+u*half*2,y=bot+Math.sin(u*Math.PI*5)*.035;g.moveTo(x,y);g.arc(x,y-.012,.028,Math.PI,0);}g.fill();}
  // lights
  for(const l of LIGHTS){const b=.5+.5*Math.sin(t*2.4+l.ph)+(s.party>0?.5:0);glowDot(g,l.x,l.y,.07,l.c,.35*b);g.fillStyle=l.c;g.beginPath();g.arc(l.x,l.y,.011,0,TAU);g.fill();}
  // ornaments: grown flakes
  for(const o of tree){const sl=SLOTS[o.slot],R=.085+.04*o.size;g.strokeStyle='rgba(255,255,255,.35)';g.lineWidth=.003;g.beginPath();g.moveTo(sl.x,sl.y-R-.05);g.lineTo(sl.x,sl.y-R*.6);g.stroke();
    glowDot(g,sl.x,sl.y,R*2,'#bfe9ff',.18+(s.party>0?.25*Math.abs(Math.sin(t*6+o.slot)):0));
    g.save();g.translate(sl.x,sl.y);g.rotate(Math.sin(t*.7+o.slot)*.3);g.drawImage(o.img,-R,-R,R*2,R*2);g.restore();}
  for(let i=0;i<12;i++)if(!tree.some(o=>o.slot===i)){const sl=SLOTS[i];g.strokeStyle='rgba(255,255,255,.18)';g.lineWidth=.004;g.setLineDash([.01,.01]);g.beginPath();g.arc(sl.x,sl.y,.05,0,TAU);g.stroke();g.setLineDash([]);}
  // presents
  for(const[x,w,h,c]of[[-.62,.26,.2,C.pink],[-.32,.2,.26,C.lime],[.3,.24,.18,C.cyan],[.58,.22,.24,C.amber]]){const px=TX+x,py=TBOT+.04-h;g.fillStyle=c;g.fillRect(px-w/2,py,w,h);g.fillStyle='rgba(0,0,0,.25)';g.fillRect(px-w/2,py,w*.25,h);g.fillStyle='#fff';g.fillRect(px-.012,py,.024,h);g.fillRect(px-w/2,py+h*.4,w,.02);}
  // the star
  const lit=tree.length>=12||s.party>0,sy=TTOP-.08,sr=lit?.13+.015*Math.sin(t*5):.1;
  if(lit){for(let i=0;i<12;i++){const a=i/12*TAU+t*.3;g.strokeStyle=rgba('#fff6c0',.25);g.lineWidth=.01;g.beginPath();g.moveTo(TX,sy);g.lineTo(TX+Math.cos(a)*.5,sy+Math.sin(a)*.5);g.stroke();}glowDot(g,TX,sy,.6,'#ffe9a0',.6);}
  g.fillStyle=lit?'#ffe46a':'#5a5530';g.beginPath();for(let i=0;i<10;i++){const a=-Math.PI/2+i*Math.PI/5,r=i%2?sr*.45:sr;g.lineTo(TX+Math.cos(a)*r,sy+Math.sin(a)*r);}g.closePath();g.fill();
  if(lit)smiley(g,TX,sy+.005,sr*.36,true,'#000',.2);
  g.restore();
  // counter
  const p=F.pane(5,0);txt(g,`${tree.length}/12`,p.cx,p.y+.14,.08,{w:900,col:'#fff'});txt(g,L({sv:'FLINGOR PÅ GRANEN',en:'FLAKES ON THE TREE'}),p.cx,p.y+.21,.026,{mono:true,w:600,col:C.lime});
  if(s.party>0){const k=clamp(s.party/2);txt(g,L({sv:'God jul!',en:'Merry Christmas!'}),U1.cx,F.pane(3,1).y+.25,.2,{w:900,italic:true,col:'#fff',glow:'#ffe46a',blur:30,alpha:k});
    txt(g,L({sv:`${tree.length} flingor, ingen den andra lik`,en:`${tree.length} flakes, no two alike`}),U1.cx,F.pane(3,1).y+.45,.05,{mono:true,w:600,col:C.lime,alpha:k});}
}
function drawFlying(t,dt){
  for(const f of flying){f.t+=dt/2.4;const sl=SLOTS[f.slot],k=ease(clamp(f.t)),x=lerp(f.x0,sl.x,k),y=lerp(f.y0,sl.y,k)-Math.sin(k*Math.PI)*.5,R=lerp(.27,.085+.04*f.size,k);
    glowDot(g,x,y,R*2,'#bfe9ff',.3);g.save();g.translate(x,y);g.rotate(f.t*4);g.drawImage(f.img,-R,-R,R*2,R*2);g.restore();
    if(f.t>=1){tree.push({img:f.img,slot:f.slot,size:f.size});f.done=1;}}
  for(let i=flying.length-1;i>=0;i--)if(flying[i].done)flying.splice(i,1);
  for(const f of falling){f.vy+=dt*.6;f.y+=f.vy*dt;f.x+=Math.sin(f.y*4+f.ph)*dt*.2;f.rot+=dt;g.save();g.translate(f.x,f.y);g.rotate(f.rot);g.globalAlpha=clamp(3.1-f.y);g.drawImage(f.img,-f.R,-f.R,f.R*2,f.R*2);g.restore();}
  for(let i=falling.length-1;i>=0;i--)if(falling[i].y>F.H+.2)falling.splice(i,1);
}
function padPathAt(u){const P=s.path;if(P.length<2)return null;const i=Math.min(P.length-2,Math.floor(u*(P.length-1))),f=u*(P.length-1)-i;return[lerp(P[i][0],P[i+1][0],f),lerp(P[i][1],P[i+1][1],f)];}

const idea={
  id:'jul',n:5,steam:'M',col:'#ff6b6b',
  name:{sv:'Snöflingefabriken',en:'The snowflake factory'},sub:{sv:'Jul: väx en egen snöflinga',en:'Christmas: grow your own flake'},
  q:{sv:'Varför är ingen snöflinga den andra lik?',en:'Why are no two snowflakes alike?'},
  pitch:{tagline:{sv:'Varje snöflinga tar sin egen väg genom molnet, och temperatur och fukt avgör hur den växer. Här är du vägen: var du står bestämmer temperaturen, hur nära du är bestämmer fukten. Din flinga växer live i ditt moln och hängs sedan upp i granen. Tolv flingor och stjärnan tänds.',en:'Every snowflake takes its own path through the cloud, and temperature and humidity decide how it grows. Here you are the path: where you stand sets the temperature, how close you are sets the humidity. Your flake grows live in your cloud, then gets hung on the tree. Twelve flakes and the star lights up.'},
    how:[{sv:'Ställ dig framför ett moln. Gå åt höger för kallare, kom närmare för fuktigare.',en:'Stand in front of a cloud. Walk right for colder, come closer for more humid.'},
      {sv:'Se flingan växa: plattor, nålar eller stjärnor beroende på var du är i diagrammet.',en:'Watch the flake grow: plates, needles or stars depending on where you are on the diagram.'},
      {sv:'När den är klar flyger den bakom muren och hängs i granen. Fyll granen tillsammans.',en:'When it is done it flies behind the pier onto the tree. Fill the tree together.'}],
    trick:{sv:'Vänster enhet är fabriken: tre moln uppe, diagrammet nere. Flingorna flyger bakom muren till granen, som står i höger enhet som en riktig julgran bakom ett spröjsat fönster.',en:'The left unit is the factory: three clouds up top, the diagram below. Flakes fly behind the pier to the tree, which stands in the right unit like a real Christmas tree behind a divided window.'},
    chips:[['cam',{sv:'Djupkamera: position och avstånd',en:'Depth cam: position and distance'}],['pencil',{sv:'Webb: rita flingans väg',en:'Web: draw the flake\'s path'}],['flake',{sv:'Riktig tillväxtmodell',en:'A real growth model'}]],
    fake:{sv:'Ingen extern data. Tillväxten är Reiters modell (2005)',en:'No external data. Growth is Reiter\'s model (2005)'}},
  init(){tree.length=0;flying.length=0;falling.length=0;s.party=0;s.path=[];
    snow=[...Array(70)].map(()=>({x:U1.ix0+Math.random()*(U1.ix1-U1.ix0),y:Math.random()*F.H,v:.08+Math.random()*.15,r:.004+Math.random()*.008,a:.3+Math.random()*.5,ph:Math.random()*TAU}));
    chambers.forEach((ch,i)=>{ch.temp=[-2,-15,-6][i];ch.hum=[.6,.85,.7][i];ch.drawn=null;ch.who=null;startFlake(ch);});
    // a few flakes already on the tree, so it never looks empty
    for(let i=0;i<4;i++){const ch={c:0,fl:new Flake(61,120),seed:null},nk=nakaya([-15,-2,-14,-11][i],[.9,.7,.8,.5][i]);ch.fl.reset(nk.beta,nk.gamma);ch.seed=ch.habit=nk.habit;for(let k=0;k<40;k++)ch.fl.step(40);if(nk.habit==='needle'||nk.habit==='column')ch.fl.grow(1);tree.push({img:snapshot(ch),slot:i,size:.8});}
  },
  update(dt,t){
    if(s.party>0){s.party-=dt;if(s.party<=0){for(const o of tree){const sl=SLOTS[o.slot];falling.push({img:o.img,x:sl.x,y:sl.y,vy:0,R:.1,rot:0,ph:Math.random()*TAU});}tree.length=0;}}
    else if(tree.length>=12)s.party=9;
    for(const ch of chambers){
      if(ch.dissolve>0){ch.dissolve-=dt*.8;if(ch.dissolve<=0){ch.dissolve=0;startFlake(ch);}continue;}
      const col=F.cols[ch.c],p=CROWD.people.filter(q=>q.x>U0.x0-.2&&q.x<U0.x1+.2&&q.z<4.5&&F.colAt(q.x)===ch.c).sort((a,b)=>a.z-b.z)[0];
      const had=ch.who;ch.who=p||null;
      if(ch.drawn){ch.drawn.t+=dt/14;const q=padPathAt(clamp(ch.drawn.t));if(q){ch.temp=tOfU(q[0]);ch.hum=hOfV(q[1]);}if(ch.drawn.t>=1){ch.drawn=null;release(ch);continue;}}
      else if(p){ch.temp=lerp(T0,T1,clamp((p.x-U0.ix0)/(U0.ix1-U0.ix0)));ch.hum=clamp(1.15-p.z/3.6);}
      else if(had&&ch.fl.size>.25){release(ch);continue;}
      else if(s.auto){const a=t*.05+ch.c*2.1;ch.temp=lerp(T0,T1,.5+.45*Math.sin(a)*Math.cos(a*.37));ch.hum=.55+.4*Math.sin(a*1.3+ch.c);}
      else continue;
      growStep(ch,dt);
      if(!ch.trail.length||Math.hypot(ch.trail[ch.trail.length-1][0]-ch.temp,(ch.trail[ch.trail.length-1][1]-ch.hum)*20)>.3)ch.trail.push([ch.temp,ch.hum]);if(ch.trail.length>80)ch.trail.shift();
      if(ch.fl.size>=.97||ch.t>(ch.who?60:28))release(ch);
    }
  },
  draw(t){const dt=1/60;chambers.forEach(ch=>drawChamber(ch,t));drawDiagram(t);drawTree(t);drawFlying(t,dt);this.pad&&frameNo%3===0&&this.pad.draw();},
  hud(){const mine=chambers.find(c=>c.who);return `${tree.length}/12 ${L({sv:'flingor på granen',en:'flakes on the tree'})} · ${s.made} ${L({sv:'gjorda',en:'made'})}`+(mine?` · ${L({sv:'din flinga',en:'your flake'})}: ${L(ZL[mine.habit]||{})} ${Math.round(mine.temp)} °C`:'');},
  controls(){
    UI.group({sv:'Rita flingans väg genom molnet',en:'Draw the flake\'s path through the cloud'});
    const self=this;let drawing=false;
    this.pad=UI.pad({aspect:'1.55',draw(c,W,H){
      c.clearRect(0,0,W,H);c.fillStyle='#050b14';c.fillRect(0,0,W,H);
      for(const[a,b,k]of ZONES){const x0=(a-T0)/(T1-T0)*W,x1=(b-T0)/(T1-T0)*W;c.fillStyle=rgba(ZC[k],.22);c.fillRect(x0,0,x1-x0,H);c.fillStyle=ZC[k];c.font="600 10px 'IBM Plex Mono',monospace";c.textAlign='center';c.fillText(L(ZL[k]),(x0+x1)/2,14);}
      c.fillStyle='#9fb4c8';c.textAlign='left';c.fillText(L({sv:'fuktigt',en:'humid'}),4,28);c.fillText(L({sv:'torrt',en:'dry'}),4,H-6);c.textAlign='right';c.fillText('−1°',W-4,H-6);c.textAlign='left';
      c.textAlign='right';c.fillText('−25°',W-4,28);c.textAlign='left';c.fillText('',0,0);
      if(s.path.length>1){c.strokeStyle='#fff';c.lineWidth=3;c.lineJoin='round';c.lineCap='round';c.beginPath();s.path.forEach(([u,v],i)=>{const x=u*W,y=(1-v)*H;i?c.lineTo(x,y):c.moveTo(x,y);});c.stroke();}
      const ch=chambers[s.target];if(ch.drawn){const q=padPathAt(clamp(ch.drawn.t));if(q){c.fillStyle=C.lime;c.beginPath();c.arc(q[0]*W,(1-q[1])*H,6,0,TAU);c.fill();}}
      if(!s.path.length){c.fillStyle='rgba(255,255,255,.45)';c.textAlign='center';c.font="12px 'IBM Plex Mono',monospace";c.fillText(L({sv:'Rita en linje här',en:'Draw a line here'}),W/2,H/2);}
    },on(type,u,v){if(type==='down'){drawing=true;s.path=[[u,1-v]];}else if(type==='drag'&&drawing){const l=s.path[s.path.length-1];if(Math.hypot(l[0]-u,l[1]-(1-v))>.01)s.path.push([u,1-v]);}else if(type==='up'){drawing=false;if(s.path.length>3){const ch=chambers[s.target];startFlake(ch);ch.drawn={t:0};}}self.pad.draw();}});
    UI.seg({obj:s,key:'target',label:{sv:'Väx i moln',en:'Grow in cloud'},options:[[0,'1'],[1,'2'],[2,'3']]});
    UI.group(null,'row');
    UI.button({label:{sv:'Exempel: stjärna',en:'Example: star'},onClick:()=>{s.path=[[.02,.4],[.2,.55],[.4,.7],[.55,.9],[.6,.95]];const ch=chambers[s.target];startFlake(ch);ch.drawn={t:0};}});
    UI.button({label:{sv:'Häng upp nu',en:'Hang them now'},onClick:()=>chambers.forEach(release)});
    UI.button({label:{sv:'Fyll granen',en:'Fill the tree'},cls:'hot',onClick:()=>{for(let i=0;i<12;i++)if(!tree.some(o=>o.slot===i)){const ch={c:0,fl:new Flake(61,120)},nk=nakaya(-2-hash(i+s.made)*22,.4+hash(i*3)*.6);ch.fl.reset(nk.beta,nk.gamma);ch.seed=ch.habit=nk.habit;for(let k=0;k<40;k++)ch.fl.step(40);if(nk.habit==='needle'||nk.habit==='column')ch.fl.grow(1);tree.push({img:snapshot(ch),slot:i,size:.8});}}});
    UI.group();
    UI.slider({obj:s,key:'speed',label:{sv:'Tillväxtfart',en:'Growth speed'},min:.3,max:3,step:.1,fmt:v=>v.toFixed(1)+'×'});
    UI.toggle({obj:s,key:'auto',label:{sv:'Molnen växer själva när ingen är där',en:'Clouds grow on their own when nobody is there'}});
    UI.note({sv:'Kameran: din plats längs vänster enhet är temperaturen (vänster −1°, höger −25°), ditt avstånd är fukten. Gå därifrån så hängs flingan upp.',en:'The camera: your place along the left unit is the temperature (left −1°, right −25°), your distance is the humidity. Walk away and the flake gets hung up.'});
  }
};
IDEAS.push(idea);
})();
