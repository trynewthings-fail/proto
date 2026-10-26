# Nattfönstren · Window Wall

An idea sketchbook for an interactive rear-projection on **Exploratoriet's** ground-floor windows in Skellefteå: two window units, 6 × 2 panes, with a plaster pier between them. Made by Try New Things. It merges two sketches made for the same brief: Linus's *Nattfönstren* and Lukas's *Window Wall*.

**Open it:** https://proto.trynewthings.studio/window-wall/. Link to one idea with `#<id>`, e.g. `#glaslador`.

## What's in it

- **Four views:**
  - **Torget 3D** (Plaza 3D): the façade at night with people on the plaza.
  - **Fasad 2D** (Façade 2D): a photo-like elevation, with the sidewalk seen from above. Your mouse is a passer-by.
  - **Inifrån 3D** (Inside 3D): the room behind the glass, with projectors, throw distances and lux.
  - **Utgång** (Output): only the 12 panes, for the playback computer.
- **31 ideas** in four categories (Arcade, Puzzles, Crafty, Visual), filterable by STEAM letter and by who made them. Every idea has a bilingual pitch card.
- **The lab** (Labbet): simulated passers-by, weather and aurora (live from Open-Meteo/NOAA), the clock and darkness for Skellefteå, and a weekly schedule.
- **Specs** ([specs.html](specs.html)): the projector analysis, our measurements next to the brief's, and the questions to settle before getting a quote.
- **Svenska / English** toggle.
- **Fönsterlabbet** ([pitches/](pitches/)): five fully worked pitches (temperature, electricity, topography, tonight's sky, a Christmas snowflake factory), each with a web controller that stands in for the cameras. See [pitches/README.md](pitches/README.md).

## Add an idea

Open a Claude chat (claude.ai, the desktop app or Claude Code) with the **Order** connector on, and write for example:

> Lägg till den här idén i Window Wall-skissen (Order-projektet Exploratoriet: WindowProjection): rutorna blir såpbubblor som man spräcker genom att hoppa. Jag heter Anna.

Claude follows [CLAUDE.md](CLAUDE.md): it writes `ideas/<id>.js`, adds one line to `ideas/index.js`, pushes to `main`, and replies with the link. Your name goes on the idea. You need to be a member of that Order project to push. The Order Slack bot can't do this yet, because it has no GitHub tools.

## How it's built

| Path | What |
|---|---|
| `config/fasad.js` | The façade's geometry in metres: the **one** place to update when the windows are measured |
| `config/schema.js` | Default weekly schedule for the output |
| `motor/motor.js` | Linus's engine: scene contract in metres, masking, styles, STEAM label |
| `motor/indata.js` | Input bus: simulated people, mouse, weather, aurora, sun, WebSocket (`?ws=`) |
| `motor/ww.js` | Runs Window Wall ideas (pixel format) inside the engine |
| `motor/torget.js`, `motor/fasadvy.js`, `motor/vy3d.js` | The plaza 3D, façade 2D and inside 3D views |
| `motor/ui.js` | Views, library, pitch card, lab, schedule, language |
| `ideas/` | One file per idea, `index.js` (menu order) and two templates (`_mall-*.js`) |
| `tools/check.mjs` | Headless check of every idea: `node window-wall/tools/check.mjs [id]` (also runs as a GitHub Action) |

Plain static files with no build step. three.js r147 and Google Fonts load from CDNs.
