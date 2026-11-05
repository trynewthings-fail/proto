// Scale scenes, track E13: places and phenomena from the printed exhibition texts (docs/kallor/utstallningstexter.md):
// Berget (the Skellefte field's geology), the forest after the ice, EcoLink, the Qi coil, Droneport at Hammarängen.
// Same pattern as js/scales.js: add scenes to SCENES and the cards' buttons to HOPS (append, never replace a card's list).
import * as THREE from 'three';
import { SCENES, HOPS, V, INK, LIME, ease, fmt, ink, label, poly, ring, canvas, readout, loadMesh } from '../scales.js';
import { C, lam, bline, bdash } from '../world.js';

const hop = (card, h) => (HOPS[card] ||= []).push(h);

// ── shared helpers ──
const clamp = THREE.MathUtils.clamp, lerp = THREE.MathUtils.lerp;
const smooth = (x, a, b) => { const k = clamp((x - a) / (b - a), 0, 1); return k * k * (3 - 2 * k); };
const LIME_D = 0x8fb300;   // lime that still reads as a thin line on white
const WARM = 0xc9473b, COOL = 0x6f9599;
const DS = THREE.DoubleSide;
const basic = (color, o = {}) => new THREE.MeshBasicMaterial({ color, ...o });
const ghostMat = (op = 0.35) => lam(0xffffff, { transparent: true, opacity: op, depthWrite: false });
const rng = (s) => () => (s = (s * 16807) % 2147483647) / 2147483647;
const show = (lb, on) => { lb.visible = !!on; };
const fit = (land, port) => (innerWidth < innerHeight ? { ...land, ...port } : land);   // portrait phones get their own framing
const big = (lb, on) => lb.element.classList.toggle('big', !!on);
// a range control; a visitor's touch takes over from the automatic run for 20 seconds
function slider(api, name, min, max, val, step = 1) {
  const l = document.createElement('label'); l.className = 'sc-ctl';
  l.innerHTML = `${name} <input type="range" min="${min}" max="${max}" step="${step}" value="${val}"> <output></output>`;
  api.live.append(l);
  const s = { inp: l.querySelector('input'), out: l.querySelector('output'), at: 0 };
  s.inp.addEventListener('input', () => (s.at = performance.now()));
  s.manual = () => s.at && performance.now() - s.at < 20000;
  return s;
}
function opts(api, names) {
  const d = document.createElement('div'); d.className = 'sc-opts';
  d.innerHTML = names.map((n, i) => `<button data-i="${i}">${n}</button>`).join('');
  api.live.append(d);
  return { el: d, set: (k) => d.querySelectorAll('button').forEach((b, i) => b.classList.toggle('on', i === k)) };
}
// an automatic run over a list of stops: rest at each, glide to the next, rest longer at the end, start again
function tourU(stops, t, move = 3.6, hold = 2.2, end = 6) {
  const n = stops.length - 1, seg = move + hold, total = hold + n * seg + end;
  let s = t % total;
  if (s < hold) return stops[0];
  s -= hold;
  const i = Math.floor(s / seg);
  if (i >= n) return stops[n];
  const f = s - i * seg;
  return f < move ? lerp(stops[i], stops[i + 1], ease(f / move)) : stops[i + 1];
}
// a polyline with arc length, for things that travel along it
function track(pts, closed = false) {
  const P = closed ? [...pts, pts[0]] : pts, L = [0];
  for (let i = 1; i < P.length; i++) L.push(L[i - 1] + P[i].distanceTo(P[i - 1]));
  const len = L[L.length - 1];
  const at = (u, out = V(0, 0, 0)) => {
    const s = (closed ? ((u % 1) + 1) % 1 : clamp(u, 0, 1)) * len; let lo = 0, hi = L.length - 1;
    while (hi - lo > 1) { const m = (lo + hi) >> 1; L[m] < s ? (lo = m) : (hi = m); }
    return out.lerpVectors(P[lo], P[hi], (s - L[lo]) / (L[hi] - L[lo] || 1));
  };
  return { P, len, at, seg: (u) => { const s = (((u % 1) + 1) % 1) * len; let i = 0; while (i < L.length - 2 && L[i + 1] < s) i++; return i; } };
}
// many small dots, a fixed pixel size; `vc` gives them their own colours
function dots(g, n, size, color, { vc = false, depthTest = true, opacity = 1 } = {}) {
  const pos = new Float32Array(n * 3), geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.BufferAttribute(pos, 3));
  let col = null;
  if (vc) { col = new Float32Array(n * 3); geo.setAttribute('color', new THREE.BufferAttribute(col, 3)); }
  const pts = new THREE.Points(geo, new THREE.PointsMaterial({ color: vc ? 0xffffff : color, vertexColors: vc, size, sizeAttenuation: false, depthTest, transparent: true, opacity }));
  pts.frustumCulled = false; pts.renderOrder = 3; g.add(pts);
  const hide = (i) => pos.set([0, -1e5, 0], i * 3);
  return { pos, col, geo, pts, hide, done: () => { geo.attributes.position.needsUpdate = true; if (col) geo.attributes.color.needsUpdate = true; } };
}
// a line whose points change every frame
function liveLine(g, n, color, o = {}) {
  const l = poly(Array.from({ length: n }, () => V(0, 0, 0)), color, o);
  l.frustumCulled = false; g.add(l);
  const pos = l.geometry.attributes.position;
  return { l, set: (i, x, y, z) => pos.setXYZ(i, x, y, z), done: () => { pos.needsUpdate = true; l.geometry.computeBoundingSphere(); } };
}
const segs = (arr, color, opacity = 1) => {   // [x, y, z, x, y, z, …] pairs → one LineSegments
  const geo = new THREE.BufferGeometry(); geo.setAttribute('position', new THREE.Float32BufferAttribute(arr, 3));
  return new THREE.LineSegments(geo, bline({ color, transparent: opacity < 1, opacity }));
};

// ═════════ Berget: the Skellefte field's bedrock, 1,89 billion years in a cross-section ═════════
// A block cut open at the front. Each layer is a slab between two height curves y(x) that change with time:
// the volcanic seafloor builds up, ore forms on it, mud and sand cover it, the crust folds, the mountains wear down
// to a plain, ice comes and goes, and soil and forest grow on top. Unit: schematic, roughly 100 m.
const NX = 120, BX = 20, BD = 6, BOT = -8, XS = Array.from({ length: NX + 1 }, (_, i) => -BX + (2 * BX * i) / NX);
function slab(g, mat, top = false) {
  const n = NX + 1, nv = n * 4 + 8 + (top ? n * 2 : 0);
  const pos = new Float32Array(nv * 3), nor = new Float32Array(nv * 3), col = new Float32Array(nv * 3).fill(1), idx = [];
  const F = (i, s) => i * 2 + s, B = (i, s) => n * 2 + i * 2 + s, E = n * 4, T = (i, s) => n * 4 + 8 + i * 2 + s;
  for (let i = 0; i < NX; i++) {
    idx.push(F(i, 0), F(i + 1, 0), F(i + 1, 1), F(i, 0), F(i + 1, 1), F(i, 1));
    idx.push(B(i, 0), B(i + 1, 1), B(i + 1, 0), B(i, 0), B(i, 1), B(i + 1, 1));
    if (top) idx.push(T(i, 0), T(i + 1, 0), T(i + 1, 1), T(i, 0), T(i + 1, 1), T(i, 1));
  }
  idx.push(E, E + 1, E + 2, E, E + 2, E + 3, E + 4, E + 6, E + 5, E + 4, E + 7, E + 6);
  for (let i = 0; i < n; i++) for (let s = 0; s < 2; s++) { nor[F(i, s) * 3 + 2] = 1; nor[B(i, s) * 3 + 2] = -1; }
  for (let k = 0; k < 4; k++) { nor[(E + k) * 3] = -1; nor[(E + 4 + k) * 3] = 1; }
  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.BufferAttribute(pos, 3)); geo.setAttribute('normal', new THREE.BufferAttribute(nor, 3)); geo.setAttribute('color', new THREE.BufferAttribute(col, 3));
  geo.setIndex(idx);
  const m = new THREE.Mesh(geo, mat); m.frustumCulled = false; g.add(m);
  const P = (v, x, y, z) => { pos[v * 3] = x; pos[v * 3 + 1] = y; pos[v * 3 + 2] = z; };
  return {
    m,
    set(bot, tp, cols) {
      for (let i = 0; i < n; i++) {
        const x = XS[i];
        P(F(i, 0), x, bot[i], BD); P(F(i, 1), x, tp[i], BD); P(B(i, 0), x, bot[i], -BD); P(B(i, 1), x, tp[i], -BD);
        if (top) {
          P(T(i, 0), x, tp[i], BD); P(T(i, 1), x, tp[i], -BD);
          const i0 = Math.max(0, i - 1), i1 = Math.min(NX, i + 1), dy = tp[i1] - tp[i0], dx = XS[i1] - XS[i0], l = Math.hypot(dx, dy);
          for (const v of [T(i, 0), T(i, 1)]) { nor[v * 3] = -dy / l; nor[v * 3 + 1] = dx / l; nor[v * 3 + 2] = 0; if (cols) { const c = cols[i]; col[v * 3] = c.r; col[v * 3 + 1] = c.g; col[v * 3 + 2] = c.b; } }
        }
      }
      P(E, -BX, bot[0], BD); P(E + 1, -BX, tp[0], BD); P(E + 2, -BX, tp[0], -BD); P(E + 3, -BX, bot[0], -BD);
      P(E + 4, BX, bot[NX], BD); P(E + 5, BX, tp[NX], BD); P(E + 6, BX, tp[NX], -BD); P(E + 7, BX, bot[NX], -BD);
      geo.attributes.position.needsUpdate = true;
      if (top) { geo.attributes.normal.needsUpdate = true; geo.attributes.color.needsUpdate = true; }
    },
  };
}
// keyframes over the slider (0–1): time in millions of years ago, then how far each process has come
//              u     Ma    volc  ore   sed  fold  ero  sea  ice  soil trees
const BK = [[0.00, 1890, 0.15, 0, 0, 0, 0, 1, 0, 0, 0],
  [0.12, 1888, 1, 0, 0, 0, 0, 1, 0, 0, 0],
  [0.26, 1880, 1, 1, 0.25, 0, 0, 1, 0, 0, 0],
  [0.38, 1870, 1, 1, 1, 0, 0, 1, 0, 0, 0],
  [0.54, 1820, 1, 1, 1, 1, 0, 0, 0, 0, 0],
  [0.72, 600, 1, 1, 1, 1, 1, 0, 0, 0, 0],
  [0.80, 2.6, 1, 1, 1, 1, 1, 0, 0, 0, 0],
  [0.83, 1.6, 1, 1, 1, 1, 1, 0, 1, 0, 0],
  [0.90, 0.02, 1, 1, 1, 1, 1, 0, 1, 0, 0],
  [0.94, 0.01, 1, 1, 1, 1, 1, 0, 0, 1, 0.15],
  [1.00, 0, 1, 1, 1, 1, 1, 0, 0, 1, 1]];
