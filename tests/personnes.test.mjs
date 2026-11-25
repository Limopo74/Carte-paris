// v457 : la page d'une personne relie tombe, plaques, rue à son nom et œuvres dans la rue par le nom complet (js/personnes.js).
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { isFullName, tombsOf, streetsOf, streetWorksOf, namesInTitle, personSub, personKey, groupWorks } from '../js/personnes.js';
import { cleanCimetieres } from '../js/cimetieres.js';
import { parseStreetArt } from '../js/art.js';

const read = (f) => JSON.parse(readFileSync(new URL(`../data/${f}`, import.meta.url), 'utf8'));
const cims = cleanCimetieres(read('cimetieres.json'));
const voies = read('voies.json').voies;
const art = parseStreetArt(read('oeuvres.json'));
const app = readFileSync(new URL('../js/app.js', import.meta.url), 'utf8');

test('nom complet : deux mots au moins ; un nom seul ne relie rien', () => {
  assert.ok(isFullName('Frédéric Chopin'));
  assert.ok(isFullName('Niki de Saint Phalle'));
  assert.ok(!isFullName('Rodin'));
  assert.ok(!isFullName('Colette'));
  assert.ok(!isFullName('Le Ny')); // deux mots trop courts
  assert.equal(personKey('Jean-Baptiste Pigalle'), 'jean baptiste pigalle');
  assert.deepEqual(tombsOf(cims, 'Chopin'), []);
  assert.deepEqual(streetsOf(voies, 'Rodin'), []);
  assert.deepEqual(streetWorksOf(art, 'Rodin'), []);
});

test('Chopin : sa tombe, la place à son nom (vraies données)', () => {
  const t = tombsOf(cims, 'Frédéric Chopin');
  assert.equal(t.length, 1);
  assert.equal(t[0].c.id, 'pere-lachaise');
  assert.equal(t[0].t.div, 11);
  assert.deepEqual(streetsOf(voies, 'Frédéric Chopin', t[0].t.years), ['place chopin']);
  assert.deepEqual(streetsOf(voies, 'frederic chopin'), ['place chopin']); // accents et majuscules ne comptent pas
});

test('rues : la phrase de la Ville doit parler de la personne, pas d\'un lieu ; les années de la tombe doivent concorder', () => {
  assert.deepEqual(streetsOf(voies, 'Victor Hugo'), ['avenue victor hugo', 'place victor hugo', 'villa victor hugo']); // « Marie Victor Hugo (1802-1885) »
  assert.deepEqual(streetsOf(voies, 'Frédéric Chopin', '1811-1849'), [], 'années différentes : un homonyme');
  const fake = { 'villa durand': 'Voisinage de la rue Paul Durand.', 'rue paul durand': 'Paul Durand (1850-1900), peintre.' };
  assert.deepEqual(streetsOf(fake, 'Paul Durand'), ['rue paul durand']);
  assert.deepEqual(streetsOf(fake, 'Paul Durand', '1850-1901'), []);
});

test('tombes : un nom porté par deux personnes différentes ne relie rien', () => {
  const two = [{ id: 'a', tombs: [{ name: 'Jean Dupont', div: 1, q: 'Q1' }] }, { id: 'b', tombs: [{ name: 'Jean Dupont', div: 2, q: 'Q2' }] }];
  assert.deepEqual(tombsOf(two, 'Jean Dupont'), []);
  const same = [{ id: 'a', tombs: [{ name: 'Jean Dupont', div: 1, q: 'Q1' }] }];
  assert.equal(tombsOf(same, 'Jean Dupont').length, 1);
});

test('œuvres dans la rue : le nom complet seulement, deux artistes séparés par « ; »', () => {
  assert.equal(streetWorksOf(art, 'Auguste Rodin').length, 9); // « Rodin » seul (27 œuvres) n'est pas relié : peut-être un autre
  assert.ok(streetWorksOf(art, 'Niki de Saint Phalle').length >= 16);
  assert.ok(streetWorksOf(art, 'Jean Tinguely').length >= 16);
});

test('titre d\'une plaque : chaque nom complet ; « ses plaques, sa rue »', () => {
  assert.deepEqual(namesInTitle('George Sand et Frédéric Chopin'), ['George Sand', 'Frédéric Chopin']);
  assert.deepEqual(namesInTitle('Molière'), []);
  assert.equal(personSub({ tomb: true, plaques: true, street: true }), 'Sa tombe, ses plaques, sa rue');
  assert.equal(personSub({ street: true }), 'Sa rue');
});

test('dans l\'appli : nom touchable en dernier (rien ne bouge au-dessus), seulement s\'il mène à autre chose', () => {
  const spot = app.slice(app.indexOf('function openSpot('), app.indexOf('\n}\n', app.indexOf('function openSpot(')));
  assert.ok(spot.indexOf('    tail,') > spot.indexOf('uberRow(place)') && spot.indexOf('    tail,') < spot.indexOf('foot(backBtn(back))'));
  const row = app.slice(app.indexOf('function personRow('), app.indexOf('\n}\n', app.indexOf('function personRow(')));
  assert.match(row, /f\.tombs\.length \|\| f\.streets\.length/, 'un titre de plaque seul ne suffit pas à faire une personne');
  assert.match(row, /if \(!Object\.values\(has\)\.some\(Boolean\)\) return null/);
  for (const fn of ['function openPlaque(', 'function openStreetArtCard(', 'async function openTombe(']) {
    const body = app.slice(app.indexOf(fn), app.indexOf('\n}\n', app.indexOf(fn)));
    assert.match(body, /tail: /, fn);
  }
  const page = app.slice(app.indexOf('async function openArtist('), app.indexOf('\n}\n', app.indexOf('async function openArtist(')));
  assert.match(page, /const artist = followed \|\| works\.length > 0 \|\| f\.works\.length > 0 \|\| museums\.length > 0/);
  assert.match(page, /\.\.\.\(artist \? \[\n\s+el\('h3', \{ class: 'fiche-sec' \}, 'Son site'\)/, 'Son site et Ses expos seulement pour un artiste');
  assert.match(page, /`Division \$\{tomb\.t\.div\}`/);
  assert.match(readFileSync(new URL('../sw.js', import.meta.url), 'utf8'), /'js\/personnes\.js'/);
});

test('œuvres : un groupe de statues de même nom tout proches = une ligne, avec leur nombre', () => {
  const g = groupWorks(streetWorksOf(art, 'Rachid Khimoune'));
  const enfants = g.find((x) => x.name === 'Les enfants du monde');
  assert.ok(enfants && enfants.n >= 10);
  assert.ok(g.length < streetWorksOf(art, 'Rachid Khimoune').length);
  assert.equal(groupWorks([{ name: 'A', lat: 48.85, lng: 2.35 }, { name: 'A', lat: 48.87, lng: 2.35 }]).length, 2, 'même nom, loin : deux œuvres');
});
