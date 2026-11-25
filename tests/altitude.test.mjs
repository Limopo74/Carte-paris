// v406 (mes choix 3A 4A et 1A 2A 3A du 24 nov. 2026) : altitude du sol des croisements du plan des rues (IGN, RGE ALTI),
// « monte de 40 m » dans Mes parcours et Chemin à pied, altitude dans Météo et air. Tout se calcule sur le téléphone.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { spawnSync } from 'node:child_process';
import { readPlan, readAlt, snap, route, routeProfile, routeClimb, climbUp, climbWords, altHere, altOnEdge, OFFGROUND, STEPS } from '../js/rues.js';
import { addAltitudes, encodeAlt, decodeAlt, onGround, nodes5 } from '../tools/maj-altitudes.mjs';

/** Le petit plan des tests de rues (format 2), avec un champ alt optionnel. */
function plan(nodes, edges, alts = null) {
  const n5 = nodes.map(([a, g]) => [Math.round(a * 1e5), Math.round(g * 1e5)]);
  const flat = []; let p = [0, 0];
  for (const q of n5) { flat.push(q[0] - p[0], q[1] - p[1]); p = q; }
  const ea = []; const eb = []; const ef = []; const ek = []; const en = []; let pa = 0;
  for (const [a, b, f = 0] of edges) { ea.push(a - pa); eb.push(b - a); ef.push(f); ek.push(0); en.push(0); pa = a; }
  const doc = { source: 'test', updated: '2026-11-24', v: 2, names: [], nodes: flat, ea, eb, ef, ek, en, shape: [] };
  if (alts) doc.alt = encodeAlt(alts);
  return doc;
}

// Une rue qui monte vers le nord : 5 croisements tous les 111 m (0,001° de latitude), de 40 à 100 m d'altitude.
const LNG = 2.35;
const hillNodes = [0, 1, 2, 3, 4].map((i) => [48.88 + i * 0.001, LNG]);
const hillEdges = [[0, 1], [1, 2], [2, 3], [3, 4]];
const hillAlt = [40, 55, 70, 85, 100];
const pt = (lat, lng, extra = {}) => ({ lat, lng, ...extra });

test('altitudes : lues avec le plan (écarts, null = inconnue), absentes ou fausses = pas d\'altitude', () => {
  assert.deepEqual(Array.from(readAlt([30, 2, null, -5], 4)).map((x) => (Number.isNaN(x) ? null : x)), [30, 32, null, 27]);
  assert.equal(readAlt([1, 2], 3), null);
  assert.equal(readAlt(['a', 1], 2), null);
  assert.equal(readAlt([null, null], 2), null);
  assert.equal(readPlan(plan(hillNodes, hillEdges)).alt, null);
  const P = readPlan(plan(hillNodes, hillEdges, hillAlt));
  assert.deepEqual(Array.from(P.alt), hillAlt);
  assert.deepEqual(decodeAlt(encodeAlt([30, null, 32, 27]), 4), [30, null, 32, 27]);
});

test('chemin : les morceaux dans le sens de la marche, montée vers le nord, rien vers le sud', () => {
  const P = readPlan(plan(hillNodes, hillEdges, hillAlt));
  const a = snap(P, pt(48.8802, LNG)); const b = snap(P, pt(48.8838, LNG));
  const up = route(P, a, b); const down = route(P, b, a);
  const pu = routeProfile(P, [up]); const pd = routeProfile(P, [down]);
  assert.ok(pu[0] < pu.at(-1) && pd[0] > pd.at(-1));
  assert.ok(Math.abs(climbUp(pu) - (pu.at(-1) - pu[0])) < 1e-6);
  assert.match(routeClimb(P, [up]), /^monte de [4-6]0 m$/);
  assert.equal(routeClimb(P, [down]), '');
  // même tronçon, dans les deux sens
  const s1 = snap(P, pt(48.8802, LNG)); const s2 = snap(P, pt(48.8808, LNG));
  const r = route(P, s1, s2); const p = routeProfile(P, [r]);
  assert.ok(p[1] > p[0]);
  // plusieurs étapes : les montées s'ajoutent
  const mid = snap(P, pt(48.8820, LNG));
  assert.equal(routeClimb(P, [route(P, a, mid), route(P, mid, b)]), routeClimb(P, [up]));
});

