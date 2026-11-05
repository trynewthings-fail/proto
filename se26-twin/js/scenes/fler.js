// Scale scenes, track E11: more hops (SkyKraft, Elbilsladdaren battery cell, Säg ja!, Dokumentärväggen timeline, Alimak rack and pinion, ACE building, the MQTT message byte by byte).
// Same pattern as js/scales.js: add scenes to SCENES and the cards' buttons to HOPS (append, never replace a card's list).
import * as THREE from 'three';
import { mergeGeometries } from 'three/addons/BufferGeometryUtils.js';
import { SCENES, HOPS, V, INK, LIME, ease, fmt, ink, label, poly, ring, canvas, readout, loadMesh } from '../scales.js';
import { C, lam, bline, bdash } from '../world.js';
import { figure } from '../figure.js';

const hop = (card, h) => (HOPS[card] ||= []).push(h);

// ── small shared helpers ──
const YELLOW = 0xecc414, WARM = 0xff9e2c, GREY = 0x5c5d57, LIME_D = 0x8fb300, BG = new THREE.Color(C.bg);
const clamp = THREE.MathUtils.clamp, lerp = THREE.MathUtils.lerp, sstep = THREE.MathUtils.smoothstep;
const basic = (color, o = {}) => new THREE.MeshBasicMaterial({ color, ...o });
const glass = (op = 0.3, color = 0xffffff) => lam(color, { transparent: true, opacity: op, depthWrite: false, side: THREE.DoubleSide });
const HULL = basic(C.ink, { side: THREE.BackSide });
// a round thing with an ink outline (inverted hull), for atoms, ions and noteheads
function blob(geom, mat, k = 1.1) { const g = new THREE.Group(); g.add(new THREE.Mesh(geom, mat)); const h = new THREE.Mesh(geom, HULL); h.scale.setScalar(k); g.add(h); return g; }
// highlight one label at a time with the lime "hot" style
function hotLabels(list) { let last = -2; return (i) => { if (i === last) return; last = i; list.forEach((l, k) => l?.element.classList.toggle('hot', k === i)); }; }
// piecewise linear y(x) over [[x, y] …]
const pw = (pts) => (x) => { if (x <= pts[0][0]) return pts[0][1]; for (let i = 1; i < pts.length; i++) if (x <= pts[i][0]) { const [x0, y0] = pts[i - 1], [x1, y1] = pts[i]; return y0 + (y1 - y0) * (x - x0) / (x1 - x0); } return pts[pts.length - 1][1]; };
// a cloud of moving points; size in world units
function dots(g, n, size, color, colors = false) {
  const pos = new Float32Array(n * 3), geo = new THREE.BufferGeometry(); geo.setAttribute('position', new THREE.BufferAttribute(pos, 3));
  const col = colors ? new Float32Array(n * 3) : null; if (col) geo.setAttribute('color', new THREE.BufferAttribute(col, 3));
  const p = new THREE.Points(geo, new THREE.PointsMaterial({ color: colors ? 0xffffff : color, size, vertexColors: colors, transparent: true, depthWrite: false }));
  p.frustumCulled = false; g.add(p);
  return { pos, col, p, set(i, x, y, z) { pos[i * 3] = x; pos[i * 3 + 1] = y; pos[i * 3 + 2] = z; }, done() { geo.attributes.position.needsUpdate = true; if (col) geo.attributes.color.needsUpdate = true; } };
}
// a polyline with arc length, for things that travel along it
function track(pts) {
  const L = [0]; for (let i = 1; i < pts.length; i++) L.push(L[i - 1] + pts[i].distanceTo(pts[i - 1]));
  const len = L[L.length - 1];
  return { len, pts, at(u, out = V(0, 0, 0)) { const s = clamp(u, 0, 1) * len; let i = 1; while (i < L.length - 1 && L[i] < s) i++; return out.lerpVectors(pts[i - 1], pts[i], (s - L[i - 1]) / (L[i] - L[i - 1] || 1)); } };
}
// a body of revolution around the x axis from a profile [[x, r] …]; half = only the far half (z ≤ 0), for cut-aways
const lathe = (prof, half = false, seg = 48) => new THREE.LatheGeometry(prof.map(([x, r]) => new THREE.Vector2(r, x)), seg, half ? Math.PI / 2 : 0, half ? Math.PI : Math.PI * 2).rotateZ(-Math.PI / 2);
// the cut face of a profile in the z = 0 plane, above and below the axis
function cutFace(prof, mat, s = 0.04) { const grp = new THREE.Group(); for (const sg of [1, -1]) grp.add(ink(new THREE.ShapeGeometry(new THREE.Shape(prof.map(([x, r]) => new THREE.Vector2(x, r * sg)))), { mat, s })); return grp; }
const canvasTex = (w, h) => { const c = document.createElement('canvas'); c.width = w; c.height = h; const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = 4; return { c, g: c.getContext('2d'), t }; };
const slider = (api, name, min, max, val) => { const sl = document.createElement('label'); sl.className = 'sc-ctl'; sl.innerHTML = `${name} <input type="range" min="${min}" max="${max}" value="${val}"> <output></output>`; api.live.append(sl); const inp = sl.querySelector('input'); const o = { inp, out: sl.querySelector('output'), touched: false }; inp.addEventListener('input', () => (o.touched = true)); return o; };

// ── molecules (Å): balls with an ink outline and grey sticks ──
const ATOM = { C: [0.6, 0x55564f], O: [0.54, 0xffffff], H: [0.32, 0xffffff] };
const ATOM_G = {}, BOND_G = new THREE.CylinderGeometry(0.075, 0.075, 1, 6), BOND_M = basic(0x8d8e87);
function atom(e, mat) { return blob(ATOM_G[e] ||= new THREE.SphereGeometry(ATOM[e][0], 20, 14), mat || lam(ATOM[e][1]), 1.09); }
function bond(g, a, b, n = 1) {
  const d = b.clone().sub(a), L = d.length(), mid = a.clone().add(b).multiplyScalar(0.5), q = new THREE.Quaternion().setFromUnitVectors(V(0, 1, 0), d.clone().normalize());
  const side = n > 1 ? V(0, 0, 1).cross(d).normalize().multiplyScalar(0.2) : V(0, 0, 0);
  for (let k = 0; k < n; k++) { const m = new THREE.Mesh(BOND_G, BOND_M); m.scale.set(1, L, 1); m.quaternion.copy(q); m.position.copy(mid).addScaledVector(side, k - (n - 1) / 2); g.add(m); }
}
function mol(atoms, bonds, mats = {}) {
  const g = new THREE.Group(), P = atoms.map(([e, x, y, z = 0]) => { const a = atom(e, mats[e]); a.position.set(x, y, z); g.add(a); return a.position; });
  for (const [i, j, n] of bonds) bond(g, P[i], P[j], n);
  return g;
}
const MOL = {
  co2: () => mol([['C', 0, 0], ['O', -1.16, 0], ['O', 1.16, 0]], [[0, 1, 2], [0, 2, 2]]),
  h2: () => mol([['H', -0.37, 0], ['H', 0.37, 0]], [[0, 1, 1]]),
  h2o: () => mol([['O', 0, 0], ['H', -0.76, 0.59], ['H', 0.76, 0.59]], [[0, 1, 1], [0, 2, 1]]),
  co: () => mol([['C', -0.56, 0], ['O', 0.56, 0]], [[0, 1, 3]]),
  o2: () => mol([['O', -0.6, 0], ['O', 0.6, 0]], [[0, 1, 2]]),
};

