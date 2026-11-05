// Scale scenes, track E8: the component library, step 2 (Mac mini, ESP32, hall sensor and magnets, MEMS accelerometer, microphone, speaker, button, Shelly, smart trainer).
// Same pattern as js/scales.js: add scenes to SCENES and the cards' buttons to HOPS (append, never replace a card's list).
// Facts come from data/installations.json and docs/kallor/museum-brain.md (the tnt.local reading, 29 Oct 2026); anything only plausible is marked (k) in the note.
import * as THREE from 'three';
import { SCENES, HOPS, V, INK, LIME, ease, fmt, ink, label, poly, ring, canvas, readout } from '../scales.js';
import { C, lam, bline, bdash } from '../world.js';

const hop = (card, h) => (HOPS[card] ||= []).push(h);

// ── small shared helpers for this file ──
const TAU = Math.PI * 2, clamp = THREE.MathUtils.clamp;
const smooth = (a, b, x) => { const k = clamp((x - a) / (b - a), 0, 1); return k * k * (3 - 2 * k); };
const GREY = 0x5c5d57, PALE = 0xb3b2aa, LIME_D = 0x8fb300;
const glass = (o = 0.28) => lam(0xffffff, { transparent: true, opacity: o, depthWrite: false });
const dot = (r, color = C.lime, seg = 10) => new THREE.Mesh(new THREE.SphereGeometry(r, seg, Math.max(6, seg - 2)), new THREE.MeshBasicMaterial({ color, transparent: true }));
const setText = (lb, t, sub = '') => { lb.element.querySelector('.t').innerHTML = `${t}${sub ? `<small>${sub}</small>` : ''}`; };
// portrait phones show only the top half of the screen, so wide scenes step further back there
const fit = (land, port) => (innerWidth < innerHeight ? { ...land, ...port } : land);
// the first frame after entering can come a moment before the scene's clock starts
const run = (f) => (t, dt) => f(Math.max(0, t), dt);
const hot = (lb, on) => lb.element.classList.toggle('hot', !!on);
// the angle that leaves the open quarter of a cut-away (an axis-y lathe turned to point along +x) facing the camera
const cutStart = (el, az) => Math.atan2(-Math.sin(el), Math.cos(az) * Math.cos(el)) + Math.PI / 4;
function opts(api, names, on) {
  const d = document.createElement('div'); d.className = 'sc-opts';
  d.innerHTML = names.map((n, i) => `<button data-i="${i}">${n}</button>`).join('');
  api.live.append(d);
  d.onclick = (e) => { const b = e.target.closest('button'); if (b) on(+b.dataset.i, true); };
  return (i) => d.querySelectorAll('button').forEach((b) => b.classList.toggle('on', +b.dataset.i === i));
}
function slider(api, name, min, max, val, step = 1) {
  const l = document.createElement('label'); l.className = 'sc-ctl';
  l.innerHTML = `${name} <input type="range" min="${min}" max="${max}" step="${step}" value="${val}"> <output></output>`;
  api.live.append(l);
  const s = { inp: l.querySelector('input'), out: l.querySelector('output'), touched: false };
  s.inp.oninput = () => (s.touched = true);
  return s;
}
// a polyline with arc length, for dots that travel along wires
function track(points) {
  const L = [0];
  for (let i = 1; i < points.length; i++) L.push(L[i - 1] + points[i].distanceTo(points[i - 1]));
  const len = L[L.length - 1];
  return (u, out = V(0, 0, 0)) => {
    const s = (((u % 1) + 1) % 1) * len; let i = 1;
    while (i < L.length - 1 && L[i] < s) i++;
    return out.lerpVectors(points[i - 1], points[i], (s - L[i - 1]) / (L[i] - L[i - 1] || 1));
  };
}
// air for sound scenes: dots on a grid that are pushed back and forth along x, so the pressure wave shows as dense and sparse bands
function air(g, [x0, x1], [y0, y1], step, size, keep = () => true) {   // one plane of air at z = 0, like a slice through the room
  const rest = [];
  for (let x = x0; x <= x1; x += step) for (let y = y0; y <= y1; y += step) if (keep(x, y)) rest.push(x, y, 0);
  const pos = new Float32Array(rest), geo = new THREE.BufferGeometry(); geo.setAttribute('position', new THREE.BufferAttribute(pos, 3));
  g.add(new THREE.Points(geo, new THREE.PointsMaterial({ color: 0x7b7c74, size })));
  return (fn) => { for (let i = 0; i < pos.length; i += 3) pos[i] = rest[i] + fn(rest[i], rest[i + 1], rest[i + 2]); geo.attributes.position.needsUpdate = true; };
}
// a scrolling trace in a live canvas: rows of {name, data (−1…1), color}
function traces(tc, rows, { mid = true, marks = [] } = {}) {
  const { g: x, w, h } = tc, rh = h / rows.length;
  x.clearRect(0, 0, w, h); x.font = '600 9px IBM Plex Mono, monospace';
  rows.forEach((r, k) => {
    const cy = rh * k + rh / 2 + 4, amp = rh * 0.32;
    if (mid) { x.strokeStyle = '#e4e3dc'; x.lineWidth = 1; x.beginPath(); x.moveTo(0, cy); x.lineTo(w, cy); x.stroke(); }
    for (const m of marks) if (m.row === k) { x.strokeStyle = '#b3b2aa'; x.setLineDash([3, 3]); for (const v of m.at) { x.beginPath(); x.moveTo(0, cy - v * amp); x.lineTo(w, cy - v * amp); x.stroke(); } x.setLineDash([]); }
    x.strokeStyle = r.color || '#0a0b09'; x.lineWidth = 1.4; x.beginPath();
    r.data.forEach((v, i) => x.lineTo(i * w / (r.data.length - 1), cy - v * amp)); x.stroke();
    x.fillStyle = '#5c5d57'; x.fillText(r.name, 4, rh * k + 10);
  });
}

