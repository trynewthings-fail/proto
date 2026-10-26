/* ================= 3 · TOPOGRAFI: Skellefteå as a layered terrain toy =================
   Left unit: an isometric block (three.js, offscreen) with three floating layers GEO · ISO · DAT, split by the transom.
   Right unit top: one continuous map, each pane a different filter (contours, relief, data dots).
   Right unit bottom: the ground cut open along the scan line, with the soil layers and a drill where you stand.
   ALTITUDE raises the sea to where it was after the ice age: the coast here has risen ~240 m in 10 000 years.
   The terrain is a simplified model of the Skellefteå area (32 × 32 km), not survey data. */
(()=>{
const N=160,KM=32,HK=240;                         // grid, map size in km, highest shoreline (m)
const s={sun:315,layer:.85,tilt:34,spin:38,geores:2,scan:.45,alt:0,hz:.25,pal:0,boot:0,autoSpin:true,drillX:.5,drillT:0,filters:[0,1,2],ortho:0,lastAlt:-1,dirty:true};
const PALS=[
  {name:'EMBER',bg:'#0b0907',line:'#ff7a1a',line2:'#ffb35c',acc:'#ffd29a',water:'#14313d',ramp:[[0,'#1a120c'],[.25,'#3d2414'],[.5,'#7a3d14'],[.75,'#c8641e'],[1,'#ffd29a']],txt:'#ffe3c4'},
  {name:'VIOLET',bg:'#140b26',line:'#c9b8ff',line2:'#ff8ad8',acc:'#ffd0f2',water:'#1d1f5a',ramp:[[0,'#1d1238'],[.3,'#3b2370'],[.6,'#6f43b5'],[.85,'#b48cff'],[1,'#f2e6ff']],txt:'#efe6ff'},
  {name:'TNT',bg:'#050605',line:'#CAFE03',line2:'#2fd6e0',acc:'#eaff9a',water:'#0b2b30',ramp:[[0,'#0c140a'],[.3,'#1f3812'],[.6,'#4a7a12'],[.85,'#a8d806'],[1,'#f0ffb0']],txt:'#f4ffd8'}];
const pal=()=>PALS[s.pal];
const CI=[5,10,20,25,50],interval=()=>CI[s.geores];

/* ---------- terrain model ---------- */
const H=new Float32Array(N*N),SED=new Float32Array(N*N);
const toKm=i=>(i/(N-1)-.5)*KM;                    // grid index → km (x east, y north; row 0 = north)
const RIVERS=[
  {name:{sv:'Skellefteälven',en:'Skellefte River'},pts:[[-16.5,2.2],[-12,3.4],[-8,2.4],[-5,3],[-2.5,1],[0,0],[2.5,-.6],[4.5,-1.8],[7,-2.3],[9.5,-3.4],[11.6,-3.6]],w:.45,d:26},
  {name:{sv:'Kågeälven',en:'Kåge River'},pts:[[-16.5,11],[-11,12],[-6,10.4],[-2,10.2],[1,9],[4,9.4],[6.5,9]],w:.3,d:16}];
function segDist(px,py,P){let b=1e9;for(let i=1;i<P.length;i++){const[ax,ay]=P[i-1],[bx,by]=P[i],dx=bx-ax,dy=by-ay,t=clamp(((px-ax)*dx+(py-ay)*dy)/(dx*dx+dy*dy));b=Math.min(b,Math.hypot(px-ax-t*dx,py-ay-t*dy));}return b;}
const coastX=y=>12.2+2.2*Math.sin(y/4.6)+1.6*Math.sin(y/1.7+1)-4.2*Math.exp(-Math.pow((y-9.3)/2.2,2))-2.8*Math.exp(-Math.pow((y+3.6)/1.5,2))+2.6*Math.exp(-Math.pow((y+6)/2.4,2));
function genTerrain(){
  for(let j=0;j<N;j++)for(let i=0;i<N;i++){
    const x=toKm(i),y=-toKm(j),k=j*N+i;
    const cx=coastX(y)+(fbm(x*.25,y*.25,4)-.5)*3.2,inland=cx-x;
    let h=inland*7.2+(fbm(x*.11+3,y*.11-2,5)-.45)*90*smooth(-2,8,inland)+Math.pow(fbm(x*.33+9,y*.33,3),3)*120*smooth(2,14,inland);
    h+=65*Math.exp(-(Math.pow(x-.8,2)+Math.pow(y+1.9,2))/1.1);                // Vitberget, just south of the centre
    for(const r of RIVERS){const d=segDist(x,y,r.pts);h-=r.d*Math.exp(-Math.pow(d/(r.w*3.2),2))*smooth(-3,4,inland);if(d<r.w&&inland>0)h=Math.min(h,Math.max(.5,inland*1.4));}
    if(inland<0)h=Math.min(h,inland*4+(Math.pow(fbm(x*.6,y*.6,3),4)*90-6)); // the archipelago
    H[k]=h;SED[k]=h<HK?clamp((HK-h)/HK*16+8*Math.exp(-Math.pow(segDist(x,y,RIVERS[0].pts)/2,2)),0,24):0;
  }
}
genTerrain();
function hAt(xk,yk){const fi=clamp((xk/KM+.5)*(N-1),0,N-1.001),fj=clamp((-yk/KM+.5)*(N-1),0,N-1.001),i=Math.floor(fi),j=Math.floor(fj),u=fi-i,v=fj-j;
  const a=H[j*N+i],b=H[j*N+i+1],c=H[(j+1)*N+i],d=H[(j+1)*N+i+1];return lerp(lerp(a,b,u),lerp(c,d,u),v);}
let HMAX=0;for(const v of H)HMAX=Math.max(HMAX,v);
const PEAKS=(()=>{const out=[];const idx=[...H.keys()].sort((a,b)=>H[b]-H[a]);for(const k of idx){const i=k%N,j=Math.floor(k/N);if(i<6||j<6||i>N-7||j>N-7)continue;const x=toKm(i),y=-toKm(j);if(out.every(p=>Math.hypot(p.x-x,p.y-y)>9))out.push({x,y,h:H[k]});if(out.length>=3)break;}return out.map((p,n)=>({...p,id:'ABC'[n]}));})();
const PLACES=[{n:'SKELLEFTEÅ',x:0,y:0,big:1},{n:'URSVIKEN',x:11.2,y:-3.9},{n:'SKELLEFTEHAMN',x:14.4,y:-6.2},{n:'KÅGE',x:1.2,y:9.2}];
function yearsAgo(m){const T=[[0,0],[5,600],[10,1100],[20,2000],[40,3400],[60,4500],[80,5400],[100,6300],[130,7400],[160,8300],[200,9300],[240,10300]];
  for(let i=1;i<T.length;i++)if(m<=T[i][0])return lerp(T[i-1][1],T[i][1],(m-T[i-1][0])/(T[i][0]-T[i-1][0]));return 10300;}
const fmtN=n=>Math.round(n).toLocaleString(LANG==='sv'?'sv-SE':'en-GB');

/* ---------- 3D block (offscreen three.js) ---------- */
const U0=F.units[0],U1=F.units[1];
const B={x:U0.ix0,y:F.top,w:U0.ix1-U0.ix0,h:F.bot-F.top};
const VS=.00085,BASE=-.1;                          // world units per metre of height (×12 exaggerated), block floor
let R3=null,sc,cam,geoM,skM,isoM,datG,datM,water,scanM,drillM,frames=[],u,uIso;
function terrainVS(){return `attribute float hgt;uniform float uBoot,uSea,uLift;varying float vH;varying vec3 vN;varying vec3 vP;
  void main(){vH=hgt;vN=normal;vec3 p=position;p.y=max(hgt,-40.)*${VS}*uBoot+uLift;vP=p;gl_Position=projectionMatrix*modelViewMatrix*vec4(p,1.);}`;}
const RAMP_GLSL=`uniform vec3 r0,r1,r2,r3,r4;vec3 ramp(float t){t=clamp(t,0.,1.);if(t<.25)return mix(r0,r1,t*4.);if(t<.5)return mix(r1,r2,(t-.25)*4.);if(t<.75)return mix(r2,r3,(t-.5)*4.);return mix(r3,r4,(t-.75)*4.);}`;
function build3(){
  const W3=Math.round(B.w*PPM),H3=Math.round(B.h*PPM);
  R3=new THREE.WebGLRenderer({antialias:true,alpha:true,preserveDrawingBuffer:true});R3.setPixelRatio(1);R3.setSize(W3,H3,false);
  sc=new THREE.Scene();cam=new THREE.OrthographicCamera(-1,1,1,-1,.1,50);
  u={uBoot:{value:1},uSea:{value:0},uLift:{value:0},uInt:{value:20},uSun:{value:new THREE.Vector3(.5,.8,.3)},uLine:{value:new THREE.Color()},uLine2:{value:new THREE.Color()},uWater:{value:new THREE.Color()},uScan:{value:0},uT:{value:0},uAlpha:{value:1},
    r0:{value:new THREE.Color()},r1:{value:new THREE.Color()},r2:{value:new THREE.Color()},r3:{value:new THREE.Color()},r4:{value:new THREE.Color()}};
  // grid geometry in world xz [-1,1]
  const geo=new THREE.BufferGeometry(),pos=new Float32Array(N*N*3),hg=new Float32Array(N*N),nor=new Float32Array(N*N*3),idx=[];
  for(let j=0;j<N;j++)for(let i=0;i<N;i++){const k=j*N+i;pos[k*3]=i/(N-1)*2-1;pos[k*3+1]=0;pos[k*3+2]=j/(N-1)*2-1;hg[k]=H[k];
    const hx=(H[j*N+Math.min(N-1,i+1)]-H[j*N+Math.max(0,i-1)])*VS,hz=(H[Math.min(N-1,j+1)*N+i]-H[Math.max(0,j-1)*N+i])*VS,d=4/(N-1);
    const n=new THREE.Vector3(-hx,d,-hz).normalize();nor[k*3]=n.x;nor[k*3+1]=n.y;nor[k*3+2]=n.z;}
  for(let j=0;j<N-1;j++)for(let i=0;i<N-1;i++){const a=j*N+i;idx.push(a,a+N,a+1,a+1,a+N,a+N+1);}
  geo.setAttribute('position',new THREE.BufferAttribute(pos,3));geo.setAttribute('hgt',new THREE.BufferAttribute(hg,1));geo.setAttribute('normal',new THREE.BufferAttribute(nor,3));geo.setIndex(idx);
  geoM=new THREE.Mesh(geo,new THREE.ShaderMaterial({uniforms:u,vertexShader:terrainVS(),transparent:true,fragmentShader:`${RAMP_GLSL}uniform float uSea,uInt,uScan,uAlpha;uniform vec3 uSun,uLine,uWater;varying float vH;varying vec3 vN;varying vec3 vP;
    void main(){float l=.35+.75*max(dot(normalize(vN),normalize(uSun)),0.);vec3 c=ramp(vH/${HMAX.toFixed(1)})*l;
      float q=vH/uInt,w=fwidth(q),line=1.-smoothstep(0.,w*1.2,abs(fract(q-.5)-.5));c=mix(c,uLine,line*.55);
      if(vH<uSea){c=mix(c,uWater,.85);}
      float sc=1.-smoothstep(0.,.012,abs(vP.z-uScan));c=mix(c,uLine,sc);
      gl_FragColor=vec4(c,uAlpha);}`}));
  sc.add(geoM);
  // skirts: the four cut faces showing soil layers (thickness exaggerated)
  const sk=new THREE.BufferGeometry(),sp=[],sh=[],sd=[],si=[];let base=0;
  const edges=[[...Array(N).keys()].map(i=>i),[...Array(N).keys()].map(j=>j*N+N-1),[...Array(N).keys()].map(i=>(N-1)*N+N-1-i),[...Array(N).keys()].map(j=>(N-1-j)*N)];
  for(const e of edges){for(const k of e){const x=pos[k*3],z=pos[k*3+2];sp.push(x,0,z,x,0,z);sh.push(H[k],H[k]);sd.push(0,1);}
    for(let n=0;n<N-1;n++){const a=base+n*2;si.push(a,a+1,a+2,a+2,a+1,a+3);}base+=N*2;}
  sk.setAttribute('position',new THREE.Float32BufferAttribute(sp,3));sk.setAttribute('hgt',new THREE.Float32BufferAttribute(sh,1));sk.setAttribute('bot',new THREE.Float32BufferAttribute(sd,1));sk.setIndex(si);
  skM=new THREE.Mesh(sk,new THREE.ShaderMaterial({uniforms:u,side:THREE.DoubleSide,transparent:true,
    vertexShader:`attribute float hgt,bot;uniform float uBoot,uLift;varying float vH,vY;void main(){vH=hgt;vec3 p=position;float top=max(hgt,-40.)*${VS}*uBoot;p.y=mix(top,${BASE},bot)+uLift;vY=p.y-uLift;gl_Position=projectionMatrix*modelViewMatrix*vec4(p,1.);}`,
    fragmentShader:`uniform vec3 uLine,uWater;uniform float uSea,uBoot,uAlpha;varying float vH,vY;
      void main(){float top=max(vH,-40.)*${VS}*uBoot,d=(top-vY)/${VS}/3.;          /* schematic metres below the surface, ×3 thicker */
        float sed=vH<${HK}.?clamp((${HK}.-vH)/${HK}.*14.+3.,0.,22.):0.;
        vec3 c=vec3(.16,.15,.16);                                               /* bedrock */
        if(d<2.)c=vec3(.28,.18,.1);else if(d<2.+sed)c=vec3(.62,.5,.3);else if(d<2.+sed+10.)c=vec3(.42,.44,.36);
        float stripe=step(.5,fract(vY*160.));c*=.92+.08*stripe;
        if(vY<uSea*${VS}*uBoot&&vY>top)c=uWater*1.4;
        if(d>2.+sed+10.){float ore=step(.985,fract(sin(dot(floor(vec2(vY*90.,gl_FragCoord.x*.05)),vec2(12.9,78.2)))*43758.5));c=mix(c,vec3(1.,.82,.3),ore);}
        gl_FragColor=vec4(c,uAlpha);}`}));
  sc.add(skM);
  // sea level
  water=new THREE.Mesh(new THREE.BoxGeometry(1.996,1,1.996),new THREE.MeshBasicMaterial({color:'#2a6a8a',transparent:true,opacity:.45,depthWrite:false}));sc.add(water);
  // ISO: a flat plate that only keeps the contour lines
  uIso=Object.assign({},u,{uLift:{value:0}});
  isoM=new THREE.Mesh(geo,new THREE.ShaderMaterial({uniforms:uIso,transparent:true,depthWrite:false,side:THREE.DoubleSide,
    vertexShader:`attribute float hgt;uniform float uLift;varying float vH;void main(){vH=hgt;vec3 p=position;p.y=uLift;gl_Position=projectionMatrix*modelViewMatrix*vec4(p,1.);}`,
    fragmentShader:`uniform float uInt,uSea,uAlpha;uniform vec3 uLine,uLine2,uWater;varying float vH;void main(){float q=vH/uInt,w=fwidth(q),line=1.-smoothstep(0.,w*1.3,abs(fract(q-.5)-.5));
      float idx=1.-smoothstep(0.,w*2.,abs(fract(q/5.-.5)-.5)*5.);vec3 c=mix(uLine,uLine2,idx);float a=max(line*.9,idx);if(vH<uSea)a=max(a*.4,.18);if(vH<uSea)c=mix(c,uWater*2.,.6);
      if(a<.05)discard;gl_FragColor=vec4(c,a*uAlpha);}`}));
  sc.add(isoM);
  // DAT: dots at grid points
  datG=new THREE.BufferGeometry();datM=new THREE.Points(datG,new THREE.PointsMaterial({size:3,vertexColors:true,transparent:true,depthWrite:false,sizeAttenuation:false}));sc.add(datM);
  // plate outlines and scan plane
  for(let n=0;n<3;n++){const fr=new THREE.LineSegments(new THREE.EdgesGeometry(new THREE.PlaneGeometry(2,2).rotateX(-Math.PI/2)),new THREE.LineBasicMaterial({color:'#fff',transparent:true}));frames.push(fr);sc.add(fr);}
  scanM=new THREE.Mesh(new THREE.PlaneGeometry(2,1),new THREE.MeshBasicMaterial({color:'#fff',transparent:true,opacity:.12,side:THREE.DoubleSide,depthWrite:false,blending:THREE.AdditiveBlending}));sc.add(scanM);
  drillM=new THREE.Mesh(new THREE.CylinderGeometry(.008,.008,1,8),new THREE.MeshBasicMaterial({color:'#fff'}));sc.add(drillM);
}
function buildDat(){
  const st=[8,6,4,4,3][s.geores],p=[],c=[],col=new THREE.Color();
  for(let j=0;j<N;j+=st)for(let i=0;i<N;i+=st){const k=j*N+i;p.push(i/(N-1)*2-1,0,j/(N-1)*2-1);col.set(H[k]<s.alt?pal().water:ramp(pal().ramp,.2+.8*clamp(H[k]/HMAX)));c.push(col.r,col.g,col.b);}
  datG.setAttribute('position',new THREE.Float32BufferAttribute(p,3));datG.setAttribute('color',new THREE.Float32BufferAttribute(c,3));datG.computeBoundingSphere();
  datM.material.size=[2,2.5,3,3,3.5][s.geores];
}
const lv=k=>({geo:0,iso:.5+s.layer*.55,dat:.85+s.layer*1.0}[k]);
function render3(t){
  if(!R3){build3();s.dirty=true;}
  const P=pal(),bt=ease(clamp(s.boot)),lift=k=>lerp(0,lv(k),bt);
  if(s.dirty){const rs=P.ramp;['r0','r1','r2','r3','r4'].forEach((k,i)=>u[k].value.set(ramp(rs,i/4)));u.uLine.value.set(P.line);u.uLine2.value.set(P.line2);u.uWater.value.set(P.water);buildDat();frames.forEach(f=>f.material.color.set(P.line));scanM.material.color.set(P.line);drillM.material.color.set(P.acc);}
  u.uBoot.value=ease(clamp(s.boot*1.4-.2));u.uSea.value=s.alt;u.uInt.value=interval();u.uT.value=t;
  const sa=s.sun*Math.PI/180;u.uSun.value.set(Math.sin(sa),1.1,-Math.cos(sa));
  uIso.uLift.value=lift('iso');
  datM.position.y=lift('dat');datM.material.opacity=clamp(s.boot*2-1);
  frames[0].position.y=BASE;frames[1].position.y=lift('iso');frames[2].position.y=lift('dat');frames.forEach((f,i)=>f.material.opacity=i?.35*clamp(s.boot*2-.5):.25);
  const sea=s.alt*VS*u.uBoot.value;water.visible=s.alt>.5;water.scale.y=Math.max(.001,sea-BASE);water.position.y=(sea+BASE)/2;water.material.color.set(P.water).multiplyScalar(2.2);
  const sz=(s.scan-.5)*2;u.uScan.value=sz;scanM.position.set(0,(BASE+lift('dat'))/2,sz);scanM.scale.y=lift('dat')-BASE+.1;scanM.material.opacity=.1+.08*Math.sin(t*s.hz*12);
  const dx=(s.drillX-.5)*2,dh=hAt((s.drillX-.5)*KM,-(s.scan-.5)*KM)*VS*u.uBoot.value;drillM.position.set(dx,(dh+lift('dat'))/2,sz);drillM.scale.y=Math.max(.01,lift('dat')-dh);
  // camera
  const W3=R3.domElement.width,H3=R3.domElement.height,asp=W3/H3,tilt=s.tilt*Math.PI/180,spin=s.spin*Math.PI/180;
  const mid=(BASE+lift('dat'))/2,r=10;cam.position.set(Math.sin(spin)*Math.cos(tilt)*r,mid+Math.sin(tilt)*r,Math.cos(spin)*Math.cos(tilt)*r);cam.lookAt(0,mid,0);
  const hh=Math.max(1.65/asp*.9,(lift('dat')-BASE)*Math.cos(tilt)*.5+Math.sin(tilt)*1.45+.25)*1.04;cam.left=-hh*asp;cam.right=hh*asp;cam.top=hh;cam.bottom=-hh;cam.updateProjectionMatrix();
  R3.setClearColor(0x000000,0);R3.render(sc,cam);
  return {lift};
}
function project(x,y,z){const v=new THREE.Vector3(x,y,z).project(cam);return[B.x+(v.x+1)/2*B.w,B.y+(1-v.y)/2*B.h];}

/* ---------- map images for the right unit (one continuous map, three filters) ---------- */
const MZ={x:U1.ix0,y:F.top,w:U1.ix1-U1.ix0,h:F.HT};
const MKH=KM*MZ.h/MZ.w;                             // km shown vertically (the map is cropped to the panes' shape)
const MW=312,MH=Math.round(MW*MZ.h/MZ.w);
const maps=[0,1,2].map(()=>{const c=document.createElement('canvas');c.width=MW;c.height=MH;return c;});
const mx=(xk)=>MZ.x+(xk/KM+.5)*MZ.w,my=(yk)=>MZ.y+(.5-yk/MKH)*MZ.h;
let mapStamp='';
function buildMaps(){
  const P=pal(),stamp=[s.pal,s.alt|0,s.sun|0,s.geores].join();if(stamp===mapStamp)return;mapStamp=stamp;
  const hs=new Float32Array(MW*MH);for(let y=0;y<MH;y++)for(let x=0;x<MW;x++)hs[y*MW+x]=hAt((x/(MW-1)-.5)*KM,(.5-y/(MH-1))*MKH);
  const sa=s.sun*Math.PI/180,lx=Math.sin(sa),ly=-Math.cos(sa),iv=interval(),bg=hexRGB(P.bg),ln=hexRGB(P.line),l2=hexRGB(P.line2),wa=hexRGB(P.water);
  const ctxs=maps.map(c=>c.getContext('2d')),ims=ctxs.map(c=>c.createImageData(MW,MH));
  const RC=[...Array(64)].map((_,i)=>hexRGB(ramp(P.ramp,i/63)));
  for(let y=0;y<MH;y++)for(let x=0;x<MW;x++){const k=y*MW+x,h=hs[k],o=k*4,wet=h<s.alt;
    const hl=hs[y*MW+Math.max(0,x-1)],hr=hs[y*MW+Math.min(MW-1,x+1)],hu=hs[Math.max(0,y-1)*MW+x],hd=hs[Math.min(MH-1,y+1)*MW+x];
    const q=Math.floor(h/iv),edge=Math.floor(hl/iv)!==q||Math.floor(hu/iv)!==q,idx=Math.floor(h/(iv*5)),edge5=Math.floor(hl/(iv*5))!==idx||Math.floor(hu/(iv*5))!==idx;
    const coast=(hl<s.alt)!==wet||(hu<s.alt)!==wet;
    // ISO
    let c=wet?wa.map((v,i)=>lerp(bg[i],v,.6)):bg;if(edge)c=edge5?l2:ln;if(wet&&edge)c=c.map((v,i)=>lerp(v,wa[i],.65));if(coast)c=[255,255,255];
    ims[0].data.set([c[0],c[1],c[2],255],o);
    // GEO: tint + hillshade
    const nx=(hl-hr)*.06,ny=(hu-hd)*.06,sh=clamp(.55+(nx*lx+ny*ly)*.9+.15);const rc=RC[Math.round(clamp(h/HMAX)*63)];
    let gcol=wet?wa.map((v,i)=>v*(.8+.4*clamp(1+h/40))):rc.map(v=>v*sh*1.15);if(edge5&&!wet)gcol=gcol.map((v,i)=>lerp(v,ln[i],.35));if(coast)gcol=[240,250,255];
    ims[1].data.set([clamp(gcol[0],0,255),clamp(gcol[1],0,255),clamp(gcol[2],0,255),255],o);
    ims[2].data.set([bg[0],bg[1],bg[2],255],o);}
  ctxs.forEach((c,i)=>c.putImageData(ims[i],0,0));
  // DAT: dots sized by height
  const dc=ctxs[2],step=[14,11,8,7,6][s.geores];
  for(let y=step/2;y<MH;y+=step)for(let x=step/2;x<MW;x+=step){const h=hs[Math.floor(y)*MW+Math.floor(x)],wet=h<s.alt;
    dc.fillStyle=wet?P.water:ramp(P.ramp,.25+.75*clamp(h/HMAX));const r=wet?1.1:1.2+clamp(h/HMAX)*step*.42;dc.beginPath();dc.arc(x,y,r,0,TAU);dc.fill();}
  dc.strokeStyle=rgba(P.line,.18);dc.lineWidth=1;for(let x=0;x<MW;x+=step*2){dc.beginPath();dc.moveTo(x,0);dc.lineTo(x,MH);dc.stroke();}for(let y=0;y<MH;y+=step*2){dc.beginPath();dc.moveTo(0,y);dc.lineTo(MW,y);dc.stroke();}
}
const FNAME=[{sv:'ISO · höjdkurvor',en:'ISO · contours'},{sv:'GEO · relief',en:'GEO · relief'},{sv:'DAT · mätpunkter',en:'DAT · data points'}];
function drawMaps(t){
  const P=pal();
  for(let c=3;c<6;c++){const p=F.pane(c,0),f=s.filters[c-3];g.save();clipPane(g,p);
    // the slice of the continuous map that falls behind this pane
    const sx=(p.x-MZ.x)/MZ.w*MW,sw=p.w/MZ.w*MW;g.imageSmoothingEnabled=true;g.drawImage(maps[f],sx,0,sw,MH,p.x,MZ.y,p.w,MZ.h);
    // km grid
    g.strokeStyle=rgba(P.line,.12);g.lineWidth=.003;for(let k=-15;k<=15;k+=5){g.beginPath();g.moveTo(mx(k),p.y);g.lineTo(mx(k),p.y+p.h);g.stroke();g.beginPath();g.moveTo(p.x,my(k));g.lineTo(p.x+p.w,my(k));g.stroke();}
    g.restore();
    g.fillStyle=rgba(P.bg,.8);g.fillRect(p.x,p.y+p.h-.09,p.w,.09);txt(g,L(FNAME[f]),p.x+.03,p.y+p.h-.045,.034,{align:'left',mono:true,w:600,col:P.line,ls:.06});
  }
  // scan line and drill
  const sy=my(-(s.scan-.5)*KM);
  if(sy>MZ.y&&sy<MZ.y+MZ.h){const gr=g.createLinearGradient(0,sy-.12,0,sy);gr.addColorStop(0,rgba(P.line,0));gr.addColorStop(1,rgba(P.line,.35));g.fillStyle=gr;g.fillRect(MZ.x,sy-.12,MZ.w,.12);
    g.fillStyle=P.acc;g.fillRect(MZ.x,sy-.004,MZ.w,.008);}
  const dxm=MZ.x+s.drillX*MZ.w;g.strokeStyle=rgba(P.acc,.7);g.lineWidth=.005;g.setLineDash([.02,.015]);g.beginPath();g.moveTo(dxm,MZ.y);g.lineTo(dxm,MZ.y+MZ.h-.09);g.stroke();g.setLineDash([]);
  if(sy>MZ.y&&sy<MZ.y+MZ.h){g.strokeStyle=P.acc;g.lineWidth=.008;g.beginPath();g.arc(dxm,sy,.035+.01*Math.sin(t*5),0,TAU);g.stroke();}
  // places
  for(const pl of PLACES){const x=mx(pl.x),y=my(pl.y);if(y<MZ.y+.05||y>MZ.y+MZ.h-.1)continue;g.fillStyle='#fff';g.beginPath();g.arc(x,y,pl.big?.022:.013,0,TAU);g.fill();
    txt(g,pl.n,x+.03,y-.03,pl.big?.042:.03,{align:'left',mono:true,w:600,col:'#fff',stroke:.008,strokeCol:P.bg});}
  if(s.alt<60)txt(g,L({sv:'BOTTENVIKEN',en:'GULF OF BOTHNIA'}),mx(14),my(4),.036,{mono:true,w:600,col:rgba('#ffffff',.6),ls:.2});
  const pk=PEAKS[0];txt(g,`${pk.id} ${Math.round(pk.h)} m`,mx(pk.x),my(pk.y)-.03,.032,{mono:true,w:600,col:P.acc,stroke:.008,strokeCol:P.bg});
}

/* ---------- cross-section along the scan line ---------- */
function layerAt(xk,yk){const h=hAt(xk,yk),sed=h<HK?clamp((HK-h)/HK*16+8*Math.exp(-Math.pow(segDist(xk,yk,RIVERS[0].pts)/2,2)),0,24):0,mor=7+fbm(xk*.4,yk*.4,3)*10;return{h,sed,mor};}
function drawSection(t){
  const P=pal(),z={x:U1.ix0,y:F.trY1,w:U1.ix1-U1.ix0,h:F.HB},yk=-(s.scan-.5)*KM;
  const zTop=z.y+.26,zSea=z.y+z.h*.6,zBot=z.y+z.h-.04,ys=m=>m>=0?lerp(zSea,zTop,m/300):lerp(zSea,zBot,-m/80);
  g.save();g.beginPath();for(let c=3;c<6;c++){const p=F.pane(c,1);g.rect(p.x,p.y,p.w,p.h);}g.clip();
  g.fillStyle=P.bg;g.fillRect(z.x,z.y,z.w,z.h);
  const n=220,X=i=>z.x+i/(n-1)*z.w,xs=i=>(i/(n-1)-.5)*KM,prof=[...Array(n)].map((_,i)=>layerAt(xs(i),yk)),EX=2.2;   // layer thickness ×2.2 to be visible
  const band=(topF,botF,col)=>{g.fillStyle=col;g.beginPath();prof.forEach((q,i)=>g.lineTo(X(i),ys(topF(q))));for(let i=n-1;i>=0;i--)g.lineTo(X(i),ys(botF(prof[i])));g.closePath();g.fill();};
  // sky gradient + height grid
  for(const m of[0,50,100,150,200,250]){g.strokeStyle=rgba(P.line,m?.12:.3);g.lineWidth=.003;g.beginPath();g.moveTo(z.x,ys(m));g.lineTo(z.x+z.w,ys(m));g.stroke();txt(g,m+' m',z.x+.02,ys(m)-.018,.026,{align:'left',mono:true,col:rgba(P.txt,.6)});}
  band(q=>-80,q=>-80,'#000');
  band(q=>q.h-(2+q.sed+q.mor)*EX,q=>-80,'#2a2830');
  band(q=>q.h-(2+q.sed)*EX,q=>q.h-(2+q.sed+q.mor)*EX,'#5b5f4f');
  band(q=>q.h-2*EX,q=>q.h-(2+q.sed)*EX,'#a88b52');
  band(q=>q.h,q=>q.h-2*EX,'#4a3220');
  // ore glints in the bedrock (the Skellefte field)
  for(let i=0;i<40;i++){const xx=hash(i)*z.w,yy=lerp(ys(-30),zBot-.02,hash(i+40));g.fillStyle=rgba('#ffd36a',.35+.35*Math.sin(t*2+i));g.fillRect(z.x+xx,yy,.012,.006);}
  // water above ground below sea level
  g.fillStyle=rgba(P.water,.85);g.beginPath();g.moveTo(z.x,ys(s.alt));prof.forEach((q,i)=>g.lineTo(X(i),ys(Math.min(s.alt,q.h))));g.lineTo(z.x+z.w,ys(s.alt));g.closePath();g.fill();
  g.strokeStyle='#8fd8ff';g.lineWidth=.006;g.beginPath();g.moveTo(z.x,ys(s.alt));g.lineTo(z.x+z.w,ys(s.alt));g.stroke();
  g.strokeStyle=P.line;g.lineWidth=.008;g.beginPath();prof.forEach((q,i)=>g.lineTo(X(i),ys(q.h)));g.stroke();
  // drill core
  const di=Math.round(s.drillX*(n-1)),q=prof[di],dx=X(di),dep=clamp(s.drillT/1.5);
  g.strokeStyle=P.acc;g.lineWidth=.006;g.beginPath();g.moveTo(dx,z.y+.04);g.lineTo(dx,lerp(ys(q.h),zBot,dep));g.stroke();
  g.fillStyle=P.acc;g.beginPath();g.moveTo(dx-.025,ys(q.h)-.05);g.lineTo(dx+.025,ys(q.h)-.05);g.lineTo(dx,ys(q.h)-.01);g.fill();
  const lab=Math.round(q.h)+L({sv:' m ö.h.',en:' m a.s.l.'});const right=dx<z.x+z.w*.7;
  g.fillStyle=rgba(P.bg,.85);rrect(g,right?dx+.03:dx-.33,z.y+.05,.3,.15,.02);g.fill();g.strokeStyle=P.line;g.lineWidth=.004;g.stroke();
  txt(g,lab,right?dx+.045:dx-.315,z.y+.1,.05,{align:'left',w:900,col:'#fff'});
  txt(g,q.sed>1?L({sv:`${Math.round(q.sed)} m havssand`,en:`${Math.round(q.sed)} m sea sand`}):L({sv:'morän på berg',en:'till on bedrock'}),right?dx+.045:dx-.315,z.y+.16,.028,{align:'left',mono:true,col:P.line});
  g.restore();
  // legend, in the right pane
  const lp=F.pane(5,1),items=[['#4a3220',{sv:'Matjord',en:'Topsoil'}],['#a88b52',{sv:'Sand och lera: gammal havsbotten',en:'Sand and clay: old seabed'}],['#5b5f4f',{sv:'Morän från inlandsisen',en:'Till from the ice sheet'}],['#2a2830',{sv:'Berg, med malm',en:'Bedrock, with ore'}]];
  g.fillStyle=rgba(P.bg,.82);rrect(g,lp.x+lp.w-.3,lp.y+lp.h-.35,.29,.31,.02);g.fill();
  items.forEach(([c,l],i)=>{const y=lp.y+lp.h-.3+i*.065;g.fillStyle=c;g.fillRect(lp.x+lp.w-.27,y-.02,.04,.04);txt(g,L(l).split(':')[0],lp.x+lp.w-.21,y,.03,{align:'left',mono:true,col:'#fff'});});
  const yr=fmtN(Math.round(yearsAgo(s.alt)/100)*100);txt(g,s.alt<1?L({sv:'HAVET IDAG',en:'THE SEA TODAY'}):L({sv:`HAVET FÖR ${yr} ÅR SEDAN`,en:`THE SEA ${yr} YEARS AGO`}),z.x+.04,z.y+.24,.034,{align:'left',mono:true,w:600,col:'#8fd8ff'});
  txt(g,`${L({sv:'SKANNING',en:'SCAN'})} ${(64.75+yk/111).toFixed(3)}°N`,F.pane(3,1).x+.03,F.pane(3,1).y+.06,.03,{align:'left',mono:true,w:600,col:P.line});
}

/* ---------- labels over the 3D block ---------- */
function drawBlockOverlay(t,lift){
  const P=pal();
  for(const[k,l]of[['geo','GEO'],['iso','ISO'],['dat','DAT']]){
    if(k!=='geo'&&s.boot<.6)continue;
    const y=k==='geo'?BASE:lift(k),[ax,ay]=project(-1,y,1),[bx,by]=project(1,y,1),left=ax<bx?[ax,ay]:[bx,by];
    g.strokeStyle=rgba(P.line,.6);g.lineWidth=.003;g.beginPath();g.moveTo(left[0],left[1]);g.lineTo(B.x+.04,left[1]);g.stroke();
    txt(g,l,B.x+.03,left[1]-.025,.05,{align:'left',mono:true,w:600,col:P.line});
    txt(g,{geo:L({sv:'terräng och jordlager',en:'terrain and soil'}),iso:L({sv:`höjdkurvor var ${interval()} m`,en:`contours every ${interval()} m`}),dat:L({sv:'höjdpunkter',en:'elevation points'})}[k],B.x+.03,left[1]+.02,.026,{align:'left',mono:true,col:rgba(P.txt,.7)});
  }
  if(s.boot>.8){
    for(const pk of PEAKS){const[x,y]=project(pk.x/KM*2,pk.h*VS,-pk.y/KM*2);g.fillStyle=P.acc;g.beginPath();g.arc(x,y,.012,0,TAU);g.fill();g.strokeStyle=rgba(P.acc,.7);g.lineWidth=.003;g.beginPath();g.moveTo(x,y);g.lineTo(x,y-.12);g.stroke();
      txt(g,`${pk.id} ${Math.round(pk.h)} m`,x+.01,y-.14,.036,{align:'left',mono:true,w:600,col:'#fff',stroke:.007,strokeCol:P.bg});}
    const[tx,ty]=project(0,hAt(0,0)*VS,0);g.fillStyle='#fff';g.beginPath();g.arc(tx,ty,.016,0,TAU);g.fill();
    txt(g,'SKELLEFTEÅ',tx+.03,ty-.03,.038,{align:'left',mono:true,w:600,col:'#fff',stroke:.008,strokeCol:P.bg});
  }
  // readouts down the right edge, like the controller screen
  const rx=B.x+B.w-.04,lines=[`64.75°N 20.95°E`,`${KM}×${KM} KM · ${N}²`,`SUN ${Math.round(s.sun)}°`,`TILT ${Math.round(s.tilt)}° SPIN ${Math.round(((s.spin%360)+360)%360)}°`,`SEA +${Math.round(s.alt)} M`,`PAL ${P.name}`];
  lines.forEach((l,i)=>txt(g,l,rx,F.trY1+.08+i*.045,.028,{align:'right',mono:true,col:rgba(P.txt,.75)}));
  if(s.boot<1){const k=s.boot;txt(g,'BOOT '+String(Math.round(k*100)).padStart(3,'0')+'%',B.x+B.w/2,F.trY0-.25,.06,{mono:true,w:600,col:P.line,alpha:1-k*.6});}
}

const idea={
  id:'topografi',n:3,steam:'T',col:'#ff7a1a',
  name:{sv:'Topografi',en:'Topography'},sub:{sv:'Skellefteå i lager',en:'Skellefteå in layers'},
  q:{sv:'Hur ser marken under Skellefteå ut, och var låg havet för 10 000 år sedan?',en:'What is under Skellefteå, and where was the sea 10,000 years ago?'},
  pitch:{tagline:{sv:'En terrängleksak av Skellefteå. Vänster enhet är ett isometriskt block med lagren GEO, ISO och DAT, delat av tvärposten. Höger enhet är samma karta i tre filter, och under den ligger marken uppskuren längs skannerlinjen. Höj havet och se hur kusten låg när isen smälte.',en:'A terrain toy of Skellefteå. The left unit is an isometric block with GEO, ISO and DAT layers, split by the transom. The right unit is the same map through three filters, with the ground cut open along the scan line below. Raise the sea and see where the coast was when the ice melted.'},
    how:[{sv:'Gå längs fönstren: borren följer dig och visar jordlagren där du står.',en:'Walk along the windows: the drill follows you and shows the soil where you stand.'},
      {sv:'Stå still vid en kartruta så byter den filter.',en:'Stand still by a map pane and it changes filter.'},
      {sv:'Vinka för att starta om skanningen. Reglaget ALTITUDE höjer havet.',en:'Wave to restart the scan. The ALTITUDE slider raises the sea.'}],
    trick:{sv:'Tvärposten skiljer de svävande lagren från blocket. De tre kartrutorna är samma karta genom tre olika filter, så spröjsen blir skarvarna mellan filtren.',en:'The transom separates the floating layers from the block. The three map panes are one map through three filters, so the mullions become the seams between them.'},
    chips:[['cam',{sv:'Djupkamera: position = borr',en:'Depth cam: position = drill'}],['web',{sv:'Webb: rattar och reglage',en:'Web: knobs and sliders'}],['map',{sv:'Skellefteå, 32 × 32 km',en:'Skellefteå, 32 × 32 km'}]],
    fake:{sv:'Förenklad terrängmodell (Lantmäteriets höjddata senare)',en:'Simplified terrain model (Lantmäteriet elevation data later)'}},
  init(){s.boot=0;s.dirty=true;mapStamp='';},
  update(dt,t){
    if(s.boot<1)s.boot=Math.min(1,s.boot+dt/3.2);
    if(s.autoSpin)s.spin+=dt*4;
    if(s.hz>0)s.scan=.5+.42*Math.sin(t*s.hz*.6);
    // the drill follows the nearest visitor in front of the right unit; otherwise it drifts
    let best=null;for(const p of CROWD.people){if(p.x<U1.x0-.3||p.x>U1.x1+.3||p.z>4)continue;if(!best||p.z<best.z)best=p;}
    const want=best?clamp((best.x-U1.ix0)/(U1.ix1-U1.ix0),.01,.99):.5+.4*Math.sin(t*.13);
    const prev=s.drillX;s.drillX=approach(s.drillX,want,best?6:1,dt);s.drillT=Math.abs(s.drillX-prev)>.002?0:s.drillT+dt;
    for(let c=3;c<6;c++){const p=personAtCol(c,3);if(p&&p.still>1.5&&!p._f){p._f=1;s.filters[c-3]=(s.filters[c-3]+1)%3;}if(p&&p.still<.5)p._f=0;}
    s.cool=Math.max(0,(s.cool||0)-dt);
    if(s.cool<=0&&CROWD.people.some(p=>p.wave>1.5&&!p._w&&p.z<3.5)){CROWD.people.forEach(p=>{if(p.wave>1.5)p._w=1;});s.boot=0;s.cool=25;}
    CROWD.people.forEach(p=>{if(p.wave<=0)p._w=0;});
  },
  draw(t){
    const P=pal();
    g.fillStyle=P.bg;for(const p of F.panes)g.fillRect(p.x,p.y,p.w,p.h);g.fillRect(B.x,B.y,B.w,B.h);
    const bg=g.createRadialGradient(B.x+B.w/2,B.y+B.h*.55,.1,B.x+B.w/2,B.y+B.h*.55,B.h*.7);bg.addColorStop(0,rgba(P.line,.12));bg.addColorStop(1,rgba(P.line,0));g.fillStyle=bg;g.fillRect(B.x,B.y,B.w,B.h);
    const r=render3(t);s.dirty=false;
    g.drawImage(R3.domElement,B.x,B.y,B.w,B.h);
    drawBlockOverlay(t,r.lift);
    buildMaps();drawMaps(t);drawSection(t);
  },
  hud(){const yr=yearsAgo(s.alt);return (s.alt<1?L({sv:'Havsnivå idag',en:'Sea level today'}):`${L({sv:'Havet +',en:'Sea +'})}${Math.round(s.alt)} m ≈ ${fmtN(Math.round(yr/100)*100)} ${L({sv:'år sedan',en:'years ago'})}`)+` · ${L({sv:'borr',en:'drill'})} ${Math.round(hAt((s.drillX-.5)*KM,-(s.scan-.5)*KM))} m`;},
  controls(){
    UI.group('SKELLEFTEÅ · TOPO-01','knobs');
    UI.knob({obj:s,key:'sun',label:'SUN',min:0,max:360,wrap:true,reset:315,fmt:v=>Math.round(v)+'°',col:pal().line});
    UI.knob({obj:s,key:'layer',label:'LAYER',min:0,max:1,reset:.85,fmt:v=>Math.round(v*100),col:pal().line});
    UI.knob({obj:s,key:'tilt',label:'TILT',min:4,max:89,reset:34,fmt:v=>Math.round(v)+'°',col:pal().line});
    UI.knob({obj:s,key:'spin',label:'SPIN',min:0,max:360,wrap:true,reset:38,fmt:v=>Math.round(((v%360)+360)%360)+'°',col:pal().line,onInput:()=>{s.autoSpin=false;this.tg&&this.tg.sync();}});
    UI.group();
    UI.slider({obj:s,key:'geores',label:'GEORES',min:0,max:4,step:1,fmt:v=>`${CI[v]} m`});
    this.scan=UI.slider({obj:s,key:'scan',label:'SCAN',min:0,max:1,step:.001,fmt:v=>(64.75-(v-.5)*KM/111).toFixed(3)+'°N',onInput:()=>{s.hz=0;this.hzS&&this.hzS.sync();}});
    UI.slider({obj:s,key:'alt',label:L({sv:'ALTITUDE · havsnivå',en:'ALTITUDE · sea level'}),min:0,max:HK,step:1,fmt:v=>v<1?L({sv:'idag',en:'today'}):`+${Math.round(v)} m · ${fmtN(Math.round(yearsAgo(v)/100)*100)} ${L({sv:'år',en:'yrs'})}`});
    this.hzS=UI.slider({obj:s,key:'hz',label:L({sv:'HZ · skannerfart',en:'HZ · scan speed'}),min:0,max:1,step:.01,fmt:v=>v?(v*2).toFixed(2)+' Hz':'stop'});
    UI.group(null,'row');
    UI.button({label:'BOOTUP',cls:'hot',onClick:()=>{s.boot=0;}});
    UI.button({label:'ORTHO 1',onClick:()=>{s.tilt=89;s.autoSpin=false;s.spin=0;this.rebuild();}});
    UI.button({label:'ORTHO 2',onClick:()=>{s.tilt=4;s.autoSpin=false;s.spin=0;this.rebuild();}});
    UI.button({label:'PRESET',onClick:()=>{s.pal=(s.pal+1)%PALS.length;s.dirty=true;this.rebuild();}});
    UI.group();
    this.tg=UI.toggle({obj:s,key:'autoSpin',label:{sv:'Snurra blocket långsamt',en:'Spin the block slowly'}});
    UI.note({sv:'Terrängen är en förenklad modell av Skellefteå med älven, Vitberget och kusten. Havsnivåerna följer landhöjningen ungefär (högsta kustlinjen ≈ 240 m).',en:'The terrain is a simplified model of Skellefteå with the river, Vitberget and the coast. Sea levels roughly follow the land uplift (highest shoreline ≈ 240 m).'},'fake');
  },
  rebuild(){buildPanel();}
};
IDEAS.push(idea);(window.__dbg=window.__dbg||{}).topo=()=>({s,isoM,datM,frames,cam,sc,R3});
})();
