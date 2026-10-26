/* ================= UI kit: the web controller that stands in for the cameras while we pitch =================
   Every control reads its start value from the idea's state object and writes straight back to it,
   so the panel can be rebuilt at any time (language switch) without losing anything. */
const UI=(()=>{
  let root,cur,uid=0;
  const mk=(tag,cls,html)=>{const e=document.createElement(tag);if(cls)e.className=cls;if(html!=null)e.innerHTML=html;return e;};
  function begin(el){root=el;root.innerHTML='';cur=null;uid=0;}
  function group(title,cls){const w=mk('div','cg');if(title)w.append(mk('div','cg-t',esc(L(title))));cur=mk('div','cg-b'+(cls?' '+cls:''));w.append(cur);root.append(w);return cur;}
  const host=()=>cur||group();
  const nid=k=>'c-'+(k||'x')+'-'+(uid++);
  function setP(inp){const p=(inp.value-inp.min)/(inp.max-inp.min)*100;inp.style.setProperty('--p',p+'%');}
  function slider(o){
    const s=o.obj,id=nid(o.key),w=mk('label','ctl');w.htmlFor=id;
    const sp=mk('span',null,esc(L(o.label))),out=mk('output'),inp=mk('input');
    Object.assign(inp,{type:'range',id,min:o.min,max:o.max,step:o.step??0.01,value:s[o.key]});
    const show=()=>{out.textContent=o.fmt?o.fmt(+inp.value):(+inp.value).toFixed(0);setP(inp);};
    inp.addEventListener('input',()=>{s[o.key]=+inp.value;show();o.onInput&&o.onInput(+inp.value);});
    w.append(sp,out,inp);host().append(w);show();
    return {el:w,set(v){inp.value=v;show();},sync(){inp.value=s[o.key];show();}};
  }
  function knob(o){
    const s=o.obj,w=mk('div','knob');w.tabIndex=0;w.setAttribute('role','slider');w.setAttribute('aria-label',L(o.label));
    const NS='http://www.w3.org/2000/svg',svg=document.createElementNS(NS,'svg');svg.setAttribute('viewBox','-32 -32 64 64');
    svg.innerHTML=`<circle r="29" fill="#0b0c0a" stroke="#2c3027"/><path class="trk" fill="none" stroke="#2a2e25" stroke-width="4" stroke-linecap="round"/><path class="arc" fill="none" stroke="${o.col||C.lime}" stroke-width="4" stroke-linecap="round"/><circle r="19" fill="url(#kg)" stroke="#000"/><line class="ind" x1="0" y1="-7" x2="0" y2="-17" stroke="#fff" stroke-width="3" stroke-linecap="round"/>`;
    if(!document.getElementById('kgdef')){const d=document.createElementNS(NS,'svg');d.id='kgdef';d.setAttribute('width',0);d.setAttribute('height',0);d.style.position='absolute';d.innerHTML='<defs><radialGradient id="kg" cx="40%" cy="30%" r="80%"><stop offset="0" stop-color="#4a4f42"/><stop offset="1" stop-color="#16180f"/></radialGradient></defs>';document.body.append(d);}
    const b=mk('b',null,esc(L(o.label))),out=mk('output');w.append(svg,b,out);host().append(w);
    const A0=-135,A1=135,arcP=(a0,a1)=>{const p=a=>[Math.sin(a*Math.PI/180)*25,-Math.cos(a*Math.PI/180)*25];const[x0,y0]=p(a0),[x1,y1]=p(a1);return`M${x0} ${y0}A25 25 0 ${a1-a0>180?1:0} 1 ${x1} ${y1}`;};
    svg.querySelector('.trk').setAttribute('d',arcP(A0,A1));
    const show=()=>{const t=(s[o.key]-o.min)/(o.max-o.min),a=A0+(A1-A0)*clamp(t);
      svg.querySelector('.arc').setAttribute('d',arcP(A0,Math.max(A0+.5,a)));svg.querySelector('.ind').setAttribute('transform',`rotate(${a})`);
      out.textContent=o.fmt?o.fmt(s[o.key]):Math.round(s[o.key]);w.setAttribute('aria-valuenow',s[o.key]);};
    const setV=v=>{if(o.wrap){const r=o.max-o.min;v=((v-o.min)%r+r)%r+o.min;}s[o.key]=clamp(v,o.min,o.max);show();o.onInput&&o.onInput(s[o.key]);};
    let drag=null;
    w.addEventListener('pointerdown',e=>{drag={y:e.clientY,x:e.clientX,v:s[o.key]};w.setPointerCapture(e.pointerId);});
    w.addEventListener('pointermove',e=>{if(!drag)return;const d=(drag.y-e.clientY)+(e.clientX-drag.x)*.5;setV(drag.v+d/160*(o.max-o.min));});
    w.addEventListener('pointerup',()=>drag=null);w.addEventListener('pointercancel',()=>drag=null);
    w.addEventListener('dblclick',()=>{if(o.reset!=null)setV(o.reset);});
    w.addEventListener('wheel',e=>{e.preventDefault();setV(s[o.key]-Math.sign(e.deltaY)*(o.max-o.min)/40);},{passive:false});
    w.addEventListener('keydown',e=>{const st=(o.max-o.min)/40;if(e.key==='ArrowUp'||e.key==='ArrowRight'){setV(s[o.key]+st);e.preventDefault();}if(e.key==='ArrowDown'||e.key==='ArrowLeft'){setV(s[o.key]-st);e.preventDefault();}});
    show();return {el:w,sync:show};
  }
  function button(o){const b=mk('button','btn'+(o.cls?' '+o.cls:''),esc(L(o.label)));b.type='button';b.id=nid('b');b.addEventListener('click',()=>o.onClick(b));host().append(b);return b;}
  function hold(o){ // pressed while held: for "pump" style inputs
    const b=mk('button','btn'+(o.cls?' '+o.cls:''),esc(L(o.label)));b.type='button';b.id=nid('h');
    const on=v=>{o.obj[o.key]=v;b.classList.toggle('on',v);};
    b.addEventListener('pointerdown',e=>{b.setPointerCapture(e.pointerId);on(true);});
    ['pointerup','pointercancel','pointerleave'].forEach(t=>b.addEventListener(t,()=>on(false)));
    host().append(b);return b;
  }
  function toggle(o){
    const s=o.obj,b=mk('button','tog',`<span>${esc(L(o.label))}</span><i></i>`);b.type='button';b.id=nid(o.key);
    const show=()=>b.setAttribute('aria-pressed',!!s[o.key]);
    b.addEventListener('click',()=>{s[o.key]=!s[o.key];show();o.onChange&&o.onChange(s[o.key]);});
    host().append(b);show();return {el:b,sync:show};
  }
  function seg(o){
    const s=o.obj,w=mk('div','sgrp');w.setAttribute('role','group');
    const bs=o.options.map(([v,l])=>{const b=mk('button',null,esc(L(l)));b.type='button';b.id=nid(o.key);b.addEventListener('click',()=>{s[o.key]=v;show();o.onChange&&o.onChange(v);});w.append(b);return[v,b];});
    const show=()=>bs.forEach(([v,b])=>b.setAttribute('aria-pressed',s[o.key]===v));
    if(o.label){const t=mk('div','cg-t',esc(L(o.label)));t.style.margin='0 0 -4px';host().append(t);}
    host().append(w);show();return {el:w,sync:show};
  }
  function pad(o){ // a drawing field: o.draw(ctx,w,h) paints it, o.on(type,u,v) gets pointer input in 0..1
    const cv=mk('canvas','pad');cv.style.aspectRatio=o.aspect||'1.6';host().append(cv);
    const ctx=cv.getContext('2d');let W=0,H=0;
    const fit=()=>{const r=cv.getBoundingClientRect(),d=Math.min(2,devicePixelRatio||1);W=r.width;H=r.height;if(!W)return;cv.width=Math.round(W*d);cv.height=Math.round(H*d);ctx.setTransform(d,0,0,d,0,0);};
    const pos=e=>{const r=cv.getBoundingClientRect();return[clamp((e.clientX-r.left)/r.width),clamp((e.clientY-r.top)/r.height)];};
    let down=false;
    cv.addEventListener('pointerdown',e=>{down=true;cv.setPointerCapture(e.pointerId);o.on&&o.on('down',...pos(e));});
    cv.addEventListener('pointermove',e=>{o.on&&o.on(down?'drag':'move',...pos(e));});
    cv.addEventListener('pointerup',e=>{down=false;o.on&&o.on('up',...pos(e));});
    cv.addEventListener('pointerleave',()=>{o.on&&o.on('leave',0,0);});
    const api={el:cv,draw(){if(!W||cv.width<2)fit();if(W)o.draw(ctx,W,H);}};
    new ResizeObserver(()=>{fit();api.draw();}).observe(cv);
    return api;
  }
  function readouts(items){const w=mk('div','ro');const els=items.map(([l])=>{const d=mk('div',null,`<small>${esc(L(l))}</small><b>–</b>`);w.append(d);return d.querySelector('b');});host().append(w);return{set(i,v){if(els[i].textContent!==v)els[i].textContent=v;}};}
  function note(t,cls){const p=mk('p','note'+(cls?' '+cls:''),esc(L(t)));host().append(p);return p;}
  return {begin,group,slider,knob,button,hold,toggle,seg,pad,readouts,note,mk};
})();

