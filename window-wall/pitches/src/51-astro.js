/* ================= Astronomy for Skellefteå (64.75° N, 20.95° E) =================
   Low-precision formulas (Paul Schlyter, "How to compute planetary positions"): good to a fraction of a degree,
   which is far finer than a pane. Angles in degrees unless noted. */
const ASTRO=(()=>{
  const RAD=Math.PI/180,LAT=64.75,LON=20.95;
  const sin=d=>Math.sin(d*RAD),cos=d=>Math.cos(d*RAD),atan2=(y,x)=>Math.atan2(y,x)/RAD,asin=v=>Math.asin(clamp(v,-1,1))/RAD;
  const rev=x=>((x%360)+360)%360;
  const jd=date=>date.getTime()/864e5+2440587.5;
  const lst=date=>rev(280.46061837+360.98564736629*(jd(date)-2451545)+LON);
  function altaz(ra,dec,LST){const H=LST-ra,sa=sin(LAT)*sin(dec)+cos(LAT)*cos(dec)*cos(H),alt=asin(sa);
    const az=rev(atan2(-sin(H)*cos(dec),cos(LAT)*sin(dec)-sin(LAT)*cos(dec)*cos(H)));return[alt,az];}
  function radec(alt,az,LST){const sd=sin(LAT)*sin(alt)+cos(LAT)*cos(alt)*cos(az),dec=asin(sd);
    const H=atan2(-sin(az)*cos(alt),cos(LAT)*sin(alt)-sin(LAT)*cos(alt)*cos(az));return[rev(LST-H),dec];}
  function galactic(ra,dec){const ag=192.85948,dg=27.12825,ln=122.93192,b=asin(sin(dec)*sin(dg)+cos(dec)*cos(dg)*cos(ra-ag));
    const l=rev(ln-atan2(cos(dec)*sin(ra-ag),sin(dec)*cos(dg)-cos(dec)*sin(dg)*cos(ra-ag)));return[l,b];}
  const kepler=(M,e)=>{let E=M+e/RAD*sin(M)*(1+e*cos(M));for(let i=0;i<5;i++)E=E-(E-e/RAD*sin(E)-M)/(1-e*cos(E));return E;};
  function orbit(o){const E=kepler(rev(o.M),o.e),xv=o.a*(cos(E)-o.e),yv=o.a*Math.sqrt(1-o.e*o.e)*sin(E),v=atan2(yv,xv),r=Math.hypot(xv,yv);
    return[r*(cos(o.N)*cos(v+o.w)-sin(o.N)*sin(v+o.w)*cos(o.i)),r*(sin(o.N)*cos(v+o.w)+cos(o.N)*sin(v+o.w)*cos(o.i)),r*sin(v+o.w)*sin(o.i),v,r];}
  const EL={
    mercury:d=>({N:48.3313+3.24587e-5*d,i:7.0047+5e-8*d,w:29.1241+1.01444e-5*d,a:.387098,e:.205635+5.59e-10*d,M:168.6562+4.0923344368*d}),
    venus:d=>({N:76.6799+2.4659e-5*d,i:3.3946+2.75e-8*d,w:54.891+1.38374e-5*d,a:.72333,e:.006773-1.302e-9*d,M:48.0052+1.6021302244*d}),
    mars:d=>({N:49.5574+2.11081e-5*d,i:1.8497-1.78e-8*d,w:286.5016+2.92961e-5*d,a:1.523688,e:.093405+2.516e-9*d,M:18.6021+.5240207766*d}),
    jupiter:d=>({N:100.4542+2.76854e-5*d,i:1.303-1.557e-7*d,w:273.8777+1.64505e-5*d,a:5.20256,e:.048498+4.469e-9*d,M:19.895+.0830853001*d}),
    saturn:d=>({N:113.6634+2.3898e-5*d,i:2.4886-1.081e-7*d,w:339.3939+2.97661e-5*d,a:9.55475,e:.055546-9.499e-9*d,M:316.967+.0334442282*d})};
  function ecl2eq(x,y,z,d){const ec=23.4393-3.563e-7*d;return[x,y*cos(ec)-z*sin(ec),y*sin(ec)+z*cos(ec)];}
  function sunPos(d){const w=282.9404+4.70935e-5*d,e=.016709-1.151e-9*d,M=rev(356.047+.9856002585*d),E=kepler(M,e),xv=cos(E)-e,yv=Math.sqrt(1-e*e)*sin(E),v=atan2(yv,xv),r=Math.hypot(xv,yv),lon=rev(v+w);
    return {lon,r,M,L:rev(w+M),x:r*cos(lon),y:r*sin(lon)};}
  function bodies(date){
    const d=jd(date)-2451543.5,sun=sunPos(d),out={};
    const eqS=ecl2eq(sun.x,sun.y,0,d);out.sun={ra:rev(atan2(eqS[1],eqS[0])),dec:atan2(eqS[2],Math.hypot(eqS[0],eqS[1]))};
    for(const k in EL){const[xh,yh,zh]=orbit(EL[k](d)),xg=xh+sun.x,yg=yh+sun.y,zg=zh,[xe,ye,ze]=ecl2eq(xg,yg,zg,d),dist=Math.hypot(xe,ye,ze);
      out[k]={ra:rev(atan2(ye,xe)),dec:atan2(ze,Math.hypot(xe,ye)),au:dist};}
    // the Moon with the main perturbations
    const Nm=rev(125.1228-.0529538083*d),im=5.1454,wm=rev(318.0634+.1643573223*d),em=.0549,Mm=rev(115.3654+13.0649929509*d);
    const E=kepler(Mm,em),xv=60.2666*(cos(E)-em),yv=60.2666*Math.sqrt(1-em*em)*sin(E),v=atan2(yv,xv),r=Math.hypot(xv,yv);
    let lon=rev(atan2(r*(sin(Nm)*cos(v+wm)+cos(Nm)*sin(v+wm)*cos(im)),r*(cos(Nm)*cos(v+wm)-sin(Nm)*sin(v+wm)*cos(im))));
    let lat=asin(sin(v+wm)*sin(im));
    const Ls=sun.L,Lm=rev(Nm+wm+Mm),D=rev(Lm-Ls),Fm=rev(Lm-Nm),Ms=sun.M;
    lon+=-1.274*sin(Mm-2*D)+.658*sin(2*D)-.186*sin(Ms)-.059*sin(2*Mm-2*D)-.057*sin(Mm-2*D+Ms)+.053*sin(Mm+2*D)+.046*sin(2*D-Ms)+.041*sin(Mm-Ms)-.035*sin(D)-.031*sin(Mm+Ms)-.015*sin(2*Fm-2*D)+.011*sin(Mm-4*D);
    lat+=-.173*sin(Fm-2*D)-.055*sin(Mm-Fm-2*D)-.046*sin(Mm+Fm-2*D)+.033*sin(Fm+2*D)+.017*sin(2*Mm+Fm);
    const[xe,ye,ze]=ecl2eq(cos(lon)*cos(lat),sin(lon)*cos(lat),sin(lat),d);
    const elong=rev(lon-sun.lon);
    out.moon={ra:rev(atan2(ye,xe)),dec:atan2(ze,Math.hypot(xe,ye)),phase:elong,illum:(1-cos(elong))/2};
    return out;
  }
  function phaseName(e){const n=[{sv:'Nymåne',en:'New moon'},{sv:'Växande månskära',en:'Waxing crescent'},{sv:'Halvmåne, första kvarteret',en:'First quarter'},{sv:'Växande måne',en:'Waxing gibbous'},{sv:'Fullmåne',en:'Full moon'},{sv:'Avtagande måne',en:'Waning gibbous'},{sv:'Halvmåne, sista kvarteret',en:'Last quarter'},{sv:'Avtagande månskära',en:'Waning crescent'}];return n[Math.round(e/45)%8];}
  return {LAT,LON,lst,altaz,radec,galactic,bodies,phaseName,rev};
})();
