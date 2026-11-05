import { bline, bdash } from './world.js';
// Media on screens and walls: each projection or display in the model gets a small generative "film",
// drawn in the same ink-on-paper style with lime accents, that reacts to the installation's events.
// Where we have the real footage (assets/media/, from the LTU material) the screen plays it, with the reactions on top;
// the others are illustrations of what the screen shows, not captures of the real content.
// Positions come from the screen actors in the Unreal model (data/se26/model.json); F-local metres.
import * as THREE from 'three';

const INK = '#0a0b09', PAPER = '#f4f3ee', LIME = '#cafe03', MUT = '#8d8e87';
export const MEDIA = {};   // id → { state, draw, mesh, ... }

// x0..x1 / z0..z1 span, y0..y1 height, n = facing ('+x','-x','+z','-z')
const SURF = [
  { id: 'river', inst: 'floden', a: [-13.1, -1.58], y: [0.6, 2.9], at: 0.88, n: '-z', px: [1024, 210] },
  { id: 'doc', inst: 'dokumentaren', a: [-5.2, -0.9], y: [0.25, 2.65], at: -22.22, n: '+x', px: [512, 300] },
  { id: 'skykraft', inst: 'skykraft', a: [7.58, 8.33], y: [0.62, 1.86], at: -4.6, n: '+x', px: [256, 300] },
  { id: 'ace', inst: 'ace', a: [5.3, 6.5], y: [0.75, 1.45], at: 6.28, n: '-z', px: [384, 224] },
  { id: 'house', inst: 'snurra-huset', a: [6.85, 7.9], y: [0.5, 1.2], at: 4.88, n: '-z', px: [320, 216] },
  { id: 'bike', inst: 'triangeln', a: [10.0, 12.4], y: [0.7, 2.05], at: 10.6, n: '-z', px: [512, 288] },
  { id: 'sua', inst: 'sokrates', a: [6.2, 6.75], y: [1.25, 1.62], at: 10.45, n: '-z', px: [256, 172] },
  { id: 'booth', inst: 'framtidsbaset', a: [-10.85, -10.3], y: [1.0, 1.36], at: 8.19, n: '-z', px: [256, 172] },
  { id: 'player', inst: 'framtidsbaset', a: [4.3, 4.9], y: [0.85, 1.25], at: -5.06, n: '+x', px: [256, 172], host: 'ipad-player' },
  { id: 'recycle', inst: 'atervinning', a: [9.55, 10.0], y: [0.95, 1.3], at: -3.05, n: '+x', px: [256, 196] },
  { id: 'drone', inst: 'droneport', a: [10.9, 11.7], y: [1.35, 1.85], at: 5.45, n: '-z', px: [320, 200] },
];

function surface(F, s, draw) {
  const [W, H] = s.px, c = document.createElement('canvas'); c.width = W; c.height = H;
  const tex = new THREE.CanvasTexture(c); tex.colorSpace = THREE.SRGBColorSpace; tex.anisotropy = 4;
  const w = s.a[1] - s.a[0], h = s.y[1] - s.y[0];
  const m = new THREE.Mesh(new THREE.PlaneGeometry(w, h), new THREE.MeshBasicMaterial({ map: tex, toneMapped: false }));
  const mid = (s.a[0] + s.a[1]) / 2, my = (s.y[0] + s.y[1]) / 2;
  if (s.n[1] === 'z') { m.position.set(mid, my, s.at); m.rotation.y = s.n[0] === '-' ? Math.PI : 0; }
  else { m.position.set(s.at, my, mid); m.rotation.y = s.n[0] === '-' ? -Math.PI / 2 : Math.PI / 2; }
  // a thin ink frame so the screen reads as a screen
  const fr = new THREE.LineSegments(new THREE.EdgesGeometry(new THREE.PlaneGeometry(w, h)), bline({ color: INK }));
  m.add(fr);
  F.add(m);
  const g = c.getContext('2d');
  return { ...s, mesh: m, frame: fr, tex, g, W, H, draw, state: {}, t: 0, acc: 0 };
}

// ── the films ──
const clear = (g, W, H, bg = PAPER) => { g.fillStyle = bg; g.fillRect(0, 0, W, H); };
const line = (g, w = 1.5, c = INK) => { g.strokeStyle = c; g.lineWidth = w; g.lineCap = 'round'; g.lineJoin = 'round'; };

