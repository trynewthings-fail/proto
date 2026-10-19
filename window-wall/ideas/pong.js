/* ARCADE · Window Pong: two teams, the pier in the middle is the net. */
WW.register(W=>{
const {g,LIME,PINK,PW,PPM,X0,PY_BOT,PY_TOP,paneX,cellPx,cellBg,clearScreen,text,hexA,rr,clamp,wx,wy}=W;
const PXL=paneX(0)+0.1,PXR=paneX(5)+PW-0.1,PADH=0.8,BR=0.06;
return {
  id:'pong',cat:'arcade',by:'Lukas',name:'Window Pong',short:'Pong',
  pitch:{
    tagline:'Two teams. The pier in the middle is the net.',
    players:['group','2 teams'],mode:'versus',round:'2 min',
    input:[['cam','Team position'],['dial','Two big dials']],
    for:['teen','group'],
    how:['Paddles slide up and down the outer columns.','Your team moves its paddle by moving on the plaza.','First to 5.'],
    trick:'The ball tunnels behind the wide pier and every mullion, so you keep predicting where it pops out.',
    needs:[['projector','Projector'],['cam','Depth cam'],['speaker','Speaker']],
    open:['Can we track 10+ people at once?','Is the ball readable while hidden?'],
    meters:{read:5,crowd:4,effort:2}
  },
  init(){this.s=[0,0];this.L={y:(PY_BOT+PY_TOP)/2,err:0};this.R={y:(PY_BOT+PY_TOP)/2,err:0};this.trail=[];this.cheer=[0,0];this.serve(Math.random()<.5?-1:1);},
  serve(d){this.b={x:X0,y:PY_BOT+(PY_TOP-PY_BOT)*(0.3+Math.random()*0.4),vx:2.8*d,vy:(Math.random()-.5)*2.2};this.wait=0.9;this.trail=[];},
  update(dt){
    this.cheer=this.cheer.map(v=>Math.max(0,v-dt));
    const b=this.b,yl=PY_BOT+BR,yh=PY_TOP-BR,mid=(PY_BOT+PY_TOP)/2;
    for(const [P,side] of [[this.L,-1],[this.R,1]]){const app=this.wait<=0&&Math.sign(b.vx)===side;const tgt=clamp(app?b.y+P.err:mid,PY_BOT+PADH/2,PY_TOP-PADH/2);P.y+=clamp(tgt-P.y,-2.4*dt,2.4*dt);}
    if(this.wait>0){this.wait-=dt;return;}
    b.x+=b.vx*dt;b.y+=b.vy*dt;if(b.y<yl){b.y=yl;b.vy=-b.vy;}if(b.y>yh){b.y=yh;b.vy=-b.vy;}
    const err=()=>(Math.random()<.22?(Math.random()<.5?-1:1)*(0.5+Math.random()*0.4):(Math.random()-.5)*0.4);
    if(b.vx<0&&b.x-BR<=PXL+0.04&&b.x>PXL-0.1&&Math.abs(b.y-this.L.y)<PADH/2+BR){b.vx=Math.min(6.5,-b.vx*1.06);b.vy+=(b.y-this.L.y)*3;b.x=PXL+0.04+BR;this.R.err=err();}
    if(b.vx>0&&b.x+BR>=PXR-0.04&&b.x<PXR+0.1&&Math.abs(b.y-this.R.y)<PADH/2+BR){b.vx=-Math.min(6.5,b.vx*1.06);b.vy+=(b.y-this.R.y)*3;b.x=PXR-0.04-BR;this.L.err=err();}
    b.vy=clamp(b.vy,-3.5,3.5);
    this.trail.push([b.x,b.y]);if(this.trail.length>14)this.trail.shift();
    if(b.x<paneX(0)-0.2){this.s[1]++;this.cheer[1]=1.5;this.after(1);}
    else if(b.x>paneX(5)+PW+0.2){this.s[0]++;this.cheer[0]=1.5;this.after(-1);}
  },
  after(d){if(this.s[0]>=5||this.s[1]>=5)this.s=[0,0];this.serve(d);},
  draw(){
    clearScreen('#020302');
    for(let c=0;c<6;c++)for(let r=0;r<2;r++)cellBg(c,r,'#070906','#050604');
    const a=cellPx(2,0),bb=cellPx(3,0);
    text(String(this.s[0]),a.x+a.w/2,a.y+a.h*0.5,a.w*0.95,hexA(LIME,.22));text(String(this.s[1]),bb.x+bb.w/2,bb.y+bb.h*0.5,bb.w*0.95,hexA(PINK,.24));
    g.shadowBlur=26;
    g.shadowColor=LIME;g.fillStyle=LIME;rr(wx(PXL-0.04),wy(this.L.y+PADH/2),0.08*PPM,PADH*PPM,10);g.fill();
    g.shadowColor=PINK;g.fillStyle=PINK;rr(wx(PXR-0.04),wy(this.R.y+PADH/2),0.08*PPM,PADH*PPM,10);g.fill();
    g.shadowBlur=0;
    this.trail.forEach(([x,y],k)=>{const s=BR*2*PPM*(k/this.trail.length);g.fillStyle=`rgba(255,255,255,${k/this.trail.length*0.35})`;g.fillRect(wx(x)-s/2,wy(y)-s/2,s,s);});
    const s=BR*2*PPM;g.shadowBlur=20;g.shadowColor='#fff';g.fillStyle='#fff';g.fillRect(wx(this.b.x)-s/2,wy(this.b.y)-s/2,s,s);g.shadowBlur=0;
  },
  hud(){return `Lime ${this.s[0]} – ${this.s[1]} Pink · first to 5`;},
  cast(i){if(i>5)return null;return i<3?LIME:PINK;},
  fig(i,T){if(i>5)return{};const t=i<3?0:1;return {jump:this.cheer[t]>0?Math.abs(Math.sin(T*8+i))*0.3:0};}
};
});
