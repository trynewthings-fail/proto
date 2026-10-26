/* ================= 2 · ELEKTRICITET: from the river and the wind to your outlet, one pane per chapter =================
   Top row left→right: rain, dam, turbine | wind, induction, transformer. Down through the transom at the right end,
   then bottom row right→left: grid, substation, street transformer | meter, fuse box, outlet. The pier is the road the cable runs under.
   Idle it runs on (simulated) Skellefteå Kraft data. Movement on the plaza exaggerates every step. */
(()=>{
const s={live:true,wind:7,flow:.6,pump:false,labels:true,boost:0,b:0,follow:-1,trip:0,city:0,hz:0};
const PP=(c,r,u,v)=>{const p=F.pane(c,r);return[p.x+u*p.w,p.y+v*p.h];};
/* the electric path */
const EP=[[2,0,.8,.28],[2,0,.9,.5],[2,0,1,.9],[3,0,0,.9],[3,0,1,.9],[4,0,0,.9],[4,0,.12,.9],[4,0,.12,.55],[4,0,.26,.55],[4,0,.74,.55],[4,0,1,.55],
  [5,0,0,.55],[5,0,.2,.55],[5,0,.8,.55],[5,0,.88,.62],[5,0,.88,1],[5,1,.88,0],[5,1,.88,.2],[5,1,.5,.32],[5,1,.14,.2],[5,1,0,.24],
  [4,1,1,.24],[4,1,.62,.34],[4,1,.3,.34],[4,1,.3,.6],[4,1,0,.6],[3,1,1,.6],[3,1,.62,.6],[3,1,.55,.9],[3,1,0,.9],
  [2,1,1,.9],[2,1,.92,.9],[2,1,.92,.65],[2,1,.08,.65],[2,1,0,.78],[1,1,1,.78],[1,1,.78,.78],[1,1,.5,.68],[1,1,.2,.85],[1,1,0,.85],[0,1,1,.85],[0,1,.6,.85]].map(a=>PP(...a));
const WP=[[0,0,.22,.62],[0,0,.45,.72],[0,0,.7,.78],[0,0,1,.86],[1,0,0,.86],[1,0,.5,.86],[1,0,.6,.9],[1,0,1,.97],[2,0,0,.97],[2,0,.3,.9],[2,0,.45,.75]].map(a=>PP(...a));
function lens(P){const d=[0];for(let i=1;i<P.length;i++)d.push(d[i-1]+Math.hypot(P[i][0]-P[i-1][0],P[i][1]-P[i-1][1]));return d;}
const ED=lens(EP),WD=lens(WP);
function at(P,D,d){d=clamp(d,0,D[D.length-1]);let i=1;while(i<D.length-1&&D[i]<d)i++;const f=(d-D[i-1])/(D[i]-D[i-1]||1);return[lerp(P[i-1][0],P[i][0],f),lerp(P[i-1][1],P[i][1],f)];}
let pulses=[],drops=[],rain=[],sparks=[],eAng=0,wAng=0,acPh=0,kwh=1834.27,led=0;
const CH=[
  {c:0,r:0,t:{sv:'Snö och regn',en:'Snow and rain'},f:{sv:'Snö smälter i fjällen och rinner till Skellefteälven.',en:'Snow melts in the mountains and runs into the Skellefte river.'}},
  {c:1,r:0,t:{sv:'Dammen',en:'The dam'},f:{sv:'Dammen samlar vatten. Ju högre fall, desto mer energi.',en:'The dam stores water. The higher the drop, the more energy.'}},
  {c:2,r:0,t:{sv:'Turbinen',en:'The turbine'},f:{sv:'Vattnet snurrar turbinen och generatorn ovanför.',en:'Water spins the turbine and the generator above it.'}},
  {c:3,r:0,t:{sv:'Vinden',en:'The wind'},f:{sv:'Vindkraft på Blaiken fyller på när det blåser.',en:'Wind power at Blaiken adds more when it blows.'}},
  {c:4,r:0,t:{sv:'Induktion',en:'Induction'},f:{sv:'En magnet som snurrar i en spole skapar ström, 50 gånger i sekunden.',en:'A magnet spinning in a coil makes current, 50 times a second.'}},
  {c:5,r:0,t:{sv:'Transformatorn',en:'Transformer'},f:{sv:'Spänningen höjs till 400 000 volt så att mindre går förlorat.',en:'Voltage goes up to 400,000 volts so less is lost.'}},
  {c:5,r:1,t:{sv:'Stamnätet',en:'The grid'},f:{sv:'Fåglarna på ledningen klarar sig: de rör bara en tråd.',en:'Birds on the line are fine: they only touch one wire.'}},
  {c:4,r:1,t:{sv:'Ställverket',en:'Substation'},f:{sv:'Här sänks spänningen och strömmen delas ut i regionen.',en:'Here the voltage goes down and power is shared out in the region.'}},
  {c:3,r:1,t:{sv:'Nätstationen',en:'Street transformer'},f:{sv:'Den gröna lådan i kvarteret gör 10 000 volt till 230.',en:'The green box on your block turns 10,000 volts into 230.'}},
  {c:2,r:1,t:{sv:'Elmätaren',en:'The meter'},f:{sv:'Lampan blinkar en gång per wattimme du använder.',en:'The light blinks once per watt-hour you use.'}},
  {c:1,r:1,t:{sv:'Elcentralen',en:'Fuse box'},f:{sv:'Säkringen bryter om för mycket ström går i en ledning.',en:'The fuse trips if too much current flows in one wire.'}},
  {c:0,r:1,t:{sv:'Uttaget',en:'The outlet'},f:{sv:'Hela resan tar mindre än en tiondels sekund.',en:'The whole journey takes less than a tenth of a second.'}}];
function chapterAt(x,y){for(let i=0;i<12;i++){const p=F.pane(CH[i].c,CH[i].r);if(x>=p.x-.1&&x<=p.x+p.w+.1&&y>=p.y-.1&&y<=p.y+p.h+.1)return i;}return -1;}

function paneBg(p,top,bot){const gr=g.createLinearGradient(0,p.y,0,p.y+p.h);gr.addColorStop(0,top);gr.addColorStop(1,bot);g.fillStyle=gr;g.fillRect(p.x,p.y,p.w,p.h);}
function label(i,p){if(!s.labels)return;const hot=s.follow>=0&&chapterAt(...at(EP,ED,s.follow*ED[ED.length-1]))===i;
  g.fillStyle=hot?C.lime:'rgba(0,0,0,.55)';rrect(g,p.x+.03,p.y+.03,p.w-.06,.1,.05);g.fill();
  g.fillStyle=hot?'#000':C.lime;g.beginPath();g.arc(p.x+.08,p.y+.08,.032,0,TAU);g.fill();
  txt(g,String(i+1),p.x+.08,p.y+.082,.036,{mono:true,w:600,col:hot?C.lime:'#000'});
  txt(g,L(CH[i].t),p.x+.125,p.y+.083,.052,{align:'left',w:800,col:hot?'#000':'#fff'});}
function gear(x,y,r,n,a,col){g.save();g.translate(x,y);g.rotate(a);g.fillStyle=col;g.beginPath();for(let i=0;i<n*2;i++){const rr=i%2?r:r*1.18,aa=i/(n*2)*TAU;g.lineTo(Math.cos(aa)*rr,Math.sin(aa)*rr);}g.closePath();g.fill();g.fillStyle='#111';g.beginPath();g.arc(0,0,r*.35,0,TAU);g.fill();g.restore();}
function coil(x0,x1,y,h,turns,col,ph){g.lineWidth=.014;for(let i=0;i<turns;i++){const x=lerp(x0,x1,(i+.5)/turns);g.strokeStyle=i%2?col:mix(col,'#ffffff',.25);g.beginPath();g.ellipse(x,y,.018,h/2,0,0,TAU);g.stroke();}
  const glow=.25+.5*Math.abs(Math.sin(ph));g.strokeStyle=rgba(C.lime,glow*s.b+.05);g.lineWidth=.03;g.beginPath();g.ellipse((x0+x1)/2,y,(x1-x0)/2+.02,h/2+.02,0,0,TAU);g.stroke();}
function tower(x,y,h,w){g.strokeStyle='#8b93a0';g.lineWidth=.008;g.beginPath();g.moveTo(x-w/2,y);g.lineTo(x-w*.08,y-h);g.lineTo(x+w*.08,y-h);g.lineTo(x+w/2,y);
  for(let k=1;k<6;k++){const yy=y-h*k/6,ww=lerp(w/2,w*.08,k/6);g.moveTo(x-ww,yy);g.lineTo(x+ww,yy-h/6);g.moveTo(x+ww,yy);g.lineTo(x-ww,yy-h/6);}
  g.moveTo(x-w*.55,y-h*.82);g.lineTo(x+w*.55,y-h*.82);g.moveTo(x-w*.4,y-h*.95);g.lineTo(x+w*.4,y-h*.95);g.stroke();}
function bulb(x,y,r,k){glowDot(g,x,y,r*6*k+r,'#ffe9a8',.8*k);g.fillStyle=mix('#3a3a30','#fff7d0',k);g.beginPath();g.arc(x,y,r,0,TAU);g.fill();}

function drawChapters(t){
  const b=s.b,P=FAKE.production(),flow=s.flow*(1+b*2.2),wind=s.wind*(1+b*1.6);
  // 1 rain and snow
  {const p=F.pane(0,0);paneBg(p,'#0c1a2c','#18304a');
    g.save();clipPane(g,p);
    const melt=.4+.6*flow/3;
    g.fillStyle='#24384f';g.beginPath();g.moveTo(p.x,p.y+p.h*.7);g.lineTo(p.x+p.w*.25,p.y+p.h*.38);g.lineTo(p.x+p.w*.45,p.y+p.h*.55);g.lineTo(p.x+p.w*.7,p.y+p.h*.3);g.lineTo(p.x+p.w,p.y+p.h*.6);g.lineTo(p.x+p.w,p.y+p.h);g.lineTo(p.x,p.y+p.h);g.fill();
    g.fillStyle='#eef6ff';g.beginPath();g.moveTo(p.x+p.w*.7,p.y+p.h*.3);g.lineTo(p.x+p.w*(.7-.1/melt),p.y+p.h*(.3+.07/melt));g.lineTo(p.x+p.w*.68,p.y+p.h*.36);g.lineTo(p.x+p.w*(.7+.1/melt),p.y+p.h*(.3+.08/melt));g.fill();
    g.beginPath();g.moveTo(p.x+p.w*.25,p.y+p.h*.38);g.lineTo(p.x+p.w*(.25-.08/melt),p.y+p.h*(.38+.06/melt));g.lineTo(p.x+p.w*(.25+.08/melt),p.y+p.h*(.38+.06/melt));g.fill();
    g.fillStyle='#16283c';g.beginPath();g.moveTo(p.x,p.y+p.h*.82);g.quadraticCurveTo(p.x+p.w*.4,p.y+p.h*.6,p.x+p.w,p.y+p.h*.75);g.lineTo(p.x+p.w,p.y+p.h);g.lineTo(p.x,p.y+p.h);g.fill();
    for(let i=0;i<3;i++)for(let k=0;k<6;k++){g.fillStyle=rgba('#9fb0c2',.65);g.beginPath();g.arc(p.x+p.w*(.15+i*.35)+Math.sin(t*.2+i)*.03+k*.05,p.y+p.h*.18+(k%2)*.03,.06,0,TAU);g.fill();}
    if(Math.random()<.2+flow*.5)for(let n=0;n<1+flow*2;n++)rain.push({x:p.x+Math.random()*p.w,y:p.y+p.h*.2});
    g.strokeStyle='rgba(180,215,255,.6)';g.lineWidth=.005;
    for(const d of rain){d.y+=.015*(1+b);g.beginPath();g.moveTo(d.x,d.y);g.lineTo(d.x-.004,d.y-.04);g.stroke();}rain=rain.filter(d=>d.y<p.y+p.h*.75);
    g.restore();}
  // river and penstock water
  g.strokeStyle='#1b6fb5';g.lineWidth=.05;g.lineCap='round';g.lineJoin='round';g.beginPath();WP.forEach(([x,y],i)=>i?g.lineTo(x,y):g.moveTo(x,y));g.stroke();
  g.strokeStyle='#5cc8ff';g.lineWidth=.016;g.setLineDash([.04,.06]);g.lineDashOffset=-t*(.15+flow*.25);g.stroke();g.setLineDash([]);
  // 2 the dam
  {const p=F.pane(1,0);g.save();clipPane(g,p);paneBg(p,'#0c1a2c','#152a40');
    const lvl=p.y+p.h*(.55-.08*s.flow);
    g.fillStyle='#1b2a36';g.beginPath();g.moveTo(p.x,p.y+p.h*.5);g.lineTo(p.x+p.w*.35,p.y+p.h*.4);g.lineTo(p.x+p.w,p.y+p.h*.5);g.lineTo(p.x+p.w,p.y+p.h);g.lineTo(p.x,p.y+p.h);g.fill();
    const wg=g.createLinearGradient(0,lvl,0,p.y+p.h*.86);wg.addColorStop(0,'#2b8fd8');wg.addColorStop(1,'#0b3963');g.fillStyle=wg;g.fillRect(p.x,lvl,p.w*.62,p.y+p.h*.86-lvl);
    g.strokeStyle='rgba(200,235,255,.5)';g.lineWidth=.005;for(let i=0;i<4;i++){g.beginPath();for(let x=0;x<p.w*.6;x+=.02)g.lineTo(p.x+x,lvl+.01+i*.04+Math.sin(x*25+t*2+i)*.004);g.stroke();}
    g.fillStyle='#a8adb3';g.beginPath();g.moveTo(p.x+p.w*.6,lvl-.04);g.lineTo(p.x+p.w*.7,lvl-.04);g.lineTo(p.x+p.w*.84,p.y+p.h*.9);g.lineTo(p.x+p.w*.6,p.y+p.h*.9);g.fill();
    g.fillStyle='#7f858c';g.fillRect(p.x+p.w*.6,lvl-.06,p.w*.12,.03);
    txt(g,'↕ '+Math.round(40+s.flow*20)+' m',p.x+p.w*.32,lvl+.1,.04,{mono:true,col:'#cfefff'});
    if(b>.7){g.fillStyle=rgba('#ffffff',.6*(b-.7)/.3);for(let i=0;i<10;i++){const ph=(t*1.2+i*.1)%1;g.beginPath();g.arc(p.x+p.w*(.7+ph*.12),lvl-.04+ph*p.h*.4,.015+ph*.02,0,TAU);g.fill();}}
    g.restore();}
  // 3 the turbine and generator
  {const p=F.pane(2,0);g.save();clipPane(g,p);paneBg(p,'#0b1118','#121c26');
    const cx=p.cx-.02,ty=p.y+p.h*.75,gy=p.y+p.h*.3;eAng+=(.8+flow*1.6)*(1/60)*TAU;
    g.fillStyle='#22303c';g.beginPath();g.ellipse(cx,ty,.2,.1,0,0,TAU);g.fill();
    g.strokeStyle='#3d7ab0';g.lineWidth=.02;g.beginPath();g.ellipse(cx,ty,.2,.1,0,0,TAU);g.stroke();
    for(let k=0;k<5;k++){const a=eAng+k/5*TAU,ex=cx+Math.cos(a)*.17,ey=ty+Math.sin(a)*.085;g.fillStyle=Math.sin(a)>0?'#d6dde5':'#8b96a2';g.beginPath();g.moveTo(cx,ty);g.quadraticCurveTo(cx+Math.cos(a+.4)*.12,ty+Math.sin(a+.4)*.07,ex,ey);g.lineTo(cx+Math.cos(a+.35)*.16,ty+Math.sin(a+.35)*.08);g.fill();}
    g.fillStyle='#9aa4ae';g.fillRect(cx-.012,gy,.024,ty-gy);
    g.fillStyle='#2a2f35';rrect(g,cx-.2,gy-.15,.4,.3,.04);g.fill();
    for(let k=0;k<8;k++){const a=eAng*1+k/8*TAU,x=cx+Math.cos(a)*.11,y=gy+Math.sin(a)*.06;g.fillStyle=k%2?'#ff4f5e':'#4f8bff';g.beginPath();g.arc(x,y,.025,0,TAU);g.fill();}
    g.strokeStyle='#c8813a';g.lineWidth=.012;g.beginPath();g.ellipse(cx,gy,.16,.1,0,0,TAU);g.stroke();
    glowDot(g,cx,gy,.25,C.lime,.15+.4*s.b);
    txt(g,Math.round(110+flow*60)+' '+L({sv:'varv/min',en:'rpm'}),cx,p.y+p.h*.93,.04,{mono:true,col:'#cfd3c4'});
    g.restore();}
  // 4 the wind
  {const p=F.pane(3,0);g.save();clipPane(g,p);paneBg(p,'#0e1a2a','#1d3044');wAng+=wind*.05*(1/60)*TAU;
    g.strokeStyle='rgba(255,255,255,.18)';g.lineWidth=.006;for(let i=0;i<10;i++){const y=p.y+p.h*(.2+hash(i)*.45),x=p.x+((t*wind*.05+hash(i+5))%1.3-.15)*p.w;g.beginPath();g.moveTo(x,y);g.lineTo(x+.08+wind*.006,y);g.stroke();}
    g.fillStyle='#132233';g.beginPath();g.moveTo(p.x,p.y+p.h*.8);g.quadraticCurveTo(p.x+p.w*.5,p.y+p.h*.6,p.x+p.w,p.y+p.h*.78);g.lineTo(p.x+p.w,p.y+p.h);g.lineTo(p.x,p.y+p.h);g.fill();
    for(const[u,v,sz]of[[.28,.66,.9],[.72,.7,.6],[.52,.72,.4]]){const x=p.x+u*p.w,y=p.y+v*p.h,h=.42*sz;
      g.strokeStyle='#dfe5ea';g.lineWidth=.014*sz;g.beginPath();g.moveTo(x,y);g.lineTo(x,y-h);g.stroke();
      g.fillStyle='#dfe5ea';for(let k=0;k<3;k++){const a=wAng*(1+sz*.1)+k*TAU/3;g.save();g.translate(x,y-h);g.rotate(a);g.beginPath();g.moveTo(0,0);g.quadraticCurveTo(.02*sz,-.1*sz,0,-.2*sz);g.lineTo(-.008*sz,-.02*sz);g.fill();g.restore();}
      g.fillStyle='#ff4f5e';g.beginPath();g.arc(x,y-h,.012*sz,0,TAU);g.fill();
      g.strokeStyle=rgba(C.lime,.5);g.lineWidth=.006;g.beginPath();g.moveTo(x,y);g.lineTo(x,p.y+p.h*.9);g.stroke();}
    txt(g,(wind).toFixed(1).replace('.',LANG==='sv'?',':'.')+' m/s',p.cx,p.y+p.h*.2,.06,{w:800,col:'#fff'});
    g.restore();}
  // 5 induction: a magnet spinning inside a coil
  {const p=F.pane(4,0);g.save();clipPane(g,p);paneBg(p,'#0a0d12','#10161e');acPh+=(1/60)*TAU*(1.2+b*2.5);
    const cx=p.cx,cy=p.y+p.h*.55;
    g.save();g.translate(cx,cy);g.rotate(acPh*.5);g.fillStyle='#ff4f5e';g.fillRect(-.16,-.035,.16,.07);g.fillStyle='#4f8bff';g.fillRect(0,-.035,.16,.07);
    txt(g,'N',-.1,0,.04,{w:900,col:'#fff'});txt(g,'S',.1,0,.04,{w:900,col:'#fff'});
    g.strokeStyle='rgba(255,255,255,.18)';g.lineWidth=.004;for(let k=1;k<4;k++){g.beginPath();g.ellipse(0,0,.16+k*.03,.05+k*.04,0,0,TAU);g.stroke();}
    g.restore();
    coil(cx-.2,cx+.2,cy,.24,9,'#c8813a',acPh);
    // oscilloscope
    const oy=p.y+p.h*.85,amp=.04+.06*clamp(P.total/900+b);g.fillStyle='#07140a';rrect(g,p.x+.05,oy-.1,p.w-.1,.18,.02);g.fill();
    g.strokeStyle=C.lime;g.lineWidth=.008;g.shadowColor=C.lime;g.shadowBlur=10;g.beginPath();for(let x=0;x<p.w-.14;x+=.01)g.lineTo(p.x+.07+x,oy-.01+Math.sin(x*28-acPh*2)*amp);g.stroke();g.shadowBlur=0;
    txt(g,'50 Hz',p.cx,p.y+p.h*.25,.08,{w:900,col:C.lime});
    g.restore();}
  // 6 transformer
  {const p=F.pane(5,0);g.save();clipPane(g,p);paneBg(p,'#0a0d12','#141a21');
    const cy=p.y+p.h*.55,x0=p.x+.1,x1=p.x+p.w-.1;
    g.strokeStyle='#59606a';g.lineWidth=.05;g.strokeRect(x0+.02,cy-.22,x1-x0-.04,.44);
    coil(x0-.02,x0+.08,cy,.2,3,'#c8813a',acPh);coil(x1-.1,x1+.02,cy,.3,9,'#c8813a',acPh+1);
    txt(g,'10 kV',x0+.04,cy+.3,.045,{mono:true,w:600,col:'#cfd3c4'});txt(g,'400 kV',x1-.05,cy+.3,.045,{mono:true,w:600,col:C.lime});
    if(Math.random()<.05+b*.4)sparks.push({x:x1-.04+(Math.random()-.5)*.1,y:cy-.15-Math.random()*.1,l:.25});
    txt(g,'↑',p.cx,cy,.16,{w:900,col:C.lime,alpha:.5+.5*Math.sin(t*3)});
    g.restore();}
  // 7 the national grid
  {const p=F.pane(5,1);g.save();clipPane(g,p);paneBg(p,'#0b1523','#1a2a3a');
    g.fillStyle='#0f1b28';g.beginPath();g.moveTo(p.x,p.y+p.h*.8);g.quadraticCurveTo(p.cx,p.y+p.h*.7,p.x+p.w,p.y+p.h*.82);g.lineTo(p.x+p.w,p.y+p.h);g.lineTo(p.x,p.y+p.h);g.fill();
    tower(p.x+p.w*.88,p.y+p.h*.85,p.h*.68,.2);tower(p.x+p.w*.14,p.y+p.h*.8,p.h*.62,.16);
    g.strokeStyle='#3c4552';g.lineWidth=.005;for(const dy of[.02,.06]){g.beginPath();g.moveTo(p.x+p.w*.88,p.y+p.h*.2+dy*p.h);g.quadraticCurveTo(p.cx,p.y+p.h*.45+dy*p.h,p.x+p.w*.14,p.y+p.h*.2+dy*p.h);g.stroke();}
    for(let i=0;i<3;i++){const u=.35+i*.12,x=lerp(p.x+p.w*.14,p.x+p.w*.88,u),y=p.y+p.h*(.2+.25*4*u*(1-u))-.012;g.fillStyle='#111';g.beginPath();g.ellipse(x,y,.018,.012,0,0,TAU);g.fill();g.beginPath();g.arc(x+.014,y-.01,.008,0,TAU);g.fill();}
    if(b>.5){g.strokeStyle=rgba('#a0c8ff',(b-.5)*.8);g.lineWidth=.02;g.beginPath();g.moveTo(p.x+p.w*.88,p.y+p.h*.2);g.quadraticCurveTo(p.cx,p.y+p.h*.45,p.x+p.w*.14,p.y+p.h*.2);g.stroke();}
    g.restore();}
  // 8 substation
  {const p=F.pane(4,1);g.save();clipPane(g,p);paneBg(p,'#0b1118','#151c24');
    const gy=p.y+p.h*.82;g.fillStyle='#1c232b';g.fillRect(p.x,gy,p.w,p.h);
    g.strokeStyle='#4b5560';g.lineWidth=.006;for(let x=p.x;x<p.x+p.w;x+=.04){g.beginPath();g.moveTo(x,gy);g.lineTo(x,gy-.1);g.stroke();}g.beginPath();g.moveTo(p.x,gy-.1);g.lineTo(p.x+p.w,gy-.1);g.stroke();
    for(let i=0;i<4;i++){const x=p.x+.1+i*.13;g.fillStyle='#6f7780';g.fillRect(x-.008,p.y+p.h*.34,.016,gy-p.y-p.h*.34);for(let k=0;k<5;k++){g.fillStyle='#b8c0c8';g.beginPath();g.ellipse(x,p.y+p.h*.4+k*.035,.025,.008,0,0,TAU);g.fill();}}
    g.fillStyle='#39424c';rrect(g,p.x+.15,p.y+p.h*.52,.3,.22,.02);g.fill();g.fillStyle='#4a545e';for(let k=0;k<5;k++)g.fillRect(p.x+.17+k*.055,p.y+p.h*.54,.03,.18);
    txt(g,'400 → 130 kV',p.cx,p.y+p.h*.93,.04,{mono:true,col:'#cfd3c4'});
    g.restore();}
  // 9 street transformer
  {const p=F.pane(3,1);g.save();clipPane(g,p);paneBg(p,'#0a1220','#111a26');
    const gy=p.y+p.h*.78;g.fillStyle='#22262b';g.fillRect(p.x,gy,p.w,p.h);g.fillStyle='#30353b';g.fillRect(p.x,gy,p.w,.015);
    g.fillStyle='#2f6b3a';rrect(g,p.x+.22,gy-.3,.26,.3,.02);g.fill();g.fillStyle='#3d8249';g.fillRect(p.x+.22,gy-.3,.26,.04);
    g.strokeStyle='#244f2c';g.lineWidth=.004;for(let k=0;k<6;k++){g.beginPath();g.moveTo(p.x+.24+k*.04,gy-.24);g.lineTo(p.x+.24+k*.04,gy-.04);g.stroke();}
    g.fillStyle='#ffd400';g.beginPath();g.moveTo(p.x+.35,gy-.2);g.lineTo(p.x+.32,gy-.13);g.lineTo(p.x+.355,gy-.13);g.lineTo(p.x+.34,gy-.07);g.lineTo(p.x+.38,gy-.15);g.lineTo(p.x+.35,gy-.15);g.fill();
    g.fillStyle='#555';g.fillRect(p.x+.1,gy-.55,.012,.55);glowDot(g,p.x+.12,gy-.55,.25,'#ffcf8a',.5);
    txt(g,'10 kV → 230 V',p.cx,p.y+p.h*.93,.04,{mono:true,col:'#cfd3c4'});
    g.restore();}
  // 10 the meter and today's numbers
  {const p=F.pane(2,1);g.save();clipPane(g,p);paneBg(p,'#0d0f12','#15181c');
    const kw=(1.5+P.total/300)*(1+b*3);kwh+=kw/3600*(1/60)*40;led+=kw*(1/60)*.6;
    g.fillStyle='#e8e6df';rrect(g,p.x+.08,p.y+p.h*.2,p.w-.16,p.h*.42,.03);g.fill();
    g.fillStyle='#1c2a1f';rrect(g,p.x+.12,p.y+p.h*.26,p.w-.24,.13,.01);g.fill();
    txt(g,kwh.toFixed(2).padStart(8,'0'),p.cx,p.y+p.h*.26+.066,.07,{mono:true,w:600,col:C.lime,glow:C.lime,blur:8});
    txt(g,'kWh',p.x+p.w-.15,p.y+p.h*.26+.17,.035,{mono:true,col:'#555'});
    const on=(led%1)<.18;g.fillStyle=on?'#ff3030':'#401010';g.beginPath();g.arc(p.x+.17,p.y+p.h*.5,.025,0,TAU);g.fill();if(on)glowDot(g,p.x+.17,p.y+p.h*.5,.12,'#ff3030',.6);
    txt(g,'1000 imp/kWh',p.x+.21,p.y+p.h*.5,.026,{align:'left',mono:true,col:'#444'});
    const pr=FAKE.price();txt(g,String(pr),p.cx-.04,p.y+p.h*.72,.13,{w:900,col:'#fff'});txt(g,L({sv:'öre/kWh',en:'öre/kWh'}),p.cx+.13,p.y+p.h*.72,.034,{align:'left',mono:true,col:'#cfd3c4'});
    txt(g,'SE1 · '+L({sv:'nu',en:'now'}),p.cx,p.y+p.h*.8,.034,{mono:true,col:C.lime});
    g.restore();}
  // 11 fuse box
  {const p=F.pane(1,1);g.save();clipPane(g,p);paneBg(p,'#0e1013','#16191d');
    g.fillStyle='#d9d7cf';rrect(g,p.x+.1,p.y+p.h*.28,p.w-.2,p.h*.5,.02);g.fill();
    for(let i=0;i<8;i++){const x=p.x+.14+(i%4)*.085,y=p.y+p.h*(.33+Math.floor(i/4)*.22),tripped=s.trip>0&&i===5;
      g.fillStyle='#f4f3ee';g.fillRect(x,y,.06,.2);g.fillStyle=tripped?'#ff3030':'#2b2b2b';g.fillRect(x+.018,y+(tripped?.11:.05),.024,.05);
      g.fillStyle=tripped?'#400':rgba(C.lime,.35+.6*clamp(s.b+Math.sin(t*4+i)*.2));g.beginPath();g.arc(x+.03,y+.17,.008,0,TAU);g.fill();}
    if(s.trip>0)txt(g,L({sv:'Säkringen gick!',en:'Fuse tripped!'}),p.cx,p.y+p.h*.18,.05,{w:900,col:'#ff5a5a'});
    g.restore();}
  // 12 outlet, lamp and house
  {const p=F.pane(0,1);g.save();clipPane(g,p);paneBg(p,'#0a0d14','#141922');
    const k=clamp(.35+P.total/2000+b*.8);
    const hx=p.cx,hy=p.y+p.h*.48;g.fillStyle='#7c1c1c';g.fillRect(hx-.2,hy-.12,.4,.24);g.fillStyle='#2a1010';g.beginPath();g.moveTo(hx-.24,hy-.12);g.lineTo(hx,hy-.3);g.lineTo(hx+.24,hy-.12);g.fill();
    g.fillStyle='#fff';g.fillRect(hx-.2,hy-.125,.4,.01);
    for(let i=0;i<4;i++){const wx=hx-.16+i*.09,on=k>.3+i*.15||s.city>0;g.fillStyle=on?'#ffe08a':'#1a1a1a';g.fillRect(wx,hy-.06,.06,.07);if(on)glowDot(g,wx+.03,hy-.025,.1,'#ffd27a',.35);}
    const ox=p.cx,oy=p.y+p.h*.82;g.fillStyle='#f2f0ea';g.beginPath();g.arc(ox,oy,.09,0,TAU);g.fill();g.fillStyle='#d6d3ca';g.beginPath();g.arc(ox,oy,.065,0,TAU);g.fill();
    g.fillStyle='#222';g.beginPath();g.arc(ox-.025,oy,.011,0,TAU);g.arc(ox+.025,oy,.011,0,TAU);g.fill();
    g.strokeStyle='#ddd';g.lineWidth=.012;g.beginPath();g.moveTo(ox,oy);g.quadraticCurveTo(ox-.2,oy-.1,p.x+.12,p.y+p.h*.2);g.stroke();
    if(k>.92||s.city>0)smiley(g,p.x+.12,p.y+p.h*.2,.07,true,'#fff7d0',.2);bulb(p.x+.12,p.y+p.h*.2,.045,k);
    g.restore();}
}
function drawPath(t){
  g.lineCap='round';g.lineJoin='round';
  g.strokeStyle='#2a2f36';g.lineWidth=.026;g.beginPath();EP.forEach(([x,y],i)=>i?g.lineTo(x,y):g.moveTo(x,y));g.stroke();
  g.strokeStyle=rgba(C.lime,.25+.4*s.b);g.lineWidth=.007;g.stroke();
  for(const q of pulses){const[x,y]=at(EP,ED,q.d);glowDot(g,x,y,.1+q.e*.06,C.lime,.6);g.fillStyle='#f4ffd0';g.beginPath();g.arc(x,y,.018+q.e*.01,0,TAU);g.fill();}
  for(const d of drops){const[x,y]=at(WP,WD,d.d);g.fillStyle='#bfe9ff';g.beginPath();g.arc(x,y,.012,0,TAU);g.fill();}
  for(const sp of sparks){sp.l-=1/60;g.strokeStyle=rgba('#e8f4ff',sp.l*3);g.lineWidth=.006;g.beginPath();g.moveTo(sp.x,sp.y);for(let k=0;k<4;k++)g.lineTo(sp.x+(Math.random()-.5)*.06,sp.y-k*.02);g.stroke();}
  sparks=sparks.filter(x=>x.l>0);
  if(s.follow>=0){const[x,y]=at(EP,ED,s.follow*ED[ED.length-1]);glowDot(g,x,y,.35,C.lime,.7);smiley(g,x,y,.07,true,'#000',.22);}
}

const idea={
  id:'elektricitet',n:2,steam:'E',col:C.amber,
  name:{sv:'Elektricitet',en:'Electricity'},sub:{sv:'Från älv till uttag',en:'From river to outlet'},
  q:{sv:'Hur kommer strömmen från Skellefteälven till uttaget hemma?',en:'How does power get from the Skellefte river to your outlet?'},
  pitch:{tagline:{sv:'Tolv rutor, tolv kapitel. Strömmen börjar som snö i fjällen och slutar som ljus i en lampa. Utan publik går allt i dagens takt från Skellefteå Kraft. När folk rör sig ökar produktionen och varje steg överdrivs: mer regn, snabbare turbiner, gnistor, och till slut säkringen som går.',en:'Twelve panes, twelve chapters. Power starts as snow in the mountains and ends as light in a lamp. Without a crowd it runs at today\'s pace from Skellefteå Kraft. When people move, production rises and every step is exaggerated: more rain, faster turbines, sparks, and finally a blown fuse.'},
    how:[{sv:'Läs från vänster till höger, ner genom tvärposten och tillbaka.',en:'Read left to right, down through the transom and back.'},
      {sv:'Rör er på torget: vattnet forsar, vindsnurrorna rusar och mätaren snurrar.',en:'Move on the plaza: the water rushes, the turbines race and the meter spins.'},
      {sv:'Får ni upp det på max lyser hela huset och lampan ler.',en:'Push it to the max and the whole house lights up and the lamp smiles.'}],
    trick:{sv:'Varje ruta är ett kapitel. Kabeln går under muren mellan enheterna, som under en gata, och tvärposten är där strömmen tar steget från produktion till nät.',en:'Each pane is a chapter. The cable runs under the pier between the units like under a street, and the transom is where power steps from production to grid.'},
    chips:[['cam',{sv:'Djupkamera: rörelse = produktion',en:'Depth cam: motion = production'}],['web',{sv:'Webb: vind, vatten, pump',en:'Web: wind, water, pump'}],['clock',{sv:'Kom när du vill',en:'Drop in'}]],
    fake:{sv:'Produktion och elpris är simulerade (Skellefteå Kraft / Nord Pool senare)',en:'Production and price are simulated (Skellefteå Kraft / Nord Pool later)'}},
  init(){pulses=[];drops=[];rain=[];s.follow=-1;s.trip=0;s.city=0;},
  update(dt,t){
    if(s.live){s.wind=FAKE.wind();const P=FAKE.production();s.flow=clamp(P.hydro/700,.2,1);}
    const raw=clamp(CROWD.act/3.5)+(s.pump?1:0);s.boost=approach(s.boost,clamp(raw),s.pump?3:1.2,dt);s.b=s.boost;
    const P=FAKE.production(),rate=(1.2+P.total/250)*(1+s.b*4);
    if(Math.random()<rate*dt)pulses.push({d:0,e:Math.random()});
    const sp=.9+s.b*2.2;for(const q of pulses)q.d+=sp*dt;pulses=pulses.filter(q=>q.d<ED[ED.length-1]);
    if(Math.random()<(3+s.flow*8)*(1+s.b*2)*dt)drops.push({d:0});for(const d of drops)d.d+=(.25+s.flow*.3)*(1+s.b*2)*dt;drops=drops.filter(d=>d.d<WD[WD.length-1]);
    if(s.follow>=0){s.follow+=dt/28;if(s.follow>1)s.follow=-1;}
    if(s.b>.96&&s.trip<=0&&Math.random()<dt*.4){s.trip=3;}
    s.trip=Math.max(0,s.trip-dt);s.city=s.b>.9?Math.min(3,s.city+dt):Math.max(0,s.city-dt);
  },
  draw(t){drawChapters(t);drawPath(t);for(let i=0;i<12;i++)label(i,F.pane(CH[i].c,CH[i].r));
    if(s.city>1){const k=clamp(s.city-1);g.globalCompositeOperation='lighter';g.fillStyle=rgba(C.lime,.06*k*(.6+.4*Math.sin(t*8)));for(const p of F.panes)g.fillRect(p.x,p.y,p.w,p.h);g.globalCompositeOperation='source-over';}},
  hud(){
    if(s.follow>=0){const i=chapterAt(...at(EP,ED,s.follow*ED[ED.length-1]));if(i>=0)return `${i+1}. ${L(CH[i].t)}: ${L(CH[i].f)}`;}
    const P=FAKE.production(),mw=Math.round(P.total*(1+s.b*1.5));
    return `${mw} MW · ${L({sv:'vatten',en:'hydro'})} ${P.hydro} · ${L({sv:'vind',en:'wind'})} ${P.wind}`+(s.b>.05?` · ${L({sv:'publiken',en:'crowd'})} +${Math.round(s.b*150)} %`:'');
  },
  controls(){
    UI.group({sv:'Källan',en:'The source'});
    UI.toggle({obj:s,key:'live',label:{sv:'Följ dagens data',en:'Follow today\'s data'},onChange:()=>this.syncS()});
    this.sw=UI.slider({obj:s,key:'wind',label:{sv:'Vind',en:'Wind'},min:0,max:25,step:.1,fmt:v=>v.toFixed(1)+' m/s',onInput:()=>{s.live=false;this.syncS();}});
    this.sf=UI.slider({obj:s,key:'flow',label:{sv:'Vattenflöde i älven',en:'River flow'},min:.1,max:1,step:.01,fmt:v=>Math.round(v*100)+' %',onInput:()=>{s.live=false;this.syncS();}});
    UI.group({sv:'Publiken (istället för kameran)',en:'The crowd (instead of the camera)'},'row');
    UI.hold({obj:s,key:'pump',label:{sv:'Håll: alla rör sig',en:'Hold: everyone moves'},cls:'big'});
    UI.button({label:{sv:'Följ energin',en:'Follow the energy'},cls:'big hot',onClick:()=>{s.follow=0;}});
    UI.group();
    UI.toggle({obj:s,key:'labels',label:{sv:'Kapitelnamn i rutorna',en:'Chapter names on the panes'}});
    this.ro=UI.readouts([[{sv:'Produktion',en:'Production'}],[{sv:'Elpris SE1',en:'Price SE1'}],[{sv:'Hushåll',en:'Households'}],[{sv:'Publikens boost',en:'Crowd boost'}]]);
    UI.note({sv:'Simulerad data: produktion, vind och elpris följer en påhittad dygnskurva. På riktigt hämtas de från Skellefteå Kraft och Nord Pool.',en:'Simulated data: production, wind and price follow a made-up daily curve. In the real build they come from Skellefteå Kraft and Nord Pool.'},'fake');
  },
  syncS(){this.sw&&this.sw.sync();this.sf&&this.sf.sync();},
  tick(){if(!this.ro)return;const P=FAKE.production(),mw=Math.round(P.total*(1+s.b*1.5));this.ro.set(0,mw+' MW');this.ro.set(1,FAKE.price()+' öre');this.ro.set(2,Math.round(mw*1000/1.6).toLocaleString(LANG==='sv'?'sv-SE':'en-GB'));this.ro.set(3,'+'+Math.round(s.b*150)+' %');if(s.live)this.syncS();}
};
IDEAS.push(idea);
})();
