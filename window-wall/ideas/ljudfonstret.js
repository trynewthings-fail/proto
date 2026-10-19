// S3 · Ljudfönstret — en audiovisualizer över tolv rutor. Equalizer, oscilloskop eller tolv solar.
// Källor: syntet (tyst, standard), mikrofon (bara nivå/spektrum, inget spelas in) eller testlåt (ljud via WebAudio).
// Rörelse blir också ljud: den som springer förbi en kolumn slår an dess band.
(function () {
  const BAND = 64;
  const ljud = { kalla: 'syntet', ac: null, an: null, spek: new Uint8Array(BAND), vag: new Float32Array(256), lat: null };

  function startaAC() { if (!ljud.ac) ljud.ac = new (window.AudioContext || window.webkitAudioContext)(); ljud.ac.resume(); return ljud.ac; }
  async function mikrofon() {
    const ac = startaAC(); stoppa();
    const s = await navigator.mediaDevices.getUserMedia({ audio: true });
    ljud.an = ac.createAnalyser(); ljud.an.fftSize = 512; ac.createMediaStreamSource(s).connect(ljud.an); ljud.strom = s; ljud.kalla = 'mikrofon';
  }
  function testlat() {
    const ac = startaAC(); stoppa();
    ljud.an = ac.createAnalyser(); ljud.an.fftSize = 512;
    const ut = ac.createGain(); ut.gain.value = 0.5; ut.connect(ljud.an); ljud.an.connect(ac.destination);
    const bpm = 112, steg = 60 / bpm / 4; let n = 0, nasta = ac.currentTime + 0.1;
    const bas = [45, 45, 52, 48], arp = [69, 72, 76, 79, 76, 72];
    const hz = m => 440 * Math.pow(2, (m - 69) / 12);
    const ton = (typ, f, t, d, v, filt) => {
      const o = ac.createOscillator(), gn = ac.createGain(); o.type = typ; o.frequency.setValueAtTime(f, t);
      gn.gain.setValueAtTime(v, t); gn.gain.exponentialRampToValueAtTime(0.001, t + d);
      let nod = o; if (filt) { const lp = ac.createBiquadFilter(); lp.frequency.value = filt; o.connect(lp); nod = lp; }
      nod.connect(gn); gn.connect(ut); o.start(t); o.stop(t + d + 0.02); return o;
    };
    ljud.lat = setInterval(() => {
      while (nasta < ac.currentTime + 0.2) {
        const s = n % 16;
        if (s % 4 === 0) { const o = ton('sine', 150, nasta, 0.35, 0.9); o.frequency.exponentialRampToValueAtTime(40, nasta + 0.3); }
        if (s % 4 === 2) { const b = ac.createBuffer(1, 2205, 44100), d = b.getChannelData(0); for (let i = 0; i < d.length; i++) d[i] = (Math.random() * 2 - 1) * (1 - i / d.length);
          const src = ac.createBufferSource(), hp = ac.createBiquadFilter(), gn = ac.createGain(); hp.type = 'highpass'; hp.frequency.value = 6000; gn.gain.value = 0.25;
          src.buffer = b; src.connect(hp); hp.connect(gn); gn.connect(ut); src.start(nasta); }
        if (s % 2 === 0) ton('sawtooth', hz(bas[Math.floor(n / 16) % 4]), nasta, 0.22, 0.18, 500);
        ton('square', hz(arp[n % 6] + (Math.floor(n / 32) % 2) * 2), nasta, 0.12, 0.06, 2600);
        n++; nasta += steg;
      }
    }, 50);
    ljud.kalla = 'testlåt';
  }
  function stoppa() {
    if (ljud.lat) clearInterval(ljud.lat); ljud.lat = null;
    if (ljud.strom) ljud.strom.getTracks().forEach(t => t.stop()); ljud.strom = null;
    if (ljud.an) try { ljud.an.disconnect(); } catch (e) {}
    ljud.an = null; ljud.kalla = 'syntet';
  }

  // tyst syntet: ett påhittat men musikaliskt spektrum (112 bpm)
  function syntet(t) {
    const takt = t * 112 / 60, i4 = takt % 1, i2 = (takt + 0.5) % 1;
    const kick = Math.exp(-i4 * 7), hat = Math.exp(-i2 * 14), not = [9, 14, 18, 23, 18, 14][Math.floor(takt * 4) % 6];
    for (let b = 0; b < BAND; b++) {
      let v = kick * Math.exp(-b / 4) * 1.0 + hat * Math.max(0, (b - 40) / 24) * 0.8;
      v += 0.55 * Math.exp(-Math.pow((b - not * 1.4) / 2.2, 2)) * (0.6 + 0.4 * Math.exp(-((takt * 4) % 1) * 4));
      v += 0.35 * Math.exp(-Math.pow((b - 5 - Math.floor(takt / 4) % 3) / 2, 2));
      v += 0.08 * (0.5 + 0.5 * Rita.brus(b * 0.7, t * 4));
      ljud.spek[b] = Math.min(255, v * 220);
    }
    for (let i = 0; i < 256; i++) { const u = i / 256; ljud.vag[i] = 0.6 * kick * Math.sin(u * 2 * Math.PI * 2 + t * 3) + 0.25 * Math.sin(u * Math.PI * 2 * (6 + not * 0.3) - t * 8) + 0.08 * hat * Math.sin(u * 300); }
  }
  function las() {
    if (!ljud.an) return false;
    const n = ljud.an.frequencyBinCount, f = new Uint8Array(n), w = new Float32Array(ljud.an.fftSize);
    ljud.an.getByteFrequencyData(f); ljud.an.getFloatTimeDomainData(w);
    for (let b = 0; b < BAND; b++) { // logaritmiska band
      const a = Math.floor(Math.pow(n * 0.8, b / BAND)), z = Math.max(a + 1, Math.floor(Math.pow(n * 0.8, (b + 1) / BAND)));
      let s = 0; for (let i = a; i < z; i++) s += f[i]; ljud.spek[b] = s / (z - a);
    }
    for (let i = 0; i < 256; i++) ljud.vag[i] = w[Math.floor(i / 256 * w.length)] * 2.5;
    return true;
  }

  const LAGEN = ['equalizer', 'oscilloskop', 'solar'];

  Nattfonster.registrera({
    id: 'ljudfonstret',
    cat: 'visual', by: 'Linus',
    en: { titel: 'The sound window', fraga: 'What does a sound look like?', verb: 'clap, shout, run past' },
    pitch: {
      tagline: { sv: 'Klappa, ropa eller spring förbi, och se ljudet över tolv rutor.', en: 'Clap, shout or run past and see the sound across twelve panes.' },
      players: ['crowd', { sv: 'Alla', en: 'Anyone' }], mode: 'ambient', round: { sv: 'Släpp in när du vill', en: 'Drop in' },
      input: [['music', { sv: 'Mikrofon (bara nivå, inget spelas in)', en: 'Microphone (level only, nothing recorded)' }], ['cam', { sv: 'Djupkamera: spring förbi en kolumn', en: 'Depth cam: run past a column' }]],
      for: ['kid', 'teen', 'family'],
      how: [
        { sv: 'Rutorna blir equalizer, oscilloskop eller tolv solar.', en: 'The panes become an equalizer, an oscilloscope or twelve suns.' },
        { sv: 'Klappa eller ropa: staplarna hoppar.', en: 'Clap or shout: the bars jump.' },
        { sv: 'Spring förbi: varje kolumn du passerar slår an sitt band.', en: 'Run past: every column you pass strikes its own band.' }
      ],
      trick: { sv: 'Varje kolumn är ett frekvensband, och staplarna klättrar från nedre till övre rutan.', en: 'Every column is a frequency band, and the bars climb from the lower pane into the upper one.' },
      needs: [['projector', { sv: 'Projektor', en: 'Projector' }], ['music', { sv: 'Mikrofon', en: 'Microphone' }], ['cam', { sv: 'Djupkamera', en: 'Depth cam' }]],
      open: [{ sv: 'Hörs ett klapp på torget genom trafikbruset?', en: 'Can a clap on the plaza be heard over the traffic?' }, { sv: 'Ska huset spela egen musik genom en högtalare?', en: 'Should the house play its own music through a speaker?' }],
      meters: { read: 5, crowd: 4, effort: 2 }
    },
    titel: 'Ljudfönstret', steam: 'S', spar: 'B', stil: 'neon',
    fraga: 'Hur ser ett ljud ut?', verb: 'klappa, ropa, springa förbi',
    lage: 'interaktiv', indata: ['ljud (mikrofon/syntet)', 'personer'], langd: 60, stamning: 'konsert, puls, fest',
    knappar: [
      { namn: 'Mikrofon', gor: () => mikrofon().catch(e => alert('Mikrofonen gick inte att starta: ' + e.message)) },
      { namn: 'Testlåt (ljud)', gor: () => testlat() },
      { namn: 'Tyst syntet', gor: () => stoppa() },
      { namn: 'Nästa läge', gor: s => { s.li = (s.li + 1) % LAGEN.length; s.lT = 0; } }
    ],

    setup(ctx) { return { li: 0, lT: 0, topp: ctx.kolumner.map(() => 0), extra: new Float32Array(BAND), basMedel: 0.3, slag: 0, vinkel: 0 }; },

    frame(ctx, st, input) {
      const { g, t, dt, W, H, kolumner } = ctx;
      if (!las()) syntet(t);
      st.lT += dt; if (st.lT > 20) { st.lT = 0; st.li = (st.li + 1) % LAGEN.length; }
      // rörelse blir ljud
      for (let b = 0; b < BAND; b++) st.extra[b] *= Math.exp(-dt * 3);
      for (const p of input.personer) if (p.avstand < 3.5 && p.fart > 0.3) {
        const k = ctx.kolumnVid(p.x); if (!k) continue;
        const nk = kolumner.length; for (let b = Math.round(k.kol * BAND / nk); b < Math.round((k.kol + 1) * BAND / nk); b++) st.extra[b] = Math.min(1, st.extra[b] + p.fart * dt * 1.5);
      }
      const v = b => Math.min(1, ljud.spek[b] / 255 + st.extra[b] * 0.8);
      const NK = kolumner.length;
      const band4 = kolumner.map((_, k) => { const a = Math.round(k * BAND / NK), z = Math.round((k + 1) * BAND / NK); let s = 0; for (let b = a; b < z; b++) s += v(b); return s / (z - a); });
      const bas = (v(0) + v(1) + v(2) + v(3)) / 4;
      st.basMedel += (bas - st.basMedel) * dt * 1.5;
      if (bas > st.basMedel * 1.35 && bas > 0.3) st.slag = 1; st.slag = Math.max(0, st.slag - dt * 4);
      // slaget andas i alla rutor
      for (const r of ctx.rutor) { g.fillStyle = ctx.rgba('orange', st.slag * 0.12); g.fillRect(r.x, r.y, r.w, r.h); }
      const lage = LAGEN[st.li];

      if (lage === 'equalizer') {
        const FARG = ['norrsken', 'norrsken', 'norrsken', 'norrsken', 'norrsken', 'glod', 'glod', 'glod', 'glod', 'orange', 'orange', 'rosa'];
        kolumner.forEach((k, ki) => {
          const NR = k.rutor.length, SP = Math.round(12 / NR);
          const niva = Math.min(1, band4[ki] * (1.2 + ki * 0.25)) * 12;
          st.topp[ki] = Math.max(st.topp[ki] - dt * 3, niva);
          for (let s = 0; s < 12; s++) {
            const ru = k.rutor[NR - 1 - Math.floor(s / SP)], i = s % SP, ch = ru.h / SP;
            const y = ru.y + ru.h - (i + 1) * ch, pa = s < niva, topp = Math.floor(st.topp[ki]) === s;
            if (!pa && !topp) { g.strokeStyle = ctx.rgba('krita', 0.12); g.lineWidth = ctx.linje(0.5); Rita.rundrekt(g, k.x + 0.1, y + 0.03, k.w - 0.2, ch - 0.06, 0.03); g.stroke(); continue; }
            g.fillStyle = ctx.farg[FARG[s]]; g.globalAlpha = topp && !pa ? 0.6 : 0.92;
            Rita.rundrekt(g, k.x + 0.1, y + 0.03, k.w - 0.2, ch - 0.06, 0.03); ctx.form(ctx.farg[FARG[s]], { fyllAlpha: 0.28, bredd: ctx.linje() }); g.globalAlpha = 1;
          }
        });
      } else if (lage === 'oscilloskop') {
        const rader = [[ctx.rutor[0].cy, 'is', 0.35, 1.7], [ctx.rutor[4].cy, 'krita', 0.55, 1], [ctx.rutor[8].cy, 'rosa', 0.4, 0.6]];
        rader.forEach(([cy, f, amp, frek], ri) => {
          const rr = ctx.rutor.find(r => r.rad === ri); if (!rr) return; const y0 = rr.cy;
          g.strokeStyle = ctx.farg[f]; g.lineWidth = ctx.kontur(0.014); g.lineJoin = 'round'; g.beginPath();
          for (let i = 0; i <= 200; i++) { const x = i / 200 * W; const s = ljud.vag[Math.floor((i * frek) % 256)]; const y = y0 + s * amp * 0.5; i ? g.lineTo(x, y) : g.moveTo(x, y); }
          g.stroke();
        });
      } else { // tolv solar: ett radiellt spektrum i varje ruta
        st.vinkel += dt * 0.2;
        const F = ['orange', 'is', 'rosa', 'glod', 'norrsken'];
        for (const r of ctx.rutor) {
          const r0 = 0.1 + bas * 0.07, n = 32, f = ctx.farg[F[(r.nr - 1) % 5]];
          g.strokeStyle = f; g.lineWidth = ctx.kontur(0.012); g.lineCap = 'round';
          for (let i = 0; i < n; i++) {
            const a = st.vinkel * (r.nr % 2 ? 1 : -1) + i / n * Math.PI * 2, b = (i * 2 + r.nr * 3) % BAND, l = 0.02 + v(b) * 0.25;
            g.beginPath(); g.moveTo(r.cx + Math.cos(a) * r0, r.cy + Math.sin(a) * r0); g.lineTo(r.cx + Math.cos(a) * (r0 + l), r.cy + Math.sin(a) * (r0 + l)); g.stroke();
          }
          g.beginPath(); g.arc(r.cx, r.cy, r0 * 0.8, 0, 7); ctx.form(f, { fyllAlpha: 0.15 + st.slag * 0.4, bredd: ctx.linje() });
        }
      }
      const r1 = ctx.rutaNr(1);
      ctx.text(ljud.kalla === 'mikrofon' ? 'KLAPPA HÄNDERNA!' : ljud.kalla.toUpperCase(), r1.x + 0.06, r1.y + 0.09, { typ: 'mono', storlek: 0.04, alpha: 0.6 });
    }
  });
})();
