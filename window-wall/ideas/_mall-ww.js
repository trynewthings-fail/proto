/* KATEGORI · Idéns namn: en rad om vad den är. (av Förnamn)
   Mall för WW-formatet (ritar i pixlar på en egen duk, motor/ww.js). Kopiera till ideas/<id>.js och lägg id:t i ideas/index.js.
   Filer som börjar med _ laddas aldrig. För nya idéer rekommenderas _mall-nattfonster.js. */
WW.register(W=>{
// Ta bara det du använder ur WW. Hela listan finns i CLAUDE.md.
const {g,PC,LIME,PPM,cellPx,cellBg,clearScreen,text,hexA,colX,paneY,paneH,wx,wy,tracked}=W;

return {
  id:'min-ide',            // små bokstäver och bindestreck, samma som filnamnet
  cat:'arcade',            // arcade | puzzle | crafty | visual
  by:'Förnamn',            // den som bad om idén
  steam:'M',               // S T E A M
  name:{sv:'Min idé',en:'My Idea'},
  short:{sv:'Min idé',en:'My Idea'},                         // 1–2 ord för menyknappen
  fraga:{sv:'En nyfiken fråga?',en:'A curious question?'},
  verb:{sv:'ställa sig, hoppa',en:'stand, jump'},
  // crowd:true,           // för djupkameraidéer: folk vandrar på torget, läs dem med tracked()
  pitch:{
    tagline:{sv:'En mening som säljer idén.',en:'One sentence that sells it.'},
    players:['group','2–6'],          // [person|group|crowd, etikett]
    mode:'coop',                      // versus | coop | teams | ambient
    round:{sv:'2 min',en:'2 min'},    // eller Kom när du vill / Drop in
    input:[['cam',{sv:'Djupkamera: vinka',en:'Depth cam: wave'}],['phone',{sv:'Mobil',en:'Phone'}]],
    for:['kid','family'],             // kid teen family group school all
    how:[{sv:'Steg ett.',en:'Step one.'},{sv:'Steg två.',en:'Step two.'},{sv:'Steg tre.',en:'Step three.'}],
    trick:{sv:'Hur idén använder rutorna, spröjsen, tvärposten eller muren.',en:'How it uses the panes, mullions, transom or pier.'},
    needs:[['projector',{sv:'Projektor',en:'Projector'}],['cam',{sv:'Djupkamera',en:'Depth cam'}]],
    open:[{sv:'En öppen fråga?',en:'One open question?'}],
    meters:{read:4,crowd:4,effort:2}  // 1–5: läsbar på 20 m, lockar publik, insats att bygga
  },
  init(){this.t=0;},
  update(dt){this.t+=dt;},
  draw(T){
    clearScreen();
    for(let c=0;c<6;c++)for(let r=0;r<2;r++){
      const p=cellBg(c,r,hexA(PC[c],0.25),'#050505');      // p = {x,y,w,h} i pixlar på duken
      text(String(c+1+r*6),p.x+p.w/2,p.y+p.h/2,p.w*0.5,hexA(LIME,0.5+0.5*Math.sin(T*2+c)));
    }
  },
  hud(){return 'En statusrad, t.ex. poäng eller tid kvar';},
  cast(i){return i<6?PC[i]:null;},   // huvudfärg för person i på torget (0–5 står vid de sex kolumnerna)
  fig(i,T){return {};}               // frivilligt {jump, slump} per person
};
});