// ═══════════════════ 1. Mac mini: the lid lifts off; board, chip, fan; which programs run where. Unit: 1 cm ═══════════════════
const MACS = [
  { id: 'macmini1', what: 'Dialogen', prog: [['recorder.py', 'spelar in de tio rören'], ['process_continuous.py', 'skickar talet till Berget AI'], ['player.py', 'spelar upp svaren']], io: '10 mikrofoner in · 20 ljudkanaler ut' },
  { id: 'macmini3', what: 'Ljudkonstverket', prog: [['mac_mqtt_to_midi.py', 'gör MQTT till MIDI'], ['Ableton Live', 'gör ljudet']], io: 'toner från sensorerna in · högtalarna i Urtiden och Dåtiden ut' },
  { id: 'macmini4', what: 'SkyKraft', prog: [['TouchDesigner', 'ritar jetturbinen']], io: 'USB-mikrofon in · skärmen ut' },
  { id: 'macmini6', what: 'Skellefteåtriangeln', prog: [['ant_scanner.py', 'läser cykeln'], ['TouchDesigner', 'tar emot farten'], ['Unreal', 'kör spelet']], io: 'bike från tnt in · spelet ut' },
  { id: 'macmini-housing', what: 'Snurra huset', prog: [['TouchDesigner', 'låter fasaden växa']], io: 'housingcw och housingccw in · fasaden ut' },
  { id: 'resolume', what: 'mediaservern', prog: [['Resolume', 'spelar video'], ['WLED-panelen', 'en panel för ljusslingorna']], io: '' },
];
SCENES.macmini = {
  title: 'Mac mini med kåpan av', kick: 'Makro · 10⁻¹ m', unit: 0.01,
  get view() { return fit({ t: [-2, 6, 0], d: 58, el: 0.6, az: -0.42 }, { d: 74, t: [0, 6, 0] }); },
  lead: 'Sex Mac mini driver ljud, bild och AI i utställningen. Utanpå ser de likadana ut. Det som skiljer dem åt är programmen.',
  steps: ['Kåpan lyfts av. Inuti finns ett kretskort, en fläkt och en nätdel.', 'Mitt på kortet sitter chipet. Det räknar, ritar bild och kör alla program.', 'Fläkten drar in luft och blåser ut värmen bakåt.', 'Utställningen har sex Mac mini, och var och en har sin uppgift.', 'Programmen tar emot ljud, sensorvärden eller MQTT och gör ljud, bild eller AI av det.'],
  note: 'Schematisk Mac mini. Vilken modell som står i utställningen är inte kontrollerat (k); insidan är förenklad. Programmen kommer från tnt:s lista över datorer, 29 oktober 2026.',
  build(g, api) {
    const W = 19.7, H = 3.6;
    g.add(ink(new THREE.BoxGeometry(W, 0.3, W).translate(0, 0.15, 0), { s: 0.08 }));
    for (const z of [-1, 1]) g.add(ink(new THREE.BoxGeometry(W, H - 0.3, 0.3).translate(0, H / 2, z * (W / 2 - 0.15)), { s: 0.08 }));
    for (const x of [-1, 1]) g.add(ink(new THREE.BoxGeometry(0.3, H - 0.3, W - 0.6).translate(x * (W / 2 - 0.15), H / 2, 0), { s: 0.08 }));
    for (let i = 0; i < 5; i++) { const r = new THREE.Mesh(new THREE.BoxGeometry(i === 4 ? 1.6 : 0.9, 0.5, 0.05), new THREE.MeshBasicMaterial({ color: GREY })); r.position.set(-6 + i * 2.2 + (i === 4 ? 1.5 : 0), 1.7, -W / 2 - 0.02); g.add(r); }
    // the lid has its own outline so it can fade away as it lifts off
    const lidMat = lam(0xffffff, { transparent: true, opacity: 1 }), lidGeo = new THREE.BoxGeometry(W, 0.3, W);
    const lidLine = new THREE.LineSegments(new THREE.EdgesGeometry(lidGeo), bline({ color: C.ink, transparent: true }));
    const lid = new THREE.Group(); lid.add(new THREE.Mesh(lidGeo, lidMat), lidLine); g.add(lid);
    // the board and what sits on it
    g.add(ink(new THREE.BoxGeometry(16.6, 0.16, 12).translate(0, 0.7, 2.6), { s: 0.06 }));
    const chipMat = lam(0xffffff);
    g.add(ink(new THREE.BoxGeometry(3.4, 0.35, 3.4).translate(-1.2, 0.95, 3.2), { mat: chipMat, s: 0.04 }));
    let rs = 11; const rnd = () => { rs = (rs * 16807) % 2147483647; return rs / 2147483647; };
    for (let i = 0; i < 14; i++) { const w = 0.5 + rnd() * 1.1, d = 0.4 + rnd() * 0.8; g.add(ink(new THREE.BoxGeometry(w, 0.18, d).translate(-7 + rnd() * 14, 0.87, -2.4 + rnd() * 9.6).translate(0, 0, 0), { s: 0.02 })); }
    g.add(ink(new THREE.BoxGeometry(6, 2.2, 5.6).translate(4.6, 1.5, -5.6), { s: 0.06 }));
    const fan = new THREE.Group(); fan.position.set(-4.4, 1.8, -5.4); g.add(fan);
    const fr = ring('y'); fr.scale.setScalar(2.7); g.add(fr); fr.position.copy(fan.position);
    fan.add(ink(new THREE.CylinderGeometry(0.8, 0.8, 1.2, 20), { s: 0.03 }));
    for (let i = 0; i < 11; i++) { const b = ink(new THREE.BoxGeometry(1.7, 1.0, 0.08).translate(1.6, 0, 0), { s: 0.02 }); b.rotation.y = i / 11 * TAU; b.children.forEach((c) => (c.rotation.y = 0.35)); fan.add(b); }
    const lb = {
      chip: label('chipet', 'räknar', V(-1.2, 1.4, 3.2), g), fan: label('fläkten', '', V(-4.4, 3.8, -5.4), g, 'topic'),
      psu: label('nätdel', '', V(4.6, 2.9, -5.6), g, 'topic'), host: label('macmini3', '', V(-W / 2, H + 1.2, W / 2), g, 'big'),
    };
    // the programs float above the chip, each with a thread down to it
    const progs = [0, 1, 2].map((i) => {
      const p = V(-13, 17.5 - i * 3.6, 0), l = label('', '', p, g);
      const th = poly([V(-1.2, 1.2, 3.2), p.clone().add(V(0, -0.2, 0))], PALE, { dashed: true, dash: 0.4, gap: 0.3 }); g.add(th);
      const d = dot(0.22); g.add(d);
      return { p, l, th, d };
    });
    // air through the fan and out the back
    const NA = 60, ap = new Float32Array(NA * 3), ag = new THREE.BufferGeometry(); ag.setAttribute('position', new THREE.BufferAttribute(ap, 3));
    const airPts = new THREE.Points(ag, new THREE.PointsMaterial({ color: 0x9a9b94, size: 0.22, transparent: true, opacity: 0 })); g.add(airPts);
    const seeds = Array.from({ length: NA }, () => [Math.random(), Math.random() - 0.5, Math.random() - 0.5]);
    let cur = 1, touched = false;
    const mark = opts(api, MACS.map((m) => m.id), (i) => { touched = true; pick(i); });
    const rd = readout(api);
    function pick(i) {
      cur = i; mark(i); const M = MACS[i];
      setText(lb.host, M.id, M.what);
      progs.forEach((p, k) => { const on = k < M.prog.length; p.l.element.classList.toggle('off', !on); p.th.visible = on; p.d.visible = on; if (on) setText(p.l, M.prog[k][0], M.prog[k][1]); });
      rd.innerHTML = `<b>${M.id}</b> · ${M.what}${M.io ? ` · ${M.io}` : ''}`;
    }
    const OWN = { dialogen: 'macmini1', ljudkonst: 'macmini3', skykraft: 'macmini4', triangeln: 'macmini6', 'snurra-huset': 'macmini-housing' };
    let seen;
    pick(1);
    let ang = 0;
    return run((t, dt) => {
      if (seen !== api.inst) { seen = api.inst; touched = false; const i = MACS.findIndex((m) => m.id === OWN[api.inst]); pick(i < 0 ? 1 : i); if (i >= 0) touched = true; }
      const k = ease(smooth(0.5, 2.6, t));
      lid.position.set(0, H + 0.15 + k * 9, -k * 3); lid.rotation.x = -k * 0.18;
      const fade = 1 - smooth(1.8, 3.4, t); lidMat.opacity = fade; lidLine.material.opacity = fade; lid.visible = fade > 0.01;
      const spin = 1.2 + smooth(4.5, 5.5, t) * 7;
      ang += spin * dt / 1000; fan.rotation.y = ang;
      airPts.material.opacity = 0.9 * smooth(4.5, 5.5, t);
      seeds.forEach((s, i) => {   // in under the front edge, along the board, through the fan, out at the back
        const u = (s[0] + t * 0.18) % 1, p = u < 0.6 ? V(s[1] * 14, 1.3 + s[2], 8 - u / 0.6 * 11) : V(-4.4 + s[1] * 3 * (1 - (u - 0.6) * 2), 1.8 + s[2] * 0.8, -3 - (u - 0.6) / 0.4 * 9);
        ap[i * 3] = p.x; ap[i * 3 + 1] = p.y; ap[i * 3 + 2] = p.z;
      });
      ag.attributes.position.needsUpdate = true;
      const busy = t > 2.6;
      chipMat.color.set(0xffffff).lerp(LIME, busy ? 0.35 + 0.25 * Math.sin(t * 3) : 0);
      hot(lb.chip, busy && t < 4.6);
      progs.forEach((p, i) => { const u = (t * 0.5 + i * 0.33) % 1; p.d.position.lerpVectors(V(-1.2, 1.2, 3.2), p.p, u); p.d.material.opacity = busy ? Math.sin(u * Math.PI) : 0; });
      if (!touched && t > 9) { const n = Math.floor((t - 9) / 5) % MACS.length; if (n !== cur) pick(n); }
      api.step(t < 2.6 ? 0 : t < 4.6 ? 1 : t < 7 ? 2 : t < 9 ? 3 : 4);
    });
  },
};