// ════════════════════════════════════════════════════════════════════════════════════════════
// SkyKraft 1: a turbofan jet engine in cut-away, with the air, the fuel and the hot gas flowing. Unit: 10 cm.
SCENES.jetmotor = {
  title: 'Jetmotorn inifrån', kick: 'Makro · 10⁰ m', unit: 0.1,
  view: { t: [18, 0, 0], d: 80, el: 0.3, az: 0.42 },
  lead: 'En jetmotor suger in luft, bränner bränsle och skjuter ut het gas. Det är här flygbränslet brinner, fossilt eller e-SAF.',
  steps: ['Fläkten längst fram suger in luft. Det mesta går förbi kärnan och ger det mesta av kraften.', 'Kompressorn trycker ihop resten av luften, steg för steg.', 'I brännkammaren sprutas bränslet in och brinner. Gasen blir mycket het.', 'Den heta gasen snurrar turbinen. Via axlarna driver den kompressorn och fläkten.', 'Gasen och luften strömmar ut bakåt och skjuter planet framåt.'],
  note: 'Schematisk motor av en vanlig sort för passagerarplan, inte en bestämd modell. Dra i reglaget, så går motorn fortare.',
  build(g, api) {
    // casings, cut open: the far half is drawn whole, the cut faces in grey
    const nac = [[-1.2, 8.1], [-0.6, 7.6], [2, 7.45], [8, 7.5], [16, 7.3], [21.5, 6.9], [21.5, 7.15], [16, 8.2], [8, 8.75], [1, 8.8], [-0.6, 8.55], [-1.2, 8.1]];
    const core = [[5, 4.45], [8, 4.9], [14, 5.1], [21, 4.9], [27, 4.3], [30.5, 3.75], [30.5, 3.5], [27, 3.95], [24, 3.5], [21.5, 3.6], [17, 3.5], [15.5, 3.0], [9, 3.45], [6, 4.1], [5, 4.45]];
    const hub = [[-2.6, 0], [-2.2, 0.8], [-1.2, 1.6], [0.2, 2.05], [1.5, 2.2], [6, 2.3], [9, 2.35], [15.5, 2.5], [17, 2.3], [21.5, 2.3], [22.5, 2.5], [27, 2.55], [31, 1.6], [34.5, 0]];
    const shell = lam(0xffffff, { side: THREE.DoubleSide }), cutM = lam(0xd9d8d1, { side: THREE.DoubleSide });
    g.add(ink(lathe(nac, true), { mat: shell, s: 0.05, thr: 35 }), cutFace(nac, cutM));
    g.add(ink(lathe(core, true), { mat: shell, s: 0.05, thr: 35 }), cutFace(core, cutM));
    g.add(ink(lathe(hub, false, 40), { mat: lam(0xffffff), s: 0.05, thr: 35 }));
    const coreOut = pw([[4.5, 4.4], [6, 4.1], [9, 3.45], [15.5, 3.0], [17, 3.5], [21.5, 3.6], [24, 3.5], [27, 3.95], [30.5, 3.5], [44, 3.7]]);
    const hubR = pw(hub.slice(4).concat([[44, 0]]).map(([x, r]) => [x, x < 1.5 ? 2.2 : r]));
    const cowlOut = pw([[-10, 4.6], [5, 4.45], [8, 4.9], [14, 5.1], [21, 4.9], [27, 4.3], [30.5, 3.75], [44, 3.9]]);
    const nacIn = pw([[-10, 7.8], [-0.6, 7.6], [2, 7.45], [8, 7.5], [16, 7.3], [21.5, 6.9], [44, 6.4]]);
    // rotors: blades placed around the x axis, merged per spool
    const bladeRow = (list, x, r0, r1, n, chord, pitch, th = 0.08) => { for (let i = 0; i < n; i++) list.push(new THREE.BoxGeometry(chord, r1 - r0, th).translate(0, (r0 + r1) / 2, 0).rotateY(pitch).rotateX(i / n * Math.PI * 2).translate(x, 0, 0)); };
    const lpG = [], hpG = [];
    bladeRow(lpG, 2.6, 2.15, 7.35, 18, 2.1, 0.62, 0.14);   // the fan
    for (const x of [6.6, 7.7]) bladeRow(lpG, x, hubR(x) - 0.05, coreOut(x) - 0.1, 26, 0.55, 0.5);
    for (let k = 0; k < 6; k++) { const x = 9.6 + k * 1.05; bladeRow(hpG, x, hubR(x) - 0.05, coreOut(x) - 0.08, 30, 0.5, 0.5); }
    for (const x of [22.4, 23.3]) bladeRow(hpG, x, hubR(x) - 0.05, coreOut(x) - 0.08, 32, 0.55, -0.6);
    for (const x of [24.5, 25.6, 26.6]) bladeRow(lpG, x, hubR(x) - 0.05, coreOut(x) - 0.08, 32, 0.6, -0.6);
    const lp = ink(mergeGeometries(lpG), { s: 0.02, thr: 40 }), hp = ink(mergeGeometries(hpG), { s: 0.02, thr: 40 });
    g.add(lp, hp);
    // the combustor: flame inside the far half, and the fuel nozzles
    const flameM = basic(WARM, { transparent: true, opacity: 0.35, depthWrite: false, side: THREE.DoubleSide });
    g.add(new THREE.Mesh(lathe([[17.5, 2.6], [21.2, 2.5], [21.2, 3.3], [17.5, 3.2], [17.5, 2.6]], true), flameM));
    for (let i = 0; i < 10; i++) { const a = Math.PI / 2 + (i / 9) * Math.PI; const n = ink(new THREE.CylinderGeometry(0.16, 0.16, 0.8, 8).rotateZ(Math.PI / 2), { color: 0x9a9b94, s: 0.01 }); n.position.set(17.1, -Math.sin(a) * 2.9, Math.cos(a) * 2.9); g.add(n); }
    // the air: bypass round the core, and core air that is squeezed, heated and thrown out
    const NB = 260, NC = 300, air = dots(g, NB + NC, 0.4, 0, true);
    const sd = Array.from({ length: NB + NC }, () => [Math.random(), Math.random(), Math.random() < 0.5 ? 1 : -1, Math.random()]);
    const timeMap = (vf, x0, x1, n = 500) => { const xs = [], ts = [0]; for (let i = 0; i <= n; i++) xs.push(x0 + (x1 - x0) * i / n); for (let i = 1; i <= n; i++) ts.push(ts[i - 1] + (xs[i] - xs[i - 1]) / vf((xs[i] + xs[i - 1]) / 2)); const T = ts[n]; return (u) => { const tt = u * T; let lo = 0, hi = n; while (hi - lo > 1) { const m = (lo + hi) >> 1; ts[m] < tt ? (lo = m) : (hi = m); } return xs[lo] + (xs[hi] - xs[lo]) * (tt - ts[lo]) / (ts[hi] - ts[lo] || 1); }; };
    const coreX = timeMap(pw([[-9, 1], [6, 0.9], [15.5, 0.42], [17, 0.38], [21.5, 0.6], [27, 1.5], [32, 2.6], [42, 2.6]]), -9, 42), byX = timeMap(pw([[-9, 1], [21, 1.1], [30, 1.5], [42, 1.5]]), -9, 42);
    const cCold = new THREE.Color(0x8a989b), cDense = new THREE.Color(0x46555a), cHot = new THREE.Color(0xd8572a), cOut = new THREE.Color(0xb3968a), cBy = new THREE.Color(0x9fb0b3), tc = new THREE.Color();
    const fuel = dots(g, 60, 0.3, C.lime), fs = Array.from({ length: 60 }, () => [Math.random(), Math.random() < 0.5 ? 1 : -1, Math.random()]);
    // labels
    const L = [label('Fläkten', '', V(2.6, 9.0, 0), g), label('Kompressorn', '', V(12.4, -3.4, 0), g), label('Brännkammaren', 'bränslet brinner', V(19.3, 3.6, 0), g), label('Turbinen', '', V(25.2, -4.1, 0), g), label('Munstycket', 'ut bakåt', V(31.5, 3.9, 0), g)];
    label('Förbiflödet', 'luft runt kärnan', V(12, 6.6, 0), g, 'ghost'); label('Luft in', '', V(-6.5, 5.5, 0), g, 'topic');
    const hot = hotLabels(L), sl = slider(api, 'Blås', 0, 100, 60), rd = readout(api);
    let spd = 0.6, aLp = 0, aHp = 0, uC = 0, uB = 0, uF = 0;
    return (t, dt) => {
      const s = Math.min(0.05, dt / 1000);
      if (!sl.touched) sl.inp.value = Math.round(58 + 28 * Math.sin(t * 0.22));
      const blow = +sl.inp.value / 100; sl.out.textContent = `${sl.inp.value} %`;
      spd += (0.15 + blow * 0.95 - spd) * Math.min(1, s * 1.2);
      aLp += s * spd * 4.2; aHp += s * spd * 7; lp.rotation.x = aLp; hp.rotation.x = aHp;
      uC += s * spd * 0.055; uB += s * spd * 0.07; uF += s * spd * 0.9;
      for (let i = 0; i < NB + NC; i++) {
        const [a, f, sg, w] = sd[i], by = i < NB, x = by ? byX((a + uB) % 1) : coreX((a + uC) % 1);
        let r;
        if (by) r = x < 21.5 ? lerp(cowlOut(x) + 0.25, nacIn(x) - 0.2, f) : lerp(cowlOut(x) + 0.3, nacIn(x) - 0.3, f);
        else r = x < 4.8 ? lerp(hubR(x) + 0.2, 4.2, f) : lerp(hubR(x) + 0.15, coreOut(x) - 0.12, f);
        if (by && x < 4.8) r = lerp(4.6, nacIn(x) - 0.2, f);
        air.set(i, x, sg * r, 0.25 + w * 0.6);
        if (by) tc.copy(cBy);
        else if (x < 17) tc.copy(cCold).lerp(cDense, clamp((x - 6) / 9.5, 0, 1));
        else if (x < 21.5) tc.copy(cDense).lerp(cHot, clamp((x - 17) / 2, 0, 1));
        else tc.copy(cHot).lerp(cOut, clamp((x - 21.5) / 16, 0, 1));
        const fade = clamp((x + 9) / 2.5, 0, 1) * clamp((42 - x) / 7, 0, 1);
        tc.lerp(BG, 1 - fade); air.col[i * 3] = tc.r; air.col[i * 3 + 1] = tc.g; air.col[i * 3 + 2] = tc.b;
      }
      air.done();
      fs.forEach(([a, sg, w], i) => { const k = (a + uF) % 1, on = a < 0.25 + blow * 0.75; air && fuel.set(i, on ? 17.5 + k * 2.6 : -99, sg * (2.9 + (w - 0.5) * k * 0.9), 0.3 + w * 0.4); });
      fuel.done(); fuel.p.material.opacity = 0.9;
      flameM.opacity = 0.12 + blow * 0.4 + Math.sin(t * 17) * 0.03;
      const st = Math.floor(t / 3.4) % 5; api.step(st); hot(st);
      rd.innerHTML = `Blås <b>${sl.inp.value} %</b> · bränsle in: <b>${blow < 0.25 ? 'lite' : blow < 0.6 ? 'mer' : 'mycket'}</b> · fläkten och turbinen sitter på samma axel`;
    };
  },
};

