// Scale hops (docs/skalhopp.md): from an installation, zoom out to what it is about or in to the technology and
// nature behind it. Each scale scene lives in its own THREE.Scene, modelled in convenient display units; `unit` says
// how many metres one unit is, so the scale bar can show the real field width (from 10⁻¹⁰ m atoms to 10² m dams).
// Entering fades over, then the camera keeps travelling in (or out) so the hop reads as one continuous zoom.
import * as THREE from 'three';
import { OrbitControls } from 'three/addons/OrbitControls.js';
import { CSS2DRenderer, CSS2DObject } from 'three/addons/CSS2DRenderer.js';
import { mergeGeometries } from 'three/addons/BufferGeometryUtils.js';
import { solid, lam, C, BOIL, loadMesh, bline, bdash, outline } from './world.js';
import { figure, joints, surfaceSampler } from './figure.js';
export { loadMesh };   // the scene files in js/scenes/ take it from here

const $ = (s) => document.querySelector(s);
const CALM = matchMedia('(prefers-reduced-motion: reduce)');   // less motion: no line boil, no fly-in
const V = (x, y, z) => new THREE.Vector3(x, y, z);
const INK = new THREE.Color(C.ink), LIME = new THREE.Color(C.lime);
const ease = (k) => (k < 0.5 ? 4 * k * k * k : 1 - Math.pow(-2 * k + 2, 3) / 2);
const fmt = (n, d = 0) => n.toLocaleString('sv-SE', { minimumFractionDigits: d, maximumFractionDigits: d });

// ── small drawing helpers, all in the white sketch style of the model ──
const ink = (geom, o = {}) => solid(geom, { mat: o.mat || lam(o.color ?? 0xffffff, o.matOpts || {}), s: o.s ?? 0.1, thr: o.thr ?? 30, shadow: false, lines: o.lines ?? true });
function label(text, sub, pos, parent, cls = '') {
  const el = document.createElement('div');
  el.className = `lb ${cls}`; el.style.setProperty('--stalk', '14px');
  el.innerHTML = `<span class="t">${text}${sub ? `<small>${sub}</small>` : ''}</span><i class="stalk"></i>`;
  const o = new CSS2DObject(el); o.center.set(0, 0); o.position.copy(pos); parent.add(o);
  return o;
}
function poly(points, color = C.ink, o = {}) {
  const g = new THREE.BufferGeometry().setFromPoints(points);
  const m = o.dashed ? bdash({ color, dashSize: o.dash ?? 0.4, gapSize: o.gap ?? 0.3, transparent: true }) : bline({ color, transparent: true });
  const l = new (o.loop ? THREE.LineLoop : THREE.Line)(g, m);
  if (o.dashed) l.computeLineDistances();
  return l;
}
const ring = (axis = 'x', seg = 48) => {   // unit circle facing along an axis
  const p = [];
  for (let i = 0; i < seg; i++) { const a = i / seg * Math.PI * 2, c = Math.cos(a), s = Math.sin(a); p.push(axis === 'x' ? V(0, c, s) : axis === 'y' ? V(c, 0, s) : V(c, s, 0)); }
  return poly(p, C.ink, { loop: true });
};
function canvas(api, w = 300, h = 84) {
  const c = document.createElement('canvas'); c.width = w * 2; c.height = h * 2; c.style.width = '100%'; c.style.maxWidth = w + 'px';
  api.live.append(c);
  const g = c.getContext('2d'); g.scale(2, 2);
  return { c, g, w, h };
}
const readout = (api) => { const p = document.createElement('p'); p.className = 'sc-read'; api.live.append(p); return p; };

// shared with the scene files in js/scenes/, which add their own SCENES and HOPS
export { V, INK, LIME, ease, fmt, ink, label, poly, ring, canvas, readout };

// ── the scenes ──
export const SCENES = {};

// Ultrasound distance sensor (HC-SR04 style; the ESP32 nodes use the same principle). Unit: 1 cm.
SCENES.ultraljud = {
  title: 'Ultraljudssensorn', kick: 'Makro · 10⁻¹ m', unit: 0.01,
  view: { t: [11, 0, 0], d: 46, el: 0.42, az: -0.72 },
  lead: 'En ultraljudssensor mäter avstånd med ljud som är för högt för att höras: den piper och lyssnar efter ekot.',
  steps: ['Styrkortet ger stiftet TRIG en puls på 10 mikrosekunder.', 'Sändaren (T) piper åtta gånger på 40 kHz. Varje våg är 8,6 mm lång.', 'Ljudet studsar mot det som är framför sensorn, till exempel en hand.', 'Mottagaren (R) hör ekot. Stiftet ECHO är högt lika länge som ljudet var på väg.', 'Avstånd = tid × 343 m/s ÷ 2. En millisekund motsvarar ungefär 17 cm.'],
  note: 'Ljudet visas i kraftig slowmotion. Sensorn är förenklad.',
  build(g, api) {
    g.add(ink(new THREE.BoxGeometry(0.16, 2.0, 4.5), { s: 0.06 }));
    for (const [z, n, sub] of [[1.3, 'T', 'sändare'], [-1.3, 'R', 'mottagare']]) {
      g.add(ink(new THREE.CylinderGeometry(0.8, 0.8, 1.2, 28).rotateZ(Math.PI / 2).translate(0.68, 0, z), { s: 0.05 }));
      for (const r of [0.25, 0.5, 0.7]) { const c = ring('x'); c.scale.setScalar(r); c.position.set(1.29, 0, z); g.add(c); }
      label(n, sub, V(1.3, 0.9, z), g);
    }
    g.add(ink(new THREE.BoxGeometry(0.3, 0.45, 1.1).translate(0.23, 0.7, 0), { s: 0.04 }));
    for (let i = 0; i < 4; i++) g.add(ink(new THREE.BoxGeometry(0.06, 0.7, 0.06).translate(-0.05, -1.35, -0.38 + i * 0.254), { s: 0.02 }));
    label('VCC · TRIG · ECHO · GND', 'till ESP32', V(0, -1.75, 0), g, 'topic');
    const hand = new THREE.Group(); hand.add(ink(new THREE.BoxGeometry(0.6, 7, 7), { s: 0.1 })); g.add(hand);
    label('handen', 'eller barnet', V(0.3, 3.6, 0), hand);
    const rings = Array.from({ length: 8 }, () => { const r = ring('x'); g.add(r); return r; });
    const tc = canvas(api), rd = readout(api);
    const per = 2.6, v = 34;   // units per second on screen
    return (t) => {
      const cyc = Math.floor(t / per), k = t % per, Dc = 18 + 8 * Math.sin(cyc * 1.7);
      hand.position.x = Dc + 0.3;
      const path = 2 * (Dc - 1.3), s0 = (k - 0.25) * v;
      rings.forEach((r, i) => {
        const s = s0 - i * 0.86;
        if (s < 0 || s > path) { r.visible = false; return; }
        const out = s < path / 2;
        r.visible = true;
        r.position.set(out ? 1.3 + s : 1.3 + path - s, 0, out ? 1.3 : -1.3);
        r.scale.setScalar(0.75 + s * 0.09);
        r.material.color.copy(out ? INK : LIME); r.material.opacity = 1 - (s / path) * 0.5;
      });
      api.step(k < 0.25 ? 0 : s0 < 8 * 0.86 ? 1 : s0 < path / 2 + 8 * 0.86 ? 2 : s0 < path + 8 * 0.86 ? 3 : 4);
      const us = 2 * Dc * 0.01 / 343 * 1e6;
      rd.innerHTML = `Avstånd <b>${fmt(Dc, 1)} cm</b> · ekot tar <b>${fmt(us)} µs</b>`;
      // timing diagram: TRIG, the 40 kHz burst, ECHO high for the time of flight
      const { g: x, w, h } = tc, span = 3200, X = (u) => 48 + (u / span) * (w - 56);
      x.clearRect(0, 0, w, h); x.font = '600 9px IBM Plex Mono, monospace'; x.fillStyle = '#5c5d57';
      x.fillText('TRIG', 2, 18); x.fillText('40 kHz', 2, 44); x.fillText('ECHO', 2, 70);
      x.strokeStyle = '#0a0b09'; x.lineWidth = 1.2;
      const lvl = (y, a, b) => { x.beginPath(); x.moveTo(X(0), y); x.lineTo(X(a), y); x.lineTo(X(a), y - 10); x.lineTo(X(b), y - 10); x.lineTo(X(b), y); x.lineTo(X(span), y); x.stroke(); };
      lvl(22, 20, 90); lvl(74, 300, 300 + us);
      x.beginPath(); for (let i = 0; i <= 64; i++) { const u = 100 + i * 200 / 64; x.lineTo(X(u), 44 - Math.sin(i / 8 * Math.PI * 2) * 6); } x.stroke();
      const now = k < 0.25 ? (k / 0.25) * 100 : 100 + Math.min(1, s0 / (path + 7)) * (200 + us);
      x.strokeStyle = '#8fb300'; x.beginPath(); x.moveTo(X(now), 4); x.lineTo(X(now), h - 4); x.stroke();
      x.fillStyle = '#8d8e87'; x.fillText(`0 – ${fmt(span)} µs`, w - 92, h - 2);
    };
  },
};