// ═══════════════════ 2. ESP32: chip, antenna, GPIO; a sensor value becomes an MQTT message over Wi-Fi. Unit: 1 mm ═══════════════════
const ESPX = [
  { n: 'Alimak', topic: 'alimak', pay: (v) => `{"event":"trigger","distance_cm":${Math.round(v)}}`, to: ['macmini3', 'Ableton spelar ett ljud'] },
  { n: 'Vattentunneln', topic: 'tunnel1', pay: (v) => `{"distance":${v.toFixed(1)}}`, to: ['macmini3', 'en ton i ljudkonsten'] },
  { n: 'Rutschkanan', topic: 'ultraljud1', pay: () => '{"event":"slide","duration_ms":2140}', to: ['tnt-switchboard', 'ljuset till klimatkuben'] },
  { n: 'Socialhörnet', topic: 'spinningboxes', pay: (v) => `{"sensor":2,"distance_cm":${Math.round(v)},"delta_cm":61}`, to: ['tnt-switchboard', 'färgen i Social'] },
];
SCENES.esp32 = {
  title: 'ESP32', kick: 'Makro · 10⁻¹ m', unit: 0.001,
  get view() { return fit({ t: [34, 4, -6], d: 380, el: 0.66, az: -0.12 }, { d: 740, t: [46, 4, -6] }); },
  lead: 'Omkring femton små kretskort, ESP32, läser av sensorerna i utställningen och skickar värdena trådlöst till tnt.',
  steps: ['ESP32 är en liten dator med inbyggd radio för Wi-Fi.', 'Sensorn kopplas till benen, GPIO. Där läser chipet av ett värde, till exempel ett avstånd.', 'Programmet gör värdet till ett kort meddelande: ett ämne och ett innehåll.', 'Antennen skickar meddelandet över Wi-Fi. En radiovåg på 2,4 GHz är 12,5 cm lång.', 'Mosquitto på tnt tar emot och skickar vidare till alla som lyssnar på ämnet.'],
  note: 'Kortet är ritat som ett vanligt utvecklingskort med 30 ben; vilka kort som sitter i installationerna är inte kontrollerat (k). Radiovågorna visas i verklig våglängd men mycket långsamt. Ämnen och innehåll kommer från tnt.',
  build(g, api) {
    // the board, the module with its tin can and antenna, the pin rows, USB
    g.add(ink(new THREE.BoxGeometry(52, 1.6, 28), { s: 0.12 }));
    g.add(ink(new THREE.BoxGeometry(25.5, 0.8, 18).translate(14.2, 1.2, 0), { s: 0.06 }));
    const canMat = lam(0xffffff);
    g.add(ink(new THREE.BoxGeometry(17.6, 2.6, 16).translate(10.2, 2.9, 0), { mat: canMat, s: 0.06 }));
    const mz = []; for (let i = 0; i < 7; i++) { const z = -6.5 + i * 2.1; mz.push(V(20.8, 1.65, z), V(26.4, 1.65, z), V(26.4, 1.65, z + 1.05), V(20.8, 1.65, z + 1.05)); }
    g.add(poly(mz, C.ink));
    g.add(ink(new THREE.BoxGeometry(5.5, 2.6, 7.6).translate(-24.5, 2.1, 0), { s: 0.04 }));
    for (const [x, z] of [[-17, 9], [-17, -9]]) g.add(ink(new THREE.BoxGeometry(3.4, 1.4, 3.4).translate(x, 1.5, z), { s: 0.03 }));
    for (const z of [-12.7, 12.7]) {
      g.add(ink(new THREE.BoxGeometry(38.1, 2.5, 2.5).translate(-2, -2.05, z), { s: 0.06 }));
      for (let i = 0; i < 15; i++) g.add(new THREE.LineSegments(new THREE.EdgesGeometry(new THREE.BoxGeometry(0.64, 6, 0.64).translate(-19.8 + i * 2.54, -5.5, z)), bline({ color: GREY })));
    }
    const lb = {
      chip: label('ESP32-chipet', 'under plåtlocket', V(8, 4.4, 0), g), ant: label('antennen', '', V(24, 1.8, 7), g, 'topic'),
      gpio: label('GPIO', 'benen', V(-14, -3, 13), g, 'topic'), usb: label('USB', 'ström', V(-26, 3.6, 0), g, 'topic'),
    };
    // a sensor to the left with two wires to the pins
    const S = new THREE.Group(); S.position.set(-50, 0, 40); g.add(S);
    S.add(ink(new THREE.BoxGeometry(45, 1.6, 20), { s: 0.1 }));
    for (const x of [-13, 13]) S.add(ink(new THREE.CylinderGeometry(8, 8, 12, 24).translate(x, 6.8, 0), { s: 0.06 }));
    label('sensorn', 'ultraljud', V(-50, 16, 40), g);
    const wires = [-1, 1].map((k) => { const c = new THREE.CatmullRomCurve3([V(-50 + k * 2, 0.8, 30), V(-38, 10 + k * 3, 26 + k * 2), V(-24, 7, 19), V(-14.7 + k * 2.54, -1, 12.7)]); g.add(poly(c.getPoints(40), GREY)); return c; });
    const bit = dot(1.6); g.add(bit);
    // tnt and the subscribers
    const T = V(122, 7, -46);
    g.add(ink(new THREE.BoxGeometry(36, 14, 26).translate(T.x, T.y, T.z), { s: 0.12 }));
    const tntL = label('tnt', 'Mosquitto, MQTT', V(T.x - 18, T.y + 8, T.z), g, 'big');
    const subs = [V(T.x - 14, T.y + 50, T.z - 10), V(T.x + 22, T.y + 30, T.z + 14)];
    const subL = subs.map((p) => label('', '', p, g, 'ghost'));
    subs.forEach((p) => g.add(poly([T.clone().add(V(0, 7, 0)), p], PALE, { dashed: true, dash: 3, gap: 2.5 })));
    const subD = subs.map(() => { const d = dot(1.8); g.add(d); return d; });
    // the radio wave: rings 125 mm apart, slowed down, and the message riding on it
    const A0 = V(24, 3, 0), rings = Array.from({ length: 3 }, () => { const r = ring('z', 64); r.material.color.copy(LIME).multiplyScalar(0.7); g.add(r); return r; });
    const pkt = dot(2.4); g.add(pkt);
    const pktL = label('', '', V(0, 0, 0), g, 'topic');
    let ex = 0, touched = false, lastCyc = -1, val = 25;
    const mark = opts(api, ESPX.map((e) => e.n), (i) => { touched = true; ex = i; lastCyc = -1; mark(i); });
    mark(0);
    const rd = readout(api);
    const per = 9;
    return run((t) => {
      const cyc = Math.floor(t / per), k = t % per;
      if (cyc !== lastCyc) {
        if (!touched && lastCyc >= 0) ex = (ex + 1) % ESPX.length;
        lastCyc = cyc; mark(ex); val = 18 + Math.random() * 10;
        subL.forEach((l, i) => setText(l, i ? ESPX[ex].to[1] : ESPX[ex].to[0], i ? '' : 'lyssnar'));
      }
      const E = ESPX[ex], msg = `${E.topic} ${E.pay(val)}`;
      // 1–2.6 s: the value runs up the wire; 2.6–4.4 s: the chip builds the message; 4.4–6.8 s: radio; 6.8– : tnt passes it on
      const w = smooth(1, 2.6, k);
      bit.visible = k > 1 && k < 2.6; bit.position.copy(wires[1].getPointAt(w));
      const build = clamp((k - 2.6) / 1.8, 0, 1);
      canMat.color.set(0xffffff).lerp(LIME, k > 2.6 && k < 4.6 ? 0.6 : 0);
      hot(lb.chip, k > 2.6 && k < 4.6);
      const fly = clamp((k - 4.4) / 2.4, 0, 1);
      rings.forEach((r, i) => {
        const rad = (k - 4.4) * 75 - i * 125;
        r.visible = k > 4.4 && k < 7.6 && rad > 0 && rad < 200;
        r.position.copy(A0); r.scale.setScalar(Math.max(0.01, rad)); r.material.opacity = 1 - rad / 200;
      });
      pkt.visible = fly > 0 && fly < 1; pkt.position.lerpVectors(A0, T, ease(fly)).setY(A0.y + Math.sin(ease(fly) * Math.PI) * 26 + (T.y - A0.y) * ease(fly));
      pktL.element.classList.toggle('off', !(fly > 0 && fly < 1)); pktL.position.copy(pkt.position).add(V(3, 3, 0)); setText(pktL, E.topic);
      const out = clamp((k - 6.8) / 1.2, 0, 1);
      hot(tntL, k > 6.6 && k < 8.6);
      subD.forEach((d, i) => { d.visible = out > 0 && out < 1; d.position.lerpVectors(T.clone().add(V(0, 7, 0)), subs[i], out); });
      subL.forEach((l) => hot(l, k > 7.9));
      api.step(k < 1 ? 0 : k < 2.6 ? 1 : k < 4.4 ? 2 : k < 6.8 ? 3 : 4);
      const shown = k < 2.6 ? '' : msg.slice(0, Math.ceil(build * msg.length));
      rd.innerHTML = k < 2.6 ? `${E.n} · sensorn mäter <b>${fmt(val, 1)} cm</b>` : `<b>${shown.slice(0, E.topic.length)}</b>${shown.slice(E.topic.length)}${k > 6.8 ? ' · <b class="go">framme</b>' : ''}`;
    });
  },
};

// ═══════════════════ 3. Hall sensors and magnets (Snurra huset). Unit: 1 cm ═══════════════════
SCENES.hall = {
  title: 'Hallsensorer och magneter', kick: 'Makro · 10⁻¹ m', unit: 0.01,
  get view() { return fit({ t: [1.5, 0, 2.5], d: 44, el: 0.74, az: -0.25 }, { d: 60 }); },
  lead: 'En hallsensor känner av en magnet. Med fyra magneter på en skiva och två sensorer bredvid går det att räkna hur långt, och åt vilket håll, något snurrar.',
  steps: ['Under huset sitter en skiva med fyra magneter.', 'Två hallsensorer sitter stilla bredvid. Magneten trycker elektronerna i sensorn åt ena sidan, och det ger en liten spänning.', 'Varje gång en magnet passerar en sensor blir det ett steg: åtta steg per varv.', 'Vilken sensor som slår till först avslöjar åt vilket håll huset snurrar.', 'Ett kretskort räknar stegen och skickar dem vidare, flera gånger i sekunden.'],
  note: 'Skivan och sensorerna är ritade schematiskt. Dra i reglaget för att vrida själv.',
  build(g, api) {
    g.add(ink(new THREE.BoxGeometry(17, 0.8, 15).translate(1, -1.4, 0.5), { mat: lam(0xeeede7), s: 0.1 }));
    const rot = new THREE.Group(); g.add(rot);
    rot.add(ink(new THREE.CylinderGeometry(6.4, 6.4, 0.5, 64), { s: 0.06 }));
    const house = new THREE.Group(); house.position.y = 0.25; rot.add(house);
    house.add(ink(new THREE.BoxGeometry(4.6, 3.6, 3.6).translate(0, 1.8, 0), { s: 0.05 }));
    house.add(ink(new THREE.ExtrudeGeometry(new THREE.Shape([new THREE.Vector2(-2.6, 0), new THREE.Vector2(2.6, 0), new THREE.Vector2(0, 2.2)]), { depth: 3.9, bevelEnabled: false }).translate(0, 3.6, -1.95), { s: 0.05 }));
    for (const [x, z] of [[-1.2, 1.81], [1.2, 1.81], [0, -1.81]]) house.add(ink(new THREE.BoxGeometry(0.8, 1, 0.05).translate(x, 2, z), { s: 0.01 }));
    const mags = [];
    for (let i = 0; i < 4; i++) {
      const a = i / 4 * TAU, m = new THREE.Group(); m.position.set(Math.sin(a) * 5.4, -0.05, Math.cos(a) * 5.4); m.rotation.y = a; rot.add(m);
      m.add(ink(new THREE.BoxGeometry(1.2, 0.8, 0.8).translate(0, 0.45, 0), { mat: lam(0xd9d8d1), s: 0.02 }));
      for (const s of [-1, 1]) { const loop = []; for (let j = 0; j <= 16; j++) { const b = j / 16 * Math.PI; loop.push(V(Math.cos(b) * 0.9, 0.45 + s * Math.sin(b) * 1.1, 0)); } const l = poly(loop, 0x8d8e87, { dashed: true, dash: 0.14, gap: 0.1 }); m.add(l); }
      mags.push(a);
    }
    label('magnet', 'fyra på skivan', V(0.6, 1.2, 5.4), rot, 'topic');
    // the two sensors, fixed, 22,5° apart at the front of the disc
    const SA = [-11.25, 11.25].map((d) => THREE.MathUtils.degToRad(d));
    const sens = SA.map((a, i) => {
      const p = V(Math.sin(a) * 7.0, 0, Math.cos(a) * 7.0), m = lam(0xffffff);
      const o = ink(new THREE.BoxGeometry(0.45, 0.45, 0.16), { mat: m, s: 0.01 }); o.position.copy(p); o.rotation.y = a; g.add(o);
      g.add(ink(new THREE.BoxGeometry(1.4, 0.16, 1.0).translate(0, -0.35, 0.2).applyMatrix4(new THREE.Matrix4().makeRotationY(a)).translate(p.x, p.y, p.z), { s: 0.01 }));
      const l = label(i ? 'B' : 'A', 'hallsensor', V(p.x + (i ? 0.4 : -0.4), 0.6, p.z + 0.3), g);
      g.add(poly(new THREE.CatmullRomCurve3([p.clone().add(V(0, -0.4, 0.6)), V(p.x * 0.5 + 2.4, -0.9, 8.4), V(5.4, -0.75, 7.8)]).getPoints(20), GREY));
      return { m, l, a };
    });
    g.add(ink(new THREE.BoxGeometry(5.2, 0.16, 2.8).translate(7.6, -0.92, 7.4), { s: 0.02 }));
    g.add(ink(new THREE.BoxGeometry(1.8, 0.3, 1.6).translate(8.2, -0.7, 7.4), { s: 0.01 }));
    const espL = label('ESP32', 'räknar stegen', V(8.4, -0.5, 7.4), g);
    const sl = slider(api, 'Vrid', -100, 100, 0);
    const tc = canvas(api, 300, 74), rd = readout(api);
    const hA = new Array(180).fill(0), hB = new Array(180).fill(0);
    let ang = 0, steps = 0, last = [0, 0], dir = 0, flash = 0, lastEdge = '';
    return run((t, dt) => {
      const s = dt / 1000;
      if (!sl.touched) sl.inp.value = Math.round(Math.sin(t * 0.28) * 80);
      const w = +sl.inp.value / 100 * 2.6;   // rad/s
      sl.out.textContent = Math.abs(w) < 0.05 ? 'stilla' : w > 0 ? 'moturs' : 'medurs';
      ang += w * s; rot.rotation.y = ang;
      const on = sens.map((S) => mags.some((a) => { let d = ((a + ang - S.a) % TAU + TAU) % TAU; if (d > Math.PI) d -= TAU; return Math.abs(d) < THREE.MathUtils.degToRad(11.25); }) ? 1 : 0);
      on.forEach((v, i) => {
        sens[i].m.color.set(v ? C.lime : 0xffffff); hot(sens[i].l, v);
        if (v && !last[i]) { steps++; lastEdge = i ? 'B' : 'A'; flash = 0.5; if (on[1 - i] === 0) dir = Math.sign(w); }
      });
      last = on; flash = Math.max(0, flash - s);
      hA.push(on[0]); hA.shift(); hB.push(on[1]); hB.shift();
      traces(tc, [{ name: 'sensor A', data: hA.map((v) => v * 2 - 1) }, { name: 'sensor B', data: hB.map((v) => v * 2 - 1) }], { mid: false });
      hot(espL, flash > 0);
      const pos = ((steps % 8) + 8) % 8, moving = Math.abs(w) > 0.05;
      api.step(t < 3 ? 0 : t < 7 ? 1 : !moving ? 2 : Math.floor(t / 4) % 3 + 2);
      rd.innerHTML = moving ? `${dir > 0 ? 'moturs' : 'medurs'} · steg <b>${pos + 1} av 8</b> · skickar <b>${dir > 0 ? 'housingccw' : 'housingcw'}</b> {"level": …, "pos": ${pos}}` : 'Huset står stilla';
    });
  },
};

