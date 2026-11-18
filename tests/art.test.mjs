import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  isExpo, lastChance, endText, parseGalleries, galleriesNear, freeToday, freeNear, freeSoon, KIOSQUES, ART_PLACES, artPlaceOf, artPlacesWith, findArtPlaces,
  highlightsSoon, highlightText, listsStale, pickQuarter, quarterSearchUrl, extractUrl, readExtract, leaveAt, ticketToday, HIGHLIGHTS, spotHours, spotRank, FREE_PLACES,
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

test('gratuit : monuments de novembre à mars, Bourse de Commerce le 1er samedi', () => {
  const dec = freeToday(new Date(2026, 11, 6)).map((p) => p.name);
  assert.ok(dec.includes('Panthéon'));
  assert.ok(!freeToday(new Date(2027, 3, 4)).some((p) => p.name === 'Panthéon'), 'pas en avril');
  assert.ok(freeToday(new Date(2026, 11, 5)).some((p) => p.name === 'Bourse de Commerce'), '1er samedi');
  assert.ok(!freeToday(new Date(2026, 11, 12)).some((p) => p.name === 'Bourse de Commerce'), '2e samedi');
});

test('prochaines gratuités : dates à venir, sans aujourd\'hui, dans l\'ordre', () => {
  const soon = freeSoon(now);
  assert.deepEqual(soon.map((x) => x.date.getDate()), [4, 5, 6]); // vendredi 4, samedi 5, dimanche 6 décembre
  assert.match(soon[0].text, /Louvre/);
  assert.match(soon[2].text, /monuments/);
  assert.ok(!freeSoon(new Date(2026, 11, 6)).some((x) => x.date.getDate() === 6 && x.date.getMonth() === 11));
  assert.deepEqual(KIOSQUES.map((k) => k.name), ['Kiosque Théâtre Madeleine'], 'Montparnasse fermé, Ternes disparu (site officiel, 17 nov. 2026)');
  assert.ok(KIOSQUES.every((k) => Number.isFinite(k.lat) && k.hours));
});

