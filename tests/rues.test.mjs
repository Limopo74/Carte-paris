// Plan des rues et chemin à pied (Mes parcours, v1) : sur un petit plan inventé au format de tools/maj-rues.py.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readPlan, snap, route, edgePoints, PARK, STEPS, SNAP_MAX_M } from '../js/rues.js';
import { distanceM } from '../js/geo.js';

/** Fabrique le fichier (format 2) : nodes [[lat, lng]], edges [[a, b, flags, nom, [[lat, lng] de forme]]]. */
function plan(nodes, edges, names = []) {
  const n5 = nodes.map(([a, g]) => [Math.round(a * 1e5), Math.round(g * 1e5)]);
  const flat = []; let p = [0, 0];
  for (const q of n5) { flat.push(q[0] - p[0], q[1] - p[1]); p = q; }
  const ea = []; const eb = []; const ef = []; const ek = []; const en = []; const shape = []; let pa = 0;
  for (const [a, b, f = 0, k = 0, sh = []] of edges) {
    ea.push(a - pa); eb.push(b - a); ef.push(f); ek.push(k); en.push(sh.length); pa = a;
    let prev = n5[a];
    for (const [la, lo] of sh) { const q = [Math.round(la * 1e5), Math.round(lo * 1e5)]; shape.push(q[0] - prev[0], q[1] - prev[1]); prev = q; }
  }
  return { source: 'test', updated: '2026-11-19', v: 2, names, nodes: flat, ea, eb, ef, ek, en, shape };
}

// Grille de 3 × 3 croisements, 100 m environ entre deux (0,001° de lat ≈ 111 m ; 0,0014° de lng ≈ 103 m à Paris)
const LAT0 = 48.85; const LNG0 = 2.35; const DLA = 0.001; const DLN = 0.0014;
const at = (i, j) => [LAT0 + i * DLA, LNG0 + j * DLN];
const NODES = []; for (let i = 0; i < 3; i++) for (let j = 0; j < 3; j++) NODES.push(at(i, j));
const id = (i, j) => i * 3 + j;
const EDGES = [];
for (let i = 0; i < 3; i++) for (let j = 0; j < 2; j++) EDGES.push([id(i, j), id(i, j + 1), 0, 1 + i]); // rues est-ouest « Rue 0/1/2 »
for (let j = 0; j < 3; j++) for (let i = 0; i < 2; i++) EDGES.push([id(i, j), id(i + 1, j), 0, 0]);   // rues nord-sud sans nom
// Raccourci en diagonale à travers un parc, de (0,0) à (2,2) (plus court que tout le reste)
EDGES.push([id(0, 0), id(2, 2), PARK, 4, [at(1, 1)]]);
// Un bout isolé, loin
NODES.push([48.86, 2.36], [48.8601, 2.3601]);
EDGES.push([9, 10, STEPS, 0]);
const P = readPlan(plan(NODES, EDGES, ['Rue 0', 'Rue 1', 'Rue 2', 'Allée du parc']));
const pt = (lat, lng) => ({ lat, lng });

test('plan : lu, avec ses croisements, ses tronçons et les points de forme', () => {
  assert.ok(P);
  assert.equal(P.N, 11);
  assert.equal(P.E, 14);
  const diag = edgePoints(P, 12);
  assert.equal(diag.length, 3, 'le raccourci garde son point du milieu');
  assert.ok(Math.abs(diag[1][0] - at(1, 1)[0]) < 1e-5);
});

test('plan : un fichier illisible ou tronqué donne null', () => {
  assert.equal(readPlan(null), null);
  assert.equal(readPlan({ v: 2, nodes: [1], ea: [], eb: [], ef: [], ek: [], en: [], shape: [] }), null);
  assert.equal(readPlan({ ...plan(NODES, EDGES), v: 1 }), null, 'ancien format refusé');
  const bad = plan(NODES, EDGES); bad.shape = bad.shape.slice(2);
  assert.equal(readPlan(bad), null);
  const out = plan(NODES, EDGES); out.eb[0] = 99;
  assert.equal(readPlan(out), null, 'un tronçon vers un croisement qui n\'existe pas');
  const cut = plan(NODES, EDGES); cut.ef.pop();
  assert.equal(readPlan(cut), null, 'colonnes de longueurs différentes');
});

test('étape posée : sur la rue la plus proche, avec son nom ; trop loin, refusée', () => {
  const s = snap(P, pt(LAT0 + 0.00008, LNG0 + 0.0007)); // 9 m au nord du milieu de « Rue 0 »
  assert.ok(s);
  assert.equal(s.name, 'Rue 0');
  assert.ok(s.d < 12 && s.d > 6, `${s.d}`);
  assert.ok(Math.abs(s.lat - LAT0) < 1e-6, 'posée sur la rue');
  assert.ok(Math.abs(s.t - 51) < 3, `à mi-chemin du tronçon (${s.t})`);
  assert.equal(snap(P, pt(48.80, 2.30)), null, 'loin de tout : refusée');
  assert.equal(snap(P, pt(LAT0 - 0.001, LNG0)), null, `à 111 m de la première rue : refusée (plus de ${SNAP_MAX_M} m)`);
  assert.equal(snap(P, { lat: NaN, lng: 2 }), null);
});

