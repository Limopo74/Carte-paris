// v295 (mon choix A du 20 nov.) : mes marques TTB (vérifiée, fermée, masquée) comptent dans « changements non sauvegardés ».
// Elles sont gardées à part : l'appli les passe à l'empreinte (withMarks, js/app.js) ; sans marque, l'empreinte reste celle d'avant.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { backupHash, trackChange, savedBackup } from '../js/store.js';

const st = { points: [{ id: 'a', name: 'A', cat: 'resto', lat: 48.8, lng: 2.3 }], categories: [], lists: [], fav: {}, myStations: [] };
const marque = { 'chez paul|75013': { n: 'Chez Paul', k: 'ok', at: 1 } };

test('sans marque, l\'empreinte est exactement celle d\'avant', () => {
  assert.equal(backupHash({ ...st, ttbMarks: {} }), backupHash(st));
});

test('poser puis retirer une marque compte, puis revient à zéro', () => {
  const b0 = savedBackup({ ...st, ttbMarks: {} });
  const b1 = trackChange({ ...st, ttbMarks: marque, backup: b0 });
  assert.equal(b1.n, 1);
  const b2 = trackChange({ ...st, ttbMarks: {}, backup: b1 });
  assert.equal(b2.n, 0);
});

test('l\'appli passe les marques à chaque empreinte, et une marque posée enregistre', () => {
  const app = readFileSync(new URL('../js/app.js', import.meta.url), 'utf8');
  assert.match(app, /state\.backup = trackChange\(withMarks\(state\)\)/);
  assert.match(app, /function markSaved\(\) \{ state\.lastExport = Date\.now\(\); state\.backup = savedBackup\(withMarks\(state\)\)/);
  assert.equal((app.match(/savedBackup\(state\)/g) ?? []).length, 0);
  assert.match(app, /function putTtbMark[\s\S]{0,400}persist\(\); \/\/ v295/);
});
