import { test } from 'node:test';
import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { mkdtempSync, writeFileSync, readFileSync, existsSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { cleanJardinLinks, JARDIN_PAGE } from '../js/jardins.js';

// v273 (mon choix 1A du 20 nov. 2026) : la page paris.fr d'un jardin, seulement celles que le robot a ouvertes.
const hasPython = spawnSync('python3', ['--version']).status === 0;
const run = (args, env = {}) => spawnSync('python3', ['-I', 'tools/maj-jardins-liens.py', ...args], { encoding: 'utf8', env: { ...process.env, ...env } });

test('liens des jardins : seules les adresses propres deviennent un lien paris.fr', () => {
  const m = cleanJardinLinks({ items: { 1608: 'square-carlo-sarrabezolles-2542', 2: 'jardin-2542', 3: '../piege-1', 4: 'https://ailleurs.fr/x-1', 5: 'sans-numero', 6: 42 } });
  assert.equal(m.get('1608'), `${JARDIN_PAGE}square-carlo-sarrabezolles-2542`);
  assert.ok(m.get('1608').startsWith('https://www.paris.fr/lieux/'));
  assert.equal(m.get('2'), `${JARDIN_PAGE}jardin-2542`);
  for (const id of ['3', '4', '5', '6']) assert.equal(m.has(id), false, id);
  assert.equal(cleanJardinLinks(null).size, 0);
  assert.equal(cleanJardinLinks({ items: [] }).size, 0, 'pas encore passé');
});

test('le fichier du dépôt est lisible (vide tant que le robot n\'est pas passé)', () => {
  const j = JSON.parse(readFileSync('data/jardins-liens.json', 'utf8'));
  assert.equal(typeof j.items, 'object');
  assert.ok(cleanJardinLinks(j) instanceof Map);
});

test('robot des liens : nom fabriqué, partie avant « - », page partagée, jamais de lien deviné, garde-fou', { skip: !hasPython }, () => {
  const dir = mkdtempSync(join(tmpdir(), 'jardins-liens-'));
  const rec = (identifiant, nom, id_dicom, type = 'Promenades ouvertes') => ({ identifiant, nom, type, id_dicom });
  const src = [
    rec('ID1', 'SQUARE CARLO SARRABEZOLLES', '2542'),
    rec('ID2', "JARDIN DE L'HÔTEL SALÉ - LÉONOR FINI", '777'), // la page paris.fr porte le nom court
    rec('ID3', 'JARDIN DES GRANDS MOULINS - ABBE PIERRE - JARDIN CENTRAL', '5044'), // aucune adresse ne répond : pas de lien
    rec('ID4', 'SQUARE CARLO SARRABEZOLLES (PARTIE BASSE)', '2542'), // même page que ID1
    rec('ID5', 'JARDINIERES DU BOULEVARD', '9', 'Décorations sur la voie publique'), // type écarté
    rec('ID6', 'SQUARE SANS NUMERO', null),
  ];
  writeFileSync(join(dir, 'src.json'), JSON.stringify(src));
  const ok = ['https://www.paris.fr/lieux/square-carlo-sarrabezolles-2542', 'https://www.paris.fr/lieux/jardin-de-l-hotel-sale-777', 'https://www.paris.fr/lieux/jardinieres-du-boulevard-9'];
  writeFileSync(join(dir, 'ok.json'), JSON.stringify(ok));
  const out = join(dir, 'liens.json');
  const r = run([join(dir, 'src.json'), '2026-11-20', '1', out], { JARDINS_LIENS_OK: join(dir, 'ok.json') });
  assert.equal(r.status, 0, r.stderr);
  const j = JSON.parse(readFileSync(out, 'utf8'));
  assert.deepEqual(j.items, { ID1: 'square-carlo-sarrabezolles-2542', ID2: 'jardin-de-l-hotel-sale-777', ID4: 'square-carlo-sarrabezolles-2542' });
  assert.equal(j.date, '2026-11-20');
  assert.match(r.stdout, /2 pages trouvées sur 3 numéros, pour 3 jardins/);
  // garde-fou : moins de pages que le minimum, rien n'est écrit
  const out2 = join(dir, 'liens2.json');
  const r2 = run([join(dir, 'src.json'), '2026-11-20', '50', out2], { JARDINS_LIENS_OK: join(dir, 'ok.json') });
  assert.notEqual(r2.status, 0);
  assert.equal(existsSync(out2), false);
});
