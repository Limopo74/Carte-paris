import { test } from 'node:test';
import assert from 'node:assert/strict';
import { streetDeck, deckDay, slotText, DECK_RADIUS, HOLIDAY_NOTE } from '../js/parcours.js';

// Jeudi 19 novembre 2026, 10 h, place de la République ; vendredi 20 à midi pour « demain »
const now = new Date(2026, 10, 19, 10, 0);
const tomorrow = new Date(2026, 10, 20, 12, 0);
const from = { lat: 48.8676, lng: 2.3636 };
const days = (...on) => [0, 1, 2, 3, 4, 5, 6].map((d) => on.includes(d));
const market = (name, lat, lng, on, week = ['7h', '13h30']) => ({ name, lat, lng, days: on, hours: { week, sat: ['7h', '15h'], sun: ['7h', '15h'] } });
const MARKETS = [
  market('Marché proche', 48.8680, 2.3640, days(4, 6)), // jeudi et samedi
  market('Marché loin', 48.8350, 2.2900, days(4)), // à plus de 2,5 km
  market('Marché du vendredi', 48.8700, 2.3700, days(5)),
  market('Marché fini', 48.8660, 2.3620, days(4), ['7h', '9h']), // fini à 9 h
];
const ev = (title, lat, lng, start, end, extra = {}) => ({ title, lat, lng, slotStart: start, slotEnd: end, ...extra });

test('parcours Dans la rue : aujourd\'hui, du plus proche au plus loin, rien de fini ni de trop loin', () => {
  const events = [ev('Grande brocante du quartier', 48.8690, 2.3660, new Date(2026, 10, 19, 9), new Date(2026, 10, 19, 18))];
  const deck = streetDeck({ markets: MARKETS, events, date: now, now, from });
  assert.deepEqual(deck.map((x) => x.name), ['Marché proche', 'Grande brocante du quartier']);
  assert.equal(deck[0].hours, '7h–13h30');
  assert.equal(deck[0].label, 'Marché');
  assert.equal(deck[1].label, 'Brocante, puces, vide-grenier');
  assert.equal(deck[1].hours, '9h–18h');
  assert.ok(deck.every((x) => x.d <= DECK_RADIUS));
});

test('parcours Dans la rue : demain, les marchés de ce jour-là avec leurs heures, même déjà finis aujourd\'hui', () => {
  const deck = streetDeck({ markets: MARKETS, events: [], date: tomorrow, now, from });
  assert.deepEqual(deck.map((x) => x.name), ['Marché du vendredi']);
  assert.equal(deck[0].hours, '7h–13h30');
});

test('parcours Dans la rue : un jour férié, pas d\'heure pour les marchés', () => {
  const deck = streetDeck({ markets: MARKETS, events: [], date: now, now, from, holiday: 'Fête test' });
  assert.equal(deck[0].hours, '');
  assert.equal(deck[0].holiday, true);
  assert.match(HOLIDAY_NOTE, /^Jour férié/);
});

test('parcours Dans la rue : un événement d\'intérieur ou en double n\'y est pas', () => {
  const s = new Date(2026, 10, 19, 11); const e = new Date(2026, 10, 19, 17);
  const events = [
    ev('Brocante', 48.8690, 2.3660, s, e),
    ev('Brocante', 48.8690, 2.3660, s, e), // le même deux fois
    ev('Concert de piano', 48.8690, 2.3660, s, e), // pas dans la rue
  ];
  assert.equal(streetDeck({ markets: [], events, date: now, now, from }).length, 1);
});

test('parcours : le jour ouvert, aujourd\'hui sauf s\'il ne reste rien', () => {
  assert.equal(deckDay(3, 5), 0);
  assert.equal(deckDay(0, 5), 1);
  assert.equal(deckDay(0, 0), 0);
  assert.equal(slotText({ slotStart: new Date(2026, 10, 19, 14), slotEnd: new Date(2026, 10, 19, 18, 30) }), '14h–18h30');
  assert.equal(slotText({}), '');
});
