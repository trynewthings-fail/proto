# proto

github pages demos — [proto.trynewthings.studio](https://proto.trynewthings.studio)

## Lägg till en demo

1. Skapa en mapp i roten med en `index.html`.
2. Sätt `<title>` och gärna `<meta name="description">` — de blir namn och beskrivning i listan.
3. Commit. Listan på startsidan byggs om automatiskt.

Listan byggs på två ställen: en pre-commit-hook lokalt, och en GitHub Action vid push
(så att demos som läggs till i webbeditorn också kommer med).

Hooken ligger i repot. Efter en fresh clone, kör en gång:

```
git config core.hooksPath .githooks
```

Vill du bygga om listan för hand: `python3 tools/build-index.py`
