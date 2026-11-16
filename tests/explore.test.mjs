import { test } from 'node:test';
import assert from 'node:assert/strict';
import { placeLink, readPlaceLink, planLoop, loopUrl, coordsFromUrl, parseCsv, parseTakeout, findDuplicate, wikiUrl, parseWiki, wikiPage, arrFromText, arrFromCitycode, ARR_GRID, mergeVelib, nearestVelib, meteoUrl, readMeteo } from '../js/explore.js';

const LOUVRE = { lat: 48.8606, lng: 2.3376 };

test('lien de partage : aller-retour, accents, refus des liens abîmés ou hors Paris', () => {
  const p = { name: 'Café « Les Arts » – été', lat: 48.861234567, lng: 2.338, address: '12 Rue de Rivoli 75001 Paris', stars: 4, note: 'Croque ✓', hours: 'Mo-Su 08:00-23:00' };
  const url = placeLink('https://limopo74.github.io/Carte-paris/?x=1#old', p, 'Restos', '🍽️');
  assert.match(url, /^https:\/\/limopo74\.github\.io\/Carte-paris\/\?x=1#lieu=[\w-]+$/);
  const r = readPlaceLink(new URL(url).hash);
  assert.equal(r.name, p.name); assert.equal(r.lat, 48.86123); assert.equal(r.catName, 'Restos'); assert.equal(r.catIcon, '🍽️');
  assert.equal(r.stars, 4); assert.equal(r.note, 'Croque ✓'); assert.equal(r.hours, p.hours);
  assert.equal(readPlaceLink('#lieu=%%%'), null);
  assert.equal(readPlaceLink('#autre=1'), null);
  const far = placeLink('https://x/', { name: 'NY', lat: 40.7, lng: -74 });
  assert.equal(readPlaceLink(new URL(far).hash), null);
});

test('temps libre : la boucle tient dans le temps, revient au départ, ignore les lieux trop loin', () => {
  const near = [0, 1, 2].map((i) => ({ id: `n${i}`, lat: LOUVRE.lat + 0.001 * (i + 1), lng: LOUVRE.lng, stars: 0 }));
  const far = { id: 'far', lat: 48.9, lng: 2.4 };
  const r = planLoop(LOUVRE, [...near, far], 60, { dwell: 10 });
  assert.ok(r.total <= 60, r.total);
  assert.ok(!r.route.includes(far));
  assert.equal(r.route.length, 3);
  assert.equal(planLoop(LOUVRE, [far], 30).route.length, 0);
  const u = new URL(loopUrl(LOUVRE, r.route));
  assert.equal(u.searchParams.get('origin'), u.searchParams.get('destination'));
  assert.equal(u.searchParams.get('waypoints').split('|').length, 3);
});

test('temps libre : à égalité, le lieu le mieux noté passe devant', () => {
  const a = { id: 'a', lat: LOUVRE.lat + 0.002, lng: LOUVRE.lng, stars: 0 };
  const b = { id: 'b', lat: LOUVRE.lat - 0.002, lng: LOUVRE.lng, stars: 5 };
  const r = planLoop(LOUVRE, [a, b], 25, { dwell: 15 });
  assert.deepEqual(r.route.map((x) => x.id), ['b']);
});

test('Google Maps : coordonnées dans les liens', () => {
  assert.deepEqual(coordsFromUrl('https://www.google.com/maps/place/X/@48.8584,2.2945,17z'), { lat: 48.8584, lng: 2.2945 });
  assert.deepEqual(coordsFromUrl('https://www.google.com/maps/place/X/data=!3m1!4b1!4m6!3m5!1s0x0:0x0!8m2!3d48.8606!4d2.3376'), { lat: 48.8606, lng: 2.3376 });
  assert.deepEqual(coordsFromUrl('http://maps.google.com/?q=48.85,2.35'), { lat: 48.85, lng: 2.35 });
  assert.equal(coordsFromUrl('https://www.google.com/maps/search/Caf%C3%A9/data=!4m2!2m1!6e5'), null);
});

test('CSV : guillemets, virgules et retours dans les champs', () => {
  assert.deepEqual(parseCsv('﻿Title,Note\r\n"A, B","dit ""oui""\nvraiment"\r\n\r\nC,\n'), [['Title', 'Note'], ['A, B', 'dit "oui"\nvraiment'], ['C', '']]);
});

test('Takeout : Saved Places.json et listes CSV', () => {
  const json = JSON.stringify({ type: 'FeatureCollection', features: [
    { geometry: { coordinates: [2.3376, 48.8606] }, properties: { Title: 'Louvre', Location: { Address: 'Rue de Rivoli, 75001 Paris' }, 'Google Maps URL': 'x' } },
    { geometry: { coordinates: [0, 0] }, properties: { Title: 'Sans position', 'Google Maps URL': 'https://maps.google.com/?q=48.85,2.35' } },
    { geometry: { coordinates: [0, 0] }, properties: { google_maps_url: 'https://maps.google.com/?cid=1', location: { name: 'Nouveau format', address: '1 rue X 75011 Paris' } } },
  ] });
  const j = parseTakeout(json, 'Takeout/Maps (your places)/Saved Places.json');
  assert.equal(j.list, 'Google Maps');
  assert.deepEqual(j.items.map((x) => [x.name, x.lat]), [['Louvre', 48.8606], ['Sans position', 48.85], ['Nouveau format', null]]);
  assert.equal(j.items[2].address, '1 rue X 75011 Paris');
  const c = parseTakeout('Title,Note,URL,Comment\nChez Janou,top terrasse,"https://www.google.com/maps/place/X/@48.857,2.367,17z",\nSans lien,,,\n', 'Saved/Envie d\'y aller.csv');
  assert.equal(c.list, 'Envie d\'y aller');
  assert.deepEqual(c.items.map((x) => [x.name, x.lat, x.note]), [['Chez Janou', 48.857, 'top terrasse'], ['Sans lien', null, '']]);
  assert.throws(() => parseTakeout('a,b\n1,2', 'x.csv'), /Title/);
  assert.throws(() => parseTakeout('{"a":1}', 'x.json'), /Google Maps/);
});

test('doublons : même endroit ou nom proche tout près', () => {
  const pts = [{ id: '1', name: 'Café des Arts', ...LOUVRE }, { id: '2', name: 'Boulangerie', lat: LOUVRE.lat + 0.003, lng: LOUVRE.lng }];
  assert.equal(findDuplicate(pts, { name: 'cafe des arts', lat: LOUVRE.lat + 0.0003, lng: LOUVRE.lng }).point.id, '1');
  assert.equal(findDuplicate(pts, { name: 'Autre chose', lat: LOUVRE.lat + 0.00005, lng: LOUVRE.lng }).point.id, '1');
  assert.equal(findDuplicate(pts, { name: 'Autre chose', lat: LOUVRE.lat + 0.0003, lng: LOUVRE.lng }), null);
  assert.equal(findDuplicate(pts, { name: 'Café des Arts', ...LOUVRE }, '1'), null);
});

test('Wikipédia : adresse arrondie, réponse lue, listes écartées', () => {
  const u = new URL(wikiUrl(48.860612, 2.337644));
  assert.equal(u.searchParams.get('gscoord'), '48.861|2.338');
  assert.equal(u.searchParams.get('origin'), '*');
  const r = parseWiki({ query: { geosearch: [{ pageid: 1, title: 'Musée du Louvre', lat: 48.86, lon: 2.33, dist: 50 }, { title: 'Liste des monuments', lat: 1, lon: 1 }, { title: 'Sans pos' }] } });
  assert.deepEqual(r.map((x) => x.title), ['Musée du Louvre']);
  assert.deepEqual(parseWiki(null), []);
  assert.equal(wikiPage('Musée du Louvre'), 'https://fr.m.wikipedia.org/wiki/Mus%C3%A9e_du_Louvre');
});

test('arrondissements : codes postaux, code INSEE, grille complète', () => {
  assert.equal(arrFromText('12 Rue de Rivoli 75001 Paris'), 1);
  assert.equal(arrFromText('Avenue Foch, 75116 Paris'), 16);
  assert.equal(arrFromText('75020 Paris'), 20);
  assert.equal(arrFromText('75021 Paris'), null);
  assert.equal(arrFromText('92100 Boulogne'), null);
  assert.equal(arrFromCitycode('75104'), 4);
  assert.equal(arrFromCitycode('75056'), null);
  assert.equal(Object.keys(ARR_GRID).length, 20);
  const cells = new Set(Object.values(ARR_GRID).map((c) => c.join(',')));
  assert.equal(cells.size, 20);
});

test("Vélib' : assemblage et station la plus proche avec vélos ou places", () => {
  const info = { data: { stations: [{ station_id: 1, name: 'Louvre', lat: 48.8607, lon: 2.3377 }, { station_id: 2, name: 'Loin', lat: 48.87, lon: 2.35 }, { station_id: 3, name: 'Vide', lat: 48.8606, lon: 2.3376 }] } };
  const status = { data: { stations: [
    { station_id: 1, num_bikes_available: 3, num_bikes_available_types: [{ mechanical: 1 }, { ebike: 2 }], num_docks_available: 0, is_renting: 1 },
    { station_id: 2, num_bikes_available: 5, num_bikes_available_types: [{ mechanical: 5 }, { ebike: 0 }], num_docks_available: 10, is_renting: 1 },
    { station_id: 3, num_bikes_available: 0, num_docks_available: 4, is_renting: 1 },
  ] } };
  const s = mergeVelib(info, status);
  assert.equal(s[0].ebike, 2); assert.equal(s[0].mech, 1);
  assert.deepEqual(nearestVelib(s, LOUVRE, 'bike', 2).map((x) => x.name), ['Louvre', 'Loin']);
  assert.deepEqual(nearestVelib(s, LOUVRE, 'dock', 1).map((x) => x.name), ['Vide']);
});

test('météo : pluie, température, réponse illisible', () => {
  assert.match(meteoUrl(48.8606, 2.3376), /latitude=48\.86&longitude=2\.34/);
  assert.deepEqual(readMeteo({ current: { precipitation: 0.4, weather_code: 3, temperature_2m: 11.6 } }), { rain: true, temp: 12 });
  assert.deepEqual(readMeteo({ current: { precipitation: 0, weather_code: 61 } }), { rain: true, temp: null });
  assert.deepEqual(readMeteo({ current: { precipitation: 0, weather_code: 1, temperature_2m: 20 } }), { rain: false, temp: 20 });
  assert.equal(readMeteo({}), null);
});

test('Vélib via Paris Data : OUI/NON, coordonnées, champs manquants', async () => {
  const { parseVelibParis, VELIB_PARIS, nearestVelib } = await import('../js/explore.js');
  assert.ok(!/lat=|lon=|geom|distance/.test(VELIB_PARIS)); // aucune position envoyée
  const list = parseVelibParis([
    { stationcode: '16107', name: 'Benjamin Godard', numbikesavailable: 5, mechanical: 3, ebike: 2, numdocksavailable: 29, is_renting: 'OUI', coordonnees_geo: { lon: 2.2757, lat: 48.8659 } },
    { stationcode: '1', name: 'Fermée', numbikesavailable: 9, numdocksavailable: 1, is_renting: 'NON', coordonnees_geo: { lon: 2.28, lat: 48.866 } },
    { stationcode: '2', name: 'Sans coordonnées', numbikesavailable: 4 },
  ]);
  assert.equal(list.length, 2);
  assert.deepEqual(list[0], { id: '16107', name: 'Benjamin Godard', lat: 48.8659, lng: 2.2757, bikes: 5, mech: 3, ebike: 2, docks: 29, open: true });
  assert.equal(list[1].open, false);
  assert.deepEqual(nearestVelib(list, { lat: 48.866, lng: 2.276 }).map((s) => s.id), ['16107']);
  assert.deepEqual(parseVelibParis(null), []);
});

test('monuments historiques : regroupe, garde le site https, ignore les sans-nom', async () => {
  const { parseHist, HIST_URL, merimeeUrl } = await import('../js/explore.js');
  assert.ok(HIST_URL.startsWith('https://query.wikidata.org/sparql?format=json&query='));
  const b = (id, label, site, extra = {}) => ({ item: { value: `http://www.wikidata.org/entity/${id}` }, itemLabel: { value: label }, coord: { value: 'Point(2.3376 48.8606)' }, merimee: { value: 'PA00088801' }, ...(site ? { site: { value: site } } : {}), ...extra });
  const list = parseHist({ results: { bindings: [
    b('Q19675', 'Musée du Louvre', 'http://www.louvre.fr', { article: { value: 'https://fr.wikipedia.org/wiki/Mus%C3%A9e_du_Louvre' } }),
    b('Q19675', 'Musée du Louvre', 'https://www.louvre.fr'),
    b('Q999', 'Q999', null),
    b('Q5', 'Piège', 'javascript:alert(1)'),
  ] } });
  assert.equal(list.length, 2);
  assert.deepEqual(list[0], { id: 'Q19675', name: 'Musée du Louvre', lat: 48.8606, lng: 2.3376, site: 'https://www.louvre.fr', merimee: 'PA00088801', wiki: 'https://fr.wikipedia.org/wiki/Mus%C3%A9e_du_Louvre' });
  assert.equal(list[1].site, ''); // lien non web refusé
  assert.equal(merimeeUrl('PA00088801'), 'https://www.pop.culture.gouv.fr/notice/merimee/PA00088801');
  assert.deepEqual(parseHist(null), []);
});

test('invitation à une sortie : le jour et l\'heure passent par le lien, seulement si on invite', () => {
  const at = new Date(Date.now() + 3 * 864e5).setSeconds(0, 0);
  const p = { name: 'Le Grand Rex', lat: 48.8707, lng: 2.3477, ticket: { at } };
  assert.equal(readPlaceLink(new URL(placeLink('https://x/', p)).hash).ticketAt, null, 'un simple partage ne dit pas quand j\'y vais');
  assert.equal(readPlaceLink(new URL(placeLink('https://x/', p, '', '', { invite: true })).hash).ticketAt, at);
  const old = { ...p, ticket: { at: Date.now() - 3 * 864e5 } };
  assert.equal(readPlaceLink(new URL(placeLink('https://x/', old, '', '', { invite: true })).hash).ticketAt, null, 'une sortie passée n\'est pas reprise');
});

test('météo du planning : Paris entier (aucune position), pluie sauf lieu abrité, chaleur', async () => {
  const { forecastUrl, readForecast, planWeather } = await import('../js/explore.js');
  assert.match(forecastUrl(), /latitude=48\.86&longitude=2\.35/);
  const f = readForecast({ daily: { time: ['2026-11-20', '2026-11-21'], weather_code: [61, 0], temperature_2m_max: [9.4, 30.2], precipitation_probability_max: [80, 5] } });
  assert.equal(planWeather(f['2026-11-20']), 'Pluie probable (80 %)');
  assert.equal(planWeather(f['2026-11-20'], true), '', 'lieu abrité : la pluie ne compte pas');
  assert.equal(planWeather(f['2026-11-21']), 'Chaud : 30°');
  assert.equal(planWeather(undefined), '');
  assert.deepEqual(readForecast(null), {});
});

test('invitation : le prénom de qui invite passe avec la date', () => {
  const at = new Date(Date.now() + 864e5).setSeconds(0, 0);
  const r = readPlaceLink(new URL(placeLink('https://x/', { name: 'Rex', lat: 48.87, lng: 2.35, ticket: { at } }, '', '', { invite: 'Camille' })).hash);
  assert.equal(r.withName, 'Camille');
  assert.equal(r.ticketAt, at);
});
