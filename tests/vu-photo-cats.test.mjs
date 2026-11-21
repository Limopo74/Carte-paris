// v344 (mes choix du 21 nov.) : après la photo, seulement des catégories de photos : Vu en passant, Street art, Moments, Plats,
// Vues, Architecture, Insolite (créées à leur première photo, cochées au départ), et celles créées depuis Vu en passant.
// Plus les catégories de la carte, plus « Ajouter à : [un de mes lieux] » ; des exemples de sous-catégories en gris.
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { cleanCategories, ICONS } from '../js/store.js';
import { PHOTO_CATS, photoExamples, withPhotoCat } from '../js/passage.js';
import { EMOJI_ICON, svgIcon } from '../js/icons.js';

const app = readFileSync(new URL('../js/app.js', import.meta.url), 'utf8');
const seenForm = app.slice(app.indexOf('function openSeenForm('), app.indexOf('/** Ouvre le formulaire à une position'));
const vuPage = app.slice(app.indexOf("if (section === 'vu') {"), app.indexOf("{ tall: true, name: 'settings:vu'"));

test('Les cinq catégories de photos : noms, couleurs de la palette, icônes dessinées, exemples', () => {
  assert.deepEqual(PHOTO_CATS.map((c) => c.name), ['Moments', 'Plats', 'Vues', 'Architecture', 'Insolite']);
  assert.equal(new Set(PHOTO_CATS.map((c) => c.color)).size, 5);
  for (const c of PHOTO_CATS) {
    assert.ok(ICONS.includes(c.icon), c.name);
    assert.ok(svgIcon(EMOJI_ICON[c.icon]), `${c.name} : icône dessinée`);
    assert.equal(c.ex.length, 4);
  }
  assert.equal(photoExamples('vues'), 'Toits, Seine');
  assert.equal(photoExamples('culture'), '');
});

test('Créée à sa première photo, une seule fois, masquée dans la barre du haut, marquée « photo » et gardée', () => {
  const s0 = { categories: [{ id: 'resto', name: 'Restos', color: '#d9480f', icon: '🍽️' }], hiddenChips: [] };
  const s1 = withPhotoCat(s0, 'vues');
  assert.deepEqual(s1.categories.at(-1), { id: 'vues', name: 'Vues', color: '#1971c2', icon: '🌅', photo: true });
  assert.deepEqual(s1.hiddenChips, ['cat:vues']);
  assert.equal(withPhotoCat(s1, 'vues'), s1);
  assert.equal(withPhotoCat(s0, 'culture'), s0);
  assert.equal(cleanCategories(s1.categories).at(-1).photo, true);
  assert.equal(cleanCategories([{ id: 'x', name: 'X', color: '#123456', photo: 'oui' }])[0].photo, undefined);
});

test('Après la photo : plus les catégories de la carte, plus « Ajouter à » un lieu proche', () => {
  assert.match(app, /const presets = PHOTO_CATS\.map/);
  assert.ok(!seenForm.includes('placeNear') && !seenForm.includes('Ajouter à :') && !seenForm.includes('target'), 'la photo va toujours dans une catégorie de photos');
  assert.match(seenForm, /cat = ensureSeenCat\(cat\);/);
  assert.match(seenForm, /const newCat = \(\) => newPhotoCat\(/);
  assert.match(app, /const newPhotoCat = \(back, done\) => openCategory\(null, \{ back, done: \(id\) => \{ state\.categories = state\.categories\.map\(\(c\) => \(c\.id === id \? \{ \.\.\.c, photo: true \} : c\)\)/);
});

test('Réglages → Vu en passant : exemples en gris, plus « aucune sous-catégorie », plus « Proposer une adresse proche »', () => {
  assert.ok(!app.includes('aucune sous-catégorie'));
  assert.ok(!vuPage.includes('seenNear'));
  assert.match(vuPage, /photoExamples\(c\.id\) \? `Ex\. : \$\{photoExamples\(c\.id\)\}`/);
  assert.match(vuPage, /newPhotoCat\(\(\) => openSettings\('vu'\)/);
  assert.match(app, /const subHint = \(id\) => \(photoExamples\(id\) \? `Ex\. : \$\{photoExamples\(id\)\}` : 'Un nom court'\);/);
  assert.equal((app.match(/placeholder: subHint\(/g) ?? []).length, 2);
});