test('chemin : le plus court dans les rues, sans couper par le parc', () => {
  const a = snap(P, pt(...at(0, 0))); const b = snap(P, pt(...at(2, 2)));
  const r = route(P, a, b);
  assert.ok(r);
  assert.equal(r.flags & PARK, 0, 'le parc est évité');
  assert.ok(Math.abs(r.m - (2 * 111 + 2 * 103)) < 8, `4 côtés de la grille (${r.m})`);
  assert.deepEqual(r.line[0], [a.lat, a.lng]);
  assert.deepEqual(r.line.at(-1), [b.lat, b.lng]);
  for (let i = 0; i < r.line.length - 1; i++) {
    const d = distanceM(pt(...r.line[i]), pt(...r.line[i + 1]));
    assert.ok(d < 120, 'aucun saut : chaque point suit le précédent dans la rue');
  }
});

test('chemin : une étape dans le parc permet de le traverser', () => {
  const inPark = snap(P, pt(...at(1, 1))); // le milieu du raccourci est aussi le croisement (1,1) : on pose juste à côté
  const onDiag = snap(P, pt(LAT0 + 0.0005, LNG0 + 0.0007));
  assert.equal(P.ef[onDiag.edge] & PARK, PARK, 'posée sur l\'allée du parc');
  assert.equal(onDiag.name, 'Allée du parc');
  const r = route(P, snap(P, pt(...at(0, 0))), onDiag);
  assert.equal(r.flags & PARK, PARK, 'le chemin passe par le parc, puisque l\'étape y est');
  assert.ok(r.m < 100);
  void inPark;
});

test('chemin : sur le même tronçon, tout droit ; entre deux morceaux séparés, aucun', () => {
  const a = snap(P, pt(LAT0, LNG0 + 0.0002)); const b = snap(P, pt(LAT0, LNG0 + 0.0011));
  const r = route(P, a, b);
  assert.equal(a.edge, b.edge);
  assert.ok(Math.abs(r.m - distanceM(a, b)) < 2);
  assert.equal(r.line.length, 2);
  assert.deepEqual(r.names, ['Rue 0']);
  const far = snap(P, pt(48.86, 2.36));
  assert.ok(far);
  assert.equal(route(P, a, far), null, 'aucun chemin vers le bout isolé');
});

test('chemin : sens inverse, même longueur', () => {
  const a = snap(P, pt(LAT0 + 0.0003, LNG0)); const b = snap(P, pt(LAT0 + 0.002, LNG0 + 0.0021));
  const r1 = route(P, a, b); const r2 = route(P, b, a);
  assert.ok(Math.abs(r1.m - r2.m) < 0.5);
  assert.ok(r1.names.length >= 1);
});

/* ---------- Mes parcours enregistrés ---------- */
import { cleanRoutes, cleanStep, autoName, ROUTE_STEPS_MAX, ROUTES_MAX } from '../js/rues.js';
import { loadState, saveState, exportJSON, exportForFriend, mergeImport, backupHash, SEND_DEFAULT } from '../js/store.js';
import { readFileSync } from 'node:fs';

const memStorage = () => { const m = new Map(); return { getItem: (k) => (m.has(k) ? m.get(k) : null), setItem: (k, v) => m.set(k, String(v)) }; };
const STEPS2 = [{ lat: 48.8553, lng: 2.3605, name: 'Rue de Rivoli' }, { lat: 48.8562, lng: 2.365, name: 'Place des Vosges', pid: 'abc' }];
const R1 = { id: 'r1', name: '', at: 1000, steps: STEPS2 };

test('parcours : nettoyés (2 à 20 étapes dans Paris, nom donné d\'office), les plus récents d\'abord', () => {
  const [r] = cleanRoutes([R1]);
  assert.equal(r.name, 'De Rue de Rivoli à Place des Vosges', 'nom automatique (choix A)');
  assert.equal(r.steps[1].pid, 'abc');
  assert.deepEqual(cleanRoutes([{ ...R1, steps: STEPS2.slice(0, 1) }]), [], 'une seule étape : pas un parcours');
  assert.deepEqual(cleanRoutes([{ ...R1, steps: [...STEPS2, { lat: 45.76, lng: 4.83, name: 'Lyon' }] }])[0].steps.length, 2, 'étape hors de Paris retirée');
  assert.equal(cleanStep({ lat: 48.85, lng: 2.35, name: '' }).name, 'Étape');
  assert.equal(cleanStep({ lat: 48.85, lng: 2.35, pid: '<x>' }).pid, undefined);
  const many = Array.from({ length: 30 }, (_, i) => ({ lat: 48.85 + i * 1e-4, lng: 2.35, name: `É${i}` }));
  assert.equal(cleanRoutes([{ ...R1, steps: many }])[0].steps.length, ROUTE_STEPS_MAX);
  const lots = Array.from({ length: 60 }, (_, i) => ({ ...R1, id: `r${i}`, at: i }));
  const kept = cleanRoutes(lots);
  assert.equal(kept.length, ROUTES_MAX);
  assert.equal(kept[0].id, 'r59', 'le plus récent en tête');
  assert.equal(cleanRoutes([R1, { ...R1, name: 'doublon' }]).length, 1, 'même id : un seul');
  assert.equal(autoName([STEPS2[0]]), 'Rue de Rivoli');
});

