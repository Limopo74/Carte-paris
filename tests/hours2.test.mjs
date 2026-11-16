import { test } from 'node:test';
import assert from 'node:assert/strict';
import { minutesLeft, closedDaysText } from '../js/hours.js';

test('minutesLeft : minutes avant la fermeture', () => {
  const d = new Date(2026, 10, 17, 17, 20); // mardi 17 nov. 17h20
  assert.equal(minutesLeft('Tu-Su 10:00-18:00', d), 40);
  assert.equal(minutesLeft('Tu-Su 10:00-18:00', new Date(2026, 10, 16, 17, 20)), null, 'fermé le lundi');
  assert.equal(minutesLeft('Mo-Su 18:00-02:00', new Date(2026, 10, 17, 23, 0)), 180, 'après minuit');
  assert.equal(minutesLeft('', d), null);
});

test('closedDaysText : jours de fermeture', () => {
  assert.equal(closedDaysText('Tu-Su 10:00-18:00'), 'Fermé le lundi');
  assert.equal(closedDaysText('Tu-Sa 11:00-19:00'), 'Fermé le lundi et le dimanche');
  assert.equal(closedDaysText('Mo-Su 09:00-18:00'), '');
  assert.equal(closedDaysText('n\'importe quoi'), '');
  assert.equal(closedDaysText('We-Sa 14:00-19:00'), 'Fermé le lundi, le mardi et le dimanche');
});
