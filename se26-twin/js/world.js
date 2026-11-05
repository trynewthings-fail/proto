// The 3D world: Skellefteå around the museum, the museum building, the SE26 floor lifted out of it,
// and every installation, sensor, computer and LED strip drawn as a white sketch model.
import * as THREE from 'three';
import { mergeGeometries } from 'three/addons/BufferGeometryUtils.js';
import { CSS2DObject } from 'three/addons/CSS2DRenderer.js';

export const C = {
  bg: 0xf1f0eb, line: 0x2b2c28, line2: 0xb3b2aa, white: 0xfbfbf8, floor: 0xf6f5f1, dark: 0xe2e1db,
  lime: 0xcafe03, led: 0x9a9b94, red: 0xc9473b, water: 0xdfe4e3, road: 0xe5e4de, ink: 0x0a0b09,
};

let seed = 7;
const rnd = () => { seed |= 0; seed = seed + 0x6D2B79F5 | 0; let t = Math.imul(seed ^ seed >>> 15, 1 | seed); t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296; };
const V = (x, y, z) => new THREE.Vector3(x, y, z);

// ── sketch lines: every edge drawn twice, once dark with a small overshoot, once light and jittered ──
const c1 = new THREE.Color(C.line), c2 = new THREE.Color(C.line2);
const MINOR = [new THREE.Color(0x77786f), null];   // small objects: one grey stroke, no second pass
export function sketchSegments(a, s, [k1, k2] = [c1, c2]) {
  const pos = [], col = [], A = V(), B = V(), d = V();
  for (let i = 0; i < a.length; i += 6) {
    A.set(a[i], a[i + 1], a[i + 2]); B.set(a[i + 3], a[i + 4], a[i + 5]);
    d.subVectors(B, A); const L = d.length(); if (L < 1e-7) continue; d.divideScalar(L);
    const ov = Math.min(L * 0.07, s * 0.09);
    pos.push(A.x - d.x * ov * rnd(), A.y - d.y * ov * rnd(), A.z - d.z * ov * rnd(), B.x + d.x * ov * rnd(), B.y + d.y * ov * rnd(), B.z + d.z * ov * rnd());
    col.push(k1.r, k1.g, k1.b, k1.r, k1.g, k1.b);
    if (!k2) continue;
    const j = s * 0.025 + L * 0.004, J = () => (rnd() - 0.5) * 2 * j;
    pos.push(A.x + J(), A.y + J(), A.z + J(), B.x + J(), B.y + J(), B.z + J());
    col.push(k2.r, k2.g, k2.b, k2.r, k2.g, k2.b);
  }
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
  g.setAttribute('color', new THREE.Float32BufferAttribute(col, 3));
  return g;
}
export const sketchLines = (geom, s = 0.4, thr = 25) => sketchSegments(new THREE.EdgesGeometry(geom, thr).attributes.position.array, s);
// line boil: every ink line trembles a pixel or so, a few times a second, like hand-drawn animation.
// W.boil.step changes ~6 times a second (main.js); each vertex gets its own small screen-space nudge.
export const BOIL = { step: { value: 0 }, amp: { value: 0.9 }, res: { value: new THREE.Vector2(1600, 900) } };
export function boil(mat) {
  mat.onBeforeCompile = (sh) => {
    sh.uniforms.uBoil = BOIL.step; sh.uniforms.uBoilAmp = BOIL.amp; sh.uniforms.uRes = BOIL.res;
    sh.vertexShader = 'uniform float uBoil; uniform float uBoilAmp; uniform vec2 uRes;\n' + sh.vertexShader.replace('#include <fog_vertex>', `#include <fog_vertex>
      vec2 hb = fract(sin(vec2(dot(position + uBoil, vec3(12.9898, 78.233, 37.719)), dot(position - uBoil, vec3(39.346, 11.135, 83.155)))) * 43758.5453);
      gl_Position.xy += (hb - 0.5) * 2.0 * uBoilAmp * gl_Position.w / uRes;`);
  };
  mat.customProgramCacheKey = () => 'boil';
  return mat;
}
// outline for soft shapes with no sharp edges to draw (the clouds): a back-facing shell pushed out a fixed number of
// pixels along the screen-space normal, so it is as thin as an ink line at any distance and boils with the lines
export function outline(px = 1.1) {
  // pushed back in depth so the shape's own surface always wins where they overlap (seen through an x-ray hole)
  const mat = new THREE.MeshBasicMaterial({ color: C.ink, side: THREE.BackSide, polygonOffset: true, polygonOffsetFactor: 6, polygonOffsetUnits: 12 });
  mat.onBeforeCompile = (sh) => {
    Object.assign(sh.uniforms, { uBoil: BOIL.step, uBoilAmp: BOIL.amp, uRes: BOIL.res, uPx: { value: px } });
    sh.vertexShader = 'uniform float uBoil; uniform float uBoilAmp; uniform vec2 uRes; uniform float uPx;\n' + sh.vertexShader.replace('#include <fog_vertex>', `#include <fog_vertex>
      vec2 nd = (projectionMatrix * modelViewMatrix * vec4(normal, 0.0)).xy * uRes;
      if (dot(nd, nd) > 1e-10) gl_Position.xy += normalize(nd) * uPx * 2.0 * gl_Position.w / uRes;
      vec2 hb = fract(sin(vec2(dot(position + uBoil, vec3(12.9898, 78.233, 37.719)), dot(position - uBoil, vec3(39.346, 11.135, 83.155)))) * 43758.5453);
      gl_Position.xy += (hb - 0.5) * 2.0 * uBoilAmp * gl_Position.w / uRes;`);
  };
  mat.customProgramCacheKey = () => 'outline';
  return mat;
}
// x-ray: surfaces inside a narrow tube between the camera and what it looks at are cut away (the ink lines stay,
// as ghost outlines), so walls never hide the installation you opened. main.js sets the uniforms each frame.
export const XRAY = { on: { value: 0 }, eye: { value: new THREE.Vector3() }, tgt: { value: new THREE.Vector3() }, r: { value: 1.2 }, keep: { value: 1.2 } };
export function xray(mat) {
  const prev = mat.onBeforeCompile, key = mat.customProgramCacheKey?.() || '';   // chains onto e.g. outline()
  mat.onBeforeCompile = (sh, r) => {
    prev?.call(mat, sh, r);
    Object.assign(sh.uniforms, { uXr: XRAY.on, uEye: XRAY.eye, uTgt: XRAY.tgt, uXrR: XRAY.r, uKeep: XRAY.keep });
    sh.vertexShader = 'varying vec3 vWPos;\n' + sh.vertexShader.replace('#include <project_vertex>', '#include <project_vertex>\n  vWPos = (modelMatrix * vec4(transformed, 1.0)).xyz;');
    sh.fragmentShader = `varying vec3 vWPos; uniform float uXr, uXrR, uKeep; uniform vec3 uEye, uTgt;
      float xrH(vec3 p) { return fract(sin(dot(p, vec3(127.1, 311.7, 74.7))) * 43758.5453); }
      float xrN(vec3 p) {   // value noise
        vec3 i = floor(p), f = fract(p); f = f * f * (3.0 - 2.0 * f);
        return mix(mix(mix(xrH(i), xrH(i + vec3(1, 0, 0)), f.x), mix(xrH(i + vec3(0, 1, 0)), xrH(i + vec3(1, 1, 0)), f.x), f.y),
                   mix(mix(xrH(i + vec3(0, 0, 1)), xrH(i + vec3(1, 0, 1)), f.x), mix(xrH(i + vec3(0, 1, 1)), xrH(i + vec3(1, 1, 1)), f.x), f.y), f.z);
      }\n` + sh.fragmentShader.replace('#include <clipping_planes_fragment>', `#include <clipping_planes_fragment>
      float xrEdge = 0.0, xrCut = 0.0;
      if (uXr > 0.5) {
        vec3 ab = uTgt - uEye; float L = length(ab); vec3 dd = ab / L; float t = dot(vWPos - uEye, dd);
        float R = uXrR * min(1.0, t / 2.0 + 0.3), d = length(vWPos - uEye - dd * t);
        // a soft tube that dissolves into noise at its rim and towards the target, like paper eaten away
        float cut = smoothstep(R * 1.25, R * 0.55, d) * smoothstep(L - uKeep + 0.4, L - uKeep - 0.5, t) * step(0.0, t);
        cut *= smoothstep(uKeep * 0.55, uKeep * 0.95, length((vWPos - uTgt).xz));   // the installation itself stays whole, top to bottom
        float n = xrN(vWPos * 4.0) * 0.65 + xrN(vWPos * 13.0) * 0.35;
        if (n < cut * 1.1 - 0.05) discard;
        xrEdge = cut > 0.02 ? 1.0 - smoothstep(0.0, fwidth(n) * 1.5, n - (cut * 1.1 - 0.05)) : 0.0;   // a rim about a pixel wide
        xrCut = cut;
      }`).replace('#include <dithering_fragment>', `#include <dithering_fragment>
      if (!gl_FrontFacing && xrCut > 0.02) gl_FragColor.rgb = vec3(0.945, 0.941, 0.922);   // the inside of a cut shape is paper
      gl_FragColor.rgb = mix(gl_FragColor.rgb, vec3(0.04, 0.043, 0.035), xrEdge * 0.9);`);
  };
  mat.customProgramCacheKey = () => key + 'xray';
  return mat;
}
// room focus: with a room in focus, the rest of the floor fades towards the paper and its lines turn pale. DIM.mask is a
// small texture over the floor with one channel per room, soft at the borders (main.js builds it from the walk grid
// and the approved installation spots and moves DIM.on and DIM.room). Positions are the floor's own frame (F).
export const DIM = { on: { value: 0 }, room: { value: new THREE.Vector4() }, mask: { value: null }, box: { value: new THREE.Vector4(0, 0, 1, 1) } };
export function dimmable(mat, k = 0.72) {
  const prev = mat.onBeforeCompile, key = mat.customProgramCacheKey?.() || '';
  mat.onBeforeCompile = (sh, r) => {
    prev?.call(mat, sh, r);
    Object.assign(sh.uniforms, { uDimOn: DIM.on, uDimRoom: DIM.room, uDimMask: DIM.mask, uDimBox: DIM.box });
    sh.vertexShader = 'varying vec2 vDimUV; uniform vec4 uDimBox;\n' + sh.vertexShader.replace('#include <begin_vertex>', '#include <begin_vertex>\n  vDimUV = (position.xz - uDimBox.xy) / uDimBox.zw;');
    sh.fragmentShader = 'varying vec2 vDimUV; uniform float uDimOn; uniform vec4 uDimRoom; uniform sampler2D uDimMask;\n' + sh.fragmentShader.replace('#include <fog_fragment>', `#include <fog_fragment>
      if (uDimOn > 0.001) { float m = dot(texture2D(uDimMask, clamp(vDimUV, 0.0, 1.0)), uDimRoom); gl_FragColor.rgb = mix(gl_FragColor.rgb, vec3(0.945, 0.941, 0.922), uDimOn * (1.0 - m) * ${k.toFixed(2)}); }`);
  };
  mat.customProgramCacheKey = () => key + 'dim';
  return mat;
}
// every line in the drawing trembles like ink: plain line materials get the boil too
export const bline = (o) => boil(new THREE.LineBasicMaterial(o));
export const bdash = (o) => boil(new THREE.LineDashedMaterial(o));
export const LINE_MAT = boil(new THREE.LineBasicMaterial({ vertexColors: true }));
export const lam = (color, o = {}) => new THREE.MeshLambertMaterial({ color, polygonOffset: true, polygonOffsetFactor: 1, polygonOffsetUnits: 1, ...o });
export const MAT = { white: lam(C.white), floor: lam(C.floor), dark: lam(C.dark), red: lam(C.red), road: new THREE.MeshBasicMaterial({ color: C.road }), water: new THREE.MeshBasicMaterial({ color: C.water }) };