test('parcours : gardés sur le téléphone et dans ma sauvegarde, jamais chez un proche', () => {
  const st = memStorage();
  const s0 = loadState(st);
  assert.deepEqual(s0.routes, []);
  const h0 = backupHash(s0);
  saveState(st, { ...s0, routes: [R1] });
  const s1 = loadState(st);
  assert.equal(s1.routes.length, 1);
  assert.notEqual(backupHash(s1), h0, 'un parcours change l\'empreinte de la sauvegarde');
  assert.equal(backupHash({ ...s1, routes: [] }), h0, 'sans parcours, l\'empreinte des sauvegardes d\'avant ne change pas');
  const file = exportJSON(s1);
  assert.equal(JSON.parse(file).routes[0].steps.length, 2);
  assert.ok(!JSON.stringify(exportForFriend(s1, SEND_DEFAULT)).includes('Place des Vosges'));
  const empty = loadState(memStorage());
  assert.equal(mergeImport(empty, file).state.routes.length, 1, 'restaurés depuis ma sauvegarde');
  assert.equal(mergeImport(empty, file, 'Anne').state.routes.length, 0, 'pas depuis le fichier d\'un proche');
  const mine = { ...R1, name: 'Ma version', at: 5000 };
  assert.equal(mergeImport({ ...empty, routes: [mine] }, file).state.routes[0].name, 'Ma version', 'celui du téléphone garde sa version');
});

test('appli : Mes parcours à la place de Relier des lieux, plan des rues gardé à part, rien envoyé', () => {
  const app = readFileSync(new URL('../js/app.js', import.meta.url), 'utf8');
  const sw = readFileSync(new URL('../sw.js', import.meta.url), 'utf8');
  assert.ok(app.includes("row('route', 'Mes parcours',"), 'même ligne, même place dans Itinéraire');
  assert.ok(!app.includes('openRoutePicker'), 'Relier des lieux retiré');
  assert.ok(/keys\.filter\(\(k\) => k !== CACHE && k !== TILES && k !== RUES\)/.test(sw), 'le plan des rues survit aux mises à jour de l\'appli');
  assert.ok(!sw.includes("'data/rues.json'"), 'pas téléchargé d\'office à l\'installation');
  assert.ok(sw.includes("'js/rues.js'"));
  assert.ok(app.includes("if (moving || view === 'trace') return;"), 'pas de nouveau lieu par appui long pendant le tracé');
});

test('étape sur un trottoir sans nom : elle prend le nom de la rue voisine', () => {
  // trottoir sans nom à 8 m au nord de « Rue 0 », relié à la grille
  const nodes = [...NODES, [LAT0 + 0.00007, LNG0], [LAT0 + 0.00007, LNG0 + 0.0014]];
  const P2 = readPlan(plan(nodes, [...EDGES, [11, 12, 0, 0], [0, 11, 0, 0]], ['Rue 0', 'Rue 1', 'Rue 2', 'Allée du parc']));
  const s = snap(P2, pt(LAT0 + 0.0001, LNG0 + 0.0007));
  assert.equal(P2.ek[s.edge], 0, 'posée sur le trottoir');
  assert.equal(s.name, 'Rue 0');
});

test('vrai plan des rues (data/rues.json) : lisible, Paris entier, moins de 2 Mo à télécharger, chemins trouvés', async () => {
  const { gzipSync } = await import('node:zlib');
  const raw = readFileSync(new URL('../data/rues.json', import.meta.url));
  assert.ok(gzipSync(raw, { level: 9 }).length < 2e6, 'l\'écran de téléchargement annonce « moins de 2 Mo »');
  const app = readFileSync(new URL('../js/app.js', import.meta.url), 'utf8');
  assert.ok(app.includes("const RUES_SIZE = 'moins de 2 Mo';"));
  const P = readPlan(JSON.parse(raw));
  assert.ok(P && P.N > 100000 && P.E > 150000, 'Paris entier');
  const saintPaul = snap(P, pt(48.8552, 2.3610)); const vosges = snap(P, pt(48.8562, 2.3650));
  const r = route(P, saintPaul, vosges);
  assert.ok(r && r.m > 300 && r.m < 900, `Saint-Paul → place des Vosges : ${r?.m}`);
  const far = route(P, snap(P, pt(48.8462, 2.3464)), snap(P, pt(48.8710, 2.3320))); // Panthéon → Opéra
  assert.ok(far && far.m > 3000 && far.m < 4500, `${far?.m}`);
});
