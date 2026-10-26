/* ================= Snow crystals: Reiter's hexagonal cellular automaton (2005) =================
   Each cell holds water mass s. Frozen when s >= 1. Cells next to ice are "receptive": they keep their water and get +gamma.
   The rest diffuse with their neighbours. Low background vapour (beta) gives branching dendrites, high gives plates.
   Temperature and humidity pick beta/gamma the way the Nakaya diagram says real crystals grow:
   about -2 °C plates, -5 °C needles and columns, -15 °C stars (dendrites) when it is humid, -25 °C plates and columns again. */
function nakaya(temp,hum){ // temp in °C (below 0), hum 0..1 (supersaturation). Returns growth habit and CA params.
  const t=-temp;
  let habit,beta,gamma;
  if(t<3.5){habit='plate';beta=lerp(.92,.62,hum);gamma=lerp(.0012,.0035,hum);}
  else if(t<9){habit='needle';beta=.8;gamma=.002;}
  else if(t<12.5){habit='sector';beta=lerp(.82,.5,hum);gamma=lerp(.0012,.003,hum);}
  else if(t<18){habit=hum>.45?'star':'sector';beta=lerp(.7,.35,hum);gamma=lerp(.001,.0028,hum);}
  else if(t<23){habit='plate';beta=lerp(.86,.58,hum);gamma=lerp(.001,.0025,hum);}
  else{habit='column';beta=.85;gamma=.0015;}
  return {habit,beta,gamma};
}
const HABIT={plate:{sv:'Platta',en:'Plate'},needle:{sv:'Nål',en:'Needle'},sector:{sv:'Sektorplatta',en:'Sectored plate'},star:{sv:'Stjärna',en:'Star'},column:{sv:'Pelare',en:'Column'}};

