# Window Wall: rules for adding or changing an idea

Live page: https://proto.trynewthings.studio/window-wall/ · deep link to one idea: `…/window-wall/#<id>`

A 3D sketch of Exploratoriet's façade. Two window units of 3 × 2 panes (12 panes) have a rear-projected screen behind them. Each **idea** is one JS file that draws onto that screen. This file has the rules and the API. Read all of it.

## 1. Scope: what you may touch

**Adding an idea changes exactly two files:**
1. Create `window-wall/ideas/<id>.js`.
2. Add `'<id>',` as a new line in `window-wall/ideas/index.js`, at the end of the list. Change nothing else in that file.

**Changing an idea** touches only `ideas/<id>.js`. Keep its `id` and `by` unless the request says otherwise.

**Never edit** `core.js`, `app.js`, `style.css`, `index.html`, `tools/`, other ideas, other folders in `proto`, or proto's root `index.html` (it is generated).

If an idea needs something the core doesn't offer, build it inside your idea file. If that isn't possible, don't change the core. Create a task on the Order board *Window Wall* (project *Exploratoriet: WindowProjection*) describing what's needed, and say so in your reply.

## 2. Effort: quality over thrift

These run on people's Claude subscriptions, so spend what it takes to make the idea look and feel good. An idea should be as polished as `tetris.js`, `relay.js` or `residents.js`, not a quick placeholder.

- **Read:** this file, `ideas/_template.js` and `ideas/index.js`, plus **two or three** existing ideas, the closest ones from section 6 and at least one of the polished ones above. You may read `core.js` if you need to know exactly how a helper behaves. Skip `app.js`, `style.css` and `index.html`; you never need them.
- **Size:** most good ideas land at **150–300 lines (10–20 KB)**. The hard limit is 40 KB.
- **Make two passes.** Write the idea, then review it against the quality bar below and do one improvement pass before pushing. Don't keep looping after that.
- If the request is unclear, pick the most interesting reading and put the doubt in `pitch.open` instead of asking several questions.
- Reuse helpers from `WW` (below) rather than writing your own drawing utilities.

**Quality bar** (check each before pushing):
1. **Readable from 20 m.** Key objects are at least ~0.15 m (30 px) across and drawn in bold, saturated `PC` colours on dark backgrounds. There's no small text on the panes; numbers are big or not there at all.
2. **Alive within 2 seconds with nobody playing.** Bots, AI players or simulated people (`tracked()`) drive it like a real session: scores change, rounds end and restart.
3. **Uses the architecture on purpose.** Something crosses a mullion, the transom or the pier and pops out again. Or each pane is its own world. Or a whole 3-pane unit is used as one body-sized frame. Explain it in `pitch.trick`.
4. **Juice.** Feedback when something happens: flashes, glow (`g.shadowBlur`), particles or confetti, squash-and-stretch, trails, short text pops like "PERFECT". Use the TNT `smiley` for win/lose moments.
5. **The plaza takes part.** `cast(i)` gives players colours matching their objects on the wall, and `fig(i,T)` makes them jump on success or slump on failure.
6. **A HUD line that tells a story:** score, time left, who's winning, or what's happening next. Not just a static label.
7. **A full loop:** start → play → end or success moment → restart. Nothing gets stuck after a few minutes.
- **Build what was asked.** Don't run the full creative process (three tracks, the TNT test) here. Put your doubts in `pitch.open`; one line of creative feedback in your reply is fine.
- **Language:** all text on the page and in the pitch card is in English, whatever language the request was in.

## 3. Delivery

This works the same from a Claude chat with the Order connector, Claude Code, or a bot.

1. **Push straight to `main`**, with no pull request: this is a low-risk sketch site, and breakage is fixed by hand. Use `push_to_repo` with `direct:true` on `trynewthings-fail/proto`. Use the commit message `window-wall: add <Name>'s <idea name>`. If Order answers that direct push isn't allowed and opens a PR instead, say so and give the PR link. A team admin can tick "Allow direct push to main" for proto on the Window Wall board in Order.
2. Reply where you were asked (the chat or the Slack thread) with the live link `https://proto.trynewthings.studio/window-wall/#<id>` (GitHub Pages updates about a minute after the push) and the commit link. Reply in the requester's language.
3. The *Window Wall check* GitHub Action runs the checker after the push. If you can't see the result (Order tools can't), ask the requester to open the link. If the idea shows "Idea crashed", they paste the message back and you push one fix.

If you can run commands (Claude Code), run `node window-wall/tools/check.mjs <id>` before pushing.

## 4. Writing an idea

Start from `ideas/_template.js`. The shape is:

```js
WW.register(W=>{
  const {g,PC,cellPx,cellBg,clearScreen,text}=W;   // take only what you use
  return { id, cat, by, name, short, pitch:{…}, init(){}, update(dt){}, draw(T){}, hud(){}, cast(i){}, fig(i,T){} };
});
```

| Field | Rule |
|---|---|
| `id` | lowercase-with-dashes, unique, same as the file name |
| `cat` | `arcade` (fast, competitive) · `puzzle` (think together) · `crafty` (visitors make the content) · `visual` (stunning first, game second) |
| `by` | **First name of the person who asked for the idea** (in chat or Slack). The page shows the title as "Anna's Bubble Pop". |
| `name` | Idea name **without** the owner. `short` is 1–2 words for the menu pill. |
| `playable` | Optional `true` only if a person can actually play it in the browser (keys or clicks). |
| `crowd` | Optional `true` for depth-cam ideas: people wander the plaza, read them with `tracked()`. In the sketch there are always simulated people walking, so `tracked()` is never empty. |
| Extra methods and state | Allowed on the returned object, or as closure variables inside `WW.register`. |