// ═══════════════════ 4. MEMS accelerometer (Sokrates): a proof mass on silicon springs. Unit: 1 µm ═══════════════════
SCENES.mems = {
  title: 'Accelerometern', kick: 'Mikro · 10⁻³ m', unit: 1e-6,
  get view() { return fit({ t: [10, 0, 20], d: 1300, el: 0.95, az: -0.22 }, { d: 1900 }); },
  lead: 'En accelerometer är ett chip som känner när något skakar eller lutar. Inuti finns en struktur av kisel.',
  steps: ['Accelerometern är ett chip på några millimeter. Inuti finns en struktur av kisel.', 'En liten massa hänger i tunna fjädrar av kisel.', 'När chipet rycker till, till exempel av en high five, släpar massan efter och svänger.', 'Fingrarna på massan kommer närmare de fasta fingrarna. Chipet mäter avståndet elektriskt och räknar ut skakningen.', 'Är skakningen stark nog räknas den som en händelse, och kortet skickar ett meddelande.'],
  note: 'Strukturen är en typisk MEMS-accelerometer som mäter åt ett håll; riktiga chip har ofta tre sådana, en per riktning. Rörelsen är kraftigt förstorad.',
  build(g, api) {
    g.add(ink(new THREE.BoxGeometry(760, 10, 560).translate(0, -22, 0), { mat: lam(0xeeede7), s: 0.6 }));
    const frame = new THREE.Group(); g.add(frame);
    const mass = new THREE.Group(); frame.add(mass);
    const massMat = lam(0xffffff);
    mass.add(ink(new THREE.BoxGeometry(280, 15, 170), { mat: massMat, s: 0.5 }));
    const holes = []; for (let i = 0; i < 9; i++) for (let j = 0; j < 5; j++) { const x = -120 + i * 30, z = -60 + j * 30; holes.push(V(x - 4, 7.7, z - 4), V(x + 4, 7.7, z - 4), V(x + 4, 7.7, z - 4), V(x + 4, 7.7, z + 4), V(x + 4, 7.7, z + 4), V(x - 4, 7.7, z + 4), V(x - 4, 7.7, z + 4), V(x - 4, 7.7, z - 4)); }
    mass.add(new THREE.LineSegments(new THREE.BufferGeometry().setFromPoints(holes), bline({ color: PALE })));
    // comb fingers: moving ones on the mass, fixed ones from the bars, with a narrow and a wide gap
    const fixedMat = lam(0xffffff), FX = [];
    for (const s of [-1, 1]) {
      for (let i = 0; i < 7; i++) {
        const x = -114 + i * 38;
        mass.add(ink(new THREE.BoxGeometry(8, 15, 105).translate(x, 0, s * (85 + 52)), { mat: massMat, s: 0.2 }));
        const f = ink(new THREE.BoxGeometry(8, 15, 105).translate(x + 15, 0, s * (85 + 12 + 58)), { mat: fixedMat, s: 0.2 }); frame.add(f); FX.push(f);
      }
      frame.add(ink(new THREE.BoxGeometry(320, 18, 16).translate(0, 0, s * 218), { s: 0.4 }));
      frame.add(ink(new THREE.BoxGeometry(40, 26, 40).translate(s * 170, -5, s * 218), { s: 0.3 }));
    }
    // folded springs at both ends, and their anchors
    const beams = [];
    for (const s of [-1, 1]) {
      for (let k = 0; k < 4; k++) {
        const b = new THREE.Group(); b.add(ink(new THREE.BoxGeometry(4, 15, 120), { s: 0.15 }));
        const zl = k % 2 ? 58 : -58; if (k < 3) b.add(ink(new THREE.BoxGeometry(18, 15, 4).translate(s * 9, 0, zl), { s: 0.1 }));
        b.position.x = s * (150 + k * 18); frame.add(b); beams.push({ b, s, k });
      }
      mass.add(ink(new THREE.BoxGeometry(16, 15, 4).translate(s * 142, 0, 58), { s: 0.1 }));
      frame.add(ink(new THREE.BoxGeometry(44, 26, 80).translate(s * 240, -5, 0), { s: 0.3 }));
    }
    label('massan', 'hänger fritt', V(-60, 12, -20), mass);
    label('fjäder', 'kisel', V(190, 10, -70), g);
    label('fasta fingrar', '', V(110, 10, 230), g, 'topic');
    label('förankring', '', V(-250, 12, 40), g, 'topic');
    const tc = canvas(api, 300, 70), rd = readout(api), hist = new Array(160).fill(0);
    const btn = opts(api, ['High five!'], () => (hitAt = tNow));
    let hitAt = 0.8, tNow = 0, crossed = false, lastHit = -1;
    return run((t) => {
      tNow = t;
      if (t - hitAt > 6.5) hitAt = t;
      const tau = t - hitAt;
      const jolt = tau > 0 && tau < 0.22 ? Math.sin(tau / 0.22 * Math.PI) * 26 : 0;
      const d = tau > 0 ? -16 * Math.exp(-tau * 1.6) * Math.sin(tau * TAU * 1.4) : 0;   // the mass lags behind, then rings on its springs
      frame.position.x = jolt; mass.position.x = d;
      beams.forEach(({ b, s, k }) => (b.position.x = s * (150 + k * 18) + d * (1 - k / 4)));
      const near = clamp(Math.abs(d) / 14, 0, 1);
      massMat.color.set(0xffffff).lerp(LIME, near * 0.7);
      hist.push(d / 16); hist.shift();
      if (hitAt !== lastHit) { lastHit = hitAt; crossed = false; }
      if (Math.abs(d) > 9) crossed = true;   // over the threshold: the ESP32 counts it as a high five
      traces(tc, [{ name: 'skakning, massans läge', data: hist }], { marks: [{ row: 0, at: [9 / 16, -9 / 16] }] });
      btn(t - hitAt < 0.4 ? 0 : -1);
      api.step(tau < 0 || tau > 4.2 ? (t < 3 ? 0 : 1) : tau < 0.5 ? 2 : tau < 1.6 ? 3 : 4);
      rd.innerHTML = crossed && tau > 1.4 && tau < 4.2 ? '<b class="go">sua/ {"trigger": true}</b> · iPaden visar en fråga' : tau > 0 && tau < 1.4 ? 'Massan svänger …' : 'Väggen väntar på en high five';
    });
  },
};