// The river: a flow field of ink lines; hands (from the "Prova" pad or a visitor) push the water aside.
function drawRiver(M) {
  const { g, W, H, t, state: s } = M;
  const hands = (s.hands || []).filter((h) => t - h.t < 2.2);
  s.hands = hands;
  clear(g, W, H, '#eef3f3');
  for (let k = 0; k < 14; k++) {
    const y0 = 14 + k * (H - 28) / 13;
    line(g, k % 3 ? 1.1 : 2, k % 4 === 0 ? '#5f7d84' : '#8aa3a8');
    g.beginPath();
    for (let x = 0; x <= W; x += 6) {
      let y = y0 + Math.sin(x * 0.018 + t * 1.6 + k * 0.7) * 5 + Math.sin(x * 0.051 - t * 0.9) * 2;
      for (const h of hands) {
        const dx = x - h.x * W, dy = y - h.y * H, r = 70, d2 = dx * dx + dy * dy;
        if (d2 < r * r * 4) { const f = Math.exp(-d2 / (r * r)) * (1 - (t - h.t) / 2.2); y += Math.sign(dy || 1) * 34 * f; }
      }
      x ? g.lineTo(x, y) : g.moveTo(x, y);
    }
    g.stroke();
  }
  for (const h of hands) { g.fillStyle = LIME; g.strokeStyle = INK; g.lineWidth = 2; g.beginPath(); g.arc(h.x * W, h.y * H, 9, 0, 7); g.fill(); g.stroke(); }
}

// Documentary wall, as its TouchDesigner network draws it (docs/kallor/touchdesigner.md): black-and-white archive film
// in a 2×2 grid; every person in the room becomes a box filled with tinted archive images, with lines between them,
// and each beat from the sound artwork shifts the colour and makes the picture jump. The archive itself is drawn.
function drawDoc(M) {
  const { g, W, H, t, state: s } = M;
  const beat = (t * 1.9) % 1, hit = Math.max(0, 1 - beat * 4), hue = (Math.floor(t * 1.9) * 33) % 360;
  g.fillStyle = '#191a17'; g.fillRect(0, 0, W, H);
  const cw = W / 2, ch = H / 2;
  for (let i = 0; i < 4; i++) {   // the film: four grey archive frames with chimneys, a dam, a mine headframe, a street
    const x = (i % 2) * cw, y = Math.floor(i / 2) * ch, j = hit * 4 * Math.sin(i * 7.1 + t);
    const sh = 60 + 25 * Math.sin(t * 0.3 + i * 1.7);
    g.fillStyle = `rgb(${sh},${sh},${sh - 4})`; g.fillRect(x + 4, y + 4, cw - 8, ch - 8);
    g.strokeStyle = '#d8d7cf'; g.lineWidth = 1.4; g.beginPath();
    const b = y + ch - 18 + j;
    if (i === 0) { g.moveTo(x + 20, b); g.lineTo(x + 20, b - 70); g.lineTo(x + 34, b - 70); g.lineTo(x + 34, b); g.moveTo(x + 60, b); g.lineTo(x + 60, b - 95); g.lineTo(x + 70, b - 95); g.lineTo(x + 70, b); g.moveTo(x + 10, b); g.lineTo(x + cw - 10, b); }
    if (i === 1) { g.moveTo(x + 14, b - 40); g.lineTo(x + cw - 14, b - 52); g.lineTo(x + cw - 14, b); g.lineTo(x + 14, b); g.closePath(); }
    if (i === 2) { g.moveTo(x + cw / 2 - 40, b); g.lineTo(x + cw / 2, b - 100); g.lineTo(x + cw / 2 + 40, b); g.moveTo(x + cw / 2 - 25, b - 55); g.lineTo(x + cw / 2 + 25, b - 55); }
    if (i === 3) { for (let k = 0; k < 5; k++) { g.strokeRect(x + 14 + k * 46, b - 40 - (k % 2) * 16, 38, 40 + (k % 2) * 16); } }
    g.stroke();
  }
  // the people: boxes of tinted archive images, joined by lines
  const n = s.people ?? 3, P = [];
  for (let p = 0; p < n; p++) P.push([W * (0.2 + 0.6 * ((p * 0.37 + Math.sin(t * 0.21 + p * 2.3) * 0.18 + 0.5) % 1)), H * (0.35 + 0.3 * Math.sin(t * 0.33 + p * 1.9))]);
  g.strokeStyle = `hsla(${(hue + 60) % 360},35%,76%,.8)`; g.lineWidth = 1.5; g.beginPath();
  for (let a = 0; a < P.length; a++) for (let c = a + 1; c < P.length; c++) { g.moveTo(...P[a]); g.lineTo(...P[c]); }
  g.stroke();
  for (const [x, y] of P) {
    const w = 46 + hit * 8, h = 70 + hit * 10;
    g.fillStyle = `hsla(${hue},32%,68%,.85)`;   // the real film shifts hue on the beat; muted here to sit with the drawing g.fillRect(x - w / 2, y - h / 2, w, h);
    g.strokeStyle = '#f4f3ee'; g.lineWidth = 1; g.strokeRect(x - w / 2, y - h / 2, w, h);
    g.fillStyle = 'rgba(25,26,23,.45)'; g.fillRect(x - w / 2 + 6, y - h / 2 + 8, w - 12, h * 0.4);
  }
  g.fillStyle = '#f4f3ee'; g.font = '600 12px IBM Plex Mono, monospace'; g.fillText('ARKIVET · ETT INDUSTRIELLT SEKEL', 12, 18);
  if (hit > 0.5) { g.fillStyle = LIME; g.fillRect(W - 22, 8, 12, 12); }
}

