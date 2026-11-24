// v395 : entrées et sorties du métro (champs accisentry / accisexit du fichier IDFM « Accès »).
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, writeFileSync, mkdtempSync, rmSync, mkdirSync, copyFileSync } from 'node:fs';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import { execFileSync } from 'node:child_process';
import { cleanAcces, exitFor, entryFor } from '../js/acces.js';

const bastille = { lat: 48.85306, lng: 2.36914 };
const acces = cleanAcces({ items: [
  { n: 'r. de la Roquette', s: '5', lat: 48.85380, lng: 2.37020, e: 1, x: 1 },  // entrée et sortie
  { n: 'bd Henri IV', s: '8', lat: 48.85250, lng: 2.36850, e: 0, x: 1 },        // sortie seule
  { n: 'r. Saint-Antoine', s: '3', lat: 48.85300, lng: 2.36800, e: 1, x: 0 },   // entrée seule
] });

test('les marques entrée / sortie sont gardées, absentes dans un fichier d\'avant', () => {
  assert.deepEqual(acces.map((a) => [a.e, a.x]), [[true, true], [false, true], [true, false]]);
  const old = cleanAcces({ items: [{ n: 'r. A', s: '1', lat: 48.85, lng: 2.36 }] });
  assert.equal('e' in old[0], false);
  assert.equal('x' in old[0], false);
});

test('la fiche n\'annonce jamais une entrée seule comme sortie', () => {
  const place = { lat: 48.85300, lng: 2.36790 }; // juste à côté de l'entrée seule rue Saint-Antoine
  assert.equal(exitFor(acces, bastille, place).label, 'Sortie 8, bd Henri IV');
});

test('M : l\'entrée la plus proche de moi, jamais une sortie seule', () => {
  const me = { lat: 48.85240, lng: 2.36845 }; // à côté de la sortie seule bd Henri IV
  const en = entryFor(acces, bastille, me);
  assert.equal(en.label, 'Entrée 3, r. Saint-Antoine');
  assert.ok(Number.isFinite(en.lat) && Number.isFinite(en.lng) && en.d > 30 && en.d < 120, String(en.d));
  const me2 = { lat: 48.85400, lng: 2.37050 };
  assert.equal(entryFor(acces, bastille, me2).label, 'Entrée 5, r. de la Roquette');
});

test('sans marque (fichier d\'avant la v395), aucune entrée ; la sortie reste comme avant', () => {
  const old = cleanAcces({ items: [{ n: 'r. de la Roquette', s: '5', lat: 48.85380, lng: 2.37020 }] });
  assert.equal(entryFor(old, bastille, bastille), null);
  assert.equal(exitFor(old, bastille, bastille).label, 'Sortie 5, r. de la Roquette');
});

test('entrée : ni numéro 0 ni nom vide de sens, et jamais l\'accès d\'une autre station', () => {
  const st = { lat: 48.85, lng: 2.35 };
  assert.equal(entryFor(cleanAcces({ items: [{ n: 'Entrée', s: '0', lat: 48.85, lng: 2.35, e: 1, x: 1 }] }), st, st), null);
  const a = { lat: 48.85, lng: 2.35 }; const b = { lat: 48.851, lng: 2.35 };
  const near = cleanAcces({ items: [{ n: 'r. de B', s: '7', lat: 48.8509, lng: 2.35, e: 1, x: 1 }] });
  assert.equal(entryFor(near, a, a, [a, b]), null);
  assert.equal(entryFor(near, b, a, [a, b]).label, 'Entrée 7, r. de B');
});

test('le robot garde e et x, écarte un accès ni entrée ni sortie et réunit les doublons', () => {
  const dir = mkdtempSync(join(tmpdir(), 'acces-'));
  try {
    mkdirSync(join(dir, 'data')); mkdirSync(join(dir, 'tools'));
    copyFileSync('tools/maj-acces.py', join(dir, 'tools/maj-acces.py'));
    const rows = [];
    for (let i = 0; i < 820; i++) rows.push({ accname: `r. ${i}`, accshortname: 1, accisentry: 'true', accisexit: 'true', accgeopoint: { lat: 48.80 + i / 10000, lon: 2.30 } });
    rows.push({ accname: 'r. Sortie', accshortname: 2, accisentry: 'false', accisexit: 'true', accgeopoint: { lat: 48.86, lon: 2.35 } });
    rows.push({ accname: 'r. Entrée', accshortname: 3, accisentry: 'true', accisexit: 'false', accgeopoint: { lat: 48.861, lon: 2.35 } });
    rows.push({ accname: 'r. Rien', accshortname: 4, accisentry: 'false', accisexit: 'false', accgeopoint: { lat: 48.862, lon: 2.35 } });
    rows.push({ accname: 'r. Double', accshortname: 5, accisentry: 'false', accisexit: 'true', accgeopoint: { lat: 48.863, lon: 2.35 } });
    rows.push({ accname: 'r. Double', accshortname: 5, accisentry: 'true', accisexit: 'false', accgeopoint: { lat: 48.863, lon: 2.35 } });
    writeFileSync(join(dir, 'src.json'), JSON.stringify(rows));
    execFileSync('python3', ['-I', 'tools/maj-acces.py', 'src.json', '2026-11-24'], { cwd: dir, stdio: 'pipe' });
    const out = JSON.parse(readFileSync(join(dir, 'data/acces.json'), 'utf8')).items;
    const by = (n) => out.filter((a) => a.n === n);
    assert.deepEqual(by('r. Sortie').map((a) => [a.e, a.x]), [[0, 1]]);
    assert.deepEqual(by('r. Entrée').map((a) => [a.e, a.x]), [[1, 0]]);
    assert.equal(by('r. Rien').length, 0);
    assert.deepEqual(by('r. Double').map((a) => [a.e, a.x]), [[1, 1]]);
  } finally { rmSync(dir, { recursive: true, force: true }); }
});