// SkyKraft 2: the molecule route from carbon dioxide, water and electricity to synthetic jet fuel. Unit: 1 Å.
SCENES.esaf = {
  title: 'Från koldioxid till flygbränsle', kick: 'Mikro · 10⁻⁹ m', unit: 1e-10,
  view: { t: [1, 2, 0], d: 196, el: 0.18, az: 0.14 },
  lead: 'e-SAF är flygbränsle som görs av koldioxid, vatten och el i stället för av olja. Så här går det till på molekylnivå, i stora drag.',
  steps: ['Koldioxid fångas in, till exempel från förbränning av växtmaterial. Då kallas den biogen.', 'Vätgas görs av vatten och el: elektrolys delar vattnet i vätgas och syrgas.', 'Koldioxid och vätgas reagerar, i flera steg. Syret går bort som vatten.', 'Kolatomerna fogas ihop till långa kedjor av kol och väte.', 'Kedjor med ungefär 8 till 16 kolatomer blir flygbränsle. När det brinner blir det koldioxid igen.'],
  note: 'Allmän e-SAF-kemi, ingen bestämd syntesväg. Att vätgasen görs med elektrolys är det vanliga sättet. Atomerna är ritade som kulor och stegen ligger tätt; i verkligheten är varje steg en stor anläggning.',
  build(g, api) {
    const A = V(-38, 10, 0), B = V(-38, -10, 0), R2 = V(0, 0, 0), E = V(30, 0, 0);
    const reactor = (p, r) => { for (const k of [1, 1.04]) { const c = ring('z', 64); c.scale.setScalar(r * k); c.position.copy(p); c.material.opacity = 0.7; g.add(c); } };
    reactor(R2, 9); reactor(B, 4.5);
    for (const dx of [-1.8, 1.8]) g.add(ink(new THREE.BoxGeometry(0.4, 4.6, 2).translate(B.x + dx, B.y, 0), { color: 0xd9d8d1, s: 0.02 }));
    const wire = track([V(-46, 3, 0), V(-40, 3, 0), V(-40, -7.5, 0)]), wire2 = track([V(-46, 3.6, 0), V(-36, 3.6, 0), V(-36, -7.5, 0)]);
    g.add(poly(wire.pts, GREY), poly(wire2.pts, GREY));
    const sparks = dots(g, 10, 0.55, C.lime);
    const L = [label('Koldioxid', 'CO₂', V(-50, 13, 0), g), label('Elektrolys', 'vatten + el → vätgas', V(-38, -15.5, 0), g), label('Syntesen', 'CO₂ + H₂ → kolkedjor + vatten', V(-6, 9.8, 0), g), null, label('e-SAF', 'kedjor med 8–16 kol', V(24, 5, 0), g)];
    label('el', '', V(-47, 4.5, 0), g, 'topic'); label('vatten', 'H₂O', V(-52, -12, 0), g, 'ghost'); label('syrgas ut', 'O₂', V(-30, -21, 0), g, 'ghost'); label('vatten ut', '', V(8, -13, 0), g, 'ghost');
    // streams of molecules along paths; each item has its own phase
    const streams = [];
    const stream = (make, pts, n, per, o = {}) => { const tr = track(pts); const items = Array.from({ length: n }, (_, i) => { const m = make(); g.add(m); return { m, ph: i / n, spin: Math.random() * 6 }; }); streams.push({ tr, items, per, ...o }); };
    stream(MOL.co2, [V(-56, 14, 0), A, V(-20, 4, 0), R2.clone().add(V(-7, 1.5, 0))], 4, 10);
    stream(MOL.h2o, [V(-56, -14, 0), V(-46, -11, 0), B], 3, 7, { cut: 0.98 });
    stream(MOL.h2, [B, V(-22, -5, 0), R2.clone().add(V(-7, -1.5, 0))], 4, 8);
    stream(MOL.o2, [B, V(-34, -15, 0), V(-30, -22, 0)], 2, 7, { fade: true });
    stream(MOL.h2o, [R2, V(4, -8, 0), V(8, -15, 0)], 3, 6, { fade: true });
    // the growing chain: one unit = a carbon with its hydrogens and the bond back
    const N = 10, chain = new THREE.Group(), cMat = lam(0x55564f), units = [];
    for (let i = 0; i < N; i++) {
      const u = new THREE.Group(), y = i % 2 ? 0.44 : -0.44, sg = i % 2 ? 1 : -1, c = V(i * 1.26, y, 0);
      const ca = atom('C', cMat); ca.position.copy(c); u.add(ca);
      if (i) bond(u, V((i - 1) * 1.26, -y, 0), c);
      const hs = [V(c.x, y + sg * 0.55, 0.88), V(c.x, y + sg * 0.55, -0.88)];
      if (i === 0) hs.push(V(-1.05, y - 0.3, 0)); if (i === N - 1) hs.push(V(c.x + 1.05, y + 0.3 * sg, 0));
      for (const h of hs) { const ha = atom('H'); ha.position.copy(h); u.add(ha); bond(u, c, h); }
      chain.add(u); units.push(u);
    }
    g.add(chain);
    // the fuel burns and gives the carbon dioxide back: a dashed arc home
    const arc = new THREE.QuadraticBezierCurve3(V(34, 6, 0), V(-2, 34, 0), A.clone().add(V(2, 3, 0)));
    g.add(poly(arc.getPoints(60), 0x9a9b94, { dashed: true, dash: 1.2, gap: 0.9 }));
    label('brinner i motorn', 'blir CO₂ igen', V(-2, 21.5, 0), g, 'ghost');
    const back = MOL.co2(); back.scale.setScalar(0.8); g.add(back);
    const rd = readout(api), hot = hotLabels(L), tmp = V(0, 0, 0);
    return (t) => {
      for (const s of streams) for (const it of s.items) {
        const u = ((t / s.per) + it.ph) % 1; s.tr.at(u, it.m.position);
        it.m.rotation.set(Math.sin(t * 0.5 + it.spin) * 0.6, t * 0.4 + it.spin, Math.sin(t * 0.3 + it.spin) * 0.4);
        const sc = Math.min(1, u * 8) * (s.fade ? 1 - sstep(u, 0.7, 1) : Math.min(1, (1 - u) * 12)); it.m.scale.setScalar(Math.max(0.001, sc));
      }
      for (let i = 0; i < 10; i++) { const u = ((t * 0.5) + i / 10) % 1; (i % 2 ? wire2 : wire).at(u, tmp); sparks.set(i, tmp.x, tmp.y, 0.4); } sparks.done();
      // chain cycle: grow in reactor 2, slide to the product place, glow, fade
      const per = 16, k = t % per, grown = Math.min(N, Math.floor(k / 0.8) + 1), mv = sstep(k, 9, 11.5);
      units.forEach((u, i) => (u.visible = i < grown));
      chain.position.set(lerp(R2.x - 5.7, E.x - 5.7, mv), 0, 0); chain.rotation.x = t * 0.25;
      cMat.color.set(0x55564f).lerp(LIME, sstep(k, 10.5, 12));
      chain.scale.setScalar(k > 15 ? Math.max(0.001, (per - k) / 1) : 1);
      const ub = sstep(k, 12, 15.5); arc.getPoint(ub, back.position); back.visible = k > 12 && k < 15.5; back.rotation.y = t;
      const st = k < 9 ? Math.floor(t / 3.2) % 4 : 4; api.step(st); hot(st === 3 ? 2 : st);
      rd.innerHTML = `Kedjan i syntesen: <b>${grown} kolatomer</b>${grown >= 8 ? ' · <b class="go">lagom för flygbränsle</b>' : ''}`;
    };
  },
};

// ════════════════════════════════════════════════════════════════════════════════════════════
// Elbilsladdaren: a lithium-ion cell while charging. Ions cross from the plus side to the minus side; electrons go round the wire. Unit: 1 µm.
SCENES.battericell = {
  title: 'Battericellen laddas', kick: 'Mikro · 10⁻⁴ m', unit: 1e-6,
  view: { t: [-2, 12, 0], d: 360, el: 0.3, az: 0.42 },
  lead: 'Mobilens batteri är samma sorts litiumjoncell som en elbils, bara mycket mindre. Så här ser det ut i ett snitt genom cellen när den laddas.',
  steps: ['Laddaren kopplas in, och ström börjar gå.', 'Laddaren drar elektroner ur pluspolen och trycker dem runt i sladden till minuspolen.', 'Samtidigt lämnar litiumjonerna pluspolen och vandrar genom elektrolyten, en vätska.', 'De tar sig genom separatorn, ett tunt plastmembran med små hål. Elektronerna kan inte ta den vägen.', 'Jonerna lägger sig mellan grafitens lager i minuspolen. När platserna är fulla är cellen laddad.'],
  note: 'Schematiskt snitt. Lagren är ungefär lika tunna som ett hårstrå; en mobil har många sådana lager, en elbil väldigt många fler. Jonerna och elektronerna är ritade stora och långsamma.',
  build(g, api) {
    const Y = 34, Z = 22;
    const slab = (x0, x1, mat, s = 0.4) => g.add(ink(new THREE.BoxGeometry(x1 - x0, 2 * Y, 2 * Z).translate((x0 + x1) / 2, 0, 0), { mat, s }));
    slab(-84, -76, lam(0xd9d8d1)); slab(74, 80, lam(0xe7b48f));
    g.add(ink(new THREE.BoxGeometry(150, 2 * Y, 2 * Z).translate(-1, 0, 0), { mat: lam(C.water, { transparent: true, opacity: 0.32, depthWrite: false }), s: 0.4 }));
    g.add(ink(new THREE.BoxGeometry(18, 2 * Y - 0.6, 2 * Z - 0.6).translate(-4, 0, 0), { mat: glass(0.5), s: 0.3 }));
    for (let i = 0; i < 9; i++) g.add(poly([V(-12 + i * 2, -Y + 1, Z), V(-12 + i * 2, Y - 1, Z)], 0xb3b2aa, { dashed: true, dash: 1.4, gap: 1.6 }));
    // cathode: packed particles of metal oxide
    const parts = [], pg = new THREE.IcosahedronGeometry(1, 2), pm = lam(0xeeede7);
    for (let k = 0; k < 900 && parts.length < 46; k++) {
      const r = 5 + Math.random() * 3, p = V(-75 + r + Math.random() * (60 - 2 * r), -Y + r + Math.random() * (2 * Y - 2 * r), -Z + r + Math.random() * (2 * Z - 2 * r));
      if (parts.some((q) => q.p.distanceTo(p) < q.r + r + 0.6)) continue;
      parts.push({ p, r }); const b = blob(pg, pm, 1.04); b.scale.setScalar(r); b.position.copy(p); g.add(b);
    }
    // anode: graphite flakes, stacked sheets; the gaps between sheets are the ions' places
    const slots = [], sheetM = lam(0x8d8e87);
    for (const fx of [21, 41, 61]) for (const fy of [-21, 0, 21]) {
      const jx = fx + (Math.random() - 0.5) * 3, jy = fy + (Math.random() - 0.5) * 3, jz = (Math.random() - 0.5) * 8;
      for (let l = 0; l < 5; l++) g.add(ink(new THREE.BoxGeometry(17, 0.9, 17).translate(jx, jy - 6 + l * 3, jz), { mat: sheetM, s: 0.1 }));
      for (let l = 0; l < 4; l++) for (let q = 0; q < 2; q++) slots.push(V(jx - 5 + q * 10 + (Math.random() - 0.5) * 3, jy - 4.5 + l * 3, jz + (Math.random() - 0.5) * 10));
    }
    // outer circuit with the charger
    const wire = track([V(-80, Y, 0), V(-80, 66, 0), V(-14, 66, 0), V(14, 66, 0), V(77, 66, 0), V(77, Y, 0)]);
    g.add(poly(wire.pts, C.ink));
    g.add(ink(new THREE.BoxGeometry(28, 14, 10).translate(0, 66, 0), { s: 0.2 }));
    const L = [label('Laddaren', 'pumpar elektronerna runt', V(-14, 76, 0), g), label('Pluspolen', 'katoden, metalloxid', V(-70, Y + 4, Z), g), label('Elektrolyten', 'vätska med joner', V(-30, -Y - 2, Z), g, 'ghost'), label('Separatorn', 'tunt membran', V(-4, Y + 4, Z), g), label('Minuspolen', 'anoden, grafit', V(30, Y + 4, Z), g)];
    label('Aluminiumfolie', '', V(-84, -Y - 3, Z), g, 'ghost'); label('Kopparfolie', '', V(74, -Y - 3, Z), g, 'ghost');
    label('e⁻', 'elektroner', V(44, 70, 0), g, 'topic'); label('Li⁺', 'litiumjoner', V(-60, -Y - 10, Z), g, 'topic');
    const el = dots(g, 26, 2.6, C.ink);
    // ions: leave a cathode particle, wander through the electrolyte and separator, settle in a slot
    const M = Math.min(54, slots.length), ionG = new THREE.SphereGeometry(1.7, 14, 10), ionM = basic(C.lime);
    const ions = Array.from({ length: M }, (_, i) => {
      const q = parts[i % parts.length], dir = V(1, (Math.random() - 0.5) * 1.2, (Math.random() - 0.5) * 1.2).normalize();
      const a = q.p.clone().addScaledVector(dir, q.r + 1.8), end = slots[i];
      const curve = new THREE.CatmullRomCurve3([a, V(-18, a.y * 0.6 + (Math.random() - 0.5) * 16, a.z * 0.5), V(-4, (Math.random() - 0.5) * 50, (Math.random() - 0.5) * 30), V(8, end.y + (Math.random() - 0.5) * 10, end.z * 0.6), end]);
      const m = blob(ionG, ionM, 1.12); m.position.copy(a); g.add(m);
      return { m, curve, d: i / M };
    }).sort(() => Math.random() - 0.5);
    ions.forEach((o, i) => (o.d = i / M));
    const sl = slider(api, 'Laddström', 20, 100, 60), rd = readout(api), hot = hotLabels(L);
    const T = 34, TR = 4.5; let P = 0, ue = 0, full = 0;
    return (t, dt) => {
      const s = Math.min(0.05, dt / 1000), rate = +sl.inp.value / 60; sl.out.textContent = `${sl.inp.value} %`;
      const done = P > T * 0.9 + TR;
      if (!done) { P += s * rate; ue += s * rate * 0.06; } else full += s;
      if (full > 4) { P = 0; full = 0; }
      let moving = 0, home = 0;
      for (const o of ions) {
        const k = clamp((P - o.d * T * 0.9) / TR, 0, 1); o.curve.getPointAt(ease(k), o.m.position);
        if (k > 0 && k < 1) moving++; if (k >= 1) home++;
        o.m.scale.setScalar(full > 3.4 ? Math.max(0.001, (4 - full) / 0.6) : P < 0.3 ? Math.max(0.001, P / 0.3) : 1);
      }
      for (let i = 0; i < 26; i++) { const p = wire.at((i / 26 + ue) % 1); el.set(i, p.x, p.y, p.z + 0.5); } el.done();
      const pct = Math.round(home / M * 100), st = done ? 4 : P < 1.5 ? 0 : 1 + (Math.floor(t / 3.5) % 3);
      api.step(st); hot(st);
      rd.innerHTML = done ? '<b class="go">Laddad</b> · alla platser i grafiten är fulla' : `Laddat <b>${pct} %</b> · ${moving} joner på väg · elektronerna går runt i sladden`;
    };
  },
};

