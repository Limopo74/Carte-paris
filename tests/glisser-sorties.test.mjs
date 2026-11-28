// v518 (mes choix 1A 2A 3A 4A du 25 nov.) : glisser de côté sur la fiche d'une sortie ouvre la voisine de la liste d'origine,
// « 3 / 24 » sous le titre, arrêt aux bouts, allumé au départ, interrupteur dans Autres réglages.
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { makeDeck, deckMove, deckCount, deckLabel } from '../js/glisser-sorties.js';
import { loadState, saveState, KEY } from '../js/store.js';

const app = readFileSync(new URL('../js/app.js', import.meta.url), 'utf8');
const sw = readFileSync(new URL('../sw.js', import.meta.url), 'utf8');
const memStorage = () => { const m = new Map(); return { getItem: (k) => (m.has(k) ? m.get(k) : null), setItem: (k, v) => m.set(k, String(v)) }; };
const go = () => {};
const evs = ['a', 'b', 'c', 'd'].map((t) => ({ title: t }));

test('la suite suit l\'ordre affiché, sans doublon', () => {
  const [a, b, c] = evs;
  const d = makeDeck([{ e: a, go }, { e: b, go }, { e: a, go }, { e: c, go }], b);
  assert.deepEqual(d.items.map((x) => x.e.title), ['a', 'b', 'c']);
  assert.equal(d.i, 1);
  assert.equal(deckCount(d), '2 / 3');
  assert.match(deckLabel(d), /^Sortie 2 sur 3/);
});

test('rien pour une sortie seule ou absente de la liste', () => {
  assert.equal(makeDeck([{ e: evs[0], go }], evs[0]), null);
  assert.equal(makeDeck([{ e: evs[0], go }, { e: evs[1], go }], evs[2]), null);
  assert.equal(makeDeck([], evs[0]), null);
  assert.equal(deckCount(null), '');
});

test('un pas : la voisine ; au bout on s\'arrête (pas de boucle)', () => {
  const d = makeDeck(evs.map((e) => ({ e, go })), evs[0]);
  assert.equal(deckMove(d, -1), null, 'avant la première');
  const n = deckMove(d, 1);
  assert.equal(n.i, 1);
  assert.equal(d.i, 0, 'la suite d\'avant ne change pas');
  const last = makeDeck(evs.map((e) => ({ e, go })), evs[3]);
  assert.equal(deckMove(last, 1), null, 'après la dernière');
  assert.equal(deckMove(last, 0), null);
});

test('allumé au départ et pour une ancienne sauvegarde ; éteint, il le reste', () => {
  const st = memStorage();
  assert.equal(loadState(st).evSwipe, true);
  st.setItem(KEY, JSON.stringify({ points: [] }));
  assert.equal(loadState(st).evSwipe, true);
  const s = { ...loadState(st), evSwipe: false };
  saveState(st, s);
  assert.equal(loadState(st).evSwipe, false);
});

test('l\'appli : interrupteur, fiche, listes, aide, cache', () => {
  assert.match(app, /onOff\('evSwipe', 'arrow-left-right', 'Glisser entre les sorties'/);
  assert.match(app, /state\.evSwipe !== false && deck\?\.items\[deck\.i\]\?\.e === e/);
  assert.match(app, /class: 'sortie-count', 'aria-label': deckLabel\(dk\)/);
  assert.equal((app.match(/onclick: \(ev\) => go\(\{ deck: deckOf\(ev, e\) \}\)/g) ?? []).length, 3, 'Sorties (et Mes salles), Trouver une sortie et une rubrique de Ce week-end (v546)');
  assert.match(app, /if \(name !== 'sortie'\) sortieDeck = null;/);
  // v521 : dans les Nouveautés ; v532 : sortie des Nouveautés, la ligne reste dans l'Aide → Trouver une sortie
  const sorties = app.slice(app.indexOf("['calendar-days', 'Trouver une sortie', ["));
  assert.match(sorties.slice(0, sorties.indexOf(']],')), /\*\*Glisser entre les sorties\*\* : sur la fiche d\\'une sortie/);
  assert.match(sw, /'js\/glisser-sorties\.js'/);
});
