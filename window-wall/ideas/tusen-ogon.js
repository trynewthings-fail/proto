// A3 · Tusen ögon — mörkret är fullt av slutna ögon. När någon går förbi vaknar de
// i en våg runt personen och följer efter. Den som står still blir sedd av alla.
(function () {
  const IRIS = ['orange', 'is', 'rosa', 'norrsken', 'glod'];

  Nattfonster.registrera({
    id: 'tusen-ogon',
    cat: 'visual', by: 'Linus',
    en: { titel: 'A thousand eyes', fraga: 'Who has the most eyes?', verb: 'walk by, stop, sneak' },
    pitch: {
      tagline: { sv: 'Mörkret är fullt av slutna ögon. De vaknar där du går.', en: 'The dark is full of closed eyes. They wake up wherever you walk.' },
      players: ['crowd', { sv: 'Alla', en: 'Anyone' }], mode: 'ambient', round: { sv: 'Hela kvällen', en: 'All evening' },
      input: [['cam', { sv: 'Djupkamera: position, avstånd, stå still', en: 'Depth cam: position, distance, standing still' }]],
      for: ['kid', 'teen', 'family'],
      how: [
        { sv: 'Gå förbi: ögonen öppnas i en våg runt dig.', en: 'Walk by: eyes open in a wave around you.' },
        { sv: 'Smyg långt från glaset: färre vaknar.', en: 'Sneak by far from the glass: fewer wake up.' },
        { sv: 'Stå still: alla ögon på hela fasaden stirrar på dig.', en: 'Stand still: every eye on the façade stares at you.' }
      ],
      trick: { sv: 'Femton ögon i varje ruta, utspridda så att mörkret mellan spröjsen känns som en sagoskog.', en: 'Fifteen eyes in every pane, scattered so the dark between the mullions feels like a fairy-tale forest.' },
      needs: [['projector', { sv: 'Projektor', en: 'Projector' }], ['cam', { sv: 'Djupkamera', en: 'Depth cam' }]],
      open: [{ sv: 'För läskigt för små barn?', en: 'Too scary for small kids?' }, { sv: 'Syns de minsta ögonen från andra sidan torget?', en: 'Do the smallest eyes show from across the plaza?' }],
      meters: { read: 3, crowd: 4, effort: 1 }
    },
    titel: 'Tusen ögon', steam: 'S', spar: 'C', stil: 'natt',
    fraga: 'Vem har flest ögon?', verb: 'gå förbi, stanna, smyga',
    lage: 'interaktiv', indata: ['personer'], langd: 60, stamning: 'kittlande läskigt, sagoskog',

    setup(ctx) {
      const rnd = ctx.slump(77), ogon = [];
      for (const ru of ctx.rutor) {
        let forsok = 0;
        while (forsok++ < 400 && ogon.filter(o => o.ru === ru).length < 15) {
          const w = 0.05 + Math.pow(rnd(), 2.2) * 0.2;
          const x = ru.x + w * 0.6 + rnd() * (ru.w - w * 1.2), y = ru.y + w * 0.4 + rnd() * (ru.h - w * 0.8);
          if (ogon.some(o => Math.abs(o.x - x) < (o.w + w) * 0.55 && Math.abs(o.y - y) < (o.w + w) * 0.3)) continue;
          ogon.push({ ru, x, y, w, oppen: 0, blick: [0, 0], mal: [rnd() - 0.5, rnd() - 0.5], iris: IRIS[Math.floor(rnd() * 5)],
            blinkVid: rnd() * 6, slump: rnd(), latT: rnd() * 10 });
        }
      }
      ogon.sort((a, b) => a.w - b.w);
      return { ogon, rnd };
    },

    frame(ctx, st, input) {
      const { g, t, dt } = ctx, R = st.rnd;
      const personer = input.personer.filter(p => p.avstand < 5);
      const still = personer.some(p => p.still > 2);
      for (const o of st.ogon) {
        let mal = 0, p = null, bd = 1e9;
        for (const q of personer) { const d = Math.abs(q.x - o.x); if (d < bd) { bd = d; p = q; } }
        if (p) {
          const rack = still ? 9 : 1.4 + (1 - Math.min(1, p.avstand / 5)) * 1.2;
          mal = bd < rack ? 1 : 0;
          o.mal = Rita.blick(o.x, o.y, p.x, ctx.yForHojd(p.hojd * 0.93), 1.2, 1.0);
        } else {
          // när ingen är här vaknar några få lata ögon ibland
          o.latT -= dt;
          if (o.latT < 0) { o.latT = 4 + R() * 12; o.lat = R() < 0.12 ? 2 + R() * 3 : 0; o.mal = [(R() - 0.5) * 2, (R() - 0.5) * 1.4]; }
          if (o.lat > 0) { o.lat -= dt; mal = 0.7; }
        }
        // öppnas med fördröjning beroende på storlek: små ögon är snabbast
        const fart = mal > o.oppen ? 3 + (1 - o.w * 4) * 3 : 1.4;
        o.oppen += Math.sign(mal - o.oppen) * Math.min(Math.abs(mal - o.oppen), dt * fart * (0.6 + o.slump * 0.8));
        o.blick[0] += (o.mal[0] - o.blick[0]) * Math.min(1, dt * 7);
        o.blick[1] += (o.mal[1] - o.blick[1]) * Math.min(1, dt * 7);
        let lock = 1 - o.oppen * 0.97;
        const bt = t - o.blinkVid;
        if (bt > 0 && bt < 0.14) lock = Math.max(lock, 1 - Math.abs(bt - 0.07) / 0.07);
        if (bt >= 0.14) o.blinkVid = t + 2 + R() * 6;
        if (lock > 0.93) { // slutet öga: en liten båge (ögonfransar)
          g.strokeStyle = ctx.rgba('krita', 0.28); g.lineWidth = Math.max(0.003, o.w * 0.05); g.lineCap = 'round';
          g.beginPath(); g.moveTo(o.x - o.w * 0.45, o.y); g.quadraticCurveTo(o.x, o.y + o.w * 0.18, o.x + o.w * 0.45, o.y); g.stroke();
          continue;
        }
        Rita.oga(g, { x: o.x, y: o.y, w: o.w, h: o.w * 0.4, blick: o.blick, lock, pupill: still ? 1.4 : 1,
          iris: ctx.farg[o.iris], vit: ctx.farg.krita, kant: ctx.farg.kant, kontur: ctx.kontur(o.w * 0.05) });
      }
    }
  });
})();
