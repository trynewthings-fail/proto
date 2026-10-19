#!/usr/bin/env node
/* Kontroll av idéerna utan webbläsare (inget npm install behövs).
   Användning:  node window-wall/tools/check.mjs          → alla idéer i ideas/index.js
                node window-wall/tools/check.mjs bubblor  → bara ideas/bubblor.js
   Laddar motorn och idéerna i en låtsasduk, kontrollerar metadata och receptkort (båda språken)
   och kör varje idé i ca 10 simulerade sekunder med folk på torget. Fel ger exit 1. */
import fs from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';
import {fileURLToPath} from 'node:url';

const ROOT=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
const only=process.argv.slice(2);
const errors=[],warnings=[];

/* --- låtsaswebbläsare --- */
const noop=()=>{};
const grad={addColorStop:noop};
function fakeCtx(w,h){
  const base={canvas:{width:w,height:h},createLinearGradient:()=>grad,createRadialGradient:()=>grad,createConicGradient:()=>grad,createPattern:()=>({}),
    getImageData:(x,y,ww,hh)=>({data:new Uint8ClampedArray(Math.max(1,ww*hh)*4)}),measureText:t=>({width:String(t).length*8}),
    setLineDash:noop,getLineDash:()=>[],isPointInPath:()=>false,getTransform:()=>({a:1,b:0,c:0,d:1,e:0,f:0})};
  return new Proxy(base,{get:(t,k)=>k in t?t[k]:noop,set:(t,k,v)=>{t[k]=v;return true;}});
}
const document={createElement:()=>{const c={width:300,height:150,style:{}};c.getContext=()=>fakeCtx(c.width,c.height);return c;},fonts:null};
class Path2D{constructor(){}moveTo(){}lineTo(){}quadraticCurveTo(){}bezierCurveTo(){}closePath(){}arc(){}rect(){}ellipse(){}roundRect(){}}
const loggade=[];
const ctx={document,Path2D,Math,Date,JSON,URLSearchParams,location:{search:'',hash:''},performance:{now:()=>Date.now()},setTimeout,clearTimeout,
  console:{log:noop,warn:noop,info:noop,error:(...a)=>loggade.push(a.map(x=>x&&x.stack?String(x.stack).split('\n').slice(0,3).join('\n    '):String(x)).join(' '))}};
ctx.window=ctx;vm.createContext(ctx);
const run=f=>vm.runInContext(fs.readFileSync(path.join(ROOT,f),'utf8'),ctx,{filename:f});

for(const f of ['config/fasad.js','motor/stilar.js','motor/rita.js','motor/indata.js','motor/motor.js','motor/ww.js']){
  try{run(f);}catch(e){console.error(`✗ ${f} kraschade: ${e.message}`);process.exit(1);}
}
const N=ctx.Nattfonster,W=ctx.WW,I=ctx.Indata;
I.sim.tathet=30;
for(let i=0;i<4;i++)I.satt('test'+i,0.4+i*1.4,1.2+i*0.9,'test',i%2?1.2:1.75);

/* --- vilka filer --- */
try{run('ideas/index.js');}catch(e){errors.push(`ideas/index.js: ${e.message}`);}
const listed=Array.isArray(ctx.IDEA_FILES)?[...ctx.IDEA_FILES]:[];
const onDisk=fs.readdirSync(path.join(ROOT,'ideas')).filter(f=>f.endsWith('.js')&&!f.startsWith('_')&&f!=='index.js').map(f=>f.slice(0,-3));
for(const f of onDisk)if(!listed.includes(f))errors.push(`ideas/${f}.js finns men saknas i ideas/index.js`);
for(const f of listed)if(!onDisk.includes(f))errors.push(`ideas/index.js listar "${f}" men ideas/${f}.js saknas`);
listed.forEach((f,i)=>{if(listed.indexOf(f)!==i)errors.push(`ideas/index.js listar "${f}" två gånger`);});
const files=(only.length?only:listed).filter(f=>onDisk.includes(f));

