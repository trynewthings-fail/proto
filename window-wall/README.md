# Window Wall

An idea sketchbook for an interactive projection on **Exploratoriet's** ground-floor windows: two window units, 6 × 2 panes, with a rear-projected screen behind the glass. Made by Try New Things.

**Open it:** https://proto.trynewthings.studio/window-wall/ (link to one idea with `#<id>`, e.g. `#relay`)

## Add an idea

Open a Claude chat (claude.ai, the desktop app or Claude Code) with the **Order** connector on, and write for example:

> Add this idea to the Window Wall sketch (Order project *Exploratoriet: WindowProjection*): the panes turn into soap bubbles that people pop by jumping. Bigger groups make bigger bubbles. My name is Anna.

Claude finds the rules through Order, writes `ideas/<id>.js`, pushes it straight to `main`, and replies with the link. Your name goes on the idea ("Anna's Bubble Pop"). It's live about a minute later. If it breaks, revert the commit.

The Order **Slack bot** can't do this yet, because it has no GitHub tools.

More detail makes a better sketch. Useful things to include:
- what people **do** (the verb),
- what happens on the panes,
- how it uses the frames between the panes.

## How it's built

| File | What |
|---|---|
| `index.html`, `style.css` | The page shell. |
| `core.js` | Façade geometry, drawing helpers, icons, the idea registry (`WW`). |
| `app.js` | three.js building, plaza people, menu, pitch card, loop. |
| `ideas/index.js` | The list of ideas, in menu order. |
| `ideas/<id>.js` | One file per idea. `_template.js` is the starting point. |
| `tools/check.mjs` | Headless smoke test: `node window-wall/tools/check.mjs [id]` |
| `CLAUDE.md` | The rules any Claude (Order bot or Claude Code) follows when adding or changing an idea. |

Everything is plain static files with no build step. three.js r128 and Google Fonts load from CDNs.
