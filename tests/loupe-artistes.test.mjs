import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { searchArtists } from '../js/search.js';

// v373 (mon choix A du 21 nov.) : la loupe propose les noms de Mes artistes.
test('Loupe : Mes artistes, sans accents ni majuscules, tous les mots, rien sous 2 lettres', () => {
  const mine = ['Claude Monet', 'Niki de Saint Phalle', 'David Hockney', 'Édouard Manet'];
  assert.deepEqual(searchArtists(mine, 'monet'), ['Claude Monet']);
  assert.deepEqual(searchArtists(mine, 'EDOUARD'), ['Édouard Manet']);
  assert.deepEqual(searchArtists(mine, 'niki phalle'), ['Niki de Saint Phalle']);
  assert.deepEqual(searchArtists(mine, 'niki monet'), [], 'tous les mots');
  assert.deepEqual(searchArtists(mine, 'a'), [], 'une lettre : rien');
  assert.deepEqual(searchArtists(mine, '  '), []);
  assert.deepEqual(searchArtists(undefined, 'monet'), []);
  const app = readFileSync(new URL('../js/app.js', import.meta.url), 'utf8');
  assert.match(app, /input, artistBox, info, list/, 'en tête des résultats');
  assert.match(app, /onclick: \(\) => openArtist\(n, backHere\)/, 'un appui ouvre la page de l\'artiste, retour à la recherche');
});
