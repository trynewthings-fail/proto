/* motor/ui.js · Gränssnittet: vyer (torget 3D, fasad 2D, inifrån 3D, utgång), idébiblioteket, receptkortet,
   labbets reglage och veckoschemat. Bygger på Linus fönsterlabb och Lukas pitchkort. Ändra inte för en ny idé. */
(function () {
  'use strict';
  const F = window.FASAD, N = window.Nattfonster, I = window.Indata, W = window.WW, S_ = window.Schema, inp = I.input;
  const q = new URLSearchParams(location.search);
  const L = W.L, ic = W.ic, esc = W.esc;
  const spara = (k, v) => { try { localStorage.setItem(k, v); } catch (e) {} };
  const las = k => { try { return localStorage.getItem(k); } catch (e) { return null; } };

  /* ---------- texter ---------- */
  const TX = {
    sv: {
      rubrik: 'Nattfönstren', eyebrow: 'Exploratoriet · 6 × 2 rutor · Linus & Lukas',
      lede: 'Tolv fönsterrutor till vänster om entrén blir ett levande experiment på mörka kvällar. Välj en idé och se den i fasaden, på torget eller inifrån.',
      torget: 'Torget 3D', fasad: 'Fasad 2D', inifran: 'Inifrån 3D', utgang: 'Utgång', specs: 'Projektorer & mått', aterstall: 'Återställ vy',
      stamFilter: 'STEAM', avFilter: 'Av', alla: 'Alla', ingaIdeer: 'Inga idéer matchar filtret.',
      spelbar: 'Spelbar', skiss: 'Skiss', spelare: 'Spelare', runda: 'Runda', lage: 'Läge', indataL: 'Indata', bastFor: 'Bäst för', verbL: 'Verb', behover: 'Behöver',
      lasbar: 'Läsbar på 20 m', publik: 'Lockar publik', insats: 'Insats att bygga', stamning: 'Stämning', testknappar: 'Testa',
      labb: 'Labbet: indata, schema, visning', folk: 'Förbipasserande (simulerade)', simFolk: 'Simulera folk som går förbi', tathet: 'Täthet',
      vader: 'Väder och himmel', temp: 'Temperatur', vind: 'Vind', vindFran: 'Vind från', nederbord: 'Nederbörd', kp: 'Norrsken Kp',
      vaderHjalp: 'Reglagen styr. Hämta för att se kvällens riktiga väder.', hamta: 'Hämta väder för Skellefteå', hamtar: 'Hämtar …', kundeInte: 'Kunde inte hämta: ',
      tid: 'Tid och mörker', foljKlockan: 'Följ klockan (nu)', klockslag: 'Klockslag', foljSchema: 'Tänd bara i skymningen', schema: 'Schema',
      schemaAv: 'Av', schemaAlla: 'Alla idéer', schemaVecka: 'Veckoschema', redigera: 'Redigera veckoschema', nasta: 'Nästa idé ›',
      visning: 'Fasadvyn', helaFasaden: 'Hela fasaden', narbild: 'Närbild', visaMur: 'Visa mur och spröjs (S)', visaRacke: 'Visa räcke och bänk', visaPersoner: 'Visa personer',
      oppnaUtgang: 'Öppna utgångsläget', schemaAvText: 'Av: idén byts bara när du väljer.', av: ' av ', egen: 'egen idé', nastaOm: 'nästa om ',
      tands: 'Tänds i dag ', nu: ' · nu: ', tand: 'TÄND', slackt: 'släckt', solhojd: 'solhöjd ', personerIZon: ' personer i zonen',
      fasadHint: 'Fasaden ovan, trottoaren uppifrån nedan. Musen är en person: rör den över trottoaren (avstånd till glaset) eller över fasaden. Vifta snabbt = vinka. ← → byter idé · F helskärm · S spröjs/mur',
      foot: 'Lägg till en idé: be en Claude-chatt med Order-kopplingen "Lägg till den här idén i Window Wall-skissen: …". Dra för att rotera, scrolla för att zooma. Bots och simulerade personer står in för publiken.',
      dagar: 'Veckoschema', schemaHjalp: 'Välj tre eller fyra idéer per dag. Utgången visar dagens idéer i tur och ordning, så länge fönstren är tända. Ändringar sparas i den här webbläsaren. Ladda ner schemat för att lägga in det i installationen.',
      tidPerIde: 'Tid per idé', forhandsvisa: 'Förhandsvisa', idag: 'Idag', ide: 'Idé', stil: 'Stil', laddaNer: 'Ladda ner schema.js', aterstallSchema: 'Återställ förslaget',
      egetSchema: 'Eget schema sparat i webbläsaren.', standardSchema: 'Visar standardschemat från config/schema.js.', st: ' st', idensStil: 'Idéns', stang: 'Stäng'
    },
    en: {
      rubrik: 'Night Windows', eyebrow: 'Exploratoriet · 6 × 2 panes · Linus & Lukas',
      lede: 'Twelve window panes left of the entrance become a living experiment on dark evenings. Pick an idea and see it on the façade, from the plaza or from inside.',
      torget: 'Plaza 3D', fasad: 'Façade 2D', inifran: 'Inside 3D', utgang: 'Output', specs: 'Projectors & specs', aterstall: 'Reset view',
      stamFilter: 'STEAM', avFilter: 'By', alla: 'All', ingaIdeer: 'No ideas match the filter.',
      spelbar: 'Playable', skiss: 'Sketch', spelare: 'Players', runda: 'Round', lage: 'Mode', indataL: 'Input', bastFor: 'Best for', verbL: 'Verbs', behover: 'Needs',
      lasbar: 'Readable from 20 m', publik: 'Crowd pull', insats: 'Build effort', stamning: 'Mood', testknappar: 'Try',
      labb: 'Lab: inputs, schedule, display', folk: 'Passers-by (simulated)', simFolk: 'Simulate people walking past', tathet: 'Density',
      vader: 'Weather and sky', temp: 'Temperature', vind: 'Wind', vindFran: 'Wind from', nederbord: 'Precipitation', kp: 'Aurora Kp',
      vaderHjalp: 'The sliders decide. Fetch to see tonight’s real weather.', hamta: 'Fetch weather for Skellefteå', hamtar: 'Fetching …', kundeInte: 'Could not fetch: ',
      tid: 'Time and darkness', foljKlockan: 'Follow the clock (now)', klockslag: 'Time of day', foljSchema: 'Only light up at dusk', schema: 'Schedule',
      schemaAv: 'Off', schemaAlla: 'All ideas', schemaVecka: 'Weekly', redigera: 'Edit weekly schedule', nasta: 'Next idea ›',
      visning: 'Façade view', helaFasaden: 'Whole façade', narbild: 'Close-up', visaMur: 'Show pier and mullions (S)', visaRacke: 'Show railing and bench', visaPersoner: 'Show people',
      oppnaUtgang: 'Open output mode', schemaAvText: 'Off: the idea only changes when you pick one.', av: ' of ', egen: 'own pick', nastaOm: 'next in ',
      tands: 'Lights up today ', nu: ' · now: ', tand: 'ON', slackt: 'off', solhojd: 'sun ', personerIZon: ' people in the zone',
      fasadHint: 'Façade above, the sidewalk seen from above below. The mouse is a person: move it over the sidewalk (distance to the glass) or over the façade. Wiggle fast = wave. ← → change idea · F fullscreen · S mullions/pier',
      foot: 'Add an idea: ask a Claude chat with the Order connector "Add this idea to the Window Wall sketch: …". Drag to orbit, scroll to zoom. Bots and simulated people stand in for the audience.',
      dagar: 'Weekly schedule', schemaHjalp: 'Pick three or four ideas per day. The output shows today’s ideas in turn while the windows are lit. Changes are saved in this browser. Download the schedule to put it in the installation.',
      tidPerIde: 'Time per idea', forhandsvisa: 'Preview', idag: 'Today', ide: 'Idea', stil: 'Style', laddaNer: 'Download schema.js', aterstallSchema: 'Reset to the proposal',
      egetSchema: 'Own schedule saved in this browser.', standardSchema: 'Showing the default schedule from config/schema.js.', st: '', idensStil: 'Idea’s', stang: 'Close'
    }
  };
  let sprak = q.get('sprak') || las('nf-sprak') || 'sv'; if (!TX[sprak]) sprak = 'sv';
  const t = k => (TX[sprak] && TX[sprak][k]) ?? TX.sv[k] ?? k;
  const DAGNAMN = { sv: ['Måndag', 'Tisdag', 'Onsdag', 'Torsdag', 'Fredag', 'Lördag', 'Söndag'], en: ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'] };
  const dagNamn = id => { const i = S_.DAGAR.findIndex(d => d[0] === id); return i < 0 ? id : DAGNAMN[sprak][i]; };

  const metaAv = s => W.meta(s);
  const idealista = () => N.scener;
  const owned = m => { const by = m.by, nm = L(m.name); if (!by) return nm; return sprak === 'sv' ? (/[sxz]$/i.test(by) ? `${by} ${nm}` : `${by}s ${nm}`) : (/s$/i.test(by) ? `${by}’ ${nm}` : `${by}’s ${nm}`); };

  /* ---------- utgångsläge: bara bilden ---------- */
  if (q.get('utgang') === '1') {
    W.sprak = N.ctx.sprak = sprak;
    document.body.classList.add('utgang');
    N.canvas.id = 'utgang'; document.body.appendChild(N.canvas);
    I.sim.pa = q.get('sim') === '1';
    N.canvas.addEventListener('pointermove', e => {
      const r = N.canvas.getBoundingClientRect(), sk = Math.min(r.width / N.W, r.height / N.H), ox = (r.width - N.W * sk) / 2;
      I.satt('mus', (e.clientX - r.left - ox) / sk, 1.0, 'mus');
    });
    N.canvas.addEventListener('pointerleave', () => I.ta('mus'));
    if (q.get('ws')) I.kopplaWs(q.get('ws'));
    if (S_.config.lage === 'av') S_.sattLageTillfalligt('alla');
    const id = q.get('ide') || location.hash.slice(1);
    N.aktivera(N.scener.some(s => s.id === id) ? id : N.scener[0].id);
    S_.starta(!!id); N.starta();
    return;
  }
  if (q.get('ws')) I.kopplaWs(q.get('ws'));

  /* ---------- element ---------- */
  const $ = id => document.getElementById(id);
  const flikar = $('flikar'), hudEl = $('hud'), padEl = $('pad'), ideasEl = $('ideas'), pitchEl = $('pitch'), filterEl = $('filter');
  const fasad = $('fasad'), fg = fasad.getContext('2d'), gatan = $('gatan'), gg = gatan.getContext('2d');
  const VYER = [['torget', 'eye'], ['fasad', 'kiosk'], ['inifran', 'projector']];
  let vy = q.get('vy') || las('nf-vy') || 'torget'; if (!VYER.some(v => v[0] === vy)) vy = 'torget';
  const filter = { steam: null, av: null };

  /* ---------- fasadvyn (Linus) ---------- */
  const MARK = N.H + F.fonsterUnderkant, GD = F.zonDjup + 0.6;
  const visning = { mask: true, personer: true, schema: false, detaljer: true, kamera: q.get('kamera') === 'nara' ? 'nara' : 'fasad' };
  let cam, SK;
  function sattKamera(namn) {
    visning.kamera = namn; cam = window.Fasadvy.KAMEROR[namn](N.W, MARK);
    const bredd = 1680; SK = bredd / (cam.x1 - cam.x0);
    fasad.width = bredd; fasad.height = Math.round((cam.y1 - cam.y0) * SK);
    gatan.width = bredd; gatan.height = Math.round(GD * Math.min(60, SK * 0.45));
  }
  sattKamera(visning.kamera);
  const mix = window.Fasadvy.mix;
  const prov = document.createElement('canvas'); prov.width = prov.height = 1;
  let glod = '255,180,120', provT = 0;
  function provaGlod(dt) {
    provT += dt; if (provT < 0.25) return; provT = 0;
    const pg = prov.getContext('2d', { willReadFrequently: true }); pg.drawImage(N.canvas, 0, 0, 1, 1);
    const [r, g_, b] = pg.getImageData(0, 0, 1, 1).data, k = 255 / Math.max(40, r, g_, b);
    glod = [r, g_, b].map(v => Math.round(Math.min(255, v * k))).join(',');
  }
  function ritaFasad() {
    const m = inp.sol.morker;
    fg.setTransform(SK, 0, 0, SK, -cam.x0 * SK, -cam.y0 * SK);
    if (!visning.mask) { fg.fillStyle = '#000'; fg.fillRect(cam.x0, cam.y0, cam.x1 - cam.x0, cam.y1 - cam.y0); fg.drawImage(N.canvas, 0, 0, N.W, N.H); return ritaPersoner(); }
    window.Fasadvy.rita(fg, { W: N.W, H: N.H, MARK, m, cam, pa: !visning.schema || inp.sol.tand, kalla: N.canvas, px: N.ctx.px, glod, detaljer: visning.detaljer });
    ritaPersoner();
  }
  function ritaPersoner() {
    if (!visning.personer) return;
    for (const p of inp.personer) {
      const k = 1 - Math.min(1, p.avstand / (F.zonDjup + 1)) * 0.6;
      const h = (p.hojd || 1.7) * (0.85 + 0.15 * k), x = p.x, bw = p.barn ? 0.3 : 0.4, fot = MARK + 0.15 + p.avstand * (visning.kamera === 'fasad' ? 0.12 : 0.04);
      fg.globalAlpha = 0.45 + 0.5 * k; fg.fillStyle = p.kalla === 'mus' ? '#1b1e26' : '#0e1015';
      fg.beginPath(); fg.arc(x, fot - h + 0.12, p.barn ? 0.11 : 0.12, 0, 7); fg.fill();
      fg.beginPath(); fg.roundRect(x - bw / 2, fot - h + 0.27, bw, h - 0.27, 0.12); fg.fill();
      fg.globalAlpha = 1;
    }
  }
  function ritaGatan() {
    const sx = SK, sy = gatan.height / GD;
    gg.setTransform(1, 0, 0, 1, 0, 0); gg.fillStyle = '#101319'; gg.fillRect(0, 0, gatan.width, gatan.height);
    gg.setTransform(sx, 0, 0, sy, -cam.x0 * sx, 0);
    gg.strokeStyle = 'rgba(255,255,255,0.06)'; gg.lineWidth = 1 / sy;
    for (let d = 1; d <= F.zonDjup; d++) { gg.beginPath(); gg.moveTo(cam.x0, d); gg.lineTo(cam.x1, d); gg.stroke(); }
    gg.fillStyle = mix(F.farg.mur, F.farg.murNatt, 0.7); gg.fillRect(cam.x0, 0, cam.x1 - cam.x0, 0.18);
    for (const s of F.sektioner) { gg.fillStyle = 'rgba(202,254,3,0.85)'; gg.fillRect(s.x, 0.05, s.bredd, 0.13); }
    gg.setTransform(1, 0, 0, 1, 0, 0);
    gg.font = '11px "IBM Plex Mono", monospace'; gg.fillStyle = 'rgba(255,255,255,0.35)';
    for (let d = 1; d <= F.zonDjup; d++) gg.fillText(d + ' m', 6, d * sy - 4);
    for (const p of inp.personer) {
      const X = (p.x - cam.x0) * sx, Y = p.avstand * sy;
      gg.fillStyle = p.kalla === 'mus' ? '#ff4fa3' : p.kalla === 'plats' ? '#CAFE03' : (p.vinkar ? '#ffb347' : '#ece8df');
      gg.beginPath(); gg.arc(X, Y, p.kalla === 'mus' ? 7 : (p.barn ? 4 : 5), 0, 7); gg.fill();
      gg.fillStyle = 'rgba(255,255,255,0.55)';
      gg.fillText('#' + p.nr + (p.barn ? (sprak === 'sv' ? ' barn' : ' child') : '') + (p.still > 1 ? (sprak === 'sv' ? ' still' : ' still') : '') + (p.vinkar ? (sprak === 'sv' ? ' vinkar' : ' waves') : ''), X + 9, Y + 4);
    }
  }
  const musX = (e, c) => { const r = c.getBoundingClientRect(); return cam.x0 + (e.clientX - r.left) / r.width * (cam.x1 - cam.x0); };
  const musY = (e, c) => { const r = c.getBoundingClientRect(); return cam.y0 + (e.clientY - r.top) / r.height * (cam.y1 - cam.y0); };
  gatan.addEventListener('pointermove', e => { const r = gatan.getBoundingClientRect(); I.satt('mus', musX(e, gatan), Math.max(0.3, (e.clientY - r.top) / r.height * GD), 'mus', 1.2); });
  fasad.addEventListener('pointermove', e => I.satt('mus', musX(e, fasad), 1.0, 'mus', 1.2));
  fasad.addEventListener('click', e => { if (N.aktiv) W.klick(N.aktiv.id, musX(e, fasad), musY(e, fasad)); });
  for (const c of [gatan, fasad]) c.addEventListener('pointerleave', () => I.ta('mus'));

  /* ---------- vyer ---------- */
  function valjVy(namn) {
    vy = namn; spara('nf-vy', namn);
    for (const [id] of VYER) $('vy-' + id).hidden = id !== namn;
    flikar.querySelectorAll('[data-vy]').forEach(b => b.setAttribute('aria-pressed', String(b.dataset.vy === namn)));
    $('btn-reset').hidden = namn !== 'torget';
    if (namn === 'torget') window.Torget.visa($('vy-torget')); else window.Torget.dolj();
    if (namn === 'inifran') window.Vy3d.visa($('vy3dCanvas'), $('vy3dPanel')).catch(e => { $('vy3dPanel').textContent = '3D: ' + e; });
    else window.Vy3d.dolj();
    I.ta('mus');
  }
  function byggFlikar() {
    flikar.innerHTML = VYER.map(([id, icon]) => `<button type="button" data-vy="${id}">${ic(icon)}${t(id)}</button>`).join('') +
      `<button type="button" data-utgang="1">${ic('projector')}${t('utgang')} ↗</button>`;
    flikar.querySelectorAll('[data-vy]').forEach(b => b.onclick = () => valjVy(b.dataset.vy));
    flikar.querySelector('[data-utgang]').onclick = oppnaUtgang;
    flikar.querySelectorAll('[data-vy]').forEach(b => b.setAttribute('aria-pressed', String(b.dataset.vy === vy)));
  }
  function oppnaUtgang() {
    const u = new URL(location.href); u.search = ''; u.hash = '';
    u.searchParams.set('utgang', '1'); u.searchParams.set('sim', '1'); if (N.aktiv) u.searchParams.set('ide', N.aktiv.id);
    window.open(u, '_blank');
  }
  $('btn-reset').onclick = () => { const idea = N.aktiv && N.aktiv.ww; if (!(idea && idea.resetView && idea.resetView())) W.view.reset(true); };

  /* ---------- biblioteket ---------- */
  const synliga = () => idealista().filter(s => { const m = metaAv(s); return (!filter.steam || m.steam === filter.steam) && (!filter.av || m.by === filter.av); });
  function byggFilter() {
    const skapare = [...new Set(idealista().map(s => metaAv(s).by).filter(Boolean))];
    filterEl.innerHTML = `
      <div class="rad"><span class="lbl">${t('stamFilter')}</span><button class="fchip" data-steam="">${t('alla')}</button>
        ${Object.entries(W.STEAM).map(([k, v]) => `<button class="fchip" data-steam="${k}" title="${esc(v[sprak])}" style="color:${v.f}"><b>${k}</b></button>`).join('')}</div>
      <div class="rad"><span class="lbl">${t('avFilter')}</span><button class="fchip" data-av="">${t('alla')}</button>
        ${skapare.map(b => `<button class="fchip" data-av="${esc(b)}">${esc(b)}</button>`).join('')}</div>`;
    filterEl.querySelectorAll('[data-steam]').forEach(b => { b.setAttribute('aria-pressed', String((b.dataset.steam || null) === filter.steam)); b.onclick = () => { filter.steam = b.dataset.steam || null; byggFilter(); byggIdeer(); }; });
    filterEl.querySelectorAll('[data-av]').forEach(b => { b.setAttribute('aria-pressed', String((b.dataset.av || null) === filter.av)); b.onclick = () => { filter.av = b.dataset.av || null; byggFilter(); byggIdeer(); }; });
  }
  function byggIdeer() {
    const vis = synliga(), akt = N.aktiv && N.aktiv.id;
    const html = W.CATS.map(c => {
      const lista = vis.filter(s => metaAv(s).cat === c.id); if (!lista.length) return '';
      return `<section class="cat"><div class="cat-head">${ic(c.icon)}<h3>${esc(L(c.name))}</h3><span>${esc(L(c.desc))}</span></div>
        <div class="cat-row">${lista.map(s => { const m = metaAv(s), st = W.STEAM[m.steam];
          return `<button class="idea" type="button" data-id="${esc(m.id)}" aria-current="${m.id === akt}">${m.playable ? '<span class="play"></span>' : ''}${st ? `<span class="st" style="color:${m.id === akt ? '#000' : st.f}">${m.steam}</span>` : ''}${esc(L(m.short))}<span class="by">${esc(m.by || '')}</span></button>`; }).join('')}</div></section>`;
    }).join('');
    ideasEl.innerHTML = html || `<p class="tom">${t('ingaIdeer')}</p>`;
  }
  ideasEl.addEventListener('click', e => { const b = e.target.closest('[data-id]'); if (b) valj(b.dataset.id); });
  function valj(id) {
    N.aktivera(id); spara('nf-ide', id);
    if (location.hash.slice(1) !== id) history.replaceState(null, '', '#' + id);
    ideasEl.querySelectorAll('[data-id]').forEach(b => b.setAttribute('aria-current', String(b.dataset.id === id)));
  }

  /* ---------- receptkortet ---------- */
  const dots = n => `<span class="dots" aria-label="${n}/5">${[1, 2, 3, 4, 5].map(k => `<i class="${k <= n ? 'on' : ''}"></i>`).join('')}</span>`;
  const chip = (icon, label, main) => `<span class="ichip${main ? ' main' : ''}">${ic(icon)}${esc(L(label))}</span>`;
  function byggPitch(s) {
    const m = metaAv(s), p = m.pitch || {}, cat = W.CATS.find(c => c.id === m.cat) || W.CATS[0], md = W.MODE[p.mode] || W.MODE.ambient, st = W.STEAM[m.steam];
    const endless = /^(All|Always|Drop)/.test((p.round && p.round.en) || p.round || '');
    const idea = s.ww;
    let extra = idea && idea.panel ? idea.panel() : '';
    if (m.knappar.length) extra += `<section class="box"><div class="box-h">${ic('touch')}${t('testknappar')}</div><div>${m.knappar.map((k, i) => `<button class="knapp" type="button" data-knapp="${i}">${esc(k.namn)}</button>`).join('')}</div></section>`;
    const verb = L(m.verb).split(',').map(v => v.trim()).filter(Boolean);
    pitchEl.innerHTML = `
      ${m.thumb ? `<img class="thumb" src="${esc(m.thumb)}" alt="" loading="lazy" onerror="this.remove()">` : ''}
      <div class="pitch-head"><div class="chips-top"><span class="chip">${ic(cat.icon)}${esc(L(cat.name))}</span>
        ${st ? `<span class="chip steam" style="color:${st.f}"><b>${m.steam}</b>${esc(st[sprak])}</span>` : ''}
        <span class="chip ghost">${m.playable ? t('spelbar') : t('skiss')}</span>${m.by ? `<span class="chip ghost">${ic('person')}${esc(m.by)}</span>` : ''}</div>
        <h2>${esc(owned(m))}</h2>
        ${m.fraga ? `<p class="fraga">${esc(L(m.fraga))}</p>` : ''}
        ${p.tagline ? `<p class="tag">${esc(L(p.tagline))}</p>` : ''}</div>
      ${p.players ? `<div class="stats">
        <div class="stat">${ic(p.players[0])}<b>${esc(L(p.players[1]))}</b><span>${t('spelare')}</span></div>
        <div class="stat">${ic(endless ? 'infinity' : 'clock')}<b>${esc(L(p.round))}</b><span>${t('runda')}</span></div>
        <div class="stat">${ic(md[0])}<b>${esc(L(md[1]))}</b><span>${t('lage')}</span></div></div>` : ''}
      ${verb.length ? `<div class="row"><span class="lbl">${t('verbL')}</span><div class="chips">${verb.map(v => `<span class="ichip verb">${esc(v)}</span>`).join('')}</div></div>` : ''}
      ${p.input ? `<div class="row"><span class="lbl">${t('indataL')}</span><div class="chips">${p.input.map((x, i) => (i ? '<span class="or">/</span>' : '') + chip(x[0], x[1], i === 0)).join('')}</div></div>` : ''}
      ${p.for ? `<div class="row"><span class="lbl">${t('bastFor')}</span><div class="chips">${p.for.map(a => W.AUD[a] ? chip(W.AUD[a][0], W.AUD[a][1]) : '').join('')}</div></div>` : ''}
      ${p.how ? `<ol class="steps">${p.how.map(h => `<li><span>${esc(L(h))}</span></li>`).join('')}</ol>` : ''}
      ${p.trick ? `<section class="trick"><svg class="sm" viewBox="0 0 321 322" aria-hidden="true"><use href="#tnt-smile"/></svg><p>${esc(L(p.trick))}</p></section>` : ''}
      ${extra}
      ${p.needs ? `<div class="row"><span class="lbl">${t('behover')}</span><div class="chips">${p.needs.map(x => chip(x[0], x[1])).join('')}</div></div>` : ''}
      ${p.open ? `<ul class="qs">${p.open.map(x => `<li>${ic('question')}<span>${esc(L(x))}</span></li>`).join('')}</ul>` : ''}
      ${m.stamning ? `<p class="stamning">${t('stamning')}: ${esc(m.stamning)}</p>` : ''}
      ${p.meters ? `<section class="meters">
        <div class="meter">${ic('eye')}<span>${t('lasbar')}</span>${dots(p.meters.read)}</div>
        <div class="meter">${ic('crowd')}<span>${t('publik')}</span>${dots(p.meters.crowd)}</div>
        <div class="meter">${ic('wrench')}<span>${t('insats')}</span>${dots(p.meters.effort)}</div></section>` : ''}`;
  }
  pitchEl.addEventListener('click', e => {
    const k = e.target.closest('[data-knapp]'); if (k && N.aktiv) { const kn = (N.aktiv.knappar || [])[+k.dataset.knapp]; if (kn) kn.gor(N.state, N.ctx); return; }
    const b = e.target.closest('[data-act]'); const idea = N.aktiv && N.aktiv.ww;
    if (b && idea && idea.panelClick) { idea.panelClick(b.dataset.act, b); b.blur(); }
  });
  W.ui.refresh = () => { if (N.aktiv) byggPitch(N.aktiv); uppdateraPad(); };
  function uppdateraPad() { const idea = N.aktiv && N.aktiv.ww; padEl.hidden = !(idea && idea.padVisible && idea.padVisible()); }
  padEl.addEventListener('pointerdown', e => { const b = e.target.closest('[data-k]'); const idea = N.aktiv && N.aktiv.ww; if (!b || !idea || !idea.pad) return; e.preventDefault(); idea.pad(b.dataset.k, true); });
  padEl.addEventListener('pointerup', e => { const b = e.target.closest('[data-k]'); const idea = N.aktiv && N.aktiv.ww; if (b && idea && idea.pad) idea.pad(b.dataset.k, false); });
  padEl.addEventListener('pointerleave', () => { const idea = N.aktiv && N.aktiv.ww; if (idea && idea.pad) idea.pad('soft', false); });

  N.vidByte(s => {
    byggPitch(s); uppdateraPad();
    ideasEl.querySelectorAll('[data-id]').forEach(b => b.setAttribute('aria-current', String(b.dataset.id === s.id)));
  });

  /* ---------- labbet ---------- */
  const labb = $('labb-innehall');
  const el = h => { const d = document.createElement('div'); d.innerHTML = h; return d.firstElementChild; };
  const synkas = [];
  function reglage(etikett, min, max, steg, get, set, fmt = v => v) {
    const r = el(`<div class="lrad"><span>${etikett}</span><input type="range" min="${min}" max="${max}" step="${steg}"><output></output></div>`);
    const i = r.querySelector('input'), o = r.querySelector('output'); const upd = () => { o.textContent = fmt(+get()); };
    i.value = get(); upd(); i.oninput = () => { set(+i.value); upd(); }; r._sync = () => { i.value = get(); upd(); }; return r;
  }
  function kryss(etikett, get, set) {
    const r = el(`<label class="kryss"><input type="checkbox"> ${etikett}</label>`); const i = r.querySelector('input');
    i.checked = get(); i.onchange = () => set(i.checked); r._sync = () => { i.checked = get(); }; return r;
  }
  const h4 = x => el(`<h4>${x}</h4>`);
  let schemaStatus, solStatus, fpsEl, lageKnapp, kamKnapp;
  const komma = v => sprak === 'sv' ? String(v).replace('.', ',') : String(v);
  function byggLabb() {
    labb.innerHTML = ''; synkas.length = 0;
    const add = (...xs) => xs.forEach(x => { labb.appendChild(x); if (x._sync) synkas.push(x); });
    add(h4(t('folk')),
      kryss(t('simFolk'), () => I.sim.pa, v => { I.sim.pa = v; if (!v) I.rensaSim(); }),
      reglage(t('tathet'), 0, 30, 1, () => I.sim.tathet, v => I.sim.tathet = v, v => v + '/min'));
    const vind = ['N', sprak === 'sv' ? 'NO' : 'NE', sprak === 'sv' ? 'O' : 'E', sprak === 'sv' ? 'SO' : 'SE', 'S', sprak === 'sv' ? 'SV' : 'SW', sprak === 'sv' ? 'V' : 'W', sprak === 'sv' ? 'NV' : 'NW'];
    add(h4(t('vader')),
      reglage(t('temp'), -35, 25, 0.5, () => inp.vader.temp, v => inp.vader.temp = v, v => komma(v.toFixed(1)) + '°'),
      reglage(t('vind'), 0, 20, 0.5, () => inp.vader.vind, v => inp.vader.vind = v, v => komma(v.toFixed(1)) + ' m/s'),
      reglage(t('vindFran'), 0, 359, 1, () => inp.vader.vindriktning, v => inp.vader.vindriktning = v, v => vind[Math.round(v / 45) % 8]),
      reglage(t('nederbord'), 0, 1, 0.05, () => inp.vader.nederbord, v => inp.vader.nederbord = v, v => Math.round(v * 100) + '%'),
      reglage(t('kp'), 0, 9, 0.1, () => inp.norrsken.kp, v => inp.norrsken.kp = v, v => komma(v.toFixed(1))));
    const vs = el(`<div class="status">${t('vaderHjalp')}</div>`), vk = el(`<button class="knapp" type="button">${t('hamta')}</button>`);
    vk.onclick = async () => { vs.textContent = t('hamtar'); try { await I.hamtaVader(); synkas.forEach(s => s._sync()); vs.textContent = `${inp.vader.kalla}\nKp ${inp.norrsken.kp} (${inp.norrsken.kalla})`; } catch (e) { vs.textContent = t('kundeInte') + e.message; } };
    add(vk, vs);
    add(h4(t('tid')),
      kryss(t('foljKlockan'), () => I.klocka.nu, v => I.klocka.nu = v),
      reglage(t('klockslag'), 0, 24, 0.25, () => I.klocka.timme, v => { I.klocka.timme = v; I.klocka.nu = false; synkas.forEach(s => s._sync()); },
        v => `${String(Math.floor(v)).padStart(2, '0')}:${String(Math.round((v % 1) * 60)).padStart(2, '0')}`),
      kryss(t('foljSchema'), () => visning.schema, v => visning.schema = v));
    solStatus = el('<div class="status"></div>'); add(solStatus);
    lageKnapp = el(`<div class="segment"><button type="button" data-l="av">${t('schemaAv')}</button><button type="button" data-l="alla">${t('schemaAlla')}</button><button type="button" data-l="vecka">${t('schemaVecka')}</button></div>`);
    lageKnapp.querySelectorAll('button').forEach(b => b.onclick = () => { S_.sattLage(b.dataset.l); markLage(); });
    const rk = el(`<button class="knapp" type="button">${t('redigera')}</button>`), nk = el(`<button class="knapp" type="button">${t('nasta')}</button>`);
    rk.onclick = oppnaSchema; nk.onclick = () => S_.nasta();
    schemaStatus = el('<div class="status"></div>');
    add(h4(t('schema')), lageKnapp, rk, nk, schemaStatus); markLage();
    kamKnapp = el(`<div class="segment"><button type="button" data-k="fasad">${t('helaFasaden')}</button><button type="button" data-k="nara">${t('narbild')}</button></div>`);
    kamKnapp.querySelectorAll('button').forEach(b => b.onclick = () => { sattKamera(b.dataset.k); markKam(); });
    add(h4(t('visning')), kamKnapp,
      kryss(t('visaMur'), () => visning.mask, v => visning.mask = v),
      kryss(t('visaRacke'), () => visning.detaljer, v => visning.detaljer = v),
      kryss(t('visaPersoner'), () => visning.personer, v => visning.personer = v)); markKam();
    const ub = el(`<button class="knapp" type="button">${t('oppnaUtgang')}</button>`); ub.onclick = oppnaUtgang; add(ub);
    add(el(`<div class="status">${F.version} · ${N.W.toFixed(2)} × ${N.H.toFixed(2)} m · ${N.canvas.width}×${N.canvas.height} px</div>`));
    fpsEl = el('<div class="status"></div>'); add(fpsEl);
  }
  const markLage = () => lageKnapp && lageKnapp.querySelectorAll('button').forEach(b => b.classList.toggle('aktiv', b.dataset.l === S_.config.lage));
  const markKam = () => kamKnapp && kamKnapp.querySelectorAll('button').forEach(b => b.classList.toggle('aktiv', b.dataset.k === visning.kamera));
  const titel = id => { const s = N.scener.find(x => x.id === id); return s ? L(metaAv(s).name) : id; };
  function uppdateraSchemaStatus() {
    const st = S_.status();
    if (st.lage === 'av') { schemaStatus.textContent = t('schemaAvText'); return; }
    const vad = st.lage === 'alla' ? t('schemaAlla') : dagNamn(st.dag);
    schemaStatus.textContent = `${vad} · ${st.plats >= 0 ? (st.plats + 1) + t('av') + st.lista.length : t('egen')} · ${t('nastaOm')}${st.kvar} s\n` + st.lista.map(titel).join(' → ');
  }

  /* ---------- veckoschemat (Linus) ---------- */
  const dlg = document.createElement('dialog'); dlg.className = 'schema'; document.body.appendChild(dlg);
  function oppnaSchema() { byggSchema(); dlg.showModal(); }
  function byggSchema() {
    const c = S_.config, DAG = S_.DAGAR, idag = S_.dagNu();
    const stilVal = (dag, v) => `<select data-dag="${dag}">${[{ id: 'auto', namn: t('idensStil') }, ...window.STILAR].map(x => `<option value="${x.id}"${x.id === v ? ' selected' : ''}>${x.namn}</option>`).join('')}</select>`;
    dlg.innerHTML = `
      <header><h2>${t('dagar')}</h2><button class="stang" type="button" aria-label="${t('stang')}">✕</button></header>
      <p class="hjalp">${t('schemaHjalp')}</p>
      <div class="rad2">
        <div class="segment" id="dl"><button type="button" data-l="av">${t('schemaAv')}</button><button type="button" data-l="alla">${t('schemaAlla')}</button><button type="button" data-l="vecka">${t('schemaVecka')}</button></div>
        <label>${t('tidPerIde')} <input type="number" id="dsek" min="10" max="900" step="5" value="${c.sekPerScen}"> s</label>
        <label>${t('forhandsvisa')} <select id="ddag"><option value="">${t('idag')} (${dagNamn(DAG[(new Date().getDay() + 6) % 7][0])})</option>${DAG.map(([id]) => `<option value="${id}"${S_.dagVal === id ? ' selected' : ''}>${dagNamn(id)}</option>`).join('')}</select></label>
      </div>
      <div class="tabell"><table>
        <thead><tr><th>${t('ide')}</th>${DAG.map(([id]) => `<th class="${id === idag ? 'idag' : ''}">${dagNamn(id).slice(0, 3)}<small>${(c.dagar[id] || { scener: [] }).scener.length}${t('st')}</small></th>`).join('')}</tr></thead>
        <tbody>${N.scener.map(sc => `<tr><td>${esc(titel(sc.id))} <small style="opacity:.6">${esc(metaAv(sc).by || '')}</small></td>${DAG.map(([id]) => `<td class="${id === idag ? 'idag' : ''}"><input type="checkbox" data-dag="${id}" data-scen="${sc.id}"${(c.dagar[id] || { scener: [] }).scener.includes(sc.id) ? ' checked' : ''} aria-label="${esc(titel(sc.id))} ${id}"></td>`).join('')}</tr>`).join('')}</tbody>
        <tfoot><tr><td>${t('stil')}</td>${DAG.map(([id]) => `<td class="${id === idag ? 'idag' : ''}">${stilVal(id, (c.dagar[id] || {}).stil || 'auto')}</td>`).join('')}</tr></tfoot>
      </table></div>
      <footer><button class="knapp" type="button" id="dner">${t('laddaNer')}</button><button class="knapp" type="button" id="dreset">${t('aterstallSchema')}</button>
        <span class="status">${S_.lokal ? t('egetSchema') : t('standardSchema')}</span></footer>`;
    dlg.querySelector('.stang').onclick = () => dlg.close();
    dlg.querySelectorAll('#dl button').forEach(b => { b.classList.toggle('aktiv', b.dataset.l === c.lage); b.onclick = () => { S_.sattLage(b.dataset.l); markLage(); byggSchema(); }; });
    dlg.querySelector('#dsek').onchange = e => S_.sattSek(Math.max(10, +e.target.value || 90));
    dlg.querySelector('#ddag').onchange = e => { S_.sattDag(e.target.value || null); byggSchema(); };
    dlg.querySelectorAll('tbody input').forEach(i => i.onchange = () => { S_.vaxla(i.dataset.dag, i.dataset.scen, i.checked); byggSchema(); });
    dlg.querySelectorAll('tfoot select').forEach(sv => sv.onchange = () => S_.sattStil(sv.dataset.dag, sv.value));
    dlg.querySelector('#dner').onclick = () => { const a = document.createElement('a'); a.href = URL.createObjectURL(new Blob([S_.exportera()], { type: 'text/javascript' })); a.download = 'schema.js'; a.click(); setTimeout(() => URL.revokeObjectURL(a.href), 2000); };
    dlg.querySelector('#dreset').onclick = () => { S_.aterstall(); markLage(); byggSchema(); };
  }
  dlg.addEventListener('click', e => { if (e.target === dlg) dlg.close(); });

  /* ---------- språk ---------- */
  function sattSprak(s) {
    sprak = s; W.sprak = s; N.ctx.sprak = s; spara('nf-sprak', s); document.documentElement.lang = s;
    document.querySelectorAll('[data-sprak]').forEach(b => b.setAttribute('aria-pressed', String(b.dataset.sprak === s)));
    $('rubrik').textContent = t('rubrik'); $('eyebrow').textContent = t('eyebrow'); $('lede').textContent = t('lede');
    $('btn-reset').textContent = t('aterstall'); $('lank-specs').textContent = t('specs') + ' ↗';
    $('fasad-hint').textContent = t('fasadHint'); $('foot').textContent = t('foot'); $('labb-rubrik').textContent = t('labb');
    document.title = (s === 'sv' ? 'Nattfönstren' : 'Night Windows') + ' · Window Wall';
    byggFlikar(); byggFilter(); byggIdeer(); byggLabb(); if (N.aktiv) byggPitch(N.aktiv);
  }
  document.querySelectorAll('[data-sprak]').forEach(b => b.onclick = () => sattSprak(b.dataset.sprak));

  /* ---------- tangenter ---------- */
  addEventListener('keydown', e => {
    if (e.target.closest && e.target.closest('input,select,textarea,dialog')) return;
    const s = N.aktiv; if (!s) return;
    if (s.ww) { if (s.ww.key && s.ww.key(e.key, true)) { e.preventDefault(); return; } }
    else if (s.tangent) { s.tangent(e, N.state, N.ctx); if (s.tangenter && e.defaultPrevented) return; }
    const vis = synliga(), i = vis.indexOf(s);
    if ((e.key === 'ArrowRight' || e.key === 'ArrowLeft') && vis.length && !(s.tangenter)) {
      const n = vis[(i + (e.key === 'ArrowRight' ? 1 : -1) + vis.length) % vis.length]; valj(n.id); e.preventDefault();
    }
    if (e.key === 'f' || e.key === 'F') { const m = vy === 'fasad' ? fasad : $('vy-' + vy); m.requestFullscreen?.(); }
    if ((e.key === 's' || e.key === 'S') && vy === 'fasad') { visning.mask = !visning.mask; synkas.forEach(x => x._sync()); }
  });
  addEventListener('keyup', e => { const idea = N.aktiv && N.aktiv.ww; if (idea && idea.key) idea.key(e.key, false); });
  addEventListener('hashchange', () => { const id = location.hash.slice(1); if (N.scener.some(s => s.id === id) && (!N.aktiv || N.aktiv.id !== id)) valj(id); });

  /* ---------- loopen ---------- */
  let fpsN = 0, fpsT = 0, solT = 0, hudT = 0;
  const hhmm = d => d ? d.toLocaleTimeString(sprak === 'sv' ? 'sv-SE' : 'en-GB', { hour: '2-digit', minute: '2-digit' }) : '—';
  N.vidBild(dt => {
    if (vy === 'fasad') { provaGlod(dt); ritaFasad(); ritaGatan(); }
    window.Torget.rendera(dt);
    fpsN++; fpsT += dt; solT += dt; hudT -= dt;
    if (hudT <= 0 && N.aktiv) { hudT = 0.25; let h = ''; try { h = N.aktiv.ww ? N.aktiv.ww.hud() : L(metaAv(N.aktiv).fraga); } catch (e) {} hudEl.textContent = h; }
    if (fpsT > 1) { fpsEl.textContent = `${Math.round(fpsN / fpsT)} fps · ${inp.personer.length}${t('personerIZon')}`; fpsN = 0; fpsT = 0; }
    if (solT > 0.25) {
      solT = 0;
      if (I.klocka.nu) { I.klocka.timme = inp.tid.getHours() + inp.tid.getMinutes() / 60; synkas.forEach(s => s._sync && s._sync()); }
      uppdateraSchemaStatus(); markLage();
      solStatus.textContent = `${hhmm(inp.tid)} · ${t('solhojd')}${komma(inp.sol.hojd.toFixed(1))}°\n${t('tands')}${hhmm(inp.sol.solnedgang)} (< ${F.tandVidSolhojd}°)${t('nu')}${inp.sol.tand ? t('tand') : t('slackt')}`;
    }
  });

  /* ---------- start ---------- */
  function go() {
    sattSprak(sprak);
    S_.sattLageTillfalligt('av');
    const fran = location.hash.slice(1) || q.get('ide') || las('nf-ide');
    const start = N.scener.some(s => s.id === fran) ? fran : N.scener[0].id;
    N.aktivera(start); S_.starta(true); N.starta();
    valjVy(vy);
    if (location.hash.slice(1) !== start) history.replaceState(null, '', '#' + start);
  }
  (document.fonts && document.fonts.load) ? Promise.all([
    document.fonts.load('500 40px "Space Grotesk"'), document.fonts.load('400 40px "IBM Plex Mono"'), document.fonts.load('700 40px "Alegreya"'), document.fonts.load('800 40px "Alegreya"')
  ]).catch(() => {}).finally(go) : go();
})();
