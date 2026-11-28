// v556 (mes choix N1 A, N2 A, N3 A du 28 nov. 2026) : sorties nouvelles.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { cleanNews, stepNews, readNews, sinceText } from '../js/nouvelles.js';
import { idsUrl, byIdsUrl, parseEvents } from '../js/events.js';

const mer = new Date(2026, 10, 25, 18).getTime();
const sam = new Date(2026, 10, 28, 9).getTime();
const dim = new Date(2026, 10, 29, 10).getTime();

test('N1 A : la première fois, la référence sans nouvelle ; ensuite, ce qui n\'y était pas', () => {
  const a = stepNews(null, ['1', '2', '3'], mer);
  assert.deepEqual(a.fresh, []);
  assert.equal(a.since, null);
  const b = stepNews(a, ['1', '2', '3', '4', '5'], sam);
  assert.deepEqual(b.fresh, ['4', '5']);
  assert.equal(b.since, mer); // « depuis mercredi » : ma dernière ouverture
});

test('N3 A : nouvelles jusqu\'à l\'ouverture de leur liste ; les suivantes s\'ajoutent ; une sortie finie disparaît', () => {
  const a = stepNews(stepNews(null, ['1', '2'], mer), ['1', '2', '3'], sam);
  const b = stepNews(a, ['2', '3', '4'], dim); // 1 finie ; 3 toujours nouvelle ; 4 s'ajoute
  assert.deepEqual(b.fresh, ['3', '4']);
  assert.equal(b.since, mer); // le début ne bouge pas
  assert.deepEqual(b.seen, ['2']);
  const c = readNews(b);
  assert.deepEqual(c.fresh, []);
  assert.deepEqual(c.seen.sort(), ['2', '3', '4']);
  assert.equal(stepNews(c, ['2', '3', '4'], dim + 3600e3).fresh.length, 0);
});

test('agenda muet : rien ne change ; données abîmées : ignorées', () => {
  const a = stepNews(null, ['1'], mer);
  assert.deepEqual(stepNews(a, [], sam), a);
  assert.equal(cleanNews({ seen: [] }), null);
  assert.deepEqual(cleanNews({ at: 1, seen: ['1', 'x', 2], fresh: null }).seen, ['1', '2']);
});

test('« depuis … »', () => {
  const now = new Date(2026, 10, 28, 9);
  assert.equal(sinceText(new Date(2026, 10, 25, 18).getTime(), now), 'depuis mercredi');
  assert.equal(sinceText(new Date(2026, 10, 27, 18).getTime(), now), 'depuis hier');
  assert.equal(sinceText(new Date(2026, 10, 28, 7, 5).getTime(), now), 'depuis 7 h 05');
  assert.match(sinceText(new Date(2026, 10, 12).getTime(), now), /^depuis le 12 nov/);
});

test('les adresses de l\'agenda : identifiants seulement, puis le détail de 100 au plus ; aucune position', () => {
  const u = new URL(idsUrl(new Date(Date.UTC(2026, 10, 28))));
  assert.equal(u.searchParams.get('select'), 'id');
  assert.equal(u.searchParams.get('limit'), '-1');
  const v = new URL(byIdsUrl(['12', '13', 'x"); drop', ...Array.from({ length: 150 }, (_, i) => String(1000 + i))]));
  assert.match(v.searchParams.get('where'), /^id in \("12","13","1000"/);
  assert.doesNotMatch(v.searchParams.get('where'), /drop/);
  assert.equal(v.searchParams.get('where').split(',').length, 100);
  assert.doesNotMatch(u.toString() + v.toString(), /within_distance|geofilter|distance\(/); // ma position n'est jamais dans la demande
  assert.equal(parseEvents([{ id: '63949', title: 'Test', lat_lon: { lat: 48.86, lon: 2.35 } }])[0].id, '63949');
});

test('branché : gardé sur le téléphone, hors sauvegarde ; encart et liste dans Sorties', () => {
  const app = readFileSync(new URL('../js/app.js', import.meta.url), 'utf8');
  assert.match(app, /const NEWS_KEY = 'carte-paris\.nouvelles'/);
  assert.match(app, /function openNews\(/);
  assert.match(app, /readNews\(/);
  const store = readFileSync(new URL('../js/store.js', import.meta.url), 'utf8');
  assert.doesNotMatch(store, /nouvelles/);
});
