// v172 : « Vouliez-vous dire… ? » sous le champ Artiste, et « Chercher ce nom ».
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { artistSuggest, artistSearchUrl } from '../js/art.js';

const names = ['Invader', 'Miss.Tic', 'JR', 'Jérôme Mesnager', 'Speedy Graphito', 'Seth', 'invader'];

test('propose des noms connus proches : autre écriture, début, fautes de frappe, un mot du nom', () => {
  assert.deepEqual(artistSuggest('invader', names), ['Invader']);
  assert.deepEqual(artistSuggest('Invadr', names), ['Invader']);
  assert.deepEqual(artistSuggest('miss', names), ['Miss.Tic']);
  assert.deepEqual(artistSuggest('Speedy Grafito', names), ['Speedy Graphito']);
  assert.deepEqual(artistSuggest('Mesanger', names), ['Jérôme Mesnager']);
  assert.ok(artistSuggest('Sth', names).includes('Seth'));
});

test('rien quand le nom est déjà juste, trop court ou sans voisin (jamais « inconnu »)', () => {
  assert.deepEqual(artistSuggest('Invader', names), []);
  assert.deepEqual(artistSuggest('jr', names), [], 'moins de 3 lettres');
  assert.deepEqual(artistSuggest('Banksy', names), []);
  assert.deepEqual(artistSuggest('', names), []);
  assert.deepEqual(artistSuggest('Invadr', []), []);
  assert.ok(artistSuggest('inv', names).length <= 3);
});

test('chercher ce nom : une recherche Google, le nom encodé', () => {
  assert.equal(artistSearchUrl(' Miss.Tic '), 'https://www.google.com/search?q=Miss.Tic%20street%20art');
  assert.ok(artistSearchUrl('a&b=c').includes('a%26b%3Dc'));
});
