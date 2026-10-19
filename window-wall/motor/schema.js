// Schemaspelaren: byter scen (och stil) automatiskt.
// Läge 'alla' = alla scener i tur och ordning. Läge 'vecka' = dagens scener enligt veckoschemat.
// Standardschemat ligger i config/schema.js. Ändringar i labbet sparas i webbläsaren och kan laddas ner som en ny schema.js.
window.Schema = (function () {
  const DAGAR = [['man', 'Måndag'], ['tis', 'Tisdag'], ['ons', 'Onsdag'], ['tor', 'Torsdag'], ['fre', 'Fredag'], ['lor', 'Lördag'], ['son', 'Söndag']];
  const NYCKEL = 'nattfonster-schema-v1';
  const kopia = o => JSON.parse(JSON.stringify(o));
  const N = () => window.Nattfonster;

  let s = kopia(window.SCHEMA_STANDARD);
  let lokal = false;
  try { const l = localStorage.getItem(NYCKEL); if (l) { s = Object.assign(kopia(window.SCHEMA_STANDARD), JSON.parse(l)); lokal = true; } } catch (e) { /* privat läge: kör standardschemat */ }

  let t = 0, dagVal = null, senastDag = null, startad = false, respekteraStart = false;
  const lyss = [];
  const meddela = () => lyss.forEach(f => f());

  function dagNu() {
    if (dagVal) return dagVal;
    const d = (window.Indata && window.Indata.input.tid) || new Date();
    return DAGAR[(d.getDay() + 6) % 7][0];
  }
  function lista() {
    const alla = N().scener.map(x => x.id);
    if (s.lage === 'alla') return alla;
    if (s.lage === 'vecka') { const d = s.dagar[dagNu()]; const l = ((d && d.scener) || []).filter(id => alla.includes(id)); return l.length ? l : alla; }
    return [];
  }
  function stilNu() { const d = s.dagar[dagNu()]; return s.lage === 'vecka' && d && d.stil ? d.stil : null; }
  function spela(id) { N().aktivera(id); t = 0; meddela(); }

  function steg(dt) {
    if (s.lage === 'av') { startad = false; return; }
    const l = lista(); if (!l.length) return;
    const dag = dagNu();
    if (!startad || dag !== senastDag) {
      const forsta = !startad; startad = true; senastDag = dag;
      const st = stilNu(); if (st) N().sattStil(st);
      if (forsta && respekteraStart && N().aktiv) { t = 0; meddela(); return; } // scenen i adressen får visas klart först
      spela(l[0]); return;
    }
    t += dt;
    if (t > s.sekPerScen) {
      const i = l.indexOf(N().aktiv && N().aktiv.id);
      spela(l[(i + 1) % l.length]);
    }
  }

  function spara() { try { localStorage.setItem(NYCKEL, JSON.stringify(s)); lokal = true; } catch (e) {} meddela(); }

  return {
    DAGAR,
    get config() { return s; },
    get lokal() { return lokal; },
    steg, lista, dagNu,
    // respektera: behåll scenen som valts i adressen om den finns i dagens lista
    starta(respektera) { respekteraStart = !!respektera; N().vidBild(steg); },
    sattLage(l) { s.lage = l; startad = false; spara(); },
    // som sattLage men sparas inte (labbet startar med schemat av utan att skriva över ett sparat schema)
    sattLageTillfalligt(l) { s.lage = l; startad = false; meddela(); },
    sattSek(v) { s.sekPerScen = v; spara(); },
    vaxla(dag, id, pa) {
      const d = s.dagar[dag] || (s.dagar[dag] = { scener: [], stil: 'auto' });
      d.scener = d.scener.filter(x => x !== id); if (pa) d.scener.push(id);
      const ordning = N().scener.map(x => x.id); d.scener.sort((a, b) => ordning.indexOf(a) - ordning.indexOf(b));
      if (dag === dagNu()) startad = false;
      spara();
    },
    sattStil(dag, stil) { s.dagar[dag].stil = stil; if (dag === dagNu()) startad = false; spara(); },
    sattDag(d) { dagVal = d; startad = false; meddela(); },
    get dagVal() { return dagVal; },
    nasta() { const l = lista(); if (!l.length) return; const i = l.indexOf(N().aktiv && N().aktiv.id); spela(l[(i + 1) % l.length]); },
    aterstall() { s = kopia(window.SCHEMA_STANDARD); try { localStorage.removeItem(NYCKEL); } catch (e) {} lokal = false; startad = false; meddela(); },
    exportera() {
      return '// Veckoschema för Nattfönstren, exporterat från labbet ' + new Date().toLocaleString('sv-SE') + '\n' +
        '// Lägg filen i labbet/config/ så följer utgången (TouchDesigner/kioskdator) schemat.\n' +
        'window.SCHEMA_STANDARD = ' + JSON.stringify(s, null, 2) + ';\n';
    },
    status() {
      const l = lista(), id = N().aktiv && N().aktiv.id;
      return { lage: s.lage, dag: dagNu(), lista: l, plats: l.indexOf(id), kvar: Math.max(0, Math.ceil(s.sekPerScen - t)) };
    },
    vidAndring: f => lyss.push(f)
  };
})();
