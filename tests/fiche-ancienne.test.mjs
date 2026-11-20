import { test } from 'node:test';
import assert from 'node:assert/strict';
import { canClose, staleSince, staleText, STALE_MS } from '../js/passage.js';
import { loadState, saveState } from '../js/store.js';

// v274 (mon choix A du 20 nov. 2026) : « a pu fermer » après un an sans nouvelles, pour les restos et les commerces.
const now = Date.UTC(2027, 10, 20, 12);
const day = 864e5;
const resto = { id: 'resto', name: 'Restos' };

test('seules les catégories qui peuvent fermer', () => {
  for (const name of ['Restos', 'Boutiques', 'Bistrots', 'Cafés', 'Librairies', 'Caves à vin', 'Épiceries fines', 'Boulangeries', 'Bars']) assert.ok(canClose({ id: 'x', name }), name);
  assert.ok(canClose({ id: 'boutique', name: 'Mes adresses' }), 'catégorie de départ Boutiques, renommée');
  for (const name of ['Culture', 'Musées', 'Parcs et jardins', 'Monuments', 'Street art', 'Tableaux', 'Barrières']) assert.equal(canClose({ id: 'x', name }), false, name);
});

test('un an sans nouvelles : la date du dernier signe ; sinon rien', () => {
  const old = now - 400 * day;
  assert.equal(staleSince({ created: old }, resto, now), old);
  assert.equal(staleSince({ created: now - 300 * day }, resto, now), null, 'moins d\'un an');
  assert.equal(staleSince({ created: old }, { id: 'culture', name: 'Culture' }, now), null, 'un musée ne « ferme » pas ici');
  assert.equal(staleSince({ created: old, gone: now - 10 * day }, resto, now), null, 'déjà noté fermé');
  assert.equal(staleSince({ created: Date.UTC(2020, 0, 1) }, resto, now), null, 'date d\'ajout douteuse : rien plutôt que faux');
  assert.equal(staleSince({ created: old, visited: now - 30 * day }, resto, now), null, 'visité récemment');
  assert.equal(staleSince({ created: old, passages: [{ at: now - 30 * day }] }, resto, now), null, 'une impression récente');
  assert.equal(staleSince({ created: old, hoursAt: now - 30 * day }, resto, now), null, 'horaires notés récemment');
  assert.equal(staleSince({ created: old, checked: now - day }, resto, now), null, '« Toujours ouvert » récent');
  assert.equal(staleSince({ created: old, checked: now - 2 * STALE_MS }, resto, now), old, 'le plus récent compte');
  assert.match(staleText(Date.UTC(2025, 8, 26)), /^Pas revu depuis septembre 2025 : a pu fermer$/);
});

test('« Toujours ouvert » est gardé (rechargement)', () => {
  const mem = new Map();
  const st = { getItem: (k) => mem.get(k) ?? null, setItem: (k, v) => mem.set(k, v) };
  const pt = (id, checked) => ({ id, name: `Bistrot ${id}`, cat: 'resto', lat: 48.86, lng: 2.35, created: now - 400 * day, checked });
  assert.ok(saveState(st, { ...loadState(st), points: [pt('a', now), pt('b', 'hier')] }));
  const [a, b] = loadState(st).points;
  assert.equal(a.checked, now);
  assert.equal('checked' in b, false, 'une date illisible n\'est pas gardée');
});
