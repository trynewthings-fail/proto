// S8 · Spökteatern — skuggteatern i Halloween-tema. Pumpaorange lyktduk som skymmer mot lila,
// stor fullmåne med en häxa som flyger förbi, döda träd, gravstenar och lysande pumpor.
// Fladdermöss fladdrar förbi (vinka så sprider de sig), en svart katt skjuter rygg när du kommer nära,
// ett spöke svävar genom väggarna och besökarnas skuggor får häxhattar.
// STEAM: S, fladdermöss hittar i mörkret med ljud (ekolokalisering).
(function () {
  const ell = (g, x, y, rx, ry, rot = 0) => { g.beginPath(); g.ellipse(x, y, rx, ry, rot, 0, 7); g.fill(); };
  const tri = (g, a, b, c) => { g.beginPath(); g.moveTo(...a); g.lineTo(...b); g.lineTo(...c); g.closePath(); g.fill(); };
  function ben(g, x, y0, len, vinkel, w) { g.lineWidth = w; g.lineCap = 'round'; g.beginPath(); g.moveTo(x, y0); g.lineTo(x + Math.sin(vinkel) * len, y0 + Math.cos(vinkel) * len); g.stroke(); }

  function dottTrad(g, x, y, h, seed) { // krokigt träd utan löv
    (function gren(x0, y0, a, l, d) {
      if (d === 0 || l < 0.02) return;
      const x1 = x0 + Math.cos(a) * l, y1 = y0 + Math.sin(a) * l;
      g.lineWidth = Math.max(0.006, d * 0.012); g.beginPath(); g.moveTo(x0, y0); g.lineTo(x1, y1); g.stroke();
      const k = Math.sin(seed * 13 + d * 7);
      gren(x1, y1, a - 0.5 + k * 0.25, l * 0.68, d - 1); gren(x1, y1, a + 0.45 + k * 0.2, l * 0.62, d - 1);
    })(x, y, -Math.PI / 2 + Math.sin(seed) * 0.15, h * 0.42, 6);
  }

  function fladdermus(g, x, y, s, flax) {
    g.save(); g.translate(x, y); g.scale(s, s);
    const v = flax * 0.08;
    g.beginPath(); g.moveTo(0, 0);
    g.quadraticCurveTo(-0.06, -0.05 - v, -0.13, -0.02 - v * 1.4); g.quadraticCurveTo(-0.1, 0.0, -0.09, 0.02); g.quadraticCurveTo(-0.06, 0.0, -0.05, 0.03); g.quadraticCurveTo(-0.03, 0.01, 0, 0.03);
    g.quadraticCurveTo(0.03, 0.01, 0.05, 0.03); g.quadraticCurveTo(0.06, 0.0, 0.09, 0.02); g.quadraticCurveTo(0.1, 0.0, 0.13, -0.02 - v * 1.4); g.quadraticCurveTo(0.06, -0.05 - v, 0, 0);
    g.fill(); ell(g, 0, 0.005, 0.018, 0.025); tri(g, [-0.014, -0.012], [-0.01, -0.035], [-0.003, -0.015]); tri(g, [0.014, -0.012], [0.01, -0.035], [0.003, -0.015]);
    g.restore();
  }

  function katt(g, f, rygg) { // svart katt, rygg = 0..1 (skjuter rygg)
    const b = 0.05 + rygg * 0.08;
    g.beginPath(); g.moveTo(-0.22, -0.2); g.quadraticCurveTo(0, -0.2 - b * 2, 0.2, -0.2); g.quadraticCurveTo(0.2, -0.12, 0, -0.12); g.quadraticCurveTo(-0.2, -0.12, -0.22, -0.2); g.fill();
    ell(g, 0.25, -0.25 - rygg * 0.03, 0.07, 0.06);
    tri(g, [0.2, -0.29], [0.21, -0.36], [0.25, -0.3]); tri(g, [0.27, -0.3], [0.31, -0.37], [0.31, -0.28]);
    g.lineWidth = 0.025; g.lineCap = 'round'; g.beginPath(); g.moveTo(-0.21, -0.19); g.quadraticCurveTo(-0.35, -0.25 - rygg * 0.1, -0.3, -0.42 - rygg * 0.05); g.stroke();
    for (const [x, o] of [[-0.17, 0], [-0.1, Math.PI], [0.12, Math.PI], [0.18, 0]]) ben(g, x, -0.14, 0.14, rygg ? 0 : Math.sin(f + o) * 0.45, 0.025);
  }

  function hacka(g, x, y) { // häxa på kvast, åt höger
    g.lineWidth = 0.012; g.lineCap = 'round'; g.beginPath(); g.moveTo(x - 0.22, y + 0.03); g.lineTo(x + 0.2, y - 0.02); g.stroke();
    tri(g, [x - 0.22, y + 0.03], [x - 0.33, y - 0.03], [x - 0.33, y + 0.09]);
    tri(g, [x - 0.06, y], [x + 0.03, y - 0.15], [x + 0.06, y]);
    ell(g, x + 0.035, y - 0.17, 0.028, 0.028);
    tri(g, [x - 0.01, y - 0.18], [x + 0.03, y - 0.31], [x + 0.08, y - 0.18]); g.fillRect(x - 0.03, y - 0.19, 0.13, 0.016);
  }

  function pumpa(g, ctx, x, y, r, t, seed) {
    ell(g, x, y - r * 0.8, r, r * 0.8); g.fillRect(x - r * 0.08, y - r * 1.75, r * 0.16, r * 0.25);
    const fl = 0.75 + 0.25 * Math.sin(t * 9 + seed * 3) * Math.sin(t * 5.3 + seed);
    const ytan = g.fillStyle; g.fillStyle = ctx.rgba('glod', fl);
    tri(g, [x - r * 0.5, y - r * 0.85], [x - r * 0.3, y - r * 1.15], [x - r * 0.12, y - r * 0.85]);
    tri(g, [x + r * 0.5, y - r * 0.85], [x + r * 0.3, y - r * 1.15], [x + r * 0.12, y - r * 0.85]);
    g.beginPath(); g.moveTo(x - r * 0.6, y - r * 0.55);
    for (let i = 0; i <= 6; i++) g.lineTo(x - r * 0.6 + i * r * 0.2, y - r * (i % 2 ? 0.45 : 0.6));
    g.lineTo(x + r * 0.5, y - r * 0.3); g.lineTo(x - r * 0.5, y - r * 0.3); g.closePath(); g.fill();
    g.fillStyle = ytan;
  }

  function skugga(g, p, mark, t) {
    const k = 1.25 - Math.min(1, p.avstand / 5) * 0.4, h = p.hojd * k, x = p.x, hr = h * (p.barn ? 0.085 : 0.07);
    const huvudY = mark - h + hr, axel = huvudY + hr * 1.6, hoft = mark - h * 0.47, sw = Math.sin(t * 7) * Math.min(1, p.fart) * 0.45;
    g.beginPath(); g.arc(x, huvudY, hr, 0, 7); g.fill();
    g.beginPath(); g.roundRect(x - h * 0.1, axel, h * 0.2, hoft - axel + h * 0.04, h * 0.06); g.fill();
    ben(g, x - h * 0.05, hoft, h * 0.47, sw, h * 0.07); ben(g, x + h * 0.05, hoft, h * 0.47, -sw, h * 0.07);
    ben(g, x - h * 0.1, axel + h * 0.02, h * 0.36, -sw * 0.8 + 0.12, h * 0.055);
    ben(g, x + h * 0.1, axel + h * 0.02, h * 0.36, p.vinkar ? Math.PI + 0.5 + Math.sin(t * 12) * 0.45 : sw * 0.8 - 0.12, h * 0.055);
    // häxhatt
    tri(g, [x - hr * 1.1, huvudY - hr * 0.6], [x + hr * 0.5, huvudY - hr * 3.4], [x + hr * 1.1, huvudY - hr * 0.6]);
    g.fillRect(x - hr * 1.9, huvudY - hr * 0.75, hr * 3.8, hr * 0.3);
  }

  Nattfonster.registrera({
    id: 'spokteatern',
    cat: 'visual', by: 'Linus',
    en: { titel: 'The ghost theatre', fraga: 'How does a bat find its way in the dark?', verb: 'walk by, wave, stand still, sneak' },
    pitch: {
      tagline: { sv: 'Skuggteatern i Halloween-tema: häxa, fladdermöss, en svart katt, och du får häxhatt.', en: 'The shadow theatre goes Halloween: a witch, bats, a black cat, and you get a witch hat.' },
      players: ['crowd', { sv: 'Alla', en: 'Anyone' }], mode: 'ambient', round: { sv: 'Hela kvällen', en: 'All evening' },
      input: [['cam', { sv: 'Djupkamera: position, nära, stå still, vinka', en: 'Depth cam: position, closeness, standing still, waving' }]],
      for: ['kid', 'family'],
      how: [
        { sv: 'Gå förbi: din skugga dyker upp med häxhatt.', en: 'Walk by: your shadow shows up wearing a witch hat.' },
        { sv: 'Gå nära katten så skjuter den rygg. Vinka så sprider sig fladdermössen.', en: 'Get close to the cat and it arches its back. Wave and the bats scatter.' },
        { sv: 'Stå still: spöket svävar fram till dig. Bu?', en: 'Stand still: the ghost floats over to you. Boo?' }
      ],
      trick: { sv: 'Fullmånen har en egen ruta, och spöket svävar rakt genom spröjs och mur.', en: 'The full moon gets a pane of its own, and the ghost floats straight through mullions and pier.' },
      needs: [['projector', { sv: 'Projektor', en: 'Projector' }], ['cam', { sv: 'Djupkamera', en: 'Depth cam' }]],
      open: [{ sv: 'Bara runt Halloween, eller hela hösten?', en: 'Just around Halloween, or all autumn?' }, { sv: 'Ska fladdermössen pipa i en högtalare, så man hör ekolokaliseringen?', en: 'Should the bats chirp through a speaker so you can hear the echolocation?' }],
      meters: { read: 5, crowd: 4, effort: 2 }
    },
    titel: 'Spökteatern', steam: 'S', spar: 'A→B', stil: 'doodle',
    fraga: 'Hur hittar fladdermusen i mörkret?', verb: 'gå förbi, vinka, stå still, smyga',
    lage: 'ambient → interaktiv', indata: ['(personer)'], langd: 120, stamning: 'Halloween, kittlande, mysläskigt',
    knappar: [
      { namn: 'Häxan flyger', gor: (s, ctx) => { s.haxT = ctx.t; } },
      { namn: 'Fladdermöss', gor: s => s.flock.forEach(b => { b.x = -0.5 - Math.random(); }) }
    ],

    setup(ctx) {
      const rnd = ctx.slump(31);
      const flock = Array.from({ length: 9 }, (_, i) => ({ x: -1 - rnd() * 4, y: 0.3 + rnd() * 0.8, v: 0.5 + rnd() * 0.5, fas: rnd() * 6, s: 0.8 + rnd() * 0.7, sprid: 0 }));
      return { rnd, flock, haxT: 4, katt: { x: -1.5, dir: 1, fas: 0, rygg: 0, paus: 0 }, spoke: { x: ctx.W + 1, y: 1.2, t: 0 }, vinkade: false };
    },

    frame(ctx, st, input) {
      const { g, t, dt, W, H } = ctx, R = st.rnd, mark = H - 0.11;
      const mork = '#050307';
      // ---- lyktduken: pumpaorange som skymmer mot lila ----
      for (const s of ctx.sektioner) {
        const I = s._inner, cx = I.x + I.w / 2, cy = I.y + I.h * 0.45, gr = g.createRadialGradient(cx, cy, 0, cx, cy, I.w * 1.0);
        gr.addColorStop(0, 'rgba(255,140,40,0.75)'); gr.addColorStop(0.5, 'rgba(230,80,30,0.38)'); gr.addColorStop(1, 'rgba(110,50,200,0.22)');
        g.fillStyle = gr; g.fillRect(I.x, I.y, I.w, I.h);
      }
      // ---- fullmånen och häxan ----
      const m = ctx.rutaNr(8), mx = m.cx, my = m.y + m.h * 0.3, mr = Math.min(m.w * 0.42, 0.3);
      g.fillStyle = 'rgba(255,236,190,0.92)'; g.beginPath(); g.arc(mx, my, mr, 0, 7); g.fill();
      g.fillStyle = 'rgba(230,190,140,0.5)'; ell(g, mx - mr * 0.3, my - mr * 0.2, mr * 0.18, mr * 0.14); ell(g, mx + mr * 0.25, my + mr * 0.3, mr * 0.12, mr * 0.1);
      g.fillStyle = mork; g.strokeStyle = mork;
      const ht = t - st.haxT;
      if (ht > 0 && ht < 9) { const k = ht / 9; hacka(g, -0.6 + k * (W + 1.2), my + 0.25 - Math.sin(k * Math.PI) * 0.4 + Math.sin(t * 3) * 0.03); }
      if (ht > 22) st.haxT = t + 2; // nästa flygtur om två sekunder
      // ---- en spindel som hänger i en tråd ----
      const r2 = ctx.rutaNr(2), sy = r2.y + 0.35 + Math.sin(t * 0.8) * 0.15;
      g.lineWidth = 0.004; g.beginPath(); g.moveTo(r2.cx + 0.15, r2.y); g.lineTo(r2.cx + 0.15, sy); g.stroke();
      ell(g, r2.cx + 0.15, sy, 0.035, 0.045);
      for (const sida of [-1, 1]) for (let i = 0; i < 4; i++) { g.lineWidth = 0.007; g.beginPath(); g.moveTo(r2.cx + 0.15, sy); g.quadraticCurveTo(r2.cx + 0.15 + sida * 0.07, sy - 0.05 + i * 0.03, r2.cx + 0.15 + sida * 0.09, sy + 0.01 + i * 0.03); g.stroke(); }
      // ---- landskap: kulle, döda träd, gravstenar, pumpor ----
      g.beginPath(); g.moveTo(-0.1, H + 0.1);
      for (let x = -0.1; x <= W + 0.1; x += 0.05) g.lineTo(x, mark + 0.02 - 0.06 * Math.sin(x * 1.1 + 0.5) - 0.02 * Math.sin(x * 4));
      g.lineTo(W + 0.1, H + 0.1); g.closePath(); g.fill();
      for (const [x, h, s] of [[0.3, 1.5, 1], [2.05, 1.1, 2], [3.5, 0.9, 3], [5.35, 1.6, 4]]) dottTrad(g, x, mark + 0.02, h, s);
      for (const [x, h] of [[0.95, 0.3], [1.35, 0.24], [4.25, 0.28], [4.75, 0.22]]) { g.beginPath(); g.roundRect(x - h * 0.3, mark - h + 0.02, h * 0.6, h, [h * 0.3, h * 0.3, 0, 0]); g.fill(); }
      for (const [x, r, s] of [[0.65, 0.09, 1], [1.7, 0.12, 2], [3.85, 0.1, 3], [5.0, 0.13, 4]]) pumpa(g, ctx, x, mark + 0.03, r, t, s);
      // ---- fladdermöss ----
      const vinkar = input.personer.some(p => p.vinkar && p.avstand < 4);
      if (vinkar && !st.vinkade) st.flock.forEach(b => b.sprid = 1.5);
      st.vinkade = vinkar;
      for (const b of st.flock) {
        b.sprid = Math.max(0, b.sprid - dt);
        b.x += b.v * dt * (1 + b.sprid * 2); b.y += (Math.sin(t * 2 + b.fas) * 0.25 - (b.sprid ? 0.4 : 0)) * dt;
        if (b.x > W + 0.6 || b.y < -0.3) { b.x = -0.5 - R() * 3; b.y = 0.3 + R() * 0.8; }
        fladdermus(g, b.x, b.y, b.s, Math.sin(t * 14 + b.fas));
      }
      // ---- katten ----
      const c = st.katt, nara = input.personer.find(p => Math.abs(p.x - c.x) < 1 && p.avstand < 3.5);
      c.rygg += ((nara ? 1 : 0) - c.rygg) * Math.min(1, dt * 5);
      if (!nara) { c.x += c.dir * 0.45 * dt; c.fas += dt * 7; }
      if (c.x > W + 1.5) { c.dir = -1; } if (c.x < -1.5) { c.dir = 1; }
      g.save(); g.translate(c.x, mark + 0.02); g.scale(c.dir * 1.2, 1.2); katt(g, c.fas, c.rygg); g.restore();
      if (c.rygg > 0.6) ctx.text('Fffff!', c.x, mark - 0.55, { typ: 'mono', storlek: 0.05, align: 'center', farg: '#ffd07a', alpha: c.rygg });
      // ---- spöket svävar genom väggarna ----
      const sp = st.spoke, still = input.personer.find(p => p.still > 2 && p.avstand < 3.5);
      if (still) { sp.x += (still.x + 0.5 - sp.x) * dt * 0.8; sp.y += (ctx.yForHojd(still.hojd + 0.3) - sp.y) * dt * 0.8; }
      else { sp.x -= 0.3 * dt; sp.y = 1.0 + Math.sin(t * 0.7) * 0.25; if (sp.x < -1) sp.x = W + 1; }
      g.save(); g.globalAlpha = 0.5; g.fillStyle = '#f4ffd8';
      g.beginPath(); g.arc(sp.x, sp.y, 0.16, Math.PI, 0); g.lineTo(sp.x + 0.16, sp.y + 0.28);
      for (let i = 0; i <= 6; i++) g.lineTo(sp.x + 0.16 - i * 0.0533, sp.y + 0.28 + (i % 2 ? -0.05 : 0) + Math.sin(t * 4 + i) * 0.015);
      g.closePath(); g.fill();
      g.globalAlpha = 0.9; g.fillStyle = mork; ell(g, sp.x - 0.05, sp.y - 0.02, 0.025, 0.04); ell(g, sp.x + 0.05, sp.y - 0.02, 0.025, 0.04); ell(g, sp.x, sp.y + 0.08, 0.03, 0.04);
      g.restore();
      if (still) ctx.text('Bu?', sp.x + 0.22, sp.y - 0.1, { storlek: 0.1, farg: '#f4ffd8', alpha: Math.min(1, (still.still - 2) * 2) });
      // ---- besökarnas skuggor med häxhattar ----
      g.fillStyle = mork; g.strokeStyle = mork;
      for (const p of input.personer.filter(q => q.avstand < 4.5)) {
        g.globalAlpha = 0.95 - Math.min(0.5, p.avstand * 0.1); skugga(g, p, mark + 0.02, t + p.nr); g.globalAlpha = 1;
      }
      // ---- kunskap ----
      const r1 = ctx.rutaNr(1), a = 0.5 + 0.5 * Math.sin(t * 0.4);
      ctx.text('FLADDERMÖSS HITTAR', r1.x + 0.08, r1.y + 0.12, { typ: 'mono', storlek: 0.038, farg: '#ffe2b0', alpha: a });
      ctx.text('I MÖRKRET MED LJUD', r1.x + 0.08, r1.y + 0.18, { typ: 'mono', storlek: 0.038, farg: '#ffe2b0', alpha: a });
    }
  });
})();
