# lights

Room Lights: control the WLED ceiling strips in the studio from anywhere.

- This folder is only a thin front door. The real app (light engine, control site,
  mic/music sync, weather/aurora/price modes) runs on the studio PC in the
  `LedControl` project (`server.py`, `web/`), started hidden by `lights.pyw`.
- That PC is on the internet through **Tailscale Funnel** at a fixed address,
  `https://lukas.tailf5b7ee.ts.net` (`tailscale funnel --bg 8080` on the PC).
  `index.html` checks `/api/state` (CORS allows only https://proto.trynewthings.studio)
  and shows the site in a full-screen iframe - or "The lights are asleep".
- Why not a Cloudflare quick tunnel: some mobile carriers block `*.trycloudflare.com`,
  so it only worked on WiFi.
- Anyone can play with the lights; adding/removing controllers and settings
  only work from the studio WiFi (the server refuses them from internet addresses).
- If someone gets Cloudflare access to trynewthings.studio, a named tunnel on
  e.g. `lights.trynewthings.studio` could replace the ts.net address.
