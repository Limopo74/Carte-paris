// Mes circuits (Mes parcours, version 2) : nettoyage, tracé, lien, sauvegarde, et la règle « jamais deux fois la même rue ».
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { encodeTrace, cleanMyCircuits, asCircuit, myCircuitLink, readMyCircuitLink, myCircuitId, MY_CIRCUITS_MAX, circuitFp, splitTrace } from '../js/mescircuits.js';
import { decodeTrace, cleanCircuits } from '../js/circuits.js';
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

/* ---------- Version 3 : modifier un circuit de Claude (ma version le remplace, choix 7B ; l'original revient, 8A) ---------- */
const V1 = { ...C1, id: 'm-vers1', base: 'marais', baseFp: 'abc', confort: 'Plat, sans escalier.', note: 'Fermé le lundi.', moved: true, at: 20,
  etapes: [{ n: 'Métro Saint-Paul', lat: 48.85521, lng: 2.36086, t: 'Ligne 1.', m: true }, { n: 'Hôtel de Sully', lat: 48.85441, lng: 2.3637, t: 'Hôtel particulier.', s: 'https://exemple.fr/sully' }, { n: 'Rue d\'Ormesson', lat: 48.8553, lng: 2.3624 }] };

test('ma version d\'un circuit de Claude : gardée avec son original, sa source, sa station ; une seule par circuit', () => {
  const [c] = cleanMyCircuits([V1]);
  assert.equal(c.base, 'marais'); assert.equal(c.baseFp, 'abc'); assert.equal(c.moved, true);
  assert.equal(c.confort, 'Plat, sans escalier.');
  assert.equal(c.etapes[0].m, true, 'une station reste une station');
  assert.equal(c.etapes[1].s, 'https://exemple.fr/sully', 'la source reste avec son texte');
  assert.equal(cleanMyCircuits([{ ...V1, etapes: V1.etapes.map((e) => ({ ...e, t: '' })) }])[0].etapes[1].s, undefined, 'sans texte, pas de source');
  assert.equal(cleanMyCircuits([{ ...V1, etapes: V1.etapes.map((e) => ({ ...e, s: 'http://pas-sur.fr' })) }])[0].etapes[1].s, undefined, 'source en https seulement');
  assert.equal(cleanMyCircuits([{ ...V1, base: 'm-moi' }])[0].base, undefined, 'jamais un de mes circuits comme original');
  const two = cleanMyCircuits([{ ...V1, id: 'm-vers2', at: 30, titre: 'Plus récente' }, V1]);
  assert.equal(two.length, 1, 'une seule version d\'un même circuit');
  assert.equal(two[0].titre, 'Plus récente');
  const v = asCircuit(c);
  assert.equal(v.id, 'marais', 'elle prend la place de l\'original (Je l\'ai fait, Masquer gardent son id)');
  assert.equal(v.myId, 'm-vers1'); assert.equal(v.base, 'marais'); assert.equal(v.confort, 'Plat, sans escalier.');
});

test('l\'empreinte de l\'original change quand Claude le revoit (choix 8A) ; le tracé se coupe aux étapes', () => {
  const list = cleanCircuits(JSON.parse(readFileSync(new URL('../data/circuits.json', import.meta.url), 'utf8')));
  const c = list.find((x) => x.id === 'marais');
  assert.equal(circuitFp(c), circuitFp(structuredClone(c)));
  assert.notEqual(circuitFp(c), circuitFp({ ...c, etapes: c.etapes.map((e, i) => (i === 2 ? { ...e, t: `${e.t} Corrigé.` } : e)) }), 'un texte revu');
  assert.notEqual(circuitFp(c), circuitFp({ ...c, trace: c.trace.slice(1) }), 'un tracé revu');
  for (const x of list) {
    const parts = splitTrace(x.trace, x.etapes);
    assert.equal(parts.length, x.etapes.length - 1, `${x.id} : un bout par étape`);
    assert.deepEqual(parts[0][0], x.trace[0]); assert.deepEqual(parts.at(-1).at(-1), x.trace.at(-1));
    assert.equal(parts.reduce((t, l) => t + l.length - 1, 0), x.trace.length - 1, `${x.id} : aucun point perdu ni en double`);
  }
});

