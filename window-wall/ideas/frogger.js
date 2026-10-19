/* ARCADE · Sideways Frogger: roads run vertically, the crowd steers one frog left to right. */
WW.register(W=>{
const {g,LIME,PINK,CYAN,ORANGE,VIOLET,YELLOW,PW,PPM,PY_BOT,PY_TOP,colX,paneY,paneH,cellPx,cellBg,clearScreen,text,hexA,rr,smiley,wx,wy}=W;
const CARC=[PINK,CYAN,ORANGE,VIOLET,YELLOW,'#ffffff'];
const FYMIN=PY_BOT-1.0,FYMAX=PY_TOP+1.0,FRANGE=FYMAX-FYMIN;
const frogY=r=>paneY(r)+paneH(r)/2;
return {
  id:'frogger',cat:'arcade',by:'Lukas',name:'Sideways Frogger',short:'Frogger',
  pitch:{
    tagline:'Frogger turned 90°. The whole plaza steers one frog.',
    players:['crowd','∞'],mode:'coop',round:'60 s',
    input:[['cam','Crowd leans left/right'],['phone','Phone vote']],
    for:['group','family'],
    how:['Roads run vertically through columns 2 to 5.','The crowd decides each hop.','Reach the goal on the right.'],
    trick:'Every hop crosses a mullion or the pier: the frog leaps behind the frame and lands in the next pane.',
    needs:[['projector','Projector'],['cam','Depth cam'],['speaker','Speaker']],
    open:['Does crowd voting feel sluggish?','One frog, or two racing frogs?'],
    meters:{read:4,crowd:3,effort:2}
  },
  init(){
    this.cars=[];const sp=[0,1.0,1.6,1.25,2.0];
    for(let L=1;L<=4;L++){const dir=L%2?-1:1;for(let k=0;k<3;k++)this.cars.push({L,dir,sp:sp[L],len:0.45+Math.random()*0.35,y:FYMIN+k*(FRANGE/3)+Math.random()*0.6,col:CARC[(L+k)%CARC.length]});}
    this.f={c:0,r:1,hop:null,dead:0,win:0,decide:0.8,splat:null};this.wins=0;this.splats=0;
  },
  wrap(y){while(y<FYMIN)y+=FRANGE;while(y>FYMAX)y-=FRANGE;return y;},
  carAt(L,y,ahead){for(const c of this.cars){if(c.L!==L)continue;for(let s=0;s<=ahead+1e-6;s+=0.1){const cy=this.wrap(c.y+c.dir*c.sp*s);if(Math.abs(cy-y)<c.len/2+0.2)return true;}}return false;},
  update(dt){
    for(const c of this.cars)c.y=this.wrap(c.y+c.dir*c.sp*dt);
    const f=this.f;
    if(f.dead>0){f.dead-=dt;if(f.dead<=0){f.c=0;f.r=Math.random()<.5?0:1;f.splat=null;}return;}
    if(f.win>0){f.win-=dt;if(f.win<=0){f.c=0;f.r=Math.random()<.5?0:1;}return;}
    if(f.hop){f.hop.t+=dt;if(f.hop.t>=f.hop.dur){f.c=f.hop.c;f.r=f.hop.r;f.hop=null;if(f.c===5){this.wins++;f.win=1.8;}}}
    else{f.decide-=dt;if(f.decide<=0){f.decide=0.5+Math.random()*0.5;
      const y=frogY(f.r),oy=frogY(1-f.r),nc=f.c+1,reckless=Math.random()<0.07;
      if(nc===5||reckless||!this.carAt(nc,y,0.7))f.hop={c:nc,r:f.r,t:0,dur:nc===3?0.55:0.42,fc:f.c,fr:f.r};
      else if((f.c===0||!this.carAt(f.c,oy,0.7))&&Math.random()<0.6)f.hop={c:f.c,r:1-f.r,t:0,dur:0.42,fc:f.c,fr:f.r};}}
    if(!f.hop&&f.c>=1&&f.c<=4&&this.carAt(f.c,frogY(f.r),0)){f.dead=1.3;f.splat={c:f.c,r:f.r};this.splats++;}
  },
  draw(T){
    clearScreen();
    for(let c=0;c<6;c++)for(let r=0;r<2;r++){
      if(c===0)cellBg(c,r,'#0d2205','#081803');
      else if(c===5)cellBg(c,r,hexA(LIME,0.22),hexA(LIME,0.08));
      else{const p=cellBg(c,r,'#0b0b0d','#0b0b0d');g.setLineDash([18,16]);g.strokeStyle='rgba(255,255,255,.22)';g.lineWidth=3;g.beginPath();g.moveTo(p.x+p.w/2,p.y);g.lineTo(p.x+p.w/2,p.y+p.h);g.stroke();g.setLineDash([]);
        g.fillStyle='rgba(255,255,255,.07)';g.fillRect(p.x+4,p.y,6,p.h);g.fillRect(p.x+p.w-10,p.y,6,p.h);}
    }
    const t0=cellPx(0,1);text('START',t0.x+t0.w/2,t0.y+t0.h*0.88,0.09*PPM,hexA(LIME,.6),700);
    const t5=cellPx(5,0);text('GOAL',t5.x+t5.w/2,t5.y+t5.h*0.12,0.11*PPM,LIME);text(String(this.wins),t5.x+t5.w/2,t5.y+t5.h*0.5,0.4*PPM,hexA(LIME,.9));
    for(let L=1;L<=4;L++){const dir=L%2?-1:1;const p=cellPx(L,0);const ax=p.x+p.w/2,ay=p.y+0.1*PPM;g.fillStyle='rgba(255,255,255,.4)';g.beginPath();if(dir>0){g.moveTo(ax,ay-10);g.lineTo(ax-10,ay+6);g.lineTo(ax+10,ay+6);}else{g.moveTo(ax,ay+10);g.lineTo(ax-10,ay-6);g.lineTo(ax+10,ay-6);}g.fill();}
    for(const c of this.cars){const w=PW*0.55*PPM,h=c.len*PPM,x=wx(colX(c.L))-w/2,y=wy(c.y)-h/2;
      g.fillStyle=c.col;rr(x,y,w,h,14);g.fill();g.fillStyle='rgba(0,0,0,.45)';rr(x+w*0.15,y+h*(c.dir>0?0.22:0.5),w*0.7,h*0.26,8);g.fill();
      g.fillStyle='#FFF7C0';const hy=c.dir>0?y+4:y+h-14;g.fillRect(x+6,hy,11,10);g.fillRect(x+w-17,hy,11,10);}
    const f=this.f;let fx,fy,sc=1;
    if(f.hop){const k=f.hop.t/f.hop.dur;fx=colX(f.hop.fc)+(colX(f.hop.c)-colX(f.hop.fc))*k;fy=frogY(f.hop.fr)+(frogY(f.hop.r)-frogY(f.hop.fr))*k;sc=1+Math.sin(Math.PI*k)*0.35;}
    else{fx=colX(f.c);fy=frogY(f.r);}
    if(f.dead>0&&f.splat){const X=wx(colX(f.splat.c)),Y=wy(frogY(f.splat.r));g.fillStyle=LIME;for(let k=0;k<9;k++){const a=k/9*Math.PI*2;g.beginPath();g.arc(X+Math.cos(a)*30,Y+Math.sin(a)*30,9,0,7);g.fill();}g.beginPath();g.arc(X,Y,24,0,7);g.fill();text('SPLAT',X,Y-0.3*PPM,0.09*PPM,'#fff');}
    else{const X=wx(fx),Y=wy(fy),R=0.14*PPM*sc;
      if(f.win>0)smiley(g,X,Y,R*1.3,true,LIME,Math.sin(T*6)*0.2);
      else{g.fillStyle=LIME;g.beginPath();g.arc(X,Y,R,0,7);g.fill();g.beginPath();g.arc(X+R*0.45,Y-R*0.7,R*0.38,0,7);g.arc(X+R*0.45,Y+R*0.7,R*0.38,0,7);g.fill();
        g.fillStyle='#000';g.beginPath();g.arc(X+R*0.58,Y-R*0.7,R*0.16,0,7);g.arc(X+R*0.58,Y+R*0.7,R*0.16,0,7);g.fill();}}
  },
  hud(){return `Crossings ${this.wins} · Splats ${this.splats} · Crowd: ${this.f.hop?'hop!':'deciding…'}`;},
  cast(){return LIME;},
  fig(i,T){return {jump:this.f.win>0?Math.abs(Math.sin(T*7+i))*0.25:0};}
};
});
