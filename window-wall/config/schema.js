// Veckoschema. Det här är standardschemat som utgången (TouchDesigner/kioskdator, ?utgang=1) följer.
// Redigera i labbet (Labb → Schema → Redigera veckoschema) och ladda ner en ny schema.js till den här mappen.
// lage: 'av' (scenen byts bara för hand) · 'alla' (alla idéer i tur och ordning) · 'vecka' (dagens idéer)
// stil: 'auto' (varje idés egen stil) eller ett id ur motor/stilar.js
// Idéerna anges med sitt id (filnamnet i ideas/). I labbet startar schemat avstängt; utgången följer det här.
window.SCHEMA_STANDARD = {
  lage: 'vecka',
  sekPerScen: 90,
  dagar: {
    man: { scener: ['kyla', 'huset-tittar', 'stjarnfall', 'aurora'], stil: 'auto' },          // måndag: kyla, ögon, stjärnor
    tis: { scener: ['tolv-rutor', 'jaga-ljuset', 'fonstertetris', 'relay'], stil: 'auto' },  // tisdag: lekar tillsammans
    ons: { scener: ['tusen-ogon', 'tittut', 'skuggteatern', 'residents'], stil: 'auto' },    // onsdag: sagor och gömställen
    tor: { scener: ['munnarna', 'ljudfonstret', 'tunneln', 'rhythm'], stil: 'auto' },        // torsdag: ljud, munnar, svindel
    fre: { scener: ['jaga-ljuset', 'fonstertetris', 'upp-och-ner', 'tetris'], stil: 'auto' }, // fredag: fest
    lor: { scener: ['huset-tittar', 'munnarna', 'tittut', 'shadows'], stil: 'auto' },        // lördag: lekplatsdag
    son: { scener: ['skuggteatern', 'stjarnfall', 'kyla', 'aquarium'], stil: 'auto' }        // söndag: lugnt
  }
};