// PIR motion sensor: a Fresnel lens splits the room into zones over a two-halved pyroelectric element. Unit: 1 cm.
SCENES.pir = {
  title: 'PIR-sensorn', kick: 'Makro · 10⁰ m', unit: 0.01,
  view: { t: [32, 2, 0], d: 175, el: 0.82, az: -1.35 },
  lead: 'En PIR-sensor märker när en varm kropp rör sig framför den, utan kamera.',
  steps: ['Alla varma kroppar sänder ut värmestrålning, osynligt infrarött ljus.', 'Fresnellinsen i kupolen delar rummet i zoner och samlar värmen från varje zon på sensorn.', 'Sensorn har två halvor. När en kropp går från en zon till nästa blir den ena halvan varmare än den andra.', 'Skillnaden blir en spänning som svänger plus och minus.', 'Svänger den tillräckligt skickar sensornoden "motion": true till tnt.'],
  note: 'Zonerna är ritade mycket kortare än i verkligheten; de når flera meter ut i rummet, beroende på modell.',
  build(g, api) {
    g.add(ink(new THREE.BoxGeometry(0.16, 3.2, 3.2), { s: 0.06 }));
    const domeMat = lam(0xffffff, { transparent: true, opacity: 0.75 });
    g.add(ink(new THREE.SphereGeometry(1.15, 10, 5, 0, Math.PI * 2, 0, Math.PI / 2).rotateZ(-Math.PI / 2).translate(0.1, 0, 0), { mat: domeMat, s: 0.04, thr: 10 }));
    const halves = [lam(0xd9d8d1), lam(0xd9d8d1)];
    halves.forEach((m, i) => g.add(ink(new THREE.BoxGeometry(0.1, 0.5, 0.24).translate(0.2, 0, i ? 0.14 : -0.14), { mat: m, s: 0.02 })));
    label('Fresnellins', 'delar rummet i zoner', V(0.9, 1.4, 0), g);
    // zones on the floor
    const N = 10, A0 = -50, AW = 10, R = 75, y0 = -3;
    for (let i = 0; i < N; i++) {
      const a0 = THREE.MathUtils.degToRad(A0 + i * AW), a1 = THREE.MathUtils.degToRad(A0 + (i + 1) * AW);
      const sh = new THREE.Shape([new THREE.Vector2(0, 0), new THREE.Vector2(Math.cos(a0) * R, Math.sin(a0) * R), new THREE.Vector2(Math.cos(a1) * R, Math.sin(a1) * R)]);
      const m = new THREE.Mesh(new THREE.ShapeGeometry(sh).rotateX(Math.PI / 2), new THREE.MeshBasicMaterial({ color: i % 2 ? 0xe4e3dc : 0xf6f5f1, side: THREE.DoubleSide }));
      m.position.y = y0; g.add(m);
      const am = THREE.MathUtils.degToRad(A0 + (i + 0.5) * AW);
      label(i % 2 ? '−' : '+', '', V(Math.cos(am) * 30, y0, Math.sin(am) * 30), g, 'topic');
    }
    const person = figure({ h: 16, coat: 3 });
    const heat = new THREE.Mesh(new THREE.SphereGeometry(6, 20, 12), new THREE.MeshBasicMaterial({ color: C.red, transparent: true, opacity: 0.12, depthWrite: false }));
    heat.position.y = 8; person.add(heat); person.position.y = y0; g.add(person);
    label('kroppsvärme', '', V(0, 18, 0), person);
    const tc = canvas(api, 300, 70), rd = readout(api), hist = new Array(150).fill(0);
    let lastSig = 0, hot = 0;
    return (t, dt) => {
      const zx = 44, zz = Math.sin(t * 0.22) * 34;
      person.position.set(zx, y0, zz); person.rotation.y = Math.cos(t * 0.22) > 0 ? 0 : Math.PI;
      const th = THREE.MathUtils.radToDeg(Math.atan2(zz, zx));
      const inside = th > A0 && th < A0 + N * AW;
      const sig = inside ? Math.sin(((th - A0) / AW) * Math.PI) : 0;
      hist.push(sig); hist.shift();
      const moving = Math.abs(sig - lastSig) > 0.002 || Math.abs(sig) > 0.3; lastSig = sig;
      if (Math.abs(sig) > 0.8 && moving) hot = 1.2;
      hot = Math.max(0, hot - dt / 1000);
      halves[0].color.set(sig > 0.15 ? C.red : 0xd9d8d1); halves[1].color.set(sig < -0.15 ? C.red : 0xd9d8d1);
      domeMat.color.set(hot > 0 ? C.lime : 0xffffff);
      api.step(!inside ? 0 : Math.abs(sig) < 0.3 ? 1 : Math.abs(sig) < 0.8 ? 2 : hot > 0.9 ? 4 : 3);
      rd.innerHTML = hot > 0 ? '<b class="go">RÖRELSE</b> · pir skickar {"motion": true}' : 'Ingen rörelse just nu';
      const { g: x, w, h } = tc;
      x.clearRect(0, 0, w, h); x.strokeStyle = '#d6d5ce'; x.beginPath(); x.moveTo(0, h / 2); x.lineTo(w, h / 2); x.stroke();
      x.setLineDash([3, 3]); for (const y of [h / 2 - 22, h / 2 + 22]) { x.beginPath(); x.moveTo(0, y); x.lineTo(w, y); x.stroke(); } x.setLineDash([]);
      x.strokeStyle = '#0a0b09'; x.lineWidth = 1.4; x.beginPath(); hist.forEach((v, i) => x.lineTo(i * w / (hist.length - 1), h / 2 - v * 26)); x.stroke();
      x.fillStyle = '#5c5d57'; x.font = '600 9px IBM Plex Mono, monospace'; x.fillText('spänning, två halvor', 4, 10);
    };
  },
};

// Time-of-flight depth camera (Kinect / Orbbec Femto): IR light out, time back per pixel, point cloud, skeleton. Unit: 10 cm.
SCENES.djupkamera = {
  title: 'Djupkameran', kick: 'Makro · 10⁰ m', unit: 0.1,
  view: { t: [10, 8, 0], d: 47, el: 0.24, az: -0.95 },
  lead: 'En djupkamera ser hur långt bort allt framför den är. Därför kan den hitta kroppar, händer och huvuden, även i mörker.',
  steps: ['Kameran blinkar med infrarött ljus, osynligt för ögat.', 'Ljuset studsar på allt i rummet och kommer tillbaka.', 'Varje pixel mäter hur länge ljuset var borta, några nanosekunder. Det blir en djupbild.', 'Djupbilden blir ett punktmoln av människan.', 'Programmet hittar lederna: huvud, händer, axlar. Bild, ljud eller ljus kan sedan följa dem.'],
  note: 'Ljuset visas extremt långsamt: på riktigt tar resan 13 nanosekunder.',
  build(g, api) {
    g.add(ink(new THREE.BoxGeometry(0.6, 0.6, 2.5), { s: 0.04 }));
    [['IR-ljus', -0.8], ['djupsensor', 0], ['färgkamera', 0.8]].forEach(([n, z], i) => {
      const c = ring('x'); c.scale.setScalar(0.18); c.position.set(0.31, 0, z); g.add(c);
      if (i < 2) label(n, '', V(0.3, 0.5 + i * 0.6, z), g, 'topic');
    });
    // a visitor, two metres away, waving at the camera
    const P = figure({ h: 16.4, arms: true, own: true, coat: 1 }); P.position.x = 20; P.rotation.y = -Math.PI / 2; g.add(P);
    const [armL, armR] = P.userData.arms, pm = P.userData.mats;
    armL.rotation.x = 0.15;
    // point cloud: points on the side of the figure that faces the camera, coloured by depth
    const NP = 1500, cp = new Float32Array(NP * 3), cc = new Float32Array(NP * 3), scanP = surfaceSampler(P, NP), eye = V(0, 8, 0);
    const c0 = new THREE.Color(0x0a0b09), c1 = new THREE.Color(0xbdbcb5), tc = new THREE.Color();
    const cg = new THREE.BufferGeometry(); cg.setAttribute('position', new THREE.BufferAttribute(cp, 3)); cg.setAttribute('color', new THREE.BufferAttribute(cc, 3));
    const cloud = new THREE.Points(cg, new THREE.PointsMaterial({ size: 0.16, vertexColors: true, transparent: true, opacity: 0 }));
    cloud.frustumCulled = false; g.add(cloud);
    const scan = () => {
      scanP(cp, eye);
      for (let i = 0; i < NP; i++) { tc.copy(c0).lerp(c1, THREE.MathUtils.clamp((cp[i * 3] - 18.5) / 3, 0, 1)); cc[i * 3] = tc.r; cc[i * 3 + 1] = tc.g; cc[i * 3 + 2] = tc.b; }
      cg.attributes.position.needsUpdate = true; cg.attributes.color.needsUpdate = true;
    };
    // skeleton, from the figure's joints
    const bones = [['head', 'neck'], ['neck', 'hip'], ['hip', 'lk'], ['lk', 'lf'], ['hip', 'rk'], ['rk', 'rf'], ['neck', 'ls'], ['ls', 'le'], ['le', 'lh'], ['neck', 'rs'], ['rs', 're'], ['re', 'rh']];
    const skel = new THREE.Group(), sb = new Float32Array(bones.length * 6), sg = new THREE.BufferGeometry();
    sg.setAttribute('position', new THREE.BufferAttribute(sb, 3));
    const bl = new THREE.LineSegments(sg, bline({ color: C.lime_d ?? 0x8fb300 })); bl.frustumCulled = false; skel.add(bl);
    const dotG = new THREE.SphereGeometry(0.28, 10, 8), dotM = new THREE.MeshBasicMaterial({ color: C.lime }), dots = {};
    for (const n of ['head', 'neck', 'hip', 'lk', 'rk', 'lf', 'rf', 'ls', 'le', 'lh', 'rs', 're', 'rh']) skel.add(dots[n] = new THREE.Mesh(dotG, dotM));
    const track = () => {
      const J = joints(P);
      bones.forEach(([a, b], i) => { J[a].toArray(sb, i * 6); J[b].toArray(sb, i * 6 + 3); });
      sg.attributes.position.needsUpdate = true;
      for (const [n, d] of Object.entries(dots)) d.position.copy(J[n]).x -= 0.6;   // a little in front of the body
    };
    g.add(skel);
    const wave = ring('x'), back = ring('x'); g.add(wave, back);
    const rd = readout(api);
    return (t) => {
      const per = 8, k = t % per;
      armR.rotation.z = 2.5 + Math.sin(t * 3) * 0.35;
      const out = k < 1.3, ret = k >= 1.3 && k < 2.6;
      wave.visible = out; back.visible = ret;
      if (out) { const s = k / 1.3; wave.position.set(0.4 + s * 19, 8, 0); wave.scale.setScalar(1 + s * 9); wave.material.color.set(C.red); }
      if (ret) { const s = (k - 1.3) / 1.3; back.position.set(19.4 - s * 19, 8, 0); back.scale.setScalar(10 - s * 9); back.material.color.set(0x8fb300); }
      const showCloud = THREE.MathUtils.clamp((k - 2.6) / 0.8, 0, 1) * (k < 7.4 ? 1 : 0);
      cloud.material.opacity = showCloud; for (const m of pm) { m.transparent = true; m.opacity = 1 - showCloud * 0.85; }
      if (showCloud > 0) scan();
      skel.visible = k > 4.8 && k < 7.4; if (skel.visible) track();
      api.step(out ? 0 : ret ? 1 : k < 3.6 ? 2 : k < 4.8 ? 3 : 4);
      rd.innerHTML = 'Avstånd <b>2,0 m</b> · ljuset är borta i <b>13 ns</b> · upp till 370 000 punkter 30 gånger i sekunden, eller 1 miljon 15 gånger i sekunden';
    };
  },
};

