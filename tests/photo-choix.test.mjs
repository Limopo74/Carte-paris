// v424 (ma demande du 25 nov., mes choix 1A 2A 3A) : le bouton « Photo » de la fiche ouvre une petite page,
// « Depuis ma galerie » au-dessus, « Prendre une photo » en plaque pleine en bas ; Rangement d'une photo prise en passant aussi.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const app = readFileSync(new URL('../js/app.js', import.meta.url), 'utf8');
const page = app.slice(app.indexOf('function choosePhoto('), app.indexOf('function quickPhoto('));

test('le bouton Photo de la fiche ouvre le choix, plus l\'appareil photo directement', () => {
  assert.match(app, /onclick: \(\) => choosePhoto\(p, back\), 'aria-label': 'Ajouter une photo' \}, ico\('camera'\), 'Photo'\)/);
  assert.ok(!/'Photo'\)[^\n]*quickPhoto|quickPhoto\(p, back\), 'aria-label'/.test(app));
});

test('la page : galerie au-dessus, appareil photo en seule plaque pleine, en bas, retour à la fiche', () => {
  const g = page.indexOf("'Depuis ma galerie'"), c = page.indexOf("'Prendre une photo'");
  assert.ok(g > 0 && c > g, 'galerie puis appareil photo');
  assert.equal((page.match(/ solid'/g) ?? []).length, 1, 'une seule plaque pleine');
  assert.ok(page.includes("class: 'btn big c-add solid', onclick: () => quickPhoto(p, back) }"));
  assert.ok(page.includes("onclick: () => galleryPhoto(p, back) }"));
  assert.ok(page.includes("'← Fiche'") && page.includes('foot('));
  assert.ok(page.includes('`photo-add:${p.id}`'), 'un nom d\'écran unique');
  assert.doesNotMatch(page, /MAX_PHOTOS/, 'la galerie et l’appareil photo restent accessibles quel que soit le nombre de photos');
});

test('Rangement d\'une photo prise en passant : « Ajouter une photo » ouvre la même page', () => {
  assert.match(app, /row\('camera', 'Ajouter une photo', null, \(\) => choosePhoto\(p, back\)\)/);
});

test('l\'aide ne cite plus Rangement → Depuis ma galerie', () => {
  assert.ok(!app.includes('Rangement → Depuis ma galerie'));
});
