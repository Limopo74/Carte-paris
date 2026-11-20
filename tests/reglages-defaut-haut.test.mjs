// v294 (mon choix A du 20 nov.) : « Enregistrer mes réglages par défaut » garde aussi les boutons du haut (masqués, sous ⋯ Plus,
// leur ordre), les lignes masquées de Filtres et « Seulement les vérifiées » (TTB) ; « Revenir aux miens » les remet.
// Des réglages par défaut enregistrés avant la v294 ne les changent pas et restent « enregistrés » (pas de faux « Tu as changé »).
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { loadState, saveState, saveMySettings, applyMySettings, sameAsMySettings, cleanSettings, CHIPS_V } from '../js/store.js';

const mem = () => { const m = new Map(); return { getItem: (k) => (m.has(k) ? m.get(k) : null), setItem: (k, v) => m.set(k, String(v)) }; };
const base = () => loadState(mem());
const moi = () => ({ ...base(), hiddenChips: ['street'], moreChips: ['velib', 'jardins'], chipOrder: ['ttb', 'fav', 'street', 'lines', 'velib', 'buslines', 'pratique', 'passages', 'velo', 'jardins'], hiddenFilters: ['open', 'arr'], ttbOk: true });

test('enregistrés puis changés, « Revenir aux miens » les remet', () => {
  const st = saveMySettings(moi());
  assert.equal(sameAsMySettings(st), true);
  const change = { ...st, hiddenChips: [], moreChips: [], chipOrder: null, hiddenFilters: [], ttbOk: false };
  assert.equal(sameAsMySettings(change), false);
  const back = applyMySettings(change);
  assert.deepEqual(back.hiddenChips, ['street']);
  assert.deepEqual(back.moreChips, ['velib', 'jardins']);
  assert.equal(back.chipOrder[0], 'ttb');
  assert.deepEqual(back.hiddenFilters, ['open', 'arr']);
  assert.equal(back.ttbOk, true);
  assert.equal(sameAsMySettings(back), true);
});

test('ils passent par le téléphone : enregistrés, relus après un redémarrage', () => {
  const s = mem();
  saveState(s, saveMySettings(moi()));
  const st = loadState(s);
  assert.equal(st.mySettings.settings.ttbOk, true);
  assert.deepEqual(st.mySettings.settings.hiddenFilters, ['open', 'arr']);
  assert.equal(st.mySettings.settings.chipsV, CHIPS_V);
  assert.equal(sameAsMySettings(st), true);
});

test('des réglages par défaut d\'avant la v294 ne touchent ni aux boutons du haut, ni aux filtres, ni à TTB', () => {
  const ancien = { at: 1, settings: { ...cleanSettings(base()), hiddenChips: undefined, moreChips: undefined, chipOrder: undefined, chipsV: undefined, hiddenFilters: undefined, ttbOk: undefined } };
  const s = mem();
  saveState(s, { ...moi(), mySettings: ancien });
  const st = loadState(s);
  assert.equal('hiddenChips' in st.mySettings.settings, false);
  assert.equal(sameAsMySettings(st), true); // rien d'autre n'a changé : pas de « Tu as changé des réglages »
  const back = applyMySettings(st);
  assert.deepEqual(back.hiddenChips, ['street']); assert.equal(back.ttbOk, true); assert.deepEqual(back.hiddenFilters, ['open', 'arr']);
});