// WS2812 addressable LED: three tiny dies and a controller in a 5 mm package; data flows LED to LED. Unit: 1 mm.
SCENES.lysdiod = {
  title: 'Lysdioden WS2812', kick: 'Makro · 10⁻¹ m', unit: 0.001,
  view: { t: [33, 0, 0], d: 105, el: 0.62, az: -0.5 },
  lead: 'Ljusslingorna i utställningen har cirka 28 000 sådana lysdioder. Var och en har en egen liten styrkrets.',
  steps: ['I varje 5 mm-kapsel sitter tre små chip, rött, grönt och blått, och en styrkrets.', 'WLED skickar en lång rad bitar på datatråden, 800 000 bitar per sekund.', 'Första lysdioden tar de första 24 bitarna: 8 för grönt, 8 för rött och 8 för blått.', 'Resten skickar den vidare till nästa lysdiod, och så vidare längs slingan.', 'När raden är slut lyser alla med sin färg. En slinga med 1 000 lysdioder uppdateras på 30 ms.'],
  note: 'Bitarna visas mycket långsamt. Varje fyrkant är en bit: svart = 1, vit = 0.',
  build(g, api) {
    const N = 5, P = 16.7;
    g.add(ink(new THREE.BoxGeometry(N * P + 6, 0.25, 10).translate((N - 1) * P / 2, -0.95, 0), { s: 0.2 }));
    g.add(poly([V(-8, -0.8, 3.6), V((N - 1) * P + 8, -0.8, 3.6)], 0x9a9b94));
    label('DIN', 'data in', V(-7, -0.8, 3.6), g, 'topic');
    const leds = [];
    for (let i = 0; i < N; i++) {
      const x = i * P, grp = new THREE.Group(); grp.position.x = x; g.add(grp);
      grp.add(ink(new THREE.BoxGeometry(5, 1.6, 5), { mat: lam(0xffffff, { transparent: true, opacity: 0.35, depthWrite: false }), s: 0.08 }));
      const dies = [[-1.1, C.red], [0, 0x3aa35b], [1.1, 0x3d6fd6]].map(([z, c]) => { const m = new THREE.MeshBasicMaterial({ color: 0x5c5d57 }); const d = new THREE.Mesh(new THREE.BoxGeometry(0.45, 0.25, 0.45), m); d.position.set(-0.9, -0.3, z); grp.add(d); return { m, c: new THREE.Color(c) }; });
      grp.add(ink(new THREE.BoxGeometry(1.0, 0.2, 1.0).translate(1.0, -0.4, 0), { color: 0x9a9b94, s: 0.02 }));
      for (const [z] of [[-1.1], [0], [1.1]]) grp.add(poly([V(-0.9, -0.15, z), V(0, 0.3, z * 0.4), V(0.6, -0.3, z * 0.2)], 0x5c5d57));
      const glow = new THREE.Mesh(new THREE.CircleGeometry(6, 32).rotateX(-Math.PI / 2), new THREE.MeshBasicMaterial({ transparent: true, opacity: 0, depthWrite: false }));
      glow.position.y = 1.0; grp.add(glow);
      if (i === 0) { label('styrkrets', '', V(1, 0.6, 0), grp, 'topic'); label('R G B', 'tre chip', V(-0.9, 0.6, -2.4), grp, 'topic'); }
      leds.push({ x, dies, glow, on: 0 });
    }
    const PAL = [[0xcafe03, 0x3aa35b, 0xff9e2c, 0x3d6fd6, 0xe0457b], [0x3d6fd6, 0xcafe03, 0xe0457b, 0x3aa35b, 0xff9e2c]];
    const bits = [], BW = 0.55;
    const bm1 = new THREE.MeshBasicMaterial({ color: C.ink }), bm0 = new THREE.MeshBasicMaterial({ color: 0xffffff });
    const bg = new THREE.BoxGeometry(0.42, 0.3, 0.42);
    for (let j = 0; j < N * 24; j++) { const b = new THREE.Mesh(bg, bm0); b.position.set(0, -0.6, 3.6); g.add(b); bits.push(b); }
    const rd = readout(api);
    let lastCyc = -1;
    return (t) => {
      const per = 9, cyc = Math.floor(t / per), k = t % per, pal = PAL[cyc % PAL.length];
      if (cyc !== lastCyc) {   // a new frame: encode each LED's colour as GRB bits
        lastCyc = cyc;
        bits.forEach((b, j) => {
          const c = new THREE.Color(pal[Math.floor(j / 24)]), byte = [c.g, c.r, c.b][Math.floor((j % 24) / 8)] * 255, bit = (byte >> (7 - (j % 8))) & 1;
          b.material = bit ? bm1 : bm0;
        });
        leds.forEach((l) => (l.on = 0));
      }
      const head = -8 + k * 17;   // mm per second on screen
      bits.forEach((b, j) => {
        const x = head - j * BW, li = Math.floor(j / 24), stop = leds[li].x - 2.5;
        b.visible = x > -9 && x < stop && k < 7.6;
        b.position.x = x;
        if (x >= stop && j % 24 === 23) leds[li].on = 1;
      });
      leds.forEach((l, i) => {
        const on = l.on && k < 8.4, c = new THREE.Color(pal[i]);
        l.dies.forEach((d, n) => { const ch = [c.r, c.g, c.b][n]; d.m.color.copy(on ? new THREE.Color(0x5c5d57).lerp(d.c, ch) : new THREE.Color(0x5c5d57)); });
        l.glow.material.color.copy(c); l.glow.material.opacity = on ? 0.32 : 0;
      });
      const lit = leds.filter((l) => l.on).length;
      api.step(k < 1 ? 0 : lit === 0 ? 1 : lit === 1 ? 2 : lit < N ? 3 : 4);
      rd.innerHTML = `${lit} av ${N} lysdioder har fått sin färg · <b>24 bitar</b> per lysdiod`;
    };
  },
};

// A hydropower station in cross-section: dam, intake tunnel, turbine, generator, back to the river. Unit: 1 m.
SCENES.kraftverk = {
  title: 'Vattenkraftverket', kick: 'Ut · 10² m', unit: 1,
  view: { t: [14, -4, 0], d: 160, el: 0.22, az: 0.32 },
  lead: 'Ett vattenkraftverk gör el av vatten som faller. Så här går vattnet, från dammen till generatorn och tillbaka ut i älven.',
  steps: ['Älven dämms upp. Vattnet står högt bakom dammen.', 'Vattnet leds genom en tunnel eller en tub ner till turbinen.', 'Vattnet trycker på turbinens skovlar och får den att snurra.', 'Axeln driver generatorn, som gör el.', 'Vattnet rinner ut i älven igen, och strömmen går ut på samma nät som utställningen får sin el från.'],
  note: 'Schematiskt: inget bestämt kraftverk. Siffrorna är ett räkneexempel med 22 m fallhöjd och 90 % verkningsgrad.',
  build(g, api) {
    // a cut-away: only the back half of the rock and the dam is drawn, so the tunnels and the turbine sit in the cut
    const ex = (pts, depth = 10, mat) => { const s = new THREE.Shape(pts.map(([x, y]) => new THREE.Vector2(x, y))); return ink(new THREE.ExtrudeGeometry(s, { depth, bevelEnabled: false }).translate(0, 0, -depth - 2.2), { mat, s: 0.6, thr: 40 }); };
    g.add(ex([[-70, -32], [75, -32], [75, -9], [44, -9], [41, -4], [9, -4], [7, 0], [-70, 0]], 18, lam(0xeeede7)));
    g.add(ex([[-5, 0], [7, 0], [-1, 22], [-5, 22]]));
    label('Dammen', '', V(-3, 23, 0), g);
    const water = (x0, x1, y0, y1) => { const m = new THREE.Mesh(new THREE.BoxGeometry(x1 - x0, y1 - y0, 12), new THREE.MeshBasicMaterial({ color: C.water, transparent: true, opacity: 0.75 })); m.position.set((x0 + x1) / 2, (y0 + y1) / 2, -6.2); g.add(m); };
    water(-70, -5, 0, 18); water(41, 75, -9, -5);
    label('Magasinet', 'högt vatten', V(-40, 19, 0), g); label('Älven nedströms', '', V(58, -4.5, 0), g);
    const pen = new THREE.CatmullRomCurve3([V(-8, 9, 0), V(-1, 5, 0), V(9, -6, 0), V(19, -15, 0), V(24, -17, 0)]);
    const draft = new THREE.CatmullRomCurve3([V(24, -18, 0), V(27, -23, 0), V(35, -21, 0), V(43, -8, 0)]);
    const tubeMat = lam(0xffffff, { transparent: true, opacity: 0.45, depthWrite: false });
    g.add(ink(new THREE.TubeGeometry(pen, 60, 1.7, 14), { mat: tubeMat, s: 0.3, thr: 60 }), ink(new THREE.TubeGeometry(draft, 40, 1.9, 14), { mat: tubeMat, s: 0.3, thr: 60 }));
    label('Tunneln', 'som Vattentunneln i rum 1', V(8, -2, 0), g);
    // turbine runner + shaft + generator
    const runner = new THREE.Group(); runner.position.set(24, -17.5, 0); g.add(runner);
    runner.add(ink(new THREE.CylinderGeometry(1.1, 0.8, 1.6, 16), { s: 0.1 }));
    for (let i = 0; i < 10; i++) { const b = ink(new THREE.BoxGeometry(2.3, 1.3, 0.22), { s: 0.06 }); const a = i / 10 * Math.PI * 2; b.position.set(Math.cos(a) * 1.6, 0, Math.sin(a) * 1.6); b.rotation.y = -a; b.rotation.x = 0.5; runner.add(b); }
    label('Turbinen', '', V(26, -15, 0), g);
    g.add(ink(new THREE.CylinderGeometry(0.35, 0.35, 19, 8).translate(24, -7.5, 0), { s: 0.06 }));
    const gen = new THREE.Group(); gen.position.set(24, 3.5, 0); g.add(gen);
    gen.add(ink(new THREE.CylinderGeometry(4, 4, 3.2, 28), { s: 0.2, thr: 40 }));
    for (let i = 0; i < 8; i++) { const a = i / 8 * Math.PI * 2; gen.add(poly([V(Math.cos(a) * 4.02, -1.6, Math.sin(a) * 4.02), V(Math.cos(a) * 4.02, 1.6, Math.sin(a) * 4.02)])); }
    label('Generatorn', 'el', V(28, 6, 0), g);
    g.add(ink(new THREE.BoxGeometry(18, 13, 16).translate(24, 2.5, 0), { mat: lam(0xffffff, { transparent: true, opacity: 0.18, depthWrite: false }), s: 0.4 }));
    // power line out
    const py = (x) => { g.add(poly([V(x - 2, -4, 0), V(x, 16, 0), V(x + 2, -4, 0)]), poly([V(x - 4, 13, 0), V(x + 4, 13, 0)])); };
    py(52); py(70);
    const wire = new THREE.QuadraticBezierCurve3(V(28, 6, 0), V(40, 8, 0), V(52, 13, 0)), wire2 = new THREE.QuadraticBezierCurve3(V(52, 13, 0), V(61, 10, 0), V(70, 13, 0));
    g.add(poly(wire.getPoints(30), 0x5c5d57), poly(wire2.getPoints(30), 0x5c5d57));
    label('Elnätet', '', V(70, 16, 0), g);
    const sparks = Array.from({ length: 6 }, () => { const s = new THREE.Mesh(new THREE.SphereGeometry(0.6, 10, 8), new THREE.MeshBasicMaterial({ color: C.lime })); g.add(s); return s; });
    // water particles: reservoir → tunnel → turbine → draft tube → river
    const NP = 220, pp = new Float32Array(NP * 3), seed = Array.from({ length: NP }, () => [Math.random(), (Math.random() - 0.5) * 2, (Math.random() - 0.5) * 2]);
    const pg = new THREE.BufferGeometry(); pg.setAttribute('position', new THREE.BufferAttribute(pp, 3));
    g.add(new THREE.Points(pg, new THREE.PointsMaterial({ color: 0x3f6a74, size: 0.55 })));
    const sl = document.createElement('label'); sl.className = 'sc-ctl';
    sl.innerHTML = 'Flöde <input type="range" min="20" max="300" value="150"> <output></output>';
    api.live.append(sl); const inp = sl.querySelector('input'), out = sl.querySelector('output');
    const rd = readout(api);
    let ang = 0, u0 = 0;
    return (t, dt) => {
      const Q = +inp.value, s = dt / 1000, P = 1000 * 9.81 * Q * 22 * 0.9 / 1e6;
      out.textContent = `${Q} m³/s`;
      ang += s * Q * 0.02; runner.rotation.y = ang; gen.rotation.y = ang;
      u0 += s * Q * 0.0011;
      for (let i = 0; i < NP; i++) {
        const u = (seed[i][0] + u0) % 1, p = u < 0.62 ? pen.getPointAt(u / 0.62) : draft.getPointAt((u - 0.62) / 0.38);
        pp[i * 3] = p.x + seed[i][1] * 0.9; pp[i * 3 + 1] = p.y + seed[i][2] * 0.9; pp[i * 3 + 2] = seed[i][2] * 1.1;
      }
      pg.attributes.position.needsUpdate = true;
      sparks.forEach((sp, i) => { const u = (t * 0.25 * (Q / 150) + i / sparks.length) % 1; sp.position.copy(u < 0.5 ? wire.getPointAt(u * 2) : wire2.getPointAt(u * 2 - 1)); });
      api.step(Math.floor(t / 2.4) % 5);
      rd.innerHTML = `Effekt ≈ <b>${fmt(P, 0)} MW</b> · räcker till ungefär ${fmt(Math.round(P * 1000 / 11 / 100) * 100)} elbilar som laddar med 11 kW samtidigt`;
    };
  },
};

