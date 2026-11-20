// v333 (mes choix 1A 3A du 20 nov.) : une nouvelle version publiée se dit sous la barre du haut, en 1 appui.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { remoteVersionOf, isNewer, shouldCheck, versionNote, CHECK_EVERY_MS } from '../js/nouvelle-version.js';

const src = (f) => readFileSync(new URL(`../${f}`, import.meta.url), 'utf8');

test('le numéro se lit dans le vrai sw.js, et il est celui de l\'appli', () => {
  const n = remoteVersionOf(src('sw.js'));
  assert.ok(Number.isInteger(n) && n > 0);
  assert.match(src('js/app.js'), new RegExp(`const VERSION = '[^']*\\(${n}\\)'`));
  assert.equal(remoteVersionOf('<!doctype html><title>Ma carte de Paris</title>'), null, 'index.html rendu par le service worker sans réseau');
  assert.equal(remoteVersionOf("const TILES = 'carte-paris-tuiles';"), null);
  assert.equal(remoteVersionOf(null), null);
});

test('pas d\'information plutôt qu\'une fausse : seulement un numéro strictement plus grand', () => {
  assert.equal(isNewer(334, '333'), true);
  assert.equal(isNewer(333, '333'), false);
  assert.equal(isNewer(332, '333'), false, 'copie gardée plus ancienne');
  assert.equal(isNewer(null, '333'), false);
  assert.equal(isNewer(334, ''), false, 'numéro de l\'appli inconnu');
  assert.equal(isNewer(334.5, '333'), false);
});

test('au plus une lecture par quart d\'heure, jamais sans réseau ni appli cachée', () => {
  const now = 1e12;
  assert.equal(shouldCheck({ lastAt: 0, now }), true);
  assert.equal(shouldCheck({ lastAt: now - CHECK_EVERY_MS + 1, now }), false);
  assert.equal(shouldCheck({ lastAt: now - CHECK_EVERY_MS, now }), true);
  assert.equal(shouldCheck({ lastAt: 0, now, online: false }), false);
  assert.equal(shouldCheck({ lastAt: 0, now, hidden: true }), false);
});

test('l\'étiquette porte le nom du bouton de Réglages, qui fait la même chose', () => {
  assert.equal(versionNote(0), null);
  const n = versionNote(334);
  assert.equal(n.act, 'update');
  const app = src('js/app.js');
  assert.ok(app.includes("'Mettre à jour l\\'appli')"), 'le bouton de Mise à jour et confidentialité');
  assert.equal(n.text, 'Mettre à jour l\'appli', 'une seule ligne à 360 px, même en Très grand');
});

test('app.js : après le tri TTB caché, avant les rappels des calques ; l\'appui lance updateApp ; relu au retour sur l\'appli', () => {
  const app = src('js/app.js');
  assert.match(app, /ttbNote\(\) \?\? versionNote\(newVersion\) \?\? layerNoteOf\(/);
  assert.match(app, /n\?\.act === 'update'\) updateApp\(\)/);
  assert.match(app, /visibilityState === 'visible'\) checkNewVersion\(\)/);
  assert.match(app, /net\('sw\.js', \{ cache: 'no-store' \}\)/);
  assert.ok(src('sw.js').includes("'js/nouvelle-version.js'"), 'gardé pour le métro');
});

test('Confidentialité le dit', () => {
  assert.match(src('js/app.js'), /elle lui redemande son numéro de version, au plus tous les quarts d\\'heure, sans rien envoyer de toi/);
});