class Flake{
  constructor(N=91,res=180){this.N=N;this.res=res;this.s=new Float32Array(N*N);this.u=new Float32Array(N*N);this.fz=new Uint8Array(N*N);
    this.cv=document.createElement('canvas');this.cv.width=this.cv.height=res;this.cx=this.cv.getContext('2d');this.img=this.cx.createImageData(res,res);
    this.map=new Int32Array(res*res);const c=(N-1)/2,R=c*.98;
    for(let py=0;py<res;py++)for(let px=0;px<res;px++){ // pixel -> nearest hex cell
      const x=(px/(res-1)*2-1)*R,y=(py/(res-1)*2-1)*R,q=x-y/Math.sqrt(3),r=2*y/Math.sqrt(3);
      let rq=Math.round(q),rr=Math.round(r);const rs=Math.round(-q-r),dq=Math.abs(rq-q),dr=Math.abs(rr-r),ds=Math.abs(rs+q+r);
      if(dq>dr&&dq>ds)rq=-rr-rs;else if(dr>ds)rr=-rq-rs;
      const i=rq+c,j=rr+c;this.map[py*res+px]=(i>=0&&j>=0&&i<N&&j<N)?j*N+i:-1;}
    this.reset(.6,.002);}
  reset(beta,gamma){const N=this.N;this.beta=beta;this.gamma=gamma;this.s.fill(beta);this.fz.fill(0);const c=(N-1)/2,k=c*N+c;this.s[k]=1;this.fz[k]=1;this.rad=1;this.steps=0;this.col=0;this.dirty=true;this.full=false;}
  set(beta,gamma){this.beta=beta;this.gamma=gamma;}
  step(n){
    const N=this.N,s=this.s,u=this.u,fz=this.fz,c=(N-1)/2;
    for(let it=0;it<n&&!this.full;it++){
      const m=Math.min(c-1,Math.ceil(this.rad)+6),i0=c-m,i1=c+m,b=this.beta,gm=this.gamma;
      for(let j=i0;j<=i1;j++)for(let i=i0;i<=i1;i++){const k=j*N+i;
        const rec=fz[k]||fz[k-1]||fz[k+1]||fz[k-N]||fz[k+N]||fz[k-N+1]||fz[k+N-1];
        u[k]=rec?0:s[k];if(rec)s[k]+=gm;else s[k]=0;}
      for(let j=i0;j<=i1;j++)for(let i=i0;i<=i1;i++){const k=j*N+i;
        const edge=(i===i0||i===i1||j===i0||j===i1);
        const nb=edge?b:(u[k-1]+u[k+1]+u[k-N]+u[k+N]+u[k-N+1]+u[k+N-1])/6;
        s[k]+=u[k]+.5*(nb-u[k]);}
      for(let j=i0;j<=i1;j++)for(let i=i0;i<=i1;i++){const k=j*N+i;if(!fz[k]&&s[k]>=1){fz[k]=1;const q=i-c,r=j-c,d=Math.max(Math.abs(q),Math.abs(r),Math.abs(q+r));if(d>this.rad)this.rad=d;}}
      this.steps++;if(this.rad>=c-8)this.full=true;
    }
    this.dirty=true;
  }
  grow(len){this.col=Math.min(1,this.col+len);this.dirty=true;} // needles and columns are drawn, not simulated
  get size(){return Math.max(this.rad/((this.N-1)/2-8),this.col);}
  render(tint=[200,240,255]){
    if(!this.dirty)return this.cv;this.dirty=false;
    const d=this.img.data,s=this.s,fz=this.fz,map=this.map;
    for(let p=0;p<map.length;p++){const k=map[p],o=p*4;
      if(k<0||!fz[k]){d[o+3]=0;continue;}
      const v=clamp((s[k]-1)*2.2),e=1-v;   // thin fresh ice is bright at the rim, old thick ice glows inside
      d[o]=lerp(tint[0],255,v*.6)*(.55+.45*e);d[o+1]=lerp(tint[1],255,v*.6)*(.6+.4*e);d[o+2]=255;d[o+3]=150+105*e;}
    this.cx.putImageData(this.img,0,0);return this.cv;
  }
}
/* draw a crystal: CA image for plates/stars, vector prisms for needles/columns */
function drawFlake(c,fl,habit,x,y,R,rot=0,alpha=1){
  c.save();c.translate(x,y);c.rotate(rot);c.globalAlpha*=alpha;
  if(habit==='needle'||habit==='column'){
    const len=R*(.25+1.6*fl.col),wd=habit==='needle'?R*.09:R*.22;
    const rods=habit==='needle'?[[0,1],[.5,.8],[-.6,.7]]:[[0,1]];
    for(const[a,k]of rods){c.save();c.rotate(a);
      const l=len*k,gr=c.createLinearGradient(-wd,0,wd,0);gr.addColorStop(0,'rgba(140,220,255,.5)');gr.addColorStop(.5,'rgba(240,252,255,.95)');gr.addColorStop(1,'rgba(120,200,255,.45)');
      c.fillStyle=gr;c.beginPath();c.moveTo(0,-l/2-wd*.6);c.lineTo(wd,-l/2);c.lineTo(wd,l/2);c.lineTo(0,l/2+wd*.6);c.lineTo(-wd,l/2);c.lineTo(-wd,-l/2);c.closePath();c.fill();
      c.strokeStyle='rgba(255,255,255,.8)';c.lineWidth=wd*.12;c.stroke();
      if(habit==='column'){c.fillStyle='rgba(255,255,255,.35)';c.beginPath();for(let i=0;i<6;i++){const t=i/6*TAU;c.lineTo(Math.cos(t)*wd*1.05,-l/2+Math.sin(t)*wd*.5);}c.fill();}
      c.restore();}
  }else{
    const im=fl.render();
    c.globalCompositeOperation='lighter';c.globalAlpha*=.55;c.filter='blur(2px)';c.drawImage(im,-R*1.06,-R*1.06,R*2.12,R*2.12);c.filter='none';
    c.globalAlpha/=.55;c.drawImage(im,-R,-R,R*2,R*2);
  }
  c.restore();
}
/* paper-cut version: the crystal as one flat white cut-out (for Jul) */
Flake.prototype.renderPaper=function(){
  if(!this.pc){this.pc=document.createElement('canvas');this.pc.width=this.pc.height=this.res;this.px=this.pc.getContext('2d');this.pimg=this.px.createImageData(this.res,this.res);}
  if(this.pdirty===this.steps+this.col)return this.pc;this.pdirty=this.steps+this.col;
  const d=this.pimg.data,fz=this.fz,map=this.map,s=this.s;
  for(let p=0;p<map.length;p++){const k=map[p],o=p*4;if(k<0||!fz[k]){d[o+3]=0;continue;}const v=clamp((s[k]-1)*1.6);d[o]=255;d[o+1]=lerp(250,236,v);d[o+2]=lerp(242,214,v);d[o+3]=255;}
  this.px.putImageData(this.pimg,0,0);return this.pc;
};
function drawPaperFlake(c,fl,x,y,R,rot=0,alpha=1){
  c.save();c.translate(x,y);c.rotate(rot);c.globalAlpha*=alpha;
  c.shadowColor='rgba(0,0,0,.55)';c.shadowBlur=10;c.shadowOffsetX=4;c.shadowOffsetY=6;
  if(fl.col>0){const len=R*(.3+1.5*fl.col),wd=R*.08;c.fillStyle='#fff8ee';for(const a of[0,Math.PI/3,-Math.PI/3]){c.save();c.rotate(a);c.beginPath();c.moveTo(0,-len/2-wd);c.lineTo(wd,-len/2);c.lineTo(wd,len/2);c.lineTo(0,len/2+wd);c.lineTo(-wd,len/2);c.lineTo(-wd,-len/2);c.closePath();c.fill();c.restore();}}
  if(fl.rad>1.5)c.drawImage(fl.renderPaper(),-R,-R,R*2,R*2);
  else if(!(fl.col>0)){c.fillStyle='#fff8ee';c.beginPath();for(let i=0;i<6;i++){const a=i/6*TAU;c.lineTo(Math.cos(a)*R*.12,Math.sin(a)*R*.12);}c.fill();}
  c.restore();
}