**Pitch card**, kept short (icons do the talking):
- `tagline`: one sentence.
- `players`: `[icon,label]` with icon `person`, `group` or `crowd`.
- `mode`: `versus`, `coop`, `teams` or `ambient`.
- `round`: e.g. `'2 min'`; `'Drop in'`, `'Always on'` and `'All evening'` show an infinity icon.
- `input`: a list of `[icon,label]`, main option first. **Prefer the depth cam (`cam`): we have Azure Kinect and Orbbec cameras.**
- `for`: `kid teen family group school all`.
- `how`: 3 short steps.
- `trick`: how it uses the panes, mullions, transom or pier.
- `needs`: a list of `[icon,label]`.
- `open`: questions.
- `meters`: `{read,crowd,effort}`, each 1–5.

Icon names: `person group crowd kid teen family school phone cam pad button dial pencil scan touch kiosk clock infinity versus coop sparkle projector speaker wifi music eye wrench question joystick puzzle drop gear motion bolt`

**Methods**
- `init()`: reset everything; called each time the idea is selected.
- `update(dt)`: simulate. `dt` is in seconds.
- `draw(T)`: repaint the **whole** screen every frame, starting with `clearScreen()` or a full fill.
- `hud()`: one short status string.
- `cast(i)`: head colour for plaza person `i`. People 0–5 stand at the six columns and 6–14 are spectators. Return `null` for grey.
- `fig(i,T)`: optional, returns `{jump:metres, slump:bool}`.
- Optional extras:
  - `click(px,py)`: the user clicked the façade, in canvas px.
  - `key(key,down)`: return true if handled.
  - `panel()`: extra HTML for the pitch card.
  - `exit()`: called when leaving the idea.

**Make it alive with nobody playing.** Bots, attract mode or an animation must show the idea within about 2 seconds.

## 5. The WW API (from core.js)

Units are **metres**. x runs along the wall from left to right, y is height above the ground. Panes are `(c,r)`: column `c` 0–5 from left, row `r` 0 top or 1 bottom. Columns 0–2 are unit 0 and 3–5 are unit 1, with the wide pier between columns 2 and 3.

| Name | What |
|---|---|
| `g` | The 2D context of the projector canvas (`SW × SH` px, `PPM` = 200 px per metre). The whole wall, including the hidden areas behind frames. |
| `wx(x)`, `wy(y)` | Metres → canvas px (`wy` flips, so higher y means a smaller px value). |
| `cellPx(c,r)` | `{x,y,w,h}` pane rect in px. Each pane is 0.60 m wide; the top pane is 1.48 m tall, the bottom 1.28 m. |
| `paneX(c)` `paneY(r)` `paneH(r)` `colX(c)` `unitCX(u)` | Pane left edge, bottom edge, height, column centre x, unit centre x (m). |
| `PY_BOT` `PY_TOP` `SX0` `SX1` `SY0` `SY1` `PW` `PHT` `PHB` `MUL` `TR` `PIER` `X0` | All in **metres**: bottom of the bottom panes / top of the top panes, canvas extents, pane width (0.60) and heights (1.48 / 1.28), mullion (0.14), transom (0.19), pier (0.75), centre x of the pier. Convert with `wx`/`wy`. |
| `clearScreen(col)` `cellBg(c,r,top,bottom)` `text(str,x,y,size,col,weight)` `rr(x,y,w,h,r)` | Fill all; pane gradient (returns rect); centred Alegreya text; rounded-rect path. |
| `smiley(ctx,x,y,R,happy,col,wobble)` | The Try New Things smiley. `happy=false` turns it sad. |
| `silhouette(x,h,variant,T,wave,walk,fill,eyes)` | A person shape `h` m tall standing on the sill. Variants: 0 human, 1 moose, 2 troll, 3 hare. |
| `bcell(c,x,y)` `COLS` `ROWS` `RT` | A 6 × 28 block grid per column (rows 0–14 top pane). Returns `[x,y,w,h]`. |
| `people` `tracked()` | Plaza visitors `{x,z,vx,walk}`: `x` along the wall, `z` metres from the wall. `tracked()` = those in range of the cameras. |
| `PC` `LIME` `PINK` `CYAN` `ORANGE` `VIOLET` `YELLOW` `FONT` | Palette: `PC` is these 6 colours in that order (lime `#CAFE03` first), all `#rrggbb`. Plus the font. |
| `hexA('#rrggbb',a)` `clamp(v,a,b)` `shuffle(arr)` `ic(name)` `esc(str)` `ICONS` | Small utilities. `hexA` only takes 6-digit hex. |
| `W.view.reset(anim)` `W.view.seat(c)` `W.ui.refresh()` | Camera to default / behind column `c`; re-render the pitch card. |

## 6. Design rules

- It's seen from about 20 m, so use big shapes, strong contrast and almost no text on the panes.
- **Use the frames.** Things can pass behind mullions, the transom or the pier and pop out again. Each 3-pane unit is roughly body-sized.
- Use the house style: lime on black, the player colours in `PC`, and Alegreya.
- Keep it to one clear verb ("stomp", "rotate", "draw") and something that only works together.

Closest existing ideas to learn from (read two or three, see section 2):

| If the idea is… | Read |
|---|---|
| Per-pane cards or rooms | `memory.js` or `residents.js` |
| Things falling down columns | `rhythm.js` |
| A ball or objects crossing the whole wall | `pong.js` or `aquarium.js` |
| Reacting to people (depth cam) | `shadows.js` (28 lines) or `aurora.js` |
| Click/tap tiles | `relay.js` (large; only if you need clicks) |
