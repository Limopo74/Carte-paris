// v365 (mon choix A du 21 nov.) : un bouton direct plutôt qu'un chemin « Réglages → … » à lire, sur les pages et les avertissements.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const app = readFileSync(new URL('../js/app.js', import.meta.url), 'utf8');

test('plus de chemin à lire là où un bouton y mène', () => {
  for (const old of ['Une note sans lieu : ⋯ Plus', '+ Ajouter → Vu en passant : une photo', '(Réglages → Autres réglages → Photos dans Sorties)',
    'circuits n\\\'ont pas pu être chargés. Essaie', 'Leur place en haut : Réglages → Barre du haut',
    'Pour lui donner tes lieux : Réglages', 'Chaque catégorie prend une série : Réglages', 'ou Réglages → Autres réglages → Mise à jour et confidentialité → Données de l\'appli).`']) {
    assert.ok(!app.includes(old), old);
  }
});

test('les boutons sont là', () => {
  assert.match(app, /openDayNote\(named\('Mon journal', again\)\) \}, ico\('notebook-pen'\), 'Note du jour'\)/);
  assert.match(app, /onclick: captureSeen \}, ico\('camera'\), 'Vu en passant'\), \/\/ v365/);
  assert.match(app, /state\.evThumbs = true; persist\(\);/);
  assert.match(app, /const artFileBtn = /);
  assert.equal((app.match(/artFileBtn\(e\)/g) ?? []).length, 2);
  assert.match(app, /onclick: \(\) => openSettings\('barre'\) \}, ico\('panel-top'\), 'Barre du haut'\)/);
});
