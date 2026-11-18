// v166 : Mes salles — les lieux de sortie suivis et leur programme de la semaine.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { cleanVenues, atVenue, venueEvents } from '../js/art.js';
import { loadState, saveState, exportJSON, mergeImport } from '../js/store.js';
import { ICON_SVG } from '../js/icons.js';

const mem = () => { const m = new Map(); return { getItem: (k) => m.get(k) ?? null, setItem: (k, v) => m.set(k, String(v)) }; };
const ev = (title, place, start, extra = {}) => ({ title, place, lat: 48.89, lng: 2.39, start, ...extra });

test('salles suivies : nettoyées, sans doublon', () => {
  assert.deepEqual(cleanVenues([' Philharmonie de Paris ', 'philharmonie DE paris', 'Le 104', 'ab', 42, 'Théâtre de la Ville']), ['Philharmonie de Paris', 'Le 104', 'Théâtre de la Ville']);
  assert.equal(cleanVenues(Array.from({ length: 150 }, (_, i) => `Salle ${i}`)).length, 100);
});

test('une sortie est dans ma salle : mot pour mot dans le lieu ou l\'organisateur', () => {
  assert.ok(atVenue(ev('Bal', 'Philharmonie de Paris - Salle Pierre Boulez'), 'Philharmonie de Paris'));
  assert.ok(atVenue(ev('Bal', 'Cité de la musique', null, { org: 'Philharmonie de Paris' }), 'philharmonie de paris'));
  assert.ok(!atVenue(ev('Expo', 'Théâtre de la Ville-Sarah Bernhardt'), 'Théâtre de la Villette'));
  assert.ok(!atVenue(ev('X', 'Le Centquatre'), 'Le 104'), 'pas de devinette sur les surnoms');
});

test('le programme de mes salles : les rendez-vous datés d\'abord, du plus proche au plus loin', () => {
  const now = new Date(2026, 10, 18, 12);
  const list = [
    ev('Concert samedi', 'Philharmonie de Paris', new Date(2026, 10, 21, 20)),
    ev('Expo en cours', 'Philharmonie de Paris', new Date(2026, 9, 1)),
    ev('Concert ce soir', 'Philharmonie de Paris', new Date(2026, 10, 18, 20)),
    ev('Ailleurs', 'Olympia', new Date(2026, 10, 18, 20)),
    ev('Concert ce soir', 'Philharmonie de Paris', new Date(2026, 10, 18, 20)),
  ];
  assert.deepEqual(venueEvents(list, ['Philharmonie de Paris'], now).map((x) => x.e.title), ['Concert ce soir', 'Concert samedi', 'Expo en cours']);
  assert.deepEqual(venueEvents(list, [], now), []);
});

test('mes salles sont gardées et partent dans ma sauvegarde, pas dans celle d\'un proche', () => {
  const st = mem();
  const s0 = loadState(st);
  assert.deepEqual(s0.venues, []);
  s0.venues = ['Philharmonie de Paris', 'philharmonie de paris', 'Le Lucernaire'];
  saveState(st, s0);
  const s1 = loadState(st);
  assert.deepEqual(s1.venues, ['Philharmonie de Paris', 'Le Lucernaire']);
  const file = exportJSON(s1);
  assert.deepEqual(mergeImport(loadState(mem()), file).state.venues, ['Philharmonie de Paris', 'Le Lucernaire']);
  assert.deepEqual(mergeImport(loadState(mem()), file, 'Léa').state.venues, []);
  assert.ok(!('venues' in JSON.parse(exportJSON(loadState(mem())))));
});

test('icônes de la feuille réduite', () => {
  assert.ok(ICON_SVG['chevron-down'] && ICON_SVG['chevron-up'] && ICON_SVG.heart);
});
