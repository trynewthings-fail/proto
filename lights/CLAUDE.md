# lights

Room Lights: control the WLED ceiling strips in the studio from anywhere.

- This folder is only a thin front door. The real app (light engine, control site,
  mic/music sync, weather/aurora/price modes) runs on the studio PC in the
  `LedControl` project (`server.py`, `web/`, `tunnel.py`).
- That PC opens a Cloudflare *quick tunnel*; its random `*.trycloudflare.com`
  address changes on every restart and is written to the secret gist
  `3f27817a5e1f3033a8e178da7438ade0` (`room-lights.json`). `index.html` reads the
  gist, checks `/api/state` (CORS allows only https://proto.trynewthings.studio)
  and shows the site in a full-screen iframe - or "The lights are asleep".
- Anyone can play with the lights; adding/removing controllers and settings
  only work from the studio WiFi (the server refuses them through the tunnel).
- If someone gets Cloudflare access to trynewthings.studio, a named tunnel with a
  fixed address (e.g. lights.trynewthings.studio) can replace the gist lookup.
