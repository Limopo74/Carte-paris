// v237 : la page d'un passage couvert reconnaît mon lieu (« Ma fiche » et ma photo à la place d'« Ajouter »).
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { myArcadePlace, ARCADE_MINE_M } from '../js/passages.js';
import { distanceM } from '../js/geo.js';

const choiseul = { nom: 'Passage Choiseul', lat: 48.86807, lng: 2.33556 };
const at = (dLat, extra = {}) => ({ id: 'x', name: 'Passage Choiseul', lat: choiseul.lat + dLat, lng: choiseul.lng, ...extra });

test('mon lieu au même nom, sur place : reconnu', () => {
  const p = at(0);
  assert.equal(myArcadePlace([p], choiseul), p);
});

test('nom raccourci ou allongé, accents et majuscules : reconnu', () => {
  assert.ok(myArcadePlace([at(0, { name: 'choiseul' })], choiseul));
  assert.ok(myArcadePlace([at(0, { name: 'Passage Choiseul, la librairie' })], choiseul));
  assert.ok(myArcadePlace([{ name: 'passage du bourg-l\'abbe', lat: 48.8640, lng: 2.3520 }], { nom: 'Passage du Bourg-l\'Abbé', lat: 48.8640, lng: 2.3520 }));
});

test('un autre nom, même tout près : pas reconnu (la page garde « Ajouter »)', () => {
  assert.equal(myArcadePlace([at(0, { name: 'Galeries de Choiseul' })], choiseul), null);
  assert.equal(myArcadePlace([at(0, { name: 'Café du coin' })], choiseul), null);
});

test('« Passage » ou « Galerie » seuls ne suffisent pas', () => {
  assert.equal(myArcadePlace([at(0, { name: 'Passage' })], choiseul), null);
  assert.equal(myArcadePlace([at(0, { name: 'galerie' })], choiseul), null);
});

test('au-delà de 60 m : pas reconnu ; le plus proche gagne', () => {
  const loin = at(0.0007); // environ 78 m
  assert.ok(distanceM(loin, choiseul) > ARCADE_MINE_M);
  assert.equal(myArcadePlace([loin], choiseul), null);
  const pres = at(0.0001, { id: 'pres' }); const moins = at(0.0004, { id: 'moins' });
  assert.equal(myArcadePlace([moins, pres], choiseul).id, 'pres');
});

test('le lieu d\'un proche n\'est pas « Ma fiche »', () => {
  assert.equal(myArcadePlace([at(0, { owner: 'Léa' })], choiseul), null);
});

test('données abîmées : rien, sans erreur', () => {
  assert.equal(myArcadePlace(null, choiseul), null);
  assert.equal(myArcadePlace([null, { name: 'Passage Choiseul' }], choiseul), null);
  assert.equal(myArcadePlace([at(0)], {}), null);
});

test('chacun des 12 passages reconnaît un lieu à son nom exact', () => {
  const items = JSON.parse(readFileSync(new URL('../data/passages.json', import.meta.url), 'utf8')).items;
  for (const a of items) assert.ok(myArcadePlace([{ name: a.nom, lat: a.lat, lng: a.lng }], a), a.nom);
});

test('app.js : « Ma fiche » remplace « Ajouter » et « La photo ici » (« Y ajouter la photo » avant la v297) dans l\'alerte de doublon', () => {
  const app = readFileSync(new URL('../js/app.js', import.meta.url), 'utf8');
  assert.match(app, /mine: myArcadePlace\(state\.points, a\)/);
  assert.match(app, /'Ma fiche'\)/);
  assert.match(app, /'La photo ici'\)/);
});

test('v238 : « Prendre une photo » sur la page d\'un passage, Culture au lieu de la 1re catégorie', () => {
  const app = readFileSync(new URL('../js/app.js', import.meta.url), 'utf8');
  assert.match(app, /c\.id === 'culture'\) \? 'culture' : null/);
  assert.match(app, /snap: \(\) => arcadePhoto\(a, back, add\)/);
  assert.match(app, /ico\('camera', \{ size: 28 \}\), el\('span', \{\}, 'Prendre une photo'\)\)/);
  assert.match(app, /mine \? spotPhoto\(mine\) : null,\n    !\(mine\?\.photos\?\.length\) && snap/);
  assert.match(app, /label: 'Annuler'.*\n.*state\.points = state\.points\.filter\(\(p\) => p !== np\)/);
});
