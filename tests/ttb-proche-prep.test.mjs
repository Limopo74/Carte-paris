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

test('v353 : un partage refusé par le téléphone passe par Téléchargements ; seule mon annulation reste muette ; jamais rien du tout', () => {
  const f = app.slice(app.indexOf('async function shareFriendFile('), app.indexOf('async function sendTtbOkFile('));
  assert.match(f, /e\?\.name === 'AbortError'\) return;/);
  assert.doesNotMatch(f, /catch \{ return; \/\* annulé \*\/ \}/);
  const s = app.slice(app.indexOf('async function sendTtbOkFile('), app.indexOf('async function sendTtbOkFileNow('));
  assert.match(s, /try \{ await sendTtbOkFileNow\(me\); \} catch \{ toast\(/);
});

test('v357 : la sauvegarde et Mes réglages ne restent muets que pour mon annulation', () => {
  const b = app.slice(app.indexOf('async function sendBackup('), app.indexOf('async function sendSettings('));
  assert.match(b, /if \(e\?\.name !== 'AbortError'\) downloadBackup\(f\)/);
  const r = app.slice(app.indexOf('async function sendSettings('), app.indexOf('async function sendSettings(') + 1500);
  assert.match(r, /if \(e\?\.name === 'AbortError'\) return;/);
  assert.doesNotMatch(r, /catch \{ \/\* annulé \*\/ \}\n    return;/);
});
