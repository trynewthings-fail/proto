# Nattfönstren / Window Wall: rules for adding or changing an idea

Live: https://proto.trynewthings.studio/window-wall/ · one idea: `…/window-wall/#<id>` · output only (for the installation): `…/window-wall/?utgang=1&sim=1`

This is a sketchbook for an interactive rear-projection on Exploratoriet's façade: two window units of 3 × 2 panes (12 panes) with a plaster pier between. It merges Linus's *Nattfönstren* (engine, inputs, 2D façade, projector room, schedule) and Lukas's *Window Wall* (3D plaza, categories, pitch cards). Every **idea** is one JS file. The site is **Swedish first with an English toggle**.

## 1. Scope: what you may touch

**Adding an idea changes exactly two files:**
1. Create `window-wall/ideas/<id>.js`.
2. Add `'<id>',` as a new line in `window-wall/ideas/index.js`, at the end of the list. Change nothing else in that file.

**Changing an idea** touches only `ideas/<id>.js`. Keep its `id` and `by` unless the request says otherwise.

**Never edit** anything under `motor/`, `config/`, `tools/`, `media/`, or `index.html`, `specs.html`, `style.css`, other ideas, other folders in `proto`, or proto's root `index.html` (it is generated). If an idea needs something the engine doesn't offer, build it inside the idea file. If that's impossible, create a task on the Order board *Window Wall* (project *Exploratoriet: WindowProjection*) describing what's needed, and say so in your reply.

## 2. Effort: quality over thrift

These run on people's Claude subscriptions, so spend what it takes to make the idea look and feel good. Polished references: `glaslador.js`, `skuggteatern.js`, `jaga-ljuset.js` (engine format), `tetris.js`, `relay.js` (WW format).

- **Read:** this file, the template for your format (`ideas/_mall-nattfonster.js` or `ideas/_mall-ww.js`), `ideas/index.js`, plus **two or three** existing ideas: the closest ones from section 8 and at least one polished one. You may read `motor/motor.js`, `motor/rita.js` or `motor/indata.js` to see exactly how a helper works. Skip `motor/ui.js`, `motor/torget.js`, `motor/vy3d.js`, `index.html` and `style.css`; you never need them.
- **Size:** most good ideas land at 150–300 lines (10–20 KB). The hard limit is 40 KB.
- **Make two passes.** Write the idea, review it against the quality bar (section 6), and do one improvement pass before pushing. Don't keep looping after that.
- If the request is unclear, pick the most interesting reading and put the doubt in `pitch.open` instead of asking several questions.
- **Build what was asked.** Don't run the full creative process (three tracks, the TNT test) here. One line of creative feedback in your reply is fine.

## 3. Delivery

1. **Push straight to `main`** (low-risk site, breakage is reverted by hand): use `push_to_repo` with `direct:true` on `trynewthings-fail/proto`. Commit message: `window-wall: add <Name>'s <idea name>`.
   - If Order says direct push isn't allowed and opens a PR, say so and give the PR link. A team admin can tick "Allow direct push to main" for proto on the Window Wall board.
   - If Order refuses with *"Only members of the project … can push"*, the requester isn't a member of the Order project *Exploratoriet: WindowProjection*. Don't retry another way. Give them the finished idea in a code block, and tell them to get added to the project (a role in it, or a task assigned to them); then the same push works.
2. Reply where you were asked, in the requester's language, with the live link `https://proto.trynewthings.studio/window-wall/#<id>` (GitHub Pages updates about a minute after the push) and the commit link.
3. The *Window Wall check* GitHub Action runs the checker after each push. Order tools can't see it, so ask the requester to open the link. If the façade shows "Scenfel: …" or "Idea crashed", they paste the message back and you push one fix.

If you can run commands (Claude Code), run `node window-wall/tools/check.mjs <id>` before pushing.

## 4. Two formats: pick the engine format for new ideas

| | **Engine format** (recommended) | **WW format** (still supported) |
|---|---|---|
| Starts with | `Nattfonster.registrera({ … })` | `WW.register(W => ({ … }))` |
| Draws in | **metres**, on the engine canvas (`ctx.g` is pre-scaled), y = 0 at the windows' top edge, y grows downward | **pixels** on its own canvas (`W.g`, 200 px/m), y = height above ground |
| People | `input.personer`: `{id, x, avstand, hojd, barn, vx, fart, still, vinkar, …}` | `W.people` / `W.tracked()`: `{id, x, z, vx, walk, hojd, barn, vinkar}` |
| Template | `ideas/_mall-nattfonster.js` | `ideas/_mall-ww.js` |

The engine format gets real inputs for free: waving detection, children vs adults (`barn`, `hojd`), weather, aurora Kp, sun and darkness for Skellefteå, phones, and a WebSocket from TouchDesigner or sensors. That's why it's the default.

## 5. Metadata (both formats). Every visible text is `{ sv, en }`

| Field | Rule |
|---|---|
| `id` | lowercase-with-dashes, unique, same as the file name |
| `cat` | `arcade` (fast, competitive) · `puzzle` (think together) · `crafty` (visitors make the content) · `visual` (stunning first, game second) |
| `by` | first name of the person who asked for the idea. The title shows as "Annas Bubblor" / "Anna's Bubbles" |
| `steam` | one letter: `S` science · `T` technology · `E` engineering · `A` arts · `M` maths |
| name, question, verbs | engine: `titel`, `fraga`, `verb` (Swedish) + `en: { titel, fraga, verb }`. WW: `name`, `short`, `fraga`, `verb` as `{ sv, en }` |
| `pitch` | see below |

