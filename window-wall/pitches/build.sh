#!/bin/sh
# Builds Fönsterlabbet from src/: 00-head.html + one <script> with every src/*.js in name order.
#   fonsterlabbet.html  the page body only, for publishing as a Claude artifact
#   index.html          the same page with a full HTML skeleton, for GitHub Pages
# Run from anywhere: sh window-wall/pitches/build.sh
D="$(cd "$(dirname "$0")" && pwd)"
{ cat "$D/src/00-head.html"; echo '<script>'; for f in "$D"/src/*.js; do echo "/* ---- $(basename "$f") ---- */"; cat "$f"; echo; done; echo '</script>'; } > "$D/fonsterlabbet.html"
{ echo '<!doctype html><html lang="sv"><head></head><body>'; cat "$D/fonsterlabbet.html"; echo '</body></html>'; } > "$D/index.html"
TMP="${TMPDIR:-/tmp}/fonsterlabbet-check.js"
awk '/^<script>$/{f=1;next}/^<\/script>$/{f=0}f' "$D/fonsterlabbet.html" > "$TMP" && node --check "$TMP" && echo "OK $(wc -c < "$D/fonsterlabbet.html") bytes"