// ═══════════════════ 5. Microphone: membrane, coil, sound wave to voltage (Dialogen, SkyKraft). Unit: 1 mm ═══════════════════
SCENES.mikrofon = {
  title: 'Mikrofonen', kick: 'Makro · 10⁻¹ m', unit: 0.001,
  get view() { return fit({ t: [-18, -2, 0], d: 214, el: 0.34, az: -0.3 }, { d: 230, t: [-2, -2, 0] }); },
  lead: 'En mikrofon gör om tryckvågor i luften till en svag elektrisk signal.',
  steps: ['Ljud är tryckvågor i luften: täta och glesa lager som rör sig framåt.', 'Vågorna trycker membranet fram och tillbaka.', 'Membranet bär en liten spole som sitter runt en magnet.', 'När spolen rör sig i magnetfältet uppstår en svag spänning i tråden, med samma form som ljudet.', 'Datorn mäter spänningen tiotusentals gånger per sekund. Den kan spara ljudet eller mäta hur starkt det är.'],
  note: 'Här visas en dynamisk mikrofon med spole; en kondensatormikrofon gör samma sak med ett laddat membran. Vågen visas mycket långsamt och kortare än den är.',
  build(g, api) {
    const el = this.view.el, az = this.view.az, ph0 = cutStart(el, az), PL = Math.PI * 1.5;
    const toX = (geo) => geo.rotateZ(-Math.PI / 2);
    g.add(ink(toX(new THREE.CylinderGeometry(13, 13, 36, 48, 1, true, ph0, PL)).translate(4, 0, 0), { mat: lam(0xffffff, { side: THREE.DoubleSide }), s: 0.08, thr: 20 }));
    g.add(ink(toX(new THREE.CylinderGeometry(13, 13, 2, 48, 1, false, ph0, PL)).translate(22, 0, 0), { mat: lam(0xffffff, { side: THREE.DoubleSide }), s: 0.05, thr: 20 }));
    for (const r of [4, 8, 12.4]) { const c = ring('x', 48); c.scale.setScalar(r); c.position.x = -14; c.material.color.set(PALE); g.add(c); }
    label('gallret', '', V(-14, 14, 0), g, 'topic');
    // moving parts: membrane and coil
    const mov = new THREE.Group(); g.add(mov);
    mov.add(ink(toX(new THREE.CylinderGeometry(10.5, 10.5, 0.4, 48)), { mat: glass(0.75), s: 0.04, thr: 20 }));
    const coilMat = lam(0xffffff, { side: THREE.DoubleSide });
    mov.add(ink(toX(new THREE.CylinderGeometry(4.4, 4.4, 6, 32, 1, true)).translate(3.2, 0, 0), { mat: coilMat, s: 0.03, thr: 20 }));
    for (let i = 0; i < 6; i++) { const c = ring('x', 32); c.scale.setScalar(4.45); c.position.x = 0.8 + i * 0.95; c.material.color.set(GREY); mov.add(c); }
    // magnet: pole piece inside the coil, and the pot around it
    g.add(ink(toX(new THREE.CylinderGeometry(3.4, 3.4, 11, 28)).translate(6.5, 0, 0), { mat: lam(0xd9d8d1), s: 0.04, thr: 20 }));
    g.add(ink(toX(new THREE.CylinderGeometry(9, 9, 3, 40, 1, false, ph0, PL)).translate(13.5, 0, 0), { mat: lam(0xd9d8d1, { side: THREE.DoubleSide }), s: 0.05, thr: 20 }));
    g.add(ink(toX(new THREE.CylinderGeometry(9, 9, 9, 40, 1, true, ph0, PL)).translate(8.5, 0, 0), { mat: lam(0xd9d8d1, { side: THREE.DoubleSide }), s: 0.05, thr: 20 }));
    const lb = { mem: label('membranet', '', V(0, 11, 0), g), coil: label('spolen', 'rör sig med membranet', V(4, -9, 6), g), mag: label('magneten', 'står still', V(12, 10, -4), g, 'topic') };
    // the two wires out, with the signal running along them
    const wire = new THREE.CatmullRomCurve3([V(5, -2, -2), V(24, -3, -2), V(32, -9, 0), V(40, -12, 4)]);
    g.add(poly(wire.getPoints(30), GREY), poly(wire.getPoints(30).map((p) => p.clone().add(V(0, 1.4, 0))), GREY));
    const wl = label('till datorn', 'spänningen', V(36, -14, 4), g);
    const sig = Array.from({ length: 6 }, () => { const d = dot(1.0); g.add(d); return d; });
    const setAir = air(g, [-86, -18], [-16, 16], 2.2, 0.85);
    const sl = slider(api, 'Ton', 100, 1000, 300, 10);
    const tc = canvas(api, 300, 84), rd = readout(api), hp = new Array(160).fill(0), hv = new Array(160).fill(0);
    let phase = 0;
    return run((t, dt) => {
      if (!sl.touched) sl.inp.value = Math.round((550 + Math.sin(t * 0.12) * 400) / 10) * 10;
      const f = +sl.inp.value; sl.out.textContent = `${f} Hz`;
      const lam_ = 26 + 56 * (1 - (f - 100) / 900), kk = TAU / lam_, A = smooth(0, 2, t);
      phase += (dt / 1000) * TAU * 0.55;
      setAir((x) => (x < -16 ? 2.2 * A * Math.sin(kk * x - phase) : 0));
      const p = Math.sin(kk * -6 - phase) * A, v = Math.cos(kk * -6 - phase) * A;
      mov.position.x = -6 + p * 1.4 * smooth(3, 4.5, t);
      const live = t > 4.5;
      coilMat.color.set(0xffffff).lerp(LIME, live ? Math.abs(v) * 0.7 : 0);
      hot(lb.coil, live && t < 9);
      sig.forEach((d, i) => { const u = (t * 0.35 + i / sig.length) % 1; d.visible = live; d.position.copy(wire.getPointAt(u)); d.scale.setScalar(0.4 + Math.abs(v) * 0.9); });
      hot(wl, t > 9);
      hp.push(p * smooth(2, 3, t)); hp.shift(); hv.push(live ? v : 0); hv.shift();
      traces(tc, [{ name: 'tryck vid membranet', data: hp }, { name: 'spänning i tråden', data: hv, color: '#5f7a00' }]);
      api.step(t < 3 ? 0 : t < 4.5 ? 1 : t < 6.5 ? 2 : t < 9 ? 3 : 4);
      rd.innerHTML = `Ton <b>${f} Hz</b> · en våg är <b>${fmt(343 / f * 100, 0)} cm</b> lång i luften · membranet svänger ${f} gånger i sekunden`;
    });
  },
};

// ═══════════════════ 6. Speaker: coil, magnet, cone, pressure wave (Ljudinstallationen, Skogen). Unit: 1 cm ═══════════════════
SCENES.hogtalare = {
  title: 'Högtalaren', kick: 'Makro · 10⁰ m', unit: 0.01,
  get view() { return fit({ t: [13, 0, 0], d: 92, el: 0.3, az: 0.42 }, { d: 140, t: [15, 0, 0] }); },
  lead: 'En högtalare är en mikrofon baklänges: den gör om en elektrisk signal till tryckvågor i luften.',
  steps: ['Datorn skickar musiken som en spänning som går upp och ner.', 'Strömmen går genom en spole som sitter i fältet från en stark magnet.', 'Spolen blir själv en magnet och knuffas fram och tillbaka.', 'Spolen sitter fast i konen, som trycker på luften.', 'Det blir tryckvågor som sprids i rummet: ljud.'],
  note: 'Genomskärning av en vanlig högtalare. Vågen visas mycket långsamt och kortare än den är.',
  build(g, api) {
    const ph0 = cutStart(this.view.el, this.view.az), PL = Math.PI * 1.5, ds = THREE.DoubleSide;
    const drv = new THREE.Group(); drv.rotation.z = -Math.PI / 2; g.add(drv);
    const lathe = (pts, o = {}) => ink(new THREE.LatheGeometry(pts.map(([r, y]) => new THREE.Vector2(r, y)), 56, ph0, PL), { mat: o.mat || lam(0xffffff, { side: ds }), s: o.s ?? 0.04, thr: 20 });
    const magMat = lam(0xd9d8d1, { side: ds });
    drv.add(lathe([[0.01, -5.6], [6, -5.6], [6, -4.8], [0.01, -4.8]], { mat: magMat }));
    drv.add(lathe([[2.3, -4.8], [5.6, -4.8], [5.6, -2.4], [2.3, -2.4], [2.3, -4.8]], { mat: magMat }));
    drv.add(lathe([[1.8, -2.4], [6, -2.4], [6, -1.7], [1.8, -1.7], [1.8, -2.4]], { mat: magMat }));
    drv.add(lathe([[0.01, -4.8], [1.4, -4.8], [1.4, -1.2], [0.01, -1.2]], { mat: magMat }));
    drv.add(lathe([[7.6, 3.6], [8.8, 3.6], [8.8, 3.9], [7.6, 3.9]]));
    for (let i = 0; i < 4; i++) { const a = ph0 + 0.25 + i * PL / 3.2; drv.add(poly([V(Math.sin(a) * 6, -1.7, Math.cos(a) * 6), V(Math.sin(a) * 8.6, 3.6, Math.cos(a) * 8.6)], GREY)); }
    drv.add(lathe(Array.from({ length: 11 }, (_, i) => [1.75 + i * 0.3, -1.0 + (i % 2 ? 0.14 : -0.14)]), { s: 0.02 }));
    const mov = new THREE.Group(); drv.add(mov);
    const coilMat = lam(0xffffff, { side: ds });
    mov.add(ink(new THREE.CylinderGeometry(1.6, 1.6, 2.6, 40, 1, true, ph0, PL).translate(0, -1.6, 0), { mat: coilMat, s: 0.02, thr: 20 }));
    for (let i = 0; i < 5; i++) { const c = ring('y', 40); c.scale.setScalar(1.62); c.position.y = -2.6 + i * 0.5; c.material.color.set(GREY); mov.add(c); }
    mov.add(lathe([[1.6, -0.4], [7.6, 3.75]], { s: 0.05 }));
    mov.add(lathe(Array.from({ length: 9 }, (_, i) => { const a = Math.PI - i / 8 * Math.PI; return [8.05 + 0.45 * Math.cos(a), 3.75 + 0.45 * Math.sin(a)]; }), { s: 0.02 }));
    const lb = {
      coil: label('spolen', 'strömmen går här', V(-0.6, -2.4, 4.5), g), mag: label('magneten', 'står still', V(-4, 6.4, -1), g),
      cone: label('konen', 'trycker på luften', V(3.4, 8, 2), g),
    };
    // the signal comes in on two wires from the left
    const wire = new THREE.CatmullRomCurve3([V(-17, -9, 4), V(-11, -8.5, 4), V(-5, -5.5, 2.6), V(-1.6, -1.8, 1.2)]);
    g.add(poly(wire.getPoints(30), GREY), poly(wire.getPoints(30).map((p) => p.clone().add(V(0, 0.7, -0.6))), GREY));
    const inL = label('från datorn', 'musiken som spänning', V(-17, -9, 4), g);
    const sig = Array.from({ length: 6 }, () => { const d = dot(0.22); g.add(d); return d; });
    const setAir = air(g, [5, 40], [-20, 20], 1.0, 0.34, (x, y) => Math.abs(y) < 7.5 + (x - 5) * 0.4);
    const sl = slider(api, 'Ton', 50, 800, 180, 10);
    const tc = canvas(api, 300, 60), rd = readout(api), hv = new Array(160).fill(0);
    let phase = 0;
    return run((t, dt) => {
      if (!sl.touched) sl.inp.value = Math.round((420 + Math.sin(t * 0.12) * 360) / 10) * 10;
      const f = +sl.inp.value; sl.out.textContent = `${f} Hz`;
      const lam_ = 12 + 26 * (1 - (f - 50) / 750), kk = TAU / lam_;
      phase += (dt / 1000) * TAU * 0.55;
      const v = Math.sin(-phase), on = smooth(0, 1.5, t), push = smooth(4.5, 6, t), wave = smooth(7, 9, t);
      sig.forEach((d, i) => { const u = (t * 0.3 + i / sig.length) % 1; d.position.copy(wire.getPointAt(u)); d.visible = on > 0.5; d.scale.setScalar(0.6 + Math.abs(v) * 0.6); });
      coilMat.color.set(0xffffff).lerp(LIME, t > 3 ? Math.abs(v) * 0.75 : 0);
      hot(lb.coil, t > 3 && t < 7); hot(lb.cone, t > 7);
      mov.position.y = v * 0.55 * push;
      setAir((x) => { const d = x - 4.5; return 0.75 * wave * Math.sin(kk * d - phase) / (1 + d * 0.03); });
      hv.push(v * on); hv.shift();
      traces(tc, [{ name: 'spänning in', data: hv }]);
      api.step(t < 1.5 ? 0 : t < 3 ? 1 : t < 6 ? 2 : t < 8.5 ? 3 : 4);
      rd.innerHTML = `Ton <b>${f} Hz</b> · konen går fram och tillbaka ${f} gånger i sekunden · en våg är <b>${fmt(343 / f, 2)} m</b> lång`;
    });
  },
};