test('grands lieux : reconnus par le nom de l\'agenda, sans confondre Cartier et Cartier-Bresson', () => {
  assert.equal(artPlaceOf({ place: 'Bourse de commerce - Pinault Collection' })?.name, 'Bourse de Commerce');
  assert.equal(artPlaceOf({ place: 'Bourse de Commerce — Pinault Collection' })?.name, 'Bourse de Commerce');
  assert.equal(artPlaceOf({ place: 'Fondation Cartier pour l\'art contemporain' })?.name, 'Fondation Cartier');
  assert.equal(artPlaceOf({ place: 'Fondation Henri Cartier-Bresson' })?.name, 'Fondation Henri Cartier-Bresson');
  assert.equal(artPlaceOf({ place: 'Musée d’Art Moderne de Paris' })?.name, 'Musée d\'Art moderne de Paris');
  assert.equal(artPlaceOf({ place: 'Maison de la Radio et de la musique - Studio 104' })?.name, 'Maison de la Radio et de la Musique');
  assert.equal(artPlaceOf({ place: 'Médiathèque Marguerite Duras' }), null);
  assert.equal(artPlaceOf({ place: 'Grand Palais' })?.name, 'Grand Palais');
  assert.equal(artPlaceOf({ place: 'Petit Palais - Musée des beaux-arts de la Ville de Paris' })?.name, 'Petit Palais');
  assert.equal(artPlaceOf({ place: 'Palais  Galliera - musée de la Mode de Paris' })?.name, 'Palais Galliera');
  assert.equal(artPlaceOf({ place: 'Musée du quai Branly - Jacques Chirac' })?.name, 'Musée du quai Branly');
  assert.equal(artPlaceOf({ place: 'L\'Institut du Monde Arabe' })?.name, 'Institut du monde arabe');
  assert.equal(new Set(ART_PLACES.map((p) => p.match)).size, ART_PLACES.length, 'un match par lieu');
  assert.deepEqual(findArtPlaces('orsay').map((p) => p.name), ['Musée d\'Orsay']);
  assert.deepEqual(findArtPlaces('Musée Orsay').map((p) => p.name), ['Musée d\'Orsay']);
  assert.ok(findArtPlaces('cartier').length === 2, 'Cartier et Cartier-Bresson');
  assert.deepEqual(findArtPlaces('lo'), []);
  assert.deepEqual(findArtPlaces('boulangerie'), []);
  const d = (s) => new Date(2026, 11, s);
  const g = artPlacesWith([{ place: 'Palais de Tokyo', title: 'B', end: d(20) }, { place: 'Palais de Tokyo', title: 'A', end: d(5) }, { place: 'Palais de Tokyo', title: 'A', end: d(5) }]);
  assert.equal(g.length, ART_PLACES.length);
  assert.deepEqual(g.find((p) => p.name === 'Palais de Tokyo').events.map((e) => e.title), ['A', 'B']);
  assert.ok(ART_PLACES.every((p) => /^https:\/\//.test(p.site) && Number.isFinite(p.lat)));
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

test('rappel : listes fixes à mettre à jour', () => {
  assert.equal(listsStale(new Date(2026, 10, 17)), false);
  assert.equal(listsStale(new Date(2027, 9, 25)), true, 'plus aucun temps fort à venir');
  assert.equal(listsStale(new Date(2027, 10, 20), [{ name: 'X', from: '2028-06-01', to: '2028-06-01' }]), true, 'gratuités vérifiées il y a plus d\'un an');
  assert.equal(listsStale(new Date(2027, 5, 1), [{ name: 'X', from: '2027-06-05', to: '2027-06-05' }], '2027-01-10'), false);
});

import { arrondOf, weekExpos, weekText } from '../js/art.js';
import { weekEventsUrl, EVENT_FIELDS } from '../js/events.js';

test('arrondOf : code postal → arrondissement', () => {
  assert.equal(arrondOf({ address: '38 rue de Bretagne 75003 Paris' }), 3);
  assert.equal(arrondOf({ address: '1 av. Foch 75116 Paris' }), 16);
  assert.equal(arrondOf({ address: '2 place 75020 Paris' }), 20);
  assert.equal(arrondOf({ address: '10 rue X 93100 Montreuil' }), null);
  assert.equal(arrondOf({ address: '' }), null);
  assert.equal(arrondOf({ address: '75021 ?' }), null, 'pas un arrondissement');
});

test('weekExpos : tout Paris, par arrondissement, fin la plus proche d\'abord', () => {
  const now = new Date('2026-11-16T15:00:00+01:00');
  const d = (s) => new Date(s);
  const ev = [
    { title: 'Exposition B', tags: 'Expo', address: 'x 75011 Paris', lat: 48.86, lng: 2.37, start: d('2026-10-01'), end: d('2027-01-10') },
    { title: 'Exposition A', tags: 'Expo', address: 'x 75011 Paris', lat: 48.861, lng: 2.371, start: d('2026-10-01'), end: d('2026-11-19') },
    { title: 'Exposition C', tags: 'Expo', address: 'x 75003 Paris', lat: 48.86, lng: 2.36, start: d('2026-11-20T10:00:00+01:00'), end: d('2027-02-01') },
    { title: 'Exposition trop tard', tags: 'Expo', address: 'x 75003 Paris', lat: 48.86, lng: 2.36, start: d('2026-12-10'), end: d('2027-02-01') },
    { title: 'Exposition finie', tags: 'Expo', address: 'x 75003 Paris', lat: 48.86, lng: 2.36, start: d('2026-09-01'), end: d('2026-11-15') },
    { title: 'Concert', tags: 'Concert', address: 'x 75003 Paris', lat: 48.86, lng: 2.36, start: d('2026-11-17'), end: d('2026-11-17') },
    { title: 'Exposition Montreuil', tags: 'Expo', address: 'x 93100 Montreuil', lat: 48.86, lng: 2.44, start: d('2026-11-01'), end: d('2026-12-01') },
    { title: 'Exposition B', tags: 'Expo', address: 'x 75011 Paris', lat: 48.86, lng: 2.37, start: d('2026-10-01'), end: d('2027-01-10') },
  ];
  const g = weekExpos(ev, now);
  assert.deepEqual(g.map((x) => x.arr), [3, 11, null]);
  assert.deepEqual(g[1].items.map((e) => e.title), ['Exposition A', 'Exposition B'], 'doublon retiré, fin la plus proche d\'abord');
  assert.deepEqual(g[0].items.map((e) => e.title), ['Exposition C']);
  assert.match(weekText(g[0].items[0], now), /^Dès vendredi 20 nov/);
  assert.match(weekText(g[1].items[0], now), /^Finit jeudi 19 nov/);
});

test('weekEventsUrl : sans position, une semaine, champs utiles seulement', () => {
  const u = new URL(weekEventsUrl(new Date('2026-11-16T15:00:00+01:00')));
  assert.equal(u.searchParams.get('select'), EVENT_FIELDS);
  assert.match(u.searchParams.get('where'), /date_end >= "2026-11-16T14:00:00.000Z" AND date_start <= "2026-11-2/);
  assert.doesNotMatch(u.toString(), /within_distance|geofilter/);
  assert.equal(new URL(weekEventsUrl(new Date(), 7, false)).searchParams.get('select'), null, 'version de secours sans select');
});

test('musées gratuits et Kiosque : horaires connus, fermés à la fin, jamais « tous les jours » (v156)', async () => {
  const { openState } = await import('../js/hours.js');
  const pp = FREE_PLACES.find((p) => p.name === 'Petit Palais');
  assert.equal(openState(spotHours(pp, new Date(2026, 10, 17, 15)), new Date(2026, 10, 17, 15)).open, true, 'mardi 15 h : ouvert');
  assert.equal(spotRank(pp, new Date(2026, 10, 17, 21)), 2, 'mardi 21 h : fermé pour la journée');
  assert.equal(spotRank(pp, new Date(2026, 10, 17, 8)), 0, 'mardi 8 h : ouvre plus tard');
  assert.equal(spotRank(pp, new Date(2026, 10, 16, 12)), 2, 'lundi : fermé');
  assert.equal(spotRank(pp, new Date(2026, 11, 25, 12)), 2, '25 décembre : fermé');
  assert.equal(spotRank(FREE_PLACES.find((p) => p.name === 'Hôtel de la Marine'), new Date(2026, 11, 6, 12)), 1, 'horaire pas sûr : inconnu');
  assert.ok(!freeToday(now).some((p) => /tous les jours/.test(p.when)));
  // un mardi à 21 h : les musées de la Ville sont fermés ; le soir d'un 1er vendredi, le Louvre (18 h-21 h) passe devant
  const fri = freeNear({ lat: 48.8606, lng: 2.3376 }, new Date(2026, 11, 4, 19), 3000, 12);
  assert.equal(fri[0].name, 'Musée du Louvre');
  assert.ok(fri.slice(1).every((p) => p.r === 2), 'les autres, fermés à 19 h, après');
  const k = KIOSQUES[0];
  assert.equal(spotRank(k, new Date(2026, 10, 17, 20)), 2, 'Kiosque mardi 20 h : fermé');
  assert.equal(openState(spotHours(k, new Date(2026, 10, 17, 14, 45)), new Date(2026, 10, 17, 14, 45)).opensAt, '15:00', 'pause de 14 h 30 à 15 h');
  assert.equal(spotRank(k, new Date(2026, 10, 16, 15)), 2, 'Kiosque lundi : fermé');
  assert.equal(spotRank(k, new Date(2026, 11, 25, 13)), 2, 'Kiosque 25 décembre : fermé');
});

test('freeBanner : jour gratuit aujourd\'hui, demain ou après-demain, jamais une soirée finie', async () => {
  const { freeBanner } = await import('../js/art.js');
  assert.equal(freeBanner(new Date(2026, 10, 17, 11)), null); // mardi 17 nov. : rien avant le 4 déc.
  assert.deepEqual(freeBanner(new Date(2026, 11, 3, 10)), { k: 1, when: 'demain', text: 'Louvre dès 18 h' });
  const late = freeBanner(new Date(2026, 11, 4, 22)); // Louvre fini à 21 h : on annonce la Bourse de demain
  assert.equal(late.k, 1);
  assert.match(late.text, /^Bourse de Commerce/);
  const sun = freeBanner(new Date(2026, 11, 4, 12)); // vendredi midi : le Louvre ce soir
  assert.deepEqual([sun.k, sun.when], [0, 'aujourd\'hui']);
  const two = freeBanner(new Date(2026, 11, 2, 10)); // mercredi 2 déc. : vendredi dans 2 jours
  assert.deepEqual([two.k, two.when], [2, 'vendredi']);
  assert.match(freeBanner(new Date(2026, 11, 6, 9)).text, /^Musées nationaux et monuments/);
});

test('Mes artistes : noms nettoyés sans limite, cités mot pour mot', async () => {
  const { cleanArtists, mentions, artistEvents } = await import('../js/art.js');
  assert.deepEqual(cleanArtists([' David  Hockney ', 'david hockney', 'JR', 'X', 12, 'Niki de Saint Phalle']), ['David Hockney', 'JR', 'Niki de Saint Phalle']);
  assert.equal(cleanArtists(Array.from({ length: 300 }, (_, i) => `Artiste ${i}`)).length, 300);
  assert.ok(mentions({ title: 'Exposition « Niki de Saint-Phalle » au Grand Palais' }, 'Niki de Saint Phalle'));
  assert.ok(mentions({ title: 'Matisse et la couleur' }, 'matisse'));
  assert.ok(!mentions({ title: 'Les Matissiens' }, 'Matisse')); // pas un morceau de mot
  assert.ok(mentions({ title: 'Rétrospective', lead: 'Les photos de JR sur les toits' }, 'JR'));
  const ev = [
    { title: 'Hockney 25', lat: 48.87, lng: 2.26, end: new Date(2027, 2, 1) },
    { title: 'Matisse, l\'atelier', lat: 48.86, lng: 2.33, end: new Date(2026, 11, 1) },
    { title: 'Matisse, l\'atelier', lat: 48.86, lng: 2.33, end: new Date(2026, 11, 1) },
    { title: 'Brocante', lat: 48.85, lng: 2.35, end: null },
  ];
  const r = artistEvents(ev, ['Matisse', 'Hockney']);
  assert.deepEqual(r.map((x) => x.e.title), ['Matisse, l\'atelier', 'Hockney 25']);
  assert.deepEqual(r[0].who, ['Matisse']);
  assert.deepEqual(artistEvents(ev, []), []);
});

test('Ouvert tard : nocturnes du jour, jamais finies, rien un jour férié', async () => {
  const { lateOn, lateTonight, lateHour, lateBefore, ART_PLACES } = await import('../js/art.js');
  assert.equal(lateHour('21:45'), '21 h 45');
  assert.equal(lateHour('21:00'), '21 h');
  assert.equal(lateHour('24:00'), 'minuit');
  const thu = new Date(2026, 10, 19, 18); // jeudi 19 nov.
  const names = lateOn(thu).map((p) => p.name);
  assert.equal(names[0], 'Palais de Tokyo'); // minuit
  assert.ok(names.includes('Musée d\'Orsay') && names.includes('Musée du quai Branly') && !names.includes('Musée du Louvre'));
  const at21 = lateTonight(new Date(2026, 10, 19, 21, 20)).map((p) => p.name);
  assert.ok(at21.includes('Palais de Tokyo') && !at21.includes('Musée d\'Orsay')); // Orsay ferme à 21 h 45 : heure d'entrée non vérifiée, 1 h de marge
  // v195 : chaque lieu quitte « Ce soir » à l'heure où l'on n'entre plus (guichet ou dernière entrée), pas 30 min avant pour tous
  const at2010 = lateTonight(new Date(2026, 10, 19, 20, 10)).map((p) => p.name);
  assert.ok(!at2010.includes('Musée Marmottan Monet'), 'Marmottan : dernière entrée 20 h');
  assert.ok(at2010.includes('Cité de l\'architecture'), 'Cité : billetterie jusqu\'à 20 h 20');
  assert.ok(at2010.includes('Musée d\'Orsay') && at2010.includes('Musée du quai Branly') && at2010.includes('Maison européenne de la photographie'));
  const at2050 = lateTonight(new Date(2026, 10, 19, 20, 50)).map((p) => p.name);
  assert.ok(!at2050.includes('Musée d\'Orsay') && at2050.includes('Musée du quai Branly'), 'Orsay : 21 h 45 moins 1 h ; Branly : guichets à 21 h');
  const fri = lateTonight(new Date(2026, 10, 20, 19, 50));
  assert.equal(fri.find((p) => p.name === 'Musée du Louvre').before, '20:00');
  assert.equal(lateTonight(new Date(2026, 10, 20, 20, 5)).some((p) => p.name === 'Musée du Louvre'), false, 'Louvre : dernière admission 1 h avant');
  assert.equal(lateBefore('24:00', 45), '23:15');
  assert.equal(lateBefore('21:45', undefined), '');
  assert.equal(lateOn(thu).find((p) => p.name === 'Musée d\'Orsay').before, '', 'pas d\'heure affichée sans source');
  for (const p of ART_PLACES) if (p.last !== undefined) assert.ok(p.late && p.last >= 30 && p.last <= 60, p.name);
  assert.deepEqual(lateOn(new Date(2026, 11, 25, 12), ART_PLACES, 'Noël'), []);
  const sat1 = lateOn(new Date(2026, 11, 5, 12)).map((p) => p.name); // 1er samedi
  const sat2 = lateOn(new Date(2026, 11, 12, 12)).map((p) => p.name);
  assert.ok(sat1.includes('Bourse de Commerce') && !sat2.includes('Bourse de Commerce'));
  assert.match(lateOn(thu).find((p) => p.name === 'Musée d\'Art moderne de Paris').note, /expositions temporaires/);
});

test('Art dans la rue : statues et sculptures nommées, jamais les fresques', async () => {
  const { parseStreetArt, streetArtNear, STREET_ART_QUERY } = await import('../js/art.js');
  assert.match(STREET_ART_QUERY, /statue\|sculpture/);
  assert.doesNotMatch(STREET_ART_QUERY, /mural|graffiti|mosaic/);
  const list = parseStreetArt({ elements: [
    { type: 'node', id: 1, lat: 48.8486, lon: 2.3965, tags: { tourism: 'artwork', artwork_type: 'statue', name: 'Le Triomphe de la République', artist_name: 'Jules Dalou', start_date: '1899', wikipedia: 'fr:Le Triomphe de la République' } },
    { type: 'way', id: 2, center: { lat: 48.86, lon: 2.35 }, tags: { tourism: 'artwork', artwork_type: 'mural', name: 'Fresque' } },
    { type: 'node', id: 3, lat: 48.85, lon: 2.35, tags: { tourism: 'artwork', artwork_type: 'sculpture' } },
    { type: 'node', id: 4, lat: 48.8487, lon: 2.3966, tags: { tourism: 'artwork', artwork_type: 'sculpture', name: 'Stravinsky', artist_name: 'Niki de Saint Phalle' } },
  ] });
  assert.deepEqual(list.map((a) => a.name), ['Le Triomphe de la République', 'Stravinsky']);
  assert.equal(list[0].type, 'Statue');
  assert.equal(list[0].year, '1899');
  assert.match(list[0].wiki, /^https:\/\/fr\.wikipedia\.org\/wiki\/Le_Triomphe/);
  const near = streetArtNear(list, { lat: 48.8486, lng: 2.3965 }, 1000, ['Niki de Saint Phalle']);
  assert.equal(near[0].name, 'Stravinsky'); // mes artistes d'abord
  assert.equal(streetArtNear(list, { lat: 48.9, lng: 2.3 }).length, 0);
});

test('textMatch : tous les mots, sans accents ni majuscules', async () => {
  const { textMatch } = await import('../js/art.js');
  assert.ok(textMatch('chez georges', 'Chez Georges', 'bistrot'));
  assert.ok(textMatch('orsay musée', 'Musée d\'Orsay'));
  assert.ok(!textMatch('ab', 'abc'));
  assert.ok(!textMatch('chez paul', 'Chez Georges'));
});
