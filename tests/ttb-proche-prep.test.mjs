// v352 : « Envoyer mes TTB vérifiées » depuis une préparation de Mes proches (ma demande du 21 nov.)
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { ttbFileName } from '../js/store.js';

const app = readFileSync(new URL('../js/app.js', import.meta.url), 'utf8');

test('la ligne existe sous les anciennes, seulement avec au moins une vérifiée', () => {
  const one = app.slice(app.indexOf('function openPrepOne('), app.indexOf('async function openPrepSend('));
  assert.ok(one.indexOf("'Envoyer mes TTB vérifiées'") > one.indexOf("'Dupliquer'"), 'sous Dupliquer');
  assert.match(one, /nbOk \? el\('button'/);
});

test('le fichier : seulement les vérifiées, partiel, à mon prénom, aucun lieu', () => {
  const f = app.slice(app.indexOf('async function sendTtbOkFile('), app.indexOf('function openSendFriend('));
  assert.match(f, /ttbExport\(ttbData, ttbMarksNow\(\), \{ friend: true, onlyOk: true \}\)/);
  assert.match(f, /lieux: false, plans: false, artists: false, venues: false, circuits: false/);
  assert.match(f, /\{ \.\.\.state, me \}/);
  assert.match(f, /shareFriendFile\(/);
});

test('le nom du fichier', () => {
  assert.equal(ttbFileName(new Date(2026, 10, 21), 'Marie', 3), 'Ma carte de Paris - TTB vérifiées de Marie du 21-11-2026 (3 adresses).json');
  assert.equal(ttbFileName(new Date(2026, 10, 21), '', 1), 'Ma carte de Paris - TTB vérifiées du 21-11-2026 (1 adresse).json');
});
