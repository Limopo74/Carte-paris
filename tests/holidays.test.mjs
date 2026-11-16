import { test } from 'node:test';
import assert from 'node:assert/strict';
import { easter, holidays, holidayOn } from '../js/holidays.js';
import { openState } from '../js/hours.js';

test('Pâques et jours fériés', () => {
  assert.equal(easter(2026).toDateString(), new Date(2026, 3, 5).toDateString());
  assert.equal(easter(2027).toDateString(), new Date(2027, 2, 28).toDateString());
  const h = holidays(2026);
  assert.equal(h.size, 11);
  assert.equal(h.get('2026-04-06'), 'Lundi de Pâques');
  assert.equal(h.get('2026-05-14'), 'Ascension');
  assert.equal(h.get('2026-05-25'), 'Lundi de Pentecôte');
  assert.equal(holidayOn(new Date(2026, 10, 11, 10)), 'Armistice');
  assert.equal(holidayOn(new Date(2026, 10, 16, 10)), null);
});

test('horaires : « PH off » et « Mo-Fr,PH »', () => {
  const noel = new Date(2026, 11, 25, 11, 0); // un vendredi férié
  const vendredi = new Date(2026, 11, 18, 11, 0);
  assert.equal(openState('Mo-Fr 09:00-18:00; PH off', vendredi).open, true);
  assert.equal(openState('Mo-Fr 09:00-18:00; PH off', noel).open, false);
  assert.equal(openState('Mo-Fr 09:00-18:00', noel).open, true); // sans « PH » : on ne devine pas
  assert.equal(openState('Mo-Fr 14:00-18:00; Sa,PH 10:00-12:00', noel).open, true);
  assert.equal(openState('Mo-Fr 09:00-18:00; PH 10:00-11:00', noel).open, false);
});
