// Street art (v161) : l'artiste d'un lieu, son lien, la catégorie Street art, « Disparue ou recouverte ».
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { artistKey, cleanArtist, artistWorks, knownArtists, linkFrom, cleanArtistLinks } from '../js/art.js';
import { STREET_CAT, SEEN_CAT, isStreetCat, streetCatId, withStreetCat, canVanish, lastSeen, memoryHere, momentHere } from '../js/passage.js';
import { loadState, saveState, exportJSON, mergeImport, newPoint, backupHash, ICONS, PRESETS } from '../js/store.js';
import { searchPoints } from '../js/search.js';
import { EMOJI_ICON, ICON_SVG } from '../js/icons.js';

const mem = () => { const m = new Map(); return { getItem: (k) => m.get(k) ?? null, setItem: (k, v) => m.set(k, String(v)) }; };
const DAY = 864e5;

test('nom d\'artiste : même artiste sans accents, majuscules ni ponctuation', () => {
  assert.equal(artistKey('Miss.Tic'), artistKey('miss tic'));
  assert.equal(artistKey('Zoé  Rodin'), artistKey('zoe rodin'));
  assert.equal(cleanArtist('  Invader  '), 'Invader');
  assert.equal(cleanArtist('x'), '', 'une lettre ne fait pas un nom');
  assert.equal(cleanArtist(42), '');
});

test('les œuvres d\'un artiste : les disparues à la fin, puis de la plus proche à la plus loin', () => {
  const here = { lat: 48.85, lng: 2.35 };
  const pts = [
    { id: 'a', name: 'Loin', artist: 'Invader', lat: 48.86, lng: 2.35 },
    { id: 'b', name: 'Près', artist: 'invader', lat: 48.851, lng: 2.35 },
    { id: 'c', name: 'Partie', artist: 'INVADER', lat: 48.8501, lng: 2.35, gone: Date.now() },
    { id: 'd', name: 'Autre', artist: 'Miss.Tic', lat: 48.85, lng: 2.35 },
    { id: 'e', name: 'Sans artiste', lat: 48.85, lng: 2.35 },
  ];
  assert.deepEqual(artistWorks(pts, 'Invader', here).map((x) => x.p.id), ['b', 'a', 'c']);
  assert.deepEqual(artistWorks(pts, 'invader').map((x) => x.p.id), ['a', 'b', 'c'], 'sans position : par nom, disparues à la fin');
  assert.deepEqual(artistWorks(pts, ''), []);
  assert.deepEqual(knownArtists(pts, ['JR', 'miss tic']), ['Invader', 'JR', 'Miss.Tic']);
});

test('lien d\'un artiste : https ou Instagram seulement', () => {
  assert.equal(linkFrom('@invader_was_here'), 'https://www.instagram.com/invader_was_here/');
  assert.equal(linkFrom('https://www.instagram.com/misstic/'), 'https://www.instagram.com/misstic/');
  assert.equal(linkFrom('instagram.com/jr'), 'https://www.instagram.com/jr/');
  assert.equal(linkFrom('space-invaders.com'), 'https://space-invaders.com');
  assert.equal(linkFrom('https://exemple.fr/a?b=1'), 'https://exemple.fr/a?b=1');
  for (const bad of ['http://exemple.fr', 'javascript:alert(1)', 'data:text/html,x', 'exemple', 'un site', '', null, 'https://a b.fr']) assert.equal(linkFrom(bad), '', String(bad));
  const links = cleanArtistLinks({ x: { n: 'Invader', u: 'https://space-invaders.com' }, y: { n: 'JR', u: 'javascript:alert(1)' }, z: { n: '', u: 'https://a.fr' }, w: 'texte' });
  assert.deepEqual(links, { invader: { n: 'Invader', u: 'https://space-invaders.com' } });
  assert.deepEqual(cleanArtistLinks(null), {});
});

test('catégorie Street art : la mienne si elle existe, sinon créée une fois', () => {
  assert.ok(isStreetCat({ id: 'x', name: 'Street-art' }));
  assert.ok(isStreetCat({ id: 'x', name: 'Art urbain' }));
  assert.ok(isStreetCat({ id: 'x', name: 'Graffitis' }));
  assert.ok(!isStreetCat({ id: 'x', name: 'Restos' }));
  assert.equal(streetCatId([{ id: 'r', name: 'Restos' }, { id: 'm', name: 'Mon street art' }]), 'm');
  const s0 = { categories: [{ id: 'r', name: 'Restos', color: '#d9480f', icon: '🍽️' }] };
  const s1 = withStreetCat(s0);
  assert.equal(streetCatId(s1.categories), STREET_CAT.id);
  assert.equal(withStreetCat(s1), s1, 'pas deux fois');
  assert.ok(ICONS.includes(STREET_CAT.icon), 'son icône est permise');
  assert.equal(EMOJI_ICON[STREET_CAT.icon], 'palette');
  assert.ok(ICON_SVG['eye-off'] && ICON_SVG.palette);
  assert.ok(PRESETS.some((p) => p.name === 'Street art'));
});

