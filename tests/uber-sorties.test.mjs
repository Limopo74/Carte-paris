// v334 (mon choix 2A du 20 nov.) : « Uber jusqu'ici » aussi en bas de la page d'une sortie et d'un musée, d'une galerie, d'une salle.
// Une seule ligne pour tous (uberRow), masquée partout par Réglages → Autres réglages → Fiche d'un lieu.
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const app = readFileSync(new URL('../js/app.js', import.meta.url), 'utf8');
const body = (start, end) => app.slice(app.indexOf(start), app.indexOf(end, app.indexOf(start)));

test('Uber : une seule ligne pour la fiche, les sorties et les salles, qui suit le réglage de la fiche', () => {
  const row = body('const uberRow = ', '\n// ');
  assert.match(row, /!ficheShows\('uber'\)/, 'masquée partout quand elle est masquée dans la fiche');
  assert.match(row, /Number\.isFinite\(p\?\.lat\)/, 'pas de ligne sans position');
  assert.equal((app.match(/uberUrl\(/g) || []).length, 1, 'le lien Uber ne se fabrique qu\'à un endroit');
});

test('Uber : en bas de la page d\'une sortie, sous Suivre ce lieu, avant les petites lignes', () => {
  const page = body('function openEventPage(', '\n}\n');
  const uber = page.indexOf('uberRow(e)');
  assert.ok(uber > 0, 'la page d\'une sortie a Uber');
  assert.ok(uber > page.indexOf('Suivre ce lieu'), 'sous Suivre ce lieu');
  assert.ok(uber < page.indexOf('Horaires et prix'), 'avant les petites lignes');
  assert.match(page, /name: e\.place \|\| e\.title/, 'destination nommée par la salle');
});

test('Uber : en bas des pages à Favori (musée, galerie, salle, théâtre), pas sur une fontaine ni une station Vélib\'', () => {
  const spot = body('function openSpot(', '\n}\n');
  assert.match(spot, /fav && uberRow\(place\)/);
  assert.ok(spot.indexOf('uberRow(') > spot.indexOf('link ?'), 'sous le lien du site, rien ne bouge au-dessus');
  assert.ok(spot.indexOf('uberRow(') < spot.indexOf('foot(backBtn'), 'avant le retour');
});

test('Réglages → Fiche d\'un lieu dit qu\'Uber se masque aussi dans les sorties et les salles', () => {
  assert.match(app, /\['uber', 'car-taxi-front', 'Uber jusqu\\'ici', 'Fiche, sorties, salles'\]/);
});