function bergState(u) {
  let i = 0; while (i < BK.length - 2 && BK[i + 1][0] <= u) i++;
  const a = BK[i], b = BK[i + 1], f = clamp((u - a[0]) / (b[0] - a[0]), 0, 1), e = ease(f);
  const Ma = b[1] > 0 ? Math.exp(lerp(Math.log(a[1]), Math.log(b[1]), f)) : lerp(a[1], 0, f);
  const v = (k) => lerp(a[k], b[k], e);
  return { Ma, volc: v(2), ore: v(3), sed: v(4), fold: v(5), ero: v(6), sea: v(7), ice: v(8), soil: v(9), trees: v(10) };
}
let BERG_FIELD = ['1 890', 'milj. år sedan'];
const BERG_STOPS = [0, 0.12, 0.26, 0.38, 0.54, 0.72, 0.8, 0.9, 0.94, 1];
SCENES.berget = {
  title: 'Berget, 1,89 miljarder år', kick: 'Tid · 10⁹ år', unit: 100, field: () => BERG_FIELD,
  get view() { return fit({ t: [1, -0.5, 0], d: 96, el: 0.3, az: 0.42 }, { d: 118, t: [0, 0, 0] }); },
  lead: 'Berggrunden i Skelleftefältet är 1,89 miljarder år gammal och bär guld, koppar, silver, zink och bly. Här byggs berget upp genom tiden, i genomskärning.',
  steps: ['För 1,89 miljarder år sedan var Skelleftefältet en havsbotten med vulkaner.',
    'Hett vatten strömmade genom vulkanernas sten och lämnade metall på havsbotten. Så bildades malmen: guld, koppar, silver, zink och bly.',
    'Lera och sand lade sig över malmen. Sedan pressades jordskorpan ihop, och lagren veckades och reste sig till berg.',
    'Under hundratals miljoner år nötte vatten, frost och vind ner bergen till en slätt. Malmen låg kvar djupare ner.',
    'Istider kom och gick. När isen smälte för 10 000 år sedan växte skogen upp ovanpå berget, och malmen ligger kvar under den.'],
  note: 'Schematiskt och på skolnivå. Texterna säger bara att berggrunden är 1,89 miljarder år och bär guld, koppar, silver, zink och bly. Att malmen bildades av hett vatten vid vulkaner på havsbotten, och när veckningen, nötningen och istiderna skedde, är allmän geologi och inte kontrollerat för Skelleftefältet (k). Lagrens tjocklek och tiderna mellan stegen är inte skalenliga.',
  build(g, api) {
    const k = (2 * Math.PI) / 18, ph = Math.PI / 2, VX = [-15, 0, 15], SEA = 6.2;
    const ORE = [[-9, 1.7, 0.55], [-5.6, 1.0, 0.4], [9, 1.9, 0.6], [11.9, 1.1, 0.42]];
    const n = NX + 1, A = () => new Float32Array(n);
    const I1 = A(), I2 = A(), I3 = A(), cap = A(), L = A(), soilT = A(), bot = A(), topA = A(), seaT = A(), iceT = A();
    const fold = (x, s) => s.fold * (2.6 * Math.sin(k * x + ph) + 3);
    const bump = (x, s) => s.volc * VX.reduce((h, xv) => h + 3.1 * Math.exp(-(((x - xv) / 2.4) ** 2)), 0);
    const capF = (x) => 3.0 + 0.25 * Math.sin(x * 0.6) + 0.15 * Math.sin(x * 1.7 + 1);
    const at = (arr, x) => { const f = ((x + BX) / (2 * BX)) * NX, i = clamp(Math.floor(f), 0, NX - 1), w = f - i; return arr[i] * (1 - w) + arr[i + 1] * w; };
    // materials: white sketch greys, lime only for the ore while it forms
    const COL = { base: 0xd6d5cd, volc: 0xffffff, sed: 0xe9e7dd, soil: 0xc9c7bc };
    const cBase = new THREE.Color(COL.base), cVolc = new THREE.Color(COL.volc), cSed = new THREE.Color(COL.sed), cSoil = new THREE.Color(COL.soil);
    const base = slab(g, lam(COL.base, { side: DS })), volc = slab(g, lam(COL.volc, { side: DS })), sed = slab(g, lam(COL.sed, { side: DS }));
    const land = slab(g, lam(0xffffff, { side: DS, vertexColors: true }), true);
    const seaMat = basic(C.water, { transparent: true, opacity: 0.55, depthWrite: false, side: DS }), sea = slab(g, seaMat, true); sea.m.renderOrder = 2;
    const iceMat = lam(0xffffff, { transparent: true, opacity: 0.62, depthWrite: false, side: DS }), ice = slab(g, iceMat, true); ice.m.renderOrder = 2;
    const landCols = Array.from({ length: n }, () => new THREE.Color());
    // ink: the interfaces on the cut face, the land surface at the back, and the block's edges
    const zf = BD + 0.03;
    const lines = [[0x77786f], [0x77786f], [0x5c5d57], [C.ink], [C.ink], [0x6f9599], [0x8d8e87]].map(([c]) => liveLine(g, n, c));
    const frame = segs(new Array(16 * 6).fill(0), C.ink); frame.frustumCulled = false; g.add(frame);
    // ore lenses on the cut face
    const oreMat = lam(0xc3ad84), ores = ORE.map(([x, rx, ry]) => {
      const o = ink(new THREE.CylinderGeometry(1, 1, 1.1, 22).rotateX(Math.PI / 2), { mat: oreMat, s: 0.02, thr: 40 });
      o.position.set(x, 0, BD - 0.5); o.userData = { rx, ry, x }; g.add(o); return o;
    });
    // trees on top
    const R = rng(11), trees = [];
    for (let i = 0; i < 34; i++) {
      const tr = new THREE.Group(), h = 1.3 + R() * 0.8;
      tr.add(ink(new THREE.ConeGeometry(0.55, h, 7).translate(0, h / 2 + 0.15, 0), { s: 0.02, thr: 40 }));
      tr.userData = { x: -19 + R() * 38, z: -5.4 + R() * 10.8, b: R() * 0.75 };
      g.add(tr); trees.push(tr);
    }
    // smoke from the volcanoes, hot water from the vents
    const smoke = dots(g, 45, 3, 0x8d8e87, { opacity: 0.7 }), vents = dots(g, 40, 3, 0x9a9b94, { opacity: 0.8 });
    const sSeed = Array.from({ length: 45 }, (_, i) => [i % 3, R(), R() * 2 - 1]), vSeed = Array.from({ length: 40 }, (_, i) => [i % 4, R(), R() * 2 - 1]);
    // labels on the cut face
    const lb = {
      sea: label('Havet', '', V(-17, 5, zf), g),
      volcano: label('Vulkaner', 'under havet', V(0, 4, zf), g),
      ore: label('Malm', 'guld · koppar · silver · zink · bly', V(9, 1, zf), g),
      volc: label('Vulkaniskt berg', '', V(-16, -1.5, zf), g, 'ghost'),
      sed: label('Lera och sand', '', V(-11, 2, zf), g, 'ghost'),
      base: label('Äldre berg', '', V(-16, -6, zf), g, 'ghost'),
      fold: label('Lagren veckas', 'berg reser sig', V(0, 8, zf), g),
      wear: label('Bergen nöts ner', '', V(0, 6, zf), g),
      ice: label('Inlandsisen', '', V(-4, 7, zf), g),
      forest: label('Skogen i dag', 'på morän och jord', V(-4, 5.4, zf), g),
    };
    lb.ore.element.dataset.pri = 2; lb.fold.element.dataset.pri = 1; lb.ice.element.dataset.pri = 1; lb.forest.element.dataset.pri = 1;
    const sl = slider(api, 'Tid', 0, 1000, 0), rd = readout(api);
    const PH = ['Havsbotten med vulkaner', 'Malmen bildas', 'Lagren veckas till berg', 'Bergen nöts ner', 'Istider', 'Skogen växer upp', 'Skogen i dag'];
    return (t) => {
      const u = sl.manual() ? +sl.inp.value / 1000 : tourU(BERG_STOPS, t, 3.8, 2.4, 7);
      if (!sl.manual()) sl.inp.value = Math.round(u * 1000);
      const s = bergState(u);
      // the curves
      for (let i = 0; i < n; i++) {
        const x = XS[i], F = fold(x, s), Fs = s.fold * 2.6 * Math.sin(k * x + ph);
        I1[i] = -3 + s.fold * 3 + Fs * 0.6;
        I2[i] = F + bump(x, s);
        I3[i] = I2[i] + 2.2 * s.sed;
        cap[i] = s.ero > 0 ? lerp(9.5, capF(x), s.ero) : 99;
        L[i] = Math.min(I3[i], cap[i]);
        soilT[i] = L[i] + 0.4 * s.soil;
        seaT[i] = Math.max(SEA, soilT[i] + 0.01);
        const it = s.ice * (0.45 + 0.55 * (0.5 + 0.5 * Math.cos(((u - 0.8) / 0.12) * Math.PI * 2 * 2.5)));
        iceT[i] = soilT[i] + 0.02 + it * 4.2;
        // which layer the land surface shows here
        const a1 = Math.min(I1[i], cap[i]), a2 = Math.min(I2[i], cap[i]);
        landCols[i].copy(s.soil > 0.05 ? cSoil : L[i] - a2 > 0.02 ? cSed : a2 - a1 > 0.02 ? cVolc : cBase);
      }
      for (let i = 0; i < n; i++) { bot[i] = BOT; topA[i] = Math.min(I1[i], cap[i]); } base.set(bot, topA);
      for (let i = 0; i < n; i++) { bot[i] = topA[i]; topA[i] = Math.min(I2[i], cap[i]); } volc.set(bot, topA);
      for (let i = 0; i < n; i++) { bot[i] = topA[i]; topA[i] = L[i]; } sed.set(bot, topA);
      land.set(L, soilT, landCols);
      sea.m.visible = s.sea > 0.01; seaMat.opacity = 0.5 * s.sea; if (sea.m.visible) sea.set(soilT, seaT);
      ice.m.visible = s.ice > 0.01; iceMat.opacity = 0.62 * Math.min(1, s.ice * 1.5); if (ice.m.visible) ice.set(soilT, iceT);
      // ink lines: interfaces on the cut face, the land at the back, the sea and ice tops
      const curves = [(i) => Math.min(I1[i], cap[i]), (i) => Math.min(I2[i], cap[i]), (i) => L[i], (i) => soilT[i]];
      curves.forEach((f, j) => { for (let i = 0; i < n; i++) lines[j].set(i, XS[i], f(i), zf); lines[j].done(); });
      for (let i = 0; i < n; i++) lines[4].set(i, XS[i], soilT[i], -BD); lines[4].done();
      lines[5].l.visible = s.sea > 0.05; lines[5].l.material.opacity = s.sea; for (let i = 0; i < n; i++) lines[5].set(i, XS[i], seaT[i], zf); lines[5].done();
      lines[6].l.visible = ice.m.visible; for (let i = 0; i < n; i++) lines[6].set(i, XS[i], iceT[i], zf); lines[6].done();
      // the block's edges, and the interfaces on the right end
      const T0 = soilT[0], TN = soilT[NX], fp = frame.geometry.attributes.position, S = [];
      S.push([-BX, BOT, BD, -BX, T0, BD], [BX, BOT, BD, BX, TN, BD], [BX, BOT, -BD, BX, TN, -BD], [-BX, BOT, BD, BX, BOT, BD], [BX, BOT, BD, BX, BOT, -BD], [-BX, T0, BD, -BX, T0, -BD], [BX, TN, BD, BX, TN, -BD]);
      for (const y of [Math.min(I1[NX], cap[NX]), Math.min(I2[NX], cap[NX]), L[NX]]) S.push([BX, y, BD, BX, y, -BD]);
      if (ice.m.visible) S.push([BX, iceT[NX], BD, BX, iceT[NX], -BD], [BX, TN, BD, BX, iceT[NX], BD], [-BX, TN, BD, -BX, iceT[0], BD], [-BX, iceT[0], BD, -BX, iceT[0], -BD], [-BX, T0, BD, -BX, iceT[0], BD]);
      while (S.length < 16) S.push([0, 0, 0, 0, 0, 0]);
      S.forEach((a, i) => { fp.setXYZ(i * 2, a[0], a[1], a[2]); fp.setXYZ(i * 2 + 1, a[3], a[4], a[5]); });
      fp.needsUpdate = true;
      // ore: grows on the seafloor, then rides along with the folding
      const forming = smooth(u, 0.1, 0.16) * (1 - smooth(u, 0.3, 0.4));
      oreMat.color.set(0xc3ad84).lerp(LIME, forming * (0.65 + 0.35 * Math.sin(t * 2.4)));
      ores.forEach((o) => {
        const { x, rx, ry } = o.userData, y = at(I2, x) - ry * 0.55, d = (at(I2, x + 0.3) - at(I2, x - 0.3)) / 0.6;
        const sc = Math.max(0.001, s.ore);
        o.visible = s.ore > 0.01; o.position.y = y; o.rotation.z = Math.atan(d); o.scale.set(rx * sc, ry * sc, 1);
      });
      // trees
      trees.forEach((tr) => { const { x, z, b } = tr.userData, gr = smooth(s.trees, b * 0.8, b * 0.8 + 0.25); tr.visible = gr > 0.01; tr.position.set(x, at(soilT, x), z); tr.scale.setScalar(Math.max(0.001, gr)); });
      // smoke and hot water
      const sm = s.sea * smooth(u, 0, 0.06) * (1 - smooth(u, 0.34, 0.42));
      smoke.pts.visible = sm > 0.01; smoke.pts.material.opacity = 0.7 * sm;
      sSeed.forEach(([v, ph0, zz], i) => { const q = (t * 0.12 + ph0) % 1, xv = VX[v], y0 = at(I3, xv) + 0.2; smoke.pos.set([xv + Math.sin(q * 6 + i) * 0.6 * q, y0 + q * (SEA - y0), zz * 3], i * 3); });
      smoke.done();
      const hv = s.sea * smooth(u, 0.1, 0.15) * (1 - smooth(u, 0.32, 0.4));
      vents.pts.visible = hv > 0.01; vents.pts.material.opacity = 0.8 * hv;
      vSeed.forEach(([o, ph0, zz], i) => { const q = (t * 0.2 + ph0) % 1, xo = ORE[o][0], y0 = at(I3, xo); vents.pos.set([xo + Math.sin(q * 9 + i) * 0.3, y0 + q * 3.2, zz * 4], i * 3); });
      vents.done();
      // labels
      const step = u < 0.1 ? 0 : u < 0.38 ? 1 : u < 0.56 ? 2 : u < 0.8 ? 3 : 4;
      api.step(step);
      show(lb.sea, s.sea > 0.3); show(lb.volcano, u < 0.4 && s.sea > 0.3); lb.volcano.position.y = at(I3, 0) + 0.6;
      show(lb.ore, s.ore > 0.3); big(lb.ore, forming > 0.3 || u > 0.95); lb.ore.position.set(9, at(I2, 9) - 0.6, zf + 0.6);
      lb.volc.position.y = (Math.min(at(I1, -16), at(cap, -16)) + Math.min(at(I2, -16), at(cap, -16))) / 2;
      show(lb.sed, s.sed > 0.5 && u < 0.97); lb.sed.position.set(-9, (at(I2, -9) + at(L, -9)) / 2, zf);
      show(lb.fold, u > 0.4 && u < 0.56); lb.fold.position.y = at(L, 0) + 0.4;
      show(lb.wear, u >= 0.56 && u < 0.79); lb.wear.position.y = at(L, 0) + 0.4;
      show(lb.ice, s.ice > 0.3); lb.ice.position.y = at(iceT, -4) + 0.3;
      show(lb.forest, s.trees > 0.4); lb.forest.position.y = at(soilT, -4) + 1.9;
      const ph2 = step < 4 ? PH[step] : u < 0.93 ? PH[4] : u < 0.995 ? PH[5] : PH[6];
      let tt;
      if (u > 0.995) { tt = 'i dag'; BERG_FIELD = ['i dag', '']; }
      else if (s.Ma >= 1) { tt = `${fmt(s.Ma)} miljoner år sedan`; BERG_FIELD = [fmt(s.Ma), 'milj. år sedan']; }
      else { const y = Math.round((s.Ma * 1e6) / 500) * 500; tt = `${fmt(y)} år sedan`; BERG_FIELD = [fmt(y), 'år sedan']; }
      sl.out.textContent = '';
      rd.innerHTML = `<b>${tt}</b> · ${ph2}`;
    };
  },
};

