// Corrige un circuit qui revient sur ses pas (règle 14 des circuits, règle 6B de l'appli) : chaque bout fautif est recalculé
// avec le plan des rues (data/rues.json), en évitant les rues déjà parcourues par les autres bouts ; les autres bouts gardent
// leur tracé. Usage : node tools/circuits/sans-retour.mjs marais [--bout=N] [--ecrire] (--bout : le bout à recalculer, 1 = de l'étape 1 à la 2)
import { readFileSync, writeFileSync } from 'node:fs';
import { readPlan, snap, route, repeated, edgePoints, edgeName } from '../../js/rues.js';
import { cleanCircuits } from '../../js/circuits.js';
import { splitTrace, encodeTrace } from '../../js/mescircuits.js';

const ROOT = new URL('../../', import.meta.url);
const id = process.argv[2]; const write = process.argv.includes('--ecrire');
const P = readPlan(JSON.parse(readFileSync(new URL('data/rues.json', ROOT), 'utf8')));
const raw = JSON.parse(readFileSync(new URL('data/circuits.json', ROOT), 'utf8'));
const c = cleanCircuits(raw).find((x) => x.id === id);
if (!c) throw new Error(`circuit ${id} introuvable`);
const ky = 111320; const d = (a, b) => Math.hypot((a[1] - b[1]) * ky * Math.cos((a[0] * Math.PI) / 180), (a[0] - b[0]) * ky);
const hav = (a, b) => { const R = 6371008.8; const p1 = (a[0] * Math.PI) / 180; const p2 = (b[0] * Math.PI) / 180; const dl = ((b[1] - a[1]) * Math.PI) / 180;
  return 2 * R * Math.asin(Math.sqrt(Math.sin((p2 - p1) / 2) ** 2 + Math.cos(p1) * Math.cos(p2) * Math.sin(dl / 2) ** 2)); };
const len = (l) => l.slice(1).reduce((t, p, i) => t + d(l[i], p), 0);
const samples = (line, step = 8) => { const out = []; for (let i = 1; i < line.length; i++) { const L = d(line[i - 1], line[i]); for (let t = 0; t < L; t += step) out.push([line[i - 1][0] + (line[i][0] - line[i - 1][0]) * t / L, line[i - 1][1] + (line[i][1] - line[i - 1][1]) * t / L]); } out.push(line.at(-1)); return out; };
let legs = splitTrace(c.trace, c.etapes).map((line) => ({ line, m: len(line), orig: true }));
const st = c.etapes.map((e) => snap(P, e));
const before = repeated(P, legs);
console.log(id, 'avant :', before ? `${Math.round(before.m)} m, ${before.name}, à partir de l'étape ${before.leg}` : 'rien en double', '·', Math.round(legs.reduce((t, l) => t + l.m, 0)), 'm');
// un bout recalculé en évitant (× 30) les tronçons à moins de 20 m des autres bouts, hors des 25 m autour de ses deux étapes
function reroute(k) {
  const avoid = legs.flatMap((l, j) => (j === k ? [] : samples(l.line, 10)))
    .filter((p) => d(p, [c.etapes[k].lat, c.etapes[k].lng]) > 25 && d(p, [c.etapes[k + 1].lat, c.etapes[k + 1].lng]) > 25);
  const box = [Math.min(c.etapes[k].lat, c.etapes[k + 1].lat) - 0.006, Math.max(c.etapes[k].lat, c.etapes[k + 1].lat) + 0.006,
    Math.min(c.etapes[k].lng, c.etapes[k + 1].lng) - 0.009, Math.max(c.etapes[k].lng, c.etapes[k + 1].lng) + 0.009];
  P.pen = new Float32Array(P.em.length).fill(1);
  for (let i = 0; i < P.em.length; i++) {
    const pts = edgePoints(P, i);
    if (!pts.some(([a, g]) => a > box[0] && a < box[1] && g > box[2] && g < box[3])) continue;
    if (samples(pts, 6).some((p) => avoid.some((q) => d(p, q) < 20))) P.pen[i] = 30;
  }
  const r = route(P, st[k], st[k + 1]); P.pen = null;
  return r && { line: r.line, m: r.m, names: r.names };
}
for (let round = 0; round < 4; round++) {
  const rep = repeated(P, legs);
  if (!rep) break;
  // le bout fautif (rep.leg = étape où le double commence) ou celui qu'il recouvre : on garde le plus court des deux essais qui passe
  const force = process.argv.find((a) => a.startsWith('--bout='));
  const tries = (force ? [Number(force.slice(7)) - 1] : [rep.leg - 1, rep.leg - 2, rep.leg, 0]).filter((k) => k >= 0 && k < legs.length).map((k) => {
    const nl = reroute(k); if (!nl) return null;
    const all = legs.map((l, j) => (j === k ? nl : l));
    const r2 = repeated(P, all);
    return { k, nl, all, rest: r2 ? r2.m : 0, extra: nl.m - legs[k].m };
  }).filter(Boolean).sort((a, b) => a.rest - b.rest || a.extra - b.extra);
  if (!tries.length) { console.log('  aucun chemin de remplacement'); break; }
  const t = tries[0];
  console.log(`  bout ${t.k + 1} → ${t.k + 2} (${c.etapes[t.k].n} → ${c.etapes[t.k + 1].n}) recalculé : ${Math.round(legs[t.k].m)} → ${Math.round(t.nl.m)} m, par ${[...new Set(t.nl.names)].join(', ')}`);
  legs = t.all;
}
const after = repeated(P, legs); const total = Math.round(legs.reduce((t, l) => t + l.m, 0));
console.log(id, 'après :', after ? `encore ${Math.round(after.m)} m, ${after.name}, étape ${after.leg}` : 'rien en double', '·', total, 'm');
if (write && !after) {
  const line = legs.flatMap((l, i) => (i ? l.line.slice(1) : l.line));
  // le tracé va dans tools/circuits/traces/<id>.txt (longueur, puis polyligne, \\ doublés comme les tracés d'origine) ;
  // python3 tools/circuits/build.py refait ensuite data/circuits.json
  const km = line.slice(1).reduce((t, p, i) => t + hav(line[i], p), 0);
  writeFileSync(new URL(`tools/circuits/traces/${id}.txt`, ROOT), `${km.toFixed(1)}\n${encodeTrace(line).replaceAll('\\', '\\\\\\\\')}\n`);
  console.log(`  écrit dans tools/circuits/traces/${id}.txt : lance python3 tools/circuits/build.py`);
}
