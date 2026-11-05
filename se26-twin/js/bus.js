// One event bus for everything that happens in the model. Three sources feed it the same shape
// {topic, payload, src}: the "Prova" controls (sim), a live MQTT connection (live) and a log replay (replay).
const subs = new Set();
export const bus = {
  on(fn) { subs.add(fn); return () => subs.delete(fn); },
  emit(ev) { const e = { at: Date.now(), src: 'sim', ...ev }; for (const f of subs) f(e); return e; },
};

// ── live: a minimal, read-only MQTT 3.1.1 client over WebSocket (subscribes to '#', never publishes) ──
const enc = new TextEncoder(), dec = new TextDecoder();
const str = (s) => { const b = enc.encode(s); return [b.length >> 8, b.length & 255, ...b]; };
const len = (n) => { const o = []; do { let d = n % 128; n = Math.floor(n / 128); if (n > 0) d |= 128; o.push(d); } while (n > 0); return o; };
const packet = (type, body) => new Uint8Array([type, ...len(body.length), ...body]);

export function connectLive(url, { onState = () => {} } = {}) {
  let ws, ping = 0, buf = new Uint8Array(0);
  try { ws = new WebSocket(url, 'mqtt'); } catch (e) { onState('fel: ' + e.message); return { close() {} }; }
  ws.binaryType = 'arraybuffer';
  onState('ansluter…');
  let up = false, done = false;
  const fail = (msg) => { if (done) return; done = true; clearInterval(ping); clearTimeout(to); onState(msg); try { ws.close(); } catch {} };
  const to = setTimeout(() => fail('kunde inte ansluta (inget svar)'), 6000);
  ws.onopen = () => {
    const id = 'museum-twin-' + Math.random().toString(16).slice(2, 8);
    // CONNECT: protocol "MQTT", level 4, clean session, keepalive 30 s
    ws.send(packet(0x10, [...str('MQTT'), 4, 0x02, 0, 30, ...str(id)]));
  };
  ws.onmessage = (m) => {
    const add = new Uint8Array(m.data), b = new Uint8Array(buf.length + add.length); b.set(buf); b.set(add, buf.length); buf = b;
    for (;;) {
      if (buf.length < 2) return;
      let mul = 1, n = 0, i = 1, d;
      do { if (i >= buf.length) return; d = buf[i++]; n += (d & 127) * mul; mul *= 128; } while (d & 128);
      if (buf.length < i + n) return;
      const type = buf[0] >> 4, qos = (buf[0] >> 1) & 3, body = buf.subarray(i, i + n);
      buf = buf.slice(i + n);
      if (type === 2) {   // CONNACK
        if (body[1] !== 0) { fail('nekad (kod ' + body[1] + ')'); return; }
        up = true; clearTimeout(to);
        ws.send(packet(0x82, [0, 1, ...str('#'), 0]));   // SUBSCRIBE '#' at QoS 0
        ping = setInterval(() => ws.readyState === 1 && ws.send(new Uint8Array([0xc0, 0])), 20000);
        onState('live');
      } else if (type === 3) {   // PUBLISH
        const tl = (body[0] << 8) | body[1], topic = dec.decode(body.subarray(2, 2 + tl));
        const payload = dec.decode(body.subarray(2 + tl + (qos ? 2 : 0)));
        bus.emit({ topic, payload, src: 'live' });
      }
    }
  };
  ws.onerror = () => fail('kunde inte ansluta');
  ws.onclose = () => fail(up ? 'frånkopplad' : 'kunde inte ansluta');
  return { close() { done = true; clearInterval(ping); clearTimeout(to); ws.close(); } };
}

// ── replay: a log file, one JSON object per line: {"ts"|"t"|"time", "topic", "payload"} ──
// The exact format of the real logs (e.g. history.ndjson) is not known yet; timestamps may be ISO strings,
// seconds or milliseconds. Lines without a topic are skipped.
export function parseLog(text) {
  const out = [];
  for (const line of text.split(/\r?\n/)) {
    if (!line.trim()) continue;
    let o; try { o = JSON.parse(line); } catch { continue; }
    const topic = o.topic || o.t_topic; if (!topic) continue;
    let ts = o.ts ?? o.time ?? o.t ?? o.timestamp;
    ts = typeof ts === 'string' ? Date.parse(ts) : ts < 1e12 ? ts * 1000 : ts;
    out.push({ ts, topic, payload: typeof o.payload === 'string' ? o.payload : JSON.stringify(o.payload ?? '') });
  }
  return out.filter((e) => Number.isFinite(e.ts)).sort((a, b) => a.ts - b.ts);
}
export function replay(events, { speed = 600, onTick = () => {} } = {}) {
  let i = 0, stop = false;
  const t0 = performance.now(), log0 = events[0]?.ts || 0;
  const tick = () => {
    if (stop) return;
    const now = log0 + (performance.now() - t0) * speed;
    while (i < events.length && events[i].ts <= now) bus.emit({ ...events[i++], src: 'replay' });
    onTick(now, i, events.length);
    if (i < events.length) requestAnimationFrame(tick);
  };
  tick();
  return { stop() { stop = true; } };
}
