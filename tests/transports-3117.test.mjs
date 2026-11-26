// v540 (mon oui du 26 nov.) : « Transports 3117 » dans Alerter en silence, sous Police 17 ; le SMS au 31177 garde sa place.
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { TRANSPORT_TEL, TRANSPORT_SMS } from '../js/alerte.js';

const app = readFileSync(new URL('../js/app.js', import.meta.url), 'utf8');
const f = app.slice(app.indexOf('function openSilentAlert('), app.indexOf("openSheet([ico('volume-x'), ' Alerter en silence']"));

test('numéros des transports', () => {
  assert.equal(TRANSPORT_TEL, '3117');
  assert.equal(TRANSPORT_SMS, '31177');
});

test('le bouton 3117 vient juste sous Police 17, après le SMS au 31177', () => {
  const sms = f.indexOf("'SMS au 31177 (transports)'"), police = f.indexOf("'Police 17'"), tel = f.indexOf("'Transports 3117'");
  assert.ok(sms > 0 && police > sms && tel > police);
  assert.match(f, /href: `tel:\$\{TRANSPORT_TEL\}`/);
  assert.ok(f.slice(police, tel).split('\n').length <= 3, 'juste sous Police 17');
});

test('l\'aide et les sources le disent', () => {
  assert.ok(app.includes('Transports 3117 (RATP et SNCF, gratuit)'));
  assert.ok(app.includes('3117 (appel) et 31177 (SMS) : RATP et SNCF'));
});