export function solid(geom, { mat = MAT.white, s = 0.4, thr = 25, shadow = true, lines = true, mesh = true } = {}) {
  const g = new THREE.Group();
  if (mesh) { const m = new THREE.Mesh(geom, mat); m.castShadow = shadow; m.receiveShadow = true; g.add(m); g.userData.mesh = m; }
  if (lines) g.add(new THREE.LineSegments(sketchLines(geom, s, thr), LINE_MAT));
  return g;
}
const boxG = (w, h, d) => new THREE.BoxGeometry(w, h, d).translate(0, h / 2, 0);
function at(o, x, y, z, ry = 0) { o.position.set(x, y, z); o.rotation.y = ry; return o; }

// ── labels ──
export const LABELS = [];
export function label(text, { sub = '', cls = '', groups = [], stalk = 18, key = null } = {}) {
  const el = document.createElement('div');
  el.className = `lb off ${cls}`;
  el.style.setProperty('--stalk', `${stalk}px`);
  el.innerHTML = `<span class="t">${text}${sub ? `<small>${sub}</small>` : ''}</span><i class="stalk"></i>`;
  if (key) { el.tabIndex = 0; el.setAttribute('role', 'button'); }
  const o = new CSS2DObject(el);
  o.center.set(0, 0);
  o.userData = { groups, key, el };
  LABELS.push(o);
  return o;
}
export function showLabels(active) {
  for (const o of LABELS) o.userData.el.classList.toggle('off', !o.userData.groups.some((g) => active.includes(g)));
}

// ── registries filled while building ──
export const FIX = {};    // LED strips, cubes, cloud, greenhouse … name → { mats, base, heat, pos, light }
export const DEV = {};    // sensors (ESP32 etc.) id → { pos }
export const HOST = {};   // computers and iPads id → { pos, kind, role }
export const HW = {};     // other hardware drawn where it probably sits (depth cameras) id → { pos, n: the way it looks }
export const W = {};      // shared handles

function fixture(name, pos, o = {}) {
  FIX[name] ??= { mats: [], base: [], heat: 0, pos, ...o };
  return FIX[name];
}
function addMat(f, m) { f.mats.push(m); f.base.push(m.color.clone()); }
function strip(parent, name, pts, { r = 0.035, closed = false, pos = null } = {}) {
  const path = new THREE.CurvePath();
  const P = closed ? [...pts, pts[0]] : pts;
  for (let i = 0; i < P.length - 1; i++) path.add(new THREE.LineCurve3(P[i], P[i + 1]));
  const m = new THREE.MeshBasicMaterial({ color: C.led });
  const mesh = new THREE.Mesh(new THREE.TubeGeometry(path, Math.max(8, P.length * 10), r, 5, false), m);
  parent.add(mesh);
  const f = fixture(name, pos || pts[Math.floor(pts.length / 2)].clone());
  addMat(f, m);
  return f;
}
const ring = (cx, cy, cz, r, n = 24) => Array.from({ length: n }, (_, i) => V(cx + Math.cos(i / n * Math.PI * 2) * r, cy, cz + Math.sin(i / n * Math.PI * 2) * r));

// small meshes from the Unreal projects (tools/ue/mesh_export.py → tools/mesh_web.py), as geometry in metres
const MESHES = {};
export function loadMesh(name) {
  return (MESHES[name] ||= fetch(`data/meshes/${name}.json`).then(ok).then((r) => r.json()).then((m) => {
    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.Float32BufferAttribute(Float32Array.from(m.p, (v) => v / 100), 3));
    geo.setIndex(m.i); geo.computeVertexNormals(); geo.userData.size = m.size;
    return geo;
  }));
}

