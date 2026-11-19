// v162 : « Déjà visité » nommé par catégorie (« Déjà goûté », « Déjà vu »…).
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { didName, didLower, DID_DEFAULT } from '../js/passage.js';
import { loadState, saveState, addCategory, updateCategory, exportJSON, mergeImport, newPoint } from '../js/store.js';

const mem = () => { const m = new Map(); return { getItem: (k) => m.get(k) ?? null, setItem: (k, v) => m.set(k, String(v)) }; };

test('le nom de « Déjà visité » : celui de la catégorie, sinon par défaut', () => {
  assert.equal(didName({ did: 'Déjà goûté' }), 'Déjà goûté');
  assert.equal(didName({ did: '   ' }), DID_DEFAULT);
  assert.equal(didName({}), 'Déjà visité');
  assert.equal(didName(null), 'Déjà visité');
  assert.equal(didName({ did: 'x'.repeat(40) }).length, 24);
  assert.equal(didLower({ did: 'Déjà vu' }), 'déjà vu');
  assert.equal(didLower({}), 'déjà visité');
});

test('le nom se règle dans la catégorie, s\'efface, et part dans la sauvegarde', () => {
  const st = mem();
  let s = loadState(st);
  s = addCategory(s, { name: 'Street art', color: '#c2255c', icon: '🎨', did: ' Déjà  vu ' });
  const id = s.categories.at(-1).id;
  assert.equal(s.categories.at(-1).did, 'Déjà vu');
  s = updateCategory(s, id, { name: 'Street art', color: '#c2255c', icon: '🎨', log: 'Mes visites', did: 'Déjà vue' });
  assert.deepEqual([s.categories.at(-1).did, s.categories.at(-1).log], ['Déjà vue', 'Mes visites']);
  s.points.push(newPoint({ name: 'Mosaïque', cat: id, lat: 48.86, lng: 2.35 })); // une catégorie voyage avec ses lieux
  saveState(st, s);
  const s1 = loadState(st);
  assert.equal(s1.categories.find((c) => c.id === id).did, 'Déjà vue');
  const back = mergeImport(loadState(mem()), exportJSON(s1)).state;
  assert.equal(back.categories.find((c) => c.id === id)?.did, 'Déjà vue');
  const s2 = updateCategory(s1, id, { name: 'Street art', color: '#c2255c', icon: '🎨', log: 'Mes visites', did: '' });
  const c2 = s2.categories.find((c) => c.id === id);
  assert.ok(!('did' in c2), 'champ vidé : on revient à « Déjà visité »');
  assert.equal(c2.log, 'Mes visites', 'l\'historique n\'est pas touché');
  const s3 = updateCategory(s1, id, { name: 'Street art', color: '#c2255c', icon: '🎨', log: '', did: 'Déjà vue' });
  assert.ok(!('log' in s3.categories.find((c) => c.id === id)), 'historique vidé : « Mes impressions »');
});
