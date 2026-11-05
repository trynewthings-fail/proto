// Museum Brain — renderer, camera rig (log-scale zoom between chapters), chapter UI, explore mode.
import * as THREE from 'three';
import { OrbitControls } from 'three/addons/OrbitControls.js';
import { CSS2DRenderer } from 'three/addons/CSS2DRenderer.js';
import * as WD from './world.js';
import * as SG from './signals.js';
import { INTRO, BRAIN } from './chapters.js';
import { buildInstStory, buildStationStory, viewOf } from './stories.js';
import { initTwin } from './twin.js';
import { buildMedia, updateMedia, MEDIA } from './media.js';
import { initLife, updateLife } from './life.js';
import * as SC from './scales.js';
// more scale scenes, one file per track; each adds to SC.SCENES and SC.HOPS, and a broken file only loses its own scenes
await Promise.all(['komponenter', 'natur', 'fler', 'platser'].map((f) => import(`./scenes/${f}.js`).catch((e) => console.error(`scenes/${f}.js:`, e))));

const $ = (s) => document.querySelector(s);
const { W, FIX, HOST, DEV } = WD;

// ── renderer, scene, lights ──
const renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.setPixelRatio(Math.min(1.5, devicePixelRatio));
renderer.setSize(innerWidth, innerHeight);
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;
renderer.shadowMap.autoUpdate = false;   // redrawn only when the camera or the floor moves (see frame)
renderer.localClippingEnabled = true;
$('#world').append(renderer.domElement);
renderer.domElement.setAttribute('role', 'img');
renderer.domElement.setAttribute('aria-label', 'En tecknad 3D-modell av utställningen SE26 på Skellefteå museum. Kortet bredvid beskriver det som visas.');
const css = new CSS2DRenderer({ element: $('#labels') });
css.setSize(innerWidth, innerHeight);

const scene = new THREE.Scene();
scene.background = new THREE.Color(WD.C.bg);
scene.fog = new THREE.Fog(WD.C.bg, 100, 1000);
const camera = new THREE.PerspectiveCamera(32, innerWidth / innerHeight, 0.01, 10000);

scene.add(new THREE.HemisphereLight(0xffffff, 0xd4d3cc, 2.35));
const sun = new THREE.DirectionalLight(0xffffff, 1.4);
sun.castShadow = true;
sun.shadow.intensity = 0.5;   // soft pencil shadows: walls in close-ups stay paper-white, not mid-grey
sun.shadow.mapSize.set(2048, 2048);
scene.add(sun, sun.target);
const SUN_DIR = new THREE.Vector3(-0.55, 1, 0.35).normalize();

const ground = new THREE.Mesh(new THREE.PlaneGeometry(40000, 40000).rotateX(-Math.PI / 2), new THREE.MeshBasicMaterial({ color: WD.C.bg }));
ground.position.y = -0.05;
const shade = new THREE.Mesh(new THREE.PlaneGeometry(40000, 40000).rotateX(-Math.PI / 2), new THREE.ShadowMaterial({ opacity: 0.13 }));
shade.receiveShadow = true;
scene.add(ground, shade);

// ── build the world ──
const boot = $('#boot');
const ok = (r) => { if (!r.ok) throw new Error(`${r.url.split('/').pop()}: ${r.status}`); return r; };
let cityData, se26, instData, walk, storyData, mediaData, stationData, tourData;
try {
  [cityData, se26, instData, walk, storyData, mediaData, stationData, tourData] = await Promise.all([Promise.all([fetch('data/city.json').then(ok).then((r) => r.json()), fetch('data/city_meshes.json').then((r) => (r.ok ? r.json() : null)).catch(() => null), fetch('data/city_water.json').then((r) => (r.ok ? r.json() : null)).catch(() => null)]).then(([c, m, w]) => ({ ...c, meshes: m, water: w })), WD.loadSE26(), fetch('data/installations.json').then(ok).then((r) => r.json()), fetch('data/se26/walk.json').then(ok).then((r) => r.json()),
    fetch('data/stories.json').then((r) => (r.ok ? r.json() : {})).catch(() => ({})),
    fetch('data/media.json').then((r) => (r.ok ? r.json() : {})).catch(() => ({})),
    fetch('data/stations.json').then((r) => (r.ok ? r.json() : { stations: {} })).catch(() => ({ stations: {} })),
    fetch('data/tour.json').then((r) => (r.ok ? r.json() : { stops: [] })).catch(() => ({ stops: [] }))]);
} catch (e) {
  boot.classList.add('err');
  boot.innerHTML = `Modellen kunde inte laddas (${e.message}). Körs sidan via <code>start.bat</code>? Ladda om för att försöka igen.`;
  throw e;
}
boot.remove();
WD.buildCity(scene, cityData);
const EX = WD.buildExhibition(scene, se26);
buildMedia(W.F);
WD.buildWires(W.F);
const remote = WD.buildRemote(scene);
W.guides.material.dashSize = 0.035; W.guides.material.gapSize = 0.03;
// dashed arcs from the hub (with the floor lifted) out to Berget AI and Slack
EX.updateMatrixWorld(true);
for (const to of [W.berget, W.slack]) {
  const c = SG.arcWorld(W.F.localToWorld(WD.HUBP.clone()), to);
  const l = new THREE.Line(new THREE.BufferGeometry().setFromPoints(c.getPoints(120)), WD.bdash({ color: 0x3b3d37, dashSize: 28, gapSize: 22 }));
  l.computeLineDistances(); remote.add(l);
}

// LED counts per fixture (Systemhälsa) as labels
const LEDS = { 'Maskinisten 1': 2784, 'Maskinisten 2': 672, Possibilities: 768, 'Dialog tak 1': 960, 'Dialog tak 2': 1152, 'Dialog 1234': 1152, 'Dialog 56': 576, 'Dialog 7': 402, 'Dialog 8': 402, 'Dialog 910': 576,
  'Tak+Cloud': 1728, Climate: 2592, 'Climate Recycle': 768, Competence: 960, 'Competence SUA': 480, Housing: 1152, Social: 864, Introduction: 477, Växthus: 1920,
  'TNT tree 01': 400, 'TNT tree 02': 400, 'TNT tree 03': 400, 'TNT tree 04': 400, 'Tree small': 116, Tunnel: 1206, Mobility: null, MiLight: null, Treebook: null, 'Bastu-lampa': null };
for (const [n, f] of Object.entries(FIX)) {
  if (!(n in LEDS)) continue;
  const sub = f.offline ? 'offline' : n === 'MiLight' ? 'MiLight-hubb' : n === 'Bastu-lampa' ? 'Shelly-dimmer' : LEDS[n] ? `${LEDS[n]} LED` : 'WLED';
  const l = WD.label(n, { sub, groups: ['fixtures'], stalk: 12, cls: f.offline ? 'ghost' : '' });
  l.position.copy(f.pos).add(new THREE.Vector3(0, 0.1, 0)); W.F.add(l);
}

// ── camera rig: target + distance + azimuth + elevation ──
const rig = { t: new THREE.Vector3(), d: 1000, az: 0, el: 0.6, fogF: 7 };
let tw = null;
const lift = { v: 0, to: 0 };
let buildT0 = -1e9;
const CALM_Q = matchMedia('(prefers-reduced-motion: reduce)');
let CALM = CALM_Q.matches;   // less motion: no line boil, no visitors, cuts instead of camera flights, no autoplay
CALM_Q.addEventListener?.('change', (e) => { CALM = e.matches; });
const EXY = (l) => 4.5 + l * 17.5;
function resolve(v) {
  if (v.at === 'museum') return new THREE.Vector3(-5, 8, 28);
  if (v.at === 'berget') return new THREE.Vector3(-420, 0, 1450);
  if (v.w) return new THREE.Vector3(...v.w);
  const keep = EX.position.y;
  EX.position.y = EXY(lift.to); EX.updateMatrixWorld(true);
  const p = v.at === 'pi' ? W.F.localToWorld(W.piPos.clone()) : W.F.localToWorld(new THREE.Vector3(...v.at));
  EX.position.y = keep; EX.updateMatrixWorld(true);
  return p;
}
function goView(v, dur = 2400) {
  const to = { t: resolve(v), d: v.d, az: v.az, el: v.el, fogF: v.fogF || 7 };
  const ratio = Math.abs(Math.log(to.d / rig.d));
  tw = { from: { t: rig.t.clone(), d: rig.d, az: rig.az, el: rig.el, fogF: rig.fogF }, to, t0: performance.now(), dur: CALM ? 1 : dur + Math.min(2200, ratio * 260) };   // less motion: a cut
}
const ease = (k) => (k < 0.5 ? 4 * k * k * k : 1 - Math.pow(-2 * k + 2, 3) / 2);
function stepRig(now) {
  if (!tw) return;
  const k = Math.max(0, Math.min(1, (now - tw.t0) / tw.dur)), A = tw.from, B = tw.to;
  // a plunge (into a scale scene): the angle and target settle first, then the distance rushes in or out
  const e = tw.plunge ? ease(Math.min(1, k / 0.7)) : ease(k), eD = tw.plunge ? k * k * k : e;
  const d = Math.exp(Math.log(A.d) + (Math.log(B.d) - Math.log(A.d)) * eD);
  // when zooming far, let the target follow the zoom so the subject stays in frame
  const w = Math.min(1, Math.abs(Math.log(B.d / A.d)) / 2.5);
  const kd = B.d < A.d ? (A.d - d) / (A.d - B.d) : (d - A.d) / (B.d - A.d || 1);
  rig.t.lerpVectors(A.t, B.t, tw.plunge ? e : e * (1 - w) + (Number.isFinite(kd) ? kd : e) * w);
  rig.d = d;
  let da = B.az - A.az; while (da > Math.PI) da -= Math.PI * 2; while (da < -Math.PI) da += Math.PI * 2;
  rig.az = A.az + da * e; rig.el = A.el + (B.el - A.el) * e; rig.fogF = A.fogF + (B.fogF - A.fogF) * e;
  if (k >= 1) {
    if (tw.explore) { controls.target.copy(rig.t); controls.enabled = true; controls.update(); }
    tw = null;
  }
}
function placeCamera() {
  const ce = Math.cos(rig.el);
  camera.position.set(rig.t.x + Math.sin(rig.az) * ce * rig.d, rig.t.y + Math.sin(rig.el) * rig.d, rig.t.z + Math.cos(rig.az) * ce * rig.d);
  camera.lookAt(rig.t);
}