// ═════════ Istiden: the forest after the ice, 10 000 years on a small block of ground ═════════
// The room 1 text: bare ground after the ice, then mosses and lichens, dwarf birch, and conifers that build soil.
// Unit: 1 m; the block is about 24 m across.
let IS_FIELD = ['10 000', 'år sedan'];
SCENES.istiden = {
  title: 'Skogen efter isen', kick: 'Tid · 10⁴ år', unit: 1, field: () => IS_FIELD,
  get view() { return fit({ t: [0, 0.5, 0], d: 66, el: 0.42, az: 0.55 }, { d: 74 }); },
  lead: 'När inlandsisen smälte för ungefär 10 000 år sedan var marken kal. Så kom skogen tillbaka, steg för steg.',
  steps: ['Isen har smält. Kvar ligger sten, grus och smältvatten, men ingen jord.',
    'Först kommer mossor och lavar. De klarar sig på kal sten.',
    'Sedan kommer dvärgbjörken, en låg buske.',
    'Till sist kommer barrträden. Barr, mossa och döda växter blir jord, år efter år.',
    'I dag växer barrskog här, på jord som växterna själva har byggt.'],
  note: 'Bygger på texten i Urtiden: mossor och lavar, sedan dvärgbjörk, sedan barrträd som bygger jord. När varje steg kom, och hur fort jorden växte, är ungefärligt och inte kontrollerat (k). Marken är en bit på ungefär 24 meter, och jordlagret är ritat tjockare än det är.',
  build(g, api) {
    const H = 12, BOTY = -3.2, N = 48;
    const hf = (x, z) => 0.7 * Math.sin(x * 0.22 + 0.5) + 0.5 * Math.cos(z * 0.27 + 1) + 0.25 * Math.sin((x - z) * 0.45) - 1.0 * Math.exp(-((x - 5) ** 2 + (z - 4) ** 2) / 9);
    const nrm = (x, z) => V(-(hf(x + 0.1, z) - hf(x - 0.1, z)) / 0.2, 1, -(hf(x, z + 0.1) - hf(x, z - 0.1)) / 0.2).normalize();
    // ground
    const tg = new THREE.PlaneGeometry(2 * H, 2 * H, N, N).rotateX(-Math.PI / 2), tp = tg.attributes.position;
    for (let i = 0; i < tp.count; i++) tp.setY(i, hf(tp.getX(i), tp.getZ(i)));
    tg.computeVertexNormals();
    const groundMat = lam(0xeceae3), ground = new THREE.Mesh(tg, groundMat); g.add(ground);
    // the block's sides: gravel, with a band of soil at the top that thickens with time
    const edges = [(s) => [lerp(-H, H, s), H], (s) => [H, lerp(H, -H, s)], (s) => [lerp(H, -H, s), -H], (s) => [-H, lerp(-H, H, s)]];
    const strip = (mat, edge, lo, hi) => {
      const pos = new Float32Array((N + 1) * 2 * 3), idx = [];
      for (let i = 0; i < N; i++) idx.push(i * 2, i * 2 + 2, i * 2 + 3, i * 2, i * 2 + 3, i * 2 + 1);
      const geo = new THREE.BufferGeometry(); geo.setAttribute('position', new THREE.BufferAttribute(pos, 3)); geo.setIndex(idx);
      const m = new THREE.Mesh(geo, mat); m.frustumCulled = false; g.add(m);
      const set = (a, b) => { for (let i = 0; i <= N; i++) { const [x, z] = edge(i / N), h = hf(x, z); pos.set([x, a(h), z, x, b(h), z], i * 6); } geo.attributes.position.needsUpdate = true; geo.computeVertexNormals(); };
      set(lo, hi); return set;
    };
    const sideMat = lam(0xe2e0d8, { side: DS }), soilMat = lam(0xb9b6aa, { side: DS, polygonOffsetFactor: -1, polygonOffsetUnits: -2 });
    edges.forEach((e) => strip(sideMat, e, () => BOTY, (h) => h));
    const soilSet = [0, 1].map((k) => strip(soilMat, edges[k], (h) => h, (h) => h));
    const out = [];
    edges.forEach((e) => { for (let i = 0; i < N; i++) { const [x0, z0] = e(i / N), [x1, z1] = e((i + 1) / N); out.push(x0, hf(x0, z0), z0, x1, hf(x1, z1), z1); } });
    for (const [x, z] of [[-H, -H], [H, -H], [H, H], [-H, H]]) out.push(x, BOTY, z, x, hf(x, z), z);
    out.push(-H, BOTY, H, H, BOTY, H, H, BOTY, H, H, BOTY, -H);
    g.add(segs(out, C.ink));
    const soilLine = [0, 1].map(() => liveLine(g, N + 1, 0x77786f));
    // stones and two big boulders
    const R = rng(5);
    const stoneMat = lam(0xf4f3ef), stone = (x, z, r) => { const geo = new THREE.IcosahedronGeometry(r, 0); geo.scale(1, 0.7, 1.1); const o = ink(geo, { mat: stoneMat, s: 0.02, thr: 25, lines: r > 0.38 }); o.position.set(x, hf(x, z) + r * 0.3, z); o.rotation.y = R() * 6; g.add(o); return o; };
    for (let i = 0; i < 34; i++) { const x = -11 + R() * 22, z = -11 + R() * 22; if ((x - 5) ** 2 + (z - 4) ** 2 < 12) continue; stone(x, z, 0.15 + R() * 0.35); }
    stone(-6, 5, 1.4); stone(7.5, -6.5, 1.0);
    // meltwater in the hollow
    const poolMat = basic(C.water, { transparent: true, opacity: 0.85 });
    const pool = new THREE.Mesh(new THREE.CircleGeometry(3, 28).rotateX(-Math.PI / 2), poolMat); pool.position.set(5, hf(5, 4) + 0.45, 4); g.add(pool);
    // the last of the ice, sliding off
    const iceGeo = new THREE.BoxGeometry(2 * H, 3, 2 * H), iceMat = lam(0xffffff, { transparent: true, opacity: 0.55, depthWrite: false });
    const ice = new THREE.Mesh(iceGeo, iceMat), iceL = new THREE.LineSegments(new THREE.EdgesGeometry(iceGeo), bline({ color: 0x5c5d57, transparent: true }));
    const iceG = new THREE.Group(); iceG.add(ice, iceL); g.add(iceG);
    // mosses and lichens: flat patches that spread
    const NP = 260, patches = new THREE.InstancedMesh(new THREE.CircleGeometry(1, 9).rotateX(-Math.PI / 2), lam(0xffffff, { polygonOffsetFactor: -2, polygonOffsetUnits: -2 }), NP);
    const pData = [], up = V(0, 1, 0), m4 = new THREE.Matrix4(), sc = V(1, 1, 1);
    const moss = new THREE.Color(0xc4c9b0), lichen = new THREE.Color(0xdcddcf);
    for (let i = 0; i < NP; i++) {
      const x = -11.5 + R() * 23, z = -11.5 + R() * 23, n = nrm(x, z);
      pData.push({ p: V(x, hf(x, z) + 0.04, z), q: new THREE.Quaternion().setFromUnitVectors(up, n), r: 0.35 + R() * 0.8, b: 0.08 + R() * 0.26 });
      patches.setColorAt(i, R() < 0.5 ? moss : lichen);
    }
    g.add(patches);
    // dwarf birch: low bushes
    const birchMat = lam(0xc9cfb6), birch = [];
    for (let i = 0; i < 36; i++) {
      const x = -11 + R() * 22, z = -11 + R() * 22; if ((x - 5) ** 2 + (z - 4) ** 2 < 10) continue;
      const b = new THREE.Group();
      for (let j = 0; j < 3; j++) { const o = ink(new THREE.IcosahedronGeometry(0.32 + R() * 0.15, 0), { mat: birchMat, lines: false }); o.position.set((R() - 0.5) * 0.6, 0.3 + R() * 0.25, (R() - 0.5) * 0.6); b.add(o); }
      b.position.set(x, hf(x, z), z); b.userData.b = 0.3 + R() * 0.18; g.add(b); birch.push(b);
    }
    // conifers
    const treeMat = lam(0xf6f5f1), conifers = [];
    for (let i = 0; i < 26; i++) {
      const x = -10.5 + R() * 21, z = -10.5 + R() * 21; if ((x - 5) ** 2 + (z - 4) ** 2 < 12 || (x + 6) ** 2 + (z - 5) ** 2 < 5) continue;
      const tr = new THREE.Group();
      tr.add(ink(new THREE.CylinderGeometry(0.08, 0.13, 1.2, 6).translate(0, 0.6, 0), { s: 0.01, thr: 40 }));
      tr.add(ink(new THREE.ConeGeometry(0.95, 2.2, 7).translate(0, 1.9, 0), { mat: treeMat, s: 0.02, thr: 40 }));
      tr.add(ink(new THREE.ConeGeometry(0.7, 1.8, 7).translate(0, 3.0, 0), { mat: treeMat, s: 0.02, thr: 40 }));
      tr.position.set(x, hf(x, z) - 0.05, z); tr.userData = { b: 0.5 + R() * 0.3, h: 1.4 + R() * 0.9 }; g.add(tr); conifers.push(tr);
    }
    const lb = {
      ice: label('Isen drar sig tillbaka', '', V(-4, 3.5, 0), g),
      stones: label('Sten och grus', '', V(7.5, hf(7.5, -6.5) + 1.2, -6.5), g),
      water: label('Smältvatten', '', V(5, hf(5, 4) + 0.6, 4), g, 'ghost'),
      moss: label('Mossa och lav', '', V(-2, hf(-2, 8) + 0.3, 8), g),
      birch: label('Dvärgbjörk', '', V(2, hf(2, 9) + 1, 9), g),
      conifer: label('Barrträd', 'bygger jord', V(-8, 7.5, -2), g),
      soil: label('Jord', '', V(-8, hf(-8, H) - 0.2, H + 0.05), g),
      block: label('Flyttblock', 'lämnat av isen', V(-6, hf(-6, 5) + 1.6, 5), g, 'ghost'),
    };
    lb.conifer.element.dataset.pri = 1;
    const sl = slider(api, 'Tid', 0, 1000, 0), rd = readout(api);
    let lastU = -1;
    return (t) => {
      const u = sl.manual() ? +sl.inp.value / 1000 : tourU([0, 0.1, 0.32, 0.5, 0.92, 1], t, 5, 2.6, 7);
      if (!sl.manual()) sl.inp.value = Math.round(u * 1000);
      sl.out.textContent = '';
      api.step(u < 0.1 ? 0 : u < 0.32 ? 1 : u < 0.5 ? 2 : u < 0.92 ? 3 : 4);
      const yrs = Math.round((10000 * (1 - u)) / 100) * 100, after = 10000 - yrs;
      IS_FIELD = yrs > 0 ? [fmt(yrs), 'år sedan'] : ['i dag', ''];
      const ph = u < 0.1 ? 'kal mark' : u < 0.32 ? 'mossor och lavar' : u < 0.5 ? 'dvärgbjörk' : u < 0.92 ? 'barrträden bygger jord' : 'barrskog';
      rd.innerHTML = yrs > 0 ? `<b>${fmt(yrs)} år sedan</b> · ${fmt(after)} år efter isen · ${ph}` : `<b>I dag</b> · 10 000 år efter isen · ${ph}`;
      if (Math.abs(u - lastU) < 1e-4) return;
      lastU = u;
      // ice and water
      const io = 1 - smooth(u, 0.015, 0.08);
      iceG.visible = io > 0.01; iceG.position.set(-26 * smooth(u, 0, 0.08), 1.6, 0); iceMat.opacity = 0.55 * io; iceL.material.opacity = io;
      const pw = 1 - smooth(u, 0.06, 0.3); pool.visible = pw > 0.02; pool.scale.setScalar(Math.max(0.01, 0.35 + 0.65 * pw)); poolMat.opacity = 0.85 * Math.min(1, pw * 2);
      // ground darkens as soil builds
      const soil = 0.06 * smooth(u, 0.1, 0.4) + 0.75 * smooth(u, 0.5, 1);
      groundMat.color.set(0xeceae3).lerp(new THREE.Color(0xd8d6ca), smooth(u, 0.4, 1));
      soilSet.forEach((set, k) => set((h) => h - soil, (h) => h + 0.005));
      soilLine.forEach((ln, k) => { for (let i = 0; i <= N; i++) { const [x, z] = edges[k](i / N); ln.set(i, x + (k ? 0.02 : 0), hf(x, z) - soil, z + (k ? 0 : 0.02)); } ln.done(); ln.l.visible = soil > 0.05; });
      // patches
      pData.forEach((d, i) => { const s2 = Math.max(0.001, d.r * smooth(u, d.b, d.b + 0.07)); sc.set(s2, 1, s2); m4.compose(d.p, d.q, sc); patches.setMatrixAt(i, m4); });
      patches.instanceMatrix.needsUpdate = true;
      birch.forEach((b) => { const s2 = smooth(u, b.userData.b, b.userData.b + 0.08) * (1 - 0.35 * smooth(u, 0.75, 1)); b.visible = s2 > 0.01; b.scale.setScalar(Math.max(0.001, s2)); });
      conifers.forEach((tr) => { const { b, h } = tr.userData, s2 = smooth(u, b, b + 0.24); tr.visible = s2 > 0.01; tr.scale.setScalar(Math.max(0.001, h * (0.08 + 0.92 * s2))); });
      show(lb.ice, io > 0.4); show(lb.stones, u < 0.2); show(lb.water, pw > 0.4);
      show(lb.moss, u > 0.12); big(lb.moss, u > 0.12 && u < 0.32);
      show(lb.birch, u > 0.33 && u < 0.9); big(lb.birch, u > 0.33 && u < 0.5);
      show(lb.conifer, u > 0.56); big(lb.conifer, u > 0.56); lb.conifer.position.y = 2.5 + 5 * smooth(u, 0.55, 1);
      show(lb.soil, soil > 0.25); lb.soil.position.y = hf(-8, H) - soil / 2;
    };
  },
};

