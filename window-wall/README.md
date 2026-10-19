# Window Wall

An idea sketchbook for an interactive projection on **Exploratoriet's** ground-floor windows: two window units, 6 × 2 panes, with a rear-projected screen behind the glass. Made by Try New Things.

**Open it:** https://proto.trynewthings.studio/window-wall/ (link to one idea with `#<id>`, e.g. `#relay`)

## Add an idea from Slack

Ask the Order bot in a channel it listens to (start with #newbiz), for example:

> @Order add a Window Wall idea: the panes turn into soap bubbles that people pop by jumping. Bigger groups make bigger bubbles.

Order writes `ideas/<id>.js`, opens a pull request on this repo, and replies with the link. Your name goes on the idea ("Anna's Bubble Pop"). Merge the PR and the idea is live about a minute later.

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
