import test from 'node:test';
import assert from 'node:assert/strict';
import { closedOnArrival, minutesLeft, ARRIVAL_MARGIN } from '../js/hours.js';

test('closedOnArrival : la marche dépasse le temps qui reste avant la fermeture', () => {
  const h = 'Mo-Su 10:00-18:00';
  const at = new Date(2026, 10, 18, 17, 30); // mercredi, 30 min avant la fermeture
  assert.equal(minutesLeft(h, at), 30);
  assert.equal(ARRIVAL_MARGIN, 5);
  assert.equal(closedOnArrival(h, 20, at), false, '20 min de marche + 5 de marge : on arrive avant');
  assert.equal(closedOnArrival(h, 25, at), false, 'pile à la limite : encore bon');
  assert.equal(closedOnArrival(h, 26, at), true);
  assert.equal(closedOnArrival(h, 70, new Date(2026, 10, 18, 17, 0)), true, 'aussi au-delà des 45 min de « Ferme dans »');
  assert.equal(closedOnArrival(h, null, at), false, 'sans point de départ : rien');
  assert.equal(closedOnArrival('', 40, at), false, 'sans horaires : rien');
  assert.equal(closedOnArrival(h, 40, new Date(2026, 10, 18, 19, 0)), false, 'déjà fermé : le tampon Fermé suffit');
  assert.equal(closedOnArrival(h, 40, new Date(2026, 10, 18, 9, 0)), false, 'pas encore ouvert : « Ouvre à »');
});
