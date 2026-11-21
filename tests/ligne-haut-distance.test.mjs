// v371 (mon choix A du 21 nov.) : la ligne du haut d'une page suit la limite « À pied jusqu'à », comme la plaque « Y aller ».
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { walkGo, distText, walkLabel, setWalkLimit } from '../js/geo.js';

const app = readFileSync(new URL('../js/app.js', import.meta.url), 'utf8');

test('les lignes du haut (summary) passent par topWalk, plus aucune par fmtWalk', () => {
  const lines = app.split('\n').filter((l) => l.includes("class: 'summary'") && /Walk\(d\)/.test(l));
  assert.ok(lines.length >= 5, `${lines.length} lignes`);
  for (const l of lines) assert.ok(!l.includes('fmtWalk(d)'), l.trim().slice(0, 90));
});

test('topWalk : minutes sous la limite, distance au-delà', () => {
  assert.match(app, /const topWalk = \(d\) => \(walkGo\(d\) \? fmtWalk\(d\) : `à \$\{distText\(d\)\}/);
  setWalkLimit?.(1000);
  assert.equal(walkGo(800), true);
  assert.match(walkLabel(800), /min à pied$/);
  assert.equal(walkGo(9200), false);
  assert.equal(`à ${distText(9200)}`, 'à 9,2 km');
});
