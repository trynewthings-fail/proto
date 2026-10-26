/* ================= 4 · STJÄRNHIMLEN: the sky above Skellefteå right now =================
   Stars, planets and the Moon are computed for the real time and place (2 309 stars to magnitude 5.3, HYG via d3-celestial).
   The whole wall is one panorama window, 150° wide, horizon in the bottom row. Nobody there: just the sky.
   Someone standing in front: the guide appears around them (lines, names). Stand still and the brightest thing
   in your column gets a card: how far away it is and when its light set off. Wave for a shooting star. */
(()=>{
const s={az:180,off:0,day:0,speed:0,guide:'people',mw:true,aurora:true,trails:false,daylight:false,simT:0,meteors:[],cards:{},kp:3};
const FOV=150*Math.PI/180,K=F.W/FOV,HZY=F.bot-.2;
const SV={And:'Andromeda',Aql:'Örnen',Aqr:'Vattumannen',Ari:'Väduren',Aur:'Kusken',Boo:'Björnvaktaren',Cam:'Giraffen',Cnc:'Kräftan',CVn:'Jakthundarna',CMa:'Stora hunden',CMi:'Lilla hunden',Cap:'Stenbocken',Cas:'Kassiopeja',Cep:'Kefeus',Cet:'Valfisken',Com:'Berenikes hår',CrB:'Norra kronan',Cyg:'Svanen',Del:'Delfinen',Dra:'Draken',Equ:'Lilla hästen',Eri:'Eridanus',Gem:'Tvillingarna',Her:'Herkules',Hya:'Vattenormen',Lac:'Ödlan',Leo:'Lejonet',LMi:'Lilla lejonet',Lep:'Haren',Lib:'Vågen',Lyn:'Lodjuret',Lyr:'Lyran',Mon:'Enhörningen',Oph:'Ormbäraren',Ori:'Orion',Peg:'Pegasus',Per:'Perseus',Psc:'Fiskarna',PsA:'Södra fisken',Sge:'Pilen',Sgr:'Skytten',Sco:'Skorpionen',Sct:'Skölden',Ser:'Ormen',Sex:'Sextanten',Tau:'Oxen',Tri:'Triangeln',UMa:'Stora björnen',UMi:'Lilla björnen',Vir:'Jungfrun',Vul:'Räven',Crv:'Korpen',Crt:'Bägaren',Col:'Duvan',Pup:'Akterskeppet',Lup:'Vargen',CrA:'Södra kronan',Cen:'Kentauren'};
const SVSTAR={Polaris:'Polstjärnan'};
const LY={Sirius:8.6,Vega:25,Capella:43,Arcturus:37,Betelgeuse:550,Rigel:860,Aldebaran:65,Polaris:433,Deneb:2600,Altair:16.7,Procyon:11.5,Pollux:34,Castor:51,Regulus:79,Spica:250,Antares:550,Fomalhaut:25,Mizar:83,Alcor:82,Dubhe:123,Merak:79,Alioth:83,Alkaid:104,Bellatrix:250,Alnilam:2000,Mintaka:1200,Alnitak:1260,Saiph:650,Mirfak:510,Algol:90,Hamal:66,Alpheratz:97,Mirach:197,Schedar:228,Caph:55,Elnath:134,Menkalinan:81,Alhena:109,Denebola:36,Algieba:130,Kochab:131,Eltanin:154,Rasalhague:49,Alphecca:75,Albireo:430,Sadr:1800,Enif:690,Markab:133,Scheat:196,Thuban:303,Adhara:430,Wezen:1600,Shaula:570,Phecda:84,Megrez:81,Alderamin:49,Menkar:250,Diphda:96,Izar:200,Muphrid:37,'Cor Caroli':110,Rastaban:380,Sheliak:960,Sulafat:620,Tarazed:395,Alcyone:440,Algenib:390};
const DSO=[{n:{sv:'Andromedagalaxen',en:'Andromeda Galaxy'},ra:10.68,dec:41.27,ly:2.5e6,k:'gal',m:3.4},{n:{sv:'Triangelgalaxen',en:'Triangulum Galaxy'},ra:23.46,dec:30.66,ly:2.7e6,k:'gal',m:5.7},
  {n:{sv:'Plejaderna',en:'Pleiades'},ra:56.75,dec:24.12,ly:444,k:'open',m:1.6},{n:{sv:'Orionnebulosan',en:'Orion Nebula'},ra:83.82,dec:-5.39,ly:1344,k:'neb',m:4},
  {n:{sv:'Dubbelhopen',en:'Double Cluster'},ra:34.75,dec:57.13,ly:7500,k:'open',m:4.3},{n:{sv:'Krubban',en:'Beehive'},ra:130.1,dec:19.67,ly:577,k:'open',m:3.7},{n:{sv:'Herkuleshopen',en:'Hercules Cluster'},ra:250.42,dec:36.46,ly:22200,k:'glob',m:5.8}];
const PLAN=[['venus',{sv:'Venus',en:'Venus'},'#fff6d8',-4],['jupiter',{sv:'Jupiter',en:'Jupiter'},'#ffe9c2',-2.5],['mars',{sv:'Mars',en:'Mars'},'#ff8a5c',.5],['saturn',{sv:'Saturnus',en:'Saturn'},'#ffe0a0',.6],['mercury',{sv:'Merkurius',en:'Mercury'},'#e8e0d0',0]];
const NS=SKY.stars.length/4;
const st={alt:new Float32Array(NS),az:new Float32Array(NS),x:new Float32Array(NS),y:new Float32Array(NS),on:new Uint8Array(NS)};
const bv2rgb=bv=>bv<0?'#a9c4ff':bv<.3?'#dfe8ff':bv<.6?'#fff6ea':bv<1?'#ffe2b4':bv<1.4?'#ffc68a':'#ffaa70';
const COLS=[...Array(NS)].map((_,i)=>bv2rgb(SKY.stars[i*4+3]));
const wrap=d=>((d+540)%360)-180;
function proj(alt,az){const d=wrap(az-s.az)*Math.PI/180;if(Math.abs(d)>FOV/2+.15||alt<-8)return null;return[F.W/2+K*d,HZY-K*2*Math.tan(alt*Math.PI/360)];}
let now=new Date(),LST=0,B=null,sunAlt=-30,moonAA=[0,0],lastMW=-1e9,mwAz=-999,trailC=null,guideC=null,meteorT=4;
const mwC=document.createElement('canvas');mwC.width=262;mwC.height=156;const mwX=mwC.getContext('2d');
function buildMW(){
  const W=mwC.width,H=mwC.height,img=mwX.createImageData(W,H),d=img.data;
  for(let py=0;py<H;py++)for(let px=0;px<W;px++){
    const x=px/(W-1)*F.W,y=py/(H-1)*F.H,dAz=(x-F.W/2)/K*180/Math.PI,alt=2*Math.atan((HZY-y)/K/2)*180/Math.PI;
    let v=0;if(alt>-2){const[ra,dec]=ASTRO.radec(alt,s.az+dAz,LST),[l,b]=ASTRO.galactic(ra,dec);
      const bw=5+3*fbm(l*.05,1.3,3),core=.55+.45*Math.cos((l>180?l-360:l)*Math.PI/180*.9);
      v=Math.exp(-Math.pow(b/bw,2))*core*(.55+.9*fbm(l*.09,b*.2+5,4));
      if(l>20&&l<80&&b>0&&b<6)v*=.45+.4*fbm(l*.2,b,2);           // the Great Rift through Cygnus
      v*=smooth(-2,12,alt);}
    const o=(py*W+px)*4;d[o]=180;d[o+1]=195;d[o+2]=255;d[o+3]=clamp(v*120,0,255);}
  mwX.putImageData(img,0,0);
}
function skyColor(){const k=s.daylight?smooth(-18,4,sunAlt):smooth(-18,-4,sunAlt)*.12;return{top:mix('#01030a','#2d66b8',k),hor:mix('#0b1424','#9cc3ee',k),k};}
function skyline(){
  g.fillStyle='#000';g.beginPath();g.moveTo(0,F.H);
  for(let x=0;x<=F.W+.01;x+=.02){const az=ASTRO.rev(s.az+(x-F.W/2)/K*180/Math.PI),n=noise2(az*.35,1),tree=Math.max(0,Math.sin(az*7.3))*.06+noise2(az*2.2,3)*.08;
    let h=.08+tree+n*.05;if(Math.abs(wrap(az-205))<.9)h=.62;if(Math.abs(wrap(az-205))<1.6&&h<.4)h=Math.max(h,.5);   // Sara kulturhus, 20 storeys of timber
    if(Math.abs(wrap(az-232))<.25)h=.4;if(az>140&&az<260&&noise2(az*.8,7)>.62)h=Math.max(h,.16);
    g.lineTo(x,HZY+.03-h);}
  g.lineTo(F.W,F.H);g.fill();
  // lit windows in the tower
  const tx=proj(0,205);if(tx){g.fillStyle='#ffcf7a';for(let f=0;f<14;f++)for(let k=0;k<3;k++)if(hash(f*3+k)>.4)g.fillRect(tx[0]-.03+k*.022,HZY-.55+f*.035,.012,.014);}
  for(const[az,l]of[[0,'N'],[45,'NO'],[90,'O'],[135,'SO'],[180,'S'],[225,'SV'],[270,'V'],[315,'NV']]){const p=proj(0,az);if(!p)continue;const en={NO:'NE',O:'E',SO:'SE',SV:'SW',V:'W',NV:'NW'}[l]||l;
    txt(g,LANG==='sv'?l:en,p[0],F.bot-.07,l.length>1?.06:.085,{w:700,italic:true,col:'#e6c47c',alpha:.9});}
}
function drawAurora(t){
  if(!s.aurora||s.kp<2.5)return;const a=smooth(2.5,6,s.kp);
  for(let k=0;k<40;k++){const az=ASTRO.rev(300+k*3+Math.sin(t*.1+k*.3)*3),p=proj(8+12*noise2(k*.3,t*.05),az);if(!p)continue;
    const hgt=.6+noise2(k*.2,t*.12)*1.2*a,gr=g.createLinearGradient(0,p[1],0,p[1]-hgt);gr.addColorStop(0,'rgba(60,255,150,0)');gr.addColorStop(.15,rgba('#46ff9a',.22*a));gr.addColorStop(.7,rgba('#2fd6a0',.08*a));gr.addColorStop(1,rgba('#ff4fa3',.06*a));
    g.fillStyle=gr;g.fillRect(p[0]-.06,p[1]-hgt,.12,hgt);}
}
function drawMoon(){
  const m=B.moon,[alt,az]=moonAA,p=proj(alt,az);if(!p)return null;
  const R=.07,sp=proj(...ASTRO.altaz(B.sun.ra,B.sun.dec,LST)),ang=sp?Math.atan2(sp[1]-p[1],sp[0]-p[0]):(m.phase<180?0:Math.PI);
  glowDot(g,p[0],p[1],R*7,'#dfe8ff',.18+.25*m.illum);
  g.save();g.translate(p[0],p[1]);g.rotate(ang);
  g.fillStyle='rgba(120,130,150,.35)';g.beginPath();g.arc(0,0,R,0,TAU);g.fill();                  // earthshine
  const c=Math.cos(m.phase*Math.PI/180);g.fillStyle='#f4f1e6';g.beginPath();g.arc(0,0,R,-Math.PI/2,Math.PI/2);g.ellipse(0,0,Math.abs(c)*R,R,0,Math.PI/2,-Math.PI/2,c>0);g.fill();
  g.fillStyle='rgba(150,150,140,.25)';for(const[x,y,r]of[[.2,-.3,.18],[-.25,.1,.22],[.1,.35,.12]]){g.beginPath();g.arc(x*R,y*R,r*R,0,TAU);g.fill();}
  g.restore();return p;
}
function info(i){const n=SKY.names[i];return n?{name:LANG==='sv'?(SVSTAR[n]||n):n,ly:LY[n]}:null;}
function guideLayer(t,objs){
  const c=guideC.getContext('2d');c.setTransform(1,0,0,1,0,0);c.clearRect(0,0,guideC.width,guideC.height);c.setTransform(PPM,0,0,PPM,0,0);
  c.strokeStyle='rgba(230,196,124,.8)';c.lineWidth=.005;c.lineCap='round';c.beginPath();
  for(const k in SKY.lines)for(const seg of SKY.lines[k]){let prev=null;for(const[ra,dec]of seg){const[alt,az]=ASTRO.altaz(ra,dec,LST),p=alt>-3?proj(alt,az):null;if(p&&prev&&Math.abs(p[0]-prev[0])<1.2){c.moveTo(prev[0],prev[1]);c.lineTo(p[0],p[1]);}prev=p;}}
  c.stroke();
  for(const k in SKY.cons){const[ra,dec,rank]=SKY.cons[k];if(rank>2)continue;const[alt,az]=ASTRO.altaz(ra,dec,LST);if(alt<4)continue;const p=proj(alt,az);if(!p)continue;
    txt(c,(LANG==='sv'?SV[k]||SKY.cons[k][3]:SKY.cons[k][3]).toUpperCase(),p[0],p[1],rank===1?.05:.04,{italic:true,w:700,col:'#e6c47c',ls:.12,alpha:.9});}
  for(const o of objs)if(o.label){c.strokeStyle='rgba(239,227,200,.85)';c.lineWidth=.003;c.beginPath();for(let k=0;k<8;k++){const a=k*Math.PI/4,r1=.018,r2=k%2?.03:.045;c.moveTo(o.x+Math.cos(a)*r1,o.y+Math.sin(a)*r1);c.lineTo(o.x+Math.cos(a)*r2,o.y+Math.sin(a)*r2);}c.stroke();
    txt(c,o.label,o.x+.05,o.y-.035,o.big?.05:.04,{align:'left',italic:true,w:700,col:'#f3ead2',stroke:.01,strokeCol:'rgba(0,0,0,.7)'});
    if(o.kind==='gal'){c.strokeStyle='rgba(255,255,255,.7)';c.lineWidth=.004;c.beginPath();c.ellipse(o.x,o.y,.035,.014,-.6,0,TAU);c.stroke();}
    if(o.kind==='open'||o.kind==='glob'||o.kind==='neb'){c.strokeStyle='rgba(255,255,255,.6)';c.lineWidth=.004;c.setLineDash([.008,.008]);c.beginPath();c.arc(o.x,o.y,.03,0,TAU);c.stroke();c.setLineDash([]);}}
  // reveal only around visitors (or everywhere)
  if(s.guide==='people'){c.globalCompositeOperation='destination-in';c.fillStyle='#000';c.setTransform(1,0,0,1,0,0);
    const m=c.createLinearGradient(0,0,guideC.width,0),cols=CROWD.people.filter(p=>p.z<4.5).map(p=>({x:p.x,a:clamp(1.3-p.z/4)}));
    c.fillStyle='rgba(0,0,0,0)';c.globalCompositeOperation='destination-in';
    const mask=document.createElement('canvas');mask.width=guideC.width;mask.height=1;const mx=mask.getContext('2d');
    for(const q of cols){const x=q.x*PPM,r=.62*PPM,gr=mx.createLinearGradient(x-r,0,x+r,0);gr.addColorStop(0,'rgba(0,0,0,0)');gr.addColorStop(.5,`rgba(0,0,0,${q.a})`);gr.addColorStop(1,'rgba(0,0,0,0)');mx.globalCompositeOperation='lighter';mx.fillStyle=gr;mx.fillRect(x-r,0,r*2,1);}
    c.drawImage(mask,0,0,guideC.width,guideC.height);c.globalCompositeOperation='source-over';void m;}
  else if(s.guide==='off'){c.clearRect(0,0,F.W,F.H);}
  g.drawImage(guideC,0,0,F.W,F.H);
}
function card(c,o,t){
  const p=F.pane(c,1),y=p.y+.08,h=.42;
  g.fillStyle='#efe3c8';rrect(g,p.x+.02,y,p.w-.04,h,.012);g.fill();g.strokeStyle='#7a4a22';g.lineWidth=.006;g.stroke();g.lineWidth=.002;rrect(g,p.x+.035,y+.015,p.w-.07,h-.03,.008);g.stroke();
  g.strokeStyle='rgba(230,196,124,.7)';g.lineWidth=.004;g.setLineDash([.015,.012]);g.beginPath();g.moveTo(p.cx,y);g.lineTo(o.x,o.y);g.stroke();g.setLineDash([]);
  txt(g,o.name,p.cx,y+.08,o.name.length>12?.045:.062,{w:800,italic:true,col:'#2a1d12'});
  const ly=o.ly,dist=ly==null?'':ly<1e-6?(ly*365.25*864e2).toFixed(1).replace('.',LANG==='sv'?',':'.')+L({sv:' ljussekunder',en:' light seconds'}):ly<1e-3?(ly*365.25*24*60).toFixed(1).replace('.',LANG==='sv'?',':'.')+L({sv:' ljusminuter',en:' light minutes'}):ly>=1e6?(ly/1e6).toFixed(1).replace('.',LANG==='sv'?',':'.')+L({sv:' miljoner ljusår',en:' million light years'}):Math.round(ly).toLocaleString(LANG==='sv'?'sv-SE':'en-GB')+L({sv:' ljusår',en:' light years'});
  txt(g,dist,p.cx,y+.17,.034,{mono:true,w:600,col:'#7a4a22'});
  const yr=new Date().getFullYear()-ly;
  const left=ly==null?'':ly<1e-3?L({sv:'Ljuset är några minuter gammalt',en:'The light is minutes old'}):ly<2000?L({sv:'Ljuset lämnade den år',en:'Its light left in'}):L({sv:'Ljuset lämnade den för',en:'Its light left'});
  const when=ly==null?'':ly<1e-3?'':ly<2000?String(Math.round(yr)):ly>=1e6?(ly/1e6).toFixed(1).replace('.',LANG==='sv'?',':'.')+L({sv:' milj. år sedan',en:' million years ago'}):Math.round(ly).toLocaleString(LANG==='sv'?'sv-SE':'en-GB')+L({sv:' år sedan',en:' years ago'});
  txt(g,left,p.cx,y+.26,.03,{mono:true,col:'#5a4632'});txt(g,when,p.cx,y+.34,.07,{w:900,col:'#2a1d12'});
}

const idea={
  id:'stjarnhimlen',n:4,post:'atlas',steam:'S',col:C.violet,
  name:{sv:'Stjärnhimlen',en:'The night sky'},sub:{sv:'Himlen över Skellefteå just nu',en:'The sky over Skellefteå now'},
  q:{sv:'Vilka stjärnor står över Exploratoriet just nu?',en:'Which stars are above Exploratoriet right now?'},
  pitch:{tagline:{sv:'Fönstren blir ett 150° brett panoramafönster mot himlen ovanför Skellefteå, uträknad för exakt nu: 2 309 stjärnor, planeterna, månen och dess fas. Utan publik är det bara himlen. Ställer du dig framför tänds guiden runt dig med stjärnbilder och namn.',en:'The windows become a 150° panorama of the sky above Skellefteå, computed for right now: 2,309 stars, the planets, the Moon and its phase. With nobody there it is just the sky. Stand in front and the guide lights up around you with constellations and names.'},
    how:[{sv:'Gå längs fönstren: stjärnbilderna och namnen följer dig som en ficklampa.',en:'Walk along the windows: constellations and names follow you like a torch.'},
      {sv:'Stå still: det ljusaste i din kolumn får ett kort. Hur långt bort, och när ljuset lämnade den.',en:'Stand still: the brightest thing in your column gets a card. How far, and when its light left.'},
      {sv:'Vinka så faller ett stjärnfall från din ruta.',en:'Wave and a shooting star falls from your pane.'}],
    trick:{sv:'Hela väggen är ett enda fönster mot himlen. Horisonten och Skellefteås siluett ligger i nedre raden, så karmar och spröjs blir som ett riktigt fönster du tittar ut genom.',en:'The whole wall is one window onto the sky. The horizon and Skellefteå\'s skyline sit in the bottom row, so frames and mullions read as a real window you look out through.'},
    chips:[['cam',{sv:'Djupkamera: position, stå still, vinka',en:'Depth cam: position, stand still, wave'}],['web',{sv:'Webb: riktning och tid',en:'Web: direction and time'}],['star',{sv:'Räknas fram för just nu',en:'Computed for right now'}]],
    fake:{sv:'Himlen är riktig. Norrskensindex (Kp) är simulerat',en:'The sky is real. The aurora index (Kp) is simulated'}},
  init(){s.simT=0;s.meteors=[];s.cards={};s.kp=FAKE.kp();lastMW=-1e9;
    trailC=document.createElement('canvas');trailC.width=scr.width;trailC.height=scr.height;guideC=document.createElement('canvas');guideC.width=scr.width;guideC.height=scr.height;},
  update(dt,t){
    s.simT+=dt*[0,60,600,3600][s.speed];
    now=new Date(Date.now()+s.off*36e5+s.day*864e5+s.simT*1e3);LST=ASTRO.lst(now);B=ASTRO.bodies(now);
    sunAlt=ASTRO.altaz(B.sun.ra,B.sun.dec,LST)[0];moonAA=ASTRO.altaz(B.moon.ra,B.moon.dec,LST);moonAA[0]-=.95*Math.cos(moonAA[0]*Math.PI/180); // parallax
    if(t-lastMW>(s.speed?.15:1.2)||Math.abs(s.az-mwAz)>.5){buildMW();lastMW=t;mwAz=s.az;}
    // meteors: the Orionids radiate from Orion in late October
    meteorT-=dt;if(meteorT<0){meteorT=3+Math.random()*9;spawnMeteor(null);}
    for(const p of CROWD.people){if(p.wave>0&&!p._m){p._m=1;spawnMeteor(p.x);}if(p.wave<=0)p._m=0;}
    for(const m of s.meteors){m.t+=dt;}s.meteors=s.meteors.filter(m=>m.t<m.life);
  },
  draw(t){
    const sk=skyColor(),gr=g.createLinearGradient(0,0,0,HZY);gr.addColorStop(0,sk.top);gr.addColorStop(1,sk.hor);g.fillStyle=gr;g.fillRect(0,0,F.W,F.H);
    // town glow on the horizon
    const lg=g.createLinearGradient(0,HZY-.6,0,HZY);lg.addColorStop(0,'rgba(255,150,80,0)');lg.addColorStop(1,'rgba(255,150,80,.13)');g.fillStyle=lg;g.fillRect(0,HZY-.6,F.W,.6);
    if(s.mw){g.save();g.globalCompositeOperation='lighter';g.globalAlpha=(1-sk.k)*.6;g.filter='blur(6px)';g.drawImage(mwC,0,0,F.W,F.H);g.filter='none';g.restore();}
    drawAurora(t);
    // stars
    const dim=1-sk.k*.9,objs=[];
    const tc=s.trails&&s.speed>=2?trailC.getContext('2d'):null;if(tc){tc.setTransform(1,0,0,1,0,0);tc.fillStyle='rgba(0,0,0,.035)';tc.globalCompositeOperation='destination-out';tc.fillRect(0,0,trailC.width,trailC.height);tc.globalCompositeOperation='source-over';tc.setTransform(PPM,0,0,PPM,0,0);}
    for(let i=0;i<NS;i++){const ra=SKY.stars[i*4],dec=SKY.stars[i*4+1];let mag=SKY.stars[i*4+2];const[alt,az]=ASTRO.altaz(ra,dec,LST);if(alt<-1)continue;const p=proj(alt,az);if(!p)continue;
      mag+=.25/Math.max(.08,Math.sin(Math.max(1,alt)*Math.PI/180))-.25;                              // extinction near the horizon
      const tw=1+(.18+.35*smooth(30,2,alt))*(noise2(i*.7,t*(3+i%5))-.5),b=Math.pow(10,-.4*(mag-1))*tw*dim;if(b<.02)continue;
      const r=clamp(.0045+.011*Math.sqrt(b),.0045,.03),col=COLS[i];
      if(b>.45)glowDot(g,p[0],p[1],r*7,col,clamp(b*.35,0,.6));
      g.fillStyle=col;g.globalAlpha=clamp(b*1.4,.25,1);g.beginPath();g.arc(p[0],p[1],r,0,TAU);g.fill();g.globalAlpha=1;
      if(tc&&mag<3.8){tc.fillStyle=col;tc.globalAlpha=.7;tc.beginPath();tc.arc(p[0],p[1],r*.7,0,TAU);tc.fill();tc.globalAlpha=1;}
      if(SKY.names[i]&&alt>2&&mag<2.6){const n=info(i);objs.push({x:p[0],y:p[1],name:n.name,label:n.name,ly:n.ly,mag,big:mag<.5});}}
    if(tc){g.globalCompositeOperation='lighter';g.drawImage(trailC,0,0,F.W,F.H);g.globalCompositeOperation='source-over';}
    // deep sky
    for(const o of DSO){const[alt,az]=ASTRO.altaz(o.ra,o.dec,LST);if(alt<3)continue;const p=proj(alt,az);if(!p)continue;
      if(o.k==='gal')glowDot(g,p[0],p[1],.06,'#cfd8ff',.25*dim);else glowDot(g,p[0],p[1],.04,'#dfe6ff',.3*dim);
      objs.push({x:p[0],y:p[1],name:L(o.n),label:L(o.n),ly:o.ly,mag:o.m,kind:o.k});}
    // planets
    for(const[k,n,col,m]of PLAN){const b=B[k],[alt,az]=ASTRO.altaz(b.ra,b.dec,LST);if(alt<0)continue;const p=proj(alt,az);if(!p)continue;
      glowDot(g,p[0],p[1],.1,col,.5*dim+.2);g.fillStyle=col;g.beginPath();g.arc(p[0],p[1],.016,0,TAU);g.fill();
      if(k==='saturn'){g.strokeStyle=col;g.lineWidth=.004;g.beginPath();g.ellipse(p[0],p[1],.03,.01,-.3,0,TAU);g.stroke();}
      objs.push({x:p[0],y:p[1],name:L(n),label:L(n),ly:b.au*1.58e-5,mag:m,big:true});}
    const mp=drawMoon();if(mp)objs.push({x:mp[0],y:mp[1],name:L({sv:'Månen',en:'The Moon'}),label:L({sv:'Månen',en:'The Moon'})+' · '+L(ASTRO.phaseName(B.moon.phase)),ly:4.1e-8,mag:-11,big:true});
    // shooting stars
    for(const m of s.meteors){const k=m.t/m.life,x=m.x+m.dx*k,y=m.y+m.dy*k,tail=g.createLinearGradient(x,y,x-m.dx*.25,y-m.dy*.25);
      tail.addColorStop(0,`rgba(255,255,255,${1-k})`);tail.addColorStop(1,'rgba(255,255,255,0)');g.strokeStyle=tail;g.lineWidth=.012;g.beginPath();g.moveTo(x,y);g.lineTo(x-m.dx*.25,y-m.dy*.25);g.stroke();
      glowDot(g,x,y,.05,'#ffffff',1-k);}
    // graticule: altitude every 15°, azimuth every 15°, engraved and faint
    g.strokeStyle='rgba(230,196,124,.13)';g.lineWidth=.003;g.setLineDash([.01,.012]);
    for(let alt=15;alt<=60;alt+=15){const y=HZY-K*2*Math.tan(alt*Math.PI/360);g.beginPath();g.moveTo(0,y);g.lineTo(F.W,y);g.stroke();txt(g,alt+'°',.03,y-.02,.03,{align:'left',italic:true,col:'rgba(230,196,124,.5)'});}
    for(let a=0;a<360;a+=15){const p=proj(0,a);if(!p)continue;g.beginPath();g.moveTo(p[0],HZY);g.lineTo(p[0],0);g.stroke();}
    g.setLineDash([]);
    skyline();
    guideLayer(t,objs);
    // cards for people standing still
    for(let c=0;c<6;c++){const p=personAtCol(c,3.5);if(!p||p.still<1.5)continue;const col=F.cols[c];
      const cand=objs.filter(o=>Math.abs(o.x-col.cx)<.45).sort((a,b)=>a.mag-b.mag)[0];if(cand)card(c,cand,t);}
    if(sk.k>.3&&!s.daylight)txt(g,L({sv:'Dagsljuset är avstängt i labbet',en:'Daylight is switched off in the lab'}),F.W/2,.2,.05,{mono:true,col:'#cfd3c4',alpha:.6});
  },
  hud(){const tt=now.toLocaleString(LANG==='sv'?'sv-SE':'en-GB',{weekday:'short',hour:'2-digit',minute:'2-digit',day:'numeric',month:'short'});
    const up=PLAN.filter(([k])=>ASTRO.altaz(B[k].ra,B[k].dec,LST)[0]>0).map(([,n])=>L(n));
    return `${tt} · ${L(ASTRO.phaseName(B.moon.phase))} ${Math.round(B.moon.illum*100)} %`+(up.length?` · ${up.join(', ')}`:'')+(sunAlt>-6?` · ${L({sv:'solen är uppe',en:'the sun is up'})}`:'');},
  controls(){
    UI.group({sv:'Var och när',en:'Where and when'},'knobs');
    UI.knob({obj:s,key:'az',label:L({sv:'RIKTNING',en:'FACING'}),min:0,max:360,wrap:true,reset:180,fmt:v=>{const d=['N',LANG==='sv'?'NO':'NE',LANG==='sv'?'O':'E',LANG==='sv'?'SO':'SE','S',LANG==='sv'?'SV':'SW',LANG==='sv'?'V':'W',LANG==='sv'?'NV':'NW'];return d[Math.round(ASTRO.rev(v)/45)%8]+' '+Math.round(ASTRO.rev(v))+'°';},col:C.violet});
    UI.knob({obj:s,key:'off',label:L({sv:'TIMMAR',en:'HOURS'}),min:-12,max:12,reset:0,fmt:v=>(v>=0?'+':'')+v.toFixed(1)+' h',col:C.violet});
    UI.knob({obj:s,key:'day',label:L({sv:'DAGAR',en:'DAYS'}),min:-182,max:182,reset:0,fmt:v=>(v>=0?'+':'')+Math.round(v)+' d',col:C.violet});
    UI.knob({obj:s,key:'kp',label:'KP',min:0,max:9,reset:3,fmt:v=>v.toFixed(1),col:'#46ff9a'});
    UI.group(null,'row');
    for(const[az,l]of[[0,'N'],[90,{sv:'Ö',en:'E'}],[180,'S'],[270,{sv:'V',en:'W'}]])UI.button({label:l,onClick:()=>{s.az=az;buildPanel();}});
    UI.button({label:{sv:'Nu',en:'Now'},cls:'hot',onClick:()=>{s.off=0;s.day=0;s.simT=0;s.speed=0;buildPanel();}});
    UI.button({label:{sv:'Julafton 18:00',en:'Christmas Eve 18:00'},onClick:()=>{const n=new Date(),x=new Date(n.getFullYear(),11,24,18,0);s.simT=0;s.speed=0;s.day=Math.round((x-n)/864e5);s.off=(x-n)/36e5-s.day*24;if(s.day>182){s.day-=365;}buildPanel();}});
    UI.group();
    UI.seg({obj:s,key:'speed',label:{sv:'Tidsförlopp',en:'Time lapse'},options:[[0,'1×'],[1,{sv:'1 min/s',en:'1 min/s'}],[2,{sv:'10 min/s',en:'10 min/s'}],[3,{sv:'1 h/s',en:'1 h/s'}]]});
    UI.seg({obj:s,key:'guide',label:{sv:'Guiden',en:'The guide'},options:[['off',{sv:'Av',en:'Off'}],['people',{sv:'Runt besökare',en:'Around visitors'}],['all',{sv:'Alltid',en:'Always'}]]});
    UI.group();
    UI.toggle({obj:s,key:'mw',label:{sv:'Vintergatan',en:'Milky Way'}});
    UI.toggle({obj:s,key:'aurora',label:{sv:'Norrsken (i norr)',en:'Aurora (to the north)'}});
    UI.toggle({obj:s,key:'trails',label:{sv:'Stjärnspår vid snabb tid',en:'Star trails when fast'},onChange:()=>{const c=trailC.getContext('2d');c.setTransform(1,0,0,1,0,0);c.clearRect(0,0,trailC.width,trailC.height);}});
    UI.toggle({obj:s,key:'daylight',label:{sv:'Visa dagsljus',en:'Show daylight'}});
    UI.group(null,'row');
    UI.button({label:{sv:'Stjärnfall',en:'Shooting star'},onClick:()=>spawnMeteor(null)});
    UI.note({sv:'Stjärnor, planeter och månen räknas fram för Skellefteå och klockan i din dator. Norrskensindex är simulerat.',en:'Stars, planets and the Moon are computed for Skellefteå and your computer\'s clock. The aurora index is simulated.'},'fake');
  }
};
function spawnMeteor(x){
  const rad=ASTRO.altaz(95,16,LST),rp=rad[0]>0?proj(...rad):null;
  let sx=x??(.3+Math.random()*(F.W-.6)),sy=.15+Math.random()*.9;
  let dx=(Math.random()-.5)*1.6,dy=.4+Math.random()*.5;
  if(rp&&x==null){const ux=sx-rp[0],uy=sy-rp[1],d=Math.hypot(ux,uy)||1;dx=ux/d*1.2;dy=uy/d*1.2;}
  s.meteors.push({x:sx,y:sy,dx,dy,t:0,life:.6+Math.random()*.5});
}
IDEAS.push(idea);
})();