// ════════════════════════════════════════════════════════════════════════════════════════════
// Säg ja!: every press plays the next of 53 notes. The staff is a ring that turns one note per press, like a music box. Unit: 1 cm.
SCENES.blomstertid = {
  title: 'Ett JA, en ton', kick: 'Makro · 10⁰ m', unit: 0.01,
  view: { t: [45, 60, -20], d: 640, el: 0.2, az: 0.12 },
  lead: 'Varje tryck på en knapp kan bli en ton. Här spelar trycken psalmen Den blomstertid nu kommer, en ton i taget.',
  steps: ['Någon trycker JA. Knappen skickar pushbutton1 {"pressed": true}.', 'Meddelandet går via tnt till rpi6, som spelar ljudet.', 'Nästa av psalmens 53 toner spelas, en ton per tryck.', 'Tonen klingar ut med en skimrande efterklang i högtalaren.', 'Efter 53 tryck börjar psalmen om. Knappen har skickat cirka 79 000 meddelanden.'],
  note: 'Notraden är schematisk: tonhöjderna är inte avskrivna ur psalmen (k). Berget bakom har en not för varje helt varv genom psalmen, om varje meddelande är ett tryck: ungefär 1 500.',
  build(g, api) {
    // the speaker in the flower corner
    g.add(ink(new THREE.BoxGeometry(34, 46, 26).translate(0, 23, 0), { s: 0.3 }));
    const cone = new THREE.Group(); cone.position.set(0, 26, 13); g.add(cone);
    cone.add(ink(new THREE.CylinderGeometry(12, 5, 6, 28, 1, true).rotateX(Math.PI / 2).translate(0, 0, -2), { mat: lam(0xf6f5f1, { side: THREE.DoubleSide }), s: 0.1, thr: 40 }));
    cone.add(ink(new THREE.CylinderGeometry(3.5, 3.5, 1, 20).rotateX(Math.PI / 2).translate(0, 0, -4), { color: 0xd9d8d1, s: 0.05 }));
    label('Högtalaren', 'i blomhörnet', V(-17, 50, 0), g);
    for (let i = 0; i < 7; i++) {   // a few flowers round it
      const a = -0.6 + i * 0.5, r = 34 + (i % 3) * 7, x = Math.sin(a) * r * 1.3, z = Math.cos(a) * r * 0.6 - 10, h = 26 + (i % 4) * 9;
      g.add(poly([V(x, 0, z), V(x + 2, h * 0.6, z), V(x, h, z)], 0x77786f));
      const f = ink(new THREE.CylinderGeometry(3.4, 1.2, 1.5, 8).translate(x, h, z), { color: 0xffffff, s: 0.04 }); g.add(f);
    }
    // the button's message arriving
    const msgPath = track([V(-230, 70, 40), V(-120, 70, 40), V(-70, 14, 20), V(-34, 14, 10), V(0, 26, 12)]);
    g.add(poly(msgPath.pts, 0xb3b2aa, { dashed: true, dash: 4, gap: 3 }));
    g.add(ink(new THREE.BoxGeometry(14, 4, 10).translate(-70, 12, 20), { color: 0xd9d8d1, s: 0.05 }));
    const L = [label('pushbutton1', '{"pressed": true}', V(-230, 74, 40), g, 'ghost'), label('rpi6', 'spelar tonen', V(-70, 16, 20), g)];
    const msg = new THREE.Mesh(new THREE.SphereGeometry(3, 14, 10), basic(C.lime)); g.add(msg);
    // the staff ring: five lines and 53 notes
    const R = 150, Y0 = 92, SP = 4.4, NN = 53, staff = new THREE.Group(); staff.position.set(0, 0, 0); g.add(staff);
    for (let k = 0; k < 5; k++) { const c = ring('y', 160); c.scale.setScalar(R); c.position.y = Y0 + k * SP; c.material.color.set(k === 0 || k === 4 ? 0x77786f : 0x9a9b94); staff.add(c); }
    const pitch = Array.from({ length: NN }, (_, i) => clamp(Math.round(4 + 2.4 * Math.sin(i * 0.55) + 1.5 * Math.sin(i * 0.21 + 1)), 0, 8));
    const headG = new THREE.SphereGeometry(2.6, 16, 10), notes = [];
    for (let i = 0; i < NN; i++) {
      const a = i / NN * Math.PI * 2, n = new THREE.Group(), y = Y0 + pitch[i] * SP / 2, m = lam(0xffffff);
      n.position.set(Math.sin(a) * R, 0, Math.cos(a) * R); n.rotation.y = a; staff.add(n);
      const h = blob(headG, m, 1.14); h.scale.set(1.4, 1, 0.6); h.rotation.z = 0.35; h.position.y = y; n.add(h);
      const up = pitch[i] < 4, sx = up ? 3.3 : -3.3;
      n.add(poly([V(sx, y, 0), V(sx, y + (up ? 15 : -15), 0)], C.ink));
      notes.push({ m, n });
    }
    label('Den blomstertid nu kommer', '53 toner', V(0, Y0 + 24, R), notes[0].n, 'topic');
    // sound rings out of the speaker: the tone and its shimmering tail
    const rings = Array.from({ length: 16 }, () => { const r = ring('z', 64); r.position.set(0, 26, 14); r.visible = false; g.add(r); return r; });
    // the mountain of notes: one small note per full time through the hymn
    const HEAP = 1490, heap = new THREE.InstancedMesh(new THREE.SphereGeometry(2.2, 8, 6), lam(0x9a9b94), HEAP), dm = new THREE.Object3D();
    let rs = 11; const rnd = () => ((rs = (rs * 16807) % 2147483647) / 2147483647);
    for (let i = 0; i < HEAP; i++) {
      const rr = Math.sqrt(rnd()) * 120, a = rnd() * Math.PI * 2, h = Math.max(0, 85 * (1 - rr / 120)) * (0.75 + rnd() * 0.25);
      dm.position.set(230 + Math.cos(a) * rr, h, -230 + Math.sin(a) * rr * 0.7); dm.scale.set(1.4, 1, 0.6); dm.rotation.set(rnd(), rnd() * 6, 0.35); dm.updateMatrix(); heap.setMatrixAt(i, dm.matrix);
    }
    heap.count = 0; g.add(heap);
    const heapLb = label('Ett berg av noter', 'en per varv, ≈ 1 500', V(110, 95, -230), g, 'ghost');
    L.push(null, label('Efterklang', 'skimrar', V(30, 64, 30), g, 'topic'), heapLb);
    const tc = canvas(api, 300, 58), rd = readout(api), hot = hotLabels(L);
    const per = 3.2, spawn = []; let lastN = -1, rot = 0;
    return (t, dt) => {
      const idx = Math.floor(t / per), n = idx % NN, lap = Math.floor(idx / NN), k = t % per;
      // message travels, then the note plays at k = 1.0
      msg.visible = k < 1.0; msgPath.at(Math.min(1, k / 1.0), msg.position);
      const playing = k >= 1.0 ? n : (n + NN - 1) % NN;
      if (playing !== lastN) { lastN = playing; spawn.push(t); if (spawn.length > 4) spawn.shift(); notes.forEach((o, i) => o.m.color.set(i === playing ? C.lime : (i < playing ? 0x2b2c28 : 0xffffff))); }
      // the ring turns so the playing note is at the front
      const want = -playing / NN * Math.PI * 2; let d = want - rot; d = Math.atan2(Math.sin(d), Math.cos(d)); rot += d * Math.min(1, dt / 1000 * 3); staff.rotation.y = rot + 0.12;
      let ri = 0;
      for (const s0 of spawn) for (let e = 0; e < 4; e++) {
        const age = t - s0 - e * 0.32; if (age < 0 || age > 2.8 || ri >= rings.length) continue;
        const r = rings[ri++]; r.visible = true; r.scale.setScalar(8 + age * (e ? 30 : 42)); r.position.y = 26 + (e ? age * 6 : 0);
        r.material.color.set(e ? 0x9a9b94 : C.ink); r.material.opacity = (1 - age / 2.8) * (e ? 0.45 : 0.9);
      }
      for (; ri < rings.length; ri++) rings[ri].visible = false;
      cone.position.z = 13 + (k > 1 && k < 1.5 ? Math.sin(t * 70) * 0.6 : 0);
      heap.count = Math.min(HEAP, Math.floor(t * 110));
      const st = k < 0.55 ? 0 : k < 1.0 ? 1 : k < 1.7 ? 2 : n % 6 === 5 ? 4 : 3; api.step(st); hot(st);
      rd.innerHTML = `Ton <b>${playing + 1}</b> av 53 · varv ${lap + 1} · cirka 79 000 meddelanden från knappen ≈ <b>1 500 varv</b>`;
      // the hymn as a strip: played notes dark, the one sounding lime
      const { g: x, w, h } = tc; x.clearRect(0, 0, w, h);
      x.strokeStyle = '#b3b2aa'; x.lineWidth = 1; for (let l = 0; l < 5; l++) { x.beginPath(); x.moveTo(2, 12 + l * 7); x.lineTo(w - 2, 12 + l * 7); x.stroke(); }
      for (let i = 0; i < NN; i++) { const cx = 6 + i * (w - 12) / (NN - 1), cy = 40 - pitch[i] * 3.5; x.beginPath(); x.ellipse(cx, cy, 2.6, 2, -0.35, 0, 7); x.fillStyle = i === playing ? '#cafe03' : i < playing ? '#2b2c28' : '#ffffff'; x.fill(); x.strokeStyle = '#0a0b09'; x.stroke(); }
      x.fillStyle = '#5c5d57'; x.font = '600 9px IBM Plex Mono, monospace'; x.fillText('53 toner, schematiskt', 2, h - 2);
    };
  },
};

