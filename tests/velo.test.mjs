// Pistes à vélo : le fichier du robot (tools/maj-velo.py) relu sur le téléphone, la date toujours dite, rien d'autre gardé.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, writeFileSync, mkdtempSync, existsSync, rmSync } from 'node:fs';
import { execFileSync } from 'node:child_process';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { cleanVelo, veloDate, veloNoteText, veloWeight, VELO_CALM_ZOOM } from '../js/velo.js';
import { encodeTrace } from '../js/mescircuits.js';

const src = (f) => readFileSync(new URL(`../${f}`, import.meta.url), 'utf8');

test('vélo : le fichier se relit, un trait illisible ou hors de Paris est écarté', () => {
  const a = encodeTrace([[48.85, 2.35], [48.851, 2.351]]);
  const loin = encodeTrace([[45.76, 4.83], [45.77, 4.84]]);
  const v = cleanVelo({ updated: '2026-11-19', s: [a, 'xx', loin, 42], c: [a] });
  assert.equal(v.s.length, 1);
  assert.equal(v.c.length, 1);
  assert.equal(v.updated, '2026-11-19');
  assert.equal(cleanVelo({ s: [], c: [] }), null, 'rien à dessiner : null');
  assert.equal(cleanVelo(null), null);
  assert.equal(cleanVelo({ updated: 'hier', s: [a] }).updated, '', 'une date illisible ne s\'affiche pas');
});

test('vélo : l\'étiquette dit toujours la date de la Ville et que les travaux ne se voient pas', () => {
  assert.equal(veloDate('2026-11-19'), '19 nov. 2026');
  assert.equal(veloNoteText('2026-11-19'), 'Vélo : pistes du 19 nov. 2026 · sans les travaux');
  assert.match(veloNoteText(''), /date inconnue · sans les travaux/);
  assert.ok(veloWeight(16) > veloWeight(12), 'plus fin de loin');
  assert.equal(VELO_CALM_ZOOM, 14);
});

test('vélo : module gardé hors réseau, gros fichier lu seulement à la première demande, bouton sous ⋯ Plus', () => {
  const sw = src('sw.js');
  assert.ok(sw.includes("'js/velo.js'"));
  assert.ok(!sw.includes("'data/velo.json'"), 'pas téléchargé à l\'installation');
  const app = src('js/app.js');
  assert.ok(app.includes("fetch('data/velo.json')"));
  assert.match(app, /interactive: false/);
});

test('vélo : le robot ne garde que le dernier export, les pistes et les rues calmes, jamais les bandes ni les couloirs de bus', () => {
  const dir = mkdtempSync(join(tmpdir(), 'velo-'));
  const line = (lng, n = 120) => ({ type: 'Feature', geometry: { type: 'LineString', coordinates: Array.from({ length: n }, (_, i) => [lng + i * 0.0001, 48.85]) } });
  const rows = [];
  for (let i = 0; i < 260; i++) rows.push({ amenagement: 'piste cyclable', date_export: '2026-11-19T01:00:00+00:00', geo_shape: line(2.30 + (i % 13) * 0.012, 120 + i) });
  rows.push({ amenagement: 'voie piétonne', date_export: '2026-11-19T01:00:00+00:00', geo_shape: line(2.33, 3) });
  rows.push({ amenagement: 'bande cyclable', date_export: '2026-11-19T01:00:00+00:00', geo_shape: line(2.34, 3) });
  rows.push({ amenagement: 'couloir bus ouvert aux vélos', date_export: '2026-11-19T01:00:00+00:00', geo_shape: line(2.35, 3) });
  rows.push({ amenagement: 'piste cyclable', date_export: '2026-01-01T01:00:00+00:00', geo_shape: line(2.36, 3) });
  writeFileSync(join(dir, 'in.json'), JSON.stringify(rows));
  const before = existsSync(new URL('../data/velo.json', import.meta.url)) ? src('data/velo.json') : null;
  try {
    execFileSync('python3', ['-I', 'tools/maj-velo.py', join(dir, 'in.json')], { cwd: new URL('..', import.meta.url) });
    const out = JSON.parse(src('data/velo.json'));
    assert.equal(out.updated, '2026-11-19');
    assert.equal(out.c.length, 1, 'la voie piétonne');
    assert.ok(out.s.length >= 13 && out.s.length <= 260);
    const all = [...out.s, ...out.c].join('|');
    assert.ok(!all.includes(encodeTrace(line(2.34, 3).geometry.coordinates.map(([g, a]) => [a, g]))), 'pas de bande');
  } finally {
    if (before !== null) writeFileSync(new URL('../data/velo.json', import.meta.url), before);
    else rmSync(new URL('../data/velo.json', import.meta.url), { force: true });
  }
});
