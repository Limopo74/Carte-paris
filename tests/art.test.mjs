import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  isExpo, lastChance, endText, parseGalleries, galleriesNear, galleriesUrl, freeToday, freeNear,
  highlightsSoon, highlightText, pickQuarter, quarterSearchUrl, extractUrl, readExtract, leaveAt, ticketToday, HIGHLIGHTS,
} from '../js/art.js';

const now = new Date(2026, 10, 17, 11, 0); // mardi 17 novembre 2026

test('isExpo : expositions oui, brocantes et concerts non', () => {
  assert.ok(isExpo({ title: 'Exposition Hockney', tags: '' }));
  assert.ok(isExpo({ title: 'Regards croisés', tags: 'Expo;Art contemporain' }));
  assert.ok(isExpo({ title: 'Vernissage collectif', tags: '' }));
  assert.ok(!isExpo({ title: 'Brocante de la rue Mouffetard', tags: 'Expo' }));
  assert.ok(!isExpo({ title: 'Concert à la Philharmonie', tags: 'Musique' }));
});

test('lastChance : expos qui ferment sous 7 jours, de la plus pressée', () => {
  const ev = [
    { title: 'Expo A', end: new Date(2026, 10, 22, 18) },
    { title: 'Expo B', end: new Date(2026, 10, 17, 19) },
    { title: 'Expo C', end: new Date(2026, 11, 20) },
    { title: 'Brocante', end: new Date(2026, 10, 18) },
    { title: 'Expo D', end: null },
  ];
  assert.deepEqual(lastChance(ev, now).map((e) => e.title), ['Expo B', 'Expo A']);
  assert.equal(endText(new Date(2026, 10, 17, 19), now), 'Dernier jour');
  assert.equal(endText(new Date(2026, 10, 18, 19), now), 'Finit demain');
  assert.match(endText(new Date(2026, 10, 22, 18), now), /^Finit dimanche 22 nov/);
});

test('galeries : lecture OpenStreetMap, ouvertes d\'abord', () => {
  const json = { elements: [
    { type: 'node', id: 1, lat: 48.86, lon: 2.36, tags: { tourism: 'gallery', name: 'Galerie Ouverte', opening_hours: 'Tu-Sa 11:00-19:00', website: 'https://exemple.fr' } },
    { type: 'way', id: 2, center: { lat: 48.861, lon: 2.361 }, tags: { shop: 'art', name: 'Galerie Fermée', opening_hours: 'We-Sa 14:00-18:00' } },
    { type: 'node', id: 3, lat: 48.8605, lon: 2.3605, tags: { amenity: 'arts_centre', name: 'Centre sans horaires', website: 'http://pas-sur.fr' } },
    { type: 'node', id: 4, lat: 48.86, lon: 2.36, tags: { tourism: 'gallery' } },
    { type: 'node', id: 5, lat: 48.86, lon: 2.36, tags: { tourism: 'gallery', name: 'Galerie Ouverte', opening_hours: 'Tu-Sa 11:00-19:00' } },
  ] };
  const list = parseGalleries(json);
  assert.equal(list.length, 3, 'sans nom et doublon écartés');
  assert.equal(list[0].site, 'https://exemple.fr');
  assert.equal(list[2].site, '', 'http refusé');
  assert.equal(list[2].kind, 'Centre d\'art');
  const near = galleriesNear(list, { lat: 48.86, lng: 2.36 }, now);
  assert.deepEqual(near.map((g) => g.name), ['Galerie Ouverte', 'Centre sans horaires', 'Galerie Fermée']);
  assert.match(galleriesUrl(), /^https:\/\/overpass-api\.de\/api\/interpreter\?data=/);
  assert.ok(!/48\.86\d/.test(decodeURIComponent(galleriesUrl())), 'la position n\'est pas dans la demande');
});

