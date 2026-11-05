// Scale scenes, track E10: nature's micro scale (Skogen chlorophyll, Växthuset chloroplast, Lungan alveoli, Orostunneln UV and fluorescence).
// Same pattern as js/scales.js: add scenes to SCENES and the cards' buttons to HOPS (append, never replace a card's list).
import * as THREE from 'three';
import { mergeGeometries } from 'three/addons/BufferGeometryUtils.js';
import { SCENES, HOPS, V, INK, LIME, ease, fmt, ink, label, poly, ring, canvas, readout } from '../scales.js';
import { C, lam, boil, LINE_MAT, bline, bdash } from '../world.js';

const hop = (card, h) => (HOPS[card] ||= []).push(h);

// ── shared helpers ──
const clamp = THREE.MathUtils.clamp;
const rng = (s) => () => (s = (s * 16807) % 2147483647) / 2147483647;
const smooth = (x, a, b) => { const k = clamp((x - a) / (b - a), 0, 1); return k * k * (3 - 2 * k); };
const basic = (color, o = {}) => new THREE.MeshBasicMaterial({ color, ...o });
const ghost = (op = 0.3) => lam(0xffffff, { transparent: true, opacity: op, depthWrite: false });
const LIME_D = 0x8fb300;   // lime that still reads as a thin line on white
const sec = (dt) => Math.min(0.1, (dt || 16) / 1000);

// a lumpy low-poly blob: cells, organelles, proteins. Wobble depends on the unit position, so the facets stay closed.
function blob(rx, ry, rz, seed = 1, detail = 1, wob = 0.07) {
  const geo = new THREE.IcosahedronGeometry(1, detail), p = geo.attributes.position, v = V(0, 0, 0);
  for (let i = 0; i < p.count; i++) {
    v.fromBufferAttribute(p, i);
    const n = 1 + wob * (Math.sin(v.x * 2.3 + seed) * Math.cos(v.y * 1.9 + seed * 1.7) + 0.6 * Math.sin(v.z * 2.9 + seed * 0.7));
    p.setXYZ(i, v.x * rx * n, v.y * ry * n, v.z * rz * n);
  }
  geo.computeVertexNormals();
  return geo;
}
// many closed outlines as one LineSegments
function loops(list, color = C.ink, opacity = 1) {
  const a = [];
  for (const pts of list) for (let i = 0; i < pts.length; i++) { const p = pts[i], q = pts[(i + 1) % pts.length]; a.push(p.x, p.y, p.z, q.x, q.y, q.z); }
  const geo = new THREE.BufferGeometry(); geo.setAttribute('position', new THREE.Float32BufferAttribute(a, 3));
  return new THREE.LineSegments(geo, bline({ color, transparent: true, opacity }));
}
const ellipse = (cx, cy, rx, ry, z = 0, n = 28, wob = 0, sd = 0) => Array.from({ length: n }, (_, i) => { const a = i / n * Math.PI * 2, w = 1 + wob * Math.sin(a * 3 + sd); return V(cx + Math.cos(a) * rx * w, cy + Math.sin(a) * ry * w, z); });
// lots of small identical things (dots, lipid heads, ribosomes) as one instanced mesh; scales with its group, unlike Points
function scatter(list, r, mat, geo = new THREE.IcosahedronGeometry(1, 0)) {
  const m = new THREE.InstancedMesh(geo, mat, list.length), o = new THREE.Object3D();
  list.forEach((p, i) => { o.position.copy(p); o.scale.setScalar(r); o.updateMatrix(); m.setMatrixAt(i, o.matrix); });
  m.frustumCulled = false;
  return m;
}
// a light wave as a short packet travelling along `dir`, head first. lam = wavelength in display units.
function wave(parent, color, o = {}) {
  const N = 64, l = poly(Array.from({ length: N }, () => V(0, 0, 0)), color, o);
  l.userData.nofade = true; l.frustumCulled = false; l.visible = false; parent.add(l);
  const pos = l.geometry.attributes.position, side = V(0, 0, 0), P = V(0, 0, 0), Z = V(0, 0, 1), X = V(1, 0, 0);
  return {
    l,
    set(p, dir, lam, alpha = 1, { n = 3, ph = 0, floor = null } = {}) {
      l.visible = alpha > 0.01; if (!l.visible) return;
      side.crossVectors(dir, Math.abs(dir.z) > 0.9 ? X : Z).normalize();
      const len = lam * n, amp = lam * 0.3;
      for (let i = 0; i < N; i++) {
        const u = i / (N - 1), s = -u * len, env = Math.sin(Math.PI * Math.min(1, u * 1.15)) ** 0.7;
        P.copy(p).addScaledVector(dir, s).addScaledVector(side, Math.sin((s / lam) * Math.PI * 2 + ph) * amp * env);
        if (floor !== null && P.y < floor) P.y = 2 * floor - P.y;   // a packet that bounces off a surface folds back up
        pos.setXYZ(i, P.x, P.y, P.z);
      }
      pos.needsUpdate = true; l.material.opacity = alpha;
      if (o.dashed) l.computeLineDistances();
    },
  };
}
// sunlight falling straight down onto a surface, drawn as short streaks: at these scales a light wave is too small to draw
function streaks(parent, targets, top, len, speed) {
  const n = targets.length, pos = new Float32Array(n * 6), geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.BufferAttribute(pos, 3));
  const l = new THREE.LineSegments(geo, bline({ color: LIME_D, transparent: true })); l.frustumCulled = false; parent.add(l);
  const last = new Array(n).fill(0), ph = targets.map((_, i) => (i * 0.618 + 0.13 + Math.sin(i * 7.3) * 0.13) % 1);
  return (t) => {   // returns the streaks that just landed
    const hits = [];
    targets.forEach((p, i) => {
      const H = top - p.y, k = ((t * speed) / H + ph[i]) % 1, y = top - k * H;
      if (k < last[i]) hits.push(i);
      last[i] = k;
      pos.set([p.x, Math.min(top, y + len), p.z, p.x, y, p.z], i * 6);
    });
    geo.attributes.position.needsUpdate = true;
    return hits;
  };
}
// fade a whole level in and out. Its sketch lines get their own copy of the shared ink material (that one is the world's).
function fader(root) {
  const lineMat = boil(new THREE.LineBasicMaterial({ vertexColors: true, transparent: true })), mats = new Map();
  root.traverse((o) => {
    if (!o.material || o.userData.nofade) return;
    if (o.material === LINE_MAT) { o.material = lineMat; return; }
    if (!mats.has(o.material)) mats.set(o.material, { op: o.material.opacity, tr: o.material.transparent });
  });
  let last = -1;
  return (f) => {
    root.visible = f > 0.004;
    if (Math.abs(f - last) < 0.002) return;
    last = f; lineMat.opacity = f;
    for (const [m, b] of mats) {
      m.opacity = b.op * f;
      const tr = b.tr || f < 0.995;
      if (m.transparent !== tr) { m.transparent = tr; m.needsUpdate = true; }
    }
  };
}
// One continuous zoom through nested levels inside one scene. Each level is modelled in its own units around its own
// origin and sits at `at` inside its parent, `k` times the parent's unit. The group is scaled so the level in view is
// at its native size, and the scene's `unit` follows along, so the scale bar stays true all the way down.
function zoomer(g, def, u0, levels) {
  const N = levels.length;
  let O = V(0, 0, 0), S = 1;
  levels.forEach((lv, i) => {
    if (i) { O = O.clone().addScaledVector(lv.at, S); S *= lv.k; }
    lv.O = O; lv.S = S; lv.f = 1;
    lv.grp.position.copy(O); lv.grp.scale.setScalar(S); g.add(lv.grp);
    lv.fade = fader(lv.grp);
  });
  levels.forEach((lv, i) => { if (lv.stub) { levels[i - 1].grp.add(lv.stub); lv.stubFade = fader(lv.stub); } });
  const Q = V(0, 0, 0), Cc = V(0, 0, 0), tmp = V(0, 0, 0);
  return (z) => {
    z = clamp(z, 0, N - 1);
    const j = Math.min(N - 2, Math.floor(z)), f = z - j, a = levels[j], b = levels[j + 1], k = b.S / a.S;
    const s = a.S * Math.pow(k, f);
    // a true zoom about one fixed point, which starts centred on this level and ends centred on the next
    Q.copy(b.O).addScaledVector(a.O, -k).divideScalar(1 - k);
    Cc.copy(Q).addScaledVector(tmp.copy(Q).sub(a.O), -s / a.S);
    g.scale.setScalar(1 / s); g.position.copy(Cc).multiplyScalar(-1 / s);
    def.unit = u0 * s;
    levels.forEach((lv, i) => {
      const m = Math.log10(lv.S / s), o = lv.out || [0.5, 0.9];   // how many powers of ten this level is from its native size
      const inn = i ? smooth(m, -1.3, -0.7) : 1, out = i < N - 1 ? 1 - smooth(m, o[0], o[1]) : 1;
      lv.f = inn * out; lv.fade(lv.f);
      lv.stubFade?.(levels[i - 1].f * (1 - inn));
      lv.tags.visible = m > -0.3 && m < 0.35;
    });
    return s;
  };
}
// the automatic tour: rest at each level, zoom slowly to the next, and at the end glide back out
function tour(t, dw, zm, back) {
  const N = dw.length;
  let T = back + 2;
  for (let i = 0; i < N; i++) T += dw[i] + (i < N - 1 ? zm[i] : 0);
  let u = t % T;
  for (let i = 0; i < N; i++) {
    if (u < dw[i]) return { z: i, at: i, k: u / dw[i] };
    u -= dw[i];
    if (i < N - 1) { if (u < zm[i]) return { z: i + ease(u / zm[i]), at: -1, k: 0 }; u -= zm[i]; }
  }
  if (u < back) return { z: (N - 1) * (1 - ease(u / back)), at: -1, k: 0 };
  return { z: 0, at: 0, k: 0 };
}
// a range input in the live panel; once touched it stays in the visitor's hands
function slider(api, name, min, max, val) {
  const sl = document.createElement('label'); sl.className = 'sc-ctl';
  sl.innerHTML = `${name} <input type="range" min="${min}" max="${max}" value="${val}"> <output></output>`;
  api.live.append(sl);
  const inp = sl.querySelector('input'), out = sl.querySelector('output'), st = { inp, out, touched: false };
  inp.oninput = () => (st.touched = true);
  return st;
}

