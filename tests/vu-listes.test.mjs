// v302 (mon choix B du 20 nov., puis 1A et 2A) : dans Vu en passant, « Mes listes (facultatif) » tout en bas, le même bloc
// que dans Modifier ; les listes choisies restent pour la photo suivante (le temps de la session) ; Annuler | Enregistrer
// fixés dans la barre du bas, la feuille ouverte en grand.
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { newPoint } from '../js/store.js';

const app = readFileSync(new URL('../js/app.js', import.meta.url), 'utf8');
const seenForm = app.slice(app.indexOf('function openSeenForm('), app.indexOf('/** Ouvre le formulaire à une position'));

test('Vu en passant : le bloc Mes listes est celui de Modifier, sous Ranger dans et Artiste', () => {
  assert.match(app, /function listChooser\(lists\)/);
  assert.equal((app.match(/listChooser\(lists\)/g) ?? []).length, 3, 'défini une fois, utilisé dans Modifier et Vu en passant');
  const i = seenForm.indexOf('    sortBox,\n    artistBox,\n    listField,');
  assert.ok(i > 0, 'Mes listes juste sous Ranger dans et Artiste');
});

test('Vu en passant : la nouvelle note part avec ses listes, gardées pour la photo suivante', () => {
  assert.match(seenForm, /newPoint\(\{[^}]*lists: \[\.\.\.lists\] \}\)/);
  assert.match(seenForm, /seenLists = \[\.\.\.lists\];/);
  assert.match(seenForm, /seenLists \?\? \(filt\.lists\.size === 1/);
  assert.match(seenForm, /\.filter\(\(id\) => known\.has\(id\)\)/, 'une liste supprimée entre deux photos ne revient pas');
  assert.match(seenForm, /listField\.hidden = target !== 'new'/, 'ajoutée à une de mes adresses : pas de listes');
  assert.deepEqual(newPoint({ name: 'Porte', cat: 'vu', lat: 48.88, lng: 2.34, lists: ['l1', 'l2'] }).lists, ['l1', 'l2']);
});

test('Vu en passant : Annuler | Enregistrer dans la barre du bas, feuille en grand', () => {
  assert.match(seenForm, /foot\(el\('div', \{ class: 'row' \},[\s\S]*?'Annuler'\),\s*keep\)\)/);
  assert.match(seenForm, /\{ name: 'seen', tall: true \}/);
});
