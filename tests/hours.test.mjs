import { test } from 'node:test';
import assert from 'node:assert/strict';
import { openState } from '../js/hours.js';

// 17 novembre 2026 = mardi
const at = (d, h, m = 0) => new Date(2026, 10, d, h, m);

test('24/7', () => {
  assert.deepEqual(openState('24/7', at(17, 3)), { open: true, until: null });
});

test('jours et heures simples', () => {
  const h = 'Mo-Fr 09:00-19:00; Sa 10:00-18:00; Su off';
  assert.deepEqual(openState(h, at(17, 10)), { open: true, until: '19:00' });
  assert.deepEqual(openState(h, at(17, 8, 30)), { open: false, opensAt: '09:00' });
  assert.deepEqual(openState(h, at(17, 20)), { open: false, opensAt: null });
  assert.deepEqual(openState(h, at(22, 12)), { open: false, opensAt: null }); // dimanche
  assert.deepEqual(openState(h, at(21, 17, 59)), { open: true, until: '18:00' }); // samedi
});

test('coupure à midi et soir', () => {
  const h = 'Tu-Sa 12:00-14:30,19:00-22:30';
  assert.deepEqual(openState(h, at(17, 15)), { open: false, opensAt: '19:00' });
  assert.deepEqual(openState(h, at(17, 21)), { open: true, until: '22:30' });
  assert.deepEqual(openState(h, at(16, 13)), { open: false, opensAt: null }); // lundi : pas de règle
});

test('ouvert après minuit', () => {
  const h = 'Mo-Su 18:00-02:00';
  assert.deepEqual(openState(h, at(17, 23)), { open: true, until: '02:00' });
  assert.deepEqual(openState(h, at(17, 1)), { open: true, until: '02:00' }); // la nuit de lundi
  assert.deepEqual(openState(h, at(17, 3)), { open: false, opensAt: '18:00' });
});

test('liste de jours et règle qui remplace', () => {
  const h = 'Mo,We,Fr 10:00-12:00; We off';
  assert.deepEqual(openState(h, at(18, 11)), { open: false, opensAt: null }); // mercredi
  assert.deepEqual(openState(h, at(20, 11)), { open: true, until: '12:00' }); // vendredi
});

test('jusqu\'à 24:00 et règle sans jour', () => {
  assert.deepEqual(openState('08:00-24:00', at(17, 23)), { open: true, until: '24:00' });
  assert.deepEqual(openState('Mo-Su 00:00-24:00', at(17, 23)), { open: true, until: null });
});

test('formats non gérés : inconnu plutôt que faux', () => {
  assert.equal(openState('Jan-Mar Mo-Fr 09:00-17:00', at(17, 10)), null);
  assert.equal(openState('sunrise-sunset', at(17, 10)), null);
  assert.equal(openState('', at(17, 10)), null);
  assert.equal(openState(undefined, at(17, 10)), null);
  assert.equal(openState('Mo-Fr 09:00-19:00 "sur rendez-vous"', at(17, 10)), null);
});

test('jours fériés ignorés (PH)', () => {
  assert.deepEqual(openState('Mo-Sa 09:00-19:00; PH off', at(17, 10)), { open: true, until: '19:00' });
});

test('fermé ce soir ou fermé toute la journée', async () => {
  const { opensThatDay } = await import('../js/hours.js');
  const sq = 'Mo-Fr 08:00-17:00; Sa,Su off';
  assert.equal(opensThatDay(sq, new Date(2026, 10, 16, 23, 0)), true, 'lundi : a ouvert plus tôt → « Fermé »');
  assert.equal(opensThatDay(sq, new Date(2026, 10, 15, 12, 0)), false, 'dimanche : « Fermé aujourd\'hui »');
  assert.equal(opensThatDay('', new Date()), null);
});
