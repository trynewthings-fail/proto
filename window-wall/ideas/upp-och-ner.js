// S4 · Upp och ner — omöjlig fysik. Varje ruta kan ha sin egen tyngdkraft. Bollarna studsar
// genom spröjsen och försvinner bakom muren för att dyka upp på andra sidan.
// Du är en planet: står du nära dras bollarna mot dig. Vinka så skjuter du upp dem.
(function () {
  const LAGEN = [
    { namn: 'Jorden', rad: '9,8 m/s² nedåt', fraga: 'Varför faller allt nedåt?' },
    { namn: 'Upp och ner', rad: 'varannan kolumn uppåt', fraga: 'Tänk om tyngdkraften vände?' },
    { namn: 'Månen', rad: '1,6 m/s²', fraga: 'Hur högt studsar du på månen?' },
    { namn: 'Virveln', rad: 'runt mitten', fraga: 'Kan man falla i cirklar?' },
    { namn: 'Egna rutor', rad: 'varje ruta sin riktning', fraga: 'Vilken väg är ner?' },
    { namn: 'Tyngdlöst', rad: '0 g', fraga: 'Hur känns det att väga ingenting?' }
  ];
  const FARGER = ['orange', 'is', 'rosa', 'glod', 'norrsken', 'krita'];

  Nattfonster.registrera({
    id: 'upp-och-ner',
    cat: 'puzzle', by: 'Linus',
    en: { titel: 'Upside down', fraga: 'Which way is down?', verb: 'pull, push, wave, stand still' },
    pitch: {
      tagline: { sv: 'Varje ruta har sin egen tyngdkraft, och du är en planet som drar i bollarna.', en: 'Every pane has its own gravity, and you are a planet pulling on the balls.' },
      players: ['group', '1–6'], mode: 'ambient', round: { sv: 'Släpp in när du vill', en: 'Drop in' },
      input: [['cam', { sv: 'Djupkamera: nära glaset, vinka', en: 'Depth cam: close to the glass, waving' }]],
      for: ['kid', 'family', 'school'],
      how: [
        { sv: 'Var 18:e sekund byts tyngdkraften: jorden, månen, virveln, tyngdlöst.', en: 'Every 18 seconds gravity changes: Earth, Moon, whirlpool, weightless.' },
        { sv: 'Stå nära glaset: du är en planet och bollarna dras mot dig.', en: 'Stand close to the glass: you are a planet and the balls fall toward you.' },
        { sv: 'Vinka: du skjuter upp bollarna i luften.', en: 'Wave: you launch the balls into the air.' }
      ],
      trick: { sv: 'Bollarna studsar genom spröjsen och försvinner bakom muren för att dyka upp på andra sidan. En pil i varje ruta visar vilken väg som är ner.', en: 'The balls bounce through the mullions and vanish behind the pier to pop out on the other side. An arrow in each pane shows which way is down.' },
      needs: [['projector', { sv: 'Projektor', en: 'Projector' }], ['cam', { sv: 'Djupkamera', en: 'Depth cam' }]],
      open: [{ sv: 'Ska man kunna välja tyngdkraft själv?', en: 'Should visitors pick the gravity themselves?' }, { sv: 'Behövs ett mål, som att samla alla bollar i en ruta?', en: 'Does it need a goal, like gathering every ball in one pane?' }],
      meters: { read: 4, crowd: 3, effort: 2 }
    },
    titel: 'Upp och ner', steam: 'S', spar: 'A', stil: 'pop',
    fraga: 'Vilken väg är ner?', verb: 'dra, skjuta, vinka, stå still',
    lage: 'ambient → interaktiv', indata: ['(personer)'], langd: 108, stamning: 'omöjligt, studsigt, magiskt',
    knappar: [{ namn: 'Byt tyngdkraft', gor: (s, ctx) => byt(s, ctx) }],

    setup(ctx) {
      const rnd = ctx.slump(9), bollar = [];
      for (let i = 0; i < 34; i++) bollar.push({ x: 0.2 + rnd() * (ctx.W - 0.4), y: 0.2 + rnd() * (ctx.H - 0.4), vx: (rnd() - 0.5), vy: 0, r: 0.045 + Math.pow(rnd(), 2) * 0.1, f: FARGER[i % 6] });
      const s = { bollar, li: -1, lT: 0, rnd, egna: [], vinkade: new Map() };
      byt(s, ctx); return s;
    },

    frame(ctx, st, input) {
      const { g, t, W, H } = ctx, dt = Math.min(ctx.dt, 1 / 30);
      st.lT += dt; if (st.lT > 18) byt(st, ctx);
      const L = LAGEN[st.li];
      const grav = (x, y) => {
        const k = ctx.kolumnVid(x), kol = k ? k.kol : Math.floor(x / W * 4);
        switch (L.namn) {
          case 'Jorden': return [0, 9.82 * 0.5];
          case 'Upp och ner': return [0, (kol % 2 ? -1 : 1) * 9.82 * 0.45];
          case 'Månen': return [0, 1.62 * 0.5];
          case 'Virveln': { const dx = x - W / 2, dy = y - H / 2, d = Math.hypot(dx, dy) || 1; return [(-dy / d) * 3 - dx / d * 0.8, (dx / d) * 3 - dy / d * 0.8]; }
          case 'Egna rutor': { const ru = ctx.rutor.find(r => x >= r.x - 0.04 && x <= r.x + r.w + 0.04 && y >= r.y - 0.04 && y <= r.y + r.h + 0.04); const a = ru ? st.egna[ru.nr - 1] : Math.PI / 2; return [Math.cos(a) * 4, Math.sin(a) * 4]; }
          default: return [0, 0];
        }
      };
      const brunnar = input.personer.filter(p => p.avstand < 3).map(p => ({ x: p.x, y: ctx.yForHojd(p.hojd * 0.6), p }));
      for (const w of brunnar) { // vinka = skjut upp bollarna
        if (w.p.vinkar && !st.vinkade.get(w.p.id)) for (const b of st.bollar) if (Math.abs(b.x - w.x) < 1.2) { b.vy -= 4 + st.rnd() * 2; b.vx += (st.rnd() - 0.5) * 2; }
        st.vinkade.set(w.p.id, w.p.vinkar);
      }
      // ---- fysik ----
      for (const b of st.bollar) {
        const [gx, gy] = grav(b.x, b.y);
        b.vx += gx * dt; b.vy += gy * dt;
        for (const w of brunnar) { const dx = w.x - b.x, dy = w.y - b.y, d = Math.hypot(dx, dy); if (d < 1.6 && d > 0.05) { const a = 5 / (d + 0.3); b.vx += dx / d * a * dt; b.vy += dy / d * a * dt; } }
        if (L.namn === 'Tyngdlöst') { b.vx += Math.sin(t * 0.3 + b.r * 50) * 0.05 * dt; }
        b.vx *= 0.999; b.vy *= 0.999;
        b.x += b.vx * dt; b.y += b.vy * dt;
        if (b.x < b.r) { b.x = b.r; b.vx = Math.abs(b.vx) * 0.85; } if (b.x > W - b.r) { b.x = W - b.r; b.vx = -Math.abs(b.vx) * 0.85; }
        if (b.y < b.r) { b.y = b.r; b.vy = Math.abs(b.vy) * 0.85; } if (b.y > H - b.r) { b.y = H - b.r; b.vy = -Math.abs(b.vy) * 0.85; }
      }
      const B = st.bollar;
      for (let i = 0; i < B.length; i++) for (let j = i + 1; j < B.length; j++) {
        const a = B[i], c = B[j], dx = c.x - a.x, dy = c.y - a.y, d = Math.hypot(dx, dy), m = a.r + c.r;
        if (d < m && d > 0) {
          const nx = dx / d, ny = dy / d, ov = (m - d) / 2; a.x -= nx * ov; a.y -= ny * ov; c.x += nx * ov; c.y += ny * ov;
          const rv = (c.vx - a.vx) * nx + (c.vy - a.vy) * ny; if (rv < 0) { const ma = a.r * a.r, mc = c.r * c.r, j_ = -1.8 * rv / (ma + mc); a.vx -= j_ * mc * nx; a.vy -= j_ * mc * ny; c.vx += j_ * ma * nx; c.vy += j_ * ma * ny; }
        }
      }
      // ---- pilar som visar tyngdkraften i varje ruta ----
      g.strokeStyle = ctx.rgba('krita', 0.35); g.lineWidth = ctx.linje(0.8); g.lineCap = 'round';
      for (const r of ctx.rutor) {
        const [gx, gy] = grav(r.cx, r.cy), m = Math.hypot(gx, gy); if (m < 0.1) continue;
        const ux = gx / m, uy = gy / m, l = 0.1, x0 = r.x + r.w - 0.14, y0 = r.y + 0.14;
        g.beginPath(); g.moveTo(x0 - ux * l, y0 - uy * l); g.lineTo(x0 + ux * l, y0 + uy * l);
        g.lineTo(x0 + ux * l - (ux * 0.05 - uy * 0.04), y0 + uy * l - (uy * 0.05 + ux * 0.04)); g.moveTo(x0 + ux * l, y0 + uy * l);
        g.lineTo(x0 + ux * l - (ux * 0.05 + uy * 0.04), y0 + uy * l - (uy * 0.05 - ux * 0.04)); g.stroke();
      }
      // ---- bollar ----
      for (const b of B) {
        g.beginPath(); g.arc(b.x, b.y, b.r, 0, 7); ctx.form(b.f, { fyllAlpha: 0.2, bredd: Math.min(ctx.linje(), b.r * 0.3) });
        g.fillStyle = ctx.farg.krita; g.beginPath(); g.arc(b.x - b.r * 0.35, b.y - b.r * 0.35, b.r * 0.16, 0, 7); g.fill();
      }
      // ---- text ----
      const r1 = ctx.rutaNr(1), a = Math.min(1, st.lT * 1.5, (18 - st.lT) * 1.5);
      ctx.text(L.namn, r1.x + 0.07, r1.y + 0.16, { storlek: 0.11, vikt: 700, alpha: a });
      ctx.text(L.rad, r1.x + 0.07, r1.y + 0.25, { typ: 'mono', storlek: 0.042, alpha: a * 0.75 });
      const r7 = ctx.rutaNr(7);
      ctx.text(L.fraga, r7.x + 0.07, r7.y + 0.16, { storlek: 0.07, farg: ctx.farg.orange, alpha: a, maxBredd: r7.w - 0.3 });
    }
  });

  function byt(s, ctx) {
    s.li = (s.li + 1) % LAGEN.length; s.lT = 0;
    s.egna = ctx.rutor.map(() => s.rnd() * Math.PI * 2);
    if (LAGEN[s.li].namn === 'Upp och ner') for (const b of s.bollar) b.vy *= -0.5;
  }
})();
