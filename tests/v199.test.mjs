import test from 'node:test';
import assert from 'node:assert/strict';
import { cleanAcces, exitFor, ACCESS_NEAR_STATION } from '../js/acces.js';
import { nextFreeFor, freePlaceFor } from '../js/art.js';
import { cleanPlans } from '../js/planning.js';

test('la sortie de métro la plus proche du lieu, parmi celles de la station', () => {
  const acces = cleanAcces({ items: [
    { n: 'bd de Clichy', s: '1', lat: 48.88367, lng: 2.33288 },          // Blanche (référentiel IDFM)
    { n: 'rue Lepic', s: 2, lat: 48.8840, lng: 2.3335 },                  // numéro en nombre : accepté
    { n: 'pl. Pigalle', s: '1', lat: 48.8820, lng: 2.3375 },              // Pigalle, trop loin de Blanche
    { n: '', s: '3', lat: 48.8837, lng: 2.3329 }, { n: 'x', s: '', lat: 48.8837, lng: 2.3329 }, { n: 'y', s: '4' }] });
  assert.equal(acces.length, 3);
  const blanche = { lat: 48.88383, lng: 2.33251 };
  const place = { lat: 48.8812, lng: 2.3361 };
  const ex = exitFor(acces, blanche, place);
  assert.equal(ex.label, 'Sortie 1, bd de Clichy');
  assert.ok(ex.d > 300 && ex.d < 450, String(ex.d));
  assert.equal(exitFor([], blanche, place), null, 'fichier pas encore arrivé');
  assert.equal(exitFor(acces, { lat: 48.87, lng: 2.30 }, place), null, `rien à moins de ${ACCESS_NEAR_STATION} m de la station`);
});

test('« Gratuit ici … » au moment de Prévoir', () => {
  const orsay = { lat: 48.8601, lng: 2.3265 };
  assert.equal(freePlaceFor(orsay).name, 'Musée d\'Orsay');
  const n = nextFreeFor(orsay, new Date(2026, 10, 18));
  assert.equal(n.k, 18); assert.equal(n.date.getDate(), 6); assert.equal(n.date.getMonth(), 11);
  assert.match(n.when, /1er dimanche du mois · réservation obligatoire/);
  assert.equal(nextFreeFor(orsay, new Date(2026, 11, 6)).k, 0, 'aujourd\'hui');
  assert.equal(freePlaceFor({ lat: 48.8813, lng: 2.3335 }), null, 'musée de la Ville : gratuit toute l\'année, pas de ligne');
  assert.equal(nextFreeFor({ lat: 48.87, lng: 2.30 }), null);
  assert.equal(nextFreeFor({ lat: 48.8606, lng: 2.3376 }, new Date(2026, 6, 10)), null, 'Louvre : pas de 1er vendredi soir en juillet ni en août, rien dans les 35 jours');
  assert.equal(nextFreeFor({ lat: 48.8606, lng: 2.3376 }, new Date(2026, 10, 18)).date.getDate(), 4, 'vendredi 4 décembre');
});

test('une expo prévue garde sa date de fin et « pas allé »', () => {
  const now = new Date(2026, 10, 18).getTime();
  const [p] = cleanPlans([{ id: 'a1', name: 'Expo', lat: 48.86, lng: 2.35, plan: true, until: now + 5 * 864e5, missed: true, ticket: { at: now - 864e5 } }], now);
  assert.equal(p.until, now + 5 * 864e5); assert.equal(p.missed, true);
  const [q] = cleanPlans([{ id: 'a2', name: 'Expo', lat: 48.86, lng: 2.35, plan: true, until: 'demain', missed: 'oui', ticket: { at: now } }], now);
  assert.equal('until' in q, false); assert.equal('missed' in q, false);
});