```js
pitch: {
  tagline: { sv, en },                       // one sentence that sells it
  players: ['crowd', { sv: 'Alla', en: 'Anyone' }],   // icon person|group|crowd + label
  mode: 'ambient',                           // versus | coop | teams | ambient
  round: { sv: 'Kom när du vill', en: 'Drop in' },    // English starting All/Always/Drop gets ∞
  input: [['cam', { sv, en }], …],           // main option first; prefer the depth cam
  for: ['kid', 'family'],                    // kid teen family group school all
  how: [{ sv, en }, { sv, en }, { sv, en }], // exactly 3 short steps
  trick: { sv, en },                         // how it uses panes, mullions (spröjs), transom (tvärpost) or pier (muren)
  needs: [['projector', { sv, en }], …],
  open: [{ sv, en }],                        // 1–3 open questions
  meters: { read: 4, crowd: 4, effort: 2 }   // 1–5: readable from 20 m, crowd pull, build effort
}
```
Icons: `person group crowd kid teen family school phone cam pad button dial pencil scan touch kiosk clock infinity versus coop sparkle projector speaker wifi music eye wrench question joystick puzzle drop gear motion bolt`.
Write natural Swedish, not translated-sounding. Text drawn **on the façade** may be one language; keep it short and big.

## 6. Quality bar (check each before pushing)

1. **Readable from 20 m.** Key objects are at least ~0.15 m across, bold and saturated on dark backgrounds. Almost no text on the panes.
2. **Alive within 2 seconds with nobody playing.** Use simulated passers-by, bots or an attract mode. Real visitors will mostly see that state.
3. **Uses the architecture on purpose.** Things cross a mullion, the transom or the pier and pop out again, or each pane is its own world, or a whole 3-pane unit is one body-sized frame. Explain it in `pitch.trick`.
4. **Juice.** Glow, particles, squash-and-stretch, pops, ripples. Use the TNT smiley (`W.smiley`, or draw a face) for win and lose moments.
5. **The plaza takes part.** React to `vinkar` (waving), standing still (`still`), children (`barn`) and distance. WW ideas: `cast(i)` colours the 3D figures, `fig(i,T)` makes them jump or slump.
6. **A status line that tells a story.** WW: `hud()`. Engine format: the question is shown; draw scores big on the façade.
7. **A full loop:** start → play → end or success moment → restart. Nothing gets stuck after a few minutes.

## 7. API cheat sheet

**Engine format.** `setup(ctx)` returns the state, `frame(ctx, st, input)` runs every frame, and `avsluta(st, ctx)` is optional cleanup. Optional extras: `knappar: [{ namn, gor(st, ctx) }]` (test buttons in the pitch card), `tangenter: true` plus `tangent(e, st, ctx)` for keys.
- `ctx.g` (metres), `ctx.W`/`ctx.H`, `ctx.t`/`ctx.dt`, `ctx.rutor[12]` `{nr 1–12, sektion, kol 0–5, rad 0–1, x, y, w, h, cx, cy}`, `ctx.kolumner[6]` `{kol, x, w, cx, rutor}`, `ctx.sektioner[2]` (`_inner`, `_kol`, `_rader`).
- `ctx.farg.<natt|krita|orange|is|norrsken|glod|rosa|kant>`, `ctx.steamFarg('S')`, `ctx.rgba(name|hex, a)`, `ctx.text(str, x, y, {storlek, typ:'grotesk'|'mono', farg, align, baseline, alpha, vikt, maxBredd})`, `ctx.form(farg, {fyllAlpha, bredd})`, `ctx.linje(k)`, `ctx.kolumnVid(x)`, `ctx.yForHojd(m)`, `ctx.slump(seed)`, `ctx.sprak` ('sv'|'en').
- `input.personer[]`, `input.vader {temp, vind, vindriktning, nederbord, moln}`, `input.norrsken {kp}`, `input.sol {hojd, morker 0–1, tand}`, `input.tid` (Date), `input.telefon[]`.
- `Rita`: `clamp lerp ease brus rgba blanda rundrekt oga klump blick narmast(personer, x, maxAvst)`.
- Everything outside the 12 panes is masked black after `frame`, so draw freely.

**WW format.** `init() update(dt) draw(T) hud()`, plus optional `cast fig click(px,py) key(key,down) panel() panelClick(act) exit() resetView() padVisible() pad(k,down) crowd`.
- `W.g` (px), `wx(x) wy(y)`, `cellPx(c,r)` → `{x,y,w,h}`, `paneX paneY paneH colX unitCX`, `PY_BOT PY_TOP SX0 SX1 SY0 SY1 PW PHT PHB MUL TR PIER X0 PPM SW SH` (metres unless noted).
- `clearScreen cellBg text rr smiley(ctx,…) silhouette bcell COLS ROWS RT`.
- `people tracked() PC LIME PINK CYAN ORANGE VIOLET YELLOW FONT hexA clamp shuffle ic esc L`.
- `W.view.reset/seat(c)`, `W.ui.refresh()`.

## 8. Closest existing ideas

| If the idea is… | Read |
|---|---|
| Each pane its own world, reacting to people | `glaslador.js`, `huset-tittar.js`, `munnarna.js` |
| Silhouettes and shadows of visitors | `skuggteatern.js`, `shadows.js` |
| Things moving across the whole wall, behind the pier | `upp-och-ner.js`, `stjarnfall.js`, `aquarium.js` |
| A game where people run between columns | `jaga-ljuset.js`, `tolv-rutor.js` |
| Weather or sky data | `kyla.js`, `stjarnfall.js` |
| Click or tap tiles on the façade | `relay.js` (WW) |
| Keys or a playable game | `fonstertetris.js`, `tetris.js` |