test('chemin : un pont ne compte pas (le modèle de l\'IGN y donne l\'eau), une altitude manquante = rien', () => {
  // Quai (36 m) — pont — île (34 m) — pont — quai (35 m), comme Châtelet → Saint-Michel le 24 nov. ; le milieu du pont : 26,85 m
  const n = [[48.8577, LNG], [48.8567, LNG], [48.8562, LNG], [48.8557, LNG], [48.8547, LNG], [48.8542, LNG], [48.8537, LNG]];
  const e = [[0, 1], [1, 2, OFFGROUND], [2, 3, OFFGROUND], [3, 4], [4, 5, OFFGROUND], [5, 6]];
  const z = [36, 36, null, 34, 34, null, 35]; // 2 et 5 ne touchent que des ponts : sans altitude (tools/maj-altitudes.mjs)
  const P = readPlan(plan(n, e, z));
  const r = route(P, snap(P, pt(48.8576, LNG)), snap(P, pt(48.8538, LNG)));
  assert.ok(r);
  assert.equal(routeClimb(P, [r]), '');
  assert.ok(climbUp(routeProfile(P, [r])) < 2);
  assert.equal(altOnEdge(P, 1, 10), null);
  // le même chemin si l'altitude des ponts avait été gardée : la fausse montée
  assert.equal(climbWords(climbUp([36, 36, 26.85, 34, 34, 26.85, 35])), 'monte de 20 m');
  // une altitude au sol manquante : rien n'est dit (pas d'info plutôt qu'une info fausse)
  const Q = readPlan(plan(hillNodes, hillEdges, [40, 55, null, 85, 100]));
  const r2 = route(Q, snap(Q, pt(48.8802, LNG)), snap(Q, pt(48.8838, LNG)));
  assert.equal(routeProfile(Q, [r2]), null);
  assert.equal(routeClimb(Q, [r2]), '');
  // un chemin calculé sans `run` (ancien) : rien
  assert.equal(routeClimb(Q, [{ m: 10, line: [] }]), '');
  assert.equal(routeClimb(null, [r2]), '');
});

test('montée : sans le bruit du modèle (moins de 2 m), à partir de 15 m, arrondie à 10 m', () => {
  assert.equal(climbUp(Array.from({ length: 40 }, (_, i) => 50 + (i % 2) * 1.5)), 0);
  assert.equal(climbUp([50, 60, 70, 59, 60.5, 50]), 20);
  assert.equal(climbUp([50, 60, 70, 59, 61, 50]), 22);
  assert.equal(climbWords(14.9), '');
  assert.equal(climbWords(15), 'monte de 20 m');
  assert.equal(climbWords(56.3), 'monte de 60 m');
  assert.equal(climbWords(NaN), '');
});

test('altitude là où je suis : position récente et précise, sur une rue, hors pont ; arrondie à 5 m', () => {
  const P = readPlan(plan(hillNodes, hillEdges, hillAlt));
  const now = Date.UTC(2026, 10, 24, 12);
  const fix = (o = {}) => ({ lat: 48.8821, lng: LNG, acc: 10, time: now - 60_000, ...o });
  assert.equal(altHere(P, fix(), now), 70); // 70 + 1,5 m → 70
  assert.equal(altHere(P, fix({ lat: 48.8824 }), now), 75); // 70 + 6 m → 75
  assert.equal(altHere(P, fix({ time: now - 11 * 60_000 }), now), null);
  assert.equal(altHere(P, fix({ acc: 40 }), now), null);
  assert.equal(altHere(P, fix({ lng: LNG + 0.001 }), now), null); // 73 m de la rue
  assert.equal(altHere(readPlan(plan(hillNodes, hillEdges)), fix(), now), null);
  assert.equal(altHere(P, null, now), null);
  const B = readPlan(plan(hillNodes, [[0, 1], [1, 2, OFFGROUND], [2, 3], [3, 4]], [40, 55, 70, 85, 100]));
  assert.equal(altHere(B, fix({ lat: 48.8815 }), now), null); // sur le pont
});

