// S6 · Munnarna — varje ruta är en fyrkantig mun med samma form som fönstret. Läpparna följer karmen,
// tänderna är fyrkantiga och tandköttet rör sig uppåt och nedåt. Tolv små munnar som tuggar, gäspar och
// sjunger i kör, eller två stora där spröjsarna blir tandställning.
// Kom nära: Ooo! Stå still: de ler. Vinka: de skrattar. STEAM: S (tänder, kroppen) och A (sång).
(function () {
  function tandRad(rnd, n, spetsar) {
    return Array.from({ length: n }, (_, i) => ({ l: 0.75 + rnd() * 0.4, spets: spetsar.includes(i), saknas: rnd() < 0.07 && !spetsar.includes(i) }));
  }

  // kurvan genom munnen: vänster hörn → mitten → höger hörn (le > 0 ger ett leende)
  const kurva = (o, u, dy) => {
    const yHorn = o.y - o.le * o.h * 0.14, yMitt = o.y + o.le * o.h * 0.16;
    const v = 1 - u; return [o.x - o.w / 2 + u * o.w, v * v * yHorn + 2 * v * u * yMitt + u * u * yHorn + dy];
  };

  function mun(g, ctx, o) {
    const { x, y, w, h } = o, oh = Rita.clamp(o.open) * h * 0.42 + 0.004;
    const kant = new Path2D(); kant.roundRect(x - w / 2, y - h / 2, w, h, Math.min(w, h) * 0.1);
    g.save(); g.clip(kant);
    // insidan: mörkt mellan över- och underkäke
    const insida = new Path2D();
    for (let i = 0; i <= 24; i++) { const [px, py] = kurva(o, i / 24, -oh); i ? insida.lineTo(px, py) : insida.moveTo(px, py); }
    for (let i = 24; i >= 0; i--) { const [px, py] = kurva(o, i / 24, oh); insida.lineTo(px, py); }
    insida.closePath();
    g.fillStyle = ctx.rgba('rosa', 0.1); g.fillRect(x - w / 2, y - h / 2, w, h);            // tandkött
    g.fillStyle = '#000'; g.fill(insida); g.fillStyle = ctx.rgba('rosa', 0.06); g.fill(insida);
    // tunga
    g.save(); g.clip(insida);
    g.beginPath(); g.ellipse(x + Math.sin(ctx.t * 1.3 + o.fas) * w * 0.06, kurva(o, 0.5, oh)[1] - oh * 0.15, w * 0.28, Math.max(0.01, oh * 0.55), 0, 0, 7);
    ctx.form('rosa', { fyllAlpha: 0.3, bredd: ctx.linje(0.8) });
    g.restore();
    // tänder: fyrkantiga, hänger från överkäken och står på underkäken
    const tl = Math.min(1, 0.35 + o.open * 2.2), th = h * 0.13 * tl;
    const tand = (u, dy, riktning, t_, bredd) => {
      if (t_.saknas) return;
      const [px, py] = kurva(o, u, dy), tw = bredd * 0.84, hh = th * t_.l * riktning;
      g.beginPath();
      if (t_.spets) { g.moveTo(px - tw / 2, py); g.lineTo(px - tw / 2, py + hh * 0.55); g.lineTo(px, py + hh * 1.25); g.lineTo(px + tw / 2, py + hh * 0.55); g.lineTo(px + tw / 2, py); g.closePath(); }
      else g.roundRect(px - tw / 2, riktning > 0 ? py : py + hh, tw, Math.abs(hh), Math.min(tw, Math.abs(hh)) * 0.25);
      ctx.form('krita', { fyllAlpha: 0.22, bredd: ctx.linje(0.7) });
    };
    o.uppe.forEach((t_, i) => tand((i + 0.5) / o.uppe.length, -oh, 1, t_, w / o.uppe.length));
    o.nere.forEach((t_, i) => tand((i + 0.5) / o.nere.length, oh, -1, t_, w / o.nere.length));
    if (o.tandstallning) { // spröjsarna blir tandställning: en tråd och små fästen
      g.strokeStyle = ctx.farg.is; g.lineWidth = ctx.linje(0.5); g.beginPath();
      for (let i = 0; i <= 30; i++) { const [px, py] = kurva(o, i / 30, -oh + th * 0.5); i ? g.lineTo(px, py) : g.moveTo(px, py); }
      g.stroke(); g.fillStyle = ctx.farg.is;
      o.uppe.forEach((_, i) => { const [px, py] = kurva(o, (i + 0.5) / o.uppe.length, -oh + th * 0.5); g.fillRect(px - 0.018, py - 0.014, 0.036, 0.028); });
    }
    // käklinjer
    g.strokeStyle = ctx.farg.rosa; g.lineWidth = ctx.linje(0.9); g.stroke(insida);
    g.restore();
    // läpparna följer rutans form
    g.strokeStyle = ctx.farg.rosa; g.lineWidth = ctx.linje(1.5); g.lineJoin = 'round'; g.stroke(kant);
  }

  Nattfonster.registrera({
    id: 'munnarna',
    cat: 'visual', by: 'Linus',
    en: { titel: 'The mouths', fraga: 'How many teeth do you have?', verb: 'come close, smile, wave, sing' },
    pitch: {
      tagline: { sv: 'Varje ruta är en fyrkantig mun som tuggar, gäspar och sjunger i kör.', en: 'Every pane is a square mouth that chews, yawns and sings in a choir.' },
      players: ['crowd', { sv: 'Alla', en: 'Anyone' }], mode: 'ambient', round: { sv: 'Hela kvällen', en: 'All evening' },
      input: [['cam', { sv: 'Djupkamera: nära, stå still, vinka', en: 'Depth cam: close, standing still, waving' }]],
      for: ['kid', 'family'],
      how: [
        { sv: 'Kom nära: munnen framför dig säger Ooo!', en: 'Come close: the mouth in front of you goes Ooo!' },
        { sv: 'Stå still: alla munnar ler.', en: 'Stand still: all the mouths smile.' },
        { sv: 'Vinka: hela fasaden skrattar.', en: 'Wave: the whole façade laughs.' }
      ],
      trick: { sv: 'Läpparna följer karmen och tänderna är fyrkantiga som rutorna. Ibland blir varje fönster en stor mun och spröjsen blir tandställning.', en: 'The lips follow the frame and the teeth are square like the panes. Sometimes each window becomes one big mouth and the mullions turn into braces.' },
      needs: [['projector', { sv: 'Projektor', en: 'Projector' }], ['cam', { sv: 'Djupkamera', en: 'Depth cam' }]],
      open: [{ sv: 'Ska kören sjunga på riktigt, genom en högtalare?', en: 'Should the choir really sing, through a speaker?' }, { sv: 'Gulligt eller läskigt?', en: 'Cute or creepy?' }],
      meters: { read: 4, crowd: 4, effort: 1 }
    },
    titel: 'Munnarna', steam: 'S', spar: 'B', stil: 'pop',
    fraga: 'Hur många tänder har du?', verb: 'gå nära, le, vinka, sjunga',
    lage: 'interaktiv', indata: ['personer'], langd: 60, stamning: 'gulligt monster, kör, fniss',
    knappar: [
      { namn: '12 små ↔ 2 stora', gor: s => { s.stora = !s.stora; s.lageT = 0; } },
      { namn: 'Kören sjunger', gor: (s, ctx) => s.korT = ctx.t }
    ],

    setup(ctx) {
      const rnd = ctx.slump(3);
      const sma = ctx.rutor.map(ru => ({
        x: ru.cx, y: ru.cy, w: ru.w - 0.1, h: ru.h - 0.1, kol: ru.kol, fas: rnd() * 6, le: 0, open: 0.1, handelse: null,
        uppe: tandRad(rnd, 4, rnd() < 0.5 ? [0, 3] : []), nere: tandRad(rnd, 4, [])
      }));
      const stora = ctx.sektioner.map((s, i) => ({
        x: s._inner.x + s._inner.w / 2, y: s._inner.y + s._inner.h / 2, w: s._inner.w - 0.04, h: s._inner.h - 0.04,
        kol: i * 3 + 1, fas: i * 2, tandstallning: true, le: 0, open: 0.1, handelse: null,
        uppe: tandRad(rnd, 9, [1, 7]), nere: tandRad(rnd, 8, [])
      }));
      return { sma, storaM: stora, stora: false, lageT: 0, korT: -99, nastaKor: 18, rnd };
    },

    frame(ctx, st, input) {
      const { g, t, dt } = ctx, R = st.rnd;
      st.lageT += dt; if (st.lageT > 30) { st.lageT = 0; st.stora = !st.stora; }
      if (t > st.nastaKor) { st.korT = t; st.nastaKor = t + 18 + R() * 12; }
      const munnar = st.stora ? st.storaM : st.sma;
      const vinkar = input.personer.some(p => p.vinkar && p.avstand < 4);
      const stilla = input.personer.some(p => p.still > 2 && p.avstand < 3);
      const kor = t - st.korT < 6;
      for (const m of munnar) {
        let open = 0.1 + 0.06 * Math.sin(t * 1.1 + m.fas), le = 0.15;
        if (!m.handelse && R() < dt * 0.06) m.handelse = { typ: R() < 0.6 ? 'tugga' : 'gaspa', t: 0 };
        if (m.handelse) {
          const hd = m.handelse; hd.t += dt;
          if (hd.typ === 'tugga') { open = 0.06 + 0.3 * Math.abs(Math.sin(hd.t * 9)); if (hd.t > 1.8) m.handelse = null; }
          else { open = Math.sin(Math.min(1, hd.t / 1.8) * Math.PI) * 0.95; le = -0.2; if (hd.t > 1.8) m.handelse = null; }
        }
        if (kor) { // kören: munnarna öppnas i en våg och sjunger
          const k = t - st.korT - m.kol * 0.2;
          if (k > 0 && k < 5) { open = 0.35 + 0.45 * (0.5 + 0.5 * Math.sin(k * 5 + m.kol)); le = 0.1; }
        }
        const p = Rita.narmast(input.personer, m.x, 2.6);
        if (p && Math.abs(p.x - m.x) < (st.stora ? 1.4 : 0.6)) { open = Math.max(open, 0.8); le = -0.3; } // Ooo!
        if (stilla) { le = 0.85; open = Math.max(0.25, open * 0.6); }
        if (vinkar) { le = 1; open = 0.3 + 0.3 * Math.abs(Math.sin(t * 11 + m.fas)); } // skratt
        m.open += (open - m.open) * Math.min(1, dt * 10);
        m.le += (le - m.le) * Math.min(1, dt * 6);
        mun(g, ctx, m);
        if (kor) {
          const k = t - st.korT - m.kol * 0.2;
          if (k > 0 && k < 5 && Math.sin(k * 5 + m.kol) > 0.9) ctx.text('♪', m.x + Math.sin(m.fas * 7 + Math.floor(k)) * m.w * 0.25, m.y - m.h * 0.3 - (k % 1) * 0.2, { storlek: 0.12, farg: ctx.farg.glod, alpha: 0.9 });
        }
      }
      // kunskap i en ruta: hur många tänder?
      const r = ctx.rutaNr(1), a = 0.5 + 0.5 * Math.sin(t * 0.4);
      ctx.text('BARN 20 TÄNDER', r.x + 0.08, r.y + 0.12, { typ: 'mono', storlek: 0.04, alpha: 0.85 * a, farg: ctx.farg.krita });
      ctx.text('VUXNA 32', r.x + 0.08, r.y + 0.18, { typ: 'mono', storlek: 0.04, alpha: 0.85 * a, farg: ctx.farg.krita });
    }
  });
})();
