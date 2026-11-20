// ⋯ Plus dans la barre du haut (v151) : chaque bouton dans la barre, sous ⋯ Plus, ou caché.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { loadState, saveState, exportJSON, readSettings, KEY, cleanChips, cleanMoreChips, DEFAULT_MORE_CHIPS } from '../js/store.js';

const memStorage = () => { const m = new Map(); return { getItem: (k) => (m.has(k) ? m.get(k) : null), setItem: (k, v) => m.set(k, String(v)) }; };

test('Plus du haut : au départ Vélib\', Mes lignes de bus, Fontaines et toilettes, Passages couverts, Pistes à vélo, Jardins publics, rien d\'autre ne bouge', () => {
  assert.deepEqual(DEFAULT_MORE_CHIPS, ['velib', 'buslines', 'pratique', 'passages', 'velo', 'jardins']);
  assert.deepEqual(loadState(memStorage()).moreChips, ['velib', 'buslines', 'pratique', 'passages', 'velo', 'jardins', 'cat:resto', 'cat:boutique', 'cat:culture', 'cat:vu'], 'v312 : un nouveau venu a aussi les catégories et Vu en passant sous ⋯ Plus');
  const st = memStorage();
  st.setItem(KEY, JSON.stringify({ points: [], hiddenChips: ['fav'] })); // appli d'avant la v151
  const s = loadState(st);
  assert.deepEqual(s.moreChips, ['velib', 'buslines', 'pratique', 'passages', 'velo', 'jardins']);
  assert.deepEqual(s.hiddenChips, ['fav']);
});

test('Plus du haut (v168) : Passages couverts arrive sous ⋯ Plus, pas dans la barre, et reste où on le met ensuite', () => {
  const st = memStorage();
  st.setItem(KEY, JSON.stringify({ points: [], moreChips: ['velib'], hiddenChips: [] })); // réglages de la v167
  const s = loadState(st);
  assert.deepEqual(s.moreChips, ['velib', 'passages', 'buslines', 'velo', 'jardins']);
  assert.equal(s.showPassages, false, 'calque éteint au départ');
  const st2 = memStorage();
  st2.setItem(KEY, JSON.stringify({ points: [], moreChips: [], hiddenChips: ['passages'], chipsV: 1 }));
  assert.deepEqual(loadState(st2).moreChips, ['buslines', 'velo', 'jardins'], 'caché : pas aussi dans Plus (Mes lignes de bus, v228, Pistes à vélo et Jardins publics arrivent seuls)');
  saveState(st, { ...s, moreChips: ['velib'], showPassages: true }); // remis dans la barre, calque allumé
  const r = loadState(st);
  assert.deepEqual(r.moreChips, ['velib'], 'la migration ne se refait pas');
  assert.equal(r.showPassages, true);
  const back = readSettings(JSON.parse(exportJSON(r)));
  assert.deepEqual(back.moreChips, ['velib']);
  assert.equal(back.showPassages, true);
  assert.deepEqual(readSettings({ settings: { moreChips: ['lines'] } }).moreChips, ['lines', 'passages', 'buslines', 'velo', 'jardins'], 'une sauvegarde d\'avant la v167 aussi');
});

test('Plus du haut : nettoyé, gardé, jamais en même temps caché', () => {
  assert.deepEqual(cleanChips(['velib', 'pratique', 'cat:resto', '<b>', 'cat:resto']), ['velib', 'pratique', 'cat:resto']);
  assert.deepEqual(cleanMoreChips(['cat:resto', 'fav', 'x'], ['fav']), ['cat:resto']);
  assert.deepEqual(cleanMoreChips([], []), []); // tout remis dans la barre : pas de retour au réglage de départ
  const st = memStorage();
  const s = loadState(st);
  saveState(st, { ...s, moreChips: ['cat:boutique', 'cat:resto', 'lines'], hiddenChips: ['lines'] });
  const r = loadState(st);
  assert.deepEqual(r.moreChips, ['cat:boutique', 'cat:resto']);
  assert.deepEqual(r.hiddenChips, ['lines']);
  saveState(st, { ...r, moreChips: [] });
  assert.deepEqual(loadState(st).moreChips, []);
});

test('Plus du haut : dans la sauvegarde et la restauration des réglages', () => {
  const s = { ...loadState(memStorage()), moreChips: ['cat:resto'], hiddenChips: ['ttb'] };
  const back = readSettings(JSON.parse(exportJSON(s)));
  assert.deepEqual(back.moreChips, ['cat:resto']);
  assert.deepEqual(back.hiddenChips, ['ttb']);
});

