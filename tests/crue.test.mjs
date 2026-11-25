// v502 (mes choix 7 A et 9 A du 25 nov.) : la hauteur de la Seine à Austerlitz (Hub'Eau), dans la pastille (interrupteur,
// éteint au départ ; toujours en mode crise Crue), sur la page Météo et en haut d'Autour de moi en mode Crue, avec Vigicrues.
// Rien si la mesure a plus de 2 h. Pas de repère de 1910.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { readSeine, seineText, seineTrend, SEINE_URL, VIGICRUES, SEINE_STATION } from '../js/crue.js';
import { WX_DEFAULT } from '../js/store.js';

const app = readFileSync(new URL('../js/app.js', import.meta.url), 'utf8');
const html = readFileSync(new URL('../index.html', import.meta.url), 'utf8');
const sw = readFileSync(new URL('../sw.js', import.meta.url), 'utf8');
const crue = readFileSync(new URL('../js/crue.js', import.meta.url), 'utf8');

const T0 = Date.parse('2026-11-25T12:40:00Z');
/** Une série toutes les 5 min, la plus récente d'abord, de `n` mesures (mm) donnée par f(minutes avant). */
const serie = (f, n = 90, end = T0) => ({ data: Array.from({ length: n }, (_, i) => ({ date_obs: new Date(end - i * 5 * 60000).toISOString(), resultat_obs: f(i * 5) })) });

test('la station et le lien : Austerlitz, Hub\'Eau, Vigicrues', () => {
  assert.equal(SEINE_STATION, 'F700000103');
  assert.match(SEINE_URL, /^https:\/\/hubeau\.eaufrance\.fr\/api\/v2\/hydrometrie\/observations_tr\?code_entite=F700000103&grandeur_hydro=H/);
  assert.equal(VIGICRUES, 'https://www.vigicrues.gouv.fr/');
  assert.match(html, /connect-src 'self' https:\/\/hubeau\.eaufrance\.fr/);
  assert.match(sw, /'js\/crue\.js'/);
  assert.doesNotMatch(crue + app, /8,62|8,65|8\.62/, 'pas de repère de 1910');
});

test('lecture : hauteur au cm, en mètres, tendance sur 6 h', () => {
  const s = readSeine(serie(() => 1091), T0 + 60000);
  assert.deepEqual(s, { m: 1.09, at: T0, trend: 'stable' });
  assert.equal(seineText(s), '1,09 m');
  assert.equal(seineTrend(s), 'stable sur 6 h');
  assert.equal(readSeine(serie((min) => 3000 - min), T0).trend, 'monte', '+36 cm en 6 h');
  assert.equal(readSeine(serie((min) => 3000 + min), T0).trend, 'baisse');
  assert.equal(readSeine(serie((min) => 3000 - min / 10), T0).trend, 'stable', '+3,6 cm en 6 h : stable');
  assert.equal(seineTrend(readSeine(serie((min) => 3000 - min), T0)), 'en hausse sur 6 h');
});

test('un seul saut (un bateau) ne fait pas la hauteur : médiane des 3 dernières', () => {
  const s = readSeine(serie((min) => (min === 0 ? 1300 : 1091)), T0);
  assert.equal(s.m, 1.09);
});

test('pas d\'information plutôt qu\'une fausse : vieille, abîmée, vide', () => {
  assert.equal(readSeine(serie(() => 1091), T0 + 2 * 3600000 + 60000), null, 'plus de 2 h');
  assert.ok(readSeine(serie(() => 1091), T0 + 2 * 3600000 - 60000));
  assert.equal(readSeine(serie(() => 1091), T0 - 3600000), null, 'mesure dans le futur');
  assert.equal(readSeine(null), null);
  assert.equal(readSeine({ data: [] }), null);
  assert.equal(readSeine({ data: [{ date_obs: 'x', resultat_obs: 1000 }] }), null);
  assert.equal(readSeine({ data: [{ date_obs: new Date(T0).toISOString(), resultat_obs: 'beaucoup' }] }, T0), null);
  assert.equal(readSeine({ data: [{ date_obs: new Date(T0).toISOString(), resultat_obs: 99999 }] }, T0), null);
  assert.equal(readSeine(serie(() => 1091, 20), T0).trend, null, 'moins de 6 h de mesures : pas de tendance');
});

test('pastille : interrupteur Seine éteint au départ, toujours montré en mode Crue', () => {
  assert.equal(WX_DEFAULT.seine, false);
  assert.match(app, /sw\('seine', 'waves', 'Seine', 'Hauteur à Austerlitz'\)/);
  assert.match(app, /const seineShown = \(\) => wxOn\('seine'\) \|\| crisis\?\.k === 'crue';/);
  assert.match(app, /if \(k === 'crue'\) checkSeine\(\);/);
  assert.match(app, /crisis\.k === 'crue' \? el\('div', \{ class: 'menu' \}, seineRow\(\)\) : null/);
  assert.match(app, /\.\.\.group\('Seine', /);
});
