// v329 (mes choix A + B, 1A 2B 3A du 20 nov., maquette) : Mes Vu en passant avec la plus récente « à la une », les autres
// rangées par jour (« Date inconnue » à la fin) ; toutes les photos en grand ont une croix, « 1 / 2 », une pellicule et un cartel.
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const app = readFileSync(new URL('../js/app.js', import.meta.url), 'utf8');
const css = readFileSync(new URL('../css/style.css', import.meta.url), 'utf8');
const html = readFileSync(new URL('../index.html', import.meta.url), 'utf8');
const page = app.slice(app.indexOf('function openSeenPhotos('), app.indexOf('function openSeenExport('));
const days = app.slice(app.indexOf('function seenDays('), app.indexOf('function openSeenPhotos('));
const show = app.slice(app.indexOf('function showViewerPhoto('), app.indexOf('async function stepViewer('));

test('Onglets texte (plus de vignettes en double), la plus récente à la une, puis les autres par jour', () => {
  assert.match(page, /class: 'tabs-line seen-tabs'/);
  assert.doesNotMatch(page, /seen-tile/);
  assert.match(page, /const top = photos\[0\]/);
  assert.match(page, /openSeenSlides\(photos, 0, again\)/);
  assert.match(page, /seenDays\(photos\.slice\(1\)/);
  assert.doesNotMatch(page, /Mon carnet de rue/, 'choix 1A : pas de surtitre');
});

test('Par jour, du plus récent ; « Date inconnue » à la fin ; jamais une date inventée', () => {
  assert.match(days, /let label = 'Date inconnue';/);
  assert.match(days, /if \(k >= 0\) out\.push\(\.\.\.out\.splice\(k, 1\)\)/);
  assert.match(app, /const date = at \? fullDate\(at\) : 'Date de la photo inconnue';/);
});

test('Toutes les photos en grand : la croix, « 1 / 2 », la pellicule, le cartel ; plus de « Touche pour fermer »', () => {
  assert.match(html, /class="viewer-close" aria-label="Fermer la photo"/);
  assert.match(html, /class="viewer-film"/);
  assert.doesNotMatch(html, /viewer-hint/);
  assert.doesNotMatch(app, /Touche pour fermer/);
  assert.match(show, /film\.hidden = !many;/);
  assert.match(show, /const c = viewerSet\.caps\?\.\[i\] \?\? \{ title: name \};/, 'ailleurs : le nom du lieu');
  assert.match(app, /if \(e\.target\.closest\('\.viewer button'\)\) \{ drag = null; return; \}/, 'la croix et la pellicule ne sont pas des glissements');
});

test('Supprimer à gauche, Voir la fiche (la plaque) à droite ; cibles d\'au moins 48 px', () => {
  assert.ok(show.indexOf("'Supprimer')") < show.indexOf("'Voir la fiche'"));
  assert.match(css, /\.viewer-close \{[^}]*width: var\(--h\); height: var\(--h\)/);
  assert.match(css, /\.viewer-film button \{[^}]*width: 56px; height: 56px/);
});