test('robot : seuls les croisements au sol sont demandés, l\'ancien plan est repris, un paquet perdu reste inconnu', async () => {
  const n = [[48.8577, LNG], [48.8567, LNG], [48.8562, LNG], [48.8557, LNG], [48.86, 2.36]];
  const e = [[0, 1], [1, 2, OFFGROUND], [2, 3, OFFGROUND], [3, 4]];
  const doc = plan(n, e);
  assert.deepEqual(Array.from(onGround(doc, 5)), [1, 1, 0, 1, 1]);
  const asked = [];
  const fake = async (pts) => { asked.push(...pts); return pts.map((p) => Math.round(p[0] * 100) / 100 + 0.4); };
  const r = await addAltitudes(doc, fake, null, () => {}, async () => {});
  assert.equal(asked.length, 4);
  assert.equal(r.ground, 4); assert.equal(r.offGround, 1); assert.equal(r.known, 4); assert.equal(r.missing, 0);
  const z = decodeAlt(doc.alt, 5);
  assert.equal(z[2], null);
  assert.ok(z.every((v, i) => i === 2 || Number.isInteger(v)));
  assert.ok(readPlan(doc).alt);
  // un nouveau plan : les croisements au même endroit reprennent leur altitude, seul le nouveau est demandé
  const doc2 = plan([...n, [48.861, 2.361]], [...e, [4, 5]]);
  asked.length = 0;
  const r2 = await addAltitudes(doc2, fake, doc, () => {}, async () => {});
  assert.equal(r2.reused, 4); assert.equal(asked.length, 1);
  // l'IGN ne répond pas : retenté deux fois, puis inconnu ; jamais d'échec
  let calls = 0;
  const doc3 = plan(n, e);
  const r3 = await addAltitudes(doc3, async () => { calls++; throw new Error('503'); }, null, () => {}, async () => {});
  assert.equal(calls, 3); assert.equal(r3.known, 0); assert.equal(r3.missing, 4);
  assert.equal(readPlan(doc3).alt, null);
  assert.equal(nodes5(doc3).length, 5);
});

test('robot : ponts, tunnels et voies hors du sol marqués 8 dans le plan des rues (tools/maj-rues.py)', { skip: spawnSync('python3', ['-V']).status !== 0 }, () => {
  const py = `
import importlib.util, json
s = importlib.util.spec_from_file_location('m', 'tools/maj-rues.py'); m = importlib.util.module_from_spec(s); s.loader.exec_module(m)
cases = [{'bridge': 'yes'}, {'bridge': 'viaduct'}, {'bridge': 'no'}, {'tunnel': 'yes'}, {'tunnel': 'building_passage'}, {'layer': '-1'}, {'layer': '0'}, {'layer': 'x'}, {}]
print(json.dumps([m.off_ground(t) for t in cases]))`;
  const r = spawnSync('python3', ['-I', '-c', py], { encoding: 'utf8' });
  assert.equal(r.status, 0, r.stderr);
  assert.deepEqual(JSON.parse(r.stdout), [true, true, false, true, false, true, false, false, false]);
  assert.match(readFileSync(new URL('../tools/maj-rues.py', import.meta.url), 'utf8'), /\(8 if off_ground\(t\) else 0\)/);
});

test('appli : la montée dans Mes parcours et Chemin à pied (pas les circuits), l\'altitude dans Météo et air, rien de téléchargé', () => {
  const app = readFileSync(new URL('../js/app.js', import.meta.url), 'utf8');
  assert.match(app, /crossingNote\(legs, true\)/); // la page d'un parcours
  assert.match(app, /crossingNote\(t\.legs\.filter\(\(l\) => !l\?\.orig\), !nc && !cm\)/); // le tracé : pas pour un circuit
  assert.match(app, /changed \? crossingNote\(d\.legs\.filter\(\(l\) => !l\?\.orig\)\) : null/); // Modifier le circuit : sans
  assert.match(app, /up \? `ça \$\{up\}` : null/); // Chemin à pied
  assert.match(app, /`Altitude : environ \$\{z\} m`/);
  const alt = /function altNow\(\) \{[\s\S]*?\n\}/.exec(app)[0];
  assert.ok(!/downloadStreets|loadStreets|fetch\(/.test(alt), 'jamais de téléchargement pour l\'altitude');
  assert.match(alt, /streetsStored\(\)/);
  assert.equal(STEPS, 4); assert.equal(OFFGROUND, 8);
  const wf = readFileSync(new URL('../.github/workflows/maj-rues.yml', import.meta.url), 'utf8');
  assert.match(wf, /node tools\/maj-altitudes\.mjs data\/rues\.json \/tmp\/rues-avant\.json/);
  assert.match(wf, /cp data\/rues\.json \/tmp\/rues-avant\.json/);
});

test('v407 : le petit rond des fonds de carte se cache sous un bandeau de la carte (il recouvrait le titre en Très grand)', () => {
  const css = readFileSync(new URL('../css/style.css', import.meta.url), 'utf8');
  assert.ok(css.includes('body:has(#sheet:not([hidden])) .map-btn:is(.style-btn, .backup-btn), body:has(.peek-card) .map-btn:is(.style-btn, .backup-btn) { display: none; }')); // v469 : le rond Sauvegarder aussi
});
