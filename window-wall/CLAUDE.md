# Window Wall: rules for adding or changing an idea

Live page: https://proto.trynewthings.studio/window-wall/ · deep link to one idea: `…/window-wall/#<id>`

A 3D sketch of Exploratoriet's façade. Two window units of 3 × 2 panes (12 panes) have a rear-projected screen behind them. Each **idea** is one small JS file that draws onto that screen. This file is everything you need. Read all of it: it is short on purpose.

## 1. Scope: what you may touch

**Adding an idea changes exactly two files:**
1. Create `window-wall/ideas/<id>.js`.
2. Add `'<id>',` as a new line in `window-wall/ideas/index.js`, at the end of the list. Change nothing else in that file.

**Changing an idea** touches only `ideas/<id>.js`. Keep its `id` and `by` unless the request says otherwise.

**Never edit** `core.js`, `app.js`, `style.css`, `index.html`, `tools/`, other ideas, other folders in `proto`, or proto's root `index.html` (it is generated).

If an idea needs something the core doesn't offer, build it inside your idea file. If that isn't possible, don't change the core. Create a task on the Order board *Window Wall* (project *Exploratoriet: WindowProjection*) describing what's needed, and say so in your reply.

## 2. Token budget: keep it cheap

- **Read only:** this file, `ideas/_template.js` and `ideas/index.js`. Optionally read **one** existing idea if it is close to the request (see the table in section 6). Do not read `core.js`, `app.js`, `style.css` or `index.html`. The API below covers them.
- **Write once.** One idea file, aim for **under 150 lines (about 8 KB)**. The hard limit is 20 KB. This is a sketch, not production code.
- **No polishing loops.** If something is unclear, pick a sensible option and put the doubt in `pitch.open` instead of asking several questions.
- Reuse helpers from `WW` (below) rather than writing your own drawing utilities.

## 3. Delivery (Order bot)

1. Push both files to `trynewthings-fail/proto` with `push_to_repo` as a **pull request** (not direct). Use the commit message `window-wall: add <Name>'s <idea name>`.
2. The *Window Wall check* GitHub Action runs `node window-wall/tools/check.mjs <id>` on the PR. If it fails, read the error in the PR, fix the idea file **once** and push again.
3. Reply in the Slack thread with the PR link. Mention that after merge the idea is live at `https://proto.trynewthings.studio/window-wall/#<id>` (Pages updates about a minute after merge).

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
| `by` | **First name of the person who asked in Slack.** The page shows the title as "Anna's Bubble Pop". |
| `name` | Idea name **without** the owner. `short` is 1–2 words for the menu pill. |
| `playable` | Optional `true` only if a person can actually play it in the browser (keys or clicks). |
| `crowd` | Optional `true` for depth-cam ideas: people wander the plaza, read them with `tracked()`. |

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
| `PY_BOT` `PY_TOP` `SX0` `SX1` `SY0` `SY1` `PW` `PHT` `PHB` `X0` | Visible pane extents, canvas extents, pane sizes, wall centre x. |
| `clearScreen(col)` `cellBg(c,r,top,bottom)` `text(str,x,y,size,col,weight)` `rr(x,y,w,h,r)` | Fill all; pane gradient (returns rect); centred Alegreya text; rounded-rect path. |
| `smiley(ctx,x,y,R,happy,col,wobble)` | The Try New Things smiley. `happy=false` turns it sad. |
| `silhouette(x,h,variant,T,wave,walk,fill,eyes)` | A person shape `h` m tall standing on the sill. Variants: 0 human, 1 moose, 2 troll, 3 hare. |
| `bcell(c,x,y)` `COLS` `ROWS` `RT` | A 6 × 28 block grid per column (rows 0–14 top pane). Returns `[x,y,w,h]`. |
| `people` `tracked()` | Plaza visitors `{x,z,vx,walk}`: `x` along the wall, `z` metres from the wall. `tracked()` = those in range of the cameras. |
| `PC` `LIME` `PINK` `CYAN` `ORANGE` `VIOLET` `YELLOW` `FONT` | Palette (lime `#CAFE03` on black) and font. |
| `hexA(hex,a)` `clamp` `shuffle` `ic(name)` `esc` `ICONS` | Small utilities. |
| `W.view.reset(anim)` `W.view.seat(c)` `W.ui.refresh()` | Camera to default / behind column `c`; re-render the pitch card. |

## 6. Design rules

- It's seen from about 20 m, so use big shapes, strong contrast and almost no text on the panes.
- **Use the frames.** Things can pass behind mullions, the transom or the pier and pop out again. Each 3-pane unit is roughly body-sized.
- Use the house style: lime on black, the player colours in `PC`, and Alegreya.
- Keep it to one clear verb ("stomp", "rotate", "draw") and something that only works together.

Closest existing idea to copy from (read at most one):

| If the idea is… | Read |
|---|---|
| Per-pane cards or rooms | `memory.js` or `residents.js` |
| Things falling down columns | `rhythm.js` |
| A ball or objects crossing the whole wall | `pong.js` or `aquarium.js` |
| Reacting to people (depth cam) | `shadows.js` (28 lines) or `aurora.js` |
| Click/tap tiles | `relay.js` (large; only if you need clicks) |
