/* PUZZLES · Shape Match: a body-sized pose outline per window unit; hold the pose to lock it (depth cam). */
WW.register(W=>{
const {g,LIME,PINK,PPM,PY_BOT,unitCX,cellPx,cellBg,clearScreen,text,hexA,rr,clamp,wx,wy}=W;
const POSES=[{n:'T-pose',la:1.57,ra:1.57,ll:0.12,rl:0.12},{n:'Star',la:2.35,ra:2.35,ll:0.5,rl:0.5},{n:'Y',la:2.75,ra:2.75,ll:0.06,rl:0.06},{n:'Wave',la:2.9,ra:0.25,ll:0.1,rl:0.1},{n:'Runner',la:2.2,ra:0.7,ll:0.55,rl:-0.2},{n:'Flamingo',la:1.3,ra:1.3,ll:0.05,rl:1.45}];
const NEUTRAL={la:0.2,ra:0.2,ll:0.1,rl:0.1};
function poseLines(cx,P){
  const hipY=PY_BOT+1.2,L=1.12,shY=hipY+0.85,A=0.82,ls=[cx-0.17,shY],rs=[cx+0.17,shY];
  return {hip:[cx,hipY],ls,rs,neck:[cx,shY],head:[cx,shY+0.32],
    lf:[cx-0.08-Math.sin(P.ll)*L,hipY-Math.cos(P.ll)*L],rf:[cx+0.08+Math.sin(P.rl)*L,hipY-Math.cos(P.rl)*L],
    lh:[ls[0]-Math.sin(P.la)*A,shY-Math.cos(P.la)*A],rh:[rs[0]+Math.sin(P.ra)*A,shY-Math.cos(P.ra)*A]};
}
function drawPose(cx,P,Wd,col){
  const q=poseLines(cx,P),X=v=>wx(v[0]),Y=v=>wy(v[1]);
  g.strokeStyle=col;g.fillStyle=col;g.lineCap='round';g.lineJoin='round';g.lineWidth=Wd;g.beginPath();
  g.moveTo(X(q.hip)-Wd*0.25,Y(q.hip));g.lineTo(X(q.lf),Y(q.lf));g.moveTo(X(q.hip)+Wd*0.25,Y(q.hip));g.lineTo(X(q.rf),Y(q.rf));
  g.moveTo(X(q.hip),Y(q.hip));g.lineTo(X(q.neck),Y(q.neck));g.moveTo(X(q.ls),Y(q.ls));g.lineTo(X(q.lh),Y(q.lh));g.moveTo(X(q.rs),Y(q.rs));g.lineTo(X(q.rh),Y(q.rh));
  g.moveTo(X(q.ls),Y(q.ls));g.lineTo(X(q.rs),Y(q.rs));g.stroke();
  g.beginPath();g.arc(X(q.head),Y(q.head),Math.max(4,0.2*PPM+Wd*0.1),0,7);g.fill();
}
return {
  id:'shape',cat:'puzzle',by:'Lukas',name:'Shape Match',short:'Shape Match',
  pitch:{
    tagline:'A body-sized outline fills each window unit. Strike the pose.',
    players:['group','1–3 per unit'],mode:'coop',round:'60 s',
    input:[['cam','Body pose']],
    for:['kid','group','school'],
    how:['An outline appears across a whole 3-pane unit.','Your silhouette shows up live in the panes.','Hold the pose until it locks. Both units together score double.'],
    trick:'Each window unit is body-sized. The mullions slice your silhouette and the outline the same way, so it still reads as one shape.',
    needs:[['projector','Projector'],['cam','Depth cam ×2'],['speaker','Speaker']],
    open:['Scale poses for kids and adults?','What if five people crowd one frame?'],
    meters:{read:4,crowd:4,effort:2}
  },
  init(){this.t=0;this.u=[0,1].map(k=>({cur:{...NEUTRAL},tgt:(Math.random()*POSES.length|0),hold:0,score:0,flash:0,rest:0,match:0,k}));},
  update(dt){
    this.t+=dt;
    for(const u of this.u){
      u.flash=Math.max(0,u.flash-dt);
      const P=POSES[u.tgt],goal=u.rest>0?NEUTRAL:P;if(u.rest>0)u.rest-=dt;
      ['la','ra','ll','rl'].forEach((j,n)=>{const wob=Math.sin(this.t*(0.7+u.k*0.2)+n*1.7+u.k)*0.3*(1-Math.min(1,u.hold));u.cur[j]+=(goal[j]+wob-u.cur[j])*Math.min(1,dt*1.3);});
      const diff=['la','ra','ll','rl'].reduce((a,j)=>a+Math.abs(u.cur[j]-P[j]),0)/4;u.match=clamp(1-diff/0.9,0,1);
      if(u.rest<=0&&u.match>0.88){u.hold+=dt;if(u.hold>1){u.score++;u.flash=1;u.hold=0;u.rest=1.4;let n;do{n=Math.random()*POSES.length|0;}while(n===u.tgt);u.tgt=n;}}else u.hold=Math.max(0,u.hold-dt*0.5);
    }
  },
  draw(){
    clearScreen();
    for(let c=0;c<6;c++)for(let r=0;r<2;r++)cellBg(c,r,'#0b0e14','#06080b');
    this.u.forEach((u,k)=>{const cx=unitCX(k),col=k?PINK:LIME,P=POSES[u.tgt];
      drawPose(cx,P,0.22*PPM,hexA(col,0.9));drawPose(cx,P,0.22*PPM-12,'#06080b');
      drawPose(cx,u.cur,0.16*PPM,u.flash>0?'#fff':hexA(col,0.45+u.match*0.4));
      const mid=cellPx(k*3+1,0);text(P.n.toUpperCase(),mid.x+mid.w/2,mid.y+0.07*PPM,0.07*PPM,col);
      const b=cellPx(k*3+1,1),bw=b.w*0.8,bx=b.x+b.w*0.1,by=b.y+b.h-0.06*PPM;rr(bx,by,bw,0.03*PPM,6);g.fillStyle='rgba(255,255,255,.15)';g.fill();rr(bx,by,Math.max(1,bw*u.match),0.03*PPM,6);g.fillStyle=col;g.fill();
      if(u.flash>0){g.globalAlpha=u.flash;for(let i=0;i<3;i++){const p=cellPx(k*3+i,0);g.fillStyle=hexA(col,0.3);g.fillRect(p.x,p.y,p.w,p.h);}text('MATCH!',mid.x+mid.w/2,mid.y+mid.h*0.3,0.1*PPM,'#fff');g.globalAlpha=1;}
    });
  },
  hud(){return `Lime unit ${this.u[0].score} · Pink unit ${this.u[1].score} · hold the pose to lock it`;},
  cast(i){return i===1?LIME:i===4?PINK:null;},
  fig(i){if(i!==1&&i!==4)return{};const u=this.u[i===1?0:1];return {jump:u.flash>0?0.25:0};}
};
});
