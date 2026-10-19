/* PUZZLE · Frog Stones: frogs hop between stones that visitors move by walking in front of the windows (depth cam). (by Lukas) */
WW.register(W=>{
const {g,PC,LIME,PINK,PPM,cellBg,clearScreen,hexA,clamp,wx,wy,paneX,paneY,paneH,X0,people,tracked}=W;
const lerp=(a,b,u)=>a+(b-a)*u;
const L=()=>paneX(0)+0.25, R=()=>paneX(5)+0.35;           // start pad / goal pad (m)
const LOW=()=>paneY(1)+0.3, HIGH=()=>paneY(0)+paneH(0)-0.45;
let st={};

function spawn(wait){return {on:'L',mode:'sit',wait:0.6+wait+Math.random(),x:L(),y:LOW()+0.05,sad:false};}

// Every stone this frame: two fixed lily pads + one stone per tracked person (or 3 drifting bot stones).
function stones(T){
  const s=[{k:'L',x:L(),y:LOW(),pad:1},{k:'R',x:R(),y:LOW(),pad:2}];
  const tr=tracked();
  if(tr.length) for(const p of tr){
    const i=people.indexOf(p);
    s.push({k:p,x:clamp(p.x,L()+0.3,R()-0.3),y:lerp(LOW(),HIGH(),clamp((p.z-1.5)/4,0,1)),col:PC[i%6]});
  } else for(let b=0;b<3;b++) s.push({k:'b'+b,x:X0+Math.sin(T*0.35+b*2.1)*(R()-L())*0.42,y:LOW()+0.25*(1+Math.sin(T*0.5+b)),col:PC[b]});
  return s;
}

function frog(f,i,T){
  const s=PPM,air=f.mode!=='sit',x=wx(f.x)+(air?0:(i-1.5)*0.07*s),y=wy(f.y);
  if(air){g.strokeStyle=LIME;g.lineWidth=10;g.beginPath();
    g.moveTo(x-0.12*s,y-0.08*s);g.lineTo(x-0.28*s,y+0.08*s);g.moveTo(x+0.12*s,y-0.08*s);g.lineTo(x+0.28*s,y+0.08*s);g.stroke();}
  const by=y-0.12*s-(air?0:Math.abs(Math.sin(T*3+i))*0.015*s);
  g.fillStyle=LIME;g.beginPath();g.ellipse(x,by,0.18*s,(air?0.14:0.11)*s,0,0,7);g.fill();
  for(const d of[-1,1]){
    g.fillStyle='#ffffff';g.beginPath();g.arc(x+d*0.09*s,by-0.1*s,0.055*s,0,7);g.fill();
    g.fillStyle='#000000';g.beginPath();g.arc(x+d*0.09*s+0.012*s,by-0.1*s,0.026*s,0,7);g.fill();
  }
  g.strokeStyle='#000000';g.lineWidth=4;g.beginPath();
  if(f.sad)g.arc(x,by+0.07*s,0.07*s,Math.PI*1.15,Math.PI*1.85);else g.arc(x,by-0.01*s,0.08*s,0.2,Math.PI-0.2);
  g.stroke();
}

return {
  id:'frog-stones',cat:'puzzle',by:'Lukas',name:'Frog Stones',short:'Frog Stones',crowd:true,
  pitch:{
    tagline:'You are the stepping stone. Walk, and the frogs hop with you.',
    players:['group','2–8'],mode:'coop',round:'Drop in',
    input:[['cam','Depth cam: where you stand'],['pad','Floor pads']],
    for:['kid','family','school'],
    how:['Stand in front of a window: a stone appears in the pond.','Walk to move it. Step back to lift it higher.','Line up together so the frogs reach the flower on the far lily pad.'],
    trick:'Frogs arc up past the transom and vanish behind mullions. Only two people, one on each side of the pier, can get them across the gap.',
    needs:[['projector','Projector'],['cam','Depth cam ×2'],['speaker','Croaks and splashes']],
    open:['Score the frogs that get across, or just let them live?','Walk away with a frog on your stone: splash, or let the stone fade gently?','Should step-back-to-lift stay, or is left/right enough?'],
    meters:{read:5,crowd:4,effort:2}
  },
  init(){
    st={t:0,home:0,rip:[],S:[]};
    st.reach=Math.max(1.3,paneX(3)-(paneX(2)+0.6)+0.9);   // the pier is only crossable with a stone close to each side
    st.frogs=[0,1,2,3].map(i=>spawn(i*0.9));
    st.S=stones(0);
  },
  update(dt){
    st.t+=dt;const S=st.S=stones(st.t),get=k=>S.find(s=>s.k===k);
    st.rip=st.rip.filter(r=>(r.t+=dt)<1.2);
    for(const f of st.frogs){
      if(f.mode==='hop'){
        const tg=get(f.to);f.u+=dt/f.dur;
        if(!tg){f.mode='fall';f.vy=0;continue;}
        const u=Math.min(f.u,1);
        f.x=lerp(f.x0,tg.x,u);f.y=lerp(f.y0,tg.y+0.05,u)+Math.sin(Math.PI*u)*f.h;
        if(f.u>=1){
          f.mode='sit';f.on=f.to;f.wait=0.5+Math.random()*1.1;st.rip.push({x:f.x,y:tg.y,t:0,c:LIME});
          if(f.on==='R'){st.home++;Object.assign(f,spawn(0.6));}
        }
      } else if(f.mode==='fall'){
        f.vy-=9*dt;f.y+=f.vy*dt;
        if(f.y<paneY(1)+0.1){st.rip.push({x:f.x,y:paneY(1)+0.15,t:0,c:'#ffffff'});Object.assign(f,spawn(1));}
      } else {
        const s=get(f.on);
        if(!s){f.mode='fall';f.vy=1.5;continue;}             // your stone left with you: splash
        f.x=s.x;f.y=s.y+0.05;
        if((f.wait-=dt)>0)continue;
        const near=S.filter(o=>o.k!==f.on&&o.k!=='L'&&Math.hypot(o.x-s.x,(o.y-s.y)*0.5)<st.reach);
        let tg=near.filter(o=>o.x>s.x+0.15).sort((a,b)=>b.x-a.x)[0];
        if(!tg&&near.length&&Math.random()<0.3)tg=near[Math.floor(Math.random()*near.length)];
        f.sad=!tg;
        if(!tg){f.wait=0.4;continue;}
        const d=Math.hypot(tg.x-s.x,tg.y-s.y);
        Object.assign(f,{mode:'hop',to:tg.k,u:0,x0:s.x,y0:f.y,h:0.3+d*0.35,dur:0.4+d*0.18});
      }
    }
  },
  draw(T){
    clearScreen('#000000');
    for(let c=0;c<6;c++)for(let r=0;r<2;r++){
      const p=cellBg(c,r,'#04261c','#020d09');
      g.strokeStyle=hexA(LIME,0.1);g.lineWidth=3;
      for(let k=1;k<4;k++){const y=p.y+p.h*k/4;g.beginPath();
        for(let x=0;x<=p.w;x+=12)g.lineTo(p.x+x,y+Math.sin(x*0.03+T*1.5+c+k)*5);g.stroke();}
    }
    for(const r of st.rip){g.strokeStyle=hexA(r.c,1-r.t/1.2);g.lineWidth=4;g.beginPath();
      g.ellipse(wx(r.x),wy(r.y),(0.15+r.t*0.5)*PPM,(0.05+r.t*0.15)*PPM,0,0,7);g.stroke();}
    for(const s of st.S){
      g.beginPath();g.ellipse(wx(s.x),wy(s.y),(s.pad?0.3:0.27)*PPM,0.09*PPM,0,0,7);
      g.fillStyle=s.pad?'#2f7a1e':'#3a3d38';g.fill();
      g.lineWidth=7;g.strokeStyle=s.pad?LIME:s.col;g.stroke();
      if(s.pad===2){g.fillStyle=PINK;g.beginPath();g.arc(wx(s.x)+0.15*PPM,wy(s.y)-0.05*PPM,0.06*PPM,0,7);g.fill();}
    }
    st.frogs.forEach((f,i)=>frog(f,i,T));
  },
  hud(){return `${st.home} frogs made it across · ${Math.max(0,st.S.length-2)} stones`;},
  cast(i){return PC[i%6];},
  fig(){return {};}
};
});
