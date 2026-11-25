// v508 (mes réponses 12 bis A, 13 A, 20 A, 26 A du 25 nov.) : urgences adultes de l'AP-HP dans Paris (liste à la main, sourcée),
// pharmacie de garde 32 37, radio FM en Coupure, lien Vigipirate en Abri (jamais le niveau lui-même).
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { URGENCES, urgencesNear, telText, PHARMA_TEL, PHARMA_URL, RADIO_TEXT, VIGIPIRATE_URL, URGENCES_SOURCE } from '../js/urgences.js';
import { distanceM } from '../js/geo.js';

const app = readFileSync(new URL('../js/app.js', import.meta.url), 'utf8');
const sw = readFileSync(new URL('../sw.js', import.meta.url), 'utf8');

test('9 urgences dans Paris, positions dans Paris, téléphones à 10 chiffres', () => {
  assert.equal(URGENCES.length, 9);
  for (const x of URGENCES) {
    assert.ok(x.lat > 48.81 && x.lat < 48.91 && x.lng > 2.22 && x.lng < 2.47, x.name);
    assert.match(x.tel, /^0[1-9]\d{8}$/, x.name);
    assert.match(x.address, /, 750\d\d$/, x.name);
  }
  assert.match(URGENCES_SOURCE, /^https:\/\/www\.aphp\.fr\//);
  assert.equal(telText('0142348232'), '01 42 34 82 32');
});

test('de la plus proche ; sans position, la liste telle quelle', () => {
  const near = urgencesNear({ lat: 48.8530, lng: 2.3490 }, distanceM);
  assert.equal(near[0].x.name, 'Hôtel-Dieu');
  assert.ok(near.every((t, i) => i === 0 || t.d >= near[i - 1].d));
  assert.equal(urgencesNear(null, distanceM)[0].d, null);
});

test('crise : ligne Urgences, pharmacie, radio en Coupure, Vigipirate en Abri', () => {
  assert.equal(PHARMA_TEL, '3237');
  assert.equal(PHARMA_URL, 'https://www.3237.fr/');
  assert.equal(RADIO_TEXT, 'Radio FM à Paris : franceinfo 105.5, France Inter 87.8');
  assert.equal(VIGIPIRATE_URL, 'https://www.info.gouv.fr/risques/le-plan-vigipirate');
  assert.match(app, /row\('heart-pulse', 'Urgences à l\\'hôpital', 'AP-HP, 24 h\/24 · pharmacie de garde', \(\) => openUrgences\(pos, back\)\)/);
  assert.match(app, /crisis\.k === 'coupure' \? el\('p', \{ class: 'help crisis-radio' \}/);
  assert.match(app, /crisis\.k === 'abri' \? el\('a', \{ class: 'btn', href: VIGIPIRATE_URL/);
  assert.doesNotMatch(app, /Vigipirate[^\n]*(vigilance renforcée|alerte attentat)'/i, 'jamais le niveau écrit dans l\'appli');
  assert.match(sw, /'js\/urgences\.js'/);
});