// Metal crystal lattice (copper from Boliden; gold, silver, palladium back from scrapped phones; zinc and lead from the
// Skellefte field's ore). Unit: 1 Å = 10⁻¹⁰ m. [name, a, metallic radius, colour, c for hexagonal close-packed]
const METALS = { Cu: ['Koppar', 3.615, 1.28, 0xe7b48f], Ag: ['Silver', 4.086, 1.44, 0xe9e9e6], Au: ['Guld', 4.078, 1.44, 0xf2d37a], Pd: ['Palladium', 3.891, 1.37, 0xd7d7d0], Zn: ['Zink', 2.665, 1.34, 0xc9ccd0, 4.947], Pb: ['Bly', 4.950, 1.75, 0xb7b9be] };
SCENES.gitter = {
  title: 'Metallens kristallgitter', kick: 'Mikro · 10⁻⁹ m', unit: 1e-10,
  view: { t: [0, 0, 0], d: 46, el: 0.42, az: 0.7 },
  lead: 'Guld, koppar, silver, zink och bly bryts ur berget runt Skellefteå och tas tillvara ur elektronikskrot. På atomnivå ligger metallens atomer i ordnade mönster.',
  steps: ['Malmen från gruvan innehåller metall bunden i mineral.', 'I smältverket blir den ren metall, och samma sak händer med elektronikskrot.', 'Atomerna ligger i ett ordnat gitter, några tiondels nanometer från varandra.', 'De yttersta elektronerna sitter inte fast utan vandrar fritt. Därför leder metallen ström.', 'Koppar, silver, guld, palladium och bly har samma kubiska gitter. Zink packar sina atomer i sexkantiga lager, och varje lager ligger i groparna i lagret under.'],
  note: 'Atomerna är ritade som kulor, hälften så stora som de är, så att gittret syns. I verkligheten är de moln av elektroner runt en kärna. Gittermåtten är avrundade.',
  build(g, api) {
    const n = 3, maxA = 200, geo = new THREE.IcosahedronGeometry(1, 2), mat = lam(0xffffff);
    const atoms = new THREE.InstancedMesh(geo, mat, maxA); g.add(atoms);
    const atomLine = new THREE.InstancedMesh(geo, outline(), maxA); atomLine.instanceMatrix = atoms.instanceMatrix; g.add(atomLine);   // ink outlines, like everything else
    const cells = new THREE.LineSegments(new THREE.BufferGeometry(), bline({ color: C.ink, transparent: true, opacity: 0.55 })); g.add(cells);
    const NE = 70, ep = new Float32Array(NE * 3), eg = new THREE.BufferGeometry(); eg.setAttribute('position', new THREE.BufferAttribute(ep, 3));
    g.add(new THREE.Points(eg, new THREE.PointsMaterial({ color: 0x8fb300, size: 0.45 })));
    const eS = Array.from({ length: NE }, () => [Math.random(), Math.random(), Math.random(), Math.random() * 6]);
    let base = [], a = 3.6, r = 1.28, W = n * a, key = 'Cu';
    const btns = document.createElement('div'); btns.className = 'sc-opts';
    btns.innerHTML = Object.entries(METALS).map(([k, m]) => `<button data-k="${k}">${k} · ${m[0]}</button>`).join('');
    api.live.append(btns);
    const rd = readout(api), dummy = new THREE.Object3D();
    // face-centred cubic: n × n × n cubes with an atom in every corner and every face
    function fcc(L) {
      const off = -n * a / 2, seen = new Set();
      const add = (x, y, z) => { const id = [x, y, z].map((v) => Math.round(v * 2)).join(); if (seen.has(id) || [x, y, z].some((v) => v > n + 1e-6)) return; seen.add(id); base.push(V(off + x * a, off + y * a, off + z * a)); };
      for (let i = 0; i <= n; i++) for (let j = 0; j <= n; j++) for (let l = 0; l <= n; l++) { add(i, j, l); add(i + 0.5, j + 0.5, l); add(i + 0.5, j, l + 0.5); add(i, j + 0.5, l + 0.5); }
      for (let i = 0; i <= n; i++) for (let j = 0; j <= n; j++) { L.push(off + i * a, off + j * a, off, off + i * a, off + j * a, off + n * a, off, off + i * a, off + j * a, off + n * a, off + i * a, off + j * a, off + i * a, off, off + j * a, off + i * a, off + n * a, off + j * a); }
      W = n * a;
    }
    // hexagonal close-packed: flat hexagonal layers A B A B A, each B atom in a hollow of the layer below
    function hcp(L, c) {
      const R3 = Math.sqrt(3), XZ = (i, j) => [i * a + j * a / 2, j * a * R3 / 2], hex = (i, j) => Math.max(Math.abs(i), Math.abs(j), Math.abs(i + j));
      const site = [];
      for (let i = -2; i <= 2; i++) for (let j = -2; j <= 2; j++) if (hex(i, j) <= 2) site.push([i, j]);
      const inA = new Set(site.map(([i, j]) => `${i},${j}`));
      for (let l = -1; l <= 1; l++) {
        const y = l * c;
        for (const [i, j] of site) { const [x, z] = XZ(i, j); base.push(V(x, y, z)); }
        for (const [i, j] of site) for (const [di, dj] of [[1, 0], [0, 1], [-1, 1]]) if (inA.has(`${i + di},${j + dj}`)) { const [x0, z0] = XZ(i, j), [x1, z1] = XZ(i + di, j + dj); L.push(x0, y, z0, x1, y, z1); }
        if (l < 1) for (let i = -2; i <= 2; i++) for (let j = -2; j <= 2; j++) if (hex(i + 1 / 3, j + 1 / 3) <= 1.7) { const [x, z] = XZ(i + 1 / 3, j + 1 / 3); base.push(V(x, y + c / 2, z)); }
      }
      for (const [i, j] of [[2, 0], [0, 2], [-2, 2], [-2, 0], [0, -2], [2, -2]]) { const [x, z] = XZ(i, j); L.push(x, -c, z, x, c, z); }
      W = 4 * a;
    }
    function set(k) {
      key = k; const [name, A, R, col, Cc] = METALS[k]; a = A; r = R; mat.color.set(col).lerp(new THREE.Color(0xffffff), 0.55);   // a pale tint of the metal
      btns.querySelectorAll('button').forEach((b) => b.classList.toggle('on', b.dataset.k === k));
      base = []; const L = [];
      Cc ? hcp(L, Cc) : fcc(L);
      atoms.count = base.length; atomLine.count = base.length;
      cells.geometry.dispose(); cells.geometry = new THREE.BufferGeometry(); cells.geometry.setAttribute('position', new THREE.Float32BufferAttribute(L, 3));
      rd.innerHTML = Cc
        ? `${name} · sexkantiga lager · grannarna i ett lager <b>${fmt(a / 10, 3)} nm</b> isär · mönstret upprepas var <b>${fmt(Cc / 10, 3)} nm</b> uppåt`
        : `${name} · avstånd mellan kubens hörn <b>${fmt(a / 10, 3)} nm</b> · en millimeter rymmer ungefär ${fmt(Math.round(1e7 / a / 1e5) * 1e5)} kuber i rad`;
    }
    // a bigger lattice (lead) gets a camera that eases back so the whole block stays in view
    btns.onclick = (e) => { const b = e.target.closest('button'); if (b) { set(b.dataset.k); api.fly([0, 0, 0], 46 * Math.max(1, W / (n * 3.615)), { dur: 1400 }); } };
    set('Cu');
    return (t) => {
      base.forEach((p, i) => { dummy.position.set(p.x + Math.sin(t * 7 + i) * 0.07, p.y + Math.sin(t * 6.3 + i * 1.7) * 0.07, p.z + Math.sin(t * 5.1 + i * 2.3) * 0.07); dummy.scale.setScalar(r * 0.5); dummy.updateMatrix(); atoms.setMatrixAt(i, dummy.matrix); });
      atoms.instanceMatrix.needsUpdate = true;
      eS.forEach((e, i) => { const x = ((e[0] + t * 0.06) % 1) * W - W / 2; ep[i * 3] = x; ep[i * 3 + 1] = (e[1] - 0.5) * W + Math.sin(t * 2 + e[3]) * 0.5; ep[i * 3 + 2] = (e[2] - 0.5) * W + Math.cos(t * 1.7 + e[3]) * 0.5; });
      eg.attributes.position.needsUpdate = true;
      api.step(Math.floor(t / 3) % 5);
    };
  },
};