// ═════════ EcoLink: waste heat from Rönnskär into the district heating ═════════
// Schematic, not a map: the smelter, 13 km of pipe (drawn shortened), a heat exchanger, the city's network and houses.
// Warm and cool water flow in two loops that never mix; the lime bead is the heat, the child in the slide.
SCENES.ecolink = {
  title: 'EcoLink: spillvärmen', kick: 'Ut · 10⁴ m', unit: 250, field: () => ['13', 'km ledning, förkortad'],
  get view() { return fit({ t: [12, 0, 3], d: 214, el: 0.78, az: 0.1 }, { t: [11, 0, 3], d: 285, el: 0.95, az: 0.05 }); },
  lead: 'EcoLink är en 13 km lång ledning som ska föra spillvärme från Bolidens smältverk Rönnskär in i Skellefteås fjärrvärmenät.',
  steps: ['I smältverket Rönnskär blir mycket värme över. Den kallas spillvärme.',
    'Värmen följer med varmt vatten ut i ledningen, 13 km lång.',
    'I värmeväxlaren lämnar det varma vattnet över sin värme till fjärrvärmevattnet. Vattnet blandas inte.',
    'Fjärrvärmenätet för värmen vidare ut till husen i stan.',
    'Huset blir varmt, och det svalare vattnet går tillbaka och hämtar mer värme.'],
  note: 'Schematiskt, ingen karta: hur ledningen går mellan Rönnskär och stan är inte kontrollerat (k), och de 13 km är förkortade i bilden. Att värmen lämnas över i en värmeväxlare är så fjärrvärme brukar kopplas ihop, men det är inte kontrollerat för EcoLink (k). Inga temperaturer visas, eftersom texterna inte anger några.',
  build(g, api) {
    const Y = 1, GAP = [-11, -5], X0 = -37, XE = 19, XN = 21, XEND = 58;
    // ground plate
    g.add(ink(new THREE.BoxGeometry(108, 0.5, 26).translate(6, -0.25, 1.5), { mat: lam(0xf6f5f1), s: 0.15, thr: 30 }));
    // the smelter
    g.add(ink(new THREE.BoxGeometry(12, 6, 10).translate(-43, 3, 0), { s: 0.12 }), ink(new THREE.BoxGeometry(4.5, 10, 4.5).translate(-46.5, 5, -2.5), { s: 0.1 }));
    g.add(ink(new THREE.CylinderGeometry(0.8, 1.1, 22, 12).translate(-40, 11, -3), { s: 0.08, thr: 40 }));
    label('Rönnskär', 'Bolidens smältverk', V(-43, 8, 4), g, 'big').element.dataset.pri = 2;
    // pipes: translucent, so the water shows through
    const pipeMat = ghostMat(0.4);
    const pipe = (x0, x1, z, r = 0.45) => {
      const L = x1 - x0; g.add(new THREE.Mesh(new THREE.CylinderGeometry(r, r, L, 12).rotateZ(Math.PI / 2).translate((x0 + x1) / 2, Y, z), pipeMat));
      g.add(poly([V(x0, Y + r, z), V(x1, Y + r, z)], 0x5c5d57), poly([V(x0, Y, z + r), V(x1, Y, z + r)], 0x9a9b94));
    };
    for (const z of [1, -1]) { pipe(X0, GAP[0], z); pipe(GAP[1], 17, z); pipe(23, XEND, z); }
    // the break: 13 km drawn short
    for (const x of GAP) { const zz = []; for (let i = 0; i <= 8; i++) zz.push(V(x + (i % 2 ? 0.5 : -0.5), Y + 0.6, -2.4 + i * 0.6)); g.add(poly(zz, C.ink)); }
    label('13 km', 'förkortad i bilden', V(-8, 3.2, 0), g);
    label('Varmt vatten', 'till stan', V(-24, Y + 0.6, 1.6), g, 'ghost');
    label('Svalare tillbaka', '', V(4, Y + 0.6, -1.6), g, 'ghost');
    // the heat exchanger
    g.add(ink(new THREE.BoxGeometry(6, 4, 5.4).translate(20, 2, 0), { mat: ghostMat(0.3), s: 0.05 }));
    const plateMat = bline({ color: 0x77786f, transparent: true });
    for (let i = 0; i < 7; i++) { const x = 17.6 + i * 0.8, l = new THREE.LineLoop(new THREE.BufferGeometry().setFromPoints([V(x, 0.4, -2.2), V(x, 3.6, -2.2), V(x, 3.6, 2.2), V(x, 0.4, 2.2)]), plateMat); g.add(l); }
    const hx = label('Värmeväxlaren', 'värmen går över, vattnet blandas inte', V(20, 4.6, 0), g); hx.element.dataset.pri = 2;
    // houses on the network
    const HX = [30, 38, 46, 54], wins = [];
    for (const x of HX) {
      g.add(new THREE.Mesh(new THREE.CylinderGeometry(0.2, 0.2, 4, 8).rotateX(Math.PI / 2).translate(x, Y, 3.1), pipeMat));
      g.add(poly([V(x, Y + 0.2, 1.2), V(x, Y + 0.2, 5)], 0x9a9b94));
      g.add(ink(new THREE.BoxGeometry(4.5, 3.2, 4).translate(x, 1.6, 7), { s: 0.04 }));
      g.add(ink(new THREE.CylinderGeometry(2.7, 2.7, 4.4, 3).rotateX(-Math.PI / 2).translate(x, 3.2 + 1.35, 7), { s: 0.04, thr: 20 }));
      const wm = basic(0xffffff), w = new THREE.Mesh(new THREE.PlaneGeometry(1.1, 1.1), wm); w.position.set(x, 1.7, 9.02); g.add(w); wins.push(wm);
      g.add(poly([V(x - 0.55, 1.15, 9.03), V(x + 0.55, 1.15, 9.03), V(x + 0.55, 2.25, 9.03), V(x - 0.55, 2.25, 9.03)], 0x5c5d57, { loop: true }));
    }
    label('Husen i stan', '', V(54, 6.6, 7), g);
    label('Fjärrvärmenätet', '', V(40, Y + 0.6, -1.6), g, 'ghost');
    label('nätet fortsätter', '', V(XEND + 1, Y, 0), g, 'ghost');
    // the two loops of water
    const loop1 = track([V(X0 - 1, Y, 1), V(XE, Y, 1), V(XE, Y, -1), V(X0 - 1, Y, -1)], true);
    const loop2 = track([V(XN, Y, 1), V(XEND, Y, 1), V(XEND, Y, -1), V(XN, Y, -1)], true);
    const warm = new THREE.Color(WARM), cool = new THREE.Color(COOL), tmpC = new THREE.Color(), pv = V(0, 0, 0);
    const N1 = 96, N2 = 64, w1 = dots(g, N1, 4, 0, { vc: true }), w2 = dots(g, N2, 4, 0, { vc: true });
    const paint = (d, i, c) => d.col.set([c.r, c.g, c.b], i * 3);
    // the heat itself: a lime bead
    const bead = ink(new THREE.IcosahedronGeometry(0.85, 1), { mat: basic(C.lime), s: 0.01, thr: 25 }); g.add(bead);
    const rd0 = readout(api), rd = readout(api);
    rd0.innerHTML = '<b>Barnet i rutschkanan är spillvärmen.</b>';
    const TT = 21, km = (x) => clamp(((x - X0) / (17 - X0)) * 13, 0, 13);
    return (t) => {
      const v = t * 0.006;
      for (let i = 0; i < N1; i++) {
        const u = i / N1 + v; loop1.at(u, pv);
        const hidden = (pv.x > GAP[0] && pv.x < GAP[1]) || pv.x < X0;
        if (hidden) w1.hide(i); else w1.pos.set([pv.x, pv.y, pv.z], i * 3);
        const sg = loop1.seg(u); paint(w1, i, sg === 0 ? warm : sg === 1 ? tmpC.copy(warm).lerp(cool, clamp((1 - pv.z) / 2, 0, 1)) : cool);
      }
      w1.done();
      for (let i = 0; i < N2; i++) {
        const u = i / N2 + v * 1.6; loop2.at(u, pv); w2.pos.set([pv.x, pv.y, pv.z], i * 3);
        const sg = loop2.seg(u); paint(w2, i, sg === 0 ? tmpC.copy(warm).lerp(cool, smooth(pv.x, 26, 60) * 0.7) : sg === 1 ? tmpC.copy(warm).lerp(cool, 0.7 + 0.3 * clamp((1 - pv.z) / 2, 0, 1)) : cool);
      }
      w2.done();
      // the bead's trip: smelter → pipe → exchanger → network → a house
      const k = t % TT; let step, text, x = X0, z = 1, y = Y, vis = 1;
      plateMat.color.set(0x77786f); wins.forEach((m) => m.color.set(0xffffff));
      if (k < 2) { step = 0; x = X0 - 1 + k * 0.5; vis = smooth(k, 0, 0.8); text = 'Spillvärmen lämnar smältverket.'; }
      else if (k < 11) { step = 1; x = lerp(X0, XE, (k - 2) / 9); if (x > GAP[0] && x < GAP[1]) vis = 0; text = `I ledningen: <b>${fmt(km(x), 1)} km</b> av 13`; }
      else if (k < 13) { step = 2; x = lerp(XE, XN, smooth(k, 11.3, 12.7)); plateMat.color.set(LIME_D); text = 'I värmeväxlaren går värmen över till fjärrvärmevattnet.'; }
      else if (k < 17.5) { step = 3; const f = (k - 13) / 4.5; if (f < 0.8) x = lerp(XN, 38, f / 0.8); else { x = 38; z = lerp(1, 5, (f - 0.8) / 0.2); } text = 'I fjärrvärmenätet, på väg ut till husen.'; }
      else { step = 4; x = 38; z = 5.4; vis = 1 - smooth(k, 19.5, 21); wins[1].color.set(C.lime); text = 'Värmen värmer ett hus. Det svalare vattnet går tillbaka.'; }
      bead.visible = vis > 0.05; bead.position.set(x, y, z); bead.scale.setScalar(Math.max(0.01, vis));
      api.step(step);
      rd.innerHTML = text;
    };
  },
};

