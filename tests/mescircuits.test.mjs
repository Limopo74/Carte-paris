// Mes circuits (Mes parcours, version 2) : nettoyage, tracé, lien, sauvegarde, et la règle « jamais deux fois la même rue ».
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { encodeTrace, cleanMyCircuits, asCircuit, myCircuitLink, readMyCircuitLink, myCircuitId, MY_CIRCUITS_MAX } from '../js/mescircuits.js';
import { decodeTrace } from '../js/circuits.js';
import { readPlan, snap, route, repeated } from '../js/rues.js';
import { loadState, saveState, exportJSON, exportForFriend, mergeImport, backupHash, SEND_DEFAULT } from '../js/store.js';

const TRACE = [[48.85535, 2.36045], [48.85519, 2.36126], [48.85602, 2.36133], [48.85708, 2.36142], [48.85623, 2.36504]];
const C1 = { id: 'm-test1', titre: 'Marais du dimanche', themes: ['histoire', 'faux'], depart: 'Saint-Paul', arrivee: 'Chemin Vert', m: 700, at: 10,
  tr: encodeTrace(TRACE), etapes: [{ n: 'Rue de Rivoli', lat: 48.85535, lng: 2.36045 }, { n: 'Musée Carnavalet', lat: 48.85704, lng: 2.36247, t: 'Mon musée préféré.' }, { n: 'Place des Vosges', lat: 48.85623, lng: 2.36504 }] };

test('tracé : encodé puis décodé à l\'identique (format des circuits de Claude)', () => {
  assert.deepEqual(decodeTrace(encodeTrace(TRACE)), TRACE);
  assert.equal(encodeTrace([[48.85, 2.35], [48.85, 2.35], [48.851, 2.35]]).length, encodeTrace([[48.85, 2.35], [48.851, 2.35]]).length, 'point en double retiré');
});

test('mes circuits : nettoyés (titre, 2 à 20 étapes, tracé, thèmes connus), 30 au plus, les plus récents d\'abord', () => {
  const [c] = cleanMyCircuits([C1]);
  assert.deepEqual(c.themes, ['histoire'], 'thème inconnu retiré');
  assert.equal(c.etapes[1].t, 'Mon musée préféré.');
  assert.equal(cleanMyCircuits([{ ...C1, id: 'paris-1' }]).length, 0, 'jamais l\'id d\'un circuit de Claude');
  assert.equal(cleanMyCircuits([{ ...C1, titre: '' }]).length, 0);
  assert.equal(cleanMyCircuits([{ ...C1, tr: '' }]).length, 0);
  assert.equal(cleanMyCircuits([{ ...C1, etapes: C1.etapes.slice(0, 1) }]).length, 0);
  assert.equal(cleanMyCircuits(Array.from({ length: 40 }, (_, i) => ({ ...C1, id: `m-x${String(i).padStart(3, '0')}`, at: i }))).length, MY_CIRCUITS_MAX);
  assert.match(myCircuitId(), /^m-[a-z0-9]{4,30}$/);
  const v = asCircuit(c);
  assert.equal(v.mine, true);
  assert.equal(v.trace.length, TRACE.length);
});

