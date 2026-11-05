// Installation stories: in Utforska, an installation opens as a series of chapters (main.js renders them).
// The chapters come from data/stories.json (overview, try, scene, world, text, links); an installation without an entry
// gets overview → try → its scale hops → links. A scene chapter reuses a scale scene from js/scales.js and adds a block
// on how that technology is used in this installation ("here").
import { SCENES, HOPS } from './scales.js';

const NAV = { overview: 'Översikt', try: 'Prova', links: 'Källor och länkar' };

function defaults(inst) {
  const w = inst.web || {}, ch = [{ kind: 'overview' }];
  if ((w.control && w.control.type !== 'ingen') || w.route?.length) ch.push({ kind: 'try' });
  for (const h of HOPS[inst.id] || []) {
    if (h.scene) ch.push({ kind: 'scene', scene: h.scene, here: '' });
    else if (h.world) ch.push({ kind: 'world', world: h.world, nav: h.label, here: '' });
  }
  ch.push({ kind: 'links' });
  return ch;
}

// view: an installation with its own screen or wall (media.js) is seen head-on from inside the room; otherwise from
// its card's camera (installations.json web.visual.shot)
const FACE = { '-z': Math.PI, '+z': 0, '+x': Math.PI / 2, '-x': -Math.PI / 2 };
const NOFACE = new Set(['snurra-huset']);   // its screen sits behind the house model; the card's camera sees it better
export function viewOf(inst, P, screens) {
  const scr = !NOFACE.has(inst.id) && Object.values(screens || {}).find((m) => m.inst === inst.id && !m.host);
  if (scr) {
    const p = scr.mesh.position, w = scr.a[1] - scr.a[0];
    return { at: [p.x, Math.max(0.4, p.y - 0.4), p.z], d: w >= 3 ? w * 0.95 + 3 : w * 1.6 + 3.6, az: FACE[scr.n], el: w >= 3 ? 0.24 : 0.34 };
  }
  const p = P[inst.id], s = inst.web?.visual?.shot || {};
  return { at: [p.x, 0.8, p.y], d: s.d || 9, az: s.az ?? 0.4, el: s.el ?? 0.95 };
}

// Station stories (data/stations.json): one of the five theme cubes in Framtiden with the installations that light it and
// the project texts around it, told briefly; each installation chapter leads on to that installation's own story.
export function buildStationStory(sid, st, I, P) {
  const c = P[st.cube], view = { at: [c.x, 0.8, c.y], d: 11, az: 0.45, el: 0.85 };
  const insts = st.inst.filter((id) => I[id]), texts = st.texts.filter((id) => I[id]);
  const at = (id) => { const p = P[id], s = I[id].web?.visual?.shot || {}; return p ? { at: [p.x, 0.8, p.y], d: s.d || 8, az: s.az ?? 0.4, el: s.el ?? 0.9 } : view; };
  const ch = [{ part: 'station', nav: 'Översikt', view }];
  for (const id of insts) ch.push({ part: 'station-inst', inst2: id, nav: I[id].name, view: at(id) });
  for (let k = 0; k < texts.length; k += 5) {
    ch.push({ part: 'station-texts', texts: texts.slice(k, k + 5), nav: texts.length > 5 ? `Projekten ${k / 5 + 1}` : 'Projekten', view });
  }
  return {
    id: `station:${sid}`, title: st.name, sub: 'Station i Framtiden', station: st,
    // the overview and the project texts are about the cube, so nothing is lit; an installation chapter lights its installation
    chapters: ch.map((x, i) => ({ ...x, id: `${sid}-${i}`, stationId: sid, focus: x.inst2 || null, labels: ['inst'], show: { lift: 1 } })),
  };
}

export function buildInstStory(inst, data, P, screens) {
  const def = data?.[inst.id], list = (def?.chapters || defaults(inst)).filter((c) => c.kind !== 'scene' || SCENES[c.scene]);
  const view = viewOf(inst, P, screens);
  const chapters = list.map((c, i) => ({
    ...c,
    id: `${inst.id}-${i}`, inst: inst.id, part: c.kind,
    nav: c.nav || NAV[c.kind] || (c.kind === 'scene' ? SCENES[c.scene].title : c.title || ''),
    view: c.kind === 'world' ? null : view,
    labels: ['inst'], show: { lift: 1 }, focus: inst.id,
  }));
  return { id: `inst:${inst.id}`, title: inst.name, sub: `Rum ${inst.room}`, lead: def?.lead || '', chapters, inst };
}
