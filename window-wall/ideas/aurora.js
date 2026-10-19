/* VISUAL · Plaza Aurora: northern lights gather above the people on the plaza (depth cam). */
WW.register(W=>{
const {g,LIME,PPM,SW,SH,SX0,SX1,PY_BOT,clamp,wx,wy,tracked}=W;
function vgrad(stops){const c=document.createElement('canvas');c.width=1;c.height=256;const x=c.getContext('2d');const gr=x.createLinearGradient(0,0,0,256);stops.forEach(([o,col])=>gr.addColorStop(o,col));x.fillStyle=gr;x.fillRect(0,0,1,256);return c;}
const AUR1=vgrad([[0,'rgba(169,139,255,0)'],[0.45,'rgba(53,224,255,.45)'],[0.9,'rgba(202,254,3,.95)'],[1,'rgba(202,254,3,0)']]);
const AUR2=vgrad([[0,'rgba(255,79,184,0)'],[0.6,'rgba(255,79,184,.6)'],[1,'rgba(255,79,184,0)']]);
return {
  id:'aurora',cat:'visual',by:'Lukas',name:'Plaza Aurora',short:'Aurora',crowd:true,
  pitch:{
    tagline:'Northern lights that follow the people on the plaza.',
    players:['crowd','∞'],mode:'ambient',round:'Always on',
    input:[['cam','Your movement']],
    for:['all'],
    how:['Aurora curtains ripple across all 12 panes.','Walk past and the light gathers above you.','More people, brighter sky.'],
    trick:'One continuous sky behind the frames makes the panes read as real windows looking out, not twelve screens.',
    needs:[['projector','Projector'],['cam','Depth cam ×2'],['speaker','Ambient sound']],
    open:['Default look when the plaza is empty?','Add a soft sound layer?'],
    meters:{read:5,crowd:3,effort:1}
  },
  init(){this.stars=[...Array(140)].map(()=>[Math.random()*SW,Math.random()*SH*0.85,Math.random()*6]);},
  update(){},
  draw(T){
    const gr=g.createLinearGradient(0,0,0,SH);gr.addColorStop(0,'#03061a');gr.addColorStop(1,'#0a1a2a');g.fillStyle=gr;g.fillRect(0,0,SW,SH);
    for(const [x,y,p] of this.stars){g.fillStyle=`rgba(232,255,186,${0.3+0.3*Math.sin(T*2+p)})`;g.fillRect(x,y,2,2);}
    const ppl=tracked();
    for(let X=0;X<SW;X+=4){const x=SX0+X/PPM;
      let I=0.32+0.22*Math.sin(x*1.3+T*0.4)+0.18*Math.sin(x*3.1-T*0.7)+0.12*Math.sin(x*0.6+T*0.23),dip=0;
      for(const p of ppl){const d=x-p.x,w=Math.exp(-d*d/0.3);I+=w*(0.8+Math.min(1,Math.abs(p.vx))*0.8);dip+=w*0.35;}
      I=clamp(I,0,1.6);const yb=PY_BOT+0.8+0.3*Math.sin(x*1.7+T*0.5)+0.18*Math.sin(x*4+T)-dip,h=1.3+0.45*Math.sin(x*0.9-T*0.3)+I*0.5;
      g.globalAlpha=clamp(I*0.8,0,1);g.drawImage(AUR1,0,0,1,256,X,wy(yb+h),4,h*PPM);
      g.globalAlpha=clamp(I*0.4,0,1);g.drawImage(AUR2,0,0,1,256,X,wy(yb+h+0.5),4,h*0.55*PPM);}
    g.globalAlpha=1;g.fillStyle='#02040a';
    for(let x=SX0-0.2,k=0;x<SX1+0.3;x+=0.16,k++){const h=0.22+((k*37)%11)/30;g.beginPath();g.moveTo(wx(x-0.1),wy(PY_BOT-0.05));g.lineTo(wx(x),wy(PY_BOT+h));g.lineTo(wx(x+0.1),wy(PY_BOT-0.05));g.fill();}
  },
  hud(){return `${tracked().length} people on the plaza are steering the sky`;},
  cast(){return LIME;},fig(){return {};}
};
});
