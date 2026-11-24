// Réglages → Boutons de la carte en trois groupes (v376, mes choix 1A 2A 3A 4A du 21 nov.) :
// la page suit l'écran, ↑ ↓ n'agissent que dans le groupe, la petite ligne seulement pour un bouton renommé,
// l'essentiel en bas sur une ligne ›.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { moveToolIn, normalizeTools } from '../js/store.js';

const app = readFileSync(new URL('../js/app.js', import.meta.url), 'utf8');
const page = app.slice(app.indexOf("if (section === 'outils') {"), app.indexOf("if (section === 'essentiel') {"));

test('Boutons de la carte (v376) : ↑ ↓ échangent avec le voisin du même groupe, les autres ne bougent pas', () => {
  const list = normalizeTools(['metro', 'pratique', 'sorties', 'velib', 'planning', 'locate']);
  const g = (t) => (['pratique', 'velib'].includes(t) ? 'more' : t === 'planning' ? 'hidden' : 'map');
  // Descendre Métro : il passe sous Sorties (Fontaine, dans Plus, reste à sa place)
  const a = moveToolIn(list, 'metro', 1, g);
  assert.deepEqual(a.filter((t) => t !== 'vu').slice(0, 3), ['sorties', 'pratique', 'metro']);
  // Monter Vélib' dans Plus : il passe devant Fontaine
  const b = moveToolIn(list, 'velib', -1, g);
  assert.deepEqual(b.filter((t) => g(t) === 'more'), ['velib', 'pratique']);
  assert.deepEqual(b.filter((t) => g(t) === 'map'), list.filter((t) => g(t) === 'map'), 'la colonne ne change pas');
  // Le premier d'un groupe ne monte pas, le dernier ne descend pas
  assert.deepEqual(moveToolIn(list, 'vu', -1, g), list);
  assert.deepEqual(moveToolIn(list, 'locate', 1, g), list);
});

test('Boutons de la carte (v376) : trois groupes dans l\'ordre de l\'écran, sans « Chaque bouton »', () => {
  const i = page.indexOf("['map', 'Sur la carte, de haut en bas']");
  assert.ok(i > 0 && page.indexOf("['more', 'Dans ⋯ Plus']") > i && page.indexOf("['hidden', 'Masqués']") > i);
  assert.ok(!page.includes("'Chaque bouton'"), 'l\'ancienne liste unique est partie');
  assert.ok(page.includes('moveToolIn(list, t, delta, whereOf)'), '↑ ↓ restent dans le groupe');
});

test('Boutons de la carte (v376) : la petite ligne seulement pour un bouton renommé', () => {
  assert.ok(page.includes("state.toolNames?.[t] ? el('span', { class: 'menu-sub' }, `nom d'origine : ${info.short}`) : null"));
  assert.ok(!page.includes('info.name)'), 'le nom long qui répétait le nom n\'est plus écrit');
});

test('Boutons de la carte (v376) : l\'essentiel en bas, sur une ligne › qui porte le nom de sa page', () => {
  const r = page.indexOf("'Raccourcis'");
  assert.ok(r > page.indexOf('groups,'), 'Raccourcis après les groupes');
  assert.ok(page.indexOf("'L\\'essentiel'") > r);
  assert.ok(page.indexOf("'Remettre mes boutons d\\'avant'") > r);
  assert.ok(!page.includes('applyEssential'), '« Ne garder que l\'essentiel » reste dans sa page');
  assert.ok(app.includes("openSheet([ico('check'), ' L\\'essentiel']"));
});
