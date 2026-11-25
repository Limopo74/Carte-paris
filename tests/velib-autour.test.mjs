// v514 (mes choix 1A 2A du 25 nov. 2026) : Vélib' les plus proches, tout en bas d'Autour de moi.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { nearestVelib } from '../js/explore.js';

const app = readFileSync(new URL('../js/app.js', import.meta.url), 'utf8');
const block = () => app.slice(app.indexOf('const bikes = fresh ? nearestVelib('), app.indexOf("openSheet([ico('map-pinned'), ' ', ...withGear(nearTitle()"));

test('Vélib\' d\'Autour de moi : tout en bas, après les commissariats', () => {
  const at = app.indexOf('const bikes = fresh ? nearestVelib(');
  assert.ok(at > 0, 'le bloc existe');
  assert.ok(at > app.indexOf('const police = commissariatsNear('), 'après les commissariats');
  assert.ok(at < app.indexOf("openSheet([ico('map-pinned'), ' ', ...withGear(nearTitle()"), 'avant l\'ouverture de la page');
});

test('Vélib\' d\'Autour de moi : nombres de moins de 10 min seulement, dans le plus grand cercle, avec l\'heure', () => {
  assert.match(app, /const fresh = velibAll && !velibOld\(velibAt\);/);
  const b = block();
  assert.match(b, /\.filter\(\(s\) => s\.d <= maxRing\)/);
  assert.match(b, /reçu à \$\{hourText\(velibAt\)\}/);
  assert.match(b, /'Y aller'/);
});

test('Vélib\' d\'Autour de moi : chargement sans bloquer, pas de nouvel essai avant 2 min après un échec', () => {
  const f = app.slice(app.indexOf('async function nearVelibLoad()'), app.indexOf("/* ---------- Calques Vélib' et Fontaines et WC"));
  assert.match(f, /Date\.now\(\) - nearVelibFail < VELIB_RECHECK_MS/);
  assert.match(f, /if \(view === 'near'\)/);
  assert.doesNotMatch(f, /toast\(/, 'un échec ne dit rien');
});

test('Vélib\' d\'Autour de moi : une station muette depuis plus d\'une heure n\'est jamais proposée', () => {
  const now = Date.now();
  const here = { lat: 48.88, lng: 2.33 };
  const st = [
    { id: 'a', name: 'Muette', lat: 48.8801, lng: 2.3301, open: true, ret: true, bikes: 5, mech: 3, ebike: 2, docks: 4, seen: now - 2 * 3600e3 },
    { id: 'b', name: 'Vivante', lat: 48.881, lng: 2.331, open: true, ret: true, bikes: 2, mech: 1, ebike: 1, docks: 4, seen: now - 60e3 },
    { id: 'c', name: 'Vide', lat: 48.8802, lng: 2.3302, open: true, ret: true, bikes: 0, mech: 0, ebike: 0, docks: 9, seen: now - 60e3 },
  ];
  assert.deepEqual(nearestVelib(st, here, 'bike', 3, now).map((s) => s.name), ['Vivante']);
});

test('Métros les plus proches : tout en bas, sous Vélib\', 3 au plus, dans le plus grand cercle, pas depuis une station', () => {
  const at = app.indexOf("const metros = origin.kind === 'station' ? [] : nearestStations(stations, origin, 3).filter((x) => x.d <= maxRing);");
  assert.ok(at > app.indexOf('const bikes = fresh ? nearestVelib('), 'sous Vélib\'');
  assert.ok(at < app.indexOf("openSheet([ico('map-pinned'), ' ', ...withGear(nearTitle()"), 'avant l\'ouverture de la page');
});
