// v432 (mon choix 1A du 25 nov., maquette « Écouter ») : un haut-parleur dans l'en-tête lit le texte de la page à voix haute.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const app = readFileSync(new URL('../js/app.js', import.meta.url), 'utf8');
const css = readFileSync(new URL('../css/style.css', import.meta.url), 'utf8');
const icons = readFileSync(new URL('../js/icons.js', import.meta.url), 'utf8');
const body = (name) => {
  const start = app.search(new RegExp(`^(async )?function ${name}\\(`, 'm'));
  assert.ok(start >= 0, `${name} existe`);
  const next = app.slice(start + 10).search(/^(async )?function /m);
  return app.slice(start, next < 0 ? undefined : start + 10 + next);
};

test('écouter : le bouton est dans l\'en-tête, à gauche de ⌄, caché tant qu\'une page ne donne pas de texte', () => {
  assert.match(app, /const sheetListen = el\('button', \{ type: 'button', id: 'sheetListen', class: 'icon-btn', hidden: true/);
  assert.match(app, /sheetMin\.before\(sheetListen\);/);
  assert.match(body('setListen'), /sheetListen\.hidden = !listenText/);
  assert.match(body('setListen'), /canListen\(\)/, 'téléphone sans voix : pas de bouton');
});

test('écouter : chaque page remet le bouton, la fermeture arrête la lecture', () => {
  assert.match(body('openSheet'), /listen = null \}/);
  assert.match(body('openSheet'), /setListen\(listen\);/);
  assert.match(body('closeSheet'), /setListen\(null\);/);
  assert.match(body('setListen'), /silence\(\)/);
});

test('écouter : deux états par l\'icône (haut-parleur / carré), sans rien envoyer', () => {
  const d = body('drawListen');
  assert.match(d, /ico\(on \? 'square' : 'volume-2'\)/);
  assert.match(d, /'Arrêter la lecture' : 'Écouter'/);
  assert.match(d, /aria-pressed/);
  assert.match(icons, /^"square": /m);
  assert.match(css, /#sheetListen\[aria-pressed="true"\] \{ background: var\(--info-bg\); \}/);
  const t = body('toggleListen');
  assert.match(t, /new SpeechSynthesisUtterance\(said\)/);
  assert.doesNotMatch(t, /fetch|net\(|state\.voice/, 'rien envoyé ; un appui lit même Voix coupée');
});

test('écouter : étape de circuit (nom puis texte)', () => {
  assert.match(body('openCircuitStep'), /listen: e\.t \? sayJoin\(\[e\.n, e\.t\]\) : null/);
  assert.match(body('openSpot'), /onClose: closing, listen \}\);/);
});

test('écouter (v437, mon choix 2A) : plaque, passage couvert, Où suis-je ? ; rien d\'autre', () => {
  assert.match(body('openPlaque'), /listen: sayJoin\(\[p\.t, p\.x, /);
  assert.match(body('openArcade'), /listen: sayJoin\(\[a\.nom, a\.t, /);
  const w = body('openWhereAmI');
  assert.match(w, /const listen = \(\) => sayJoin\(\[addrText, arrLine\.textContent/, 'lu au moment de l\'appui : l\'adresse arrive après');
  assert.match(w, /\{ name: 'where', again: openWhereAmI, listen \}/);
  assert.match(body('toggleListen'), /typeof listenText === 'function' \? listenText\(\) : listenText/);
  assert.equal((app.match(/\blisten: /g) ?? []).length, 3, 'étape, plaque, passage (Où suis-je ? passe par openSheet)');
});

test('écouter : la fin d\'une lecture arrêtée ne remet pas « Écouter » pendant la suivante', () => {
  assert.match(body('toggleListen'), /listenUtter = u;/);
  assert.match(body('toggleListen'), /if \(u === listenUtter\) drawListen\(false\)/);
});

test('écouter : jamais deux points de suite', () => {
  const src = app.match(/const sayJoin = (\(parts\) => [^\n]+);/)?.[1];
  assert.ok(src, 'sayJoin existe');
  const sayJoin = eval(src);
  assert.equal(sayJoin(['Passage Choiseul', 'Céline y a passé son enfance.', '', null, 'Entrées : rue X']), 'Passage Choiseul. Céline y a passé son enfance. Entrées : rue X');
});
