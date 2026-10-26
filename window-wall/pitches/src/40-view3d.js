/* ================= Window 3D: the façade at night, the screen canvas behind real frames, people on the plaza =================
   World: metres, y up, the glass plane at z = 0, the plaza at z > 0. Façade x maps to world x - F.W/2. */
const View3D=(()=>{
  let mid=null,midX=null,R,scene,cam,ctl,tex,screenLight,built=false,figs=new Map(),host,avgC,avgX,frameN=0;
  const GY=F.SILL,TOPY=F.SILL+F.H,wx=x=>x-F.W/2,wy=y=>TOPY-y;
  function canvasTex(w,h,paint){const c=document.createElement('canvas');c.width=w;c.height=h;paint(c.getContext('2d'),w,h);const t=new THREE.CanvasTexture(c);t.encoding=THREE.sRGBEncoding;t.anisotropy=8;return t;}
  function build(){
    host=document.getElementById('v3');
    R=new THREE.WebGLRenderer({antialias:true});R.setPixelRatio(Math.min(2,devicePixelRatio||1));
    R.outputEncoding=THREE.sRGBEncoding;R.toneMapping=THREE.ACESFilmicToneMapping;R.toneMappingExposure=1.05;
    host.append(R.domElement);
    scene=new THREE.Scene();scene.background=new THREE.Color('#05070b');scene.fog=new THREE.Fog('#05070b',16,46);
    cam=new THREE.PerspectiveCamera(38,1.6,.1,200);cam.position.set(1.8,1.7,11.5);
    ctl=new THREE.OrbitControls(cam,R.domElement);ctl.target.set(0,2.05,0);ctl.enableDamping=true;ctl.dampingFactor=.08;
    ctl.minDistance=2.5;ctl.maxDistance=24;ctl.maxPolarAngle=1.53;ctl.minAzimuthAngle=-1.25;ctl.maxAzimuthAngle=1.25;ctl.update();
    scene.add(new THREE.HemisphereLight('#3a4a6a','#0b0b0b',.38));
    const moon=new THREE.DirectionalLight('#9fb4e0',.25);moon.position.set(-6,12,8);scene.add(moon);
    const lamp=new THREE.PointLight('#ffcf8a',1.2,14,1.8);lamp.position.set(6.6,4.4,4.4);scene.add(lamp);
    screenLight=new THREE.PointLight('#ffffff',1,6,1.8);screenLight.position.set(0,2.3,1.3);scene.add(screenLight);
    // plaster
    const plaster=canvasTex(512,512,(c,w,h)=>{c.fillStyle='#9c968a';c.fillRect(0,0,w,h);for(let i=0;i<9000;i++){const v=Math.random();c.fillStyle=`rgba(${v>.5?255:0},${v>.5?250:0},${v>.5?240:0},${Math.random()*.06})`;c.fillRect(Math.random()*w,Math.random()*h,2,2);}});
    plaster.wrapS=plaster.wrapT=THREE.RepeatWrapping;plaster.repeat.set(3,3);
    const wallM=new THREE.MeshStandardMaterial({color:'#4a4741',map:plaster,roughness:.95});
    const box=(x0,x1,y0,y1,z0,z1,m)=>{const b=new THREE.Mesh(new THREE.BoxGeometry(x1-x0,y1-y0,z1-z0),m);b.position.set((x0+x1)/2,(y0+y1)/2,(z0+z1)/2);scene.add(b);return b;};
    const L0=wx(0),R1=wx(F.W),P0=wx(F.pierX0),P1=wx(F.pierX1);
    box(-11,11,-.01,GY,-.6,0,wallM);box(-11,11,TOPY,9.5,-.6,0,wallM);box(-11,L0,GY,TOPY,-.6,0,wallM);box(R1,11,GY,TOPY,-.6,0,wallM);box(P0,P1,GY,TOPY,-.6,0,wallM);
    // a plinth band and the floor slab line
    const band=new THREE.MeshStandardMaterial({color:'#3d3f3e',roughness:.7});
    box(-11,11,-.01,.32,0,.04,band);box(-11,11,TOPY+.35,TOPY+.5,0,.05,new THREE.MeshStandardMaterial({color:'#6f6a62',roughness:.9}));
    // window frames, set back in a reveal
    const frameM=new THREE.MeshStandardMaterial({color:'#1b1e22',roughness:.45,metalness:.35});
    const FZ0=-.2,FZ1=-.1;
    for(const u of F.units){
      const x0=wx(u.x0),x1=wx(u.x1);
      box(x0,x1,wy(F.K),TOPY,FZ0,FZ1,frameM);box(x0,x1,GY,wy(F.bot),FZ0,FZ1,frameM);
      box(x0,wx(u.ix0),GY,TOPY,FZ0,FZ1,frameM);box(wx(u.ix1),x1,GY,TOPY,FZ0,FZ1,frameM);
      box(wx(u.ix0),wx(u.ix1),wy(F.trY1),wy(F.trY0),FZ0,FZ1+.01,frameM);
      for(let k=1;k<3;k++){const mx=u.ix0+k*F.PW+(k-1)*F.MU;box(wx(mx),wx(mx+F.MU),wy(F.bot),wy(F.top),FZ0,FZ1,frameM);}
      // sheet-metal sill
      box(x0-.04,x1+.04,GY-.05,GY,-.2,.07,new THREE.MeshStandardMaterial({color:'#4a4d50',roughness:.35,metalness:.7}));
      const glass=new THREE.Mesh(new THREE.PlaneGeometry(u.x1-u.x0,F.H),new THREE.MeshStandardMaterial({color:'#9fb6c8',transparent:true,opacity:.07,roughness:.05,metalness:.9,depthWrite:false}));
      glass.position.set(wx(u.cx),GY+F.H/2,-.12);scene.add(glass);
    }
    // the screen: one canvas behind both units
    tex=new THREE.CanvasTexture(scr);tex.encoding=THREE.sRGBEncoding;tex.anisotropy=8;
    const screen=new THREE.Mesh(new THREE.PlaneGeometry(F.W,F.H),new THREE.MeshBasicMaterial({map:tex,toneMapped:false}));
    screen.position.set(0,GY+F.H/2,-.34);scene.add(screen);
    // sign
    const sign=canvasTex(1024,160,(c,w,h)=>{c.clearRect(0,0,w,h);c.fillStyle='#f4f1e6';c.font="800 104px Alegreya,Georgia,serif";c.textAlign='center';c.textBaseline='middle';c.letterSpacing='18px';c.fillText('EXPLORATORIET',w/2,h/2+6);});
    const sm=new THREE.Mesh(new THREE.PlaneGeometry(4.6,.72),new THREE.MeshStandardMaterial({map:sign,transparent:true,emissive:'#fff6dc',emissiveMap:sign,emissiveIntensity:.35,roughness:.6}));
    sm.position.set(0,TOPY+1.05,.02);scene.add(sm);
    // upper-floor windows, some lit
    const dark=new THREE.MeshStandardMaterial({color:'#0d1116',roughness:.2,metalness:.6}),warm=new THREE.MeshStandardMaterial({color:'#1a140c',emissive:'#ffcf8a',emissiveIntensity:.35});
    for(let i=-4;i<=4;i++){const m=(i===-2||i===3)?warm:dark;box(i*2.3-.75,i*2.3+.75,TOPY+1.9,TOPY+3.9,-.08,.005,m);}
    // plaza
    const pave=canvasTex(1024,1024,(c,w,h)=>{c.fillStyle='#2a2b2b';c.fillRect(0,0,w,h);const n=8,s=w/n;for(let y=0;y<n*2;y++)for(let x=0;x<n;x++){const v=38+Math.random()*16;c.fillStyle=`rgb(${v},${v},${v+2})`;c.fillRect(x*s+(y%2)*s/2+2,y*s/2+2,s-4,s/2-4);}});
    pave.wrapS=pave.wrapT=THREE.RepeatWrapping;pave.repeat.set(14,14);
    const ground=new THREE.Mesh(new THREE.PlaneGeometry(60,40),new THREE.MeshStandardMaterial({map:pave,color:'#7a7c80',roughness:.42,metalness:.15}));
    ground.rotation.x=-Math.PI/2;ground.position.z=20-.6;scene.add(ground);
    // wet-pavement reflection of the screen
    const fade=canvasTex(8,256,(c,w,h)=>{const gr=c.createLinearGradient(0,h,0,0);gr.addColorStop(0,'#fff');gr.addColorStop(.5,'#444');gr.addColorStop(1,'#000');c.fillStyle=gr;c.fillRect(0,0,w,h);});
    fade.encoding=THREE.LinearEncoding;
    const sg=new THREE.PlaneGeometry(F.W+.4,3.6),uv=sg.attributes.uv;for(let i=0;i<uv.count;i++)uv.setY(i,1-uv.getY(i));
    const spill=new THREE.Mesh(sg,new THREE.MeshBasicMaterial({map:tex,alphaMap:fade,transparent:true,opacity:.42,blending:THREE.AdditiveBlending,depthWrite:false,toneMapped:false}));
    spill.rotation.x=-Math.PI/2;spill.position.set(0,.005,1.8);scene.add(spill);
    // lamp post
    const post=new THREE.MeshStandardMaterial({color:'#222',roughness:.5,metalness:.6});
    const pole=new THREE.Mesh(new THREE.CylinderGeometry(.05,.07,4.5,10),post);pole.position.set(6.6,2.25,4.6);scene.add(pole);
    const head=new THREE.Mesh(new THREE.SphereGeometry(.18,16,12),new THREE.MeshBasicMaterial({color:'#ffe2b0'}));head.position.set(6.6,4.55,4.6);scene.add(head);
    avgC=document.createElement('canvas');avgC.width=avgC.height=1;avgX=avgC.getContext('2d',{willReadFrequently:true});
    new ResizeObserver(resize).observe(host);resize();
    built=true;
  }
  function resize(){if(!R)return;const r=host.getBoundingClientRect();if(!r.width)return;R.setSize(r.width,r.height,false);cam.aspect=r.width/r.height;cam.updateProjectionMatrix();}
  const skin=new Set();
  function fig(p){
    let f=figs.get(p.id);if(f)return f;
    const grp=new THREE.Group(),s=p.kid?.68:1;
    const coat=new THREE.MeshStandardMaterial({color:p.coat,roughness:.85});
    const body=new THREE.Mesh(new THREE.CapsuleGeometry(.19,.62,6,12),coat);body.position.y=.95;grp.add(body);
    const legs=new THREE.Mesh(new THREE.CapsuleGeometry(.12,.55,4,8),new THREE.MeshStandardMaterial({color:'#1a1c20',roughness:.9}));legs.position.y=.42;grp.add(legs);
    const head=new THREE.Mesh(new THREE.SphereGeometry(.13,18,14),new THREE.MeshStandardMaterial({color:p.you?C.lime:'#d6b99a',emissive:p.you?C.lime:'#000',emissiveIntensity:p.you?.6:0,roughness:.7}));head.position.y=1.47;grp.add(head);
    const arm=new THREE.Mesh(new THREE.CapsuleGeometry(.05,.5,4,8),coat);arm.geometry.translate(0,.25,0);arm.position.set(.24,1.22,0);grp.add(arm);
    grp.scale.setScalar(s*(p.h/1.7));scene.add(grp);f={grp,arm};figs.set(p.id,f);return f;
  }
  function render(T,src){
    if(!built)build();
    // a WebGL canvas can't be read reliably by another context, so styled frames go through a 2D copy
    if(src&&src!==scr){if(!mid){mid=document.createElement('canvas');mid.width=scr.width;mid.height=scr.height;midX=mid.getContext('2d');}midX.drawImage(src,0,0);src=mid;}
    tex.image=src||scr;tex.needsUpdate=true;
    if(++frameN%5===0){avgX.drawImage(scr,0,0,1,1);const d=avgX.getImageData(0,0,1,1).data;const m=Math.max(d[0],d[1],d[2],1);
      screenLight.color.setRGB(d[0]/m,d[1]/m,d[2]/m);screenLight.intensity=.25+1.8*(d[0]+d[1]+d[2])/765;}
    const alive=new Set();
    for(const p of CROWD.people){alive.add(p.id);const f=fig(p);const bob=Math.abs(Math.sin(p.t*7))*.04*clamp(p.speed);
      f.grp.position.set(wx(p.x),p.jy+bob,p.z);f.grp.rotation.y=p.speed>.25?Math.atan2(p.vx,p.vz):Math.PI;
      f.arm.rotation.z=p.wave>0?2.6+Math.sin(T*14)*.35:.12;}
    for(const[id,f]of figs)if(!alive.has(id)){scene.remove(f.grp);figs.delete(id);}
    ctl.update();R.render(scene,cam);
  }
  function resetCam(){if(!built)return;cam.position.set(1.8,1.7,11.5);ctl.target.set(0,2.05,0);ctl.update();}
  return {render,resetCam,get built(){return built;}};
})();
