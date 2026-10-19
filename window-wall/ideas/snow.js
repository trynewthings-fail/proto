/* VISUAL · Snow Catcher: digital snow piles up on people's silhouettes; move fast to shake it off (depth cam). */
WW.register(W=>{
const {g,LIME,SW,SH,SX0,SX1,SY1,PPM,PY_BOT,clamp,hexA,wx,wy,tracked,silhouette}=W;
return {
  id:'snow',cat:'visual',by:'Lukas',name:'Snow Catcher',short:'Snow Catcher',crowd:true,
  pitch:{
    tagline:'Digital snow falls across the panes and piles up on your silhouette.',
    players:['group','1–8'],mode:'ambient',round:'Drop in',
    input:[['cam','Your silhouette']],
    for:['kid','family'],
    how:['Snow falls across all 12 panes.','It lands on your head and shoulders.','Move fast to shake it off.'],
    trick:'Flakes drift behind the transom and mullions as if snow is falling on the other side of real glass.',
    needs:[['projector','Projector'],['cam','Depth cam ×2']],
    open:['Summer version: leaves or confetti?','Real snow plus digital snow in January!'],
    meters:{read:4,crowd:4,effort:2}
  },
  init(){this.f=[];this.stuck=[];this.t=0;this.pile=new Float32Array(Math.ceil((SX1-SX0)/0.04)+1);},
  update(dt){
    this.t+=dt;const ppl=tracked();
    for(let i=0;i<dt*90;i++)this.f.push({x:SX0+Math.random()*(SX1-SX0+0.6)-0.3,y:SY1+0.05,vy:0.25+Math.random()*0.25,ph:Math.random()*6,r:2+Math.random()*3});
    const keep=[];
    for(const f of this.f){f.y-=f.vy*dt;f.x+=(Math.sin(this.t*0.7+f.ph)*0.08+0.04)*dt;let hit=false;
      for(const p of ppl){const h=clamp(3.0-(p.z-2.6)*0.25,1.6,3.0),hx=f.x-p.x,hy=f.y-(PY_BOT+h*0.9);
        if(hx*hx+hy*hy<(h*0.1)*(h*0.1)||(Math.abs(hx)<h*0.15&&f.y<PY_BOT+h*0.8&&f.y>PY_BOT+h*0.74)){this.stuck.push({p,ox:hx,oy:f.y-PY_BOT,r:f.r,t:0});hit=true;break;}}
      if(hit)continue;
      const bi=clamp(Math.round((f.x-SX0)/0.04),0,this.pile.length-1);
      if(f.y<=PY_BOT+this.pile[bi]){this.pile[bi]=Math.min(0.35,this.pile[bi]+0.006);continue;}
      keep.push(f);}
    this.f=keep;
    for(let i=0;i<this.pile.length;i++)this.pile[i]=Math.max(0,this.pile[i]-dt*0.004);
    this.stuck=this.stuck.filter(s=>{s.t+=dt;if(Math.abs(s.p.vx)>0.55||s.t>14){this.f.push({x:s.p.x+s.ox,y:PY_BOT+s.oy,vy:0.6,ph:0,r:s.r});return false;}return true;});
    if(this.stuck.length>500)this.stuck.splice(0,this.stuck.length-500);
  },
  draw(T){
    const gr=g.createLinearGradient(0,0,0,SH);gr.addColorStop(0,'#0a1630');gr.addColorStop(1,'#1d3352');g.fillStyle=gr;g.fillRect(0,0,SW,SH);
    for(const p of tracked()){const h=clamp(3.0-(p.z-2.6)*0.25,1.6,3.0);silhouette(p.x,h,0,T,false,p.walk,'#050b16',null);
      g.strokeStyle=hexA(LIME,.5);g.lineWidth=2;g.beginPath();g.arc(wx(p.x),wy(PY_BOT+h*0.9),h*0.1*PPM+2,Math.PI*1.1,Math.PI*1.9);g.stroke();}
    g.fillStyle='#f4fbff';
    for(const s of this.stuck){g.beginPath();g.arc(wx(s.p.x+s.ox),wy(PY_BOT+s.oy),s.r,0,7);g.fill();}
    g.globalAlpha=0.85;for(const f of this.f){g.beginPath();g.arc(wx(f.x),wy(f.y),f.r,0,7);g.fill();}
    g.globalAlpha=1;g.beginPath();g.moveTo(0,wy(PY_BOT-0.1));for(let i=0;i<this.pile.length;i++)g.lineTo(wx(SX0+i*0.04),wy(PY_BOT+this.pile[i]));g.lineTo(SW,wy(PY_BOT-0.1));g.closePath();g.fill();
  },
  hud(){return `${this.stuck.length} snowflakes resting on people`;},
  cast(){return LIME;},fig(){return {};}
};
});
