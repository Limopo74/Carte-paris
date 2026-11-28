import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { coffeeQuarters, filterCoffeeShops, readCoffeeShops, readCoffeeMarks, coffeeByStatus, readCoffeeBackup, mergeCoffeeBackups } from '../js/coffee-shops.js';
import { arrAt } from '../js/explore.js';

const read = (file) => JSON.parse(readFileSync(new URL('../data/' + file, import.meta.url), 'utf8'));
const catalogue = { places: [
  { id: 'pd-1111111111111111', name: 'Café de test', address: 'Rivoli', lat: 48.8606, lng: 2.3376, arr: 1, quarter: 'Palais-Royal', quarterId: '7510103' },
  { id: 'pd-2222222222222222', name: 'Café de test 2', address: 'Rivoli', lat: 48.8626, lng: 2.3386, arr: 1, quarter: 'Palais-Royal', quarterId: '7510103' },
] };
const items = readCoffeeShops(catalogue);

test('la couche conserve ses identifiants uniques et toutes ses positions sont dans leur arrondissement', () => {
  assert.ok(items.length > 0);
  assert.equal(items.length, catalogue.places.length);
  assert.equal(new Set(items.map((p) => p.id)).size, items.length);
  const contours = read('arrondissements.json');
  for (const p of items) assert.equal(arrAt(p.lat, p.lng, contours), p.arr, p.name);
});

test('filtrage cumulé par territoire et recherche insensible aux accents', () => {
  const sample = [{ id: 'a', name: 'Café Nuancé', address: 'Rue de Rivoli', arr: 1, quarterId: '7510103', quarter: 'Palais-Royal' },
    { id: 'b', name: 'Café Nuancé', address: 'Rue de Rivoli', arr: 4, quarterId: '7510401', quarter: 'Saint-Merri' }];
  assert.deepEqual(filterCoffeeShops(sample, { arr: '1', quarter: '7510103', query: 'NuanCe rivoli' }), [sample[0]]);
  assert.deepEqual(coffeeQuarters(sample, '4'), [['7510401', 'Saint-Merri']]);
});

test('les positions incertaines, fermetures et doublons sont ignorés ; les liens hostiles sont écartés', () => {
  const p = { ...catalogue.places[0], id: 'pd-0000000000000001', url: 'javascript:alert(1)', hours: '09:00', hoursSource: 'data:text/plain,x' };
  const rows = readCoffeeShops({ places: [p, p, { ...p, id: 'pd-0000000000000002', uncertain: true },
    { ...p, id: 'pd-0000000000000003', closed: true }] });
  assert.equal(rows.length, 1);
  assert.equal(rows[0].url, '');
  assert.equal(rows[0].hours, '');
});

test('tri par proximité déterministe sans modifier le référentiel', () => {
  const [first, second] = items;
  const sorted = filterCoffeeShops([first, second], { from: second });
  assert.equal(sorted[0].id, second.id);
  assert.equal(sorted[0].d, 0);
  assert.equal(Object.hasOwn(second,'d'), false);
});

test('les vérifications suivent l’identifiant même si le référentiel change', () => {
  const [first, second] = items;
  const updated = { ...first, name: 'Nom actualisé' };
  const marks = readCoffeeMarks({ [first.id]: { status: 'closed', at: 1000 }, bad: { status: 'closed', at: 1000 } });
  assert.deepEqual(Object.keys(marks), [first.id]);
  assert.deepEqual(coffeeByStatus([updated, second], marks), [second]);
  assert.deepEqual(coffeeByStatus([updated, second], marks, 'closed'), [updated]);
  assert.deepEqual(coffeeByStatus([updated, second], marks, 'all'), [updated, second]);
  assert.deepEqual(coffeeByStatus([updated, second], {}), [updated, second]);
});

test('une sauvegarde Coffee shops conserve le référentiel, les filtres et les choix les plus récents', () => {
  const [a, b] = items;
  const incoming = readCoffeeBackup({ catalogue: { ...catalogue, version: 26 },
    marks: { [a.id]: { status: 'closed', at: 10 }, [b.id]: { status: 'open', at: 30 } },
    prefs: { on: true, arr: '1', quarter: '7510103' } });
  assert.deepEqual(readCoffeeBackup(JSON.parse(JSON.stringify(incoming))), incoming);
  const local = readCoffeeBackup({ catalogue: { ...catalogue, version: 27 },
    marks: { [a.id]: { status: 'cleared', at: 20 }, [b.id]: { status: 'closed', at: 15 } } });
  const restored = mergeCoffeeBackups(local, incoming);
  assert.equal(restored.catalogue.version, 27);
  assert.deepEqual(restored.prefs, incoming.prefs);
  assert.equal(restored.marks[a.id].status, 'cleared');
  assert.equal(restored.marks[b.id].status, 'open');
  assert.equal(readCoffeeBackup(undefined), null);
});