test('lien : tracé et étapes ; mes textes seulement si je coche « Avec mes textes »', () => {
  const [c] = cleanMyCircuits([C1]);
  const sans = myCircuitLink('https://x.test/Carte-paris/#autre', c, false);
  assert.match(sans, /^https:\/\/x\.test\/Carte-paris\/#circuit=/);
  const r1 = readMyCircuitLink(sans.slice(sans.indexOf('#')));
  assert.equal(r1.titre, 'Marais du dimanche');
  assert.equal(r1.etapes.length, 3);
  assert.equal(r1.etapes[1].t, undefined, 'sans mes textes');
  assert.deepEqual(decodeTrace(r1.tr), TRACE);
  const avec = myCircuitLink('https://x.test/', c, true);
  assert.equal(readMyCircuitLink(avec.slice(avec.indexOf('#'))).etapes[1].t, 'Mon musée préféré.');
  assert.equal(readMyCircuitLink('#circuit=nimporte'), null);
  assert.equal(readMyCircuitLink('#balade=abc'), null);
});

test('mes circuits : sur le téléphone, dans ma sauvegarde, dans le fichier pour un proche seulement si je le coche', () => {
  const mem = new Map(); const st = { getItem: (k) => mem.get(k) ?? null, setItem: (k, v) => mem.set(k, String(v)) };
  const s0 = loadState(st);
  assert.deepEqual(s0.myCircuits, []);
  const h0 = backupHash(s0);
  saveState(st, { ...s0, myCircuits: [C1] });
  const s1 = loadState(st);
  assert.equal(s1.myCircuits.length, 1);
  assert.notEqual(backupHash(s1), h0);
  assert.equal(backupHash({ ...s1, myCircuits: [] }), h0, 'sans circuit, l\'empreinte des sauvegardes d\'avant ne change pas');
  const file = exportJSON(s1);
  const empty = loadState({ getItem: () => null, setItem: () => {} });
  assert.equal(mergeImport(empty, file).state.myCircuits.length, 1, 'restauré depuis ma sauvegarde');
  assert.ok(!JSON.stringify(exportForFriend(s1, SEND_DEFAULT)).includes('Marais du dimanche'), 'pas d\'office chez un proche');
  const friend = exportForFriend(s1, { ...SEND_DEFAULT, circuits: true });
  assert.ok(JSON.stringify(friend).includes('Marais du dimanche'), 'coché : envoyé');
  const got = mergeImport(empty, JSON.stringify(friend), 'Anne').state.myCircuits;
  assert.equal(got.length, 1, 'reçu d\'un proche');
  assert.equal(got[0].etapes[1].t, 'Mon musée préféré.');
});

/* La règle 6B sur un petit plan : une grille de 3 × 3, 100 m environ entre deux croisements */
function plan(nodes, edges) {
  const n5 = nodes.map(([a, g]) => [Math.round(a * 1e5), Math.round(g * 1e5)]);
  const flat = []; let p = [0, 0];
  for (const q of n5) { flat.push(q[0] - p[0], q[1] - p[1]); p = q; }
  const ea = []; const eb = []; let pa = 0;
  for (const [a, b] of edges) { ea.push(a - pa); eb.push(b - a); pa = a; }
  return { v: 2, names: ['Rue A'], nodes: flat, ea, eb, ef: edges.map(() => 0), ek: edges.map(() => 1), en: edges.map(() => 0), shape: [] };
}
const at = (i, j) => [48.85 + i * 0.001, 2.35 + j * 0.0014];
const N = []; for (let i = 0; i < 3; i++) for (let j = 0; j < 3; j++) N.push(at(i, j));
const E = [];
for (let i = 0; i < 3; i++) for (let j = 0; j < 2; j++) E.push([i * 3 + j, i * 3 + j + 1]);
for (let j = 0; j < 3; j++) for (let i = 0; i < 2; i++) E.push([i * 3 + j, (i + 1) * 3 + j]);
const P = readPlan(plan(N, E));
const s = (i, j) => snap(P, { lat: at(i, j)[0], lng: at(i, j)[1] });
const legs = (pts) => pts.slice(1).map((q, k) => route(P, pts[k], q));

test('jamais deux fois la même rue : un tour sans retour passe, un aller-retour est refusé avec la rue et l\'étape', () => {
  assert.equal(repeated(P, legs([s(0, 0), s(0, 2), s(2, 2)])), null, 'en L : rien en double');
  const back = repeated(P, legs([s(0, 0), s(0, 2), s(0, 1)]));
  assert.ok(back && back.m > 60, 'revenir sur la même rue : refusé (sans les 20 m autour de l\'étape)');
  assert.equal(back.name, 'Rue A');
  assert.equal(back.leg, 2, 'le double commence entre les étapes 2 et 3');
  const mid = (i, j1, j2, f) => snap(P, { lat: at(i, 0)[0], lng: at(0, j1)[1] + (at(0, j2)[1] - at(0, j1)[1]) * f });
  assert.equal(repeated(P, legs([s(0, 0), mid(0, 0, 1, 0.95), s(1, 1)])), null, 'un bout de moins de 15 m (traversée) est permis');
});

test('appli : En faire un circuit, Mes circuits, partage', () => {
  const app = readFileSync(new URL('../js/app.js', import.meta.url), 'utf8');
  const sw = readFileSync(new URL('../sw.js', import.meta.url), 'utf8');
  assert.ok(sw.includes("'js/mescircuits.js'"));
  assert.ok(app.includes("'En faire un circuit'"));
  assert.ok(app.includes("'Mes circuits'"));
  assert.ok(app.includes('readMyCircuitLink('), 'un lien reçu s\'ouvre');
});

test('aller voir une étape en retrait et revenir par le même bout : permis jusqu\'à 40 m, pas au-delà', () => {
  // un cul-de-sac de 30 m au nord du milieu de la première rue (une cour), puis un autre de 60 m
  const n2 = [...N, [48.85, 2.3507], [48.85027, 2.3507], [48.85054, 2.3507]];
  const e2 = [...E, [0, 9], [9, 1], [9, 10], [10, 11]];
  const P2 = readPlan(plan(n2, e2.map(([a, b]) => [a, b])));
  const at2 = (k) => snap(P2, { lat: n2[k][0], lng: n2[k][1] });
  const L2 = (pts) => pts.slice(1).map((q, k) => route(P2, pts[k], q));
  assert.equal(repeated(P2, L2([at2(0), at2(10), at2(2)])), null, 'cour de 30 m : on y va, on en revient');
  const deep = repeated(P2, L2([at2(0), at2(11), at2(2)]));
  assert.ok(deep && deep.m > 50, 'impasse de 60 m : refusée');
});