test('gratuit aujourd\'hui : toujours, 1er dimanche, 1er vendredi soir hors été', () => {
  const tuesday = freeToday(now).map((p) => p.name);
  assert.ok(tuesday.includes('Petit Palais'));
  assert.ok(!tuesday.includes('Musée d\'Orsay'));
  const firstSunday = freeToday(new Date(2026, 11, 6)).map((p) => p.name); // dimanche 6 décembre
  assert.ok(firstSunday.includes('Musée d\'Orsay'));
  assert.ok(!freeToday(new Date(2026, 11, 13)).some((p) => p.name === 'Musée d\'Orsay'), '2e dimanche');
  assert.ok(freeToday(new Date(2026, 11, 4)).some((p) => p.name === 'Musée du Louvre'), '1er vendredi');
  assert.ok(!freeToday(new Date(2027, 6, 2)).some((p) => p.name === 'Musée du Louvre'), 'pas en juillet');
  const near = freeNear({ lat: 48.8600, lng: 2.3266 }, new Date(2026, 11, 6));
  assert.equal(near[0].name, 'Musée d\'Orsay', 'la gratuité du jour passe devant');
  assert.ok(near.length <= 3);
});

test('temps forts : en cours ou dans la semaine', () => {
  assert.deepEqual(highlightsSoon(now), []);
  const soon = highlightsSoon(new Date(2027, 5, 1));
  assert.deepEqual(soon.map((h) => h.name), ['Nuit Blanche']);
  assert.match(highlightText(soon[0], new Date(2027, 5, 1)), /^Samedi 5 juin : Nuit Blanche$/);
  assert.equal(highlightText(HIGHLIGHTS[0], new Date(2027, 5, 4)), 'Demain : Nuit Blanche');
  const basel = HIGHLIGHTS.find((h) => h.name === 'Art Basel Paris');
  assert.match(highlightText(basel, new Date(2027, 9, 23)), /^En ce moment : Art Basel Paris \(jusqu'au dimanche 24 oct/);
  assert.deepEqual(highlightsSoon(new Date(2027, 9, 25)), [], 'fini');
});

test('quartier : article le plus proche décrit comme un quartier, position arrondie', () => {
  const u = new URL(quarterSearchUrl(48.856789, 2.362345));
  assert.equal(u.searchParams.get('ggscoord'), '48.857|2.362');
  const json = { query: { pages: [
    { title: 'Musée Carnavalet', description: 'musée parisien', coordinates: [{ lat: 48.8575, lon: 2.3625 }] },
    { title: 'Le Marais', description: 'quartier de Paris', coordinates: [{ lat: 48.859, lon: 2.36 }] },
    { title: 'Quartier Saint-Gervais', description: 'quartier administratif de Paris', coordinates: [{ lat: 48.855, lon: 2.357 }] },
    { title: 'Rue des Rosiers', description: 'rue du quartier du Marais', coordinates: [{ lat: 48.857, lon: 2.359 }] },
  ] } };
  assert.equal(pickQuarter(json, { lat: 48.8585, lng: 2.3605 }).title, 'Le Marais');
  assert.equal(pickQuarter({}, { lat: 48.85, lng: 2.35 }), null);
  assert.match(extractUrl('Le Marais'), /titles=Le\+Marais/);
  assert.ok(!/48\.|2\.3/.test(extractUrl('Le Marais')), 'aucune position pour le texte');
  assert.equal(readExtract({ query: { pages: [{ extract: 'Le Marais est   un quartier.\n' }] } }), 'Le Marais est un quartier.');
});

test('billet : heure de départ et billet du jour', () => {
  const at = new Date(2026, 10, 17, 15, 0).getTime();
  assert.equal(leaveAt(at, 18).getHours() * 60 + leaveAt(at, 18).getMinutes(), 14 * 60 + 37);
  const pts = [
    { name: 'Demain', ticket: { at: new Date(2026, 10, 18, 10).getTime() } },
    { name: 'Orsay', ticket: { at } },
    { name: 'Passé', ticket: { at: new Date(2026, 10, 17, 9, 0).getTime() } },
    { name: 'Sans billet' },
  ];
  assert.equal(ticketToday(pts, now).name, 'Orsay');
  assert.equal(ticketToday(pts, new Date(2026, 10, 17, 15, 40)), null, 'plus de 30 min après');
});
