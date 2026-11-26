// v477 (mon choix A du 25 nov.) : « Position refusée » montre seulement mon cas (appli installée ou Chrome), en 3 étapes courtes.
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const app = readFileSync(new URL('../js/app.js', import.meta.url), 'utf8');
const block = app.slice(app.indexOf('const DENIED_STEPS = STANDALONE'), app.indexOf('const GEO_ERRORS = {'));

test('deux cas, trois étapes chacun, choisis par STANDALONE', () => {
  const lists = [...block.matchAll(/\[('[^\]]*')\]/g)].map((m) => m[1].split(/', '/).length);
  assert.deepEqual(lists, [3, 3]);
  assert.match(block, /Appui long/);
  assert.match(block, /Paramètres des sites/);
});

test('le texte des deux cas mélangés a disparu ; la page de position introuvable montre les étapes', () => {
  assert.ok(!app.includes('Appli installée : appui long sur son icône'));
  assert.ok(app.includes("e?.code === 1 ? deniedHelp() : el('p', {}, e.message)"));
});

test('chaque étape tient en peu de mots (moins de 50 signes sans les *)', () => {
  for (const m of block.matchAll(/'((?:[^'\\]|\\.)*)'/g)) assert.ok(m[1].replaceAll('*', '').replaceAll('\\', '').length < 50, m[1]);
});

// v539 : le message court « Position refusée » devient un bloc : titre, 3 étapes numérotées, « Compris », sans minuterie.
test('le message Position refusée est un bloc lisible gardé jusqu\'à Compris', () => {
  const f = app.slice(app.indexOf('function deniedToast('), app.indexOf('const hideToast'));
  assert.match(f, /'Position bloquée'/);
  assert.match(f, /LOCATION_OFF_STEP/);
  assert.match(f, /class: 'toast-steps'/);
  assert.match(f, /'Compris'/);
  assert.ok(!f.includes('setTimeout'), 'pas de minuterie : il reste jusqu\'à Compris');
  assert.match(app, /msg\.startsWith\('Position refusée\. '\)\) return deniedToast\(t\)/);
  assert.ok(!app.includes('autorise-la dans les réglages du navigateur'), 'un seul texte pour le refus');
});