test('Plus du haut : le bouton ⋯ et sa page existent, le réglage a ses trois choix', () => {
  const app = readFileSync(new URL('../js/app.js', import.meta.url), 'utf8');
  assert.match(app, /function openChipsMore\(/);
  assert.match(app, /class: 'more-chip icon-only'/);
  assert.match(app, /\[\['bar', 'Barre'\], \['more', 'Plus'\], \['hidden', 'Masqué'\]\]/);
  // un bouton rangé ou caché reste visible dans la barre tant qu'il est actif
  assert.match(app, /where\(x\.key\) !== 'bar' && x\.active/);
});

test('Plus du haut (v228) : Mes lignes de bus arrive sous ⋯ Plus une seule fois, sans ramener Passages couverts', () => {
  const st = memStorage();
  st.setItem(KEY, JSON.stringify({ points: [], moreChips: ['velib'], hiddenChips: [], chipsV: 2 })); // Passages couverts remis dans la barre
  const s = loadState(st);
  assert.deepEqual(s.moreChips, ['velib', 'buslines', 'velo', 'jardins']);
  assert.equal(s.showBusLines, false);
  saveState(st, { ...s, moreChips: ['velib'] }); // remis dans la barre
  assert.deepEqual(loadState(st).moreChips, ['velib'], 'la migration ne se refait pas');
});

test('Plus du haut (Pistes à vélo) : arrive sous ⋯ Plus une seule fois, calque éteint, gardé dans la sauvegarde', () => {
  const st = memStorage();
  st.setItem(KEY, JSON.stringify({ points: [], moreChips: ['passages'], hiddenChips: [], chipsV: 3 })); // réglages de la v256
  const s = loadState(st);
  assert.deepEqual(s.moreChips, ['passages', 'velo', 'jardins'], 'sous ⋯ Plus, rien ne bouge dans la barre');
  assert.equal(s.showVelo, false, 'éteint au départ');
  saveState(st, { ...s, moreChips: ['passages'], showVelo: true }); // remis dans la barre, calque allumé
  const r = loadState(st);
  assert.deepEqual(r.moreChips, ['passages'], 'la migration ne se refait pas');
  assert.equal(r.showVelo, true);
  const back = readSettings(JSON.parse(exportJSON(r)));
  assert.equal(back.showVelo, true);
  const st2 = memStorage();
  st2.setItem(KEY, JSON.stringify({ points: [], moreChips: [], hiddenChips: ['velo'], chipsV: 3 }));
  assert.deepEqual(loadState(st2).moreChips, ['jardins'], 'caché : pas aussi dans Plus (Jardins publics, v261, arrive seul)');
});

test('Plus du haut (v261) : Jardins publics arrive sous ⋯ Plus une seule fois, sans pousser les catégories de la barre', () => {
  const st = memStorage();
  st.setItem(KEY, JSON.stringify({ points: [], moreChips: ['velib'], hiddenChips: [], chipsV: 4 })); // Pistes à vélo remis dans la barre
  const s = loadState(st);
  assert.deepEqual(s.moreChips, ['velib', 'jardins']);
  assert.equal(s.showJardins, false, 'calque éteint au départ');
  assert.equal(s.jardinsNow, false, 'grand jardin dans « Maintenant » : éteint au départ');
  saveState(st, { ...s, moreChips: ['velib'], showJardins: true, jardinsNow: true }); // remis dans la barre, allumés
  const r = loadState(st);
  assert.deepEqual(r.moreChips, ['velib'], 'la migration ne se refait pas');
  assert.equal(r.showJardins, true);
  assert.equal(r.jardinsNow, true);
  const back = readSettings(JSON.parse(exportJSON(r)));
  assert.equal(back.showJardins, true);
  assert.deepEqual(cleanChips(['jardins']), ['jardins']);
});

test('Plus du haut (v272) : aucun bouton du haut ne porte le nom d\'un bouton de la colonne de droite (Vélib\', Fontaine et WC font autre chose)', () => {
  const src = readFileSync(new URL('../js/app.js', import.meta.url), 'utf8');
  const unq = (t) => t.replace(/\\'/g, '\'');
  const chips = [...src.slice(src.indexOf('function chipItems('), src.indexOf('function openChipsMore(')).matchAll(/\{ key: '(\w+)', name: '((?:\\'|[^'])*)'/g)].map((m) => [m[1], unq(m[2])]);
  const box = src.slice(src.indexOf('const TOOL_INFO = {'), src.indexOf('};', src.indexOf('const TOOL_INFO = {')));
  const tools = [...box.matchAll(/short: '((?:\\'|[^'])*)'/g)].map((m) => unq(m[1]).toLowerCase());
  assert.ok(chips.length >= 12 && tools.length >= 10, 'noms relus dans app.js');
  for (const [key, name] of chips) assert.ok(!tools.includes(name.toLowerCase()), `${key} : « ${name} » est aussi un bouton de la colonne`);
  assert.equal(Object.fromEntries(chips).velib, 'Vélib\' sur la carte');
  assert.equal(Object.fromEntries(chips).pratique, 'Fontaines et WC sur la carte');
});
