/* Nattfönstren · motor
 *
 * SCENKONTRAKT
 * ------------
 * Nattfonster.registrera({
 *   id: 'a', titel, steam: 'S', spar: 'A', fraga, verb, lage, indata: [...], langd, stamning,
 *   setup(ctx) { return state },          // anropas när scenen startar
 *   frame(ctx, state, input) { ... },     // anropas varje bildruta
 *   knappar: [{ namn, gor(state, ctx) }]  // frivilligt: testknappar i labbet
 * })
 *
 * ctx.g      Canvas 2D, redan skalad till METER (1 enhet = 1 m). y = 0 är fönstrens överkant.
 * ctx.W/H    fönsterrymdens bredd/höjd i meter
 * ctx.t/dt   tid i sekunder sedan scenstart / sedan förra bildrutan
 * ctx.rutor  12 rutor: {nr 1–12, sektion, kol 0–3, rad 0–2 (uppifrån), x, y, w, h, cx, cy}
 * ctx.kolumner  4 kolumner: {kol, x, w, cx, rutor: [överst..nederst]}
 * ctx.farg   paletten från config/fasad.js
 * ctx.text(str, x, y, opt)  text i meter: {storlek, typ:'grotesk'|'mono', farg, align, baseline, alpha, vikt, maxBredd}
 * ctx.kolumnVid(x)          kolumnen framför x (eller null)
 * ctx.yForHojd(m)           y i fönsterrymden för en höjd över mark
 * ctx.slump(seed)           deterministisk slumpfunktion
 *
 * input = { personer[], vader, norrsken, sol, tid, telefon } — se motor/indata.js
 * Allt utanför rutorna maskas svart efter frame(); scenen kan rita fritt.
 */
