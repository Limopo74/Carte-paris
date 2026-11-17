// v140 : jamais « en cours aujourd'hui » sans créneau connu (signalé le 17 nov. 2026 : une manifestation du dimanche
// affichée « en cours aujourd'hui » un mardi). Mieux vaut ne rien dire que dire faux.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { eventsUrl, weekEventsUrl, parseEvents, todayOnly, whenText, startsLater, EVENT_FIELDS } from '../js/events.js';
import { isExpo } from '../js/art.js';

const now = new Date(2026, 10, 17, 15, 0); // mardi 17 novembre 2026, 15 h
const at = { lat_lon: { lat: 48.86, lon: 2.34 } };

test('une manifestation sans créneau publié n\'est pas « aujourd\'hui » (sauf une expo, avec sa date de fin)', () => {
  const ev = parseEvents([
    { ...at, title: 'Fête de quartier du dimanche', date_start: '2026-11-01T00:00:00+00:00', date_end: '2026-11-22T23:59:59+00:00', occurrences: null },
    { ...at, title: 'Exposition Monet', date_start: '2026-11-02T00:00:00+00:00', date_end: '2026-11-22T23:59:59+00:00', occurrences: null },
    { ...at, title: 'Troc de graines', date_start: '2026-09-26T16:00:00+00:00', date_end: '2026-12-19T16:30:00+00:00',
      occurrences: '2026-11-21T15:00:00+02:00_2026-11-21T16:30:00+02:00;2026-12-19T15:00:00+02:00_2026-12-19T16:30:00+02:00' },
  ], now);
  const today = todayOnly(ev, now, isExpo);
  assert.deepEqual(today.map((e) => e.title), ['Exposition Monet'], 'la fête et le troc n\'ont pas lieu aujourd\'hui');
  assert.equal(whenText(today[0], now), 'jusqu\'au 22 nov.');
  assert.equal(todayOnly(ev, now).length, 0, 'par défaut, rien sans créneau');
});

test('sans créneau connu (données de la semaine), le texte ne dit jamais « en cours aujourd\'hui »', () => {
  const [e] = parseEvents([{ ...at, title: 'Concert Vivaldi', date_start: '2026-04-07T21:00:00+00:00', date_end: '2026-12-31T23:59:00+00:00' }], now);
  assert.equal(e.slots, null);
  assert.notEqual(whenText(e, now), 'en cours aujourd\'hui');
  assert.equal(whenText(e, now), 'jusqu\'au 31 déc.');
  assert.equal(startsLater(e, now), false);
  const [f] = parseEvents([{ ...at, title: 'Sans dates' }], now);
  assert.equal(whenText(f, now), '');
});

test('un créneau connu reste dit tel quel', () => {
  const ev = parseEvents([
    { ...at, title: 'Concert ce soir', date_start: '2026-11-01T20:00:00+00:00', date_end: '2026-12-31T22:00:00+00:00', occurrences: '2026-11-17T20:00:00+02:00_2026-11-17T22:00:00+02:00' },
    { ...at, title: 'Atelier en cours', date_start: '2026-11-01T14:00:00+00:00', date_end: '2026-12-31T17:00:00+00:00', occurrences: '2026-11-17T14:00:00+02:00_2026-11-17T17:00:00+02:00' },
    { ...at, title: 'Nuit blanche', date_start: '2026-11-17T14:00:00+00:00', date_end: '2026-11-18T03:00:00+00:00', occurrences: '2026-11-17T14:00:00+02:00_2026-11-18T03:00:00+02:00' },
  ], now);
  const today = todayOnly(ev, now);
  assert.deepEqual(today.map((e) => whenText(e, now)), ['à 20h', 'jusqu\'à 17h', 'en cours aujourd\'hui']);
});

test('les dates officielles de l\'agenda sont lues en clair', () => {
  const [e] = parseEvents([{ ...at, title: 'Troc', date_description: 'Le samedi 21 novembre 2026<br />de 15h00 à 16h30<br />Le samedi 19 décembre 2026<br />de 15h00 à 16h30<br />' }], now);
  assert.deepEqual(e.dates, ['Le samedi 21 novembre 2026 de 15h00 à 16h30', 'Le samedi 19 décembre 2026 de 15h00 à 16h30']);
  const [g] = parseEvents([{ ...at, title: 'Rugby', date_description: 'Du jeudi 01 janvier 2026 au vendredi 01 janvier 2027 : <br />mardi, jeudi<br /> de 20h00 à 21h30<br /><script>x</script>' }], now);
  assert.deepEqual(g.dates, ['Du jeudi 01 janvier 2026 au vendredi 01 janvier 2027 :', 'mardi, jeudi de 20h00 à 21h30', 'x']);
  const [h] = parseEvents([{ ...at, title: 'Long', date_description: Array.from({ length: 20 }, (_, i) => `Le lundi ${i + 1} décembre<br />`).join('') }], now);
  assert.equal(h.dates.length, 7);
  assert.equal(h.dates.at(-1), '…');
});

test('l\'agenda ne renvoie que ce qui a lieu aujourd\'hui (ou sans créneau), assez pour ne rien perdre', () => {
  const u = new URL(eventsUrl(now));
  const w = u.searchParams.get('where');
  assert.match(w, /occurrences like "\*2026-11-17T\*"/);
  assert.match(w, /occurrences is null/);
  assert.equal(u.searchParams.get('limit'), '1000');
  assert.match(u.searchParams.get('select'), /occurrences/);
  assert.match(u.searchParams.get('select'), /date_description/);
  assert.match(u.searchParams.get('select'), /lead_text/);
});

test('la semaine : seulement ce qui a lieu dans les 8 jours, avec les dates officielles', () => {
  const w = new URL(weekEventsUrl(now)).searchParams.get('where');
  for (const d of ['2026-11-17', '2026-11-20', '2026-11-24']) assert.match(w, new RegExp(`occurrences like "\\*${d}T\\*"`));
  assert.doesNotMatch(w, /2026-11-25T/);
  assert.match(EVENT_FIELDS, /date_description/);
  assert.doesNotMatch(EVENT_FIELDS, /occurrences/, 'les créneaux restent hors de la semaine (trop lourds)');
});
