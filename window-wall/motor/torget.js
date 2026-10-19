/* motor/torget.js · Torget i 3D: Exploratoriets fasad en kväll, sett utifrån, med folket på torget.
   Rutorna visar motorns duk (samma bild som utgången). Personerna är motorns personer (Indata).
   Koordinater: x längs fasaden (samma som motorn), y uppåt från marken, z utåt mot torget (glaset vid z ≈ 0). */
window.Torget = (function () {
  'use strict';
  const F = window.FASAD, N = window.Nattfonster, I = window.Indata, W = window.WW;
  const RM = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
  let THREE, renderer, scene, camera, controls, screenTex, el, wall, screen, startad = false, synlig = false, tween = null;
  const DX = W.X0 + 1.2; // de handplacerade husdetaljerna mättes en gång kring x = -1,2; flytta dem till den nya nollan
  const UK = F.fonsterUnderkant, H = F.hojd, R = N.W;

  function bygg() {
    THREE = window.THREE;
    renderer = new THREE.WebGLRenderer({ antialias: true });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
    renderer.outputEncoding = THREE.sRGBEncoding;
    el.appendChild(renderer.domElement);
    renderer.domElement.style.cssText = 'display:block;width:100%;height:100%;touch-action:none;cursor:grab';
    scene = new THREE.Scene(); scene.background = new THREE.Color(0x06070a); scene.fog = new THREE.Fog(0x06070a, 30, 80);
    camera = new THREE.PerspectiveCamera(45, 1, 0.1, 250);
    controls = new THREE.OrbitControls(camera, renderer.domElement);
    controls.enableDamping = true; controls.dampingFactor = 0.08; controls.minDistance = 2.5; controls.maxDistance = 36;
    controls.maxPolarAngle = Math.PI * 0.495; controls.minAzimuthAngle = -1.3; controls.maxAzimuthAngle = 1.3;
    scene.add(new THREE.HemisphereLight(0x8a96b8, 0x1c1a14, 0.6));
    const moon = new THREE.DirectionalLight(0xc4ceff, 0.5); moon.position.set(-18 + DX, 26, 24); scene.add(moon);

    const BX0 = -12 + DX, BX1 = 16 + DX, BH = 11.4;
    const plaster = new THREE.MeshStandardMaterial({ color: 0xdcb7a4, roughness: 0.95 });
    const frameMat = new THREE.MeshStandardMaterial({ color: 0xeeeeea, roughness: 0.6 });
    const glassMat = new THREE.MeshStandardMaterial({ color: 0x0e121a, roughness: 0.2, metalness: 0.6, emissive: 0x05070b });
    const litGlass = new THREE.MeshStandardMaterial({ color: 0x2a2014, roughness: 0.4, emissive: 0x5a3a14, emissiveIntensity: 0.9 });
    const concrete = new THREE.MeshStandardMaterial({ color: 0x7d7c77, roughness: 1 });
    const box = (w, h, d, mat, x, y, z) => { const m = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), mat); m.position.set(x, y, z); scene.add(m); return m; };

    const facade = new THREE.Shape(); facade.moveTo(BX0, 0); facade.lineTo(BX1, 0); facade.lineTo(BX1, BH); facade.lineTo(BX0, BH); facade.lineTo(BX0, 0);
    const hole = (x, y, w, h) => { const p = new THREE.Path(); p.moveTo(x, y); p.lineTo(x, y + h); p.lineTo(x + w, y + h); p.lineTo(x + w, y); p.lineTo(x, y); facade.holes.push(p); };
    for (const s of F.sektioner) hole(s.x, UK, s.bredd, H);
    const glassWins = [];
    const gwin = (x, y, w, h, cols, rows, lit) => { hole(x, y, w, h); glassWins.push({ x, y, w, h, cols, rows, lit }); };
    [-11, -8.8, -6.6, -4.4, -2.2, 0].forEach((x, k) => gwin(x + DX, 5.6, 1.5, 2.4, 2, 2, k === 2));
    [5.2, 8.4, 11.6].forEach((x, k) => gwin(x + DX, 5.4, 2.3, 3.4, 3, 3, k === 1));
    [5.6, 8.4, 11.2].forEach(x => gwin(x + DX, 2.4, 2.0, 1.0, 3, 1, false));
    [-10.8, -8.8].forEach(x => gwin(x + DX, 2.4, 1.6, 1.0, 2, 1, false));
    [5.6, 8.4, 11.2, 14.0].forEach(x => gwin(x + DX, 0.45, 1.6, 0.6, 2, 1, false));
    wall = new THREE.Mesh(new THREE.ExtrudeGeometry(facade, { depth: 0.4, bevelEnabled: false }), plaster); wall.position.z = -0.4; scene.add(wall);
    box(BX1 - BX0, BH, 14, plaster, (BX0 + BX1) / 2, BH / 2, -0.4 - 7.001);
    box(BX1 - BX0 + 0.5, 0.28, 14.5, new THREE.MeshStandardMaterial({ color: 0x2c2c2c, roughness: 0.7 }), (BX0 + BX1) / 2, BH + 0.14, -7.15);
    box(BX1 - BX0 + 0.1, 0.12, 0.2, frameMat, (BX0 + BX1) / 2, BH - 0.2, 0.08);
    const frameRect = (x, y, w, h, z, t, cols, rows) => {
      box(w, t, 0.06, frameMat, x + w / 2, y + t / 2, z); box(w, t, 0.06, frameMat, x + w / 2, y + h - t / 2, z); box(t, h, 0.06, frameMat, x + t / 2, y + h / 2, z); box(t, h, 0.06, frameMat, x + w - t / 2, y + h / 2, z);
      for (let i = 1; i < cols; i++) box(t * 0.8, h, 0.05, frameMat, x + w * i / cols, y + h / 2, z); for (let j = 1; j < rows; j++) box(w, t * 0.8, 0.05, frameMat, x + w / 2, y + h * j / rows, z);
    };
    for (const gw of glassWins) { const m = new THREE.Mesh(new THREE.PlaneGeometry(gw.w, gw.h), gw.lit ? litGlass : glassMat); m.position.set(gw.x + gw.w / 2, gw.y + gw.h / 2, -0.3); scene.add(m); frameRect(gw.x, gw.y, gw.w, gw.h, -0.26, 0.06, gw.cols, gw.rows); }
    // de två projektionsfönstren: karm, spröjs och tvärpost ur den gemensamma geometrin
    const TP = F.tvarpost ?? F.sprojs;
    for (const s of F.sektioner) {
      const x = s.x, z = -0.19, FR = F.ram;
      box(s.bredd, FR, 0.08, frameMat, x + s.bredd / 2, UK + FR / 2, z); box(s.bredd, FR, 0.08, frameMat, x + s.bredd / 2, UK + H - FR / 2, z);
      box(FR, H, 0.08, frameMat, x + FR / 2, UK + H / 2, z); box(FR, H, 0.08, frameMat, x + s.bredd - FR / 2, UK + H / 2, z);
      for (let c = 1; c < s.kolumner; c++) { const k = s._kol[c - 1]; box(F.sprojs, H - 2 * FR, 0.08, frameMat, k.x + k.w + F.sprojs / 2, UK + H / 2, z); }
      for (let r = 1; r < s.rader; r++) { const ra = s._rader[r - 1]; box(s.bredd - 2 * FR, TP, 0.08, frameMat, x + s.bredd / 2, UK + H - (ra.y + ra.h + TP / 2), z); }
      box(s.bredd + 0.1, 0.05, 0.2, frameMat, x + s.bredd / 2, UK - 0.02, -0.02);
    }
    // filmen: motorns duk (maskad utanför rutorna)
    screenTex = new THREE.CanvasTexture(N.canvas); screenTex.encoding = THREE.sRGBEncoding; screenTex.anisotropy = 4;
    screen = new THREE.Mesh(new THREE.PlaneGeometry(R, H), new THREE.MeshBasicMaterial({ map: screenTex, toneMapped: false }));
    screen.position.set(R / 2, UK + H / 2, -0.25); scene.add(screen);

    // banderollen och entrén till höger om fönstren
    const bannerX = R + 1.35;
    const bc = document.createElement('canvas'); bc.width = 256; bc.height = 1024; const bx = bc.getContext('2d');
    const ritaBanner = () => { bx.fillStyle = '#f4f2ee'; bx.fillRect(0, 0, 256, 1024); bx.save(); bx.translate(128, 512); bx.rotate(-Math.PI / 2); bx.fillStyle = '#E8641E'; bx.font = '800 128px Alegreya, Georgia, serif'; bx.textAlign = 'center'; bx.textBaseline = 'middle'; bx.fillText('Exploratoriet', 0, -14); bx.fillStyle = '#555'; bx.font = '600 30px Alegreya, Georgia, serif'; bx.fillText('SKELLEFTEÅ SCIENCE CENTER', 30, 72); bx.restore(); };
    ritaBanner();
    const bannerTex = new THREE.CanvasTexture(bc); bannerTex.encoding = THREE.sRGBEncoding;
    if (document.fonts) document.fonts.load('800 40px Alegreya').then(() => { ritaBanner(); bannerTex.needsUpdate = true; }).catch(() => {});
    const bf = new THREE.MeshStandardMaterial({ map: bannerTex, roughness: 0.7, emissive: 0x222222, emissiveMap: bannerTex }), bs = new THREE.MeshStandardMaterial({ color: 0xdddddd });
    const banner = new THREE.Mesh(new THREE.BoxGeometry(1.7, 6.6, 0.15), [bs, bs, bs, bs, bf, bs]); banner.position.set(bannerX, 4.25 + 3.3, 0.1); scene.add(banner);
    box(2.2, 2.7, 1.2, glassMat, bannerX, 1.35, 0.6); frameRect(bannerX - 1.1, 0, 2.2, 2.7, 1.22, 0.07, 2, 1);
    box(2.8, 0.18, 1.7, new THREE.MeshStandardMaterial({ color: 0x4e8a6a, roughness: 0.6 }), bannerX, 2.85, 0.75);
    const warm = new THREE.PointLight(0xffbe7a, 1.1, 9, 2); warm.position.set(bannerX, 2.6, 1.9); scene.add(warm);

    // mark, torg, sittblock, björkar och stjärnor
    const ground = new THREE.Mesh(new THREE.PlaneGeometry(180, 180), new THREE.MeshStandardMaterial({ color: 0x111211, roughness: 1 })); ground.rotation.x = -Math.PI / 2; scene.add(ground);
    const plaza = new THREE.Mesh(new THREE.PlaneGeometry(BX1 - BX0 + 6, 12), new THREE.MeshStandardMaterial({ color: 0x262624, roughness: 1 })); plaza.rotation.x = -Math.PI / 2; plaza.position.set((BX0 + BX1) / 2, 0.005, 6); scene.add(plaza);
    [[-9, 4, 2.4, 0.7, 0], [-6.5, 9.2, 2.8, 0.8, 0.1], [2.2, 10.2, 2.2, 0.7, -0.1], [6.4, 7.6, 3, 0.8, 0], [10, 7.2, 2.6, 0.8, 0.2], [13, 4, 2.2, 0.7, 0], [-9, 10.4, 2, 0.7, -0.2], [5.4, 9.4, 1.6, 1.6, 0]]
      .forEach(([x, z, w, d, ry]) => { const m = box(w, 0.45, d, concrete, x + DX, 0.225, z); m.rotation.y = ry; });
    const bark = new THREE.MeshStandardMaterial({ color: 0x8f8d86, roughness: 1 });
    const tree = (x, z, h) => { const grp = new THREE.Group(); const t = new THREE.Mesh(new THREE.CylinderGeometry(0.06, 0.15, h, 6), bark); t.position.y = h / 2; grp.add(t);
      for (let i = 0; i < 8; i++) { const L = h * (0.18 + Math.random() * 0.22); const b = new THREE.Mesh(new THREE.CylinderGeometry(0.012, 0.045, L, 4), bark); b.position.y = h * (0.4 + Math.random() * 0.55); b.rotation.set(0, Math.random() * 6.28, (Math.random() < .5 ? -1 : 1) * (0.35 + Math.random() * 0.5)); b.translateY(L / 2); grp.add(b); }
      grp.position.set(x + DX, 0, z); scene.add(grp); };
    [[-14, -2, 9], [-15.5, 1.5, 10], [-17, -1, 8.5], [-14.6, 4.5, 7.5], [-19, 3, 9.5], [-21, -0.5, 10], [-18, 7, 8]].forEach(a => tree(...a));
    { const n = 500, pos = new Float32Array(n * 3); for (let i = 0; i < n; i++) { const th = Math.random() * Math.PI * 2, ph = Math.random() * 1.3, Rr = 110; pos[i * 3] = Rr * Math.sin(ph) * Math.cos(th); pos[i * 3 + 1] = Rr * Math.cos(ph) + 5; pos[i * 3 + 2] = Rr * Math.sin(ph) * Math.sin(th); }
      const gm = new THREE.BufferGeometry(); gm.setAttribute('position', new THREE.BufferAttribute(pos, 3)); scene.add(new THREE.Points(gm, new THREE.PointsMaterial({ color: 0xe8ffba, size: 0.35, fog: false, transparent: true, opacity: 0.7 }))); }

    // ljuset från rutorna på marken
    spill.c = document.createElement('canvas'); spill.c.width = 160; spill.c.height = 40; spill.x = spill.c.getContext('2d');
    spill.tex = new THREE.CanvasTexture(spill.c); spill.tex.encoding = THREE.sRGBEncoding;
    const sm = new THREE.Mesh(new THREE.PlaneGeometry(R + 1.2, 4.4), new THREE.MeshBasicMaterial({ map: spill.tex, transparent: true, blending: THREE.AdditiveBlending, depthWrite: false, opacity: 0.75 }));
    sm.rotation.x = -Math.PI / 2; sm.position.set(R / 2, 0.015, 2.2); scene.add(sm);

    // klick på fasaden → idéns click (WW-idéer med klick, t.ex. Energistafett)
    let ner = null; const ray = new THREE.Raycaster(), ndc = new THREE.Vector2();
    renderer.domElement.addEventListener('pointerdown', e => { ner = [e.clientX, e.clientY]; });
    renderer.domElement.addEventListener('pointerup', e => {
      if (!ner) return; const d = Math.hypot(e.clientX - ner[0], e.clientY - ner[1]); ner = null; if (d > 6 || !N.aktiv) return;
      const r = renderer.domElement.getBoundingClientRect(); ndc.set(((e.clientX - r.left) / r.width) * 2 - 1, -((e.clientY - r.top) / r.height) * 2 + 1); ray.setFromCamera(ndc, camera);
      const hit = ray.intersectObjects([wall, screen], false)[0];
      if (hit && hit.object === screen) W.klick(N.aktiv.id, hit.point.x, UK + H - hit.point.y);
    });
    new ResizeObserver(storlek).observe(el); storlek(); aterstall(false);
  }
  const spill = {};
  function uppdateraSpill() {
    const x = spill.x, w = 160, h = 40;
    x.globalCompositeOperation = 'source-over'; x.clearRect(0, 0, w, h); x.save(); x.translate(0, h); x.scale(1, -1); x.drawImage(N.canvas, 0, 0, w, h); x.restore();
    x.globalCompositeOperation = 'destination-in'; const gr = x.createLinearGradient(0, 0, 0, h); gr.addColorStop(0, 'rgba(0,0,0,1)'); gr.addColorStop(1, 'rgba(0,0,0,0)'); x.fillStyle = gr; x.fillRect(0, 0, w, h); spill.tex.needsUpdate = true;
  }

  // ---------- personer: en figur per person i motorn ----------
  const figurer = new Map();
  let kroppMat, ringGeo;
  function figur(p) {
    if (!kroppMat) { kroppMat = new THREE.MeshStandardMaterial({ color: 0x1c1d1a, roughness: 0.9 }); ringGeo = new THREE.RingGeometry(0.3, 0.39, 40); }
    const grp = new THREE.Group(), inner = new THREE.Group(); grp.add(inner);
    [-0.09, 0.09].forEach(dx => { const l = new THREE.Mesh(new THREE.CylinderGeometry(0.07, 0.07, 0.8, 8), kroppMat); l.position.set(dx, 0.4, 0); inner.add(l); });
    const t = new THREE.Mesh(new THREE.CylinderGeometry(0.2, 0.17, 0.66, 10), kroppMat); t.position.y = 1.12; inner.add(t);
    const headMat = new THREE.MeshBasicMaterial({ color: 0x7d7f78 }); const h = new THREE.Mesh(new THREE.SphereGeometry(0.15, 16, 12), headMat); h.position.y = 1.6; inner.add(h);
    const ring = new THREE.Mesh(ringGeo, new THREE.MeshBasicMaterial({ color: 0xCAFE03, transparent: true, opacity: 0.85 })); ring.rotation.x = -Math.PI / 2; ring.position.y = 0.02; ring.visible = false;
    scene.add(grp); scene.add(ring);
    return { grp, inner, headMat, ring, jump: 0, lean: 0, walk: Math.random() * 6 };
  }
  function personer(dt, T) {
    const s = N.aktiv, idea = s && s.ww, sedda = new Set();
    const ordning = W.people.map(p => p.id);
    for (const p of I.input.personer) {
      sedda.add(p.id);
      let f = figurer.get(p.id); if (!f) { f = figur(p); figurer.set(p.id, f); }
      const i = ordning.indexOf(p.id);
      let col = p.kalla === 'mus' ? '#ff4fa3' : (p.barn ? '#c8ccbf' : '#8a8d84');
      let st = {};
      if (idea && i >= 0) { const c = idea.cast ? idea.cast(i) : null; if (c) col = c; st = (idea.fig && idea.fig(i, T)) || {}; }
      f.headMat.color.set(col);
      f.ring.visible = p.kalla === 'plats' && !!idea && !idea.crowd && col !== '#3d3f3a';
      if (f.ring.visible) { f.ring.material.color.set(col); f.ring.position.set(p.x, 0.02, p.avstand); }
      f.walk += p.fart * dt * 7;
      f.jump += ((st.jump || 0) - f.jump) * Math.min(1, dt * 12); f.lean += ((st.slump ? 0.32 : 0) - f.lean) * Math.min(1, dt * 6);
      const sk = (p.hojd || 1.7) / 1.75;
      f.grp.scale.setScalar(sk); f.grp.position.set(p.x, 0, p.avstand);
      f.inner.position.y = f.jump / sk + (p.fart > 0.1 ? Math.abs(Math.sin(f.walk)) * 0.05 : 0); f.inner.rotation.x = f.lean;
      f.grp.rotation.y = p.fart > 0.25 ? -Math.sign(p.vx) * 0.6 : 0;
    }
    for (const [id, f] of figurer) if (!sedda.has(id)) { scene.remove(f.grp); scene.remove(f.ring); figurer.delete(id); }
  }

  // ---------- kamera ----------
  const DEF_T = () => new THREE.Vector3(W.X0 + 0.5, 1.9, 2.6);
  const DEF_DIR = () => new THREE.Vector3(-0.36, 0.3, 1).normalize();
  function defaultPos() { const a = camera.aspect || 1.5; let d = 7 / (Math.tan(THREE.MathUtils.degToRad(camera.fov / 2)) * a); d = clamp(d, 14, 32); const p = DEF_T().addScaledVector(DEF_DIR(), d); p.y = Math.max(p.y, 1.4); return p; }
  function flyTo(pos, tgt, dur) { if (RM || !dur) { camera.position.copy(pos); controls.target.copy(tgt); controls.update(); return; } tween = { p0: camera.position.clone(), t0: controls.target.clone(), p1: pos, t1: tgt, t: 0, dur }; }
  function aterstall(anim) { if (startad) flyTo(defaultPos(), DEF_T(), anim ? 1.1 : 0); }
  function plats(i) { if (startad) flyTo(new THREE.Vector3(W.colX(i), 2.45, W.PLATS_AVSTAND + 6.4), new THREE.Vector3(W.colX(i), 2.35, 0), 1.2); }
  function storlek() { const w = el.clientWidth, h = el.clientHeight; if (!w || !h) return; renderer.setSize(w, h, false); camera.aspect = w / h; camera.updateProjectionMatrix(); }

  let T = 0;
  function rendera(dt) {
    if (!startad || !synlig) return;
    T += dt;
    screenTex.needsUpdate = true; uppdateraSpill(); personer(dt, T);
    if (tween) { tween.t += dt; const k = Math.min(1, tween.t / tween.dur), e = k < .5 ? 4 * k * k * k : 1 - Math.pow(-2 * k + 2, 3) / 2; camera.position.lerpVectors(tween.p0, tween.p1, e); controls.target.lerpVectors(tween.t0, tween.t1, e); camera.lookAt(controls.target); if (k >= 1) { tween = null; controls.update(); } }
    else { const t = controls.target; t.x = clamp(t.x, -12 + DX, 16 + DX); t.y = clamp(t.y, 0.5, 9); t.z = clamp(t.z, -0.5, 9); controls.update(); }
    renderer.render(scene, camera);
  }

  W.view.reset = aterstall; W.view.seat = plats;
  return {
    visa(behallare) { synlig = true; if (!startad) { el = behallare; startad = true; bygg(); } else storlek(); },
    dolj() { synlig = false; },
    rendera, aterstall, plats,
    get synlig() { return synlig; }
  };
})();