// ═══════════════════ city ═══════════════════
// D.meshes (data/city_meshes.json, tools/city_meshes.py): real buildings that replace OSM boxes, and planned ones as ghosts
export function buildCity(scene, D) {
  const grp = new THREE.Group(); grp.name = 'city';
  const geoms = [], edges = [];
  let museumGeom = null;
  const hide = new Set((D.meshes?.items || []).flatMap((m) => m.hide || []));
  for (const [bi, b] of D.buildings.entries()) {
    if (hide.has(bi)) continue;
    const sh = new THREE.Shape();
    for (let i = 0; i < b.r.length; i += 2) { const x = b.r[i], y = -b.r[i + 1]; i ? sh.lineTo(x, y) : sh.moveTo(x, y); }
    let g;
    try { g = new THREE.ExtrudeGeometry(sh, { depth: Math.max(2.5, b.h), bevelEnabled: false }); } catch { continue; }
    g.rotateX(-Math.PI / 2);
    if (b.m) { museumGeom = g; continue; }
    geoms.push(g);
    edges.push(sketchLines(g, 1.6, 30));
  }
  const city = new THREE.Mesh(mergeGeometries(geoms), MAT.white);
  city.castShadow = city.receiveShadow = true;
  grp.add(city, new THREE.LineSegments(mergeGeometries(edges), LINE_MAT));

  // roads as flat ribbons
  const rp = [];
  const width = { motorway: 14, trunk: 12, primary: 10, secondary: 9, tertiary: 8, residential: 6, service: 4, cycleway: 2.5, footway: 2, path: 1.6, pedestrian: 5 };
  for (const r of D.roads) {
    const w = (r.w || width[r.c] || 4) / 2, p = r.p;
    for (let i = 0; i < p.length - 2; i += 2) {
      const ax = p[i], az = p[i + 1], bx = p[i + 2], bz = p[i + 3];
      const dx = bx - ax, dz = bz - az, L = Math.hypot(dx, dz) || 1, nx = -dz / L * w, nz = dx / L * w;
      rp.push(ax + nx, 0.04, az + nz, bx + nx, 0.04, bz + nz, bx - nx, 0.04, bz - nz, ax + nx, 0.04, az + nz, bx - nx, 0.04, bz - nz, ax - nx, 0.04, az - nz);
    }
  }
  const rg = new THREE.BufferGeometry(); rg.setAttribute('position', new THREE.Float32BufferAttribute(rp, 3));
  const roads = new THREE.Mesh(rg, new THREE.MeshBasicMaterial({ color: C.road, side: THREE.DoubleSide }));
  roads.receiveShadow = true;
  grp.add(roads);

  // river ribbon with a few hatch lines
  const wp = [], hl = [];
  const R = D.river;
  for (let i = 0; i < R.length - 1; i++) {
    const [ax, az, aw] = R[i], [bx, bz, bw] = R[i + 1];
    const dx = bx - ax, dz = bz - az, L = Math.hypot(dx, dz) || 1, ux = -dz / L, uz = dx / L;
    wp.push(ax + ux * aw / 2, 0.03, az + uz * aw / 2, bx + ux * bw / 2, 0.03, bz + uz * bw / 2, bx - ux * bw / 2, 0.03, bz - uz * bw / 2,
      ax + ux * aw / 2, 0.03, az + uz * aw / 2, bx - ux * bw / 2, 0.03, bz - uz * bw / 2, ax - ux * aw / 2, 0.03, az - uz * aw / 2);
    for (const k of [-0.32, -0.1, 0.18, 0.36]) hl.push(ax + ux * aw * k, 0.06, az + uz * aw * k, bx + ux * bw * k, 0.06, bz + uz * bw * k);
  }
  let wg = new THREE.BufferGeometry(); wg.setAttribute('position', new THREE.Float32BufferAttribute(wp, 3));
  // the real shoreline when we have it (data/city_water.json, OSM polygons from tools/region.py) instead of the ribbon
  if (D.water?.polys?.length) {
    const shapes = D.water.polys.map((w) => {
      const pts = (a) => { const v = []; for (let i = 0; i < a.length; i += 2) v.push(new THREE.Vector2(a[i], -a[i + 1])); return v; };
      const sh = new THREE.Shape(pts(w.o)); sh.holes = w.h.map((h) => new THREE.Path(pts(h))); return sh;
    });
    wg = new THREE.ShapeGeometry(shapes).rotateX(-Math.PI / 2).translate(0, 0.03, 0);
    hl.length = 0;
    const edge = [];
    for (const w of D.water.polys) for (const a of [w.o, ...w.h]) for (let i = 0; i < a.length - 2; i += 2) edge.push(a[i], 0.07, a[i + 1], a[i + 2], 0.07, a[i + 3]);
    const eg = new THREE.BufferGeometry(); eg.setAttribute('position', new THREE.Float32BufferAttribute(edge, 3));
    grp.add(new THREE.LineSegments(eg, bline({ color: 0x8fa5a8 })));
  }
  const riverMat = new THREE.MeshBasicMaterial({ color: C.water, side: THREE.DoubleSide });
  grp.add(new THREE.Mesh(wg, riverMat));
  W.riverMat = riverMat;
  { const m = R[Math.floor(R.length / 2)]; W.riverCenter = new THREE.Vector3(m[0], 0, m[1]); }
  const hg = new THREE.BufferGeometry(); hg.setAttribute('position', new THREE.Float32BufferAttribute(hl, 3));
  grp.add(new THREE.LineSegments(hg, bline({ color: 0xa9b6b6 })));

  // the museum building, kept separate so it can be highlighted
  const museumMat = lam(C.white);
  const museum = solid(museumGeom, { mat: museumMat, s: 1.2, thr: 30 });
  grp.add(museum);
  W.museumMat = museumMat;
  museumGeom.computeBoundingBox();
  W.museumTop = museumGeom.boundingBox.max.y;

  const ghostMat = new THREE.MeshBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0.35, depthWrite: false });
  const ghostLine = bline({ color: C.line2, transparent: true, opacity: 0.8 });
  for (const it of D.meshes?.items || []) {
    loadMesh(it.mesh).then((geo) => {
      const o = it.ghost
        ? (() => { const gr = new THREE.Group(); gr.add(new THREE.Mesh(geo, ghostMat), new THREE.LineSegments(new THREE.EdgesGeometry(geo, 30), ghostLine)); return gr; })()
        : solid(geo, { s: 0.25, thr: 24 });
      if (it.box) {   // a white body behind a facade that is only panels
        const [x0, y0, z0, x1, y1, z1] = it.box;
        o.add(solid(new THREE.BoxGeometry(x1 - x0, y1 - y0, z1 - z0).translate((x0 + x1) / 2, (y0 + y1) / 2, (z0 + z1) / 2), { s: 0.25, thr: 35 }));
      }
      o.position.set(it.x, 0, it.z); o.rotation.y = it.ry; grp.add(o);
    }).catch((e) => console.warn('city mesh', it.mesh, e));
    if (it.label) {
      // planned buildings (ghosts) are labelled only in the stories about them (main.js showL)
      const l = label(it.label, { sub: it.sub || '', groups: [it.ghost ? 'city-plan' : 'city'], stalk: 18, cls: it.ghost ? 'ghost' : '' });
      at(l, it.x, (it.h || 20) + 4, it.z); grp.add(l);
    }
  }

  const lm = label('Skellefteå museum', { sub: 'Nordanå', cls: 'big', groups: ['city'], stalk: 40 });
  at(lm, 0, W.museumTop + 2, 30); grp.add(lm);
  const lg = label('Guldtorget', { sub: 'centrum', groups: ['city'], stalk: 24 });
  at(lg, 602, 6, -246); grp.add(lg);
  const rm = R[Math.floor(R.length * 0.55)];
  const lr = label('Skellefteälven', { groups: ['city'], stalk: 12, cls: 'ghost' });
  at(lr, rm[0], 1, rm[1]); grp.add(lr);
  scene.add(grp);
  return grp;
}

// ═══════════════════ the exhibition floor ═══════════════════
// The real SE26 floor exported from Unreal (LV_SE26_Master + Props + NiklasRoom4, tools/ue/web_export.py).
// F-local frame = Unreal metres: x = UE.X, y = UE.Z (up), z = UE.Y. Installation positions come from
// data/se26/placements.json (approved in plan.html). LED strips, sensors and computers are placed near
// their installation; where nothing tells the exact spot they are marked as approximate in the docs.
export const ROOMS = [
  { n: 1, name: 'Urtiden', theme: 'korridoren · floden och skogen', c: [-8.5, -1.6] },
  { n: 2, name: 'Dåtiden', theme: 'Boliden, Maskinisterna, Alimak', c: [-19.2, -3.6] },
  { n: 3, name: 'Nutiden', theme: 'Dialogen och platsen', c: [-15.5, 3.4] },
  { n: 4, name: 'Framtiden', theme: 'växthuset, molnet och kuberna', c: [1.2, 3.0] },
];
export const HUBP = V(-5.3, 9.2, 2.1);   // underside of the hub disc, lifted above the middle of the floor

const ok = (r) => { if (!r.ok) throw new Error(`${r.url.split('/').pop()}: ${r.status}`); return r; };
export async function loadSE26() {
  const [M, bin, PL, tubes] = await Promise.all([
    fetch('data/se26/model.json').then(ok).then((r) => r.json()),
    fetch('data/se26/model.bin').then(ok).then((r) => r.arrayBuffer()),
    fetch('data/se26/placements.json').then(ok).then((r) => r.json()),
    fetch('data/se26/tubes.json').then((r) => (r.ok ? r.json() : null)).catch(() => null),
  ]);
  return { M, bin, PL, tubes };
}