// ── explore mode ──
const controls = new OrbitControls(camera, renderer.domElement);
controls.enabled = false; controls.enableDamping = true; controls.maxPolarAngle = Math.PI * 0.49; controls.minDistance = 0.1; controls.maxDistance = 9000;
let exploring = false;
function setExplore(on) {
  exploring = on;
  $('#explore').classList.toggle('on', on);
  $('#explore').textContent = on ? (lastStory ? `Tillbaka till ${lastStory.title}` : 'Tillbaka till kapitlen') : 'Utforska fritt';
  $('#ctrl').hidden = !on; $('#card').hidden = on;
  if (on) {
    if (tw) { tw.t0 = -Infinity; stepRig(0); }   // land the current tween before handing over to the orbit controls
    placeCamera(); controls.target.copy(rig.t); controls.enabled = true; controls.update(); twin.ambient($('#ambient').checked);
    if (pendingFly) { flyTo(...pendingFly); pendingFly = null; }
  }
  else {
    twin.list();   // close the card and its highlight
    controls.enabled = false;
    const off = camera.position.clone().sub(controls.target);
    rig.t.copy(controls.target); rig.d = off.length(); rig.el = Math.asin(off.y / rig.d); rig.az = Math.atan2(off.x, off.z);
  }
}

// ── five times a second: hide labels that collide, sit under a panel or leave the screen (higher rank wins),
// and fade the hanging things (theme cubes, cloud, hub) that come between the camera and what it looks at ──
const RANK = (el) => (el.classList.contains('hot') ? 3 : el.classList.contains('big') ? 2 : el.classList.contains('ghost') ? 0 : 1);
const hit = (a, b) => a.left < b.right && a.right > b.left && a.top < b.bottom && a.bottom > b.top;
const fRay = new THREE.Ray(), fBox = new THREE.Box3(), fP = new THREE.Vector3();
let tidyT = 0;
function tidy(now) {
  if (now - tidyT < 200) return; tidyT = now;
  const block = [$('#side'), exploring ? $('#ctrl') : $('#card'), $('#scale'), $('#counter'), $('#note'), $('#mnav')].filter((e) => e && !e.hidden && getComputedStyle(e).display !== 'none')   /* fixed panels have no offsetParent */.map((e) => e.getBoundingClientRect());
  const items = [];
  // Utforska in levels: from afar only the rooms; closer, the installations around what you look at; project cards last
  const camD = camera.position.distanceTo(exploring && !tw ? controls.target : rig.t), far = camD > 26;
  document.body.classList.toggle('far', exploring && far);   // the message pop-ups only show up close
  const own = story.chapters[cur]?.inst || story.chapters[cur]?.focus, reach = own && !exploring ? 2.5 : Math.max(5, camD * 0.42);   // tour stops focus an installation too   // a story: the installation and its closest neighbours
  for (const l of WD.LABELS) {
    const el = l.userData.el, g = l.userData.groups;
    let lod = false;
    if (l.userData.key?.startsWith('station:')) lod = exploring ? camD > 70 : !story.station && l.getWorldPosition(fP).distanceTo(rig.t) > 9;   // the cubes stay clickable inside room 4
    else if (exploring && g.includes('rooms')) lod = !far;
    else if (g.includes('inst')) {   // in Utforska and in the chapters alike: only what is near the subject
      const card = W.P[l.userData.key]?.type === 'kort';
      lod = l.userData.key !== own && ((exploring && far) || (card && camD > 12) || l.getWorldPosition(fP).distanceTo(exploring && !tw ? controls.target : rig.t) > reach);
    }
    el.classList.toggle('lod', lod);
    if (lod || el.classList.contains('off') || el.style.display === 'none') { el.classList.remove('hid'); continue; }
    items.push({ el, r: el.firstElementChild.getBoundingClientRect(), k: RANK(el) + (el.classList.contains('hid') ? 0 : 0.5) });
  }
  items.sort((a, b) => b.k - a.k);   // already-shown labels win ties, so they don't flicker
  const kept = [], cap = innerWidth < 700 ? 4 : 8;   // never more than a handful of labels at once
  for (const { el, r } of items) {
    if (kept.length >= cap) { el.classList.add('hid'); continue; }
    const hide = r.right > innerWidth || r.left < 0 || r.top < 0 || r.bottom > innerHeight || block.some((b) => hit(r, b)) || kept.some((k) => hit(r, k));   // never cut off at the edge
    el.classList.toggle('hid', hide);
    if (!hide) kept.push(r);
  }
  for (const el of document.querySelectorAll('.pk')) {   // message pop-ups stay inside the screen and give way to labels and panels
    el.style.marginLeft = '0px';
    let r = el.getBoundingClientRect();
    const sh = r.left < 8 ? 8 - r.left : r.right > innerWidth - 8 ? innerWidth - 8 - r.right : 0;
    if (sh) { el.style.marginLeft = `${sh}px`; r = el.getBoundingClientRect(); }
    el.classList.toggle('hid', block.some((b) => hit(r, b)) || kept.some((k) => hit(r, k)));
  }
  // occluders
  const near = lift.v > 0.5 && rig.d < 60;
  const tgt = exploring && !tw ? controls.target : rig.t, dist = camera.position.distanceTo(tgt);
  fRay.origin.copy(camera.position); fRay.direction.subVectors(tgt, camera.position).normalize();
  for (const o of W.fade || []) {
    const box = fBox.setFromObject(o).expandByScalar(0.25);
    const fade = near && !!fRay.intersectBox(box, fP) && fP.distanceTo(camera.position) < dist - 0.6 && !box.containsPoint(tgt);
    if (o.userData.faded === fade) continue;
    o.userData.faded = fade;
    o.traverse((c) => {
      if (c.isLineSegments) c.visible = !fade;
      else if (c.isMesh) { c.material.transparent = fade || c.material.userData.wasT; c.material.opacity = fade ? 0.12 : c.material.userData.op ?? 1; c.material.depthWrite = !fade; }
    });
  }
}

// fly the camera to a spot in the floor frame while exploring (installation cards use this)
let pendingFly = null;
function flyTo(p, { d = 11, el = 0.92, az } = {}) {
  if (!exploring) { pendingFly = [p, { d, el, az }]; return; }
  const off = camera.position.clone().sub(controls.target), dd = off.length();
  rig.t.copy(controls.target); rig.d = dd; rig.el = Math.asin(off.y / dd); rig.az = Math.atan2(off.x, off.z);
  controls.enabled = false;
  tw = { from: { t: rig.t.clone(), d: rig.d, az: rig.az, el: rig.el, fogF: rig.fogF }, to: { t: W.F.localToWorld(p.clone()), d, az: az ?? rig.az, el, fogF: 7 }, t0: performance.now(), dur: CALM ? 1 : 1500, explore: true };
}

