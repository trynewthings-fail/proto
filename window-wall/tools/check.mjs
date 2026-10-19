#!/usr/bin/env node
/* Headless smoke test for Window Wall ideas. No browser or npm install needed.
   Usage:  node window-wall/tools/check.mjs            → every idea listed in ideas/index.js
           node window-wall/tools/check.mjs bubbles    → only ideas/bubbles.js
   It loads core.js plus the ideas into a fake canvas, validates each idea's fields
   and pitch card, and runs init/update/draw/hud for ~10 simulated seconds. */
import fs from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';
import {fileURLToPath} from 'node:url';

const ROOT=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
const only=process.argv.slice(2);
const errors=[],warnings=[];

/* --- fake browser --- */
const noop=()=>{};
const grad={addColorStop:noop};
function fakeCtx(w,h){
  const base={canvas:{width:w,height:h},createLinearGradient:()=>grad,createRadialGradient:()=>grad,createPattern:()=>null,
    getImageData:(x,y,ww,hh)=>({data:new Uint8ClampedArray(ww*hh*4)}),measureText:t=>({width:String(t).length*8}),
    setLineDash:noop,getLineDash:()=>[],isPointInPath:()=>false};
  return new Proxy(base,{get:(t,k)=>k in t?t[k]:noop,set:(t,k,v)=>{t[k]=v;return true;}});
}
const document={createElement:()=>{const c={width:300,height:150};c.getContext=()=>fakeCtx(c.width,c.height);return c;}};
class Path2D{constructor(){}}
const ctx={document,Path2D,console,Math,Date,JSON,performance:{now:()=>Date.now()},setTimeout,clearTimeout};
ctx.window=ctx;vm.createContext(ctx);
const run=f=>vm.runInContext(fs.readFileSync(path.join(ROOT,f),'utf8'),ctx,{filename:f});

run('core.js');
const W=ctx.WW;
// a few people on the plaza so depth-cam ideas have someone to react to
for(let i=0;i<8;i++)W.people.push({x:W.SX0+i*0.7,z:3+i%4,vx:i%3?0.3:0,walk:i});

/* --- which files --- */
try{run('ideas/index.js');}catch(err){errors.push(`ideas/index.js: ${err.message}`);}
const listed=Array.isArray(W.IDEA_FILES)?[...W.IDEA_FILES]:[];
const onDisk=fs.readdirSync(path.join(ROOT,'ideas')).filter(f=>f.endsWith('.js')&&!f.startsWith('_')&&f!=='index.js').map(f=>f.slice(0,-3));
for(const f of onDisk)if(!listed.includes(f))errors.push(`ideas/${f}.js exists but its id is missing from ideas/index.js`);
for(const f of listed)if(!onDisk.includes(f))errors.push(`ideas/index.js lists "${f}" but ideas/${f}.js is missing`);
listed.forEach((f,i)=>{if(listed.indexOf(f)!==i)errors.push(`ideas/index.js lists "${f}" twice`);});
const files=(only.length?only:listed).filter(f=>onDisk.includes(f));

/* --- validation --- */
const ICON=k=>k in W.ICONS;
function validate(d,file){
  const e=m=>errors.push(`${file}: ${m}`),warn=m=>warnings.push(`${file}: ${m}`);
  if(!d||typeof d!=='object'){e('WW.register must return the idea object');return false;}
  if(d.id!==file)e(`id "${d.id}" must match the file name "${file}"`);
  if(!/^[a-z0-9-]+$/.test(d.id||''))e('id must be lowercase letters, digits and dashes');
  if(!W.CATS.some(c=>c.id===d.cat))e(`cat must be one of ${W.CATS.map(c=>c.id).join(', ')}`);
  for(const k of ['by','name','short'])if(typeof d[k]!=='string'||!d[k].trim())e(`missing "${k}"`);
  if(d.short&&d.short.length>18)warn('short is long; the menu pill wants 1–2 words');
  for(const k of ['init','update','draw','hud'])if(typeof d[k]!=='function')e(`missing ${k}()`);
  const p=d.pitch||{};
  if(!d.pitch)e('missing pitch');
  for(const k of ['tagline','round','trick'])if(typeof p[k]!=='string'||!p[k])e(`pitch.${k} must be a string`);
  if(!Array.isArray(p.players)||!ICON(p.players[0]))e('pitch.players must be [icon, label], icon one of person/group/crowd');
  if(!W.MODE[p.mode])e(`pitch.mode must be one of ${Object.keys(W.MODE).join(', ')}`);
  for(const k of ['input','needs']){if(!Array.isArray(p[k])||!p[k].length)e(`pitch.${k} must be a non-empty list of [icon, label]`);
    else p[k].forEach(([i,l])=>{if(!ICON(i))e(`pitch.${k}: unknown icon "${i}" (see WW.ICONS)`);if(!l)e(`pitch.${k}: empty label`);});}
  if(!Array.isArray(p.for)||!p.for.length||p.for.some(a=>!W.AUD[a]))e(`pitch.for must use ${Object.keys(W.AUD).join(', ')}`);
  if(!Array.isArray(p.how)||p.how.length<1||p.how.length>4)e('pitch.how must have 1–4 steps');
  if(!Array.isArray(p.open))e('pitch.open must be a list');
  const m=p.meters||{};for(const k of ['read','crowd','effort'])if(!(Number.isInteger(m[k])&&m[k]>=1&&m[k]<=5))e(`pitch.meters.${k} must be 1–5`);
  return true;
}

/* --- run --- */
for(const file of files){
  const before=W.ideas.length,errBefore=errors.length;
  const src=fs.readFileSync(path.join(ROOT,'ideas',file+'.js'),'utf8');
  const kb=Buffer.byteLength(src)/1024,lines=src.split('\n').length;
  if(kb>20)errors.push(`${file}: ${kb.toFixed(1)} KB, over the 20 KB budget`);else if(kb>12)warnings.push(`${file}: ${kb.toFixed(1)} KB (aim for under 12 KB)`);
  try{run(`ideas/${file}.js`);}catch(err){errors.push(`${file}: crashed while loading: ${err.message}`);continue;}
  const d=W.ideas[before];
  if(W.ideas.length!==before+1){errors.push(`${file}: must call WW.register exactly once`);continue;}
  if(!validate(d,file))continue;
  try{
    d.init();let T=0;
    for(let i=0;i<600;i++){const dt=1/60;T+=dt;d.update(dt);d.draw(T);}
    if(typeof d.hud()!=='string')errors.push(`${file}: hud() must return a string`);
    for(let i=0;i<15;i++){d.cast&&d.cast(i);d.fig&&d.fig(i,T);}
    d.panel&&d.panel();d.click&&d.click(W.SW/2,W.SH/2);d.exit&&d.exit();
    d.init();d.update(0.05);d.draw(T);
  }catch(err){errors.push(`${file}: runtime error: ${err.message}\n    ${String(err.stack).split('\n').slice(1,3).join('\n    ')}`);}
  console.log(`${errors.length>errBefore?'✗':'✓'} ${file} (${lines} lines, ${kb.toFixed(1)} KB)`);
}
const ids=W.ideas.map(d=>d&&d.id);ids.forEach((id,i)=>{if(ids.indexOf(id)!==i)errors.push(`duplicate id "${id}"`);});

for(const w of warnings)console.log('⚠ '+w);
if(errors.length){console.error('\n✗ '+errors.join('\n✗ '));process.exit(1);}
console.log(`\nAll good: ${files.length} idea(s) checked.`);
