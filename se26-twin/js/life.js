// Small signs of life on the floor: sketch visitors who walk between installations (around walls, on the
// grid from tools/walkgrid.py) and ink rings that spread on the floor where something happens.
// Visitors are an illustration, not tracking: nobody is followed in the real exhibition.
import * as THREE from 'three';
import { figure } from './figure.js';

const V = (x, y, z) => new THREE.Vector3(x, y, z);
let F, G, targets = [], onArrive = () => {}, people = [], rings = [];
let shown = true;

// ── grid + A* ──
const free = (x, z) => x >= 0 && z >= 0 && x < G.w && z < G.h && G.rows[z][x] === '.';
const toCell = (p) => [Math.round((p.x - G.x0) / G.cell - 0.5), Math.round((p.z - G.z0) / G.cell - 0.5)];
const toPos = (x, z) => V(G.x0 + (x + 0.5) * G.cell, 0, G.z0 + (z + 0.5) * G.cell);
function nearestFree([x, z]) {
  for (let r = 0; r < 25; r++) for (let dx = -r; dx <= r; dx++) for (let dz = -r; dz <= r; dz++) {
    if (Math.max(Math.abs(dx), Math.abs(dz)) === r && free(x + dx, z + dz)) return [x + dx, z + dz];
  }
  return null;
}
function astar(a, b) {
  const W = G.w, key = (x, z) => z * W + x, goal = key(...b);
  const g = new Map([[key(...a), 0]]), from = new Map(), open = [[0, key(...a)]], done = new Set();
  const h = (k) => { const dx = Math.abs((k % W) - b[0]), dz = Math.abs(Math.floor(k / W) - b[1]); return Math.max(dx, dz) + 0.414 * Math.min(dx, dz); };
  while (open.length) {
    let bi = 0; for (let i = 1; i < open.length; i++) if (open[i][0] < open[bi][0]) bi = i;
    const [, k] = open[bi]; open[bi] = open[open.length - 1]; open.pop();
    if (k === goal) { const p = [k]; let c = k; while (from.has(c)) { c = from.get(c); p.push(c); } return p.reverse().map((c) => [c % W, Math.floor(c / W)]); }
    if (done.has(k)) continue; done.add(k);
    if (done.size > 9000) return null;
    const x = k % W, z = Math.floor(k / W);
    for (let dx = -1; dx <= 1; dx++) for (let dz = -1; dz <= 1; dz++) {
      if (!dx && !dz || !free(x + dx, z + dz) || (dx && dz && (!free(x + dx, z) || !free(x, z + dz)))) continue;
      const nk = key(x + dx, z + dz), ng = g.get(k) + (dx && dz ? 1.414 : 1);
      if (ng < (g.get(nk) ?? Infinity)) { g.set(nk, ng); from.set(nk, k); open.push([ng + h(nk), nk]); }
    }
  }
  return null;
}
// drop waypoints that can be skipped in a straight line over free cells
function sight(a, b) {
  const n = Math.ceil(Math.hypot(b[0] - a[0], b[1] - a[1]) * 2);
  for (let i = 1; i < n; i++) { const t = i / n; if (!free(Math.round(a[0] + (b[0] - a[0]) * t), Math.round(a[1] + (b[1] - a[1]) * t))) return false; }
  return true;
}
function smooth(path) {
  const out = [path[0]]; let i = 0;
  while (i < path.length - 1) { let j = path.length - 1; while (j > i + 1 && !sight(path[i], path[j])) j--; out.push(path[j]); i = j; }
  return out.map(([x, z]) => toPos(x, z));
}

// ── visitors ──
// the shared sketch figure (figure.js), each in a soft colour of its own
function person() {
  const g = figure();
  F.add(g);
  return { g, path: [], seg: 0, wait: Math.random() * 3, at: null, phase: Math.random() * 6, speed: 0.9 + Math.random() * 0.4 };
}
function pickTarget(p) {
  const tot = targets.reduce((s, t) => s + t.w, 0);
  for (let tries = 0; tries < 6; tries++) {
    let r = Math.random() * tot, t = targets[0];
    for (const x of targets) { r -= x.w; if (r <= 0) { t = x; break; } }
    if (t === p.at) continue;
    const from = nearestFree(toCell(p.g.position)), path = from && astar(from, t.cell);
    if (path && path.length > 1) { p.path = smooth(path); p.seg = 0; p.at = t; return; }
  }
  p.wait = 2;
}

// ── rings ──
const RING = new THREE.RingGeometry(0.96, 1, 48).rotateX(-Math.PI / 2);
export function ripple(pos, color = 0x0a0b09) {
  if (!F) return;
  const m = new THREE.Mesh(RING, new THREE.MeshBasicMaterial({ color, transparent: true, opacity: 0.7, depthWrite: false }));
  m.position.set(pos.x, 0.03, pos.z); m.scale.setScalar(0.2); F.add(m);
  rings.push({ m, t: 0 });
}

export function initLife(opts) {
  F = opts.F; G = opts.grid; onArrive = opts.onArrive || onArrive;
  targets = opts.targets.map((t) => ({ ...t, cell: nearestFree(toCell(t.pos)) })).filter((t) => t.cell);
  const n = matchMedia('(prefers-reduced-motion: reduce)').matches ? 0 : opts.count ?? 12;
  for (let i = 0; i < n; i++) {
    const p = person(), t = targets[Math.floor(Math.random() * targets.length)];
    p.g.position.copy(toPos(...t.cell)); p.at = t; p.wait = 1 + Math.random() * 6;
    people.push(p);
  }
}
export function showVisitors(on) { shown = on; }

export function updateLife(dt, visible) {
  const s = dt / 1000;
  for (const p of people) {
    p.g.visible = visible && shown;
    if (!visible) continue;
    if (p.wait > 0) {   // standing at an installation, turning a little
      const was = p.wait; p.wait -= s;
      if (was > 1.2 && p.wait <= 1.2 && p.at) onArrive(p.at.id, p.g.position);
      if (p.wait <= 0) pickTarget(p);
      p.g.children.forEach((c) => (c.position.y = 0));
      continue;
    }
    const a = p.g.position, b = p.path[p.seg + 1];
    if (!b) { p.wait = 3 + Math.random() * 6; continue; }
    const d = b.clone().sub(a), L = d.length(), step = p.speed * s;
    if (L <= step) { a.copy(b); p.seg++; }
    else { a.addScaledVector(d, step / L); p.g.rotation.y = Math.atan2(d.x, d.z); }
    p.phase += s * p.speed * 9;
    p.g.children.forEach((c) => (c.position.y = Math.abs(Math.sin(p.phase)) * 0.035));   // a small step bob
  }
  for (let i = rings.length - 1; i >= 0; i--) {
    const r = rings[i]; r.t += s / 1.6;
    r.m.scale.setScalar(0.2 + r.t * 1.6); r.m.material.opacity = 0.7 * (1 - r.t);
    if (r.t >= 1) { F.remove(r.m); r.m.material.dispose(); rings.splice(i, 1); }
  }
}