// ── a chloroplast cut open, in units of 0.1 µm: shared by the chlorophyll zoom and the photosynthesis scene ──
function chloroplast(grp, R, { right = true, starch = V(12, -6, -10) } = {}) {
  grp.add(ink(new THREE.SphereGeometry(1, 44, 20, Math.PI, Math.PI).scale(30, 13, 20), { mat: lam(0xffffff, { side: THREE.DoubleSide }), s: 0.12, thr: 40 }));
  grp.add(loops([ellipse(0, 0, 28.6, 11.9, 0, 72)], C.ink, 0.7));   // the inner of the two envelope membranes
  const spots = [[-20, -1, -7, 9], [-12, 3, -11, 11], [-11, -5, -4, 8], [-3, 1, -9, 12], [4, -5, -12, 9], [5, 5, -6, 7], [17, 4, -8, 7], [20, -3, -5, 6]];
  const grana = spots.filter(([x]) => right || x < 10).map(([x, y, z, n]) => {
    const geos = [];
    for (let k = 0; k < n; k++) geos.push(new THREE.CylinderGeometry(2.6, 2.6, 0.42, 22).translate(0, (k - (n - 1) / 2) * 0.62, 0));
    const mat = lam(0xe2e1db), o = ink(mergeGeometries(geos), { mat, s: 0.03, thr: 30 });
    o.position.set(x, y, z); grp.add(o);
    return { o, mat, x, y, z, top: V(x, y + (n - 1) / 2 * 0.62 + 0.21, z), hot: 0 };
  });
  // stroma lamellae: thin membranes joining the stacks
  const lam2 = [], by = [...grana].sort((a, b) => a.x - b.x);
  for (let i = 0; i < by.length - 1; i++) {
    const a = by[i], b = by[i + 1];
    for (const dy of [-1.2, 1.0]) lam2.push([V(a.x + 2.6, a.y + dy, a.z), V((a.x + b.x) / 2, (a.y + b.y) / 2 + dy * 1.6, (a.z + b.z) / 2), V(b.x - 2.6, b.y + dy * 0.6, b.z)]);
  }
  for (const p of lam2) grp.add(poly(p, 0x8f8e86));
  const st = ink(blob(4, 2.4, 3, 7, 1, 0.06), { s: 0.04, thr: 22 }); st.position.copy(starch); grp.add(st);
  // ribosomes and the chloroplast's own DNA: small specks in the stroma
  const specks = [];
  for (let i = 0; i < 90; i++) {
    const p = V((R() - 0.5) * 52, (R() - 0.5) * 21, -R() * 17);
    if ((p.x / 28) ** 2 + (p.y / 12) ** 2 + (p.z / 19) ** 2 < 0.85) specks.push(p);
  }
  grp.add(scatter(specks, 0.28, basic(0xa6a89e, { transparent: true })));
  return { grana, starch: st };
}

