/* CRAFTY · Window Residents: kids' drawn characters live in 12 pane-sized rooms and wave at people outside. */
WW.register(W=>{
const {g,LIME,PC,PW,PPM,colX,cellPx,clearScreen,text,hexA,rr,smiley,people}=W;
return {
  id:'residents',cat:'crafty',by:'Lukas',name:'Window Residents',short:'Residents',crowd:true,
  pitch:{
    tagline:'Draw a character. It moves into one of twelve tiny apartments.',
    players:['crowd','∞'],mode:'ambient',round:'All season',
    input:[['pencil','Draw a resident'],['cam','They wave back']],
    for:['kid','family','school'],
    how:['Draw a resident at the lobby station.','It moves into a pane-sized room with a NEW tag.','Residents wave at people outside and visit the neighbours.'],
    trick:'Twelve panes, twelve rooms. Residents walk behind the mullions to visit each other, and the lights go on and off like a real building.',
    needs:[['projector','Projector'],['scan','Scanner station'],['cam','Depth cam']],
    open:['How long does a resident stay?','Name tags, or anonymous?'],
    meters:{read:4,crowd:4,effort:3}
  },
  init(){this.rooms=[...Array(12)].map((_,k)=>({hue:(k*47+20)%360,lamp:true,lampT:5+Math.random()*12,pat:k%3}));this.res=[...Array(12)].map((_,k)=>this.mk(k,false));this.moveT=4;this.moved=0;},
  mk(k,isNew){return {room:k,x:0.25+Math.random()*0.5,tx:0.5,col:PC[Math.random()*6|0],type:Math.random()*3|0,t:Math.random()*2,wave:0,tag:isNew?5:0,dir:1,walk:0,visit:null};},
  update(dt){
    for(const room of this.rooms){room.lampT-=dt;if(room.lampT<=0){room.lamp=!room.lamp;room.lampT=room.lamp?10+Math.random()*14:3+Math.random()*4;}}
    for(const r of this.res){
      r.tag=Math.max(0,r.tag-dt);const room=this.rooms[r.room],c=r.room%6,row=r.room/6|0;
      if(!room.lamp)continue;
      const near=people.some(p=>Math.abs(p.x-colX(c))<0.4&&p.z<5.2);
      r.wave=near?Math.min(1,r.wave+dt*3):Math.max(0,r.wave-dt*2);if(r.wave>0.5)continue;
      const d=r.tx-r.x;
      if(Math.abs(d)<0.02){r.t-=dt;if(r.t<=0){r.t=1+Math.random()*2.5;
        if(Math.random()<0.3){const nc=c+(Math.random()<.5?-1:1);if(nc>=0&&nc<6&&((nc<3)===(c<3))){r.visit=nc;r.tx=nc>c?1.25:-0.25;}else r.tx=0.15+Math.random()*0.7;}
        else r.tx=0.15+Math.random()*0.7;}}
      else{r.dir=Math.sign(d);r.x+=r.dir*Math.min(Math.abs(d),dt*0.35/PW);r.walk+=dt*10;}
      if((r.x>1.15||r.x<-0.15)&&r.visit!=null){r.room=row*6+r.visit;r.x=r.x>1?-0.2:1.2;r.tx=0.3+Math.random()*0.4;r.visit=null;}
    }
    this.moveT-=dt;if(this.moveT<=0){this.moveT=9;const i=Math.random()*this.res.length|0;this.res[i]=this.mk(this.res[i].room,true);this.moved++;}
  },
  draw(T){
    clearScreen();
    for(let k=0;k<12;k++){const c=k%6,row=k/6|0,p=cellPx(c,row),room=this.rooms[k],on=room.lamp,fh=0.13*PPM;
      g.fillStyle=`hsl(${room.hue},30%,${on?28:10}%)`;g.fillRect(p.x,p.y,p.w,p.h);
      g.fillStyle=`hsla(${room.hue},40%,70%,${on?0.08:0.03})`;
      if(room.pat===0)for(let x=p.x+8;x<p.x+p.w;x+=22)g.fillRect(x,p.y,6,p.h-fh);
      else if(room.pat===1)for(let y=p.y+14;y<p.y+p.h-fh;y+=26)for(let x=p.x+12+((y/26|0)%2)*12;x<p.x+p.w;x+=24){g.beginPath();g.arc(x,y,3.5,0,7);g.fill();}
      else for(let y=p.y+20;y<p.y+p.h-fh;y+=34)g.fillRect(p.x,y,p.w,3);
      if(on){const lg=g.createRadialGradient(p.x+p.w/2,p.y+0.24*PPM,4,p.x+p.w/2,p.y+0.24*PPM,p.h*0.7);lg.addColorStop(0,'rgba(255,226,150,.38)');lg.addColorStop(1,'rgba(255,226,150,0)');g.fillStyle=lg;g.fillRect(p.x,p.y,p.w,p.h);}
      g.fillStyle=on?'#5a3a24':'#21150d';g.fillRect(p.x,p.y+p.h-fh,p.w,fh);g.fillStyle='rgba(0,0,0,.3)';g.fillRect(p.x,p.y+p.h-fh,p.w,4);
      g.strokeStyle='#222';g.lineWidth=2;g.beginPath();g.moveTo(p.x+p.w/2,p.y);g.lineTo(p.x+p.w/2,p.y+0.16*PPM);g.stroke();
      g.fillStyle=on?'#ffe9a8':'#3a352a';g.beginPath();g.moveTo(p.x+p.w/2-14,p.y+0.16*PPM);g.lineTo(p.x+p.w/2+14,p.y+0.16*PPM);g.lineTo(p.x+p.w/2+26,p.y+0.24*PPM);g.lineTo(p.x+p.w/2-26,p.y+0.24*PPM);g.fill();
      const fx=p.x+p.w*0.14,fy=p.y+p.h*(row?0.3:0.38);g.fillStyle='#111';g.fillRect(fx,fy,0.2*PPM,0.15*PPM);g.strokeStyle=LIME;g.lineWidth=3;g.strokeRect(fx,fy,0.2*PPM,0.15*PPM);
      smiley(g,fx+0.1*PPM,fy+0.075*PPM,0.05*PPM,true,hexA(PC[k%6],on?1:.4),0);
      const px2=p.x+p.w*0.82,py2=p.y+p.h-fh;g.fillStyle='#8a4a2a';g.fillRect(px2-10,py2-24,20,24);g.fillStyle=on?'#3c8a3a':'#1a3a18';for(let i=0;i<5;i++){g.beginPath();g.ellipse(px2+(i-2)*6,py2-36+Math.abs(i-2)*4,5,14,(i-2)*0.4,0,7);g.fill();}
    }
    for(const r of this.res){const c=r.room%6,row=r.room/6|0,p=cellPx(c,row),room=this.rooms[r.room],asleep=!room.lamp;
      const X=p.x+r.x*p.w,foot=p.y+p.h-0.1*PPM,w=0.18*PPM,h=(r.type===1?0.34:0.27)*PPM,bob=asleep?0:Math.abs(Math.sin(r.walk))*4;
      g.strokeStyle=r.col;g.lineWidth=5;g.lineCap='round';g.beginPath();g.moveTo(X-w*0.2,foot-6);g.lineTo(X-w*0.2-Math.sin(r.walk)*4,foot+6);g.moveTo(X+w*0.2,foot-6);g.lineTo(X+w*0.2+Math.sin(r.walk)*4,foot+6);g.stroke();
      g.fillStyle=asleep?hexA(r.col,0.5):r.col;const by=foot-h-bob;
      if(r.type===2){g.beginPath();g.arc(X,by+h*0.55,w*0.55,0,7);g.fill();g.strokeStyle=r.col;g.lineWidth=3;g.beginPath();g.moveTo(X,by+h*0.1);g.lineTo(X+6,by-10);g.stroke();g.beginPath();g.arc(X+6,by-12,5,0,7);g.fill();}
      else{rr(X-w/2,by,w,h,w*0.45);g.fill();}
      if(r.type===0){g.beginPath();g.moveTo(X-w*0.4,by+6);g.lineTo(X-w*0.3,by-12);g.lineTo(X-w*0.1,by+4);g.moveTo(X+w*0.4,by+6);g.lineTo(X+w*0.3,by-12);g.lineTo(X+w*0.1,by+4);g.fill();}
      const ey=by+h*0.32,look=r.wave>0.5?0:r.dir*3;
      if(asleep){g.strokeStyle='#000';g.lineWidth=3;g.beginPath();g.moveTo(X-12,ey);g.lineTo(X-4,ey);g.moveTo(X+4,ey);g.lineTo(X+12,ey);g.stroke();}
      else{g.fillStyle='#fff';g.beginPath();g.arc(X-8,ey,6.5,0,7);g.arc(X+8,ey,6.5,0,7);g.fill();g.fillStyle='#000';g.beginPath();g.arc(X-8+look,ey,3.2,0,7);g.arc(X+8+look,ey,3.2,0,7);g.fill();}
      if(r.wave>0.05&&!asleep){const a=-1.2+Math.sin(T*10)*0.5*r.wave;g.strokeStyle=r.col;g.lineWidth=6;g.beginPath();g.moveTo(X+w*0.45,by+h*0.55);g.lineTo(X+w*0.45+Math.cos(a)*24,by+h*0.55+Math.sin(a)*24*r.wave);g.stroke();}
      if(r.tag>0){g.globalAlpha=Math.min(1,r.tag);const tw=0.26*PPM,th=0.1*PPM;g.fillStyle=LIME;rr(X-tw/2,by-th-16,tw,th,th/2);g.fill();text('NEW',X,by-th/2-16,th*0.7,'#000');g.globalAlpha=1;}
    }
    for(let k=0;k<12;k++){if(this.rooms[k].lamp)continue;const p=cellPx(k%6,k/6|0);g.fillStyle='rgba(0,0,12,.45)';g.fillRect(p.x,p.y,p.w,p.h);
      g.globalAlpha=0.7;text('z',p.x+p.w*0.6,p.y+p.h*0.5-(T*20%40),18,'#fff',700);text('Z',p.x+p.w*0.7,p.y+p.h*0.38-(T*20%40),26,'#fff',700);g.globalAlpha=1;}
  },
  hud(){const waving=this.res.filter(r=>r.wave>0.5).length;return `${this.moved} residents moved in tonight · ${waving?waving+' waving at people outside':'walk past to get a wave'}`;},
  cast(){return LIME;},fig(){return {};}
};
});