// ── the light tubes (JonasLights) carry pulses ──
// tools/tubes.py gives each tube a role (run to the cloud, drop from a cube, around the cloud, room 3, room 2), a station,
// and per vertex how far along the tube it is (u). Every vertex gets aTU = (tube index, u); tubes outside room 4 are
// numbered from 100, so thunder can flicker room 4 alone. A pulse is a bright band that travels along one tube.
// Which tube Resolume lights for which station is read from where the tubes hang (an assumption).
const NP = 16;
export const TUBES = { list: [], pulses: [], u: { uPulse: { value: Array.from({ length: NP }, () => new THREE.Vector4(-9, 0, 1, 0)) }, uFlick: { value: 0 }, uPulseCol: { value: new THREE.Color(C.lime) } }, flick: 0 };
function tubeGlow(mat) {
  mat.onBeforeCompile = (sh) => {
    Object.assign(sh.uniforms, TUBES.u);
    sh.vertexShader = 'attribute vec2 aTU; varying vec2 vTU;\n' + sh.vertexShader.replace('#include <begin_vertex>', '#include <begin_vertex>\n  vTU = aTU;');
    sh.fragmentShader = `varying vec2 vTU; uniform vec4 uPulse[${NP}]; uniform float uFlick; uniform vec3 uPulseCol;\n` + sh.fragmentShader.replace('#include <dithering_fragment>', `#include <dithering_fragment>
      float tg = vTU.x >= 0.0 && vTU.x < 99.5 ? uFlick : 0.0;
      for (int i = 0; i < ${NP}; i++) {
        vec4 p = uPulse[i];
        if (abs(vTU.x - p.x) < 0.5) { float d = (vTU.y - p.y) / p.z; d = d < 0.0 ? d * 0.35 : d * 1.6; tg = max(tg, p.w * exp(-d * d)); }   // head ahead, tail behind
      }
      gl_FragColor.rgb = mix(gl_FragColor.rgb, uPulseCol, clamp(tg, 0.0, 1.0));
      gl_FragColor.a = max(gl_FragColor.a, clamp(tg, 0.0, 1.0) * 0.95);`);
  };
  mat.customProgramCacheKey = () => 'tubes';
  return mat;
}
const tubeIds = (f) => TUBES.list.flatMap((t, i) => (f(t) ? [i] : []));
// one pulse along each matching tube: from u 0 to 1 (or back), over dur ms, after delay ms
export function tubePulse(f, { dur = 700, delay = 0, back = false, width = 0.2 } = {}) {
  const t0 = performance.now() + delay;
  for (const i of tubeIds(f)) {
    TUBES.pulses.push({ i, t0, dur: dur * Math.max(0.6, Math.min(1.8, TUBES.list[i].len / 4)), back, width });
    if (TUBES.pulses.length > NP) TUBES.pulses.shift();
  }
}
// a station lights: up the drops to its cube, then along the run to the cloud
export function tubeStation(st) {
  tubePulse((t) => t.station === st && t.role === 'drop', { dur: 520 });
  tubePulse((t) => t.station === st && t.role === 'run', { dur: 1300, delay: 450 });
}
export const tubeCloud = () => tubePulse((t) => t.role === 'cloud', { dur: 650 });
export const tubeRoom = (r) => tubePulse((t) => t.role === r, { dur: 900 });
export function tubeThunder() { if (!TUBES.calm) TUBES.flick = performance.now(); }   // no strobe with reduced motion
export function tubeFrame(now) {
  const P = TUBES.u.uPulse.value;
  TUBES.pulses = TUBES.pulses.filter((p) => now - p.t0 < p.dur + 200);
  for (let k = 0; k < NP; k++) {
    const p = TUBES.pulses[k];
    if (!p || now < p.t0) { P[k].set(-9, 0, 1, 0); continue; }
    const s = Math.min(1, (now - p.t0) / p.dur), head = p.back ? 1 - s : s;
    P[k].set(p.i < 0 ? -9 : TUBES.list[p.i].id, head * 1.15 - 0.075, p.width, s < 1 ? 1 : Math.max(0, 1 - (now - p.t0 - p.dur) / 200));
  }
  const ft = now - TUBES.flick;   // thunder: room 4's tubes flicker for 0.3 s
  TUBES.u.uFlick.value = ft < 90 ? 0.8 : ft < 200 ? 0.1 : ft < 320 ? 0.6 : 0;   // two flashes, like lightning
}

function realModel(F, { M, bin, tubes }) {
  const o = M.offsets, n = M.counts;
  const g = new THREE.BufferGeometry();
  const pos = new Float32Array(bin, o.pos, n.verts * 3);
  g.setAttribute('position', new THREE.BufferAttribute(pos, 3));
  g.setAttribute('normal', new THREE.InterleavedBufferAttribute(new THREE.InterleavedBuffer(new Int8Array(bin, o.nrm, n.verts * 4), 4), 3, 0, true));
  g.setIndex(new THREE.BufferAttribute(new Uint32Array(bin, o.idx, n.tris * 3), 1));
  // floor faces a shade darker than walls and objects
  const col = new Float32Array(n.verts * 3), cw = new THREE.Color(C.white), cf = new THREE.Color(0xeeede7);
  const nr = g.attributes.normal;
  for (let i = 0; i < n.verts; i++) {
    const c = pos[i * 3 + 1] < 0.03 && nr.getY(i) > 0.9 ? cf : cw;
    col[i * 3] = c.r; col[i * 3 + 1] = c.g; col[i * 3 + 2] = c.b;
  }
  g.setAttribute('color', new THREE.BufferAttribute(col, 3));
  // groups from tools/declutter.py: everything standing on the floor is cut at W.cutH like a doll's house,
  // hanging things stay whole, the JonasLights tubes are drawn as pale strips without ink
  const plan = M.actors.find((a) => a.plan), G = M.groups.tris, GE = M.groups.edges;
  W.clip = new THREE.Plane(new THREE.Vector3(0, -1, 0), 1e6);
  const mCut = dimmable(xray(lam(0xffffff, { vertexColors: true, clippingPlanes: [W.clip] }))), mHang = dimmable(xray(lam(0xffffff, { vertexColors: true, side: THREE.DoubleSide })));   // double-sided: open meshes (the cloud) show their white inside, not the dark outline shell
  const mLight = dimmable(xray(tubeGlow(new THREE.MeshBasicMaterial({ color: 0xe2e1da, transparent: true, opacity: 0.42, depthWrite: false }))));
  const tu = new Float32Array(n.verts * 2).fill(-1);
  TUBES.list = (tubes?.tubes || []).map((t, i) => {
    const id = t.role === 'room3' || t.role === 'room2' ? 100 + i : i;
    t.verts.forEach((v, k) => { tu[v * 2] = id; tu[v * 2 + 1] = t.u[k]; });
    return { id, name: t.name, role: t.role, station: t.station, len: t.len };
  });
  g.setAttribute('aTU', new THREE.BufferAttribute(tu, 2));
  g.addGroup(G.cut[0], G.cut[1], 0); g.addGroup(G.hang[0], G.hang[1], 1); g.addGroup(G.light[0], G.light[1], 2);
  const mesh = new THREE.Mesh(g, [mCut, mHang, mLight]);
  mesh.castShadow = true; mesh.receiveShadow = true;
  F.add(mesh);
  // line hierarchy: walls and big objects in ink, small objects in a light grey single stroke
  const E = new Float32Array(bin, o.edg, n.edges * 6), band = (k) => E.subarray(GE[k][0] * 6, (GE[k][0] + GE[k][1]) * 6);
  const clipLines = dimmable(boil(new THREE.LineBasicMaterial({ vertexColors: true, clippingPlanes: [W.clip] })), 0.85);
  const major = new THREE.LineSegments(sketchSegments(band('major'), 0.2), clipLines);
  const minor = new THREE.LineSegments(sketchSegments(band('minor'), 0.1, MINOR), clipLines);
  const hang = new THREE.LineSegments(sketchSegments(band('hang'), 0.1, MINOR), dimmable(boil(new THREE.LineBasicMaterial({ vertexColors: true })), 0.85));
  // soft shapes with no sharp edges to draw (the clouds, the plants, cables, a cake …): a thin boiling shell gives
  // them a drawn outline. Floor-standing ones are cut at the doll's-house height like everything else.
  const nrm = g.attributes.normal, idx = g.index.array;
  const shellHang = dimmable(xray(outline()), 0.85), shellCut = dimmable(xray(outline()), 0.85);
  shellCut.clippingPlanes = [W.clip];
  const SOFT = /Cloud|plant_|cake_on_plate|cooking_pot|Simple_Pipes/;
  for (const a of M.actors.filter((x) => SOFT.test(x.name + ' ' + x.mesh) && x.i[1] && (/Cloud|Simple_Pipes/.test(x.name + ' ' + x.mesh) || x.e[1] < 20))) {
    const [v0, nv] = a.v, hg = new THREE.BufferGeometry(), hn = new Float32Array(nv * 3);
    for (let k = 0; k < nv; k++) { hn[k * 3] = nrm.getX(v0 + k); hn[k * 3 + 1] = nrm.getY(v0 + k); hn[k * 3 + 2] = nrm.getZ(v0 + k); }   // the normals are interleaved int8
    hg.setAttribute('position', new THREE.BufferAttribute(pos.slice(v0 * 3, (v0 + nv) * 3), 3));
    hg.setAttribute('normal', new THREE.BufferAttribute(hn, 3));
    hg.setIndex(Array.from(idx.subarray(a.i[0], a.i[0] + a.i[1]), (x) => x - v0));
    F.add(new THREE.Mesh(hg, a.kind === 'cut' ? shellCut : shellHang));
  }
  F.add(major, minor, hang);
  W.hangLines = hang;
  W.model = mesh; W.modelLines = minor; W.cutH = 2.8;
  return { min: plan.min, max: plan.max };
}

