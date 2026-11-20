// v318 (mes choix 1a 2b 3a 4a du 20 nov.) : « Envoyer mes réglages » et « Importer des réglages ».
// Le fichier porte l'affichage, mes catégories et mes listes, jamais un lieu, Chez moi, une station ni le carnet ;
// la clé CARTO seulement si je coche. À l'arrivée : les réglages remplacent ceux du téléphone, qui restent derrière
// « Revenir aux miens » ; catégories et listes qui manquent s'ajoutent, rien n'est retiré.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { loadState, exportSettingsJSON, readSettingsFile, applySettingsFile, applyMySettings, sameAsMySettings, exportJSON, settingsFileName } from '../js/store.js';

const mem = () => { const m = new Map(); return { getItem: (k) => (m.has(k) ? m.get(k) : null), setItem: (k, v) => m.set(k, String(v)) }; };
const base = () => loadState(mem());
const pt = { id: 'p1', name: 'Chez Léon', lat: 48.86, lng: 2.35, cat: 'resto', lists: [] };

const moi = () => {
  const b = base();
  return { ...b, me: 'Anne', points: [pt], home: { label: '12 rue X', lat: 48.85, lng: 2.34 }, notes: [{ day: '2026-11-20', text: 'secret' }],
    rings: [300, 900], mapStyle: 'clean', theme: 'dark', voice: false, hiddenChips: ['street'], hiddenFilters: ['open'],
    masculin: false, textSize: 'tresgrand', navigo: false,
    categories: [...b.categories, { ...b.categories[0], id: 'cat-galeries', name: 'Galeries' }], lists: [{ id: 'l-dim', name: 'Dimanche' }] };
};
const lui = () => ({ ...base(), me: 'Paul', points: [{ ...pt, id: 'q1', name: 'Le Comptoir' }], masculin: true, textSize: 'grand', navigo: true, rings: [500], theme: 'light', lists: [{ id: 'l2', name: 'dimanche' }] });

test('le fichier n\'emporte ni lieu, ni Chez moi, ni carnet, ni réglage propre au téléphone', () => {
  const txt = exportSettingsJSON(moi());
  const o = JSON.parse(txt);
  assert.equal(o.kind, 'reglages');
  for (const k of ['points', 'home', 'notes', 'myStations', 'plans', 'outings', 'carto']) assert.equal(k in o, false, k);
  for (const k of ['masculin', 'textSize', 'navigo', 'pace']) assert.equal(k in o.settings, false, k);
  assert.equal(txt.includes('Chez Léon'), false);
  assert.equal(txt.includes('secret'), false);
  assert.deepEqual(o.settings.rings, [300, 900]);
  assert.ok(o.categories.some((c) => c.name === 'Galeries'));
});

test('la clé CARTO ne part que si elle est donnée, et seulement si elle est valide', () => {
  assert.equal(JSON.parse(exportSettingsJSON(moi(), 'abcd1234EFGH')).carto, 'abcd1234EFGH');
  assert.equal('carto' in JSON.parse(exportSettingsJSON(moi(), '')), false);
  assert.equal('carto' in JSON.parse(exportSettingsJSON(moi(), '<script>')), false);
});

test('une sauvegarde complète n\'est pas un fichier de réglages', () => {
  assert.equal(readSettingsFile(exportJSON(moi())), null);
  assert.equal(readSettingsFile('pas du json'), null);
  assert.ok(readSettingsFile(exportSettingsJSON(moi())));
});

test('à l\'arrivée : réglages remplacés, lieux et réglages propres gardés, « Revenir aux miens » rend les siens', () => {
  const avant = lui();
  const f = readSettingsFile(exportSettingsJSON(moi()));
  const { state: st, addedCats, addedLists } = applySettingsFile(avant, f, 1000);
  assert.deepEqual(st.rings, [300, 900]);
  assert.equal(st.theme, 'dark');
  assert.deepEqual(st.points, avant.points);
  assert.equal(st.masculin, true);
  assert.equal(st.textSize, 'grand');
  assert.equal(st.navigo, true);
  assert.equal(addedCats, 1);
  assert.equal(addedLists, 0, '« Dimanche » existe déjà sous « dimanche »');
  assert.ok(st.categories.some((c) => c.id === 'cat-galeries'));
  assert.equal(sameAsMySettings(st), false);
  const back = applyMySettings(st);
  assert.deepEqual(back.rings, [500]);
  assert.equal(back.theme, 'light');
  assert.equal(back.masculin, true);
});

test('le nom du fichier dit « réglages », sans accent', () => {
  const n = settingsFileName(new Date(2026, 10, 20), 'Anne-Lé');
  assert.equal(n, 'Ma carte de Paris - reglages de anne-le du 20-11-2026.json');
  assert.equal(/[^\x20-\x7e]/.test(n), false);
});
