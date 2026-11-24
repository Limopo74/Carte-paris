// v379 (ma demande du 24 nov., mon choix 5A) : toucher la photo d'un lieu la montre en grand (plus la page qui en ajoute) ;
// « Depuis ma galerie » en bas de Rangement, au-dessus de Supprimer.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const app = readFileSync(new URL('../js/app.js', import.meta.url), 'utf8');
const wide = app.slice(app.indexOf('function photoWide('), app.indexOf('function viewLieuPhotos('));

test('la photo de la fiche s\'ouvre en grand, pas dans la page des photos', () => {
  assert.ok(wide.includes('open ?? (() => viewLieuPhotos(p, 0, back))'));
  assert.ok(!wide.includes('openPhotos('), 'un appui ne propose plus de changer la photo');
  const v = app.slice(app.indexOf('function viewLieuPhotos('), app.indexOf('function galleryPhoto('));
  assert.match(v, /viewPhoto\(ids, i, p\.name, \{ del:/, 'Supprimer sous la photo, avec sa question');
});

test('v424 (mon choix 2A du 25 nov.) : plus de « Depuis ma galerie » dans Rangement ; la galerie reste sans appareil photo', () => {
  assert.ok(!app.includes("row('image-plus', 'Depuis ma galerie'"));
  const f = app.slice(app.indexOf('function galleryPhoto('), app.indexOf('function galleryPhoto(') + 700);
  assert.ok(f.includes("accept: 'image/*', multiple: true") && !f.includes('capture'));
});
