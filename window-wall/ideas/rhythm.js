/* ARCADE · Stomp Lanes: notes fall down each column, stomp on your spot when they land. */
WW.register(W=>{
const {g,PC,PW,PPM,PY_BOT,PY_TOP,colX,cellPx,cellBg,clearScreen,text,hexA,rr,shuffle,wx,wy}=W;
return {
  id:'rhythm',cat:'arcade',by:'Lukas',name:'Stomp Lanes',short:'Stomp Lanes',
  pitch:{
    tagline:'Six lanes, six spots on the ground. Stomp when the note lands.',
    players:['person','6'],mode:'coop',round:'90 s',
    input:[['cam','Depth cam sees stomps'],['pad','Floor pads']],
    for:['kid','group','school'],
    how:['Notes fall down each column.','Stomp on your painted spot as they hit the line.','All lanes add up to one team score.'],
    trick:'Notes disappear behind the transom on the way down, so you have to feel the beat instead of reading it.',
    needs:[['projector','Projector'],['cam','Depth cam'],['speaker','Speaker'],['music','Music']],
    open:['License music or make our own?','Evening volume limits.'],
    meters:{read:5,crowd:5,effort:2}
  },
  bpm:116,yTop:PY_TOP+0.12,yHit:PY_BOT+0.22,travel:2.4,
  init(){this.t=0;this.next=0.5;this.k=0;this.notes=[];this.flash=[0,0,0,0,0,0];this.score=[0,0,0,0,0,0];this.pops=[];},
  update(dt){
    this.t+=dt;const half=30/this.bpm;
    while(this.t>=this.next){const b=this.k++;
      if(Math.random()<(b%2===0?0.7:0.3))shuffle([0,1,2,3,4,5]).slice(0,b%8===0?2:1).forEach(L=>this.notes.push({L,s:this.next,y:this.yTop}));
      this.next+=half;}
    const v=(this.yTop-this.yHit)/this.travel;
    for(const n of this.notes)n.y=this.yTop-v*(this.t-n.s);
    this.notes=this.notes.filter(n=>{if(n.y<=this.yHit){const perfect=Math.random()<.7;this.flash[n.L]=1;this.score[n.L]+=perfect?100:50;this.pops.push({L:n.L,txt:perfect?'PERFECT':'GOOD',t:0});return false;}return true;});
    for(let i=0;i<6;i++)this.flash[i]=Math.max(0,this.flash[i]-dt*3);
    this.pops.forEach(p=>p.t+=dt*1.3);this.pops=this.pops.filter(p=>p.t<1);
  },
  draw(){
    clearScreen();const spb=60/this.bpm;const pulse=Math.exp(-((this.t%spb)/spb)*5);
    for(let c=0;c<6;c++){const col=PC[c],f=this.flash[c];
      for(let r=0;r<2;r++){const p=cellBg(c,r,hexA(col,0.03+0.05*pulse),hexA(col,r?0.10+0.10*pulse+0.35*f:0.06));
        g.setLineDash([8,12]);g.strokeStyle=hexA(col,0.2);g.lineWidth=2;g.beginPath();g.moveTo(p.x+p.w/2,p.y);g.lineTo(p.x+p.w/2,p.y+p.h);g.stroke();g.setLineDash([]);}
      const bw=PW*PPM*0.8,bh=0.13*PPM,x=wx(colX(c))-bw/2,hy=wy(this.yHit);
      rr(x,hy-bh/2,bw,bh,bh/2);g.lineWidth=4;g.strokeStyle=col;g.stroke();if(f>0){g.fillStyle=hexA(col,f);g.fill();}
      const top=cellPx(c,0);text(String(this.score[c]),top.x+top.w/2,top.y+top.h*0.07,top.w*0.2,hexA(col,0.85));
    }
    g.shadowBlur=24;
    for(const n of this.notes){const col=PC[n.L];const bw=PW*PPM*0.72,bh=0.11*PPM;g.shadowColor=col;g.fillStyle=col;rr(wx(colX(n.L))-bw/2,wy(n.y)-bh/2,bw,bh,bh/2);g.fill();}
    g.shadowBlur=0;
    for(const p of this.pops){g.globalAlpha=1-p.t;text(p.txt,wx(colX(p.L)),wy(this.yHit+0.3+p.t*0.45),0.075*PPM,'#fff');}
    g.globalAlpha=1;
  },
  hud(){return `Team score ${this.score.reduce((a,b)=>a+b,0)} · ${this.bpm} BPM`;},
  cast(i){return i<6?PC[i]:null;},
  fig(i){return {jump:i<6?this.flash[i]*0.2:0};}
};
});