// A nerve cell next to an artificial neuron (Dialogen's AI and Sokrates' questions about AI). Unit: 1 µm.
SCENES.neuron = {
  title: 'Nervcell och artificiellt neuron', kick: 'Mikro · 10⁻⁴ m', unit: 1e-6,
  view: { t: [68, -26, 0], d: 400, el: 0.2, az: 0.06 },
  lead: 'AI bygger på nätverk av neuroner, i hjärnan och i datorn. Här ligger en nervcell bredvid ett artificiellt neuron.',
  steps: ['En nervcell tar emot signaler i sina förgreningar, dendriterna.', 'Blir summan tillräckligt stor skickar cellen en nervimpuls längs axonet. Den hoppar mellan luckorna i myelinet, upp till ungefär 120 m/s.', 'Vid synapsen går signalen vidare till nästa cell.', 'Ett artificiellt neuron gör något liknande med siffror: det väger ihop sina in-värden och skickar ut ett tal.', 'Hjärnan har ungefär 86 miljarder nervceller. En stor språkmodell har miljarder vikter, de största mer än tusen miljarder.'],
  note: 'Förenklad nervcell. Det artificiella neuronet visar principen, inte en bestämd modell.',
  build(g, api) {
    const soma = new THREE.IcosahedronGeometry(9, 2), sp = soma.attributes.position;
    for (let i = 0; i < sp.count; i++) { const v = V(sp.getX(i), sp.getY(i), sp.getZ(i)); v.multiplyScalar(1 + Math.sin(v.x * 0.7) * 0.06 + Math.cos(v.y * 0.9) * 0.05); sp.setXYZ(i, v.x, v.y, v.z); }
    soma.computeVertexNormals(); g.add(ink(soma, { s: 0.3, thr: 25 }));
    label('Cellkroppen', '', V(-4, 12, 0), g);
    let rs = 3;
    const rnd = () => { rs = (rs * 16807) % 2147483647; return rs / 2147483647; };
    const dend = [];
    const branch = (from, dir, len, rad, depth) => {
      const mid = from.clone().addScaledVector(dir, len * 0.5).add(V((rnd() - 0.5) * 8, (rnd() - 0.5) * 8, (rnd() - 0.5) * 8)), end = from.clone().addScaledVector(dir, len);
      const c = new THREE.CatmullRomCurve3([from, mid, end]); dend.push(c);
      g.add(ink(new THREE.TubeGeometry(c, 12, rad, 6), { s: 0.2, thr: 60 }));
      if (depth > 0) for (let k = 0; k < 2; k++) branch(end, dir.clone().add(V((rnd() - 0.5) * 1.2, (rnd() - 0.5) * 1.2, (rnd() - 0.5) * 1.2)).normalize(), len * 0.7, rad * 0.65, depth - 1);
    };
    for (let i = 0; i < 6; i++) { const a = Math.PI * 0.6 + i / 5 * Math.PI * 0.8, d = V(Math.cos(a), Math.sin(a) * 0.9, (rnd() - 0.5) * 0.8).normalize(); branch(d.clone().multiplyScalar(8), d, 26, 1.4, 2); }
    label('Dendriter', 'tar emot', V(-38, 22, 0), g);
    const axon = new THREE.CatmullRomCurve3([V(8, 0, 0), V(40, 3, 0), V(80, -2, 0), V(120, 2, 0), V(150, 0, 0)]);
    g.add(ink(new THREE.TubeGeometry(axon, 80, 0.9, 6), { s: 0.2, thr: 60 }));
    const gaps = [];
    for (let i = 0; i < 6; i++) {
      const u0 = 0.08 + i * 0.15, u1 = u0 + 0.13, p0 = axon.getPointAt(u0), p1 = axon.getPointAt(u1), mid = p0.clone().lerp(p1, 0.5);
      const m = ink(new THREE.CapsuleGeometry(2.3, p0.distanceTo(p1) - 4.6, 4, 10).rotateZ(Math.PI / 2), { s: 0.2, thr: 30 });
      m.position.copy(mid); m.rotation.z = Math.atan2(p1.y - p0.y, p1.x - p0.x); g.add(m);
      gaps.push(axon.getPointAt(u1 + 0.01));
    }
    label('Axon med myelin', 'skickar vidare', V(70, 7, 0), g);
    const term = []; for (let k = 0; k < 4; k++) { const e = V(166 + rnd() * 6, (k - 1.5) * 7, (rnd() - 0.5) * 6); const c = new THREE.CatmullRomCurve3([V(150, 0, 0), V(157, (k - 1.5) * 3, 0), e]); g.add(ink(new THREE.TubeGeometry(c, 10, 0.6, 6), { s: 0.1, thr: 60 })); const b = ink(new THREE.SphereGeometry(1.9, 10, 8), { s: 0.1 }); b.position.copy(e); g.add(b); term.push(c); }
    label('Synapser', 'till nästa cell', V(170, 14, 0), g);
    const spike = new THREE.Mesh(new THREE.SphereGeometry(2.6, 14, 10), new THREE.MeshBasicMaterial({ color: C.lime })); g.add(spike);
    const ins = Array.from({ length: 5 }, () => { const s = new THREE.Mesh(new THREE.SphereGeometry(1.2, 10, 8), new THREE.MeshBasicMaterial({ color: 0x8fb300 })); g.add(s); return s; });
    // artificial neuron, drawn as a diagram below
    const Y = -62, inY = [Y + 18, Y + 6, Y - 6, Y - 18], w = [0.8, -0.3, 0.6, 0.4];
    const node = (x, y, r) => { const c = ring('z'); c.scale.setScalar(r); c.position.set(x, y, 0); g.add(c); };
    inY.forEach((y, i) => { node(20, y, 3); g.add(poly([V(23, y, 0), V(77, Y, 0)], w[i] > 0 ? C.ink : 0xb3b2aa)); });
    node(80, Y, 6); node(140, Y, 3); g.add(poly([V(86, Y, 0), V(137, Y, 0)]));
    g.add(poly(Array.from({ length: 21 }, (_, i) => V(98 + i, Y + 8 + 6 / (1 + Math.exp(-(i - 10) * 0.6)), 0)), 0x5c5d57));
    label('Σ', 'väg ihop', V(80, Y + 8, 0), g, 'topic'); label('Artificiellt neuron', 'samma princip, med siffror', V(6, Y + 28, 0), g);
    const inL = inY.map((y, i) => label('0,0', `× ${fmt(w[i], 1)}`, V(4, y, 0), g, 'topic')), outL = label('0,00', 'ut', V(144, Y + 3, 0), g, 'topic');
    const dots = inY.map(() => { const s = new THREE.Mesh(new THREE.SphereGeometry(1.2, 8, 6), new THREE.MeshBasicMaterial({ color: 0x8fb300 })); g.add(s); return s; });
    const outDot = new THREE.Mesh(new THREE.SphereGeometry(1.6, 8, 6), new THREE.MeshBasicMaterial({ color: C.lime })); g.add(outDot);
    let cyc = -1, xs = [0, 0, 0, 0];
    return (t) => {
      const per = 5, k = t % per, c = Math.floor(t / per);
      if (c !== cyc) {
        cyc = c; xs = xs.map((_, i) => Math.round(((Math.sin(c * 2.1 + i * 1.3) + 1) / 2) * 10) / 10);
        inL.forEach((l, i) => (l.element.querySelector('.t').firstChild.textContent = fmt(xs[i], 1)));
        const sum = xs.reduce((s, x, i) => s + x * w[i], 0); outL.element.querySelector('.t').firstChild.textContent = fmt(1 / (1 + Math.exp(-4 * (sum - 0.6))), 2);
      }
      ins.forEach((s, i) => { const d = dend[(i * 7) % dend.length], u = THREE.MathUtils.clamp(1 - k / 1.2, 0, 1); s.visible = k < 1.2; s.position.copy(d.getPointAt(u)); });
      const hop = THREE.MathUtils.clamp((k - 1.2) / 2.2, 0, 1), gi = Math.min(gaps.length - 1, Math.floor(hop * gaps.length));
      spike.visible = k > 1.2 && k < 3.6; spike.position.copy(k < 3.4 ? gaps[gi] : term[0].getPointAt(Math.min(1, (k - 3.4) / 0.2)));
      dots.forEach((d, i) => { const u = THREE.MathUtils.clamp((k - 1.2) / 1.2, 0, 1); d.visible = k > 1.2 && k < 2.4; d.position.set(23 + u * 54, inY[i] + (Y - inY[i]) * u, 0); });
      outDot.visible = k > 2.4 && k < 3.6; outDot.position.set(86 + THREE.MathUtils.clamp((k - 2.4) / 1.2, 0, 1) * 51, Y, 0);
      api.step(k < 1.2 ? 0 : k < 3.4 ? 1 : k < 3.8 ? 2 : k < 4.4 ? 3 : 4);
    };
  },
};

// Maskinisterna: two hands over two ultrasound sensors make two tones; in tune the beating stops and the bulb burns steady.
SCENES.ackord = {
  title: 'Två toner som stämmer', kick: 'Makro · 10⁻¹ m', unit: 0.01,
  view: { t: [11, 7, 0], d: 158, el: 0.32, az: -0.22 },
  lead: 'Två toner som nästan stämmer svävar: ljudet växer och krymper. När de stämmer blir klangen stilla.',
  steps: ['Två toner spelas samtidigt. Här bestäms de av två avstånd, ett grovt och ett fint.', 'Avstånden blir två toner som nästan är lika.', 'När tonerna skiljer sig lite svävar ljudet: det växer och krymper i takt med skillnaden.', 'När de stämmer försvinner svävningen, och ackordet C–D#–F#–A löser upp sig.', 'Klangen blir stilla. Det kan styra något annat, till exempel en lampa som slutar flimra.'],
  note: 'Vågorna är ritade mycket långsammare och längre än de låter. Dra i reglaget för att stämma själv.',
  build(g, api) {
    const sens = (z) => { const b = new THREE.Group(); b.add(ink(new THREE.BoxGeometry(4.5, 0.16, 2), { s: 0.06 })); for (const x of [-1.3, 1.3]) b.add(ink(new THREE.CylinderGeometry(0.8, 0.8, 1.2, 24).translate(x, 0.68, 0), { s: 0.05 })); b.position.set(-24, 0, z); g.add(b); };
    sens(-6); sens(6);
    const hands = [-6, 6].map((z) => { const h = ink(new THREE.BoxGeometry(6, 0.8, 4), { s: 0.1 }); h.position.set(-24, 15, z); g.add(h); return h; });
    label('grov', 'sensor 1', V(-24, 2, -6), g, 'topic'); label('fin', 'sensor 2', V(-24, 2, 6), g, 'topic');
    const N = 220, X0 = -12, X1 = 32;
    const mk = (color) => { const l = poly(Array.from({ length: N }, (_, i) => V(X0 + (X1 - X0) * i / (N - 1), 0, 0)), color); g.add(l); return l; };
    const w1 = mk(0x5c5d57), w2 = mk(0x5c5d57), sum = mk(C.ink);
    label('ton 1', '', V(X0, 21, 0), g, 'topic'); label('ton 2', '', V(X0, 13, 0), g, 'topic'); label('tillsammans', 'svävning', V(X0, 4, 0), g, 'topic');
    // the bulb: glass, filament, glow
    const bulb = new THREE.Group(); bulb.position.set(44, 4, 0); g.add(bulb);
    bulb.add(ink(new THREE.SphereGeometry(5, 20, 14), { mat: lam(0xffffff, { transparent: true, opacity: 0.25, depthWrite: false }), s: 0.1, thr: 20 }));
    bulb.add(ink(new THREE.CylinderGeometry(2, 2.2, 4, 16).translate(0, -6.5, 0), { s: 0.08 }));
    const fil = poly(Array.from({ length: 13 }, (_, i) => V(-2.4 + i * 0.4, i % 2 ? 0.6 : -0.6, 0)), C.ink); bulb.add(fil);
    const glow = new THREE.Mesh(new THREE.SphereGeometry(4.6, 20, 14), new THREE.MeshBasicMaterial({ color: 0xffc35a, transparent: true, opacity: 0, depthWrite: false })); bulb.add(glow);
    label('Glödlampan', 'via TRIAC', V(44, 11, 0), g);
    const sl = document.createElement('label'); sl.className = 'sc-ctl';
    sl.innerHTML = 'Hand 2 <input type="range" min="-30" max="30" value="18"> <output></output>'; api.live.append(sl);
    const inp = sl.querySelector('input'), out = sl.querySelector('output');
    let touched = false; inp.oninput = () => (touched = true);
    const tc = canvas(api, 300, 64), rd = readout(api);
    return (t) => {
      if (!touched) inp.value = Math.round(Math.sin(t * 0.25) * 26);
      const det = +inp.value, harm = Math.max(0, 1 - Math.abs(det) / 18);   // ±15 % tolerance in the code; here in "cents" for the eye
      out.textContent = `${det > 0 ? '+' : ''}${det}`;
      hands[1].position.y = 15 + det * 0.18;
      const f1 = 1.6, f2 = f1 * (1 + det / 160), ph = t * 2.2;
      const set = (l, fn, y0) => { const a = l.geometry.attributes.position; for (let i = 0; i < N; i++) { const x = X0 + (X1 - X0) * i / (N - 1); a.setXYZ(i, x, y0 + fn(x), 0); } a.needsUpdate = true; };
      set(w1, (x) => Math.sin(x * f1 - ph) * 2.2, 21); set(w2, (x) => Math.sin(x * f2 - ph * (f2 / f1)) * 2.2, 13);
      set(sum, (x) => (Math.sin(x * f1 - ph) + Math.sin(x * f2 - ph * (f2 / f1))) * 2.2, 4);
      const steady = harm >= 0.8, flick = steady ? 1 : 0.25 + Math.random() * 0.55 * (0.4 + harm);
      glow.material.opacity = 0.18 + flick * 0.5; fil.material.color.set(steady ? 0xc77700 : C.ink);
      api.step(steady ? 4 : harm > 0.6 ? 3 : Math.abs(det) > 22 ? 0 : harm > 0.2 ? 2 : 1);
      rd.innerHTML = steady ? '<b class="go">Ackordet stämmer</b> · lampan brinner stadigt' : `Svävning: ljudet går upp och ner · harmoni <b>${fmt(harm, 2)}</b>`;
      // mains through the TRIAC: the whole sine when in tune, chopped (and jittering) when not
      const { g: x, w, h } = tc, cut = steady ? 0 : 0.35 + (1 - harm) * 0.4 + Math.random() * 0.1;
      x.clearRect(0, 0, w, h); x.strokeStyle = '#d6d5ce'; x.beginPath(); x.moveTo(0, h / 2); x.lineTo(w, h / 2); x.stroke();
      x.strokeStyle = '#0a0b09'; x.lineWidth = 1.4; x.beginPath();
      for (let i = 0; i <= 200; i++) { const p = i / 200 * 4 * Math.PI, inHalf = (p % Math.PI) / Math.PI, v = inHalf < cut ? 0 : Math.sin(p); x.lineTo(i / 200 * w, h / 2 - v * 24); }
      x.stroke(); x.fillStyle = '#5c5d57'; x.font = '600 9px IBM Plex Mono, monospace'; x.fillText('växelström genom TRIAC:en', 4, 10);
    };
  },
};

