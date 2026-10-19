// A6 · Skuggteatern — fönstren blir en varm lyktduk. Älg, räv, hare och fåglar vandrar förbi
// i siluett, bakom spröjs och mur. Den som går förbi blir själv en skugga i teatern,
// och djuren märker dig: haren skuttar undan, räven stannar och tittar, en fågel landar på huvudet.
(function () {
  function ben(g, x, y0, len, vinkel, w) {
    g.lineWidth = w; g.lineCap = 'round';
    g.beginPath(); g.moveTo(x, y0); g.lineTo(x + Math.sin(vinkel) * len, y0 + Math.cos(vinkel) * len); g.stroke();
  }
  const ell = (g, x, y, rx, ry, rot = 0) => { g.beginPath(); g.ellipse(x, y, rx, ry, rot, 0, 7); g.fill(); };
  const tri = (g, a, b, c) => { g.beginPath(); g.moveTo(...a); g.lineTo(...b); g.lineTo(...c); g.closePath(); g.fill(); };

  const DJUR = {
    rav(g, f) {
      ell(g, 0, -0.3, 0.3, 0.12); ell(g, 0.3, -0.4, 0.1, 0.09);
      tri(g, [0.34, -0.45], [0.53, -0.38], [0.34, -0.33]);
      tri(g, [0.24, -0.46], [0.27, -0.62], [0.33, -0.47]); tri(g, [0.31, -0.48], [0.37, -0.62], [0.4, -0.45]);
      ell(g, -0.43, -0.34, 0.22, 0.075, -0.25);
      for (const [x, o] of [[-0.2, 0], [-0.12, Math.PI], [0.15, Math.PI], [0.22, 0]]) ben(g, x, -0.24, 0.24, Math.sin(f + o) * 0.45, 0.035);
    },
    hare(g, f) {
      ell(g, 0, -0.17, 0.15, 0.12); ell(g, -0.08, -0.13, 0.1, 0.1); ell(g, 0.14, -0.27, 0.075, 0.065);
      ell(g, 0.1, -0.42, 0.025, 0.1, -0.25); ell(g, 0.16, -0.41, 0.025, 0.1, 0.15); ell(g, -0.16, -0.2, 0.04, 0.04);
      ben(g, 0.08, -0.1, 0.1, Math.sin(f) * 0.5, 0.03);
    },
    alg(g, f) {
      ell(g, 0, -1.25, 0.6, 0.3); ell(g, 0.25, -1.48, 0.28, 0.13); ell(g, -0.4, -1.3, 0.25, 0.25);
      g.beginPath(); g.moveTo(0.35, -1.45); g.lineTo(0.72, -1.58); g.lineTo(0.78, -1.36); g.lineTo(0.45, -1.12); g.closePath(); g.fill();
      ell(g, 0.88, -1.42, 0.23, 0.095, 0.55); ell(g, 1.02, -1.3, 0.085, 0.075);
      tri(g, [0.8, -1.3], [0.78, -1.1], [0.86, -1.27]);
      tri(g, [0.72, -1.55], [0.66, -1.7], [0.79, -1.57]);
      for (const [x, y, r] of [[0.6, -1.78, -0.35], [0.82, -1.8, 0.25]]) {
        ell(g, x, y, 0.2, 0.06, r);
        g.lineWidth = 0.025; g.lineCap = 'round';
        for (let i = -2; i <= 2; i++) { g.beginPath(); g.moveTo(x + i * 0.07, y - 0.02); g.lineTo(x + i * 0.085, y - 0.14); g.stroke(); }
      }
      for (const [x, o] of [[-0.42, 0], [-0.3, Math.PI], [0.3, Math.PI], [0.42, 0]]) ben(g, x, -1.05, 1.05, Math.sin(f + o) * 0.22, 0.065);
    }
  };

  function gran(g, x, y, h) {
    for (let i = 0; i < 5; i++) {
      const w = h * (0.42 - i * 0.07), yy = y - h * (0.15 + i * 0.18);
      tri(g, [x - w, yy + h * 0.1], [x, yy - h * 0.22], [x + w, yy + h * 0.1]);
    }
    g.fillRect(x - h * 0.03, y - h * 0.15, h * 0.06, h * 0.15);
  }

  function fagel(g, x, y, s, flax) {
    g.lineWidth = 0.016 * s; g.lineCap = 'round'; g.lineJoin = 'round';
    g.beginPath(); g.moveTo(x - 0.11 * s, y - flax * 0.06 * s); g.quadraticCurveTo(x - 0.05 * s, y - flax * 0.09 * s, x, y);
    g.quadraticCurveTo(x + 0.05 * s, y - flax * 0.09 * s, x + 0.11 * s, y - flax * 0.06 * s); g.stroke();
  }

  function skugga(g, p, mark, t) {
    const k = 1.25 - Math.min(1, p.avstand / 5) * 0.4;
    const h = p.hojd * k, x = p.x, hr = h * (p.barn ? 0.085 : 0.07);
    const huvudY = mark - h + hr, axel = huvudY + hr * 1.6, hoft = mark - h * 0.47;
    const sw = Math.sin(t * 7) * Math.min(1, p.fart) * 0.45;
    g.beginPath(); g.arc(x, huvudY, hr, 0, 7); g.fill();
    g.beginPath(); g.roundRect(x - h * 0.1, axel, h * 0.2, hoft - axel + h * 0.04, h * 0.06); g.fill();
    g.lineCap = 'round'; g.lineWidth = h * 0.065;
    ben(g, x - h * 0.05, hoft, h * 0.47, sw, h * 0.07); ben(g, x + h * 0.05, hoft, h * 0.47, -sw, h * 0.07);
    ben(g, x - h * 0.1, axel + h * 0.02, h * 0.36, -sw * 0.8 + 0.12, h * 0.055);
    if (p.vinkar) {
      const a = Math.PI + 0.5 + Math.sin(t * 12) * 0.45;
      ben(g, x + h * 0.1, axel + h * 0.02, h * 0.36, a, h * 0.055);
    } else ben(g, x + h * 0.1, axel + h * 0.02, h * 0.36, sw * 0.8 - 0.12, h * 0.055);
    return { x, y: huvudY - hr };
  }

  Nattfonster.registrera({
    id: 'skuggteatern',
    cat: 'visual', by: 'Linus',
    en: { titel: 'The shadow theatre', fraga: 'What is a shadow made of?', verb: 'walk by, make shapes, wave, stand still' },
    pitch: {
      tagline: { sv: 'Fönstren blir en lyktduk där älg, räv och hare vandrar förbi. Du blir en skugga bland dem.', en: 'The windows become a lantern screen where moose, fox and hare wander by. You become a shadow among them.' },
      players: ['crowd', { sv: 'Alla', en: 'Anyone' }], mode: 'ambient', round: { sv: 'Hela kvällen', en: 'All evening' },
      input: [['cam', { sv: 'Djupkamera: position, längd, vinka, stå still', en: 'Depth cam: position, height, waving, standing still' }]],
      for: ['kid', 'family', 'all'],
      how: [
        { sv: 'Djur vandrar förbi i siluett.', en: 'Animals wander by in silhouette.' },
        { sv: 'Gå förbi: du blir själv en skugga i teatern.', en: 'Walk by: you become a shadow in the play.' },
        { sv: 'Haren skuttar undan och räven stannar och tittar. Stå still så landar en fågel på ditt huvud.', en: 'The hare hops away and the fox stops to look. Stand still and a bird lands on your head.' }
      ],
      trick: { sv: 'Djuren går bakom spröjs och mur som bakom träd i en skog, och månen har en egen ruta.', en: 'The animals walk behind mullions and pier like behind trees in a forest, and the moon gets a pane of its own.' },
      needs: [['projector', { sv: 'Projektor', en: 'Projector' }], ['cam', { sv: 'Djupkamera', en: 'Depth cam' }]],
      open: [{ sv: 'Ska skuggan vara din riktiga form från djupkameran?', en: 'Should your shadow be your real outline from the depth cam?' }, { sv: 'Fler djur för olika årstider?', en: 'More animals for different seasons?' }],
      meters: { read: 5, crowd: 4, effort: 2 }
    },
    titel: 'Skuggteatern', steam: 'S', spar: 'A→B', stil: 'natt',
    fraga: 'Vad är en skugga gjord av?', verb: 'gå förbi, forma, vinka, stå still',
    lage: 'ambient → interaktiv', indata: ['(personer)'], langd: 120, stamning: 'saga, nordlig natt, lykta',
    knappar: [{ namn: 'Skicka in älgen', gor: (s, ctx) => s.aktorer.push(nyAktor(ctx, s, 'alg')) }],

    setup(ctx) {
      const rnd = ctx.slump(42);
      const granar = [[0.22, 0.75], [0.55, 0.55], [1.95, 0.6], [2.9, 0.8], [3.55, 0.6], [4.95, 0.95], [5.35, 0.6]];
      return { rnd, granar, aktorer: [], spawnT: 1, landad: new Map() };
    },

    frame(ctx, st, input) {
      const { g, t, dt, W, H } = ctx, R = st.rnd;
      const mork = Rita.blanda(ctx.farg.natt, '#000000', 0.55);
      const mark = H - 0.11;
      // ---- lyktduken ----
      for (const s of ctx.sektioner) {
        const I = s._inner, cx = I.x + I.w / 2, cy = I.y + I.h * 0.42;
        const gr = g.createRadialGradient(cx, cy, 0, cx, cy, I.w * 0.95);
        gr.addColorStop(0, ctx.rgba('glod', 0.7)); gr.addColorStop(0.55, ctx.rgba('glod', 0.3)); gr.addColorStop(1, ctx.rgba('rosa', 0.06));
        g.fillStyle = gr; g.fillRect(I.x, I.y, I.w, I.h);
      }
      const m8 = ctx.rutaNr(8);
      g.fillStyle = ctx.rgba('krita', 0.85); g.beginPath(); g.arc(m8.x + m8.w * 0.62, m8.y + m8.h * 0.42, 0.15, 0, 7); g.fill();
      g.fillStyle = ctx.rgba('glod', 0.6); g.beginPath(); g.arc(m8.x + m8.w * 0.62 + 0.06, m8.y + m8.h * 0.42 - 0.03, 0.13, 0, 7); g.fill();

      g.fillStyle = mork; g.strokeStyle = mork;
      // ---- landskap ----
      g.beginPath(); g.moveTo(-0.1, H + 0.1);
      for (let x = -0.1; x <= W + 0.1; x += 0.05) g.lineTo(x, mark + 0.02 - 0.05 * Math.sin(x * 1.3) - 0.03 * Math.sin(x * 3.1 + 1));
      g.lineTo(W + 0.1, H + 0.1); g.closePath(); g.fill();
      for (const [x, h] of st.granar) gran(g, x, mark + 0.03, h);
      // ugglan i den höga granen, med lysande ögon
      const ug = st.granar[5], ux = ug[0], uy = mark + 0.03 - ug[1] * 0.98;
      ell(g, ux, uy - 0.09, 0.07, 0.1); tri(g, [ux - 0.06, uy - 0.17], [ux - 0.05, uy - 0.24], [ux - 0.02, uy - 0.17]); tri(g, [ux + 0.06, uy - 0.17], [ux + 0.05, uy - 0.24], [ux + 0.02, uy - 0.17]);
      const pu = Rita.narmast(input.personer, ux, 6), lk = Math.sin(t * 0.9) > 0.97 ? 0.2 : 1;
      const ox = pu ? Rita.clamp((pu.x - ux) / 3, -1, 1) * 0.012 : Math.sin(t * 0.4) * 0.01;
      g.fillStyle = ctx.farg.glod;
      for (const s of [-1, 1]) { g.beginPath(); g.ellipse(ux + s * 0.03 + ox, uy - 0.13, 0.017, 0.017 * lk, 0, 0, 7); g.fill(); }
      g.fillStyle = mork;

      // ---- aktörer ----
      st.spawnT -= dt;
      if (st.spawnT < 0) { st.spawnT = 5 + R() * 7; st.aktorer.push(nyAktor(ctx, st)); }
      const skuggor = input.personer.filter(p => p.avstand < 4.5);
      for (const a of st.aktorer) {
        for (const p of skuggor) {
          const d = Math.abs(p.x - a.x);
          if (a.typ === 'hare' && d < 1.1 && !a.flydde) { a.flydde = true; a.dir = Math.sign(a.x - p.x) || 1; a.fart = 2.4; }
          if ((a.typ === 'rav' || a.typ === 'alg') && d < 1.2 && !a.stannat) { a.stannat = true; a.paus = 2.2; }
        }
        if (a.paus > 0) a.paus -= dt; else { a.x += a.dir * a.fart * dt; a.fas += dt * a.fart * (a.typ === 'alg' ? 5 : 11); }
        if (a.typ === 'faglar') {
          for (let i = 0; i < 5; i++) fagel(g, a.x + i * 0.22 * -a.dir + Math.sin(i * 7) * 0.08, a.y + Math.sin(t * 1.5 + i) * 0.08 + (i % 2) * 0.1, 1 + (i % 3) * 0.2, Math.sin(t * 9 + i * 1.7));
          continue;
        }
        const hopp = a.typ === 'hare' ? Math.abs(Math.sin(a.fas * 0.5)) * (a.flydde ? 0.32 : 0.16) : 0;
        g.save(); g.translate(a.x, mark - hopp); g.scale(a.dir * a.s, a.s);
        DJUR[a.typ](g, a.paus > 0 ? 0 : a.fas);
        g.restore();
      }
      st.aktorer = st.aktorer.filter(a => a.x > -2.5 && a.x < W + 2.5);

      // ---- besökarnas skuggor ----
      for (const p of skuggor) {
        g.globalAlpha = 0.95 - Math.min(0.5, p.avstand * 0.1);
        const huvud = skugga(g, p, mark + 0.02, t + p.nr);
        g.globalAlpha = 1;
        // en fågel landar på den som står still
        if (p.still > 2.2) {
          const k = Math.min(1, (p.still - 2.2) / 1.2);
          const fx = Rita.lerp(huvud.x + 1.2, huvud.x, Rita.ease.ut(k)), fy = Rita.lerp(huvud.y - 0.8, huvud.y - 0.02, Rita.ease.ut(k));
          if (k < 1) fagel(g, fx, fy, 1.2, Math.sin(t * 14));
          else { ell(g, fx, fy - 0.035, 0.05, 0.035); ell(g, fx + 0.045, fy - 0.07, 0.025, 0.025); tri(g, [fx + 0.065, fy - 0.075], [fx + 0.095, fy - 0.068], [fx + 0.065, fy - 0.062]); tri(g, [fx - 0.04, fy - 0.04], [fx - 0.11, fy - 0.07], [fx - 0.04, fy - 0.02]); }
        }
      }
    }
  });

  function nyAktor(ctx, st, typ) {
    const R = st.rnd;
    typ = typ || ['rav', 'hare', 'alg', 'faglar', 'rav', 'hare'][Math.floor(R() * 6)];
    const dir = R() < 0.5 ? 1 : -1;
    const fart = { rav: 0.55, hare: 0.7, alg: 0.32, faglar: 0.9 }[typ];
    return { typ, dir, fart, x: dir > 0 ? -1.8 : ctx.W + 1.8, fas: 0, paus: 0, s: typ === 'alg' ? 1 : 1.1 + R() * 0.2, y: 0.35 + R() * 0.6 };
  }
})();
