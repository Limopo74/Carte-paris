// v459 : en Verre, le « Code couleur des boutons » (Réglages → Autres réglages → Mise à jour et confidentialité) montrait toutes les puces en encre, sans bande : aucune couleur.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const css = readFileSync(new URL('../css/style.css', import.meta.url), 'utf8');

test('Verre : chaque puce du code couleur prend la couleur de sa famille', () => {
  for (const [c, v] of [['c-metro', 'metro'], ['c-guide', 'guide'], ['c-add', 'add'], ['c-fav', 'fav'], ['c-info', 'info'], ['danger', 'danger']]) {
    assert.ok(css.includes(`:root[data-look="verre"] .legend-colors .btn.${c} { color: var(--${v}); }`), c);
  }
  assert.ok(css.includes(':root[data-look="verre"] .legend-colors .btn.primary { border-left-width: 2px; }'));
});
