/* PUZZLES · Window Memory: 12 panes = 6 pairs, two teams take turns. */
WW.register(W=>{
const {g,LIME,PINK,PC,PPM,cellPx,clearScreen,text,hexA,rr,smiley,shuffle,clamp}=W;
function symbol(s,X,Y,R,col){
  if(s===3){smiley(g,X,Y,R*0.95,true,col,0);return;}
  g.save();g.translate(X,Y);g.fillStyle=col;g.strokeStyle=col;g.lineWidth=R*0.22;g.lineCap='round';g.lineJoin='round';g.beginPath();
  if(s===0){g.arc(0,0,R*0.8,0,7);g.stroke();}
  else if(s===1){g.moveTo(0,-R*0.85);g.lineTo(R*0.8,R*0.6);g.lineTo(-R*0.8,R*0.6);g.closePath();g.fill();}
  else if(s===2){for(let k=0;k<10;k++){const a=-Math.PI/2+k*Math.PI/5,rad=k%2?R*0.4:R*0.95;g.lineTo(Math.cos(a)*rad,Math.sin(a)*rad);}g.closePath();g.fill();}
  else if(s===4){g.moveTo(-R*0.7,0);g.lineTo(R*0.7,0);g.moveTo(0,-R*0.7);g.lineTo(0,R*0.7);g.stroke();}
  else{g.moveTo(-R*0.9,0);for(let k=0;k<=20;k++)g.lineTo(-R*0.9+k*R*0.09,Math.sin(k/20*Math.PI*3)*R*0.35);g.stroke();}
  g.restore();
}
return {
  id:'memory',cat:'puzzle',by:'Lukas',name:'Window Memory',short:'Memory',
  pitch:{
    tagline:'12 panes, 6 pairs. Two teams take turns.',
    players:['group','2 teams'],mode:'teams',round:'1–2 min',
    input:[['cam','Stand + raise a hand'],['button','12-button panel']],
    for:['kid','family'],
    how:['Each pane is a face-down card.','Stand in front of a column, raise a hand for the top pane.','Match a pair and your team goes again.'],
    trick:'Exactly 12 panes, exactly 6 pairs. The whole façade is the board, so it is the easiest first build.',
    needs:[['projector','Projector'],['cam','Depth cam']],
    open:['Too slow for passers-by?','Science symbols: planets, animals, elements?'],
    meters:{read:5,crowd:3,effort:1}
  },
  init(){this.cards=shuffle([0,0,1,1,2,2,3,3,4,4,5,5]).map(s=>({s,up:false,m:-1,f:0}));this.state='p1';this.timer=1.0;this.team=0;this.scores=[0,0];this.seen={};this.a=-1;this.b=-1;this.plan=-1;this.cheer=[0,0];},
  down(){return this.cards.map((c,i)=>i).filter(i=>!this.cards[i].up&&this.cards[i].m<0);},
  update(dt){
    for(const c of this.cards)c.f=clamp(c.f+((c.up||c.m>=0)?1:-1)*dt*3.2,0,1);
    this.cheer=this.cheer.map(v=>Math.max(0,v-dt));
    this.timer-=dt;if(this.timer>0)return;
    const down=this.down(),C=this.cards,pick=arr=>arr[Math.random()*arr.length|0];
    if(this.state==='p1'){
      let a=-1;this.plan=-1;
      if(Math.random()<0.75){for(const i of down){if(this.seen[i]==null)continue;const j=down.find(k=>k!==i&&this.seen[k]===C[i].s);if(j!=null){a=i;this.plan=j;break;}}}
      if(a<0){const unseen=down.filter(i=>this.seen[i]==null);a=pick(unseen.length?unseen:down);}
      C[a].up=true;this.seen[a]=C[a].s;this.a=a;this.state='p2';this.timer=0.9;
    }else if(this.state==='p2'){
      const rest=down.filter(i=>i!==this.a);let b=this.plan;
      if(b<0&&Math.random()<0.7){const j=rest.find(k=>this.seen[k]===C[this.a].s);if(j!=null)b=j;}
      if(b<0){const unseen=rest.filter(i=>this.seen[i]==null);b=pick(unseen.length?unseen:rest);}
      C[b].up=true;this.seen[b]=C[b].s;this.b=b;this.state='rev';this.timer=1.3;
    }else if(this.state==='rev'){
      const A=C[this.a],B=C[this.b];A.up=B.up=false;
      if(A.s===B.s){A.m=B.m=this.team;this.scores[this.team]++;this.cheer[this.team]=1.2;delete this.seen[this.a];delete this.seen[this.b];
        if(C.every(c=>c.m>=0)){this.state='done';this.timer=3.5;return;}}
      else this.team^=1;
      this.state='p1';this.timer=0.8;
    }else this.init();
  },
  draw(){
    clearScreen();
    this.cards.forEach((c,i)=>{const col=i%6,row=i/6|0;const p=cellPx(col,row);g.fillStyle='#030303';g.fillRect(p.x,p.y,p.w,p.h);
      const k=c.f,sx=Math.max(Math.abs(Math.cos(k*Math.PI)),0.02),face=k>0.5;const m=0.04*PPM,w=(p.w-2*m)*sx,h=p.h-2*m,x=p.x+p.w/2-w/2,y=p.y+m;
      const tcol=c.m>=0?(c.m===0?LIME:PINK):null;rr(x,y,w,h,18);
      if(face){g.fillStyle=tcol?hexA(tcol,0.16):'#141512';g.fill();g.lineWidth=tcol?7:3;g.strokeStyle=tcol||'rgba(255,255,255,.4)';g.stroke();
        g.save();g.translate(p.x+p.w/2,0);g.scale(sx,1);symbol(c.s,0,p.y+p.h/2,p.w*0.33,PC[(c.s+2)%6]);g.restore();}
      else{g.fillStyle='#0b0c08';g.fill();g.lineWidth=3;g.strokeStyle=LIME;g.stroke();
        g.save();g.translate(p.x+p.w/2,p.y+p.h/2);g.scale(sx,1);text('?',0,0,p.w*0.7,LIME);text(String(i+1),0,p.h*0.38,p.w*0.12,hexA(LIME,.5),600);g.restore();}
    });
    if(this.state==='done'){const w=this.scores[0]===this.scores[1]?-1:(this.scores[0]>this.scores[1]?0:1);
      for(let c=0;c<6;c++){const p=cellPx(c,0);g.fillStyle='rgba(0,0,0,.6)';g.fillRect(p.x,p.y,p.w,p.h);}
      const col=w<0?'#fff':(w===0?LIME:PINK),word=w<0?'TIE!':(w===0?'LIME!':'PINK!');
      [...word].forEach((ch,i)=>{const p=cellPx(i,0);text(ch,p.x+p.w/2,p.y+p.h/2,p.w*0.8,col);});}
  },
  hud(){return `Lime ${this.scores[0]} – ${this.scores[1]} Pink · ${this.team===0?'Lime':'Pink'} team’s turn`;},
  cast(i){if(i>5)return null;return i<3?LIME:PINK;},
  fig(i,T){if(i>5)return{};const t=i<3?0:1;return {jump:this.cheer[t]>0?Math.abs(Math.sin(T*8+i))*0.3:0};}
};
});