// ── the big map (tools/region.py → data/region.json): kilometres, origin at the museum, x east, z south ──
let REGION = null;
const region = () => (REGION ||= fetch('data/region.json').then((r) => r.json()));
const mapTex = (url) => { const t = new THREE.TextureLoader().load(url); t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = 8; return t; };
const EX = 6;   // the valley's heights are drawn six times taller than they are, or the mountains would not show
const lineSegs = (list, color, opacity = 1) => {   // [{ y, p: [x, z, x, z …] }] → one LineSegments
  const a = [];
  for (const { y, p } of list) for (let i = 0; i < p.length - 2; i += 2) a.push(p[i], y, p[i + 1], p[i + 2], y, p[i + 3]);
  const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.Float32BufferAttribute(a, 3));
  return new THREE.LineSegments(g, bline({ color, transparent: opacity < 1, opacity }));
};
function path(xz, yOf) {   // a polyline with arc length, for things that travel along it
  const P = [], L = [0];
  for (let i = 0; i < xz.length; i += 2) P.push(V(xz[i], yOf(xz[i], xz[i + 1], i / 2), xz[i + 1]));
  for (let i = 1; i < P.length; i++) L.push(L[i - 1] + P[i].distanceTo(P[i - 1]));
  const len = L[L.length - 1];
  const at = (u, out = V(0, 0, 0)) => {
    const s = THREE.MathUtils.clamp(u, 0, 1) * len; let lo = 0, hi = L.length - 1;
    while (hi - lo > 1) { const m = (lo + hi) >> 1; L[m] < s ? (lo = m) : (hi = m); }
    return out.lerpVectors(P[lo], P[hi], (s - L[lo]) / (L[hi] - L[lo] || 1));
  };
  return { P, len, at };
}
function flowDots(g, n, size, color) {
  const pos = new Float32Array(n * 3), geo = new THREE.BufferGeometry(); geo.setAttribute('position', new THREE.BufferAttribute(pos, 3));
  const pts = new THREE.Points(geo, new THREE.PointsMaterial({ color, size, sizeAttenuation: false, depthTest: false, transparent: true }));
  pts.renderOrder = 3; g.add(pts);
  return { pos, geo, pts };
}

SCENES.alvdalen = {
  title: 'Skellefteälven', kick: 'Ut · 10⁵ m', unit: 1000,
  view: { t: [-92, 0, -70], d: 650, el: 1.0, az: 0.12, from: [0, 0, 0], d0: 45, dur: 3800 },
  lead: 'Skellefteälven börjar i fjällen vid norska gränsen, går genom stora sjöar och en lång rad kraftverk och når havet vid Ursviken.',
  steps: ['Fjällen vid norska gränsen. Högst upp ligger de reglerade sjöarna Sädvajaure och Riebnes.', 'Hornavan, Uddjaure och Storavan: stora sjöar där vattnet samlas.', 'Kraftverk efter kraftverk. Samma vatten driver turbin efter turbin på vägen ner.', 'Skellefteå. Museet och utställningen ligger vid älven i Nordanå.', 'Älven når Bottenviken vid Ursviken, strax väster om Skelleftehamn.'],
  note: 'Höjderna är ritade sex gånger högre än verkligheten. Älvens väg genom sjöarna är förenklad. Karta: OpenStreetMap-bidragsgivare (ODbL). Höjder: Mapzen Terrain Tiles. Kraftverkens lägen kommer från OpenStreetMap; Kvistforsen saknas där. Längden 423 km är SMHI:s.',
  build(g, api) {
    const rd = readout(api), prof = canvas(api, 300, 84), sum = readout(api);
    let upd = null;
    region().then(({ valley: v }) => {
      const [x0, z0, x1, z1] = v.box, { w, h, cell, elev } = v;
      const hAt = (x, z) => {   // the terrain mesh's own height (bilinear on the grid)
        const fx = THREE.MathUtils.clamp((x - x0) / cell, 0, w - 1.001), fz = THREE.MathUtils.clamp((z - z0) / cell, 0, h - 1.001);
        const i = Math.floor(fx), j = Math.floor(fz), a = fx - i, b = fz - j, e = (ii, jj) => Math.max(0, elev[jj * w + ii]);
        return ((e(i, j) * (1 - a) + e(i + 1, j) * a) * (1 - b) + (e(i, j + 1) * (1 - a) + e(i + 1, j + 1) * a) * b) * EX / 1000;
      };
      // terrain: one grid mesh with the map painted on (lakes, sea, the river)
      const pos = new Float32Array(w * h * 3), uv = new Float32Array(w * h * 2), idx = [];
      for (let j = 0; j < h; j++) for (let i = 0; i < w; i++) {
        const k = j * w + i, x = x0 + i * cell, z = z0 + j * cell;
        pos[k * 3] = x; pos[k * 3 + 1] = Math.max(0, elev[k]) * EX / 1000; pos[k * 3 + 2] = z;
        uv[k * 2] = (x - x0) / (x1 - x0); uv[k * 2 + 1] = 1 - (z - z0) / (z1 - z0);
        if (i < w - 1 && j < h - 1) idx.push(k, k + w, k + 1, k + 1, k + w, k + w + 1);
      }
      const tg = new THREE.BufferGeometry();
      tg.setAttribute('position', new THREE.BufferAttribute(pos, 3)); tg.setAttribute('uv', new THREE.BufferAttribute(uv, 2)); tg.setIndex(idx); tg.computeVertexNormals();
      g.add(new THREE.Mesh(tg, lam(0xffffff, { map: mapTex(v.tex) })));
      // height lines every 200 m, as faint ink
      g.add(lineSegs(v.contours.map((c) => ({ y: c.l * EX / 1000 + 0.06, p: c.p })), 0x8f8e86, 0.45));
      // the river's way from the mountains to the sea, and the water travelling down it
      const F = path(v.flow, (x, z) => hAt(x, z) + 0.12);
      const line = poly(F.P, 0x6f9599); line.renderOrder = 2; line.material.depthTest = false; line.material.opacity = 0.9; g.add(line);
      const NP = 340, dots = flowDots(g, NP, 2.6, 0x3f6a74), seed = Array.from({ length: NP }, () => Math.random());
      const drop = flowDots(g, 1, 11, C.lime), dv = V(0, 0, 0);
      // places, lakes, plants
      const mus = flowDots(g, 1, 9, C.lime); mus.pos.set([0, hAt(0, 0) + 0.2, 0]); mus.geo.attributes.position.needsUpdate = true;
      label('Skellefteå museum', 'SE26', V(0, hAt(0, 0) + 0.3, 0), g, 'big').element.dataset.pri = 3;
      for (const p of v.places) if (p.n !== 'Skellefteå') label(p.n, '', V(p.x, hAt(p.x, p.z) + 0.3, p.z), g, p.k === 'village' ? 'ghost' : '');
      for (const [n, [x, z]] of Object.entries(v.lakes)) label(n === 'Sädvvájávrre' ? 'Sädvajaure' : n, 'sjö', V(x, hAt(x, z) + 0.3, z), g, 'ghost');
      const src = F.P[0];
      label('Fjällen', 'norska gränsen', V(src.x - 12, src.y + 2, src.z), g).element.dataset.pri = 1;
      label('Bottenviken', 'havet', V(32, 0.2, 14), g).element.dataset.pri = 1;
      const plants = v.plants.map((p) => {
        const y = hAt(p.x, p.z), m = lam(0xffffff);
        const o = ink(new THREE.CylinderGeometry(0.9, 0.9, 1.4, 10).translate(p.x, y + 0.7, p.z), { mat: m, s: 0.05, thr: 40 });
        g.add(o);
        const lb = label(p.n, 'kraftverk', V(p.x, y + 1.6, p.z), g, 'ghost');
        return { ...p, m, lb, hot: 0 };
      });
      const ys = v.flowElev, maxE = Math.max(...ys), mk = v.marks;
      sum.innerHTML = `Älven är <b>423 km</b> lång enligt SMHI; linjen i kartan är förenklad, ≈ ${fmt(v.lengthKm)} km · från ungefär ${fmt(v.sourceElev)} m över havet · <b>15–16 kraftverk</b>, elva av dem Skellefteå Krafts`;
      const T = 44;   // seconds for the drop to reach the sea
      upd = (t, dt) => {
        const u0 = t * 0.004;
        for (let i = 0; i < NP; i++) { F.at((seed[i] + u0) % 1, dv); dots.pos[i * 3] = dv.x; dots.pos[i * 3 + 1] = dv.y; dots.pos[i * 3 + 2] = dv.z; }
        dots.geo.attributes.position.needsUpdate = true;
        const u = Math.min(1, (t % (T + 4)) / T);
        F.at(u, dv); drop.pos.set([dv.x, dv.y + 0.1, dv.z]); drop.geo.attributes.position.needsUpdate = true;
        let next = null;
        for (const p of plants) {
          if (Math.abs(u - p.u) < 0.006) p.hot = 1;
          p.hot = Math.max(0, p.hot - dt / 1600);
          p.m.color.set(0xffffff).lerp(LIME, p.hot);
          p.lb.element.classList.toggle('big', p.hot > 0.3);
          if (!next && p.u > u) next = p;
        }
        api.step(u < mk.horn ? 0 : u < mk.stem ? 1 : u < mk.museum - 0.02 ? 2 : u < 0.985 ? 3 : 4);
        const km = u * v.lengthKm, e = ys[Math.min(ys.length - 1, Math.round(u * (ys.length - 1)))];
        rd.innerHTML = `Droppen: <b>${fmt(km)} km</b> från fjällen · <b>${fmt(Math.max(0, Math.round(e / 10) * 10))} m</b> över havet · ${next ? `nästa kraftverk: ${next.n}` : u < 0.99 ? 'snart vid havet' : '<b class="go">framme vid havet</b>'}`;
        // height profile: the river falls in steps, one for each dam
        const { g: c, w: cw, h: ch } = prof, X = (k) => 4 + k / (ys.length - 1) * (cw - 8), Y = (e2) => ch - 14 - Math.max(0, e2) / maxE * (ch - 26);
        c.clearRect(0, 0, cw, ch);
        c.fillStyle = '#5c5d57'; c.font = '600 9px IBM Plex Mono, monospace'; c.fillText('höjd över havet längs älven', 4, 10);
        c.strokeStyle = '#0a0b09'; c.lineWidth = 1.3; c.beginPath(); ys.forEach((e2, k) => c.lineTo(X(k), Y(e2))); c.stroke();
        c.strokeStyle = '#a6a89e'; c.lineWidth = 1;
        for (const p of plants) { const k = p.u * (ys.length - 1); c.beginPath(); c.moveTo(X(k), ch - 4); c.lineTo(X(k), ch - 10); c.stroke(); }
        const k = u * (ys.length - 1); c.fillStyle = '#cafe03'; c.strokeStyle = '#0a0b09';
        c.beginPath(); c.arc(X(k), Y(ys[Math.round(k)]), 4, 0, 7); c.fill(); c.stroke();
      };
    });
    return (t, dt) => upd?.(t, dt);
  },
};

