import { test } from 'node:test';
import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { mkdtempSync, writeFileSync, readFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

// tools/compte-bancs.py : une mesure pour le journal du robot (20 nov. 2026), jamais bloquante, rien d'écrit dans data/.
const py = (args) => spawnSync('python3', ['-I', 'tools/compte-bancs.py', ...args], { encoding: 'utf8' });
const hasPython = py([]).status === 0;

test('compter les bancs : rangés par arrondissement, hors de Paris ignorés, doublons comptés une fois', { skip: !hasPython }, () => {
  const dir = mkdtempSync(join(tmpdir(), 'bancs-'));
  const louvre = { lat: 48.8606, lon: 2.3376 }; // 1er
  const resp = { elements: [
    { type: 'node', id: 1, ...louvre, tags: { amenity: 'bench', backrest: 'yes' } },
    { type: 'way', id: 2, center: { lat: 48.8610, lon: 2.3370 }, tags: { amenity: 'bench' } },
    { type: 'node', id: 1, ...louvre, tags: { amenity: 'bench', backrest: 'yes' } },
    { type: 'node', id: 3, lat: 48.8165, lon: 2.2300, tags: { amenity: 'bench' } }, // hors de Paris
    { type: 'node', id: 4, lat: 48.8600, lon: 2.3400, tags: { highway: 'bus_stop', bench: 'yes' } },
  ] };
  writeFileSync(join(dir, 'r.json'), JSON.stringify(resp));
  const r = py([join(dir, 'r.json')]);
  assert.equal(r.status, 0);
  assert.match(r.stdout, /à Paris : 2 ; avec dossier noté : 1 ; arrêts ou abris de bus avec banc noté : 1 \(4 éléments lus, 1 hors de Paris/);
  assert.match(r.stdout, /^\s+1 \|\s+2 \|/m);
  // illisible : jamais d'échec
  writeFileSync(join(dir, 'x.json'), 'pas du json');
  assert.equal(py([join(dir, 'x.json')]).status, 0);
  // la demande couvre la même zone que les autres demandes du robot
  py(['requete', join(dir, 'q.txt')]);
  assert.match(readFileSync(join(dir, 'q.txt'), 'utf8'), /amenity"="bench"\]\(48\.815,2\.224,48\.902,2\.470\)/);
});

test('compter les bancs : le robot ne publie rien de cette étape', () => {
  const wf = readFileSync(new URL('../.github/workflows/maj-donnees.yml', import.meta.url), 'utf8');
  assert.match(wf, /Compter les bancs d'OpenStreetMap/);
  const files = /FILES="([^"]*)"/.exec(wf)[1];
  assert.equal(/banc/.test(files), false);
});
