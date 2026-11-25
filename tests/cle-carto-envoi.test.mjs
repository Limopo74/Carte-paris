// v477 (mes choix 1A 2A 3A du 25 nov.) : « Envoyer ma clé » dans la page Clé CARTO (QR code ou lien …/#cle=…),
// et à l'arrivée « Garder » (ou « Remplacer » s'il a déjà une autre clé) ; sa carte ne change pas.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const app = readFileSync(new URL('../js/app.js', import.meta.url), 'utf8');
const between = (a, b) => app.slice(app.indexOf(a), app.indexOf(b, app.indexOf(a)));

test('le bouton est dans la page Clé CARTO, seulement avec une clé, sous les anciens boutons', () => {
  const page = between('function openCartoKey(', '\n}\n');
  const send = page.indexOf("'Envoyer ma clé'");
  assert.ok(send > page.indexOf("'Retirer la clé'"), 'sous « Retirer la clé »');
  assert.match(page, /has \? el\('button', \{ type: 'button', class: 'btn c-disc', onclick: \(\) => openCartoSend\(/);
});

test('le lien porte la clé dans #cle=, revérifiée à l\'arrivée ; elle quitte l\'adresse', () => {
  assert.match(app, /const cartoLink = \(k\) => `\$\{APP_URL\(\)\}#cle=\$\{k\}`;/);
  assert.match(app, /const readCartoLink = \(hash\) => \{[^\n]*validCartoKey\(k\) \? k : null; \};/);
  assert.match(app, /if \(\/\(lieu\|balade\|rdv\|circuit\|cle\)=\/\.test\(h\)\) history\.replaceState/);
  assert.match(app, /key \? \(\) => receiveCartoKey\(key\) : null;/);
  assert.match(app, /\/\(lieu\|balade\|rdv\|cle\)=\/\.test\(location\.hash\)/, 'pas de rappel de sauvegarde par-dessus');
  assert.match(app, /!readCartoLink\(location\.hash\) && !firstDone\(\)/, 'pas de Bienvenue par-dessus la question');
});

test('à l\'arrivée : Garder ou Remplacer, la carte ne change pas, jamais pendant un essai', () => {
  const f = between('function receiveCartoKey(', '\n}\n');
  assert.match(f, /had \? 'Remplacer' : 'Garder'/);
  assert.match(f, /if \(ESSAI\)/);
  assert.match(f, /cartoKey\(\) === k/);
  assert.doesNotMatch(f, /state\.mapStyle\s*=/, 'son fond ne change pas');
  assert.match(f, /'Annuler'/);
});

test('la page d\'envoi prévient que le lien porte la clé ; le retour est en dernier', () => {
  const f = between('function openCartoSend(', '\n}\n');
  assert.match(f, /Ce lien porte ta clé CARTO : envoie-le seulement à ce proche\./);
  assert.match(f, /'Envoyer le lien'\), el\('button', \{ type: 'button', class: 'btn', onclick: back \}, '← Clé CARTO'\)\)/);
});
