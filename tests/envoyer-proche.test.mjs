// Envoyer à un proche (v180) : exportForFriend, sendPoints, friendFileName (js/store.js)
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { exportForFriend, sendPoints, friendFileName, SEND_DEFAULT, mergeImport } from '../js/store.js';

const state = () => ({
  me: 'Marie',
  categories: [{ id: 'resto', name: 'Restos', color: '#aa3300', icon: '🍽️' }, { id: 'musee', name: 'Musées', color: '#335599', icon: '🏛️' }, { id: 'parc', name: 'Parcs', color: '#227744', icon: '🌳' }],
  lists: [{ id: 'l11', name: 'Mes restos du 11e' }],
  points: [
    { id: 'a', name: 'Chez A', lat: 48.86, lng: 2.37, cat: 'resto', note: 'Très bon', lists: ['l11'], ticket: { at: 1 }, photos: ['ph1'], passages: [{ at: 1, text: 'Super', photo: 'ph2' }] },
    { id: 'b', name: 'Orsay', lat: 48.86, lng: 2.33, cat: 'musee', note: 'Le jeudi soir' },
    { id: 'c', name: 'Parc', lat: 48.88, lng: 2.31, cat: 'parc', note: '' },
    { id: 'd', name: 'Lieu de Paul', lat: 48.85, lng: 2.35, cat: 'resto', owner: 'Paul' },
  ],
  plans: [{ id: 'p1', name: 'Expo', lat: 48.86, lng: 2.33, plan: true, ticket: { at: Date.now() + 864e5 } }],
  artists: ['Invader'], venues: ['Paris 9e'],
});

test('envoyer : par défaut, mes lieux avec leurs notes, sans billets ni photos ni passages, sans les lieux d\'un proche', () => {
  const f = exportForFriend(state());
  assert.equal(f.kind, 'proche'); assert.equal(f.owner, 'Marie');
  assert.deepEqual(f.points.map((p) => p.id), ['a', 'b', 'c']);
  const a = f.points[0];
  assert.equal(a.note, 'Très bon'); assert.equal(a.owner, 'Marie');
  assert.equal(a.ticket, undefined); assert.equal(a.photos, undefined); assert.equal(a.passages, undefined);
  assert.deepEqual(f.sent, ['lieux', 'notes']);
  assert.equal(f.plans, undefined); assert.equal(f.artists, undefined); assert.equal(f.venues, undefined);
  for (const k of ['settings', 'mySettings', 'myStations', 'outings', 'circuitNotes', 'hiddenCircuits', 'artistLinks']) assert.equal(f[k], undefined, k);
  assert.deepEqual(SEND_DEFAULT, { lieux: true, notes: true, passages: false, photos: false, plans: false, artists: false, venues: false, ttb: false, circuits: false, words: false }); // v247 : Mes circuits, décoché d'office ; v357 : Mots tout prêts aussi
});

test('envoyer : notes décochées, passages sans photos, sorties, artistes et salles cochés', () => {
  const f = exportForFriend(state(), { ...SEND_DEFAULT, notes: false, passages: true, plans: true, artists: true, venues: true });
  assert.equal(f.points[0].note, '');
  assert.deepEqual(f.points[0].passages, [{ at: 1, text: 'Super' }]);
  assert.equal(f.plans.length, 1); assert.deepEqual(f.artists, ['Invader']); assert.deepEqual(f.venues, ['Paris 9e']);
  assert.deepEqual(f.sent, ['lieux', 'passages', 'plans', 'artists', 'venues']);
  const g = exportForFriend(state(), { ...SEND_DEFAULT, photos: true, passages: true });
  assert.deepEqual(g.points[0].photos, ['ph1']); assert.equal(g.points[0].passages[0].photo, 'ph2');
});

test('envoyer : catégories et listes choisies ; seulement les catégories utilisées partent', () => {
  const s = state();
  assert.deepEqual(sendPoints(s, new Set(['musee'])).map((p) => p.id), ['b']);
  assert.deepEqual(sendPoints(s, new Set(), new Set(['l11'])).map((p) => p.id), ['a']);
  assert.deepEqual(sendPoints(s, new Set(['parc']), new Set(['l11'])).map((p) => p.id), ['a', 'c']);
  const f = exportForFriend(s, SEND_DEFAULT, new Set(['musee']));
  assert.deepEqual(f.categories.map((c) => c.id), ['musee']); assert.deepEqual(f.lists, []);
  assert.equal(exportForFriend(s, { ...SEND_DEFAULT, lieux: false, artists: true }).points.length, 0);
});

test('envoyer : le fichier s\'importe chez un proche (lieux à mon nom) et son nom de fichier est clair', () => {
  const f = exportForFriend(state());
  const r = mergeImport({ points: [], categories: [], lists: [], me: 'Jeanne' }, JSON.stringify(f), 'Marie');
  assert.equal(r.added, 3);
  assert.ok(r.state.points.every((p) => p.owner === 'Marie'));
  assert.equal(friendFileName(new Date(2026, 10, 18), 'Marie', 3), 'Ma carte de Paris - lieux de Marie du 18-11-2026 (3 lieux).json');
  assert.equal(friendFileName(new Date(2026, 10, 18), '', 1), 'Ma carte de Paris - lieux du 18-11-2026 (1 lieu).json');
});

test('envoyer (v207) : seulement mes sorties à venir — ni une sortie passée, ni « Pas allé », ni celle prévue par un autre proche', async () => {
  const { sendPlans } = await import('../js/store.js');
  const now = new Date(2026, 10, 18, 15, 0);
  const at = (days, h = 20) => new Date(2026, 10, 18 + days, h).getTime();
  const plan = (id, days, extra = {}) => ({ id, name: `Sortie ${id}`, lat: 48.86, lng: 2.33, plan: true, ticket: { at: at(days) }, ...extra });
  const s = { ...state(), plans: [plan('demain', 1), plan('matin', 0, { ticket: { at: at(0, 9) } }), plan('hier', -1), plan('manquee', -3, { missed: true, until: at(20) }), plan('paul', 2, { by: 'Paul' })] };
  assert.deepEqual(sendPlans(s, now).map((x) => x.id), ['demain', 'matin']); // ce matin compte encore : c'est aujourd'hui
  // exportForFriend prend la vraie date du jour : sorties placées par rapport à maintenant (le 20 nov. 2026, les sorties
  // du 18 et du 19 étaient passées, f.plans manquait et le test cassait sans défaut dans l'appli).
  const later = (days) => Date.now() + days * 864e5;
  const s2 = { ...state(), plans: [plan('demain', 1, { ticket: { at: later(1) } }), plan('manquee', -3, { missed: true, ticket: { at: later(-3) }, until: later(20) }), plan('paul', 2, { by: 'Paul', ticket: { at: later(2) } })] };
  const f = exportForFriend(s2, { ...SEND_DEFAULT, plans: true });
  assert.deepEqual(f.plans.map((x) => x.id), ['demain']);
  assert.ok(f.plans.every((x) => !x.by && !x.missed));
  assert.equal(sendPlans({ ...state(), plans: [plan('hier', -1)] }, now).length, 0);
});
