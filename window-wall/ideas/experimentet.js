// T1 · Du är experimentet — spår C, läge interaktiv
// Huset för forskarlogg över kvällens förbipasserande. Varje person blir ett exemplar.
// Den som stannar mäts. Den som vinkar får svar. Huset prövar hypoteser i realtid.
(function () {
  const SKROLL = 0.45;     // m/s som x–t-diagrammet stiger (den som står still ritar ett lodrätt streck)
  const HIST = 10;         // s historik
  const HYP_KOL = 2;       // kolumnen hypotes 1 gäller (högra kolumnen i vänstra fönstret)

  const f1 = x => x.toFixed(1).replace('.', ',');
  const hms = d => d.toLocaleTimeString('sv-SE', { hour: '2-digit', minute: '2-digit', second: '2-digit' });
  const nr4 = n => '#' + String(n).padStart(4, '0');

  Nattfonster.registrera({
    id: 'experimentet',
    cat: 'visual', by: 'Linus',
    en: { titel: 'You are the experiment', fraga: 'Who is studying whom?', verb: 'be observed, stop, wave' },
    pitch: {
      tagline: { sv: 'Huset för forskarlogg över alla som går förbi. Du är exemplar #0042.', en: 'The house keeps a lab log of everyone who walks by. You are specimen #0042.' },
      players: ['crowd', { sv: 'Alla', en: 'Anyone' }], mode: 'ambient', round: { sv: 'Hela kvällen', en: 'All evening' },
      input: [['cam', { sv: 'Djupkamera: position, fart, stå still, vinka', en: 'Depth cam: position, speed, standing still, waving' }]],
      for: ['teen', 'all'],
      how: [
        { sv: 'Gå förbi: du får ett nummer och ett spår i diagrammet.', en: 'Walk by: you get a number and a trace in the graph.' },
        { sv: 'Stanna: huset mäter hur långt från glaset du står.', en: 'Stop: the house measures how far from the glass you are.' },
        { sv: 'Vinka: huset försöker kommunicera tillbaka.', en: 'Wave: the house tries to communicate back.' }
      ],
      trick: { sv: 'Logg, räknare, hypotes och histogram får varsin ruta. Text som följer dig låses till din kolumn så den aldrig korsar en spröjs.', en: 'Log, counter, hypothesis and histogram get a pane each. Text that follows you snaps to your column so it never crosses a mullion.' },
      needs: [['projector', { sv: 'Projektor', en: 'Projector' }], ['cam', { sv: 'Djupkamera', en: 'Depth cam' }]],
      open: [{ sv: 'Känns det roligt eller obehagligt att bli mätt?', en: 'Does being measured feel funny or creepy?' }, { sv: 'Går den lilla texten att läsa från torget?', en: 'Can the small text be read from the plaza?' }],
      meters: { read: 2, crowd: 3, effort: 2 }
    },
    titel: 'Du är experimentet', steam: 'T', spar: 'C',
    fraga: 'Vem undersöker vem?', verb: 'bli observerad, stanna, vinka',
    lage: 'interaktiv', indata: ['personer'], langd: 0, stamning: 'torr humor, millimeterpapper',

    knappar: [{ namn: 'Nollställ kvällen', gor: (s, ctx) => Object.assign(s, Nattfonster.aktiv.setup(ctx)) }],

    setup(ctx) {
      return {
        logg: [], kanda: new Map(), arkiv: [], tystT: 20, samp: 0,
        stat: { antal: 0, farter: [], vanster: 0, hoger: 0, stillaAvst: [], gaAvst: [], passerade: 0, saktade: 0 }
      };
    },

    frame(ctx, st, input) {
      const { g, W, H, t, dt, farg } = ctx, nu = input.tid;
      const logga = txt => { st.logg.push({ tid: hms(nu), txt, t0: t }); if (st.logg.length > 9) st.logg.shift(); };
      const hk = ctx.kolumner[HYP_KOL];

      // ---- spåra exemplar ----
      const synliga = new Set();
      for (const p of input.personer) {
        synliga.add(p.id);
        let e = st.kanda.get(p.id);
        if (!e) { e = { nr: p.nr, spar: [], fs: 0, fn: 0, inS: 0, inN: 0, utS: 0, utN: 0, stannat: false, vinkat: false, loggad: false, avst: p.avstand, inFran: 0 }; st.kanda.set(p.id, e); }
        e.p = p; e.avst = p.avstand;
        if (!e.loggad && p.tidI > 0.6) {
          e.loggad = true; e.inFran = p.riktning;
          logga(`${nr4(e.nr)} in ${p.riktning > 0 ? '→' : p.riktning < 0 ? '←' : '·'} ${f1(p.fart)} m/s`);
        }
        if (p.fart > 0.2) {
          e.fs += p.fart; e.fn++;
          const iKol = Math.abs(p.x - hk.cx) < hk.w / 2;
          if (iKol) { e.inS += p.fart; e.inN++; } else { e.utS += p.fart; e.utN++; }
        }
        if (Math.abs(p.x - hk.cx) < hk.w / 2 && p.still > 0.5) e.stoppIKol = true;
        if (!e.stannat && p.still > 2) {
          e.stannat = true;
          const k = ctx.kolumnVid(p.x);
          logga(`${nr4(e.nr)} stannar${k ? ' vid ruta ' + k.rutor[k.rutor.length - 1].nr : ''}. Varför?`);
        }
        if (!e.vinkat && p.vinkar) { e.vinkat = true; e.vinkT = t; logga(`${nr4(e.nr)} vinkar. Vi vinkar tillbaka.`); }
      }
      // sampla spår för x–t-diagrammet
      st.samp += dt;
      if (st.samp > 0.1) {
        st.samp = 0;
        for (const e of st.kanda.values()) if (synliga.has(e.p.id)) e.spar.push([t, e.p.x]);
      }
      // de som lämnat fältet
      for (const [id, e] of st.kanda) {
        if (synliga.has(id)) continue;
        st.kanda.delete(id); st.arkiv.push(e);
        if (!e.loggad) continue;
        const s = st.stat; s.antal++;
        const medel = e.fn ? e.fs / e.fn : 0; if (medel > 0) s.farter.push(medel);
        if (e.inFran < 0) s.vanster++; else if (e.inFran > 0) s.hoger++;
        (e.stannat ? s.stillaAvst : s.gaAvst).push(e.avst);
        if (e.inN > 2 || e.stoppIKol) {
          s.passerade++;
          const ut = e.utN ? e.utS / e.utN : medel, inn = e.inN ? e.inS / e.inN : ut;
          if (e.stoppIKol || inn < ut * 0.85) s.saktade++;
        }
        logga(`${nr4(e.nr)} ut · ${Math.round(e.p.tidI)} s i fältet`);
      }
      st.arkiv = st.arkiv.filter(e => e.spar.length && t - e.spar[e.spar.length - 1][0] < HIST);
      if (input.personer.length === 0) { st.tystT += dt; if (st.tystT > 25) { st.tystT = 0; logga('Inga exemplar. Väntar.'); } }
      else st.tystT = 0;

      // ---- millimeterpapper ----
      g.lineWidth = 0.002; g.strokeStyle = farg.is;
      for (let x = 0; x <= W; x += 0.1) { g.globalAlpha = Math.abs(x / 0.5 - Math.round(x / 0.5)) < 0.01 ? 0.13 : 0.05; g.beginPath(); g.moveTo(x, 0); g.lineTo(x, H); g.stroke(); }
      for (let y = 0; y <= H; y += 0.1) { g.globalAlpha = Math.abs(y / 0.5 - Math.round(y / 0.5)) < 0.01 ? 0.13 : 0.05; g.beginPath(); g.moveTo(0, y); g.lineTo(W, y); g.stroke(); }
      g.globalAlpha = 1;

      // ---- x–t-diagram: varje exemplars väg stiger uppåt med tiden ----
      const bas = H - 0.25;
      g.lineWidth = 0.004; g.strokeStyle = farg.krita;
      for (const e of [...st.arkiv, ...st.kanda.values()]) {
        if (e.spar.length < 2) continue;
        g.globalAlpha = st.kanda.has(e.p.id) ? 0.4 : 0.2;
        g.beginPath();
        e.spar.forEach(([ts, x], i) => { const y = bas - (t - ts) * SKROLL; i ? g.lineTo(x, y) : g.moveTo(x, y); });
        g.stroke();
      }
      g.globalAlpha = 1;

      // ---- exemplaren just nu ----
      const upptagna = new Set(); // kolumner där huset just nu mäter eller svarar
      let forraX = -9, lyft = 0;  // etiketter staplas när folk går tätt
      const nu_ = [...st.kanda.values()].filter(e => e.loggad).sort((a, b) => a.p.x - b.p.x);
      for (const e of nu_) {
        const p = e.p;
        const x = p.x; if (x < -0.2 || x > W + 0.2) continue;
        lyft = x - forraX < 0.55 ? lyft + 1 : 0; forraX = x;
        const ly = bas - lyft * 0.16;
        const fokus = Math.min(1, Math.max(0, (p.still - 1) / 1.2)) * (p.avstand < 3.5 ? 1 : 0.4);
        g.strokeStyle = farg.krita; g.lineWidth = 0.004; g.globalAlpha = 0.8;
        g.beginPath(); g.moveTo(x - 0.05, bas - 0.05); g.lineTo(x - 0.07, bas - 0.05); g.lineTo(x - 0.07, bas + 0.07); g.lineTo(x - 0.05, bas + 0.07);
        g.moveTo(x + 0.05, bas - 0.05); g.lineTo(x + 0.07, bas - 0.05); g.lineTo(x + 0.07, bas + 0.07); g.lineTo(x + 0.05, bas + 0.07); g.stroke();
        g.fillStyle = farg.krita; g.beginPath(); g.arc(x, bas + 0.01, 0.012, 0, 7); g.fill();
        g.globalAlpha = 1;
        ctx.text(nr4(e.nr), x + 0.1, ly, { typ: 'mono', storlek: 0.055, alpha: 0.9 });
        ctx.text(p.fart > 0.2 ? `${f1(p.fart)} m/s ${p.vx > 0 ? '→' : '←'}` : `stilla ${Math.floor(p.still)} s`, x + 0.1, ly + 0.07, { typ: 'mono', storlek: 0.042, alpha: 0.75 });

        // texter som följer en person låses till personens kolumn så att de aldrig korsar en spröjs
        const kol = ctx.kolumnVid(x);
        const svarar = e.vinkat && t - e.vinkT < 6;
        if (kol && (svarar || fokus > 0)) upptagna.add(kol.kol);
        if (fokus > 0 && kol && !svarar) { // mätning av den som stannat
          const ner = kol.rutor[kol.rutor.length - 1];
          const cy = ner.y + 0.38, R = 0.2 + 0.03 * Math.sin(t * 3);
          g.globalAlpha = fokus; g.strokeStyle = farg.orange; g.lineWidth = 0.005;
          g.beginPath(); g.arc(x, cy, R, 0, 7); g.stroke();
          g.beginPath(); g.arc(x, cy, R * 0.45, 0, 7); g.stroke();
          g.beginPath(); g.moveTo(x - R * 1.6, cy); g.lineTo(x + R * 1.6, cy); g.moveTo(x, cy - R * 1.6); g.lineTo(x, cy + R * 1.6); g.stroke();
          for (let i = -8; i <= 8; i++) { const l = i % 4 === 0 ? 0.04 : 0.02; g.beginPath(); g.moveTo(x + i * 0.04, cy + R * 1.6); g.lineTo(x + i * 0.04, cy + R * 1.6 - l); g.stroke(); }
          g.globalAlpha = 1;
          const tx = ner.x + 0.07, o = { typ: 'mono', storlek: 0.05, alpha: fokus, maxBredd: ner.w - 0.14 };
          ctx.text(`${f1(p.avstand)} m från glaset`, tx, ner.y + 0.78, Object.assign({}, o, { farg: farg.orange }));
          ctx.text(`stilla ${Math.floor(p.still)} s`, tx, ner.y + 0.85, Object.assign({}, o, { farg: farg.orange }));
          ctx.text(p.still > 6 ? 'Mycket ovanligt?' : 'Ovanligt beteende?', tx, ner.y + 0.92, o);
        }
        if (svarar && kol) { // huset vinkar tillbaka
          const ru = kol.rutor[kol.rutor.length - 1], a = Math.min(1, (6 - (t - e.vinkT)) / 1.5), cy = ru.y + 0.45;
          g.globalAlpha = a; g.strokeStyle = farg.orange; g.lineWidth = 0.012; g.lineCap = 'round';
          g.beginPath();
          for (let i = 0; i <= 40; i++) { const xx = ru.x + 0.12 + i * (ru.w - 0.24) / 40; const yy = cy + Math.sin(i * 0.5 - t * 9) * 0.07; i ? g.lineTo(xx, yy) : g.moveTo(xx, yy); }
          g.stroke(); g.globalAlpha = 1;
          ctx.text('Försöker', ru.cx, ru.y + 0.16, { typ: 'mono', storlek: 0.05, align: 'center', farg: farg.orange, alpha: a });
          ctx.text('exemplaret', ru.cx, ru.y + 0.22, { typ: 'mono', storlek: 0.05, align: 'center', farg: farg.orange, alpha: a });
          ctx.text('kommunicera?', ru.cx, ru.y + 0.28, { typ: 'mono', storlek: 0.05, align: 'center', farg: farg.orange, alpha: a });
        }
      }

      // ---- ruta 1: forskarloggen ----
      const r1 = ctx.rutaNr(1);
      ctx.text('FORSKARLOGG', r1.x + 0.08, r1.y + 0.11, { typ: 'mono', storlek: 0.05, vikt: 500, alpha: 0.9 });
      ctx.text(nu.toLocaleDateString('sv-SE'), r1.x + r1.w - 0.08, r1.y + 0.11, { typ: 'mono', storlek: 0.04, align: 'right', alpha: 0.6 });
      st.logg.forEach((l, i) => {
        const y = r1.y + 0.22 + i * 0.1, ny = Math.min(1, (t - l.t0) * 3);
        const txt = l.txt.slice(0, Math.floor(l.txt.length * Math.min(1, (t - l.t0) * 2.5)));
        ctx.text(l.tid, r1.x + 0.08, y, { typ: 'mono', storlek: 0.04, alpha: 0.5 * ny });
        ctx.text(txt, r1.x + 0.08, y + 0.045, { typ: 'mono', storlek: 0.045, alpha: 0.9 * ny, maxBredd: r1.w - 0.16 });
      });

      // ---- ruta 2: räknaren ----
      const r2 = ctx.rutaNr(2), s = st.stat;
      ctx.text('I KVÄLL', r2.x + 0.08, r2.y + 0.11, { typ: 'mono', storlek: 0.05, alpha: 0.75 });
      ctx.text(String(s.antal + [...st.kanda.values()].filter(e => e.loggad).length), r2.x + 0.08, r2.y + 0.5, { storlek: 0.36, vikt: 500 });
      ctx.text('exemplar observerade', r2.x + 0.08, r2.y + 0.6, { typ: 'mono', storlek: 0.045, alpha: 0.75 });
      if (s.farter.length) {
        const m = [...s.farter].sort((a, b) => a - b)[Math.floor(s.farter.length / 2)];
        ctx.text(`median ${f1(m)} m/s`, r2.x + 0.08, r2.y + 0.68, { typ: 'mono', storlek: 0.045, alpha: 0.75 });
      }

      // ---- ruta 3: frågan ----
      const r3 = ctx.rutaNr(3);
      st.fragaA = st.fragaA ?? 1;
      const malA = upptagna.has(r3.kol) ? 0 : 1 - Math.min(0.7, input.personer.filter(p => p.still > 1.5).length * 0.35);
      st.fragaA += (malA - st.fragaA) * Math.min(1, dt * 4);
      const lugn = st.fragaA;
      ['Vem', 'under-', 'söker', 'vem?'].forEach((w, i) => ctx.text(w, r3.x + 0.08, r3.y + 0.3 + i * 0.2, { storlek: 0.16, farg: farg.orange, vikt: 500, alpha: lugn, maxBredd: r3.w - 0.14 }));

      // ---- ruta 7: hypotes ----
      const r7 = ctx.rutaNr(7), hi = Math.floor(t / 15) % 3, ha = Math.min(1, (t % 15) * 2, (15 - t % 15) * 2);
      const avg = a => a.length ? a.reduce((x, y) => x + y, 0) / a.length : null;
      const hyp = [
        [['Människor', 'saktar in', `vid ruta ${hk.rutor[hk.rutor.length - 1].nr}?`], s.passerade ? `STÖD: ${s.saktade} av ${s.passerade}` : 'INGA DATA ÄN'],
        [['Går fler', 'åt vänster', 'än åt höger?'], (s.vanster + s.hoger) ? `← ${s.vanster}   → ${s.hoger}` : 'INGA DATA ÄN'],
        [['Står den', 'som stannar', 'närmare?'], (s.stillaAvst.length && s.gaAvst.length) ? `${f1(avg(s.stillaAvst))} m mot ${f1(avg(s.gaAvst))} m` : 'INGA DATA ÄN']
      ][hi];
      ctx.text('HYPOTES ' + (hi + 1), r7.x + 0.08, r7.y + 0.11, { typ: 'mono', storlek: 0.05, alpha: 0.75 });
      hyp[0].forEach((w, i) => ctx.text(w, r7.x + 0.08, r7.y + 0.3 + i * 0.1, { storlek: 0.075, alpha: ha, maxBredd: r7.w - 0.16 }));
      ctx.text(hyp[1], r7.x + 0.08, r7.y + 0.7, { typ: 'mono', storlek: 0.048, farg: farg.orange, alpha: ha, maxBredd: r7.w - 0.16 });

      // ---- ruta 8: histogram över gånghastighet ----
      const r8 = ctx.rutaNr(8), bins = new Array(10).fill(0);
      for (const f of s.farter) bins[Math.min(9, Math.floor(f / 0.25))]++;
      const max = Math.max(1, ...bins), bx = r8.x + 0.1, bw = (r8.w - 0.2) / 10, by = r8.y + r8.h - 0.18, bh = r8.h - 0.38;
      ctx.text('GÅNGHASTIGHET', r8.x + 0.08, r8.y + 0.11, { typ: 'mono', storlek: 0.05, alpha: 0.75 });
      g.fillStyle = farg.krita;
      bins.forEach((b, i) => { const h = b / max * bh; g.globalAlpha = 0.8; g.fillRect(bx + i * bw + 0.008, by - h, bw - 0.016, h); });
      g.globalAlpha = 0.5; g.fillRect(bx, by + 0.005, r8.w - 0.2, 0.004); g.globalAlpha = 1;
      ctx.text('0', bx, by + 0.07, { typ: 'mono', storlek: 0.04, alpha: 0.6 });
      ctx.text('2,5 m/s', bx + r8.w - 0.2, by + 0.07, { typ: 'mono', storlek: 0.04, alpha: 0.6, align: 'right' });
    }
  });
})();
