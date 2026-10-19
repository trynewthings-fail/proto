// Fasadvyn: en grafisk men fotolik bild av Exploratoriets entréfasad (efter fotot media/fasad_markerad.jpg).
// Allt i meter i fönsterrymden: x = 0 vid vänstra fönstrets vänsterkant, y = 0 vid fönstrens överkant.
// Mått utanför de tolv rutorna är uppskattade från fotot (ca 40 px/m) och ska bara läsas som stämning.
window.Fasadvy = (function () {
  const F = window.FASAD;
  const hex = h => { const n = parseInt(h.slice(1), 16); return [(n >> 16) & 255, (n >> 8) & 255, n & 255]; };
  const mix = (a, b, k) => { const A = hex(a), B = hex(b); return `rgb(${A.map((v, i) => Math.round(v + (B[i] - v) * k)).join(',')})`; };

  const KAMEROR = {
    nara: (W, MARK) => ({ x0: -0.35, x1: W + 0.35, y0: -0.3, y1: F.hojd + 0.45 }), // tätt runt de tolv rutorna
    fasad: (W, MARK) => ({ x0: -6.9, x1: W + 9.2, y0: -6.3, y1: MARK + 1.6 })
  };

  // text i meter (ritas i pixelrymd så att små teckenstorlekar blir skarpa)
  function tm(g, str, x, y, size, o = {}) {
    const t = g.getTransform();
    g.save(); g.setTransform(1, 0, 0, 1, 0, 0);
    g.translate(t.a * x + t.e, t.d * y + t.f); if (o.rot) g.rotate(o.rot);
    g.font = `${o.vikt || 700} ${size * t.a}px "Space Grotesk", Arial, sans-serif`;
    g.fillStyle = o.farg; g.textAlign = o.align || 'left'; g.textBaseline = o.baseline || 'alphabetic';
    if (o.sparning) g.letterSpacing = (o.sparning * t.a) + 'px';
    g.fillText(str, 0, 0); g.restore();
  }

  // ett vanligt fönster med vit karm och spröjs (inte projicerat)
  function fonster(g, x, y, w, h, kol, rad, m, glasDag) {
    const karm = 0.07, sp = 0.05;
    g.fillStyle = mix('#f5f2ec', '#55524e', m); g.fillRect(x, y, w, h);
    const gr = g.createLinearGradient(x, y, x + w * 0.6, y + h);
    gr.addColorStop(0, mix(glasDag || '#4d6680', '#0d1118', m)); gr.addColorStop(1, mix('#1f2a36', '#07090d', m));
    g.fillStyle = gr; g.fillRect(x + karm, y + karm, w - 2 * karm, h - 2 * karm);
    g.fillStyle = mix('#f5f2ec', '#55524e', m);
    const iw = w - 2 * karm, ih = h - 2 * karm;
    for (let c = 1; c < kol; c++) g.fillRect(x + karm + c * iw / kol - sp / 2, y + karm, sp, ih);
    for (let r = 1; r < rad; r++) g.fillRect(x + karm, y + karm + r * ih / rad - sp / 2, iw, sp);
    g.fillStyle = mix('#ffffff', '#6a665f', m); g.fillRect(x - 0.04, y + h, w + 0.08, 0.05); // fönsterbleck
  }

  function solrosen(g, m) { // den svarta solfångaren till vänster om fönstren
    const px = -2.8, py = 1.75, R = 2.75;
    g.fillStyle = mix('#232428', '#0b0b0d', m * 0.6);
    g.fillRect(px - 0.09, py, 0.18, F.hojd + F.fonsterUnderkant - py);
    for (let i = 0; i < 12; i++) {
      const a = (188 + i * (167 / 11)) * Math.PI / 180;
      g.save(); g.translate(px, py); g.rotate(a);
      g.beginPath(); g.ellipse(R * 0.55, 0, R * 0.5, 0.36, 0, 0, 7);
      g.fillStyle = mix('#18191c', '#060607', m * 0.6); g.fill();
      g.strokeStyle = mix('#3a3c42', '#151619', m); g.lineWidth = 0.025; g.stroke();
      g.restore();
    }
  }

  function rita(g, o) {
    const { W, H, MARK, m, cam } = o;
    const x0 = cam.x0 - 1, x1 = cam.x1 + 1;
    // ---- himmel och vägg ----
    if (cam.y0 < -9.6) { g.fillStyle = mix('#a9cbe9', '#0b1020', m); g.fillRect(x0, cam.y0, x1 - x0, -9.6 - cam.y0); }
    g.fillStyle = mix(F.farg.mur, F.farg.murNatt, m); g.fillRect(x0, Math.max(cam.y0, -9.6), x1 - x0, MARK - Math.max(cam.y0, -9.6));
    // ljus från fönstren på väggen (på natten, när projektionen är på)
    if (o.pa && m > 0.2 && o.glod) for (const s of F.sektioner) {
      const cx = s.x + s.bredd / 2, cy = H / 2, gr = g.createRadialGradient(cx, cy, 0.5, cx, cy, 3.2);
      gr.addColorStop(0, `rgba(${o.glod},${0.22 * m})`); gr.addColorStop(1, `rgba(${o.glod},0)`);
      g.fillStyle = gr; g.fillRect(cx - 3.2, cy - 3.2, 6.4, 6.4);
    }
    g.fillStyle = mix('#d4b8a7', '#2b2421', m); g.fillRect(x0, MARK - 0.32, x1 - x0, 0.32); // sockel
    // stuprör
    g.fillStyle = mix('#c9c6c1', '#3d3b39', m);
    for (const x of [-3.7, 13.6]) g.fillRect(x, -9.6, 0.09, MARK + 9.6 - 0.32);
    // ---- övervåningen ----
    for (const [a, b] of [[-8.0, -6.1], [-5.7, -3.6], [-3.1, -0.9], [-0.25, 2.05], [2.8, 5.35]]) fonster(g, a, -7.6, b - a, 3.1, 3, 2, m);
    for (const [a, b] of [[10.0, 13.0], [14.5, 17.5]]) fonster(g, a, -9.0, b - a, 3.4, 3, 2, m);
    // ---- små fönster och dörr till vänster ----
    fonster(g, -6.25, 0.25, 1.35, 1.25, 3, 1, m, '#5a6f82');
    g.fillStyle = mix('#2a2d30', '#0c0d0f', m); g.fillRect(-6.15, 1.75, 1.0, MARK - 0.32 - 1.75);
    // ---- höger om entrén ----
    fonster(g, 10.2, -0.15, 3.2, 1.2, 3, 1, m); fonster(g, 14.4, -0.15, 3.2, 1.2, 3, 1, m);
    fonster(g, 10.4, 2.35, 3.0, 1.0, 3, 1, m, '#6b8193');
    // ---- banderollen ----
    g.fillStyle = mix('#f7f7f5', '#5d5d60', m); g.fillRect(5.9, -12, 3.2, 13.0);
    g.strokeStyle = mix('#d9d9d6', '#3e3e40', m); g.lineWidth = 0.03; g.strokeRect(5.9, -12, 3.2, 13.0);
    tm(g, 'Exploratoriet', 7.7, 0.6, 0.78, { rot: -Math.PI / 2, farg: mix('#e8641b', '#7a3a18', m * 0.8), vikt: 700 });
    tm(g, 'SKELLEFTEÅ SCIENCE CENTER', 8.2, 0.55, 0.14, { rot: -Math.PI / 2, farg: mix('#2b2b2b', '#1a1a1a', m), vikt: 500, sparning: 0.04 });
    // ---- entrén: grönt skärmtak och mörk glasport ----
    g.fillStyle = mix('#1e2427', '#0b0e10', m); g.fillRect(5.65, 1.3, 3.8, MARK - 1.3);
    g.fillStyle = mix('#2c383d', '#121619', m); g.fillRect(5.95, 1.55, 2.95, MARK - 1.55);
    g.strokeStyle = mix('#48555a', '#1f2528', m); g.lineWidth = 0.04;
    for (const x of [6.7, 7.45, 8.2]) { g.beginPath(); g.moveTo(x, 1.55); g.lineTo(x, MARK); g.stroke(); }
    g.fillStyle = mix('#3a4044', '#121416', m); g.fillRect(9.0, 1.3, 0.4, MARK - 1.3);
    g.fillStyle = mix('#ffffff', '#6b6b6b', m); g.beginPath(); g.arc(9.2, 2.2, 0.11, 0, 7); g.fill();
    g.fillStyle = mix('#6f9d89', '#26372f', m); g.fillRect(5.55, 1.05, 4.0, 0.25);
    g.fillStyle = mix('#8fbca8', '#33483e', m); g.fillRect(5.55, 1.05, 4.0, 0.05);
    // ---- solrosen (framför väggen) ----
    solrosen(g, m);
    // ---- de tolv rutorna ----
    const P = o.px;
    for (const s of F.sektioner) {
      // karmen fyller hela fönstret; rutorna ritas ovanpå, så spröjs och tvärpost blir det som syns mellan dem
      g.fillStyle = mix(F.farg.karm, '#4d4a46', m); g.fillRect(s.x, 0, s.bredd, H);
    }
    for (const r of window.Nattfonster.rutor) {
      if (o.pa) g.drawImage(o.kalla, r.x * P, r.y * P, r.w * P, r.h * P, r.x, r.y, r.w, r.h);
      else { const gr = g.createLinearGradient(r.x, r.y, r.x + r.w * 0.6, r.y + r.h); gr.addColorStop(0, mix('#58718a', '#0d1118', m)); gr.addColorStop(1, mix('#26313d', '#06080b', m)); g.fillStyle = gr; g.fillRect(r.x, r.y, r.w, r.h); }
      if (m < 1 && o.pa) { g.fillStyle = `rgba(178,192,202,${(1 - m) * 0.82})`; g.fillRect(r.x, r.y, r.w, r.h); }
    }
    for (const s of F.sektioner) { g.fillStyle = mix('#ffffff', '#5f5b56', m); g.fillRect(s.x - 0.05, H, s.bredd + 0.1, 0.06); }
    // ---- mark: ramp, grus och sittblock ----
    g.fillStyle = mix('#c7c4be', '#25262a', m); g.fillRect(x0, MARK, x1 - x0, 0.3);
    g.fillStyle = mix('#b3aa9d', '#1b1a19', m); g.fillRect(x0, MARK + 0.3, x1 - x0, cam.y1 - MARK);
    if (o.glod && o.pa && m > 0.2) for (const s of F.sektioner) { // ljuset från rutorna faller på marken
      g.save(); g.translate(s.x + s.bredd / 2, MARK + 0.25); g.scale(1, 0.28);
      const gr = g.createRadialGradient(0, 0, 0, 0, 0, 2.6); gr.addColorStop(0, `rgba(${o.glod},${0.45 * m})`); gr.addColorStop(1, `rgba(${o.glod},0)`);
      g.fillStyle = gr; g.fillRect(-2.6, -2.6, 5.2, 5.2); g.restore();
    }
    g.fillStyle = mix('#d8d6d1', '#34363a', m); g.strokeStyle = mix('#a5a29c', '#1e1f22', m); g.lineWidth = 0.03;
    for (const [a, b, y] of [[-6.4, -4.4, 0.55], [-3.9, -1.6, 0.85], [-0.6, 1.9, 1.15], [3.6, 6.2, 0.75], [7.4, 9.6, 1.1], [10.8, 13.4, 0.6]]) {
      g.beginPath(); g.moveTo(a, MARK + y); g.lineTo(b, MARK + y); g.lineTo(b - 0.15, MARK + y + 0.28); g.lineTo(a + 0.15, MARK + y + 0.28); g.closePath(); g.fill(); g.stroke();
    }
    if (!o.detaljer) return;
    // ---- orange bänk och räcke framför fönstren ----
    g.fillStyle = mix('#d9642d', '#4a2414', m);
    for (const y of [H + 0.22, H + 0.36, H + 0.5]) g.fillRect(3.5, y, 1.5, 0.08);
    g.fillRect(3.6, H + 0.5, 0.06, 0.35); g.fillRect(4.85, H + 0.5, 0.06, 0.35);
    g.strokeStyle = mix('#8a8e93', '#3b3e42', m); g.lineWidth = 0.025;
    const rt = H + 0.08;
    for (let x = -5.6; x <= 5.45; x += 0.12) { g.beginPath(); g.moveTo(x, rt); g.lineTo(x, MARK + 0.1); g.stroke(); }
    g.lineWidth = 0.05; g.beginPath(); g.moveTo(-5.6, rt); g.lineTo(5.45, rt); g.moveTo(-5.6, rt + 0.42); g.lineTo(5.45, rt + 0.42); g.stroke();
  }

  return { rita, KAMEROR, mix };
})();