// ════════════════════════════════════════════════════════════════════════════════════════════
// Dokumentärväggen: a time zoom along a timeline, anchored at today, from single years out to the whole span. Unit: 1 year (see the note in the report: the scale bar shows metres).
const CITY = [[1886, 'Torget', 'flyttar till dagens plats'], [1906, 'Finnfors', 'kraftstationen byggs'], [1912, 'Stationen', 'öppnar'], [1913, 'Parkbron', 'byggs'], [1948, 'Alimak', 'grundas'], [2021, 'Sara kulturhus', 'öppnar']];
let TL_SPAN = 7;   // years visible beside the card, for the scale bar (the same number as the readout)
SCENES.tidslinje = {
  title: 'Tidslinjen', kick: 'Ut · ett sekel', unit: 1, field: () => [fmt(Math.round(TL_SPAN)), 'år syns'],
  view: { t: [2, 3, 0], d: 112, el: 0.2, az: 0.08 },
  lead: 'Skellefteås industriella sekel: gruvor, kraftverk och smältverk. Här ligger åren på en linje, och du kan zooma från enstaka år ut till hela seklet.',
  steps: ['Ett sekel av industri: gruvor, kraftverk och smältverk.', 'Nära syns enstaka år. Längst till höger är 2026, året då SE26 visas.', 'Längre ut kommer 2013, när Skellefteåborna svarade på frågor om sin stad.', 'Ännu längre ut flyter åren ihop till decennier. Finnfors kraftstation blev klar 1908, och Alimak grundades 1948.', 'Hela seklet ryms, fram till i dag.'],
  note: 'Rutorna längs linjen är tomma: vad som hände varje år behöver ett manus från arkivet (k). Årtalen i den grå raden: Länsstyrelsen (Finnfors), Wikipedia och Alimak (Alimak) och Skellefteå-tvillingens lista över landmärken (staden).',
  build(g, api) {
    const Y0 = 1870, Y1 = 2026, X_NOW = 15;
    const tl = new THREE.Group(); g.add(tl);
    tl.add(poly([V(Y0, 0, 0), V(Y1 + 0.6, 0, 0)], C.ink));
    const segs = (list, h, color) => { const a = []; for (const y of list) a.push(y, 0, 0, y, -h, 0); const geo = new THREE.BufferGeometry(); geo.setAttribute('position', new THREE.Float32BufferAttribute(a, 3)); const l = new THREE.LineSegments(geo, bline({ color, transparent: true })); tl.add(l); return l; };
    const years = [], months = [], decades = [];
    for (let y = Y0; y <= Y1; y++) { (y % 10 ? years : decades).push(y); }
    for (let y = Y0; y < Y1 + 1; y++) for (let m = 1; m < 12; m++) months.push(y + m / 12);
    segs(decades, 3.2, C.ink); const yl = segs(years, 1.5, 0x5c5d57), ml = segs(months, 0.55, 0x9a9b94);
    // the film strip above the line: one empty frame per year
    const fr = [], sp = [];
    for (let y = Y0; y <= Y1; y++) { const a = y + 0.08, b = y + 0.92; fr.push(a, 3, 0, b, 3, 0, b, 3, 0, b, 8.6, 0, b, 8.6, 0, a, 8.6, 0, a, 8.6, 0, a, 3, 0); for (let q = 0; q < 4; q++) { const x = y + 0.1 + q * 0.25; sp.push(x, 2.2, 0, x + 0.1, 2.2, 0, x, 9.4, 0, x + 0.1, 9.4, 0); } }
    const lines = (arr, color) => { const geo = new THREE.BufferGeometry(); geo.setAttribute('position', new THREE.Float32BufferAttribute(arr, 3)); const l = new THREE.LineSegments(geo, bline({ color, transparent: true })); tl.add(l); return l; };
    const frames = lines(fr, 0x77786f), sprockets = lines(sp, 0x9a9b94);
    tl.add(poly([V(Y0, 1.6, 0), V(Y1 + 1, 1.6, 0)], 0x9a9b94), poly([V(Y0, 10, 0), V(Y1 + 1, 10, 0)], 0x9a9b94));
    const strip = new THREE.Mesh(new THREE.PlaneGeometry(Y1 + 1 - Y0, 8.4), basic(0xffffff, { transparent: true, opacity: 0.7, depthWrite: false })); strip.position.set((Y0 + Y1 + 1) / 2, 5.8, -0.05); tl.add(strip);
    // labels: decades always, single years when zoomed in
    const decL = decades.map((y) => label(String(y), '', V(y, -3.6, 0), tl, 'topic'));
    const yrL = []; for (let y = 2010; y <= 2025; y++) if (y % 10) yrL.push(label(String(y), '', V(y + 0.02, -2, 0), tl, 'topic'));
    const now = label('2026', 'SE26 visas', V(2026.5, 11, 0), tl, 'big'); now.element.dataset.pri = 3;
    const d13 = label('2013', 'svaren i Dialogen', V(2013.5, 11, 0), tl); d13.element.dataset.pri = 1;
    // the city lane: a few dated places in Skellefteå, for a sense of time
    tl.add(poly([V(Y0, -7.5, 0), V(Y1 + 1, -7.5, 0)], 0xc9c8c0, { dashed: true, dash: 0.6, gap: 0.6 }));
    const cityL = CITY.map(([y, n, s]) => { tl.add(poly([V(y + 0.5, -7.5, 0), V(y + 0.5, -6.5, 0)], 0x9a9b94)); return label(n, `${y} · ${s}`, V(y + 0.5, -7.5, 0), tl, 'ghost'); });
    label('Belagda årtal', '', V(Y0, -8.6, 0), tl, 'topic');
    // three visitors standing at "now", the shared sketch figure (outside the stretched group, so they keep their shape)
    const ppl = new THREE.Group(); g.add(ppl);
    for (let f = 0; f < 3; f++) { const h = 4.6 - f * 0.4, p = figure({ h: h * 1.47 / 1.36, coat: f + 1 }); p.position.set(f * 2.2, 13, 0); ppl.add(p); }
    const sl = slider(api, 'Tidsspann', 0, 100, 0), rd = readout(api);
    const sIn = 6.5, sOut = 0.27;
    let z = 0;
    return (t) => {
      // auto: hold close, zoom out, hold, zoom back in
      if (!sl.touched) { const per = 30, k = t % per; z = k < 4 ? 0 : k < 13 ? ease((k - 4) / 9) : k < 19 ? 1 : k < 28 ? 1 - ease((k - 19) / 9) : 0; sl.inp.value = Math.round(z * 100); } else z = +sl.inp.value / 100;
      const s = sIn * Math.pow(sOut / sIn, z), c = Y1 + 0.5 - X_NOW / s;
      tl.scale.x = s; tl.position.x = -c * s;
      yl.material.opacity = clamp((s - 0.7) / 1.2, 0, 1); ml.material.opacity = clamp((s - 3) / 3, 0, 1);
      sprockets.material.opacity = clamp((s - 1.5) / 2, 0, 1); frames.material.opacity = clamp((s - 0.4) / 1.6, 0.12, 1);
      for (const l of yrL) l.visible = s > 2.4;
      decL.forEach((l, i) => (l.visible = s > 0.8 || i % 2 === 0));
      ppl.position.set(X_NOW + 1.2, 0, 0.5);
      const span = (X_NOW + 28) / s; TL_SPAN = Math.min(156, span);
      sl.out.textContent = `${fmt(Math.min(156, span))} år`;
      const st = t < 4 && !sl.touched ? 0 : z < 0.2 ? 1 : z < 0.45 ? 2 : z < 0.8 ? 3 : 4; api.step(st);
      rd.innerHTML = `Det syns ungefär <b>${fmt(Math.min(156, span))} år</b> · ${s > 2.4 ? 'enskilda år och månader' : s > 0.8 ? 'år och decennier' : 'decennier'}`;
    };
  },
};

