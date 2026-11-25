// v459 (ma demande du 25 nov.) : glisser de côté sur la fenêtre de Sorties passe à l'onglet voisin, à toutes les hauteurs ;
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { swipeStep, swipeIndex } from '../js/photos.js';

const app = readFileSync(new URL('../js/app.js', import.meta.url), 'utf8');
const css = readFileSync(new URL('../css/style.css', import.meta.url), 'utf8');

test('le geste est celui des photos : de côté, au moins 48 px, et pas en diagonale', () => {
  assert.equal(swipeStep(-150, 0), 1); // vers la gauche : onglet suivant
  assert.equal(swipeStep(150, 10), -1);
  assert.equal(swipeStep(-20, -200), 0); // défilement vertical : rien
  assert.equal(swipeIndex(3, 4, 1), 3); // au bout, rien ne boucle
});

test('Sorties écoute le geste sur toute la fenêtre (barre du titre comprise), seulement sur sa page', () => {
  assert.match(app, /sheet\.addEventListener\('pointerdown'[^\n]*\n[^\n]*\n\s*sw = \(view === 'events' \|\| deckView\(\)\)/); // v518 : aussi la fiche d'une sortie ouverte depuis une liste
  assert.match(app, /sheet\.classList\.toggle\('swipe-tabs', name === 'events'\)/);
  assert.match(css, /\.sheet\.swipe-tabs \.sheet-body \{ touch-action: pan-y; \}/);
  // réduite, elle le reste, et un message dit l'onglet
  assert.match(app, /if \(mini && view === 'events'\) \{ setSheetMini\(true\); toast\(`Sorties : \$\{tabs\[j\]\[1\]\}`\); \}/);
  // les onglets du geste sont ceux affichés (Navigo masqué compris)
  assert.match(app, /evTabList\(\)\.map\(/);
});

