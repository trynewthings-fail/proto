// Fönsterrymden: all geometri i meter. EN källa för alla vyer (2D-fasad, torget i 3D, 3D inifrån, utgången).
// Måtten är uppskattade från fotot och INTE uppmätta på plats. Byt siffrorna här när de är uppmätta.
// Koordinater: x = 0 vid vänstra fönstrets vänsterkant, y = 0 vid fönstrens överkant (y växer nedåt).
window.FASAD = {
  version: '0.3 · uppskattat från fotot, ej uppmätt',
  // Två fönster med 3 kolumner × 2 rader (12 rutor) och en mur på ca 0,75 m emellan.
  // Varje fönster: 3 × 0,60 m rutor + 2 spröjs à 0,14 m + karm 0,08 m på båda sidor = 2,24 m.
  sektioner: [
    { id: 'V', x: 0.0, bredd: 2.24, kolumner: 3, rader: 2 },   // vänster om muren
    { id: 'H', x: 2.99, bredd: 2.24, kolumner: 3, rader: 2 }   // höger om muren (mot entrén)
  ],
  hojd: 3.11,                // m: karm 0,08 + övre ruta 1,48 + tvärpost 0,19 + nedre ruta 1,28 + karm 0,08
  ram: 0.08,                 // m, fönsterkarm runt varje fönster
  sprojs: 0.14,              // m, lodrät spröjs mellan rutorna
  tvarpost: 0.19,            // m, vågrät tvärpost mellan övre och nedre raden
  radHojd: [1.48, 1.28],     // m, rutornas höjd uppifrån och ned
  fonsterUnderkant: 0.75,    // m över mark
  fasadRiktning: 180,        // grader, åt vilket håll fasaden vetter (antagande: söder)
  plats: { namn: 'Skellefteå', lat: 64.750, lon: 20.950 },
  tandVidSolhojd: -3,        // grader: schemat tänder när solen är lägre än så här (antagande)
  zonDjup: 6,                // m framför glaset där personer räknas
  pxPerMeter: 400,           // renderupplösning för utgången
  farg: {
    natt: '#05070d', krita: '#f3efe6', orange: '#e8641b',
    is: '#9fd3ff', norrsken: '#6dffb0', glod: '#ffb347',
    mur: '#e8cebe', murNatt: '#3b322e', karm: '#f4f1ea'
  },
  // Linus tidigare antagande enligt briefen, för jämförelse (används inte): fönster 2,5 × 3,0 m, spröjs 0,07 m.
  briefen: { bredd: 2.5, hojd: 3.0, sprojs: 0.07, mur: 0.75 }
};
