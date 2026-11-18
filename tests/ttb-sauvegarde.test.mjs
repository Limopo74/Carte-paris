// TTB dans ma sauvegarde (v179) : ttbExport et ttbMerge (js/ttb.js)
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { ttbExport, ttbMerge, ttbKey, readTtb } from '../js/ttb.js';

const item = (name, n = 11) => ({ name, rub: 'La Table', cuisine: 'Bistrot', address: `3 rue X, 750${n} Paris`, arr: n, budget: 2, url: '', hours: [], lat: 48.86, lng: 2.37 });
const list = (date, names) => ({ date, items: names.map((x) => item(x)) });
const mark = (name, k, at = 1) => ({ [ttbKey(item(name))]: { n: name, k, at } });

test('TTB sauvegarde : rien à exporter sans liste ni marque ; sinon liste, date et marques, relisibles', () => {
  assert.equal(ttbExport(null, {}), null);
  assert.equal(ttbExport({ items: [], date: '' }, null), null);
  const out = ttbExport(list('2026-11-16', ['A', 'B']), mark('A', 'hidden'));
  assert.equal(out.ttb, 1); assert.equal(out.date, '2026-11-16'); assert.equal(out.items.length, 2);
  assert.equal(Object.keys(out.marks).length, 1);
  const back = readTtb(JSON.parse(JSON.stringify(out)));
  assert.deepEqual(back.items.map((x) => x.name), ['A', 'B']);
  assert.equal(ttbExport(null, mark('A', 'closed')).items.length, 0, 'des marques seules partent aussi');
});

test('TTB fusion : la liste la plus récente gagne, à date égale celle du téléphone reste', () => {
  const file = ttbExport(list('2026-11-16', ['Nouveau']), {});
  assert.equal(ttbMerge({ data: list('2026-10-02', ['Ancien']), marks: {} }, file).list, true);
  assert.deepEqual(ttbMerge({ data: list('2026-10-02', ['Ancien']), marks: {} }, file).data.items.map((x) => x.name), ['Nouveau']);
  const same = ttbMerge({ data: list('2026-11-16', ['Le mien']), marks: {} }, file);
  assert.equal(same.list, false); assert.deepEqual(same.data.items.map((x) => x.name), ['Le mien']);
  const older = ttbMerge({ data: list('2026-12-01', ['Le mien']), marks: {} }, file);
  assert.equal(older.list, false);
  assert.equal(ttbMerge({ data: null, marks: {} }, file).list, true, 'pas de liste sur le téléphone : celle du fichier');
  assert.equal(ttbMerge({ data: list('', ['Le mien']), marks: {} }, file).list, true, 'liste du téléphone sans date : celle du fichier, datée, gagne');
  assert.equal(ttbMerge({ data: list('2026-10-02', ['Le mien']), marks: {} }, ttbExport(list('', ['Sans date']), {})).list, false, 'fichier sans date : la mienne reste');
  assert.equal(ttbMerge({ data: list('2026-10-02', ['Le mien']), marks: {} }, null).list, false);
});

test('TTB fusion : mes marques restent, celles du fichier s\'ajoutent', () => {
  const file = ttbExport(list('2026-11-16', ['A']), { ...mark('A', 'closed', 5), ...mark('B', 'hidden', 6) });
  const r = ttbMerge({ data: list('2026-11-16', ['A']), marks: mark('A', 'hidden', 1) }, file);
  assert.equal(r.marks[ttbKey(item('A'))].k, 'hidden', 'ma marque l\'emporte');
  assert.equal(r.marks[ttbKey(item('B'))].k, 'hidden');
  assert.equal(r.newMarks, 1);
  assert.equal(ttbMerge({ data: null, marks: {} }, { ttb: 1, items: 'x', marks: { 'mauvaise clé': { k: 'closed', at: 1 } } }).newMarks, 0, 'un fichier abîmé n\'ajoute rien');
});