// ═══════════════════ 7. Button: the contact closes, the pull-up goes low, bounce is filtered (Säg ja!, Droneport). Unit: 1 mm ═══════════════════
SCENES.knapp = {
  title: 'Knappen', kick: 'Makro · 10⁻¹ m', unit: 0.001,
  get view() { return fit({ t: [30, -2, 0], d: 340, el: 0.3, az: -0.2 }, { d: 620, t: [32, -2, 0] }); },
  lead: 'Ett knapptryck verkar enkelt, men metallen i kontakten studsar.',
  steps: ['Knappen har två metallblad som inte rör varandra. En fjäder håller knappen uppe.', 'Ett motstånd drar stiftet upp mot 3,3 volt. Stiftet läser 1, "hög".', 'När man trycker sluts kontakten, och stiftet kopplas till jord. Det läser 0, "låg".', 'Metallbladen studsar några gånger på några millisekunder innan de ligger still.', 'Programmet väntar tills signalen är stilla och räknar bara ett tryck.'],
  note: 'Hur länge programmet väntar på studsarna varierar; 5 ms är ritat som exempel. Studsarna visas i kraftig slowmotion.',
  build(g, api) {
    const X = -40;
    g.add(ink(new THREE.BoxGeometry(36, 24, 30).translate(X, -12, 0), { mat: glass(0.3), s: 0.12 }));
    g.add(ink(new THREE.LatheGeometry([[14.6, 0], [19, 0], [19, 3], [14.6, 3], [14.6, 0]].map(([r, y]) => new THREE.Vector2(r, y)), 48).translate(X, 0, 0), { s: 0.08, thr: 20 }));
    const btn = new THREE.Group(); btn.position.x = X; g.add(btn);
    btn.add(ink(new THREE.CylinderGeometry(14, 14, 7, 48).translate(0, 7, 0), { s: 0.08, thr: 20 }));
    btn.add(ink(new THREE.CylinderGeometry(2.6, 2.6, 15, 16).translate(0, -4, 0), { s: 0.04, thr: 20 }));
    btn.add(ink(new THREE.CylinderGeometry(5, 5, 1.6, 20).translate(0, -10.5, 0), { s: 0.03, thr: 20 }));
    const spring = poly(Array.from({ length: 121 }, () => V(0, 0, 0)), GREY); g.add(spring);
    // the leaves: the lower one fixed, the upper one hinged at its right end
    g.add(ink(new THREE.BoxGeometry(15, 1, 6).translate(X + 9.5, -17, 0), { mat: lam(0xd9d8d1), s: 0.03 }));
    const leaf = new THREE.Group(); leaf.position.set(X + 17, -12.5, 0); g.add(leaf);
    leaf.add(ink(new THREE.BoxGeometry(14, 1, 6).translate(-7, 0, 0), { mat: lam(0xd9d8d1), s: 0.03 }));
    const tip = dot(0.9, 0xbdbcb5); tip.position.set(-12.5, -0.9, 0); leaf.add(tip);
    const lbLeaf = label('kontakten', 'två metallblad', V(X + 10, -22, 8), g);
    label('fjädern', '', V(X - 9, -16, 8), g, 'topic');
    // the circuit: 3,3 V → pull-up resistor → node → GPIO13; node → switch → ground
    const N = V(52, 6, 0);
    const zig = [V(52, 34, 0)]; for (let i = 0; i < 7; i++) zig.push(V(52 + (i % 2 ? -3 : 3), 30 - i * 2.6, 0)); zig.push(V(52, 10, 0), N);
    g.add(poly(zig, C.ink));
    label('3,3 V', '', V(52, 36, 0), g, 'topic');
    label('motstånd', 'drar upp', V(57, 24, 0), g, 'topic');
    const toPin = [N, V(84, 6, 0)], toSw = [N, V(6, 6, 0), V(6, -12.5, 0), V(X + 17, -12.5, 0)], toGnd = [V(X + 17, -17, 0), V(-6, -17, 0), V(-6, -34, 0), V(52, -34, 0)];
    g.add(poly(toPin, C.ink), poly(toSw, C.ink), poly(toGnd, C.ink));
    for (let i = 0; i < 3; i++) g.add(poly([V(46 + i * 2, -34 - i * 2.4, 0), V(58 - i * 2, -34 - i * 2.4, 0)], C.ink));
    label('jord', '0 V', V(58, -38, 0), g, 'topic');
    const nd = dot(1.4, C.ink); nd.position.copy(N); g.add(nd);
    g.add(ink(new THREE.BoxGeometry(22, 2, 30).translate(96, 6, 0), { s: 0.06 }));
    const pinL = label('GPIO13', '1 · hög', V(84, 9, 0), g, 'big');
    const msgL = label('pushbutton1', '{"pressed": true}', V(62, -16, 0), g, 'ghost');
    const flow = track([V(52, 34, 0), ...zig.slice(1), V(6, 6, 0), V(6, -12.5, 0), V(X + 17, -12.5, 0), V(X + 4, -13.5, 0), V(X + 4, -17, 0), ...toGnd]);
    const cur = Array.from({ length: 14 }, () => { const d = dot(0.9, GREY); g.add(d); return d; });
    const tc = canvas(api, 300, 84), rd = readout(api);
    let c0 = 0, tNow = 0;
    opts(api, ['Tryck'], () => (c0 = tNow - 1.3));
    // the press as seen on the pin, in milliseconds: contact at 5 ms, bounces until 8,3 ms, accepted 5 ms later
    const BOUNCE = [[5, 0], [5.6, 1], [6.0, 0], [6.9, 1], [7.2, 0], [8.1, 1], [8.3, 0]];
    const raw = (ms) => { let v = 1; for (const [a, b] of BOUNCE) if (ms >= a) v = b; return v; };
    const OK = 13.3, msOf = (k) => (k - 1) * 5;
    return run((t) => {
      tNow = t;
      const k = ((t - c0) % 8 + 8) % 8, ms = msOf(k), released = k > 6.4;
      const down = released ? 1 - smooth(6.4, 6.7, k) : smooth(1.6, 2.0, k);
      const r = released ? (k > 6.45 ? 1 : 0) : ms < 5 ? 1 : raw(ms);
      btn.position.y = -4 * down;
      const th0 = Math.asin(4 / 14);
      leaf.rotation.z = r === 0 ? th0 : th0 * Math.min(1, down) * (ms >= 5 && !released ? 0.82 : 0.95);
      // the spring between the housing floor and the collar
      const top = -11.3 - 4 * down, a = spring.geometry.attributes.position;
      for (let i = 0; i <= 120; i++) { const u = i / 120, ang = u * 7 * TAU; a.setXYZ(i, X + Math.cos(ang) * 6, -23.5 + (top + 23.5) * u, Math.sin(ang) * 6); } a.needsUpdate = true;
      const accepted = !released && ms >= OK;
      hot(lbLeaf, r === 0); tip.material.color.set(r === 0 ? C.lime : 0xbdbcb5);
      setText(pinL, 'GPIO13', r ? '1 · hög' : '0 · låg');
      msgL.element.classList.toggle('off', !accepted); hot(msgL, accepted);
      cur.forEach((d, i) => { d.visible = r === 0; flow((t * 0.25 + i / cur.length) % 1, d.position); });
      // timing diagram, 0–30 ms
      const { g: x, w, h } = tc, span = 30, XS = (m) => 52 + m / span * (w - 60);
      x.clearRect(0, 0, w, h); x.font = '600 9px IBM Plex Mono, monospace'; x.fillStyle = '#5c5d57';
      x.fillText('stiftet', 2, 22); x.fillText('filtrerat', 2, 58);
      const lvl = (y0, fn) => { x.beginPath(); for (let i = 0; i <= 300; i++) { const m = i / 300 * span; x.lineTo(XS(m), y0 - fn(m) * 14); } x.stroke(); };
      x.strokeStyle = '#0a0b09'; x.lineWidth = 1.3; lvl(30, raw); lvl(66, (m) => (m < OK ? 1 : 0));
      x.strokeStyle = '#b3b2aa'; x.setLineDash([3, 3]); x.beginPath(); x.moveTo(XS(8.3), 4); x.lineTo(XS(8.3), h - 12); x.moveTo(XS(OK), 4); x.lineTo(XS(OK), h - 12); x.stroke(); x.setLineDash([]);
      x.fillText('väntar 5 ms', XS(8.6), 44);
      const now = clamp(ms, 0, span);
      if (!released && k > 1) { x.strokeStyle = '#8fb300'; x.lineWidth = 1.5; x.beginPath(); x.moveTo(XS(now), 2); x.lineTo(XS(now), h - 12); x.stroke(); }
      x.fillStyle = '#8d8e87'; x.fillText('0 – 30 ms', w - 58, h - 2);
      api.step(k < 1 ? 0 : k < 1.9 ? 1 : ms < 5.5 ? 2 : ms < OK ? 3 : released ? 1 : 4);
      rd.innerHTML = released ? 'Knappen släpps · stiftet går hög igen' : ms < 5 ? 'Ingen kontakt · stiftet läser <b>1</b>' : ms < 8.3 ? 'Kontakten studsar: <b>0 1 0 1 0</b> …' : ms < OK ? 'Stilla. Programmet väntar …' : '<b class="go">Ett tryck</b> · pushbutton1 {"pressed": true}';
    });
  },
};

