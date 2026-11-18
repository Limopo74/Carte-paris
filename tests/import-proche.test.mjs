// Importer les lieux d'un proche en choisissant (v181) : mergeFriend (js/store.js), sorties « Prévu par » (js/planning.js)
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { mergeFriend, exportForFriend, SEND_DEFAULT } from '../js/store.js';
import { cleanPlans, pastPlans } from '../js/planning.js';

const cats = [{ id: 'resto', name: 'Restos', color: '#aa3300', icon: '🍽️' }, { id: 'musee', name: 'Musées', color: '#335599', icon: '🏛️' }];
const marie = () => ({
  me: 'Marie', categories: cats, lists: [],
  points: [
    { id: 'a', name: 'Chez A', lat: 48.8600, lng: 2.3700, cat: 'resto', note: 'Très bon', photos: ['ph1'], passages: [{ at: 1, text: 'Super', photo: 'ph2' }] },
    { id: 'b', name: 'Orsay', lat: 48.8600, lng: 2.3266, cat: 'musee', note: 'Le jeudi' },
    { id: 'c', name: 'Café Z', lat: 48.8700, lng: 2.3500, cat: 'resto', note: '' },
  ],
  plans: [{ id: 'p1', name: 'Expo', lat: 48.86, lng: 2.33, plan: true, ticket: { at: Date.now() + 864e5 } }],
  artists: ['Invader', 'Miss.Tic'], venues: ['Paris 9e'],
});
const all = { lieux: true, notes: true, passages: true, photos: true, cats: null, artists: new Set(['Invader', 'Miss.Tic']), venues: new Set(['Paris 9e']), plans: new Set(['p1']) };
const file = (sel = { ...SEND_DEFAULT, passages: true, photos: true, plans: true, artists: true, venues: true }) => exportForFriend(marie(), sel);
const jeanne = (points = []) => ({ me: 'Jeanne', categories: [cats[0]], lists: [], points, plans: [], artists: ['C215'], venues: [] });

test('import : tout est gardé au nom de Marie, catégories ajoutées, sorties « Prévu par Marie »', () => {
  const r = mergeFriend(jeanne(), file(), 'Marie', all);
  assert.equal(r.added, 3); assert.equal(r.updated, 0); assert.equal(r.dups, 0);
  assert.ok(r.state.points.every((p) => p.owner === 'Marie'));
  assert.ok(r.state.categories.some((c) => c.id === 'musee'));
  assert.deepEqual(r.state.artists, ['C215', 'Invader', 'Miss.Tic']);
  assert.equal(r.state.plans[0].by, 'Marie');
  assert.equal(r.state.points[0].passages[0].photo, 'ph2');
});

test('import : elle décoche des contenus, une catégorie, un artiste, la sortie', () => {
  const r = mergeFriend(jeanne(), file(), 'Marie', { ...all, notes: false, passages: false, photos: false, cats: new Set(['resto']), artists: new Set(['Invader']), venues: new Set(), plans: new Set() });
  assert.deepEqual(r.state.points.map((p) => p.id), ['a', 'c']);
  assert.equal(r.state.points[0].note, ''); assert.equal(r.state.points[0].photos, undefined); assert.equal(r.state.points[0].passages, undefined);
  assert.ok(!r.state.categories.some((c) => c.id === 'musee'), 'pas de catégorie inutile');
  assert.deepEqual(r.state.artists, ['C215', 'Invader']); assert.deepEqual(r.state.venues, []); assert.equal(r.state.plans.length, 0);
  assert.equal(mergeFriend(jeanne(), file(), 'Marie', { ...all, lieux: false }).added, 0);
});

test('import : un lieu qu\'elle a déjà n\'est pas ajouté une seconde fois', () => {
  const r = mergeFriend(jeanne([{ id: 'j1', name: 'chez a', lat: 48.8603, lng: 2.3702, cat: 'resto' }, { id: 'j2', name: 'Autre nom', lat: 48.87003, lng: 2.35003, cat: 'resto' }]), file(), 'Marie', all);
  assert.equal(r.dups, 2, 'même nom à 35 m, et n\'importe quel lieu à 4 m');
  assert.equal(r.added, 1);
});

test('import : un nouvel envoi met à jour ses lieux déjà reçus, sans rien retirer ni toucher aux miens', () => {
  const first = mergeFriend(jeanne(), file(), 'Marie', all).state;
  first.points.find((p) => p.id === 'b').fav = true; // Jeanne a mis Orsay en favori
  const m = marie();
  m.points[1] = { ...m.points[1], name: 'Musée d\'Orsay', note: 'Nocturne le jeudi', gone: undefined };
  m.points[0] = { ...m.points[0], gone: Date.now() };
  m.points.splice(2, 1); // Café Z n'est plus dans le nouveau fichier
  const f2 = exportForFriend(m, { ...SEND_DEFAULT });
  const r = mergeFriend(first, f2, 'Marie', { ...all, passages: false, photos: false });
  assert.equal(r.updated, 2); assert.equal(r.added, 0);
  const b = r.state.points.find((p) => p.id === 'b');
  assert.equal(b.name, 'Musée d\'Orsay'); assert.equal(b.note, 'Nocturne le jeudi'); assert.equal(b.fav, true, 'son favori reste');
  assert.ok(r.state.points.find((p) => p.id === 'a').gone, 'fermé repris');
  assert.ok(r.state.points.some((p) => p.id === 'c'), 'rien n\'est retiré');
  const mine = mergeFriend(jeanne([{ id: 'a', name: 'Mon A', lat: 48.9, lng: 2.3, cat: 'resto' }]), file(), 'Marie', all);
  assert.equal(mine.state.points.find((p) => p.id === 'a').name, 'Mon A', 'un lieu à elle avec le même id reste le sien');
});

test('sorties « Prévu par » : gardées par cleanPlans, jamais dans « Tu y es allé ? »', () => {
  const p = cleanPlans([{ id: 'p1', name: 'Expo', lat: 48.86, lng: 2.33, plan: true, ticket: { at: Date.now() - 864e5 }, by: 'Marie' }]);
  assert.equal(p[0].by, 'Marie');
  assert.equal(pastPlans(p).length, 0);
  assert.equal(pastPlans(p.map(({ by, ...x }) => x)).length, 1);
});
