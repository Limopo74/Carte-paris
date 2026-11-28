// v556 (mes choix 1A 2A du 28 nov.) : la station dans le SMS au 31177, seulement si elle est sûre ; sinon rien (pas d'information fausse).
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { sureStation, sms31177Text } from '../js/alerte.js';

const now = 1_800_000_000_000;
const at = { lat: 48.88, lng: 2.33, acc: 30, time: now - 30e3 };
const near = { station: { n: 'Blanche' }, d: 120 };

test('station sûre : position récente, précise, station proche', () => {
  assert.equal(sureStation(at, near, now), 'Blanche');
  assert.match(sms31177Text('Blanche'), /^Je ne peux pas parler\. Station la plus proche : Blanche\. Ligne : … Ce qui se passe : $/);
});

test('pas de station si la position est vieille, imprécise, sans heure, ou la station loin', () => {
  assert.equal(sureStation({ ...at, time: now - 121e3 }, near, now), '');
  assert.equal(sureStation({ ...at, acc: 150 }, near, now), '');
  assert.equal(sureStation({ ...at, acc: undefined }, near, now), '');
  assert.equal(sureStation({ lat: 48.88, lng: 2.33, acc: 20 }, near, now), '');
  assert.equal(sureStation(at, { ...near, d: 301 }, now), '');
  assert.equal(sureStation(null, near, now), '');
  assert.equal(sms31177Text(''), 'Je ne peux pas parler. Ligne : … Station ou direction : … Ce qui se passe : ');
});

test('Secours et Alerter en silence passent tous deux par sms31177Href (même bouton, même chose)', () => {
  const app = readFileSync(new URL('../js/app.js', import.meta.url), 'utf8');
  assert.doesNotMatch(app, /smsHref\(TRANSPORT_SMS, sms31177Text\(\)\)/);
  assert.equal((app.match(/href: sms31177Href\(/g) || []).length, 2);
});