export function buildExhibition(scene, data) {
  const EX = new THREE.Group(); EX.name = 'exhibition';
  const F = new THREE.Group(); EX.add(F);   // F: Unreal metres
  W.EX = EX; W.F = F;
  const B = realModel(F, data);
  const cx = (B.min[0] + B.max[0]) / 2, cz = (B.min[2] + B.max[2]) / 2;
  F.position.set(-cx, 0, -cz);
  W.bounds = B;
  W.P = Object.fromEntries(data.PL.items.map((i) => [i.id, i]));
  for (const r of ROOMS) {   // the themes are in the chapter text; in Utforska a room label flies into the room
    const n = data.PL.items.filter((i) => i.room === r.n && !i.id.startsWith('fix:')).length;
    const l = label(`Rum ${r.n} · ${r.name}`, { sub: `${n} delar`, cls: 'big', groups: ['rooms'], stalk: 30, key: `room:${r.n}` });
    at(l, r.c[0], r.n % 2 ? 4.2 : 5.6, r.c[1]); F.add(l);   // staggered heights so neighbouring rooms' labels don't collide
  }

  room1(F); room2(F); room3(F); room4(F);
  fromTexts(F);
  hosts(F);
  depthCams(F);
  hub(F);

  // dashed guides from the lifted floor down to the roof
  const gl = [];
  for (const [x, z] of [[B.min[0], B.min[2]], [B.max[0], B.min[2]], [B.max[0], B.max[2]], [B.min[0], B.max[2]]]) gl.push(x, 0, z, x, -1, z);
  const gg = new THREE.BufferGeometry(); gg.setAttribute('position', new THREE.Float32BufferAttribute(gl, 3));
  const guides = new THREE.LineSegments(gg, bdash({ color: 0x5c5d57, dashSize: 0.6, gapSize: 0.5 }));
  guides.computeLineDistances(); guides.position.y = -0.3;
  F.add(guides); W.guides = guides;

  // place over the museum block, long side along the facade
  EX.position.set(1, 22, 22);
  EX.rotation.y = -0.108;
  scene.add(EX);
  return EX;
}

const P = (id) => W.P[id];                          // approved position {x, y} in Unreal metres (y → z here)
const PX = (id, dx = 0, dz = 0) => [P(id).x + dx, P(id).y + dz];

function dev(F, id, x, y, z, { text = id, sub = '', groups = ['sensors'] } = {}) {
  const b = solid(boxG(0.16, 0.1, 0.12), { s: 0.1, mat: lam(0xffffff) });
  at(b, x, y, z); F.add(b);
  const l = label(text, { sub, groups, stalk: 14, key: id }); at(l, x, y + 0.12, z); F.add(l);
  DEV[id] = { pos: V(x, y + 0.05, z), label: l };
}
function inst(F, text, id, y, key, stalk = 22) {
  const [x, z] = PX(id);
  const l = label(text, { groups: ['inst'], stalk, key: id.startsWith('fix:') ? key : id, cls: 'ghost' }); at(l, x, y, z); F.add(l); return l;
}

// exhibits known from the printed exhibition texts (docs/kallor/utstallningstexter.md), on approximate spots until
// they are checked in plan.html: project cards stand on a post facing their category cube, stations get a low plinth
function fromTexts(F) {
  const cubeOf = { 'Klimat & miljö': 'Klimat', Kompetens: 'Kompetens', Rörlighet: 'Mobilitets', Bostäder: 'Bostads', 'Social hållbarhet': 'Social' };
  for (const p of Object.values(W.P)) {
    if (!p.fromTexts) continue;
    const g = new THREE.Group(); g.position.set(p.x, 0, p.y); F.add(g);
    if (p.type === 'kort' || p.type === 'text') {   // a text or project card on a stand, facing its cube
      g.add(solid(boxG(0.04, 0.9, 0.04), { s: 0.04, shadow: false }));
      const board = solid(new THREE.BoxGeometry(0.45, 0.6, 0.03).translate(0, 1.15, 0), { s: 0.04, shadow: false });
      g.add(board);
      const c = Object.values(W.P).find((q) => q.id === `fix:${cubeOf[p.category] || { klimat: 'Klimat', kompetens: 'Kompetens', rorlighet: 'Mobilitets', bostader: 'Bostads', social: 'Social' }[p.station] || ''}-kuben`);
      if (c) g.rotation.y = Math.atan2(c.x - p.x, c.y - p.y);
    } else g.add(solid(boxG(0.5, 0.75, 0.5), { s: 0.06, shadow: false }));
    if (p.type !== 'text') inst(F, p.name, p.id, p.type === 'kort' ? 1.6 : 1.1, p.id, 12);   // texts are told by their station
  }
}

function room1(F) {
  // the river: generative projection on the corridor wall (BP_RiverWall, ~11.6 m), drawn as moving waves
  const waves = [];
  for (let k = 0; k < 6; k++) {
    const n = 90, g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.Float32BufferAttribute(new Float32Array(n * 3), 3));
    const line = new THREE.Line(g, bline({ color: k % 2 ? 0x8aa3a8 : 0x5f7d84 }));
    F.add(line); waves.push({ line, n, y: 0.45 + k * 0.32, k });
  }
  W.waves = waves; W.river = { x0: -12.9, x1: -1.7, z: 0.72 };
  inst(F, 'Floden', 'floden', 2.6, 'river');
  // forest: LED in the four pulsating trunks (BP_Pulsating_Tree), the small tree, the tree book
  [[-11.9, -1.3], [-9.4, -0.4], [-5.6, 0.4], [-3.7, -1.2]].forEach(([x, z], i) => {
    strip(F, `TNT tree 0${i + 1}`, [V(x + 0.24, 0.25, z), V(x + 0.22, 2.4, z)], { r: 0.03 });
  });
  strip(F, 'Tree small', [V(-5.15, 0.15, 0.6), V(-5.15, 0.7, 0.6)], { r: 0.025 });
  strip(F, 'Treebook', [V(-9.85, 0.85, -0.05), V(-9.3, 0.85, -0.05)], { r: 0.025 });
  FIX.Treebook.offline = true; FIX['TNT tree 03'].offline = true;
  inst(F, 'Skogen', 'skogen', 3.0, 'forest');
  inst(F, 'Lungan', 'lungan', 2.2, 'lung');
  // water tunnel (SM_Tunnel rings) between the corridor and room 2
  strip(F, 'Tunnel', [V(-16.3, 1.95, -0.55), V(-14.0, 1.95, -0.55)], { r: 0.04 });
  inst(F, 'Vattentunneln', 'vattentunneln', 2.6, 'tunnel');
  dev(F, 'tunnel1', -14.1, 1.4, -1.5);
}

function room2(F) {
  inst(F, 'Dokumentärväggen', 'dokumentaren', 2.6, 'doc');
  inst(F, 'Bolidenväggen', 'boliden', 2.2, 'boliden');
  inst(F, 'Reverse Perspective', 'reverse-perspective', 2.4, 'reverse');
  inst(F, 'Ljudkonstverket', 'ljudkonst', 3.4, 'soundart');
  // Maskinisterna: bulb on a pedestal between two ultrasonic posts, ring fixture around it
  const [mx, mz] = PX('lampteremin');
  F.add(at(solid(new THREE.CylinderGeometry(0.22, 0.3, 1.0, 10).translate(0, 0.5, 0), { s: 0.2 }), mx, 0, mz));
  const bm = lam(0xffffff); const bulb = new THREE.Mesh(new THREE.IcosahedronGeometry(0.13, 1), bm);
  bulb.position.set(mx, 1.15, mz); F.add(bulb);
  const mf = strip(F, 'Maskinisten 2', ring(mx, 1.02, mz, 0.32, 16), { closed: true, r: 0.025 });
  addMat(mf, bm);
  for (const dx of [-0.65, 0.65]) F.add(at(solid(boxG(0.08, 1.1, 0.08), { s: 0.1 }), mx + dx, 0, mz));
  // Maskinisten 1: LED along the ceiling perimeter of room 2
  strip(F, 'Maskinisten 1', [V(-22.5, 3.3, -6.9), V(-15.4, 3.3, -6.9), V(-15.4, 3.3, 0.7), V(-22.5, 3.3, 0.7)], { closed: true });
  inst(F, 'Maskinisterna', 'lampteremin', 1.7, 'theremin');
  dev(F, 'maskinisterna', mx - 0.65, 1.15, mz, { sub: 'rpi4' });
  // Alimak: the lift (SM_JakobsStege)
  const [ax, az] = PX('alimak');
  strip(F, 'Possibilities', [V(-15.45, 1.8, -5.8), V(-15.45, 1.8, -1.2)], { r: 0.03 });
  inst(F, 'Alimak', 'alimak', 2.9, 'alimak');
  dev(F, 'alimak', ax + 0.55, 1.2, az + 0.4);
  // the Alimak lamp: a Shelly dimmer the switchboard lights for 10 s after alimak/trigger (placement approximate)
  const alm = lam(0xffffff);
  F.add(at(new THREE.Mesh(new THREE.IcosahedronGeometry(0.14, 1), alm), ax - 0.4, 2.4, az + 0.3));
  addMat(fixture('Alimak-lampa', V(ax - 0.4, 2.4, az + 0.3)), alm);
}

