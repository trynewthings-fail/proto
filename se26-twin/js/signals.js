// Signals: dots that travel along curves, topic pop-ups, light reactions,
// and the installations' signal chains (topics and payloads from the tnt.local interface).
import * as THREE from 'three';
import { CSS2DObject } from 'three/addons/CSS2DRenderer.js';
import { C, FIX, DEV, HOST, W, HUBP, PIPE_FIX, tubeStation, tubeCloud, tubeRoom, tubeThunder } from './world.js';

const V = (x, y, z) => new THREE.Vector3(x, y, z);
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

// ── pulse sprites: constant screen size, so they read at every scale ──
function dotTexture(ring) {
  const c = document.createElement('canvas'); c.width = c.height = 64;
  const g = c.getContext('2d');
  if (ring) {
    g.fillStyle = 'rgba(202,254,3,.95)'; g.beginPath(); g.arc(32, 32, 30, 0, 7); g.fill();
    g.strokeStyle = '#0a0b09'; g.lineWidth = 3; g.beginPath(); g.arc(32, 32, 28, 0, 7); g.stroke();
    g.fillStyle = '#0a0b09'; g.beginPath(); g.arc(32, 32, 11, 0, 7); g.fill();
  } else {
    g.fillStyle = 'rgba(10,11,9,.85)'; g.beginPath(); g.arc(32, 32, 26, 0, 7); g.fill();
  }
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; return t;
}
const HEAD = new THREE.SpriteMaterial({ map: dotTexture(true), sizeAttenuation: false, depthTest: false, transparent: true });
const TAIL = new THREE.SpriteMaterial({ map: dotTexture(false), sizeAttenuation: false, depthTest: false, transparent: true });

const live = [];
let count = 0;
export const stats = { get count() { return count; } };
export function send(curve, parent, { dur = 900, size = 0.024 } = {}) {
  return new Promise((res) => {
    const g = new THREE.Group(); g.renderOrder = 10;
    const head = new THREE.Sprite(HEAD); head.scale.setScalar(size); head.renderOrder = 11;
    const tails = [0.55, 0.42, 0.3, 0.2].map((s) => { const t = new THREE.Sprite(TAIL.clone()); t.material.opacity = s; t.scale.setScalar(size * (0.35 + s * 0.4)); return t; });
    g.add(...tails, head); parent.add(g);
    live.push({ curve, g, head, tails, t: 0, dur, res, parent });
  });
}
export function updatePulses(dt) {
  for (let i = live.length - 1; i >= 0; i--) {
    const p = live[i];
    p.t += dt / p.dur;
    const t = Math.min(1, p.t), e = t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2;
    p.head.position.copy(p.curve.getPointAt(e));
    p.tails.forEach((s, k) => s.position.copy(p.curve.getPointAt(Math.max(0, e - (k + 1) * 0.035))));
    if (p.t >= 1) { p.parent.remove(p.g); live.splice(i, 1); p.res(); }
  }
}
export function clearPulses() { for (const p of live) { p.parent.remove(p.g); p.res(); } live.length = 0; }

// ── light reactions ──
const LIME = new THREE.Color(C.lime);   // the accent: a station story uses its own colour (setAccent)
export function setAccent(c) { LIME.set(c ?? C.lime); }
// a lit strip also sends a pulse along its light tubes: up to its cube and on to the cloud (world.js TUBES)
const TUBE_OF = { Climate: 'klimat', 'Climate Recycle': 'klimat', Competence: 'kompetens', 'Competence SUA': 'kompetens', Mobility: 'rorlighet', Housing: 'bostader', Social: 'social', Introduction: 'intro' };
export function flash(name, amount = 1) {
  const f = FIX[name]; if (!f || f.offline) return;
  const was = f.heat;
  f.heat = Math.max(f.heat, amount);
  if (was > 0.6) return;   // already lit: no new pulse
  if (TUBE_OF[name]) tubeStation(TUBE_OF[name]);
  else if (name === 'Tak+Cloud') tubeCloud();
  else if (name.startsWith('Dialog')) tubeRoom('room3');
  else if (name === 'Maskinisten 2') tubeRoom('room2');
}
export { tubeThunder };
export function updateFixtures(dt) {
  for (const f of Object.values(FIX)) {
    if (f.heat <= 0 && !f.lit) continue;
    f.heat = Math.max(0, f.heat - dt / 1400);
    const h = f.offline ? 0 : Math.max(f.heat, f.hold || 0);
    f.mats.forEach((m, i) => m.color.copy(f.base[i]).lerp(LIME, h));
    if (f.glass) f.glass.opacity = 0.12 + h * 0.45;
    if (f.light) f.light.intensity = h * f.lightMax;
    f.lit = h > 0;
  }
}
export function holdAll(on) { for (const f of Object.values(FIX)) f.hold = on ? 0.85 : 0; }