// ═════════════ Skogen: from a pine needle to the chlorophyll that catches the light ═════════════
// Four levels in one continuous zoom: needle (1 unit = 20 µm), cell (1 µm), chloroplast (0.1 µm), thylakoid membrane (1 nm).
SCENES.klorofyll = {
  title: 'Från barr till klorofyll', kick: 'Mikro · 10⁻⁶ m', unit: 2e-5,
  view: { t: [0, 2, 0], d: 172, el: 0.34, az: 0.42 },
  lead: 'Tallens blad är barren, och där fångar klorofyllet solens energi. Följ ljuset från ett barr in till molekylerna.',
  steps: [
    'Ett tallbarr är ett smalt blad, knappt två millimeter brett. I genomskärning är det fullt av celler.',
    'I varje cell finns många kloroplaster, små gröna korn längs cellväggen. Det är där ljuset fångas.',
    'Inne i kloroplasten ligger tunna hinnor i staplar. Klorofyllet sitter i hinnorna.',
    'Klorofyllet tar bäst upp blått och rött ljus. Grönt tas upp sämst och studsar oftare tillbaka. Därför ser barren gröna ut.',
    'Energin hoppar från molekyl till molekyl in till ett reaktionscentrum. Där skickas en elektron vidare, och fotosyntesen är igång.',
  ],
  note: 'Ett enda hopp genom fyra skalor; skalstocken följer med. Kloroplasterna är ritade grå och det fångade ljuset gulgrönt. Ljusvågorna längst in är ritade mycket kortare än de är.',
  build(g, api) {
    const def = SCENES.klorofyll, R = rng(11);

    // ── L0: a piece of a pine needle, cut across. 1 unit = 20 µm ──
    const L0 = new THREE.Group(), T0 = new THREE.Group(); L0.add(T0);
    const A = 40, B = 25, Y0 = -12, LEN = 36;
    const halfE = (d, n = 48) => Array.from({ length: n + 1 }, (_, i) => { const a = i / n * Math.PI; return V(Math.cos(a) * (A - d), Y0 + d + Math.sin(a) * (B - 2 * d), 0.06); });
    const inE = (x, y, d) => y > Y0 + d && (x / (A - d)) ** 2 + ((y - Y0 - d) / (B - 2 * d)) ** 2 < 1;
    const shape = new THREE.Shape(halfE(0).map((p) => new THREE.Vector2(p.x, p.y)));
    L0.add(ink(new THREE.ExtrudeGeometry(shape, { depth: LEN, bevelEnabled: false }).translate(0, 0, -LEN), { s: 0.35, thr: 30 }));
    const face = [halfE(2.2), ellipse(0, -1.5, 15, 7.5, 0.06, 48), ellipse(-5.6, -1.5, 3.6, 3.3, 0.06, 20), ellipse(5.6, -1.5, 3.6, 3.3, 0.06, 20)];
    const ducts = [0.32, 0.86, 1.4, 1.95, 2.5, 2.84].map((a) => V(Math.cos(a) * (A - 4.6), Y0 + 4.6 + Math.sin(a) * (B - 9.2), 0.06));
    for (const d of ducts) face.push(ellipse(d.x, d.y, 1.4, 1.4, 0.06, 14), ellipse(d.x, d.y, 0.7, 0.7, 0.06, 10));
    const cells = [];
    for (let row = 0; row < 22; row++) for (let col = -16; col <= 16; col++) {
      const x = col * 2.9 + (row % 2) * 1.45 + (R() - 0.5) * 0.6, y = Y0 + 3.7 + row * 2.5 + (R() - 0.5) * 0.5;
      if (!inE(x, y, 3.4) || (x / 16.6) ** 2 + ((y + 1.5) / 9) ** 2 < 1 || ducts.some((d) => Math.hypot(d.x - x, d.y - y) < 2.6)) continue;
      cells.push(V(x, y, 0.06));
    }
    const aim = V(8, 7, 0.06), sc = cells.reduce((b, c) => (c.distanceTo(aim) < b.distanceTo(aim) ? c : b));
    const dots = [];
    for (const c of cells) {
      if (c === sc) continue;
      face.push(ellipse(c.x, c.y, 1.2, 1.0, 0.06, 10, 0.08, c.x));
      for (let k = 0; k < 5; k++) { const a = k / 5 * 6.28 + R(); dots.push(V(c.x + Math.cos(a) * 0.82, c.y + Math.sin(a) * 0.66, 0.09)); }
    }
    L0.add(loops(face, C.ink, 0.7));
    L0.add(scatter(dots, 0.2, basic(0x77786f, { transparent: true }), new THREE.CircleGeometry(1, 6)));
    const stub0 = new THREE.Group();
    stub0.add(loops([ellipse(sc.x, sc.y, 1.25, 0.85, 0.06, 16)], C.ink, 0.9));
    stub0.add(scatter([0, 1, 2, 3, 4].map((k) => V(sc.x + Math.cos(k * 1.26) * 0.85, sc.y + Math.sin(k * 1.26) * 0.55, 0.09)), 0.22, basic(0x77786f, { transparent: true }), new THREE.CircleGeometry(1, 6)));
    const sun0 = streaks(L0, Array.from({ length: 12 }, (_, i) => { const x = -30 + (i % 6) * 12 + (i > 5 ? 6 : 0), z = i > 5 ? -26 : -8; return V(x, Y0 + B * Math.sqrt(1 - (x / A) ** 2), z); }), 46, 5, 9);
    label('Tallbarr', 'i genomskärning', V(-31, 15, 0), T0, 'big');
    label('Celler', 'med kloroplaster', V(sc.x, sc.y + 1, 0.1), T0);
    label('Hartskanal', '', ducts[4], T0, 'topic');
    label('Ledningsvävnad', 'vatten in, socker ut', V(0, -1.5, 0.1), T0);
    label('Solljus', '', V(-24, 44, -8), T0, 'topic');

    // ── L1: one cell of the needle. 1 unit = 1 µm ──
    const L1 = new THREE.Group(), T1 = new THREE.Group(); L1.add(T1);
    L1.add(ink(blob(25, 17, 15, 3, 3, 0.05), { mat: ghost(0.3), s: 0.25, thr: 24 }));
    L1.add(poly(ellipse(1, -1, 17, 10, 0, 40, 0.05), 0x8f8e86, { loop: true, dashed: true, dash: 1.2, gap: 0.9 }));
    const nuc = ink(blob(4.5, 3.8, 4, 5, 1, 0.08), { color: 0xe2e1db, s: 0.05, thr: 20 }); nuc.position.set(-13, -7, 5); L1.add(nuc);
    const cps = [];
    for (let i = 0; i < 30; i++) {
      const mat = lam(0xd9d8d1), m = ink(blob(3, 2, 1.25, i, 1, 0.05), { mat, s: 0.04, thr: 20 });
      L1.add(m); cps.push({ m, mat, u: R() * Math.PI * 2, v: (R() * 2 - 1) * 0.85, sp: (R() - 0.5) * 0.05, hot: 0 });
    }
    const stub1 = ink(blob(3, 1.3, 2, 99, 1, 0.04), { mat: lam(0xd9d8d1), s: 0.04, thr: 20 }); stub1.position.set(4, 13.4, 4);
    const cellTop = [];
    for (let i = 0; i < 9; i++) { const x = -15 + (i % 3) * 13 + (i > 2 ? 3 : 0), z = -8 + Math.floor(i / 3) * 7; cellTop.push(V(x, 17 * Math.sqrt(Math.max(0, 1 - (x / 25) ** 2 - (z / 15) ** 2)), z)); }
    const sun1 = streaks(L1, cellTop, 36, 4, 8);
    label('Cellväggen', '', V(-22, 9, 0), T1, 'topic');
    label('Kloroplaster', 'många i varje cell', V(5, 16, 4), T1);
    label('Cellkärnan', '', V(-13, -3, 7), T1, 'topic');
    label('Vakuolen', 'cellsaft', V(8, -4, 0), T1, 'topic');

    // ── L2: one chloroplast, cut open. 1 unit = 0.1 µm ──
    const L2 = new THREE.Group(), T2 = new THREE.Group(); L2.add(T2);
    const cp = chloroplast(L2, R);
    const gz = cp.grana.find((q) => q.x === 5 && q.y === 5);
    const sun2 = streaks(L2, cp.grana.map((q) => q.top.clone()), 30, 3, 6);
    label('Kloroplasten', 'cirka 5 µm lång', V(-26, 13, 0), T2, 'big');
    label('Tylakoider', 'staplade hinnor', V(-12, 10, -11), T2);
    label('Stroma', 'vätskan runt', V(14, -2, -4), T2, 'topic');
    label('Stärkelse', '', V(12, -3, -10), T2, 'topic');
    label('Två hinnor', 'höljet', V(26, 9, 0), T2, 'topic');

    // ── L3: the thylakoid membrane, where chlorophyll sits in proteins. 1 unit = 1 nm ──
    const L3 = new THREE.Group(), T3 = new THREE.Group(); L3.add(T3);
    L3.add(ink(new THREE.BoxGeometry(76, 4.6, 52).translate(0, -2.3, 0), { mat: ghost(0.45), s: 0.12, thr: 30 }));
    const heads = [];
    for (let x = -37; x <= 37; x += 1.6) for (let z = -25; z <= 25; z += 1.6) if (Math.hypot(x, z * 1.2) > 9 && !Array.from({ length: 6 }, (_, k) => Math.hypot(x - Math.cos(k * 1.047 + 0.52) * 14.5, z - Math.sin(k * 1.047 + 0.52) * 14.5) < 5).some(Boolean)) heads.push(V(x + (R() - 0.5) * 0.3, -0.35, z + (R() - 0.5) * 0.3));
    L3.add(scatter(heads, 0.3, lam(0xf1f0eb)));
    const chls = [], plate = new THREE.BoxGeometry(1.5, 0.2, 1.5);
    const chl = (p, rot) => {
      const mat = lam(0xa6a89e), o = new THREE.Group();
      o.add(ink(plate, { mat, s: 0.01, thr: 30 }), poly([V(0.75, 0, 0.75), V(1.6, -0.6, 1.3), V(2.3, -1.5, 1.4)], 0x5c5d57));
      o.position.copy(p); o.rotation.y = rot; L3.add(o);
      const c = { o, mat, p: p.clone(), hot: 0 }; chls.push(c); return c;
    };
    L3.add(ink(blob(7, 3.8, 4.6, 2, 2, 0.08).translate(0, -1.4, 0), { mat: ghost(0.4), s: 0.06, thr: 30 }));
    const pair = [chl(V(-0.75, 0.6, 0), 0.3), chl(V(0.75, 0.6, 0), -0.3)], acc = [chl(V(-3.2, 0.4, 1), 1.1), chl(V(3.2, 0.4, -1), -1.1)];
    const ants = [];
    for (let a = 0; a < 6; a++) {
      const ang = a * Math.PI / 3 + Math.PI / 6, c = V(Math.cos(ang) * 14.5, 0, Math.sin(ang) * 14.5);
      L3.add(ink(blob(4.4, 3.2, 4.4, a + 4, 2, 0.08).translate(c.x, -1.3, c.z), { mat: ghost(0.38), s: 0.05, thr: 30 }));
      ants.push(Array.from({ length: 5 }, (_, k) => { const b = k / 5 * Math.PI * 2 + a; return chl(V(c.x + Math.cos(b) * 2, 0.7, c.z + Math.sin(b) * 2), b); }));
    }
    const elec = new THREE.Mesh(new THREE.SphereGeometry(0.55, 12, 8), basic(C.lime)); elec.visible = false; L3.add(elec);
    const eRing = ring('y'); eRing.material.color.set(LIME_D); eRing.scale.setScalar(0.9); elec.add(eRing);
    const wIn = wave(L3, C.red), wGreen = wave(L3, 0x3aa35b);
    label('Klorofyll', 'fångar ljus', V(ants[1][0].p.x, 2, ants[1][0].p.z), T3);
    label('Reaktionscentrum', '', V(0, 4.2, 0), T3);
    label('Tylakoidhinnan', 'cirka 5 nm tjock', V(-33, -1, 24), T3, 'topic');
    const elLb = label('Elektron', 'vidare', V(0, 2, 0), elec, 'topic');

    const levels = [
      { grp: L0, tags: T0, out: [0.45, 0.85] },
      { grp: L1, tags: T1, at: sc.clone().setZ(0), k: 1 / 20, stub: stub0 },
      { grp: L2, tags: T2, at: stub1.position.clone(), k: 1 / 10, stub: stub1, out: [0.9, 1.4] },
      { grp: L3, tags: T3, at: gz.top.clone(), k: 1 / 100 },
    ];
    const zoom = zoomer(g, def, 2e-5, levels);
    const ctl = slider(api, 'Förstoring', 0, 300, 0), rd = readout(api);
    const NAMES = ['barret', 'cellen', 'kloroplasten', 'klorofyllet'];
    let caught = { b: 0, r: 0, g: 0 }, lastCyc = -1;
    const tmpV = V(0, 0, 0);
    return (t, dt) => {
      t = Math.max(0, t);   // the first frame can come just before the scene's clock starts
      const s = sec(dt);
      const tr = tour(t, [8, 9, 9, 22], [6, 6, 7], 9);
      const z = ctl.touched ? +ctl.inp.value / 100 : tr.z;
      if (!ctl.touched) ctl.inp.value = Math.round(z * 100);
      ctl.out.textContent = NAMES[Math.round(z)];
      zoom(z);
      // L0 and L1: sunlight comes down; in the cell it lights the chloroplast it lands on
      if (levels[0].f > 0) sun0(t);
      if (levels[1].f > 0) {
        for (const i of sun1(t)) { const p = cellTop[i]; let best = null, bd = 1e9; for (const c of cps) { const d = c.m.position.distanceTo(p); if (d < bd) { bd = d; best = c; } } if (best) best.hot = 1; }
        for (const c of cps) {
          c.u += c.sp * s;   // the cytoplasm streams slowly and carries the chloroplasts along the wall
          const w = Math.sqrt(1 - c.v * c.v);
          c.m.position.set(25 * 0.84 * c.v, 17 * 0.84 * w * Math.cos(c.u), 15 * 0.84 * w * Math.sin(c.u));
          c.m.lookAt(tmpV.set(0, 0, 0).applyMatrix4(L1.matrixWorld));
          c.hot = Math.max(0, c.hot - s * 0.8); c.mat.color.set(0xd9d8d1).lerp(LIME, c.hot);
        }
      }
      if (levels[2].f > 0) {
        for (const i of sun2(t)) cp.grana[i].hot = 1;
        for (const q of cp.grana) { q.hot = Math.max(0, q.hot - s * 0.7); q.mat.color.set(0xe2e1db).lerp(LIME, q.hot); }
      }
      // L3: a blue or red wave is caught, the energy hops in to the reaction centre, an electron leaves. A green one bounces.
      const P = 9, k = t % P, cyc = Math.floor(t / P), red = cyc % 2 === 1, f3 = levels[3].f;
      const ant = ants[(cyc * 2 + 1) % 6], first = ant.reduce((b, c) => (c.p.length() > b.p.length() ? c : b)), inner = ant.reduce((b, c) => (c.p.length() < b.p.length() ? c : b));
      const near = acc.reduce((b, c) => (c.p.distanceTo(inner.p) < b.p.distanceTo(inner.p) ? c : b));
      const path = [first, inner, near, pair[0], pair[1]];
      if (cyc !== lastCyc && f3 > 0.5) { lastCyc = cyc; red ? caught.r++ : caught.b++; caught.g++; }
      const lamIn = red ? 680 * 0.02 : 450 * 0.02, dirIn = tmpV.set(0.45, -1, -0.25).normalize();
      if (k < 2.6) { wIn.l.material.color.set(red ? C.red : 0x3d6fd6); wIn.set(first.p.clone().addScaledVector(dirIn, -(1 - k / 2.6) * 42), dirIn, lamIn, f3, { ph: -t * 9 }); }
      else wIn.set(first.p, dirIn, lamIn, f3 * (1 - smooth(k, 2.6, 3.0)), { n: 3 * (1 - smooth(k, 2.6, 3.0)) + 0.01 });
      const hopK = (k - 2.6) / 0.5;
      for (const c of chls) c.hot = Math.max(0, c.hot - s * 1.6);
      if (hopK >= 0 && hopK < path.length) path[Math.floor(hopK)].hot = 1;
      if (hopK >= path.length - 1 && hopK < path.length + 0.2) pair[0].hot = pair[1].hot = 1;
      for (const c of chls) c.mat.color.set(0xa6a89e).lerp(LIME, c.hot);
      const ek = (k - 5.1) / 2.6;
      elec.visible = ek > 0 && ek < 1; elec.position.set(ek * 40, 0.9, ek * 6); elLb.visible = ek < 0.6 && T3.visible;
      const gk = (k - 4.2) / 4.4, gTarget = V(-21, 0, 9), dG = V(-0.5, -1, 0.35).normalize();
      if (gk > 0 && gk < 1) {
        const along = (gk - 0.5) * 70, head = along < 0 ? gTarget.clone().addScaledVector(dG, along) : gTarget.clone().add(V(dG.x, -dG.y, dG.z).multiplyScalar(along));
        wGreen.set(head, along < 0 ? dG : V(dG.x, -dG.y, dG.z), 540 * 0.02, f3 * Math.sin(Math.PI * gk) ** 0.4, { ph: -t * 9, floor: 0.2 });
      } else wGreen.set(gTarget, dG, 10, 0);
      // where the story is
      const st = z < 0.5 ? 0 : z < 1.5 ? 1 : z < 2.5 ? 2 : k >= 2.6 && k < 7.7 ? 4 : 3;
      api.step(st);
      rd.innerHTML = [
        'Du ser <b>ett barr</b>, skuret på tvären · solljuset faller på den rundade sidan',
        'Du ser <b>en cell</b> i barret · kloroplasterna glider långsamt runt med cellsaften',
        'Du ser <b>en kloroplast</b> · ljuset fångas i staplarna av hinnor',
        `Du ser <b>klorofyllet</b> · ett par hundra klorofyllmolekyler fångar ljus åt varje reaktionscentrum<br>Fångat: blått <b>${caught.b}</b> · rött <b>${caught.r}</b> · grönt som studsat <b>${caught.g}</b>`,
      ][Math.round(z)];
    };
  },
};

