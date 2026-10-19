// KATEGORI · Idéns namn — en rad om vad den är. (av Förnamn)
// Mall för en ny idé i motorns eget format (rekommenderas). Kopiera till ideas/<id>.js, fyll i och lägg id:t i ideas/index.js.
// Filer som börjar med _ laddas aldrig. Allt ritas i METER: ctx.g är redan skalad, y = 0 vid fönstrens överkant.
(function () {
  Nattfonster.registrera({
    id: 'min-ide',                    // små bokstäver och bindestreck, samma som filnamnet
    cat: 'visual',                    // arcade | puzzle | crafty | visual
    by: 'Förnamn',                    // den som bad om idén
    titel: 'Min idé', steam: 'S',     // titel på svenska; STEAM-bokstav S T E A M
    fraga: 'En nyfiken fråga?', verb: 'gå förbi, vinka',
    en: { titel: 'My idea', fraga: 'A curious question?', verb: 'walk past, wave' },
    lage: 'interaktiv', indata: ['personer'], langd: 60, stamning: 'nyfiken, lekfull',
    pitch: {
      tagline: { sv: 'En mening som säljer idén.', en: 'One sentence that sells it.' },
      players: ['crowd', { sv: 'Alla', en: 'Anyone' }], mode: 'ambient', round: { sv: 'Kom när du vill', en: 'Drop in' },
      input: [['cam', { sv: 'Djupkamera: din position', en: 'Depth cam: your position' }]],
      for: ['kid', 'family'],
      how: [{ sv: 'Steg ett.', en: 'Step one.' }, { sv: 'Steg två.', en: 'Step two.' }, { sv: 'Steg tre.', en: 'Step three.' }],
      trick: { sv: 'Hur idén använder rutorna, spröjsen, tvärposten eller muren.', en: 'How it uses the panes, mullions, transom or pier.' },
      needs: [['projector', { sv: 'Projektor', en: 'Projector' }], ['cam', { sv: 'Djupkamera', en: 'Depth cam' }]],
      open: [{ sv: 'En öppen fråga?', en: 'An open question?' }],
      meters: { read: 4, crowd: 4, effort: 2 }
    },
    knappar: [{ namn: 'Testa', gor: (st, ctx) => { st.puls = 1; } }],   // frivilligt: testknappar i receptkortet

    setup(ctx) { return { puls: 0 }; },   // anropas när idén startar; returnera ditt tillstånd

    frame(ctx, st, input) {               // varje bildruta; måla allt (motorn har redan målat svart)
      const { g, t, dt, rutor } = ctx;
      st.puls = Math.max(0, st.puls - dt);
      for (const r of rutor) {                                   // 12 rutor: {nr, kol 0–5, rad 0–1, x, y, w, h, cx, cy} i meter
        const p = Rita.narmast(input.personer, r.cx, 4);          // närmaste person framför rutan (eller null)
        const ljus = (p ? 1 - Math.min(1, p.avstand / 4) : 0.2) + st.puls;
        g.fillStyle = ctx.rgba(ctx.steamFarg('S'), Math.min(1, ljus) * 0.8);
        g.beginPath(); g.arc(r.cx, r.cy, Math.min(r.w, r.h) * 0.35 * (1 + 0.05 * Math.sin(t * 3 + r.nr)), 0, 7); g.fill();
      }
      const p = input.personer.find(q => q.vinkar);
      if (p) { const k = ctx.kolumnVid(p.x); if (k) ctx.text('Hej!', k.cx, k.rutor[0].cy, { storlek: 0.18, align: 'center', vikt: 800 }); }
    }
  });
})();
