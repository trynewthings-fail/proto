/* CRAFTY · Draw-a-Creature Aquarium: scanned drawings swim across one big tank behind the frames. */
WW.register(W=>{
const {g,LIME,PC,PPM,SW,SH,SX0,SX1,SY0,SY1,PY_BOT,PY_TOP,cellPx,text,hexA,rr,clamp,wx,wy}=W;
return {
  id:'aquarium',cat:'crafty',by:'Lukas',name:'Draw-a-Creature Aquarium',short:'Aquarium',crowd:true,
  pitch:{
    tagline:'Draw a creature inside, watch it swim across the façade outside.',
    players:['crowd','∞'],mode:'ambient',round:'All evening',
    input:[['scan','Scan a drawing'],['phone','Draw on phone']],
    for:['kid','family'],
    how:['Colour a fish template in the lobby.','Scan it.','It swims out on the façade with a NEW tag.'],
    trick:'The panes become portholes into one big tank. Fish swim behind the frames, so the whole building seems full of water.',
    needs:[['projector','Projector'],['scan','Scanner station'],['wifi','Web server']],
    open:['Moderating phone drawings?','Fish that follow people outside (depth cam)?'],
    meters:{read:4,crowd:5,effort:3}
  },
  mk(isNew){const dir=isNew?1:(Math.random()<.5?1:-1);const jelly=!isNew&&Math.random()<0.2;
    return {x:isNew?SX0-0.6:SX0+Math.random()*(SX1-SX0),y:PY_BOT+0.25+Math.random()*(PY_TOP-PY_BOT-0.5),vx:jelly?dir*0.07:dir*(0.25+Math.random()*0.35),s:isNew?0.2:0.1+Math.random()*0.08,col:PC[Math.random()*6|0],col2:PC[Math.random()*6|0],ph:Math.random()*6,jelly,tag:isNew?7:0};},
  init(){this.fish=[];for(let i=0;i<10;i++)this.fish.push(this.mk(false));this.spawnT=2.5;this.bub=[];this.born=0;},
  update(dt){
    for(const f of this.fish){f.x+=f.vx*dt;f.ph+=dt;f.y+=Math.sin(f.ph*(f.jelly?1.6:0.9))*(f.jelly?0.12:0.05)*dt;f.y=clamp(f.y,PY_BOT+0.2,PY_TOP-0.2);f.tag=Math.max(0,f.tag-dt);
      if(f.x>SX1+0.8)f.x=SX0-0.8;if(f.x<SX0-0.8)f.x=SX1+0.8;}
    this.spawnT-=dt;if(this.spawnT<=0){this.spawnT=7;this.fish.push(this.mk(true));this.born++;if(this.fish.length>14){const k=this.fish.findIndex(f=>!f.tag);if(k>=0)this.fish.splice(k,1);}}
    if(Math.random()<dt*6)this.bub.push({x:SX0+Math.random()*(SX1-SX0),y:SY0,r:3+Math.random()*6});
    this.bub.forEach(b=>{b.y+=dt*(0.25+b.r*0.03);b.x+=Math.sin(b.y*6)*dt*0.05;});this.bub=this.bub.filter(b=>b.y<SY1+0.1);
  },
  draw(T){
    const gr=g.createLinearGradient(0,0,0,SH);gr.addColorStop(0,'#04314a');gr.addColorStop(1,'#010b12');g.fillStyle=gr;g.fillRect(0,0,SW,SH);
    g.strokeStyle='rgba(255,255,255,.05)';g.lineWidth=3;
    for(let k=0;k<7;k++){g.beginPath();for(let x=0;x<=SW;x+=24){const y=k*SH/7+Math.sin(x*0.012+T*0.8+k)*14+Math.sin(x*0.031-T*1.3)*6;x?g.lineTo(x,y):g.moveTo(x,y);}g.stroke();}
    for(let c=0;c<6;c++){const p=cellPx(c,1);g.fillStyle='#14231a';g.fillRect(p.x,p.y+p.h*0.9,p.w,p.h*0.1);
      for(let s=0;s<2;s++){const bx=p.x+p.w*(0.3+s*0.4),h=p.h*(0.35+((c*7+s*3)%5)*0.07);g.strokeStyle=hexA(LIME,.75);g.lineWidth=7;g.lineCap='round';g.beginPath();g.moveTo(bx,p.y+p.h);
        g.quadraticCurveTo(bx+Math.sin(T*1.2+c+s)*26,p.y+p.h-h*0.5,bx+Math.sin(T*1.2+c+s+1)*18,p.y+p.h-h);g.stroke();}}
    g.fillStyle='rgba(255,255,255,.35)';for(const b of this.bub){g.beginPath();g.arc(wx(b.x),wy(b.y),b.r,0,7);g.fill();}
    for(const f of this.fish){const X=wx(f.x),Y=wy(f.y),L=f.s*PPM,dir=f.vx>=0?1:-1;g.save();g.translate(X,Y);
      if(f.jelly){const pu=1+Math.sin(f.ph*3)*0.08;g.scale(pu,1/pu);g.fillStyle=hexA(f.col,.8);g.beginPath();g.arc(0,0,L,Math.PI,0);g.quadraticCurveTo(0,L*0.3,-L,0);g.fill();
        g.strokeStyle=hexA(f.col,.6);g.lineWidth=4;for(let k=-2;k<=2;k++){g.beginPath();g.moveTo(k*L*0.35,0);for(let s=1;s<=6;s++)g.lineTo(k*L*0.35+Math.sin(f.ph*3+s+k)*6,s*L*0.28);g.stroke();}
        g.fillStyle='#000';g.beginPath();g.arc(-L*0.3,-L*0.35,L*0.09,0,7);g.arc(L*0.3,-L*0.35,L*0.09,0,7);g.fill();}
      else{g.scale(dir,1);const wig=Math.sin(f.ph*8)*0.25;
        g.fillStyle=f.col;g.save();g.translate(-L*0.8,0);g.rotate(wig);g.beginPath();g.moveTo(0,0);g.lineTo(-L*0.7,-L*0.5);g.lineTo(-L*0.7,L*0.5);g.closePath();g.fill();g.restore();
        g.beginPath();g.ellipse(0,0,L,L*0.58,0,0,7);g.fill();g.save();g.clip();g.fillStyle=f.col2;g.fillRect(-L*0.35,-L,L*0.18,L*2);g.fillRect(L*0.05,-L,L*0.14,L*2);g.restore();
        g.fillStyle='#fff';g.beginPath();g.arc(L*0.5,-L*0.12,L*0.18,0,7);g.fill();g.fillStyle='#000';g.beginPath();g.arc(L*0.55,-L*0.12,L*0.09,0,7);g.fill();}
      g.restore();
      if(f.tag>0){g.globalAlpha=Math.min(1,f.tag);const tw=0.3*PPM,th=0.11*PPM;g.fillStyle=LIME;rr(X-tw/2,Y-L-th-12,tw,th,th/2);g.fill();text('NEW',X,Y-L-th/2-12,th*0.7,'#000');g.globalAlpha=1;}
    }
  },
  hud(){return `${this.fish.length} creatures in the tank · ${this.born} new drawings so far`;},
  cast(){return null;},fig(){return {};}
};
});
