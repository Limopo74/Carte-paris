// v443 (défaut trouvé le 25 nov., mon choix 1A) : dans une préparation pour un proche, un bouton du haut plus récent qu'elle
// arrive dans ⋯ Plus chez lui, jamais dans sa barre (comme mes réglages, `chipsV`).
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { cleanPreset, cleanPreps, defaultPreset, encodePreset, decodePreset } from '../js/depart.js';
import { CHIPS_V } from '../js/store.js';

// Une préparation enregistrée avant la v372 : pas de « Mes artistes », pas de chipsV
const old = { hiddenChips: ['ttb', 'fav'], moreChips: ['velib', 'buslines', 'pratique', 'passages', 'velo', 'jardins'], steps: {} };
const avant372 = Date.UTC(2026, 10, 20, 12, 0);
const apres372 = Date.UTC(2026, 10, 24, 12, 0);

test('préparation d\'avant la v372 : Mes artistes dans ⋯ Plus, pas dans la barre', () => {
  const [x] = cleanPreps([{ id: 'p1', name: 'Pour Paul', at: avant372, p: old }]);
  assert.ok(x.p.moreChips.includes('artistes'), 'Mes artistes dans Plus');
  assert.ok(!x.p.hiddenChips.includes('artistes'));
  assert.equal(x.p.chipsV, CHIPS_V);
  for (const k of old.moreChips) assert.ok(x.p.moreChips.includes(k), `${k} reste dans Plus`);
});

test('préparation plus récente : Mes artistes laissé dans la barre reste dans la barre (mon choix d\'alors)', () => {
  const [x] = cleanPreps([{ id: 'p1', name: 'Pour Paul', at: apres372, p: old }]);
  assert.ok(!x.p.moreChips.includes('artistes'));
});

test('Mes artistes masqué reste masqué', () => {
  const [x] = cleanPreps([{ id: 'p1', name: 'Pour Paul', at: avant372, p: { ...old, hiddenChips: ['ttb', 'fav', 'artistes'] } }]);
  assert.ok(x.p.hiddenChips.includes('artistes') && !x.p.moreChips.includes('artistes'));
});

test('un bouton du haut plus récent que la préparation (chipsV plus petit) va dans Plus ; le lien porte chipsV', async () => {
  const p = cleanPreset({ ...old, chipsV: 5 });
  assert.ok(p.moreChips.includes('artistes'));
  assert.equal(defaultPreset().chipsV, CHIPS_V);
  const back = await decodePreset(await encodePreset({ ...old, chipsV: 5 }));
  assert.ok(back.moreChips.includes('artistes'));
  assert.equal(back.chipsV, CHIPS_V);
  const again = cleanPreset(back);
  assert.deepEqual(again.moreChips, back.moreChips, 'nettoyée deux fois : rien ne bouge');
});
