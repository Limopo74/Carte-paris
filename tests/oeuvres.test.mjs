// v170 : œuvres dans la rue et galeries rangées dans l'appli par le robot (tools/maj-art.mjs), plus de demande depuis le téléphone.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { slim, refusal, MIN_ITEMS, KINDS } from '../tools/maj-art.mjs';
import { parseStreetArt, parseGalleries, STREET_ART_QUERY, GALLERIES_QUERY } from '../js/art.js';

const read = (f) => readFileSync(new URL(`../${f}`, import.meta.url), 'utf8');

test('le téléphone ne contacte plus OpenStreetMap pour les œuvres et les galeries', () => {
  assert.doesNotMatch(read('index.html'), /overpass/, 'overpass retiré de la CSP');
  assert.doesNotMatch(read('js/app.js'), /overpass|streetArtUrl|galleriesUrl/);
  assert.match(read('js/app.js'), /fetch\('data\/oeuvres\.json'\)/);
  assert.match(read('js/app.js'), /fetch\('data\/galeries\.json'\)/);
  for (const f of ['data/oeuvres.json', 'data/galeries.json']) assert.match(read('sw.js'), new RegExp(`'${f.replace('.', '\\.')}'`));
});

test('les demandes du robot : tout Paris, aucune position, du temps pour le serveur', () => {
  for (const q of [STREET_ART_QUERY, GALLERIES_QUERY]) {
    assert.match(q, /\[timeout:180\]/);
    assert.match(q, /48\.815,2\.224,48\.902,2\.470/);
  }
});

test('le robot ne garde que ce que l\'appli lit, et seulement ce qu\'elle accepte', () => {
  const json = { elements: [
    { type: 'node', id: 1, lat: 48.8486001234, lon: 2.3965, tags: { tourism: 'artwork', artwork_type: 'statue', name: 'Statue', artist_name: 'Dalou', note: 'à écarter' } },
    { type: 'way', id: 2, center: { lat: 48.86, lon: 2.35 }, tags: { tourism: 'artwork', artwork_type: 'mural', name: 'Fresque' } },
    { type: 'node', id: 3, tags: { artwork_type: 'statue', name: 'Sans position' } },
  ] };
  const out = slim(json, 'oeuvres');
  assert.equal(out.length, 1);
  assert.deepEqual(out[0].tags, { name: 'Statue', artwork_type: 'statue', artist_name: 'Dalou' });
  assert.equal(out[0].lat, 48.8486);
  assert.equal(parseStreetArt({ elements: out })[0].artist, 'Dalou');
  const gal = slim({ elements: [{ type: 'node', id: 5, lat: 48.86, lon: 2.36, tags: { tourism: 'gallery', name: 'Galerie', opening_hours: 'Tu-Sa 11:00-19:00', phone: '01' } }] }, 'galeries');
  assert.deepEqual(gal[0].tags, { name: 'Galerie', opening_hours: 'Tu-Sa 11:00-19:00' });
  assert.equal(parseGalleries({ elements: gal })[0].hours, 'Tu-Sa 11:00-19:00');
});

test('une réponse coupée, trop petite ou qui perd plus de 20 % ne remplace jamais la liste d\'avant', () => {
  assert.match(refusal({ remark: 'runtime error: Query timed out in "query" at line 1 after 181 seconds.' }, 500, 0), /coupée/);
  assert.match(refusal({}, MIN_ITEMS - 1, 0), /attendus/);
  assert.match(refusal({}, 700, 1000), /20 %/);
  assert.equal(refusal({}, 900, 1000), '');
  assert.equal(refusal({}, MIN_ITEMS, 0), '');
});

test('fichiers de l\'appli : lisibles, vides tant que le robot n\'a pas réussi, sinon assez fournis', () => {
  for (const [kind, { file, parse }] of Object.entries(KINDS)) {
    const data = JSON.parse(read(file));
    assert.ok(Array.isArray(data.elements), kind);
    assert.match(data.source, /OpenStreetMap.*ODbL/);
    const n = parse(data).length;
    assert.ok(n === 0 || n >= MIN_ITEMS, `${kind} : ${n}`);
    if (n) assert.match(data.updated, /^\d{4}-\d{2}-\d{2}$/);
  }
});
