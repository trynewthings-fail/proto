/* ARCADE · Tetris Battle: one tall well per column, garbage flies to the neighbours. Playable (keyboard + pad). */
WW.register(W=>{
const {g,PC,COLS,RT,RB,ROWS,bcell,cellPx,cellBg,clearScreen,text,hexA,smiley,shuffle,colX,paneY,PHB,PPM,wx,wy,ic,esc}=W;
const TYPES='IOTSZJL';
const MAT={I:['....','XXXX','....','....'],O:['XX','XX'],T:['.X.','XXX','...'],S:['.XX','XX.','...'],Z:['XX.','.XX','...'],J:['X..','XXX','...'],L:['..X','XXX','...']};
const ROT={};
for(const k in MAT){let m=MAT[k].map(r=>[...r].map(ch=>ch==='X'));const n=m.length;ROT[k]=[];
  for(let i=0;i<4;i++){const cells=[];m.forEach((row,y)=>row.forEach((v,x)=>{if(v)cells.push([x,y]);}));ROT[k].push(cells);
    const nm=Array.from({length:n},()=>Array(n).fill(false));for(let y=0;y<n;y++)for(let x=0;x<n;x++)nm[x][n-1-y]=m[y][x];m=nm;}}
const ATTACK=[0,0,1,2,3];

class Well{
  constructor(i,game){this.i=i;this.game=game;this.human=false;this.reset();}
  reset(){
    this.grid=Array.from({length:ROWS},()=>new Array(COLS).fill(0));
    this.bag=[];this.alive=true;this.pending=0;this.lines=0;this.clearing=null;this.outT=0;this.p=null;
    this.fallT=0;this.botT=0;this.soft=false;this.plan=null;this.botDropping=false;this.shake=0;
    this.noise=0.15+Math.random()*0.45;this.botStep=0.06+Math.random()*0.06;
    this.spawn();
  }
  next(){if(!this.bag.length)this.bag=shuffle(TYPES.split(''));return this.bag.pop();}
  fits(t,r,x,y){for(const [cx,cy] of ROT[t][r&3]){const gx=x+cx,gy=y+cy;if(gx<0||gx>=COLS||gy>=ROWS)return false;if(gy>=0&&this.grid[gy][gx])return false;}return true;}
  spawn(){
    const t=this.next();const minY=Math.min(...ROT[t][0].map(c=>c[1]));const n=MAT[t].length;
    const p={t,r:0,x:Math.floor((COLS-n)/2),y:-minY};
    if(!this.fits(p.t,p.r,p.x,p.y)){this.die();return;}
    this.p=p;this.fallT=0;this.botT=0;this.botDropping=false;this.plan=this.human?null:this.think();
  }
  die(){this.alive=false;this.p=null;this.outT=0;}
  move(dx){const p=this.p;if(p&&this.fits(p.t,p.r,p.x+dx,p.y)){p.x+=dx;return true;}return false;}
  rotate(d){const p=this.p;if(!p)return false;const nr=(p.r+d)&3;for(const k of [0,-1,1,-2,2]){if(this.fits(p.t,nr,p.x+k,p.y)){p.r=nr;p.x+=k;return true;}}return false;}
  dropDist(){const p=this.p;let d=0;while(this.fits(p.t,p.r,p.x,p.y+d+1))d++;return d;}
  hardDrop(){if(!this.p)return;this.p.y+=this.dropDist();this.lock();}
  lock(){
    const p=this.p;
    for(const [cx,cy] of ROT[p.t][p.r]){const gx=p.x+cx,gy=p.y+cy;if(gy<0){this.die();return;}this.grid[gy][gx]=TYPES.indexOf(p.t)+1;}
    this.p=null;
    const full=[];for(let y=0;y<ROWS;y++)if(this.grid[y].every(v=>v))full.push(y);
    if(full.length){
      this.clearing={rows:full,t:0};this.lines+=full.length;
      let atk=ATTACK[Math.min(4,full.length)];const c=Math.min(atk,this.pending);this.pending-=c;atk-=c;
      if(atk>0)this.game.attack(this,atk);
    }else{this.applyGarbage();if(this.alive)this.spawn();}
  }
  applyGarbage(){
    if(this.pending<=0)return;
    const n=Math.min(this.pending,4);this.pending-=n;const hole=Math.random()*COLS|0;this.shake=0.35;
    for(let k=0;k<n;k++){const top=this.grid.shift();const row=new Array(COLS).fill(8);row[hole]=0;this.grid.push(row);if(top.some(v=>v)){this.die();return;}}
  }
  think(){
    const t=this.p.t;let best=null;
    for(let r=0;r<4;r++){const cells=ROT[t][r];
      for(let x=-3;x<=COLS;x++){
        let y=this.p.y;if(!this.fits(t,r,x,y))continue;while(this.fits(t,r,x,y+1))y++;
        const gd=this.grid.map(row=>row.slice());let over=false;
        for(const [cx,cy] of cells){const gy=y+cy;if(gy<0){over=true;break;}gd[gy][x+cx]=1;}
        if(over)continue;
        let lines=0;for(let yy=0;yy<ROWS;yy++)if(gd[yy].every(v=>v)){lines++;gd.splice(yy,1);gd.unshift(new Array(COLS).fill(0));}
        let agg=0,holes=0,bump=0,prev=-1;
        for(let cx=0;cx<COLS;cx++){let h=0;for(let yy=0;yy<ROWS;yy++){if(gd[yy][cx]){h=ROWS-yy;break;}}
          for(let yy=ROWS-h+1;yy<ROWS;yy++)if(!gd[yy][cx])holes++;
          agg+=h;if(prev>=0)bump+=Math.abs(h-prev);prev=h;}
        let s=-0.51*agg+0.76*lines-0.36*holes-0.18*bump+(Math.random()-0.5)*this.noise*4;
        if(lines>=2)s+=0.5*lines;
        if(!best||s>best.s)best={s,r,x};
      }}
    return best;
  }
  botUpdate(dt){
    const p=this.p,pl=this.plan;if(!p)return;if(!pl){this.botDropping=true;return;}
    this.botT+=dt;if(this.botT<this.botStep)return;this.botT=0;
    if((p.r&3)!==pl.r){if(!this.rotate(1))pl.r=p.r&3;return;}
    if(p.x<pl.x){if(!this.move(1))pl.x=p.x;return;}
    if(p.x>pl.x){if(!this.move(-1))pl.x=p.x;return;}
    this.botDropping=true;
  }
  update(dt,gravity){
    this.shake=Math.max(0,this.shake-dt);
    if(!this.alive){this.outT+=dt;return;}
    if(this.clearing){
      this.clearing.t+=dt;
      if(this.clearing.t>0.3){const rows=this.clearing.rows;this.grid=this.grid.filter((_,y)=>!rows.includes(y));while(this.grid.length<ROWS)this.grid.unshift(new Array(COLS).fill(0));this.clearing=null;this.applyGarbage();if(this.alive)this.spawn();}
      return;
    }
    if(!this.p)return;
    if(!this.human)this.botUpdate(dt);
    const gv=this.human?(this.soft?0.035:Math.max(gravity,0.18)):(this.botDropping?0.03:gravity);
    this.fallT+=dt;
    while(this.p&&this.fallT>=gv){this.fallT-=gv;const p=this.p;if(this.fits(p.t,p.r,p.x,p.y+1))p.y++;else{this.lock();break;}}
  }
}
function block(c,x,y,col){
  if(y<0)return;const [X,Y,Wd,H]=bcell(c,x,y);
  g.fillStyle=col;g.fillRect(X+1.5,Y+1.5,Wd-3,H-3);
  g.fillStyle='rgba(255,255,255,.38)';g.fillRect(X+1.5,Y+1.5,Wd-3,H*0.16);
  g.fillStyle='rgba(0,0,0,.28)';g.fillRect(X+1.5,Y+H*0.78,Wd-3,H*0.22-1.5);
}
const KEYS={ArrowLeft:'left',a:'left',ArrowRight:'right',d:'right',ArrowUp:'rot',w:'rot',x:'rot',z:'ccw',ArrowDown:'soft',s:'soft',' ':'drop'};

return {
  id:'tetris',cat:'arcade',by:'Lukas',name:'Tetris Battle',short:'Tetris Battle',playable:true,
  pitch:{
    tagline:'Six tall wells. Clear lines to bury your neighbours.',
    players:['person','6'],mode:'versus',round:'2–3 min',
    input:[['phone','Phone'],['cam','Depth cam gestures']],
    for:['teen','family'],
    how:['One column is one well: top pane plus bottom pane.','Clear 2+ lines to send garbage to your neighbours.','Last stack standing wins.'],
    trick:'The transom is a blind spot: pieces vanish for a beat between panes. Garbage flies behind the mullions to the person standing next to you.',
    needs:[['projector','Projector'],['wifi','Web server'],['speaker','Speaker']],
    open:['Six blocks wide: too narrow?','Join mid-round, or wait?'],
    meters:{read:3,crowd:5,effort:3}
  },
  wells:[],proj:[],t:0,phase:'play',endT:0,winner:null,human:-1,sdT:0,
  init(){if(!this.wells.length)this.wells=[0,1,2,3,4,5].map(i=>new Well(i,this));this.start();},
  start(){this.t=0;this.phase='play';this.proj=[];this.winner=null;this.sdT=0;this.endT=0;this.wells.forEach(w=>{w.human=w.i===this.human;w.reset();});},
  gravity(){return Math.max(0.12,0.55-this.t*0.0042);},
  attack(src,n){for(const dir of [-1,1]){let j=src.i+dir;while(j>=0&&j<6&&!this.wells[j].alive)j+=dir;if(j>=0&&j<6)this.proj.push({from:src.i,to:j,n,t:0,dur:0.45+0.22*Math.abs(j-src.i)});}},
  setHuman(i){
    const old=this.wells[this.human];if(old){old.human=false;old.soft=false;if(old.p)old.plan=old.think();old.botDropping=false;}
    this.human=i;const w=this.wells[i];if(w){w.human=true;w.plan=null;w.botDropping=false;}
  },
  update(dt){
    if(this.phase==='play'){
      this.t+=dt;const gv=this.gravity();
      this.wells.forEach(w=>w.update(dt,gv));
      this.proj=this.proj.filter(p=>{p.t+=dt;if(p.t>=p.dur){const w=this.wells[p.to];if(w.alive)w.pending+=p.n;return false;}return true;});
      if(this.t>75){this.sdT+=dt;if(this.sdT>8){this.sdT=0;this.wells.forEach(w=>{if(w.alive)w.pending+=1;});}}
      const alive=this.wells.filter(w=>w.alive);
      if(alive.length<=1){this.phase='end';this.winner=alive[0]||null;this.endT=0;}
    }else{this.endT+=dt;this.wells.forEach(w=>{if(!w.alive)w.outT+=dt;});if(this.endT>6)this.start();}
  },
  draw(T){clearScreen();for(const w of this.wells)this.drawWell(w,T);for(const p of this.proj)this.drawProj(p);},
  drawWell(w,T){
    const col=PC[w.i];
    for(let r=0;r<2;r++){
      const p=cellBg(w.i,r,hexA(col,r?0.03:0.13),hexA(col,r?0.11:0.03));
      g.strokeStyle=hexA(col,0.08);g.lineWidth=1;g.beginPath();
      for(let x=1;x<COLS;x++){const [bx]=bcell(w.i,x,r?RT:0);g.moveTo(bx+.5,p.y);g.lineTo(bx+.5,p.y+p.h);}
      const n=r?RB:RT;for(let y=1;y<n;y++){const b=bcell(w.i,0,(r?RT:0)+y);g.moveTo(p.x,b[1]+.5);g.lineTo(p.x+p.w,b[1]+.5);}
      g.stroke();
    }
    const top=cellPx(w.i,0);
    text(w.human?'YOU':String(w.i+1),top.x+top.w/2,top.y+top.h*0.5,w.human?top.w*0.36:top.w*0.8,hexA(col,0.11));
    const sx=w.shake>0?Math.sin(w.shake*90)*w.shake*14:0;
    g.save();g.translate(sx,0);
    for(let y=0;y<ROWS;y++)for(let x=0;x<COLS;x++){const v=w.grid[y][x];if(v)block(w.i,x,y,v===8?'#8E928A':col);}
    if(w.clearing){const a=0.55+0.45*Math.sin(w.clearing.t*60);g.fillStyle=`rgba(255,255,255,${a})`;
      for(const y of w.clearing.rows){const [X,Y,,H]=bcell(w.i,0,y);const [X2,,W2]=bcell(w.i,COLS-1,y);g.fillRect(X,Y,X2+W2-X,H);}}
    if(w.p){const p=w.p;
      if(w.human){const d=w.dropDist();g.strokeStyle=hexA(col,0.6);g.lineWidth=2;
        for(const [cx,cy] of ROT[p.t][p.r]){if(p.y+cy+d<0)continue;const [X,Y,Wd,H]=bcell(w.i,p.x+cx,p.y+cy+d);g.strokeRect(X+3,Y+3,Wd-6,H-6);}}
      for(const [cx,cy] of ROT[p.t][p.r])block(w.i,p.x+cx,p.y+cy,col);
    }
    g.restore();
    if(w.pending>0){const b=cellPx(w.i,1);const n=Math.min(w.pending,12);const bh=bcell(w.i,0,RT)[3];
      g.fillStyle=(Math.sin(T*14)>0)?'#fff':'#FF4F4F';for(let k=0;k<n;k++)g.fillRect(b.x+1,b.y+b.h-0.025*PPM-(k+1)*bh+2,0.018*PPM,bh-4);}
    const win=this.phase==='end'&&this.winner===w;
    if(!w.alive){
      const a=Math.min(0.78,w.outT*1.6);
      for(let r=0;r<2;r++){const p=cellPx(w.i,r);g.fillStyle=`rgba(0,0,0,${a})`;g.fillRect(p.x,p.y,p.w,p.h);}
      const k=Math.min(1,w.outT*2.5);
      smiley(g,top.x+top.w/2,top.y+top.h*0.5,top.w*0.4*k,false,col,Math.sin(T*2+w.i)*0.08);
      const b=cellPx(w.i,1);g.globalAlpha=k;text('OUT',b.x+b.w/2,b.y+b.h*0.42,b.w*0.34,col);g.globalAlpha=1;
    }else if(win){
      for(let r=0;r<2;r++){const p=cellPx(w.i,r);g.fillStyle='rgba(0,0,0,.6)';g.fillRect(p.x,p.y,p.w,p.h);}
      for(let k=0;k<40;k++){const r=k%2;const p=cellPx(w.i,r);const fx=p.x+((k*73)%100)/100*p.w;const fy=p.y+(((T*0.5+k*0.137)%1))*p.h;g.fillStyle=PC[k%6];g.fillRect(fx,fy,7,12);}
      const bounce=Math.abs(Math.sin(T*5))*top.h*0.05;
      smiley(g,top.x+top.w/2,top.y+top.h*0.5-bounce,top.w*0.42,true,col,Math.sin(T*3)*0.12);
      const b=cellPx(w.i,1);text('WIN',b.x+b.w/2,b.y+b.h*0.42,b.w*0.34,col);
    }
  },
  drawProj(p){
    const k=p.t/p.dur,e=k<.5?2*k*k:1-Math.pow(-2*k+2,2)/2;
    const x0=wx(colX(p.from)),x1=wx(colX(p.to)),yb=wy(paneY(1)+PHB*0.55),bs=0.09*PPM;
    for(let s=7;s>=0;s--){const ee=Math.max(0,e-s*0.035);const x=x0+(x1-x0)*ee;const y=yb-Math.sin(Math.PI*ee)*0.7*PPM;
      g.globalAlpha=s===0?1:(1-s/8)*0.5;g.fillStyle=s===0?'#fff':PC[p.from];
      for(let n=0;n<p.n;n++)g.fillRect(x-bs/2+(n-(p.n-1)/2)*bs*0.6,y-bs/2-n*bs*0.25,bs*(s?0.7:1),bs*(s?0.7:1));}
    g.globalAlpha=1;
  },
  hud(){
    if(this.phase==='end'){const left=Math.max(0,Math.ceil(6-this.endT));
      if(!this.winner)return `Draw! Next round in ${left} s`;
      return (this.winner.i===this.human?'You win!':`Player ${this.winner.i+1} wins!`)+` Next round in ${left} s`;}
    const s=Math.floor(this.t),mm=Math.floor(s/60),ss=String(s%60).padStart(2,'0');
    const alive=this.wells.filter(w=>w.alive).length;
    return `Round ${mm}:${ss} · ${alive} of 6 standing · `+(this.t>75?'Sudden death':`Sudden death in ${Math.ceil(75-this.t)} s`);
  },
  cast(i){if(i>5)return null;const w=this.wells[i];return w&&!w.alive?'#3d3f3a':PC[i];},
  fig(i,T){const w=this.wells[i];if(!w)return{};const win=this.phase==='end'&&this.winner===w;return {slump:!w.alive,jump:win?Math.abs(Math.sin(T*6))*0.35:(w.clearing?0.12:0)};},

  /* Seats, keyboard and touch pad */
  panel(){return `<section class="box"><div class="box-h">${ic('joystick')}Take a seat</div>
    <div class="seat-row">${PC.map((c,i)=>`<button class="seat" type="button" data-act="seat-${i}" style="--c:${c}" aria-pressed="${this.human===i}" aria-label="Play column ${i+1}">${i+1}</button>`).join('')}
    ${this.human>=0?`<button class="seat leave" type="button" data-act="leave">Leave</button>`:''}</div>
    <p class="keys"><kbd>←</kbd> <kbd>→</kbd> move · <kbd>↑</kbd> rotate · <kbd>↓</kbd> soft drop · <kbd>Space</kbd> drop</p></section>`;},
  panelClick(act){const i=act==='leave'?-1:+act.split('-')[1];this.setHuman(i);if(i>=0)W.view.seat(i);else W.view.reset(true);W.ui.refresh();},
  exit(){if(this.human>=0){this.setHuman(-1);W.view.reset(true);}},
  resetView(){if(this.human>=0){W.view.seat(this.human);return true;}return false;},
  padVisible(){return this.human>=0;},
  act(k,down){if(this.human<0||this.phase!=='play')return;const w=this.wells[this.human];if(!w||!w.alive||w.clearing)return;
    if(k==='soft'){w.soft=down;return;}if(!down)return;
    if(k==='left')w.move(-1);else if(k==='right')w.move(1);else if(k==='rot')w.rotate(1);else if(k==='ccw')w.rotate(-1);else if(k==='drop')w.hardDrop();},
  pad(k,down){this.act(k,down);},
  key(key,down){if(this.human<0)return false;const k=KEYS[key];if(!k)return false;this.act(k,down);return true;}
};
});
