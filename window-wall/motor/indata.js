// Indatabussen: personer, väder, norrsken, sol/mörker, telefon.
// Källor: simulering, mus (mockup), WebSocket (?ws=ws://host:port, från TouchDesigner/sensor i steg 2).
(function () {
  const F = window.FASAD;
  const W = F.sektioner.reduce((m, s) => Math.max(m, s.x + s.bredd), 0);
  const XMIN = -3.5, XMAX = W + 3.5;

  const input = {
    personer: [],
    vader: { temp: -8, vind: 4, vindriktning: 270, nederbord: 0, moln: 50, kalla: 'reglage' },
    norrsken: { kp: 2, kalla: 'reglage' },
    sol: { hojd: -20, morker: 1, tand: true, solnedgang: null },
    tid: new Date(),
    telefon: []
  };

  // ---------- personer ----------
  let nastaNr = 1;
  const kallor = new Map(); // id -> rå position {x, avstand, kalla}
  const spar = new Map();   // id -> härledd person

  // hojd: personens längd i meter (barn ≈ 1,0–1,35). Exploratoriets publik är främst barn.
  function satt(id, x, avstand, kalla, hojd) { const f = kallor.get(id); kallor.set(id, { x, avstand, kalla, hojd: hojd ?? (f && f.hojd) ?? 1.2 }); }
  function ta(id) { kallor.delete(id); }

  function uppdateraPersoner(dt, t) {
    for (const [id, k] of kallor) {
      let p = spar.get(id);
      if (!p) {
        p = { id, nr: nastaNr++, x: k.x, avstand: k.avstand, hojd: k.hojd, barn: k.hojd < 1.45, vx: 0, fart: 0, riktning: 0,
              still: 0, tidI: 0, vinkar: false, kalla: k.kalla, ny: true, _h: [] };
        spar.set(id, p);
      } else p.ny = false;
      const rawVx = dt > 0 ? (k.x - p.x) / dt : 0;
      p.vx += (rawVx - p.vx) * Math.min(1, dt * 8);
      p.x = k.x; p.avstand = k.avstand; p.hojd = k.hojd; p.barn = k.hojd < 1.45;
      p.fart = Math.abs(p.vx);
      if (p.fart > 0.25) p.riktning = Math.sign(p.vx);
      p.still = p.fart < 0.15 ? p.still + dt : 0;
      p.tidI += dt;
      // vinkning: täta riktningsbyten på liten yta
      p._h.push({ t, x: p.x });
      while (p._h.length && t - p._h[0].t > 1.6) p._h.shift();
      let byten = 0, last = 0, minx = 1e9, maxx = -1e9;
      for (let i = 1; i < p._h.length; i++) {
        const d = p._h[i].x - p._h[i - 1].x;
        minx = Math.min(minx, p._h[i].x); maxx = Math.max(maxx, p._h[i].x);
        if (Math.abs(d) > 0.004) { const s = Math.sign(d); if (last && s !== last) byten++; last = s; }
      }
      p.vinkar = byten >= 3 && maxx - minx < 1.4;
    }
    for (const id of [...spar.keys()]) if (!kallor.has(id)) spar.delete(id);
    input.personer = [...spar.values()].filter(p => p.avstand <= F.zonDjup);
  }

  // ---------- simulering av förbipasserande ----------
  const sim = { pa: true, tathet: 6, folk: [], idn: 0 };
  function simSteg(dt, t) {
    if (sim.pa && Math.random() < (sim.tathet / 60) * dt) {
      const fran = Math.random() < 0.5 ? -1 : 1;
      const barn = Math.random() < 0.5; // lekplatsen ligger precis bredvid
      const s = {
        id: 'sim' + (sim.idn++),
        x: fran < 0 ? XMIN : XMAX, dir: -fran,
        fart: barn ? 0.9 + Math.random() * 1.6 : 0.7 + Math.random() * 1.0,
        avstand: 0.6 + Math.random() * (barn ? 2.5 : 4.4),
        hojd: barn ? 1.0 + Math.random() * 0.35 : 1.6 + Math.random() * 0.3,
        stoppVid: Math.random() < (barn ? 0.55 : 0.3) ? Math.random() * W : null,
        stoppTid: 3 + Math.random() * 9,
        vinka: Math.random() < (barn ? 0.5 : 0.2),
        tStopp: 0, fas: Math.random() * 6
      };
      sim.folk.push(s);
    }
    for (const s of sim.folk) {
      if (!s.stannat && s.stoppVid !== null && Math.abs(s.x - s.stoppVid) < s.fart * dt + 0.01) s.stannat = true;
      if (s.stannat && s.tStopp < s.stoppTid) {
        s.tStopp += dt;
        const vinkar = s.vinka && s.tStopp > 1.5 && s.tStopp < 4.5;
        s.x = s.stoppVid + (vinkar ? Math.sin(s.tStopp * Math.PI * 4) * 0.22 : 0);
        s.avstand = Math.max(0.6, s.avstand - dt * 0.15); // går lite närmare glaset
      } else {
        if (s.stannat) { s.x = s.stoppVid; s.stoppVid = null; s.stannat = false; }
        s.x += s.dir * s.fart * dt;
      }
      satt(s.id, s.x, s.avstand, 'sim', s.hojd);
    }
    sim.folk = sim.folk.filter(s => {
      const ute = s.x < XMIN - 0.1 || s.x > XMAX + 0.1;
      if (ute) ta(s.id);
      return !ute;
    });
  }
  function rensaSim() { for (const s of sim.folk) ta(s.id); sim.folk = []; }

  // ---------- sol och mörker ----------
  function solhojd(date, lat, lon) {
    const rad = Math.PI / 180;
    const d = (date.getTime() - Date.UTC(2000, 0, 1, 12)) / 86400000;
    const g = (357.529 + 0.98560028 * d) * rad;
    const q = 280.459 + 0.98564736 * d;
    const L = (q + 1.915 * Math.sin(g) + 0.020 * Math.sin(2 * g)) * rad;
    const e = (23.439 - 0.00000036 * d) * rad;
    const RA = Math.atan2(Math.cos(e) * Math.sin(L), Math.cos(L));
    const dec = Math.asin(Math.sin(e) * Math.sin(L));
    const gmst = ((18.697374558 + 24.06570982441908 * d) % 24 + 24) % 24;
    const H = (gmst * 15 + lon) * rad - RA;
    return Math.asin(Math.sin(lat * rad) * Math.sin(dec) + Math.cos(lat * rad) * Math.cos(dec) * Math.cos(H)) / rad;
  }
  function solnedgang(date) {
    const d0 = new Date(date); d0.setHours(12, 0, 0, 0);
    let prev = solhojd(d0, F.plats.lat, F.plats.lon);
    for (let m = 5; m <= 12 * 60; m += 5) {
      const d = new Date(d0.getTime() + m * 60000);
      const h = solhojd(d, F.plats.lat, F.plats.lon);
      if (prev >= F.tandVidSolhojd && h < F.tandVidSolhojd) return d;
      prev = h;
    }
    return null; // polarnatt eller midnattssol
  }
  const klocka = { nu: false, timme: 20.5 }; // standard: en kväll i labbet
  let basTimme = null, basT = 0;
  function uppdateraSol(t) {
    let d = new Date();
    if (!klocka.nu) { // manuell klocka tickar vidare från det valda klockslaget
      if (klocka.timme !== basTimme) { basTimme = klocka.timme; basT = t; }
      d.setHours(0, 0, 0, 0); d = new Date(d.getTime() + klocka.timme * 3600000 + (t - basT) * 1000);
    } else basTimme = null;
    input.tid = d;
    const h = solhojd(d, F.plats.lat, F.plats.lon);
    input.sol.hojd = h;
    input.sol.morker = Math.min(1, Math.max(0, (2 - h) / 10)); // 0 = dag, 1 = mörkt (≈ −8°)
    input.sol.tand = h < F.tandVidSolhojd;
  }
  let senasteDag = '';
  function uppdateraSolnedgang() {
    const k = input.tid.toDateString();
    if (k !== senasteDag) { senasteDag = k; input.sol.solnedgang = solnedgang(input.tid); }
  }

  // ---------- väder (Open-Meteo; SMHI kan bytas in) ----------
  async function hamtaVader() {
    const u = `https://api.open-meteo.com/v1/forecast?latitude=${F.plats.lat}&longitude=${F.plats.lon}` +
      `&current=temperature_2m,wind_speed_10m,wind_direction_10m,precipitation,cloud_cover&wind_speed_unit=ms&timezone=auto`;
    const r = await fetch(u); if (!r.ok) throw new Error('väder ' + r.status);
    const j = await r.json(); const c = j.current;
    Object.assign(input.vader, {
      temp: c.temperature_2m, vind: c.wind_speed_10m, vindriktning: c.wind_direction_10m,
      nederbord: Math.min(1, (c.precipitation || 0) / 2), moln: c.cloud_cover, kalla: 'Open-Meteo ' + c.time
    });
    try {
      const k = await (await fetch('https://services.swpc.noaa.gov/products/noaa-planetary-k-index.json')).json();
      const last = k[k.length - 1];
      const kp = Array.isArray(last) ? parseFloat(last[1]) : parseFloat(last.Kp ?? last.kp_index);
      if (!isNaN(kp)) { input.norrsken.kp = kp; input.norrsken.kalla = 'NOAA SWPC'; }
    } catch (e) { /* norrsken är frivilligt */ }
    return input.vader;
  }

  // ---------- WebSocket (steg 2 / TouchDesigner) ----------
  // Förväntat JSON: {personer:[{id,x,avstand}], vader:{...}, norrsken:{kp}}
  function kopplaWs(url) {
    const ws = new WebSocket(url);
    ws.onmessage = ev => {
      try { sattExternt(JSON.parse(ev.data)); } catch (e) { console.warn('ws', e); }
    };
    ws.onclose = () => setTimeout(() => kopplaWs(url), 2000);
  }
  const externa = new Set();
  function sattExternt(m) {
    if (m.personer) {
      const nya = new Set();
      for (const p of m.personer) { const id = 'ext' + p.id; nya.add(id); satt(id, p.x, p.avstand ?? 1.5, 'extern', p.hojd ?? 1.5); }
      for (const id of externa) if (!nya.has(id)) ta(id);
      externa.clear(); nya.forEach(i => externa.add(i));
    }
    if (m.vader) Object.assign(input.vader, m.vader);
    if (m.norrsken) Object.assign(input.norrsken, m.norrsken);
    if (m.telefon) input.telefon = m.telefon;
  }

  function steg(dt, t) {
    simSteg(dt, t);
    uppdateraPersoner(dt, t);
    uppdateraSol(t);
    uppdateraSolnedgang();
  }

  window.Indata = { input, steg, satt, ta, sim, rensaSim, klocka, hamtaVader, kopplaWs, sattExternt, solhojd, XMIN, XMAX, W };
})();