// SkyKraft: a jet turbine seen from the front; blowing spins it up.
function drawSky(M) {
  const { g, W, H, state: s } = M;
  s.speed = (s.speed ?? 0.1) * 0.985 + (s.blow ?? 0) * 0.02; s.ang = (s.ang ?? 0) + s.speed * 0.5;
  clear(g, W, H);
  const cx = W / 2, cy = H / 2 - 10, R = 100;
  line(g, 3); g.beginPath(); g.arc(cx, cy, R, 0, 7); g.stroke(); line(g, 1.2, MUT); g.beginPath(); g.arc(cx, cy, R - 12, 0, 7); g.stroke();
  for (let i = 0; i < 14; i++) { const a = s.ang + i / 14 * Math.PI * 2; line(g, 2); g.beginPath(); g.moveTo(cx + Math.cos(a) * 18, cy + Math.sin(a) * 18); g.quadraticCurveTo(cx + Math.cos(a + 0.35) * 60, cy + Math.sin(a + 0.35) * 60, cx + Math.cos(a + 0.2) * (R - 14), cy + Math.sin(a + 0.2) * (R - 14)); g.stroke(); }
  g.fillStyle = LIME; g.beginPath(); g.arc(cx, cy, 16, 0, 7); g.fill(); line(g, 2); g.stroke();
  g.fillStyle = INK; g.font = '600 15px IBM Plex Mono, monospace'; g.fillText(`e-SAF · ${Math.round(s.speed * 1400)} rpm`, 20, H - 18);
}

// ACE Powerhouse: the building's interior in a perspective that follows the visitor's head.
function drawAce(M) {
  const { g, W, H, t, state: s } = M;
  clear(g, W, H, '#f0efe9');
  const hx = (s.head?.x ?? 0.5 + Math.sin(t * 0.4) * 0.15) - 0.5, hy = (s.head?.y ?? 0.5) - 0.5;
  const vx = W / 2 - hx * 160, vy = H / 2 - hy * 90, k = 0.38;
  const inner = [[vx - W * k / 2, vy - H * k / 2], [vx + W * k / 2, vy - H * k / 2], [vx + W * k / 2, vy + H * k / 2], [vx - W * k / 2, vy + H * k / 2]];
  const outer = [[0, 0], [W, 0], [W, H], [0, H]];
  line(g, 1.5); g.beginPath(); inner.forEach(([x, y], i) => (i ? g.lineTo(x, y) : g.moveTo(x, y))); g.closePath(); g.stroke();
  for (let i = 0; i < 4; i++) { g.beginPath(); g.moveTo(...outer[i]); g.lineTo(...inner[i]); g.stroke(); }
  line(g, 0.8, MUT);
  for (let f = 1; f < 5; f++) { const y = H * f / 5, yi = inner[0][1] + (inner[3][1] - inner[0][1]) * f / 5; g.beginPath(); g.moveTo(0, y); g.lineTo(inner[0][0], yi); g.moveTo(W, y); g.lineTo(inner[1][0], yi); g.stroke(); }
  if (s.pulse && t - s.pulse < 1.2) { g.fillStyle = `rgba(236,196,20,${1 - (t - s.pulse) / 1.2})`; /* Kompetens is yellow */ g.beginPath(); g.arc(vx, vy, 30 + (t - s.pulse) * 80, 0, 7); g.fill(); }
  g.fillStyle = INK; g.font = '600 13px IBM Plex Mono, monospace'; g.fillText('ARCTIC CENTER OF ENERGY', 12, 20);
}

