# Fönsterlabbet: five pitches for the windows

**Open it:** https://proto.trynewthings.studio/window-wall/pitches/. Link to one tab with `#temperatur`, `#elektricitet`, `#topografi`, `#stjarnhimlen` or `#jul`.

Five worked-out ideas for Exploratoriet's 12 panes, made for pitching. Every tab has three views: **Bild** (the image itself), **Bild + ramar** (with the frames on top) and **Fönster 3D** (the façade at night). Each tab also has a controller box. The **Djupkamera** box simulates the two Orbbec cameras: drag people around, or let your mouse over the image act as a visitor.

| Tab | What it is | Look | Data |
|---|---|---|---|
| 1 Temperatur | The same water at four scales: molecules, microscope, Skellefteå weather, a glass. Movement heats it, standing still cools it. | Fluorescent risograph on black stock | Today's temperature (simulated) |
| 2 Elektricitet | Twelve chapters from snow in the mountains to the outlet. Movement exaggerates every step. | Mid-century lithograph poster series | Skellefteå Kraft production and SE1 price (simulated) |
| 3 Topografi | Skellefteå as a layered terrain toy (GEO · ISO · DAT), map filters, a soil cross-section, and the sea level after the ice age. | TouchDesigner screens: bloom, scanlines, one tube per pane | Simplified terrain model |
| 4 Stjärnhimlen | The real sky above Skellefteå right now, with a guide that lights up around visitors. | Real sky with an engraved, gold-ink star-atlas guide | Computed from the clock (stars, planets, Moon); Kp simulated |
| 5 Snöflingefabriken | Christmas: steer your falling snowflake between three temperature columns (plates, needles, stars), then it goes on the tree. | Cut paper lit from behind, like an advent star | None |

The look comes from `src/15-style.js`: each tab draws as before and a WebGL pass (`post:` on the idea) turns the picture into its medium. The **Stil** button above the stage switches it off for comparison.

## Build

The page is one file, so it also works as a Claude artifact. Edit the parts in `src/` and run:

```bash
sh window-wall/pitches/build.sh
```

The script writes `fonsterlabbet.html` (the page body, for publishing as an artifact) and `index.html` (the same page with a full HTML skeleton, for GitHub Pages). Commit both.

| File | What |
|---|---|
| `src/00-head.html` | Title, fonts, CSS, markup, three.js r147 from jsDelivr |
| `src/15-style.js` | The art styles: one shader per tab (riso, poster, crt, atlas, paper) |
| `src/10-core.js` | Façade geometry (same numbers as `config/fasad.js`), drawing helpers, and `FAKE`, the simulated live data |
| `src/20-ui.js` | The controller kit: slider, knob, hold button, toggle, segments, draw pad, readouts |
| `src/30-people.js` | The simulated people on the plaza and the camera box |
| `src/40-view3d.js` | Fönster 3D |
| `src/45-snow.js` | The snow-crystal model shared by tabs 1 and 5 |
| `src/50-skydata.js` | 2,309 stars, constellation lines and names (from d3-celestial; rebuild with `tools/skydata.py`) |
| `src/51-astro.js` | Sun, Moon and planet positions for Skellefteå |
| `src/60-…64-*.js` | One file per tab |
| `src/90-main.js` | Tabs, views, the loop |

## Live data later

All simulated numbers come from one object, `FAKE` in `src/10-core.js`: `tempAt()`, `wind()`, `price()`, `production()` and `kp()`. To go live, fill a cache from a fetch (SMHI or Open-Meteo, Nord Pool, Skellefteå Kraft, NOAA for Kp) and return the cached value from those functions, falling back to the simulation when offline. Fetches work on GitHub Pages but are blocked inside a Claude artifact. Then update the amber "simulated" notes in each tab.
