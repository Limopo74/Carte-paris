import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { parseMusees, sameArtist, museumsWith } from '../js/art.js';

const file = parseMusees(JSON.parse(readFileSync(new URL('../data/musees.json', import.meta.url), 'utf8')));

test('v231 : même artiste — nom complet, nom de famille seul, sans accents ; jamais un nom porté par plusieurs', () => {
  assert.ok(sameArtist('Claude Monet', 'Monet'));
  assert.ok(sameArtist('Monet', 'Claude Monet'));
  assert.ok(sameArtist('Vincent van Gogh', 'Van Gogh'));
  assert.ok(sameArtist('Albrecht Dürer', 'Durer'));
  assert.ok(sameArtist('toulouse lautrec', 'Toulouse-Lautrec'));
  assert.ok(sameArtist('Pierre-Jean David d\'Angers', 'David d\'Angers'));
  assert.ok(!sameArtist('Jacques-Louis David', 'David'), 'David : plusieurs artistes');
  assert.ok(!sameArtist('Georges de La Tour', 'La Tour'));
  assert.ok(!sameArtist('Henri Rousseau', 'Rousseau'));
  assert.ok(!sameArtist('Claude Monet', 'Manet'));
  assert.ok(!sameArtist('Paris la nuit', 'Paris'));
  assert.ok(!sameArtist('', 'Monet'));
});

test('v231 : data/musees.json — Claude Monet dans 4 musées, aucun musée fermé, positions et sites sûrs', () => {
  assert.match(file.updated, /^\d{4}-\d{2}-\d{2}$/);
  assert.ok(file.items.length >= 20, `${file.items.length} musées`);
  const names = museumsWith(file.items, 'Claude Monet').map((m) => m.n).sort();
  assert.deepEqual(names, ['Musée Rodin', 'Musée d\'Orsay', 'Musée de l\'Orangerie des Tuileries', 'Petit Palais'].sort());
  const ids = file.items.map((m) => m.id);
  for (const closed of ['M5007', 'M1076', 'M5050']) assert.ok(!ids.includes(closed), `${closed} fermé`);
  assert.ok(file.items.every((m) => m.url.startsWith('https://')));
  const marine = file.items.find((m) => m.id === 'M5026');
  assert.deepEqual([marine.lat, marine.lng], [48.861944, 2.2875], 'Marine : position de Wikidata, pas celle de Guimet');
  assert.ok(file.items.every((m) => m.art.every((a) => !/artistes|élève|:|\(/.test(a))), 'aucune phrase ni date dans les noms');
  assert.ok(!file.items.find((m) => m.id === 'M5026').art.includes('Joseph Vernet'), 'pas les peintres du site de Toulon');
});

test('v231 : du plus proche au plus loin ; entrée douteuse écartée', () => {
  const here = { lat: 48.8606, lng: 2.3376 };
  const list = museumsWith(file.items, 'Monet', here);
  assert.ok(list.every((m, i) => !i || list[i - 1].d <= m.d));
  const p = parseMusees({ updated: 'hier', items: [{ n: 'Faux', lat: 45.7, lng: 4.8, url: 'https://x.fr', art: ['Monet'] }, { n: 'Sans site', lat: 48.86, lng: 2.33, url: 'javascript:alert(1)', art: ['Monet'] }] });
  assert.equal(p.updated, '');
  assert.equal(p.items.length, 1, 'hors de Paris : écarté');
  assert.equal(p.items[0].url, '', 'lien non https : retiré');
  assert.equal(parseMusees(null).items.length, 0);
});

test('v231 : la liste des musées fermés est la même pour Monuments et pour les artistes (un seul CLOSED)', () => {
  const py = readFileSync(new URL('../tools/maj-merimee.py', import.meta.url), 'utf8');
  assert.equal((py.match(/^CLOSED = /gm) ?? []).length, 1);
});
