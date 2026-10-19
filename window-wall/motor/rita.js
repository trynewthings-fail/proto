// Gemensamma ritverktyg för scenerna (allt i meter).
window.Rita = (function () {
  const clamp = (x, a = 0, b = 1) => Math.max(a, Math.min(b, x));
  const lerp = (a, b, k) => a + (b - a) * k;
  const ease = {
    inOut: k => k < 0.5 ? 2 * k * k : 1 - Math.pow(-2 * k + 2, 2) / 2,
    ut: k => 1 - Math.pow(1 - k, 3),
    studs: k => { const c = 1.70158 + 1; return 1 + c * Math.pow(k - 1, 3) + 1.70158 * Math.pow(k - 1, 2); }
  };
  // 1D/2D värdebrus (mjukt, deterministiskt)
  const h1 = n => { n = (n << 13) ^ n; return 1 - ((n * (n * n * 15731 + 789221) + 1376312589) & 0x7fffffff) / 1073741824; };
  function brus(x, y = 0) {
    const xi = Math.floor(x), yi = Math.floor(y), xf = x - xi, yf = y - yi;
    const s = k => k * k * (3 - 2 * k);
    const v = (a, b) => h1(a * 57 + b * 131);
    const a = lerp(v(xi, yi), v(xi + 1, yi), s(xf)), b = lerp(v(xi, yi + 1), v(xi + 1, yi + 1), s(xf));
    return lerp(a, b, s(yf));
  }
  const rgb = hex => { const n = parseInt(hex.slice(1), 16); return [(n >> 16) & 255, (n >> 8) & 255, n & 255]; };
  const rgba = (hex, a) => { const [r, g, b] = rgb(hex); return `rgba(${r},${g},${b},${a})`; };
  const blanda = (h1_, h2, k) => { const a = rgb(h1_), b = rgb(h2); return `rgb(${a.map((v, i) => Math.round(lerp(v, b[i], k))).join(',')})`; };

  function rundrekt(g, x, y, w, h, r) { g.beginPath(); g.roundRect(x, y, w, h, Math.min(r, w / 2, h / 2)); }

  // Ett öga i decken-stil: mandelform, tjock kant, iris med pupill och glans.
  // o: {x,y,w, h?, blick:[-1..1,-1..1], lock 0..1 (stängt), glad 0..1, pupill 0.6..1.6, iris, vit, kant, kontur}
  function oga(g, o) {
    const N_ = window.Nattfonster, stil = N_ && N_.ctx && N_.ctx.stil;
    if (o.doodle ?? !!(stil && stil.linje)) return ogaDoodle(g, o);
    const w = o.w, h = o.h ?? w * 0.37, lock = clamp(o.lock ?? 0), glad = clamp(o.glad ?? 0);
    const kontur = o.kontur ?? w * 0.04;
    g.save(); g.translate(o.x, o.y);
    if (glad > 0.5) { // lyckligt kisande: en båge
      g.strokeStyle = o.vit ?? '#f4ffd8'; g.lineWidth = kontur * 1.6; g.lineCap = 'round';
      g.beginPath(); g.moveTo(-w * 0.42, h * 0.25); g.quadraticCurveTo(0, -h * 1.5, w * 0.42, h * 0.25); g.stroke();
      g.restore(); return;
    }
    const sy = Math.max(0.06, 1 - lock);
    g.scale(1, sy);
    const form = new Path2D(); form.moveTo(-w / 2, 0); form.quadraticCurveTo(0, -h * 1.25, w / 2, 0); form.quadraticCurveTo(0, h * 1.25, -w / 2, 0); form.closePath();
    g.fillStyle = o.vit ?? '#f4ffd8'; g.fill(form);
    g.save(); g.clip(form);
    const [bx, by] = o.blick ?? [0, 0], ir = h * 0.62;
    const ix = bx * w * 0.24, iy = by * h * 0.42;
    g.fillStyle = o.iris ?? '#ff4fa3'; g.beginPath(); g.arc(ix, iy, ir, 0, 7); g.fill();
    g.fillStyle = '#000'; g.beginPath(); g.arc(ix, iy, ir * 0.43 * (o.pupill ?? 1), 0, 7); g.fill();
    g.fillStyle = o.vit ?? '#f4ffd8'; g.beginPath(); g.arc(ix - ir * 0.3, iy - ir * 0.33, ir * 0.18, 0, 7); g.fill();
    g.restore();
    g.strokeStyle = o.kant ?? '#000'; g.lineWidth = kontur; g.lineJoin = 'round';
    g.stroke(form);
    g.restore();
  }

  // Ögat som i decken (sinnena): krämvit kontur, iris som färgad ring med genomskinlig fyllning,
  // krämvit pupill med en svart glans och små fransar.
  function ogaDoodle(g, o) {
    const w = o.w, h = o.h ?? w * 0.37, lock = clamp(o.lock ?? 0), glad = clamp(o.glad ?? 0);
    const lw = o.linjeBredd ?? Math.max(0.004, w * 0.045), ink = o.vit ?? '#f4ffd8', iris = o.iris ?? '#2fd6e0';
    g.save(); g.translate(o.x, o.y); g.lineCap = 'round'; g.lineJoin = 'round';
    if (glad > 0.5) {
      g.strokeStyle = ink; g.lineWidth = lw * 1.2;
      g.beginPath(); g.moveTo(-w * 0.42, h * 0.25); g.quadraticCurveTo(0, -h * 1.5, w * 0.42, h * 0.25); g.stroke();
      g.restore(); return;
    }
    const sy = Math.max(0.06, 1 - lock);
    const form = new Path2D(); form.moveTo(-w / 2, 0); form.quadraticCurveTo(0, -h * 1.25 * sy, w / 2, 0); form.quadraticCurveTo(0, h * 1.25 * sy, -w / 2, 0); form.closePath();
    if (sy > 0.2) {
      g.save(); g.clip(form);
      const [bx, by] = o.blick ?? [0, 0], ir = h * 0.6, ix = bx * w * 0.24, iy = by * h * 0.42 * sy;
      g.fillStyle = rgba(iris, 0.2); g.beginPath(); g.arc(ix, iy, ir, 0, 7); g.fill();
      g.strokeStyle = iris; g.lineWidth = lw; g.stroke();
      g.fillStyle = ink; g.beginPath(); g.arc(ix, iy, ir * 0.42 * (o.pupill ?? 1), 0, 7); g.fill();
      g.fillStyle = '#000'; g.beginPath(); g.arc(ix + ir * 0.22, iy - ir * 0.26, ir * 0.13, 0, 7); g.fill();
      g.restore();
    }
    g.strokeStyle = ink; g.lineWidth = lw; g.stroke(form);
    if (w > 0.12 && sy > 0.5 && o.fransar !== false) { // fransar
      g.lineWidth = lw * 0.8;
      for (const k of [-0.34, -0.17, 0, 0.17, 0.34]) {
        const x = k * w * 1.2, y = -h * 1.25 * sy * (1 - Math.pow(k * 2.2, 2)) * 0.5 - lw;
        g.beginPath(); g.moveTo(x, y); g.lineTo(x * 1.18, y - h * 0.32); g.stroke();
      }
    }
    g.restore();
  }

  // Mjuk klump (för monster och figurer)
  function klump(g, x, y, r, seed, t, wobb = 0.06) {
    g.beginPath();
    for (let i = 0; i <= 40; i++) {
      const a = i / 40 * Math.PI * 2;
      const rr = r * (1 + wobb * brus(Math.cos(a) * 1.5 + seed, Math.sin(a) * 1.5 + t * 0.6));
      const px = x + Math.cos(a) * rr, py = y + Math.sin(a) * rr;
      i ? g.lineTo(px, py) : g.moveTo(px, py);
    }
    g.closePath();
  }

  // Blickriktning [-1..1] från en punkt mot ett mål (meter)
  function blick(fx, fy, tx, ty, rx = 1.2, ry = 0.8) {
    return [clamp((tx - fx) / rx, -1, 1), clamp((ty - fy) / ry, -1, 1)];
  }

  // Närmaste person (eller null)
  function narmast(personer, x, maxAvst = 99) {
    let b = null, bd = 1e9;
    for (const p of personer) { const d = Math.abs(p.x - x) + p.avstand * 0.5; if (d < bd && p.avstand < maxAvst) { bd = d; b = p; } }
    return b;
  }

  return { clamp, lerp, ease, brus, rgb, rgba, blanda, rundrekt, oga, ogaDoodle, klump, blick, narmast };
})();