SCENES.kusten = {
  title: 'Skellefteå vid kusten', kick: 'Ut · 10⁴ m', unit: 1000,
  view: { t: [9, 0, 4], d: 74, el: 1.02, az: 0.1, from: [0, 0, 0], d0: 2.6, dur: 3400 },
  lead: 'Från museet i Nordanå följer älven staden ut till Bottenviken. Vid kusten ligger Skelleftehamn, Bolidens smältverk Rönnskär och flygplatsen.',
  steps: ['Museet i Nordanå, där utställningen finns.', 'Älven rinner genom stan och når havet vid Ursviken, strax väster om Skelleftehamn.', 'Rönnskär: Bolidens smältverk. Koppar från gruvor blir ren metall, och metaller tas tillvara ur elektronikskrot.', 'Flygplatsen söder om stan.', 'Skellefteåtriangeln: hamnen, flygplatsen och det planerade resecentrumet vid busstationen.'],
  note: 'Karta: OpenStreetMap-bidragsgivare (ODbL). Husen i stan kommer från Skellefteå-tvillingen. Avstånden är fågelvägen. Resecentrumet, planet och fartyget är modellerna från cykelspelet; planet och fartyget är ritade mycket större än i verkligheten. Resecentrumets plats är kommunens planerade punkt, och att det ligger längs dagens spår är ett antagande.',
  build(g, api) {
    const rd = readout(api);
    let upd = null;
    Promise.all([region(), fetch('data/city.json').then((r) => r.json())]).then(([{ coast: c, valley: v }, city]) => {
      const [x0, z0, x1, z1] = c.box;
      const ground = new THREE.Mesh(new THREE.PlaneGeometry(x1 - x0, z1 - z0).rotateX(-Math.PI / 2), new THREE.MeshBasicMaterial({ map: mapTex(c.tex) }));
      ground.position.set((x0 + x1) / 2, 0, (z0 + z1) / 2); g.add(ground);
      // the town, from the same buildings as the city view, in kilometres
      const geoms = [];
      let museumG = null;
      for (const b of city.buildings) {
        const sh = new THREE.Shape();
        for (let i = 0; i < b.r.length; i += 2) { const x = b.r[i] / 1000, y = -b.r[i + 1] / 1000; i ? sh.lineTo(x, y) : sh.moveTo(x, y); }
        let gg; try { gg = new THREE.ExtrudeGeometry(sh, { depth: Math.max(2.5, b.h) / 1000, bevelEnabled: false }).rotateX(-Math.PI / 2); } catch { continue; }
        if (b.m) museumG = gg; else geoms.push(gg);
      }
      const town = new THREE.Mesh(mergeGeometries(geoms), lam(0xffffff)); g.add(town);
      const musMat = lam(C.lime); g.add(new THREE.Mesh(museumG, musMat));
      const place = (n) => v.places.find((p) => p.n === n);
      const hamn = place('Skelleftehamn'), ursv = place('Ursviken');
      const pts = {
        museum: V(0, 0, 0), hamn: hamn && V(hamn.x, 0, hamn.z), rese: c.resecentrum && V(c.resecentrum[0], 0, c.resecentrum[1]),
        flyg: c.airport && V(c.airport.x, 0, c.airport.z), ronn: c.ronnskar && V(c.ronnskar[0], 0, c.ronnskar[1]),
      };
      label('Skellefteå museum', 'SE26', V(0, 0.12, 0), g, 'big').element.dataset.pri = 3;
      const lb = {};
      // the triangle and the travel centre belong to the stories about them; elsewhere the scene is the coast
      const PLANNED = new Set(['triangeln', 'resecentrum', 'norrbotniabanan', 'hamnen', 'flygplatsen']);
      if (pts.hamn) lb.hamn = label('Skelleftehamn', 'hamnen', pts.hamn, g);
      if (ursv) label('Ursviken', '', V(ursv.x, 0, ursv.z), g, 'ghost');
      if (pts.ronn) lb.ronn = label('Rönnskär', 'Bolidens smältverk', pts.ronn, g);
      if (pts.flyg) lb.flyg = label('Flygplatsen', c.airport.iata || '', pts.flyg, g);
      if (pts.rese) lb.rese = label('Busstationen', 'blivande resecentrum', pts.rese, g, 'ghost');
      label('Bottenviken', '', V(x1 - 4, 0, z0 + 6), g, 'ghost');
      label('Skellefteälven', '', V(-4, 0, 1.3), g, 'ghost');
      // water down the river to the sea
      const fl = []; for (let i = 0; i < v.flow.length; i += 2) if (v.flow[i] > x0 - 2) fl.push(v.flow[i], v.flow[i + 1]);
      const R = path(fl, () => 0.01), NP = 160, dots = flowDots(g, NP, 2.4, 0x3f6a74), seed = Array.from({ length: NP }, () => Math.random()), dv = V(0, 0, 0);
      // the triangle, drawn when its step comes
      const tri = [pts.hamn, pts.flyg, pts.rese].every(Boolean) ? poly([pts.hamn, pts.flyg, pts.rese, pts.hamn].map((p) => p.clone().setY(0.05)), C.ink, { dashed: true, dash: 0.5, gap: 0.35 }) : null;
      if (tri) { tri.material.depthTest = false; tri.renderOrder = 4; g.add(tri); }
      const triKm = tri ? pts.hamn.distanceTo(pts.flyg) + pts.flyg.distanceTo(pts.rese) + pts.rese.distanceTo(pts.hamn) : 0;
      // a plane taking off now and then
      // a plane and a ship, from the MobilityTriangle game's own models, drawn much larger than life so they show
      const rw = c.runway, plane = new THREE.Group(), ship = new THREE.Group(); g.add(plane, ship);
      loadMesh('airliner').then((geo) => plane.add(ink(geo.clone().scale(0.048, 0.048, 0.048), { s: 0.004, thr: 35 })));
      loadMesh('cargoship').then((geo) => ship.add(ink(geo.clone().scale(0.018, 0.018, 0.018), { s: 0.003, thr: 35 })));
      const sea0 = pts.hamn && V(pts.hamn.x + 1.2, 0.01, pts.hamn.z + 0.4), sea1 = sea0 && V(sea0.x + 9, 0.01, sea0.z - 3);
      // today's bus station and the planned travel centre next to it (docs/faktakoll.md)
      const nyP = c.resecentrumNytt && V(c.resecentrumNytt[0], 0, c.resecentrumNytt[1]);
      const ny = new THREE.Group(); ny.visible = false; g.add(ny);
      if (nyP) {
        ny.position.copy(nyP); ny.rotation.y = -0.122;   // along today's track, 97° from north (an assumption)
        loadMesh('resecentrum').then((geo) => ny.add(ink(geo.clone().scale(0.001, 0.001, 0.001), { mat: lam(C.lime), s: 0.0004, thr: 35 })));
      }
      const nyLb = nyP && label('Planerat resecentrum', 'Norrbotniabanan', nyP.clone().setY(0.05), g, 'big');
      if (nyLb) nyLb.visible = false;
      let tour = null;
      if (nyP && pts.rese) {
        const b = document.createElement('div'); b.className = 'hops';
        b.innerHTML = '<button><i>zooma in</i>Från busstationen till det nya resecentrumet</button>'; api.live.append(b); lb.tourBtn = b;
        b.querySelector('button').onclick = () => { tour = { t0: null }; };
      }
      const ra = rw && V(rw[0], 0.02, rw[1]), rb = rw && V(rw[rw.length - 3], 0.02, rw[rw.length - 2]);
      const d = (a, b) => (a && b ? a.distanceTo(b) : 0);
      const V0 = SCENES.kusten.view;
      upd = (t) => {
        for (let i = 0; i < NP; i++) { R.at((seed[i] + t * 0.02) % 1, dv); dots.pos[i * 3] = dv.x; dots.pos[i * 3 + 1] = 0.02; dots.pos[i * 3 + 2] = dv.z; }
        dots.geo.attributes.position.needsUpdate = true;
        if (sea0) { const k = (t % 40) / 40; ship.position.lerpVectors(sea0, sea1, k); ship.lookAt(sea1); ship.visible = k < 0.95; }
        if (tour) {   // fly to today's bus station, then over to the planned travel centre, which rises from the ground
          if (tour.t0 === null) { tour.t0 = t; api.fly([pts.rese.x, 0, pts.rese.z], 0.75, { el: 0.78, az: 0.25, dur: 3400 }); }
          const k = t - tour.t0;
          lb.rese.element.classList.toggle('big', k < 8);
          if (k > 5.5 && !tour.moved) { tour.moved = true; api.fly([nyP.x - 0.08, 0, nyP.z], 0.62, { el: 0.6, az: 0.35, dur: 2600 }); }
          ny.visible = k > 7; ny.scale.y = THREE.MathUtils.smoothstep(k, 7, 10) + 1e-3; nyLb.visible = k > 9;
          if (k > 22 && !tour.back) { tour.back = true; api.fly(V0.t, V0.d, { el: V0.el, az: V0.az, dur: 3200 }); }
          if (k > 25.5) tour = null;
          api.step(4);
          rd.innerHTML = k < 6 ? 'I dag: <b>Skellefteå Busstation</b>, där bussarna går från.'
            : 'Det planerade <b>resecentrumet</b> för Norrbotniabanan, cirka 220 m öster om busstationen. Byggstart runt 2028, tåg Umeå–Skellefteå 2036.';
          return;
        }
        const tri3 = PLANNED.has(api.inst);
        if (lb.tourBtn) lb.tourBtn.hidden = !tri3;
        if (lb.rese) lb.rese.visible = tri3;
        const li5 = document.querySelector('#scSteps')?.children[4]; if (li5) li5.hidden = !tri3;
        const s = Math.floor(t / 4.5) % (tri3 ? 5 : 4); api.step(s);
        musMat.color.set(s === 0 && t % 1 < 0.5 ? 0xffffff : C.lime);
        for (const [k, n] of [['ronn', 2], ['flyg', 3], ['hamn', 1]]) lb[k]?.element.classList.toggle('big', s === n);
        if (tri) { tri.visible = s === 4; tri.geometry.setDrawRange(0, Math.max(2, Math.floor(((t % 4.5) / 2.5) * 4) + 1)); }
        if (ra) {   // roll, lift, climb, gone
          const k = (t % 14) / 6, dir = rb.clone().sub(ra).normalize();
          plane.visible = k < 1.4;
          plane.position.copy(ra).addScaledVector(dir, Math.min(k, 1.4) * d(ra, rb) * 0.8); plane.position.y = 0.05 + Math.max(0, k - 0.55) * 1.4;
          plane.lookAt(plane.position.clone().add(dir));
        }
        rd.innerHTML = `Museet → Skelleftehamn <b>${fmt(d(pts.museum, pts.hamn), 1)} km</b> · → Rönnskär <b>${fmt(d(pts.museum, pts.ronn), 1)} km</b> · → flygplatsen <b>${fmt(d(pts.museum, pts.flyg), 1)} km</b>${tri ? ` · triangeln runt <b>${fmt(triKm, 0)} km</b>` : ''}`;
      };
    });
    return (t, dt) => upd?.(t, dt);
  },
};