// the ten Dialogen pipes: the ColorPipes actors in room 3 (order of the questions is not known)
const PIPES = [[-16.78, 7.35], [-16.06, 5.11], [-14.3, 7.3], [-12.63, 5.14], [-12.48, 4.43], [-12.37, 4.43], [-11.85, 6.88], [-11.59, 4.93], [-11.59, 3.27], [-7.0, 3.32]];
export const PIPE_FIX = ['Dialog 1234', 'Dialog 56', 'Dialog 56', 'Dialog 1234', 'Dialog 1234', 'Dialog 1234', 'Dialog 7', 'Dialog 910', 'Dialog 910', 'Dialog 8'];
const PIPE_COL = { rosa: 0xf2c4d6, grön: 0xc9e4b4, blå: 0xbcd3f0, gul: 0xf3e0a0 };
const PIPE_COLOURS = ['rosa', 'grön', 'blå', 'gul', 'grön', 'blå', 'grön', 'rosa', 'gul', 'blå'];
function room3(F) {
  const groups = PIPE_FIX;
  W.pipes = [];
  PIPES.forEach(([x, z], i) => {
    const pm = lam(PIPE_COL[PIPE_COLOURS[i]]);
    const p = solid(new THREE.CylinderGeometry(0.16, 0.16, 0.04, 14), { mat: pm, s: 0.05, shadow: false });
    at(p, x, 1.45, z); F.add(p);
    const f = fixture(groups[i], V(x, 1.45, z)); addMat(f, pm);
    W.pipes.push(V(x, 1.25, z));
  });
  inst(F, 'Dialogen', 'dialogen', 2.4, 'democracy');
  strip(F, 'Dialog tak 1', [V(-18.0, 3.4, 4.2), V(-8.0, 3.4, 4.2)]);
  strip(F, 'Dialog tak 2', [V(-18.0, 3.4, 6.6), V(-8.0, 3.4, 6.6)]);
  inst(F, 'Framtidsbåset', 'framtidsbaset', 2.5, 'booth');
  inst(F, 'Tvivlarnas kulle', 'tvivlarnas-kulle', 1.8, 'hill');
  inst(F, 'Oro eller drömmar', 'orostunneln', 2.4, 'worry');
  // MiLight panels colour the whole (very white) room 3
  const mm = [];
  for (const [x, z] of [[-18.5, 3.2], [-14.5, 3.2], [-10.5, 3.2], [-18.5, 7.4], [-14.5, 7.4], [-10.5, 7.4]]) {
    const m = lam(0xffffff); mm.push(m);
    F.add(at(solid(boxG(0.7, 0.04, 0.7), { mat: m, s: 0.1, shadow: false }), x, 3.6, z));
  }
  const ml = fixture('MiLight', V(-14.5, 3.6, 5.3)); mm.forEach((m) => addMat(ml, m));
  inst(F, 'Färgpanelerna', 'milight', 3.9, 'milight');
  dev(F, 'pir3', -16.2, 2.1, 1.75);
}

