/* ================= 5 · JUL: Snöflingefabriken (the snowflake factory), in backlit cut paper =================
   The game: a snowflake falls down the left unit above you, and you steer it with your body.
   The three columns are three temperatures (−2°, −5°, −15°), and each grows a different crystal: plates, needles, stars.
   Your path between the columns makes your flake one of a kind. When it lands it flies behind the pier
   and is hung on the tree in the right unit. Twelve flakes and the star lights up. Growth: Reiter's model (45-snow.js). */
(()=>{
const U0=F.units[0],U1=F.units[1];
const s={auto:true,speed:1,path:[],party:0,made:0};
const LANES=[{t:-2,habit:'plate',col:'#2d5a9e',hi:'#8fc4ff'},{t:-5,habit:'needle',col:'#5a3f9a',hi:'#c3a8ff'},{t:-15,habit:'star',col:'#1d6e7e',hi:'#8fe6e0'}];
const TOPY=.46,LANDY=F.bot-.3,FALL=.15;                         // metres; ~16 s from top to bottom
const flakes=[],tree=[],falling=[];let snow=[];
const TX=U1.cx,TTOP=.42,TBOT=2.8;
const SLOTS=(()=>{const o=[],rows=[[1,.16],[2,.32],[3,.48],[3,.66],[3,.84]];for(const[n,v]of rows)for(let i=0;i<n;i++){const y=lerp(TTOP,TBOT,v)+.1,half=lerp(.08,.85,v)*.76;o.push({x:TX+(n===1?0:lerp(-half,half,i/(n-1))),y});}return o.slice(0,12);})();
const LIGHTS=[...Array(30)].map((_,i)=>{const v=.1+.86*hash(i*3.1),half=lerp(.06,.84,v)*(.25+.7*hash(i+9));return{x:TX+(hash(i)<.5?-1:1)*half,y:lerp(TTOP,TBOT,v),ph:hash(i+5)*TAU};});
const laneOf=x=>clamp(F.colAt(x),0,2);
const LX0=U0.ix0+.13,LX1=U0.ix1-.13;
const habitName=k=>L(HABIT[k]||{});

function spawn(o){if(flakes.filter(f=>f.st==='fall').length>=3)return null;const f=Object.assign({fl:new Flake(81,160),x:o.x??F.cols[1].cx,y:TOPY,st:'fall',t:0,trail:[],lanes:new Set(),owner:null,path:null,wob:Math.random()*TAU},o);
  const ln=LANES[laneOf(f.x)],nk=nakaya(ln.t,.8);f.fl.reset(nk.beta,nk.gamma);flakes.push(f);return f;}
function snapshot(fl){const c=document.createElement('canvas');c.width=c.height=200;const x=c.getContext('2d');drawPaperFlake(x,fl,100,100,88,0);return c;}
function freeSlot(){return SLOTS.findIndex((_,i)=>!tree.some(o=>o.slot===i)&&!flakes.some(f=>f.slot===i));}
function stepFlake(f,dt,t){
  f.t+=dt;
  if(f.st==='fall'){
    if(f.owner&&!CROWD.people.includes(f.owner))f.owner=null;
    const want=f.owner?f.owner.x:f.path?lerp(LX0,LX1,f.path((f.y-TOPY)/(LANDY-TOPY))):F.cols[1].cx+Math.sin(t*.23+f.wob)*.75;
    f.x=approach(f.x,clamp(want,LX0,LX1),2.2,dt);f.y+=FALL*s.speed*dt;
    const ln=laneOf(f.x),L0=LANES[ln],hum=f.owner?clamp(1.15-f.owner.z/3.6,.35,1):.8,nk=nakaya(L0.t,hum);f.lanes.add(L0.habit);f.habit=L0.habit;
    if(L0.habit==='needle')f.fl.grow(dt*.07*s.speed);else{f.fl.set(nk.beta,nk.gamma);f.fl.step(Math.max(1,Math.round(3*s.speed)));}
    const l=f.trail[f.trail.length-1];if(!l||Math.hypot(l[0]-f.x,l[1]-f.y)>.035)f.trail.push([f.x,f.y]);
    if(f.y>=LANDY){f.st='land';f.t=0;}
  }else if(f.st==='land'){if(f.t>2.2){const sl=freeSlot();if(sl<0){f.st='gone';return;}f.slot=sl;f.img=snapshot(f.fl);f.st='fly';f.t=0;f.x0=f.fx=f.x;f.y0=f.fy=f.y;s.made++;}}
  else if(f.st==='fly'){const k=ease(clamp(f.t/2.4)),sl=SLOTS[f.slot];f.fx=lerp(f.x0,sl.x,k);f.fy=lerp(f.y0,sl.y,k)-Math.sin(k*Math.PI)*.7;if(f.t>=2.4){tree.push({img:f.img,slot:f.slot,size:f.fl.size});f.st='gone';}}
}
const R=f=>.05+.19*clamp(f.fl.size);
/* ---------- left unit: the cloud with three lanes ---------- */
function drawLane(c,t){
  const L0=LANES[c],top=F.pane(c,0),bot=F.pane(c,1);
  for(const p of[top,bot]){const gr=g.createLinearGradient(0,top.y,0,bot.y+bot.h);gr.addColorStop(0,L0.hi);gr.addColorStop(.25,L0.col);gr.addColorStop(1,mix(L0.col,'#06080f',.55));g.fillStyle=gr;g.fillRect(p.x,p.y,p.w,p.h);}
  // torn-paper cloud layers at the top
  g.save();clipPane(g,top);
  for(let k=0;k<3;k++){g.fillStyle=mix('#ffffff',L0.hi,k*.35);g.shadowColor='rgba(0,0,0,.4)';g.shadowBlur=8;g.shadowOffsetY=5;g.beginPath();g.moveTo(top.x,top.y);
    for(let x=0;x<=top.w+.02;x+=.03){const y=top.y+.2+k*.07+Math.sin((x+c)*9+k*2+t*.3)*.02+(hash(Math.floor(x*33)+k*50+c*9)-.5)*.018;g.lineTo(top.x+x,y);}g.lineTo(top.x+top.w,top.y);g.closePath();g.fill();}
  g.restore();
  // the lane's tag: temperature and what grows here
  const cx=top.cx;txt(g,`−${Math.abs(L0.t)}°`,cx,top.y+.12,.1,{w:900,col:'#1d2440'});
  txt(g,habitName(L0.habit).toUpperCase(),cx,top.y+.37,.045,{mono:true,w:600,col:'#fff',ls:.1});
  // a small cut-paper icon of the habit
  g.save();g.translate(cx,top.y+.5);g.fillStyle='rgba(255,255,255,.85)';g.shadowColor='rgba(0,0,0,.4)';g.shadowBlur=6;g.shadowOffsetY=3;
  if(L0.habit==='needle'){for(const a of[0,.5,-.5]){g.save();g.rotate(a);g.fillRect(-.006,-.05,.012,.1);g.restore();}}
  else{g.beginPath();for(let i=0;i<6;i++){const a=i/6*TAU;if(L0.habit==='plate')g.lineTo(Math.cos(a)*.04,Math.sin(a)*.04);else{g.moveTo(0,0);g.lineTo(Math.cos(a)*.05,Math.sin(a)*.05);g.lineTo(Math.cos(a+.18)*.03,Math.sin(a+.18)*.03);g.lineTo(0,0);}}g.fill();}
  g.restore();
}
function drawHint(t){
  if(flakes.some(f=>f.owner))return;
  const p=F.pane(1,1),y=p.y+p.h*.64,k=.65+.35*Math.sin(t*2.5);
  g.fillStyle='rgba(8,10,20,.55)';rrect(g,U0.ix0+.04,y-.3,U0.ix1-U0.ix0-.08,.5,.04);g.fill();
  // a person and arrows across the three lanes
  g.save();g.translate(p.cx+Math.sin(t*1.2)*.5,y-.05);g.fillStyle='#fff8ee';g.beginPath();g.arc(0,-.12,.035,0,TAU);g.fill();rrect(g,-.03,-.08,.06,.12,.02);g.fill();g.fillRect(-.03,.03,.022,.08);g.fillRect(.008,.03,.022,.08);g.restore();
  for(const d of[-1,1]){g.fillStyle=rgba('#fff8ee',k);g.beginPath();const x=p.cx+d*.75;g.moveTo(x+d*.07,y-.05);g.lineTo(x,y-.11);g.lineTo(x,y+.01);g.fill();}
  txt(g,L({sv:'Styr flingan med kroppen',en:'Steer the flake with your body'}),p.cx,y+.12,.075,{w:900,col:'#fff8ee'});
}
function drawFlakes(t){
  for(const f of flakes){
    if(f.st==='fall'||f.st==='land'){
      g.strokeStyle='rgba(255,248,238,.55)';g.lineWidth=.008;g.setLineDash([.012,.02]);g.beginPath();f.trail.forEach(([x,y],i)=>i?g.lineTo(x,y):g.moveTo(x,y));g.stroke();g.setLineDash([]);
      const land=f.st==='land',sc=land?1+.25*ease(clamp(f.t/.5)):1,rr=R(f)*sc;
      glowDot(g,f.x,f.y,rr*2.2,'#fff3d8',land?.5:.28);
      drawPaperFlake(g,f.fl,f.x,f.y,rr,Math.sin(t*.8+f.wob)*.25);
      if(f.owner&&!land){txt(g,L({sv:'DIN',en:'YOURS'}),f.x,f.y-rr-.06,.035,{mono:true,w:600,col:'#fff8ee'});}
      if(land){const names=[...f.lanes].map(habitName),p=F.pane(laneOf(f.x),1);
        txt(g,L({sv:'Din flinga!',en:'Your flake!'}),U0.cx,p.y+.2,.1,{w:900,italic:true,col:'#fff8ee',alpha:clamp(f.t*3)});
        txt(g,names.join(' + '),U0.cx,p.y+.32,.05,{mono:true,w:600,col:'#fff8ee',alpha:clamp(f.t*3-.5)});}
    }else if(f.st==='fly'){const rr=lerp(R(f),.1,clamp(f.t/2.4));glowDot(g,f.fx,f.fy,rr*2,'#fff3d8',.3);g.save();g.translate(f.fx,f.fy);g.rotate(f.t*3);g.drawImage(f.img,-rr,-rr,rr*2,rr*2);g.restore();}
  }
  for(const f of falling){f.vy+=.01;f.y+=f.vy/60;f.x+=Math.sin(f.y*4+f.ph)*.003;f.rot+=.02;g.save();g.translate(f.x,f.y);g.rotate(f.rot);g.drawImage(f.img,-f.R,-f.R,f.R*2,f.R*2);g.restore();}
  for(let i=falling.length-1;i>=0;i--)if(falling[i].y>F.H+.2)falling.splice(i,1);
  for(let i=flakes.length-1;i>=0;i--)if(flakes[i].st==='gone')flakes.splice(i,1);
}
/* ---------- right unit: a cut-paper Christmas window ---------- */
function paper(fn,fill,sh=1){g.save();g.fillStyle=fill;g.shadowColor='rgba(0,0,0,.5)';g.shadowBlur=10*sh;g.shadowOffsetX=3*sh;g.shadowOffsetY=6*sh;g.beginPath();fn();g.fill();g.restore();}
function drawTree(t){
  const z={x:U1.ix0,y:F.top,w:U1.ix1-U1.ix0,h:F.bot-F.top};
  g.save();g.beginPath();for(let c=3;c<6;c++)for(let r=0;r<2;r++){const p=F.pane(c,r);g.rect(p.x,p.y,p.w,p.h);}g.clip();
  const bg=g.createLinearGradient(0,z.y,0,z.y+z.h);bg.addColorStop(0,'#14234a');bg.addColorStop(.75,'#2a3f78');bg.addColorStop(1,'#3a4f8a');g.fillStyle=bg;g.fillRect(z.x,z.y,z.w,z.h);
  glowDot(g,z.x+.45,z.y+.55,.9,'#ffe9b8',.35);paper(()=>g.arc(z.x+.45,z.y+.55,.17,0,TAU),'#fff1cf',.6);
  for(const f of snow){f.y+=f.v/60;f.x+=Math.sin(t+f.ph)*.002;if(f.y>z.y+z.h)f.y=z.y-.05;g.fillStyle=rgba('#fff8ee',f.a);g.beginPath();g.arc(f.x,f.y,f.r,0,TAU);g.fill();}
  // far hills and houses, then the near snow
  paper(()=>{g.moveTo(z.x,TBOT-.25);for(let x=0;x<=z.w;x+=.05)g.lineTo(z.x+x,TBOT-.3-Math.sin(x*2.3+1)*.08);g.lineTo(z.x+z.w,z.y+z.h);g.lineTo(z.x,z.y+z.h);},'#c9d6ee',.5);
  for(const[hx,w,h]of[[.18,.32,.26],[.55,.22,.2],[1.6,.26,.24],[1.88,.3,.3]]){const x=z.x+hx,y=TBOT-.22;
    paper(()=>{g.moveTo(x-w/2,y);g.lineTo(x-w/2,y-h);g.lineTo(x,y-h-w*.4);g.lineTo(x+w/2,y-h);g.lineTo(x+w/2,y);},'#8f2a24',.6);
    g.fillStyle='#ffd884';for(let k=0;k<2;k++){const wx=x-w/4+k*w/2-.025;g.fillRect(wx,y-h*.65,.05,.06);glowDot(g,wx+.025,y-h*.62,.1,'#ffd27a',.35);}}
  paper(()=>{g.moveTo(z.x,TBOT);for(let x=0;x<=z.w;x+=.05)g.lineTo(z.x+x,TBOT+.02-Math.sin(x*3)*.03);g.lineTo(z.x+z.w,z.y+z.h);g.lineTo(z.x,z.y+z.h);},'#f4f1ea');
  // the tree: five tiers of green paper with cut edges
  paper(()=>g.rect(TX-.05,TBOT-.14,.1,.16),'#4a2a16');
  for(let k=0;k<5;k++){const top=lerp(TTOP,TBOT-.55,k/5),bot=lerp(TTOP+.5,TBOT-.06,k/5+.08),half=lerp(.24,.9,k/4);
    paper(()=>{g.moveTo(TX,top);for(let i=0;i<=12;i++){const u=i/12,x=TX-half+u*half*2;g.lineTo(x,bot+(i%2?.05:0));}g.closePath();},mix('#1d5a34','#2f7a48',k/4),1.2);}
  for(const l of LIGHTS){const b=.55+.45*Math.sin(t*2+l.ph)+(s.party>0?.4:0);glowDot(g,l.x,l.y,.09,'#ffcf7a',.35*b);g.fillStyle=mix('#ffb84a','#fff3c4',b*.6);g.beginPath();g.arc(l.x,l.y,.014,0,TAU);g.fill();}
  for(const o of tree){const sl=SLOTS[o.slot],r=.09+.035*o.size;g.strokeStyle='rgba(255,248,238,.6)';g.lineWidth=.004;g.beginPath();g.moveTo(sl.x,sl.y-r-.05);g.lineTo(sl.x,sl.y-r*.5);g.stroke();
    glowDot(g,sl.x,sl.y,r*1.8,'#fff3d8',.2+(s.party>0?.3*Math.abs(Math.sin(t*5+o.slot)):0));g.save();g.translate(sl.x,sl.y);g.rotate(Math.sin(t*.7+o.slot)*.3);g.drawImage(o.img,-r,-r,r*2,r*2);g.restore();}
  for(let i=0;i<12;i++)if(!tree.some(o=>o.slot===i)){const sl=SLOTS[i];g.strokeStyle='rgba(255,248,238,.35)';g.lineWidth=.005;g.setLineDash([.012,.012]);g.beginPath();g.arc(sl.x,sl.y,.055,0,TAU);g.stroke();g.setLineDash([]);}
  for(const[x,w,h,c]of[[-.62,.26,.2,'#c0392b'],[-.32,.2,.26,'#e8b23a'],[.3,.24,.18,'#2e6fb0'],[.58,.22,.24,'#c0392b']]){const px=TX+x,py=TBOT+.03-h;paper(()=>g.rect(px-w/2,py,w,h),c,.7);g.fillStyle='#fff8ee';g.fillRect(px-.012,py,.024,h);g.fillRect(px-w/2,py+h*.4,w,.02);}
  // the star: a gold paper advent star, lit from behind when the tree is full
  const lit=tree.length>=12||s.party>0,sy=TTOP-.09,sr=lit?.14+.012*Math.sin(t*5):.11;
  if(lit)glowDot(g,TX,sy,.8,'#ffe49a',.65);
  paper(()=>{for(let i=0;i<10;i++){const a=-Math.PI/2+i*Math.PI/5,r=i%2?sr*.45:sr;g.lineTo(TX+Math.cos(a)*r,sy+Math.sin(a)*r);}g.closePath();},lit?'#ffd75a':'#a8873a');
  if(lit)smiley(g,TX,sy+.005,sr*.36,true,'#5a3a10',.2);
  g.restore();
  const p=F.pane(5,0);paper(()=>rrect(g,p.x+.12,p.y+.05,p.w-.24,.22,.02),'#fff1cf',.5);
  txt(g,`${tree.length}/12`,p.cx,p.y+.14,.085,{w:900,col:'#5a1a14'});txt(g,L({sv:'PÅ GRANEN',en:'ON THE TREE'}),p.cx,p.y+.225,.028,{mono:true,w:600,col:'#5a1a14'});
  if(s.party>0){const k=clamp(s.party/2),q=F.pane(3,1);txt(g,L({sv:'God jul!',en:'Merry Christmas!'}),U1.cx,q.y+.25,.2,{w:900,italic:true,col:'#fff8ee',glow:'#ffe46a',blur:30,alpha:k});
    txt(g,L({sv:'Tolv flingor, ingen den andra lik',en:'Twelve flakes, no two alike'}),U1.cx,q.y+.45,.05,{mono:true,w:600,col:'#fff8ee',alpha:k});}
}
function grown(laneIdx,hum){const fl=new Flake(61,120),ln=LANES[laneIdx],nk=nakaya(ln.t,hum);fl.reset(nk.beta,nk.gamma);if(ln.habit==='needle')fl.grow(.9);else for(let k=0;k<30;k++)fl.step(40);return fl;}
function fillTree(){for(let i=0;i<12;i++)if(!tree.some(o=>o.slot===i)){const fl=grown(Math.floor(hash(i*7+s.made)*3),.6+hash(i)*.4);if(hash(i+3)<.3)fl.grow(.5);tree.push({img:snapshot(fl),slot:i,size:.8});}}

const idea={
  id:'jul',n:5,post:'paper',steam:'M',col:'#ff6b6b',
  name:{sv:'Snöflingefabriken',en:'The snowflake factory'},sub:{sv:'Jul: styr din egen snöflinga',en:'Christmas: steer your own flake'},
  q:{sv:'Varför är ingen snöflinga den andra lik?',en:'Why are no two snowflakes alike?'},
  pitch:{tagline:{sv:'En snöflinga faller ner genom fönstren ovanför dig, och du styr den med kroppen. De tre rutorna är tre temperaturer, och varje temperatur odlar en egen kristall: plattor, nålar eller stjärnor. Din väg mellan dem gör flingan unik. När den landar hängs den i granen.',en:'A snowflake falls down the windows above you, and you steer it with your body. The three columns are three temperatures, and each grows its own crystal: plates, needles or stars. Your path between them makes the flake unique. When it lands it goes on the tree.'},
    how:[{sv:'Ställ dig framför vänster fönster. En flinga dyker upp ovanför dig.',en:'Stand in front of the left window. A flake appears above you.'},
      {sv:'Gå åt sidan så följer flingan med. Varje kolumn ger en ny sorts kristall.',en:'Step sideways and the flake follows. Each column grows a new kind of crystal.'},
      {sv:'Flingan landar, flyger bakom muren och hängs i granen. Tolv tänder stjärnan.',en:'The flake lands, flies behind the pier and is hung on the tree. Twelve light the star.'}],
    trick:{sv:'Spröjsen delar molnet i tre temperaturer, så man ser direkt var gränserna går. Allt är urklippt papper med ljus bakifrån, som en adventsstjärna i ett fönster.',en:'The mullions split the cloud into three temperatures, so the borders are obvious. Everything is cut paper lit from behind, like an advent star in a window.'},
    chips:[['cam',{sv:'Djupkamera: din position styr',en:'Depth cam: your position steers'}],['pencil',{sv:'Webb: rita flingans väg',en:'Web: draw the flake\'s path'}],['flake',{sv:'Riktig tillväxtmodell',en:'A real growth model'}]],
    fake:{sv:'Ingen extern data. Tillväxten är Reiters modell (2005)',en:'No external data. Growth is Reiter\'s model (2005)'}},
  init(){flakes.length=0;tree.length=0;falling.length=0;s.party=0;s.path=[];
    snow=[...Array(60)].map(()=>({x:U1.ix0+Math.random()*(U1.ix1-U1.ix0),y:Math.random()*F.H,v:.06+Math.random()*.12,r:.005+Math.random()*.008,a:.4+Math.random()*.5,ph:Math.random()*TAU}));
    [2,0,2,1].forEach((ln,i)=>tree.push({img:snapshot(grown(ln,.85)),slot:i,size:.8}));
    const f=spawn({});if(f){f.y=TOPY+.8;for(let k=0;k<300;k++)f.fl.step(1);}},
  update(dt,t){
    if(s.party>0){s.party-=dt;if(s.party<=0){for(const o of tree){const sl=SLOTS[o.slot];falling.push({img:o.img,x:sl.x,y:sl.y,vy:0,R:.1,rot:0,ph:Math.random()*TAU});}tree.length=0;}}
    else if(tree.length>=12)s.party=9;
    // every visitor in front of the left unit gets a flake of their own
    for(const p of CROWD.people){if(p.z>4||p.x<U0.x0-.2||p.x>U0.x1+.2)continue;if(flakes.some(f=>f.owner===p&&f.st==='fall'))continue;
      const free=flakes.find(f=>f.st==='fall'&&!f.owner&&!f.path&&f.y<TOPY+.9);if(free){free.owner=p;continue;}spawn({owner:p,x:clamp(p.x,LX0,LX1)});}
    if(s.auto&&!flakes.some(f=>f.st==='fall'))spawn({});
    for(const f of flakes)stepFlake(f,dt,t);
  },
  draw(t){for(let c=0;c<3;c++)drawLane(c,t);drawHint(t);drawTree(t);drawFlakes(t);this.pad&&frameNo%3===0&&this.pad.draw();},
  hud(){const mine=flakes.find(f=>f.owner&&f.st==='fall');return (mine?`${L({sv:'Din flinga',en:'Your flake'})}: ${[...mine.lanes].map(habitName).join(' + ')}`:L({sv:'Ställ dig framför vänster fönster',en:'Stand in front of the left window'}))+` · ${tree.length}/12 ${L({sv:'på granen',en:'on the tree'})}`;},
  controls(){
    UI.group({sv:'Rita flingans väg, uppifrån och ner',en:'Draw the flake\'s path, top to bottom'});
    const self=this;let drawing=false;
    this.pad=UI.pad({aspect:'1.3',draw(c,W,H){
      c.clearRect(0,0,W,H);
      LANES.forEach((l,i)=>{const x0=i/3*W,gr=c.createLinearGradient(0,0,0,H);gr.addColorStop(0,l.hi);gr.addColorStop(.3,l.col);gr.addColorStop(1,mix(l.col,'#06080f',.5));c.fillStyle=gr;c.fillRect(x0,0,W/3,H);
        c.fillStyle='#fff';c.font="700 14px Alegreya,Georgia,serif";c.textAlign='center';c.fillText(`−${Math.abs(l.t)}°  ${habitName(l.habit)}`,x0+W/6,20);});
      c.fillStyle='rgba(0,0,0,.35)';c.fillRect(W/3-1.5,0,3,H);c.fillRect(W*2/3-1.5,0,3,H);
      if(s.path.length>1){c.strokeStyle='#fff8ee';c.lineWidth=3;c.lineJoin='round';c.lineCap='round';c.setLineDash([6,6]);c.beginPath();s.path.forEach(([u,v],i)=>i?c.lineTo(u*W,v*H):c.moveTo(u*W,v*H));c.stroke();c.setLineDash([]);}
      const f=flakes.find(q=>q.path&&q.st==='fall');if(f){const v=(f.y-TOPY)/(LANDY-TOPY),u=(f.x-LX0)/(LX1-LX0);c.fillStyle='#fff8ee';c.beginPath();c.arc(u*W,v*H,7,0,TAU);c.fill();}
      if(!s.path.length){c.fillStyle='rgba(255,255,255,.75)';c.textAlign='center';c.font="13px 'IBM Plex Mono',monospace";c.fillText(L({sv:'Dra en linje uppifrån och ner',en:'Drag a line from top to bottom'}),W/2,H/2);}
    },on(type,u,v){
      if(type==='down'){drawing=true;s.path=[[u,v]];}
      else if(type==='drag'&&drawing){const l=s.path[s.path.length-1];if(v>l[1]+.01||Math.abs(u-l[0])>.03)s.path.push([u,Math.max(v,l[1])]);}
      else if(type==='up'&&drawing){drawing=false;if(s.path.length>2){const P=s.path.slice();const fn=k=>{if(k<=P[0][1])return P[0][0];for(let i=1;i<P.length;i++)if(P[i][1]>=k){const a=P[i-1],b=P[i];return lerp(a[0],b[0],(k-a[1])/((b[1]-a[1])||1));}return P[P.length-1][0];};
        const f=spawn({path:fn,x:lerp(LX0,LX1,P[0][0])});if(f)f.y=lerp(TOPY,LANDY,P[0][1]);}}
      self.pad.draw();}});
    UI.group(null,'row');
    UI.button({label:{sv:'Släpp en flinga',en:'Drop a flake'},cls:'hot',onClick:()=>spawn({x:lerp(LX0,LX1,Math.random())})});
    UI.button({label:{sv:'Fyll granen',en:'Fill the tree'},onClick:fillTree});
    UI.button({label:{sv:'Töm granen',en:'Clear the tree'},onClick:()=>{tree.length=0;s.party=0;}});
    UI.group();
    UI.slider({obj:s,key:'speed',label:{sv:'Fallfart',en:'Fall speed'},min:.4,max:3,step:.1,fmt:v=>v.toFixed(1)+'×'});
    UI.toggle({obj:s,key:'auto',label:{sv:'En flinga faller av sig själv när ingen är där',en:'A flake falls by itself when nobody is there'}});
    UI.note({sv:'Prova med musen: håll den över vänster fönster och flytta den åt sidorna. Kameran gör samma sak med din kropp, och ju närmare du står desto fler grenar får flingan.',en:'Try it with the mouse: hold it over the left window and move it sideways. The camera does the same with your body, and the closer you stand the more branches the flake gets.'});
  }
};
IDEAS.push(idea);
})();