// Spin the house: a generative apartment facade grows; amber clockwise, blue counter-clockwise.
// Snurra huset, as its TouchDesigner network plays it (Buildswiper): every step turns the building a quarter turn; a
// target side is picked at random, and when it comes round a scrape sounds, input rests 8 s and a new target is picked
function drawHouse(M) {
  const { g, W, H, t, state: s } = M;
  const turns = s.turns ?? 0;
  s.goal ??= 2; s.shown = s.shown ?? turns;
  s.shown += (turns - s.shown) * 0.25;   // ease the quarter turns
  const side = ((Math.round(turns) % 4) + 4) % 4;
  if (side === s.goal && !s.won) { s.won = t; }
  if (s.won && t - s.won > 8) { s.won = 0; s.goal = (side + 1 + Math.floor(Math.random() * 3)) % 4; }
  clear(g, W, H, s.dir === 'ccw' ? '#dfe8ff' : '#fbecd2');
  // the building from above-front: four facades, the visible one drawn by the current quarter turn
  // a box turning on a table: the current face and the next one, their widths from how far into the quarter turn it is
  const cx = W / 2, by = H - 22, bw = 150, hh = 120, base = Math.floor(s.shown), a = (s.shown - base) * Math.PI / 2;
  const faces = [['#ffffff', 3], ['#f1efe6', 5], ['#e7e5dc', 4], ['#ffffff', 6]];
  let x = cx - (Math.cos(a) + Math.sin(a)) * bw / 2;
  for (const [k, w] of [[0, Math.cos(a) * bw], [1, Math.sin(a) * bw]]) {
    if (w < 1) continue;
    const idx = ((base + k) % 4 + 4) % 4, n = faces[idx][1], ww = w / n;
    g.fillStyle = faces[idx][0]; g.fillRect(x, by - hh, w, hh); line(g, 1.6); g.strokeRect(x, by - hh, w, hh);
    for (let f = 0; f < 5; f++) for (let c = 0; c < n; c++) g.strokeRect(x + c * ww + 3, by - hh + 6 + f * 22, Math.max(1, ww - 6), 14);
    if (idx === s.goal) { g.fillStyle = 'rgba(202,254,3,.35)'; g.fillRect(x, by - hh, w, hh); }
    x += w;
  }
  g.fillStyle = INK; g.font = '600 13px IBM Plex Mono, monospace'; g.fillText('SPIN THE HOUSE', 14, 20);
  g.fillText(s.won ? 'RÄTT SIDA!' : `målsida ${s.goal + 1}`, W - 110, 20);
  if (s.won) { g.fillStyle = LIME; g.fillRect(W - 122, 8, 6, 14); }
}

// Skellefteåtriangeln: harbour, airport and travel centre; the dot moves at the bike's speed.
function drawBike(M) {
  const { g, W, H, state: s } = M;
  s.p = ((s.p ?? 0) + (s.speed ?? 6) / 31 * 0.004) % 1;
  clear(g, W, H);
  const P = [[W * 0.18, H * 0.75, 'Hamnen'], [W * 0.5, H * 0.18, 'Flygplatsen'], [W * 0.82, H * 0.75, 'Resecentrum']];
  line(g, 2.5); g.beginPath(); P.forEach(([x, y], i) => (i ? g.lineTo(x, y) : g.moveTo(x, y))); g.closePath(); g.stroke();
  g.font = '600 15px IBM Plex Mono, monospace'; g.fillStyle = INK;
  for (const [x, y, n] of P) { g.beginPath(); g.arc(x, y, 7, 0, 7); g.fill(); g.fillText(n, x - 40, y + (y > H / 2 ? 26 : -14)); }
  const seg = Math.floor(s.p * 3), f = s.p * 3 - seg, A = P[seg], B = P[(seg + 1) % 3];
  const x = A[0] + (B[0] - A[0]) * f, y = A[1] + (B[1] - A[1]) * f;
  g.fillStyle = LIME; g.beginPath(); g.arc(x, y, 12, 0, 7); g.fill(); line(g, 2); g.stroke();
  g.fillStyle = INK; g.fillText(`${(s.speed ?? 0).toFixed(0)} km/h`, 16, 24);
}