/* --- metadata --- */
const ICON=k=>k in W.ICONS;
const tva=v=>v&&typeof v==='object'&&typeof v.sv==='string'&&v.sv.trim()&&typeof v.en==='string'&&v.en.trim();
const tvaEllerText=v=>typeof v==='string'?!!v.trim():tva(v);
function validera(s,file){
  const e=m=>errors.push(`${file}: ${m}`);
  const m=W.meta(s),p=m.pitch||{};
  if(m.id!==file)e(`id "${m.id}" ska vara samma som filnamnet "${file}"`);
  if(!/^[a-z0-9-]+$/.test(m.id||''))e('id: små bokstäver, siffror och bindestreck');
  if(!W.CATS.some(c=>c.id===m.cat))e(`cat ska vara en av ${W.CATS.map(c=>c.id).join(', ')}`);
  if(typeof m.by!=='string'||!m.by.trim())e('by saknas (förnamnet på den som bad om idén)');
  if(!W.STEAM[m.steam])e('steam ska vara en av S T E A M');
  for(const k of ['name','short','fraga','verb'])if(!tva(m[k]))e(`${k} ska vara { sv, en }`);
  if(s.ww&&m.short&&m.short.en&&m.short.en.length>18)warnings.push(`${file}: short är lång; menyknappen vill ha 1–2 ord`);
  if(!s.ww&&!(s.en&&s.en.titel))e('Nattfönster-scen saknar en: { titel, fraga, verb }');
  if(!m.pitch){e('pitch saknas');return;}
  for(const k of ['tagline','trick'])if(!tva(p[k]))e(`pitch.${k} ska vara { sv, en }`);
  if(!tvaEllerText(p.round))e('pitch.round ska vara { sv, en }');
  if(!Array.isArray(p.players)||!ICON(p.players[0])||!tvaEllerText(p.players[1]))e('pitch.players ska vara [ikon, etikett] med ikon person/group/crowd');
  if(!W.MODE[p.mode])e(`pitch.mode ska vara en av ${Object.keys(W.MODE).join(', ')}`);
  for(const k of ['input','needs']){if(!Array.isArray(p[k])||!p[k].length)e(`pitch.${k} ska vara en lista med [ikon, { sv, en }]`);
    else p[k].forEach(([i,l])=>{if(!ICON(i))e(`pitch.${k}: okänd ikon "${i}"`);if(!tvaEllerText(l))e(`pitch.${k}: etiketten ska vara { sv, en }`);});}
  if(!Array.isArray(p.for)||!p.for.length||p.for.some(a=>!W.AUD[a]))e(`pitch.for ska använda ${Object.keys(W.AUD).join(', ')}`);
  if(!Array.isArray(p.how)||p.how.length<1||p.how.length>4||p.how.some(h=>!tva(h)))e('pitch.how ska ha 1–4 steg, vart och ett { sv, en }');
  if(!Array.isArray(p.open)||p.open.some(h=>!tva(h)))e('pitch.open ska vara en lista med { sv, en }');
  const me=p.meters||{};for(const k of ['read','crowd','effort'])if(!(Number.isInteger(me[k])&&me[k]>=1&&me[k]<=5))e(`pitch.meters.${k} ska vara 1–5`);
}

/* --- kör --- */
for(const file of files){
  const fore=N.scener.length,felFore=errors.length;
  const src=fs.readFileSync(path.join(ROOT,'ideas',file+'.js'),'utf8');
  const kb=Buffer.byteLength(src)/1024,rader=src.split('\n').length;
  if(kb>40)errors.push(`${file}: ${kb.toFixed(1)} KB, över gränsen 40 KB`);else if(kb>25)warnings.push(`${file}: ${kb.toFixed(1)} KB (de flesta idéer ryms i 10–20 KB)`);
  loggade.length=0;
  try{run(`ideas/${file}.js`);}catch(e){errors.push(`${file}: kraschade vid laddning: ${e.message}`);continue;}
  if(N.scener.length!==fore+1){errors.push(`${file}: ska registrera exakt en idé (WW.register eller Nattfonster.registrera)`+(loggade.length?'\n    '+loggade.join('\n    '):''));continue;}
  const s=N.scener[fore];
  validera(s,file);
  for(const sp of ['sv','en']){W.sprak=sp;N.ctx.sprak=sp;}
  W.sprak=N.ctx.sprak='sv';
  try{
    N.aktivera(s.id);N.stega(40,1/30);
    if(!N.aktiv||N.aktiv.id!==s.id)errors.push(`${file}: idén startade inte`);
    loggade.length=0;
    N.stega(300,1/30);
    if(s.ww){const d=s.ww;if(typeof d.hud()!=='string')errors.push(`${file}: hud() ska returnera en sträng`);
      for(let i=0;i<15;i++){d.cast&&d.cast(i);d.fig&&d.fig(i,5);}d.panel&&d.panel();}
    W.klick(s.id,1.0,1.0);N.stega(5,1/30);
    // testknapparna (s.knappar) körs inte här: de kan behöva ljud eller andra webbläsar-API:er
    if(loggade.length)errors.push(`${file}: körfel: ${loggade[0]}`);
  }catch(err){errors.push(`${file}: körfel: ${err.message}\n    ${String(err.stack).split('\n').slice(1,3).join('\n    ')}`);}
  console.log(`${errors.length>felFore?'✗':'✓'} ${file} (${rader} rader, ${kb.toFixed(1)} KB, ${s.ww?'WW':'Nattfönster'})`);
}

for(const w of warnings)console.log('⚠ '+w);
if(errors.length){console.error('\n✗ '+errors.join('\n✗ '));process.exit(1);}
console.log(`\nAllt OK: ${files.length} idé(er) kontrollerade.`);