// ═══════════════════ 8. Shelly: relay and power metering; over 3 W means a car is charging. Unit: 1 cm ═══════════════════
SCENES.shelly = {
  title: 'Shelly-pluggen', kick: 'Makro · 10⁻¹ m', unit: 0.01,
  get view() { return fit({ t: [-1.5, 0.5, 0], d: 54, el: 0.34, az: -0.26 }, { d: 108, t: [1.5, 0.5, 0] }); },
  lead: 'En Shelly-plugg är en smart kontakt som kan slå av och på och mäta strömmen. I utställningen sitter flera, och några lampor styrs av en Shelly-dimmer, en nära släkting.',
  steps: ['Pluggen sitter mellan vägguttaget och det den driver. Strömmen går genom ett relä.', 'Något slås på och börjar dra ström.', 'En mätkrets i pluggen räknar ut effekten: hur många watt som går igenom.', 'Över en viss effekt räknas det som att något händer, och det blir ett meddelande till tnt.', 'Reläet kan också slås av och på över nätverket, till exempel för att starta om något varje natt.'],
  note: 'Pluggen är ritad schematiskt.',
  build(g, api) {
    g.add(ink(new THREE.BoxGeometry(0.6, 15, 13).translate(-12.6, 0, 0), { mat: lam(0xeeede7), s: 0.08 }));
    g.add(ink(new THREE.BoxGeometry(0.6, 7.4, 7.4).translate(-12.1, 0, 0), { s: 0.05 }));
    label('vägguttaget', '230 V', V(-12.4, 7.8, 0), g, 'topic');
    // the plug, glass so the inside shows
    g.add(ink(new THREE.BoxGeometry(5.6, 5, 5).translate(-9.0, 0, 0), { mat: glass(0.22), s: 0.06 }));
    const fr = ring('x'); fr.scale.setScalar(1.9); fr.position.x = -6.18; g.add(fr);
    for (const z of [-0.95, 0.95]) { const h = ring('x', 16); h.scale.setScalar(0.24); h.position.set(-6.17, 0, z); g.add(h); }
    g.add(ink(new THREE.BoxGeometry(4.8, 0.12, 4.2).translate(-9.0, -1.9, 0), { s: 0.02 }));
    const coil = ink(new THREE.CylinderGeometry(0.55, 0.55, 1.5, 16).translate(-10.5, -1.0, -0.6), { s: 0.02, thr: 20 }); g.add(coil);
    g.add(ink(new THREE.BoxGeometry(0.3, 2.4, 0.5).translate(-11.2, -0.6, -0.6), { s: 0.01 }));
    const arm = new THREE.Group(); arm.position.set(-11.2, 0.6, -0.6); g.add(arm);
    arm.add(ink(new THREE.BoxGeometry(2.4, 0.14, 0.5).translate(1.2, 0, 0), { mat: lam(0xd9d8d1), s: 0.01 }));
    g.add(ink(new THREE.BoxGeometry(0.4, 1.3, 0.5).translate(-8.8, -0.2, -0.6), { mat: lam(0xd9d8d1), s: 0.01 }));
    const meterMat = lam(0xffffff);
    g.add(ink(new THREE.BoxGeometry(1.6, 0.16, 0.5).translate(-8.6, -1.75, 1.2), { mat: lam(0xd9d8d1), s: 0.01 }));
    g.add(ink(new THREE.BoxGeometry(0.9, 0.3, 0.9).translate(-10.4, -1.7, 1.3), { mat: meterMat, s: 0.01 }));
    const wifiMat = lam(0xffffff);
    g.add(ink(new THREE.BoxGeometry(1.0, 0.3, 1.0).translate(-7.6, -1.7, -1.3), { mat: wifiMat, s: 0.01 }));
    const lb = { relay: label('reläet', 'slår av och på', V(-11, 1.6, -0.6), g), meter: label('mätkretsen', 'räknar watt', V(-10.4, -1.4, 1.6), g), wifi: label('Wi-Fi', '', V(-7.4, -1.3, -1.4), g, 'topic') };
    // the charger, its cable and the plug the visitor pushes in
    g.add(ink(new THREE.BoxGeometry(3.4, 7, 2.6).translate(10, 0.5, 0), { s: 0.06 }));
    label('laddaren', 'Elbilsladdaren', V(10, 4.6, 0), g);
    const head = new THREE.Group(); g.add(head);
    head.add(ink(new THREE.CylinderGeometry(1.6, 1.6, 2.2, 24).rotateZ(Math.PI / 2), { s: 0.03, thr: 20 }));
    for (const z of [-0.95, 0.95]) head.add(ink(new THREE.CylinderGeometry(0.2, 0.2, 1.6, 8).rotateZ(Math.PI / 2).translate(-1.8, 0, z), { s: 0.01, thr: 20 }));
    const cable = poly(Array.from({ length: 24 }, () => V(0, 0, 0)), GREY); g.add(cable);
    // current: from the wall, through the relay and the meter, out to the charger
    const path = [V(-12, 0.4, -0.6), V(-11.2, 0.6, -0.6), V(-8.8, 0.6, -0.6), V(-8.8, -1.6, 0.4), V(-8.6, -1.6, 1.2), V(-6.6, 0, 0.4), V(-4.4, 0, 0), V(-2, -2.6, 0), V(3, -3.4, 0), V(8.3, -2.2, 0)];
    const flow = track(path), cur = Array.from({ length: 16 }, () => { const d = dot(0.16, GREY); g.add(d); return d; });
    const waves = Array.from({ length: 3 }, () => { const r = ring('z', 40); r.material.color.copy(LIME).multiplyScalar(0.7); g.add(r); return r; });
    const tc = canvas(api, 300, 70), rd = readout(api), hist = new Array(160).fill(0);
    let P = 0;
    const per = 15;
    return run((t, dt) => {
      const k = t % per;
      const plug = smooth(2, 3, k) * (1 - smooth(13.2, 14.2, k));
      head.position.set(-5.2 + (1 - plug) * 3.6, 0, 0);
      const ca = cable.geometry.attributes.position, c = new THREE.CatmullRomCurve3([V(head.position.x + 1.1, 0, 0), V(head.position.x + 3, -2.8, 0), V(4, -3.6, 0), V(8.3, -2.2, 0)]);
      c.getPoints(23).forEach((p, i) => ca.setXYZ(i, p.x, p.y, p.z)); ca.needsUpdate = true;
      const open = k > 10.6 && k < 12.4;
      arm.rotation.z += ((open ? 0.32 : 0) - arm.rotation.z) * Math.min(1, dt / 120);
      const flowing = plug > 0.98 && !open;
      const target = flowing ? 6.4 + Math.sin(t * 1.7) * 0.25 + Math.sin(t * 5.3) * 0.08 : 0;
      P += (target - P) * Math.min(1, dt / 500);
      cur.forEach((d, i) => { d.visible = flowing; flow((t * 0.22 + i / cur.length) % 1, d.position); });
      const over = P > 3;
      meterMat.color.set(0xffffff).lerp(LIME, flowing && k > 3.2 ? 0.55 : 0); hot(lb.meter, flowing && k > 3.2 && k < 6.5);
      hot(lb.relay, k > 10.4 && k < 12.6);
      const send = over && k > 6;
      wifiMat.color.set(0xffffff).lerp(LIME, send ? 0.6 : 0);
      waves.forEach((r, i) => { const u = (t * 0.6 + i / 3) % 1; r.visible = send; r.position.set(-7.6, -1.4, -1.3); r.scale.setScalar(0.4 + u * 2.6); r.material.opacity = (1 - u) * 0.8; });
      hist.push(P / 8); hist.shift();
      traces(tc, [{ name: 'effekt, watt (streckat: 3 W)', data: hist.map((v) => v * 2 - 1) }], { mid: false, marks: [{ row: 0, at: [3 / 8 * 2 - 1] }] });
      api.step(k < 2 ? 0 : k < 3.2 ? 1 : k < 6 ? 2 : k < 10.4 ? 3 : k < 13 ? 4 : 0);
      rd.innerHTML = open ? 'Reläet är <b>öppet</b> · ingen ström' : P < 0.05 ? 'Ingen laddare inkopplad · <b>0 W</b>' : `Effekt <b>${fmt(P, 1)} W</b>${over && k > 6 ? ` · <b class="go">en mobil laddar</b> · emob {"power": ${P.toFixed(1)}}` : ''}`;
    });
  },
};