test('« Encore là ? » : qui peut disparaître, et le dernier jour vu', () => {
  const cats = [{ id: 'r', name: 'Restos' }, { id: 'sa', name: 'Street art' }];
  assert.ok(canVanish({ cat: SEEN_CAT.id }, cats));
  assert.ok(canVanish({ cat: 'sa' }, cats));
  assert.ok(canVanish({ cat: 'r', artist: 'JR' }, cats), 'un lieu dont l\'artiste est noté');
  assert.ok(!canVanish({ cat: 'r' }, cats), 'pas un restaurant');
  const t0 = Date.UTC(2026, 2, 3);
  assert.equal(lastSeen({ created: t0 }), t0);
  assert.equal(lastSeen({ created: t0, visited: t0 + DAY, passages: [{ at: t0 + 5 * DAY }, { at: t0 + 2 * DAY }] }), t0 + 5 * DAY);
  assert.equal(lastSeen({}), null);
});

test('une œuvre disparue n\'est plus rappelée par « Maintenant »', () => {
  const pos = { lat: 48.85, lng: 2.35 };
  const now = Date.now();
  const p = { id: 'a', name: 'Mosaïque', lat: 48.85, lng: 2.35, note: 'jaune', created: now - 30 * DAY, moments: ['matin', 'soir', 'midi', 'weekend'] };
  assert.equal(memoryHere([p], pos, {}, now)?.p.id, 'a');
  assert.equal(memoryHere([{ ...p, gone: now }], pos, {}, now), null);
  const at = new Date(2026, 10, 21, 9); // un samedi matin
  assert.equal(momentHere([p], pos, at)?.p.id, 'a');
  assert.equal(momentHere([{ ...p, gone: now }], pos, at), null);
});

test('artiste, disparition et liens : gardés, sauvegardés, rendus par ma sauvegarde', () => {
  const st = mem();
  const s0 = loadState(st);
  assert.deepEqual(s0.artistLinks, {});
  const hash0 = backupHash(s0);
  const p = newPoint({ name: 'Space Invader PA_1500', cat: s0.categories[0].id, lat: 48.86, lng: 2.35 });
  p.artist = '  Invader '; p.gone = Date.UTC(2026, 10, 18);
  const q = newPoint({ name: 'Sans', cat: s0.categories[0].id, lat: 48.86, lng: 2.35 });
  q.artist = 'x'; q.gone = 'hier';
  s0.points.push(p, q);
  s0.artistLinks = { a: { n: 'Invader', u: 'https://space-invaders.com' }, b: { n: 'JR', u: 'http://jr-art.net' } };
  saveState(st, s0);
  const s1 = loadState(st);
  const [p1, q1] = s1.points;
  assert.deepEqual([p1.artist, p1.gone], ['Invader', Date.UTC(2026, 10, 18)]);
  assert.ok(!('artist' in q1) && !('gone' in q1), 'un nom trop court ou une date fausse ne sont pas gardés');
  assert.deepEqual(Object.keys(s1.artistLinks), ['invader']);
  const file = exportJSON(s1);
  const back = mergeImport(loadState(mem()), file).state;
  assert.equal(back.points.find((x) => x.id === p.id).artist, 'Invader');
  assert.equal(back.artistLinks.invader.u, 'https://space-invaders.com');
  assert.deepEqual(mergeImport(loadState(mem()), file, 'Léa').state.artistLinks, {}, 'les liens d\'un proche restent les siens');
  assert.ok(!('artistLinks' in JSON.parse(exportJSON(loadState(mem())))), 'rien d\'écrit sans lien');
  assert.equal(backupHash(loadState(mem())), hash0, 'l\'empreinte d\'une appli sans lien ne change pas');
});

test('la loupe trouve une œuvre par son artiste', () => {
  const pts = [{ id: 'a', name: 'Mosaïque jaune', artist: 'Invader', note: '', address: '', cat: 'sa', lat: 48.85, lng: 2.35 }];
  assert.equal(searchPoints(pts, [{ id: 'sa', name: 'Street art' }], 'invader').length, 1);
});