// ════════════════════════════════════════════════════════════════════════════════════════════
// Alimak: rack and pinion. The camera rides with the car; the mast, the rack and the floors slide past. Unit: 1 cm.
SCENES.kuggstang = {
  title: 'Kuggstången och drevet', kick: 'Makro · 10⁰ m', unit: 0.01,
  view: { t: [45, -35, 0], d: 470, el: 0.14, az: 0.5 },
  lead: 'Alimak grundades i Skellefteå 1948 av Alvar Lindmark, och 1962 kom bolagets kuggstångsdrivna bygghiss, som klättrar på sin egen mast. Hissarna tillverkas fortfarande i Skellefteå.',
  steps: ['Hissen hänger inte i vajrar. Masten byggs av sektioner som skruvas ihop, och på ena sidan sitter en kuggstång.', 'På hisskorgen sitter motorer som driver var sitt kugghjul, ett drev.', 'Drevens kuggar griper i kuggstången. När dreven vrids klättrar korgen.', 'Ett varv med drevet flyttar korgen lika många kuggar som drevet har.', 'En säkerhetsbroms med eget drev går också i kuggstången. Den stoppar korgen om den går för fort.'],
  note: 'Schematisk kuggstångshiss, inte en bestämd Alimak-modell. Kuggstången själv är inte Alimaks uppfinning; det nya 1962 var en bygghiss som driver sig själv uppför sin mast. Årtalen kommer från Wikipedia och Alimak. Kameran åker med korgen.',
  build(g, api) {
    const N = 14, m = 2.2, r = m * N / 2, p = Math.PI * m, ra = r + m, rf = r - 1.25 * m, SEC = 22 * p;
    // the pinion profile
    const pin = new THREE.Shape();
    for (let k = 0; k < N; k++) {
      const c = k / N * Math.PI * 2, P = (a, rr) => [Math.cos(a) * rr, Math.sin(a) * rr];
      const pts = [P(c - Math.PI / N, rf), P(c - 0.15, rf), P(c - 0.065, ra), P(c + 0.065, ra), P(c + 0.15, rf)];
      pts.forEach(([x, y], i) => (k === 0 && i === 0 ? pin.moveTo(x, y) : pin.lineTo(x, y)));
    }
    pin.closePath(); const hole = new THREE.Path(); hole.absarc(0, 0, 3, 0, Math.PI * 2, true); pin.holes.push(hole);
    const pinG = new THREE.ExtrudeGeometry(pin, { depth: 5, bevelEnabled: false, curveSegments: 4 }).translate(0, 0, -2.5);
    const pinions = [0, -6 * p, -12 * p].map((y, i) => { const o = ink(pinG, { color: i === 2 ? 0xd9d8d1 : 0xffffff, s: 0.06, thr: 20 }); o.position.set(r, y, 0); g.add(o); return o; });
    // drive units behind the pinions: gearbox and motor; the brake is smaller
    for (const [y, big] of [[0, 1], [-6 * p, 1], [-12 * p, 0]]) {
      g.add(ink(new THREE.CylinderGeometry(3, 3, 8, 12).rotateX(Math.PI / 2).translate(r, y, -6.5), { color: 0x9a9b94, s: 0.04 }));
      g.add(ink(new THREE.BoxGeometry(big ? 26 : 18, big ? 26 : 16, 12).translate(r + 4, y, -16), { s: 0.1 }));
      if (big) g.add(ink(new THREE.CylinderGeometry(10, 10, 26, 20).rotateX(Math.PI / 2).translate(r + 4, y, -35), { s: 0.12, thr: 40 }));
    }
    g.add(ink(new THREE.BoxGeometry(12, 150, 8).translate(r + 22, -40, -20), { s: 0.1 }));
    // the car
    g.add(ink(new THREE.BoxGeometry(150, 230, 130).translate(r + 28 + 75, -15, -10), { mat: glass(0.16), s: 0.3 }));
    for (let i = 1; i < 6; i++) g.add(poly([V(r + 28 + i * 25, -130, 55), V(r + 28 + i * 25, 100, 55)], 0xc9c8c0));
    g.add(ink(new THREE.BoxGeometry(150, 6, 130).translate(r + 28 + 75, -128, -10), { s: 0.2 }));
    // the mast, one section, repeated; it slides down as the car climbs
    const mast = new THREE.Group(); g.add(mast);
    const sec = new THREE.Group(), xr = 0;
    const rack = new THREE.Shape(), ta = Math.tan(THREE.MathUtils.degToRad(20));
    rack.moveTo(xr - 9, 0);
    for (let j = 0; j < 22; j++) { const c = (j + 0.5) * p, hw0 = p / 4 + 1.25 * m * ta, hw1 = p / 4 - m * ta; rack.lineTo(xr - 1.25 * m, c - hw0); rack.lineTo(xr + m, c - hw1); rack.lineTo(xr + m, c + hw1); rack.lineTo(xr - 1.25 * m, c + hw0); }
    rack.lineTo(xr - 1.25 * m, SEC); rack.lineTo(xr - 9, SEC); rack.closePath();
    sec.add(ink(new THREE.ExtrudeGeometry(rack, { depth: 6, bevelEnabled: false }).translate(0, 0, -3), { color: 0xeeede7, s: 0.05, thr: 20 }));
    const tubes = [[-11.5, 20], [-11.5, -20], [-51.5, 20], [-51.5, -20]];
    for (const [x, z] of tubes) sec.add(ink(new THREE.CylinderGeometry(2.4, 2.4, SEC, 10).translate(x, SEC / 2, z), { s: 0.06, thr: 40 }));
    const brace = (a, b) => { const d = b.clone().sub(a); const c = ink(new THREE.CylinderGeometry(0.9, 0.9, d.length(), 6), { color: 0xf6f5f1, s: 0.03, thr: 40 }); c.position.copy(a).add(b).multiplyScalar(0.5); c.quaternion.setFromUnitVectors(V(0, 1, 0), d.normalize()); sec.add(c); };
    for (const [[x0, z0], [x1, z1]] of [[tubes[0], tubes[2]], [tubes[1], tubes[3]], [tubes[2], tubes[3]]]) for (let q = 0; q < 2; q++) brace(V(x0, q * SEC / 2, z0), V(x1, (q + 1) * SEC / 2, z1));
    sec.add(ink(new THREE.BoxGeometry(46, 2, 46).translate(-31.5, 1, 0), { color: 0xd9d8d1, s: 0.05 }));
    for (let k = -4; k <= 4; k++) { const c = sec.clone(); c.position.y = k * SEC; mast.add(c); }
    // the building going up beside it: a floor slab every 3 m
    const FL = 300, floors = new THREE.Group(); g.add(floors);
    for (let k = -3; k <= 3; k++) { floors.add(ink(new THREE.BoxGeometry(260, 22, 220).translate(r + 330, k * FL, -40), { s: 0.4 })); floors.add(ink(new THREE.BoxGeometry(14, FL - 22, 14).translate(r + 210, k * FL + FL / 2, 60), { color: 0xf6f5f1, s: 0.1 })); }
    const L = [label('Kuggstången', 'på masten', V(-4, 105, 3), g), label('Motorn', 'driver drevet', V(r + 4, 20, -35), g), label('Drevet', `${N} kuggar`, V(r + 8, 14, 3), g), null, label('Säkerhetsbroms', 'eget drev', V(r + 8, -12 * p + 12, 3), g)];
    label('Masten', '', V(-50, 150, 22), g, 'ghost'); label('Hisskorgen', '', V(r + 120, 110, 55), g, 'ghost'); label('Ny våning', 'var tredje meter', V(r + 330, 20, 70), g, 'ghost');
    const hot = hotLabels(L.concat([])), sl = slider(api, 'Fart', 0, 100, 45), rd = readout(api);
    const HMAX = 1500; let H = 0, dir = 1, pause = 0;
    return (t, dt) => {
      const s = Math.min(0.05, dt / 1000), v = +sl.inp.value * 1.4; sl.out.textContent = `${sl.inp.value} %`;
      if (pause > 0) pause -= s; else { H += dir * v * s; if (H > HMAX || H < 0) { H = clamp(H, 0, HMAX); dir = -dir; pause = 2; } }
      const th = H / r; pinions.forEach((o) => (o.rotation.z = th));
      mast.position.y = -(H % SEC); floors.position.y = -(H % FL);
      const st = Math.floor(t / 3.6) % 5; api.step(st); hot(st === 3 ? 2 : st);
      if (st === 1) L[2].element.classList.add('hot'); if (st === 2) L[0].element.classList.add('hot');
      rd.innerHTML = `Höjd <b>${fmt(H / 100, 1)} m</b> · ${pause > 0 ? 'stannar' : dir > 0 ? 'uppåt' : 'nedåt'} · drevet har gått <b>${fmt(H / (N * p), 1)} varv</b>, ${N} kuggar per varv`;
    };
  },
};

