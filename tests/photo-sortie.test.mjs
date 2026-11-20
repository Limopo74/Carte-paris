// v279 (mon choix B du 20 nov.) : la photo de l'agenda en tête d'une sortie est un bandeau de 100 px, comme en tête d'un passage
// ou d'un jardin (84 en Grand, 60 en Très grand) : « Y aller » et ses boutons restent visibles à l'ouverture.
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const css = readFileSync(new URL('../css/style.css', import.meta.url), 'utf8');

test('Photo d\'une sortie : bandeau de 100 px, plus de 16:9', () => {
  assert.match(css, /\.ev-photo img \{[^}]*height: 100px;/);
  assert.doesNotMatch(css, /\.ev-photo img \{[^}]*aspect-ratio/);
  assert.match(css, /:root:is\(\[data-text="grand"\]\) \.ev-photo img \{ height: 84px; \}/);
  assert.match(css, /:root:is\(\[data-text="tresgrand"\]\) \.ev-photo img \{ height: 60px; \}/);
});