// ═════════════ Växthuset: photosynthesis inside a chloroplast ═════════════
// 1 unit = 0.1 µm. Light waves are to scale; the molecules are drawn hundreds of times too big.
function molecule(kind) {
  const m = new THREE.Group(), atom = (r, color) => ink(new THREE.IcosahedronGeometry(r, 0), { color, s: 0.02, thr: 30 });
  const O = () => atom(0.95, 0xffffff), Ca = () => atom(0.85, 0x9a9b94), H = () => atom(0.6, 0xffffff);
  const at = (o, x, y, z = 0) => { o.position.set(x, y, z); m.add(o); };
  if (kind === 'co2') { at(Ca(), 0, 0); at(O(), -1.7, 0); at(O(), 1.7, 0); }
  if (kind === 'h2o') { at(O(), 0, 0.2); at(H(), -1.15, -0.65); at(H(), 1.15, -0.65); }
  if (kind === 'o2') { at(O(), -0.85, 0); at(O(), 0.85, 0); }
  if (kind === 'sugar') {   // the glucose ring: five carbons and one oxygen
    const pts = Array.from({ length: 6 }, (_, i) => V(Math.cos(i / 6 * Math.PI * 2) * 2.1, Math.sin(i / 6 * Math.PI * 2) * 2.1, 0));
    m.add(poly(pts, C.ink, { loop: true }));
    pts.forEach((p, i) => at(i === 0 ? O() : Ca(), p.x, p.y, p.z));
  }
  m.visible = false;
  return m;
}
SCENES.kloroplast = {
  title: 'Fotosyntesen i kloroplasten', kick: 'Mikro · 10⁻⁶ m', unit: 1e-7,
  view: { t: [1, 2, -3], d: 152, el: 0.3, az: 0.3 },
  lead: 'En växt samlar energi på sitt eget sätt: i kloroplasten blir ljus, vatten och koldioxid till socker och syre.',
  steps: [
    'Ljuset fångas av klorofyllet i tylakoiderna, de staplade hinnorna.',
    'Med ljusets energi delas vatten. Syret blir över och går ut i luften.',
    'Energin sparas i små bärarmolekyler som vandrar ut i stromat, vätskan runt staplarna.',
    'Där binds koldioxid från luften, i ett kretslopp som kallas Calvincykeln.',
    'Ut kommer socker. Växten bygger sig själv av det, eller sparar det som stärkelse.',
  ],
  note: 'Molekylerna är ritade hundratals gånger för stora, och mycket färre än i verkligheten. Ljusvågorna har rätt längd i förhållande till kloroplasten. Dra ner ljuset, så stannar kretsloppet.',
  build(g, api) {
    const R = rng(23);
    const cp = chloroplast(g, R, { right: false, starch: V(18, -6, -7) });
    // the Calvin cycle in the stroma
    const RC = V(13, 2, -3), RR = 5.5;
    const cyc = ring('z'); cyc.scale.setScalar(RR); cyc.position.copy(RC); g.add(cyc);
    for (let i = 0; i < 3; i++) {
      const a = i / 3 * Math.PI * 2 + 0.4, cone = ink(new THREE.ConeGeometry(0.55, 1.4, 8), { s: 0.02, thr: 30 });
      cone.position.set(RC.x + Math.cos(a) * RR, RC.y + Math.sin(a) * RR, RC.z); cone.rotation.z = a; g.add(cone);
    }
    const turners = Array.from({ length: 4 }, () => { const o = new THREE.Mesh(new THREE.IcosahedronGeometry(0.5, 1), lam(0x9a9b94)); g.add(o); return o; });
    let ringA = 0, boost = 0;
    // molecule pools and movers
    const pools = {}, moves = [];
    const get = (kind) => { const p = (pools[kind] ||= []); let m = p.find((o) => !o.visible && !o.userData.busy); if (!m) { m = kind === 'car' || kind === 'car0' ? new THREE.Mesh(new THREE.IcosahedronGeometry(0.62, 1), basic(kind === 'car' ? C.lime : 0xb3b2aa)) : molecule(kind); m.visible = false; g.add(m); p.push(m); } m.userData.busy = true; return m; };
    const free = (m) => { m.visible = false; m.userData.busy = false; };
    const go = (o, a, b, dur, done, wob = 0.8) => { o.visible = true; o.position.copy(a); moves.push({ o, a: a.clone(), b: b.clone(), t: 0, dur, done, wob, ph: R() * 6 }); };
    // the light waves
    const waves = Array.from({ length: 6 }, () => ({ w: wave(g, LIME_D), on: false }));
    // labels
    label('Ljus', 'från solen', V(-4, 30, 0), g);
    label('Vatten', 'från rötterna', V(-40, -20, 0), g);
    label('Syre ut', 'i luften', V(-30, 26, 2), g);
    label('Koldioxid', 'från luften', V(28, 24, 0), g);
    label('Socker', 'till resten av växten', V(22, -22, 4), g);
    label('Calvincykeln', '', V(RC.x, RC.y + RR + 1.5, RC.z), g, 'topic');
    label('Tylakoider', 'staplade hinnor', V(-12, 10, -11), g, 'topic');
    label('Stroma', '', V(2, -9, -3), g, 'topic');
    label('Stärkelse', '', V(18, -3, -7), g, 'topic');
    label('Energibärare', '', V(-1, 7, -2), g, 'topic');
    const ctl = slider(api, 'Ljus', 0, 100, 70), rd = readout(api), eq = readout(api);
    eq.innerHTML = '6 CO₂ + 6 H₂O + ljus → C₆H₁₂O₆ + 6 O₂<br><small>koldioxid + vatten + ljus → socker + syre</small>';
    const waits = new Map();   // granum → water waiting there
    const co2wait = [];
    // start mid-flow: water already waits at some stacks, and carbon dioxide by the cycle
    cp.grana.slice(0, 3).forEach((q) => { const m = get('h2o'); m.visible = true; m.position.copy(q.top).add(V(0, 1.4, 2.2)); waits.set(q, m); });
    for (let i = 0; i < 2; i++) { const m = get('co2'); m.visible = true; m.position.copy(RC).add(V(6.5 + i * 2, 3 + i * 3, 1.5)); m.userData.waiting = true; co2wait.push(m); }
    let pT = 0, wT = 0, cT = 0, fuel = 0, splits = 0, co2n = 0, o2n = 0, sugar = 0, step = 0, stepT = 0, starchK = 1;
    const ev = (n) => { if (n >= step || stepT > 2.5) { step = n; stepT = 0; } };
    return (t, dt) => {
      t = Math.max(0, t);   // the first frame can come just before the scene's clock starts
      const s = sec(dt), L = +ctl.inp.value / 100;
      ctl.out.textContent = `${ctl.inp.value} %`;
      stepT += s;
      // water drifts in towards stacks that have none
      wT += s;
      const inPlay = (pools.h2o || []).filter((m) => m.visible).length;
      if (wT > 1.1 && inPlay < 5) {
        wT = 0;
        const gr = cp.grana.filter((q) => !waits.has(q) && !q.coming);
        if (gr.length) {
          const q = gr[Math.floor(R() * gr.length)], m = get('h2o'); q.coming = true;
          go(m, V(-40, -24 + R() * 6, -2 + R() * 4), q.top.clone().add(V(-1 + R() * 2, 1.4, 2.2)), 5 + R() * 1.5, () => { q.coming = false; waits.set(q, m); });
        }
      }
      // light: waves fall on the stacks, more of them the more light there is
      pT += s * L * 1.6;
      if (pT >= 1) {
        pT -= 1;
        const slot = waves.find((w) => !w.on);
        if (slot) { const withW = cp.grana.filter((q) => waits.has(q)), pool = withW.length && R() < 0.8 ? withW : cp.grana; Object.assign(slot, { on: true, q: pool[Math.floor(R() * pool.length)], t: 0, dir: V(0.25 - R() * 0.5, -1, 0.15).normalize() }); }
      }
      for (const w of waves) {
        if (!w.on) continue;
        w.t += s; const k = w.t / 2.4;
        if (k >= 1) {
          w.on = false; w.w.set(w.q.top, w.dir, 5.5, 0); w.q.hot = 1; ev(0);
          const m = waits.get(w.q);
          if (m) {   // the water is split: oxygen out, energy into a carrier
            waits.delete(w.q); free(m); splits++; ev(1);
            { const o = get('o2'); go(o, w.q.top.clone().add(V(0, 1.5, 2)), V(-30 + R() * 8, 27, 3), 6, () => { free(o); o2n++; }); }
            const c = get('car'), back = RC.clone().add(V(-RR, 0, 0));
            go(c, w.q.top.clone().add(V(1, 0.6, 2.2)), back, 2.6, () => { free(c); fuel++; ev(2); const e = get('car0'); go(e, back, w.q.top.clone().add(V(1, 0.6, 2.2)), 3.4, () => free(e), 0.5); }, 1.2);
          }
          continue;
        }
        w.w.set(w.q.top.clone().addScaledVector(w.dir, -(1 - k) * 26), w.dir, 5.5, Math.min(1, (1 - k) * 4), { ph: -t * 8 });
      }
      // carbon dioxide comes in from the air and waits by the cycle
      cT += s;
      if (cT > 1.6 && co2wait.length + (pools.co2 || []).filter((m) => m.visible && !m.userData.waiting && !m.userData.fixing).length < 3) {
        cT = 0; const m = get('co2'), slotP = RC.clone().add(V(6.5 + R() * 2.5, 3 + R() * 4, 1 + R() * 2));
        go(m, V(30 + R() * 6, 24 + R() * 3, 0), slotP, 7, () => { m.userData.waiting = true; co2wait.push(m); });
      }
      if (fuel >= 1 && co2wait.length) {   // the energy from the light binds carbon dioxide into the cycle
        const m = co2wait.shift(); m.userData.waiting = false; m.userData.fixing = true; fuel -= 1;
        go(m, m.position, RC.clone().add(V(0, RR, 0)), 1.6, () => {
          m.userData.fixing = false; free(m); co2n++; boost = 1; ev(3);
          if (co2n % 6 === 0) {   // six carbons in: one sugar out
            const sg = get('sugar'), toStarch = sugar % 2 === 0; sugar++; ev(4);
            go(sg, RC.clone().add(V(0, -RR, 0)), toStarch ? V(18, -6, -7) : V(24, -24, 4), 6, () => { free(sg); if (toStarch) starchK = Math.min(1.5, starchK + 0.06); });
          }
        }, 0.3);
      }
      for (let i = moves.length - 1; i >= 0; i--) {
        const m = moves[i]; m.t += s; const k = Math.min(1, m.t / m.dur), e = k * k * (3 - 2 * k);
        m.o.position.lerpVectors(m.a, m.b, e); m.o.position.y += Math.sin(m.t * 1.3 + m.ph) * m.wob * Math.sin(Math.PI * k);
        m.o.rotation.y += s * 0.5; m.o.rotation.z = Math.sin(m.t * 0.7 + m.ph) * 0.3;
        if (k >= 1) { moves.splice(i, 1); m.done?.(); }
      }
      for (const [, m] of waits) m.position.y += Math.sin(t * 1.5 + m.id) * 0.004;
      for (const q of cp.grana) { q.hot = Math.max(0, q.hot - s * 0.8); q.mat.color.set(0xe2e1db).lerp(LIME, q.hot); }
      cp.starch.scale.setScalar(starchK);
      boost = Math.max(0, boost - s * 0.5); ringA += s * (fuel > 0 || boost > 0 ? 0.25 + boost * 1.2 : 0.05);
      turners.forEach((o, i) => { const a = ringA + i / 4 * Math.PI * 2; o.position.set(RC.x + Math.cos(a) * RR, RC.y + Math.sin(a) * RR, RC.z); });
      api.step(step);
      rd.innerHTML = L === 0 ? 'Mörker: utan ljus tar energin slut, och kretsloppet stannar.'
        : `Koldioxid in <b>${co2n}</b> · syre ut <b>${o2n}</b> · socker <b>${sugar}</b>`;
    };
  },
};