// ── chapter UI ──
// stories: the introduction (ends in free exploring), Museum Brain (the system), and one per installation (js/stories.js)
let cur = -1, token = 0;
const toc = $('#toc');
const STORIES = {
  intro: { id: 'intro', title: 'Inside', sub: 'SE26 Exhibition', chapters: INTRO },
  brain: { id: 'brain', title: 'Museum Brain', sub: 'Systemet bakom utställningen', chapters: BRAIN },
};
let story = STORIES.intro;
const exploreAt = () => STORIES.intro.chapters.findIndex((c) => c.explore);
function renderToc() {
  const head = $('#storyHead'), own = story !== STORIES.intro;
  head.hidden = !own;
  const toTour = own && tourReturn != null && story.id !== 'tour';
  head.innerHTML = own ? `<button class="sh-back">${toTour ? `← Gå utställningen · stopp ${tourReturn + 1}` : '← Utforska'}</button><b>${story.title}</b><small>${story.sub || ''}</small>` : '';
  head.querySelector('.sh-back')?.addEventListener('click', () => (toTour ? openStory('tour', tourReturn) : toExplore()));
  toc.innerHTML = '';
  story.chapters.forEach((c, i) => {
    const li = document.createElement('li');
    li.textContent = `${String(i + 1).padStart(2, '0')}:${c.nav}`;
    li.onclick = () => go(i);
    li.tabIndex = 0; li.setAttribute('role', 'link');
    li.onkeydown = (e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); e.stopPropagation(); go(i); } };
    toc.append(li);
  });
}
// history: a new story is a new entry (Back returns to the one before), chapters within it replace each other
let navPush = false, routing = false, lastStory = null;
let tourReturn = null;   // the tour stop a story was opened from
function openStory(key, i = 0, { fromTour } = {}) {
  if (key === 'explore') { toExplore(); return; }
  tourReturn = fromTour ?? (key === 'tour' ? null : tourReturn && story.id === 'tour' ? null : tourReturn);
  const st = key.startsWith('station:') && stationData.stations[key.slice(8)];
  const s = STORIES[key] || (st ? buildStationStory(key.slice(8), st, twin.I, W.P)
    : key.startsWith('inst:') && twin.I[key.slice(5)]?.web && twin.I[key.slice(5)].status !== 'utgick' ? buildInstStory(twin.I[key.slice(5)], storyData, W.P, MEDIA) : null);
  if (!s) return false;
  navPush = story !== s; story = s; cur = -1; renderToc(); accent(); go(Math.min(i, s.chapters.length - 1));
  return true;
}
// a station's story takes the station's colour as its accent instead of TNT's lime (data/stations.json): the page's
// accent and the highlight in the model
function accent() {
  const c = story.station?.color, root = document.documentElement.style;
  if (c) root.setProperty('--lime', c); else root.removeProperty('--lime');
  twin.setAccent(c);
}
function toExplore() {
  if (story !== STORIES.intro) {
    lastStory = { key: story.id, i: Math.max(0, cur), title: story.title };   // Utforska's back button returns here
    if (story.id !== 'tour') tourReturn = null;
    story = STORIES.intro; cur = -1; renderToc(); accent(); navPush = true;
  }
  go(exploreAt());
}
// every link form: #start … #utforska (the introduction), #brain[/3], #inst:alimak[/2], #station:klimat[/1]
function route(hash, instant = false) {
  const [k, n] = decodeURIComponent(hash.replace(/^#/, '')).split('/');
  const known = !k || k === 'utforska' || STORIES[k] || k.startsWith('inst:') || k.startsWith('station:') || INTRO.some((c) => c.id === k);
  if (!known && !instant) return;
  const i = Math.max(0, +n || 0);
  if (!k.startsWith('tour') && !k.startsWith('inst:') && !k.startsWith('station:')) tourReturn = null;
  routing = true;
  try {
    if (k === 'utforska') toExplore();
    else if (STORIES[k] && STORIES[k] !== STORIES.intro || k.startsWith('inst:') || k.startsWith('station:')) { if (!openStory(k, i)) toExplore(); }   // an unknown or dropped story: Utforska
    else {
      if (story !== STORIES.intro) { story = STORIES.intro; cur = -1; renderToc(); accent(); }
      go(Math.max(0, INTRO.findIndex((c) => c.id === k)), instant);
    }
  } finally { routing = false; navPush = false; }
}
addEventListener('popstate', () => route(location.hash));   // Back, Forward and plain #links such as the logo
// Esc goes up one level: a chapter → the story's overview → Utforska
function escUp() { if (story.id === 'tour') toExplore(); else if (story !== STORIES.intro && cur > 0) go(0); else if (tourReturn != null && story.id !== 'tour') openStory('tour', tourReturn); else toExplore(); }
renderToc();
const EV_NAME = { belagd: 'belagd', delvis: 'delvis belagd', antagen: 'antagen', okand: 'okänd' };
const EVIDENCE = {
  belagd: 'Belagd: läst direkt i en källa (live-systemet, koden eller fallstudien).',
  delvis: 'Delvis belagd: en del är läst i en källa, en del är härlett.',
  antagen: 'Antagen: härlett eller rimligt antagande, inte bekräftat.',
  okand: 'Okänd: vet vi inte än.',
};
function renderCard(c, i) {
  if (c.inst) { renderInst(c, i); return; }
  if (c.part === 'tour') { renderTour(c, i); return; }
  if (c.stationId) { renderStation(c, i); return; }
  $('#card').classList.toggle('cover', !!c.cover);
  $('#cKick').textContent = c.cover ? 'Try New Things · SE26 Exhibition' : `${String(i + 1).padStart(2, '0')}:${c.nav}`;
  $('#cTags').innerHTML = (c.tags || []).map((t) => `<span>${t}</span>`).join('');
  $('#cTitle').textContent = c.title;
  let body = c.body || '';
  if (c.cover) body = `<div class="cover-logo"><img class="s" src="assets/smile.svg" alt=""><img class="w" src="assets/wordmark-dark.svg" alt="Try New Things"></div>` + body;
  $('#cBody').innerHTML = body;
  $('#cFlow').textContent = c.flow || '';
  $('#cFacts').innerHTML = (c.facts || []).map(([a, b]) => `<dt>${a}</dt><dd>${b}</dd>`).join('');
  $('#cSteps').innerHTML = (c.steps || []).map((s) => `<li><span>${s}</span></li>`).join('');
  $('#cExtra').innerHTML = (c.extra || '') + (c.cover ? '<div class="ways"><button class="go" id="goBtn">Börja · idén<small>4 kapitel · 2 min</small></button><button class="go alt" id="tourBtn">Gå utställningen<small>30 stopp i besöksordning · ca 15 min</small></button><button class="go alt" id="freeBtn">Utforska fritt<small>klicka runt i modellen</small></button></div>' : '');
  // where the chapter's facts come from, and how sure we are (the same levels as on the installation cards)
  $('#cSrc').innerHTML = c.src ? `<span class="k">Källa</span>${c.src.map((x) => `<span class="ev ev-${x.level}" title="${EVIDENCE[x.level]}">${EV_NAME[x.level]}</span> ${x.t}`).join('<span class="sep">·</span>')}` : '';
  $('#goBtn')?.addEventListener('click', () => go(1));
  $('#tourBtn')?.addEventListener('click', () => openStory('tour', 0));
  $('#freeBtn')?.addEventListener('click', toExplore);
  $('#cExtra').querySelectorAll('[data-story]').forEach((b) => b.onclick = () => openStory(b.dataset.story));
  if (!c.cover) $('#cExtra').append(storyNav(i));
  // scale hops this chapter offers (js/scales.js)
  if (c.hops) {
    const h = document.createElement('div'); h.className = 'hops';
    h.innerHTML = c.hops.filter((id) => SC.SCENES[id]).map((id) => `<button data-s="${id}"><i>${SC.SCENES[id].kick.split(' · ')[0]}</i>${SC.SCENES[id].title}</button>`).join('');
    h.onclick = (e) => { const b = e.target.closest('button'); if (b) SC.enter(b.dataset.s, { dir: SC.SCENES[b.dataset.s].kick.startsWith('Ut') ? 'ut' : 'in' }); };
    $('#cExtra').append(h);
  }
}
const esc = (t) => String(t ?? '').replace(/[&<>"]/g, (ch) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[ch]));
const inl = (t) => esc(t).replace(/`([^`]+)`/g, '<code>$1</code>');
// prev / next within a story; after the last chapter comes free exploring again
function storyNav(i) {
  const CH = story.chapters, d = document.createElement('div'); d.className = 'storynav';
  const nx = CH[i + 1];
  const back = !nx && tourReturn != null && story.id !== 'tour';
  d.innerHTML = `${i > 0 ? `<button class="sn-prev">‹ ${esc(CH[i - 1].nav)}</button>` : '<span></span>'}<button class="sn-next">${nx ? `${esc(nx.nav)} ›` : back ? 'Tillbaka till turen ›' : 'Tillbaka till Utforska ›'}</button>`;
  d.querySelector('.sn-prev')?.addEventListener('click', () => go(i - 1));
  d.querySelector('.sn-next').onclick = () => (back ? openStory('tour', tourReturn + 1) : go(i + 1));
  return d;
}
const TITLES = { try: 'Prova själv', links: 'Källor och länkar' };
const linkify = (t) => (/^https?:\/\//.test(t) ? `<a href="${esc(t)}" target="_blank" rel="noopener">${esc(t.replace(/^https?:\/\//, ''))}</a>` : esc(t));
function renderInst(c, i) {
  const inst = twin.I[c.inst], CH = story.chapters, room = twin.ROOMS[inst.room]?.name || '';
  $('#card').classList.remove('cover');
  $('#cKick').textContent = `${inst.name} · ${String(i + 1).padStart(2, '0')}/${String(CH.length).padStart(2, '0')}`;
  $('#cTags').innerHTML = [`Rum ${inst.room} · ${room}`, inst.category].filter(Boolean).map((t) => `<span>${esc(t)}</span>`).join('');
  $('#cTitle').textContent = c.part === 'overview' ? inst.name : c.title || TITLES[c.part] || c.nav;
  $('#cFlow').textContent = ''; $('#cFacts').innerHTML = ''; $('#cSteps').innerHTML = ''; $('#cExtra').innerHTML = ''; $('#cSrc').innerHTML = '';
  let body = '';
  if (c.part === 'overview') {
    body = inst.story ? `<p>${inl(inst.story)}</p>` : (story.lead ? `<p>${esc(story.lead)}</p>` : '') + `<p>${inl(inst.summary)}</p>`;   // the visitor text says it once; the lead is for stories without one   // story: the visitor's version (summary stays for Museum Brain and the tracker)
    $('#cSteps').innerHTML = (inst.visitor || []).map((v) => `<li><span>${esc(v)}</span></li>`).join('');
    $('#cSrc').innerHTML = `<span class="k">Hur säkert</span><span class="ev ev-${inst.confidence}" title="${EVIDENCE[inst.confidence] || ''}">${EV_NAME[inst.confidence] || inst.confidence}</span>`;
    // photos and clips from the making of the exhibition (data/media.json): muted loops, the still shows first
    const media = mediaData?.items?.[inst.id] || [];
    if (media.length) $('#cExtra').insertAdjacentHTML('beforeend', `<div class="media">${media.map((m) => `<figure>${m.src
      ? `<video src="${esc(m.src)}" poster="${esc(m.poster)}" muted loop playsinline ${CALM ? 'controls' : 'autoplay'} preload="none"></video>` : `<img src="${esc(m.poster)}" alt="" loading="lazy">`}<figcaption>${esc(m.caption)}</figcaption></figure>`).join('')}</div>`);
  } else if (c.part === 'try') {
    body = '<p>Gör som en besökare och se vad som händer i modellen. Spela signalen för att följa den steg för steg.</p>';
    const box = document.createElement('div'); box.className = 'try'; $('#cExtra').append(box); twin.mountTry(box, inst.id);
  } else if (c.part === 'world' || c.part === 'text') {
    body = c.part === 'text' ? c.body || '' : `<p>${esc(c.here || '')}</p>`;
    if (c.src) $('#cSrc').innerHTML = `<span class="k">Källa</span>${esc(c.src)}`;
  } else if (c.part === 'links') {
    const open = (inst.web?.open || []).map((q) => q.replace(/\s*\(F\d+b?\)/g, ''));
    const rel = (inst.web?.links || []).filter((l) => twin.I[l.to]?.web && twin.I[l.to].status !== 'utgick');
    body = (rel.length ? `<div class="tw-k">Hänger ihop med</div><div class="hops story-links">${rel.map((l) => `<button data-open="${esc(l.to)}"><i>${esc(l.how)}</i>${esc(twin.I[l.to].name)}</button>`).join('')}</div><div class="tw-k">Källor</div>` : '') +
      `<ul class="srclist">${(inst.sources || []).map((t) => `<li>${linkify(t)}</li>`).join('')}</ul>` +
      (open.length ? `<div class="tw-k">Det vet vi inte än</div><ul class="srclist">${open.map((q) => `<li>${esc(q)}</li>`).join('')}</ul>` : '');
  }
  $('#cBody').innerHTML = body;
  $('#cBody').querySelectorAll('[data-open]').forEach((b) => b.onclick = () => openStory(`inst:${b.dataset.open}`));
  $('#cExtra').append(storyNav(i));
}
// a station: the cube, its installations in brief (each leads to its own story) and the project texts around it
function renderStation(c, i) {
  const st = story.station, CH = story.chapters;
  $('#card').classList.remove('cover');
  $('#cKick').textContent = `${st.name} · ${String(i + 1).padStart(2, '0')}/${String(CH.length).padStart(2, '0')}`;
  $('#cTags').innerHTML = '<span>Rum 4 · Framtiden</span><span>Station</span>';
  $('#cFlow').textContent = ''; $('#cFacts').innerHTML = ''; $('#cSteps').innerHTML = ''; $('#cExtra').innerHTML = ''; $('#cSrc').innerHTML = '';
  const go2 = (id) => `<button data-open="${esc(id)}"><i>berättelse</i>${esc(twin.I[id]?.name || id)}</button>`;
  let body = '';
  if (c.part === 'station') {
    $('#cTitle').textContent = st.name;
    body = `<p>${esc(st.intro)}</p><p>${esc(st.where)}</p>`;
    $('#cExtra').insertAdjacentHTML('beforeend', `<div class="tw-k">Installationerna</div><div class="hops story-links">${st.inst.filter((id) => twin.I[id]).map(go2).join('')}</div>
      <div class="tw-k">Projekten runt stationen</div><p class="tw-sum">${st.texts.filter((id) => twin.I[id]).map((id) => esc(twin.I[id].name)).join(' · ')}</p>`);
  } else if (c.part === 'station-inst') {
    const x = twin.I[c.inst2];
    $('#cTitle').textContent = x.name;
    body = `<p>${inl(x.short || '')}</p><p>${inl(x.story || x.summary)}</p>`;
    $('#cExtra').insertAdjacentHTML('beforeend', `<div class="hops story-links">${go2(c.inst2).replace('<i>berättelse</i>', '<i>hela berättelsen</i>')}</div>`);
  } else {
    $('#cTitle').textContent = c.nav === 'Projekten' ? 'Projekten runt stationen' : `Projekten runt stationen, del ${c.nav.slice(-1)}`;
    body = c.texts.map((id) => {
      const x = twin.I[id], url = (x.sources || []).find((t) => /^https?:\/\//.test(t));
      return `<h4 class="proj">${esc(x.name)}</h4><p>${inl(x.story || x.summary)}${url ? ` ${linkify(url)}` : ''}</p><div class="hops story-links">${go2(id)}</div>`;
    }).join('');
    $('#cSrc').innerHTML = '<span class="k">Källa</span>Utställningstexterna i Framtiden och projektens egna sidor (läst 30 okt 2026)';
  }
  $('#cBody').innerHTML = body;
  $('#card').querySelectorAll('[data-open]').forEach((b) => b.onclick = () => openStory(`inst:${b.dataset.open}`));
  $('#cExtra').append(storyNav(i));
}
function setStep(n) {
  [...$('#cSteps').children].forEach((li, k) => { li.classList.toggle('now', k === n); li.classList.toggle('done', k < n); });
}
const show = { hub: false, wires: false, remote: false, museum: false };
function go(i, instant = false) {
  const CH = story.chapters;
  if (i >= CH.length && story !== STORIES.intro) { if (tourReturn != null && story.id !== 'tour') openStory('tour', tourReturn + 1); else toExplore(); return; }
  i = Math.max(0, Math.min(CH.length - 1, i));
  if (i === cur) return;
  const c = CH[i];
  const fromScene = SC.isActive();
  if (fromScene && CH[Math.max(0, Math.min(CH.length - 1, i))]?.part !== 'scene') SC.exit();
  twin?.release(); worldHop(null);
  cur = i; token++;
  const my = token;
  SG.ambient(false); twin?.ambient(false); SG.clearPulses(); clearInterval(remoteTimer); SG.setQuiet(!!c.show.quiet);
  if (exploring && !c.explore) setExplore(false);
  document.body.classList.remove('toc-open');
  document.body.classList.toggle('sheet-tall', c.part === 'try' && innerWidth < 900);   // Prova needs the room on a phone
  [...toc.children].forEach((li, k) => { li.classList.toggle('on', k === i); if (k === i) li.setAttribute('aria-current', 'step'); else li.removeAttribute('aria-current'); });
  $('#counter').hidden = !(c.explore || story.id === 'brain');   // the MQTT counter belongs where messages are the subject
  $('#mPos').textContent = `${i + 1}/${CH.length} · ${c.nav}`;
  $('#mExp').textContent = c.explore ? 'Kapitlen' : tourReturn != null && story.id !== 'tour' ? 'Turen' : 'Utforska';
  const url = '#' + (story === STORIES.intro ? c.id : `${story.id}/${i}`);
  if (!routing && navPush) history.pushState(null, '', url); else if (location.hash !== url) history.replaceState(null, '', url);
  navPush = false;
  const was = lift.to;
  lift.to = c.show.lift ?? 1;
  // the floor is drawn up from the ground each time it lifts out of the building
  if (was < 0.5 && lift.to >= 0.5) buildT0 = instant ? -1e9 : performance.now() + 700;
  Object.assign(show, { hub: !!c.show.hub, wires: !!c.show.wires, remote: !!c.show.remote, museum: !!c.show.museum });
  showL(c.labels || []);
  // a story chapter that is a scale scene: the scene takes over the screen, with this installation's part in its card
  if (c.part === 'scene') {
    const inst = twin.I[c.inst], S = SC.SCENES[c.scene], dir = S.kick.startsWith('Ut') ? 'ut' : 'in';
    const start = () => { if (my === token) SC.enter(c.scene, { dir, here: c.here, inst: inst.name, kick: `${inst.name} · ${String(i + 1).padStart(2, '0')}/${String(CH.length).padStart(2, '0')}`, nav: storyNav(i), onEsc: escUp, steps: c.steps, note: c.note, instId: inst.id }).then(() => { const t = $('#scTitle'); t.tabIndex = -1; if (my === token) t.focus({ preventScroll: true }); }); };
    if (instant || fromScene || CALM) { start(); return; }   // scene to scene: straight across, not back out through the model
    // one continuous zoom: into the hardware the scene is about (or up and out over the town), and the scene,
    // which starts far out (or close in), carries the motion on
    $('#card').classList.add('out'); twin?.focus(c.focus || c.inst);
    if (dir === 'in') goView({ ...anchorOf(c, inst), d: 0.22 });
    else { showL(['city']); goView({ at: 'museum', d: 1700, az: rig.az, el: 1.05 }); }   // the floor stays lifted: straight up, not through the roof
    Object.assign(tw, { dur: dir === 'in' ? 1900 : 2300, plunge: true });
    setTimeout(start, tw.dur - 320);
    setTimeout(() => { if (my === token) twin?.focus(null); }, tw.dur * 0.55);   // the lime highlight goes before the camera is inside it
    return;
  }
  if (c.part === 'world') {   // out over the town in this model: the river lights up
    lift.to = 0; showL(['city']); W.riverMat?.color.set(0xdff27e);
    const r = W.riverCenter; goView({ w: [r.x, 0, r.z], d: 2600, az: rig.az, el: 1.05 }, instant ? 1 : 2400);
  } else if (c.part === 'try' && twin.routeBox(c.inst)) {   // Prova: the whole signal route in view, not just the installation
    const b = twin.routeBox(c.inst), d = Math.max(c.view.d, b.r * 2.6 + 4), az = c.view.az;
    const sh = innerWidth > 900 ? d * 0.16 : 0;   // the card covers the left: move the target left so the route sits right of it
    goView({ at: [b.at[0] - Math.cos(az) * sh, b.at[1], b.at[2] + Math.sin(az) * sh], d, az, el: Math.max(0.7, c.view.el) }, instant ? 1 : 2400);
  } else goView(c.view, instant ? 1 : 2400);
  if (instant) { tw.dur = 1; }
  if (!c.explore) twin?.focus(c.focus || null);
  if (c.explore) { setTimeout(() => { if (my === token) setExplore(true); }, instant ? 0 : tw.dur + 80); return; }
  const card = $('#card');
  card.classList.add('out');
  setTimeout(() => {
    if (my !== token) return;
    renderCard(c, i); card.classList.remove('out');
    $('#live').textContent = `${story.title}, kapitel ${i + 1} av ${story.chapters.length}: ${$('#cTitle').textContent}`;
    // keyboard users keep their place: focus goes to the new chapter's title, not back to the top of the page
    const a = document.activeElement;
    if (!a || a === document.body || card.contains(a) || $('#toc').contains(a)) { $('#cTitle').tabIndex = -1; $('#cTitle').focus({ preventScroll: true }); }
  }, instant ? 0 : 380);
  if (c.enter) setTimeout(() => { if (my === token) c.enter(ctx(my)); }, instant ? 300 : 1800);
}
let remoteTimer = 0;
// phone: a handle on the card and the panel toggles their height; the position in the bottom bar opens the chapters
for (const id of ['#card', '#ctrl']) {
  const h = document.createElement('button'); h.className = 'sheet-h'; h.setAttribute('aria-label', 'Större eller mindre panel');
  h.onclick = () => document.body.classList.toggle('sheet-tall'); $(id).prepend(h);
}
$('#mPos').onclick = () => document.body.classList.toggle('toc-open');
$('a.skip').onclick = (e) => { e.preventDefault(); const t = exploring ? $('#ctrl') : SC.isActive() ? $('#scTitle') : $('#cTitle'); t.tabIndex = -1; t.focus(); };
$('#toc').addEventListener('click', () => document.body.classList.remove('toc-open'));
// ── "Gå utställningen": the tour (data/tour.json), one chapter per stop, in visitor order ──
function buildTour() {
  const OV = { at: [-0.5, 0, 2.1], d: 52, az: 0.45, el: 0.82 };
  const ch = (tourData?.stops || []).map((st, k) => {
    let view = OV, focus = null, room = st.room;
    if (st.kind === 'inst' && W.P[st.target] && twin.I[st.target]) { view = viewOf(twin.I[st.target], W.P, MEDIA); focus = st.target; room = twin.I[st.target]?.room; }
    else if (st.kind === 'station') { const c = W.P[stationData.stations[st.target]?.cube]; if (c) view = { at: [c.x, 1.2, c.y], d: 11, az: 0.45, el: 0.75 }; room = 4; }
    else if (st.kind === 'room') { const r = WD.ROOMS.find((x) => x.n === st.room); if (r) view = { at: [r.c[0], 0, r.c[1]], d: 20, az: 0.45, el: 0.95 }; }
    return { id: `tour-${k}`, part: 'tour', nav: st.title, stop: st, room, view, focus, labels: ['inst'], show: { lift: 1 } };
  });
  return { id: 'tour', title: 'Gå utställningen', sub: 'Rum 1 → 4, i besöksordning', chapters: ch };
}
function renderTour(c, i) {
  const st = c.stop, CH = story.chapters, R = twin.ROOMS[c.room];
  $('#card').classList.remove('cover');
  $('#cKick').textContent = `Gå utställningen · ${String(i + 1).padStart(2, '0')}/${String(CH.length).padStart(2, '0')}`;
  $('#cTags').innerHTML = R ? `<span>Rum ${c.room} · ${esc(R.name)}</span>` : '';
  $('#cTitle').textContent = st.title;
  $('#cFlow').textContent = ''; $('#cFacts').innerHTML = ''; $('#cSteps').innerHTML = ''; $('#cExtra').innerHTML = ''; $('#cSrc').innerHTML = '';
  let extra = '';
  if (st.kind === 'inst' && st.mode === 'helt') extra = `<div class="hops story-links"><button data-tour="inst:${esc(st.target)}"><i>hela berättelsen</i>${esc(twin.I[st.target]?.name || st.title)}</button></div>`;
  if (st.kind === 'station') extra = `<div class="hops story-links"><button data-tour="station:${esc(st.target)}"><i>stationens berättelse</i>${esc(st.title)}</button></div>`;
  if (st.kind === 'end') {   // three installations the tour walked past, and the way out into Utforska
    const on = new Set(CH.flatMap((x) => [x.stop.target, ...(x.stop.kind === 'station' ? stationData.stations[x.stop.target]?.inst || [] : [])]));
    const pool = Object.values(twin.I).filter((x) => x.web && x.type !== 'text' && x.type !== 'kort' && x.status !== 'utgick' && !on.has(x.id)).sort((a, b) => (twin.WEIGHTS[b.id] || 0) - (twin.WEIGHTS[a.id] || 0));
    extra = `<div class="tw-k">Inte med på turen</div><div class="hops story-links">${pool.slice(0, 3).map((x) => `<button data-tour="inst:${esc(x.id)}"><i>berättelse</i>${esc(x.name)}</button>`).join('')}</div>`;
  }
  $('#cBody').innerHTML = `<p>${esc(st.text)}</p>${extra}${st.bridge ? `<p class="bridge">${esc(st.bridge)}</p>` : ''}`;
  TOUR_SEEN.add(i); [...toc.children].forEach((li, k) => li.classList.toggle('seen', TOUR_SEEN.has(k)));
  $('#cBody').querySelectorAll('[data-tour]').forEach((b) => b.onclick = () => openStory(b.dataset.tour, 0, { fromTour: i }));
  $('#cExtra').append(storyNav(i));
}
const TOUR_SEEN = new Set();   // the stops already visited, ticked in the chapter list
// the planned travel centre's label in the town shows only in the stories about the Skellefteå triangle
const PLANNED = new Set(['inst:triangeln', 'inst:resecentrum', 'inst:norrbotniabanan', 'inst:hamnen', 'inst:flygplatsen', 'station:rorlighet']);
const showL = (a) => WD.showLabels(a.includes('city') && PLANNED.has(story?.id) ? [...a, 'city-plan'] : a);
// where the camera dives in for a scale scene: named hardware for some stories, else the nearest device of the kind
// the scene is about (within 5 m of the installation), else the installation itself
const ZOOM = { 'floden/djupkamera': 'hw:kinect-floden', 'dokumentaren/djupkamera': 'hw:kinect-doc', 'ace/djupkamera': 'hw:orbbec-ace',
  'sokrates/neuron': [6.85, 1.5, 10.4], 'dialogen/neuron': 'host:macmini1', 'dialogen/macmini': 'host:macmini1' };   // Sokrates: into the bust's head
const NEAR = { ultraljud: ['dev', /^(ultraljud|tunnel|maskinisterna|alimak)/], pir: ['dev', /^pir/], knapp: ['dev', /^(pushbutton|droneport|skill)/],
  hall: ['dev', /^housing$/], mems: ['dev', /^sua$/], trainer: ['dev', /^bike$/], shelly: ['dev', /^emob$/], qi: ['dev', /^emob$/], esp32: ['dev', /./],
  macmini: ['host', /^(macmini|resolume)/], djupkamera: ['hw', /./] };
function anchorOf(c, inst) {
  const z = ZOOM[`${inst.id}/${c.scene}`], q = W.P[inst.id], home = new THREE.Vector3(q.x, 1.0, q.y);
  const pool = (k) => (k === 'hw' ? WD.HW : k === 'host' ? HOST : DEV);
  let p = home, n = null;
  if (Array.isArray(z)) p = new THREE.Vector3(...z);
  else if (z) { const [k, id] = z.split(':'), o = pool(k)[id]; if (o) { p = o.pos; n = o.n || null; } }
  else if (NEAR[c.scene]) {
    const [k, re] = NEAR[c.scene]; let best = 5;
    for (const [id, o] of Object.entries(pool(k))) {
      const dd = Math.hypot(o.pos.x - home.x, o.pos.z - home.z);
      if (re.test(id) && dd < best) { best = dd; p = o.pos; n = o.n || null; }
    }
  }
  // hardware that looks one way is met head-on; anything else from the side the camera is already on
  return { at: p.toArray(), az: n ? Math.atan2(n.x, n.z) : rig.az, el: n ? 0.16 : Math.min(rig.el, 0.55) };
}
const ctx = (my) => ({
  alive: () => my === token,
  step: (n) => { if (my === token) setStep(n); },
  ambient: (on, o) => SG.ambient(on, o),
  slideStory: SG.slideStory,
  cloudTrip: (kind, step, alive) => SG.cloudTrip(scene, kind, step, alive, (k) => { if (my === token) goView(story.chapters[cur].shots[k], 2200); }),
  blinkHost: SG.blinkHost,
  hostIds: () => Object.keys(HOST),
  sweep: () => sweep(my),
  remoteLoop: () => { const f = () => remoteHop(); f(); remoteTimer = setInterval(f, 1700); },
});
function remoteHop() {
  const hubW = W.F.localToWorld(WD.HUBP.clone());
  const toB = Math.random() < 0.7;
  SG.send(SG.arcWorld(hubW, toB ? W.berget : W.slack), scene, { dur: 2200, size: 0.022 });
}

// health sweep: a ring spreads from the hub, every computer answers, the offline lights show, then Slack
const sweepRing = new THREE.Mesh(new THREE.RingGeometry(0.96, 1, 64).rotateX(-Math.PI / 2), new THREE.MeshBasicMaterial({ color: WD.C.ink, transparent: true, opacity: 0, depthWrite: false }));
sweepRing.position.set(WD.HUBP.x, 0.03, WD.HUBP.z); W.F.add(sweepRing);
let sweepT = -1;
async function sweep(my) {
  sweepT = 0;
  const ids = Object.keys(HOST).sort((a, b) => HOST[a].pos.distanceTo(WD.HUBP) - HOST[b].pos.distanceTo(WD.HUBP));
  for (const id of ids) {
    if (my !== token) return;
    SG.send(new THREE.LineCurve3(WD.HUBP.clone(), HOST[id].pos.clone()), W.F, { dur: 500, size: 0.014 }).then(() => SG.blinkHost(id, 1300));
    await new Promise((r) => setTimeout(r, 150));
  }
  for (const n of ['TNT tree 03', 'Treebook']) SG.pop(W.F, FIX[n].pos, `${n} · offline`, 2600);
  await new Promise((r) => setTimeout(r, 900));
  if (my !== token) return;
  SG.svcBlink('tnt-diagnose');
  await SG.send(SG.arcWorld(W.F.localToWorld(WD.HUBP.clone()), W.slack), scene, { dur: 2400, size: 0.026 });
  if (my === token) SG.pop(scene, W.slack, 'Daglig rapport: 60/62 OK', 2400);
}

// ── input ──
let wheelLock = 0;
addEventListener('wheel', (e) => {
  if (exploring || SC.isActive()) return;
  const sc = e.target.closest?.('#card, #ctrl, #toc');
  if (sc && sc.scrollHeight > sc.clientHeight + 4) return;
  const now = performance.now();
  if (now < wheelLock || Math.abs(e.deltaY) < 12) return;
  wheelLock = now + 1100;
  go(cur + Math.sign(e.deltaY));
}, { passive: true });
// a hidden tab pauses the simulated visitors, so pulses don't pile up and burst on return
document.addEventListener('visibilitychange', () => { if (document.hidden) twin.ambient(false); else if (exploring) twin.ambient($('#ambient').checked); });

// phones: a bottom bar and swipes (left/up = next) outside the explore panel
$('#mPrev').onclick = () => go(cur - 1);
$('#mNext').onclick = () => go(cur + 1);
$('#mExp').onclick = () => $('#explore').click();
let touch0 = null;
addEventListener('touchstart', (e) => { touch0 = exploring || e.target.closest('#ctrl, #mnav, #card .tw-ctl, #side') ? null : [e.touches[0].clientX, e.touches[0].clientY]; }, { passive: true });
addEventListener('touchend', (e) => {
  if (!touch0) return;
  const dx = e.changedTouches[0].clientX - touch0[0], dy = e.changedTouches[0].clientY - touch0[1]; touch0 = null;
  const sc = e.target.closest?.('#card');
  if (Math.abs(dx) > 60 && Math.abs(dx) > Math.abs(dy) * 1.3) go(cur + (dx < 0 ? 1 : -1));
  else if (!sc && Math.abs(dy) > 70) go(cur + (dy < 0 ? 1 : -1));
}, { passive: true });
addEventListener('keydown', (e) => {
  // leave keys alone inside controls and fields (sliders, the live URL, buttons) and with modifiers
  if (e.ctrlKey || e.metaKey || e.altKey || e.target.closest?.('input, textarea, select, [contenteditable]')) return;
  if (e.key === 'Escape' && document.body.classList.contains('toc-open')) { document.body.classList.remove('toc-open'); return; }
  if ((e.key === ' ' || e.key === 'Enter') && e.target.closest?.('button, summary, #toc li, .lb, a')) return;   // those keys belong to the focused control
  if (e.key === 'Escape' && exploring) { twin.list({ fly: true }); return; }
  if (e.key === 'Escape' && story !== STORIES.intro) { escUp(); return; }
  if (e.key === 'ArrowRight' || e.key === 'ArrowDown' || e.key === 'PageDown' || e.key === ' ') { e.preventDefault(); go(cur + 1); }
  if (e.key === 'ArrowLeft' || e.key === 'ArrowUp' || e.key === 'PageUp') { e.preventDefault(); go(cur - 1); }
  if (e.key === 'Home') go(0);
  if (e.key === 'End') go(story.chapters.length - 1);
  if (e.key === 'e' || e.key === 'E') $('#explore').click();
});
$('#explore').onclick = () => { if (exploring && lastStory) { const l = lastStory; lastStory = null; openStory(l.key, l.i); } else if (exploring) go(Math.max(0, exploreAt() - 1)); else toExplore(); };
WD.BOIL.res.value.set(innerWidth, innerHeight);
addEventListener('resize', () => {
  WD.BOIL.res.value.set(innerWidth, innerHeight);
  camera.aspect = innerWidth / innerHeight; camera.updateProjectionMatrix();
  renderer.setSize(innerWidth, innerHeight); css.setSize(innerWidth, innerHeight);
});

// clicking a label or a control button fires that installation's chain
const KEY2INST = { tunnel: 'tunnel', tunnel1: 'tunnel', theremin: 'theremin', maskinisterna: 'theremin', rpi4: 'theremin', alimak: 'alimak', democracy: 'dialog', slide: 'slide', ultraljud1: 'slide',
  recycling: 'recycling', 'ipad-recycling': 'recycling', rpi9: 'recycling', skykraft: 'skykraft', macmini4: 'skykraft', house: 'house', housing: 'house', 'macmini-housing': 'house',
  droneport: 'drone', rpi3: 'drone', bike: 'bike', rpi5: 'bike', macmini6: 'bike', ace: 'ace', sua: 'sua', 'ipad-sua': 'sua', skills: 'skill', skill: 'skill', pir2: 'skill',
  button: 'button', pushbutton1: 'button', spin: 'spin', spinningboxes: 'spin', pir1: 'spin', pir4: 'spin', emob: 'emob', macmini1: 'dialog', greenhouse: 'slide', cloud: 'spin' };
$('#labels').addEventListener('keydown', (e) => { if ((e.key === 'Enter' || e.key === ' ') && e.target.closest('.lb')) { e.preventDefault(); e.stopPropagation(); e.target.closest('.lb').click(); } });
// Utforska: a click near a light strip, a cube, the cloud, the greenhouse or a speaker says what it is and what lights it
const SPK_NAME = { klimat: 'klimathörnet', boende: 'boendehörnet', blommor: 'blommorna (psalmen, rum 2–3)', mobilitet: 'rörlighet och kompetens', social: 'socialhörnet', mitten: 'mitten (åskan)' };
let downAt = null;
renderer.domElement.addEventListener('pointerdown', (e) => { downAt = [e.clientX, e.clientY]; });
renderer.domElement.addEventListener('pointerup', (e) => {
  if (!exploring || !downAt || Math.hypot(e.clientX - downAt[0], e.clientY - downAt[1]) > 5) return;   // a drag turns the view
  const pt = new THREE.Vector3(), best = { d: 30, what: null };
  const near = (local, what) => {
    pt.copy(local); W.F.localToWorld(pt); pt.project(camera);
    if (pt.z > 1) return;
    const d = Math.hypot((pt.x + 1) / 2 * innerWidth - e.clientX, (1 - pt.y) / 2 * innerHeight - e.clientY);
    if (d < best.d) { best.d = d; best.what = [local, what]; }
  };
  for (const [n, f] of Object.entries(FIX)) if (f.pos) near(f.pos, () => {
    const by = Object.values(twin.I).filter((x) => x.web?.route?.includes(`fix:${n}`)).map((x) => x.name);
    return `${n}${LEDS[n] ? ` · ${LEDS[n].toLocaleString('sv-SE')} lysdioder` : ''}${by.length ? ` · tänds av ${by.slice(0, 3).join(', ')}` : ''}`;
  });
  for (const [n, p] of Object.entries(W.speakers || {})) near(p, () => `Högtalare · ${SPK_NAME[n] || n} · rpi6`);
  if (best.what) { const [p, f] = best.what; SG.pop(W.F, p.clone().add(new THREE.Vector3(0, 0.3, 0)), f(), 3600); }
});
$('#labels').addEventListener('click', (e) => {
  const el = e.target.closest('.lb'); if (!el) return;
  const o = WD.LABELS.find((l) => l.userData.el === el);
  if (o?.userData.key?.startsWith('station:')) { openStory(o.userData.key); return; }
  if (o?.userData.key?.startsWith('room:')) {   // a room label: fly into that room
    const r = WD.ROOMS.find((x) => x.n === +o.userData.key.slice(5));
    if (r) {
      if (!exploring) toExplore(); flyTo(new THREE.Vector3(r.c[0], 0, r.c[1]), { d: 17, el: 0.9 });
      const h = [...document.querySelectorAll('#tw h4')].find((x) => x.textContent.startsWith(`Rum ${r.n}`));
      if (h) { h.closest('details')?.setAttribute('open', ''); h.scrollIntoView({ block: 'start', behavior: CALM ? 'auto' : 'smooth' }); }
    }
    return;
  }
  const key = o?.userData.key === 'cloud' && exploring ? 'vaxthuset' : o?.userData.key;   // the cloud is part of Växthuset's card
  if (twin.has(key)) { openStory(`inst:${key}`); return; }
  if (twin.labelClick(key)) return;   // a sensor fires its installation on the bus; a computer says what runs there
  const id = KEY2INST[key];
  if (id) SG.trigger(id);
});
const log = $('#log');
let busCount = 0, realSeen = false;
const twin = initTwin({
  scene, flyTo, worldHop: (k) => worldHop(k), visitors: !CALM, data: { installations: instData, placements: se26.PL, M: se26.M, stations: stationData.stations },
  ensureExplore: () => { if (!exploring && !story.chapters[cur]?.explore) toExplore(); },
  onPick: (id) => openStory(`inst:${id}`), onStory: (k) => openStory(k),
  log: (ev, inst) => {
    const local = ev.topic.startsWith('local/');
    if (!local) busCount++;   // the counter counts MQTT messages, not the twin's own local events
    if (ev.src !== 'sim' && !realSeen) { realSeen = true; $('#cntLbl').textContent = 'MQTT-meddelanden · live och simulerade'; }
    const what = ev.topic === 'cloud' ? `cloud ← ${String(ev.payload).replace(/"/g, '')} (2 s-regeln)` : local ? '(lokalt)' : ev.topic;
    const row = `${new Date().toLocaleTimeString('sv-SE')} <b>${esc(what)}</b> · ${inst ? esc(inst.name) : '–'} <i class="src-${ev.src}">${ev.src === 'sim' ? 'sim' : ev.src}</i>`;
    const mini = document.querySelector('#card .tw-minilog');   // in a story's Prova chapter: the last three
    if (mini) { const d = document.createElement('div'); d.innerHTML = row; mini.prepend(d); while (mini.children.length > 3) mini.lastChild.remove(); }
    if (!exploring) return;
    const d = document.createElement('div'); d.innerHTML = row;
    if (inst) d.onclick = () => openStory(`inst:${inst.id}`);   // a row opens that installation
    log.prepend(d); while (log.children.length > 12) log.lastChild.remove();
    $('#logLast').innerHTML = `· <b>${esc(what)}</b>`;
  },
});
STORIES.tour = buildTour();
$('#ambient').onchange = (e) => { visitorsOn = e.target.checked; twin.ambient(e.target.checked); };
// sketch visitors walk between installations; in Utforska each arrival fires that installation
let visitorsOn = $('#ambient').checked;
// scale hops: while one is open the world camera, its labels and panels rest
let hopState = null;
SC.initScales({
  renderer,
  onEnter: () => {
    document.body.classList.add('in-scene');
    if (hopState) return;
    hopState = { ctl: controls.enabled, card: $('#card').hidden, ctrl: $('#ctrl').hidden };
    controls.enabled = false; $('#labels').hidden = true; $('#card').hidden = true; $('#ctrl').hidden = true;
  },
  onExit: () => {
    document.body.classList.remove('in-scene');
    if (!hopState) return;
    controls.enabled = hopState.ctl; $('#labels').hidden = false; $('#card').hidden = hopState.card; $('#ctrl').hidden = hopState.ctrl;
    hopState = null; last = performance.now();
  },
});
// a hop that stays in the world model: from Floden out to Skellefteälven through the town
function worldHop(kind) {
  W.riverMat?.color.set(kind === 'river' ? 0xdff27e : WD.C.water);
  if (kind !== 'river') return;
  const c = W.riverCenter;
  flyTo(W.F.worldToLocal(c.clone()), { d: 2600, el: 1.05, az: rig.az });
  SG.pop(scene, c.clone().setY(30), 'Skellefteälven · från fjällen till havet', 6000);
}
initLife({
  F: W.F, grid: walk, count: CALM ? 0 : 12,
  targets: Object.values(twin.I).filter((i) => i.web).map((i) => ({ id: i.id, pos: i.pos, w: twin.WEIGHTS?.[i.id] || 1 })),
  onArrive: (id) => { if (exploring) twin.fire(id); },
});
// each theme cube carries its station's name; clicking it opens the station's story
for (const [sid, st] of Object.entries(stationData.stations || {})) {
  const c = W.P[st.cube]; if (!c) continue;
  const l = WD.label(st.name, { sub: 'station', groups: ['inst', 'rooms'], stalk: 16, key: `station:${sid}` });
  l.position.set(c.x, 3.75, c.y); W.F.add(l);
}
// room focus (world.js DIM): a soft map of which room each spot of the floor belongs to (nearest approved installation
// or room centre), and a focus that follows the story or what the camera looks at in Utforska
const dimMap = (() => {
  const S = 2, w = Math.ceil(walk.w / S), h = Math.ceil(walk.h / S), cell = walk.cell * S;
  const seeds = se26.PL.items.filter((q) => q.approved && q.room >= 1 && q.room <= 4 && q.x != null).map((q) => [q.x, q.y, q.room]);
  for (const r of WD.ROOMS) seeds.push([r.c[0], r.c[1], r.n]);
  const room = new Uint8Array(w * h), data = new Uint8Array(w * h * 4);
  for (let j = 0; j < h; j++) for (let i = 0; i < w; i++) {
    const x = walk.x0 + (i + 0.5) * cell, z = walk.z0 + (j + 0.5) * cell;
    let best = Infinity, r = 0;
    for (const [sx, sz, sr] of seeds) { const d = (sx - x) ** 2 + (sz - z) ** 2; if (d < best) { best = d; r = sr; } }
    room[j * w + i] = r; if (r) data[(j * w + i) * 4 + r - 1] = 255;
  }
  const tex = new THREE.DataTexture(data, w, h, THREE.RGBAFormat);
  tex.magFilter = tex.minFilter = THREE.LinearFilter; tex.needsUpdate = true;
  WD.DIM.mask.value = tex; WD.DIM.box.value.set(walk.x0, walk.z0, w * cell, h * cell);
  return { at: (x, z) => { const i = Math.floor((x - walk.x0) / cell), j = Math.floor((z - walk.z0) / cell); return i >= 0 && j >= 0 && i < w && j < h ? room[j * w + i] : 0; } };
})();
const dimTmp = new THREE.Vector3();
function focusRoom() {
  const ch = story.chapters[cur];
  if (ch?.inst || (ch?.focus && !exploring)) return twin.I[ch.inst || ch.focus]?.room || 0;
  if (exploring && !tw && camera.position.distanceTo(controls.target) < 24) { W.F.worldToLocal(dimTmp.copy(controls.target)); return dimMap.at(dimTmp.x, dimTmp.z); }
  return 0;
}
SG.setLogger((I, topic) => {
  if (!exploring) return;
  const d = document.createElement('div');
  d.innerHTML = `${new Date().toLocaleTimeString('sv-SE')} <b>${topic}</b> · ${I.name}`;
  log.prepend(d); while (log.children.length > 12) log.lastChild.remove();
});

// ── frame loop ──
const sVal = $('#sVal'), sUnit = $('#sUnit'), sChap = $('#sChap'), mqttN = $('#mqttN');
function fmtField(m) {
  const e = Math.floor(Math.log10(m));
  let v, u;
  if (m < 1e-6) { v = (m * 1e9).toFixed(m < 1e-8 ? 1 : 0); u = 'nm'; }
  else if (m < 1e-3) { v = (m * 1e6).toFixed(m < 1e-5 ? 1 : 0); u = 'µm'; }
  else if (m < 0.01) { v = (m * 1e3).toFixed(1); u = 'mm'; }
  else if (m < 1) { v = (m * 100).toFixed(m < 0.1 ? 1 : 0); u = 'cm'; }
  else if (m < 1000) { v = m < 10 ? m.toFixed(1) : Math.round(m).toString(); u = 'm'; }
  else { v = (m / 1000).toFixed(m < 10000 ? 2 : m < 1e5 ? 1 : 0).replace('.', ','); u = 'km'; }
  return [v.replace('.', ','), `${u} · 10${String(e).replace('-', '⁻').replace(/\d/g, (d) => '⁰¹²³⁴⁵⁶⁷⁸⁹'[d])} m`];
}
let last = performance.now(), T = 0, viewOff = 0, viewOffY = 0, shadowKey = '';
const museumBase = new THREE.Color(WD.C.white), LIMEC = new THREE.Color(WD.C.lime);
function frame(now) {
  const dt = Math.min(64, now - last); last = now; T += dt / 1000;
  if (SC.isActive()) {   // a scale hop is open: render its own scene instead of the world
    const cur = SC.current(), f = SC.frame(now, dt), [v, u] = cur?.field ? cur.field(f) : fmtField(f);   // a scene may measure in something else, e.g. years
    sVal.textContent = v; sUnit.textContent = u; sChap.textContent = cur?.title || '';
    requestAnimationFrame(frame); return;
  }
  if (exploring && !tw) { controls.update(); rig.t.copy(controls.target); rig.d = camera.position.distanceTo(controls.target); }
  else {
    stepRig(now);
    if (!tw && !exploring && !CALM) rig.az += dt * 0.000012;   // a slow drift so the model never sits dead still
    placeCamera();
  }
  // lift the exhibition floor out of the building
  lift.v += (lift.to - lift.v) * Math.min(1, dt / 1000 * 1.6);
  EX.position.y = EXY(lift.v);
  EX.visible = lift.v > 0.02;
  // doll's-house cut of the walls; while the floor is being drawn up the cut rises from the ground
  const bk = Math.max(0, Math.min(1, (now - buildT0) / 2600)), be = 1 - Math.pow(1 - bk, 3);
  W.clip.constant = EX.position.y + 0.02 + (W.cutH - 0.02) * be;
  const hm = W.model.material;
  for (const m of [hm[1], hm[2]]) { m.transparent = bk < 1 || m === hm[2]; m.opacity = (m === hm[2] ? 0.55 : 1) * Math.max(0, (bk - 0.6) / 0.4); }
  W.hangLines.visible = bk > 0.85;
  // x-ray tube from the camera to the target in close explore views
  const xt = exploring && !tw ? controls.target : rig.t, xd = camera.position.distanceTo(xt);
  WD.XRAY.on.value = (exploring || story.chapters[cur]?.inst) && lift.v > 0.5 && xd < 40 ? 1 : 0;   // also in installation stories
  WD.XRAY.eye.value.copy(camera.position); WD.XRAY.tgt.value.copy(xt);
  WD.XRAY.r.value = THREE.MathUtils.clamp(xd * 0.1, 0.7, 2.2);
  // line boil, ~12 steps a second
  WD.BOIL.step.value = CALM ? 0 : Math.floor(T * 12) % 97;
  WD.TUBES.calm = CALM; WD.tubeFrame(performance.now());
  W.guides.scale.y = Math.max(0.01, EX.position.y - 0.3 - W.museumTop);
  W.museumMat.color.lerp(show.museum ? LIMEC : museumBase, Math.min(1, dt / 300));
  W.hub.visible = show.hub && lift.v > 0.5;
  W.wires.visible = show.wires && lift.v > 0.5;
  remote.visible = show.remote;
  // small animations
  const R = W.river;
  for (const w of W.waves) {
    const a = w.line.geometry.attributes.position;
    for (let i = 0; i < w.n; i++) { const x = R.x0 + i / (w.n - 1) * (R.x1 - R.x0); a.setXYZ(i, x, w.y + Math.sin(x * 0.85 + T * 1.3 + w.k * 0.9) * 0.08 + Math.sin(x * 2.1 - T * 0.7) * 0.03, R.z); }
    a.needsUpdate = true;
  }
  W.spin.forEach((b, i) => (b.rotation.y = T * (0.6 + i * 0.25)));
  W.house.rotation.y = CALM ? 0 : Math.sin(T * 0.4) * 1.2;
  SG.updateFixtures(dt); SG.updatePulses(dt); updateMedia(dt, lift.v > 0.5 && rig.d < 160);
  updateLife(dt, lift.v > 0.5 && rig.d < 200 && (!exploring || visitorsOn));
  // camera range, fog, shadows follow the scale
  camera.near = Math.max(0.002, rig.d * 0.02); camera.far = rig.d * 60 + 3000; camera.updateProjectionMatrix();
  scene.fog.near = rig.d * 1.4; scene.fog.far = rig.d * rig.fogF;
  const field = 2 * rig.d * Math.tan(THREE.MathUtils.degToRad(camera.fov / 2)) * camera.aspect;
  const sc = sun.shadow.camera, half = Math.min(field * 0.75, 2600);
  const L = half * 3;
  sun.target.position.copy(rig.t); sun.position.copy(rig.t).addScaledVector(SUN_DIR, L);
  sc.left = sc.bottom = -half; sc.right = sc.top = half; sc.near = L * 0.02; sc.far = L * 2.5; sc.updateProjectionMatrix();
  sun.shadow.bias = -0.0004; sun.shadow.normalBias = half * 0.0012;
  const [v, u] = fmtField(field); sVal.textContent = v; sUnit.textContent = u;
  sChap.textContent = exploring ? 'utforska' : `${String(cur + 1).padStart(2, '0')}:${story.chapters[cur]?.nav || ''}`;
  mqttN.textContent = (SG.stats.count + busCount).toLocaleString('sv-SE');
  // keep the subject in the free area to the right of the card (like 3DMK)
  const panel = exploring ? $('#ctrl') : $('#card');
  const narrow = innerWidth < 900;
  const fl = narrow || panel.hidden ? 0 : panel.getBoundingClientRect().right + 10;
  // on phones the panel sits at the bottom: lift the subject into the free space above it
  const ft = narrow && !panel.hidden && !panel.classList.contains('cover') ? (innerHeight - panel.getBoundingClientRect().top + 10) : 0;
  viewOff += (fl / 2 - viewOff) * Math.min(1, dt / 350);
  viewOffY += (ft / 2 - viewOffY) * Math.min(1, dt / 350);
  camera.setViewOffset(innerWidth, innerHeight, -viewOff, viewOffY, innerWidth, innerHeight);
  const sk = `${camera.position.x.toFixed(2)},${camera.position.y.toFixed(2)},${camera.position.z.toFixed(2)},${EX.position.y.toFixed(3)},${lift.v > 0.02}`;
  if (sk !== shadowKey) { shadowKey = sk; renderer.shadowMap.needsUpdate = true; }
  // a room in focus: the other rooms fade to pale lines (fading back out keeps the last room's mask)
  const fr = focusRoom();
  if (fr) WD.DIM.room.value.set(+(fr === 1), +(fr === 2), +(fr === 3), +(fr === 4));
  WD.DIM.on.value += ((fr ? 1 : 0) - WD.DIM.on.value) * Math.min(1, dt / 450);
  // from afar the small objects' sketch lines go, so the floor reads as a plan; up close they come back
  if (W.modelLines) W.modelLines.visible = camera.position.distanceTo(exploring && !tw ? controls.target : rig.t) < 34;
  renderer.render(scene, camera);
  css.render(scene, camera);
  tidy(now);
  requestAnimationFrame(frame);
}
// the first view comes from the link (route above)
route(location.hash, true);
// compile every material once while the cover shows, hidden ones too, so the floor's first appearance doesn't stutter
{ const hid = []; scene.traverse((o) => { if (!o.visible) { hid.push(o); o.visible = true; } }); try { renderer.compile(scene, camera); renderer.shadowMap.needsUpdate = true; renderer.render(scene, camera); } catch (e) { console.warn('warm-up', e); } hid.forEach((o) => (o.visible = false)); }   // the shadow pass's programs too
requestAnimationFrame(frame);
window.__mb = { go, openStory, get CHAPTERS() { return story.chapters; }, rig, W, camera, controls };
