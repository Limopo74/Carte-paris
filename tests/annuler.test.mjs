// v300 : « Déjà visité » décoché, impression supprimée, sortie retirée de Mon planning : un message avec « Annuler » (mes choix 1A, 2A, 3A).
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { doneSnapshot, restoreDone, undoneText, addPassage, dropAutoPassage } from '../js/passage.js';
import { setDone } from '../js/store.js';

const MARS = new Date(2026, 2, 3, 15).getTime();
const fmt = (t) => new Date(t).toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' });

test('« Déjà visité » décoché puis « Annuler » : la date et les passages reviennent exactement', () => {
  const p = { id: 'a', done: true, visited: MARS, passages: [{ at: MARS }, { at: MARS - 864e5 * 40, text: 'La glycine' }] };
  const before = doneSnapshot(p);
  // ce que fait markDone(p, false)
  p.passages = dropAutoPassage(p.passages, p.visited);
  setDone(p, false);
  assert.equal(p.done, false);
  assert.equal(p.visited, null);
  assert.equal(p.passages.length, 1);
  restoreDone(p, before);
  assert.equal(p.done, true);
  assert.equal(p.visited, MARS);
  assert.deepEqual(p.passages, [{ at: MARS }, { at: MARS - 864e5 * 40, text: 'La glycine' }]);
});

test('la copie ne bouge pas si le lieu change entre-temps', () => {
  const p = { done: true, visited: MARS, passages: [{ at: MARS }] };
  const before = doneSnapshot(p);
  p.passages[0].text = 'changé';
  p.passages = addPassage(p.passages, { at: MARS + 864e5 * 10, text: 'autre' });
  restoreDone(p, before);
  assert.deepEqual(p.passages, [{ at: MARS }]);
});

test('un lieu sans date ni passage revient sans champ en trop', () => {
  const p = { done: true };
  const before = doneSnapshot(p);
  setDone(p, false);
  restoreDone(p, before);
  assert.deepEqual(p, { done: true });
});

test('le message dit ce qui part, avec la date quand elle est connue', () => {
  assert.equal(undoneText('Déjà visité', MARS, fmt), '« Déjà visité » retiré (noté le 3 mars 2026)');
  assert.equal(undoneText('Déjà goûté', null, fmt), '« Déjà goûté » retiré');
  assert.equal(undoneText('Déjà visité', undefined, fmt), '« Déjà visité » retiré');
});

test('les trois gestes portent « Annuler » ; cocher reste sans message', () => {
  const src = readFileSync(new URL('../js/app.js', import.meta.url), 'utf8');
  assert.match(src, /p\.done \? undoDone\(p, /, 'décocher passe par undoDone');
  assert.match(src, /toast\('Impression supprimée', false, \{ label: 'Annuler'/);
  assert.match(src, /toast\('Sortie retirée de Mon planning', false, \{ label: 'Annuler', fn: undo \}\)/);
  assert.match(src, /retiré de Mon planning`, false, \{ label: 'Annuler', fn: undo \}\)/);
  assert.doesNotMatch(src, /confirm\(`?.*Déjà visité/, 'pas de fenêtre de question');
});

test('icônes d\'état : rond vide ou plein pour « Déjà visité », cœur plein pour une salle suivie (v301, mes choix 1B et 3A)', async () => {
  const src = readFileSync(new URL('../js/app.js', import.meta.url), 'utf8');
  const { ICON_SVG, svgIcon } = await import('../js/icons.js');
  assert.match(src, /ico\(p\.done \? 'circle-check-full' : 'circle'\), didName/);
  assert.match(src, /ico\('heart', \{ filled: on \}\), on \? 'Suivie/);
  assert.ok(ICON_SVG.circle && ICON_SVG['circle-check-full']);
  assert.match(svgIcon('heart', { filled: true }), /fill="currentColor"/);
});
