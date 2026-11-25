// v494 : le petit point du coin en haut à droite change le style de l'appli en boucle.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const html = readFileSync(new URL('../index.html', import.meta.url), 'utf8');
const css = readFileSync(new URL('../css/style.css', import.meta.url), 'utf8');
const app = readFileSync(new URL('../js/app.js', import.meta.url), 'utf8');

test('point du style : un bouton nommé dans le coin, hors de la barre du haut', () => {
  assert.match(html, /<button type="button" id="lookDot" class="look-dot" aria-label="Changer le style de l'appli/);
  const top = html.slice(html.indexOf('<header class="top">'), html.indexOf('</header>'));
  assert.doesNotMatch(top, /lookDot/, 'le point ne pousse pas les boutons du haut');
  assert.match(css, /\.look-dot \{[^}]*position: fixed; top: 0; right: 0;/);
});

test('point du style : les quatre styles en boucle, et en sombre il passe en Clair', () => {
  const f = app.slice(app.indexOf('function nextLook()'), app.indexOf("addEventListener('click', nextLook)"));
  assert.match(f, /LOOKS\[\(LOOKS\.indexOf\(lookNow\(\)\) \+ 1\) % LOOKS\.length\]/);
  assert.match(f, /if \(isDark\(\)\) state\.theme = 'light';/);
  assert.match(f, /persist\(\); applyTheme\(\);/);
  assert.match(f, /toast\(`Style : \$\{LOOK_NAME\[k\]\}`\)/);
});
