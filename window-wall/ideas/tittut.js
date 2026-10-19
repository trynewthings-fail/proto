// A5 · Tittut — små varelser bor bakom väggarna. De kikar fram från karmar, mur och golv,
// gömmer sig om man springer fram, men kommer fram när man står still. Ibland tittar en jätte fram
// på båda sidor om muren samtidigt, och en mask kryper rakt genom väggen.
(function () {
  const FARGER = ['orange', 'is', 'rosa', 'norrsken', 'glod'];

  function gomstallen(ctx) {
    const lista = [];
    for (const s of ctx.sektioner) {
      const I = s._inner;
      for (const ru of ctx.rutor.filter(r => r.sektion === s.id)) {
        if (Math.abs(ru.x - I.x) < 0.01) lista.push({ x: I.x, y: ru.cy, dx: 1, dy: 0, ru });             // vänsterkant
        if (Math.abs(ru.x + ru.w - I.x - I.w) < 0.01) lista.push({ x: I.x + I.w, y: ru.cy, dx: -1, dy: 0, ru }); // högerkant
        if (ru.rad === Math.max(...ctx.rutor.map(r => r.rad))) lista.push({ x: ru.cx, y: ru.y + ru.h, dx: 0, dy: -1, ru });                         // underifrån
        if (ru.rad === 0) lista.push({ x: ru.cx, y: ru.y, dx: 0, dy: 1, ru });                                  // ovanifrån, upp och ner
      }
    }
    return lista;
  }

  function figur(g, ctx, c, blick, t) {
    const r = c.r;
    g.save(); g.translate(c.x, c.y); g.rotate(c.vinkel);
    // armar som vinkar
    if (c.vinkar) {
      const a = Math.sin(t * 12) * 0.5;
      g.strokeStyle = ctx.farg[c.farg]; g.lineWidth = r * 0.16; g.lineCap = 'round';
      g.beginPath(); g.moveTo(r * 0.7, -r * 0.1); g.lineTo(r * 1.15, -r * 0.6 + a * r * 0.3); g.stroke();
      g.fillStyle = ctx.farg[c.farg]; g.beginPath(); g.arc(r * 1.18, -r * 0.65 + a * r * 0.3, r * 0.14, 0, 7); g.fill();
    }
    // horn / antenner / öron
    if (c.typ === 0) for (const s of [-1, 1]) { g.beginPath(); g.moveTo(s * r * 0.35, -r * 0.8); g.lineTo(s * r * 0.55, -r * 1.25); g.lineTo(s * r * 0.7, -r * 0.65); g.closePath(); ctx.form('krita', { fyllAlpha: 0.15, bredd: ctx.linje(0.8) }); }
    if (c.typ === 1) for (const s of [-1, 1]) {
      g.strokeStyle = ctx.farg[c.farg]; g.lineWidth = r * 0.07; g.beginPath(); g.moveTo(s * r * 0.25, -r * 0.85);
      g.quadraticCurveTo(s * r * 0.3, -r * 1.3, s * r * (0.5 + 0.08 * Math.sin(t * 3 + s)), -r * 1.45); g.stroke();
      g.fillStyle = ctx.farg.glod; g.beginPath(); g.arc(s * r * (0.5 + 0.08 * Math.sin(t * 3 + s)), -r * 1.45, r * 0.12, 0, 7); g.fill();
    }
    if (c.typ === 2) for (const s of [-1, 1]) { g.beginPath(); g.arc(s * r * 0.7, -r * 0.7, r * 0.3, 0, 7); ctx.form(c.farg, { fyllAlpha: 0.15, bredd: ctx.linje(0.9) }); }
    // kropp
    Rita.klump(g, 0, 0, r, c.seed, t, 0.05);
    g.fillStyle = '#000'; g.fill(); ctx.form(c.farg, { fyllAlpha: 0.18, bredd: ctx.linje(1.1) });
    // ögon
    const b = c.vinkel > 2 ? [-blick[0], -blick[1]] : blick;
    const ogon = c.antalOgon === 1 ? [[0, -r * 0.2, r * 0.95]] : c.antalOgon === 2 ? [[-r * 0.33, -r * 0.25, r * 0.58], [r * 0.33, -r * 0.25, r * 0.58]]
      : [[-r * 0.42, -r * 0.18, r * 0.42], [0, -r * 0.42, r * 0.46], [r * 0.42, -r * 0.18, r * 0.42]];
    for (const [ox, oy, ow] of ogon) { // runda ögon: vitt, pupill, glans
      const rr = ow * 0.42;
      g.save(); g.translate(ox, oy); g.scale(1, Math.max(0.08, 1 - c.lock));
      g.strokeStyle = ctx.farg.krita; g.lineWidth = ctx.linje(0.8); g.beginPath(); g.arc(0, 0, rr, 0, 7); g.stroke();
      if (c.vinkar) { g.strokeStyle = ctx.farg.krita; g.lineWidth = ctx.linje(0.8); g.beginPath(); g.arc(0, rr * 0.25, rr * 0.55, 1.15 * Math.PI, 1.85 * Math.PI); g.stroke(); }
      else {
        const pr = rr * (c.skramd ? 0.32 : 0.52);
        const px = b[0] * (rr - pr) * 0.9, py = b[1] * (rr - pr) * 0.9;
        g.fillStyle = ctx.farg.krita; g.beginPath(); g.arc(px, py, pr, 0, 7); g.fill();
        g.fillStyle = '#000'; g.beginPath(); g.arc(px + pr * 0.3, py - pr * 0.35, pr * 0.28, 0, 7); g.fill();
      }
      g.restore();
    }
    // mun
    g.strokeStyle = ctx.farg.krita; g.lineWidth = ctx.linje(0.9); g.lineCap = 'round';
    if (c.skramd) { g.beginPath(); g.ellipse(0, r * 0.38, r * 0.12, r * 0.16, 0, 0, 7); g.stroke(); }
    else {
      g.beginPath(); g.arc(0, r * 0.22, r * 0.3, 0.15 * Math.PI, 0.85 * Math.PI); g.stroke();
      if (c.tand) { g.fillStyle = ctx.farg.krita; g.fillRect(r * 0.05, r * 0.5, r * 0.12, r * 0.13); }
    }
    g.restore();
  }

  Nattfonster.registrera({
    id: 'tittut',
    cat: 'visual', by: 'Linus',
    en: { titel: 'Peekaboo', fraga: 'Who lives behind the wall?', verb: 'stand still, sneak, search, wave' },
    pitch: {
      tagline: { sv: 'Små varelser bor bakom väggarna och kikar fram när du står still.', en: 'Little creatures live behind the walls and peek out when you stand still.' },
      players: ['crowd', { sv: 'Alla', en: 'Anyone' }], mode: 'ambient', round: { sv: 'Hela kvällen', en: 'All evening' },
      input: [['cam', { sv: 'Djupkamera: fart, stå still, vinka', en: 'Depth cam: speed, standing still, waving' }]],
      for: ['kid', 'family'],
      how: [
        { sv: 'Varelser kikar fram från karmar, mur och golv.', en: 'Creatures peek out from the frames, the pier and the floor.' },
        { sv: 'Spring fram så gömmer de sig. Stå still så kommer fler.', en: 'Run up and they hide. Stand still and more come out.' },
        { sv: 'Vinka: de vinkar tillbaka.', en: 'Wave: they wave back.' }
      ],
      trick: { sv: 'Allt gömmer sig bakom karmar och mur. En jätte tittar fram på båda sidor om muren samtidigt, och en mask kryper rakt genom väggen.', en: 'Everything hides behind the frames and the pier. A giant peeks out on both sides of the pier at once, and a worm crawls straight through the wall.' },
      needs: [['projector', { sv: 'Projektor', en: 'Projector' }], ['cam', { sv: 'Djupkamera', en: 'Depth cam' }]],
      open: [{ sv: 'Hur länge orkar ett barn stå still?', en: 'How long can a kid stand still?' }, { sv: 'Fler varelser, eller fler sorter?', en: 'More creatures, or more kinds?' }],
      meters: { read: 4, crowd: 4, effort: 1 }
    },
    titel: 'Tittut', steam: 'A', spar: 'C', stil: 'pop',
    fraga: 'Vem bor bakom väggen?', verb: 'stå still, smyga, leta, vinka',
    lage: 'interaktiv', indata: ['personer'], langd: 90, stamning: 'tittut, busig, lekplats',
    knappar: [
      { namn: 'Jätten', gor: (s, ctx) => s.jatte = { t: 0 } },
      { namn: 'Masken', gor: (s, ctx) => s.mask = null || nyMask(s, ctx) }
    ],

    setup(ctx) {
      return { stallen: gomstallen(ctx), figurer: [], spawnT: 0, jatte: null, jatteT: 20, mask: null, maskT: 8, rnd: ctx.slump(11), seed: 0 };
    },

    frame(ctx, st, input) {
      const { g, t, dt } = ctx, R = st.rnd;
      const stilla = input.personer.filter(p => p.still > 2 && p.avstand < 3.5);
      const vinkar = input.personer.some(p => p.vinkar && p.avstand < 4);
      const max = stilla.length ? 10 : 6;

      // ---- nya figurer ----
      st.spawnT -= dt;
      if (st.spawnT < 0 && st.figurer.length < max) {
        st.spawnT = stilla.length ? 0.3 : 0.6 + R() * 1.1;
        let kand = st.stallen.filter(s => !st.figurer.some(f => f.st === s));
        if (stilla.length) { const p = stilla[0]; kand.sort((a, b) => Math.abs(a.x - p.x) - Math.abs(b.x - p.x)); kand = kand.slice(0, 6); }
        const s = kand[Math.floor(R() * kand.length)];
        if (s) {
          const r = 0.16 + R() * 0.15;
          st.figurer.push({ st: s, r, farg: FARGER[Math.floor(R() * 5)], typ: Math.floor(R() * 4), antalOgon: [1, 2, 2, 3][Math.floor(R() * 4)],
            seed: st.seed++, tand: R() < 0.5, peek: 0, fas: 'in', tf: 0, tid: 1.5 + R() * 3, hopp: R() < 0.25, skramd: false, lock: 0, blinkVid: t + R() * 3,
            vinkel: s.dy === 1 ? Math.PI : s.dx * -0.25 });
        }
      }

      // ---- uppdatera och rita figurer ----
      for (const c of st.figurer) {
        const s = c.st; c.tf += dt;
        const p = Rita.narmast(input.personer, s.x, 4);
        if (c.fas === 'in') { c.peek = Rita.ease.studs(Math.min(1, c.tf / 0.7)); if (c.tf > 0.7) { c.fas = 'titta'; c.tf = 0; } }
        else if (c.fas === 'titta') {
          c.peek = 1 + 0.04 * Math.sin(t * 3 + c.seed) + (c.hopp ? 0.7 * Math.max(0, Math.sin(Math.min(1, c.tf / 1.2) * Math.PI)) : 0);
          const lang = stilla.length ? c.tid + 4 : c.tid;
          if (p && p.fart > 1.4 && !p.vinkar && Math.abs(p.x - s.x) < 1.0 && p.avstand < 2.5) { c.skramd = true; c.fas = 'ut'; c.tf = 0; c.start = c.peek; }
          else if (c.tf > lang) { c.fas = 'ut'; c.tf = 0; c.start = c.peek; }
        } else { c.peek = c.start * (1 - Math.min(1, c.tf / (c.skramd ? 0.18 : 0.6))); }
        c.vinkar = vinkar && c.fas === 'titta';
        const bt = t - c.blinkVid; c.lock = bt > 0 && bt < 0.14 ? 1 - Math.abs(bt - 0.07) / 0.07 : 0; if (bt > 0.14) c.blinkVid = t + 2 + R() * 4;
        const ut = -c.r * 1.25 + c.peek * (c.r * 1.25 + c.r * 0.55);
        c.x = s.x + s.dx * ut; c.y = s.y + s.dy * ut;
        const blick = p ? Rita.blick(c.x, c.y, p.x, ctx.yForHojd(p.hojd * 0.93), 1.0, 0.9) : [Math.sin(t * 0.7 + c.seed), Math.cos(t * 0.5 + c.seed) * 0.5];
        figur(g, ctx, c, blick, t);
        if (c.skramd && c.tf < 0.5) ctx.text('!', s.x + s.dx * 0.15, s.y + s.dy * 0.15 - (s.dy === 0 ? 0.1 : 0), { storlek: 0.22, vikt: 700, farg: ctx.farg.glod, align: 'center' });
      }
      st.figurer = st.figurer.filter(c => !(c.fas === 'ut' && c.peek <= 0));

      // ---- jätten bakom muren ----
      st.jatteT -= dt; if (st.jatteT < 0 && !st.jatte) { st.jatte = { t: 0 }; st.jatteT = 30 + R() * 20; }
      if (st.jatte) {
        const j = st.jatte; j.t += dt;
        const V = ctx.sektioner[0]._inner, Hs = ctx.sektioner[1]._inner;
        const mx = (V.x + V.w + Hs.x) / 2, halv = (Hs.x - V.x - V.w) / 2;
        const k = Math.sin(Math.min(1, j.t / 7) * Math.PI);
        const sida = 0.18 * Math.sin(j.t * 1.3);
        const Rr = halv + 0.02 + k * 0.42, cy = ctx.H * 0.48;
        Rita.klump(g, mx + sida, cy, Rr, 99, t, 0.03); g.fillStyle = '#000'; g.fill(); ctx.form('norrsken', { fyllAlpha: 0.18, bredd: ctx.linje(1.4) });
        const p = Rita.narmast(input.personer, mx, 6);
        const bl = p ? Rita.blick(mx, cy, p.x, ctx.yForHojd(p.hojd * 0.93), 1.2, 1) : [Math.sin(t), 0.2];
        for (const s of [-1, 1]) Rita.oga(g, { x: mx + sida + s * (Rr - 0.16), y: cy - 0.15, w: 0.26, h: 0.12, blick: bl, iris: '#111', vit: ctx.farg.krita, kant: ctx.farg.kant, kontur: ctx.kontur(0.01), pupill: 1.3 });
        if (j.t > 7) st.jatte = null;
      }

      // ---- masken som kryper genom väggen ----
      st.maskT -= dt; if (st.maskT < 0 && !st.mask) { nyMask(st, ctx); st.maskT = 18 + R() * 14; }
      if (st.mask) {
        const m = st.mask; m.x += m.dir * 0.75 * dt;
        m.spar.unshift([m.x, m.y + Math.sin(m.x * 4) * 0.12]); if (m.spar.length > 400) m.spar.pop();
        for (let i = 8; i >= 0; i--) {
          const pt = m.spar[Math.min(m.spar.length - 1, i * 7)]; const rr = i === 0 ? 0.12 : 0.1 - i * 0.004;
          g.beginPath(); g.arc(pt[0], pt[1], rr, 0, 7); g.fillStyle = '#000'; g.fill(); ctx.form(i % 2 ? 'glod' : 'rosa', { fyllAlpha: 0.2, bredd: ctx.linje(0.8) });
        }
        const h = m.spar[0];
        for (const s of [-1, 1]) Rita.oga(g, { x: h[0] + m.dir * 0.04, y: h[1] - 0.04 + s * 0.045, w: 0.07, h: 0.035, blick: [m.dir, 0], iris: '#111', vit: ctx.farg.krita, kant: ctx.farg.kant, kontur: 0.004 });
        if (m.x < -1.5 || m.x > ctx.W + 1.5) st.mask = null;
      }
    }
  });

  function nyMask(st, ctx) {
    const dir = st.rnd() < 0.5 ? 1 : -1, rad = ctx.rutor[4 * Math.floor(st.rnd() * 3) + 0];
    st.mask = { dir, x: dir > 0 ? -0.5 : ctx.W + 0.5, y: rad.cy + (st.rnd() - 0.5) * 0.3, spar: [] };
    return st.mask;
  }
})();
