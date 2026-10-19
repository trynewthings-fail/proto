/* CATEGORY · Idea Name: one line on what it is. (by Requester)
   Copy this file to ideas/<id>.js, fill it in, and add the id to ideas/index.js.
   Files starting with _ are never loaded. */
WW.register(W=>{
// Take only what you use from WW. The full list is in CLAUDE.md.
const {g,PC,LIME,PPM,cellPx,cellBg,clearScreen,text,hexA,colX,paneY,paneH,wx,wy,tracked}=W;

return {
  id:'my-idea',            // lowercase-with-dashes, same as the file name
  cat:'arcade',            // arcade | puzzle | crafty | visual
  by:'Name',               // first name of the person who asked for it (from Slack)
  name:'My Idea',          // shown as "Name’s My Idea"
  short:'My Idea',         // 1–2 words for the menu pill
  // crowd:true,           // uncomment for depth-cam ideas: people wander the plaza, read them with tracked()
  pitch:{
    tagline:'One short sentence that sells it.',
    players:['group','2–6'],          // [person|group|crowd, label]
    mode:'coop',                      // versus | coop | teams | ambient
    round:'2 min',                    // or 'Drop in' / 'Always on' / 'All evening'
    input:[['cam','Depth cam: wave'],['phone','Phone']],   // first = main option
    for:['kid','family'],             // kid teen family group school all
    how:['Step one.','Step two.','Step three.'],
    trick:'How it uses the panes, mullions, transom or pier.',
    needs:[['projector','Projector'],['cam','Depth cam']],
    open:['One open question?'],
    meters:{read:4,crowd:4,effort:2}  // 1–5: readable from 20 m, crowd pull, build effort
  },
  init(){this.t=0;},
  update(dt){this.t+=dt;},
  draw(T){
    clearScreen();
    for(let c=0;c<6;c++)for(let r=0;r<2;r++){
      const p=cellBg(c,r,hexA(PC[c],0.25),'#050505');      // p = {x,y,w,h} in canvas px
      text(String(c+1+r*6),p.x+p.w/2,p.y+p.h/2,p.w*0.5,hexA(LIME,0.5+0.5*Math.sin(T*2+c)));
    }
  },
  hud(){return 'One status line, e.g. score or time left';},
  cast(i){return i<6?PC[i]:null;},   // head colour of plaza person i (0–5 stand at the six columns)
  fig(i,T){return {};}               // optional {jump, slump} per person
};
});
