/* CRAFTY · Pixel Mosaic: everyone places one pixel from their phone; a picture appears across the wall. */
WW.register(W=>{
const {g,LIME,PINK,PPM,FONT,SW,SH,PY_BOT,PY_TOP,COLS,ROWS,bcell,unitCX,cellBg,clearScreen,smiley,shuffle,wx,wy}=W;
const tc=document.createElement('canvas');tc.width=SW;tc.height=SH;const tx=tc.getContext('2d');
return {
  id:'mosaic',cat:'crafty',by:'Lukas',name:{sv:'Pixelmosaik',en:'Pixel Mosaic'},short:{sv:'Pixelmosaik',en:'Pixel Mosaic'},steam:'M',crowd:true,
  fraga:{sv:'Hur många pixlar behövs innan man ser en bild?',en:'How many pixels does it take before you see a picture?'},
  verb:{sv:'välja, placera, bygga ihop',en:'pick, place, assemble'},
  pitch:{
    tagline:{sv:'Alla lägger en pixel. Tillsammans målar ni hela väggen.',en:'Everyone places one pixel. Together you paint the whole wall.'},
    players:['crowd','∞'],mode:'coop',round:{sv:'10–20 min',en:'10–20 min'},
    input:[['phone',{sv:'Lägg en pixel',en:'Place a pixel'}],['kiosk',{sv:'Pekskärm',en:'Touch kiosk'}]],
    for:['all','school'],
    how:[{sv:'Skanna QR-koden och få en färg och en plats.',en:'Scan the QR code to get a colour and a spot.'},{sv:'Tryck för att lägga din pixel.',en:'Tap to place your pixel.'},{sv:'En bild växer fram över alla 12 rutor.',en:'A picture slowly appears across all 12 panes.'}],
    trick:{sv:'Bilden löper bakom ramarna, så spröjsen och muren blir en del av rutnätet i stället för att bryta det.',en:'The image runs behind the frames, so the mullions and pier become part of the grid instead of breaking it.'},
    needs:[['projector',{sv:'Projektor',en:'Projector'}],['wifi',{sv:'Webbserver',en:'Web server'}]],
    open:[{sv:'Fritt ritande eller måla efter nummer?',en:'Free drawing or paint-by-numbers?'},{sv:'Får barn designa nästa bild?',en:'Kids design the next picture?'}],
    meters:{read:4,crowd:4,effort:1}
  },
  init(){this.img=-1;this.time=0;this.next();},
  fontsReady(){this.img--;this.next();},
  next(){
    this.img=(this.img+1)%3;const k=this.img;
    if(k===0){tx.fillStyle='#16224a';tx.fillRect(0,0,SW,SH);smiley(tx,wx(unitCX(0)),wy((PY_BOT+PY_TOP)/2),1.3*PPM,true,LIME,0);smiley(tx,wx(unitCX(1)),wy((PY_BOT+PY_TOP)/2),1.3*PPM,false,PINK,0);}
    else if(k===1){tx.fillStyle=PINK;tx.fillRect(0,0,SW,SH);tx.fillStyle='#fff';tx.font=`800 ${2.6*PPM}px ${FONT}`;tx.textAlign='center';tx.textBaseline='middle';tx.fillText('HEJ!',SW/2,SH*0.56);}
    else{const gr=tx.createLinearGradient(0,0,0,SH);gr.addColorStop(0,'#0a1440');gr.addColorStop(1,'#3a1d5c');tx.fillStyle=gr;tx.fillRect(0,0,SW,SH);
      tx.strokeStyle=LIME;tx.lineWidth=0.3*PPM;tx.beginPath();for(let x=0;x<=SW;x+=10)tx.lineTo(x,SH*0.3+Math.sin(x/90)*SH*0.08);tx.stroke();
      tx.fillStyle='#fff7d0';tx.beginPath();tx.arc(SW*0.82,SH*0.22,0.3*PPM,0,7);tx.fill();
      tx.fillStyle='#061008';for(let x=-20,k2=0;x<SW+40;x+=0.45*PPM,k2++){const h=(0.9+(k2*7%5)/6)*PPM;tx.beginPath();tx.moveTo(x,SH);tx.lineTo(x+0.25*PPM,SH-h);tx.lineTo(x+0.5*PPM,SH);tx.fill();}}
    const data=tx.getImageData(0,0,SW,SH).data;
    this.cells=[];for(let c=0;c<6;c++)for(let y=0;y<ROWS;y++)for(let x=0;x<COLS;x++){const [X,Y,Wd,H]=bcell(c,x,y);const px=Math.round(X+Wd/2),py=Math.round(Y+H/2),i=(py*SW+px)*4;this.cells.push({c,x,y,col:`rgb(${data[i]},${data[i+1]},${data[i+2]})`,t:-1});}
    this.order=shuffle(this.cells.map((_,i)=>i));this.n=0;this.acc=0;this.hold=0;this.phones=0;
  },
  update(dt){this.time+=dt;
    if(this.n<this.cells.length){this.acc+=dt*30;while(this.acc>=1&&this.n<this.cells.length){this.acc--;this.cells[this.order[this.n++]].t=this.time;}if(Math.random()<dt*1.2)this.phones++;}
    else{this.hold+=dt;if(this.hold>6)this.next();}},
  draw(){
    clearScreen('#05060a');
    for(let c=0;c<6;c++)for(let r=0;r<2;r++)cellBg(c,r,'#0b0d12','#07080b');
    for(const cl of this.cells){const [X,Y,Wd,H]=bcell(cl.c,cl.x,cl.y);
      if(cl.t<0){g.fillStyle='rgba(255,255,255,.07)';g.fillRect(X+Wd/2-1.5,Y+H/2-1.5,3,3);continue;}
      const age=this.time-cl.t,s=age<0.25?Math.sin(age/0.25*Math.PI/2)*1.25:1;g.fillStyle=cl.col;g.fillRect(X+Wd/2-(Wd-2)*s/2,Y+H/2-(H-2)*s/2,(Wd-2)*s,(H-2)*s);}
    for(let i=Math.max(0,this.n-4);i<this.n;i++){const cl=this.cells[this.order[i]];const [X,Y,Wd,H]=bcell(cl.c,cl.x,cl.y);g.strokeStyle='#fff';g.lineWidth=3;g.strokeRect(X-2,Y-2,Wd+4,H+4);}
    if(this.hold>0){for(let i=0;i<12;i++){const cl=this.cells[(Math.random()*this.cells.length)|0];const [X,Y,Wd,H]=bcell(cl.c,cl.x,cl.y);g.fillStyle='rgba(255,255,255,.7)';g.fillRect(X,Y,Wd,H);}
      if(this.hold>4.5){g.fillStyle=`rgba(5,6,10,${Math.min(1,(this.hold-4.5)/1.5)})`;g.fillRect(0,0,SW,SH);}}
  },
  hud(){return this.n<this.cells.length?`${this.n} of ${this.cells.length} pixels placed · ${this.phones} phones joined`:'Picture complete! Next canvas soon';},
  cast(){return LIME;},fig(){return {};}
};
});
