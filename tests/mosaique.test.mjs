// v306 (mes choix du 20 nov.) : « Mes Vu en passant », la mosaïque de mes photos prises en passant (+ Ajouter, sous le
// bouton Vu en passant, avec leur nombre) ; une vignette par catégorie, puis ses sous-catégories ou ses artistes, une à la
// fois ; un appui ouvre le diaporama en grand, avec une légende et « Voir la fiche ». Exception de la charte § 7 bis.
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const app = readFileSync(new URL('../js/app.js', import.meta.url), 'utf8');
const charte = readFileSync(new URL('../CHARTE.md', import.meta.url), 'utf8');
const page = app.slice(app.indexOf('function openSeenPhotos('), app.indexOf('/* ---------- Vu en passant (v157)'));

test('Mes Vu en passant : dans + Ajouter, sous le bouton qui prend les photos, avec leur nombre', () => {
  const add = app.slice(app.indexOf('function openAddChoice()'), app.indexOf("'À ma position'"));
  assert.match(add, /onclick: captureSeen \}, ico\('camera'\), 'Vu en passant'\)[\s\S]*openSeenPhotos\(back\)[\s\S]*`Mes Vu en passant · \$\{seenPhotoCount\(\)\}`/);
});

test('Seulement mes photos prises en passant (v310 : aussi celles rangées en impression), les plus récentes d\'abord ; jamais celles d\'un proche', () => {
  const items = app.slice(app.indexOf('function seenItems()'), app.indexOf('const seenPhotoCount'));
  assert.match(items, /if \(p\.owner\) continue;/);
  assert.match(items, /if \(isPass\(p\)\) for \(const id of p\.photos \?\? \[\]\)/);
  assert.match(items, /for \(const x of p\.passages \?\? \[\]\) if \(x\.pass && x\.photo\)/);
  assert.match(items, /return out\.sort\(\(a, b\) => \(b\.at/);
});

test('Vignettes par catégorie, puis sous-catégories ou artistes, une à la fois ; mosaïque ; diaporama', () => {
  assert.match(page, /tile\('Tout', all\.length/);
  assert.match(page, /isStreetCat\(catOf\(seenPick\.cat\)\)/);
  assert.match(page, /street \? 'Tous les artistes' : 'Toutes'/);
  assert.match(page, /class: 'seen-grid'/);
  assert.match(page, /openSeenSlides\(photos, i, again\)/);
  assert.match(page, /viewPhoto\(photos\.map\(\(x\) => x\.id\), i, 'Vu en passant', \{ caps, open:/);
  assert.match(app, /if \(e\.target\.closest\('\.viewer-cap button'\)\) \{ drag = null; return; \}/, '« Voir la fiche » n\'est pas pris pour un glissement');
});

test('La charte le permet (§ 7 bis, deuxième exception)', () => {
  assert.match(charte, /\*\*Deux exceptions\*\* : la vignette de mes « Vu en passant » sur la carte ; la page \*\*Mes Vu en passant\*\*/);
});
