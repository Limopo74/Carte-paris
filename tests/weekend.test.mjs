// v546 (mes choix 1B 2C 3A 4A 5A du 28 nov. 2026) : « Ce week-end » dans Sorties.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { weekendDays, weekendShort, mergeWeekend, weekendGroups, weekendWhen, WEEKEND_RUBRIQUES } from '../js/weekend.js';

test('jours du week-end : la semaine, le samedi, le dimanche (mon choix 4A)', () => {
  const mer = weekendDays(new Date(2026, 10, 25, 9)); // mercredi 25 nov.
  assert.deepEqual(mer.map((d) => [d.key, d.label]), [['sam', 'Samedi 28'], ['dim', 'Dimanche 29']]);
  const sam = weekendDays(new Date(2026, 10, 28, 6, 30)); // samedi 28 : aujourd'hui et demain
  assert.deepEqual(sam.map((d) => [d.key, d.date.getDate()]), [['sam', 28], ['dim', 29]]);
  const dim = weekendDays(new Date(2026, 10, 29, 20)); // dimanche : aujourd'hui seulement
  assert.deepEqual(dim.map((d) => [d.key, d.date.getDate()]), [['dim', 29]]);
  assert.equal(weekendShort(mer), 'sam. 28 · dim. 29');
  const ven = weekendDays(new Date(2026, 4, 29, 23)); // vendredi 29 mai : samedi 30, dimanche 31
  assert.deepEqual(ven.map((d) => d.label), ['Samedi 30', 'Dimanche 31']);
  assert.equal(weekendDays(new Date(2026, 9, 30, 12))[1].label, 'Dimanche 1er', 'le 1er du mois');
});

const ev = (title, d, slotStart = null) => ({ title, lat: 48.86, lng: 2.35, d, slotStart });
test('une sortie des deux jours n\'apparaît qu\'une fois, les plus proches d\'abord', () => {
  const m = mergeWeekend([{ key: 'sam', items: [ev('Concert', 900, new Date(2026, 10, 28, 20)), ev('Expo', 300)] },
    { key: 'dim', items: [ev('Expo', 300), ev('Bal', 100, new Date(2026, 10, 29, 15, 30))] }]);
  assert.deepEqual(m.map((x) => [x.e.title, x.days.join('+')]), [['Bal', 'dim'], ['Expo', 'sam+dim'], ['Concert', 'sam']]);
  assert.equal(weekendWhen(m[0]), 'Dim. 15 h 30');
  assert.equal(weekendWhen(m[1]), 'Sam. et dim.');
  assert.equal(weekendWhen(m[1], 'sam'), 'Aujourd\'hui et demain');
  assert.equal(weekendWhen(m[2]), 'Sam. 20 h');
  assert.equal(weekendWhen(m[2], 'sam'), 'Aujourd\'hui 20 h');
  assert.equal(weekendWhen({ days: ['sam'], slot: { sam: new Date(2026, 10, 28, 0, 0) } }), 'Sam.', 'créneau à 0 h : journée entière, pas d\'heure');
});

test('rubriques : ordre fixe, vides masquées, genre inconnu dans « Autres sorties » (mon choix 3A)', () => {
  const m = mergeWeekend([{ key: 'sam', items: [ev('A', 1), ev('B', 2), ev('C', 3), ev('D', 4)] }]);
  const genre = { A: 'musique', B: null, C: 'expo', D: 'marche' }; // « marche » n'est pas une rubrique du week-end : Autres
  const g = weekendGroups(m, (e) => genre[e.title]);
  assert.deepEqual(g.map((x) => [x.id, x.items.map((i) => i.e.title).join('')]), [['expo', 'C'], ['musique', 'A'], ['autre', 'BD']]);
  assert.equal(WEEKEND_RUBRIQUES.length, 10);
  assert.equal(WEEKEND_RUBRIQUES.at(-1)[0], 'autre', 'Autres sorties en dernier');
});

test('l\'écran : bannière en tête de Sorties, point de départ en icône, © sur chaque grande photo', () => {
  const app = readFileSync(new URL('../js/app.js', import.meta.url), 'utf8');
  assert.match(app, /openSheet\(\[\.\.\.title, photoBtn, gear\]\.filter\(Boolean\), el\('div', \{ class: 'stack ev-page' \},\n    weekendHero\(/, 'la bannière avant les onglets (mon choix 1B)');
  const ev = app.slice(app.indexOf('async function openEvents('), app.indexOf('const EV_ROUND'));
  assert.equal(/class: 'ev-from'/.test(ev), false, 'plus de grand bouton « Centre de la carte » en haut de Sorties');
  assert.match(ev, /class: 'btn ev-fromicon'/, 'le point de départ en icône');
  assert.match(app, /class: 'wk-credit'/, 'le © de chaque photo (mon choix 5A)');
});