// ═════════════ Lungan: from the airways down to the blood ═════════════
// Three levels: the lungs (1 unit = 3,5 mm), a cluster of alveoli (10 µm) and the wall between air and blood (1 µm).
SCENES.lungblasor = {
  title: 'Lungblåsorna', kick: 'Mikro · 10⁻⁶ m', unit: 0.0035,
  view: { t: [0, 0, 0], d: 185, el: 0.24, az: 0.36 },
  lead: 'Träd och växter släpper ut syre, och våra lungor tar in det. Följ luften ända ut till blodet.',
  steps: [
    'Luften går ner genom luftstrupen. Den delar sig i två luftrör, ett till varje lunga.',
    'Luftrören grenar sig om och om igen, som ett träd upp och ner, drygt 20 gånger.',
    'Längst ut sitter lungblåsorna, flera hundra miljoner. Utbredda skulle de täcka 50–100 kvadratmeter.',
    'Runt lungblåsorna går hårfina blodkärl. Väggen emellan är tunnare än en tusendels millimeter, och syret tar sig igenom till de röda blodkropparna.',
    'Koldioxid går åt andra hållet, från blodet ut i luften, och andas ut. Gaserna går från där det finns mycket till där det finns lite.',
  ],
  note: 'Ett hopp genom tre skalor; skalstocken följer med. Andningen går i 12 andetag i minuten, som i vila. Blodet rör sig mycket långsammare än på riktigt, och syre och koldioxid är ritade som prickar.',
  build(g, api) {
    const def = SCENES.lungblasor, R = rng(5);
    const vol = (t) => (1 - Math.cos(t / 5 * Math.PI * 2)) / 2;   // 0 → 1 → 0 over one five-second breath

    // ── L0: the lungs and the airway tree. 1 unit = 3,5 mm ──
    const L0 = new THREE.Group(), T0 = new THREE.Group(); L0.add(T0);
    const lungs = [-1, 1].map((sd) => {
      const rx = sd > 0 ? 15.5 : 14, ry = 27, kk = (y) => 0.6 + 0.4 * smooth(-y, -ry, 8);
      const geo = blob(rx, ry, 14, sd + 3, 3, 0.04), p = geo.attributes.position;
      for (let i = 0; i < p.count; i++) { const k = kk(p.getY(i)); p.setX(i, p.getX(i) * k); p.setZ(i, p.getZ(i) * k); }
      geo.computeVertexNormals();
      const o = ink(geo, { mat: ghost(0.16), s: 0.25, thr: 32 }); o.position.set(sd * 16.5, -9, 0); L0.add(o);
      o.add(loops([Array.from({ length: 60 }, (_, i) => { const a = i / 60 * Math.PI * 2, y = Math.sin(a) * ry, x = Math.cos(a) * rx * kk(y) * (sd * Math.cos(a) < 0 ? 0.86 : 1); return V(x, y, 0); })], C.ink, 0.55));
      return o;
    });
    const tubes = [], ends = [], paths = [];
    const tube = (pts, r) => { const c = new THREE.CatmullRomCurve3(pts); L0.add(ink(new THREE.TubeGeometry(c, 10, r, 7), { s: 0.15, thr: 60 })); tubes.push(c); return c; };
    const branch = (from, dir, len, rad, depth, sd, trail) => {
      const end = from.clone().addScaledVector(dir, len);
      const mid = from.clone().lerp(end, 0.5).add(V((R() - 0.5) * len * 0.15, (R() - 0.5) * len * 0.15, (R() - 0.5) * len * 0.15));
      tube([from, mid, end], rad);
      const tr = [...trail, mid, end];
      if (!depth) { ends.push({ p: end, dir, rad }); paths.push(tr); return; }
      const ctr = V(sd * 16.5, -12, 0);
      for (const k of [-1, 1]) {
        const ax = V(R() - 0.5, R() - 0.5, R() - 0.5).cross(dir).normalize();
        const d = dir.clone().applyAxisAngle(ax, k * (0.42 + R() * 0.2)).addScaledVector(ctr.clone().sub(end).normalize(), 0.18).normalize();
        branch(end, d, len * 0.78, rad * 0.72, depth - 1, sd, tr);
      }
    };
    tube([V(0, 36, 0), V(0, 26, 0.4), V(0, 16, 0)], 2.6);
    for (const sd of [-1, 1]) branch(V(0, 16, 0), V(sd * 0.62, -0.78, 0.05).normalize(), 10.5, 1.8, 5, sd, [V(0, 36, 0), V(0, 16, 0)]);
    // the twig we follow: from a branch tip in the right lung, thinning out to an airway a quarter of a millimetre wide
    const D0 = V(0.62, -0.72, 0.3).normalize(), K1 = 1e-5 / 0.0035;
    const E = ends.reduce((b, e) => (e.p.x + e.p.z * 1.4 - Math.abs(e.p.y + 8) * 0.3 > b.p.x + b.p.z * 1.4 - Math.abs(b.p.y + 8) * 0.3 ? e : b));
    const SH = D0.clone().multiplyScalar(-14);   // the cluster's middle, not the airway's end, is the centre of level 1
    const at1 = E.p.clone().addScaledVector(E.dir, 1.4).addScaledVector(D0, 1.6);
    const tipA = at1.clone().addScaledVector(SH.clone().addScaledVector(D0, -70), K1), tipB = tipA.clone().addScaledVector(D0, -1.0);
    const twig = new THREE.CatmullRomCurve3([E.p, E.p.clone().addScaledVector(E.dir, 0.9), tipB, tipA]);
    const twigPts = twig.getPoints(24);
    for (let i = 0; i < 3; i++) { const a = [0, 0.45, 0.8, 1][i], b = [0, 0.45, 0.8, 1][i + 1]; L0.add(ink(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(twigPts.slice(Math.floor(a * 24), Math.ceil(b * 24) + 1)), 6, [E.rad * 0.6, 0.12, 0.036][i], 7), { s: 0.03, thr: 60 })); }
    // air moving in and out with the breath
    const NA = 70, airSeed = Array.from({ length: NA }, () => [Math.floor(R() * paths.length), R() * 0.6]);
    const airGeo = new THREE.IcosahedronGeometry(1, 1), air = new THREE.InstancedMesh(airGeo, basic(LIME_D, { transparent: true, depthTest: false }), NA); air.frustumCulled = false; air.renderOrder = 3; L0.add(air);
    const pathCurves = paths.map((p) => new THREE.CatmullRomCurve3(p));
    label('Luftstrupen', '', V(0, 33, 0), T0);
    label('Luftrören', 'grenar sig som ett träd', V(-24, 14, 0), T0);
    label('Lungorna', '', V(-30, -30, 0), T0, 'topic');

    // ── L1: the end of the airways and the alveoli. 1 unit = 10 µm ──
    const L1 = new THREE.Group(), L1c = new THREE.Group(), T1 = new THREE.Group(); L1.add(L1c); L1c.add(T1); L1c.position.copy(SH);
    const ax1 = V(0, 0, 1).cross(D0).normalize(), ax2 = D0.clone().cross(ax1).normalize();
    L1c.add(ink(new THREE.TubeGeometry(new THREE.LineCurve3(D0.clone().multiplyScalar(-70), D0.clone().multiplyScalar(-22.5)), 4, 5, 18, true), { s: 0.2, thr: 60 }));
    L1c.add(ink(new THREE.TubeGeometry(new THREE.LineCurve3(D0.clone().multiplyScalar(-25), V(0, 0, 0)), 4, 3.6, 14, true), { s: 0.2, thr: 60 }));
    // blood vessels alongside: in from the heart (low in oxygen) and back to it
    for (const [o, c] of [[16, 0x8e4b46], [-16, C.red]]) L1c.add(poly([D0.clone().multiplyScalar(-70).addScaledVector(ax1, o), D0.clone().multiplyScalar(-20).addScaledVector(ax1, o * 0.8), D0.clone().multiplyScalar(4).addScaledVector(ax1, o * 0.4)], c));
    const alv = [], aMat = lam(0xffffff);
    const P = D0.clone().multiplyScalar(14).add(V(0, 0, 7)), SA = P.clone().add(V(-5.2, 0, 6)), SB = P.clone().add(V(5.2, 0, 6));
    const pairMat = lam(0xffffff, { transparent: true, opacity: 0.55, depthWrite: false });   // the two we zoom in between stay see-through
    const addA = (c, r = 7, mat = aMat) => { if (alv.some((a) => a.c.distanceTo(c) < (a.r + r) * 0.62)) return; const o = ink(blob(r, r, r, alv.length + 9, 3, 0.04), { mat, s: 0.06, thr: 34 }); o.position.copy(c); L1c.add(o); alv.push({ o, c: c.clone(), r }); };
    addA(SA, 7.6, pairMat); addA(SB, 7.6, pairMat);
    for (let i = 0; i < 3; i++) {
      const dd = D0.clone().applyAxisAngle(ax2, (i - 1) * 0.75).applyAxisAngle(ax1, (R() - 0.5) * 0.4);
      for (let s = 5; s <= 30; s += 8) for (let k = 0; k < 4; k++) {
        const a = k / 4 * Math.PI * 2 + s * 0.3 + i, c = dd.clone().multiplyScalar(s).addScaledVector(ax1, Math.cos(a) * 7.5).addScaledVector(ax2, Math.sin(a) * 7.5);
        if (c.z < P.z + 2) addA(c, 6.2 + R() * 1.6);
      }
    }
    for (const s of [-7, -14]) for (let k = 0; k < 3; k++) { const a = k * 2.1 + s; addA(D0.clone().multiplyScalar(s).addScaledVector(ax1, Math.cos(a) * 8).addScaledVector(ax2, Math.sin(a) * 8), 5.5); }
    // capillaries wrapped around each alveolus
    const caps = [];
    for (const a of alv) for (let k = 0; k < 3; k++) {
      const q = new THREE.Quaternion().setFromEuler(new THREE.Euler(R() * 6, R() * 6, R() * 6));
      caps.push(Array.from({ length: 22 }, (_, i) => { const b = i / 22 * Math.PI * 2; return V(Math.cos(b) * a.r * 1.03, Math.sin(b) * a.r * 1.03, 0).applyQuaternion(q).add(a.c); }));
    }
    L1c.add(loops(caps, 0xb05a52, 0.45));
    label('Minsta luftrören', 'under en halv millimeter', D0.clone().multiplyScalar(-40).addScaledVector(ax1, 11), T1);
    label('Lungblåsor', 'cirka 0,2 mm', V(SB.x + 6, SB.y + 6, SB.z), T1);
    label('Blodkärl', 'runt varje blåsa', D0.clone().multiplyScalar(26).addScaledVector(ax1, -16), T1, 'topic');
    label('Från hjärtat', '', D0.clone().multiplyScalar(-62).addScaledVector(ax1, 16), T1, 'topic');

    // ── L2: the wall between two alveoli, with a capillary inside. 1 unit = 1 µm ──
    const L2 = new THREE.Group(), T2 = new THREE.Group(); L2.add(T2);
    L2.add(ink(new THREE.CylinderGeometry(4.3, 4.3, 70, 30, 1, true, Math.PI / 2, Math.PI), { mat: lam(0xffffff, { side: THREE.DoubleSide }), s: 0.08, thr: 40 }));
    for (const sd of [-1, 1]) L2.add(ink(new THREE.BoxGeometry(0.45, 70, 16).translate(sd * 4.75, 0, -7), { mat: ghost(0.5), s: 0.05, thr: 30 }));
    const prof = [];   // a red blood cell: the classic dimpled disc, 7,8 µm across
    for (let i = 0; i <= 16; i++) { const r = 3.9 * Math.sin(i / 16 * Math.PI / 2) ** 0.8, q = r / 3.9, h = 0.5 * 3.9 * Math.sqrt(Math.max(0, 1 - q * q)) * (0.21 + 2.0 * q * q - 1.12 * q ** 4); prof.push(new THREE.Vector2(r, h)); }
    for (let i = 16; i >= 0; i--) { const p = prof[i]; prof.push(new THREE.Vector2(p.x, -p.y)); }
    const rbcGeo = new THREE.LatheGeometry(prof.filter((p, i, a) => !i || p.distanceTo(a[i - 1]) > 1e-4), 24);
    const DARK = new THREE.Color(0x7d3b3b), BRIGHT = new THREE.Color(C.red);
    const rbcs = Array.from({ length: 6 }, (_, i) => { const mat = lam(0x7d3b3b), o = ink(rbcGeo, { mat, s: 0.03, thr: 40 }); o.rotation.x = 0.25; L2.add(o); return { o, mat, ph: i / 6 }; });
    const O2 = Array.from({ length: 26 }, () => { const o = new THREE.Mesh(new THREE.IcosahedronGeometry(0.5, 1), basic(C.lime)); o.visible = false; L2.add(o); return { o, on: false }; });
    const CO2 = Array.from({ length: 16 }, () => { const o = new THREE.Mesh(new THREE.IcosahedronGeometry(0.5, 1), basic(0x5c5d57)); o.visible = false; L2.add(o); return { o, on: false }; });
    for (const sd of [-1, 1]) label('Luft', 'i lungblåsan', V(sd * 20, 24, -4), T2, 'topic');
    label('Kapillär', 'hårfint blodkärl', V(0, 30, 0), T2);
    label('Röd blodkropp', '', V(4.5, -14, 1), T2, 'topic');
    label('Väggen', 'under 1 µm', V(-5, -26, 0), T2, 'topic');
    label('Syre in', '', V(-16, 6, 0), T2, 'topic');
    label('Koldioxid ut', '', V(17, -6, 0), T2, 'topic');

    const levels = [
      { grp: L0, tags: T0, out: [1.4, 2.0] },
      { grp: L1, tags: T1, at: at1, k: K1, out: [0.35, 0.8] },
      { grp: L2, tags: T2, at: P.clone().add(SH).add(V(0, 0, 6 + Math.sqrt(7.6 ** 2 - 5.2 ** 2))), k: 1 / 10 },
    ];
    const zoom = zoomer(g, def, 0.0035, levels);
    let sNow = 1;
    const ctl = slider(api, 'Förstoring', 0, 200, 0), rd = readout(api);
    const NAMES = ['lungorna', 'lungblåsorna', 'väggen mot blodet'];
    const dm = new THREE.Object3D(), pv = V(0, 0, 0);
    let oT = 0, cT = 0, o2n = 0, co2n = 0;
    return (t, dt) => {
      t = Math.max(0, t);   // the first frame can come just before the scene's clock starts
      const s = sec(dt), b = vol(t), inhale = Math.sin(t / 5 * Math.PI * 2) > 0;
      const tr = tour(t, [10, 9, 22], [8, 5], 9);
      const z = ctl.touched ? +ctl.inp.value / 100 : tr.z;
      if (!ctl.touched) ctl.inp.value = Math.round(z * 100);
      ctl.out.textContent = NAMES[Math.round(z)];
      sNow = zoom(z);
      if (levels[0].f > 0) {
        lungs.forEach((o) => o.scale.setScalar(1 + 0.045 * b));
        airSeed.forEach(([pi, u0], i) => {
          const u = clamp(u0 + 0.42 * b, 0, 1); pathCurves[pi].getPointAt(u, pv);
          dm.position.copy(pv); dm.scale.setScalar(0.45 * Math.min(1, sNow * 1.5) * smooth(u, 0, 0.08) * (1 - smooth(u, 0.92, 1))); dm.updateMatrix(); air.setMatrixAt(i, dm.matrix);
        });
        air.instanceMatrix.needsUpdate = true;
      }
      if (levels[1].f > 0) for (const a of alv) a.o.scale.setScalar(1 + 0.05 * b);
      if (levels[2].f > 0) {
        // blood flows down the capillary and turns brighter red as it takes up oxygen
        rbcs.forEach((c) => { const y = 35 - (((t * 2.2) / 70 + c.ph) % 1) * 70; c.o.position.set(0, y, -0.4); c.mat.color.copy(DARK).lerp(BRIGHT, smooth(y, 22, -18)); });
        oT += s; cT += s;
        if (oT > 0.32) { oT = 0; const d = O2.find((q) => !q.on); if (d) { const sd = R() < 0.5 ? -1 : 1; Object.assign(d, { on: true, t: 0, sd, y: -6 + R() * 34, z: -12 + R() * 10, x0: sd * (8 + R() * 20) }); } }
        if (cT > 0.55) { cT = 0; const d = CO2.find((q) => !q.on); if (d) { const sd = R() < 0.5 ? -1 : 1; Object.assign(d, { on: true, t: 0, sd, y: -10 + R() * 30, z: -8 + R() * 6, x1: sd * (10 + R() * 18) }); } }
        for (const d of O2) {
          if (!d.on) continue;
          d.t += s; const k = d.t / 4.2;
          if (k >= 1) { d.on = false; d.o.visible = false; o2n++; continue; }
          d.o.visible = true;
          const x = k < 0.7 ? THREE.MathUtils.lerp(d.x0, d.sd * 4.75, ease(k / 0.7)) : THREE.MathUtils.lerp(d.sd * 4.75, d.sd * 1.4, (k - 0.7) / 0.3);
          d.o.position.set(x, d.y - (k > 0.7 ? (k - 0.7) * 10 : 0) + Math.sin(d.t * 2 + d.z) * 0.3, d.z);
          d.o.scale.setScalar(1 - smooth(k, 0.85, 1));
        }
        for (const d of CO2) {
          if (!d.on) continue;
          d.t += s; const k = d.t / 4.6;
          if (k >= 1) { d.on = false; d.o.visible = false; co2n++; continue; }
          d.o.visible = true;
          d.o.position.set(THREE.MathUtils.lerp(d.sd * 1.6, d.x1, ease(k)), d.y + k * 4 + Math.sin(d.t * 2 + d.z) * 0.3, d.z);
          d.o.scale.setScalar(smooth(k, 0, 0.12) * (1 - smooth(k, 0.8, 1)));
        }
      }
      api.step(z < 0.25 ? (t % 10 < 5 ? 0 : 1) : z < 0.9 ? 1 : z < 1.5 ? 2 : Math.floor(t / 4) % 2 ? 4 : 3);
      const breath = `${inhale ? 'Andas in' : 'Andas ut'} · 12 andetag i minuten, ungefär en halv liter luft varje gång`;
      rd.innerHTML = z > 1.5 ? `${breath}<br>Syre in i blodet <b>${o2n}</b> · koldioxid ut i luften <b>${co2n}</b>` : breath;
    };
  },
};

