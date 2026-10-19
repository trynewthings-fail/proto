// Visuella stilar: palett + konturtjocklek + efterbehandling. Gäller alla scener.
// Scenerna läser ctx.farg.* och ctx.stil.kontur; stilen byter paletten under dem.
// Palettnycklar: natt (botten), krita (bläck), orange (huvudaccent), is, norrsken, glod, rosa (accenter), kant (konturfärg).
window.STILAR = (function () {
  const F = window.FASAD.farg;
  const tmp = {};
  const lager = (namn, w, h) => {
    let c = tmp[namn];
    if (!c || c.width !== w || c.height !== h) { c = tmp[namn] = document.createElement('canvas'); c.width = w; c.height = h; }
    return c;
  };

  // kritdamm: ett brusmönster som nöter bort lite av allt som ritats
  let korn = null;
  function kritaPost(g, canvas, ctx) {
    if (!korn) {
      korn = document.createElement('canvas'); korn.width = korn.height = 256;
      const k = korn.getContext('2d');
      for (let i = 0; i < 7000; i++) { k.fillStyle = `rgba(0,0,0,${Math.random() * 0.9})`; k.fillRect(Math.random() * 256, Math.random() * 256, 1 + Math.random() * 2.5, 1 + Math.random()); }
    }
    g.save(); g.setTransform(1, 0, 0, 1, 0, 0);
    g.globalCompositeOperation = 'destination-out'; g.globalAlpha = 0.55;
    g.fillStyle = g.createPattern(korn, 'repeat'); g.fillRect(0, 0, canvas.width, canvas.height);
    g.globalCompositeOperation = 'destination-over'; g.globalAlpha = 1;
    g.fillStyle = ctx.farg.natt; g.fillRect(0, 0, canvas.width, canvas.height);
    g.restore();
  }

  // neon: billig bloom via nedskalning + oskärpa
  function bloomPost(g, canvas) {
    const s = lager('bloom', canvas.width >> 2, canvas.height >> 2), sg = s.getContext('2d');
    sg.clearRect(0, 0, s.width, s.height);
    sg.filter = 'blur(5px)'; sg.drawImage(canvas, 0, 0, s.width, s.height); sg.filter = 'none';
    g.save(); g.setTransform(1, 0, 0, 1, 0, 0);
    g.globalCompositeOperation = 'lighter';
    g.globalAlpha = 0.9; g.drawImage(s, 0, 0, canvas.width, canvas.height);
    g.globalAlpha = 0.45; g.drawImage(s, -6, -6, canvas.width + 12, canvas.height + 12);
    g.restore();
  }

  // pixel: grova block och ett svagt rutnät
  let gridMonster = null, gridBlk = 0;
  function pixelPost(g, canvas, ctx) {
    const blk = Math.max(3, Math.round(ctx.px * 0.042));
    const s = lager('pix', Math.ceil(canvas.width / blk), Math.ceil(canvas.height / blk)), sg = s.getContext('2d');
    sg.imageSmoothingEnabled = true; sg.clearRect(0, 0, s.width, s.height);
    sg.drawImage(canvas, 0, 0, s.width, s.height);
    if (!gridMonster || gridBlk !== blk) {
      gridBlk = blk; gridMonster = document.createElement('canvas'); gridMonster.width = gridMonster.height = blk;
      const m = gridMonster.getContext('2d'); m.fillStyle = 'rgba(0,0,0,0.35)'; m.fillRect(0, 0, blk, 1); m.fillRect(0, 0, 1, blk);
    }
    g.save(); g.setTransform(1, 0, 0, 1, 0, 0);
    g.imageSmoothingEnabled = false;
    g.fillStyle = ctx.farg.natt; g.fillRect(0, 0, canvas.width, canvas.height);
    g.drawImage(s, 0, 0, s.width * blk, s.height * blk);
    g.fillStyle = g.createPattern(gridMonster, 'repeat'); g.fillRect(0, 0, canvas.width, canvas.height);
    g.imageSmoothingEnabled = true;
    g.restore();
  }

  // Doodle: som decken (Immersiv demokrati, Two Loops, sinnena). Svart botten, tjocka rundade linjer,
  // genomskinliga fyllningar och linjer som "kokar" lätt, som handritad animation (8 bilder per sekund).
  function doodlePost(g, canvas, ctx) {
    const w = canvas.width, h = canvas.height, fas = Math.floor(ctx.t * 8);
    const amp = ctx.px * 0.005, band = Math.max(4, Math.round(ctx.px * 0.02));
    const a = lager('doodA', w, h), ag = a.getContext('2d');
    ag.clearRect(0, 0, w, h); ag.drawImage(canvas, 0, 0);
    const brus = (x, k) => Math.sin(x * 0.013 + k * 1.7) * 0.6 + Math.sin(x * 0.031 - k * 2.3) * 0.4;
    g.save(); g.setTransform(1, 0, 0, 1, 0, 0);
    g.fillStyle = ctx.farg.natt; g.fillRect(0, 0, w, h);
    for (let y = 0; y < h; y += band) g.drawImage(a, 0, y, w, band, brus(y, fas) * amp, y, w, band);
    ag.clearRect(0, 0, w, h); ag.drawImage(canvas, 0, 0);
    g.fillRect(0, 0, w, h);
    for (let x = 0; x < w; x += band) g.drawImage(a, x, 0, band, h, x, brus(x, fas + 3) * amp, band, h);
    g.restore();
  }

  // Färger med betydelse: S cyan, T blå, E bärnsten, A rosa, M lime (samma kodning som i decken).
  const STEAM = { S: '#2fd6e0', T: '#7b93ff', E: '#ffb21e', A: '#ff4fa3', M: '#cafe03' };

  // Just nu använder vi en enda stil. De andra ligger kvar i arkivet om vi vill tillbaka till dem.
  window.STILAR_ARKIV = [

    { id: 'natt', namn: 'Natt', beskr: 'Labbets grundstil: mörker, krita och Exploratoriets orange.',
      farg: { natt: F.natt, krita: F.krita, orange: F.orange, is: F.is, norrsken: F.norrsken, glod: F.glod, rosa: '#ff7fae', kant: '#05070d' }, kontur: 1 },
    { id: 'pop', namn: 'Pop', beskr: 'Som våra deck: platta former, tjocka svarta konturer, rosa och lime.',
      farg: { natt: '#000000', krita: '#f4ffd8', orange: '#ff4fa3', is: '#6fd3ff', norrsken: '#cafe03', glod: '#ffd23f', rosa: '#ff8a3d', kant: '#000000' }, kontur: 2.4 },
    { id: 'krita', namn: 'Krita', beskr: 'Griffeltavla: kritdamm, pastell, som en lärare ritat det.',
      farg: { natt: '#152019', krita: '#eeede4', orange: '#f4a27f', is: '#9fd0e8', norrsken: '#b9e3a1', glod: '#f2d97c', rosa: '#f1a9cb', kant: '#152019' }, kontur: 1.3, post: kritaPost },
    { id: 'neon', namn: 'Neon', beskr: 'Lysrör i rymden: mättade färger som blöder ljus.',
      farg: { natt: '#02010a', krita: '#e8f0ff', orange: '#ff2d8d', is: '#00e5ff', norrsken: '#7dff3a', glod: '#ffe600', rosa: '#b84dff', kant: '#02010a' }, kontur: 1.2, post: bloomPost },
    { id: 'pixel', namn: 'Pixel', beskr: '8-bitars spelvärld: grova block, sju färger.',
      farg: { natt: '#0e0b20', krita: '#fff3d6', orange: '#ff6b35', is: '#4cc9f0', norrsken: '#80ed99', glod: '#ffd166', rosa: '#ef476f', kant: '#0e0b20' }, kontur: 1.5, post: pixelPost }
  ];

  return [
    { id: 'doodle', namn: 'Doodle', beskr: 'Som våra deck: svart botten, handritade linjer som kokar lätt, genomskinliga fyllningar, Alegreya.',
      farg: { natt: '#000000', krita: '#f4ffd8', orange: '#cafe03', is: '#2fd6e0', norrsken: '#7b93ff', glod: '#ffb21e', rosa: '#ff4fa3', kant: '#000000' },
      steam: STEAM, kontur: 1.6, linje: 0.012, typsnitt: { grotesk: '"Alegreya", Georgia, serif' }, post: doodlePost },
    // Ren: samma palett utan efterbehandling. Används av idéerna i WW-formatet (motor/ww.js), som ritar färdiga pixlar.
    { id: 'ren', namn: 'Ren', beskr: 'Samma palett, utan kokande linjer.',
      farg: { natt: '#000000', krita: '#f4ffd8', orange: '#cafe03', is: '#2fd6e0', norrsken: '#7b93ff', glod: '#ffb21e', rosa: '#ff4fa3', kant: '#000000' },
      steam: STEAM, kontur: 1.6, linje: 0.012, typsnitt: { grotesk: '"Alegreya", Georgia, serif' } }
  ];

})();
