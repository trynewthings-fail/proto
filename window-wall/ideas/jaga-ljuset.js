// A1b · Jaga ljuset — rutorna blinkar i mönster. När någon kommer blir det en lek:
// en ruta lyser, spring dit och fånga den. Mjuka toningar, aldrig stroboskop.
(function () {
  // rutnätet räknas fram: COLS kolumner × ROWS rader (just nu 6 × 2)
  function ordningar(COLS, ROWS) {
    const ring = [], orm = [];
    for (let c = 0; c < COLS; c++) ring.push(c);
    for (let r = 1; r < ROWS; r++) ring.push(r * COLS + COLS - 1);
    for (let c = COLS - 2; c >= 0; c--) ring.push((ROWS - 1) * COLS + c);
    for (let r = ROWS - 2; r > 0; r--) ring.push(r * COLS);
    for (let c = 0; c < COLS; c++) for (let r = 0; r < ROWS; r++) orm.push((c % 2 ? ROWS - 1 - r : r) * COLS + c);
    return { jaga: ring, spiral: orm };
  }
  const MONSTER = ['jaga', 'regn', 'schack', 'vag', 'spiral', 'slump', 'puls'];
  const FORMER = ['cirkel', 'ruta', 'stjarna', 'hjarta', 'cirkel', 'ruta', 'stjarna'];
  const FARGER = ['orange', 'is', 'rosa', 'glod', 'norrsken', 'orange', 'is'];

  function form(g, typ, x, y, r) {
    g.beginPath();
    if (typ === 'cirkel') g.arc(x, y, r, 0, 7);
    else if (typ === 'ruta') g.roundRect(x - r, y - r, 2 * r, 2 * r, r * 0.3);
    else if (typ === 'stjarna') {
      for (let i = 0; i < 10; i++) { const a = -Math.PI / 2 + i * Math.PI / 5, rr = i % 2 ? r * 0.45 : r * 1.1; g.lineTo(x + Math.cos(a) * rr, y + Math.sin(a) * rr); }
      g.closePath();
    } else { // hjärta
      g.moveTo(x, y + r * 0.9);
      g.bezierCurveTo(x - r * 1.5, y - r * 0.1, x - r * 0.7, y - r * 1.2, x, y - r * 0.45);
      g.bezierCurveTo(x + r * 0.7, y - r * 1.2, x + r * 1.5, y - r * 0.1, x, y + r * 0.9);
    }
  }

  Nattfonster.registrera({
    id: 'jaga-ljuset',
    cat: 'arcade', by: 'Linus',
    en: { titel: 'Chase the light', fraga: 'Can you find the pattern?', verb: 'run, catch, guess the next one' },
    pitch: {
      tagline: { sv: 'En ruta lyser. Spring dit och fånga den!', en: 'One pane glows. Run there and catch it!' },
      players: ['group', '1–6'], mode: 'coop', round: { sv: 'Släpp in när du vill', en: 'Drop in' },
      input: [['cam', { sv: 'Djupkamera: vilken kolumn du står vid', en: 'Depth cam: which column you are at' }]],
      for: ['kid', 'family'],
      how: [
        { sv: 'När ingen är där blinkar rutorna i mönster.', en: 'When nobody is there the panes blink in patterns.' },
        { sv: 'Kom nära: en ruta börjar glöda.', en: 'Come close: one pane starts to glow.' },
        { sv: 'Spring till dess kolumn så är den fångad, och nästa tänds.', en: 'Run to its column to catch it, and the next one lights up.' }
      ],
      trick: { sv: 'Varje ruta är en lampa och spröjsen ramar in dem, som ett discogolv på högkant.', en: 'Every pane is a lamp framed by the mullions, like a dance floor stood on its side.' },
      needs: [['projector', { sv: 'Projektor', en: 'Projector' }], ['cam', { sv: 'Djupkamera', en: 'Depth cam' }]],
      open: [{ sv: 'Räcker kolumnen, eller ska övre och nedre rutan fångas var för sig?', en: 'Is the column enough, or should top and bottom panes be caught separately?' }, { sv: 'Behövs en klocka eller topplista?', en: 'Does it need a timer or a high score?' }],
      meters: { read: 5, crowd: 4, effort: 1 }
    },
    titel: 'Jaga ljuset', steam: 'M', spar: 'B', stil: 'neon',
    fraga: 'Kan du hitta mönstret?', verb: 'springa, fånga, gissa nästa',
    lage: 'ambient → spel', indata: ['personer'], langd: 60, stamning: 'lekplats, discogolv, andfådd glädje',
    knappar: [{ namn: 'Nästa mönster', gor: s => { s.mi = (s.mi + 1) % MONSTER.length; s.mT = 0; } }],

    setup(ctx) {
      return { L: new Array(12).fill(0), F: new Array(12).fill('orange'), ko: [], steg: 0, stegT: 0, mi: 0, mT: 0,
        mal: null, fangade: 0, firaT: 0, kandaKol: new Map(), rnd: ctx.slump(5) };
    },

    frame(ctx, st, input) {
      const { g, dt, t, rutor } = ctx;
      const COLS = ctx.kolumner.length, ROWS = ctx.kolumner[0].rutor.length, N = COLS * ROWS;
      const ORDNING = st.ord || (st.ord = ordningar(COLS, ROWS));
      const gi = r => r.rad * COLS + r.kol;           // rutnätsindex
      const rutaGi = i => rutor.find(r => gi(r) === i);
      const tand = (i, f, styrka = 1) => { st.L[i] = Math.max(st.L[i], styrka); st.F[i] = f; };
      const krusning = (fran, f, regnbage) => {
        const r0 = rutaGi(fran);
        for (const r of rutor) {
          const d = Math.abs(r.kol - r0.kol) + Math.abs(r.rad - r0.rad);
          st.ko.push({ t: t + d * 0.11, i: gi(r), f: regnbage ? FARGER[d % FARGER.length] : f });
        }
      };
      st.ko = st.ko.filter(k => { if (k.t <= t) { tand(k.i, k.f); return false; } return true; });

      const narvarande = input.personer.filter(p => p.avstand < 3.5);
      // ---- lek: jaga ljuset ----
      if (narvarande.length) {
        if (st.mal === null) { st.mal = Math.floor(st.rnd() * N); }
        const malR = rutaGi(st.mal);
        tand(st.mal, 'glod', 0.75 + 0.25 * Math.sin(t * 6));
        for (const p of narvarande) {
          const k = ctx.kolumnVid(p.x);
          if (k && k.kol === malR.kol) {
            st.fangade++; st.firaT = 1.6; krusning(st.mal, 'norrsken', true);
            let ny; do { ny = Math.floor(st.rnd() * N); } while (rutaGi(ny).kol === malR.kol);
            st.mal = ny; break;
          }
          if (p.vinkar && !st.kandaKol.get(p.id)) { st.kandaKol.set(p.id, true); if (k) krusning(gi(k.rutor[1]), 'rosa', true); }
          if (!p.vinkar) st.kandaKol.set(p.id, false);
        }
      } else {
        st.mal = null;
        // ---- mönster när ingen är här ----
        st.mT += dt; if (st.mT > 8) { st.mT = 0; st.mi = (st.mi + 1) % MONSTER.length; }
        st.stegT += dt;
        if (st.stegT > 0.26) {
          st.stegT = 0; st.steg++;
          const k = st.steg, m = MONSTER[st.mi], f = FARGER[st.mi];
          let tanda = [];
          if (m === 'jaga' || m === 'spiral') tanda = [ORDNING[m][k % ORDNING[m].length]];
          else if (m === 'regn') { const c = Math.floor(k / ROWS) % COLS; tanda = [(k % ROWS) * COLS + c]; }
          else if (m === 'schack') tanda = k % 2 ? [] : [...Array(N).keys()].filter(i => ((i % COLS) + Math.floor(i / COLS) + Math.floor(k / 2)) % 2 === 0);
          else if (m === 'vag') { const d = k % (COLS + ROWS - 1); tanda = [...Array(N).keys()].filter(i => (i % COLS) + Math.floor(i / COLS) === d); }
          else if (m === 'slump') tanda = [Math.floor(st.rnd() * N), Math.floor(st.rnd() * N)];
          else if (m === 'puls') tanda = k % 4 === 0 ? [...Array(N).keys()] : [];
          tanda.forEach(i => tand(i, f, m === 'puls' ? 0.7 : 1));
        }
      }

      // ---- rita lamporna ----
      const typ = narvarande.length ? 'cirkel' : FORMER[st.mi];
      for (const r of rutor) {
        const i = gi(r), L = st.L[i];
        st.L[i] = Math.max(0, L - dt * 2.2);
        const R = Math.min(r.w * 0.4, r.h * 0.36), cx = r.cx, cy = r.cy;
        // släckt lampa: en tunn kontur
        g.lineWidth = ctx.kontur(0.006); g.strokeStyle = ctx.rgba('krita', 0.16);
        form(g, typ, cx, cy, R); g.stroke();
        if (L <= 0.01) continue;
        const col = ctx.farg[st.F[i]];
        const grad = g.createRadialGradient(cx, cy, 0, cx, cy, R * 1.9);
        grad.addColorStop(0, Rita.rgba(col, 0.18 * L)); grad.addColorStop(1, Rita.rgba(col, 0));
        g.fillStyle = grad; g.fillRect(r.x, r.y, r.w, r.h);
        form(g, typ, cx, cy, R * (0.85 + 0.15 * L));
        g.globalAlpha = Math.min(1, L * 1.3); ctx.form(col, { fyllAlpha: 0.3 * L, bredd: ctx.linje(1.2) }); g.globalAlpha = 1;
      }

      // ---- text ----
      const MNAMN = { jaga: 'RUNDGÅNG', regn: 'REGN', schack: 'SCHACKRUTOR', vag: 'DIAGONAL', spiral: 'ORMEN', slump: 'SLUMP?', puls: 'PULS' };
      if (!narvarande.length) {
        const r = ctx.rutaNr(1);
        ctx.text('MÖNSTER', r.x + 0.08, r.y + 0.12, { typ: 'mono', storlek: 0.045, alpha: 0.7 });
        ctx.text(MNAMN[MONSTER[st.mi]], r.x + 0.08, r.y + 0.19, { typ: 'mono', storlek: 0.045, farg: ctx.farg[FARGER[st.mi]] });
        const r7 = ctx.rutaNr(7);
        ctx.text('Vilken ruta', r7.x + 0.08, r7.y + 0.16, { storlek: 0.075, alpha: 0.85, maxBredd: r7.w - 0.14 });
        ctx.text('tänds sen?', r7.x + 0.08, r7.y + 0.25, { storlek: 0.075, alpha: 0.85, maxBredd: r7.w - 0.14 });
      }
      if (narvarande.length) {
        const r = ctx.rutaNr(1);
        ctx.text('SPRING TILL LJUSET', r.x + 0.08, r.y + 0.12, { typ: 'mono', storlek: 0.05, alpha: 0.8 });
        ctx.text(`FÅNGADE ${st.fangade}`, r.x + 0.08, r.y + 0.2, { typ: 'mono', storlek: 0.05, farg: ctx.farg.glod, alpha: 0.9 });
        if (st.firaT > 0) {
          st.firaT -= dt; const r7 = ctx.rutaNr(7);
          ctx.text('Fångad!', r7.cx, r7.cy + 0.07, { storlek: 0.2, align: 'center', vikt: 700, alpha: Math.min(1, st.firaT) });
        }
      }
    }
  });
})();
