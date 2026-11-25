// v470 (mes choix 1A 2A 3A du 25 nov., « uniquement visuel et comparatif ») : vols enregistrés de l'arrondissement à côté de Paris, dans Où suis-je ?.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, writeFileSync, mkdtempSync, existsSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { spawnSync } from 'node:child_process';
import { cleanDelinq, compareWords, delinqRows, DELINQ_KEYS } from '../js/delinquance.js';

const data = JSON.parse(readFileSync(new URL('../data/delinquance.json', import.meta.url), 'utf8'));
const app = readFileSync(new URL('../js/app.js', import.meta.url), 'utf8');

test('le fichier : 20 arrondissements, taux = nombre / population × 1 000, Paris d\'après sa propre ligne', () => {
  const d = cleanDelinq(data);
  assert.equal(d.year, 2025);
  assert.equal(Object.keys(d.arr).length, 20);
  for (const a of data.arr) for (const [k, n] of [['vv', 'nv'], ['vs', 'ns']]) assert.ok(Math.abs(a[k] - (a[n] / a.pop) * 1000) < 0.01, `${a.n} ${k}`);
  assert.ok(Math.abs(d.paris.vv - 3.45) < 0.01); // SSMSI, ligne 75056 : 3,4547371
  assert.ok(Math.abs(d.paris.vs - 45.12) < 0.01); // 45,1207304
  assert.deepEqual(DELINQ_KEYS.map(([k]) => k), ['vv', 'vs']);
});

test('les mots comparent seulement à Paris, jamais de classement ni de « dangereux »', () => {
  assert.equal(compareWords(6.11, 3.45), '1,8 fois plus que Paris');
  assert.equal(compareWords(1.46, 3.45), '2,4 fois moins que Paris');
  assert.equal(compareWords(3.6, 3.45), 'Comme la moyenne de Paris');
  assert.equal(compareWords(311.6, 45.1), '6,9 fois plus que Paris');
  const r = delinqRows(cleanDelinq(data), 9);
  assert.equal(r.length, 2);
  assert.equal(r[0].here, 100); assert.ok(r[0].paris > 50 && r[0].paris < 60); // 9e : 6,1 contre 3,5
  assert.match(r[0].aria, /pour 1 000 habitants ici/);
  assert.deepEqual(delinqRows(cleanDelinq(data), 0), []);
  assert.ok(!/dangereu|sûr|craindre/i.test(readFileSync(new URL('../js/delinquance.js', import.meta.url), 'utf8')));
});

test('Où suis-je ? : le bloc sous les boutons (rien ne bouge), arrondissement trouvé sur le téléphone, source et réserve dans l\'Aide', () => {
  assert.match(app, /secoursRow\(\),\n\s+delinq,\n\s+quarter,/);
  assert.match(app, /showDelinq\(arrOfPoint\(at\)\);/);
  assert.match(app, /fetch\('data\/delinquance\.json'\)/);
  assert.match(app, /leurs barres sont gonflées\. Rien ne dit ce qui se passe dans une rue\. Source : SSMSI/);
});

const hasPython = spawnSync('python3', ['-V']).status === 0;
test('robot : la réponse de l\'API donne le même fichier ; un arrondissement non publié = rien d\'écrit', { skip: !hasPython }, () => {
  const dir = mkdtempSync(join(tmpdir(), 'dq-'));
  const row = (code, ind, nombre, pop, diff = 'diff') => ({ CODGEO_2026: code, annee: 2025, indicateur: ind, nombre, est_diffuse: diff, insee_pop: pop });
  const arr = data.arr.flatMap((a) => [row(`751${String(a.n).padStart(2, '0')}`, 'Vols violents sans arme', a.nv, a.pop), row(`751${String(a.n).padStart(2, '0')}`, 'Vols sans violence contre des personnes', a.ns, a.pop)]);
  const paris = [row('75056', 'Vols violents sans arme', 7268, 2103778), row('75056', 'Vols sans violence contre des personnes', 94924, 2103778)];
  writeFileSync(join(dir, 'a.json'), JSON.stringify({ data: arr })); writeFileSync(join(dir, 'p.json'), JSON.stringify({ data: paris }));
  const out = join(dir, 'out.json');
  const r = spawnSync('python3', ['-I', 'tools/maj-delinquance.py', join(dir, 'a.json'), join(dir, 'p.json'), '2026-11-25', out], { encoding: 'utf8' });
  assert.equal(r.status, 0, r.stderr);
  const j = JSON.parse(readFileSync(out, 'utf8'));
  assert.deepEqual({ ...j, updated: '' }, { ...data, updated: '' });
  arr[3].est_diffuse = 'ndiff'; arr[3].nombre = null;
  writeFileSync(join(dir, 'a.json'), JSON.stringify({ data: arr }));
  const out2 = join(dir, 'out2.json');
  assert.notEqual(spawnSync('python3', ['-I', 'tools/maj-delinquance.py', join(dir, 'a.json'), join(dir, 'p.json'), '2026-11-25', out2]).status, 0);
  assert.equal(existsSync(out2), false);
});