function room4(F) {
  // the cloud (SM_CloudPlaceHolder) hanging over the middle: a lit ring under it + a light
  const [cx, cz] = PX('fix:Molnet'), cy = 3.1;
  const cf = fixture('Tak+Cloud', V(cx, cy, cz));
  strip(F, 'Tak+Cloud', ring(cx, cy - 0.45, cz, 1.0, 30), { closed: true, r: 0.03 });
  cf.pos = V(cx, cy, cz);
  const cl = new THREE.PointLight(C.lime, 0, 5, 1.8); cl.position.set(cx, cy - 0.7, cz); F.add(cl); cf.light = cl; cf.lightMax = 6;
  inst(F, 'Molnet', 'fix:Molnet', 3.8, 'cloud', 26);

  // the five 80 cm theme cubes hanging above their stations, joined to the cloud by threads of light
  W.threads = {}; W.fade ||= [];
  const cubes = { Climate: 'fix:Klimat-kuben', Housing: 'fix:Bostads-kuben', Competence: 'fix:Kompetens-kuben', Mobility: 'fix:Mobilitets-kuben', Social: 'fix:Social-kuben' };
  for (const [name, id] of Object.entries(cubes)) {
    const [x, z] = PX(id), y = 2.9;
    const m = lam(0xffffff);
    const cube = at(solid(new THREE.BoxGeometry(0.8, 0.8, 0.8), { mat: m, s: 0.12 }), x, y, z);
    F.add(cube); W.fade.push(cube);
    const f = fixture(name, V(x, y, z)); addMat(f, m);
    const a = V(x, y, z), b = V(cx, cy - 0.2, cz), mid = a.clone().lerp(b, 0.5); mid.y -= 0.45;
    const curve = new THREE.QuadraticBezierCurve3(a, mid, b);
    const tm = new THREE.MeshBasicMaterial({ color: 0xa8a9a2 });
    F.add(new THREE.Mesh(new THREE.TubeGeometry(curve, 40, 0.018, 4), tm));
    addMat(f, tm);
    W.threads[name] = curve;
  }
  // corners: speakers that answer with birds (approximate spots)
  W.speakers = {};
  for (const [k, x, z] of [['klimat', -4.8, 10.6], ['boende', 9.4, 3.0], ['blommor', -1.6, 6.9], ['mobilitet', 12.4, 10.2], ['social', -4.6, 2.4], ['mitten', 3.5, 8.6]]) {
    F.add(at(solid(new THREE.ConeGeometry(0.16, 0.3, 8).rotateX(Math.PI / 2), { s: 0.08 }), x, 2.6, z));
    W.speakers[k] = V(x, 2.6, z);
  }

  // climate corner: the slide (top at −x, landing at +x) with Climate LED along it, recycling, SkyKraft
  strip(F, 'Climate', [V(-3.4, 2.5, 9.45), V(2.0, 0.45, 9.45)], { r: 0.03, pos: V(...[P('fix:Klimat-kuben').x, 2.9, P('fix:Klimat-kuben').y]) });
  inst(F, 'Rutschkanan', 'rutschkanan', 3.2, 'slide');
  dev(F, 'ultraljud1', 2.3, 0.6, 9.75);
  const [rx, rz] = PX('atervinning');
  strip(F, 'Climate Recycle', ring(rx, 0.05, rz, 0.55, 18), { closed: true, r: 0.025 });
  inst(F, 'Elektronikåtervinning', 'atervinning', 1.6, 'recycling');
  inst(F, 'SkyKraft', 'skykraft', 2.2, 'skykraft');

  // housing: spin the house on a pedestal
  const [hx, hz] = PX('snurra-huset', 0.6, 0.3);
  F.add(at(solid(new THREE.CylinderGeometry(0.32, 0.32, 0.9, 12).translate(0, 0.45, 0), { s: 0.15 }), hx, 0, hz));
  const house = new THREE.Group();
  house.add(solid(boxG(0.32, 0.22, 0.26), { s: 0.06 }));
  house.add(solid(new THREE.CylinderGeometry(0.19, 0.19, 0.32, 3).rotateZ(Math.PI / 2).translate(0, 0.3, 0), { s: 0.06 }));
  at(house, hx, 0.9, hz); F.add(house); W.house = house;
  inst(F, 'Snurra huset', 'snurra-huset', 1.8, 'house');
  dev(F, 'housing', hx + 0.45, 0.8, hz - 0.3);
  strip(F, 'Housing', [V(hx - 1.2, 2.0, hz - 1.3), V(hx + 0.6, 2.0, hz - 1.3)], { r: 0.03, pos: V(P('fix:Bostads-kuben').x, 2.9, P('fix:Bostads-kuben').y) });

  // e-mobility charger + droneport vote
  const [ex, ez] = PX('elbil');
  dev(F, 'emob', ex - 0.3, 1.0, ez, { sub: 'Shelly' });
  inst(F, 'Elbilsladdaren', 'elbil', 1.7, 'emob');
  const [dx, dz] = PX('droneport');
  for (let i = 0; i < 6; i++) F.add(at(new THREE.Mesh(new THREE.CylinderGeometry(0.04, 0.04, 0.03, 8), MAT.red), dx - 0.33 + i * 0.13, 1.0, dz + 0.3));
  inst(F, 'Droneport', 'droneport', 2.2, 'droneport');
  dev(F, 'droneport', dx - 0.45, 1.1, dz + 0.45, { sub: 'rpi3' });

  // mobility: the tandem bike (Skellefteåtriangeln), ACE, Sokrates' wall, the skills tent
  const [bx, bz] = PX('triangeln');
  inst(F, 'Skellefteåtriangeln', 'triangeln', 2.0, 'bike');
  dev(F, 'bike', bx + 0.5, 0.5, bz - 0.4, { sub: 'ANT+' });
  strip(F, 'Mobility', [V(bx - 0.9, 2.1, bz + 1.0), V(bx + 0.9, 2.1, bz + 1.0)], { r: 0.03, pos: V(P('fix:Mobilitets-kuben').x, 2.9, P('fix:Mobilitets-kuben').y) });
  const [ax, az] = PX('ace');
  inst(F, 'ACE Powerhouse', 'ace', 2.0, 'ace');
  strip(F, 'Competence', [V(ax - 0.7, 1.25, az - 0.75), V(ax + 0.7, 1.25, az - 0.75)], { r: 0.03, pos: V(P('fix:Kompetens-kuben').x, 2.9, P('fix:Kompetens-kuben').y) });
  const [sx, sz] = PX('sokrates');
  strip(F, 'Competence SUA', [V(sx - 0.6, 0.4, sz + 0.25), V(sx - 0.6, 1.9, sz + 0.25), V(sx + 0.6, 1.9, sz + 0.25), V(sx + 0.6, 0.4, sz + 0.25)], { closed: true, r: 0.025 });
  inst(F, 'Sokrates frågevägg', 'sokrates', 2.3, 'sua');
  dev(F, 'sua', sx + 0.75, 1.0, sz, { text: 'sua/' });
  const [tx, tz] = PX('kompetenstaltet');
  inst(F, 'Kompetenstältet', 'kompetenstaltet', 2.1, 'skills');
  dev(F, 'skill', tx - 0.7, 0.8, tz - 0.4, { text: 'skill/svenska' });
  dev(F, 'pir2', tx + 0.6, 1.6, tz - 0.6);

  // flowers: the greenhouse (SM_GreenHouse2) and the big red button
  const [gx, gz] = PX('vaxthuset');
  const gm = new THREE.MeshLambertMaterial({ color: 0xffffff, transparent: true, opacity: 0.0, depthWrite: false });
  const gf = fixture('Växthus', V(gx, 1.4, gz)); addMat(gf, gm); gf.glass = gm;
  strip(F, 'Växthus', [V(gx - 1.15, 2.7, gz - 1.15), V(gx + 1.15, 2.7, gz - 1.15), V(gx + 1.15, 2.7, gz + 1.15), V(gx - 1.15, 2.7, gz + 1.15)], { closed: true, r: 0.03 });
  const gl = new THREE.PointLight(C.lime, 0, 4, 1.8); gl.position.set(gx, 1.2, gz); F.add(gl); gf.light = gl; gf.lightMax = 4;
  inst(F, 'Växthuset', 'vaxthuset', 3.4, 'greenhouse', 26);
  const [yx, yz] = PX('sag-ja');
  F.add(at(new THREE.Mesh(new THREE.CylinderGeometry(0.15, 0.15, 0.07, 16), MAT.red), yx, 0.95, yz));
  inst(F, 'Säg ja!-knappen', 'sag-ja', 1.6, 'button');
  dev(F, 'pushbutton1', yx + 0.4, 0.9, yz + 0.25);
  inst(F, 'Ljudinstallationen', 'ljudrummet', 2.6, 'sound');

  // social: spinning boxes (BP_SpinningBlocks), PIRs, the sauna lamp
  W.spin = [];
  const [ox, oz] = PX('social');
  inst(F, 'Snurrlådorna', 'social', 2.0, 'spin');
  dev(F, 'spinningboxes', ox + 0.6, 0.7, oz + 1.0);
  dev(F, 'pir1', ox - 0.9, 2.3, oz - 0.6); dev(F, 'pir4', ox + 1.4, 2.3, oz - 0.6);
  const lm = lam(0xffffff);
  F.add(at(new THREE.Mesh(new THREE.IcosahedronGeometry(0.16, 1), lm), ox - 1.6, 2.2, oz + 0.4));
  addMat(fixture('Bastu-lampa', V(ox - 1.6, 2.2, oz + 0.4)), lm);
  strip(F, 'Social', [V(ox - 1.0, 2.3, oz - 0.9), V(ox + 1.0, 2.3, oz - 0.9)], { r: 0.03, pos: V(P('fix:Social-kuben').x, 2.9, P('fix:Social-kuben').y) });
  strip(F, 'Introduction', [V(-5.6, 2.2, 2.0), V(-5.6, 2.2, 4.4)], { r: 0.03 });
  // fixtures whose cube is the light: point them at the cube
  for (const n of ['Climate', 'Social', 'Mobility', 'Housing', 'Competence']) FIX[n].cube = true;
}

// computers and iPads (enlarged so they read at room scale). Spots are approximate: next to the
// installation they run, or where the early Miro network sketch put them (docs/kallor/miro-skisser.md).
const HOSTS = [
  ['rpi3', 'pi', 11.9, 5.4, 'Droneport'], ['rpi4', 'pi', -16.0, -3.7, 'Maskinisterna'], ['rpi5', 'pi', 11.8, 9.9, 'Cykeln · ANT+'],
  ['rpi6', 'pi', 3.4, 8.2, 'Ljud rum 4'], ['rpi7', 'pi', -19.0, -6.4, 'Reverse Perspective'], ['rpi9', 'pi', -3.8, 10.4, 'Återvinning'],
  ['rpi10', 'pi', -17.6, 6.3, 'Sara-loopen'],
  ['macmini-housing', 'mac', 9.0, 4.0, 'Huset · TouchDesigner'], ['macmini1', 'mac', -10.8, 8.4, 'Dialogen'], ['macmini3', 'mac', -18.6, 0.3, 'Ljudkonst → Ableton'],
  ['macmini4', 'mac', -5.0, 8.4, 'SkyKraft'], ['macmini6', 'mac', 12.0, 8.8, 'Triangeln · TD → Unreal'], ['resolume', 'mac', 4.6, 9.9, 'Resolume'],
  ['ace', 'pc', 6.4, 7.5, 'ACE · TouchDesigner'], ['riverwallcorridor', 'pc', -13.4, 0.6, 'Floden'], ['vr-pc7', 'pc', -21.9, -1.8, 'Dokumentären'],
  ['ipad-recorder', 'ipad', -10.2, 7.0, 'spelar in'], ['ipad-player', 'ipad', -5.0, 4.6, 'Socialhörnet · visar klippen'], ['ipad-recycling', 'ipad', -3.0, 9.6, 'skrotmonstret'],
  ['ipad-sua', 'ipad', 7.3, 10.0, 'frågorna'],
];
// depth cameras: an Azure Kinect over the river wall and over the documentary wall, an Orbbec Femto on the ACE model.
// The spots are guesses: on top of the wall or model, looking out at the visitors (docs/fragor-till-peder.md, Q23).
const CAMS = [['kinect-floden', 'Azure Kinect', -7.34, 3.04, 0.74, '-z'], ['kinect-doc', 'Kinect', -22.06, 2.8, -3.05, '+x'], ['orbbec-ace', 'Orbbec Femto', 5.9, 1.52, 6.17, '-z']];
const FACING = { '-z': [Math.PI, V(0, 0, -1)], '+z': [0, V(0, 0, 1)], '+x': [Math.PI / 2, V(1, 0, 0)], '-x': [-Math.PI / 2, V(-1, 0, 0)] };
function depthCams(F) {
  const body = new THREE.BoxGeometry(0.26, 0.07, 0.08), lens = new THREE.CylinderGeometry(0.014, 0.014, 0.012, 10).rotateX(Math.PI / 2);
  const mb = lam(0x55564f), ml = lam(0x0a0b09);
  for (const [id, name, x, y, z, n] of CAMS) {
    const g = new THREE.Group(), [ry, nv] = FACING[n];
    g.add(solid(body, { s: 0.05, mat: mb, shadow: false }));
    for (const dx of [-0.07, 0, 0.07]) g.add(at(solid(lens, { s: 0.01, mat: ml, shadow: false }), dx, 0, 0.042));
    F.add(at(g, x, y, z, ry));
    const l = label(name, { sub: 'djupkamera', groups: ['sensors'], stalk: 12 }); at(l, x, y + 0.08, z); F.add(l);
    HW[id] = { pos: V(x, y, z), n: nv };
  }
}
function hosts(F) {
  for (const [id, kind, x, z, role] of HOSTS) {
    let g, y = 0, ly;
    if (kind === 'pi') { g = boxG(0.26, 0.07, 0.18); ly = 0.12; }
    else if (kind === 'mac') { g = boxG(0.32, 0.08, 0.32); ly = 0.12; }
    else if (kind === 'pc') { g = boxG(0.22, 0.48, 0.46); ly = 0.52; }
    else { g = boxG(0.04, 0.34, 0.25); y = 0.9; ly = 0.38; }
    if (id === 'ipad-recycling') y = 1.1;
    const o = solid(g, { s: 0.08, mat: lam(0xffffff) });
    at(o, x, y, z); F.add(o);
    const l = label(id.replace('.local', ''), { sub: role, groups: ['hosts'], stalk: 22, key: id });
    at(l, x, y + ly, z); F.add(l);
    HOST[id] = { pos: V(x, y + ly * 0.6, z), kind, role, label: l, mat: o.userData.mesh.material };
  }
}

