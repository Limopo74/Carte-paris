import { test } from 'node:test';
import assert from 'node:assert/strict';
import { parseMarkets, hm, hoursToday, whenToday, marketsOn, nearestMarkets, airUrl, readAir, COVERED_MARKETS } from '../js/markets.js';

const rec = (o) => ({ nom_long: 'Bastille', produit: 'Alimentaire', localisation: 'Bd Richard-Lenoir', lundi: 0, mardi: 0, mercredi: 1, jeudi: 0, vendredi: 0, samedi: 1, dimanche: 0, h_deb_sem_1: '07h00', h_fin_sem_1: '13h30', h_deb_sam: '7:00', h_fin_sam: '14 h 30', geo_point_2d: { lat: 48.859, lon: 2.369 }, ...o });

test('marchés : lecture, jours, horaires du jour', () => {
  const m = parseMarkets([rec({}), rec({ nom_long: 'Marché des Batignolles', geo_point_2d: { lat: 48.88, lon: 2.32 } }), { nom_long: 'Sans pos' }]);
  assert.equal(m.length, 2);
  assert.equal(m[0].name, 'Marché Bastille'); assert.equal(m[1].name, 'Marché des Batignolles');
  const mercredi = new Date(2026, 10, 18, 9); const samedi = new Date(2026, 10, 21, 9); const lundi = new Date(2026, 10, 16, 9);
  assert.equal(hoursToday(m[0], mercredi), '7h–13h30');
  assert.equal(hoursToday(m[0], samedi), '7h–14h30');
  assert.equal(marketsOn(m, lundi).length, 0);
  assert.deepEqual(nearestMarkets(m, { lat: 48.86, lng: 2.37 }, samedi, 1).map((x) => x.name), ['Marché Bastille']);
  assert.equal(hm('25h00'), ''); assert.equal(hm(''), '');
});

test('air : adresse arrondie, niveaux de l\'indice européen', () => {
  assert.match(airUrl(48.8606, 2.3376), /latitude=48\.86&longitude=2\.34/);
  assert.equal(readAir({ current: { european_aqi: 15, pm2_5: 4.2 } }).label, 'Bon');
  assert.equal(readAir({ current: { european_aqi: 45 } }).label, 'Moyen');
  assert.equal(readAir({ current: { european_aqi: 130 } }).level, 'extreme');
  assert.equal(readAir({}), null);
});

test('marchés couverts : 9, dans Paris, fermés le lundi, coupure de midi', () => {
  assert.equal(COVERED_MARKETS.length, 9);
  for (const m of COVERED_MARKETS) {
    assert.ok(m.lat > 48.81 && m.lat < 48.91 && m.lng > 2.25 && m.lng < 2.42, m.name);
    assert.equal(m.days[1], false, `${m.name} : fermé le lundi`);
    assert.ok(m.days[0] && m.days[6], `${m.name} : ouvert le week-end`);
  }
  const beauvau = COVERED_MARKETS.find((m) => /Beauvau/.test(m.name));
  const mardi = (h, mi = 0) => new Date(2026, 10, 17, h, mi);
  assert.equal(hoursToday(beauvau, mardi(9)), '8h–13h, 16h–19h30');
  assert.deepEqual(whenToday(beauvau, mardi(7)), { when: 'later', text: 'À 8h' });
  assert.deepEqual(whenToday(beauvau, mardi(10)), { when: 'now', text: 'Jusqu\'à 13h' });
  assert.deepEqual(whenToday(beauvau, mardi(14)), { when: 'later', text: 'Rouvre à 16h' });
  assert.deepEqual(whenToday(beauvau, mardi(20)), { when: 'done', text: '' });
  assert.equal(marketsOn(COVERED_MARKETS, new Date(2026, 10, 16, 10)).length, 0, 'lundi : aucun');
  assert.equal(marketsOn(COVERED_MARKETS, new Date(2026, 10, 22, 10)).length, 9, 'dimanche : tous');
});

test('marché découvert : même lecture qu\'avant (« À 7h », « Jusqu\'à 13h30 »)', () => {
  const [m] = parseMarkets([rec({})]);
  const mercredi = (h) => new Date(2026, 10, 18, h);
  assert.deepEqual(whenToday(m, mercredi(6)), { when: 'later', text: 'À 7h' });
  assert.deepEqual(whenToday(m, mercredi(9)), { when: 'now', text: 'Jusqu\'à 13h30' });
  assert.deepEqual(whenToday(m, mercredi(15)), { when: 'done', text: '' });
});
