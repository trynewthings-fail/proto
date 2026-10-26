/* ================= Art styles: one post-processing pass per tab =================
   Each tab draws its picture on the screen canvas as before; a WebGL shader then turns it into a medium:
     riso    fluorescent risograph inks on black stock: halftone screens, misregistration, grain   (Temperatur)
     poster  mid-century lithograph poster: a few flat inks, paper fibre, uneven ink, offset key  (Elektricitet)
     crt     a TouchDesigner screen: bloom, scanlines, RGB split, every pane its own tube          (Topografi)
     atlas   a hand-coloured copperplate star chart: halation, ink and paper grain                (Stjärnhimlen)
     paper   paper lit from behind like an advent star: fibres, warm hotspot per pane, glow        (Jul)            */
const POST=(()=>{
  const cv=document.createElement('canvas');cv.width=scr.width;cv.height=scr.height;
  const gl=cv.getContext('webgl',{preserveDrawingBuffer:true,premultipliedAlpha:false,antialias:false});
  if(!gl)return {run:()=>scr,canvas:scr,ok:false};
  const VS='attribute vec2 p;varying vec2 vUv;void main(){vUv=p*.5+.5;gl_Position=vec4(p,0.,1.);}';
  const HEAD=`precision highp float;uniform sampler2D uTex;uniform vec2 uRes;uniform float uT;uniform vec4 uPane[12];uniform mat3 uInk;uniform vec3 uPal[8];varying vec2 vUv;
    float h21(vec2 p){p=fract(p*vec2(123.34,456.21));p+=dot(p,p+45.32);return fract(p.x*p.y);}
    float vn(vec2 p){vec2 i=floor(p),f=fract(p);f=f*f*(3.-2.*f);return mix(mix(h21(i),h21(i+vec2(1,0)),f.x),mix(h21(i+vec2(0,1)),h21(i+vec2(1,1)),f.x),f.y);}
    float fbm(vec2 p){float s=0.,a=.5;for(int i=0;i<5;i++){s+=a*vn(p);p*=2.03;a*=.5;}return s;}
    vec3 tx(vec2 uv){return texture2D(uTex,uv).rgb;}
    float lum(vec3 c){return dot(c,vec3(.299,.587,.114));}
    vec4 pane(vec2 uv){for(int i=0;i<12;i++){vec4 r=uPane[i];if(uv.x>=r.x&&uv.x<=r.x+r.z&&uv.y>=r.y&&uv.y<=r.y+r.w)return r;}return vec4(-1.);}
    float dots(vec2 px,float amt,float ang,float cell){float c=cos(ang),s=sin(ang);vec2 q=mat2(c,-s,s,c)*px;vec2 f=mod(q,cell)-cell*.5;float r=sqrt(clamp(amt,0.,1.))*cell*.74;return smoothstep(r+.9,r-.9,length(f));}`;
  const FS={
    riso:`void main(){vec2 px=vUv*uRes,o=1./uRes;
      vec3 a0=uInk*tx(vUv+o*vec2(1.6,-.8)),a1=uInk*tx(vUv+o*vec2(-1.2,1.)),a2=uInk*tx(vUv);
      float grain=vn(px*.9);
      vec3 A=vec3(a0.x,a1.y,a2.z);A=clamp((A-.07)/.93,0.,1.);
      float p=dots(px,A.x*(.9+.2*grain),.26,6.),b=dots(px,A.y*(.9+.2*grain),1.31,6.),y=dots(px,A.z,.79,6.);
      vec3 P=vec3(1.,.28,.62),B=vec3(.05,.5,.95),Y=vec3(1.,.9,.1);
      vec3 c=1.-(1.-P*p*(.85+.15*vn(px*.35)))*(1.-B*b*(.85+.15*vn(px*.31+7.)))*(1.-Y*y*(.85+.15*vn(px*.33+3.)));
      c+=vec3(.035,.03,.04)*fbm(px*.02);c*=.94+.06*h21(px);gl_FragColor=vec4(c,1.);}`,
    poster:`void main(){vec2 px=vUv*uRes,o=1./uRes;
      vec3 c=tx(vUv+o*(vn(px*.03)-.5)*1.5);float j=(fbm(px*.045)-.5)*.09;c+=j;
      float best=1e9;vec3 q=uPal[0];for(int i=0;i<8;i++){vec3 d=(c-uPal[i])*vec3(.9,1.2,.8);float e=dot(d,d);if(e<best){best=e;q=uPal[i];}}
      float k=lum(tx(vUv+o*vec2(2.,-1.5)));if(k<.07)q=mix(q,vec3(.11,.1,.09),.85);
      float fib=fbm(px*vec2(.012,.05))*.6+fbm(px*.2)*.4,ink=.86+.14*vn(px*.18)+.05*fib;
      vec3 paper=uPal[0]*(.92+.1*fib);q=q==uPal[0]?paper:q*ink;
      q*=.95+.05*h21(px);gl_FragColor=vec4(q,1.);}`,
    crt:`void main(){vec2 px=vUv*uRes,o=1./uRes;vec4 r=pane(vUv);
      vec3 c=vec3(tx(vUv+o*vec2(1.3,0)).r,tx(vUv).g,tx(vUv-o*vec2(1.3,0)).b);
      vec3 bl=vec3(0.);for(int i=0;i<12;i++){float a=float(i)*.5236;vec2 d=vec2(cos(a),sin(a));bl+=max(tx(vUv+d*o*6.)-.3,0.)+max(tx(vUv+d*o*15.)-.3,0.)*.6;}
      c+=bl*.11;
      c*=.72+.28*pow(sin(px.y*1.0472),2.);c*=vec3(.95+.05*sin(px.x*2.094),.95+.05*sin(px.x*2.094+2.09),.95+.05*sin(px.x*2.094+4.19));
      if(r.x>=0.){vec2 u=(vUv-r.xy)/r.zw;float v=16.*u.x*u.y*(1.-u.x)*(1.-u.y);c*=.55+.45*pow(v,.25);}
      c+=(h21(px+uT)-.5)*.05;c*=.97+.03*sin(uT*47.);gl_FragColor=vec4(c,1.);}`,
    atlas:`void main(){vec2 px=vUv*uRes,o=1./uRes;vec3 c=tx(vUv);
      vec3 bl=vec3(0.);for(int i=0;i<8;i++){float a=float(i)*.785;bl+=max(tx(vUv+vec2(cos(a),sin(a))*o*4.)-.45,0.);}c+=bl*.08;
      float pap=fbm(px*.01)*.6+fbm(px*.08)*.4;c*=.9+.16*pap;c+=vec3(.02,.025,.04)*(pap-.4);
      c=mix(c,c*vec3(1.04,1.,.92),.5);c*=.96+.04*h21(px);gl_FragColor=vec4(c,1.);}`,
    paper:`void main(){vec2 px=vUv*uRes,o=1./uRes;vec3 c=tx(vUv);vec4 r=pane(vUv);
      vec3 bl=vec3(0.);for(int i=0;i<12;i++){float a=float(i)*.5236;vec2 d=vec2(cos(a),sin(a));bl+=max(tx(vUv+d*o*9.)-.55,0.)+max(tx(vUv+d*o*22.)-.55,0.)*.7;}
      float fib=fbm(px*vec2(.006,.02))*.5+fbm(px*.05)*.3+fbm(px*vec2(.3,.04))*.2;
      float hot=1.;if(r.x>=0.){vec2 u=(vUv-r.xy)/r.zw-.5;hot=.62+.55*exp(-dot(u*vec2(1.6,1.),u*vec2(1.6,1.))*3.);}
      c*=hot*(.8+.35*fib);c+=bl*.05*vec3(1.,.8,.55);c=mix(c,c*vec3(1.08,.96,.82),.6);c*=.96+.04*h21(px);gl_FragColor=vec4(c,1.);}`};
  const progs={};
  function prog(m){if(progs[m])return progs[m];const mk=(t,s)=>{const sh=gl.createShader(t);gl.shaderSource(sh,s);gl.compileShader(sh);if(!gl.getShaderParameter(sh,gl.COMPILE_STATUS))console.error(m,gl.getShaderInfoLog(sh));return sh;};
    const p=gl.createProgram();gl.attachShader(p,mk(gl.VERTEX_SHADER,VS));gl.attachShader(p,mk(gl.FRAGMENT_SHADER,HEAD+FS[m]));gl.linkProgram(p);return progs[m]=p;}
  const buf=gl.createBuffer();gl.bindBuffer(gl.ARRAY_BUFFER,buf);gl.bufferData(gl.ARRAY_BUFFER,new Float32Array([-1,-1,1,-1,-1,1,1,1]),gl.STATIC_DRAW);
  const tex=gl.createTexture();gl.bindTexture(gl.TEXTURE_2D,tex);
  [gl.TEXTURE_WRAP_S,gl.TEXTURE_WRAP_T].forEach(k=>gl.texParameteri(gl.TEXTURE_2D,k,gl.CLAMP_TO_EDGE));gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_MIN_FILTER,gl.LINEAR);gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_MAG_FILTER,gl.LINEAR);
  gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL,true);
  const panes=new Float32Array(48);F.panes.forEach((p,i)=>panes.set([p.x/F.W,1-(p.y+p.h)/F.H,p.w/F.W,p.h/F.H],i*4));
  // ink separation for riso: colour = P·a + B·b + Y·c, solved once
  const inv=(()=>{const P=[1,.28,.62],B=[.05,.5,.95],Y=[1,.9,.1],m=[P[0],B[0],Y[0],P[1],B[1],Y[1],P[2],B[2],Y[2]];
    const[a,b,c,d,e,f,g2,h,i]=m,A=e*i-f*h,Bv=-(d*i-f*g2),Cv=d*h-e*g2,det=a*A+b*Bv+c*Cv;
    const r=[A,-(b*i-c*h),b*f-c*e,Bv,a*i-c*g2,-(a*f-c*d),Cv,-(a*h-b*g2),a*e-b*d].map(v=>v/det);
    return new Float32Array([r[0],r[3],r[6],r[1],r[4],r[7],r[2],r[5],r[8]]);})();      // column-major for GLSL
  const PALS={poster:['#efe3c8','#1d1b19','#1f3b73','#6fa3c8','#d2412f','#e8a93a','#3d7a5a','#f6d36b']};
  function run(mode,T){
    if(!mode||!FS[mode])return scr;
    const p=prog(mode);gl.useProgram(p);gl.viewport(0,0,cv.width,cv.height);
    gl.bindTexture(gl.TEXTURE_2D,tex);gl.texImage2D(gl.TEXTURE_2D,0,gl.RGBA,gl.RGBA,gl.UNSIGNED_BYTE,scr);
    const loc=gl.getAttribLocation(p,'p');gl.bindBuffer(gl.ARRAY_BUFFER,buf);gl.enableVertexAttribArray(loc);gl.vertexAttribPointer(loc,2,gl.FLOAT,false,0,0);
    gl.uniform1i(gl.getUniformLocation(p,'uTex'),0);gl.uniform2f(gl.getUniformLocation(p,'uRes'),cv.width,cv.height);gl.uniform1f(gl.getUniformLocation(p,'uT'),T%100);
    gl.uniform4fv(gl.getUniformLocation(p,'uPane'),panes);gl.uniformMatrix3fv(gl.getUniformLocation(p,'uInk'),false,inv);
    const pal=(PALS[mode]||PALS.poster).map(h=>hexRGB(h).map(v=>v/255)).flat();gl.uniform3fv(gl.getUniformLocation(p,'uPal'),new Float32Array(pal));
    gl.drawArrays(gl.TRIANGLE_STRIP,0,4);return cv;
  }
  return {run,canvas:cv,ok:true};
})();
