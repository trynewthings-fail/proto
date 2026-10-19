// A2 · Huset tittar — ett stort öga i varje ruta. De blinkar, tittar på varandra
// och följer den som går förbi. Vinka så kisar de glatt. Sent på kvällen blir de sömniga.
(function () {
  const IRIS = ['orange', 'is', 'rosa', 'norrsken', 'glod', 'is', 'orange', 'rosa', 'glod', 'norrsken', 'orange', 'is'];

  Nattfonster.registrera({
    id: 'huset-tittar',
    cat: 'visual', by: 'Linus',
    en: { titel: 'The house is watching', fraga: 'How does an eye see?', verb: 'look back, come close, wave' },
    pitch: {
      tagline: { sv: 'Ett stort öga i varje ruta, och alla följer dig när du går förbi.', en: 'A big eye in every pane, and they all follow you as you walk by.' },
      players: ['crowd', { sv: 'Alla', en: 'Anyone' }], mode: 'ambient', round: { sv: 'Hela kvällen', en: 'All evening' },
      input: [['cam', { sv: 'Djupkamera: position, längd, vinka', en: 'Depth cam: position, height, waving' }], ['clock', { sv: 'Klockan: sömniga efter 22', en: 'Clock: sleepy after 10 pm' }]],
      for: ['kid', 'family'],
      how: [
        { sv: 'Gå förbi: tolv ögon vänder sig efter dig.', en: 'Walk by: twelve eyes turn to follow you.' },
        { sv: 'Gå nära: pupillerna blir stora.', en: 'Come close: the pupils grow big.' },
        { sv: 'Vinka: alla ögon kisar glatt.', en: 'Wave: all the eyes squint happily.' }
      ],
      trick: { sv: 'Varje ruta blir ett öga. Fasaden får tolv ögon som blinkar i en våg över spröjsen.', en: 'Every pane becomes one eye. The façade gets twelve eyes that blink in a wave across the mullions.' },
      needs: [['projector', { sv: 'Projektor', en: 'Projector' }], ['cam', { sv: 'Djupkamera', en: 'Depth cam' }]],
      open: [{ sv: 'Vem följer ögonen när många går förbi samtidigt?', en: 'Who do the eyes follow when lots of people pass at once?' }, { sv: 'Gulligt eller läskigt för de minsta?', en: 'Cute or scary for the youngest?' }],
      meters: { read: 5, crowd: 4, effort: 1 }
    },
    titel: 'Huset tittar', steam: 'S', spar: 'C', stil: 'pop',
    fraga: 'Hur ser ett öga?', verb: 'titta tillbaka, gå nära, vinka',
    lage: 'interaktiv', indata: ['personer', 'tid'], langd: 60, stamning: 'nyfiken, lite busig',
    knappar: [
      { namn: 'Alla blinkar', gor: (s, ctx) => s.ogon.forEach((o, i) => o.blinkVid = ctx.t + 0.05 * o.ru.kol + 0.02 * i) },
      { namn: 'Glada', gor: (s, ctx) => s.gladT = 2.5 }
    ],

    setup(ctx) {
      const rnd = ctx.slump(31);
      return {
        rnd, gladT: 0, synkT: 6, synkMal: null, vagT: 14,
        ogon: ctx.rutor.map((ru, i) => ({
          ru, i, x: ru.cx, y: ru.cy, w: ru.w * (0.86 + rnd() * 0.06), blick: [0, 0], mal: [0, 0],
          nastaBlick: rnd() * 2, blinkVid: 1 + rnd() * 5, pupill: 1, vidd: 1
        }))
      };
    },

    frame(ctx, st, input) {
      const { g, t, dt } = ctx, R = st.rnd;
      const timme = input.tid.getHours() + input.tid.getMinutes() / 60;
      const somnig = timme >= 22 || timme < 6 ? 0.5 : 0;
      st.synkT -= dt; st.vagT -= dt; st.gladT -= dt;
      if (st.synkT < 0) { st.synkT = 9 + R() * 8; st.synkMal = { x: R() * ctx.W, y: -1.5 + R() * 1.2, t: 2.2 }; } // alla tittar upp mot något
      if (st.synkMal) { st.synkMal.t -= dt; if (st.synkMal.t < 0) st.synkMal = null; }
      if (st.vagT < 0) { st.vagT = 12 + R() * 10; st.ogon.forEach(o => o.blinkVid = t + o.ru.kol * 0.09 + o.ru.rad * 0.05); }
      if (input.personer.some(p => p.vinkar && p.avstand < 4)) st.gladT = Math.max(st.gladT, 1.2);

      for (const o of st.ogon) {
        const p = Rita.narmast(input.personer, o.x, 6);
        if (p) {
          const ty = ctx.yForHojd(p.hojd * 0.93);
          o.mal = Rita.blick(o.x, o.y, p.x, ty, 1.4, 1.1);
          const nara = Math.max(0, 1 - p.avstand / 1.5);
          o.pupill = 1 + nara * 0.5; o.vidd = 1 + nara * 0.12;
        } else if (st.synkMal) {
          o.mal = Rita.blick(o.x, o.y, st.synkMal.x, st.synkMal.y, 1.4, 1.1); o.pupill = 0.85; o.vidd = 1.05;
        } else {
          o.pupill = 1; o.vidd = 1;
          if (t > o.nastaBlick) {
            const val = R();
            if (val < 0.35) { // titta på grannen
              const gr = st.ogon[(o.i + (R() < 0.5 ? 1 : 11)) % 12];
              o.mal = Rita.blick(o.x, o.y, gr.x, gr.y, 1.4, 1.1);
            } else o.mal = [(R() - 0.5) * 1.8, (R() - 0.5) * 1.4];
            o.nastaBlick = t + 0.8 + R() * 2.8;
          }
        }
        o.blick[0] += (o.mal[0] - o.blick[0]) * Math.min(1, dt * 9);
        o.blick[1] += (o.mal[1] - o.blick[1]) * Math.min(1, dt * 9);
        // blink: 0,14 s triangel
        let lock = somnig * (0.8 + 0.2 * Math.sin(t * 0.7 + o.i));
        const bt = t - o.blinkVid;
        if (bt > 0 && bt < 0.16) lock = Math.max(lock, 1 - Math.abs(bt - 0.08) / 0.08);
        if (bt >= 0.16) o.blinkVid = t + 2.5 + R() * 5.5;
        Rita.oga(g, {
          x: o.x, y: o.y, w: o.w * o.vidd, h: o.w * 0.4 * o.vidd, blick: o.blick, lock, glad: st.gladT > 0 ? 1 : 0,
          pupill: o.pupill, iris: ctx.farg[IRIS[o.i]], vit: ctx.farg.krita, kant: ctx.farg.kant, kontur: ctx.kontur(0.018)
        });
      }
      if (somnig) {
        const r = ctx.rutaNr(8), a = 0.5 + 0.5 * Math.sin(t * 1.2);
        ctx.text('z', r.x + r.w - 0.25, r.y + 0.2 - (t % 3) * 0.03, { storlek: 0.1, alpha: a * 0.7 });
        ctx.text('Z', r.x + r.w - 0.14, r.y + 0.14 - (t % 3) * 0.03, { storlek: 0.14, alpha: a });
      }
    }
  });
})();
