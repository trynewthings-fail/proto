// M1 · 12 rutor — spår B, läge interaktiv/spel
// Fyra provrör (en kolumn = tre rutor). Står du framför ett provrör fylls det cell för cell,
// och varje cell startar sitt eget lilla experiment. Lyser alla tolv samtidigt: reaktion över hela fasaden.
(function () {
  const ETIKETT = ['VÅG', 'LISSAJOUS', 'PENDEL', 'SOLROS', 'LIV', 'MAGNETFÄLT',
    'INTERFERENS', 'BROWNSK RÖRELSE', 'FRAKTAL', 'FJÄDER', 'PRIMTAL', 'KRISTALLGITTER'];
  const FYLL_TID = 2.8;   // s per cell för en person
  const VANTA = 2.5;      // s innan provröret börjar tömmas
  const TOM_FART = 0.3;   // celler per s
  const REAKTION = 16;    // s

  // ---- primtal för Ulam-spiralen ----
  const ulam = (() => {
    const N = 21 * 21, pr = new Uint8Array(N + 1).fill(1); pr[0] = pr[1] = 0;
    for (let i = 2; i * i <= N; i++) if (pr[i]) for (let j = i * i; j <= N; j += i) pr[j] = 0;
    const pos = []; let x = 0, y = 0, dx = 1, dy = 0, steg = 1, n = 1;
    while (n <= N) {
      for (let k = 0; k < 2; k++) {
        for (let s = 0; s < steg && n <= N; s++) { pos.push({ x, y, p: pr[n] === 1 }); x += dx; y += dy; n++; }
        [dx, dy] = [-dy, dx];
      }
      steg++;
    }
    return pos;
  })();

  // ---- de tolv experimenten: (g, r, t, st, ctx, input) i rutans inre rektangel ----
  const EXP = [
    (g, r, t) => { // våg
      for (let k = 0; k < 2; k++) {
        g.beginPath();
        for (let i = 0; i <= 80; i++) { const x = r.x + r.w * i / 80; const y = r.cy + Math.sin(i / 80 * 12 - t * 2 + k * 1.3) * r.h * (0.28 - k * 0.1); i ? g.lineTo(x, y) : g.moveTo(x, y); }
        g.stroke();
      }
    },
    (g, r, t) => { // lissajous
      g.beginPath();
      for (let i = 0; i <= 300; i++) { const u = i / 300 * Math.PI * 2; const x = r.cx + Math.sin(3 * u + t * 0.4) * r.w * 0.4, y = r.cy + Math.sin(2 * u) * r.h * 0.4; i ? g.lineTo(x, y) : g.moveTo(x, y); }
      g.stroke();
    },
    (g, r, t, st) => { // pendel med spår
      const L = r.h * 0.75, th = 0.7 * Math.sin(t * 2.2), bx = r.cx + Math.sin(th) * L, by = r.y + Math.cos(th) * L;
      (st.pend = st.pend || []).push([bx, by]); if (st.pend.length > 60) st.pend.shift();
      g.beginPath(); st.pend.forEach(([x, y], i) => i ? g.lineTo(x, y) : g.moveTo(x, y)); g.globalAlpha *= 0.5; g.stroke(); g.globalAlpha *= 2;
      g.beginPath(); g.moveTo(r.cx, r.y); g.lineTo(bx, by); g.stroke();
      g.beginPath(); g.arc(bx, by, 0.035, 0, 7); g.fill();
    },
    (g, r, t, st) => { // solros, gyllene vinkeln
      const n = Math.min(380, Math.floor(st.tand * 60)), s = Math.min(r.w, r.h) * 0.46;
      for (let i = 0; i < n; i++) { const a = i * 2.39996, rr = Math.sqrt(i / 380) * s; g.beginPath(); g.arc(r.cx + Math.cos(a) * rr, r.cy + Math.sin(a) * rr, 0.007, 0, 7); g.fill(); }
    },
    (g, r, t, st, ctx) => { // game of life
      const C = 16, R = 12;
      if (!st.liv || st.livT > 12) { const rnd = ctx.slump((t * 1000) | 0); st.liv = Array.from({ length: C * R }, () => rnd() < 0.33 ? 1 : 0); st.livT = 0; }
      st.livAck = (st.livAck || 0) + ctx.dt; st.livT += ctx.dt;
      if (st.livAck > 0.22) {
        st.livAck = 0; const a = st.liv, b = a.slice();
        for (let y = 0; y < R; y++) for (let x = 0; x < C; x++) {
          let n = 0; for (let dy = -1; dy <= 1; dy++) for (let dx = -1; dx <= 1; dx++) if (dx || dy) n += a[((y + dy + R) % R) * C + (x + dx + C) % C];
          const i = y * C + x; b[i] = (a[i] && (n === 2 || n === 3)) || (!a[i] && n === 3) ? 1 : 0;
        }
        st.liv = b;
      }
      const cw = r.w / C, ch = r.h / R;
      for (let i = 0; i < C * R; i++) if (st.liv[i]) g.fillRect(r.x + (i % C) * cw + cw * 0.12, r.y + Math.floor(i / C) * ch + ch * 0.12, cw * 0.76, ch * 0.76);
    },
    (g, r, t) => { // magnetfält, dipol
      g.setLineDash([0.02, 0.015]); g.lineDashOffset = -t * 0.04;
      const s = Math.min(r.w, r.h);
      for (let k = 1; k <= 6; k++) for (const sg of [1, -1]) {
        g.beginPath();
        for (let i = 0; i <= 60; i++) { const th = i / 60 * Math.PI, rr = k * s * 0.09 * Math.sin(th) ** 2 * 1.6; const x = r.cx + rr * Math.cos(th) * 1.3, y = r.cy + sg * rr * Math.sin(th); i ? g.lineTo(x, y) : g.moveTo(x, y); }
        g.stroke();
      }
      g.setLineDash([]);
      g.fillRect(r.cx - s * 0.12, r.cy - 0.02, s * 0.24, 0.04);
    },
    (g, r, t) => { // interferens, två källor
      const s1 = [r.cx - r.w * 0.18, r.cy], s2 = [r.cx + r.w * 0.18, r.cy], L = 0.06, off = (t * 0.05) % L;
      g.save(); g.beginPath(); g.rect(r.x, r.y, r.w, r.h); g.clip();
      for (const [x, y] of [s1, s2]) for (let rr = off; rr < r.w; rr += L) { g.beginPath(); g.arc(x, y, rr, 0, 7); g.stroke(); }
      g.restore();
    },
    (g, r, t, st, ctx) => { // brownsk rörelse
      if (!st.br) st.br = { x: r.cx, y: r.cy, sp: [], sm: Array.from({ length: 50 }, () => [r.x + Math.random() * r.w, r.y + Math.random() * r.h]) };
      const b = st.br; b.x += (Math.random() - 0.5) * 0.03; b.y += (Math.random() - 0.5) * 0.03;
      b.x = Math.max(r.x + 0.05, Math.min(r.x + r.w - 0.05, b.x)); b.y = Math.max(r.y + 0.05, Math.min(r.y + r.h - 0.05, b.y));
      b.sp.push([b.x, b.y]); if (b.sp.length > 220) b.sp.shift();
      g.beginPath(); b.sp.forEach(([x, y], i) => i ? g.lineTo(x, y) : g.moveTo(x, y)); g.stroke();
      g.beginPath(); g.arc(b.x, b.y, 0.03, 0, 7); g.fill();
      for (const p of b.sm) { p[0] += (Math.random() - 0.5) * 0.02; p[1] += (Math.random() - 0.5) * 0.02; if (p[0] < r.x || p[0] > r.x + r.w || p[1] < r.y || p[1] > r.y + r.h) { p[0] = r.cx; p[1] = r.cy; } g.fillRect(p[0], p[1], 0.008, 0.008); }
    },
    (g, r, t) => { // fraktalträd
      const v = 0.42 + 0.15 * Math.sin(t * 0.7);
      (function gren(x, y, a, l, d) {
        if (d === 0) return; const nx = x + Math.cos(a) * l, ny = y + Math.sin(a) * l;
        g.beginPath(); g.moveTo(x, y); g.lineTo(nx, ny); g.stroke();
        gren(nx, ny, a - v, l * 0.7, d - 1); gren(nx, ny, a + v, l * 0.7, d - 1);
      })(r.cx, r.y + r.h, -Math.PI / 2, r.h * 0.3, 8);
    },
    (g, r, t) => { // fjäder och massa
      const my = r.cy + 0.1 + Math.sin(t * 2.6) * r.h * 0.18, varv = 12;
      g.beginPath(); g.moveTo(r.cx, r.y);
      for (let i = 1; i < varv * 2; i++) g.lineTo(r.cx + (i % 2 ? 0.07 : -0.07), r.y + (my - 0.06 - r.y) * i / (varv * 2));
      g.lineTo(r.cx, my - 0.06); g.stroke();
      g.fillRect(r.cx - 0.08, my - 0.06, 0.16, 0.12);
    },
    (g, r, t, st) => { // primtal, Ulam-spiral
      const n = Math.min(ulam.length, Math.floor(st.tand * 70)), c = Math.min(r.w, r.h) / 22;
      for (let i = 0; i < n; i++) { const u = ulam[i]; if (!u.p) continue; g.beginPath(); g.arc(r.cx + u.x * c, r.cy + u.y * c, c * 0.32, 0, 7); g.fill(); }
    },
    (g, r, t, st, ctx, input) => { // kristallgitter, värmerörelse från verklig temperatur
      const j = 0.003 + Math.max(0, input.vader.temp + 30) / 55 * 0.014, d = 0.11, pts = [];
      for (let y = 0; y < 8; y++) for (let x = 0; x < 9; x++) {
        const px = r.x + 0.08 + x * d + (y % 2) * d / 2 + Math.sin(t * 9 + x * 3.1 + y * 1.7) * j;
        const py = r.y + 0.1 + y * d * 0.87 + Math.cos(t * 8 + x * 1.3 + y * 2.9) * j;
        if (px < r.x + r.w - 0.03 && py < r.y + r.h - 0.03) pts.push([px, py]);
      }
      g.globalAlpha *= 0.35;
      for (let i = 0; i < pts.length; i++) for (let k = i + 1; k < pts.length; k++) {
        const dx = pts[i][0] - pts[k][0], dy = pts[i][1] - pts[k][1]; if (dx * dx + dy * dy < d * d * 1.3) { g.beginPath(); g.moveTo(...pts[i]); g.lineTo(...pts[k]); g.stroke(); }
      }
      g.globalAlpha /= 0.35;
      for (const p of pts) { g.beginPath(); g.arc(p[0], p[1], 0.012, 0, 7); g.fill(); }
    }
  ];

  Nattfonster.registrera({
    id: 'tolv-rutor',
    cat: 'puzzle', by: 'Linus',
    en: { titel: '12 panes', fraga: 'How many does it take?', verb: 'stand, gather' },
    pitch: {
      tagline: { sv: 'Varje kolumn är ett provrör. Fyll alla samtidigt så reagerar hela fasaden.', en: 'Every column is a test tube. Fill them all at once and the whole façade reacts.' },
      players: ['group', '2–12'], mode: 'coop', round: { sv: '½–1 min', en: '½–1 min' },
      input: [['cam', { sv: 'Djupkamera: var du står', en: 'Depth cam: where you stand' }]],
      for: ['group', 'school', 'family'],
      how: [
        { sv: 'Ställ dig framför ett provrör: det fylls ruta för ruta.', en: 'Stand in front of a test tube: it fills pane by pane.' },
        { sv: 'Varje fylld ruta startar ett litet experiment: pendel, primtal, game of life.', en: 'Each filled pane starts a little experiment: pendulum, primes, Game of Life.' },
        { sv: 'Lyser alla tolv samtidigt startar en reaktion över hela fasaden.', en: 'Light all twelve at once and a reaction ripples across the whole façade.' }
      ],
      trick: { sv: 'Spröjsen delar provrören i celler, så varje ruta blir ett eget litet labb.', en: 'The mullions split each tube into cells, so every pane becomes its own tiny lab.' },
      needs: [['projector', { sv: 'Projektor', en: 'Projector' }], ['cam', { sv: 'Djupkamera', en: 'Depth cam' }]],
      open: [{ sv: 'Hinner en person springa mellan provrören, eller måste man vara flera?', en: 'Can one person run between the tubes, or does it take a group?' }, { sv: 'Räcker ett ord för att förklara varje experiment?', en: 'Is one word enough to explain each experiment?' }],
      meters: { read: 4, crowd: 4, effort: 2 }
    },
    titel: '12 rutor', steam: 'M', spar: 'B',
    fraga: 'Hur många behövs?', verb: 'ställa sig, samlas',
    lage: 'interaktiv / spel', indata: ['personer'], langd: 0, stamning: 'bubbel, triumf',

    knappar: [
      { namn: 'Fyll alla (demo)', gor: (s, ctx) => { ctx.kolumner.forEach((k, i) => s.niva[i] = k.rutor.length); s.vantat.fill(0); } },
      { namn: 'Töm', gor: s => { s.niva.fill(0); s.reaktion = null; } }
    ],

    setup(ctx) {
      const rnd = ctx.slump(7);
      return {
        niva: ctx.kolumner.map(() => 0), vantat: ctx.kolumner.map(() => 99), lys: new Array(12).fill(0),
        exp: Array.from({ length: 12 }, () => ({ tand: 0 })),
        bubblor: ctx.kolumner.map(() => Array.from({ length: 26 }, () => ({ x: rnd(), y: rnd(), v: 0.05 + rnd() * 0.12, r: 0.006 + rnd() * 0.012 }))),
        reaktion: null, antal: 0,
        falt: Object.assign(document.createElement('canvas'), { width: 112, height: 60 })
      };
    },

    frame(ctx, st, input) {
      const { g, W, H, t, dt, farg, kolumner } = ctx;

      // ---- vem står framför vilket provrör? ----
      const framfor = kolumner.map(k => input.personer.filter(p => p.avstand < 3.2 && Math.abs(p.x - k.cx) < k.w / 2 + 0.15).length);
      if (!st.reaktion && st.niva.every((n, i) => n >= kolumner[i].rutor.length - 0.001)) { st.reaktion = { t: 0 }; st.antal++; }
      if (!st.reaktion) {
        kolumner.forEach((k, i) => {
          if (framfor[i]) { st.niva[i] = Math.min(k.rutor.length, st.niva[i] + dt / FYLL_TID * (1 + 0.5 * (framfor[i] - 1))); st.vantat[i] = 0; }
          else { st.vantat[i] += dt; if (st.vantat[i] > VANTA) st.niva[i] = Math.max(0, st.niva[i] - dt * TOM_FART); }
        });
      } else {
        st.reaktion.t += dt;
        if (st.reaktion.t > REAKTION) { st.reaktion = null; st.vantat.fill(VANTA); }
      }

      // ---- reaktion: interferens från fyra källor över hela fasaden ----
      if (st.reaktion) {
        const rt = st.reaktion.t, fc = st.falt, fg = fc.getContext('2d');
        const img = fg.createImageData(fc.width, fc.height), d = img.data;
        const kallor = kolumner.map(k => [k.cx, H - 0.2]);
        const upp = Math.min(1, rt / 2) * Math.min(1, (REAKTION - rt) / 2);
        const [ir, ig, ib] = ctx.rgb('is'), [or, og, ob] = ctx.rgb('orange');
        for (let y = 0; y < fc.height; y++) for (let x = 0; x < fc.width; x++) {
          const mx = x / fc.width * W, my = y / fc.height * H; let v = 0;
          for (const [sx, sy] of kallor) { const dd = Math.hypot(mx - sx, my - sy); v += Math.sin(dd * 16 - rt * 4) / (1 + dd * 0.4); }
          v /= 2.4; const i = (y * fc.width + x) * 4;
          if (v > 0) { d[i] = ir; d[i + 1] = ig; d[i + 2] = ib; d[i + 3] = Math.min(255, v ** 1.4 * 230 * upp); }
          else { d[i] = or; d[i + 1] = og; d[i + 2] = ob; d[i + 3] = Math.min(255, (-v) ** 1.6 * 120 * upp); }
        }
        fg.putImageData(img, 0, 0);
        g.imageSmoothingEnabled = true; g.drawImage(fc, 0, 0, W, H);
      }

      // ---- provrören ----
      kolumner.forEach((k, i) => {
        const NR = k.rutor.length, sist = k.rutor[NR - 1];
        const topp = k.rutor[0].y + 0.1, botten = sist.y + sist.h - 0.08;
        const x = k.x + 0.14, w = k.w - 0.28, rad = w / 2;
        // vätskeyta: nivå 0–3 mappas cell för cell (rutan nedifrån)
        const n = st.niva[i], cell = Math.min(NR - 1, Math.floor(n)), frac = n - cell;
        const ru = k.rutor[NR - 1 - cell];
        let yta = n >= NR ? topp : ru.y + ru.h - frac * ru.h;
        yta = Math.max(topp, Math.min(botten, yta));
        const ror = new Path2D(); ror.roundRect(x, topp, w, botten - topp, [rad * 0.25, rad * 0.25, rad, rad]);
        if (n > 0.01) {
          g.save(); g.clip(ror);
          const grad = g.createLinearGradient(0, yta, 0, botten);
          grad.addColorStop(0, ctx.rgba('orange', 0.3)); grad.addColorStop(1, ctx.rgba('orange', 0.1));
          g.fillStyle = grad; g.beginPath(); g.moveTo(x, botten);
          for (let j = 0; j <= 20; j++) g.lineTo(x + w * j / 20, yta + Math.sin(j / 20 * 6 + t * 3 + i) * 0.012 * (framfor[i] ? 1.6 : 0.6));
          g.lineTo(x + w, botten); g.closePath(); g.fill();
          g.restore();
        }
        // bubblor (fler när någon står framför)
        g.save(); g.clip(ror); g.strokeStyle = farg.krita; g.lineWidth = 0.003;
        const aktiva = framfor[i] ? 26 : 8;
        st.bubblor[i].slice(0, aktiva).forEach(b => {
          b.y -= b.v * dt * (framfor[i] ? 2.2 : 0.6); if (b.y < 0) b.y = 1;
          const by = topp + b.y * (botten - topp);
          if (by < yta) return;
          g.globalAlpha = 0.45; g.beginPath(); g.arc(x + b.x * w, by, b.r, 0, 7); g.stroke();
        });
        g.restore();
        g.globalAlpha = framfor[i] ? 0.6 : 0.28; g.strokeStyle = farg.krita; g.lineWidth = 0.008; g.stroke(ror); g.globalAlpha = 1;
      });

      // ---- celler som lyser: experimenten ----
      g.strokeStyle = farg.krita; g.fillStyle = farg.krita; g.lineWidth = 0.005;
      for (const ru of ctx.rutor) {
        const ki = ru.kol, cellNedifran = kolumner[ki].rutor.length - 1 - ru.rad;
        const pa = st.niva[ki] > cellNedifran + 0.85;
        st.lys[ru.nr - 1] = Math.max(0, Math.min(1, st.lys[ru.nr - 1] + (pa ? dt / 0.8 : -dt / 0.6)));
        const a = st.lys[ru.nr - 1]; const ex = st.exp[ru.nr - 1];
        ex.tand = pa ? ex.tand + dt : 0;
        if (a <= 0) continue;
        const inre = { x: ru.x + 0.16, y: ru.y + 0.16, w: ru.w - 0.32, h: ru.h - 0.32 };
        inre.cx = inre.x + inre.w / 2; inre.cy = inre.y + inre.h / 2;
        const dampa = st.reaktion && ru.rad === 0 ? 0.35 : 1; // låt texten läsas under reaktionen
        g.save(); g.globalAlpha = a * 0.9 * dampa; g.lineJoin = 'round';
        EXP[ru.nr - 1](g, inre, ctx.t, ex, ctx, input);
        g.restore();
        ctx.text(String(ru.nr).padStart(2, '0') + ' ' + ETIKETT[ru.nr - 1], ru.x + 0.2, ru.y + ru.h - 0.05, { typ: 'mono', storlek: 0.04, alpha: a * 0.65 });
      }

      // ---- text ----
      const sum = st.niva.reduce((a, b) => a + b, 0);
      const tanda = st.lys.filter(x => x > 0.5).length;
      // ett ord per ruta: texten korsar aldrig en spröjs (regel 1 i boxen)
      const ord = (nr, s, o) => { const r = ctx.rutaNr(nr); ctx.text(s, r.cx, r.cy + (o.dy || 0), Object.assign({ align: 'center', maxBredd: r.w - 0.1 }, o)); };
      const r8 = ctx.rutaNr(9);
      if (st.reaktion && st.reaktion.t > 2.5) {
        const a = Math.min(1, (st.reaktion.t - 2.5) / 1.5) * Math.min(1, (REAKTION - st.reaktion.t) / 1.5);
        const o = { storlek: 0.15, alpha: a, vikt: 700, dy: 0.05 };
        ord(1, 'Ni', o); ord(2, 'gjorde', o); ord(3, 'det!', o); ord(7, 'Alla', o); ord(8, 'till-', o); ord(9, 'sammans.', Object.assign({}, o, { storlek: 0.12 }));
        ord(9, `REAKTION #${st.antal}`, { typ: 'mono', storlek: 0.042, alpha: a * 0.8, dy: 0.22 });
      } else {
        const tyst = Math.max(0, 1 - sum / 0.8);
        if (tyst > 0) {
          const o = { storlek: 0.16, farg: farg.orange, alpha: tyst, vikt: 500, dy: 0.06 };
          ord(1, 'Hur', o); ord(2, 'många', o); ord(3, 'behövs', o);
          ord(7, '?', Object.assign({}, o, { storlek: 0.55, dy: 0.2 }));
          ord(8, 'STÄLL DIG', { typ: 'mono', storlek: 0.045, alpha: tyst * 0.75, dy: 0.0 });
          ord(8, 'FRAMFÖR ETT', { typ: 'mono', storlek: 0.045, alpha: tyst * 0.75, dy: 0.07 });
          ord(8, 'PROVRÖR', { typ: 'mono', storlek: 0.045, alpha: tyst * 0.75, dy: 0.14 });
        }
        if (sum > 0.05) ctx.text(`${tanda}/12`, r8.x + r8.w - 0.06, r8.y + 0.14, { typ: 'mono', storlek: 0.07, align: 'right', alpha: Math.min(1, sum) * 0.85, farg: farg.orange });
      }
    }
  });
})();
