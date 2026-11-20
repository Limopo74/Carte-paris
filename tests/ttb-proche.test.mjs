// TTB pour un proche (v330, mes choix 1A 3A 4A 5A 6A du 20 nov.) : seulement mes vérifiées, fichier partiel, « Vérifiée par »
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { ttbExport, ttbMerge, ttbKey, ttbState, ttbCheckedBy, cleanTtbMarks } from '../js/ttb.js';

const NOW = Date.UTC(2026, 10, 20);
const DAY = 864e5;
const item = (name, n = 11) => ({ name, rub: 'La Table', cuisine: 'Bistrot', address: `3 rue ${name}, 750${n} Paris`, arr: n, budget: 2, url: '', hours: [], lat: 48.86, lng: 2.37 });
const list = (date, names) => ({ date, items: names.map((x) => item(x)) });
const mk = (name, k, at) => [ttbKey(item(name)), { n: name, k, at }];
const marks = Object.fromEntries([mk('Vu', 'ok', NOW - 10 * DAY), mk('Vieux', 'ok', NOW - 200 * DAY), mk('Ferme', 'closed', NOW - 5 * DAY), mk('Cache', 'hidden', NOW - 5 * DAY)]);
const mine = list('2026-11-16', ['Vu', 'Vieux', 'Ferme', 'Cache', 'Jamais']);

test('Seulement mes vérifiées : les adresses vérifiées depuis moins de 6 mois, leurs marques et mes « fermées » ; jamais les masquées', () => {
  const out = ttbExport(mine, marks, { friend: true, onlyOk: true, now: NOW });
  assert.equal(out.part, 1);
  assert.deepEqual(out.items.map((x) => x.name), ['Vu']);
  assert.deepEqual(Object.values(out.marks).map((v) => v.k).sort(), ['closed', 'ok']);
});

test('Toute la liste pour un proche : tout part sauf mes masquées ; la sauvegarde, elle, garde tout', () => {
  const friend = ttbExport(mine, marks, { friend: true, now: NOW });
  assert.equal(friend.part, undefined);
  assert.equal(friend.items.length, 5);
  assert.ok(!Object.values(friend.marks).some((v) => v.k === 'hidden'));
  const backup = ttbExport(mine, marks);
  assert.equal(Object.values(backup.marks).filter((v) => v.k === 'hidden').length, 1);
  assert.equal(backup.part, undefined);
});

test('Un fichier partiel ajoute ce qui manque et ne remplace jamais la liste, même avec une page plus récente', () => {
  const file = JSON.parse(JSON.stringify({ ...ttbExport(list('2026-11-19', ['Vu', 'Nouveau']), Object.fromEntries([mk('Vu', 'ok', NOW), mk('Nouveau', 'ok', NOW)]), { friend: true, onlyOk: true, now: NOW }) }));
  const his = list('2026-10-01', ['Vu', 'A', 'B']);
  const r = ttbMerge({ data: his, marks: {} }, file, 'Paul');
  assert.equal(r.part, true);
  assert.equal(r.added, 1);
  assert.deepEqual(r.data.items.map((x) => x.name), ['Vu', 'A', 'B', 'Nouveau']);
  assert.equal(r.data.date, '2026-10-01', 'sa date reste : la page du guide n\'a pas été réimportée');
  assert.equal(ttbMerge({ data: list('2026-10-01', ['Vu', 'Nouveau']), marks: {} }, file).list, false, 'rien de nouveau : rien ne change');
  const empty = ttbMerge({ data: null, marks: {} }, file, 'Paul');
  assert.deepEqual(empty.data.items.map((x) => x.name), ['Vu', 'Nouveau']);
});

test('« Vérifiée par » : une marque d\'un proche garde son prénom ; la mienne n\'en a pas ; une marque transmise garde le premier', () => {
  const file = ttbExport(list('2026-11-19', ['Vu']), Object.fromEntries([mk('Vu', 'ok', NOW)]), { friend: true, onlyOk: true, now: NOW });
  const r = ttbMerge({ data: null, marks: {} }, file, 'Paul');
  assert.equal(ttbCheckedBy(r.marks, item('Vu')), 'Paul');
  assert.equal(ttbState(r.marks, item('Vu'), NOW), 'ok');
  assert.equal(ttbCheckedBy(marks, item('Vu')), '');
  const again = ttbMerge({ data: null, marks: {} }, ttbExport(r.data, r.marks, { friend: true, onlyOk: true, now: NOW }), 'Léa');
  assert.equal(ttbCheckedBy(again.marks, item('Vu')), 'Paul');
  assert.equal(cleanTtbMarks({ [ttbKey(item('Vu'))]: { n: 'Vu', k: 'ok', at: NOW, by: 42 } })[ttbKey(item('Vu'))].by, undefined);
});

test('Une vérification plus récente d\'un proche remplace la mienne et compte comme marque à garder', () => {
  const old = Object.fromEntries([mk('Vu', 'ok', NOW - 100 * DAY)]);
  const r = ttbMerge({ data: list('2026-11-16', ['Vu']), marks: old }, { ttb: 1, date: '', items: [], marks: Object.fromEntries([mk('Vu', 'ok', NOW)]) }, 'Paul');
  assert.equal(r.newMarks, 1);
  assert.equal(r.marks[ttbKey(item('Vu'))].by, 'Paul');
});

test('Dans l\'appli : le choix « Mes vérifiées / Toute la liste », le prénom passé à l\'import, la fiche et le bouton du message', () => {
  const app = readFileSync(new URL('../js/app.js', import.meta.url), 'utf8');
  assert.match(app, /chip\(`Mes vérifiées \$\{nbOk\}`/);
  assert.match(app, /chip\('Toute la liste'/);
  assert.match(app, /ttbExport\(ttbData, ttbMarksNow\(\), \{ friend: true, onlyOk: ttbOnly \}\)/);
  assert.match(app, /importTtb\(text, owner\)/);
  assert.match(app, /Vérifiée\$\{ttbCheckedBy\(/);
  assert.match(app, /label: 'Seulement les vérifiées'/);
});