// ═════════ Qi: the coil in the charger and the coil in the phone ═════════
// Alternating current in the charger's coil makes a magnetic field that keeps turning round; where it passes the
// phone's coil it drives a current there (induction). A rectifier makes it direct current for the battery.
// Unit: 1 mm.
SCENES.qi = {
  title: 'Qi-spolen', kick: 'Makro · 10⁻¹ m', unit: 0.001,
  get view() { return fit({ t: [4, 12, -8], d: 370, el: 0.32, az: 0.82 }, { t: [10, 10, -4], d: 470 }); },
  lead: 'En trådlös laddare, en Qi-laddare, skickar energi genom luften: från en spole i laddaren till en spole i mobilen.',
  steps: ['Laddaren skickar växelström genom sin spole. Strömmen byter riktning hela tiden.',
    'Strömmen gör ett magnetfält runt spolen, och fältet byter riktning i samma takt.',
    'Fältet går genom mobilens spole och driver en ström där. Det kallas induktion.',
    'En likriktare gör om växelströmmen till likström, som laddar batteriet.',
    'Det fungerar bara nära. Ju längre bort mobilen ligger, desto mindre av fältet når fram.'],
  note: 'Ritat schematiskt. Strömmen byter riktning över hundra tusen gånger i sekunden, här i kraftig slowmotion. Siffrorna är ett räkneexempel: högst 5 W in i mobilen, 70 % verkningsgrad, 0,5 W när laddplatsen är tom och att det slutar fungera efter ungefär en centimeter. Verkliga värden beror på laddare och mobil (k).',
  build(g, api) {
    const W = Math.PI * 2 * 0.4;   // shown frequency, rad/s
    const spiral = (r0, r1, turns, y, np = 420) => Array.from({ length: np }, (_, i) => { const f = i / (np - 1), a = f * turns * Math.PI * 2, r = r0 + (r1 - r0) * f; return V(Math.cos(a) * r, y, Math.sin(a) * r); });
    // the charger: a round pad with its coil on a ferrite disc
    g.add(ink(new THREE.CylinderGeometry(45, 47, 8, 48).translate(0, -4, 0), { mat: ghostMat(0.45), s: 0.3, thr: 30 }));
    g.add(new THREE.Mesh(new THREE.CylinderGeometry(24, 24, 0.8, 40).translate(0, -3, 0), lam(0xc9c8c0)));
    const txPts = spiral(7, 21, 9, -2), txLine = poly(txPts, C.ink); g.add(txLine);
    const cable = poly([V(45, -4, 0), V(70, -4, 0), V(88, -4, 14)], 0x5c5d57); g.add(cable);
    label('Laddaren', 'sändarspolen', V(32, -8, 36), g).element.dataset.pri = 1;
    label('till Shelly-pluggen', '', V(88, -4, 14), g, 'ghost');
    // the phone, see-through, with its coil, a rectifier chip and the battery
    const phone = new THREE.Group(); g.add(phone);
    phone.add(ink(new THREE.BoxGeometry(72, 8, 150).translate(0, 4, 0), { mat: ghostMat(0.22), s: 0.25, thr: 30 }));
    const rxPts = spiral(6, 19, 8, 1), rxLine = poly(rxPts, C.ink); phone.add(rxLine);
    phone.add(ink(new THREE.BoxGeometry(10, 2, 8).translate(24, 2.5, -16), { s: 0.05 }));
    phone.add(ink(new THREE.BoxGeometry(56, 4, 46).translate(0, 3.5, -46), { mat: ghostMat(0.6), s: 0.1 }));
    const fill = new THREE.Mesh(new THREE.BoxGeometry(1, 3, 44), basic(C.lime)); fill.position.set(-27, 3.5, -46); phone.add(fill);
    const end = rxPts[rxPts.length - 1];
    const wireA = [end, V(24, 1.5, end.z - 4), V(24, 2, -12)], wireB = [V(24, 2.5, -20), V(24, 3, -23)];
    phone.add(poly(wireA, 0x5c5d57), poly(wireB, 0x5c5d57));
    const lbPhone = label('Mobilen', 'mottagarspolen', V(-30, 9, 72), phone); lbPhone.element.dataset.pri = 1;
    label('Likriktaren', 'växelström blir likström', V(30, 5, -16), phone, 'ghost');
    const lbBat = label('Batteriet', '', V(-20, 7, -60), phone);
    // field lines: closed loops through the coil, in two planes
    const loops = [], fieldMat = bline({ color: 0x5c5d57, transparent: true, opacity: 0.4 });
    for (const Lr of [24, 36, 52, 72]) for (const phi of [Math.PI * 0.75, Math.PI * 1.75]) {
      const pts = [];
      for (let i = 0; i <= 64; i++) { const th = 0.1 + (i / 64) * (Math.PI - 0.2), r = Lr * Math.sin(th) ** 2, rho = r * Math.sin(th); pts.push(V(rho * Math.cos(phi), -2 + r * Math.cos(th), rho * Math.sin(phi))); }
      const l = new THREE.Line(new THREE.BufferGeometry().setFromPoints(pts), fieldMat); g.add(l);
      loops.push(track(pts));
    }
    label('Magnetfältet', 'byter riktning', V(-40, 26, 40), g, 'ghost');
    const fd = dots(g, loops.length * 2, 4, 0x5c5d57), fdSeed = Array.from({ length: loops.length * 2 }, (_, i) => (i % 2) * 0.5 + 0.12);
    const tx = track(txPts), rx = track(rxPts), cd = dots(g, 14, 5, C.ink), rd2 = dots(phone, 12, 5, LIME_D);
    const sl = slider(api, 'Avstånd', 1, 40, 30), tc = canvas(api, 300, 84), rd = readout(api), shelly = readout(api);
    const hist = [];
    let bat = 0.3;
    return (t, dt) => {
      const s = Math.min(0.1, (dt || 16) / 1000);
      // automatic: the phone comes down, charges a while, and is lifted off again
      let d;
      if (sl.manual()) d = +sl.inp.value;
      else { const k = t % 24; d = k < 2 ? 40 : k < 8 ? lerp(40, 2, ease((k - 2) / 6)) : k < 17 ? 2 : k < 21 ? lerp(2, 40, ease((k - 17) / 4)) : 40; sl.inp.value = Math.round(d); }
      sl.out.textContent = `${Math.round(d)} mm`;
      phone.position.y = d;
      const c = 1 - smooth(d, 4, 12), Prx = 5 * c, Pw = Prx > 0.05 ? 0.5 + Prx / 0.7 : 0.5, on = Pw > 3;
      const I = Math.sin(W * t);
      // the field pulses and its dots swing back and forth along the lines
      fieldMat.opacity = 0.12 + 0.5 * Math.abs(I);
      loops.forEach((lp, j) => { for (let k = 0; k < 2; k++) { const i = j * 2 + k, p = lp.at(fdSeed[i] + 0.1 * Math.sin(W * t - Math.PI / 2) + 0.2); fd.pos.set([p.x, p.y, p.z], i * 3); } });
      fd.done();
      for (let i = 0; i < 14; i++) { const p = tx.at(i / 14 + 0.03 * Math.sin(W * t)); cd.pos.set([p.x, p.y + 0.5, p.z], i * 3); } cd.done();
      rd2.pts.visible = c > 0.05;
      for (let i = 0; i < 12; i++) { const p = rx.at(i / 12 - 0.03 * c * Math.sin(W * t)); rd2.pos.set([p.x, p.y + 0.5, p.z], i * 3); } rd2.done();
      rxLine.material.color.set(c > 0.05 ? LIME_D : C.ink);
      if (on) bat = Math.min(1, bat + s * 0.03); else if (d > 30) bat = Math.max(0.3, bat - s * 0.01);
      fill.scale.x = 54 * bat; fill.position.x = -27 + 27 * bat;
      lbBat.element.querySelector('small') || (lbBat.element.querySelector('.t').insertAdjacentHTML('beforeend', '<small></small>'));
      lbBat.element.querySelector('small').textContent = `${Math.round(bat * 100)} %${on ? ' · laddar' : ''}`;
      api.step(d > 12 ? Math.floor(t / 3) % 2 : 2 + (Math.floor(t / 3) % 3));
      // the three currents
      hist.push([I, c * Math.sin(W * t), c]); if (hist.length > 180) hist.shift();
      const { g: x, w, h } = tc, rows = [['laddaren', 14], ['mobilen', 42], ['likström', 70]];
      x.clearRect(0, 0, w, h); x.font = '600 9px IBM Plex Mono, monospace';
      rows.forEach(([n, y0], r) => {
        x.fillStyle = '#5c5d57'; x.fillText(n, 2, y0 + 3);
        x.strokeStyle = '#d6d5ce'; x.lineWidth = 1; x.beginPath(); x.moveTo(62, y0); x.lineTo(w, y0); x.stroke();
        x.strokeStyle = r === 0 ? '#0a0b09' : '#8fb300'; x.lineWidth = 1.4; x.beginPath();
        hist.forEach((v, i) => x.lineTo(62 + (i / 179) * (w - 64), y0 - (r === 2 ? v[2] * 9 : v[r] * 9)));
        x.stroke();
      });
      rd.innerHTML = `Avstånd <b>${Math.round(d)} mm</b> · in i mobilen ≈ <b>${fmt(Prx, 1)} W</b> · laddaren drar ≈ <b>${fmt(Pw, 1)} W</b>`;
      shelly.innerHTML = on ? 'Shelly-pluggen: <b class="go">över 3 W</b> · en mobil laddar, Framtiden får en musikpuls' : 'Shelly-pluggen: under 3 W · tom laddplats';
    };
  },
};