// ════════════════════════════════════════════════════════════════════════════════════════════
// ACE: from the architect's model in Framtiden out to the building it shows. The hop starts at the model and pulls back. Unit: 1 m.
SCENES.acehuset = {
  title: 'Från modellen till huset', kick: 'Ut · 10² m', unit: 1,
  view: { t: [0, 16, -60], d: 205, el: 0.3, az: 0.62, from: [0, 1.4, 0], d0: 5, dur: 7000 },
  lead: 'ACE Powerhouse är huset för Arctic Center of Energy, på Campus Skellefteå. Zooma ut från en arkitektmodell till huset i full skala.',
  steps: ['En arkitektmodell av huset, 1,5 m³.', 'Modellen visar ACE Powerhouse, huset för Arctic Center of Energy.', 'Zooma ut: från modellen till kvarteret runt huset.', 'Huset står på Campus Skellefteå.', 'Huset i full skala: sju våningar i trä. Utvändigt står det klart, och invändigt blir det klart 2027. Människan bredvid visar storleken.'],
  note: 'Huset är ritat ur CAD-underlaget i SE26:s Unreal-projekt, förenklat från 1,8 miljoner till 45 000 trianglar. Utvändigt står huset klart (Lukas, 30 okt 2026). Byggstart 2024 och helt klart 2027 enligt SE26:s projektsida. I stadsvyn står det på sin tomt på Campus Skellefteå.',
  build(g, api) {
    // the whole building from the CAD data in the SE26 Unreal project (SM_ACE_Building_Original, remeshed to 40 000 triangles)
    const W = 46, D = 44, HB = 34, S = Math.cbrt(1.5), k = S / W, PL = 0.75, B = V(0, 0, -95);
    const model = new THREE.Group(), big = new THREE.Group(); model.position.y = PL; model.scale.setScalar(k); big.position.copy(B); g.add(model, big);
    loadMesh('ace_hus').then((geo) => { for (const grp of [model, big]) grp.add(ink(geo, { mat: lam(0xffffff), s: 0.12, thr: 24 })); });
    g.add(ink(new THREE.BoxGeometry(S + 0.1, PL, D * k + 0.1).translate(0, PL / 2, 0), { color: 0xf6f5f1, s: 0.02 }));
    // the screen in the model's front: an interior in a perspective that follows the head (as on js/media.js's ACE screen)
    const scr = canvasTex(320, 128), scrM = new THREE.Mesh(new THREE.PlaneGeometry(S * 0.7, S * 0.22), basic(0xffffff, { map: scr.t }));
    scrM.position.set(0, PL + S * 0.15, D * k / 2 + 0.02); g.add(scrM);
    // the visitor and the depth camera
    const vis = figure({ h: 1.7, arms: true, coat: 2 }); vis.rotation.y = Math.PI; g.add(vis);   // facing the model
    vis.userData.arms.forEach((a) => (a.rotation.x = -0.7));   // hands on the model
    const camBox = ink(new THREE.BoxGeometry(0.1, 0.05, 0.04).translate(0, PL + HB * k + 0.03, D * k / 2 - 0.05), { color: 0x5c5d57, s: 0.003 }); g.add(camBox);
    const sight = poly([V(0, 1.58, 1.4), V(0, PL + S * 0.15, D * k / 2)], LIME_D, { dashed: true, dash: 0.05, gap: 0.05 }); g.add(sight);
    // a scale figure next to the big building
    const man = figure({ h: 1.8, coat: 0 });
    man.position.set(W / 2 + 4, 0, B.z + D / 2 + 3); g.add(man);
    // the competence cube and the yellow pulse
    const cubeM = lam(0xffffff), cube = ink(new THREE.BoxGeometry(0.5, 0.5, 0.5), { mat: cubeM, s: 0.004 }); cube.position.set(-2.4, 3.1, -0.6); g.add(cube);
    const pulse = new THREE.Mesh(new THREE.SphereGeometry(0.09, 12, 8), basic(YELLOW)); g.add(pulse);
    const pPath = new THREE.QuadraticBezierCurve3(V(0, PL + HB * k + 0.1, 0), V(-1.2, 3.8, 0), cube.position.clone());
    // ground: the room around the model, and faint rings outward
    g.add(poly([V(-3, 0, -3), V(3, 0, -3), V(3, 0, 3), V(-3, 0, 3)], 0x9a9b94, { loop: true }));
    for (const rr of [12, 40, 90, 160]) { const c = ring('y', 96); c.scale.setScalar(rr); c.material.color.set(0xc9c8c0); g.add(c); }
    for (const [x0, z0, x1, z1] of [[-0.5, 0.5, -0.5, 0.5], [0.5, 0.5, 0.5, 0.5], [-0.5, -0.5, -0.5, -0.5], [0.5, -0.5, 0.5, -0.5]]) g.add(poly([V(x0 * W * k, PL, z0 * D * k), B.clone().add(V(x1 * W, 0, z1 * D))], 0xd2d1ca, { dashed: true, dash: 1.2, gap: 1.2 }));
    const L = [label('Arkitektmodellen', '1,5 m³', V(-0.55, PL + HB * k + 0.05, D * k / 2), g), label('Djupkameran', '', V(0.05, PL + HB * k + 0.08, D * k / 2), g, 'ghost'), label('Kompetenskuben', 'gul puls', V(-2.4, 3.45, -0.6), g), label('ACE Powerhouse', 'Campus Skellefteå', V(-W * 0.3, HB + 2, B.z), g, 'big')];
    label('Besökaren', '', V(0.2, 1.75, 1.4), vis, 'topic'); label('Framtiden', 'rum 4', V(2.6, 0, 2.8), g, 'ghost'); label('1,8 m', '', V(man.position.x, 2.1, man.position.z), g, 'topic');
    L[3].element.dataset.pri = 2;
    const rd = readout(api), hot = hotLabels(L);
    let pulses = 0;
    // the visitor, the depth camera and the pulse to the competence cube are the ACE installation: only in its story
    const own = [vis, sight, camBox, cube, pulse, L[1], L[2]];
    return (t) => {
      const isAce = api.inst === 'ace';
      for (const o of own) o.visible = isAce;
      const hx = Math.sin(t * 0.45) * 0.4; vis.position.set(hx, 0, 1.4);
      sight.geometry.attributes.position.setXYZ(0, hx, 1.58, 1.4); sight.geometry.attributes.position.needsUpdate = true; sight.computeLineDistances();
      // the interior on the screen, as seen from the head
      const { g: x, c } = scr, W = c.width, H = c.height, vx = W / 2 - hx * 260, vy = H / 2;
      x.fillStyle = '#f0efe9'; x.fillRect(0, 0, W, H); x.strokeStyle = '#0a0b09'; x.lineWidth = 2;
      const k = 0.4, inr = [[vx - W * k / 2, vy - H * k / 2], [vx + W * k / 2, vy - H * k / 2], [vx + W * k / 2, vy + H * k / 2], [vx - W * k / 2, vy + H * k / 2]], out = [[0, 0], [W, 0], [W, H], [0, H]];
      x.beginPath(); inr.forEach(([a, b], i) => (i ? x.lineTo(a, b) : x.moveTo(a, b))); x.closePath(); x.stroke();
      for (let i = 0; i < 4; i++) { x.beginPath(); x.moveTo(...out[i]); x.lineTo(...inr[i]); x.stroke(); }
      x.lineWidth = 1; x.strokeStyle = '#8d8e87'; for (let f = 1; f < 4; f++) { const y = H * f / 4, yi = inr[0][1] + (inr[3][1] - inr[0][1]) * f / 4; x.beginPath(); x.moveTo(0, y); x.lineTo(inr[0][0], yi); x.moveTo(W, y); x.lineTo(inr[1][0], yi); x.stroke(); }
      scr.t.needsUpdate = true;
      // a look: every 6 s the visitor looks in and a yellow pulse flies to the competence cube
      const per = 6, kp = t % per, fly = clamp((kp - 2.5) / 1.4, 0, 1);
      pulse.visible = isAce && kp > 2.5 && kp < 3.9; pPath.getPoint(ease(fly), pulse.position);
      const glow = kp > 3.9 ? Math.max(0, 1 - (kp - 3.9) / 1.6) : 0; cubeM.color.set(0xffffff).lerp(new THREE.Color(YELLOW), glow);
      if (kp > 3.9 && kp < 3.9 + 0.05) pulses = Math.floor(t / per) + 1;
      const st = t < 2.5 ? 0 : t < 5 ? 1 : t < 7.5 ? 2 : t < 10.5 ? 3 : (kp > 2.3 && kp < 5.4 ? 2 : 4);
      api.step(st); hot(st === 4 ? 3 : st);
      rd.innerHTML = !isAce ? 'Sju våningar i trä · utvändigt klart · invändigt klart 2027' : `Blickar hittills: <b>${Math.floor((t + per - 3.9) / per)}</b> · varje puls går som MQTT till tnt, och kompetenskuben lyser gult`;
    };
  },
};

