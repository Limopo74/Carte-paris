// TTB trié par rubrique ou budget (v287, mon choix 1A du 20 nov.) : les puces de la liste TTB trient aussi la carte ;
// liste fermée, l'étiquette sous la barre du haut le dit (« Seulement La Table · Tout voir »), un appui remet tout.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { ttbFilterText } from '../js/ttb.js';

const app = readFileSync(new URL('../js/app.js', import.meta.url), 'utf8');

test('TTB trié : le texte de l\'étiquette dit la rubrique ou le budget choisi', () => {
  assert.equal(ttbFilterText(new Set(), new Set()), '');
  assert.equal(ttbFilterText(new Set(['La Table']), new Set()), 'La Table');
  assert.equal(ttbFilterText(new Set(), new Set([2])), '€€');
  assert.equal(ttbFilterText(new Set(['La Table', 'Cave']), new Set()), '2 rubriques');
  assert.equal(ttbFilterText(new Set(['Boui-boui']), new Set([1, 2])), 'Boui-boui, 2 budgets');
});

test('TTB trié : l\'étiquette du haut existe, passe juste après celle des passages, et un appui remet tout avec « Annuler »', () => {
  assert.match(app, /const layerNoteNow = \(\) => \(ESSAI \? [^\n]*?\) \?\? arcadeNoteNow\(\) \?\? ttbNote\(\) \?\?/); // v315 : l'essai du premier lancement passe avant tout
  assert.match(app, /const ttbNote = [\s\S]{0,120}state\.showTtb && ttbList\(\)\.length && \(ttbRubs\.size \|\| ttbBudgets\.size\)/);
  const click = app.slice(app.indexOf("n?.act === 'ttb'"), app.indexOf("n?.act === 'ttb'") + 700);
  assert.match(click, /ttbRubs\.clear\(\); ttbBudgets\.clear\(\)/);
  assert.match(click, /label: 'Annuler'/);
  // La carte suit : chaque dessin des ronds TTB redessine l'étiquette, aussi quand TTB s'éteint
  const draw = app.slice(app.indexOf('function drawTtb()'), app.indexOf('function toggleTtb()'));
  assert.equal((draw.match(/drawLayerNote\(\)/g) ?? []).length, 2);
});

test('TTB trié : Filtres annonce l\'appui long, seulement quand le bouton TTB est dans la barre, ou allumé (v287, mon choix 2A)', () => {
  const row = app.slice(app.indexOf("sw(Boolean(state.showTtb), ttbDotFor(''), 'TTB',"), app.indexOf("sw(Boolean(state.showTtb), ttbDotFor(''), 'TTB',") + 400);
  assert.match(row, /chipPlace\(\)\('ttb'\) === 'bar' \|\| state\.showTtb \? 'Appui long en haut : trier' : `\$\{plural\(ttbList\(\)\.length, 'adresse', 'adresses'\)\} du guide`/);
  assert.match(app, /'\*\*La liste\*\* : appui long sur TTB en haut, Autour de moi → Liste TTB/);
});
