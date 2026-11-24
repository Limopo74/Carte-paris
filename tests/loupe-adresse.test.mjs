import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { looksLikeAddress } from '../js/adresse.js';

// v378 (mes choix 1A 2A 3A du 24 nov.) : une adresse dans la loupe.
test('Loupe : un mot de voie entier, avec ou sans numéro, fait une adresse', () => {
  for (const q of ['12 rue de Rivoli', 'rue de Rivoli', 'Place de la Concorde', '5 bd Saint-Michel', '3 av. Foch', 'quai de Valmy',
    'Allée des Cygnes', 'impasse Robiquet', '8 cité Véron', 'Passage des Panoramas', '1 RUE DES ARCHIVES', "rue de l'Odéon"]) {
    assert.equal(looksLikeAddress(q), true, q);
  }
  for (const q of ['', '  ', 'rue', 'Rue ', 'monet', 'Louvre', 'Invader', '38', 'N14', 'ruelle', 'courses', 'Placette', 'Uniqlo Opéra']) {
    assert.equal(looksLikeAddress(q), false, q);
  }
});

test('Loupe : rien ne part à l\'IGN avant l\'appui ; une réponse ouvre la page de l\'adresse, retour à la recherche', () => {
  const app = readFileSync(new URL('../js/app.js', import.meta.url), 'utf8');
  const start = app.indexOf('function openSearch(');
  const body = app.slice(start, app.indexOf('\n}\n', start));
  const upd = body.slice(body.indexOf('const updateAddress'), body.indexOf('async function searchAddressHere'));
  assert.ok(upd.includes('looksLikeAddress(q)'), 'le bouton n\'apparaît que pour une adresse');
  assert.ok(!upd.includes('searchAddress('), 'en tapant, rien n\'est envoyé');
  assert.match(body, /onclick: \(\) => searchAddressHere\(\)/, 'l\'IGN seulement à l\'appui');
  assert.match(body, /onclick: \(\) => openAddressSpot\(r, back\)/);
  assert.match(app, /function openAddressSpot\(r, back\) \{\n  openSpot\(/, 'la page des passages : Y aller, Boussole, Métro, Ajouter');
  // 3A : la page « Nom ou adresse » de l'annuaire garde « Nouveau lieu » pour une adresse
  assert.match(app, /A\.map\(\(r\) => row\(r\.label, ROUGH\[r\.type\] \?\? null,\n\s+\(\) => openForm\(/);
});
