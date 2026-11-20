// v309 (mon choix du 20 nov.) : + Ajouter → « Depuis une photo de ma galerie » propose « Vu en passant » ou « Un lieu, avec sa fiche »,
// à l'endroit lu dans la photo ; sa précision n'est pas connue : l'écran le dit, et le message propose « Déplacer ».
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const app = readFileSync(new URL('../js/app.js', import.meta.url), 'utf8');
const fromPhoto = app.slice(app.indexOf('function addFromPhoto()'), app.indexOf('/* ---------- Partager l\'appli elle-même'));

test('Le choix après la photo de la galerie', () => {
  assert.match(fromPhoto, /if \(!g\) \{ toast\('Cette photo ne contient pas de position/, 'sans position : comme avant');
  assert.match(fromPhoto, /openSeenForm\(blob, Promise\.resolve\(\{ lat: g\.lat, lng: g\.lng, acc: null, fromPhoto: true \}\)\)/);
  assert.match(fromPhoto, /'Vu en passant'\),\s*el\('button', \{ type: 'button', class: 'btn big c-add', onclick: asPlace \}, ico\('map-pin'\), 'Un lieu, avec sa fiche'\)/);
});

test('La position lue dans la photo est dite comme telle, jamais « précise »', () => {
  assert.match(app, /if \(r\.fromPhoto\) \{ posLine\.textContent = 'Position lue dans la photo : tu pourras déplacer le point\.'; return; \}/);
  assert.match(app, /const rough = !at\.fromPhoto && \(!at\.acc \|\| at\.acc > 50\);/);
  assert.match(app, /at\.fromPhoto \? `Gardé dans \$\{where2\} · position de la photo`/);
});