// ── which hops each installation and chapter offers ──
// world: a hop in the main model (handled by the caller), scene: a scale scene above
export const HOPS = {
  floden: [{ world: 'river', dir: 'ut', label: 'Skellefteälven genom stan' }, { scene: 'alvdalen', dir: 'ut', label: 'Hela älven, fjällen till havet' }, { scene: 'djupkamera', dir: 'in', label: 'Djupkameran' }],
  vattentunneln: [{ scene: 'kraftverk', dir: 'ut', label: 'Vattenkraftverket' }, { scene: 'alvdalen', dir: 'ut', label: 'Kraftverken längs älven' }, { scene: 'ultraljud', dir: 'in', label: 'Ultraljudssensorn' }],
  skogen: [{ scene: 'lysdiod', dir: 'in', label: 'Lysdioderna i stammarna' }],
  dokumentaren: [{ scene: 'djupkamera', dir: 'in', label: 'Djupkameran' }],
  lampteremin: [{ scene: 'ackord', dir: 'in', label: 'Två toner och en glödlampa' }, { scene: 'ultraljud', dir: 'in', label: 'Ultraljudssensorerna' }],
  alimak: [{ scene: 'ultraljud', dir: 'in', label: 'Ultraljudssensorn' }],
  boliden: [{ scene: 'kusten', dir: 'ut', label: 'Till smältverket Rönnskär' }, { scene: 'gitter', dir: 'in', label: 'Kopparens atomer' }],
  dialogen: [{ scene: 'neuron', dir: 'in', label: 'Neuron och AI' }],
  milight: [{ scene: 'pir', dir: 'in', label: 'PIR-sensorn vid entrén' }],
  rutschkanan: [{ scene: 'ultraljud', dir: 'in', label: 'Ultraljudssensorn' }, { scene: 'lysdiod', dir: 'in', label: 'Ljusslingan' }],
  vaxthuset: [{ scene: 'lysdiod', dir: 'in', label: 'Lysdioderna' }],
  ace: [{ scene: 'djupkamera', dir: 'in', label: 'Djupkameran' }],
  atervinning: [{ scene: 'kusten', dir: 'ut', label: 'Till Rönnskär' }, { scene: 'gitter', dir: 'in', label: 'Metallernas atomer' }],
  triangeln: [{ scene: 'kusten', dir: 'ut', label: 'Den riktiga triangeln' }],
  sokrates: [{ scene: 'neuron', dir: 'in', label: 'Neuron och AI' }],
  social: [{ scene: 'pir', dir: 'in', label: 'PIR-sensorn' }, { scene: 'ultraljud', dir: 'in', label: 'Ultraljud i snurrlådorna' }],
  kompetenstaltet: [{ scene: 'pir', dir: 'in', label: 'PIR-sensorn' }],
  elbil: [{ scene: 'kraftverk', dir: 'ut', label: 'Där strömmen kommer ifrån' }, { scene: 'alvdalen', dir: 'ut', label: 'Kraftverken längs älven' }],
};

// ── the engine ──
let R, cam, controls, css, hooks = {}, active = null, actId = null, tw = null, t0 = 0, escFn = null;
const built = {};
export function initScales(opts) {
  R = opts.renderer; hooks = opts;
  cam = new THREE.PerspectiveCamera(32, innerWidth / innerHeight, 0.05, 20000);
  controls = new OrbitControls(cam, R.domElement); controls.enabled = false; controls.enableDamping = true;
  css = new CSS2DRenderer({ element: $('#slabels') }); css.setSize(innerWidth, innerHeight);
  addEventListener('resize', () => { cam.aspect = innerWidth / innerHeight; cam.updateProjectionMatrix(); css.setSize(innerWidth, innerHeight); });
  $('#scard .sc-back').onclick = exit;
  addEventListener('keydown', (e) => { if (e.key === 'Escape' && active) { e.stopImmediatePropagation(); (escFn || exit)(); } }, true);
}
function build(id) {
  const def = SCENES[id], scene = new THREE.Scene();
  scene.background = new THREE.Color(C.bg);
  scene.add(new THREE.HemisphereLight(0xffffff, 0xd4d3cc, 2.1));
  const sun = new THREE.DirectionalLight(0xffffff, 1.3); sun.position.set(0.4, 1, 0.6); scene.add(sun);
  const g = new THREE.Group(); scene.add(g);
  const live = document.createElement('div');
  const api = { live, step: () => {} };
  api.fly = (t, d, o) => { if (active === built[id]) fly(V(...t), d, o); };   // move the camera from inside a scene
  const upd = def.build(g, api);
  return built[id] = { def, scene, g, upd, live, api };
}
function fly(tgt, d1, { el = null, az = 0, dur = 2600 } = {}) {
  const from = controls.target.clone(), d0 = cam.position.distanceTo(from), dir0 = cam.position.clone().sub(from).normalize();
  const dirV = el === null ? dir0.clone() : V(Math.sin(az) * Math.cos(el), Math.sin(el), Math.cos(az) * Math.cos(el));
  tw = { tgt, from, dirV, dir0, d0, d1, t0: performance.now(), dur };
  controls.enabled = false; controls.target.copy(tgt);
}
const fade = (on) => new Promise((res) => { const f = $('#fade'); f.classList.toggle('on', on); setTimeout(res, on ? 340 : 0); });
// in a story (main.js) a scene is a chapter: `here` says how the installation uses it, `steps` (step number → text) and
// `note` say what is particular to it, `nav` steps through the story. On its own a scene says only the general thing.
export async function enter(id, { dir = 'in', here = '', inst = '', kick = '', nav = null, onEsc = null, steps = null, note = '', instId = '' } = {}) {
  if (!SCENES[id]) return;
  hooks.onEnter?.();
  await fade(true);
  if (active) active.scene.visible = false;
  const S = built[id] || build(id); active = S; actId = id;
  const d = S.def, card = $('#scard');
  S.api.inst = instId;   // a scene may show parts that belong to one installation only in that installation's story
  escFn = onEsc;
  $('#scKick').textContent = kick ? `${kick} · ${d.kick.split(' · ').pop()}` : `${dir === 'ut' ? 'Zooma ut' : 'Zooma in'} · ${d.kick}`;
  $('#scHere').innerHTML = here ? `<b>I ${inst}</b><p>${here}</p>` : ''; $('#scHere').hidden = !here;
  $('#scNav').replaceChildren(...(nav ? [nav] : [])); $('#scard .sc-back').hidden = !!nav;
  $('#scTitle').textContent = d.title; $('#scLead').textContent = d.lead; $('#scNote').textContent = [d.note, note].filter(Boolean).join(' ');
  $('#scSteps').innerHTML = d.steps.map((s, k) => `<li><span>${steps?.[k] ?? s}</span></li>`).join('');
  const live = $('#scLive'); live.replaceChildren(S.live);
  let lastStep = -1;
  S.api.step = (n) => { if (n === lastStep) return; lastStep = n; [...$('#scSteps').children].forEach((li, k) => { li.classList.toggle('now', k === n); li.classList.toggle('done', k < n); }); };
  // the scene's labels only
  for (const s of Object.values(built)) s.scene.traverse((o) => o.isCSS2DObject && (o.element.style.display = s === S ? '' : 'none'));
  card.hidden = false; $('#slabels').hidden = false;
  const v = d.view, tgt = V(...v.t), ce = Math.cos(v.el);
  const dirV = V(Math.sin(v.az) * ce, Math.sin(v.el), Math.cos(v.az) * ce);
  controls.target.copy(tgt); controls.enabled = false;
  const k = innerWidth < innerHeight ? 1.7 : 1;   // portrait phones need more room around the subject
  // a map hop starts at its `from` point (the museum) and slides over to the view while it zooms out
  const from = dir === 'ut' && v.from ? V(...v.from) : tgt;
  tw = { tgt, from, dirV, d0: dir === 'ut' && v.d0 ? v.d0 : v.d * k * (dir === 'ut' ? 0.22 : 6), d1: v.d * k, t0: performance.now(), dur: CALM.matches ? 1 : v.dur || 2200 };
  t0 = performance.now();
  await fade(false);
}
export async function exit() {
  if (!active) return;
  await fade(true);
  active = null; actId = null; tw = null; controls.enabled = false; escFn = null;
  $('#scard').hidden = true; $('#slabels').hidden = true;
  hooks.onExit?.();
  await fade(false);
}
// hide a label when it would cover a more important one, sit under the card or fall off screen
let tidyT = 0;
function tidy(S) {
  const els = [];
  S.scene.traverse((o) => { if (o.isCSS2DObject && o.element.style.display !== 'none') els.push(o.element); });
  const rank = (e) => (e.classList.contains('big') ? 3 : e.classList.contains('ghost') ? 1 : 2) + (+e.dataset.pri || 0);
  els.sort((a, b) => rank(b) - rank(a));
  const card = $('#scard').getBoundingClientRect(), kept = [];
  for (const e of els) {
    const r = e.querySelector('.t').getBoundingClientRect();
    const over = (q) => r.left < q.right + 4 && r.right > q.left - 4 && r.top < q.bottom + 2 && r.bottom > q.top - 2;
    const bad = over(card) || r.right < 0 || r.left > innerWidth || r.bottom < 0 || r.top > innerHeight || kept.some(over);
    e.classList.toggle('hid', bad); if (!bad) kept.push(r);
  }
}
export const isActive = () => !!active;
export const current = () => actId && SCENES[actId];
// called by main.js each frame while a scale scene is open; returns the field width in metres
export function frame(now, dt) {
  const S = active, t = Math.max(0, (now - t0) / 1000);   // the first frame can come in just before t0
  BOIL.step.value = CALM.matches ? 0 : Math.floor(t * 12) % 97;
  if (tw) {
    const k = Math.min(1, (now - tw.t0) / tw.dur), e = ease(k), d = tw.d0 * Math.pow(tw.d1 / tw.d0, e);
    // the target moves linearly in distance, so the start stays in view while zooming; a pan at one distance just eases
    const at = tw.from.clone().lerp(tw.tgt, Math.abs(tw.d1 - tw.d0) > 0.05 * tw.d1 ? (d - tw.d0) / (tw.d1 - tw.d0) : e);
    const dir = tw.dir0 ? tw.dir0.clone().lerp(tw.dirV, e).normalize() : tw.dirV;
    cam.position.copy(at).addScaledVector(dir, d); cam.lookAt(at);
    if (k >= 1) { tw = null; controls.enabled = true; controls.update(); }
  } else controls.update();
  const dist = cam.position.distanceTo(controls.target);
  cam.near = Math.max(0.01, dist * 0.01); cam.far = dist * 50; cam.updateProjectionMatrix();
  const panel = $('#scard'), r = panel.getBoundingClientRect(), narrow = innerWidth < 900;
  cam.setViewOffset(innerWidth, innerHeight, narrow ? 0 : -(r.right + 10) / 2, narrow ? (innerHeight - r.top + 10) / 2 : 0, innerWidth, innerHeight);
  S.upd(t, dt);
  R.render(S.scene, cam);
  css.render(S.scene, cam);
  if (now - tidyT > 200) { tidyT = now; tidy(S); }
  return 2 * dist * Math.tan(THREE.MathUtils.degToRad(cam.fov / 2)) * cam.aspect * S.def.unit;
}
