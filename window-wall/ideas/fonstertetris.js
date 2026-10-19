// M3 · Fönstertetris — ett riktigt spel: biten landar där du står. Två spelplaner, en per fönster. Brädet räknas fram ur rutorna
// (4 celler per rutbredd, just nu 12 × 16) så att spröjsarna faller mellan cellerna. Gå åt sidan = flytta biten. Vinka = vrid. Stå still = släpp snabbare.
// Ingen där? Biten väntar högst upp tills någon ställer sig framför. Tangenter i labbet: vänster ← → ↑ ↓ (mellanslag = släpp), höger J L I K.
(function () {
  const BITAR = {
    I: [[0, 1], [1, 1], [2, 1], [3, 1]], O: [[1, 0], [2, 0], [1, 1], [2, 1]], T: [[1, 0], [0, 1], [1, 1], [2, 1]],
    S: [[1, 0], [2, 0], [0, 1], [1, 1]], Z: [[0, 0], [1, 0], [1, 1], [2, 1]], J: [[0, 0], [0, 1], [1, 1], [2, 1]], L: [[2, 0], [0, 1], [1, 1], [2, 1]]
  };
  const TYPER = Object.keys(BITAR);
  const FARG = { I: 'is', O: 'glod', T: 'rosa', S: 'norrsken', Z: 'orange', J: 'krita', L: 'glod2' };

  function celler(typ, rot) {
    let c = BITAR[typ].map(p => p.slice());
    const n = typ === 'I' ? 4 : 3;
    if (typ === 'O') return c;
    for (let i = 0; i < rot % 4; i++) c = c.map(([x, y]) => [n - 1 - y, x]);
    return c;
  }
  const kollar = (b, typ, rot, x, y) => celler(typ, rot).every(([cx, cy]) => {
    const X = x + cx, Y = y + cy; return X >= 0 && X < b.C && Y < b.R && (Y < 0 || !b.g[Y][X]);
  });

  function nyBit(b) {
    b.bit = { typ: b.nasta || TYPER[Math.floor(b.rnd() * 7)], rot: 0, x: Math.floor(b.C / 2) - 2, y: -1 };
    b.nasta = TYPER[Math.floor(b.rnd() * 7)];
    if (!kollar(b, b.bit.typ, 0, b.bit.x, -1)) { b.slut = 0.001; }
    b.aiMal = null;
  }
  function matt(ctx) {
    const k = ctx.kolumner[0], ru = k.rutor[0], cpk = 4, rpr = Math.max(3, Math.round(ru.h / (k.w / cpk)));
    return { cpk, rpr, C: (ctx.kolumner.length / ctx.sektioner.length) * cpk, R: k.rutor.length * rpr };
  }
  function nyttBrade(rnd, m) { const b = { C: m.C, R: m.R, m, g: Array.from({ length: m.R }, () => new Array(m.C).fill(0)), rnd, rader: 0, fallT: 0, styrT: 0, rensa: null, slut: 0, tangentT: 0 }; nyBit(b); return b; }

  // enkel AI: prova alla rotationer och kolumner
  function aiPlan(b) {
    let bast = null;
    for (let rot = 0; rot < 4; rot++) for (let x = -2; x < b.C; x++) {
      if (!kollar(b, b.bit.typ, rot, x, -1)) continue;
      let y = -1; while (kollar(b, b.bit.typ, rot, x, y + 1)) y++;
      const g = b.g.map(r => r.slice());
      for (const [cx, cy] of celler(b.bit.typ, rot)) if (y + cy >= 0) g[y + cy][x + cx] = 1;
      let hojder = 0, hal = 0, ojamn = 0, rader = 0, forra = null;
      for (let r = 0; r < b.R; r++) if (g[r].every(v => v)) rader++;
      for (let c = 0; c < b.C; c++) {
        let h = 0, sett = false;
        for (let r = 0; r < b.R; r++) { if (g[r][c]) { if (!sett) { h = b.R - r; sett = true; } } else if (sett) hal++; }
        hojder += h; if (forra !== null) ojamn += Math.abs(h - forra); forra = h;
      }
      const v = -0.51 * hojder + 0.76 * rader - 0.36 * hal - 0.18 * ojamn + b.rnd() * 0.05;
      if (!bast || v > bast.v) bast = { v, rot, x };
    }
    return bast;
  }

  function las(b) {
    for (const [cx, cy] of celler(b.bit.typ, b.bit.rot)) {
      const Y = b.bit.y + cy; if (Y < 0) { b.slut = 0.001; return; }
      b.g[Y][b.bit.x + cx] = b.bit.typ;
    }
    const fulla = []; for (let r = 0; r < b.R; r++) if (b.g[r].every(v => v)) fulla.push(r);
    if (fulla.length) b.rensa = { rader: fulla, t: 0 }; else nyBit(b);
  }

  function steg(b, dx, drot, ned) {
    if (b.slut || b.rensa) return;
    if (drot) { for (const kick of [0, -1, 1, -2, 2]) if (kollar(b, b.bit.typ, b.bit.rot + 1, b.bit.x + kick, b.bit.y)) { b.bit.rot++; b.bit.x += kick; break; } }
    if (dx && kollar(b, b.bit.typ, b.bit.rot, b.bit.x + dx, b.bit.y)) b.bit.x += dx;
    if (ned) { if (kollar(b, b.bit.typ, b.bit.rot, b.bit.x, b.bit.y + 1)) b.bit.y++; else las(b); }
  }

  Nattfonster.registrera({
    id: 'fonstertetris',
    cat: 'arcade', by: 'Linus',
    en: { titel: 'Window Tetris', fraga: 'Will everything fit?', verb: 'step sideways, wave, compete' },
    pitch: {
      tagline: { sv: 'Tetris på riktigt: biten landar där du står.', en: 'Real Tetris: the piece lands where you stand.' },
      players: ['group', { sv: '1–2, en per fönster', en: '1–2, one per window' }], mode: 'versus', round: { sv: 'Tills brädet är fullt', en: 'Until the board fills up' },
      input: [['cam', { sv: 'Djupkamera: gå åt sidan, vinka, stå still', en: 'Depth cam: step sideways, wave, stand still' }], ['button', { sv: 'Tangenter (i labbet)', en: 'Keys (in the lab)' }]],
      for: ['teen', 'family'],
      how: [
        { sv: 'Ställ dig framför ett fönster: biten följer dig i sidled.', en: 'Stand in front of a window: the piece follows you sideways.' },
        { sv: 'Vinka för att vrida den.', en: 'Wave to rotate it.' },
        { sv: 'Stå still så släpps den. Fulla rader försvinner.', en: 'Stand still to drop it. Full rows clear.' }
      ],
      trick: { sv: 'Brädet räknas fram ur rutorna, fyra celler per rutbredd, så spröjsen alltid hamnar mellan cellerna. Muren skiljer de två spelplanerna.', en: 'The board is built from the panes, four cells per pane width, so the mullions always fall between cells. The pier splits the two boards.' },
      needs: [['projector', { sv: 'Projektor', en: 'Projector' }], ['cam', { sv: 'Djupkamera', en: 'Depth cam' }]],
      open: [{ sv: 'Är vinka-för-att-vrida pålitligt nog med djupkamera?', en: 'Is wave-to-rotate reliable enough on a depth cam?' }, { sv: 'Ska fulla rader skickas över till motståndaren?', en: 'Should cleared rows be sent over to the opponent?' }],
      meters: { read: 4, crowd: 4, effort: 2 }
    },
    titel: 'Fönstertetris', steam: 'M', spar: 'B', stil: 'pixel',
    fraga: 'Får allt plats?', verb: 'gå åt sidan, vinka, tävla',
    lage: 'spel', indata: ['personer', '(tangenter)'], langd: 0, stamning: 'arkadhall, två mot två',
    tangenter: true,
    knappar: [{ namn: 'Ny omgång', gor: (s, ctx) => { s.b = [nyttBrade(ctx.slump(1), matt(ctx)), nyttBrade(ctx.slump(2), matt(ctx))]; } }],
    tangent(e, s) {
      const k = e.key, b0 = s.b[0], b1 = s.b[1];
      const map = { ArrowLeft: [b0, -1, 0, 0], ArrowRight: [b0, 1, 0, 0], ArrowUp: [b0, 0, 1, 0], ArrowDown: [b0, 0, 0, 1],
        j: [b1, -1, 0, 0], l: [b1, 1, 0, 0], i: [b1, 0, 1, 0], k: [b1, 0, 0, 1] };
      if (map[k]) { const [b, dx, dr, dn] = map[k]; b.tangentT = 10; steg(b, dx, dr, dn); e.preventDefault(); }
      if (k === ' ') { b0.tangentT = 10; while (!b0.rensa && !b0.slut && kollar(b0, b0.bit.typ, b0.bit.rot, b0.bit.x, b0.bit.y + 1)) b0.bit.y++; steg(b0, 0, 0, 1); e.preventDefault(); }
    },

    setup(ctx) { return { b: [nyttBrade(ctx.slump(1), matt(ctx)), nyttBrade(ctx.slump(2), matt(ctx))], vinkade: new Map() }; },

    frame(ctx, st, input) {
      const { g, dt, t } = ctx;
      ctx.farg.glod2 = Rita.blanda(ctx.farg.glod, ctx.farg.rosa, 0.5).replace(/rgb\((\d+),(\d+),(\d+)\)/, (m, a, b_, c) => '#' + [a, b_, c].map(v => (+v).toString(16).padStart(2, '0')).join(''));
      st.b.forEach((b, si) => {
        const sek = ctx.sektioner[si], I = sek._inner;
        const kol = ctx.kolumner.filter(k => k.sektion === sek.id);
        const cell = (c, r) => {
          const { cpk, rpr } = b.m, k = kol[Math.floor(c / cpk)], ru = k.rutor[Math.floor(r / rpr)];
          const cw = k.w / cpk, ch = ru.h / rpr; return [k.x + (c % cpk) * cw, ru.y + (r % rpr) * ch, cw, ch];
        };
        // ---- vem styr? ----
        b.tangentT -= dt;
        const spelare = input.personer.filter(p => p.avstand < 3.5 && p.x > I.x - 0.3 && p.x < I.x + I.w + 0.3).sort((a, b2) => a.avstand - b2.avstand)[0];
        // ---- spelets klocka ----
        if (b.slut) {
          b.slut += dt; if (b.slut > 3.5) { Object.assign(b, nyttBrade(b.rnd, b.m)); }
        } else if (b.rensa) {
          b.rensa.t += dt;
          if (b.rensa.t > 0.45) { for (const r of b.rensa.rader) { b.g.splice(r, 1); b.g.unshift(new Array(b.C).fill(0)); } b.rader += b.rensa.rader.length; b.rensa = null; nyBit(b); }
        } else {
          let fall = Math.max(0.28, 0.7 - b.rader * 0.012);
          b.styrT += dt; b.vantar = false;
          if (b.tangentT > 0) { /* tangentbordet styr */ }
          else if (spelare) {
            // biten centreras över den som står framför: den landar där du står
            b.tomT = 0;
            const cs = celler(b.bit.typ, b.bit.rot), mn = Math.min(...cs.map(c => c[0])), mx = Math.max(...cs.map(c => c[0]));
            const malCell = Math.floor(Rita.clamp((spelare.x - I.x) / I.w, 0, 0.999) * b.C);
            const malX = malCell - Math.round((mn + mx) / 2);
            b.malX = malX;
            if (b.styrT > 0.07 && b.bit.x !== malX) { b.styrT = 0; steg(b, Math.sign(malX - b.bit.x), 0, 0); }
            const forr = st.vinkade.get(spelare.id);
            if (spelare.vinkar && !forr) steg(b, 0, 1, 0);       // vinka = vrid
            st.vinkade.set(spelare.id, spelare.vinkar);
            if (spelare.still > 1.0 && b.bit.x === malX) fall = 0.06; // stå still = släpp
          } else {
            // ingen spelare: biten väntar högst upp tills någon ställer sig framför fönstret
            b.vantar = true; b.tomT = (b.tomT || 0) + dt;
            if (b.bit.y < 0 && kollar(b, b.bit.typ, b.bit.rot, b.bit.x, 0)) b.bit.y = 0;
            if (b.tomT > 45 && b.g.some(r => r.some(v => v))) { b.g.pop(); b.g.unshift(new Array(b.C).fill(0)); b.tomT = 44.6; } // töm långsamt
          }
          if (!b.vantar) { b.fallT += dt; if (b.fallT > fall) { b.fallT = 0; steg(b, 0, 0, 1); } }
        }

        // ---- rita ----
        const ruta = (c, r, typ, alpha = 1, kontur = false) => {
          const [x, y, w, h] = cell(c, r), m = 0.012;
          const f = ctx.farg[FARG[typ]] || ctx.farg.krita;
          if (kontur) { g.strokeStyle = Rita.rgba(f, 0.45); g.lineWidth = 0.008; g.strokeRect(x + m * 2, y + m * 2, w - m * 4, h - m * 4); return; }
          g.globalAlpha = alpha;
          Rita.rundrekt(g, x + m * 1.5, y + m * 1.5, w - 3 * m, h - 3 * m, 0.03);
          ctx.form(f, { fyllAlpha: 0.28, bredd: ctx.linje(0.75) });
          g.globalAlpha = 1;
        };
        // svagt rutnät
        g.fillStyle = ctx.rgba('krita', 0.05);
        for (let r = 0; r < b.R; r++) for (let c = 0; c < b.C; c++) { const [x, y, w, h] = cell(c, r); g.fillRect(x + w / 2 - 0.006, y + h / 2 - 0.006, 0.012, 0.012); }
        for (let r = 0; r < b.R; r++) for (let c = 0; c < b.C; c++) if (b.g[r][c]) {
          const rensas = b.rensa && b.rensa.rader.includes(r);
          if (rensas) { const [x, y, w, h] = cell(c, r); g.fillStyle = ctx.rgba('krita', 1 - b.rensa.t / 0.45); g.fillRect(x, y, w, h); }
          else ruta(c, r, b.g[r][c], b.slut ? Math.max(0.15, 1 - b.slut / 2) : 1);
        }
        if (!b.slut && !b.rensa) {
          let gy = b.bit.y; while (kollar(b, b.bit.typ, b.bit.rot, b.bit.x, gy + 1)) gy++;
          if (spelare) { // en ljusstråle från biten ner till där den landar, och en pil vid personen
            const f = ctx.farg[FARG[b.bit.typ]] || ctx.farg.krita;
            for (const [cx] of celler(b.bit.typ, b.bit.rot)) {
              const [x0, y0] = cell(b.bit.x + cx, Math.max(0, b.bit.y)), [, y1, w1, h1] = cell(b.bit.x + cx, gy + 1);
              g.fillStyle = Rita.rgba(f, 0.07); g.fillRect(x0, y0, w1, y1 + h1 - y0);
            }
            const px = Rita.clamp(spelare.x, I.x + 0.05, I.x + I.w - 0.05), py = I.y + I.h - 0.02;
            g.beginPath(); g.moveTo(px, py - 0.12); g.lineTo(px - 0.06, py - 0.02); g.lineTo(px + 0.06, py - 0.02); g.closePath(); ctx.form('krita', { fyllAlpha: 0.5, bredd: ctx.linje(0.6) });
          }
          for (const [cx, cy] of celler(b.bit.typ, b.bit.rot)) if (gy + cy >= 0) ruta(b.bit.x + cx, gy + cy, b.bit.typ, 1, true);
          for (const [cx, cy] of celler(b.bit.typ, b.bit.rot)) if (b.bit.y + cy >= 0) ruta(b.bit.x + cx, b.bit.y + cy, b.bit.typ);
        }
        // ---- text ----
        const r1 = kol[0].rutor[0];
        ctx.text(`RADER ${b.rader}`, r1.x + 0.06, r1.y + 0.09, { typ: 'mono', storlek: 0.045, alpha: 0.75 });
        if (b.slut) ctx.text('Igen?', kol[1].cx, kol[1].rutor[0].cy + 0.06, { storlek: 0.2, align: 'center', vikt: 700, alpha: Math.min(1, b.slut) });
        const r2 = kol[kol.length - 1].rutor[0];
        if (spelare && !b.slut) {
          ctx.text('DU STYR!', r2.x + r2.w - 0.06, r2.y + 0.09, { typ: 'mono', storlek: 0.045, align: 'right', farg: ctx.farg.glod });
          ctx.text('stå still = släpp', r2.x + r2.w - 0.06, r2.y + 0.15, { typ: 'mono', storlek: 0.034, align: 'right', alpha: 0.75 });
          ctx.text('vinka = vrid', r2.x + r2.w - 0.06, r2.y + 0.2, { typ: 'mono', storlek: 0.034, align: 'right', alpha: 0.75 });
        } else if (b.vantar && !spelare && !b.slut) {
          const rm = kol[1].rutor[0], a = 0.6 + 0.4 * Math.sin(t * 2);
          ctx.text('Ställ dig där', rm.cx, rm.cy + 0.05, { storlek: 0.075, align: 'center', alpha: a, maxBredd: rm.w - 0.1 });
          ctx.text('biten ska landa', rm.cx, rm.cy + 0.15, { storlek: 0.075, align: 'center', alpha: a, maxBredd: rm.w - 0.1 });
        }
      });
    }
  });
})();
