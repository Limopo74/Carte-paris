// v147 : « L'essentiel » — les boutons choisis restent sur la carte, les autres passent dans Plus ; on peut revenir en arrière.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { cleanEssentials, cleanLayout, essentialLayout, DEFAULT_ESSENTIALS, MAP_TOOLS, loadState, saveState, exportJSON, readSettings } from '../js/store.js';

const memStorage = () => { const m = new Map(); return { getItem: (k) => (m.has(k) ? m.get(k) : null), setItem: (k, v) => m.set(k, String(v)) }; };

test('l\'essentiel : boutons connus, au moins un', () => {
  assert.deepEqual(cleanEssentials(), DEFAULT_ESSENTIALS);
  assert.deepEqual(cleanEssentials([]), DEFAULT_ESSENTIALS);
  assert.deepEqual(cleanEssentials(['locate', 'inconnu', 'metro', 'metro']), ['metro', 'locate']);
});

test('ne garder que l\'essentiel : le reste dans Plus, rien de caché, la disposition d\'avant est gardée', () => {
  const s = { mapTools: [...MAP_TOOLS], hiddenTools: ['velib'], moreTools: ['pratique'], essentials: ['sorties', 'locate'] };
  const r = essentialLayout(s);
  assert.deepEqual(r.hiddenTools, []);
  assert.deepEqual(r.moreTools, MAP_TOOLS.filter((t) => !['sorties', 'locate'].includes(t)));
  assert.deepEqual(r.layoutBefore, { mapTools: MAP_TOOLS, hiddenTools: ['velib'], moreTools: ['pratique'] });
});

test('appliqué deux fois : la disposition d\'avant reste celle d\'origine', () => {
  const s = { mapTools: [...MAP_TOOLS], hiddenTools: [], moreTools: ['pratique'], essentials: ['sorties', 'locate'] };
  const r1 = essentialLayout(s);
  const r2 = essentialLayout({ ...s, ...r1, essentials: ['paris'] });
  assert.deepEqual(r2.layoutBefore.moreTools, ['pratique']);
});

test('une disposition abîmée est nettoyée ou ignorée', () => {
  assert.equal(cleanLayout(null), null);
  assert.equal(cleanLayout([1]), null);
  assert.deepEqual(cleanLayout({ mapTools: ['x'], hiddenTools: ['home', 'x'], moreTools: ['home', 'velib'] }).moreTools, ['velib', 'circuits', 'notes'], 'un bouton caché n\'est pas aussi dans Plus');
});

test('l\'essentiel et la disposition d\'avant sont gardés ; l\'essentiel part avec la sauvegarde', () => {
  const st = memStorage();
  const s = loadState(st);
  assert.deepEqual(s.essentials, DEFAULT_ESSENTIALS);
  assert.equal(s.layoutBefore, null);
  const r = essentialLayout({ ...s, essentials: ['home', 'locate'] });
  assert.ok(saveState(st, { ...s, essentials: ['home', 'locate'], hiddenTools: r.hiddenTools, moreTools: r.moreTools, layoutBefore: r.layoutBefore }));
  const back = loadState(st);
  assert.deepEqual(back.essentials, ['home', 'locate']);
  assert.deepEqual(back.moreTools, MAP_TOOLS.filter((t) => !['home', 'locate'].includes(t)));
  assert.deepEqual(back.layoutBefore.moreTools, ['velib', 'home', 'circuits', 'notes'], 'v313 : la disposition d\'un nouveau venu (Fontaine et WC masqué)');
  assert.deepEqual(readSettings(JSON.parse(exportJSON(back))).essentials, ['home', 'locate']);
});