// ═══════════════════ the hub: tnt.local ═══════════════════
export const SERVICES = [
  ['mosquitto', 'MQTT-broker'], ['nginx', 'webb + proxy'], ['se26', 'main.py · rattar, MiLight'],
  ['tnt-switchboard', 'sensor → ljus'], ['emobility-bridge', 'elbilsladdaren'], ['tnt-mqtt-watcher', 'trafik + hjärtslag'], ['tnt-diagnose', 'hälsa + Slack'],
];
function hub(F) {
  const g = new THREE.Group(); g.name = 'hub';
  const y0 = HUBP.y;
  g.add(at(solid(new THREE.CylinderGeometry(2.1, 2.1, 0.16, 48).translate(0, 0.08, 0), { s: 0.2, thr: 30 }), HUBP.x, y0, HUBP.z));
  g.add(at(solid(new THREE.CylinderGeometry(0.5, 0.75, 0.5, 6).translate(0, -0.25, 0), { s: 0.12 }), HUBP.x, y0, HUBP.z));
  W.svc = {};
  SERVICES.forEach(([n, sub], i) => {
    const a = i / SERVICES.length * Math.PI * 2 + 0.3, x = HUBP.x + Math.cos(a) * 1.6, z = HUBP.z + Math.sin(a) * 1.6;
    const m = lam(0xffffff);
    g.add(at(solid(boxG(0.3, 0.42, 0.3), { s: 0.06, mat: m }), x, y0 + 0.16, z, -a));
    const l = label(n, { sub, groups: ['hub'], stalk: 16 + (i % 2) * 34, key: n }); at(l, x, y0 + 0.62, z); g.add(l);
    W.svc[n] = { pos: V(x, y0 + 0.4, z), mat: m };
  });
  const hl = label('tnt.local · hjärtat', { sub: '192.168.51.41', cls: 'big', groups: ['hub', 'hubname'], stalk: 90 });
  at(hl, HUBP.x, y0 + 0.5, HUBP.z); g.add(hl);

  // the Raspberry Pi itself, true size, on a plinth in the middle of the disc
  const pi = new THREE.Group();
  const s = 0.004;
  pi.add(solid(boxG(0.085, 0.0016, 0.056), { s, mat: lam(0xffffff) }));
  const parts = [[0.015, 0.0025, 0.015, -0.005, 0.0016, 0.004], [0.0175, 0.016, 0.013, 0.0335, 0.0016, -0.017], [0.0175, 0.016, 0.013, 0.0335, 0.0016, 0.0015],
    [0.0215, 0.0135, 0.016, 0.0315, 0.0016, 0.0195], [0.05, 0.0085, 0.005, -0.0075, 0.0016, -0.0245], [0.009, 0.0032, 0.007, -0.033, 0.0016, 0.0245],
    [0.007, 0.003, 0.0075, -0.019, 0.0016, 0.0245], [0.007, 0.003, 0.0075, -0.006, 0.0016, 0.0245], [0.011, 0.0012, 0.011, 0.012, 0.0016, 0.006]];
  for (const [w, h, d, x, y, z] of parts) pi.add(at(solid(boxG(w, h, d), { s }), x, y, z));
  for (let i = 0; i < 20; i++) for (let k = 0; k < 2; k++) {
    const p = new THREE.Mesh(new THREE.BoxGeometry(0.0007, 0.006, 0.0007), new THREE.MeshBasicMaterial({ color: 0x3a3b36 }));
    p.position.set(-0.0315 + i * 0.00254, 0.0062, -0.0257 + k * 0.00254); pi.add(p);
  }
  at(pi, HUBP.x, y0 + 0.16, HUBP.z, 0.5); g.add(pi);
  W.pi = pi; W.piPos = V(HUBP.x, y0 + 0.17, HUBP.z);
  const pl = [['Raspberry Pi', 'tnt.local', -0.02, 0.004, -0.01], ['Ethernet', 'nätverksport', 0.0315, 0.016, 0.0195], ['USB-C', 'ström via UPS', -0.033, 0.004, 0.0245], ['GPIO', '40 pinnar', -0.0075, 0.009, -0.0245]];
  for (const [t, sub, x, y, z] of pl) { const l = label(t, { sub, groups: ['pi'], stalk: 20 }); at(l, x, y, z); pi.add(l); }
  // UPS next to the plinth
  g.add(at(solid(boxG(0.27, 0.15, 0.2), { s: 0.03 }), HUBP.x + 0.42, y0 + 0.16, HUBP.z + 0.25));
  const ul = label('UPS', { sub: 'EcoFlow River 3 Plus', groups: ['hub', 'pi'], stalk: 14 }); at(ul, HUBP.x + 0.42, y0 + 0.32, HUBP.z + 0.25); g.add(ul);
  F.add(g); W.hub = g;
}

// wires from every device, computer and fixture up to the hub (in floor coordinates)
export function buildWires(F) {
  const grp = new THREE.Group(); grp.name = 'wires';
  const mat = bdash({ color: 0x8b8c86, dashSize: 0.18, gapSize: 0.14, transparent: true, opacity: 0.85 });
  const mk = (p) => new THREE.CubicBezierCurve3(p.clone(), V(p.x, p.y + 3.2, p.z), V(HUBP.x + (p.x - HUBP.x) * 0.12, HUBP.y - 2.6, HUBP.z + (p.z - HUBP.z) * 0.12), HUBP.clone());
  const curves = {};
  const add = (key, p) => {
    const c = mk(p); curves[key] = c;
    const l = new THREE.Line(new THREE.BufferGeometry().setFromPoints(c.getPoints(36)), mat);
    l.computeLineDistances(); grp.add(l);
  };
  for (const [k, d] of Object.entries(DEV)) add('dev:' + k, d.pos);
  for (const [k, h] of Object.entries(HOST)) add('host:' + k, h.pos);
  for (const [k, f] of Object.entries(FIX)) add('fix:' + k, f.pos);
  F.add(grp);
  W.wires = grp; W.wireCurves = curves;
  return grp;
}

// ═══════════════════ outside services (logical placement) ═══════════════════
export function buildRemote(scene) {
  const grp = new THREE.Group(); grp.name = 'remote';
  const berget = new THREE.Group();
  berget.add(solid(boxG(120, 6, 80), { s: 4 }));
  [[-35, 0, 46, 22], [10, 0, 38, 30], [45, 0, 26, 18]].forEach(([x, z, h, w]) => berget.add(at(solid(boxG(w, h, 50), { s: 4 }), x, 6, z)));
  at(berget, -900, 0, 2900); grp.add(berget);
  const bl = label('Berget AI', { sub: 'svenskt AI-moln · logisk placering', cls: 'big', groups: ['remote'], stalk: 50 });
  at(bl, -900, 60, 2900); grp.add(bl);
  const slack = solid(boxG(50, 40, 50), { s: 3 }); at(slack, 1500, 0, -800); grp.add(slack);
  const sl = label('Slack', { sub: 'daglig rapport 08:00 UTC', cls: 'big', groups: ['remote'], stalk: 40 }); at(sl, 1500, 44, -800); grp.add(sl);
  W.berget = V(-900, 52, 2900); W.slack = V(1500, 42, -800);
  scene.add(grp);
  return grp;
}
