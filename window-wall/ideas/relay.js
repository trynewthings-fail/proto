/* PUZZLES · Energy Relay: physics path puzzle. Each 3-pane row is one field
   (fluids → gears → motion → circuits). Rotate tiles so energy reaches the lamp. Playable (click tiles). */
WW.register(W=>{
const {g,CYAN,ORANGE,PINK,YELLOW,PPM,cellPx,cellBg,clearScreen,hexA,rr,shuffle,ICONS}=W;
const FIELDS=[{name:'Fluids',col:CYAN,dim:'#5d8492',icon:'drop'},{name:'Gears',col:ORANGE,dim:'#9a6a40',icon:'gear'},{name:'Motion',col:PINK,dim:'#9a4a7a',icon:'motion'},{name:'Circuits',col:YELLOW,dim:'#9a9440',icon:'bolt'}];
const ORDER=[[0,0],[1,0],[2,0],[3,0],[4,0],[5,0],[5,1],[4,1],[3,1],[2,1],[1,1],[0,1]];
const DX=[0,1,0,-1],DY=[-1,0,1,0];
const rotM=(m,r)=>{for(let i=0;i<(r&3);i++)m=((m<<1)|(m>>3))&15;return m;};
const RLC=3,rlRows=r=>r===0?8:7;
function tcell(k,x,y){const [c,r]=ORDER[k];const p=cellPx(c,r);const m=0.025*PPM;const tw=(p.w-2*m)/RLC,th=(p.h-2*m)/rlRows(r);return [p.x+m+x*tw,p.y+m+y*th,tw,th];}
function cog(cx,cy,R,teeth,ang,col){g.save();g.translate(cx,cy);g.rotate(ang);g.fillStyle=col;g.beginPath();
  for(let i=0;i<teeth*2;i++){const a=i*Math.PI/teeth,r=i%2?R*0.8:R;g.lineTo(Math.cos(a-0.12)*r,Math.sin(a-0.12)*r);g.lineTo(Math.cos(a+0.12)*r,Math.sin(a+0.12)*r);}
  g.closePath();g.fill();g.fillStyle='#0a0a0a';g.beginPath();g.arc(0,0,R*0.32,0,7);g.fill();g.restore();}
function fieldGlyph(icon,cx,cy,S,col){
  if(icon==='gear'){cog(cx,cy,S*0.38,10,0,col);return;}
  g.save();g.translate(cx,cy);g.fillStyle=col;g.strokeStyle=col;g.lineCap='round';g.lineJoin='round';
  if(icon==='drop'){g.beginPath();g.moveTo(0,-S*0.5);g.bezierCurveTo(S*0.35,-S*0.05,S*0.35,S*0.35,0,S*0.38);g.bezierCurveTo(-S*0.35,S*0.35,-S*0.35,-S*0.05,0,-S*0.5);g.fill();}
  else if(icon==='motion'){g.lineWidth=S*0.09;g.beginPath();g.moveTo(-S*0.35,S*0.2);g.lineTo(S*0.25,-S*0.25);g.stroke();g.beginPath();g.arc(-S*0.15,S*0.3,S*0.14,0,7);g.fill();g.beginPath();g.moveTo(S*0.32,-S*0.32);g.lineTo(S*0.05,-S*0.3);g.lineTo(S*0.28,-S*0.08);g.fill();}
  else{g.beginPath();g.moveTo(S*0.05,-S*0.5);g.lineTo(-S*0.25,S*0.05);g.lineTo(0,S*0.05);g.lineTo(-S*0.08,S*0.5);g.lineTo(S*0.25,-S*0.08);g.lineTo(0,-S*0.08);g.closePath();g.fill();}
  g.restore();
}
return {
  id:'relay',cat:'puzzle',by:'Lukas',name:{sv:'Energistafett',en:'Energy Relay'},short:{sv:'Energistafett',en:'Energy Relay'},steam:'E',playable:true,
  fraga:{sv:'Hur många gånger kan energi byta form på vägen till en lampa?',en:'How many times can energy change form on its way to a lamp?'},
  verb:{sv:'vrida, koppla, tända',en:'rotate, connect, light'},
  pitch:{
    tagline:{sv:'Vatten driver kugghjul, kugghjul knuffar, rörelse blir ström. Bygg vägen genom alla 12 rutor.',en:'Water turns gears, gears push, motion makes current. Build the path across all 12 panes.'},
    players:['group','1–12'],mode:'coop',round:{sv:'3–5 min',en:'3–5 min'},
    input:[['cam',{sv:'Peka + håll',en:'Point + hold'}],['phone',{sv:'Tryck på en bricka',en:'Tap a tile'}],['kiosk',{sv:'Pekskärm',en:'Touch kiosk'}]],
    for:['family','school','kid'],
    how:[{sv:'Varje fönsterrad är ett fält: vätskor, kugghjul, rörelse, kretsar.',en:'Each window row is a field: fluids, gears, motion, circuits.'},{sv:'Vrid brickorna tills vägen går genom varje ruta.',en:'Rotate tiles until the path connects through every pane.'},{sv:'Energin byter form vid muren och tvärposten och tänder sedan lampan.',en:'Energy changes form at the pier and transom, then lights the lamp.'}],
    trick:{sv:'Varje rad med 3 rutor är ett eget fysikfält. Omvandlarna sitter där ramarna är, så du ser energin byta form när den korsar väggen.',en:'Each 3-pane row is one physics field. Converters sit where the frames are, so you see the energy change form as it crosses the wall.'},
    needs:[['projector',{sv:'Projektor',en:'Projector'}],['cam',{sv:'Djupkamera',en:'Depth cam'}],['wifi',{sv:'Webbserver',en:'Web server'}]],
    open:[{sv:'Hur exakt går det att peka på 4 m håll?',en:'How accurate is pointing at 4 m?'},{sv:'Svårare nivåer: läckor, tidsgränser, förgreningar?',en:'Harder levels: leaks, timers, splitters?'},{sv:'En riktig lampa på torget som tänds?',en:'A real lamp on the plaza that lights up?'}],
    meters:{read:3,crowd:4,effort:3}
  },
  init(){this.time=0;this.count=0;this.gen();},
  gen(){
    this.panes=[];this.f=0;this.done=0;this.lastUser=-99;this.botT=0;
    const dirTo=(a,b)=>[0,1,2,3].find(d=>a[0]+DX[d]===b[0]&&a[1]+DY[d]===b[1]);
    for(let k=0;k<12;k++){
      const r=ORDER[k][1],H=rlRows(r);
      const entry=k<=5?3:(k===6?0:1),exit=k<=4?1:(k===5?2:3);
      const linked=!(k===0||k===3||k===9);
      const prev=this.panes[k-1];
      const eIdx=linked?prev.exitIdx:(entry===0?Math.random()*RLC|0:Math.random()*H|0);
      const xIdx=exit===2?Math.random()*RLC|0:Math.random()*H|0;
      const sc=entry===3?[0,eIdx]:entry===1?[RLC-1,eIdx]:[eIdx,0];
      const ec=exit===1?[RLC-1,xIdx]:exit===3?[0,xIdx]:[xIdx,H-1];
      const path=this.findPath(H,sc,ec);
      const tiles=Array.from({length:H},()=>Array.from({length:RLC},()=>({base:Math.random()<.5?5:3,turns:Math.random()*4|0,sol:null,blank:Math.random()<0.12,ang:0})));
      path.forEach((c,i)=>{
        const inD=i===0?entry:dirTo(c,path[i-1]),outD=i===path.length-1?exit:dirTo(c,path[i+1]);
        const t=tiles[c[1]][c[0]];t.blank=false;t.base=(inD+2)%4===outD?5:3;t.sol=(1<<inD)|(1<<outD);t.turns=Math.random()*4|0;
      });
      if(path.every(c=>{const t=tiles[c[1]][c[0]];return rotM(t.base,t.turns)===t.sol;})){const c=path[0];tiles[c[1]][c[0]].turns++;}
      tiles.forEach(row=>row.forEach(t=>t.ang=t.turns*Math.PI/2));
      this.panes.push({k,H,entry,exit,entryIdx:eIdx,exitIdx:xIdx,start:sc,path,tiles});
    }
    this.tr=this.trace();
  },
  findPath(H,s,e){
    const cap=Math.ceil(RLC*H*0.7),minLen=Math.min(6,Math.abs(s[0]-e[0])+Math.abs(s[1]-e[1])+3);
    for(let tries=0;tries<80;tries++){
      const seen=new Set(),path=[];let budget=3000;
      const dfs=(x,y)=>{if(--budget<0)return false;seen.add(x+','+y);path.push([x,y]);if(x===e[0]&&y===e[1])return true;
        for(const d of shuffle([0,1,2,3])){const nx=x+DX[d],ny=y+DY[d];if(nx<0||nx>=RLC||ny<0||ny>=H||seen.has(nx+','+ny))continue;if(dfs(nx,ny))return true;}
        path.pop();return false;};
      if(dfs(s[0],s[1])&&path.length<=cap&&path.length>=minLen)return path;
    }
    const path=[[s[0],s[1]]];let [x,y]=s;while(x!==e[0]||y!==e[1]){if(y!==e[1])y+=Math.sign(e[1]-y);else x+=Math.sign(e[0]-x);path.push([x,y]);}return path;
  },
  trace(){
    const chain=[];
    for(let k=0;k<12;k++){
      const P=this.panes[k];let [x,y]=P.start,from=P.entry,ok=false;const seen=new Set();
      for(;;){
        if(x<0||x>=RLC||y<0||y>=P.H){const side=x<0?3:x>=RLC?1:y<0?0:2;const idx=(side===1||side===3)?y:x;ok=side===P.exit&&idx===P.exitIdx;break;}
        const key=x+','+y;if(seen.has(key))break;seen.add(key);
        const t=P.tiles[y][x];if(t.blank)break;const m=rotM(t.base,t.turns);if(!(m&(1<<from)))break;
        const out=[0,1,2,3].find(d=>d!==from&&(m&(1<<d)));if(out==null)break;
        chain.push({k,x,y,from,out});x+=DX[out];y+=DY[out];from=(out+2)%4;
      }
      if(!ok)return {chain,solved:k};
    }
    return {chain,solved:12};
  },
  update(dt){
    this.time+=dt;
    this.panes.forEach(P=>P.tiles.forEach(row=>row.forEach(t=>{const tgt=t.turns*Math.PI/2;t.ang+=(tgt-t.ang)*Math.min(1,dt*14);})));
    const tr=this.tr=this.trace();const L=tr.chain.length;
    if(this.f>L)this.f=L;else this.f=Math.min(L,this.f+dt*5);
    if(tr.solved===12&&this.f>=L&&!this.done){this.done=1e-4;this.count++;}
    if(this.done){this.done+=dt;if(this.done>8)this.gen();}
    else if(this.time-this.lastUser>10){this.botT+=dt;if(this.botT>1.0){this.botT=0;this.botStep();}}
  },
  botStep(){const P=this.panes[this.tr.solved];if(!P)return;for(const [x,y] of P.path){const t=P.tiles[y][x];if(rotM(t.base,t.turns)!==t.sol){t.turns++;return;}}},
  click(px,py){
    if(this.done)return;
    for(let k=0;k<12;k++){const P=this.panes[k];for(let y=0;y<P.H;y++)for(let x=0;x<RLC;x++){const [X,Y,Wd,H]=tcell(k,x,y);
      if(px>=X&&px<X+Wd&&py>=Y&&py<Y+H){const t=P.tiles[y][x];if(!t.blank){t.turns++;this.lastUser=this.time;}return;}}}
  },
  draw(T){
    clearScreen('#030405');
    const tr=this.tr,pow=new Map(),first={};
    tr.chain.forEach((e,i)=>{pow.set(e.k+':'+e.x+':'+e.y,{i,e});if(first[e.k]==null)first[e.k]=i;});
    const reached=k=>first[k]!=null&&first[k]<this.f;
    for(let k=0;k<12;k++){
      const [c,r]=ORDER[k],F=FIELDS[k/3|0],P=this.panes[k];
      const p=cellBg(c,r,hexA(F.col,0.10),hexA(F.col,0.03));
      fieldGlyph(F.icon,p.x+p.w/2,p.y+p.h/2,p.w*0.85,hexA(F.col,0.06));
      if(this.done){g.fillStyle=hexA(F.col,0.16+0.14*Math.sin(T*6-k*0.6));g.fillRect(p.x,p.y,p.w,p.h);}
      for(let y=0;y<P.H;y++)for(let x=0;x<RLC;x++){
        const t=P.tiles[y][x],[X,Y,Wd,H]=tcell(k,x,y),cx=X+Wd/2,cy=Y+H/2,e=Math.max(Wd,H)/2;
        rr(X+2,Y+2,Wd-4,H-4,6);g.fillStyle=hexA(F.col,0.05);g.fill();g.lineWidth=1;g.strokeStyle=hexA(F.col,0.16);g.stroke();
        if(t.blank){g.save();rr(X+5,Y+5,Wd-10,H-10,4);g.fillStyle='#16181b';g.fill();g.clip();g.strokeStyle='rgba(255,255,255,.07)';g.lineWidth=2;g.beginPath();for(let d=-H;d<Wd;d+=10){g.moveTo(X+d,Y+H);g.lineTo(X+d+H,Y);}g.stroke();g.restore();continue;}
        const pe=pow.get(k+':'+x+':'+y),on=!!pe&&pe.i<this.f;
        g.save();g.translate(cx,cy);g.rotate(t.ang);this.tile(k/3|0,t.base,e,on,T,(x+y)%2);g.restore();
        if(on)this.mover(k/3|0,pe,cx,cy,e,T);
      }
    }
    this.converters(T,reached);
  },
  tile(fi,base,e,on,T,par){
    const F=FIELDS[fi],dirs=[0,1,2,3].filter(d=>base&(1<<d));g.lineCap='round';g.lineJoin='round';
    const seg=(w,col)=>{g.lineWidth=w;g.strokeStyle=col;g.beginPath();dirs.forEach(d=>{g.moveTo(0,0);g.lineTo(DX[d]*e,DY[d]*e);});g.stroke();};
    if(fi===0){seg(e*0.62,on?'#22313a':F.dim);if(on){seg(e*0.38,F.col);g.setLineDash([e*0.18,e*0.26]);g.lineDashOffset=-T*e*1.6;seg(e*0.1,'#d9fbff');g.setLineDash([]);}
      g.fillStyle=on?'#22313a':F.dim;g.beginPath();g.arc(0,0,e*0.34,0,7);g.fill();if(on){g.fillStyle=F.col;g.beginPath();g.arc(0,0,e*0.22,0,7);g.fill();}}
    else if(fi===1){seg(e*0.18,on?F.col:F.dim);cog(0,0,e*0.56,8,on?T*2.6*(par?1:-1):0,on?F.col:F.dim);}
    else if(fi===2){const off=e*0.22,col=on?F.col:F.dim;g.strokeStyle=col;
      dirs.forEach(d=>{const px=-DY[d],py=DX[d];g.lineWidth=3;g.beginPath();g.moveTo(px*off,py*off);g.lineTo(DX[d]*e+px*off,DY[d]*e+py*off);g.moveTo(-px*off,-py*off);g.lineTo(DX[d]*e-px*off,DY[d]*e-py*off);g.stroke();
        g.lineWidth=2;g.beginPath();for(let s=0.25;s<1;s+=0.3){g.moveTo(DX[d]*e*s+px*off*1.3,DY[d]*e*s+py*off*1.3);g.lineTo(DX[d]*e*s-px*off*1.3,DY[d]*e*s-py*off*1.3);}g.stroke();});
      g.lineWidth=3;g.beginPath();g.arc(0,0,off*1.1,0,7);g.stroke();}
    else{if(on){g.shadowBlur=14;g.shadowColor=F.col;}seg(e*0.13,on?F.col:F.dim);g.shadowBlur=0;
      g.fillStyle='#111';rr(-e*0.26,-e*0.26,e*0.52,e*0.52,4);g.fill();g.lineWidth=2;g.strokeStyle=on?F.col:F.dim;g.stroke();}
  },
  mover(fi,pe,cx,cy,e,T){
    if(fi!==2&&fi!==3)return;const {from,out}=pe.e;
    const at=s=>s<0.5?[cx+DX[from]*e*(1-2*s),cy+DY[from]*e*(1-2*s)]:[cx+DX[out]*e*(2*s-1),cy+DY[out]*e*(2*s-1)];
    if(fi===2){const [x,y]=at((T*1.2+pe.i*0.37)%1);g.fillStyle='#fff';g.beginPath();g.arc(x,y,e*0.22,0,7);g.fill();g.fillStyle=PINK;g.beginPath();g.arc(x,y,e*0.16,0,7);g.fill();}
    else{for(const o of [0,0.5]){const [x,y]=at((T*2.4+pe.i*0.31+o)%1);g.fillStyle='#fff';g.shadowBlur=10;g.shadowColor=YELLOW;g.beginPath();g.arc(x,y,e*0.09,0,7);g.fill();g.shadowBlur=0;}}
  },
  converters(T,reached){
    const badge=(k,side,idx,draw)=>{const P=this.panes[k];const x=side===3?0:side===1?RLC-1:idx,y=side===0?0:side===2?P.H-1:idx;const [X,Y,Wd,H]=tcell(k,x,y);
      const bx=side===3?X:side===1?X+Wd:X+Wd/2,by=side===0?Y:side===2?Y+H:Y+H/2;draw(bx,by,Math.min(Wd,H)*0.34);};
    badge(0,3,this.panes[0].entryIdx,(x,y,R)=>{g.fillStyle=CYAN;g.beginPath();g.arc(x,y,R,0,7);g.fill();fieldGlyph('drop',x,y,R*1.4,'#003040');});
    badge(3,3,this.panes[3].entryIdx,(x,y,R)=>{const on=reached(3);g.save();g.translate(x,y);g.rotate(on?T*2:0);g.strokeStyle=on?ORANGE:'#6a6a6a';g.lineWidth=4;g.beginPath();g.arc(0,0,R,0,7);g.stroke();
      for(let i=0;i<6;i++){g.rotate(Math.PI/3);g.beginPath();g.moveTo(0,0);g.lineTo(R,0);g.stroke();g.fillStyle=on?CYAN:'#555';g.fillRect(R-4,-6,10,12);}g.restore();});
    badge(6,0,this.panes[6].entryIdx,(x,y,R)=>{const on=reached(6),a=on?T*3:0;g.strokeStyle=on?PINK:'#6a6a6a';g.lineWidth=4;g.beginPath();g.arc(x,y,R,0,7);g.stroke();
      const cx=x+Math.cos(a)*R*0.7,cy=y+Math.sin(a)*R*0.7;g.beginPath();g.moveTo(x,y);g.lineTo(cx,cy);g.lineTo(x,y+R*1.6);g.stroke();g.fillStyle=ORANGE;g.beginPath();g.arc(cx,cy,5,0,7);g.fill();});
    badge(9,1,this.panes[9].entryIdx,(x,y,R)=>{g.fillStyle=reached(9)?YELLOW:'#555';g.beginPath();g.arc(x,y,R,0,7);g.fill();fieldGlyph('bolt',x,y,R*1.3,'#1a1a1a');});
    badge(11,3,this.panes[11].exitIdx,(x,y,R)=>{const lit=!!this.done;if(lit){g.shadowBlur=60;g.shadowColor=YELLOW;}g.fillStyle=lit?'#fff7b0':'#3a3a2a';g.beginPath();g.arc(x,y,R*1.25,0,7);g.fill();g.shadowBlur=0;});
  },
  hud(){
    if(this.done)return `Machine complete! Water → gears → motion → current. New puzzle in ${Math.max(0,Math.ceil(8-this.done))} s`;
    const s=this.tr?this.tr.solved:0,bot=this.time-this.lastUser>10;
    return `${s} of 12 panes connected · ${bot?'Helper bot is nudging tiles · ':''}Click a tile on the façade to rotate it`;
  },
  cast(i){return i<6?W.LIME:null;},
  fig(i,T){return {jump:this.done&&i<6?Math.abs(Math.sin(T*7+i))*0.3:0};},
  panel(){return `<section class="box"><div class="box-h">${W.ic('touch')}Try it</div><p>Click any tile on the façade to rotate it. Idle for 10 s and a helper bot fixes one tile at a time.</p>
    <div class="chips">${FIELDS.map(F=>`<span class="ichip"><svg class="ic" viewBox="0 0 24 24" aria-hidden="true" style="color:${F.col}">${ICONS[F.icon]}</svg>${F.name}</span>`).join('')}</div></section>`;}
};
});
