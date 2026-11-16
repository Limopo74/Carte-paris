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
