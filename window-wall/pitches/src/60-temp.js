/* ================= 1 · TEMPERATUR: the same water at four scales =================
   Left unit top: molecules. Left unit bottom: three microscope lenses. Right unit top: Skellefteå weather.
   Right unit bottom: the number, a glass of water with a thermometer, and the phase scale.
   Idle it shows today's (simulated) outdoor temperature. Moving on the plaza heats the water, standing still cools it. */
(()=>{
const U0=F.units[0],U1=F.units[1];
const Z={mol:{x:U0.ix0,y:F.top,w:U0.ix1-U0.ix0,h:F.HT},wx:{x:U1.ix0,y:F.top,w:U1.ix1-U1.ix0,h:F.HT}};
const TMIN=-30,TMAX=110;
const s={T:2,target:2,base:2,live:true,manual:2,crowd:true,auto:false,heat:0,chill:0,hot:false,cold:false,hum:.7,autoT:0,flash:0,boilFx:0,freezeFx:0,lastPhase:null};
const phase=T=>T<0?'ice':T<100?'water':'steam';
const PH={ice:{sv:'IS',en:'ICE'},water:{sv:'VATTEN',en:'WATER'},steam:{sv:'ÅNGA',en:'STEAM'}};
const tcol=T=>ramp([[0,'#7fd8ff'],[.2,'#2fd6e0'],[.24,'#CAFE03'],[.45,'#ffb21e'],[.75,'#ff6a3d'],[1,'#ff4fa3']],(T-TMIN)/(TMAX-TMIN));
const fmtT=T=>(T<0?'−':'')+Math.abs(T).toFixed(Math.abs(T)<10?1:0).replace('.',LANG==='sv'?',':'.');

/* sprites: glossy atoms */
function sphere(col,px=96){const c=document.createElement('canvas');c.width=c.height=px;const x=c.getContext('2d'),r=px/2;
  const gr=x.createRadialGradient(r*.7,r*.62,r*.05,r,r,r);gr.addColorStop(0,'#fff');gr.addColorStop(.18,mix(col,'#ffffff',.35));gr.addColorStop(.7,col);gr.addColorStop(1,mix(col,'#000000',.6));
  x.fillStyle=gr;x.beginPath();x.arc(r,r,r*.97,0,TAU);x.fill();return c;}
const SO=sphere('#ff3d5a'),SH=sphere('#e9f6ff');

/* ---------- molecules ---------- */
const A=.205,RO=.058,RH=.034,BOND=.072;
let mols=[];
function buildLattice(){
  mols=[];const z=Z.mol,a1=Math.sqrt(3)*A,sites=[];
  for(let j=-1;j<z.h/(1.5*A)+1;j++)for(let i=-1;i<z.w/a1+1;i++){
    const bx=z.x+.12+i*a1+(j%2?a1/2:0),by=z.y+.14+j*1.5*A;
    for(const[ox,oy]of[[0,0],[0,A]]){const x=bx+ox,y=by+oy;if(x>z.x+.05&&x<z.x+z.w-.05&&y>z.y+.07&&y<z.y+z.h-.06)sites.push({x,y});}}
  for(const st of sites){const nb=sites.filter(o=>o!==st&&Math.hypot(o.x-st.x,o.y-st.y)<A*1.05);st.nb=nb;
    const a=nb.length>=2?Math.atan2((nb[0].y+nb[1].y)/2-st.y,(nb[0].x+nb[1].x)/2-st.x):Math.random()*TAU;
    mols.push({hx:st.x,hy:st.y,x:st.x,y:st.y,vx:0,vy:0,a,ha:a,va:0,nb});}
  mols.forEach((m,i)=>m.i=i);
  mols.forEach(m=>m.nbi=m.nb.map(n=>sites.indexOf(n)));
}
function stepMolecules(dt,T){
  const z=Z.mol,TK=Math.max(1,T+273),solid=smooth(1.5,-1.5,T),gas=smooth(98,103,T);
  const vT=.06*Math.sqrt(TK/273)*(1+gas*7),keep=Math.round(lerp(mols.length,11,gas));
  const top=z.y+.06+(1-solid)*(1-gas)*lerp(.0,.07,smooth(4,90,T)+smooth(4,0,T)*.6); // density: smallest volume near 4 °C
  for(const m of mols){
    if(m.i>=keep){m.vy-=dt*1.8;m.vx*=.98;}             // gas escapes up and out of view
    else if(m.y<z.y-.2){m.y=z.y-.15;m.vy=Math.abs(m.vy)+.2;}
    const k=solid*60;m.vx+=(m.hx-m.x)*k*dt;m.vy+=(m.hy-m.y)*k*dt;
    m.vx+=(Math.random()-.5)*vT*14*dt;m.vy+=(Math.random()-.5)*vT*14*dt;
    if(!solid||solid<.99)m.vy+=(1-gas)*(1-solid)*.06*dt;
    m.va+=(Math.random()-.5)*(1-solid)*30*dt;m.va*=.92;
    m.a+=m.va*dt+(solid>.5?(m.ha-m.a)*solid*6*dt:0);
  }
  if(solid<.98)for(let i=0;i<mols.length;i++){const a=mols[i];if(a.i>=keep)continue;for(let j=i+1;j<mols.length;j++){const b=mols[j];if(b.i>=keep)continue;
    const dx=b.x-a.x,dy=b.y-a.y,d2=dx*dx+dy*dy;if(d2>.07)continue;const d=Math.sqrt(d2)||1e-4;
    let f=d<.19?(.19-d)*40:-(1-gas)*(d-.19)*2.5*(d<.26?1:0);f*=(1-solid)*dt;
    a.vx-=dx/d*f;a.vy-=dy/d*f;b.vx+=dx/d*f;b.vy+=dy/d*f;}}
  for(const m of mols){
    const sp=Math.hypot(m.vx,m.vy),want=solid>.9?vT*.25:vT;if(sp>0){const r=lerp(1,want/sp,.08);m.vx*=r;m.vy*=r;}
    m.x+=m.vx*dt;m.y+=m.vy*dt;
    if(m.i<keep){
      if(m.x<z.x+RO){m.x=z.x+RO;m.vx=Math.abs(m.vx);}if(m.x>z.x+z.w-RO){m.x=z.x+z.w-RO;m.vx=-Math.abs(m.vx);}
      if(m.y>z.y+z.h-RO){m.y=z.y+z.h-RO;m.vy=-Math.abs(m.vy);}
      if(gas<.5&&m.y<top+RO&&solid<.5){m.y=top+RO;m.vy=Math.abs(m.vy)*.5;}
      if(gas>=.5&&m.y<z.y+RO){m.y=z.y+RO;m.vy=Math.abs(m.vy);}
    }else if(gas<.5){m.vy+=dt*3;} // cooling: the escaped ones rain back in
  }
}
function drawMolecules(T){
  const z=Z.mol,solid=smooth(1.5,-1.5,T),gas=smooth(98,103,T);
  g.save();g.beginPath();g.rect(z.x,z.y,z.w,z.h);g.clip();
  const bg=g.createLinearGradient(0,z.y,0,z.y+z.h);bg.addColorStop(0,mix('#06121c','#1a0710',smooth(20,100,T)));bg.addColorStop(1,mix('#0a2233','#2a0b14',smooth(20,100,T)));
  g.fillStyle=bg;g.fillRect(z.x,z.y,z.w,z.h);
  // hydrogen bonds
  g.lineWidth=.012;g.setLineDash([.022,.018]);g.lineCap='round';
  if(solid>.05){g.strokeStyle=rgba(C.lime,.55*solid);g.beginPath();for(const m of mols)for(const j of m.nbi)if(j>m.i){const n=mols[j];g.moveTo(m.x,m.y);g.lineTo(n.x,n.y);}g.stroke();}
  if(solid<.95&&gas<.9){g.strokeStyle=rgba(C.lime,.45*(1-solid)*(1-gas));g.beginPath();
    for(let i=0;i<mols.length;i++)for(let j=i+1;j<mols.length;j++){const a=mols[i],b=mols[j],d=Math.hypot(a.x-b.x,a.y-b.y);if(d>.16&&d<.23&&((i*7+j*3+Math.floor(performance.now()/260))%5===0)){g.moveTo(a.x,a.y);g.lineTo(b.x,b.y);}}g.stroke();}
  g.setLineDash([]);
  for(const m of mols){
    if(m.y<z.y-.2)continue;
    const ca=Math.cos(m.a),sa=Math.sin(m.a),h1=m.a+.91,h2=m.a-.91;
    if(gas>.3){g.globalAlpha=.25;g.strokeStyle='#ff8aa0';g.lineWidth=.02;g.beginPath();g.moveTo(m.x,m.y);g.lineTo(m.x-m.vx*.18,m.y-m.vy*.18);g.stroke();g.globalAlpha=1;}
    g.drawImage(SH,m.x+Math.cos(h1)*BOND-RH,m.y+Math.sin(h1)*BOND-RH,RH*2,RH*2);
    g.drawImage(SH,m.x+Math.cos(h2)*BOND-RH,m.y+Math.sin(h2)*BOND-RH,RH*2,RH*2);
    g.drawImage(SO,m.x-RO,m.y-RO,RO*2,RO*2);
    void ca;void sa;
  }
  g.restore();
  txt(g,'H₂O',z.x+.06,z.y+.11,.085,{align:'left',w:800,col:'#fff',alpha:.9});
  txt(g,L({sv:'MOLEKYLER',en:'MOLECULES'}),z.x+.06,z.y+.2,.042,{align:'left',mono:true,w:600,col:C.lime,ls:.12});
  const p=phase(T);
  txt(g,L(PH[p]),z.x+z.w-.06,z.y+z.h-.11,.13,{align:'right',w:900,col:'#fff',alpha:.92,stroke:.012,strokeCol:'#000'});
}

/* ---------- microscope lenses (bottom row, left unit) ---------- */
const flake=new Flake(81,160);let flakeHab='',flakeT=0;
const grains=[...Array(16)].map((_,i)=>({x:(hash(i)-.5)*.36,y:(hash(i+50)-.5)*.36,r:.018+hash(i+9)*.022}));
let bubbles=[],vap=[];
function lens(p,title,scale,body){
  const cx=p.cx,cy=p.cy-.04,R=.265;
  g.save();
  g.fillStyle='#030405';g.fillRect(p.x,p.y,p.w,p.h);
  g.beginPath();g.arc(cx,cy,R,0,TAU);g.clip();body(cx,cy,R);
  const vg=g.createRadialGradient(cx,cy,R*.6,cx,cy,R);vg.addColorStop(0,'rgba(0,0,0,0)');vg.addColorStop(1,'rgba(0,0,0,.75)');g.fillStyle=vg;g.fillRect(cx-R,cy-R,R*2,R*2);
  g.restore();
  g.strokeStyle='#d7dccd';g.lineWidth=.018;g.beginPath();g.arc(cx,cy,R+.012,0,TAU);g.stroke();
  g.strokeStyle=rgba(C.lime,.6);g.lineWidth=.006;g.beginPath();g.arc(cx,cy,R+.035,-.8,.8);g.stroke();
  txt(g,L(title),cx,p.y+.11,.05,{mono:true,w:600,col:C.lime,ls:.1});
  // scale bar
  g.fillStyle='#d7dccd';g.fillRect(cx-.09,cy+R+.09,.18,.012);txt(g,scale,cx,cy+R+.15,.038,{mono:true,col:'#d7dccd'});
}
function drawLenses(T,t,dt){
  const ps=[F.pane(0,1),F.pane(1,1),F.pane(2,1)];
  // 1 crystal
  lens(ps[0],{sv:'KRISTALL',en:'CRYSTAL'},'1 mm',(cx,cy,R)=>{
    const bg=g.createRadialGradient(cx,cy,0,cx,cy,R);bg.addColorStop(0,'#0f2a3d');bg.addColorStop(1,'#050c14');g.fillStyle=bg;g.fillRect(cx-R,cy-R,R*2,R*2);
    if(T<0){const nk=nakaya(Math.max(-28,T),s.hum);drawFlake(g,flake,nk.habit,cx,cy,R*.86,0);
      txt(g,L(HABIT[nk.habit]),cx,cy+R*.78,.052,{w:800,col:'#dff6ff',stroke:.01,strokeCol:'#04121c'});}
    else if(T<100){const r=R*.55*(1-smooth(60,100,T)*.5),wob=Math.sin(t*3)*.01;
      const gr=g.createRadialGradient(cx-r*.3,cy-r*.35,r*.05,cx,cy,r);gr.addColorStop(0,'rgba(255,255,255,.95)');gr.addColorStop(.25,'rgba(120,210,255,.55)');gr.addColorStop(1,'rgba(40,120,200,.25)');
      g.fillStyle=gr;g.beginPath();g.ellipse(cx,cy+r*.1,r*(1+wob),r*(.9-wob),0,0,TAU);g.fill();
      g.strokeStyle='rgba(255,255,255,.6)';g.lineWidth=.008;g.stroke();
      txt(g,L({sv:'Droppe',en:'Droplet'}),cx,cy+R*.78,.052,{w:800,col:'#dff6ff'});}
    else{for(let i=0;i<14;i++){const a=t*.6+i,rr=R*(.2+.6*((t*.25+i*.37)%1));glowDot(g,cx+Math.cos(a)*rr,cy+Math.sin(a*1.3)*rr,.06,'#ffffff',.25);}
      txt(g,L({sv:'Borta: ånga',en:'Gone: steam'}),cx,cy+R*.78,.05,{w:800,col:'#fff'});}
  });
  // 2 Brownian motion: D ∝ T/η, water is ~6× runnier at 100 °C than at 0 °C
  const TK=T+273,eta=Math.exp(-6.944+2036.8/Math.max(250,TK)),D=TK/eta/(273/1.79);
  lens(ps[1],{sv:'BROWNSK RÖRELSE',en:'BROWNIAN MOTION'},'10 µm',(cx,cy,R)=>{
    g.fillStyle=T<0?'#cfe7f2':'#e8efe0';g.fillRect(cx-R,cy-R,R*2,R*2);
    if(T<0){g.strokeStyle='rgba(120,170,200,.6)';g.lineWidth=.004;for(let i=0;i<7;i++){g.beginPath();g.moveTo(cx-R,cy+(hash(i)-.5)*R*2);g.lineTo(cx+R,cy+(hash(i+3)-.5)*R*2);g.stroke();}}
    const jig=T<0?0:Math.sqrt(D)*.11;
    for(const q of grains){if(jig){q.x+=(Math.random()-.5)*jig*dt*6;q.y+=(Math.random()-.5)*jig*dt*6;const d=Math.hypot(q.x,q.y);if(d>R*.85){q.x*=.97;q.y*=.97;}}
      const x=cx+q.x,y=cy+q.y;g.fillStyle='#8a6a2c';g.beginPath();g.arc(x,y,q.r,0,TAU);g.fill();g.fillStyle='rgba(255,240,190,.7)';g.beginPath();g.arc(x-q.r*.3,y-q.r*.3,q.r*.35,0,TAU);g.fill();}
    if(T>70&&T<102&&Math.random()<dt*smooth(70,100,T)*30)bubbles.push({x:(Math.random()-.5)*R*1.6,y:R*.95,r:.004,v:0});
    for(const b of bubbles){b.r=Math.min(.05,b.r+dt*.02*smooth(70,100,T));b.v+=dt*.3;b.y-=b.v*dt;b.x+=Math.sin(b.y*30)*.0015;
      g.strokeStyle='rgba(40,60,80,.9)';g.lineWidth=.005;g.beginPath();g.arc(cx+b.x,cy+b.y,b.r,0,TAU);g.stroke();g.fillStyle='rgba(255,255,255,.7)';g.beginPath();g.arc(cx+b.x-b.r*.35,cy+b.y-b.r*.35,b.r*.25,0,TAU);g.fill();}
    bubbles=bubbles.filter(b=>b.y>-R*1.1);
    if(T>=102){g.fillStyle='rgba(255,255,255,.55)';g.fillRect(cx-R,cy-R,R*2,R*2);}
  });
  // 3 vapour pressure: molecules leaving the surface, grows ~170× from 0 to 100 °C
  const pv=.6112*Math.exp(17.62*T/(243.12+T)); // kPa (Magnus)
  lens(ps[2],{sv:'ÅNGTRYCK',en:'VAPOUR PRESSURE'},(pv<10?pv.toFixed(1):pv.toFixed(0)).replace('.',LANG==='sv'?',':'.')+' kPa',(cx,cy,R)=>{
    const sy=cy+R*.25;
    g.fillStyle='#071019';g.fillRect(cx-R,cy-R,R*2,R*2);
    const liq=g.createLinearGradient(0,sy,0,cy+R);liq.addColorStop(0,T<0?'#bfe9ff':'#1f8fd0');liq.addColorStop(1,T<0?'#5fb2d8':'#0b3c66');
    g.fillStyle=liq;g.beginPath();g.moveTo(cx-R,sy);for(let x=-R;x<=R;x+=.02)g.lineTo(cx+x,sy+(T<0?0:Math.sin(x*40+t*3)*.006));g.lineTo(cx+R,cy+R);g.lineTo(cx-R,cy+R);g.fill();
    const rate=Math.min(80,pv*.8)*(T<0?.4:1);
    if(Math.random()<dt*rate)vap.push({x:(Math.random()-.5)*R*1.7,y:sy-.01,vx:(Math.random()-.5)*.1,vy:-(.08+Math.random()*.15)*(1+T/100)});
    for(const v of vap){v.x+=v.vx*dt;v.y+=v.vy*dt;if(Math.random()<dt*.6&&v.y>sy-.1)v.vy*=-1;
      g.fillStyle='#ff6b84';g.beginPath();g.arc(cx+v.x,v.y,.011,0,TAU);g.fill();}
    vap=vap.filter(v=>v.y>cy-R-.02&&v.y<sy+.02&&vap.length<140);
    if(T>=99){for(let i=0;i<5;i++){const bx=cx+(hash(i+Math.floor(t*2))-.5)*R*1.4,by=sy+.04+((t*.7+i*.2)%1)*.12;g.strokeStyle='rgba(255,255,255,.8)';g.lineWidth=.006;g.beginPath();g.arc(bx,by,.02,0,TAU);g.stroke();}}
  });
}

/* ---------- weather over Skellefteå ---------- */
let precip=[],snowDepth=0,puddle=0,hail=[],bolt=0;
const sky=(()=>{const c=document.createElement('canvas');c.width=420;c.height=120;const x=c.getContext('2d');
  // skyline: spruce, low houses, Sara kulturhus (the 20-storey timber tower) and a church spire
  x.fillStyle='#000';const H=120;x.beginPath();x.moveTo(0,H);
  for(let i=0;i<=420;i+=6)x.lineTo(i,H-18-Math.abs(Math.sin(i*.31))*6-(i%18===0?10:0));x.lineTo(420,H);x.fill();
  const bl=[[30,40,26],[80,30,36],[118,22,30],[250,40,28],[300,26,40],[340,50,24],[392,24,34]];for(const[a,w,h]of bl)x.fillRect(a,H-h,w,h);
  x.fillRect(176,H-92,34,92);x.fillRect(181,H-100,24,10);
  x.beginPath();x.moveTo(268,H-28);x.lineTo(274,H-74);x.lineTo(280,H-28);x.fill();
  for(let i=0;i<420;i+=14){x.beginPath();x.moveTo(i,H-14);x.lineTo(i+5,H-38-((i*7)%13));x.lineTo(i+10,H-14);x.fill();}
  x.fillStyle='#ffd27a';for(let f=0;f<9;f++)for(let k=0;k<3;k++)if(hash(f*3+k)>.35)x.fillRect(180+k*10,H-86+f*9,5,4);
  for(const[a,w,h]of bl)for(let k=0;k<w/9;k++)if(hash(a+k)>.55)x.fillRect(a+3+k*9,H-h+6,4,4);
  return c;})();
function cloudPuff(c,x,y,w,h,col,a){c.fillStyle=rgba(col,a);for(let i=0;i<9;i++){const px=x+(hash(i+x*7)-.5)*w,py=y+(hash(i+y*3)-.5)*h*.5,r=h*(.35+hash(i+11)*.35);c.beginPath();c.arc(px,py,r,0,TAU);c.fill();}}
function drawWeather(T,t,dt){
  const z=Z.wx,gy=z.y+z.h-.16;
  g.save();g.beginPath();g.rect(z.x,z.y,z.w,z.h);g.clip();
  const storm=smooth(17,21,T)*(1-smooth(31,34,T)),hot=smooth(30,45,T),boil=smooth(95,105,T),clear=smooth(-12,-18,T);
  const top=T<0?mix('#0b1624','#152a42',1-clear):storm>.3?mix('#1c2733','#0d1218',storm):hot>.2?mix('#1d3b5e','#a94b1f',hot):'#18324c';
  const bot=T<0?'#3c5874':storm>.3?'#3a4450':hot>.2?mix('#4c7aa0','#ffb067',hot):'#4f7493';
  const bg=g.createLinearGradient(0,z.y,0,gy);bg.addColorStop(0,mix(top,'#d9dde2',boil*.7));bg.addColorStop(1,mix(bot,'#ffffff',boil*.6));g.fillStyle=bg;g.fillRect(z.x,z.y,z.w,z.h);
  if(clear>.1){for(let i=0;i<40;i++){const sx=z.x+hash(i)*z.w,sy=z.y+hash(i+40)*z.h*.6;g.fillStyle=rgba('#ffffff',clear*(.4+.6*Math.abs(Math.sin(t*2+i))));g.fillRect(sx,sy,.008,.008);}
    // northern lights on very cold clear nights
    for(let k=0;k<3;k++){g.strokeStyle=rgba(k?'#2fe0a0':'#9cff6a',clear*.12);g.lineWidth=.12;g.beginPath();for(let x=0;x<=z.w;x+=.05)g.lineTo(z.x+x,z.y+.3+k*.08+Math.sin(x*3+t*.4+k)*.08);g.stroke();}}
  if(hot>.1){glowDot(g,z.x+z.w*.72,z.y+.38,.9*hot+.3,'#ffd27a',.55*hot);g.fillStyle=rgba('#fff3c4',hot);g.beginPath();g.arc(z.x+z.w*.72,z.y+.38,.14+.06*hot,0,TAU);g.fill();}
  if(bolt>0){bolt-=dt;g.fillStyle=rgba('#e8f0ff',bolt*2);g.fillRect(z.x,z.y,z.w,z.h);
    g.strokeStyle='#fff';g.lineWidth=.02;g.beginPath();let bx=z.x+z.w*.35,by=z.y+.3;g.moveTo(bx,by);while(by<gy){bx+=(hash(by*99+t)-.5)*.16;by+=.09;g.lineTo(bx,by);}g.stroke();}
  if(storm>.4&&Math.random()<dt*.18)bolt=.35;
  // clouds
  const cover=T<0?1-clear:storm>.2?1:hot>.3?0:.8,cc=storm>.3?'#2a323c':T<0?'#c7d3df':'#aab7c4';
  for(let i=0;i<6;i++){const cx=z.x+((i*.41+t*.012*(1+i%2))%1.2-.1)*z.w,cy=z.y+.22+(i%3)*.12-(storm*.08);cloudPuff(g,cx,cy,.8,.32+storm*.2,cc,.5*cover);}
  // precipitation
  const kind=T>=100?null:T<-14?'dust':T<-1?'snow':T<2?'sleet':storm>.5?'hail':T<32?'rain':null;
  const rate={dust:30,snow:60,sleet:90,rain:200,hail:120}[kind]||0;
  for(let n=0;n<rate*dt*(.6+Math.random()*.8);n++)precip.push({k:kind,x:z.x+Math.random()*z.w,y:z.y+.25+Math.random()*.1,vy:{dust:.05,snow:.25,sleet:.8,rain:3,hail:2.2}[kind]*(.8+Math.random()*.4),ph:Math.random()*TAU,r:.008+Math.random()*.014});
  g.lineCap='round';
  for(const p of precip){p.y+=p.vy*dt;p.ph+=dt*2;
    if(p.k==='snow'||p.k==='dust'){p.x+=Math.sin(p.ph)*.06*dt;}
    if(p.y>gy){if(p.k==='hail'&&!p.b){p.b=1;p.vy=-p.vy*.35;p.y=gy;}else p.dead=1;
      if(p.k==='snow'||p.k==='sleet')snowDepth=Math.min(.09,snowDepth+.00012);if(p.k==='rain'||p.k==='hail')puddle=Math.min(1,puddle+.0015);}
    if(p.k==='hail'&&p.b)p.vy+=dt*6;
    if(p.k==='rain'){g.strokeStyle='rgba(190,220,255,.6)';g.lineWidth=.006;g.beginPath();g.moveTo(p.x,p.y);g.lineTo(p.x-.01,p.y-.07);g.stroke();}
    else if(p.k==='hail'){g.fillStyle='#eef6ff';g.beginPath();g.arc(p.x,p.y,.016,0,TAU);g.fill();}
    else if(p.k==='sleet'){g.fillStyle='rgba(220,235,255,.75)';g.beginPath();g.arc(p.x,p.y,.012,0,TAU);g.fill();}
    else if(p.k==='dust'){g.fillStyle=rgba('#ffffff',.5+.5*Math.sin(p.ph*3));g.fillRect(p.x,p.y,.006,.006);}
    else{g.strokeStyle='#f4fbff';g.lineWidth=.005;g.beginPath();for(let a=0;a<3;a++){const ang=a*Math.PI/3+p.ph*.3;g.moveTo(p.x-Math.cos(ang)*p.r,p.y-Math.sin(ang)*p.r);g.lineTo(p.x+Math.cos(ang)*p.r,p.y+Math.sin(ang)*p.r);}g.stroke();}}
  precip=precip.filter(p=>!p.dead&&p.y>z.y-.1);if(precip.length>700)precip.splice(0,precip.length-700);
  if(T>1)snowDepth=Math.max(0,snowDepth-dt*.004*(T/5));if(T<0)puddle=Math.max(0,puddle-dt*.05);else puddle=Math.max(0,puddle-dt*.01*(T>25?3:1));
  // heat shimmer and boiling-hot ground
  // skyline and ground
  g.drawImage(sky,z.x,gy-.42,z.w,.44);
  g.fillStyle=T<0&&snowDepth>.005?'#dfe9f2':'#0b0d10';g.fillRect(z.x,gy,z.w,z.h);
  if(snowDepth>.003){g.fillStyle='#eef5fb';g.beginPath();g.moveTo(z.x,gy+.02);for(let x=0;x<=z.w;x+=.05)g.lineTo(z.x+x,gy-snowDepth*(.8+.4*noise2(x*4,1)));g.lineTo(z.x+z.w,gy+.05);g.fill();}
  if(puddle>.05){g.fillStyle=rgba('#7fa8c8',puddle*.5);for(let i=0;i<4;i++){g.beginPath();g.ellipse(z.x+.25+i*.52,gy+.07,.18*puddle+.05,.02,0,0,TAU);g.fill();}
    if(kind==='rain'){g.strokeStyle='rgba(220,240,255,.6)';g.lineWidth=.004;for(let i=0;i<4;i++){const ph=(t*1.5+i*.37)%1;g.beginPath();g.ellipse(z.x+.25+i*.52+(hash(i+Math.floor(t*1.5))-.5)*.2,gy+.07,ph*.06,ph*.012,0,0,TAU);g.globalAlpha=1-ph;g.stroke();g.globalAlpha=1;}}}
  if(boil>0){for(let i=0;i<8;i++){const ph=(t*.25+i*.13)%1;g.fillStyle=rgba('#ffffff',(1-ph)*.35*boil);g.beginPath();g.arc(z.x+hash(i)*z.w,gy-ph*z.h,.12+ph*.3,0,TAU);g.fill();}}
  g.restore();
  txt(g,'SKELLEFTEÅ',z.x+.06,z.y+.1,.05,{align:'left',mono:true,w:600,col:'#fff',ls:.12,alpha:.85});
  const kl={dust:{sv:'Isnålar i luften',en:'Diamond dust'},snow:{sv:'Snö',en:'Snow'},sleet:{sv:'Blötsnö',en:'Sleet'},rain:{sv:'Regn',en:'Rain'},hail:{sv:'Åska och hagel',en:'Thunder and hail'}};
  const label=kind?L(kl[kind]):T>=100?L({sv:'Kokhett',en:'Boiling hot'}):T>32?L({sv:'Värmebölja',en:'Heatwave'}):'';
  if(label)txt(g,label,z.x+z.w-.06,z.y+.11,.085,{align:'right',w:800,col:'#fff',stroke:.012,strokeCol:'rgba(0,0,0,.6)'});
}

/* ---------- the glass, the number, the scale ---------- */
let gbub=[],level=1,steam=[];
function drawGlass(T,t,dt){
  const p=F.pane(4,1),cx=p.cx,base=p.y+p.h-.16,gw=.4,gh=.72,top=base-gh;
  const bg=g.createLinearGradient(0,p.y,0,p.y+p.h);bg.addColorStop(0,'#0c0f14');bg.addColorStop(1,'#1a1e24');g.fillStyle=bg;g.fillRect(p.x,p.y,p.w,p.h);
  g.fillStyle='#2a2f36';g.fillRect(p.x,base,p.w,p.h);g.fillStyle='#3a414a';g.fillRect(p.x,base,p.w,.012);
  if(T>=100)level=Math.max(.25,level-dt*.01);else level=Math.min(1,level+dt*.05);
  const wl=top+gh*(1-.82*level),solid=T<0;
  g.save();g.beginPath();g.moveTo(cx-gw/2,top);g.lineTo(cx-gw/2*.86,base);g.lineTo(cx+gw/2*.86,base);g.lineTo(cx+gw/2,top);g.closePath();g.clip();
  const wcol=solid?['#d9f2ff','#8fc8e6']:[mix('#3bb7ff','#ff7a5a',smooth(40,100,T)),mix('#0b5a9a','#7a1f2a',smooth(40,100,T))];
  const wg=g.createLinearGradient(0,wl,0,base);wg.addColorStop(0,wcol[0]);wg.addColorStop(1,wcol[1]);g.fillStyle=wg;g.globalAlpha=solid?.95:.75;
  g.beginPath();g.moveTo(cx-gw,wl);for(let x=-gw;x<=gw;x+=.02)g.lineTo(cx+x,wl+(solid?0:Math.sin(x*30+t*(T>=99?12:3))*(T>=99?.012:.003)));g.lineTo(cx+gw,base);g.lineTo(cx-gw,base);g.fill();g.globalAlpha=1;
  if(solid){g.strokeStyle='rgba(255,255,255,.7)';g.lineWidth=.005;for(let i=0;i<6;i++){g.beginPath();g.moveTo(cx+(hash(i)-.5)*gw,wl+hash(i+1)*(base-wl));g.lineTo(cx+(hash(i+2)-.5)*gw,wl+hash(i+3)*(base-wl));g.stroke();}
    for(let i=0;i<10;i++){g.fillStyle='rgba(255,255,255,.8)';g.beginPath();g.arc(cx+(hash(i+7)-.5)*gw*.8,wl+.04+hash(i+8)*(base-wl-.08),.006+hash(i)*.008,0,TAU);g.fill();}}
  else if(T<4){const k=1-smooth(0,4,T);for(let i=0;i<3;i++){const ix=cx+(i-1)*.1+Math.sin(t+i)*.01,iy=wl-.02+Math.sin(t*1.3+i)*.006,sz=.09*k+.02;
      g.fillStyle='rgba(235,250,255,.85)';rrect(g,ix-sz/2,iy-sz*.25,sz,sz,.015);g.fill();g.strokeStyle='#fff';g.lineWidth=.004;g.stroke();}}
  if(T>65&&!solid&&Math.random()<dt*smooth(65,100,T)*25)gbub.push({x:cx+(Math.random()-.5)*gw*.75,y:base-.01,r:.004+Math.random()*.01*(T>=99?3:1)});
  for(const b of gbub){b.y-=dt*(.15+b.r*8);b.r+=dt*.004;g.strokeStyle='rgba(255,255,255,.85)';g.lineWidth=.004;g.beginPath();g.arc(b.x,b.y,b.r,0,TAU);g.stroke();}
  gbub=gbub.filter(b=>b.y>wl);
  g.restore();
  // the glass itself
  g.strokeStyle='rgba(230,245,255,.8)';g.lineWidth=.01;g.beginPath();g.moveTo(cx-gw/2,top);g.lineTo(cx-gw/2*.86,base);g.lineTo(cx+gw/2*.86,base);g.lineTo(cx+gw/2,top);g.stroke();
  g.fillStyle='rgba(255,255,255,.12)';g.beginPath();g.moveTo(cx-gw/2+.03,top+.03);g.lineTo(cx-gw/2*.86+.03,base-.03);g.lineTo(cx-gw/2*.86+.06,base-.03);g.lineTo(cx-gw/2+.06,top+.03);g.fill();
  // condensation when the glass is colder than the dew point of the room
  if(T<12){const k=smooth(12,2,T);for(let i=0;i<26;i++){const yy=top+.05+hash(i+3)*(gh-.08),side=hash(i)<.5?-1:1,xx=cx+side*(gw/2-.01-(yy-top)/gh*gw*.07);g.fillStyle=rgba(T<0?'#ffffff':'#cfefff',k*.9);g.beginPath();g.arc(xx,yy,.006+hash(i+5)*.006,0,TAU);g.fill();}}
  // steam
  if(T>45){if(Math.random()<dt*smooth(45,100,T)*14)steam.push({x:cx+(Math.random()-.5)*gw*.6,y:wl,a:1,r:.03});}
  for(const v of steam){v.y-=dt*.25;v.x+=Math.sin(v.y*12+t)*dt*.05;v.r+=dt*.05;v.a-=dt*.4;g.fillStyle=rgba('#ffffff',Math.max(0,v.a)*.35);g.beginPath();g.arc(v.x,v.y,v.r,0,TAU);g.fill();}
  steam=steam.filter(v=>v.a>0);
  // thermometer in the glass
  const tx=cx+.11,t0=top-.2,t1=base-.08,frac=clamp((T-TMIN)/(TMAX-TMIN));
  g.fillStyle='rgba(255,255,255,.9)';rrect(g,tx-.018,t0,.036,t1-t0,.018);g.fill();
  g.fillStyle=tcol(T);g.beginPath();g.arc(tx,t1,.03,0,TAU);g.fill();g.fillRect(tx-.009,lerp(t1,t0+.03,frac),.018,t1-lerp(t1,t0+.03,frac));
  g.fillStyle='#333';for(let k=0;k<=7;k++){g.fillRect(tx-.018,lerp(t1,t0+.03,k/7),.012,.003);}
}
function drawNumber(T,t){
  const p=F.pane(3,1);const bg=g.createLinearGradient(0,p.y,0,p.y+p.h);bg.addColorStop(0,'#080a0c');bg.addColorStop(1,mix('#080a0c',tcol(T),.18));g.fillStyle=bg;g.fillRect(p.x,p.y,p.w,p.h);
  const who=s.heat>3?{sv:'NI VÄRMER',en:'YOU ARE HEATING'}:s.chill>3?{sv:'NI KYLER',en:'YOU ARE COOLING'}:s.live?{sv:'SKELLEFTEÅ NU',en:'SKELLEFTEÅ NOW'}:{sv:'LABBET',en:'THE LAB'};
  txt(g,L(who),p.cx,p.y+.14,.04,{mono:true,w:600,col:C.lime,ls:.1});
  const n=Math.round(T),str=(n<0?'−':'')+Math.abs(n);txt(g,str,p.cx,p.cy-.06,str.length>3?.21:str.length>2?.26:.32,{w:900,col:tcol(T),glow:tcol(T),blur:24});
  txt(g,'°C',p.cx,p.cy+.17,.11,{w:800,col:'#fff'});
  const diff=s.target-T;if(Math.abs(diff)>.6){const up=diff>0,y=p.cy+.36+Math.sin(t*6)*.01;g.fillStyle=up?'#ff6a3d':'#7fd8ff';g.beginPath();g.moveTo(p.cx,y+(up?-.05:.05));g.lineTo(p.cx-.05,y+(up?.03:-.03));g.lineTo(p.cx+.05,y+(up?.03:-.03));g.fill();}
}
function drawScale(T){
  const p=F.pane(5,1),x0=p.x+.16,x1=p.x+p.w-.1,y0=p.y+.1,y1=p.y+p.h-.1,yy=v=>lerp(y1,y0,(v-TMIN)/(TMAX-TMIN));
  g.fillStyle='#07090b';g.fillRect(p.x,p.y,p.w,p.h);
  const bands=[[TMIN,0,'#7fd8ff','ice'],[0,100,'#1c8fe0','water'],[100,TMAX,'#f3f3f3','steam']];
  for(const[a,b,c,k]of bands){g.fillStyle=rgba(c,phase(T)===k?.95:.28);g.fillRect(x0,yy(b),x1-x0,yy(a)-yy(b));
    const h=yy(a)-yy(b);if(h>.12){g.save();g.translate((x0+x1)/2,(yy(a)+yy(b))/2);g.rotate(-Math.PI/2);txt(g,L(PH[k]),0,0,Math.min(.11,h*.5),{w:900,col:phase(T)===k?'#000':'#fff',alpha:phase(T)===k?.9:.6});g.restore();}}
  for(const v of [-20,0,4,37,100]){const y=yy(v);g.fillStyle='#fff';g.fillRect(x0-.05,y-.002,.04,.004);txt(g,(v<0?'−':'')+Math.abs(v)+'°',x0-.07,y,.034,{align:'right',mono:true,col:'#cfd3c4'});}
  const y=yy(clamp(T,TMIN,TMAX));g.fillStyle=C.lime;g.beginPath();g.moveTo(x0-.005,y);g.lineTo(x0-.05,y-.03);g.lineTo(x0-.05,y+.03);g.fill();g.fillRect(x0,y-.005,x1-x0,.01);
}

/* frost grows in from the frames when it is below zero; steam fogs the glass when it is hot */
const frost=(()=>{const c=document.createElement('canvas'),W=200,H=480;c.width=W;c.height=H;const x=c.getContext('2d');x.lineCap='round';
  const branch=(px,py,a,len,w,d)=>{if(d>4||len<2)return;const ex=px+Math.cos(a)*len,ey=py+Math.sin(a)*len;x.lineWidth=w;x.beginPath();x.moveTo(px,py);x.lineTo(ex,ey);x.stroke();
    const n=4;for(let i=1;i<n;i++){const f=i/n,bx=px+(ex-px)*f,by=py+(ey-py)*f;branch(bx,by,a+(i%2?1:-1)*(1.05+Math.random()*.2),len*.38*(1-f*.5),w*.6,d+1);}
    branch(ex,ey,a+(Math.random()-.5)*.5,len*.62,w*.75,d+1);};
  x.strokeStyle='rgba(225,245,255,.55)';
  for(let i=0;i<70;i++){const side=i%4,t=Math.random(),corner=Math.random()<.5;const[px,py,a]=side===0?[t*W,0,Math.PI/2]:side===1?[t*W,H,-Math.PI/2]:side===2?[0,t*H,0]:[W,t*H,Math.PI];
    branch(px,py,a+(Math.random()-.5)*1.1,(corner?10:6)+Math.random()*16,1.3,0);}
  // feathery haze along the edges
  const edge=(x0,y0,x1,y1)=>{const gr=x.createLinearGradient(x0,y0,x1,y1);gr.addColorStop(0,'rgba(230,248,255,.35)');gr.addColorStop(1,'rgba(230,248,255,0)');x.fillStyle=gr;x.fillRect(0,0,W,H);};
  edge(0,0,0,40);edge(0,H,0,H-40);edge(0,0,30,0);edge(W,0,W-30,0);
  return c;})();
function drawPaneFx(T){
  const fr=smooth(-1,-22,T),fog=smooth(75,100,T);
  if(fr<=0&&fog<=0)return;
  for(const p of F.panes){
    if(fr>0){g.globalAlpha=.25+fr*.75;g.drawImage(frost,p.x,p.y,p.w,p.h);g.globalAlpha=1;}
    if(fog>0){const gr=g.createLinearGradient(0,p.y+p.h,0,p.y);gr.addColorStop(0,rgba('#ffffff',.55*fog));gr.addColorStop(.6,rgba('#ffffff',.18*fog));gr.addColorStop(1,'rgba(255,255,255,0)');g.fillStyle=gr;g.fillRect(p.x,p.y,p.w,p.h);}
  }
}

const idea={
  id:'temperatur',n:1,post:'riso',steam:'S',col:C.cyan,
  name:{sv:'Temperatur',en:'Temperature'},sub:{sv:'Vatten i fyra skalor',en:'Water at four scales'},
  q:{sv:'Vad händer med vattnet när det blir kallare eller varmare?',en:'What happens to water when it gets colder or warmer?'},
  pitch:{tagline:{sv:'Samma vatten på fyra skalor samtidigt: molekyler, mikroskop, ett glas och vädret över Skellefteå. Står ingen framför fönstren är det en termometer för dagens väder. Rör ni er blir det varmare, står ni stilla blir det kallare, precis som molekylerna.',en:'The same water at four scales at once: molecules, microscope, a glass and the weather over Skellefteå. With nobody there it is a thermometer for today. Move and it warms up, stand still and it cools down, just like the molecules.'},
    how:[{sv:'Idle: visar dagens temperatur i Skellefteå på alla fyra nivåer.',en:'Idle: shows today\'s Skellefteå temperature at all four levels.'},
      {sv:'Rör er på torget: rörelse blir värme. Får ni upp det till 100 ° kokar glaset.',en:'Move on the plaza: motion becomes heat. Reach 100 ° and the glass boils.'},
      {sv:'Stå alldeles stilla: det kyls ner, snöflingor växer och frosten kryper in från ramarna.',en:'Stand very still: it cools, snow crystals grow and frost creeps in from the frames.'}],
    trick:{sv:'Vänster enhet är det osynliga (molekyler, mikroskop), höger det synliga (väder, glas). Frost växer in från spröjsen och kokångan immar fönstren.',en:'The left unit is the invisible (molecules, microscope), the right the visible (weather, glass). Frost grows in from the mullions and boiling steam fogs the panes.'},
    chips:[['cam',{sv:'Djupkamera: rörelse = värme',en:'Depth cam: motion = heat'}],['web',{sv:'Webb: reglage',en:'Web: slider'}],['crowd',{sv:'Hela torget samarbetar',en:'The whole plaza works together'}]],
    fake:{sv:'Dagens temperatur är simulerad (SMHI senare)',en:'Today\'s temperature is simulated (SMHI later)'}},
  init(){s.base=FAKE.tempAt();s.T=s.target=s.manual=Math.round(s.base);s.heat=0;s.chill=0;s.live=true;s.auto=false;buildLattice();flake.reset(.6,.002);flakeHab='';precip=[];snowDepth=s.T<0?.04:0;level=1;},
  update(dt,t){
    s.base=s.live?FAKE.tempAt():s.manual;
    if(s.auto){s.autoT+=dt;s.base=lerp(-26,106,(1-Math.cos(s.autoT/44*TAU))/2);}
    // only people close to the glass count (within 2.6 m), so passers-by far out leave the thermometer alone
    let act=0,still=0;for(const p of CROWD.people){if(p.z>2.6)continue;act+=Math.min(p.speed/1.3,1.8)+(p.wave>0?.8:0)+(p.jump>0?1.6:0);if(p.still>2&&p.wave<=0)still++;}
    if(s.crowd){s.heat+=(act*1.7-s.heat*.12)*dt;s.chill=approach(s.chill,Math.min(30,still*9),.25,dt);}else{s.heat=approach(s.heat,0,.5,dt);s.chill=approach(s.chill,0,.5,dt);}
    if(s.hot)s.heat+=40*dt;if(s.cold)s.chill=Math.min(40,s.chill+20*dt);
    s.heat=clamp(s.heat,0,140);
    s.target=clamp(s.base+s.heat-s.chill,TMIN,TMAX);
    s.T=approach(s.T,s.target,1.2,dt);
    const ph=phase(s.T);if(s.lastPhase&&ph!==s.lastPhase){if(ph==='steam')s.boilFx=2.5;if(ph==='ice'&&s.lastPhase==='water')s.freezeFx=2.5;}s.lastPhase=ph;
    s.boilFx=Math.max(0,s.boilFx-dt);s.freezeFx=Math.max(0,s.freezeFx-dt);
    stepMolecules(dt,s.T);
    if(s.T<0){const nk=nakaya(Math.max(-28,s.T),s.hum);
      if(nk.habit!==flakeHab&&(flake.size>.95||flakeHab===''||flakeT>8)){flake.reset(nk.beta,nk.gamma);flakeHab=nk.habit;flakeT=0;}
      flake.set(nk.beta,nk.gamma);flakeT+=dt;
      if(nk.habit==='needle'||nk.habit==='column')flake.grow(dt*.08);else flake.step(18);
      if(flake.full&&flakeT>14){flake.reset(nk.beta,nk.gamma);flakeT=0;}}
    else{flakeHab='';}
  },
  draw(t){
    const T=s.T,dt=1/60;
    drawMolecules(T);drawLenses(T,t,dt);drawWeather(T,t,dt);drawNumber(T,t);drawGlass(T,t,dt);drawScale(T);drawPaneFx(T);
    if(s.boilFx>0){const k=s.boilFx/2.5,p=F.pane(4,0);smiley(g,p.cx,p.cy,.22*(1+(1-k)*.3),true,C.lime);txt(g,L({sv:'KOKAR!',en:'BOILING!'}),p.cx,p.cy+.4,.11,{w:900,col:C.lime,alpha:k});}
    if(s.freezeFx>0){const k=s.freezeFx/2.5,p=F.pane(1,0);g.globalAlpha=k;g.fillStyle='rgba(0,0,0,.5)';g.fillRect(p.x,p.y+p.h*.3,p.w,p.h*.4);g.globalAlpha=1;txt(g,L({sv:'FRYSER!',en:'FREEZING!'}),p.cx,p.cy,.12,{w:900,col:'#bfefff',alpha:k});}
  },
  hud(){const p=L(PH[phase(s.T)]).toLowerCase();return `${fmtT(s.T)} °C · ${p}`+(s.heat>3?` · ${L({sv:'publiken värmer',en:'the crowd heats'})} +${Math.round(s.heat)}°`:'')+(s.chill>3?` · ${L({sv:'stillhet kyler',en:'stillness cools'})} −${Math.round(s.chill)}°`:'');},
  controls(){
    UI.group({sv:'Temperatur',en:'Temperature'});
    this.sl=UI.slider({obj:s,key:'manual',label:{sv:'Labbets temperatur',en:'Lab temperature'},min:TMIN,max:TMAX,step:1,fmt:v=>fmtT(v)+' °C',onInput:()=>{s.live=false;s.auto=false;this.sync();}});
    UI.group(null,'row');
    this.bLive=UI.button({label:{sv:'Idag i Skellefteå',en:'Today in Skellefteå'},onClick:()=>{s.live=true;s.auto=false;this.sync();}});
    this.bAuto=UI.button({label:{sv:'Auto-tur −26° → 106°',en:'Auto tour −26° → 106°'},onClick:()=>{s.auto=!s.auto;s.autoT=0;this.sync();}});
    UI.group({sv:'Publiken (istället för kameran)',en:'The crowd (instead of the camera)'},'row');
    UI.hold({obj:s,key:'hot',label:{sv:'Håll: alla rör sig',en:'Hold: everyone moves'},cls:'big'});
    UI.hold({obj:s,key:'cold',label:{sv:'Håll: alla står still',en:'Hold: everyone still'},cls:'big'});
    UI.group();
    UI.toggle({obj:s,key:'crowd',label:{sv:'Rörelse på torget värmer',en:'Movement on the plaza heats'}});
    UI.slider({obj:s,key:'hum',label:{sv:'Luftfuktighet (för snökristallen)',en:'Humidity (for the snow crystal)'},min:0,max:1,step:.01,fmt:v=>Math.round(v*100)+' %',onInput:()=>{flakeHab='x';}});
    this.ro=UI.readouts([[{sv:'Ute nu',en:'Outside now'}],[{sv:'Visar',en:'Showing'}],[{sv:'Publikens värme',en:'Crowd heat'}],[{sv:'Stillhet',en:'Stillness'}]]);
    UI.note({sv:'Simulerad data: dagens temperatur räknas fram ur normalvärden för Skellefteå. På riktigt kopplas den till SMHI.',en:'Simulated data: today\'s temperature is derived from Skellefteå normals. In the real build it comes from SMHI.'},'fake');
    this.sync();
  },
  sync(){if(!this.bLive)return;this.bLive.classList.toggle('on',s.live&&!s.auto);this.bAuto.classList.toggle('on',s.auto);},
  tick(){if(!this.ro)return;this.ro.set(0,fmtT(FAKE.tempAt())+' °C');this.ro.set(1,fmtT(s.T)+' °C');this.ro.set(2,'+'+Math.round(s.heat)+' °');this.ro.set(3,'−'+Math.round(s.chill)+' °');}
};
IDEAS.push(idea);
})();
