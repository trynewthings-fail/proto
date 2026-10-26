/* ================= Core: language, façade geometry, maths, drawing helpers ================= */
let LANG='sv';
try{const l=localStorage.getItem('fl-lang');if(l==='en'||l==='sv')LANG=l;}catch(e){}
const L=o=>o==null?'':(typeof o==='object'&&!Array.isArray(o))?(o[LANG]??o.sv??''):o;
const esc=s=>String(s).replace(/[&<>"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]));

/* Façade in metres, measured from the photo. x = 0 at the left unit's outer edge, y = 0 at the windows' top, y grows down.
   Each unit: frame 0.08 · 3 panes 0.60 · 2 mullions 0.14 · transom 0.19 · top row 1.48 · bottom row 1.28. Pier 0.75. */
const F=(()=>{
  const K=0.08,PW=0.60,MU=0.14,TR=0.19,PIER=0.75,HT=1.48,HB=1.28;
  const UW=K*2+PW*3+MU*2,H=K*2+HT+TR+HB,W=UW*2+PIER;
  const units=[0,UW+PIER].map((x0,u)=>({u,x0,x1:x0+UW,ix0:x0+K,ix1:x0+UW-K,cx:x0+UW/2}));
  const rows=[{y:K,h:HT},{y:K+HT+TR,h:HB}];
  const panes=[];
  for(let r=0;r<2;r++)for(let c=0;c<6;c++){
    const u=c<3?0:1,k=c%3,x=units[u].x0+K+k*(PW+MU);
    panes.push({i:r*6+c,c,r,u,k,x,y:rows[r].y,w:PW,h:rows[r].h,cx:x+PW/2,cy:rows[r].y+rows[r].h/2});
  }
  const cols=[0,1,2,3,4,5].map(c=>({c,x:panes[c].x,w:PW,cx:panes[c].cx}));
  return {K,PW,MU,TR,PIER,HT,HB,UW,H,W,units,rows,panes,cols,SILL:0.75,
    top:K,bot:H-K,trY0:K+HT,trY1:K+HT+TR,pierX0:UW,pierX1:UW+PIER,
    pane:(c,r)=>panes[r*6+c],
    colAt(x){let b=0,d=1e9;for(const c of cols){const e=Math.abs(c.cx-x);if(e<d){d=e;b=c.c;}}return b;}};
})();

const PPM=300;                                   // screen canvas pixels per metre
const scr=document.createElement('canvas');
scr.width=Math.round(F.W*PPM);scr.height=Math.round(F.H*PPM);
const g=scr.getContext('2d');

/* maths */
const clamp=(v,a=0,b=1)=>v<a?a:v>b?b:v;
const lerp=(a,b,t)=>a+(b-a)*t;
const smooth=(a,b,v)=>{const t=clamp((v-a)/(b-a));return t*t*(3-2*t);};
const ease=t=>t<.5?2*t*t:1-Math.pow(-2*t+2,2)/2;
const approach=(v,target,rate,dt)=>v+(target-v)*(1-Math.exp(-rate*dt));
const TAU=Math.PI*2;
function hash(n){n=Math.sin(n*127.1+311.7)*43758.5453;return n-Math.floor(n);}
function hash2(x,y){return hash(x*157.31+y*913.77);}
function noise2(x,y){const xi=Math.floor(x),yi=Math.floor(y),xf=x-xi,yf=y-yi,u=xf*xf*(3-2*xf),v=yf*yf*(3-2*yf);
  const a=hash2(xi,yi),b=hash2(xi+1,yi),c=hash2(xi,yi+1),d=hash2(xi+1,yi+1);return lerp(lerp(a,b,u),lerp(c,d,u),v);}
function fbm(x,y,o=5){let s=0,a=.5,f=1;for(let i=0;i<o;i++){s+=a*noise2(x*f,y*f);f*=2.03;a*=.5;}return s;}
function rng(seed){let s=seed>>>0||1;return()=>{s^=s<<13;s^=s>>>17;s^=s<<5;return(s>>>0)/4294967296;};}

/* colour */
function hexRGB(h){h=h.replace('#','');if(h.length===3)h=h.split('').map(c=>c+c).join('');const n=parseInt(h,16);return[n>>16&255,n>>8&255,n&255];}
function rgba(h,a=1){const[r,g2,b]=hexRGB(h);return`rgba(${r},${g2},${b},${a})`;}
function mix(h1,h2,t){const a=hexRGB(h1),b=hexRGB(h2);return'#'+a.map((v,i)=>Math.round(lerp(v,b[i],clamp(t))).toString(16).padStart(2,'0')).join('');}
function ramp(stops,t){t=clamp(t);for(let i=1;i<stops.length;i++)if(t<=stops[i][0]){const[a,ca]=stops[i-1],[b,cb]=stops[i];return mix(ca,cb,(t-a)/(b-a||1));}return stops[stops.length-1][1];}
const C={lime:'#CAFE03',pink:'#ff4fa3',cyan:'#2fd6e0',amber:'#ffb21e',violet:'#7b93ff',fg:'#eef1e4',ink:'#0a0b09'};

/* text in metres: canvas fonts below 1px get quantised, so draw at ×100 */
function txt(c,s,x,y,size,o={}){
  c.save();c.translate(x,y);c.scale(.01,.01);
  c.font=`${o.italic?'italic ':''}${o.w||700} ${size*100}px ${o.mono?"'IBM Plex Mono',monospace":"Alegreya,Georgia,serif"}`;
  c.textAlign=o.align||'center';c.textBaseline=o.base||'middle';
  if(o.ls)c.letterSpacing=(o.ls*size*100)+'px';
  c.globalAlpha*=o.alpha??1;
  if(o.glow){c.shadowColor=o.glow;c.shadowBlur=o.blur||18;}
  if(o.stroke){c.lineWidth=o.stroke*100;c.strokeStyle=o.strokeCol||'#000';c.lineJoin='round';c.strokeText(s,0,0);}
  c.fillStyle=o.col||C.fg;c.fillText(s,0,0);
  c.restore();
}
function rrect(c,x,y,w,h,r){r=Math.min(r,w/2,h/2);c.beginPath();c.moveTo(x+r,y);c.arcTo(x+w,y,x+w,y+h,r);c.arcTo(x+w,y+h,x,y+h,r);c.arcTo(x,y+h,x,y,r);c.arcTo(x,y,x+w,y,r);c.closePath();}
function clipPane(c,p,pad=0){c.beginPath();c.rect(p.x-pad,p.y-pad,p.w+pad*2,p.h+pad*2);c.clip();}
function glowDot(c,x,y,r,col,a=1){const gr=c.createRadialGradient(x,y,0,x,y,r);gr.addColorStop(0,rgba(col,a));gr.addColorStop(.25,rgba(col,a*.45));gr.addColorStop(1,rgba(col,0));c.fillStyle=gr;c.fillRect(x-r,y-r,r*2,r*2);}
/* The TNT smiley. happy=false turns it 180° into the sad face. */
function smiley(c,cx,cy,R,happy=true,col=C.lime,lw=0.16){
  c.save();c.translate(cx,cy);if(!happy)c.rotate(Math.PI);
  c.strokeStyle=col;c.fillStyle=col;c.lineWidth=R*lw;c.lineCap='round';
  c.beginPath();c.arc(0,0,R,0,TAU);c.stroke();
  c.beginPath();c.arc(-R*.34,-R*.2,R*.13,0,TAU);c.arc(R*.34,-R*.2,R*.13,0,TAU);c.fill();
  c.beginPath();c.arc(0,R*.02,R*.48,.22*Math.PI,.78*Math.PI);c.stroke();
  c.restore();
}
function clearScr(col='#000'){g.setTransform(1,0,0,1,0,0);g.globalAlpha=1;g.globalCompositeOperation='source-over';g.shadowBlur=0;g.fillStyle=col;g.fillRect(0,0,scr.width,scr.height);g.setTransform(PPM,0,0,PPM,0,0);}

/* Simulated "live" data for the pitch. Deterministic per day and hour, so everyone sees the same numbers. */
const FAKE=(()=>{
  const now=()=>new Date();
  const doy=d=>Math.floor((d-new Date(d.getFullYear(),0,0))/864e5);
  // Skellefteå monthly normals, °C (approx. 1991–2020)
  const NORM=[-9.6,-9.1,-4.8,1.2,7.4,13.2,16.3,14.2,9.1,2.8,-2.9,-7.0];
  function tempAt(d=now()){
    const m=d.getMonth()+(d.getDate()-15)/30,i=Math.floor(m),f=m-i;
    const base=lerp(NORM[(i+12)%12],NORM[(i+13)%12],f);
    const day=doy(d)+d.getFullYear()*400;
    const weather=(noise2(day*.35,3.1)-.5)*9;                       // a few days of warm or cold spells
    const diurnal=Math.cos((d.getHours()+d.getMinutes()/60-15)/24*TAU)*2.4;
    return Math.round((base+weather+diurnal)*10)/10;
  }
  function wind(d=now()){const h=doy(d)*24+d.getHours()+d.getMinutes()/60;return Math.round((3+noise2(h*.07,8.2)*9)*10)/10;}
  function price(d=now()){ // SE1 spot, öre/kWh
    const h=d.getHours()+d.getMinutes()/60,day=doy(d);
    const peak=Math.exp(-Math.pow((h-8.5)/2.2,2))*28+Math.exp(-Math.pow((h-18)/2.6,2))*34;
    return Math.max(4,Math.round(18+peak*(0.6+noise2(day*.5,1.7))+noise2(h*.4,day)*14));
  }
  function production(d=now()){ // Skellefteå Kraft, MW right now
    const w=wind(d),hydro=Math.round(420+noise2(doy(d)*.2,5.5)*260+Math.exp(-Math.pow((d.getHours()-18)/3,2))*120);
    const windMW=Math.round(clamp((w-3)/9)*180*(.7+noise2(w,2)*.3));
    return {hydro,wind:windMW,total:hydro+windMW};
  }
  function kp(d=now()){return Math.round((1+noise2(doy(d)*.8+d.getHours()*.05,9.9)*5)*10)/10;}
  return {tempAt,wind,price,production,kp,now};
})();
const IDEAS=[];
