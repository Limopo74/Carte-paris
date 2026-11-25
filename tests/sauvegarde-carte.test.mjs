// v469 (mon choix 2A du 25 nov.) : « Sauvegarder maintenant » en petit rond à côté du rond des fonds, seulement quand la sauvegarde est à faire.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const app = readFileSync(new URL('../js/app.js', import.meta.url), 'utf8');
const html = readFileSync(new URL('../index.html', import.meta.url), 'utf8');
const css = readFileSync(new URL('../css/style.css', import.meta.url), 'utf8');

test('le rond est caché au départ et suit la pastille de Réglages', () => {
  assert.match(html, /<button type="button" id="btnBackup" class="map-btn backup-btn" hidden aria-label="Sauvegarder maintenant \(sauvegarde à faire\)">/);
  assert.match(app, /if \(save\) save\.hidden = !due;/);
});

test('un appui sauvegarde (photos comprises), montre tout de suite un message, puis remet le rond à jour', () => {
  assert.match(app, /getElementById\('btnBackup'\)\.addEventListener\('click', async \(\) => \{\n\s+track\('Sauvegarder \(carte\)'\); waitToast\('Préparation de la sauvegarde…'\);\n\s+try \{ await saveBackup\(true\); \}/);
});

test('il se place à droite du rond des fonds, de l\'autre côté quand la colonne est à gauche, et se cache sous une page', () => {
  assert.match(css, /\.map-btn\.backup-btn \{ position: fixed; left: 64px; bottom: calc\(196px \+ var\(--safe-b\)\);/);
  assert.match(css, /body:has\(\.map-tools\.left\) \.map-btn\.backup-btn \{ left: auto; right: 64px; \}/);
});