// ═════════ Droneport at Hammarängen ═════════
// Schematic, not a map: the pad, the fence and the warm hangar at their real sizes, a drone that lifts straight up
// within the 120 m ceiling, and the six voting options as made-up example routes. Unit: 1 m.
const ROUTES = [
  ['Medicin', 'till en vårdcentral', 200, 290, 'drop'],
  ['Skogsbränder', 'spana efter rök', 140, 300, 'circle'],
  ['Pizza', 'hem till någon', 255, 230, 'drop'],
  ['Försvunna', 'söka i skogen', 80, 290, 'search'],
  ['Vindkraft', 'titta på verket', 320, 300, 'circle'],
  ['Paket', 'till en brevlåda', 20, 240, 'drop'],
];
SCENES.droneport = {
  title: 'Droneport på Hammarängen', kick: 'Ut · 10³ m', unit: 1,
  view: { t: [22, 30, 8], d: 1330, el: 0.86, az: 0.2, d0: 110, dur: 3800 },
  lead: 'Drönarflygplatsen på Hammarängen drivs av Arctic Aviation Hub och kommunen. Utställningstexten kallar den Sveriges första stadsnära drönarflygplats, med eget luftrum och vintertester.',
  steps: ['Drönarflygplatsen ligger på Hammarängen, utanför flygplatsens kontrollzon.',
    'Inhägnaden är 60 × 40 meter. Där finns start- och landningsytan, 15 × 15 meter, och en varm hangar, 15 × 15 × 7 meter.',
    'Drönaren lyfter rakt upp. Så länge piloten ser den får den flyga upp till 120 meter (VLOS).',
    'Längre bort än piloten ser, BVLOS, kan man söka tillstånd för.',
    'Vad ska drönare användas till? Här är sex exempel. Rutterna är påhittade.'],
  note: 'Schematiskt, ingen karta: platsens form och var hangaren står i inhägnaden är påhittat (k). Måtten, 120 m, VLOS och BVLOS kommer från arcticaviationhub.com (läst 30 okt 2026). De sex rutterna och målen är bara exempel, med förkortade avstånd. Drönaren, husen och vindkraftverket är inte ritade i skala.',
  build(g, api) {
    const PAD = V(-12, 0, 0), CRU = 100;
    // ground with distance rings around the pad
    const gnd = new THREE.Mesh(new THREE.CircleGeometry(440, 72).rotateX(-Math.PI / 2), basic(0xf6f5f1)); gnd.position.y = -0.05; g.add(gnd);
    for (const r of [100, 200, 300, 400]) { const c = ring('y', 96); c.scale.setScalar(r); c.position.copy(PAD); c.material.color.set(0xd2d1c9); g.add(c); if (r !== 300) label(`${r} m`, '', V(PAD.x + r * 0.6, 0, PAD.z + r * 0.8), g, 'ghost'); }
    // fence 60 × 40 m
    const F = [], fx = 30, fz = 20;
    for (let x = -fx; x <= fx; x += 5) F.push(x, 0, -fz, x, 2.2, -fz, x, 0, fz, x, 2.2, fz);
    for (let z = -fz + 5; z < fz; z += 5) F.push(-fx, 0, z, -fx, 2.2, z, fx, 0, z, fx, 2.2, z);
    for (const y of [1.1, 2.2]) F.push(-fx, y, -fz, fx, y, -fz, fx, y, -fz, fx, y, fz, fx, y, fz, -fx, y, fz, -fx, y, fz, -fx, y, -fz);
    g.add(segs(F, 0x5c5d57));
    label('Inhägnaden', '60 × 40 m', V(fx, 2.5, fz), g);
    // pad 15 × 15 m with an H
    g.add(ink(new THREE.BoxGeometry(15, 0.3, 15).translate(PAD.x, 0.15, 0), { s: 0.05 }));
    g.add(poly([V(PAD.x - 3, 0.32, -3), V(PAD.x - 3, 0.32, 3)]), poly([V(PAD.x + 3, 0.32, -3), V(PAD.x + 3, 0.32, 3)]), poly([V(PAD.x - 3, 0.32, 0), V(PAD.x + 3, 0.32, 0)]));
    const cr = ring('y', 48); cr.scale.setScalar(6); cr.position.set(PAD.x, 0.32, 0); g.add(cr);
    label('Start och landning', '15 × 15 m', V(PAD.x - 7, 0.4, 7), g).element.dataset.pri = 1;
    // warm hangar 15 × 15 × 7 m
    g.add(ink(new THREE.BoxGeometry(15, 7, 15).translate(14, 3.5, 0), { s: 0.06 }));
    g.add(poly([V(21.52, 0, -5), V(21.52, 5.5, -5), V(21.52, 5.5, 5), V(21.52, 0, 5)], 0x5c5d57));
    label('Varm hangar', '15 × 15 × 7 m', V(14, 7.5, 0), g).element.dataset.pri = 1;
    label('Hammarängen', 'Skellefteå Södra', V(0, 0, fz + 22), g, 'big').element.dataset.pri = 2;
    // the 120 m ceiling: a ruler at the pad and a faint plane
    const rl = [PAD.x, 0, 0, PAD.x, 120, 0]; for (let h = 20; h <= 120; h += 20) rl.push(PAD.x - 2, h, 0, PAD.x + 2, h, 0);
    g.add(segs(rl, 0x77786f));
    const ceil = new THREE.Mesh(new THREE.CircleGeometry(420, 72).rotateX(-Math.PI / 2), basic(0xffffff, { transparent: true, opacity: 0.12, depthWrite: false, side: DS })); ceil.position.set(PAD.x, 120, 0); g.add(ceil);
    const ce = ring('y', 96); ce.scale.setScalar(420); ce.position.set(PAD.x, 120, 0); ce.material.color.set(0xb3b2aa); g.add(ce);
    label('120 m', 'högsta höjd, VLOS', V(PAD.x, 121, 0), g).element.dataset.pri = 1;
    // destinations: simple glyphs, drawn larger than life
    const dest = ROUTES.map(([n, sub, deg, dist, kind], i) => {
      const a = THREE.MathUtils.degToRad(deg), p = V(PAD.x + Math.cos(a) * dist, 0, Math.sin(a) * dist), grp = new THREE.Group(); grp.position.copy(p); g.add(grp);
      const house = (w, h, d, x = 0, z = 0) => { grp.add(ink(new THREE.BoxGeometry(w, h, d).translate(x, h / 2, z), { s: 0.1 })); grp.add(ink(new THREE.CylinderGeometry(w * 0.6, w * 0.6, d, 3).rotateX(-Math.PI / 2).rotateZ(0).translate(x, h + w * 0.3, z), { s: 0.1, thr: 20 })); };
      const forest = (n2, R0) => { const R = rng(7 + i); for (let k = 0; k < n2; k++) { const r = Math.sqrt(R()) * R0, b = R() * 7, h = 12 + R() * 8; grp.add(ink(new THREE.ConeGeometry(3.4, h, 6).translate(Math.cos(b) * r, h / 2, Math.sin(b) * r), { s: 0.06, thr: 40 })); } };
      const extra = {};
      if (i === 0) { house(26, 10, 18); grp.add(ink(new THREE.BoxGeometry(2, 6, 0.4).translate(0, 18, 9.3), { mat: basic(0xffffff), s: 0.02 }), ink(new THREE.BoxGeometry(6, 2, 0.4).translate(0, 18, 9.3), { mat: basic(0xffffff), s: 0.02 })); }
      if (i === 1) { forest(22, 34); extra.smoke = Array.from({ length: 5 }, (_, k) => { const m = basic(0x8d8e87, { transparent: true, opacity: 0.25, depthWrite: false }), o = new THREE.Mesh(new THREE.IcosahedronGeometry(5, 1), m); o.userData.k = k; grp.add(o); return o; }); }
      if (i === 2 || i === 5) house(18, 10, 16);
      if (i === 5) grp.add(ink(new THREE.BoxGeometry(2.4, 4, 2.4).translate(14, 2, 9), { s: 0.03 }));
      if (i === 3) { forest(30, 48); const z = [], R2 = 40; for (let k = 0; k <= 6; k++) { const x = -R2 + (k / 6) * 2 * R2; z.push(V(x, 0.3, k % 2 ? R2 : -R2), V(x, 0.3, k % 2 ? -R2 : R2)); } grp.add(poly(z, 0xb3b2aa, { dashed: true, dash: 4, gap: 3 })); extra.search = z; }
      if (i === 4) {
        grp.add(ink(new THREE.CylinderGeometry(1.4, 2.6, 90, 12).translate(0, 45, 0), { s: 0.1, thr: 40 }), ink(new THREE.BoxGeometry(8, 4, 4).translate(2, 91, 0), { s: 0.05 }));
        const hub = new THREE.Group(); hub.position.set(-2.4, 91, 0); grp.add(hub);
        for (let k = 0; k < 3; k++) { const b = ink(new THREE.BoxGeometry(0.8, 40, 2.4).translate(0, 20, 0), { s: 0.05 }); b.rotation.x = (k / 3) * Math.PI * 2; hub.add(b); }
        hub.rotation.y = Math.PI / 2; extra.hub = hub;
      }
      const lbD = label(n, 'exempel', V(p.x, i === 4 ? 132 : 24, p.z), g, 'ghost');
      const lineMat = bdash({ color: 0xb3b2aa, dashSize: 8, gapSize: 6, transparent: true });
      const top = V(p.x, i === 4 ? 112 : CRU, p.z), route = new THREE.Line(new THREE.BufferGeometry().setFromPoints([V(PAD.x, CRU, 0), top, V(p.x, 0, p.z)]), lineMat); route.computeLineDistances(); g.add(route);
      return { n, sub, kind, p, top, lbD, lineMat, extra, dist };
    });
    // the drone, larger than life, and a lime dot that shows it from far away
    const drone = new THREE.Group(); g.add(drone);
    drone.add(ink(new THREE.BoxGeometry(1.4, 0.5, 1.4), { s: 0.01 }));
    const rotors = [];
    for (let k = 0; k < 4; k++) { const a = Math.PI / 4 + (k * Math.PI) / 2; drone.add(poly([V(0, 0, 0), V(Math.cos(a) * 1.5, 0.15, Math.sin(a) * 1.5)])); const r = ring('y', 24); r.scale.setScalar(0.75); r.position.set(Math.cos(a) * 1.5, 0.3, Math.sin(a) * 1.5); drone.add(r); rotors.push(r); }
    drone.scale.setScalar(2.5);
    const dot = dots(g, 1, 9, C.lime, { depthTest: false }), alt = liveLine(g, 2, 0x8fb300, { dashed: true, dash: 3, gap: 3 });
    const pick = opts(api, ROUTES.map((r) => r[0])), rd = readout(api);
    let cur = 0, t0 = 0, manualAt = 0;
    pick.el.onclick = (e) => { const b = e.target.closest('button'); if (!b) return; cur = +b.dataset.i; t0 = -1; manualAt = performance.now(); };
    const pos = V(0, 0, 0), tmp = V(0, 0, 0);
    const T = { pad: 2.5, up: 4.5, fly: 7, act: 6, back: 7, down: 4.5, rest: 1.5 };
    const total = Object.values(T).reduce((a, b) => a + b, 0);
    let first = true;
    return (t) => {
      if (t0 < 0) t0 = t;
      let k = t - t0;
      if (k > total) { t0 = t; k = 0; first = false; if (performance.now() - manualAt > 60000 || !manualAt) cur = (cur + 1) % ROUTES.length; }
      const D = dest[cur], A = V(PAD.x, CRU, 0), Bp = D.kind === 'circle' && cur === 4 ? V(D.p.x, 112, D.p.z) : V(D.p.x, CRU, D.p.z);
      let ph, h;
      const e0 = T.pad, e1 = e0 + T.up, e2 = e1 + T.fly, e3 = e2 + T.act, e4 = e3 + T.back, e5 = e4 + T.down;
      if (k < e0) { pos.set(PAD.x, 0.6, 0); ph = 'på plattan'; }
      else if (k < e1) { pos.set(PAD.x, 0.6 + (CRU - 0.6) * ease((k - e0) / T.up), 0); ph = 'lyfter rakt upp'; }
      else if (k < e2) { pos.lerpVectors(A, Bp, ease((k - e1) / T.fly)); ph = 'flyger ut'; }
      else if (k < e3) {
        const f = (k - e2) / T.act;
        if (D.kind === 'drop') { pos.copy(Bp); pos.y = CRU - (CRU - 30) * Math.sin(f * Math.PI); ph = 'sänker sig och lämnar'; }
        else if (D.kind === 'circle') { const r = cur === 4 ? 45 : 40, a = f * Math.PI * 2; pos.set(D.p.x + Math.sin(a) * r, Bp.y, D.p.z - r + Math.cos(a) * r); ph = cur === 4 ? 'kontrollerar verket' : 'spanar efter rök'; }
        else { const z = D.extra.search, m = z.length - 1, s = f * m, i = Math.min(m - 1, Math.floor(s)); tmp.lerpVectors(z[i], z[i + 1], s - i); pos.set(D.p.x + tmp.x, 60, D.p.z + tmp.z); ph = 'söker i ett mönster'; }
      }
      else if (k < e4) { pos.lerpVectors(Bp, A, ease((k - e3) / T.back)); ph = 'flyger hem'; }
      else if (k < e5) { pos.set(PAD.x, CRU - (CRU - 0.6) * ease((k - e4) / T.down), 0); ph = 'landar'; }
      else { pos.set(PAD.x, 0.6, 0); ph = 'tillbaka på plattan'; }
      // the search and circle legs blend into the straight legs (search starts and ends at the corner, so glide there)
      if (D.kind === 'search' && k >= e1 && k < e2) { tmp.copy(D.extra.search[0]).add(D.p); tmp.y = 60; pos.lerpVectors(A, tmp, ease((k - e1) / T.fly)); }
      if (D.kind === 'search' && k >= e3 && k < e4) { tmp.copy(D.extra.search[D.extra.search.length - 1]).add(D.p); tmp.y = 60; pos.lerpVectors(tmp, A, ease((k - e3) / T.back)); }
      if (D.kind === 'circle' && k >= e1 && k < e2) { tmp.set(D.p.x, Bp.y, D.p.z); pos.lerpVectors(A, tmp, ease((k - e1) / T.fly)); }
      if (D.kind === 'circle' && k >= e3 && k < e4) { tmp.set(D.p.x, Bp.y, D.p.z); pos.lerpVectors(tmp, A, ease((k - e3) / T.back)); }
      h = pos.y;
      drone.position.copy(pos); rotors.forEach((r, i) => (r.rotation.y = t * 9 + i));
      dot.pos.set([pos.x, pos.y + 1.5, pos.z]); dot.done();
      alt.set(0, pos.x, 0, pos.z); alt.set(1, pos.x, pos.y, pos.z); alt.done(); alt.l.computeLineDistances(); alt.l.visible = h > 3;
      dest.forEach((d, i) => { d.lineMat.color.set(i === cur ? LIME_D : 0xc9c8c0); d.lineMat.opacity = i === cur ? 1 : 0.7; d.lbD.element.classList.toggle('ghost', i !== cur); big(d.lbD, i === cur); d.lbD.element.dataset.pri = i === cur ? 2 : 0; });
      pick.set(cur);
      dest[4].extra.hub.rotation.z = t * 0.25;
      dest[1].extra.smoke.forEach((o) => { const q = (t * 0.06 + o.userData.k / 5) % 1; o.position.set(8 + q * 14, 18 + q * 60, -4); o.scale.setScalar(0.6 + q * 1.8); o.material.opacity = 0.28 * (1 - q); });
      const dist = Math.hypot(pos.x - PAD.x, pos.z);
      api.step(k < e0 ? (first ? 0 : 1) : k < e1 ? 2 : (k < e2 || k >= e3) && k < e4 ? (dist > 200 ? 3 : 2) : k < e4 ? 4 : 1);
      rd.innerHTML = `<b>${D.n}</b> ${D.sub} (exempel) · ${ph} · höjd <b>${fmt(h)} m</b> av högst 120 · ${fmt(Math.round(dist / 10) * 10)} m från plattan`;
    };
  },
};

// ── the cards' buttons ──
hop('berget', { scene: 'berget', dir: 'ut', label: 'Berget, 1,89 miljarder år' });
hop('vem-ager-naturen', { scene: 'berget', dir: 'ut', label: 'Berget som bildades' });
hop('skogen', { scene: 'istiden', dir: 'ut', label: 'Skogen efter isen' });
hop('rutschkanan', { scene: 'ecolink', dir: 'ut', label: 'EcoLink: spillvärmen' });
hop('elbil', { scene: 'qi', dir: 'in', label: 'Qi-spolen' });
hop('droneport', { scene: 'droneport', dir: 'ut', label: 'Droneport på Hammarängen' });
