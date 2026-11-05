// The twin layer for "Utforska fritt": one card per installation (data/installations.json → web),
// with (1) its Unreal objects lit up and the camera on it, (2) a "Prova" control that imitates the
// visitor, (3) the signal route animated through the model, (4) its story. Every event — from a
// control, a live MQTT connection or a log replay — goes through the same bus and plays the same route.
import * as THREE from 'three';
import { ripple } from './life.js';
import { HOPS, enter as hopEnter } from './scales.js';
import { bus, connectLive, parseLog, replay } from './bus.js';
import { W, FIX, DEV, HOST, HUBP, C, PIPE_FIX, TUBES } from './world.js';
import * as SG from './signals.js';
import { MEDIA } from './media.js';

const $ = (s, el = document) => el.querySelector(s);
const V = (x, y, z) => new THREE.Vector3(x, y, z);
const esc = (s) => String(s ?? '').replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
const inl = (s) => esc(s).replace(/`([^`]+)`/g, '<code>$1</code>').replace(/\*\*([^*]+)\*\*/g, '<b>$1</b>');
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const NODE = { dev: 'sensor', host: 'dator', svc: 'tnt', fix: 'ljus', spk: 'högtalare', remote: 'moln', screen: 'skärm', local: 'lokalt' };
const CONF = { belagd: 'belagd', delvis: 'delvis belagd', antagen: 'antagen', okand: 'okänd' };
const EVID = {
  belagd: 'läst direkt i en källa: live-systemet, koden eller fallstudien',
  delvis: 'en del är läst i en källa, en del är härlett',
  antagen: 'härlett eller rimligt antagande, inte bekräftat',
  okand: 'vet vi inte än',
};
const QUESTIONS = ['Vem bestämmer vad en AI får göra?', 'Kan en AI vara kreativ?', 'Vad ska vi aldrig låta en AI bestämma?', 'Skulle du lita på en AI-läkare?', 'Vem äger det en AI skapar?'];
const SHOT_D = { dialogen: 17, milight: 22, ljudrummet: 20, vaxthuset: 14, ljudkonst: 26, 'tvivlarnas-kulle': 12, social: 12 };
const GADGET = { phone: 'telefonen', telefon: 'telefonen', controller: 'handkontrollen', handkontroll: 'handkontrollen', headphones: 'hörlurarna', hörlurar: 'hörlurarna', camera: 'kameran', kamera: 'kameran' };
const CLIPS = ['”Börja med att lyssna på de unga.”', '”Sluta slänga mat.”', '”Fortsätt bygga i trä.”', '”Börja cykla till jobbet.”'];

let T, I = {}, ROOMS = {}, F, scene, flyTo, worldHop, ensureExplore, onPick, onStory, cur = null, playing = new Map();
const hl = {};   // installation id → highlight mesh

// ── (1) visual: light up the installation's own actors from the Unreal model ──
// the highlight follows the story's accent (a station's colour, otherwise lime)
let accent = C.lime;
export function setAccent(c) { accent = c ?? C.lime; HL_MAT.color.set(accent); TUBES.u.uPulseCol.value.set(accent); SG.setAccent(accent); }
const HL_MAT = new THREE.MeshBasicMaterial({ color: C.lime, transparent: true, opacity: 0.42, depthWrite: false, polygonOffset: true, polygonOffsetFactor: -2, polygonOffsetUnits: -2 });
function highlightMesh(id, M) {
  if (hl[id] !== undefined) return hl[id];
  const names = new Set(I[id].web?.visual?.actors || []);
  const parts = M.actors.filter((a) => names.has(a.name));
  if (!parts.length) return (hl[id] = null);
  const src = W.model.geometry, idx = src.index.array;
  const n = parts.reduce((s, a) => s + a.i[1], 0), out = new Uint32Array(n);
  let o = 0; for (const a of parts) { out.set(idx.subarray(a.i[0], a.i[0] + a.i[1]), o); o += a.i[1]; }
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', src.attributes.position); g.setIndex(new THREE.BufferAttribute(out, 1));
  const m = new THREE.Mesh(g, HL_MAT); m.visible = false; m.renderOrder = 2; F.add(m);
  return (hl[id] = m);
}

// ── (3) the route: node keys → positions in the floor frame ──
function nodePos(key, inst, k, q) {
  const [type, name] = [key.slice(0, key.indexOf(':')), key.slice(key.indexOf(':') + 1)];
  const base = V(inst.pos.x, 1.3, inst.pos.z), off = (j) => base.clone().add(V(Math.cos(j * 2.1) * 0.7, 0.4 + (j % 3) * 0.25, Math.sin(j * 2.1) * 0.7));
  switch (type) {
    case 'dev': return name === 'speech' ? W.pipes[q ?? 4] : DEV[name]?.pos || off(k);
    case 'host': return HOST[name]?.pos || off(k);
    case 'svc': return W.svc[name]?.pos || HUBP.clone();
    case 'fix': return FIX[name]?.pos || off(k);
    case 'spk': return W.speakers?.[name] || off(k);
    case 'screen': { const m = Object.values(MEDIA).find((x) => x.inst === inst.id && (!x.host || name !== 'resultat')); return m ? m.mesh.position.clone() : off(k); }
    case 'remote': return null;
    default: return off(k);
  }
}
function arc(a, b) { const m = a.clone().lerp(b, 0.5); m.y += 0.6 + a.distanceTo(b) * 0.18; return new THREE.QuadraticBezierCurve3(a.clone(), m, b.clone()); }
const SPK = (name, id) => name === 'mitten' ? '⚡ åska' : name === 'blommor' ? (id === 'sag-ja' ? '♪ psalmton' : '♪ ljud från rum 2–3') : '♪ fågel';
function arrive(key, p, ev) {
  const [type, name] = [key.slice(0, key.indexOf(':')), key.slice(key.indexOf(':') + 1)];
  if (type === 'fix') { SG.flash(name); ev.lit?.(); }
  else if (type === 'host') SG.blinkHost(name, 900);
  else if (type === 'svc') SG.svcBlink(name);
  else if (type === 'spk') { SG.pop(F, p, SPK(name, ev.id), 1600); if (name === 'mitten') SG.tubeThunder(); }
  else if (type === 'local' || type === 'screen' || (type === 'dev' && name.startsWith('?'))) SG.pop(F, p, name.replace(/^\?/, '? '), 1600);
}
async function playRoute(id, ev = {}, { onStep } = {}) {
  const inst = I[id], q0 = ev.q;
  const route = (inst.web?.route || []).map((k) => (id === 'dialogen' && q0 != null && k === 'fix:Dialog 1234' ? 'fix:' + PIPE_FIX[q0] : k));
  if (!route.length) return;
  if (id === 'vaxthuset' && ev.topic === 'cloud' && ev.src === 'sim') {   // the 2 s rule: the cloud and greenhouse blink together, thunder plays
    SG.flash('Tak+Cloud'); SG.flash('Växthus'); setTimeout(() => { SG.pop(F, W.speakers.mitten, '⚡ åska', 1600); SG.tubeThunder(); }, 250);
    return;
  }
  ev.id = id;
  const now = performance.now();
  if (now - (playing.get(id) || 0) < (ev.src === 'sim' ? 250 : 900)) return;   // don't stack identical bursts
  playing.set(id, now);
  HL_MAT.opacity = 0.2; clearTimeout(playRoute.hl); playRoute.hl = setTimeout(() => { HL_MAT.opacity = 0.42; }, 4200);
  const q = ev.q;
  const P = route.map((k, j) => nodePos(k, inst, j, q));
  const first = P[0] || V(inst.pos.x, 1.3, inst.pos.z);
  if (ev.topic && !ev.topic.startsWith('local/')) SG.pop(F, first, `${ev.topic} ${ev.payload ?? ''}`.slice(0, 64), 2200);
  if (route[0].startsWith('fix:')) { SG.flash(route[0].slice(4)); ev.lit?.(); }
  onStep?.(0);
  for (let j = 1; j < route.length; j++) {
    const a = P[j - 1] || P[j - 2], b = P[j], ka = route[j - 1], kb = route[j];
    if (kb === 'remote:berget') {   // out of the building to the AI cloud and back
      await SG.send(SG.arcWorld(F.localToWorld(a.clone()), W.berget), scene, { dur: 1600, size: 0.022 });
      SG.pop(scene, W.berget, 'Berget AI · transkribering + bedömning', 2000); onStep?.(j);
      const nb = P[j + 1]; if (nb) { await SG.send(SG.arcWorld(W.berget, F.localToWorld(nb.clone())), scene, { dur: 1600, size: 0.022 }); }
      continue;
    }
    if (!a || !b) continue;
    const thread = ka.startsWith('fix:') && kb === 'fix:Tak+Cloud' && W.threads?.[ka.slice(4)];
    const quick = kb.startsWith('svc:') || kb === 'host:resolume';   // the hub and Resolume pass the message on in no time
    await SG.send(thread || arc(a, b), F, { dur: thread ? 650 : quick ? 240 : 520 + Math.min(500, a.distanceTo(b) * 30) });
    arrive(kb, b, ev); onStep?.(j);
  }
}

// ── events → installations ──
const PATTERNS = [];
function buildPatterns() {
  const add = (re, id, extra = {}) => PATTERNS.push({ re, id, ...extra });
  for (const inst of Object.values(I)) {
    const t = inst.web?.control?.publishes?.topic; if (!t) continue;
    for (const part of t.split(' / ')) add(new RegExp('^' + part.replace(/[.*+?^$()|[\]\\]/g, '\\$&').replace('{n}', '(\\d+)') + '$'), inst.id);
  }
  add(/^local\/(.+)$/, null, { local: true });
  add(/^recycling\/doing$/, 'atervinning'); add(/^skill\/engelska$/, 'kompetenstaltet'); add(/^pir[14]$/, 'social'); add(/^pir2$/, 'kompetenstaltet');
  add(/^ljudkonst\//, 'ljudkonst'); add(/^housingccw$/, 'snurra-huset'); add(/^trad\//, 'skogen'); add(/^alimak\/trigger$/, 'alimak');
  add(/^clean\/spinningboxes$/, 'social'); add(/^ace\//, 'ace'); add(/^intensity\/knob-[23]$/, 'ljudkonst'); add(/^shellies\//, 'lampteremin');
}
function match(topic) {
  for (const p of PATTERNS) { const m = topic.match(p.re); if (m) return { id: p.local ? m[1] : p.id, n: m[1] != null && !p.local ? +m[1] : null }; }
  return null;
}
const json = (s) => { try { return JSON.parse(s); } catch { return null; } };
function feedMedia(id, ev) {
  const p = json(ev.payload) || {};
  const set = (k, f) => MEDIA[k] && f(MEDIA[k].state, MEDIA[k]);
  if (id === 'triangeln') set('bike', (s) => (s.speed = p.speed_kmh ?? s.speed));
  if (id === 'skykraft') set('skykraft', (s) => (s.blow = Math.max(s.blow || 0, 0.9)));
  if (id === 'ace') set('ace', (s, M) => (s.pulse = M.t));
  if (id === 'snurra-huset') set('house', (s) => { s.dir = ev.topic.endsWith('ccw') ? 'ccw' : 'cw'; s.level = p.level ?? s.level; s.pos = p.pos ?? s.pos; s.turns = (s.turns ?? 0) + (s.dir === 'ccw' ? -1 : 1); });
  if (id === 'droneport') set('drone', (s) => { const i = p.option_index ?? ev.n ?? 0; s.votes ||= [34, 51, 22, 18, 27, 30]; s.votes[i]++; s.last = i; });
  if (id === 'sokrates') set('sua', (s, M) => { s.text = QUESTIONS[Math.floor(Math.random() * QUESTIONS.length)]; s.flash = M.t; });
  if (id === 'framtidsbaset') { set('booth', (s, M) => { s.text = 'Inspelat! Skickas för transkribering och moderering…'; s.flash = M.t; }); setTimeout(() => set('player', (s, M) => { s.text = '▶ ' + CLIPS[Math.floor(Math.random() * CLIPS.length)]; s.flash = M.t; }), 4200); }
  if (id === 'atervinning') set('recycle', (s, M) => { s.text = ev.topic.endsWith('doing') ? 'Mums… tugga, tugga…' : `Rap! Ur ${GADGET[String(p || ev.payload).replace(/"/g, '')] || 'prylen'} fick jag Cu · Au · Ag · Pd · Co · Li`; s.flash = M.t; });
  if (id === 'dokumentaren' && p.people != null) set('doc', (s) => (s.people = p.people));
}
let logFn = () => {}, srcState = 'simulerat';
function onEvent(ev) {
  const m = match(ev.topic);
  logFn(ev, m && I[m.id]);
  if (!m || !I[m.id]) return;
  ev.n = m.n; if (m.id === 'dialogen') ev.q = m.n ?? ev.q;
  if (ev.payload === '{"speaking": false}' || ev.payload === '{"speaking":false}') return;
  feedMedia(m.id, ev);
  followUp(m.id, ev);
  ripple(I[m.id].pos, ev.src === 'live' ? 0x7a9a00 : 0x0a0b09);
  const g = gen, step = cur === m.id ? (j) => g === gen && markStep(j) : undefined;
  playRoute(m.id, ev, { onStep: step });
}

// What the switchboard does after an event (wled_switchboard.py, Peder's export): in room 4, 2 s after each event the
// cloud and the greenhouse blink and `cloud` goes out on MQTT, which makes rpi6 thunder; the JA button blinks them
// without `cloud`, and the charger counts once per charge (10 s quiet). Three thunders within 0.5 s: the greenhouse
// answers with a sound of its own. Floden's notes pulse three trees blue. With a live connection the real switchboard
// sends `cloud` itself, so nothing is added.
const CLOUD = new Set(['rutschkanan', 'skykraft', 'sokrates', 'snurra-huset', 'ace', 'kompetenstaltet', 'social', 'droneport', 'elbil', 'triangeln', 'sag-ja']);
let lastEmob = 0, thunders = [];
function followUp(id, ev) {
  if (id === 'vaxthuset') {
    const now = performance.now(); thunders = thunders.filter((t) => now - t < 500); thunders.push(now);
    if (thunders.length >= 3) { thunders = []; SG.pop(F, FIX['Växthus'].pos, '♪ tre åskor: växthuset svarar', 2400); }
    return;
  }
  if (id === 'ljudkonst' && ev.topic === 'ljudkonst/note') { for (const n of ['TNT tree 04', 'TNT tree 02', 'Tree small']) SG.flash(n); return; }
  if ((ev.src && ev.src !== 'sim') || !CLOUD.has(id)) return;   // live and replayed logs already contain the real `cloud`
  if (id === 'elbil') { const now = performance.now(), fresh = now - lastEmob > 10000; lastEmob = now; if (!fresh) return; }
  const g = gen, onCard = cur === id;
  const fire = () => {
    if (onCard && g === gen) markStep(I[id].web.route.length);
    if (id === 'sag-ja') { SG.flash('Tak+Cloud'); SG.flash('Växthus'); if (onCard && g === gen) setTimeout(() => g === gen && markStep(I[id].web.route.length + 1), 600); return; }
    bus.emit({ topic: 'cloud', payload: JSON.stringify(ev.topic), src: ev.src || 'sim' });
    if (onCard) [1, 2].forEach((k) => setTimeout(() => g === gen && markStep(I[id].web.route.length + k), k * 150));
  };
  if (ev.fireAt) { setTimeout(fire, ev.fireAt - performance.now()); return; }   // a set time (the greenhouse's three-at-once demo)
  let done = false;
  const lit = () => { if (done) return; done = true; clearTimeout(fallback); setTimeout(fire, 2000); };
  const fallback = setTimeout(lit, 3000);
  ev.lit = lit;
}
// what the switchboard adds after the route, shown on the card as the last steps
const follow = (id) => !CLOUD.has(id) ? [] : id === 'sag-ja' ? ['+2 s · molnet och växthuset blinkar', 'ingen åska för Ja-knappen'] : ['+2 s · molnet och växthuset blinkar', 'cloud på MQTT', 'åska i mitthögtalaren'];
const routeHTML = (id, route) => route.map((k) => { const t = k.slice(0, k.indexOf(':')); return `<li><span class="nd nd-${NODE[t] || t}">${esc(NODE[t] || t)}</span> ${esc(k.slice(k.indexOf(':') + 1))}</li>`; }).join('')
  + follow(id).map((x) => `<li class="tw-follow"><span class="nd nd-tnt">regel</span> ${esc(x)}</li>`).join('');

// ── (2) "Prova" controls: each imitates what the visitor does and emits through the bus ──
// first call goes through at once, the last one inside the window is sent when it closes (so a slider's final value counts)
const throttle = (fn, ms) => {
  let t = 0, tail = 0, last;
  return (...a) => {
    const n = performance.now(); last = a;
    if (n - t > ms) { t = n; fn(...a); return; }
    clearTimeout(tail); tail = setTimeout(() => { t = performance.now(); fn(...last); }, ms - (n - t));
  };
};
function emitPub(inst, over = {}) {
  const pub = inst.web.control.publishes;
  return bus.emit({ topic: over.topic || pub?.topic.split(' / ')[0] || `local/${inst.id}`, payload: over.payload ?? pub?.payload ?? '', q: over.q, ...(over.fireAt ? { fireAt: over.fireAt } : {}) });
}
const local = (inst, payload = '') => bus.emit({ topic: `local/${inst.id}`, payload });
function controlHTML(c) {
  const opts = (c.options || []).map((o, i) => `<button type="button" class="tw-opt" data-i="${i}">${esc(o)}</button>`).join('');
  const lo = c.range?.[0] ?? 0, hi = c.range?.[1] ?? 100;
  const rng = (n, lbl) => `<label class="tw-r"><span>${lbl || ''}</span><input type="range" data-n="${n}" min="${lo}" max="${hi}" value="${Math.round((lo + hi) / 2)}"><output></output></label>`;
  switch (c.type) {
    case 'knapp': return `<button type="button" class="tw-btn">${esc(c.label)}</button>`;
    case 'växel': return `<label class="tw-tog"><input type="checkbox"> ${esc(c.label)}</label>`;
    case 'reglage': return rng(0, '');
    case 'två reglage': return rng(0, 'sensor 1') + rng(1, 'sensor 2') + `<div class="tw-meter"><i></i><span>harmoni</span></div>`;
    case 'vred': return `<div class="tw-dial"><i></i></div><span class="tw-note">dra runt</span>`;
    case 'yta': return `<div class="tw-pad"><i></i></div>`;
    case 'val': return `<div class="tw-opts">${opts}</div>`;
    case 'val + håll': return `<div class="tw-opts">${opts}</div><button type="button" class="tw-btn tw-hold">håll för att prata</button>`;
    case 'val + knapp': return `<div class="tw-opts">${opts}</div><button type="button" class="tw-btn">spela in</button>`;
    case 'knapp + val': return `<div class="tw-opts">${opts}</div><button type="button" class="tw-btn">åk ner</button>`;
    case 'val + växel': return `<div class="tw-opts">${opts}</div><label class="tw-tog"><input type="checkbox"> rörelse i zonen</label>`;
    case 'reglage + knapp': return rng(0, 'färg') + `<button type="button" class="tw-btn">gå in i rummet</button>`;
    default: return `<span class="tw-note">${esc(c.does || 'ingen kontroll')}</span>`;
  }
}
function wireControl(el, inst) {
  const c = inst.web.control, id = inst.id;
  let opt = 0;
  el.querySelector('.tw-opt')?.classList.add('on');
  el.querySelectorAll('.tw-r input').forEach((r) => { const o = r.nextElementSibling; const f = () => (o.textContent = r.value); r.addEventListener('input', f); f(); });
  el.querySelectorAll('.tw-opt').forEach((b) => b.onclick = () => {
    opt = +b.dataset.i; el.querySelectorAll('.tw-opt').forEach((x) => x.classList.toggle('on', x === b));
    if (id === 'dialogen') {   // the card names the chosen tube's own strip
      const j = inst.web.route.indexOf('fix:Dialog 1234'), li = el.closest('#tw, #card, .tw-try')?.querySelector('.tw-route')?.children[j] || routeEl?.children[j];
      if (li) li.innerHTML = `<span class="nd nd-ljus">ljus</span> ${esc(PIPE_FIX[opt])}`;
    }
    if (c.type === 'val') {
      if (id === 'droneport') emitPub(inst, { topic: `droneport/${opt}`, payload: JSON.stringify({ option_index: opt, label: c.options[opt] }) });
      else if (id === 'atervinning') { bus.emit({ topic: 'recycling/doing', payload: '"' + c.options[opt] + '"' }); setTimeout(() => emitPub(inst, { payload: '"' + c.options[opt] + '"' }), 2600); }
      else if (id === 'kompetenstaltet') emitPub(inst, { topic: opt ? 'skill/engelska' : 'skill/svenska', payload: '"2000"' });
      else local(inst, c.options[opt]);
    }
    if (c.type === 'val + växel') emitPub(inst, { payload: JSON.stringify({ sensor: opt + 1, distance_cm: 38, baseline_cm: 90, delta_cm: 52 }) });
  });
  const btn = el.querySelector('.tw-btn:not(.tw-hold)');
  if (btn) btn.onclick = () => {
    btn.classList.add('hit'); setTimeout(() => btn.classList.remove('hit'), 350);
    if (c.type === 'knapp + val') {   // the slide: only a valid ride counts
      if (opt === 1) { SG.pop(F, DEV.ultraljud1.pos, 'ogiltig åktur, räknas inte', 1800); return; }
      emitPub(inst, { payload: JSON.stringify({ event: 'slide', duration_ms: 1600 + Math.floor(Math.random() * 1600) }) });
    } else if (c.type === 'val + knapp') emitPub(inst, { payload: 'true' });
    else if (c.type === 'reglage + knapp') bus.emit({ topic: 'pir3', payload: '{"motion":true}' });
    else if (id === 'vaxthuset') { const t0 = performance.now(); ['rutschkanan', 'sokrates', 'social'].forEach((s, k) => setTimeout(() => emitPub(I[s], { fireAt: t0 + 3400 + k * 150 }), k * 120)); }
    else emitPub(inst);
  };
  const hold = el.querySelector('.tw-hold');
  if (hold) { hold.onpointerdown = () => { hold.classList.add('hit'); emitPub(inst, { topic: `speech/${opt}`, payload: '{"speaking":true}', q: opt }); const tb = inst.web.tubes?.[opt]; if (tb) SG.pop(F, W.pipes[opt], `${tb.color}: ${tb.question}`, 3200); }; hold.onpointerup = hold.onpointerleave = () => hold.classList.remove('hit'); }
  const tog = el.querySelector('.tw-tog input');
  if (tog) tog.onchange = () => {
    if (id === 'elbil') { if (tog.checked) emitPub(inst, { payload: JSON.stringify({ power: 6.4 }) }); }
    else if (id === 'social' && tog.checked) bus.emit({ topic: 'pir1', payload: '{"motion":true}' });
  };
  // sliders
  const r = el.querySelectorAll('.tw-r input');
  const sliderEmit = throttle((v) => {
    if (id === 'triangeln') emitPub(inst, { payload: JSON.stringify({ speed_ms: +(v / 3.6).toFixed(1), power: Math.round(v * 7), torque: +(v * 0.5).toFixed(1), angular_velocity: +(v / 3.6 / 0.335).toFixed(1) }) });
    else if (id === 'skykraft') { MEDIA.skykraft.state.blow = v / 100; if (v > 70) emitPub(inst); }
    else if (id === 'alimak') { if (v < 40) emitPub(inst, { payload: JSON.stringify({ event: 'trigger', distance_cm: +v }) }); }
    else if (id === 'ljudkonst') emitPub(inst, { payload: `"${v}"` });
    else if (id === 'milight') emitPub(inst, { payload: `"${v}"` });
    else if (id === 'dokumentaren') { MEDIA.doc.state.people = +v; local(inst, JSON.stringify({ people: +v })); }
    else local(inst, v);
  }, id === 'alimak' ? 2000 : 900);
  if (c.type === 'reglage' || c.type === 'reglage + knapp') r[0].addEventListener('input', () => sliderEmit(r[0].value));
  if (c.type === 'två reglage') {
    const meter = el.querySelector('.tw-meter i');
    const harmonyEmit = throttle((s1, s2, h) => emitPub(inst, { payload: JSON.stringify({ sensor1_cm: s1, sensor2_cm: s2, harmony_value: +h.toFixed(2) }) }), 1000);
    const f = () => {
      const s1 = +r[0].value, s2 = +r[1].value, h = Math.max(0, 1 - Math.abs(s1 - s2 * 0.5 - 8) / 18);   // sensor 2 has double sensitivity
      meter.style.width = h * 100 + '%'; meter.classList.toggle('ok', h >= 0.8);
      if (h >= 0.8) harmonyEmit(s1, s2, h);
    };
    r.forEach((x) => x.addEventListener('input', f)); f();
  }
  const dial = el.querySelector('.tw-dial');
  if (dial) {
    let a = 0;
    const turn = throttle((d) => emitPub(inst, { topic: d > 0 ? 'housingcw' : 'housingccw', payload: JSON.stringify({ level: +Math.min(1, Math.abs(d) / 30).toFixed(2), ema: 0.4, pos: ((Math.round(a / 45) % 8) + 8) % 8 }) }), 700);
    let prev = null;   // angle around the dial's centre, so dragging in a circle turns it
    const ang = (e) => { const b = dial.getBoundingClientRect(); return Math.atan2(e.clientY - b.top - b.height / 2, e.clientX - b.left - b.width / 2) * 180 / Math.PI; };
    dial.onpointerdown = (e) => { prev = ang(e); dial.setPointerCapture(e.pointerId); };
    dial.onpointerup = dial.onpointercancel = () => (prev = null);
    dial.onpointermove = (e) => {
      if (prev == null) return;
      const q = ang(e); let d = q - prev; prev = q; d = ((d + 540) % 360) - 180;
      a += d; dial.firstElementChild.style.transform = `rotate(${a}deg)`;
      dial.nextElementSibling.textContent = d >= 0 ? 'medurs → bärnsten' : 'moturs → blått'; turn(d);
    };
  }
  const pad = el.querySelector('.tw-pad');
  if (pad) {
    const tick = throttle(() => local(inst), 2500);
    pad.onpointermove = (e) => {
      const b = pad.getBoundingClientRect(), x = (e.clientX - b.left) / b.width, y = (e.clientY - b.top) / b.height;
      pad.firstElementChild.style.left = x * 100 + '%'; pad.firstElementChild.style.top = y * 100 + '%';
      if (id === 'floden') { const M = MEDIA.river; M.state.hands = [...(M.state.hands || []), { x, y, t: M.t }].slice(-6); tick(); }
      if (id === 'ace') MEDIA.ace.state.head = { x, y };
    };
    if (id === 'ace') pad.onclick = () => emitPub(inst);
  }
}

// the open installation's own screens and walls get a thick lime frame
function frames(id) {
  for (const m of Object.values(MEDIA)) {
    const on = !!id && m.inst === id;
    m.frame?.material.color.set(on ? accent : 0x0a0b09);
    if (m.frame) m.frame.scale.setScalar(on ? 1.02 : 1);
  }
}

// the chapters light up the installation they tell about, the same way as its card (null clears)
export function focus(id) {
  if (cur) return;
  Object.values(hl).forEach((m) => m && (m.visible = false));
  const h = id && I[id] ? highlightMesh(id, T.M) : null; if (h) h.visible = true;
  frames(id && I[id] ? id : null);
}

// ── the card ──
let gen = 0;   // bumps when the card changes, so a route still playing can't mark steps on the next card
let routeEl = null;   // the route list being played: in the Utforska card or inside a story chapter
function markStep(j) {
  routeEl?.querySelectorAll('li').forEach((li, k) => { li.classList.toggle('now', k === j); li.classList.toggle('done', k < j); });
}
const OVERVIEW = [V(-0.5, 0, 2.1), { d: 58, el: 0.82 }];
export function list({ fly = false } = {}) {
  if (fly && cur) flyTo(...OVERVIEW);
  cur = null; gen++; Object.values(hl).forEach((m) => m && (m.visible = false)); frames(null);
  const by = {};
  for (const inst of Object.values(I)) if (inst.web && inst.status !== 'utgick' && inst.type !== 'text') (by[inst.room] ||= []).push(inst);   // project texts live in their station's story
  $('#tw').innerHTML = `<p class="tw-intro">Välj en installation. Du ser dess delar i modellen, kan prova den som en besökare och följa signalen steg för steg.</p>
    <details class="tw-legend"><summary>Hur säkra är uppgifterna?</summary><dl>${Object.entries(EVID).map(([k, v]) => `<dt><span class="ev ev-${k}">${CONF[k]}</span></dt><dd>${v}</dd>`).join('')}</dl></details>` +
    Object.entries(by).map(([r, arr]) => {
      // project cards (from the printed texts) fold away under the room's installations, grouped by category
      const btn = (x) => `<button data-id="${x.id}">${esc(x.name)}<small>${esc(x.type === 'kort' ? x.category || '' : x.web.control.label?.replace(/^–$/, '') || '')}</small></button>`;
      // Framtiden's five stations come first: each opens a story about its cube, installations and project texts
      const st = r === '4' && T.stations ? `<div class="tw-stations">${Object.entries(T.stations).map(([sid, s]) => `<button data-st="${sid}"><i>station</i>${esc(s.name)}<small>${s.inst.length} ${s.inst.length === 1 ? 'installation' : 'installationer'} · ${s.texts.length} projekt</small></button>`).join('')}</div>` : '';
      return `<details class="tw-room"${innerWidth > 900 ? ' open' : ''}><summary><h4>Rum ${r} · ${esc(ROOMS[r]?.name || '')}</h4></summary>${st}<div class="tw-list">${arr.map(btn).join('')}</div></details>`;
    }).join('');
  $('#tw').querySelectorAll('.tw-list button').forEach((b) => b.onclick = () => pick(b.dataset.id));
  $('#tw').querySelectorAll('.tw-stations button').forEach((b) => b.onclick = () => onStory?.(`station:${b.dataset.st}`));
  $('#tw').prepend(storyLinks());
}
// in free mode an installation opens its own story (main.js); without that hook, its card
const pick = (id) => (onPick ? onPick(id) : open(id));
function storyLinks() {
  const d = document.createElement('div'); d.className = 'tw-stories';
  d.innerHTML = '<button data-s="tour"><i>guidad tur</i>Gå utställningen: rum 1 → 4</button><button data-s="brain"><i>berättelse</i>Museum Brain: systemet bakom</button><button data-s="intro"><i>berättelse</i>Introduktionen</button>';
  d.onclick = (e) => { const b = e.target.closest('button'); if (b) onStory?.(b.dataset.s); };
  return d;
}
// a story chapter's "Prova": the installation's control and its signal path, mounted into el
export function mountTry(el, id) {
  const inst = I[id]; if (!inst?.web) return;
  cur = id; gen++;
  const g = gen, step = (j) => g === gen && markStep(j);
  Object.entries(hl).forEach(([k, m]) => m && (m.visible = k === id));
  frames(id);
  const h = highlightMesh(id, T.M); if (h) h.visible = true;
  const w = inst.web, c = w.control, pub = c.publishes;
  el.innerHTML = `
    ${c.type !== 'ingen' ? `<div class="tw-k">Prova${c.label && c.label !== '–' ? ` · ${esc(c.label)}` : ''}</div><div class="tw-ctl">${controlHTML(c)}</div>
    <p class="tw-pub">${pub ? `skickar <code>${esc(pub.topic)}</code>` : 'ingen känd MQTT: lokal kedja'}</p><div class="tw-minilog" aria-live="off"></div>` : ''}
    ${w.route.length ? `<div class="tw-k">Signalen steg för steg <button class="tw-play">▶ spela</button></div>
    <ol class="tw-route">${routeHTML(id, w.route)}</ol>` : ''}`;
  routeEl = el.querySelector('.tw-route');
  el.querySelector('.tw-play')?.addEventListener('click', () => { const ev = pub ? { topic: pub.topic.split(' / ')[0].replace('{n}', '4'), payload: pub.payload, q: 4, src: 'sim' } : { topic: `local/${id}`, src: 'sim' }; feedMedia(id, ev); followUp(id, ev); playRoute(id, ev, { onStep: step }); });
  if (c.type !== 'ingen') wireControl(el.querySelector('.tw-ctl'), inst);
}
// leave a story: the highlight and any route still playing stop
// a label in the model: a sensor fires the installation it belongs to (through the bus, like a visitor would);
// a computer shows what runs on it and for which installations
// the part of the room a route runs through (its in-room nodes): the Prova chapter frames all of it
export function routeBox(id) {
  const inst = I[id], route = inst?.web?.route || [];
  let P = route.filter((k) => !k.startsWith('remote:') && !k.startsWith('svc:')).map((k, j) => nodePos(k, inst, j)).filter(Boolean);
  P = P.filter((p) => p.distanceTo(inst.pos) < 12);   // computers in other rooms would pull the frame away
  if (CLOUD.has(id)) P.push(FIX['Tak+Cloud'].pos, FIX['Växthus'].pos, W.speakers.mitten);
  if (P.length < 2) return null;
  const b = new THREE.Box3().setFromPoints(P), c = b.getCenter(V(0, 0, 0)), r = b.getSize(V(0, 0, 0)).length() / 2;
  return { at: [c.x, Math.min(c.y, 1.2), c.z], r };
}
export function labelClick(key) {
  if (!key) return false;
  const uses = (k) => Object.values(I).filter((x) => x.web?.route?.includes(k));
  if (DEV[key]) { const inst = uses(`dev:${key}`)[0]; if (inst?.web?.control?.publishes) { emitPub(inst); return true; } }
  if (HOST[key]) {
    const names = uses(`host:${key}`).map((x) => x.name);
    SG.pop(F, HOST[key].pos, `${key} · ${HOST[key].role || ''}${names.length ? ' · ' + names.slice(0, 3).join(', ') : ''}`, 3200);
    SG.blinkHost(key, 900);
    return true;
  }
  return false;
}
export function release() { cur = null; gen++; routeEl = null; Object.values(hl).forEach((m) => m && (m.visible = false)); frames(null); }
export function open(id) {
  const inst = I[id]; if (!inst?.web) return;
  ensureExplore?.();
  cur = id; gen++;
  const g = gen, step = (j) => g === gen && markStep(j);
  Object.entries(hl).forEach(([k, m]) => m && (m.visible = k === id));
  frames(id);
  const h = highlightMesh(id, T.M); if (h) h.visible = true;
  const w = inst.web, c = w.control, pub = c.publishes;
  routeEl = null;
  $('#tw').innerHTML = `
    <button class="tw-back">← alla installationer</button>
    <div class="tw-room">Rum ${inst.room} · ${esc(ROOMS[inst.room]?.name || '')} <span class="ev ev-${esc(inst.confidence)}" title="${esc(EVID[inst.confidence] || '')}">${esc(CONF[inst.confidence] || inst.confidence)}</span></div>
    <h3>${esc(inst.name)}</h3>
    <p class="tw-sum">${inl(inst.short || '')}</p>
    <div class="tw-k">Prova${c.label && c.label !== '–' ? ` · ${esc(c.label)}` : ''}</div>
    <div class="tw-ctl">${controlHTML(c)}</div>
    <p class="tw-pub">${pub ? `skickar <code>${esc(pub.topic)}</code>` : 'ingen känd MQTT: lokal kedja'}</p>
    <div class="tw-k">Signalen steg för steg <button class="tw-play">▶ spela</button></div>
    ${w.route.length ? '' : '<p class="tw-none">Ingen känd signalväg ännu.</p>'}<ol class="tw-route">${routeHTML(id, w.route)}</ol>
    ${w.links.length ? `<div class="tw-k">Kopplingar</div><div class="tw-links">${w.links.map((l) => I[l.to] ? `<button data-id="${l.to}">${esc(I[l.to].name)}</button> <span>${esc(l.how)}</span>` : `<span><b>${esc(l.to === '*' ? 'hela utställningen' : 'alla i rum 4')}</b> ${esc(l.how)}</span>`).join('<br>')}</div>` : ''}
    ${HOPS[id] ? `<div class="tw-k">Skalhopp</div><div class="hops">${HOPS[id].map((h, i) => `<button data-h="${i}"><i>zooma ${h.dir}</i>${esc(h.label)}</button>`).join('')}</div>` : ''}
    <div class="tw-k">Berättelsen</div>
    <ol class="tw-beats">${w.beats.map((b) => `<li>${inl(b)}</li>`).join('')}</ol>
    ${w.open.length ? `<div class="tw-k">Osäkert</div><ul class="tw-open">${w.open.map((q) => `<li>${inl(q.replace(/\s*\(F\d+\)/g, ''))}</li>`).join('')}</ul>` : ''}`;
  routeEl = $('#tw .tw-route');
  $('#tw .tw-back').onclick = () => list({ fly: true });
  $('#ctrl').scrollTop = 0;
  if (!w.route.length) $('#tw .tw-play').hidden = true;
  $('#tw .tw-play').onclick = () => { const ev = pub ? { topic: pub.topic.split(' / ')[0].replace('{n}', '4'), payload: pub.payload, q: 4, src: 'sim' } : { topic: `local/${id}`, src: 'sim' }; feedMedia(id, ev); followUp(id, ev); playRoute(id, ev, { onStep: step }); };
  $('#tw').querySelectorAll('.tw-links button').forEach((b) => b.onclick = () => open(b.dataset.id));
  // scale hops: a scene of its own (scales.js), or out into the town in this model (worldHop in main.js)
  worldHop?.(null);
  $('#tw').querySelectorAll('.hops button').forEach((b) => b.onclick = () => {
    const h = HOPS[id][+b.dataset.h];
    if (h.scene) { hopEnter(h.scene, { dir: h.dir }); return; }
    if (b.classList.toggle('back')) { worldHop?.(h.world); b.innerHTML = `<i>zooma in</i>tillbaka till ${esc(inst.name)}`; }
    else open(id);
  });
  wireControl($('#tw .tw-ctl'), inst);
  // camera: face the installation's screen or wall if it has one, otherwise look down at it
  const scr = Object.values(MEDIA).find((m) => m.inst === id && !m.host);
  if (scr) {
    const az = { '-z': Math.PI, '+z': 0, '+x': Math.PI / 2, '-x': -Math.PI / 2 }[scr.n], p = scr.mesh.position, w = scr.a[1] - scr.a[0];
    // big walls head-on from inside the room; small screens from above at an angle so nothing tall gets in the way
    if (w >= 3) flyTo(V(p.x, Math.max(0.4, p.y - 0.5), p.z), { d: id === 'dokumentaren' ? 6.2 : w * 1.2 + 3, el: id === 'dokumentaren' ? 0.3 : 0.42, az });
    else flyTo(V(p.x, 0.8, p.z), { d: 10, el: 1.05, az });
  } else flyTo(V(inst.pos.x, 0.6, inst.pos.z), { d: SHOT_D[id] || 11, el: 0.92 });
}

// ── ambient visitors, through the same bus ──
// With the sketch visitors (life.js) running, an installation fires when a visitor reaches it;
// otherwise (reduced motion) a timer picks installations at random with the same weights.
export const WEIGHTS = { 'sag-ja': 5, social: 6, rutschkanan: 3, triangeln: 3, 'snurra-huset': 3, dialogen: 3, vattentunneln: 3, atervinning: 2, sokrates: 2, skykraft: 2, ace: 2, lampteremin: 2, alimak: 2, droneport: 1, elbil: 1, kompetenstaltet: 1, framtidsbaset: 1 };
let amb = 0, ambOn = false, viaVisitors = false, waveT = 0;
export function fire(id) {
  if (!ambOn || !WEIGHTS[id] || !I[id]) return;
  const pub = I[id].web.control.publishes, q = Math.floor(Math.random() * 10);
  bus.emit({ topic: pub.topic.split(' / ')[0].replace('{n}', id === 'dialogen' ? q : Math.floor(Math.random() * 6)), payload: pub.payload, q, src: 'sim' });
}
export function ambient(on) {
  ambOn = on; clearTimeout(amb); clearInterval(waveT);
  // the forest's idle wave: the switchboard runs it after 15 s of quiet (5 trees × 2.5 s, then 15 s again)
  if (on && I.skogen) waveT = setInterval(() => bus.emit({ topic: 'trad/wave', payload: '"idle"', src: 'sim' }), 27500);
  if (!on || viaVisitors) return;
  const pool = Object.entries(WEIGHTS).flatMap(([k, n]) => Array(n).fill(k)).filter((k) => I[k]);
  const tick = () => { fire(pool[Math.floor(Math.random() * pool.length)]); amb = setTimeout(tick, 1500 * (0.5 + Math.random())); };
  tick();
}

// ── sources: simulated / live MQTT / replay ──
function sources() {
  let liveConn = null, rep = null;
  const st = (s) => { srcState = s; $('#srcState').textContent = s; };
  const ended = (s) => { liveConn = null; $('#liveGo').textContent = 'Anslut'; st(s); };
  $('#liveGo').onclick = () => {
    if (liveConn) { const c = liveConn; liveConn = null; c.close(); ended('simulerat'); return; }
    // live data only: switch the simulated visitors off so nothing invented mixes in
    const amb = $('#ambient'); if (amb.checked) { amb.checked = false; amb.dispatchEvent(new Event('change')); }
    const url = $('#liveUrl').value.trim();
    liveConn = connectLive(url, { onState: (s) => {
      if (!liveConn) return;
      if (s === 'live') st('live · ' + url);
      else if (s === 'ansluter…') st(s);
      else ended(s);
    } });
    $('#liveGo').textContent = 'Koppla från';
  };
  $('#repFile').onchange = async (e) => {
    const f = e.target.files[0]; if (!f) return;
    const evs = parseLog(await f.text());
    if (!evs.length) { st('loggen kunde inte läsas'); return; }
    rep?.stop();
    const amb = $('#ambient'); if (amb.checked) { amb.checked = false; amb.dispatchEvent(new Event('change')); }
    const sp = +$('#repSpeed').value;
    rep = replay(evs, { speed: sp, onTick: (now, i, n) => st(`uppspelning ${new Date(now).toLocaleString('sv-SE')} · ${i}/${n}`) });
  };
}

export function initTwin(opts) {
  ({ scene, flyTo, worldHop, ensureExplore, onPick, onStory } = opts); F = W.F; T = opts.data;
  ROOMS = T.installations.rooms;
  const PL = Object.fromEntries(T.placements.items.map((p) => [p.id, p]));
  for (const inst of T.installations.installations) {
    const p = PL[inst.id]; if (!p || p.x == null) continue;
    I[inst.id] = { ...inst, pos: V(p.x, 0, p.y) };
  }
  buildPatterns();
  bus.on(onEvent);
  logFn = opts.log || logFn;
  list(); sources();
  viaVisitors = !!opts.visitors;
  return { open, list, ambient, fire, focus, mountTry, release, setAccent, labelClick, routeBox, has: (id) => !!I[id]?.web, I, WEIGHTS, ROOMS };
}