const ICON={
  cam:'<path d="M3 8h4l2-3h6l2 3h4v11H3z"/><circle cx="12" cy="13" r="3.5"/>',
  web:'<rect x="3" y="4" width="18" height="13" rx="2"/><path d="M8 21h8M12 17v4"/>',
  data:'<path d="M4 19V9M10 19V5M16 19v-7M22 19H2"/>',
  person:'<circle cx="12" cy="6" r="3"/><path d="M6 21v-5a6 6 0 0 1 12 0v5"/>',
  crowd:'<circle cx="7" cy="7" r="2.5"/><circle cx="17" cy="7" r="2.5"/><circle cx="12" cy="5" r="2.5"/><path d="M2 20v-4a5 5 0 0 1 7-4.5M22 20v-4a5 5 0 0 0-7-4.5M7 21v-4a5 5 0 0 1 10 0v4"/>',
  clock:'<circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/>',
  wave:'<path d="M7 11V5a1.5 1.5 0 0 1 3 0v5M10 10V3.5a1.5 1.5 0 0 1 3 0V10M13 10V5a1.5 1.5 0 0 1 3 0v6M16 11V8a1.5 1.5 0 0 1 3 0v6a7 7 0 0 1-7 7h-1a7 7 0 0 1-5-2.5L3 15a1.5 1.5 0 0 1 2.3-2L7 15"/>',
  pencil:'<path d="M4 20l4-1 11-11-3-3L5 16z"/>',
  bolt:'<path d="M13 2 4 14h7l-1 8 9-12h-7z"/>',
  drop:'<path d="M12 3s7 7.5 7 12a7 7 0 0 1-14 0c0-4.5 7-12 7-12z"/>',
  star:'<path d="m12 3 2.6 5.6 6 .7-4.5 4.1 1.2 6L12 16.5 6.7 19.4l1.2-6L3.4 9.3l6-.7z"/>',
  map:'<path d="M3 6l6-2 6 2 6-2v14l-6 2-6-2-6 2z M9 4v14M15 6v14"/>',
  flake:'<path d="M12 2v20M3.3 7l17.4 10M3.3 17 20.7 7M9 4l3 2 3-2M9 20l3-2 3 2"/>',
};
const icon=k=>`<svg viewBox="0 0 24 24" aria-hidden="true">${ICON[k]||''}</svg>`;
