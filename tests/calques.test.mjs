// Calques Vélib' et Fontaines et WC (v150) : tout ce qui est dans la zone de la carte, sans nombre faux.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { inBox, hourText, layerNote, velibOld, LAYER_ZOOM, LAYER_MAX, VELIB_OLD_MS } from '../js/calques.js';
import { parseVelibParis, mergeVelib, velibState, velibCount, nearestVelib, VELIB_PARIS, VELIB_SILENT_MS } from '../js/explore.js';
import { FILTER_KEYS, cleanFilterKeys } from '../js/store.js';

const NOW = Date.parse('2026-11-17T18:20:00Z'); // 19h20 à Paris
const src = (f) => readFileSync(new URL(`../${f}`, import.meta.url), 'utf8');

test('calque : seulement les points dans la zone, avec un plafond', () => {
  const box = { s: 48.85, n: 48.87, w: 2.33, e: 2.36 };
  const pts = [{ lat: 48.86, lng: 2.34 }, { lat: 48.80, lng: 2.34 }, { lat: 48.86, lng: 2.40 }, { lat: 48.865, lng: 2.35 }];
  assert.deepEqual(inBox(pts, box), [pts[0], pts[3]]);
  assert.equal(inBox(pts, box, 1).length, 1);
  assert.deepEqual(inBox(null, box), []);
  assert.equal(inBox(Array.from({ length: 1000 }, () => ({ lat: 48.86, lng: 2.34 })), box).length, LAYER_MAX);
});

test('heure de Paris à la façon de l\'appli', () => {
  assert.equal(hourText(NOW), '19h20');
  assert.equal(hourText(Date.parse('2026-11-17T08:05:00Z')), '9h05');
});

test('Vélib\' : la date de chaque station est lue (Paris Data et flux Smovengo)', () => {
  assert.match(VELIB_PARIS, /is_returning/);
  assert.match(VELIB_PARIS, /duedate/);
  const [a] = parseVelibParis([{ stationcode: '1', name: 'A', numbikesavailable: 3, numdocksavailable: 2, is_renting: 'OUI', is_returning: 'NON', duedate: '2026-11-17T18:15:29+00:00', coordonnees_geo: { lat: 48.86, lon: 2.34 } }]);
  assert.equal(a.seen, Date.parse('2026-11-17T18:15:29Z'));
  assert.equal(a.ret, false);
  const [b] = mergeVelib({ data: { stations: [{ station_id: 1, name: 'B', lat: 48.86, lon: 2.34 }] } }, { data: { stations: [{ station_id: 1, num_bikes_available: 1, is_renting: 1, is_returning: 0, last_reported: 1794939000 }] } });
  assert.equal(b.seen, 1794939000 * 1000);
  assert.equal(b.ret, false);
});

test('Vélib\' : une station muette depuis plus d\'une heure n\'a pas de nombre et n\'est jamais proposée', () => {
  const here = { lat: 48.86, lng: 2.34 };
  const muette = { id: 'm', name: 'Chemin Vert', lat: 48.8601, lng: 2.3401, bikes: 12, mech: 12, ebike: 0, docks: 31, open: true, ret: true, seen: NOW - VELIB_SILENT_MS - 1000 };
  const ok = { id: 'o', name: 'Loin', lat: 48.87, lng: 2.35, bikes: 2, mech: 1, ebike: 1, docks: 5, open: true, ret: true, seen: NOW - 60e3 };
  assert.equal(velibState(muette, NOW), 'silent');
  assert.equal(velibCount(muette, 'bike', NOW), null);
  assert.equal(velibState(ok, NOW), 'ok');
  assert.deepEqual(nearestVelib([muette, ok], here, 'bike', 3, NOW).map((s) => s.id), ['o']);
  assert.equal(velibCount({ ...ok, seen: null }, 'bike', NOW), 2); // sans date : on garde le nombre (flux sans heure)
});

test('Vélib\' : prêt fermé = 0 vélo, retour fermé = 0 place, fermée des deux côtés = closed', () => {
  const s = { bikes: 4, docks: 6, open: false, ret: true, seen: NOW };
  assert.equal(velibCount(s, 'bike', NOW), 0);
  assert.equal(velibCount(s, 'dock', NOW), 6);
  assert.equal(velibCount({ ...s, open: true, ret: false }, 'dock', NOW), 0);
  assert.equal(velibState({ ...s, ret: false }, NOW), 'closed');
});

