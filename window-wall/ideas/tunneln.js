// M4 · Tunneln — varje ruta blir en oändlig tunnel in i huset (feedback). Flyktpunkten
// förskjuts när du går förbi, så djupet följer din blick. Stå still: vertigo, väggarna börjar andas.
(function () {
  const LAGEN = [
    { namn: 'inåt', s: 0.955, rot: 0.004 },
    { namn: 'spiral', s: 0.965, rot: 0.03 },
    { namn: 'utåt', s: 1.04, rot: -0.004 },
    { namn: 'vertigo', s: 0, rot: 0 }
  ];
  const FARGER = ['orange', 'is', 'rosa', 'glod', 'norrsken'];

  Nattfonster.registrera({
    id: 'tunneln',
    cat: 'visual', by: 'Linus',
    en: { titel: 'The tunnel', fraga: 'How far is infinity?', verb: 'walk by, stop, lean' },
    pitch: {
      tagline: { sv: 'Varje ruta blir en oändlig tunnel in i huset, och djupet följer din blick.', en: 'Every pane becomes an endless tunnel into the house, and the depth follows your gaze.' },
      players: ['crowd', { sv: 'Alla', en: 'Anyone' }], mode: 'ambient', round: { sv: 'Hela kvällen', en: 'All evening' },
      input: [['cam', { sv: 'Djupkamera: position, stå still', en: 'Depth cam: position, standing still' }]],
      for: ['teen', 'all'],
      how: [
        { sv: 'Tolv tunnlar ritar sig själva om och om igen.', en: 'Twelve tunnels draw themselves over and over.' },
        { sv: 'Gå förbi: flyktpunkten flyttar sig, så djupet följer dig.', en: 'Walk by: the vanishing point shifts so the depth follows you.' },
        { sv: 'Stå still: vertigo, väggarna börjar andas.', en: 'Stand still: vertigo, the walls start to breathe.' }
      ],
      trick: { sv: 'Varje ruta blir en egen tunnel med karmen som mynning, så fasaden ser ut att ha tolv hål rakt in i huset.', en: 'Each pane is its own tunnel with the frame as the mouth, so the façade seems to have twelve holes straight into the building.' },
      needs: [['projector', { sv: 'Projektor', en: 'Projector' }], ['cam', { sv: 'Djupkamera', en: 'Depth cam' }]],
      open: [{ sv: 'Funkar parallaxen för fler än en person åt gången?', en: 'Does the parallax work for more than one viewer at a time?' }, { sv: 'Kan det bli för snurrigt?', en: 'Can it get too dizzying?' }],
      meters: { read: 4, crowd: 3, effort: 1 }
    },
    titel: 'Tunneln', steam: 'M', spar: 'C', stil: 'neon',
    fraga: 'Hur långt är oändligt?', verb: 'gå förbi, stanna, luta dig',
    lage: 'ambient → interaktiv', indata: ['(personer)'], langd: 60, stamning: 'svindel, magi, oändlighet',
    knappar: [{ namn: 'Nästa läge', gor: s => { s.li = (s.li + 1) % LAGEN.length; s.lT = 0; } }],

    setup(ctx) {
      const q = ctx.px / 2, w = Math.round(ctx.W * q), h = Math.round(ctx.H * q);
      const mk = () => Object.assign(document.createElement('canvas'), { width: w, height: h });
      return { A: mk(), B: mk(), q, li: 0, lT: 0, ritT: 0, fi: 0, vp: ctx.rutor.map(() => [0, 0]), still: 0 };
    },

    frame(ctx, st, input) {
      const { g, t, dt, W, H, rutor } = ctx, q = st.q;
      st.lT += dt; if (st.lT > 14) { st.lT = 0; st.li = (st.li + 1) % LAGEN.length; }
      const p = Rita.narmast(input.personer, W / 2, 5);
      st.still += ((p && p.still > 1.5 ? 1 : 0) - st.still) * dt * 1.5;
      let L = LAGEN[st.li], s = L.s, rot = L.rot;
      if (L.namn === 'vertigo' || st.still > 0.2) {
        const v = Math.sin(t * 1.1);
        s = Rita.lerp(s || 0.97, 0.985 + v * 0.05, L.namn === 'vertigo' ? 1 : st.still); rot = Rita.lerp(rot, v * 0.01, st.still);
      }
      const ut = s > 1;
      const B = st.B.getContext('2d');
      B.setTransform(1, 0, 0, 1, 0, 0); B.globalAlpha = 1; B.fillStyle = ctx.farg.natt; B.fillRect(0, 0, st.B.width, st.B.height);
      st.ritT += dt; const nyRam = st.ritT > 0.11; if (nyRam) { st.ritT = 0; st.fi++; }
      const farg = ctx.farg[FARGER[Math.floor(st.fi / 3) % FARGER.length]];

      rutor.forEach((r, i) => {
        // flyktpunkt: driver i en lissajous, förskjuts av betraktaren (parallax)
        let mx = Math.sin(t * 0.37 + i) * 0.12 * r.w, my = Math.cos(t * 0.29 + i * 1.7) * 0.1 * r.h;
        if (p) { mx = Rita.clamp(-(p.x - r.cx) * 0.18, -0.3 * r.w, 0.3 * r.w); my = Rita.clamp(-(ctx.yForHojd(p.hojd * 0.93) - r.cy) * 0.15, -0.25 * r.h, 0.25 * r.h); }
        st.vp[i][0] += (mx - st.vp[i][0]) * dt * 2; st.vp[i][1] += (my - st.vp[i][1]) * dt * 2;
        const vx = (r.cx + st.vp[i][0]) * q, vy = (r.cy + st.vp[i][1]) * q;
        const rx = r.x * q, ry = r.y * q, rw = r.w * q, rh = r.h * q;
        B.save(); B.beginPath(); B.rect(rx, ry, rw, rh); B.clip();
        B.translate(vx, vy); B.rotate(rot * (i % 2 ? 1 : -1)); B.scale(s, s); B.translate(-vx, -vy);
        B.globalAlpha = 0.975; B.drawImage(st.A, rx, ry, rw, rh, rx, ry, rw, rh);
        B.restore();
        if (nyRam) {
          B.save(); B.beginPath(); B.rect(rx, ry, rw, rh); B.clip();
          B.strokeStyle = farg; B.lineWidth = q * 0.018 * (ctx.stil ? ctx.stil.kontur : 1);
          if (!ut) B.strokeRect(rx + q * 0.02, ry + q * 0.02, rw - q * 0.04, rh - q * 0.04);
          else { const k = q * 0.06; B.strokeRect(vx - k, vy - k * 0.8, 2 * k, 1.6 * k); }
          if (st.fi % 9 === i % 9) { // en stjärna som faller in i tunneln
            B.fillStyle = ctx.farg.krita; B.beginPath(); B.arc(rx + rw * ((i * 0.37 + st.fi * 0.13) % 1), ry + q * 0.04, q * 0.012, 0, 7); B.fill();
          }
          B.restore();
        }
      });
      [st.A, st.B] = [st.B, st.A];
      g.imageSmoothingEnabled = true;
      g.drawImage(st.A, 0, 0, W, H);
      const r12 = ctx.rutaNr(12);
      ctx.text(LAGEN[st.li].namn.toUpperCase() + (st.still > 0.5 ? ' · VERTIGO' : ''), r12.x + r12.w - 0.06, r12.y + r12.h - 0.06, { typ: 'mono', storlek: 0.035, align: 'right', alpha: 0.45 });
    }
  });
})();
