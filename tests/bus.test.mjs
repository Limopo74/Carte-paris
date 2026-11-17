// v148 : Rentrer en bus — arrêts et lignes (data/bus.json), calculs sur le téléphone.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { busKey, busHome, busStopsNear, searchBusStops, busPlace, busLines, findBusStop, lineOrder, fold } from '../js/bus.js';

// Format de tools/maj-bus.py : [lat, lng, nom, insee, [indices des lignes]]
const data = {
  lines: ['20', '38', '39', '96', 'N14'],
  communes: { '94080': 'Vincennes' },
  stops: [
    [48.8806, 2.3552, 'Gare du Nord', '75110', [1, 2]],     // maison : 38 et 39
    [48.8584, 2.3474, 'Châtelet', '75101', [1, 3]],          // 38 et 96
    [48.8590, 2.3480, 'Châtelet - Lavandières', '75101', [2]], // 39, à 80 m
    [48.8600, 2.3500, 'Rivoli', '75104', [0]],              // 20 : ne va pas à la maison
    [48.8100, 2.4400, 'Mairie', '94080', [4]],
  ],
};
const here = { lat: 48.8585, lng: 2.3475 };

test('rentrer en bus : les lignes qui vont jusqu\'à l\'arrêt maison, depuis l\'arrêt le plus proche', () => {
  const r = busHome(data, here, 'Gare du Nord|75110');
  assert.deepEqual(r.map((x) => [x.stop[2], x.lines]), [['Châtelet', ['38']], ['Châtelet - Lavandières', ['39']]]);
  assert.ok(r[0].d < 20 && r[1].d < 120);
});

test('rentrer en bus : rien de trop loin, rien si l\'arrêt maison a disparu', () => {
  assert.deepEqual(busHome(data, { lat: 48.83, lng: 2.30 }, 'Gare du Nord|75110'), []);
  assert.equal(busHome(data, here, 'Ancien arrêt|75110'), null);
  assert.equal(busHome({ lines: [], stops: [] }, here, 'Gare du Nord|75110'), null);
});

test('une ligne qui passe à deux arrêts proches ne compte qu\'une fois, au plus proche', () => {
  const d2 = { ...data, stops: [...data.stops, [48.8586, 2.3476, 'Châtelet bis', '75101', [1]]] };
  const r = busHome(d2, here, 'Gare du Nord|75110');
  assert.equal(r.flatMap((x) => x.lines).filter((l) => l === '38').length, 1);
});

test('chercher un arrêt : sans accents, du plus proche', () => {
  assert.deepEqual(searchBusStops(data, 'chatelet', here).map((x) => x.stop[2]), ['Châtelet', 'Châtelet - Lavandières']);
  assert.equal(searchBusStops(data, '', here, 2).length, 2);
  assert.equal(searchBusStops(data, 'zzz', here).length, 0);
  assert.deepEqual(busStopsNear(data, here, 150).map((x) => x.stop[2]), ['Châtelet', 'Châtelet - Lavandières']);
});

test('affichage : arrondissement à Paris, commune ailleurs, lignes dans l\'ordre', () => {
  assert.equal(busPlace(data, data.stops[0]), '10e');
  assert.equal(busPlace(data, data.stops[1]), '1er');
  assert.equal(busPlace(data, data.stops[4]), 'Vincennes');
  assert.deepEqual(busLines(data, data.stops[0]), ['38', '39']);
  assert.deepEqual(['N14', '96', '20', '9'].sort(lineOrder), ['9', '20', '96', 'N14']);
  assert.equal(busKey(findBusStop(data, 'Mairie|94080')), 'Mairie|94080');
  assert.equal(fold('Église Saint-Étienne'), 'eglise saint-etienne');
});

test('mes stations gardent leur arrêt de bus, nettoyé, jusque dans la sauvegarde', async () => {
  const { cleanMyStations, setMyStationBus, addMyStation, loadState, saveState, exportJSON, mergeImport, DEFAULT_CATEGORIES } = await import('../js/store.js');
  let st = addMyStation({ myStations: [] }, 'Gare du Nord', 'Maison');
  const id = st.myStations[0].id;
  st = setMyStationBus(st, id, { n: ' Gare du Nord ', c: '75110' });
  assert.deepEqual(st.myStations[0].bus, { n: 'Gare du Nord', c: '75110' });
  assert.equal(setMyStationBus(st, id, null).myStations[0].bus, undefined);
  assert.equal(cleanMyStations([{ id: 'a', station: 'X', bus: { n: 'Y', c: '75' } }])[0].bus, undefined, 'code INSEE faux : ignoré');
  assert.equal(cleanMyStations([{ id: 'a', station: 'X', bus: { n: '<b>', c: 75110 } }])[0].bus.c, '75110');
  const mem = new Map(); const storage = { getItem: (k) => mem.get(k) ?? null, setItem: (k, v) => mem.set(k, v) };
  saveState(storage, { ...loadState(storage), myStations: st.myStations });
  assert.deepEqual(loadState(storage).myStations[0].bus, { n: 'Gare du Nord', c: '75110' });
  const other = mergeImport({ points: [], categories: DEFAULT_CATEGORIES.map((c) => ({ ...c })), lists: [], myStations: [] }, exportJSON({ ...loadState(storage), myStations: st.myStations }), '');
  assert.deepEqual(other.state.myStations?.[0]?.bus ?? other.myStations?.[0]?.bus, { n: 'Gare du Nord', c: '75110' });
});