// ── topic pop-ups ──
let quiet = false;
export function setQuiet(q) { quiet = q; }
export function pop(parent, pos, text, ms = 2200) {
  if (quiet) return null;
  // short and few: the topic and the start of the payload, at most three on screen at once
  const el = document.createElement('div'); el.className = 'pk'; el.textContent = /[{"]/.test(text) && text.length > 34 ? text.slice(0, 33) + '…' : text;   // raw payloads are cut, explanations are not
  const all = document.querySelectorAll('.pk'); if (all.length >= 2) all[0].style.display = 'none';
  if (text.length > 44) el.style.whiteSpace = 'normal', el.style.maxWidth = '280px';
  const o = new CSS2DObject(el); o.position.copy(pos); parent.add(o);
  setTimeout(() => { el.style.opacity = 0; }, ms);
  setTimeout(() => parent.remove(o), ms + 450);
  return o;
}

// ── curves ──
const wire = (key) => W.wireCurves[key];
const reverse = (c) => { const pts = c.getPoints(40).reverse(); return new THREE.CatmullRomCurve3(pts); };
function hop(a, b, lift = 1.2) { const m = a.clone().lerp(b, 0.5); m.y += lift + a.distanceTo(b) * 0.12; return new THREE.QuadraticBezierCurve3(a.clone(), m, b.clone()); }
export function arcWorld(a, b, k = 0.35) { const m = a.clone().lerp(b, 0.5); m.y += a.distanceTo(b) * k; return new THREE.QuadraticBezierCurve3(a.clone(), m, b.clone()); }

// ── installations: what fires, on which topic, and what answers ──
const pick = (a) => a[Math.floor(Math.random() * a.length)];
const r1 = (a, b) => Math.round((a + Math.random() * (b - a)) * 10) / 10;
export const INST = [
  { id: 'slide', name: 'Rutschkanan', room: 4, dev: 'ultraljud1', topic: 'ultraljud1', pay: () => `{"event":"slide","duration_ms":${1600 + Math.floor(Math.random() * 1400)}}`, fx: ['Climate'], cube: 'Climate', corner: 'klimat', w: 3 },
  { id: 'button', name: 'Säg ja!-knappen', room: 4, dev: 'pushbutton1', topic: 'pushbutton1', pay: () => '{"pressed":true}', fx: [], cube: null, corner: 'blommor', note: 'nästa ton i Den blomstertid nu kommer', w: 5 },
  { id: 'spin', name: 'Snurrlådorna', room: 4, dev: 'spinningboxes', topic: 'spinningboxes', pay: () => `{"sensor":${1 + Math.floor(Math.random() * 3)},"distance_cm":${30 + Math.floor(Math.random() * 40)},"delta_cm":${40 + Math.floor(Math.random() * 60)}}`, fx: ['Social', 'Bastu-lampa'], cube: 'Social', corner: 'social', w: 6 },
  { id: 'bike', name: 'Cykeln', room: 4, dev: 'bike', topic: 'bike', pay: () => `{"speed_kmh":${r1(9, 27)}}`, fx: ['Mobility'], cube: 'Mobility', corner: 'mobilitet', host: 'macmini6', w: 3 },
  { id: 'house', name: 'Snurra huset', room: 4, dev: 'housing', topic: 'housingcw', pay: () => `{"level":${r1(0.2, 0.9)},"pos":${Math.floor(Math.random() * 8)}}`, fx: ['Housing'], cube: 'Housing', corner: 'boende', host: 'macmini-housing', w: 3 },
  { id: 'ace', name: 'ACE Powerhouse', room: 4, host0: 'ace', topic: 'ace', pay: () => '"pulse"', fx: ['Competence'], cube: 'Competence', corner: 'mobilitet', w: 2 },
  { id: 'recycling', name: 'Återvinningen', room: 4, host0: 'ipad-recycling', topic: 'recycling/done', pay: () => `"${pick(['phone', 'controller', 'headphones', 'camera'])}"`, fx: ['Climate Recycle'], cube: 'Climate', corner: 'klimat', w: 2 },
  { id: 'sua', name: 'Sokrates frågevägg', room: 4, dev: 'sua', topic: 'sua/', pay: () => '{"trigger":true}', fx: ['Competence SUA'], cube: 'Competence', corner: 'mobilitet', host: 'ipad-sua', w: 2 },
  { id: 'skykraft', name: 'SkyKraft', room: 4, host0: 'macmini4', topic: 'skykraft', pay: () => '"pulse"', fx: ['Climate'], cube: 'Climate', corner: 'klimat', w: 2 },
  { id: 'emob', name: 'Elbilsladdaren', room: 4, dev: 'emob', topic: 'emob', pay: () => `{"power":${r1(3.5, 9)}}`, fx: ['Mobility'], cube: 'Mobility', corner: 'mobilitet', w: 1 },
  { id: 'drone', name: 'Droneport', room: 4, dev: 'droneport', topic: 'droneport/1', pay: () => `{"option_index":${Math.floor(Math.random() * 6)},"label":"${pick(['Medicin', 'Skogsbränder', 'Pizza', 'Försvunna', 'Vindkraft', 'Paket'])}"}`, fx: ['Mobility'], cube: 'Mobility', corner: 'mobilitet', w: 1 },
  { id: 'skill', name: 'Kompetenstältet', room: 4, dev: 'skill', topic: 'skill/svenska', pay: () => `"${Date.now() % 100000}"`, fx: ['Competence'], cube: 'Competence', corner: 'mobilitet', w: 1 },
  { id: 'tunnel', name: 'Vattentunneln', room: 1, dev: 'tunnel1', topic: 'tunnel1', pay: () => `{"distance":${r1(18, 40)}}`, fx: ['Tunnel'], host: 'macmini3', then: 'ljudkonst/C-1 → MIDI → Ableton', w: 3 },
  { id: 'theremin', name: 'Maskinisterna', room: 2, dev: 'maskinisterna', topic: 'maskinisterna', pay: () => `{"sensor1_cm":${30 + Math.floor(Math.random() * 6)},"sensor2_cm":${30 + Math.floor(Math.random() * 6)},"harmony_value":${r1(0.6, 1)}}`, fx: ['Maskinisten 2'], w: 2 },
  { id: 'alimak', name: 'Alimak', room: 2, dev: 'alimak', topic: 'alimak', pay: () => `{"event":"trigger","distance_cm":${20 + Math.floor(Math.random() * 9)}}`, fx: [], host: 'macmini3', then: 'kanal 12 → Ableton → alimak/trigger → lampan', w: 2 },
  { id: 'dialog', name: 'Dialogen', room: 3, pipe: true, topic: 'speech/', pay: () => '{"speaking":true}', fx: [], w: 3 },
];
const BY = Object.fromEntries(INST.map((i) => [i.id, i]));
const DIALOG_FIX = PIPE_FIX;

let onMsg = () => {};
export function setLogger(f) { onMsg = f; }
function srcPos(I, q) {
  if (I.pipe) return W.pipes[q];
  if (I.dev) return DEV[I.dev].pos;
  return HOST[I.host0].pos;
}
function srcWire(I, q) {
  if (I.pipe) return new THREE.CubicBezierCurve3(W.pipes[q].clone(), V(W.pipes[q].x, 5, W.pipes[q].z), V(HUBP.x, HUBP.y - 2.6, HUBP.z), HUBP.clone());
  return I.dev ? wire('dev:' + I.dev) : wire('host:' + I.host0);
}

// Full chain via the hub: sensor → tnt → lights / sound / screens, and in room 4 on to cube → cloud → greenhouse.
export async function trigger(id, { viaHub = true, fast = false } = {}) {
  const I = BY[id]; if (!I) return;
  const F = W.F, sp = fast ? 0.7 : 1;
  const q = Math.floor(Math.random() * 10);
  const topic = I.pipe ? `speech/${q}` : I.topic;
  const p0 = srcPos(I, q);
  pop(F, p0, `${topic} ${I.pay()}`, 2400 * sp);
  count++; onMsg(I, topic);
  if (I.pipe) flash(DIALOG_FIX[q]);
  if (id === 'button') flash('Växthus', 0.4);

  if (!viaHub) {   // the concept view: energy goes straight to the cloud and the greenhouse
    const cube = I.cube ? FIX[I.cube].pos : null;
    if (cube) { await send(hop(p0, cube, 0.6), F, { dur: 700 * sp }); flash(I.cube); await send(W.threads[I.cube], F, { dur: 650 * sp }); }
    else await send(hop(p0, FIX['Tak+Cloud'].pos, 1), F, { dur: 900 * sp });
    flash('Tak+Cloud');
    await send(hop(FIX['Tak+Cloud'].pos, FIX['Växthus'].pos, 0.4), F, { dur: 650 * sp });
    flash('Växthus');
    return;
  }

  await send(srcWire(I, q), F, { dur: 950 * sp });
  flash('tnt'); svcBlink('mosquitto'); svcBlink('tnt-switchboard');
  const outs = [];
  if (I.room === 4 && I.fx.length) blinkHost('resolume');
  for (const n of I.fx) outs.push(send(reverse(wire('fix:' + n)), F, { dur: 850 * sp }).then(() => flash(n)));
  if (I.host) outs.push(send(reverse(wire('host:' + I.host)), F, { dur: 850 * sp }).then(() => { blinkHost(I.host); if (I.then) pop(F, HOST[I.host].pos, I.then, 2000 * sp); }));
  if (id === 'button') outs.push(send(reverse(wire('host:rpi6')), F, { dur: 850 * sp }).then(() => pop(F, W.speakers.blommor, `♪ ${I.note}`, 2200 * sp)));
  await Promise.all(outs);
  if (I.cube) {
    flash(I.cube);
    await send(W.threads[I.cube], F, { dur: 650 * sp });
    flash('Tak+Cloud');
    if (I.corner) pop(F, W.speakers[I.corner], `♪ fågel · ${I.corner}`, 1800 * sp);
    if (id !== 'button') { pop(F, W.speakers.mitten, '⚡ åska', 1600 * sp); tubeThunder(); }
    await send(hop(FIX['Tak+Cloud'].pos, FIX['Växthus'].pos, 0.4), F, { dur: 600 * sp });
    flash('Växthus');
  }
}
export function svcBlink(n) { const s = W.svc?.[n]; if (!s) return; s.mat.color.copy(LIME); setTimeout(() => s.mat.color.set(0xffffff), 500); }
export function blinkHost(id, ms = 700) { const h = HOST[id]; if (!h) return; h.mat.color.copy(LIME); h.label.userData.el.classList.add('hot'); setTimeout(() => { h.mat.color.set(0xffffff); h.label.userData.el.classList.remove('hot'); }, ms); }

// Ambient visitors: random installations weighted roughly by how often they fire.
let amb = 0;
export function ambient(on, opts = {}) {
  clearTimeout(amb);
  if (!on) return;
  const pool = INST.filter((i) => !opts.room4 || i.room === 4 || opts.all).flatMap((i) => Array(i.w).fill(i.id));
  const tick = () => { trigger(pick(pool), opts); amb = setTimeout(tick, (opts.every || 900) * (0.5 + Math.random())); };
  tick();
}

// The slide → greenhouse chain, step by step, reporting each step for the card.
export async function slideStory(step, alive) {
  const F = W.F, I = BY.slide;
  step(0); await sleep(500);
  if (!alive()) return;
  pop(F, DEV.ultraljud1.pos, `ultraljud1 ${I.pay()}`, 2600); count++;
  step(1); await send(wire('dev:ultraljud1'), F, { dur: 1500 });
  if (!alive()) return;
  svcBlink('mosquitto'); svcBlink('tnt-switchboard'); blinkHost('resolume', 900);
  step(2); await send(reverse(wire('fix:Climate')), F, { dur: 1400 }); flash('Climate');
  await send(W.threads.Climate, F, { dur: 1100 });
  if (!alive()) return;
  step(3); flash('Tak+Cloud'); await sleep(700);
  step(4); await send(hop(FIX['Tak+Cloud'].pos, FIX['Växthus'].pos, 0.4), F, { dur: 1000 }); flash('Växthus'); pop(F, W.speakers.mitten, '⚡ åska', 2000); tubeThunder();
  if (!alive()) return;
  step(5); await send(reverse(wire('host:rpi6')), F, { dur: 1100 }); pop(F, W.speakers.klimat, '♪ fågel · klimathörnet', 2400);
  await sleep(2600);
}

// Dialogen and the booth: sensor → hub → Berget AI (outside) → back → playback.
export async function cloudTrip(scene, kind, step, alive, cam = () => {}) {
  const F = W.F;
  const hubW = F.localToWorld(HUBP.clone());
  if (kind === 'dialog') {
    const q = 4;
    step(0); flash(DIALOG_FIX[q]); pop(F, W.pipes[q], 'speech/4 {"speaking":true}', 2600); count++;
    await send(srcWire(BY.dialog, q), F, { dur: 1200 });
    if (!alive()) return;
    step(1); await send(reverse(wire('host:macmini1')), F, { dur: 1000 }); blinkHost('macmini1', 1600);
    pop(F, HOST.macmini1.pos, 'recorder.py → RAW', 2000);
    await sleep(500);
    if (!alive()) return;
    step(2); const mw = F.localToWorld(HOST.macmini1.pos.clone());
    cam('wide'); await sleep(1200);
    await send(arcWorld(mw, W.berget), scene, { dur: 3000, size: 0.03 });
    if (!alive()) return;
    step(3); pop(scene, W.berget, 'transkribering + LLM-bedömning', 2400); await sleep(900);
    await send(arcWorld(W.berget, mw), scene, { dur: 3000, size: 0.03 });
    if (!alive()) return;
    cam('close'); await sleep(1500);
    step(4); pop(F, HOST.macmini1.pos, 'FINAL · i rotation för fråga 5', 2400); blinkHost('macmini1', 1200);
    await sleep(1400);
    step(5); flash(DIALOG_FIX[7]); pop(F, W.pipes[7], '▶ spelas upp för nästa besökare', 2400);
    await sleep(2600);
  } else {
    step(0); blinkHost('ipad-recorder', 1600); pop(F, HOST['ipad-recorder'].pos, 'video · BÖRJA MED · 30 s', 2400);
    await sleep(900);
    const rw = F.localToWorld(HOST['ipad-recorder'].pos.clone());
    step(1); cam('wide'); await sleep(1200);
    await send(arcWorld(rw, W.berget), scene, { dur: 3000, size: 0.03 });
    if (!alive()) return;
    step(2); pop(scene, W.berget, 'transkribering', 2000); await sleep(800);
    await send(arcWorld(W.berget, hubW), scene, { dur: 3000, size: 0.03 });
    if (!alive()) return;
    cam('close'); await sleep(1400);
    step(3); svcBlink('nginx'); pop(F, HUBP.clone().add(V(0, 0.6, 0)), 'moderering: godkänd', 2200); await sleep(1200);
    step(4); await send(reverse(wire('host:ipad-player')), F, { dur: 1200 }); blinkHost('ipad-player', 2000);
    pop(F, HOST['ipad-player'].pos, '▶ visas i rum 4', 2400);
    await sleep(2600);
  }
}