test('ma version part chez un proche comme un circuit à moi (sans l\'original)', () => {
  const mem = new Map(); const st = { getItem: (k) => mem.get(k) ?? null, setItem: (k, v) => mem.set(k, String(v)) };
  saveState(st, { ...loadState(st), myCircuits: [V1] });
  const s1 = loadState(st);
  assert.equal(s1.myCircuits[0].base, 'marais', 'sur le téléphone et dans ma sauvegarde');
  const friend = JSON.stringify(exportForFriend(s1, { ...SEND_DEFAULT, circuits: true }));
  assert.ok(friend.includes('Marais du dimanche'));
  assert.ok(!friend.includes('"base"') && !friend.includes('baseFp'), 'chez le proche, il ne remplace pas son circuit de l\'appli');
});

test('règle 6B sur ma version d\'un circuit de Claude : seuls les bouts changés comptent (choix A)', () => {
  const L = legs([s(0, 0), s(0, 2), s(0, 1)]);
  assert.ok(repeated(P, L), 'tout regardé : aller-retour refusé');
  assert.equal(repeated(P, L, new Set([0, 1])), null, 'deux bouts gardés : pas comparés entre eux');
  assert.ok(repeated(P, L, new Set([0])), 'un bout changé qui revient sur un bout gardé : refusé');
});

test('appli : Modifier ce circuit, Revenir au circuit d\'origine, retirer une étape en touchant son numéro', () => {
  const app = readFileSync(new URL('../js/app.js', import.meta.url), 'utf8');
  for (const t of ["'Modifier ce circuit'", "'Changer les étapes'", "'Retirer cette étape'", "'Revenir au circuit d\\'origine'", "'Ta version de ce circuit'", "'Ta version'"]) assert.ok(app.includes(t), t);
  assert.ok(app.includes('repeated(streets, d.legs, claude ? fixed : null)'), 'circuit de Claude : seuls les bouts changés');
  assert.ok(/Claude a revu ce circuit/.test(app), 'l\'original revu se dit');
});

test('v253 : « Nouveau circuit » en bas de Circuits de visite, sans parcours gardé', async () => {
  const { readFileSync } = await import('node:fs');
  const app = readFileSync(new URL('../js/app.js', import.meta.url), 'utf8');
  const c = app.slice(app.indexOf('async function openCircuits('), app.indexOf("/** La page d'un circuit"));
  assert.match(c, /foot\(el\('div'[^\n]*\n\s*el\('button', \{ type: 'button', class: 'btn c-disc', onclick: \(\) => openNewCircuit\(self\) \}, ico\('plus'\), 'Nouveau circuit'\)/);
  const t = app.slice(app.indexOf('function showTrace('), app.indexOf('function removeStep('));
  assert.match(t, /if \(nc\) \{/);
  assert.equal(/state\.routes =[^\n]*\n[^\n]*/.exec(t)[0].includes('nc'), false);
  const m = app.slice(app.indexOf('function openMakeCircuit('), app.indexOf('/** Mes circuits dans la page Circuits'));
  assert.match(m, /\.\.\.\(r\.id \? \{ from: r\.id \} : \{\}\)/); // pas de parcours derrière : pas de « from »
  assert.match(m, /navStack = navStack\.filter\(/); // le retour ne rouvre pas le formulaire
});

test('v257 : + Ajouter crée aussi une balade (Un parcours, Un circuit), sous les boutons des lieux', () => {
  const app = readFileSync(new URL('../js/app.js', import.meta.url), 'utf8');
  const add = app.slice(app.indexOf('function openAddChoice()'), app.indexOf("{ name: 'add', again: openAddChoice }"));
  assert.ok(add.includes("' Ajouter'"), 'la page s\'appelle « Ajouter »');
  const order = ['Vu en passant', 'À ma position', 'Avec un nom ou une adresse', 'Depuis ma galerie', 'Un parcours', 'Un circuit'].map((t) => add.indexOf(`'${t}'`));
  assert.ok(order.every((i, k) => i > 0 && (k === 0 || i > order[k - 1])), 'les boutons des lieux restent en tête, à leur place');
  assert.ok(add.includes('openNewRoute(back)') && add.includes('openNewCircuit(back)'), 'Annuler ramène à Ajouter');
});
