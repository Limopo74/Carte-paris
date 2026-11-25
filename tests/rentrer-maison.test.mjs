// v368 (21 nov. 2026, capture de Rentrer à Issy) : quand ma station Maison est parmi les plus proches,
// elle n'affiche plus de faux temps en métro (« ≈ 28 min » au lieu de 15 à pied) ni « Le plus rapide ».
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { fastestHomeOption } from '../js/metroplan.js';

const app = readFileSync(new URL('../js/app.js', import.meta.url), 'utf8');
const mairie = { n: "Mairie d'Issy" };
const celton = { n: 'Corentin Celton' };
const autre = { n: 'Autre' };

test('fastestHomeOption : jamais la station Maison, et rien si la marche est plus rapide', () => {
  const opts = [
    { st: mairie, plan: { type: 'direct', minutes: 28 } },
    { st: celton, plan: { type: 'direct', minutes: 28 } },
  ];
  assert.equal(fastestHomeOption(opts, mairie, 15), null); // le cas de la capture
  const vite = [{ st: mairie, plan: { type: 'direct', minutes: 30 } }, { st: celton, plan: { type: 'direct', minutes: 9 } }];
  assert.equal(fastestHomeOption(vite, mairie, 18).st, celton); // le métro bat vraiment la marche
});

test('fastestHomeOption : loin de Maison, comme avant (la plus rapide, sans trajet impossible)', () => {
  const opts = [
    { st: celton, plan: { type: 'direct', minutes: 25 } },
    { st: autre, plan: { type: 'walk', minutes: 40, noMetro: 'route' } },
  ];
  assert.equal(fastestHomeOption(opts, mairie, 60).st, celton);
  assert.equal(fastestHomeOption([], mairie, 60), null);
});

test('Rentrer : la ligne de ma station Maison dit « c\'est ta station », sans minutes de métro', () => {
  const i = app.indexOf('async function openHomePlan');
  const body = app.slice(i, app.indexOf('\n}\n', i));
  assert.match(body, /o\.st === home\.st \? `\$\{walkWhen\(o\.d\)\} à pied · c'est ta station \$\{home\.label\}`/);
  assert.match(body, /fastestHomeOption\(opts, home\.st, walk\)/);
  assert.match(body, /const homeNear = opts\.some\(\(o\) => o\.st === home\.st\)/);
  assert.match(body, /\(best \? walk <= best\.plan\.minutes : homeNear\) \? el\('p', \{ class: 'summary' \}/);
  // v369 : pas de « Plus près que le métro : … (RER) » quand ma station Maison est parmi les proches
  assert.match(body, /const railLine = !homeNear && railNear/);
});
