// v244 : horaires notés à la main (page Horaires d'un lieu).
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { openState, opensThatDay, closedDaysText, simpleHours, writeHours } from '../js/hours.js';

test('writeHours regroupe les jours qui se suivent et marque les jours fériés inconnus', () => {
  assert.equal(writeHours({ days: ['Tu', 'We', 'Th', 'Fr', 'Sa', 'Su'], open: 600, close: 1080 }), 'Tu-Su 10:00-18:00; PH unknown');
  assert.equal(writeHours({ days: ['Su', 'Mo', 'Sa'], open: 570, close: 1440, pause: [750, 840] }), 'Mo,Sa-Su 09:30-12:30,14:00-24:00; PH unknown');
  assert.equal(writeHours({ days: [], open: 600, close: 1080 }), '');
});

test('simpleHours relit ce que writeHours écrit, et refuse des heures qui changent selon le jour', () => {
  for (const v of [{ days: ['Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa'], open: 600, close: 1140, pause: null },
    { days: ['We', 'Su'], open: 570, close: 1440, pause: [750, 840] },
    { days: ['Fr', 'Sa'], open: 1200, close: 120, pause: null }]) {
    assert.deepEqual(simpleHours(writeHours(v)), v);
  }
  assert.equal(simpleHours('Mo-Fr 09:00-18:00; Sa 10:00-17:00'), null);
  assert.equal(simpleHours(''), null);
  assert.equal(simpleHours('n importe quoi'), null);
});

test('un jour férié, des horaires notés à la main ne disent ni ouvert ni fermé', () => {
  const h = writeHours({ days: ['Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa', 'Su'], open: 600, close: 1080 });
  assert.equal(openState(h, new Date(2026, 11, 25, 12)), null); // Noël
  assert.equal(opensThatDay(h, new Date(2026, 11, 25, 12)), null);
  assert.deepEqual(openState(h, new Date(2026, 11, 24, 12)), { open: true, until: '18:00' });
  assert.equal(closedDaysText(writeHours({ days: ['Tu', 'We', 'Th', 'Fr', 'Sa', 'Su'], open: 600, close: 1080 })), 'Fermé le lundi');
});

test('la fiche ouvre la page Horaires, qui garde « Annuler | Enregistrer » en bas', () => {
  const app = readFileSync(new URL('../js/app.js', import.meta.url), 'utf8');
  assert.match(app, /row\('clock', 'Horaires', [^\n]*openHours\(p, back\)/);
  const page = app.slice(app.indexOf('function openHours('), app.indexOf('name: `hours:${p.id}`'));
  assert.match(page, /foot\(err, el\('div', \{ class: 'row' \}/);
  assert.match(page, /'Annuler'[\s\S]*'Enregistrer'/);
  assert.match(page, /Un jour férié, la fiche ne dira ni ouvert ni fermé/);
});
