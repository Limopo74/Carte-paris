// v360 (ma demande du 21 nov., mon choix B) : ⋯ à côté de la flèche de mise à jour, dans le titre de Réglages, ouvre Autres réglages.
// Il vient après la flèche (v342). Pas la roue : elle répétait l'icône de Réglages (ma remarque du 21 nov.).
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const app = readFileSync(new URL('../js/app.js', import.meta.url), 'utf8');
const i = app.indexOf("openSheet([ico('settings'), ' Réglages',");
const titre = app.slice(i, app.indexOf("el('div', { class: 'menu' }", i));

test('⋯ du titre de Réglages ouvre Autres réglages, après la flèche de mise à jour', () => {
  assert.ok(i > 0);
  const maj = titre.indexOf("'aria-label': 'Mettre à jour l\\'appli'");
  const pts = titre.search(/class: 'title-maj', 'aria-label': 'Autres réglages'[^\n]*onclick: \(\) => openSettings\('autres'\) \}, ico\('ellipsis', \{ size: 18 \}\)/);
  assert.ok(maj > 0 && pts > maj, '⋯ suit la flèche');
});
