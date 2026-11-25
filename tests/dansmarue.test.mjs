// v471 (mes choix 6 du 25 nov., « tout conseillé, toujours très visuel ») : couche « Signalements Dans ma rue ».
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, writeFileSync, mkdtempSync, existsSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { spawnSync } from 'node:child_process';
import { cleanDmr, dmrInBox, dmrLevel, dmrLegend, dmrPeriod, DMR_ZOOM } from '../js/dansmarue.js';
import { MOVABLE_CHIPS, DEFAULT_MORE_CHIPS, NEW_MORE_CHIPS, CHIPS_V } from '../js/store.js';

const app = readFileSync(new URL('../js/app.js', import.meta.url), 'utf8');
const sw = readFileSync(new URL('../sw.js', import.meta.url), 'utf8');
const wf = readFileSync(new URL('../.github/workflows/maj-donnees.yml', import.meta.url), 'utf8');
const D = { source: 'x', updated: '2026-11-25', from: '2025-08-21', to: '2026-08-20', origin: [48.8, 2.22], step: [0.0009, 0.00136], cuts: [4, 10], cells: [[90, 85, 2], [90, 86, 5], [91, 85, 12], [1, 1, 0]] };

test('le fichier relu : vide ou faux = rien (la couche attend le robot) ; trois niveaux par seuils', () => {
  assert.equal(cleanDmr(JSON.parse(readFileSync(new URL('../data/dansmarue.json', import.meta.url), 'utf8'))), null, 'vide avant le premier passage du robot');
  assert.equal(cleanDmr({ ...D, cuts: [5, 3] }), null);
  const d = cleanDmr(D);
  assert.equal(d.cells.length, 3, 'un carré sans signalement est écarté');
  assert.deepEqual([1, 3, 4, 9, 10, 50].map((n) => dmrLevel(n, d.cuts)), [0, 0, 1, 1, 2, 2]);
  assert.deepEqual(dmrLegend(d), ['1 à 3', '4 à 9', '10 et plus']);
  assert.equal(dmrPeriod(d), 'du 21 août 2025 au 20 août 2026');
  const box = { s: 48.88, n: 48.884, w: 2.33, e: 2.34 };
  const r = dmrInBox(d, box);
  assert.deepEqual(r.map((c) => c.level), [0, 1, 2]);
  assert.ok(r.every((c) => c.n - c.s > 0.0008 && c.e - c.w > 0.0013));
  assert.equal(DMR_ZOOM, 15);
});

test('la couche : bouton sous ⋯ Plus au bout, éteinte au départ, le temps de la session, rien demandé depuis le téléphone', () => {
  assert.equal(MOVABLE_CHIPS.at(-1), 'dansmarue');
  assert.ok(DEFAULT_MORE_CHIPS.includes('dansmarue'));
  assert.deepEqual(NEW_MORE_CHIPS[7], ['dansmarue']); assert.equal(CHIPS_V, 7);
  assert.match(app, /let dmrOn = false;/);
  assert.match(app, /fetch\('data\/dansmarue\.json'\)/);
  assert.ok(!/opendata\.paris\.fr[^'"]*dans-ma-rue/.test(app), 'jamais l\'API depuis le téléphone');
  assert.match(app, /\.filter\(\(x\) => x\.level > 0\)/, '« Peu » : rien de dessiné');
  assert.match(app, /interactive: false, stroke: false/);
  assert.match(app, /pas une mesure de la saleté/);
  assert.match(sw, /'js\/dansmarue\.js', 'data\/dansmarue\.json'/);
  assert.match(wf, /tools\/maj-dansmarue\.py/);
  assert.match(wf, /where=type in \(\\"Propreté\\",\\"Objets abandonnés\\"\) and datedecl >= date'\$DMR0'/);
});

const hasPython = spawnSync('python3', ['-V']).status === 0;
test('robot : carrés de 100 m, période lue, seuils en trois parts ; trop peu de lignes = rien d\'écrit', { skip: !hasPython }, () => {
  const dir = mkdtempSync(join(tmpdir(), 'dmr-'));
  const rows = ['geo_point_2d;datedecl'];
  for (let k = 0; k < 60; k++) rows.push(`48.8812${k % 3}, 2.33610;2025-08-${String(21 + (k % 9)).padStart(2, '0')}`); // un carré chargé
  for (let k = 0; k < 30; k++) rows.push(`${(48.85 + k * 0.001).toFixed(4)}, 2.3000;2026-08-20`); // des carrés à 1
  rows.push('45.7600, 4.8300;2026-01-01'); // Lyon : écarté
  rows.push('{"lon": 2.35, "lat": 48.86};2026-02-01'); // l'autre forme
  rows.push('pas une position;2026-02-01');
  writeFileSync(join(dir, 'e.csv'), rows.join('\n'));
  const out = join(dir, 'o.json');
  const r = spawnSync('python3', ['-I', 'tools/maj-dansmarue.py', join(dir, 'e.csv'), '2026-11-25', out, '10'], { encoding: 'utf8' });
  assert.equal(r.status, 0, r.stderr);
  const j = JSON.parse(readFileSync(out, 'utf8'));
  assert.equal(j.from, '2025-08-21'); assert.equal(j.to, '2026-08-20');
  assert.equal(j.cells.reduce((a, c) => a + c[2], 0), 91);
  const d = cleanDmr(j);
  assert.ok(d, 'l\'appli lit ce que le robot écrit');
  assert.equal(Math.max(...d.cells.map((c) => c[2])), 60);
  assert.notEqual(spawnSync('python3', ['-I', 'tools/maj-dansmarue.py', join(dir, 'e.csv'), '2026-11-25', join(dir, 'o2.json')]).status, 0, 'garde-fou : moins de 50 000');
  assert.equal(existsSync(join(dir, 'o2.json')), false);
});
