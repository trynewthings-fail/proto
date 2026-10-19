// S1 · Hur kallt är kallt?  — spår A, läge data (+ personer om de finns)
// Frost växer från karmarna, tätare ju kallare det är. Vinden just nu drar genom rutorna.
// Den som står nära smälter frosten med sin värme.
Nattfonster.registrera({
  id: 'kyla',
  cat: 'visual', by: 'Linus',
  en: { titel: 'How cold is cold?', fraga: 'How cold is cold?', verb: 'stay, read, warm up' },
  pitch: {
    tagline: { sv: 'Frosten på rutorna växer med kylan ute. Stå nära så smälter den.', en: 'Frost grows on the panes as it gets colder outside. Stand close and you melt it.' },
    players: ['crowd', { sv: 'Alla', en: 'Anyone' }], mode: 'ambient', round: { sv: 'Hela kvällen', en: 'All evening' },
    input: [['wifi', { sv: 'Väderdata: temperatur, vind, nederbörd', en: 'Weather data: temperature, wind, precipitation' }], ['cam', { sv: 'Djupkamera: vem står nära', en: 'Depth cam: who stands close' }]],
    for: ['all'],
    how: [
      { sv: 'Frost växer från karmarna, tätare ju kallare det är.', en: 'Frost grows in from the frames, thicker the colder it is.' },
      { sv: 'Vinden och snön just nu drar genom rutorna.', en: 'The real wind and snow right now blow across the panes.' },
      { sv: 'Stå still nära glaset: din värme smälter ett hål.', en: 'Stand still by the glass: your warmth melts a hole.' }
    ],
    trick: { sv: 'Frosten växer inåt från varje karm och spröjs, som på ett riktigt fönster en vintermorgon.', en: 'Frost creeps inward from every frame and mullion, like a real window on a winter morning.' },
    needs: [['projector', { sv: 'Projektor', en: 'Projector' }], ['wifi', { sv: 'Väderdata', en: 'Weather data' }], ['cam', { sv: 'Djupkamera', en: 'Depth cam' }]],
    open: [{ sv: 'Syns den tunna frosten från torget?', en: 'Does the thin frost show from the plaza?' }, { sv: 'Vad händer på plusgrader, när ingen frost växer?', en: 'What happens above freezing, when no frost grows?' }],
    meters: { read: 3, crowd: 2, effort: 2 }
  },
  titel: 'Hur kallt är kallt?', steam: 'S', spar: 'A',
  fraga: 'Hur kallt är kallt?', verb: 'stanna, läsa av, värma',
  lage: 'data', indata: ['väder', 'mörker', '(personer)'], langd: 120, stamning: 'is, stillhet, knaster',

  knappar: [
    { namn: '−25° stilla', gor: (s) => { const v = Indata.input.vader; v.temp = -25; v.vind = 0.5; v.nederbord = 0; } },
    { namn: '+3° regn', gor: (s) => { const v = Indata.input.vader; v.temp = 3; v.vind = 5; v.nederbord = 0.6; } },
    { namn: 'Snöstorm', gor: (s) => { const v = Indata.input.vader; v.temp = -9; v.vind = 14; v.vindriktning = 250; v.nederbord = 0.9; } }
  ],

  setup(ctx) {
    const rnd = ctx.slump(19);
    const seg = []; // x1,y1,x2,y2,dist,djup,offset
    function gren(x, y, a, len, djup, dist, off, r) {
      let cx = x, cy = y;
      const steg = djup === 2 ? 5 : 3;
      for (let i = 0; i < steg; i++) {
        const l = len * (0.6 + rnd() * 0.5);
        a += (rnd() - 0.5) * 0.3;
        const nx = cx + Math.cos(a) * l, ny = cy + Math.sin(a) * l;
        if (nx < r.x || nx > r.x + r.w || ny < r.y || ny > r.y + r.h) break;
        seg.push(cx, cy, nx, ny, dist + l, djup, off);
        dist += l;
        if (djup > 0) {
          const sida = rnd() < 0.5 ? 1 : -1;
          if (rnd() < 0.9) gren(nx, ny, a + sida * Math.PI / 3, len * 0.55, djup - 1, dist, off, r);
          if (rnd() < 0.6) gren(nx, ny, a - sida * Math.PI / 3, len * 0.5, djup - 1, dist, off, r);
        }
        cx = nx; cy = ny;
      }
    }
    const textRutor = [2, 8, 9]; // där texten bor växer frosten bara från kanterna och glest
    for (const r of ctx.rutor) {
      const antal = textRutor.includes(r.nr) ? 2 : 7;
      for (let i = 0; i < antal; i++) {
        const k = rnd(); let x, y, a;
        if (k < 0.4) { x = r.x + rnd() * r.w; y = r.y + r.h; a = -Math.PI / 2; }        // underkant
        else if (k < 0.6) { x = r.x; y = r.y + rnd() * r.h; a = 0; }                   // vänster
        else if (k < 0.8) { x = r.x + r.w; y = r.y + rnd() * r.h; a = Math.PI; }       // höger
        else { x = r.x + rnd() * r.w; y = r.y; a = Math.PI / 2; }                        // överkant
        gren(x, y, a + (rnd() - 0.5) * 1.1, 0.07 + rnd() * 0.05, 2, 0, rnd() * 0.3, r);
      }
    }
    const n = seg.length / 7, maxD = 0.75;
    const S = { x1: new Float32Array(n), y1: new Float32Array(n), x2: new Float32Array(n), y2: new Float32Array(n),
      th: new Float32Array(n), djup: new Uint8Array(n), smalt: new Float32Array(n), n };
    for (let i = 0; i < n; i++) {
      const o = i * 7;
      S.x1[i] = seg[o]; S.y1[i] = seg[o + 1]; S.x2[i] = seg[o + 2]; S.y2[i] = seg[o + 3];
      S.th[i] = Math.min(1, seg[o + 6] + (seg[o + 4] / maxD) * 0.7);
      S.djup[i] = seg[o + 5];
    }
    const mal = Math.max(0, Math.min(1, (1 - Indata.input.vader.temp) / 24));
    const part = [];
    for (let i = 0; i < 380; i++) part.push({ x: rnd() * ctx.W, y: rnd() * ctx.H, z: rnd(), fas: rnd() * 6 });
    const flingor = [];
    for (let i = 0; i < 260; i++) flingor.push({ x: rnd() * ctx.W, y: rnd() * ctx.H, z: 0.4 + rnd() * 0.6, fas: rnd() * 6 });
    return { S, niva: mal * 0.25, part, flingor, rnd };
  },

  frame(ctx, st, input) {
    const { g, W, H, t, dt, farg } = ctx, v = input.vader, S = st.S;
    // ---- frostnivå följer temperaturen ----
    const mal = Math.max(0, Math.min(1, (1 - v.temp) / 24));
    const kyla = Math.max(0, Math.min(1, -v.temp / 30));
    st.niva += mal > st.niva ? Math.min(mal - st.niva, dt * (0.025 + kyla * 0.06)) : Math.max(mal - st.niva, -dt * 0.06);

    // ---- värme från personer nära glaset ----
    const varme = input.personer.filter(p => p.avstand < 3).map(p => ({
      x: p.x, y: ctx.yForHojd(1.25), R: 0.45 + (3 - p.avstand) * 0.28, p
    }));
    for (let i = 0; i < S.n; i++) {
      const mx = (S.x1[i] + S.x2[i]) / 2, my = (S.y1[i] + S.y2[i]) / 2;
      let tillskott = 0;
      for (const h of varme) {
        const dx = mx - h.x, dy = (my - h.y) * 0.8, d = Math.sqrt(dx * dx + dy * dy);
        if (d < h.R) tillskott += (1 - d / h.R);
      }
      S.smalt[i] = tillskott > 0 ? Math.min(1, S.smalt[i] + dt * 0.9 * tillskott) : Math.max(0, S.smalt[i] - dt * (0.02 + kyla * 0.05));
    }

    // ---- rita frost (buntad per djup och alfanivå) ----
    g.globalCompositeOperation = 'lighter';
    g.lineCap = 'round';
    const NIV = 5;
    for (let pass = 0; pass < 2; pass++) {
      for (let d = 0; d <= 2; d++) {
        const paths = Array.from({ length: NIV }, () => new Path2D());
        let finns = new Array(NIV).fill(false);
        for (let i = 0; i < S.n; i++) {
          if (S.djup[i] !== d) continue;
          const a = Math.max(0, Math.min(1, (st.niva - S.th[i]) / 0.08)) * (1 - S.smalt[i]);
          if (a < 0.05) continue;
          const b = Math.min(NIV - 1, Math.floor(a * NIV));
          paths[b].moveTo(S.x1[i], S.y1[i]); paths[b].lineTo(S.x2[i], S.y2[i]); finns[b] = true;
        }
        const bas = [0.003, 0.0042, 0.006][d];
        g.strokeStyle = farg.is;
        for (let b = 0; b < NIV; b++) {
          if (!finns[b]) continue;
          const a = (b + 1) / NIV;
          g.globalAlpha = pass === 0 ? a * 0.10 : a * 0.75;
          g.lineWidth = pass === 0 ? bas * 5 : bas;
          g.stroke(paths[b]);
        }
      }
    }

    // ---- vind: komponenten längs fasaden, nedskalad till gångtakt ----
    const rad = Math.PI / 180;
    const hoger = ctx.fasad.fasadRiktning - 90;
    const langs = Math.cos(((v.vindriktning + 180) - hoger) * rad);
    const vx0 = v.vind * langs * 0.12, turb = 0.04 + v.vind * 0.018;
    g.strokeStyle = farg.krita; g.lineWidth = 0.004;
    for (const p of st.part) {
      const vx = vx0 * (0.6 + p.z * 0.8) + turb * Math.cos(p.y * 2.9 - t * 0.5 + p.fas);
      const vy = turb * Math.sin(p.x * 1.7 + t * 0.6 + p.y * 2.3) + (v.vind < 1 ? -0.01 : 0);
      p.x += vx * dt; p.y += vy * dt;
      if (p.x > W + 0.1) p.x -= W + 0.2; if (p.x < -0.1) p.x += W + 0.2;
      if (p.y > H + 0.1) p.y -= H + 0.2; if (p.y < -0.1) p.y += H + 0.2;
      const l = 0.25 + v.vind * 0.02, sp = Math.hypot(vx, vy);
      if (sp * l > 0.01) {
        g.globalAlpha = (0.12 + Math.min(0.35, v.vind * 0.025)) * (0.5 + p.z * 0.5);
        g.beginPath(); g.moveTo(p.x, p.y); g.lineTo(p.x - vx * l, p.y - vy * l); g.stroke();
      } else if (v.temp < -10) { // diamantstoft i stilla kyla
        g.globalAlpha = 0.5 * Math.max(0, Math.sin(t * 1.3 + p.fas * 3)) * p.z;
        g.fillStyle = farg.krita; g.fillRect(p.x, p.y, 0.008, 0.008);
      }
    }

    // ---- nederbörd: snö eller regn ----
    const antal = Math.floor(st.flingor.length * v.nederbord);
    const sno = v.temp <= 0.5;
    for (let i = 0; i < antal; i++) {
      const f = st.flingor[i];
      if (sno) {
        f.y += (0.22 + f.z * 0.18) * dt; f.x += (vx0 * 1.5 + Math.sin(t + f.fas) * 0.05) * dt;
        g.globalAlpha = 0.35 + f.z * 0.5; g.fillStyle = farg.krita;
        g.beginPath(); g.arc(f.x, f.y, 0.006 + f.z * 0.01, 0, 7); g.fill();
      } else {
        f.y += (2.2 + f.z) * dt; f.x += vx0 * 2 * dt;
        g.globalAlpha = 0.25; g.strokeStyle = farg.is; g.lineWidth = 0.003;
        g.beginPath(); g.moveTo(f.x, f.y); g.lineTo(f.x - vx0 * 0.1, f.y - 0.09); g.stroke();
      }
      if (f.y > H + 0.05) { f.y = -0.05; f.x = st.rnd() * W; }
      if (f.x > W + 0.1) f.x -= W; if (f.x < -0.1) f.x += W;
    }
    g.globalAlpha = 1; g.globalCompositeOperation = 'source-over';

    // ---- text ----
    const f1 = x => x.toFixed(1).replace('.', ',').replace('-', '−');
    const r3 = ctx.rutaNr(2), r9 = ctx.rutaNr(8), r10 = ctx.rutaNr(9);
    const temp = Math.round(v.temp), ts = (temp < 0 ? '−' : temp > 0 ? '+' : '') + Math.abs(temp) + '°';
    ctx.text(ts, r3.cx, r3.cy + 0.1, { storlek: Math.min(0.42, r3.w * 0.42), align: 'center', vikt: 500, maxBredd: r3.w - 0.08 });
    const vr = ['N', 'NO', 'O', 'SO', 'S', 'SV', 'V', 'NV'][Math.round(v.vindriktning / 45) % 8];
    const hh = input.tid.toLocaleTimeString('sv-SE', { hour: '2-digit', minute: '2-digit' });
    ctx.text(`${ctx.fasad.plats.namn.toUpperCase()} ${hh}`, r3.cx, r3.cy + 0.3, { typ: 'mono', storlek: 0.045, align: 'center', alpha: 0.75, maxBredd: r3.w - 0.08 });
    ctx.text(`VIND ${f1(v.vind)} m/s FRÅN ${vr}`, r3.cx, r3.cy + 0.37, { typ: 'mono', storlek: 0.045, align: 'center', alpha: 0.75, maxBredd: r3.w - 0.08 });

    ['Hur', 'kallt är', 'kallt?'].forEach((w, i) => ctx.text(w, r9.x + 0.08, r9.cy - 0.12 + i * 0.17, { storlek: 0.14, farg: farg.orange, vikt: 500, maxBredd: r9.w - 0.14 }));

    const fragor = [
      ['Varför har snöflingor', 'sex armar?'],
      ['Var tar värmen', 'vägen?'],
      ['Vid −40 möts °C och °F.', 'Varför?'],
      ['Hur kallt är det', 'i rymden?'],
      ['Kan det vara för kallt', 'för att snöa?']
    ];
    const cyk = 11, i = Math.floor(t / cyk) % fragor.length, fas = (t % cyk) / cyk;
    const a = Math.min(1, fas * 6, (1 - fas) * 6);
    ctx.text(fragor[i][0], r10.x + 0.08, r10.cy - 0.02, { typ: 'mono', storlek: 0.058, alpha: a * 0.9, maxBredd: r10.w - 0.14 });
    ctx.text(fragor[i][1], r10.x + 0.08, r10.cy + 0.07, { typ: 'mono', storlek: 0.058, alpha: a * 0.9, maxBredd: r10.w - 0.14 });

    // ---- den som står still får se sin värme ----
    for (const h of varme) {
      if (h.p.still > 1.5) {
        const a2 = Math.min(1, (h.p.still - 1.5) / 1.5);
        ctx.text('+100 W?', h.x, h.y + 0.02, { typ: 'mono', storlek: 0.06, align: 'center', farg: farg.orange, alpha: a2 });
      }
    }
  }
});
