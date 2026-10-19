// S5 · Stjärnfall — rymden bakom fönstren. Stjärnfall drar förbi bakom spröjs och mur.
// Din väg blir en stjärnbild med eget namn. Stå still: warp, stjärnorna strömmar ut från dig.
// Vinka: ett stjärnfall skjuts upp från dig, önska något! Högt Kp-index: norrsken.
(function () {
  const NAMN = ['Springande Räven', 'Lilla Raketen', 'Stora Strumpan', 'Flygande Kanelbullen', 'Glada Kometen', 'Lilla Älgen',
    'Hoppande Haren', 'Stora Skeden', 'Sovande Draken', 'Snabba Snigeln', 'Vinkande Handen', 'Stora Frågetecknet'];

  Nattfonster.registrera({
    id: 'stjarnfall',
    cat: 'visual', by: 'Linus',
    en: { titel: 'Shooting stars', fraga: 'How far away is a star?', verb: 'walk, stop, make a wish' },
    pitch: {
      tagline: { sv: 'Rymden bakom fönstren. Din väg blir en stjärnbild med eget namn.', en: 'Space behind the windows. Your path becomes a constellation with its own name.' },
      players: ['crowd', { sv: 'Alla', en: 'Anyone' }], mode: 'ambient', round: { sv: 'Hela kvällen', en: 'All evening' },
      input: [['cam', { sv: 'Djupkamera: din väg, stå still, vinka', en: 'Depth cam: your path, standing still, waving' }], ['wifi', { sv: 'Norrskensdata (Kp-index)', en: 'Aurora data (Kp index)' }]],
      for: ['kid', 'family', 'all'],
      how: [
        { sv: 'Gå förbi: din väg blir en stjärnbild, till exempel Flygande Kanelbullen.', en: 'Walk by: your path becomes a constellation, like the Flying Cinnamon Bun.' },
        { sv: 'Stå still: warp, stjärnorna strömmar ut från dig.', en: 'Stand still: warp, the stars stream out from you.' },
        { sv: 'Vinka: ett stjärnfall skjuts upp. Önska något!', en: 'Wave: a shooting star launches from you. Make a wish!' }
      ],
      trick: { sv: 'Stjärnfallen drar förbi bakom spröjs och mur, som om fönstren vore hål ut i rymden.', en: 'Shooting stars streak past behind mullions and pier, as if the windows were holes into space.' },
      needs: [['projector', { sv: 'Projektor', en: 'Projector' }], ['cam', { sv: 'Djupkamera', en: 'Depth cam' }], ['wifi', { sv: 'Norrskensdata', en: 'Aurora data' }]],
      open: [{ sv: 'Syns de små stjärnorna från torget?', en: 'Do the tiny stars show from the plaza?' }, { sv: 'Ska stjärnbilderna ligga kvar hela kvällen?', en: 'Should the constellations stay up all evening?' }],
      meters: { read: 3, crowd: 4, effort: 2 }
    },
    titel: 'Stjärnfall', steam: 'S', spar: 'A', stil: 'natt',
    fraga: 'Hur långt bort är en stjärna?', verb: 'gå, stanna, önska',
    lage: 'ambient → interaktiv', indata: ['(personer)', 'norrsken'], langd: 120, stamning: 'rymd, under, önskan',
    knappar: [
      { namn: 'Stjärnfall', gor: (s, ctx) => s.fall.push(nyttFall(s, ctx)) },
      { namn: 'Norrsken på/av', gor: s => s.tvingaNorrsken = !s.tvingaNorrsken }
    ],

    setup(ctx) {
      const rnd = ctx.slump(64), stjarnor = [];
      for (let i = 0; i < 520; i++) stjarnor.push({ x: rnd() * ctx.W, y: rnd() * ctx.H, z: rnd(), fas: rnd() * 6, f: rnd() < 0.15 ? ['is', 'glod', 'rosa'][Math.floor(rnd() * 3)] : 'krita' });
      return { rnd, stjarnor, fall: [], fallT: 2, bilder: new Map(), warp: 0, warpX: ctx.W / 2, warpY: ctx.H / 2, onskeT: 0, vinkade: new Map(), namnI: 0, tvingaNorrsken: false, vy: 0 };
    },

    frame(ctx, st, input) {
      const { g, t, dt, W, H } = ctx, R = st.rnd;
      const stilla = input.personer.find(p => p.still > 2 && p.avstand < 3.5);
      st.warp += ((stilla ? 1 : 0) - st.warp) * dt * (stilla ? 0.35 : 1.2);
      if (stilla) { st.warpX = stilla.x; st.warpY = ctx.yForHojd(stilla.hojd * 0.9); }
      const medel = input.personer.length ? input.personer.reduce((s, p) => s + p.x, 0) / input.personer.length : W / 2;
      st.vy += ((medel - W / 2) * 0.03 - st.vy) * dt;

      // ---- norrsken ----
      if (input.norrsken.kp >= 4 || st.tvingaNorrsken) {
        for (let i = 0; i < 70; i++) {
          const x = i / 70 * W, h = 0.6 + 0.45 * Rita.brus(i * 0.15, t * 0.25), y0 = 0.05 + 0.25 * Rita.brus(i * 0.08 + 9, t * 0.15);
          const gr = g.createLinearGradient(0, y0, 0, y0 + h);
          gr.addColorStop(0, ctx.rgba('norrsken', 0)); gr.addColorStop(0.3, ctx.rgba('norrsken', 0.32)); gr.addColorStop(1, ctx.rgba('norrsken', 0));
          g.fillStyle = gr; g.fillRect(x, y0, W / 70 + 0.01, h);
        }
      }
      // ---- stjärnor (parallax + warp) ----
      for (const s of st.stjarnor) {
        let x = ((s.x - st.vy * s.z) % W + W) % W, y = s.y;
        const tw = 0.45 + 0.55 * Math.max(0, Math.sin(t * (1 + s.z * 2) + s.fas));
        g.fillStyle = ctx.farg[s.f];
        if (st.warp > 0.05) {
          const dx = x - st.warpX, dy = y - st.warpY, d = Math.hypot(dx, dy) || 1;
          const fram = ((t * (0.3 + s.z) * st.warp * 1.4 + s.fas) % 1);
          x = st.warpX + dx / d * (d * (0.2 + fram * 1.6)); y = st.warpY + dy / d * (d * (0.2 + fram * 1.6));
          const l = st.warp * 0.12 * (0.3 + fram);
          g.strokeStyle = ctx.farg[s.f]; g.globalAlpha = tw * Math.min(1, fram * 3); g.lineWidth = 0.004 + s.z * 0.006;
          g.beginPath(); g.moveTo(x, y); g.lineTo(x - dx / d * l, y - dy / d * l); g.stroke(); g.globalAlpha = 1;
        } else {
          g.globalAlpha = tw; const r = 0.004 + s.z * s.z * 0.012;
          g.beginPath(); g.arc(x, y, r, 0, 7); g.fill(); g.globalAlpha = 1;
        }
      }
      // ---- en ringplanet som långsamt vandrar ----
      const px = (t * 0.02) % (W + 1.2) - 0.6, py = 0.55 + Math.sin(t * 0.05) * 0.1;
      g.fillStyle = ctx.farg.glod; g.beginPath(); g.arc(px, py, 0.13, 0, 7); g.fill();
      g.fillStyle = ctx.rgba('natt', 0.35); g.beginPath(); g.arc(px + 0.04, py + 0.03, 0.12, 0, 7); g.fill();
      g.strokeStyle = ctx.farg.krita; g.lineWidth = 0.012; g.beginPath(); g.ellipse(px, py, 0.26, 0.06, -0.3, 0.05 * Math.PI, 0.95 * Math.PI + Math.PI); g.stroke();

      // ---- stjärnfall ----
      st.fallT -= dt; if (st.fallT < 0) { st.fallT = 2.5 + R() * 5; st.fall.push(nyttFall(st, ctx)); }
      for (const f of st.fall) {
        f.x += f.vx * dt; f.y += f.vy * dt; f.t += dt;
        const v = Math.hypot(f.vx, f.vy), ux = f.vx / v, uy = f.vy / v;
        const gr = g.createLinearGradient(f.x, f.y, f.x - ux * f.l, f.y - uy * f.l);
        gr.addColorStop(0, ctx.rgba(f.f, 1)); gr.addColorStop(1, ctx.rgba(f.f, 0));
        g.strokeStyle = gr; g.lineWidth = 0.014; g.lineCap = 'round';
        g.beginPath(); g.moveTo(f.x, f.y); g.lineTo(f.x - ux * f.l, f.y - uy * f.l); g.stroke();
        g.fillStyle = ctx.farg.krita; g.beginPath(); g.arc(f.x, f.y, 0.016, 0, 7); g.fill();
      }
      st.fall = st.fall.filter(f => f.t < 4 && f.x > -2 && f.x < W + 2 && f.y > -2 && f.y < H + 2);

      // ---- din väg blir en stjärnbild ----
      for (const p of input.personer) {
        if (p.avstand > 4) continue;
        let b = st.bilder.get(p.id);
        if (!b) { b = { namn: NAMN[st.namnI++ % NAMN.length], pkt: [], senast: -9, nr: p.nr }; st.bilder.set(p.id, b); }
        b.borta = 0;
        if (t - b.senast > 0.55 && (!b.pkt.length || Math.abs(b.pkt[b.pkt.length - 1][0] - p.x) > 0.25)) {
          b.senast = t; b.pkt.push([p.x, ctx.yForHojd(p.hojd * 0.85) - 0.35 - R() * 0.55]);
          if (b.pkt.length > 7) b.pkt.shift();
        }
        if (p.vinkar && !st.vinkade.get(p.id)) { st.fall.push({ x: p.x, y: ctx.yForHojd(p.hojd), vx: (R() - 0.5) * 1.5, vy: -3.2, l: 0.7, f: 'glod', t: 0 }); st.onskeT = 2.5; st.onskeX = p.x; }
        st.vinkade.set(p.id, p.vinkar);
      }
      for (const [id, b] of st.bilder) {
        if (!input.personer.some(p => p.id === id)) b.borta = (b.borta || 0) + dt;
        const a = Math.max(0, 1 - (b.borta || 0) / 7);
        if (a <= 0) { st.bilder.delete(id); continue; }
        g.strokeStyle = ctx.rgba('is', 0.45 * a); g.lineWidth = 0.005; g.beginPath();
        b.pkt.forEach(([x, y], i) => i ? g.lineTo(x, y) : g.moveTo(x, y)); g.stroke();
        for (const [x, y] of b.pkt) { g.fillStyle = ctx.rgba('krita', a); g.beginPath(); g.arc(x, y, 0.014, 0, 7); g.fill(); g.fillStyle = ctx.rgba('is', 0.25 * a); g.beginPath(); g.arc(x, y, 0.04, 0, 7); g.fill(); }
        if (b.pkt.length > 2 && !b.borta) {
          const [lx, ly] = b.pkt[b.pkt.length - 1], k = ctx.kolumnVid(lx);
          if (k) ctx.text('Stjärnbilden ' + b.namn, k.x + 0.05, Math.min(ly + 0.1, k.rutor[k.rutor.length - 1].y + k.rutor[k.rutor.length - 1].h - 0.05), { typ: 'mono', storlek: 0.038, alpha: a * 0.8, maxBredd: k.w - 0.1 });
        }
      }
      // ---- text ----
      if (st.warp > 0.4) {
        const r = ctx.rutaNr(7), a = Math.min(1, (st.warp - 0.4) * 3);
        ctx.text('Ljuset hinner', r.x + 0.08, r.y + 0.2, { storlek: 0.08, alpha: a });
        ctx.text('300 000 km', r.x + 0.08, r.y + 0.31, { storlek: 0.08, alpha: a, farg: ctx.farg.glod });
        ctx.text('på en sekund.', r.x + 0.08, r.y + 0.42, { storlek: 0.08, alpha: a });
      }
      if (st.onskeT > 0) {
        st.onskeT -= dt; const k = ctx.kolumnVid(st.onskeX) || ctx.kolumner[0];
        ctx.text('Önska något!', k.cx, k.rutor[0].cy, { storlek: 0.1, align: 'center', vikt: 700, farg: ctx.farg.glod, alpha: Math.min(1, st.onskeT) });
      }
    }
  });

  function nyttFall(st, ctx) {
    const R = st.rnd, fran = R() < 0.5 ? -1 : 1;
    return { x: fran < 0 ? -0.5 + R() * ctx.W * 0.5 : ctx.W * 0.5 + R() * ctx.W * 0.5 + 0.5, y: -0.3, vx: -fran * (2.5 + R() * 2), vy: 1.2 + R() * 1.4, l: 0.5 + R() * 0.5, f: ['krita', 'is', 'glod'][Math.floor(R() * 3)], t: 0 };
  }
})();