// ═════════════ Orostunneln: why the painted walls glow under UV light ═════════════
// A cut through the paint on the wall. 1 unit = 1 µm. Light waves are drawn ten times longer than they are, but in proportion.
const LAMPS = [
  { k: 'uv', name: 'UV · 365 nm', nm: 365, color: 0x8a7fb8, dashed: true },
  { k: 'vi', name: 'Violett · 405 nm', nm: 405, color: 0x6b4fc9 },
  { k: 'gr', name: 'Grönt · 530 nm', nm: 530, color: 0x3aa35b },
];
const EMIT = 520, ABSORB_MAX = 480;   // the glowing paint is drawn as one that takes up below ~480 nm and shines green-yellow at 520 nm
SCENES.fluorescens = {
  title: 'Färg som lyser i UV-ljus', kick: 'Mikro · 10⁻⁶ m', unit: 1e-6,
  view: { t: [0, 4, 0], d: 150, el: 0.32, az: 0.36 },
  lead: 'Färg som lyser i UV-ljus tar upp ljus vi inte ser och skickar ut ljus vi ser. Här är färgen förstorad några tusen gånger.',
  steps: [
    'UV-lampan sänder mest ultraviolett ljus. Vågorna är kortare än de vi kan se.',
    'I färgen finns ämnen som tar upp UV-ljuset. Energin lyfter en elektron i molekylen till en högre nivå.',
    'En liten del av energin blir värme innan elektronen faller tillbaka.',
    'Resten kommer ut som synligt ljus, med längre våglängd. Därför lyser färgen i mörkret.',
    'Grönt ljus har för lite energi för att få den här färgen att lysa. Det studsar bara tillbaka.',
  ],
  note: 'Ljusvågorna är ritade tio gånger längre än de är, men i rätt förhållande till varandra. Vita kläder och tänder lyser också i UV-ljus, av samma skäl.',
  build(g, api) {
    const R = rng(31);
    g.add(ink(new THREE.BoxGeometry(72, 10, 32).translate(0, -11, 0), { color: 0xe6e5df, s: 0.2, thr: 30 }));
    g.add(ink(new THREE.BoxGeometry(72, 12, 32), { mat: ghost(0.4), s: 0.2, thr: 30 }));
    // the pigment grains in the paint
    const grains = [];
    for (let i = 0; i < 70 && grains.length < 30; i++) {
      const r = 1.2 + R() * 1.5, p = V((R() - 0.5) * 64, -4.5 + R() * 9, (R() - 0.5) * 25);
      if (grains.some((q) => q.p.distanceTo(p) < q.r + r + 0.8)) continue;
      const mat = lam(0xffffff), o = ink(blob(r, r * 0.85, r, i, 2, 0.12), { mat, s: 0.03, thr: 34 });
      o.position.copy(p); g.add(o); grains.push({ o, mat, p, r, hot: 0 });
    }
    const front = grains.filter((q) => q.p.z > -10 && Math.abs(q.p.x) < 30);
    const heat = grains.map((q) => { const c = ring('z'); c.material.color.set(0x8f8e86); c.position.copy(q.p); c.visible = false; g.add(c); return c; });
    label('Färgskiktet', 'cirka 12 µm', V(-34, 6, 16), g, 'topic');
    label('Väggen', '', V(-34, -12, 16), g, 'topic');
    label('Färgkorn', 'med lysande ämne', V(front[0].p.x, front[0].p.y + 3, front[0].p.z), g);
    const inLb = label('UV-ljus', 'osynligt', V(-26, 30, 4), g, 'topic'), outLb = label('Synligt ljus', 'ut ur färgen', V(22, 30, 0), g, 'topic');
    // controls
    const opts = document.createElement('div'); opts.className = 'sc-opts';
    opts.innerHTML = LAMPS.map((l) => `<button data-k="${l.k}">${l.name}</button>`).join('');
    api.live.append(opts);
    const tc = canvas(api, 300, 96), rd = readout(api);
    let lamp = LAMPS[0];
    const slots = Array.from({ length: 9 }, () => ({ on: false }));
    const draw = () => {   // spectrum on the left, the molecule's energy levels on the right
      const { g: x, w, h } = tc, glows = lamp.nm < ABSORB_MAX, X = (nm) => 6 + (nm - 300) / 420 * (w - 108), base = h - 22;
      x.clearRect(0, 0, w, h); x.font = '600 9px IBM Plex Mono, monospace';
      const gr = x.createLinearGradient(X(380), 0, X(720), 0);
      [[380, '#7a4fc9'], [440, '#3d6fd6'], [490, '#2fa5b8'], [520, '#3aa35b'], [570, '#cfd63a'], [600, '#f0a33a'], [650, '#c9473b'], [720, '#8a2a24']].forEach(([nm, c]) => gr.addColorStop((nm - 380) / 340, c));
      x.fillStyle = gr; x.fillRect(X(380), base + 4, X(720) - X(380), 5);
      x.fillStyle = '#d6d5ce'; x.fillRect(X(300), base + 4, X(380) - X(300), 5);
      x.fillStyle = '#5c5d57'; x.fillText('UV', X(318), h - 3); x.fillText('synligt ljus', X(470), h - 3);
      x.strokeStyle = '#a6a89e'; x.setLineDash([2, 3]); x.beginPath();
      for (let nm = 300; nm <= 500; nm += 4) x.lineTo(X(nm), base - 40 * Math.exp(-(((nm - 390) / 45) ** 2)));
      x.stroke(); x.setLineDash([]);
      x.fillText('tar upp', X(300), base - 30);
      if (glows) {
        x.beginPath(); x.moveTo(X(440), base);
        for (let nm = 440; nm <= 620; nm += 3) x.lineTo(X(nm), base - 52 * Math.exp(-(((nm - EMIT) / 24) ** 2)));
        x.lineTo(X(620), base); x.fillStyle = 'rgba(202,254,3,.85)'; x.fill(); x.strokeStyle = '#0a0b09'; x.lineWidth = 1.2; x.stroke();
        x.fillStyle = '#0a0b09'; x.fillText('färgen lyser', X(EMIT) + 8, base - 50);
      }
      x.strokeStyle = '#' + lamp.color.toString(16).padStart(6, '0'); x.lineWidth = 2; x.beginPath(); x.moveTo(X(lamp.nm), base); x.lineTo(X(lamp.nm), base - 62); x.stroke();
      x.fillStyle = '#0a0b09'; x.fillText('lampan', X(lamp.nm) - 14, 10);
      // energy levels: up with the lamp's light, a small step as heat, down as light
      const ex = w - 92, lo = h - 22, hi = 18, mid = 30;
      x.strokeStyle = '#0a0b09'; x.lineWidth = 1.2;
      for (const y of [lo, hi]) { x.beginPath(); x.moveTo(ex, y); x.lineTo(ex + 84, y); x.stroke(); }
      const arrow = (x0, y0, y1, col) => { x.strokeStyle = col; x.fillStyle = col; x.lineWidth = 2; x.beginPath(); x.moveTo(x0, y0); x.lineTo(x0, y1); x.stroke(); const d = Math.sign(y1 - y0); x.beginPath(); x.moveTo(x0 - 4, y1 - d * 6); x.lineTo(x0 + 4, y1 - d * 6); x.lineTo(x0, y1); x.fill(); };
      const col = '#' + lamp.color.toString(16).padStart(6, '0');
      if (glows) {
        arrow(ex + 14, lo, hi + 1, col);
        x.strokeStyle = '#8f8e86'; x.lineWidth = 1.2; x.beginPath(); for (let i = 0; i <= 12; i++) x.lineTo(ex + 32 + (i % 2) * 5, hi + i); x.stroke();
        arrow(ex + 56, mid, lo - 1, '#8fb300');
        x.fillStyle = '#5c5d57'; x.fillText('värme', ex + 40, hi - 5); x.fillText('ljus', ex + 62, (mid + lo) / 2);
      } else {
        arrow(ex + 14, lo, lo - (lo - hi) * lamp.nm / 365 * 0.48, col);
        x.fillStyle = '#5c5d57'; x.fillText('räcker inte', ex + 24, (lo + hi) / 2 + 6);
      }
    };
    // each slot has one incoming wave per lamp (only the chosen one shows) and one outgoing glow
    for (const q of slots) {
      const ws = { uv: wave(g, LAMPS[0].color, { dashed: true, dash: 0.6, gap: 0.45 }), vi: wave(g, LAMPS[1].color), gr: wave(g, LAMPS[2].color) };
      q.wi = { set: (p, dir, lam, a, o) => { for (const [k, w] of Object.entries(ws)) w.set(p, dir, lam, k === lamp.k ? a : 0, o); } };
      q.wo = wave(g, LIME_D);
    }
    const O0 = V(0, 0, 0), UP = V(0, 1, 0);
    const hide = (q) => { q.wi.set(O0, UP, 1, 0); q.wo.set(O0, UP, 1, 0); };
    const set = (k) => { lamp = LAMPS.find((l) => l.k === k); opts.querySelectorAll('button').forEach((b) => b.classList.toggle('on', b.dataset.k === k)); slots.forEach((q) => { q.on = false; hide(q); }); draw(); };
    opts.onclick = (e) => { const b = e.target.closest('button'); if (b) set(b.dataset.k); };
    set('uv');
    const SPEED = 15, L = 46;
    let spawnT = 0, focus = null;
    return (t, dt) => {
      t = Math.max(0, t);   // the first frame can come just before the scene's clock starts
      const s = sec(dt), glows = lamp.nm < ABSORB_MAX, lamIn = lamp.nm / 100, lamOut = EMIT / 100;
      spawnT += s;
      if (spawnT > 0.85) {
        spawnT = 0;
        const q = slots.find((o) => !o.on);
        if (q) { const gi = grains[Math.floor(R() * grains.length)]; Object.assign(q, { on: true, ph: 'in', t: 0, gi, dir: V(0.42 + R() * 0.15, -1, -0.12 + R() * 0.24).normalize(), out: V((R() - 0.5) * 1.2, 1, (R() - 0.5) * 0.6).normalize() }); focus = q; }
      }
      for (const q of slots) {
        if (!q.on) continue;
        q.t += s;
        const tgt = q.gi.p.clone().add(V(0, q.gi.r * 0.8, 0));
        if (q.ph === 'in') {
          const d = L - q.t * SPEED;
          if (d <= 0) { q.ph = glows ? 'heat' : 'out'; q.t = 0; if (glows) q.gi.hot = 1; else q.out = V(q.dir.x, -q.dir.y, q.dir.z).add(V((R() - 0.5) * 0.3, 0, (R() - 0.5) * 0.3)).normalize(); }
          else q.wi.set(tgt.clone().addScaledVector(q.dir, -d), q.dir, lamIn, Math.min(1, d / 4), { ph: -t * 10 });
          continue;
        }
        if (q.ph === 'heat') {
          q.wi.set(tgt, q.dir, lamIn, 0);
          if (q.t > 0.9) { q.ph = 'out'; q.t = 0; }
          continue;
        }
        const d = q.t * SPEED;
        if (glows) q.wo.set(tgt.clone().addScaledVector(q.out, d), q.out, lamOut, Math.min(1, d / 3) * (1 - smooth(d, L - 10, L)), { ph: -t * 10 });
        else q.wi.set(tgt.clone().addScaledVector(q.out, d), q.out, lamIn, Math.min(1, d / 3) * (1 - smooth(d, L - 10, L)), { ph: -t * 10 });
        if (d > L) { q.on = false; hide(q); }
      }
      grains.forEach((q, i) => {
        q.hot = Math.max(0, q.hot - s * 0.9); q.mat.color.set(0xffffff).lerp(LIME, q.hot);
        const hk = 1 - q.hot; heat[i].visible = q.hot > 0.05 && hk < 0.9; heat[i].scale.setScalar(q.r * (1.2 + hk * 2.5)); heat[i].material.opacity = q.hot * 0.8;
      });
      inLb.element.querySelector('.t').firstChild.textContent = lamp.k === 'uv' ? 'UV-ljus' : lamp.k === 'vi' ? 'Violett ljus' : 'Grönt ljus';
      inLb.element.querySelector('small').textContent = lamp.k === 'uv' ? 'osynligt' : 'synligt';
      outLb.visible = glows;
      const fp = focus?.on ? focus.ph : 'in';
      api.step(!glows ? 4 : fp === 'in' ? (focus && focus.t > 1.6 ? 1 : 0) : fp === 'heat' ? 2 : 3);
      const share = Math.round(lamp.nm / EMIT * 100);
      rd.innerHTML = glows ? `${lamp.name}: färgen <b class="go">lyser</b> grönt vid ${EMIT} nm · ljuset ut har ungefär ${share} % av energin, resten blir värme`
        : `${lamp.name}: för lite energi · färgen lyser inte, ljuset studsar bara tillbaka`;
    };
  },
};

// portrait phones: the wide scenes need a little more room than the engine's own allowance
const roomy = (id, k) => { const v = SCENES[id].view; Object.defineProperty(SCENES[id], 'view', { get: () => (innerWidth < innerHeight ? { ...v, d: v.d * k } : v) }); };
roomy('klorofyll', 1.3); roomy('kloroplast', 1.35); roomy('fluorescens', 1.45);

// ── which cards hop here ──
hop('skogen', { scene: 'klorofyll', dir: 'in', label: 'Barrets klorofyll' });
hop('skogen', { scene: 'kloroplast', dir: 'in', label: 'Fotosyntesen' });
hop('vaxthuset', { scene: 'kloroplast', dir: 'in', label: 'Fotosyntesen i kloroplasten' });
hop('vaxthuset', { scene: 'klorofyll', dir: 'in', label: 'Från barr till klorofyll' });
hop('lungan', { scene: 'lungblasor', dir: 'in', label: 'Lungblåsorna' });
hop('orostunneln', { scene: 'fluorescens', dir: 'in', label: 'UV-ljus och färg som lyser' });