test('étiquette : zoomer, heure, trop ancien, rien quand tout est éteint', () => {
  assert.equal(layerNote({}), null);
  assert.deepEqual(layerNote({ velib: true, zoom: 13, now: NOW }), { text: 'Zoome pour voir les stations Vélib\'', act: 'zoom' });
  assert.equal(layerNote({ pratique: true, zoom: 14 }).text, 'Zoome pour voir les fontaines et toilettes');
  assert.equal(layerNote({ velib: true, pratique: true, zoom: 12 }).text, 'Zoome pour voir les Vélib\', fontaines et toilettes');
  assert.equal(layerNote({ pratique: true, zoom: LAYER_ZOOM }), null);
  assert.deepEqual(layerNote({ velib: true, zoom: 16, at: NOW - 60e3, now: NOW }), { text: 'Vélib\' (vélos) à 19h19 · Mettre à jour', act: 'refresh' });
  assert.equal(layerNote({ velib: true, zoom: 16, at: NOW - 60e3, now: NOW, need: 'dock' }).text, 'Vélib\' (places) à 19h19 · Mettre à jour');
  assert.match(layerNote({ velib: true, zoom: 16, at: NOW - VELIB_OLD_MS - 1, now: NOW }).text, /trop ancien/);
  assert.deepEqual(layerNote({ velib: true, zoom: 16, busy: true }), { text: 'Vélib\' : chargement…', act: null });
  assert.equal(layerNote({ velib: true, zoom: 16, at: 0 }).act, 'refresh');
  assert.equal(velibOld(NOW - VELIB_OLD_MS + 1000, NOW), false);
  assert.equal(velibOld(0, NOW), true);
});

test('calques : clés de filtres, réglage gardé, service worker, aucune position envoyée', () => {
  assert.ok(FILTER_KEYS.includes('velib') && FILTER_KEYS.includes('pratique'));
  assert.deepEqual(cleanFilterKeys(['pratique', 'x']), ['pratique']);
  const store = src('js/store.js');
  assert.equal((store.match(/showPratique/g) ?? []).length >= 5, true);
  assert.doesNotMatch(store, /showVelib/); // Vélib' : le temps de la session seulement
  const sw = src('sw.js');
  assert.match(sw, /'js\/calques\.js'/);
  assert.match(sw, /'js\/bus\.js'/);
  assert.doesNotMatch(src('js/calques.js'), /fetch\(|getCurrentPosition|watchPosition/);
});

test('feuille Filtres : chaque ligne qu\'on peut masquer est une clé gardée (v209)', () => {
  const app = src('js/app.js');
  const choice = app.slice(app.indexOf('function openFilterChoice'), app.indexOf('/** Ajoute ou retire une catégorie du filtre du haut. */'));
  const rows = [...choice.match(/const rows = (\[\[.*\]\]);/)[1].matchAll(/\['([a-z]+)', '/g)].map((m) => m[1]);
  assert.ok(rows.length >= 13);
  for (const k of rows) assert.ok(FILTER_KEYS.includes(k), `ligne « ${k} » proposée mais pas gardée`);
  const kept = [...app.matchAll(/keep\('([a-z]+)'/g)].map((m) => m[1]);
  for (const k of kept) assert.ok(FILTER_KEYS.includes(k), `ligne « ${k} » de Filtres pas gardée`);
  assert.deepEqual(cleanFilterKeys(['seen', 'x']), ['seen']);
});

test('Filtres affichés : chaque ligne de Filtres peut s\'y masquer (v267 : Pistes à vélo manquait)', () => {
  const app = src('js/app.js');
  const choice = app.slice(app.indexOf('function openFilterChoice'), app.indexOf('/** Ajoute ou retire une catégorie du filtre du haut. */'));
  const rows = new Set([...choice.match(/const rows = (\[\[.*\]\]);/)[1].matchAll(/\['([a-z]+)', '/g)].map((m) => m[1]));
  const filters = app.slice(app.indexOf('function openFilters()'), app.indexOf('function openListPlaces'));
  const kept = new Set([...filters.matchAll(/keep\('([a-z]+)'/g)].map((m) => m[1]));
  for (const k of kept) assert.ok(rows.has(k), `ligne « ${k} » de Filtres absente de « Filtres affichés »`);
});

test('étiquette d\'un calque : passe par typo() (« 11 h 09 », pas « 11h09 »)', async () => {
  const { readFileSync } = await import('node:fs');
  const app = readFileSync(new URL('../js/app.js', import.meta.url), 'utf8');
  const line = app.split('\n').find((l) => l.includes('fill(layerNoteBtn'));
  assert.match(line, /typo\(n\.text\)/);
});
