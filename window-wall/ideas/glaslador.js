// S7 · Glaslådorna — varje ruta är en glaskub, och i kuberna sitter jättespindlar fångade.
// Perspektivet i kuberna följer den som går förbi (parallax), så glaset ser djupt ut.
// Kommer du nära rusar spindeln fram till glaset och knackar. Står du still stirrar den. Vinkar du vinkar den.
// STEAM: S, biologi. En spindel har åtta ben och är ingen insekt (insekter har sex).
(function () {
  const FARGER = ['glod', 'rosa', 'norrsken', 'is', 'orange'];
  const TOMMA = [3, 8, 10];           // rutor utan spindel, bara nät
  const JATTAR = [5, 12];             // rutor med extra stora spindlar

  // en punkt i kuben: u, v över ytan (0–1), z = djup (0 = bakväggen, 1 = framglaset)
  function punkt(b, u, v, z) {
    const bx = b.bak.x + u * b.bak.w, by = b.bak.y + v * b.bak.h;
    const fx = b.fram.x + u * b.fram.w, fy = b.fram.y + v * b.fram.h;
    return [bx + (fx - bx) * z, by + (fy - by) * z];
  }

  function kub(g, ctx, b) {
    const F = b.fram, B = b.bak;
    g.fillStyle = ctx.rgba('is', 0.05);  // golvet
    g.beginPath(); g.moveTo(F.x, F.y + F.h); g.lineTo(F.x + F.w, F.y + F.h); g.lineTo(B.x + B.w, B.y + B.h); g.lineTo(B.x, B.y + B.h); g.closePath(); g.fill();
    g.strokeStyle = ctx.rgba('is', 0.5); g.lineWidth = ctx.linje(0.6); g.lineJoin = 'round';
    g.strokeRect(B.x, B.y, B.w, B.h);
    g.beginPath();
    for (const [u, v] of [[0, 0], [1, 0], [0, 1], [1, 1]]) { g.moveTo(F.x + u * F.w, F.y + v * F.h); g.lineTo(B.x + u * B.w, B.y + v * B.h); }
    g.stroke();
  }

  function glas(g, ctx, b) { // framglaset: en svag kant och två reflexer
    const F = b.fram;
    g.strokeStyle = ctx.rgba('krita', 0.28); g.lineWidth = ctx.linje(0.6); g.strokeRect(F.x, F.y, F.w, F.h);
    g.strokeStyle = ctx.rgba('krita', 0.22); g.lineWidth = ctx.linje(0.9); g.lineCap = 'round';
    g.beginPath(); g.moveTo(F.x + F.w * 0.12, F.y + F.h * 0.22); g.lineTo(F.x + F.w * 0.3, F.y + F.h * 0.08);
    g.moveTo(F.x + F.w * 0.12, F.y + F.h * 0.32); g.lineTo(F.x + F.w * 0.42, F.y + F.h * 0.1); g.stroke();
  }

  function nat(g, ctx, b, seed) { // ett spindelnät i bakre övre hörnet
    const hornU = seed % 2 ? 1 : 0, [cx, cy] = punkt(b, hornU, 0, 0.02), R = Math.min(b.bak.w, b.bak.h) * 0.9;
    g.strokeStyle = ctx.rgba('krita', 0.3); g.lineWidth = ctx.linje(0.35);
    const a0 = hornU ? Math.PI / 2 : 0, n = 7;
    for (let i = 0; i <= n; i++) { const a = a0 + i / n * Math.PI / 2; g.beginPath(); g.moveTo(cx, cy); g.lineTo(cx + Math.cos(a) * R, cy + Math.sin(a) * R); g.stroke(); }
    for (let k = 1; k <= 6; k++) {
      g.beginPath();
      for (let i = 0; i <= n; i++) { const a = a0 + i / n * Math.PI / 2, rr = R * k / 6.5 * (i % 2 ? 0.94 : 1); const px = cx + Math.cos(a) * rr, py = cy + Math.sin(a) * rr; i ? g.lineTo(px, py) : g.moveTo(px, py); }
      g.stroke();
    }
  }

  function spindel(g, ctx, s, x, y, k, t, blick) {
    const f = ctx.farg[s.farg];
    g.save(); g.translate(x, y); g.rotate(s.vinkel + Math.PI / 2); g.scale(k, k);
    // ben: fyra par, två segment, går när spindeln rör sig
    g.strokeStyle = f; g.lineWidth = ctx.linje(0.9) / k; g.lineCap = 'round'; g.lineJoin = 'round';
    const VINK = [0.55, 1.05, 1.75, 2.35];
    for (let side of [-1, 1]) for (let i = 0; i < 4; i++) {
      let a = -Math.PI / 2 + side * VINK[i];
      const fas = s.steg * 9 + i * Math.PI + (side > 0 ? Math.PI / 2 : 0);
      a += Math.sin(fas) * 0.22 * s.gang;
      let L = 0.24 + (i === 0 || i === 3 ? 0.04 : 0);
      if (i === 0 && s.knack > 0) { a = -Math.PI / 2 + side * (0.25 + 0.2 * Math.abs(Math.sin(t * 14))); L *= 1.15; }   // knackar på glaset
      if (i === 0 && s.vinkar && side > 0) { a = -Math.PI / 2 + 0.2 + Math.sin(t * 12) * 0.5; L *= 1.2; }               // vinkar
      const hx = Math.cos(a) * 0.06, hy = Math.sin(a) * 0.05 + 0.02;
      const kx = hx + Math.cos(a - side * 0.35) * L * 0.55, ky = hy + Math.sin(a - side * 0.35) * L * 0.55 - 0.04;
      const fx = hx + Math.cos(a + side * 0.25) * L, fy = hy + Math.sin(a + side * 0.25) * L;
      g.beginPath(); g.moveTo(hx, hy); g.lineTo(kx, ky); g.lineTo(fx, fy); g.stroke();
    }
    // bakkropp med mönster, framkropp
    g.beginPath(); g.ellipse(0, 0.15, 0.11, 0.14, 0, 0, 7); g.fillStyle = '#000'; g.fill(); ctx.form(f, { fyllAlpha: 0.22, bredd: ctx.linje(1) / k });
    g.strokeStyle = Rita.rgba(f, 0.8); g.lineWidth = ctx.linje(0.6) / k;
    g.beginPath(); g.moveTo(0, 0.07); g.lineTo(0, 0.23); g.moveTo(-0.05, 0.13); g.lineTo(0.05, 0.13); g.stroke();
    g.beginPath(); g.ellipse(0, -0.02, 0.075, 0.07, 0, 0, 7); g.fillStyle = '#000'; g.fill(); ctx.form(f, { fyllAlpha: 0.3, bredd: ctx.linje(1) / k });
    // åtta ögon: två stora som tittar, två mellan, fyra små
    const ink = ctx.farg.krita;
    for (const sx of [-1, 1]) {
      g.fillStyle = ink; g.beginPath(); g.arc(sx * 0.026, -0.055, 0.02, 0, 7); g.fill();
      g.fillStyle = '#000'; g.beginPath(); g.arc(sx * 0.026 + blick[0] * 0.008, -0.055 + blick[1] * 0.008, 0.01, 0, 7); g.fill();
      g.fillStyle = ink; g.beginPath(); g.arc(sx * 0.055, -0.04, 0.011, 0, 7); g.fill();
      g.beginPath(); g.arc(sx * 0.016, -0.083, 0.007, 0, 7); g.fill(); g.beginPath(); g.arc(sx * 0.05, -0.068, 0.006, 0, 7); g.fill();
    }
    g.restore();
  }

  Nattfonster.registrera({
    id: 'glaslador',
    cat: 'visual', by: 'Linus',
    en: { titel: 'The glass boxes', fraga: 'Is a spider an insect?', verb: 'come close, stand still, wave, count legs' },
    pitch: {
      tagline: { sv: 'Varje ruta är en glaslåda med en jättespindel i. Kom nära så knackar den på glaset.', en: 'Every pane is a glass box with a giant spider inside. Come close and it taps on the glass.' },
      players: ['crowd', { sv: 'Alla', en: 'Anyone' }], mode: 'ambient', round: { sv: 'Hela kvällen', en: 'All evening' },
      input: [['cam', { sv: 'Djupkamera: position, längd, vinka', en: 'Depth cam: position, height, waving' }]],
      for: ['kid', 'family', 'school'],
      how: [
        { sv: 'Gå förbi: lådorna följer dig i perspektiv, så glaset ser djupt ut.', en: 'Walk by: the boxes shift in perspective with you, so the glass looks deep.' },
        { sv: 'Kom nära: spindeln rusar fram och knackar på glaset.', en: 'Come close: the spider rushes up and taps on the glass.' },
        { sv: 'Stå still så stirrar den. Vinka så vinkar den. Räkna benen!', en: 'Stand still and it stares. Wave and it waves. Count the legs!' }
      ],
      trick: { sv: 'Varje ruta blir en glaskub med karmen som kant. Parallaxen får fasaden att se ut som en vägg av terrarier.', en: 'Every pane becomes a glass cube with the frame as its edge. Parallax makes the façade look like a wall of terrariums.' },
      needs: [['projector', { sv: 'Projektor', en: 'Projector' }], ['cam', { sv: 'Djupkamera', en: 'Depth cam' }]],
      open: [{ sv: 'För mycket för den som är rädd för spindlar?', en: 'Too much for people afraid of spiders?' }, { sv: 'Håller parallaxen när många går förbi samtidigt?', en: 'Does the parallax hold up with many people passing?' }],
      meters: { read: 4, crowd: 4, effort: 2 }
    },
    titel: 'Glaslådorna', steam: 'S', spar: 'C', stil: 'doodle',
    fraga: 'Är en spindel en insekt?', verb: 'gå nära, stå still, vinka, räkna ben',
    lage: 'interaktiv', indata: ['personer'], langd: 60, stamning: 'kittlande läskigt, terrarium, nyfikenhet',
    knappar: [{ namn: 'Alla till glaset', gor: s => s.spindlar.forEach(p => { p.mal = [0.5, 0.5, 0.97]; p.vila = 0; }) }],

    setup(ctx) {
      const rnd = ctx.slump(8), spindlar = [];
      for (const ru of ctx.rutor) {
        if (TOMMA.includes(ru.nr)) continue;
        spindlar.push({ nr: ru.nr, u: 0.3 + rnd() * 0.4, v: 0.3 + rnd() * 0.4, z: 0.05, mal: null, vila: rnd() * 2, vinkel: -Math.PI / 2,
          farg: FARGER[spindlar.length % FARGER.length], stor: JATTAR.includes(ru.nr) ? 1.55 : 0.95 + rnd() * 0.3, steg: 0, gang: 0, knack: 0, nastaKnack: 0, vinkar: false });
      }
      return { spindlar, rnd, oga: [ctx.W / 2, ctx.yForHojd(1.2)], knackar: [] };
    },

    frame(ctx, st, input) {
      const { g, t, dt, W } = ctx, R = st.rnd;
      // betraktarens öga styr perspektivet i kuberna
      const p0 = Rita.narmast(input.personer, W / 2, 6);
      const malOga = p0 ? [p0.x, ctx.yForHojd(p0.hojd * 0.93)] : [W / 2 + Math.sin(t * 0.13) * 2.2, ctx.yForHojd(1.3)];
      st.oga[0] += (malOga[0] - st.oga[0]) * Math.min(1, dt * 2.5); st.oga[1] += (malOga[1] - st.oga[1]) * Math.min(1, dt * 2.5);
      const box = {};
      for (const ru of ctx.rutor) {
        const fram = { x: ru.x + 0.02, y: ru.y + 0.02, w: ru.w - 0.04, h: ru.h - 0.04 };
        const sk = 0.6, vx = ru.cx + Rita.clamp((ru.cx - st.oga[0]) * 0.16, -0.18, 0.18), vy = ru.cy + Rita.clamp((ru.cy - st.oga[1]) * 0.1, -0.12, 0.12);
        const bak = { x: vx - fram.w * sk / 2, y: vy - fram.h * sk / 2, w: fram.w * sk, h: fram.h * sk };
        box[ru.nr] = { fram, bak, ru };
        kub(g, ctx, box[ru.nr]);
        if (TOMMA.includes(ru.nr) || ru.nr % 4 === 1) nat(g, ctx, box[ru.nr], ru.nr);
      }

      for (const s of st.spindlar) {
        const b = box[s.nr], ru = b.ru;
        const p = input.personer.find(q => q.avstand < 3 && Math.abs(q.x - ru.cx) < ru.w * 0.9);
        s.vinkar = !!(p && p.vinkar);
        if (p) { // rusa fram till glaset där personen är
          const u = Rita.clamp((p.x - b.fram.x) / b.fram.w, 0.2, 0.8), v = Rita.clamp((ctx.yForHojd(p.hojd * 0.8) - b.fram.y) / b.fram.h, 0.25, 0.8);
          s.mal = [u, v, 0.97]; s.vila = 0;
        } else if (!s.mal || s.vila > 0) {
          s.vila -= dt;
          if (s.vila <= 0 && (!s.mal || s.mal[2] > 0.5 || R() < 0.02)) s.mal = [0.15 + R() * 0.7, 0.15 + R() * 0.7, R() < 0.8 ? 0.04 : 0.5 + R() * 0.3];
        }
        let fart = 0;
        if (s.mal) {
          const du = s.mal[0] - s.u, dv = s.mal[1] - s.v, dz = s.mal[2] - s.z, d = Math.hypot(du, dv, dz);
          const v = (p ? 0.9 : 0.25) * dt;
          if (d > 0.01) {
            const k = Math.min(1, v / d); s.u += du * k; s.v += dv * k; s.z += dz * k; fart = Math.min(1, d * 6);
            const dx = du * b.fram.w, dy = dv * b.fram.h; if (Math.hypot(dx, dy) > 0.004) { const mal = Math.atan2(dy, dx); let dA = mal - s.vinkel; dA = Math.atan2(Math.sin(dA), Math.cos(dA)); s.vinkel += dA * Math.min(1, dt * 6); }
          } else if (!p) { s.mal = null; s.vila = 0.5 + R() * 3; }
        }
        s.gang += ((fart > 0.05 ? 1 : 0) - s.gang) * Math.min(1, dt * 8);
        s.steg += dt * s.gang;
        // vid glaset: vänd ansiktet mot personen och knacka
        s.knack = 0;
        if (p && s.z > 0.9) {
          let dA = -Math.PI / 2 - s.vinkel; dA = Math.atan2(Math.sin(dA), Math.cos(dA)); s.vinkel += dA * Math.min(1, dt * 5);
          if (p.still < 2) { s.knack = 1; if (t > s.nastaKnack) { s.nastaKnack = t + 0.35; const [kx, ky] = punkt(b, s.u, s.v, 1); st.knackar.push({ x: kx + (R() - 0.5) * 0.1, y: ky - 0.12 * s.stor, t }); } }
        }
        const [x, y] = punkt(b, s.u, s.v, s.z), k = s.stor * (0.5 + 0.55 * s.z);
        const blick = p ? Rita.blick(x, y, p.x, ctx.yForHojd(p.hojd * 0.93), 1, 1) : [Math.sin(t + s.nr), Math.cos(t * 0.7 + s.nr) * 0.5];
        g.save(); g.beginPath(); g.rect(b.fram.x, b.fram.y, b.fram.w, b.fram.h); g.clip();
        spindel(g, ctx, s, x, y, k, t, blick);
        g.restore();
      }
      // knack: små bågar på glaset
      st.knackar = st.knackar.filter(kn => t - kn.t < 0.45);
      g.strokeStyle = ctx.farg.krita; g.lineCap = 'round';
      for (const kn of st.knackar) {
        const a = 1 - (t - kn.t) / 0.45, r = 0.03 + (t - kn.t) * 0.15;
        g.globalAlpha = a; g.lineWidth = ctx.linje(0.6);
        g.beginPath(); g.arc(kn.x, kn.y, r, -2.6, -0.5); g.stroke();
      }
      g.globalAlpha = 1;
      for (const nr of Object.keys(box)) glas(g, ctx, box[nr]);
      // frågan och ledtråden i en tom låda
      const r8 = ctx.rutaNr(8), a = Math.min(1, t * 0.5);
      ctx.text('Är en spindel', r8.x + 0.08, r8.y + 0.22, { storlek: 0.075, alpha: a, maxBredd: r8.w - 0.14, farg: ctx.farg.orange });
      ctx.text('en insekt?', r8.x + 0.08, r8.y + 0.31, { storlek: 0.075, alpha: a, maxBredd: r8.w - 0.14, farg: ctx.farg.orange });
      const r3 = ctx.rutaNr(3), b2 = 0.5 + 0.5 * Math.sin(t * 0.5);
      ctx.text('RÄKNA BENEN', r3.x + 0.08, r3.y + r3.h - 0.3, { typ: 'mono', storlek: 0.04, alpha: 0.8 * b2 });
      ctx.text('SPINDEL 8 · INSEKT 6', r3.x + 0.08, r3.y + r3.h - 0.23, { typ: 'mono', storlek: 0.04, alpha: 0.8 * b2, maxBredd: r3.w - 0.14 });
    }
  });
})();
