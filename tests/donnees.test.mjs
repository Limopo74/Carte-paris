import { test } from 'node:test';
import assert from 'node:assert/strict';
import { transportsDue, frenchDate, TRANSPORT_FILES, TRANSPORT_EVERY_DAYS } from '../js/donnees.js';
import { readFileSync } from 'node:fs';

test('données des transports : rappel au bout de 6 mois, ou si la date manque', () => {
  const t0 = Date.parse('2026-11-16');
  assert.equal(transportsDue('2026-11-16', t0 + 100 * 864e5), false);
  assert.equal(transportsDue('2026-11-16', t0 + (TRANSPORT_EVERY_DAYS + 1) * 864e5), true);
  assert.equal(transportsDue('', t0), true);
  assert.equal(transportsDue(undefined, t0), true);
  assert.equal(frenchDate('2026-11-16'), '16 novembre 2026');
  assert.equal(frenchDate('2027-05-01'), '1er mai 2027');
  assert.equal(frenchDate('n\'importe quoi'), '');
});

test('données des transports : les fichiers de l\'appli portent leur date, les liens visent le site IDFM', () => {
  for (const f of ['data/stations.json', 'data/lignes.json']) {
    const j = JSON.parse(readFileSync(new URL(`../${f}`, import.meta.url), 'utf8'));
    assert.match(j.updated ?? '', /^\d{4}-\d{2}-\d{2}$/, `${f} : champ « updated »`);
  }
  for (const f of TRANSPORT_FILES) assert.match(f.url, /^https:\/\/data\.iledefrance-mobilites\.fr\/explore\/dataset\/[a-z-]+\/export\/$/);
});

test('données des transports : lien des toilettes RATP et page info trafic IDFM', async () => {
  const { RATP_TOILETS_FILE, TRAFFIC_URL } = await import('../js/donnees.js');
  assert.match(RATP_TOILETS_FILE.url, /^https:\/\/data\.ratp\.fr\/explore\/assets\/sanitaires-reseau-ratp\/export\/$/);
  assert.match(TRAFFIC_URL, /^https:\/\/me-deplacer\.iledefrance-mobilites\.fr\/infos-trafic\//);
  const j = JSON.parse(readFileSync(new URL('../data/sanitaires-ratp.json', import.meta.url), 'utf8'));
  assert.match(j.updated ?? '', /^\d{4}-\d{2}-\d{2}$/, 'sanitaires-ratp.json : champ « updated »');
});

test('data/merimee.json : monuments de Paris, date, musées', async () => {
  const { parseMerimee } = await import('../js/explore.js');
  const { updated, items } = parseMerimee(JSON.parse(readFileSync(new URL('../data/merimee.json', import.meta.url), 'utf8')));
  assert.match(updated, /^\d{4}-\d{2}-\d{2}$/);
  assert.ok(items.size > 1800, `${items.size} monuments`);
  assert.deepEqual(items.get('PA00086125').m, ['Musée Carnavalet']);
});

test('données de l\'appli : chaque donnée figée a sa fréquence ; le rappel ne compte que celles en retard', async () => {
  const { FIXED_DATA, dataDue, everyText } = await import('../js/donnees.js');
  assert.deepEqual(FIXED_DATA.map((d) => d.id), ['lignes', 'navigo', 'ratp', 'arrondissements', 'bus', 'plaques', 'oeuvres', 'galeries', 'respire', 'voies', 'architectes', 'acces', 'gares', 'merimee', 'marches', 'listes']);
  assert.equal(everyText(183), 'tous les 6 mois');
  assert.equal(everyText(365), 'tous les ans');
  const now = Date.parse('2027-06-01');
  const dates = { lignes: '2026-11-16', navigo: '2026-11-16', ratp: '2026-11-16', merimee: '2026-11-16', marches: '2026-11-16', listes: '2026-11-16' };
  assert.deepEqual(dataDue(dates, now), ['lignes', 'navigo', 'ratp'], 'au bout de 6 mois et demi : les données du robot (qui aurait donc échoué)');
  assert.deepEqual(dataDue(dates, Date.parse('2026-12-01')), []);
  assert.deepEqual(dataDue({ ...dates, ratp: '' }, Date.parse('2026-12-01')), ['ratp'], 'date inconnue : à refaire');
});

test('robot des données : lignes, Navigo et toilettes RATP chaque mois, rappel seulement s\'il échoue', async () => {
  const { FIXED_DATA, dataDue, everyText, ROBOT_URL } = await import('../js/donnees.js');
  assert.deepEqual(FIXED_DATA.filter((d) => d.robot).map((d) => d.id), ['lignes', 'navigo', 'ratp', 'arrondissements', 'bus', 'plaques', 'oeuvres', 'galeries', 'respire', 'voies', 'architectes', 'acces', 'gares']);
  assert.equal(everyText(45), 'chaque mois');
  const now = Date.parse('2026-12-20');
  const dates = { lignes: '2026-12-01', navigo: '2026-11-10', ratp: '2026-10-01', merimee: '2026-11-16', marches: '2026-11-16', listes: '2026-11-16' };
  assert.deepEqual(dataDue(dates, now), ['ratp']); // 80 jours : le robot a échoué deux fois
  assert.match(ROBOT_URL, /^https:\/\/github\.com\/Limopo74\/Carte-paris\/actions\/workflows\/maj-donnees\.yml$/);
});

test('arrondissements : pas de fausse alerte tant que le fichier n\'est pas lu, alerte s\'il date de plus de 45 jours', async () => {
  const { dataDue, ARR_FILE, COVERED_SOURCE, RATP_TOILETS_FILE } = await import('../js/donnees.js');
  const base = { lignes: '2026-12-01', navigo: '2026-12-01', ratp: '2026-12-01', merimee: '2026-11-16', marches: '2026-11-16', listes: '2026-11-16' };
  const now = Date.parse('2026-12-20');
  assert.deepEqual(dataDue(base, now), [], 'date pas encore connue');
  assert.deepEqual(dataDue({ ...base, arrondissements: '2026-12-01' }, now), []);
  assert.deepEqual(dataDue({ ...base, arrondissements: '2026-10-01' }, now), ['arrondissements']);
  assert.deepEqual(dataDue({ ...base, arrondissements: '' }, now), ['arrondissements'], 'fichier lu sans date');
  for (const u of [ARR_FILE.url, COVERED_SOURCE, RATP_TOILETS_FILE.url]) assert.match(u, /^https:\/\//);
  assert.match(RATP_TOILETS_FILE.url, /explore\/assets\/sanitaires-reseau-ratp\/export\/$/);
});

test('arrêts de bus (v148) : pas d\'alerte tant que le robot n\'a pas fait le fichier, alerte s\'il date de plus de 45 jours', async () => {
  const { dataDue, BUS_FILE, FIXED_DATA } = await import('../js/donnees.js');
  const base = { lignes: '2026-12-01', navigo: '2026-12-01', ratp: '2026-12-01', merimee: '2026-11-16', marches: '2026-11-16', listes: '2026-11-16' };
  const now = Date.parse('2026-12-20');
  assert.deepEqual(dataDue(base, now), []);
  assert.deepEqual(dataDue({ ...base, bus: '2026-10-01' }, now), ['bus']);
  assert.ok(FIXED_DATA.find((d) => d.id === 'bus').lazy);
  assert.match(BUS_FILE.url, /^https:\/\/data\.iledefrance-mobilites\.fr\/explore\/dataset\/arrets-lignes\/export\/$/);
});