(function () {
  const F = window.FASAD;
  const Q = new URLSearchParams(location.search);
  const px = +Q.get('px') || F.pxPerMeter; // ?px=110 ger lätta miniatyrer (portfolion)
  const H = F.hojd;
  const W = F.sektioner.reduce((m, s) => Math.max(m, s.x + s.bredd), 0);

  // ---------- geometri ----------
  const rutor = [], kolumner = [];
  let nr = 1, kol = 0;
  // Spröjs (lodrät) och tvärpost (vågrät) kan ha olika bredd, och raderna olika höjd (F.radHojd, uppifrån).
  const TP = F.tvarpost ?? F.sprojs;
  for (const s of F.sektioner) {
    const ix = s.x + F.ram, iy = F.ram, iw = s.bredd - 2 * F.ram, ih = H - 2 * F.ram;
    const rw = (iw - (s.kolumner - 1) * F.sprojs) / s.kolumner;
    const hojder = F.radHojd && F.radHojd.length === s.rader ? F.radHojd : new Array(s.rader).fill((ih - (s.rader - 1) * TP) / s.rader);
    s._inner = { x: ix, y: iy, w: iw, h: ih };
    s._kol = []; s._rader = [];
    let yy = iy;
    for (const h of hojder) { s._rader.push({ y: yy, h }); yy += h + TP; }
    const forstaKol = kol;
    for (let c = 0; c < s.kolumner; c++) {
      const x = ix + c * (rw + F.sprojs);
      s._kol.push({ x, w: rw });
      kolumner.push({ kol: kol + c, sektion: s.id, x, w: rw, cx: x + rw / 2, rutor: [] });
    }
    for (let r = 0; r < s.rader; r++) for (let c = 0; c < s.kolumner; c++) {
      const x = s._kol[c].x, y = s._rader[r].y, rh = s._rader[r].h;
      const ru = { nr: nr++, sektion: s.id, kol: forstaKol + c, rad: r, x, y, w: rw, h: rh, cx: x + rw / 2, cy: y + rh / 2 };
      rutor.push(ru); kolumner[forstaKol + c].rutor.push(ru);
    }
    kol += s.kolumner;
  }

  // ---------- canvas ----------
  const canvas = document.createElement('canvas');
  canvas.width = Math.round(W * px); canvas.height = Math.round(H * px);
  const g = canvas.getContext('2d');

  function slump(seed) {
    let a = seed >>> 0 || 1;
    return function () {
      a |= 0; a = (a + 0x6D2B79F5) | 0;
      let t = Math.imul(a ^ (a >>> 15), 1 | a);
      t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  }

  const FONTER = { grotesk: '"Space Grotesk", "Helvetica Neue", Arial, sans-serif', mono: '"IBM Plex Mono", Menlo, monospace' };
  // Texter ritas efter stilens efterbehandling så att de förblir skarpa (de "kokar" inte med linjerna).
  let skjutUpp = false; const textKo = [];
  function text(str, x, y, o = {}) {
    if (skjutUpp) { textKo.push([str, x, y, o, g.globalAlpha]); return; }
    ritaText(str, x, y, o);
  }
  function ritaText(str, x, y, o) {
    const st = o.storlek ?? 0.15;
    g.save();
    g.setTransform(1, 0, 0, 1, 0, 0);
    g.globalAlpha *= o.alpha ?? 1;
    g.fillStyle = o.farg ?? F.farg.krita;
    const typ = o.typ ?? 'grotesk', egen = ctx.stil && ctx.stil.typsnitt && ctx.stil.typsnitt[typ];
    g.font = `${o.vikt ?? (typ === 'mono' ? 400 : egen ? 700 : 500)} ${st * px * (egen ? 1.12 : 1)}px ${egen || FONTER[typ]}`;
    g.textAlign = o.align ?? 'left';
    g.textBaseline = o.baseline ?? 'alphabetic';
    if (o.maxBredd) g.fillText(str, x * px, y * px, o.maxBredd * px); else g.fillText(str, x * px, y * px);
    g.restore();
  }

  const ctx = {
    g, W, H, px, rutor, kolumner, sektioner: F.sektioner, farg: F.farg, fasad: F,
    t: 0, dt: 0, text, slump, stil: null, sprak: 'sv',
    rgba: (namn, a) => Rita.rgba(ctx.farg[namn] || namn, a),
    rgb: namn => Rita.rgb(ctx.farg[namn] || namn),
    kontur: bas => bas * (ctx.stil ? ctx.stil.kontur : 1),
    // stilens standardlinje i meter (doodle-strecket), gånger en faktor
    linje: (k = 1) => ((ctx.stil && ctx.stil.linje) || 0.01) * k,
    // färgen för en STEAM-bokstav (S T E A M)
    steamFarg: L => (ctx.stil && ctx.stil.steam && ctx.stil.steam[L]) || ctx.farg.orange,
    // fyll + kontur i stilens anda: genomskinlig fyllning och tjock linje i samma färg
    form: (farg, o = {}) => {
      const f = ctx.farg[farg] || farg;
      if (o.fyll !== false) { g.fillStyle = Rita.rgba(f, o.fyllAlpha ?? 0.16); g.fill(o.vag); }
      g.strokeStyle = f; g.lineWidth = o.bredd ?? ((ctx.stil && ctx.stil.linje) || 0.01); g.lineCap = 'round'; g.lineJoin = 'round';
      o.vag ? g.stroke(o.vag) : g.stroke();
    },
    rutaNr: n => rutor[n - 1],
    kolumnVid: x => kolumner.find(k => x >= k.x - F.sprojs / 2 && x <= k.x + k.w + F.sprojs / 2) || null,
    yForHojd: m => H - (m - F.fonsterUnderkant)
  };

  // ---------- STEAM-etikett: bokstaven och ämnet i sista rutans nedre hörn ----------
  const AMNE = {
    sv: { S: 'NATURVETENSKAP', T: 'TEKNIK', E: 'INGENJÖRSKONST', A: 'ESTETIK', M: 'MATEMATIK' },
    en: { S: 'SCIENCE', T: 'TECHNOLOGY', E: 'ENGINEERING', A: 'ARTS', M: 'MATHEMATICS' }
  };
  function steamEtikett(steam) {
    const r = rutor[rutor.length - 1], L = steam[0], f = ctx.steamFarg(L);
    ritaText(L, r.x + r.w - 0.07, r.y + r.h - 0.06, { storlek: 0.11, farg: f, align: 'right', vikt: 800, alpha: 0.9 });
    ritaText((AMNE[ctx.sprak] || AMNE.sv)[L] || '', r.x + r.w - 0.07 - 0.1, r.y + r.h - 0.07, { typ: 'mono', storlek: 0.032, farg: f, align: 'right', alpha: 0.75 });
  }

  // ---------- mask ----------
  function mask() {
    g.save();
    g.setTransform(px, 0, 0, px, 0, 0);
    g.beginPath();
    g.rect(-1, -1, W + 2, H + 2);
    for (const r of rutor) g.rect(r.x, r.y, r.w, r.h);
    g.fillStyle = '#000';
    g.fill('evenodd');
    g.restore();
  }

  // ---------- stilar ----------
  let valdStil = Q.get('stil') || 'auto', aktivStil = null;
  function effektivStil() {
    const id = valdStil === 'auto' ? ((aktiv && aktiv.stil) || 'natt') : valdStil;
    return window.STILAR.find(s => s.id === id) || window.STILAR[0];
  }
  function tillampaStil() {
    const s = effektivStil(); if (s === aktivStil) return;
    aktivStil = s; ctx.stil = s; Object.assign(ctx.farg, s.farg);
    lyssnare.stil.forEach(f => f(s));
  }

  // ---------- scener ----------
  const scener = [];
  let aktiv = null, state = null, fade = 0, byteTill = null;
  const lyssnare = { byte: [], bild: [], stil: [] };

  // Ordningen i menyn följer ideas/index.js (laddningsordningen). Samma id två gånger: den första vinner.
  function registrera(s) { if (scener.some(x => x.id === s.id)) { console.warn('Dubbelt id: ' + s.id); return; } scener.push(s); }
  function starta(s) {
    if (aktiv && aktiv.avsluta) { try { aktiv.avsluta(state, ctx); } catch (e) { console.error(e); } }
    aktiv = s; ctx.t = 0; tillampaStil();
    g.setTransform(px, 0, 0, px, 0, 0);
    try { state = s.setup ? s.setup(ctx) : {}; } catch (e) { console.error(e); state = {}; }
    lyssnare.byte.forEach(f => f(s));
  }
  function aktivera(id) {
    const s = scener.find(x => x.id === id); if (!s || s === aktiv) return;
    if (!aktiv) { starta(s); fade = 1; } else byteTill = s;
  }

  let senast = performance.now(), tGlobal = 0, fel = null;
  function loop(nu) {
    const dt = Math.min(0.1, (nu - senast) / 1000); senast = nu;
    bild(dt);
    requestAnimationFrame(loop);
  }
  // stega(n, dt): rendera n bildrutor utan klocka (tester, stillbilder, offline-rendering)
  function stega(n = 1, dt = 1 / 30) { for (let i = 0; i < n; i++) bild(dt); }

  function bild(dt) {
    tGlobal += dt;
    window.Indata.steg(dt, tGlobal);
    // övertoning via svart
    if (byteTill) { fade -= dt / 0.5; if (fade <= 0) { fade = 0; starta(byteTill); byteTill = null; } }
    else fade = Math.min(1, fade + dt / 0.8);

    g.setTransform(px, 0, 0, px, 0, 0);
    g.globalAlpha = 1; g.globalCompositeOperation = 'source-over';
    tillampaStil();
    g.fillStyle = ctx.farg.natt; g.fillRect(0, 0, W, H);
    skjutUpp = !!(aktivStil && aktivStil.post);
    if (aktiv) {
      ctx.dt = dt; ctx.t += dt;
      try { g.save(); aktiv.frame(ctx, state, window.Indata.input); g.restore(); fel = null; }
      catch (e) { if (!fel) console.error(e); fel = e; g.restore(); }
    }
    g.setTransform(px, 0, 0, px, 0, 0);
    g.globalAlpha = 1; g.globalCompositeOperation = 'source-over';
    if (aktivStil && aktivStil.post) { try { aktivStil.post(g, canvas, ctx); } catch (e) { console.error(e); } g.setTransform(px, 0, 0, px, 0, 0); }
    skjutUpp = false;
    for (const [str, x, y, o, ga] of textKo.splice(0)) { g.globalAlpha = ga; ritaText(str, x, y, o); }
    g.globalAlpha = 1;
    if (aktiv && aktiv.steam && !aktiv.ingenEtikett && !Q.get('utanEtikett')) steamEtikett(aktiv.steam);
    if (fel) text('Scenfel: ' + fel.message, 0.2, 0.4, { typ: 'mono', storlek: 0.08, farg: '#ff6b6b' });
    if (fade < 1) { g.fillStyle = `rgba(0,0,0,${1 - fade})`; g.fillRect(0, 0, W, H); }
    mask();
    lyssnare.bild.forEach(f => f(dt));
  }

  window.Nattfonster = {
    registrera, aktivera, scener, ctx, canvas, W, H, stega, rutor, kolumner,
    get aktiv() { return aktiv; }, get state() { return state; },
    vidByte: f => lyssnare.byte.push(f), vidBild: f => lyssnare.bild.push(f), vidStil: f => lyssnare.stil.push(f),
    sattStil: id => { valdStil = id; tillampaStil(); }, get valdStil() { return valdStil; }, get stil() { return aktivStil; },
    starta: () => requestAnimationFrame(t => { senast = t; loop(t); })
  };
})();
