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

test('v263 : plusieurs arrêts maison, chaque ligne dit à lequel elle mène', () => {
  // Maison : Gare du Nord (38, 39) et Rivoli (20) ; le 20 n'allait nulle part avec un seul arrêt
  const d1 = { ...data, stops: [...data.stops, [48.8587, 2.3478, 'Pont Neuf', '75101', [0]]] }; // le 20 passe aussi près de moi
  assert.ok(!busHome(d1, here, 'Gare du Nord|75110').some((x) => x.lines.includes('20')));
  const r = busHome(d1, here, ['Gare du Nord|75110', 'Rivoli|75104']);
  assert.ok(r.some((x) => x.lines.includes('20')), 'le 20 compte grâce au 2e arrêt');
  const l38 = r.find((x) => x.lines.includes('38'));
  assert.equal(l38.to[2], 'Gare du Nord');
  assert.ok(r.every((x) => x.stop[2] !== 'Rivoli'), 'un de mes arrêts ne sert jamais de départ');
  // une ligne qui passe à deux de mes arrêts mène au premier, dans mon ordre
  const d2 = { ...data, stops: [...data.stops, [48.8700, 2.3500, 'Strasbourg', '75110', [1]]] };
  assert.equal(busHome(d2, here, ['Strasbourg|75110', 'Gare du Nord|75110']).find((x) => x.lines.includes('38')).to[2], 'Strasbourg');
  // un arrêt disparu n'empêche pas les autres ; tous disparus : null
  assert.deepEqual(busHome(data, here, ['Ancien|75110', 'Gare du Nord|75110']).map((x) => x.lines), [['38'], ['39']]);
  assert.equal(busHome(data, here, ['Ancien|75110', 'Autre|75110']), null);
  // une seule clé, en liste ou non : même résultat qu'avant
  assert.deepEqual(busHome(data, here, ['Gare du Nord|75110']), busHome(data, here, 'Gare du Nord|75110'));
});

test('v263 : 3 arrêts de bus au plus par station, sans doublon ; retirer le premier fait monter le suivant', async () => {
  const { cleanMyStations, setMyStationBus, addMyStation, stationBusStops, exportJSON, mergeImport, DEFAULT_CATEGORIES } = await import('../js/store.js');
  let st = addMyStation({ myStations: [] }, 'Nation', 'Maison');
  const id = st.myStations[0].id;
  st = setMyStationBus(st, id, { n: 'A', c: '75111' });
  st = setMyStationBus(st, id, { n: 'B', c: '75111' }, 1);
  st = setMyStationBus(st, id, { n: 'C', c: '75112' }, 2);
  st = setMyStationBus(st, id, { n: 'D', c: '75112' }, 3);
  assert.deepEqual(stationBusStops(st.myStations[0]).map((b) => b.n), ['A', 'B', 'C']);
  assert.deepEqual(st.myStations[0].bus, { n: 'A', c: '75111' }, 'le premier reste dans bus (comme avant la v263)');
  assert.deepEqual(stationBusStops(setMyStationBus(st, id, null, 0).myStations[0]).map((b) => b.n), ['B', 'C']);
  assert.deepEqual(stationBusStops(setMyStationBus(st, id, { n: 'E', c: '75113' }, 1).myStations[0]).map((b) => b.n), ['A', 'E', 'C']);
  assert.deepEqual(cleanMyStations([{ id: 'a', station: 'X', moreBus: [{ n: 'B', c: '75111' }] }])[0].bus, { n: 'B', c: '75111' }, 'sans premier arrêt, le suivant monte');
  assert.deepEqual(cleanMyStations([{ id: 'a', station: 'X', bus: { n: 'A', c: '75111' }, moreBus: [{ n: 'A', c: '75111' }, { n: 'B', c: 'x' }] }])[0], { id: 'a', station: 'X', label: 'Ma station', bus: { n: 'A', c: '75111' } });
  // une station avec un seul arrêt s'écrit exactement comme avant (sauvegardes d'avant inchangées)
  const one = addMyStation({ myStations: [] }, 'Opéra', 'Travail');
  assert.deepEqual(Object.keys(setMyStationBus(one, one.myStations[0].id, { n: 'A', c: '75109' }).myStations[0]).sort(), ['bus', 'id', 'label', 'station']);
  // la sauvegarde garde les 3
  const other = mergeImport({ points: [], categories: DEFAULT_CATEGORIES.map((c) => ({ ...c })), lists: [], myStations: [] }, exportJSON({ points: [], categories: DEFAULT_CATEGORIES, lists: [], myStations: st.myStations }), '');
  assert.deepEqual(stationBusStops(other.state.myStations[0]).map((b) => b.n), ['A', 'B', 'C']);
});