// ════════════════════════════════════════════════════════════════════════════════════════════
// The MQTT message, byte by byte, and its way from the button to the computers that listen. Unit: 1 m (the network is drawn as a diagram).
const TOPIC = 'pushbutton1', PAYLOAD = '{"pressed": true}';
const BYTES = [0x30, 2 + TOPIC.length + PAYLOAD.length, 0, TOPIC.length, ...[...TOPIC].map((ch) => ch.charCodeAt(0)), ...[...PAYLOAD].map((ch) => ch.charCodeAt(0))];
const GROUPS = [[0, 1, 'Fast huvud', 'typ och längd'], [2, 3, 'Ämnets längd', '11 tecken'], [4, 14, 'Ämne', TOPIC], [15, BYTES.length - 1, 'Innehåll', PAYLOAD]];
SCENES.mqtt = {
  title: 'Meddelandet byte för byte', kick: 'Makro · 10¹ m', unit: 1,
  view: { t: [1.5, 0, 0], d: 86, el: 0.12, az: 0.08 },
  lead: 'Sensorerna i utställningen pratar med korta MQTT-meddelanden. Här är ett av dem, byte för byte: ett tryck på JA-knappen, 32 byte.',
  steps: ['Fast huvud: första byten säger att det är ett meddelande som publiceras (typ 3). Andra byten säger hur många byte som följer: 30.', 'Ämnet: två byte med längden 11, och sedan bokstäverna pushbutton1.', 'Innehållet: {"pressed": true}, 17 tecken. Totalt 32 byte.', 'ESP32:an skickar meddelandet över wifi till nätverket och vidare till tnt, där brokern mosquitto tar emot det.', 'Brokern skickar en kopia till alla som prenumererar på ämnet. Webbtvillingen är en av dem: den lyssnar bara och skickar aldrig något.'],
  note: 'Knappens kod finns inte i våra källor, så att den skickar med QoS 0 och utan sparflagga är antaget (k). Vilka datorer som prenumererar är härlett från signalvägen knapp → switchboard → rpi6. Runt meddelandet lägger wifi och TCP/IP till egna byte.',
  build(g, api) {
    const n = BYTES.length, TW = 2.15, X0 = -7.5 * TW, YS = 11;
    const grpOf = (i) => GROUPS.findIndex(([a, b]) => i >= a && i <= b);
    const hex = (b) => b.toString(16).toUpperCase().padStart(2, '0');
    // the byte tiles, in two rows of 16 like a hex dump: hex big, the character small under it
    const tiles = BYTES.map((b, i) => {
      const grp = new THREE.Group(), mat = lam(0xffffff); grp.add(ink(new THREE.BoxGeometry(1.95, 1.95, 0.3), { mat, s: 0.01 }));
      const { g: x, t } = canvasTex(128, 128); x.fillStyle = '#ffffff'; x.fillRect(0, 0, 128, 128);
      x.fillStyle = '#0a0b09'; x.font = '600 56px IBM Plex Mono, monospace'; x.textAlign = 'center'; x.fillText(hex(b), 64, 64);
      x.fillStyle = '#77786f'; x.font = '500 32px IBM Plex Mono, monospace'; x.fillText(i >= 4 ? String.fromCharCode(b).replace(' ', '␣') : ['typ 3', '= 30', '', '= 11'][i], 64, 108);
      const face = new THREE.Mesh(new THREE.PlaneGeometry(1.7, 1.7), basic(0xffffff, { map: t })); face.position.z = 0.16; grp.add(face);
      const home = V(X0 + (i % 16) * TW, YS - Math.floor(i / 16) * 2.5, 0); grp.position.copy(home); g.add(grp);
      return { grp, mat, face, home };
    });
    const brackets = GROUPS.map(([a, , nm, sub], k) => { const lb = label(nm, sub, tiles[a].home.clone().add(V(-0.95, 1.05, 0)), g, 'ghost'); lb.element.style.setProperty('--stalk', '8px'); lb.element.dataset.pri = 1; return { lb }; });
    // the network: button node → wifi → tnt (broker) → the computers that subscribe
    const P = { esp: V(-17, -8, 0), ap: V(-8, -8, 0), tnt: V(2, -8, 0), sw: V(2, -2.5, 0), rpi: V(14, -4, 0), twin: V(14, -12.5, 0) };
    const box = (p, w, h, d, color = 0xffffff) => { const o = ink(new THREE.BoxGeometry(w, h, d), { color, s: 0.02 }); o.position.copy(p); g.add(o); return o; };
    box(P.esp, 3.2, 0.4, 2); box(P.esp.clone().add(V(0.4, 0.35, 0)), 1.3, 0.3, 1.1, 0xd9d8d1);
    g.add(poly([V(P.esp.x + 1.4, P.esp.y + 0.2, 0), V(P.esp.x + 1.4, P.esp.y + 1.6, 0), V(P.esp.x + 1.8, P.esp.y + 1.4, 0)], C.ink));
    box(P.ap, 2.6, 0.9, 1.8); for (const dx of [-0.8, 0.8]) g.add(poly([V(P.ap.x + dx, P.ap.y + 0.4, 0), V(P.ap.x + dx * 1.4, P.ap.y + 2.2, 0)], C.ink));
    box(P.tnt, 3.2, 0.7, 2.2); box(P.tnt.clone().add(V(0.6, 0.45, 0)), 1, 0.25, 1, 0xd9d8d1);
    box(P.sw, 2.2, 0.5, 1.2, 0xf6f5f1); box(P.rpi, 3, 0.6, 2);
    box(P.twin.clone().add(V(0, -0.5, 0)), 3.6, 0.2, 2.4); const scrn = box(P.twin.clone().add(V(0, 0.9, -1.1)), 3.6, 2.4, 0.15);
    const SPLIT = 8;
    g.add(poly([P.ap, P.tnt], C.ink), poly([P.tnt, P.sw], 0x9a9b94), poly([P.tnt, V(SPLIT, P.tnt.y, 0), V(SPLIT, P.rpi.y, 0), P.rpi], 0x9a9b94), poly([V(SPLIT, P.tnt.y, 0), V(SPLIT, P.twin.y, 0), P.twin], 0x9a9b94, { dashed: true, dash: 0.6, gap: 0.4 }));
    const L = [label('ESP32', 'knappen pushbutton1', P.esp.clone().add(V(-1.6, 0.6, 0)), g), label('Wifi', 'till nätverket', P.ap.clone().add(V(-1, 2.4, 0)), g, 'ghost'), label('tnt', 'brokern mosquitto', P.tnt.clone().add(V(-1.4, 0.9, 0)), g), label('switchboard', 'program på tnt', P.sw.clone().add(V(-1, 0.4, 0)), g, 'ghost'), label('rpi6', 'spelar tonen', P.rpi.clone().add(V(-1.4, 0.6, 0)), g), label('Webbtvillingen', 'lyssnar bara', P.twin.clone().add(V(-1.8, 2.3, -1.1)), g)];
    L[2].element.dataset.pri = 2; L[5].element.dataset.pri = 2;
    // the packet, the wifi rings and the copies
    const pk = new THREE.Mesh(new THREE.BoxGeometry(1.3, 0.8, 0.8), basic(C.lime)); g.add(pk);
    const copies = [P.sw, P.rpi, P.twin].map(() => { const m = new THREE.Mesh(new THREE.BoxGeometry(1, 0.6, 0.6), basic(C.lime)); g.add(m); return m; });
    const cPaths = [track([P.tnt, P.sw]), track([P.tnt, V(SPLIT, P.tnt.y, 0), V(SPLIT, P.rpi.y, 0), P.rpi]), track([P.tnt, V(SPLIT, P.tnt.y, 0), V(SPLIT, P.twin.y, 0), P.twin])];
    const wf = Array.from({ length: 4 }, () => { const r = ring('z', 48); g.add(r); return r; });
    const scrM = scrn.userData.mesh?.material || null;
    const tc = canvas(api, 300, 74), rd = readout(api), hot = hotLabels(L);
    const per = 21, DT = 0.28, tmp = V(0, 0, 0);
    const explain = (i) => i === 0 ? '0x30 = 0011 0000: typ 3, publicera · QoS 0, inte sparat' : i === 1 ? '0x1E = 30: så många byte kommer efter' : i < 4 ? '00 0B = 11: ämnet är 11 tecken långt' : i < 15 ? `'${String.fromCharCode(BYTES[i])}' = 0x${hex(BYTES[i])}: en bokstav i ämnet` : `'${String.fromCharCode(BYTES[i])}' = 0x${hex(BYTES[i])}: ett tecken i innehållet`;
    return (t) => {
      g.scale.setScalar(innerWidth < innerHeight ? 0.72 : 1);   // portrait phones: the diagram is wide
      const k = t % per, shown = Math.min(n, Math.floor(k / DT) + 1), cur = shown - 1;
      const gi = k < n * DT ? grpOf(cur) : -1;
      const col = sstep(k, 10.2, 11.8);   // the strip folds into one packet at the ESP32
      tiles.forEach((o, i) => {
        o.grp.visible = i < shown && col < 1;
        const pop = clamp((k - i * DT) / 0.25, 0, 1);
        o.grp.position.lerpVectors(o.home, P.esp, ease(col)); o.grp.scale.setScalar(Math.max(0.001, (0.7 + 0.3 * pop) * (1 - col * 0.85)));
        o.mat.color.set(i === cur && k < n * DT + 0.4 ? C.lime : grpOf(i) === gi ? 0xeefbb0 : 0xffffff);
      });
      brackets.forEach((b, j) => { b.lb.element.classList.toggle('hot', j === gi); b.lb.visible = col < 0.5 && GROUPS[j][0] < shown; });
      // the trip: esp → ap (wifi), ap → tnt (cable), then copies
      const a1 = clamp((k - 12) / 2, 0, 1), a2 = clamp((k - 14) / 1.5, 0, 1), a3 = clamp((k - 15.8) / 2.2, 0, 1);
      pk.visible = k > 11.8 && k < 15.6;
      if (k < 14) pk.position.lerpVectors(P.esp, P.ap, ease(a1)).add(V(0, 1.2 * Math.sin(a1 * Math.PI), 0)); else pk.position.lerpVectors(P.ap, P.tnt, ease(a2));
      wf.forEach((r, i) => { const age = (k - 12 - i * 0.45); r.visible = age > 0 && age < 1.8 && k < 14.5; r.position.copy(P.esp).add(V(1.4, 1.6, 0)); r.scale.setScalar(0.4 + age * 3); r.material.opacity = 1 - age / 1.8; r.material.color.set(GREY); });
      copies.forEach((m, i) => { m.visible = k > 15.6 && k < 19.6; cPaths[i].at(ease(a3), m.position); m.position.z += 0.4; });
      if (scrM) scrM.color.set(k > 18 && k < 19.6 ? C.lime : 0xffffff);
      const st = k < n * DT ? (cur < 2 ? 0 : cur < 15 ? 1 : 2) : k < 11.8 ? 2 : k < 15.6 ? 3 : 4;
      api.step(st); hot(k < 11.8 ? 0 : k < 14 ? 1 : k < 15.6 ? 2 : k < 19.6 ? 5 : -1);
      rd.innerHTML = k < n * DT ? `Byte <b>${cur + 1}</b> av ${n} · ${explain(cur)}` : k < 11.8 ? `Klart: <b>${n} byte</b>. ESP32:an skickar.` : k < 15.6 ? `<b>${n} byte</b> på väg till brokern` : 'Kopior till dem som prenumererar · webbtvillingen <b>lyssnar bara</b>';
      // hex dump, two rows of 16
      const { g: x, w, h } = tc; x.clearRect(0, 0, w, h); x.font = '600 10px IBM Plex Mono, monospace';
      const cw = (w - 8) / 16;
      for (let i = 0; i < n; i++) {
        const cx = 4 + (i % 16) * cw, cy = 8 + Math.floor(i / 16) * 30, on = i < shown || k >= n * DT;
        if (on && grpOf(i) === gi) { x.fillStyle = '#cafe03'; x.fillRect(cx - 1, cy - 1, cw - 1, 26); }
        x.fillStyle = on ? '#0a0b09' : '#d6d5ce'; x.fillText(hex(BYTES[i]), cx + 1, cy + 10);
        x.fillStyle = on ? '#8d8e87' : '#e4e3dc'; x.fillText(i >= 4 ? String.fromCharCode(BYTES[i]).replace(' ', '␣') : '·', cx + 4, cy + 22);
      }
    };
  },
};

// ── which cards get which hops ──
hop('skykraft', { scene: 'jetmotor', dir: 'in', label: 'Jetmotorn i genomskärning' });
hop('skykraft', { scene: 'esaf', dir: 'in', label: 'Från koldioxid till flygbränsle' });
hop('elbil', { scene: 'battericell', dir: 'in', label: 'Batteriet när mobilen laddar' });
hop('sag-ja', { scene: 'blomstertid', dir: 'in', label: 'Noterna och ljudet' });
hop('sag-ja', { scene: 'mqtt', dir: 'in', label: 'Meddelandet byte för byte' });
hop('dokumentaren', { scene: 'tidslinje', dir: 'ut', label: 'Tidslinjen, ett sekel' });
hop('alimak', { scene: 'kuggstang', dir: 'in', label: 'Kuggstången och drevet' });
hop('ace', { scene: 'acehuset', dir: 'ut', label: 'Från modellen till huset' });
