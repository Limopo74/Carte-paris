import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { BAGUETTES, BAGUETTES_CHECKED_ON, prizeText, prizedNear } from '../js/baguettes.js';
import { arrAt } from '../js/explore.js';
import { distanceM } from '../js/geo.js';

// v265 : boulangeries primées (mes choix du 20 nov. 2026 : bas d'Autour de moi, 10 premiers sur 3 ans, croissant ajouté).
const arr = JSON.parse(readFileSync(new URL('../data/arrondissements.json', import.meta.url)));

test('chaque boulangerie tombe dans l\'arrondissement de son adresse (positions de l\'IGN bien recopiées)', () => {
  for (const s of BAGUETTES) {
    const n = Number(/\((\d+)e\)$/.exec(s.address)?.[1]);
    assert.ok(n >= 1 && n <= 20, `arrondissement lisible : ${s.address}`);
    assert.equal(arrAt(s.lat, s.lng, arr), n, `${s.name}, ${s.address}`);
  }
});

test('palmarès : 10 rangs par an, sauf ce qui n\'a pas pu être placé ou vérifié', () => {
  const count = (k, y) => BAGUETTES.flatMap((s) => s[k].filter(([yy]) => yy === y).map(([, r]) => r)).sort((a, b) => a - b);
  assert.deepEqual(count('b', 2026), [1, 2, 3, 4, 5, 6, 7, 8, 9, 10]);
  assert.deepEqual(count('b', 2025), [1, 2, 3, 4, 5, 7, 8, 9, 10], '6e (Graine, 74 av. Gambetta) : numéro absent de la base des adresses, pas deviné');
  assert.deepEqual(count('b', 2024), [1, 2, 3, 4, 5, 6, 7, 8, 9, 10]);
  assert.deepEqual(count('c', 2026), [1], 'croissant 2026 : seule la gagnante est sûre');
  assert.deepEqual(count('c', 2025), [2, 3, 4, 5, 6, 7, 9], 'croissant 2025 : seulement les adresses de Paris');
  assert.deepEqual(count('c', 2024), [1, 2, 3, 5, 7, 8, 10], 'croissant 2024 : seulement les adresses de Paris');
  assert.equal(new Set(BAGUETTES.map((s) => s.address)).size, BAGUETTES.length, 'une adresse, une ligne (un prix vaut pour l\'adresse, pas pour l\'enseigne)');
  assert.match(BAGUETTES_CHECKED_ON, /^\d{4}-\d{2}-\d{2}$/);
});

test('le texte des prix : le plus récent d\'abord, 1re pour la gagnante, espaces insécables', () => {
  const g = BAGUETTES.find((s) => s.address.startsWith('16, rue des Fossés'));
  assert.equal(prizeText(g), 'Baguette : 8e en 2026 · Croissant : 4e en 2025, 7e en 2024');
  assert.equal(prizeText(BAGUETTES.find((s) => s.name === 'Le Fournil Didot')), 'Baguette : 1re en 2026');
  assert.equal(prizeText(BAGUETTES.find((s) => s.name === 'Boulangerie du Sentier')), 'Croissant : 1re en 2026');
});

test('autour de moi : les plus proches d\'abord, rien loin de Paris ni sans position', () => {
  const pantheon = { lat: 48.8462, lng: 2.3464 };
  const near = prizedNear(pantheon, 1000, distanceM);
  assert.deepEqual(near.map((t) => t.x.name), ['Boulangerie Moderne Rabineau', 'Boulangerie Guyot Ferreira', 'Maison Doré']);
  assert.ok(near.every((t, i) => i === 0 || near[i - 1].d <= t.d));
  assert.deepEqual(prizedNear({ lat: 45.9, lng: 6.12 }, 1000, distanceM), [], 'à 385 km : rien');
  assert.deepEqual(prizedNear(null, 1000, distanceM), []);
  assert.deepEqual(prizedNear(pantheon, 0, distanceM), []);
});

test('l\'appli : le bloc n\'apparaît que s\'il y a une boulangerie à la distance, après tout le reste d\'Autour de moi', () => {
  const app = readFileSync(new URL('../js/app.js', import.meta.url), 'utf8');
  const i = app.indexOf('const prized = prizedNear(origin, maxRing, distanceM);');
  assert.ok(i > 0);
  assert.ok(app.indexOf('if (state.showTtb && ttbList().length) {') < i, 'après le bloc TTB : ne le pousse pas');
  assert.ok(i < app.indexOf("openSheet([ico('map-pinned'), ' ', ...withGear(nearTitle()"));
  assert.match(app.slice(i, i + 400), /if \(prized\.length\)/);
});
