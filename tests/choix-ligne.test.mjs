// v356 : dans À l'ouverture (et « Sa carte » d'un proche), la ligne choisie est en surbrillance (fond léger, contour encre, CHARTE § 4).
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const css = readFileSync(new URL('../css/style.css', import.meta.url), 'utf8');

test('la ligne choisie d\'une liste de choix a un fond et un contour encre', () => {
  const m = css.match(/\.menu > \.menu-row\[role="radio"\]\[aria-checked="true"\]\s*\{([^}]*)\}/);
  assert.ok(m, 'règle absente');
  assert.match(m[1], /background:\s*var\(--info-bg\)/);
  assert.match(m[1], /border:\s*2px solid var\(--ink\)/);
});
