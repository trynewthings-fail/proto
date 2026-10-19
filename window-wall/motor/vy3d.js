// 3D-vyn: hur projektorerna står bakom fönstren. Rummet innanför, fasaden, bakprojektionsfilmen med
// det levande innehållet, projektorerna och deras ljuskäglor. Kameror: inifrån, profil, utifrån, ovanifrån.
// Koordinater (meter): x längs fasaden (0 = vänstra fönstrets vänsterkant), y uppåt från marken,
// z utåt mot gatan (glaset vid z = 0, rummet vid z < 0).
// Siffrorna i panelen är uppskattningar för att jämföra alternativ, inte en ljusberäkning.
window.Vy3d = (function () {
  const F = window.FASAD, N = window.Nattfonster, I = window.Indata;
  const W = N.W, UK = F.fonsterUnderkant, H = F.hojd, TAK = 4.4;
  const GLAS = -0.06; // filmens läge
  let THREE, scen, kamera, rend, kontroll, tex, el, panel, startad = false, synlig = false;
  const objekt = { projektorer: [], personer: new Map() };
  // djup: från glaset till bakväggen. kropp: projektorns djup bakom linsen + 5 cm för kablar. aspekt: projektorns bildformat.
  const val = { modell: 'epson-l210sf', lage: 'liggande', kast: 0.45, lumen: 4000, montage: 'golv', djup: 1.5, aspekt: 16 / 9, kropp: 0.387 };
  // modeller från strategi/projektorer.md (uppskattningar, se källor där)
  const MODELLER = {
    egen: { namn: 'Egna värden' },
    'epson-l210sf': { namn: 'Epson EB-L210SF ×4 (liggande)', lage: 'liggande', kast: 0.45, lumen: 4000, aspekt: 16 / 9, kropp: 0.337 + 0.05, info: 'Kast 0,45–0,61 zoom · 4 000 lm · 1080p · djup 337 mm · ca 1 630–2 190 € st' },
    'optoma-zh450st': { namn: 'Optoma ZH450ST ×4 (liggande)', lage: 'liggande', kast: 0.496, lumen: 4200, aspekt: 16 / 9, kropp: 0.216 + 0.05, info: 'Kast 0,496 fast · 4 200 lm · 1080p · djup 216 mm · ca 1 700–1 840 € st' },
    'panasonic-dle020': { namn: 'Panasonic PT-RZ790 + ET-DLE020 ×2 (stående)', lage: 'staende', kast: 0.28, lumen: 7000, aspekt: 16 / 10, kropp: 0.6, info: 'Kast 0,280–0,299 · 7 000 lm · WUXGA · djup med objektiv OKÄNT (antaget 0,6 m) · ca 25 000 € per fönster' }
  };

  const ladda = src => new Promise((ok, fel) => { const s = document.createElement('script'); s.src = src; s.onload = ok; s.onerror = fel; document.head.appendChild(s); });

  async function starta(behallare, panelEl) {
    el = behallare; panel = panelEl;
    if (!window.THREE) {
      await ladda('https://cdn.jsdelivr.net/npm/three@0.147.0/build/three.min.js');
      await ladda('https://cdn.jsdelivr.net/npm/three@0.147.0/examples/js/controls/OrbitControls.js');
    }
    THREE = window.THREE;
    rend = new THREE.WebGLRenderer({ antialias: true });
    rend.setPixelRatio(Math.min(2, window.devicePixelRatio || 1));
    rend.outputEncoding = THREE.sRGBEncoding;
    el.appendChild(rend.domElement);
    scen = new THREE.Scene(); scen.background = new THREE.Color('#05060a');
    kamera = new THREE.PerspectiveCamera(50, 16 / 9, 0.05, 200);
    kontroll = new THREE.OrbitControls(kamera, rend.domElement);
    kontroll.enableDamping = true;
    byggVarld(); byggPanel(); kameraTill('inifran');
    new ResizeObserver(storlek).observe(el); storlek();
    startad = true; loop();
  }

  function storlek() {
    const w = el.clientWidth, h = Math.round(w * 0.5625);
    el.style.height = h + 'px'; rend.setSize(w, h); kamera.aspect = w / h; kamera.updateProjectionMatrix();
  }

  const mat = (farg, o = {}) => new THREE.MeshStandardMaterial(Object.assign({ color: farg, roughness: 0.9, metalness: 0 }, o));
  function lada(w, h, d, m, x, y, z) { const b = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), m); b.position.set(x, y, z); scen.add(b); return b; }

  function byggVarld() {
    scen.add(new THREE.HemisphereLight('#9fb4d8', '#20180f', 0.35));
    const dl = new THREE.DirectionalLight('#ffffff', 0.25); dl.position.set(-5, 10, 8); scen.add(dl);
    // mark utanför och golv innanför
    const mark = new THREE.Mesh(new THREE.PlaneGeometry(40, 14), mat('#2a2b2e')); mark.rotation.x = -Math.PI / 2; mark.position.set(W / 2, 0, 7); scen.add(mark);
    // rummet: väggarna syns bara inifrån (BackSide), så man ser in utifrån och från sidan
    byggRum();
    // fasaden med två fönsterhål
    const s = new THREE.Shape(); s.moveTo(-2, 0); s.lineTo(W + 2, 0); s.lineTo(W + 2, TAK + 0.4); s.lineTo(-2, TAK + 0.4); s.closePath();
    for (const sek of F.sektioner) { const h = new THREE.Path(); h.moveTo(sek.x, UK); h.lineTo(sek.x + sek.bredd, UK); h.lineTo(sek.x + sek.bredd, UK + H); h.lineTo(sek.x, UK + H); h.closePath(); s.holes.push(h); }
    const vagg = new THREE.Mesh(new THREE.ExtrudeGeometry(s, { depth: 0.4, bevelEnabled: false }), mat('#d9bfae'));
    vagg.position.z = -0.4; scen.add(vagg);
    // filmen: det levande innehållet från labbet, en textur för båda fönstren
    tex = new THREE.CanvasTexture(N.canvas); tex.encoding = THREE.sRGBEncoding;
    for (const sek of F.sektioner) {
      const g = new THREE.PlaneGeometry(sek.bredd, H), uv = g.attributes.uv;
      const u0 = sek.x / W, u1 = (sek.x + sek.bredd) / W;
      for (let i = 0; i < uv.count; i++) uv.setX(i, uv.getX(i) < 0.5 ? u0 : u1);
      for (const sida of [THREE.FrontSide, THREE.BackSide]) {
        const p = new THREE.Mesh(g, new THREE.MeshBasicMaterial({ map: tex, side: sida, toneMapped: false }));
        p.position.set(sek.x + sek.bredd / 2, UK + H / 2, -0.06); scen.add(p);
      }
      // karm och spröjs
      const vit = mat('#f2efe9');
      const I_ = sek._inner, kx = sek.x, ram = F.ram;
      lada(sek.bredd, ram, 0.12, vit, kx + sek.bredd / 2, UK + H - ram / 2, -0.03); lada(sek.bredd, ram, 0.12, vit, kx + sek.bredd / 2, UK + ram / 2, -0.03);
      lada(ram, H, 0.12, vit, kx + ram / 2, UK + H / 2, -0.03); lada(ram, H, 0.12, vit, kx + sek.bredd - ram / 2, UK + H / 2, -0.03);
      // spröjs och tvärpost läses från motorns rutgeometri (kan ha olika bredd och olika radhöjder)
      for (let c = 1; c < sek.kolumner; c++) { const k = sek._kol[c - 1]; lada(F.sprojs, I_.h, 0.1, vit, k.x + k.w + F.sprojs / 2, UK + H / 2, -0.02); }
      const tp = F.tvarpost ?? F.sprojs;
      for (let r = 1; r < sek.rader; r++) { const ra = sek._rader[r - 1]; lada(I_.w, tp, 0.1, vit, I_.x + I_.w / 2, UK + H - (ra.y + ra.h + tp / 2), -0.02); }
    }
    // gatlykta-ish ljus från rutorna ut på marken
    for (const sek of F.sektioner) { const l = new THREE.PointLight('#ffd9b0', 0.6, 6); l.position.set(sek.x + sek.bredd / 2, UK + H / 2, 0.6); scen.add(l); }
    byggProjektorer();
  }

  // rummet bakom fönstren: djupet räknas från glaset till bakväggen
  function byggRum() {
    if (objekt.rum) objekt.rum.forEach(o => scen.remove(o));
    const d = Math.max(0.5, val.djup + GLAS + 0.4), z0 = -0.4 - d / 2; // från väggens insida till bakväggen
    const rv = mat('#3a3633', { side: THREE.BackSide }), osynlig = new THREE.MeshBasicMaterial({ visible: false });
    const rum = new THREE.Mesh(new THREE.BoxGeometry(W + 4, TAK, d), [rv, rv, rv, rv, osynlig, rv]); // fasadsidan är öppen
    rum.position.set(W / 2, TAK / 2, z0);
    const golv = new THREE.Mesh(new THREE.PlaneGeometry(W + 4, d), mat('#4a4541')); golv.rotation.x = -Math.PI / 2; golv.position.set(W / 2, 0.005, z0);
    // en linje på golvet som visar bakväggen
    const lg = new THREE.BufferGeometry().setFromPoints([new THREE.Vector3(-2, 0.01, GLAS - val.djup), new THREE.Vector3(W + 2, 0.01, GLAS - val.djup)]);
    const linje = new THREE.Line(lg, new THREE.LineBasicMaterial({ color: '#ffb21e' }));
    objekt.rum = [rum, golv, linje]; objekt.rum.forEach(o => scen.add(o));
  }

  // beräkna bild och kastavstånd för valt alternativ
  function plan() {
    const ytor = [];
    for (const sek of F.sektioner) {
      const I_ = sek._inner, cx = I_.x + I_.w / 2;
      // bilden skalas så att den täcker målytan helt; det som sticker utanför är överspill
      if (val.lage === 'staende') {         // en projektor per fönster, vriden 90° (t.ex. 16:10 blir 10:16)
        const asp = 1 / val.aspekt, bw = Math.max(I_.w, I_.h * asp), bh = bw / asp;
        ytor.push({ cx, cy: UK + H - (I_.y + I_.h / 2), bw, bh, nativBredd: bh, mal: [I_.w, I_.h] });
      } else {                               // två per fönster, en per rad, liggande
        for (const ra of sek._rader) {
          const rh = ra.h, asp = val.aspekt, bw = Math.max(I_.w, rh * asp), bh = bw / asp, cyR = ra.y + rh / 2;
          ytor.push({ cx, cy: UK + H - cyR, bw, bh, nativBredd: bw, mal: [I_.w, rh] });
        }
      }
    }
    for (const y of ytor) {
      y.avst = val.kast * y.nativBredd; y.yta = y.bw * y.bh; y.lux = val.lumen * 0.85 / y.yta; y.spill = Math.max(0, y.bh - y.mal[1]) + Math.max(0, y.bw - y.mal[0]);
      y.behov = y.avst + val.kropp;                                   // djup som behövs från glaset
      y.maxKast = Math.max(0, val.djup - val.kropp) / y.nativBredd;   // längsta kastförhållande som ryms
    }
    return ytor;
  }

  const FARGER = ['#2fd6e0', '#ff4fa3', '#ffb21e', '#cafe03'];
  function byggProjektorer() {
    for (const o of objekt.projektorer) scen.remove(o);
    objekt.projektorer = [];
    plan().forEach((y, i) => {
      const grupp = new THREE.Group(), z = -0.06 - y.avst, farg = FARGER[i % 4];
      const kropp = new THREE.Mesh(new THREE.BoxGeometry(0.42, 0.14, 0.36), mat('#d9d9dc', { roughness: 0.5 }));
      kropp.position.set(y.cx, y.cy, z - 0.18); grupp.add(kropp);
      const lins = new THREE.Mesh(new THREE.CylinderGeometry(0.035, 0.04, 0.05, 20), mat('#111')); lins.rotation.x = Math.PI / 2; lins.position.set(y.cx, y.cy, z + 0.01); grupp.add(lins);
      // montering: stativ från golvet eller stång från taket
      // två per fönster: den övre hänger i taket och den nedre står på golvet, så att inget stativ skär genom en ljuskägla
      const montage = val.lage === 'liggande' ? (i % 2 === 0 ? 'tak' : 'golv') : val.montage;
      const stang = montage === 'golv' ? [0, y.cy - 0.07] : [y.cy + 0.07, TAK];
      const st = new THREE.Mesh(new THREE.CylinderGeometry(0.02, 0.02, stang[1] - stang[0], 10), mat('#55585e'));
      st.position.set(y.cx, (stang[0] + stang[1]) / 2, z - 0.18); grupp.add(st);
      if (montage === 'golv') { const fot = new THREE.Mesh(new THREE.CylinderGeometry(0.25, 0.25, 0.02, 24), mat('#55585e')); fot.position.set(y.cx, 0.01, z - 0.18); grupp.add(fot); }
      // ljuskäglan: en pyramid från linsen till bildens hörn på glaset
      const L = new THREE.Vector3(y.cx, y.cy, z + 0.03);
      const hx = y.bw / 2, hy = y.bh / 2, hz = -0.07;
      const C = [[y.cx - hx, y.cy - hy], [y.cx + hx, y.cy - hy], [y.cx + hx, y.cy + hy], [y.cx - hx, y.cy + hy]].map(([a, b]) => new THREE.Vector3(a, b, hz));
      const pos = [];
      for (let k = 0; k < 4; k++) { const a = C[k], b = C[(k + 1) % 4]; pos.push(L.x, L.y, L.z, a.x, a.y, a.z, b.x, b.y, b.z); }
      const gk = new THREE.BufferGeometry(); gk.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
      grupp.add(new THREE.Mesh(gk, new THREE.MeshBasicMaterial({ color: farg, transparent: true, opacity: 0.08, side: THREE.DoubleSide, depthWrite: false, blending: THREE.AdditiveBlending })));
      const lin = []; for (const c of C) lin.push(L.x, L.y, L.z, c.x, c.y, c.z);
      for (let k = 0; k < 4; k++) { const a = C[k], b = C[(k + 1) % 4]; lin.push(a.x, a.y, a.z, b.x, b.y, b.z); }
      const gl = new THREE.BufferGeometry(); gl.setAttribute('position', new THREE.Float32BufferAttribute(lin, 3));
      grupp.add(new THREE.LineSegments(gl, new THREE.LineBasicMaterial({ color: farg, transparent: true, opacity: 0.8 })));
      scen.add(grupp); objekt.projektorer.push(grupp);
    });
    uppdateraSiffror();
  }

  function personer() {
    const sedda = new Set();
    for (const p of I.input.personer) {
      sedda.add(p.id);
      let m = objekt.personer.get(p.id);
      if (!m) {
        m = new THREE.Group();
        const kr = new THREE.Mesh(new THREE.CapsuleGeometry(0.17, 1, 4, 10), mat(p.kalla === 'mus' ? '#ff4fa3' : '#9aa3b5'));
        const hu = new THREE.Mesh(new THREE.SphereGeometry(0.12, 16, 12), mat(p.kalla === 'mus' ? '#ff4fa3' : '#9aa3b5'));
        m.add(kr, hu); m.userData = { kr, hu }; scen.add(m); objekt.personer.set(p.id, m);
      }
      const h = p.hojd || 1.6, s = h / 1.7;
      m.userData.kr.scale.set(s, s, s); m.userData.kr.position.y = (h - 0.25) / 2 + 0.05; m.userData.hu.position.y = h - 0.12;
      m.position.set(p.x, 0, 0.3 + p.avstand);
    }
    for (const [id, m] of objekt.personer) if (!sedda.has(id)) { scen.remove(m); objekt.personer.delete(id); }
  }

  const KAMEROR = {
    inifran: { pos: [W / 2, 1.75, -5.2], mal: [W / 2, 2.3, 0] }, // bakom bakväggen, som syns igenom
    profil: { pos: [-6.5, 2.4, -0.9], mal: [W / 2, 2.0, -0.8] },
    utifran: { pos: [W / 2, 1.6, 8], mal: [W / 2, 2.3, 0] },
    ovanifran: { pos: [W / 2, 11, -0.8], mal: [W / 2, 0, -0.8] }
  };
  function kameraTill(namn) {
    const k = KAMEROR[namn]; kamera.position.set(...k.pos); kontroll.target.set(...k.mal); kontroll.update();
    if (panel) panel.querySelectorAll('[data-kam]').forEach(b => b.classList.toggle('aktiv', b.dataset.kam === namn));
  }

  function byggPanel() {
    panel.innerHTML = `
      <label class="rad3">Modell <select data-modell>${Object.entries(MODELLER).map(([id, m]) => `<option value="${id}"${id === val.modell ? ' selected' : ''}>${m.namn}</option>`).join('')}</select><span></span></label>
      <p class="not modellinfo"></p>
      <div class="segment" data-grupp="kam"><button data-kam="inifran">Inifrån</button><button data-kam="profil">Profil</button><button data-kam="utifran">Utifrån</button><button data-kam="ovanifran">Ovanifrån</button></div>
      <div class="segment" data-grupp="lage"><button data-lage="staende">1 per fönster, stående</button><button data-lage="liggande">2 per fönster, liggande</button></div>
      <div class="segment" data-grupp="montage"><button data-montage="golv">Golvstativ</button><button data-montage="tak">Takfäste</button></div>
      <label class="rad3">Kastförhållande <input type="range" min="0.2" max="1.6" step="0.05" value="${val.kast}" data-v="kast"><output></output></label>
      <label class="rad3">Djup bakom glaset <input type="range" min="0.8" max="4" step="0.1" value="${val.djup}" data-v="djup"><output></output></label>
      <label class="rad3">Ljusstyrka <input type="range" min="2000" max="12000" step="500" value="${val.lumen}" data-v="lumen"><output></output></label>
      <div class="siffror"></div>
      <p class="not">Bilden skalas så att den täcker hela rutan; det som sticker utanför räknas som överspill. Med två per fönster hänger den övre i taket och den nedre står på golvet. Modellen räknar med linsen mitt för bilden. Riktiga projektorer har ofta förskjutning (offset), och ultrakorta projektorer står nära och lyser snett från sidan när de vänds på högkant. Uppskattning för att jämföra alternativ: ljus på filmen ≈ lumen × 0,85 / bildyta. Filmens förstärkning, gatubelysning och spill påverkar. Det avgörs på testkvällen. Dra för att rotera, scrolla för att zooma.</p>`;
    panel.querySelectorAll('[data-kam]').forEach(b => b.onclick = () => kameraTill(b.dataset.kam));
    const modellSel = panel.querySelector('[data-modell]');
    const visaInfo = () => { const m = MODELLER[val.modell]; panel.querySelector('.modellinfo').textContent = m.info ? m.info + ' · Källor och osäkerheter: se Projektorer & mått (specs.html)' : 'Egna värden: ' + (val.aspekt > 1.7 ? '16:9' : '16:10') + ', projektordjup ' + val.kropp.toFixed(2).replace('.', ',') + ' m.'; };
    modellSel.onchange = () => {
      val.modell = modellSel.value; const m = MODELLER[val.modell];
      if (m.lage) { Object.assign(val, { lage: m.lage, kast: m.kast, lumen: m.lumen, aspekt: m.aspekt, kropp: m.kropp });
        panel.querySelector('input[data-v="kast"]').value = m.kast; panel.querySelector('input[data-v="lumen"]').value = m.lumen; }
      mark(); visaInfo(); byggProjektorer();
    };
    visaInfo();
    const mark = () => {
      panel.querySelectorAll('[data-lage]').forEach(b => b.classList.toggle('aktiv', b.dataset.lage === val.lage));
      panel.querySelectorAll('[data-montage]').forEach(b => b.classList.toggle('aktiv', b.dataset.montage === val.montage));
    };
    panel.querySelectorAll('[data-lage]').forEach(b => b.onclick = () => { val.lage = b.dataset.lage; val.modell = 'egen'; modellSel.value = 'egen'; visaInfo(); mark(); byggProjektorer(); });
    panel.querySelectorAll('[data-montage]').forEach(b => b.onclick = () => { val.montage = b.dataset.montage; mark(); byggProjektorer(); });
    panel.querySelectorAll('input[data-v]').forEach(i => i.oninput = () => { val[i.dataset.v] = +i.value; if (i.dataset.v !== 'djup') { val.modell = 'egen'; modellSel.value = 'egen'; visaInfo(); } if (i.dataset.v === 'djup') { byggRum(); KAMEROR.profil.mal[2] = KAMEROR.ovanifran.mal[2] = GLAS - val.djup / 2; } byggProjektorer(); });
    mark(); uppdateraSiffror();
  }

  function uppdateraSiffror() {
    if (!panel || !panel.querySelector('.siffror')) return;
    const f1 = x => x.toFixed(2).replace('.', ',');
    panel.querySelectorAll('input[data-v]').forEach(i => { const v = +i.value; i.nextElementSibling.textContent = i.dataset.v === 'kast' ? f1(v) + ':1' : i.dataset.v === 'djup' ? f1(v) + ' m' : v.toLocaleString('sv-SE') + ' lm'; });
    const y = plan()[0], n = plan().length, ryms = y.behov <= val.djup + 0.001;
    const kast = val.kast < 0.4 ? 'ultrakort kast' : val.kast < 0.9 ? 'kort kast' : 'normalt kast';
    // jämför båda uppställningarna för det valda djupet
    const spara = val.lage, krav = {};
    for (const l of ['staende', 'liggande']) { val.lage = l; krav[l] = plan()[0].maxKast; }
    val.lage = spara;
    panel.querySelector('.siffror').innerHTML = `
      <div class="${ryms ? 'ok' : 'varn'}"><b>${ryms ? 'Ryms' : 'Ryms inte'}</b><span>behöver ${f1(y.behov)} m av ${f1(val.djup)} m (lins ${f1(y.avst)} m + projektor ${f1(val.kropp)} m)</span></div>
      <div><b>${n}</b><span>projektorer (${kast})</span></div>
      <div><b>${f1(y.bw)} × ${f1(y.bh)} m</b><span>bild per projektor</span></div>
      <div><b>${f1(y.spill)} m</b><span>överspill som maskas</span></div>
      <div><b>≈ ${Math.round(y.lux).toLocaleString('sv-SE')} lux</b><span>på filmen</span></div>
      <div class="jamfor"><b>För ${f1(val.djup)} m behövs kastförhållande högst</b><span>1 per fönster, stående: ${f1(krav.staende)}:1 · 2 per fönster, liggande: ${f1(krav.liggande)}:1</span></div>`;
  }

  function loop() {
    if (!startad) return;
    requestAnimationFrame(loop);
    if (!synlig) return;
    tex.needsUpdate = true; personer(); kontroll.update(); rend.render(scen, kamera);
  }

  return {
    async visa(behallare, panelEl) { synlig = true; if (!startad) await starta(behallare, panelEl); else storlek(); },
    dolj() { synlig = false; },
    kameraTill, val, plan,
    rendera() { if (startad) { tex.needsUpdate = true; personer(); kontroll.update(); rend.render(scen, kamera); } }
  };
})();
