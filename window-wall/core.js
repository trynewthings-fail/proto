/* Window Wall core: façade geometry, drawing helpers, icons and the idea registry.
   Ideas never touch three.js. They draw into WW.g, the projector canvas behind the wall.
   API reference: CLAUDE.md. Don't change this file when adding an idea. */
(function(){
'use strict';
const W=window.WW={};

/* ---------- Palette ---------- */
const LIME='#CAFE03',PINK='#FF4FB8',CYAN='#35E0FF',ORANGE='#FF8A1F',VIOLET='#A98BFF',YELLOW='#FFE14D';
const PC=[LIME,PINK,CYAN,ORANGE,VIOLET,YELLOW];
const FONT='Alegreya, Georgia, serif';

/* ---------- Façade geometry (metres), measured from a photo ----------
   Two window units, each 3 panes wide × 2 high, separated by a plaster pier. */
const PW=0.60,PHT=1.48,PHB=1.28,MUL=0.14,TR=0.19,FR=0.08,PIER=0.75,Y0=0.75;
const UW=2*FR+3*PW+2*MUL,UH=2*FR+PHB+TR+PHT,GW=2*UW+PIER,X0=-1.2;
const UX=[X0-GW/2,X0-GW/2+UW+PIER];
const paneX=c=>UX[c<3?0:1]+FR+(c%3)*(PW+MUL);
const paneY=r=>r===0?Y0+FR+PHB+TR:Y0+FR;
const paneH=r=>r===0?PHT:PHB;
const colX=c=>paneX(c)+PW/2;
const unitCX=u=>UX[u]+UW/2;
const PY_BOT=Y0+FR,PY_TOP=Y0+FR+PHB+TR+PHT;
const SX0=UX[0]-0.05,SX1=UX[1]+UW+0.05,SY0=Y0-0.05,SY1=Y0+UH+0.05,PPM=200;
const SW=Math.round((SX1-SX0)*PPM),SH=Math.round((SY1-SY0)*PPM);
const wx=x=>(x-SX0)*PPM,wy=y=>(SY1-y)*PPM;
function cellPx(c,r){return {x:wx(paneX(c)),y:wy(paneY(r)+paneH(r)),w:PW*PPM,h:paneH(r)*PPM};}

/* ---------- Helpers ---------- */
const clamp=(v,a,b)=>Math.max(a,Math.min(b,v));
function shuffle(a){for(let i=a.length-1;i>0;i--){const j=Math.random()*(i+1)|0;[a[i],a[j]]=[a[j],a[i]];}return a;}
function hexA(h,a){const n=parseInt(h.slice(1),16);return `rgba(${n>>16},${n>>8&255},${n&255},${a})`;}
const esc=s=>String(s).replace(/[&<>"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]));

const scr=document.createElement('canvas');scr.width=SW;scr.height=SH;
const g=scr.getContext('2d');
function rr(x,y,w,h,r,ctx){ctx=ctx||g;r=Math.max(0,Math.min(r,w/2,h/2));ctx.beginPath();ctx.moveTo(x+r,y);ctx.arcTo(x+w,y,x+w,y+h,r);ctx.arcTo(x+w,y+h,x,y+h,r);ctx.arcTo(x,y+h,x,y,r);ctx.arcTo(x,y,x+w,y,r);ctx.closePath();}
function clearScreen(c){g.fillStyle=c||'#000';g.fillRect(0,0,SW,SH);}
function cellBg(c,r,top,bottom){const p=cellPx(c,r);g.fillStyle='#040505';g.fillRect(p.x,p.y,p.w,p.h);const gr=g.createLinearGradient(0,p.y,0,p.y+p.h);gr.addColorStop(0,top);gr.addColorStop(1,bottom);g.fillStyle=gr;g.fillRect(p.x,p.y,p.w,p.h);return p;}
function text(t,x,y,size,col,weight,align,base){g.fillStyle=col;g.font=`${weight||800} ${size}px ${FONT}`;g.textAlign=align||'center';g.textBaseline=base||'middle';g.fillText(t,x,y);}

/* The Try New Things smiley. Rotated 180° the same mark reads sad. */
const SMILE={face:new Path2D('M289.254 65.5384C236.472 -5.5506 136.056 -20.3936 64.9662 32.3864C-6.12378 85.1674 -20.9658 185.585 31.8152 256.674C84.5952 327.765 185.012 342.606 256.102 289.826C327.192 237.045 342.035 136.627 289.254 65.5384Z'),
  ink:['M118.232 134.602C127.249 146.746 130.853 159.342 126.284 162.736C121.715 166.128 110.7 159.033 101.683 146.889C92.6673 134.745 89.0613 122.149 93.6313 118.756C98.2013 115.364 109.215 122.458 118.232 134.602Z','M163.949 100.659C172.966 112.803 176.57 125.399 172.001 128.792C167.432 132.184 156.417 125.09 147.4 112.946C138.384 100.802 134.778 88.2063 139.348 84.8123C143.918 81.4203 154.932 88.5153 163.949 100.659Z','M199.771 244.427C208.789 256.571 212.393 269.167 207.823 272.56C203.254 275.952 192.239 268.857 183.222 256.713C174.206 244.569 170.601 231.973 175.17 228.58C179.741 225.188 190.754 232.283 199.771 244.427Z','M245.489 210.484C254.507 222.628 258.111 235.224 253.541 238.617C248.972 242.009 237.957 234.914 228.94 222.77C219.924 210.626 216.319 198.029 220.888 194.636C225.459 191.244 236.472 198.34 245.489 210.484Z','M116.73 215.645C111.127 215.645 105.489 215.231 99.8448 214.399C69.7648 209.951 43.2168 194.059 25.0908 169.646L31.9708 164.535C48.7338 187.111 73.2818 201.809 101.098 205.921C128.914 210.03 156.665 203.063 179.241 186.302C201.817 169.542 216.514 144.991 220.625 117.177C224.735 89.3608 217.769 61.6088 201.009 39.0348L207.889 33.9248C226.015 58.3388 233.55 88.3498 229.103 118.43C224.657 148.509 208.762 175.058 184.35 193.183C164.517 207.91 140.987 215.645 116.73 215.645Z'].map(d=>new Path2D(d))};
function smiley(ctx,cx,cy,R,happy,col,wobble){
  ctx.save();ctx.translate(cx,cy);ctx.rotate((happy?0.62:0.62+Math.PI)+(wobble||0));
  const s=(2*R)/321;ctx.scale(s,s);ctx.translate(-160.5,-161);
  ctx.fillStyle=col||LIME;ctx.fill(SMILE.face);ctx.fillStyle='#1D1D1B';SMILE.ink.forEach(p=>ctx.fill(p));ctx.restore();
}

/* Block grid: 6 columns × 28 rows per window column (15 rows in the top pane, 13 in the bottom). */
const COLS=6,RT=15,RB=13,ROWS=RT+RB;
function bcell(c,x,y){const r=y<RT?0:1,ly=r?y-RT:y,n=r?RB:RT;const p=cellPx(c,r);const m=0.025*PPM;const bw=(p.w-2*m)/COLS,bh=(p.h-2*m)/n;return [p.x+m+x*bw,p.y+m+ly*bh,bw,bh];}

/* A person-shaped silhouette standing on the bottom sill, h metres tall.
   variant: 0 human, 1 moose antlers, 2 troll, 3 hare ears. */
function silhouette(x,h,v,T,wave,walk,fill,eyes){
  const X=wx(x),B=wy(PY_BOT),L=h*PPM,P=(fx,fy)=>[X+fx*L,B-fy*L];
  g.fillStyle=fill;g.strokeStyle=fill;g.lineCap='round';g.lineJoin='round';
  const sw=Math.sin(walk)*0.05;let a,b;
  g.lineWidth=0.09*L;g.beginPath();a=P(-0.05,0.45);b=P(-0.08+sw,0.02);g.moveTo(...a);g.lineTo(...b);a=P(0.05,0.45);b=P(0.08-sw,0.02);g.moveTo(...a);g.lineTo(...b);g.stroke();
  const t0=P(-0.12,0.8);rr(t0[0],t0[1],0.24*L,0.37*L,0.08*L);g.fill();
  g.lineWidth=0.06*L;g.beginPath();a=P(-0.11,0.76);b=P(-0.2,0.5+sw);g.moveTo(...a);g.lineTo(...b);a=P(0.11,0.76);
  if(wave){const ang=0.9+Math.sin(T*9)*0.35;b=[a[0]+Math.sin(ang)*0.3*L,a[1]-Math.cos(ang)*0.3*L];}else b=P(0.2,0.5-sw);g.moveTo(...a);g.lineTo(...b);g.stroke();
  const hd=P(0,0.9);g.beginPath();g.arc(hd[0],hd[1],0.1*L,0,7);g.fill();
  g.lineWidth=0.025*L;
  if(v===1){g.beginPath();for(const s of [-1,1]){g.moveTo(hd[0]+s*0.06*L,hd[1]-0.07*L);g.lineTo(hd[0]+s*0.2*L,hd[1]-0.2*L);g.moveTo(hd[0]+s*0.13*L,hd[1]-0.13*L);g.lineTo(hd[0]+s*0.12*L,hd[1]-0.24*L);g.moveTo(hd[0]+s*0.17*L,hd[1]-0.17*L);g.lineTo(hd[0]+s*0.27*L,hd[1]-0.17*L);}g.stroke();}
  else if(v===2){g.beginPath();g.arc(hd[0]+0.08*L,hd[1]+0.01*L,0.045*L,0,7);g.fill();g.beginPath();for(const s of [-1,1]){g.moveTo(hd[0]+s*0.07*L,hd[1]-0.05*L);g.lineTo(hd[0]+s*0.16*L,hd[1]-0.12*L);g.lineTo(hd[0]+s*0.09*L,hd[1]);}g.fill();}
  else if(v===3){for(const s of [-1,1]){g.beginPath();g.ellipse(hd[0]+s*0.04*L,hd[1]-0.17*L,0.025*L,0.09*L,s*0.2,0,7);g.fill();}}
  if(eyes){g.fillStyle=eyes;g.shadowBlur=12;g.shadowColor=eyes;g.beginPath();g.arc(hd[0]-0.035*L,hd[1]-0.01*L,0.016*L,0,7);g.arc(hd[0]+0.035*L,hd[1]-0.01*L,0.016*L,0,7);g.fill();g.shadowBlur=0;}
}

/* ---------- People on the plaza (moved by app.js) ----------
   Each person: {x, z, vx, walk}. x = along the wall (m), z = distance from the wall (m). */
const people=[];
const tracked=()=>people.filter(p=>p.z<9&&p.x>SX0-0.6&&p.x<SX1+0.6);

/* ---------- Icons (24 × 24 stroke paths) for pitch cards ---------- */
const ICONS={
  person:'<circle cx="12" cy="7" r="3.2"/><path d="M5.5 20.5c0-3.9 2.9-6.5 6.5-6.5s6.5 2.6 6.5 6.5"/>',
  group:'<circle cx="8.5" cy="8" r="2.7"/><circle cx="16.5" cy="8" r="2.7"/><path d="M3 19.5c0-3.3 2.4-5.5 5.5-5.5s5.5 2.2 5.5 5.5"/><path d="M14.2 14.3c.7-.2 1.5-.3 2.3-.3 3.1 0 5.5 2.2 5.5 5.5"/>',
  crowd:'<circle cx="6" cy="9" r="2.2"/><circle cx="12" cy="7" r="2.4"/><circle cx="18" cy="9" r="2.2"/><path d="M2 19c0-2.6 1.8-4.5 4-4.5M22 19c0-2.6-1.8-4.5-4-4.5M7.5 20c0-3 2-5.2 4.5-5.2s4.5 2.2 4.5 5.2"/>',
  kid:'<circle cx="12" cy="9.5" r="2.6"/><path d="M8 20.5c0-3 1.8-5.2 4-5.2s4 2.2 4 5.2"/><path d="M9.6 7.4 8.4 5.6M14.4 7.4l1.2-1.8"/>',
  teen:'<circle cx="12" cy="8" r="3"/><path d="M8.6 6.6h6.8l2 1.2"/><path d="M5.5 20.5c0-3.9 2.9-6.5 6.5-6.5s6.5 2.6 6.5 6.5"/>',
  family:'<circle cx="8" cy="6.5" r="2.7"/><path d="M3 20.5c0-3.8 2.2-6.5 5-6.5s5 2.7 5 6.5"/><circle cx="17" cy="11" r="2"/><path d="M13.6 20.5c0-2.5 1.5-4.4 3.4-4.4s3.4 1.9 3.4 4.4"/>',
  school:'<path d="M2.5 9 12 4.5 21.5 9 12 13.5z"/><path d="M6.5 11v5c0 1.4 2.5 3 5.5 3s5.5-1.6 5.5-3v-5"/><path d="M21.5 9v5"/>',
  phone:'<rect x="7" y="2.5" width="10" height="19" rx="2.2"/><path d="M11 18.5h2"/>',
  cam:'<rect x="2.5" y="6.5" width="19" height="8" rx="2.6"/><circle cx="7.5" cy="10.5" r="1.9"/><circle cx="16.5" cy="10.5" r="1.9"/><circle cx="12" cy="10.5" r=".5"/><path d="M12 14.5v4M8.5 20h7"/>',
  pad:'<rect x="3.5" y="3.5" width="17" height="17" rx="2.5"/><path d="M10.2 8.6c0-1.5.8-2.6 1.8-2.6s1.8 1.1 1.8 2.6-.6 3.2-1.8 3.2-1.8-1.7-1.8-3.2z"/><circle cx="12" cy="15.6" r="1.6"/>',
  button:'<path d="M4 15v1.5c0 1.9 3.6 3.5 8 3.5s8-1.6 8-3.5V15"/><ellipse cx="12" cy="15" rx="8" ry="3"/><path d="M8 14.6V11a4 4 0 0 1 8 0v3.6"/>',
  dial:'<circle cx="12" cy="12.5" r="7"/><path d="M12 12.5 15.5 9"/><path d="M12 3v1.5M21.5 12.5H20M2.5 12.5H4M5.3 5.8l1 1M18.7 5.8l-1 1"/>',
  pencil:'<path d="M4 20l1.2-4.4L15.8 5a2 2 0 0 1 2.9 0l.3.3a2 2 0 0 1 0 2.9L8.4 18.8z"/><path d="M14 6.8l3.2 3.2"/>',
  scan:'<path d="M4 8V5.5A1.5 1.5 0 0 1 5.5 4H8M16 4h2.5A1.5 1.5 0 0 1 20 5.5V8M20 16v2.5a1.5 1.5 0 0 1-1.5 1.5H16M8 20H5.5A1.5 1.5 0 0 1 4 18.5V16"/><path d="M4 12h16"/>',
  touch:'<path d="M9 11.5V5.5a1.5 1.5 0 0 1 3 0v5"/><path d="M12 10V8.8a1.5 1.5 0 0 1 3 0v1.7"/><path d="M15 10.5a1.5 1.5 0 0 1 3 0V15a6 6 0 0 1-6 6h-.5a5.5 5.5 0 0 1-4.6-2.5L4.3 14a1.5 1.5 0 0 1 2.4-1.8L9 14.5"/>',
  kiosk:'<rect x="3" y="4" width="18" height="12" rx="2"/><path d="M9 21h6M12 16v5"/>',
  clock:'<circle cx="12" cy="12" r="8.5"/><path d="M12 7.5V12l3 2"/>',
  infinity:'<path d="M7 9c-2.5 0-4 1.4-4 3s1.5 3 4 3c3.5 0 6.5-6 10-6 2.5 0 4 1.4 4 3s-1.5 3-4 3c-3.5 0-6.5-6-10-6z"/>',
  versus:'<path d="M4 4l8.5 8.5M4 4h3.5M4 4v3.5M20 4l-8.5 8.5M20 4h-3.5M20 4v3.5M7.5 15.5l-3 3M16.5 15.5l3 3M6 13l5 5M18 13l-5 5"/>',
  coop:'<circle cx="9" cy="12" r="5.2"/><circle cx="15" cy="12" r="5.2"/>',
  sparkle:'<path d="M12 3c.6 4.2 2.8 6.4 7 7-4.2.6-6.4 2.8-7 7-.6-4.2-2.8-6.4-7-7 4.2-.6 6.4-2.8 7-7z"/><path d="M19 16.5c.2 1.3.9 2 2.2 2.2-1.3.2-2 .9-2.2 2.2-.2-1.3-.9-2-2.2-2.2 1.3-.2 2-.9 2.2-2.2z"/>',
  projector:'<rect x="2.5" y="8" width="13" height="9" rx="2"/><circle cx="9" cy="12.5" r="2.5"/><path d="M15.5 10.5l6-3v10l-6-3"/>',
  speaker:'<path d="M4 9.5h3.5L12 6v12l-4.5-3.5H4z"/><path d="M15.5 9a4 4 0 0 1 0 6M18 6.5a7.5 7.5 0 0 1 0 11"/>',
  wifi:'<path d="M2.5 9a14 14 0 0 1 19 0M5.5 12.5a9.5 9.5 0 0 1 13 0M8.5 16a5 5 0 0 1 7 0"/><circle cx="12" cy="19.2" r=".9"/>',
  music:'<path d="M9 18V5.5l11-2V16"/><circle cx="6.5" cy="18" r="2.5"/><circle cx="17.5" cy="16" r="2.5"/>',
  eye:'<path d="M2.5 12S6 5.5 12 5.5 21.5 12 21.5 12 18 18.5 12 18.5 2.5 12 2.5 12z"/><circle cx="12" cy="12" r="3"/>',
  wrench:'<path d="M14.7 6.3a4.5 4.5 0 0 0 5.6 5.6L12.5 19.7a2.3 2.3 0 0 1-3.2-3.2z"/><path d="M14.7 6.3a4.5 4.5 0 0 1 5.6 5.6l-3-.4-2.2-2.2z"/>',
  question:'<circle cx="12" cy="12" r="8.5"/><path d="M9.6 9.5a2.5 2.5 0 1 1 3.4 2.3c-.6.3-1 .8-1 1.5v.6"/><circle cx="12" cy="16.8" r=".6"/>',
  joystick:'<path d="M12 5.5v7"/><circle cx="12" cy="4" r="2"/><rect x="4" y="12.5" width="16" height="7" rx="2"/><path d="M7.5 16h3"/>',
  puzzle:'<path d="M5 8h3a2 2 0 1 1 4 0h3v3a2 2 0 1 1 0 4v3h-3a2 2 0 1 0-4 0H5v-3a2 2 0 1 0 0-4z"/>',
  drop:'<path d="M12 3.5s6 6.4 6 10.5a6 6 0 0 1-12 0c0-4.1 6-10.5 6-10.5z"/>',
  gear:'<circle cx="12" cy="12" r="3"/><path d="M12 2.5v3M12 18.5v3M2.5 12h3M18.5 12h3M5.3 5.3l2.1 2.1M16.6 16.6l2.1 2.1M5.3 18.7l2.1-2.1M16.6 7.4l2.1-2.1"/>',
  motion:'<circle cx="7" cy="16.5" r="3"/><path d="M10 14 20 5M15 5h5v5"/>',
  bolt:'<path d="M13 2.5 5 13.5h6l-1 8 8-11h-6z"/>'
};
const ic=n=>`<svg class="ic" viewBox="0 0 24 24" aria-hidden="true">${ICONS[n]||''}</svg>`;
const AUD={kid:['kid','Kids'],teen:['teen','Teens'],family:['family','Families'],group:['group','Groups'],school:['school','School classes'],all:['crowd','Everyone']};
const MODE={versus:['versus','Versus'],coop:['coop','Co-op'],teams:['group','Teams'],ambient:['sparkle','Ambient']};
const CATS=[
  {id:'arcade',name:'Arcade',icon:'joystick',desc:'fast, replayable'},
  {id:'puzzle',name:'Puzzles',icon:'puzzle',desc:'think together'},
  {id:'crafty',name:'Crafty',icon:'pencil',desc:'kids make the content'},
  {id:'visual',name:'Visual',icon:'sparkle',desc:'stunning first, game second'}
];

Object.assign(W,{LIME,PINK,CYAN,ORANGE,VIOLET,YELLOW,PC,FONT,
  PW,PHT,PHB,MUL,TR,FR,PIER,Y0,UW,UH,GW,X0,UX,paneX,paneY,paneH,colX,unitCX,PY_BOT,PY_TOP,SX0,SX1,SY0,SY1,PPM,SW,SH,wx,wy,cellPx,
  clamp,shuffle,hexA,esc,scr,g,rr,clearScreen,cellBg,text,smiley,COLS,RT,RB,ROWS,bcell,silhouette,people,tracked,ICONS,ic,AUD,MODE,CATS});

/* ---------- Idea registry ----------
   Each ideas/<id>.js calls WW.register(W => ({...idea})). Menu order = <script> order in index.html. */
W.ideas=[];
W.register=fn=>{const idea=fn(W);W.ideas.push(idea);return idea;};
/* Filled in by app.js: camera moves and pitch-card refresh. */
W.view={reset(){},seat(){}};
W.ui={refresh(){}};
})();
