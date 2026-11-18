import { test } from 'node:test';
import assert from 'node:assert/strict';
import { nowNearEvent, parseEvents } from '../js/events.js';
import { freeDayNear } from '../js/art.js';

// v187 : « Gratuit · 5 min » et « Gratuit aujourd'hui » dans le bandeau « Maintenant »
const here = { lat: 48.8600, lng: 2.3500 };
const now = new Date(2026, 10, 18, 15, 0); // mercredi 18 nov. 2026, 15 h
const at = (h, m = 0) => new Date(2026, 10, 18, h, m);
const ev = (o) => ({ title: 'Concert', lat: 48.8605, lng: 2.3500, place: 'Salle des fêtes de la mairie', freeSure: true, booking: 'none',
  slots: [{ start: at(15, 20), end: at(17) }], ...o });

test('parseEvents : « gratuit sous condition » n\'est pas sûr', () => {
  const row = (price) => ({ title: 'X', lat_lon: { lat: 48.86, lon: 2.35 }, price_type: price, access_type: 'non' });
  const [a, b, c] = parseEvents([row('gratuit'), row('gratuit sous condition'), row('payant')]);
  assert.deepEqual([a.free, a.freeSure], [true, true]);
  assert.deepEqual([b.free, b.freeSure], [true, false]);
  assert.deepEqual([c.free, c.freeSure], [false, false]);
  assert.equal(a.booking, 'none');
});

test('nowNearEvent : une sortie gratuite en salle, proche, qui commence dans la demi-heure', () => {
  const e = nowNearEvent([ev()], here, now, 400);
  assert.equal(e?.title, 'Concert');
  assert.equal(e.street, false);
  assert.ok(e.d < 100);
});

test('nowNearEvent : rien dans le doute', () => {
  assert.equal(nowNearEvent([ev({ freeSure: false })], here, now), null, 'gratuit sous condition ou payant');
  assert.equal(nowNearEvent([ev({ booking: 'required' })], here, now), null, 'réservation obligatoire');
  assert.equal(nowNearEvent([ev({ booking: '' })], here, now), null, 'réservation inconnue');
  assert.equal(nowNearEvent([ev({ slots: [{ start: at(16), end: at(17) }] })], here, now), null, 'commence dans plus de 30 min');
  assert.equal(nowNearEvent([ev({ slots: [{ start: at(13), end: at(15, 10) }] })], here, now), null, 'finit dans 10 min');
  assert.equal(nowNearEvent([ev({ slots: null })], here, now), null, 'sans créneau publié');
  assert.equal(nowNearEvent([ev({ lat: 48.8700 })], here, now, 400), null, 'trop loin');
  assert.equal(nowNearEvent([ev()], null, now), null, 'sans position');
});

test('nowNearEvent : réservation conseillée acceptée, en cours accepté', () => {
  assert.equal(nowNearEvent([ev({ booking: 'advised' })], here, now)?.booking, 'advised');
  assert.ok(nowNearEvent([ev({ slots: [{ start: at(14), end: at(18) }] })], here, now));
});

test('nowNearEvent : la rue comme avant (payante ou non), la plus proche gagne', () => {
  const rue = ev({ title: 'Vide-grenier de la rue Mouffetard', place: 'Rue Mouffetard', freeSure: false, booking: '', lat: 48.8602 });
  const e = nowNearEvent([ev(), rue], here, now);
  assert.equal(e.title, 'Vide-grenier de la rue Mouffetard');
  assert.equal(e.street, true);
});

test('freeDayNear : seulement un jour gratuit, jamais les musées de la Ville', () => {
  const louvre = { lat: 48.8606, lng: 2.3376 };
  assert.equal(freeDayNear(louvre, new Date(2026, 10, 18, 15)), null, 'mercredi ordinaire : Petit Palais & co. ne comptent pas');
  const v = freeDayNear(louvre, new Date(2026, 11, 4, 17), 1200); // vendredi 4 déc. 2026, 1er vendredi
  assert.equal(v?.name, 'Musée du Louvre');
  assert.equal(freeDayNear(louvre, new Date(2026, 11, 4, 21, 30), 1200), null, 'déjà fermé à 21 h 30');
  assert.equal(freeDayNear({ lat: 48.80, lng: 2.20 }, new Date(2026, 11, 4, 17), 1200), null, 'trop loin');
  assert.equal(freeDayNear(null, new Date(2026, 11, 4, 17)), null);
});

test('freeDayNear : un lieu ouvert passe avant un lieu aux horaires inconnus', () => {
  // dimanche 6 déc. 2026, 1er dimanche d'hiver : Hôtel de la Marine (horaires inconnus) est plus près de la Concorde que l'Orangerie
  const concorde = { lat: 48.8670, lng: 2.3228 };
  assert.equal(freeDayNear(concorde, new Date(2026, 11, 6, 11), 1200)?.name, 'Musée de l\'Orangerie');
});