// iPad-sized screens: a line of text and a small status. `note` is a small caption at the bottom
// (e.g. 'exempel' when the text is made up rather than real visitor content).
function textScreen(title, body, accent = false, note = '') {
  return (M) => {
    const { g, W, H, t, state: s } = M;
    clear(g, W, H, accent && s.flash && t - s.flash < 0.8 ? LIME : PAPER);
    g.fillStyle = MUT; g.font = '600 12px IBM Plex Mono, monospace'; g.fillText(title, 12, 20);
    if (note) g.fillText(note, 12, H - 10);
    g.fillStyle = INK; g.font = '600 17px Alegreya, serif';
    const words = String(s.text || body).split(' '); let ln = '', y = 48;
    for (const w of words) { if (g.measureText(ln + w).width > W - 24) { g.fillText(ln, 12, y); ln = ''; y += 22; } ln += w + ' '; }
    g.fillText(ln, 12, y);
  };
}

// Droneport: tally of the six options (made-up example counts, marked as such on the screen).
function drawDrone(M) {
  const { g, W, H, state: s } = M;
  // the six options, hyphenated onto two lines where a full name would not fit a bar
  const opts = ['Medicin', 'Skogs-\nbränder', 'Pizza', 'För-\nsvunna', 'Vind-\nkraft', 'Paket'];
  s.votes ||= [34, 51, 22, 18, 27, 30];
  clear(g, W, H);
  const max = Math.max(...s.votes), bw = (W - 30) / 6;
  g.fillStyle = MUT; g.font = '600 10px IBM Plex Mono, monospace'; g.fillText('exempel', W - 56, 12);
  g.font = '600 9px IBM Plex Mono, monospace';
  s.votes.forEach((v, i) => {
    const h = (H - 50) * v / max, x = 15 + i * bw;
    g.fillStyle = s.last === i ? LIME : '#d9d8d1'; g.fillRect(x + 4, H - 30 - h, bw - 8, h);
    line(g, 1.2); g.strokeRect(x + 4, H - 30 - h, bw - 8, h);
    const lines = opts[i].split('\n');
    g.fillStyle = INK; lines.forEach((t, j) => g.fillText(t, x + 7, H - 6 - (lines.length - 1 - j) * 10));
  });
}

const DRAW = {
  river: drawRiver, doc: drawDoc, skykraft: drawSky, ace: drawAce, house: drawHouse, bike: drawBike, drone: drawDrone,
  sua: textScreen('SOKRATES · FRÅGA 1/11', 'Ge väggen en high five, så ställer den en fråga om AI.', true),
  booth: textScreen('SKICKA DINA TANKAR TILL FRAMTIDEN', 'Välj: börja med, sluta med eller fortsätta med.', true),
  player: textScreen('SOCIALHÖRNET · GODKÄNDA KLIPP', '▶ ”Börja med att lyssna på de unga.”', true, 'exempel'),
  recycle: textScreen('SKROTMONSTRET', 'Mata mig med en gammal pryl!', true),
};

export function buildMedia(F) {
  for (const s of SURF) {
    MEDIA[s.id] = surface(F, s, DRAW[s.id]);
  }
  return MEDIA;
}
// redraw at ~15 fps, only when the floor is close enough to see the screens
export function updateMedia(dt, near) {
  for (const M of Object.values(MEDIA)) {
    M.t += dt / 1000; M.acc += dt;
    if (!near || M.acc < 66) continue;
    M.acc = 0; M.draw(M); M.tex.needsUpdate = true;
  }
}
