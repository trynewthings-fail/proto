// One figure for every person in the twin, on the floor and in the scale scenes: a faceted body and head with ink
// outlines, in a soft coat colour (pale versions of the theme colours), so they read as people without taking over the
// drawing. Arms are optional, for scenes where a hand does something; they hang from the shoulders and are posed by
// rotating them (rotation.z lifts an arm out to the side, rotation.x swings it forwards or back).
import * as THREE from 'three';
import { solid, lam } from './world.js';

export const COATS = [0xe9dcb8, 0xcfdfe3, 0xdfe8c8, 0xecd3c7, 0xdcd6e8, 0xf0e6bf];
const H = 1.47;   // the figure's own height in metres
const BODY = new THREE.CylinderGeometry(0.11, 0.16, 1.2, 6).translate(0, 0.6, 0);
const HEAD = new THREE.IcosahedronGeometry(0.11, 0).translate(0, 1.36, 0);   // just above the shoulders: a small neck gap, not a floating head
const ARM = new THREE.CylinderGeometry(0.036, 0.03, 0.56, 5).translate(0, -0.28, 0);
const SHOULDER = [0.12, 1.13];   // against the body, not floating beside it
const COAT_MATS = COATS.map((c) => lam(c)), SKIN = lam(0xf3efe6);
let n = 0;

// h: height in the scene's own units; own: materials of its own (to fade one figure without fading the others)
export function figure({ h = H, arms = false, coat, own = false } = {}) {
  const k = h / H, g = new THREE.Group(), body = new THREE.Group();
  body.scale.setScalar(k); g.add(body);
  const ci = coat ?? n++ % COATS.length;
  const coatM = own ? lam(COATS[ci]) : COAT_MATS[ci], skinM = own ? lam(0xf3efe6) : SKIN;
  body.add(solid(BODY, { mat: coatM, s: 0.02, thr: 20, shadow: false }), solid(HEAD, { mat: skinM, s: 0.015, thr: 20, shadow: false }));
  const pair = [];
  if (arms) for (const side of [-1, 1]) {
    const a = new THREE.Group(); a.position.set(side * SHOULDER[0], SHOULDER[1], 0); a.rotation.z = side * 0.1;
    a.add(solid(ARM, { mat: coatM, s: 0.012, thr: 20, shadow: false }));
    body.add(a); pair.push(a);
  }
  g.userData = { body, arms: pair, mats: [coatM, skinM], k };
  return g;
}

// joints in the figure's parent frame, for a skeleton drawn on top (as a depth camera sees it)
const J = { head: [0, 1.36], neck: [0, 1.24], hip: [0, 0.66], lk: [-0.07, 0.34], rk: [0.07, 0.34], lf: [-0.08, 0.02], rf: [0.08, 0.02] };
export function joints(fig) {
  fig.updateMatrixWorld(true);
  const { body, arms } = fig.userData, out = {}, inv = fig.parent ? fig.parent.matrixWorld.clone().invert() : new THREE.Matrix4();
  const at = (o, x, y) => o.localToWorld(new THREE.Vector3(x, y, 0)).applyMatrix4(inv);
  for (const [n, [x, y]] of Object.entries(J)) out[n] = at(body, x, y);
  if (arms.length) {
    out.ls = at(arms[0], 0, 0); out.le = at(arms[0], 0, -0.28); out.lh = at(arms[0], 0, -0.56);
    out.rs = at(arms[1], 0, 0); out.re = at(arms[1], 0, -0.28); out.rh = at(arms[1], 0, -0.56);
  }
  return out;
}

// points on the figure's surface, picked once and followed as it moves: what a depth camera would see of it
export function surfaceSampler(fig, count) {
  const meshes = []; fig.traverse((o) => { if (o.isMesh) meshes.push(o); });
  const tris = [];
  for (const m of meshes) {
    const p = m.geometry.attributes.position, idx = m.geometry.index;
    const nT = idx ? idx.count / 3 : p.count / 3;
    for (let t = 0; t < nT; t++) {
      const v = [0, 1, 2].map((j) => idx ? idx.getX(t * 3 + j) : t * 3 + j);
      const a = new THREE.Vector3().fromBufferAttribute(p, v[0]), b = new THREE.Vector3().fromBufferAttribute(p, v[1]), c = new THREE.Vector3().fromBufferAttribute(p, v[2]);
      const area = b.clone().sub(a).cross(c.clone().sub(a)).length() / 2;
      if (area > 1e-9) tris.push({ m, a, b, c, area });
    }
  }
  const total = tris.reduce((s, t) => s + t.area, 0), picks = [];
  for (let i = 0; i < count; i++) {
    let r = Math.random() * total, t = tris[0];
    for (const x of tris) { r -= x.area; if (r <= 0) { t = x; break; } }
    let u = Math.random(), v = Math.random(); if (u + v > 1) { u = 1 - u; v = 1 - v; }
    picks.push({ t, u, v });
  }
  const P = new THREE.Vector3(), N = new THREE.Vector3(), e1 = new THREE.Vector3(), e2 = new THREE.Vector3();
  // fills pos (x, y, z per point) in the parent frame; points whose triangle faces away from `eye` are moved far off
  return (pos, eye) => {
    fig.updateMatrixWorld(true);
    const inv = fig.parent.matrixWorld.clone().invert();
    picks.forEach(({ t, u, v }, i) => {
      P.copy(t.a).addScaledVector(e1.subVectors(t.b, t.a), u).addScaledVector(e2.subVectors(t.c, t.a), v);
      N.crossVectors(e1, e2);
      const mw = t.m.matrixWorld; P.applyMatrix4(mw).applyMatrix4(inv); N.transformDirection(mw).transformDirection(inv);
      const vis = !eye || N.dot(e1.subVectors(eye, P)) > 0;
      if (!vis) P.set(0, -1e6, 0);
      pos[i * 3] = P.x; pos[i * 3 + 1] = P.y; pos[i * 3 + 2] = P.z;
    });
  };
}