// ═══════════════════ 9. Smart trainer (Wahoo KICKR CORE): flywheel, magnetic resistance, ANT+ radio (Skellefteåtriangeln). Unit: 1 cm ═══════════════════
SCENES.trainer = {
  title: 'Cykeltrainern', kick: 'Makro · 10⁰ m', unit: 0.01,
  get view() { return fit({ t: [16, 36, 0], d: 250, el: 0.22, az: 0.38 }, { d: 310 }); },
  lead: 'En cykeltrainer gör en vanlig cykel till en motionscykel. Bakhjulet tas bort, och cykeln står på en trainer som bromsar, mäter farten och sänder den trådlöst.',
  steps: ['Bakhjulet är borttaget. Kedjan går direkt till kassetten på trainerns axel.', 'Axeln driver ett tungt svänghjul. Det håller farten uppe, som när man rullar på vägen.', 'Magneter bromsar svänghjulet utan att röra det. Det gör att trampandet känns tungt.', 'Trainern sänder farten över ANT+, en radio på 2,4 GHz som cykeldatorer också använder.', 'En dator tar emot farten och kan låta ett spel rulla i samma takt.'],
  note: 'Trainern är ritad förenklat; hur svänghjulet drivs och bromsas och var magneterna sitter är inte kontrollerat (k). Farten räknas här med en tänkt utväxling (k).',
  build(g, api) {
    const AX = V(0, 34, 0);
    // legs and body
    for (const x of [-16, 16]) g.add(ink(new THREE.CylinderGeometry(1.6, 1.6, 64, 12).rotateX(Math.PI / 2).translate(x, 1.6, 0), { s: 0.1, thr: 40 }));
    g.add(ink(new THREE.BoxGeometry(36, 3, 6).translate(0, 3, 0), { s: 0.1 }));
    g.add(ink(new THREE.BoxGeometry(10, 30, 8).translate(0, 18, -3), { s: 0.12 }));
    g.add(ink(new THREE.CylinderGeometry(4.5, 4.5, 9, 24).rotateX(Math.PI / 2).translate(AX.x, AX.y, -3), { s: 0.08, thr: 30 }));
    // cassette on the drive side, the axle, the flywheel below with its magnets
    const cass = new THREE.Group(); cass.position.set(AX.x, AX.y, 3); g.add(cass);
    for (let i = 0; i < 9; i++) cass.add(ink(new THREE.CylinderGeometry(2.6 + i * 0.45, 2.6 + i * 0.45, 0.25, 28).rotateX(Math.PI / 2).translate(0, 0, 2.4 - i * 0.45), { s: 0.02, thr: 30 }));
    const FW = V(-2, 15, 5);
    const fly = new THREE.Group(); fly.position.copy(FW); g.add(fly);
    fly.add(ink(new THREE.CylinderGeometry(13, 13, 3.4, 48).rotateX(Math.PI / 2), { s: 0.1, thr: 30 }));
    for (let i = 0; i < 6; i++) { const a = i / 6 * TAU; fly.add(poly([V(Math.cos(a) * 2, Math.sin(a) * 2, 1.75), V(Math.cos(a) * 11.5, Math.sin(a) * 11.5, 1.75)], GREY)); }
    const magMats = [];
    for (let i = 0; i < 5; i++) {
      const a = Math.PI * 0.95 + i * 0.27, m = lam(0xd9d8d1); magMats.push(m);
      const o = ink(new THREE.BoxGeometry(2.4, 2.4, 1.6), { mat: m, s: 0.02 }); o.position.set(FW.x + Math.cos(a) * 14.6, FW.y + Math.sin(a) * 14.6, FW.z + 0.6); o.rotation.z = a; g.add(o);
    }
    const field = Array.from({ length: 5 }, (_, i) => { const a = Math.PI * 0.95 + i * 0.27, pts = []; for (let j = 0; j <= 12; j++) { const b = j / 12 * Math.PI; pts.push(V(FW.x + Math.cos(a) * (13.6 + Math.sin(b) * 1.6), FW.y + Math.sin(a) * (13.6 + Math.sin(b) * 1.6), FW.z + 1.6 - j / 12 * 3.4)); } const l = poly(pts, LIME_D, { dashed: true, dash: 0.4, gap: 0.35 }); g.add(l); return l; });
    // belt from the axle to the flywheel hub
    const belt = (r1, r2) => { const p = []; for (let i = 0; i <= 24; i++) { const a = Math.PI * (0.5 + i / 24); p.push(V(AX.x + Math.cos(a) * r1, AX.y + Math.sin(a) * r1, 6.3)); } for (let i = 0; i <= 24; i++) { const a = Math.PI * (1.5 + i / 24); p.push(V(FW.x + Math.cos(a) * r2, FW.y + Math.sin(a) * r2, 6.3)); } p.push(p[0].clone()); return p; };
    g.add(ink(new THREE.CylinderGeometry(6, 6, 1.2, 32).rotateX(Math.PI / 2).translate(AX.x, AX.y, 6.3), { s: 0.04, thr: 30 }));
    g.add(poly(belt(6.1, 2.1), GREY));
    const lb = {
      cass: label('kassetten', 'kedjan griper här', V(AX.x + 2, AX.y + 7, 6), g), fly: label('svänghjulet', 'tungt, snurrar fort', V(FW.x - 6, FW.y - 6, 8), g),
      mag: label('magneterna', 'bromsar utan att röra', V(FW.x - 18, FW.y + 10, 6), g), ant: label('ANT+', 'radio till rpi5', V(-4, 52, -3), g),
    };
    // the old tandem's rear end, as a ghost
    const BB = V(46, 27, 0), SC = V(38, 68, 0);
    g.add(poly([AX, BB, SC, AX], PALE), poly([SC, V(40, 76, 0)], PALE), poly([V(33, 77, 0), V(48, 77, 0)], PALE));
    label('tandemcykeln', 'från 70-talet', V(42, 50, 0), g, 'ghost');
    const ringC = ring('z', 48); ringC.scale.setScalar(10); ringC.position.set(BB.x, BB.y, 5); g.add(ringC);
    const crank = new THREE.Group(); crank.position.set(BB.x, BB.y, 6); g.add(crank);
    crank.add(ink(new THREE.BoxGeometry(17, 1.6, 1.2).translate(8.5, 0, 0), { s: 0.04 }), ink(new THREE.BoxGeometry(9, 1.4, 3.4).translate(17, 0, 2.6), { s: 0.04 }));
    g.add(poly([V(AX.x, AX.y + 4.4, 5.5), V(BB.x, BB.y + 10, 5.5)], GREY), poly([V(AX.x, AX.y - 4.4, 5.5), V(BB.x, BB.y - 10, 5.5)], GREY));
    // radio rings from the body
    const RX = V(0, 32, -7.5), rings = Array.from({ length: 4 }, () => { const r = ring('z', 48); r.material.color.copy(LIME).multiplyScalar(0.7); g.add(r); return r; });
    const sl = slider(api, 'Trampa', 0, 110, 80);
    const tc = canvas(api, 300, 60), rd = readout(api), hist = new Array(160).fill(0);
    let a = 0, fa = 0, speed = 0;
    const gear = 42 / 16, wheel = 2.1;   // an assumed gear and wheel size, metres per wheel turn
    return run((t, dt) => {
      const s = dt / 1000;
      if (!sl.touched) sl.inp.value = Math.round(Math.max(0, 74 + Math.sin(t * 0.21) * 22 + Math.sin(t * 0.07) * 10));
      const cad = +sl.inp.value; sl.out.textContent = `${cad} varv/min`;
      const vTarget = cad / 60 * gear * wheel * 3.6;
      speed += (vTarget - speed) * Math.min(1, s * (vTarget < speed ? 0.6 : 1.4));   // the flywheel keeps rolling a moment when you stop
      a -= cad / 60 * TAU * s; crank.rotation.z = a;
      const axleW = speed / 3.6 / wheel * TAU; cass.rotation.z -= axleW * s; fa -= axleW * 3 * s; fly.rotation.z = fa;
      const brake = clamp(speed / 30, 0.15, 1);
      magMats.forEach((m) => m.color.set(0xd9d8d1).lerp(LIME, t > 6 ? 0.25 + brake * 0.5 : 0));
      field.forEach((l) => { l.visible = t > 6; l.material.opacity = 0.4 + brake * 0.6; });
      hot(lb.mag, t > 6 && t < 9); hot(lb.cass, t < 3); hot(lb.fly, t > 3 && t < 6);
      rings.forEach((r, i) => { const u = (t * 0.5 + i / 4) % 1; r.visible = t > 9 && speed > 0.5; r.position.copy(RX); r.scale.setScalar(2 + u * 24); r.material.opacity = (1 - u) * 0.8; });
      hot(lb.ant, t > 9);
      hist.push(speed / 40 * 2 - 1); hist.shift();
      traces(tc, [{ name: 'fart, km/h', data: hist }], { mid: false });
      api.step(t < 3 ? 0 : t < 6 ? 1 : t < 9 ? 2 : t < 12 ? 3 : 4);
      rd.innerHTML = `Fart <b>${fmt(speed, 1)} km/h</b> · ${t > 12 ? `<b class="go">bike {"speed_kmh": ${speed.toFixed(1)}}</b>` : 'svänghjulet snurrar'}`;
    });
  },
};

// ── which cards get these hops (each checked against data/installations.json) ──
hop('dialogen', { scene: 'mikrofon', dir: 'in', label: 'Mikrofonen i röret' });
hop('dialogen', { scene: 'macmini', dir: 'in', label: 'Mac minin som lyssnar' });
hop('skykraft', { scene: 'mikrofon', dir: 'in', label: 'Mikrofonen' });
hop('skykraft', { scene: 'macmini', dir: 'in', label: 'Mac minin' });
hop('ljudkonst', { scene: 'macmini', dir: 'in', label: 'Mac mini 3 med kåpan av' });
hop('snurra-huset', { scene: 'hall', dir: 'in', label: 'Hallsensorer och magneter' });
hop('snurra-huset', { scene: 'macmini', dir: 'in', label: 'Mac minin' });
hop('triangeln', { scene: 'trainer', dir: 'in', label: 'Cykeltrainern' });
hop('triangeln', { scene: 'macmini', dir: 'in', label: 'Mac minin som kör spelet' });
hop('sokrates', { scene: 'mems', dir: 'in', label: 'Accelerometern i väggen' });
hop('ljudrummet', { scene: 'hogtalare', dir: 'in', label: 'Högtalaren' });
hop('skogen', { scene: 'hogtalare', dir: 'in', label: 'Högtalarna i stammarna' });
hop('sag-ja', { scene: 'knapp', dir: 'in', label: 'Knappen' });
hop('droneport', { scene: 'knapp', dir: 'in', label: 'Knapparna' });
// Oro eller drömmar has no buttons (Lukas, 30 Oct 2026)
// hop('orostunneln', { scene: 'knapp', dir: 'in', label: 'Knapparna' });
hop('elbil', { scene: 'shelly', dir: 'in', label: 'Shelly-pluggen' });
hop('boliden', { scene: 'shelly', dir: 'in', label: 'Shelly-pluggen' });
hop('alimak', { scene: 'shelly', dir: 'in', label: 'Shelly som tänder lampan' });
for (const card of ['rutschkanan', 'vattentunneln', 'alimak', 'social', 'kompetenstaltet']) hop(card, { scene: 'esp32', dir: 'in', label: 'ESP32:an' });
