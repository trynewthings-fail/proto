/* VISUAL · Shadow Giants: your silhouette on lit blinds, giant-sized, with antlers (depth cam). */
WW.register(W=>{
const {g,LIME,cellBg,clearScreen,clamp,PPM,people,tracked,silhouette}=W;
return {
  id:'shadows',cat:'visual',by:'Lukas',name:{sv:'Skuggjättar',en:'Shadow Giants'},short:{sv:'Skuggjättar',en:'Shadow Giants'},steam:'S',crowd:true,
  fraga:{sv:'Varför växer din skugga ju närmare ljuset du står?',en:'Why does your shadow grow the closer you stand to the light?'},
  verb:{sv:'gå, stå still, vinka',en:'walk, freeze, wave'},
  pitch:{
    tagline:{sv:'Din skugga på de upplysta persiennerna, tre gånger så stor, med älghorn.',en:'Your shadow on the lit blinds, three times your size, with antlers.'},
    players:['group','1–8'],mode:'ambient',round:{sv:'Kom när du vill',en:'Drop in'},
    input:[['cam',{sv:'Din siluett',en:'Your silhouette'}]],
    for:['kid','family'],
    how:[{sv:'Gå framför fönstren.',en:'Walk in front of the windows.'},{sv:'Din siluett dyker upp bakom persiennerna, jättestor.',en:'Your silhouette appears behind the blinds, giant-sized.'},{sv:'Barn blir älgar, troll och harar. Stå still så vinkar jätten.',en:'Kids become moose, trolls and hares. Stand still and the giant waves.'}],
    trick:{sv:'Det ser ut som tända rum med jättar bakom persiennerna, så huset ser levande ut även för den som kör förbi.',en:'It looks like lit rooms with giants behind the blinds, so the building looks alive even to people driving past.'},
    needs:[['projector',{sv:'Projektor',en:'Projector'}],['cam',{sv:'Djupkamera ×2',en:'Depth cam ×2'}]],
    open:[{sv:'Integritet: bara siluetter, inget sparas.',en:'Privacy: silhouettes only, nothing stored.'},{sv:'Blir det rörigt med mycket folk?',en:'Gets messy with a big crowd?'}],
    meters:{read:5,crowd:5,effort:2}
  },
  init(){},update(){},
  draw(T){
    clearScreen();
    for(let c=0;c<6;c++)for(let r=0;r<2;r++){const p=cellBg(c,r,'#fbecc2','#e7cf93');g.fillStyle='rgba(120,85,30,.18)';for(let y=p.y+10;y<p.y+p.h;y+=0.07*PPM)g.fillRect(p.x,y,p.w,3);}
    const list=tracked().sort((a,b)=>b.z-a.z);
    for(const p of list){const k=people.indexOf(p),h=clamp(3.4-(p.z-2.6)*0.33,1.5,3.4),still=Math.abs(p.vx)<0.08;silhouette(p.x,h,k%4,T,still&&(k%3!==1),p.walk,'rgba(26,18,8,.9)',LIME);}
  },
  hud(){return `${tracked().length} giants behind the blinds`;},
  cast(){return LIME;},fig(){return {};}
};
});
