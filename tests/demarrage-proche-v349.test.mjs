// v349 (mes choix 1A 2B+2A 3A 4A 5A du 21 nov.) : préparer le démarrage d'un proche, mis à jour.
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { defaultPreset, cleanPreset, cleanPreps, applyPreset, replaceWithPreset, encodePreset, decodePreset } from '../js/depart.js';
import { loadState, barOrderOf, exportSettingsJSON } from '../js/store.js';

const app = readFileSync(new URL('../js/app.js', import.meta.url), 'utf8');
const fresh = () => loadState({ getItem: () => null, setItem() {} });
const KEY = 'abcdEFGH1234_ijkl';

test('1A : son ordre des boutons du haut, de la colonne et des catégories part et s\'applique', async () => {
  const p = defaultPreset('Anne');
  p.chipOrder = ['lines', 'street', 'fav', 'ttb', 'velib', 'buslines', 'pratique', 'passages', 'velo', 'jardins'];
  p.mapTools = ['paris', 'locate', 'pratique', 'metro', 'home', 'circuits', 'velib', 'sorties', 'planning', 'notes'];
  p.categories = [p.categories[2], p.categories[0], p.categories[1]];
  const back = await decodePreset(await encodePreset(p));
  assert.deepEqual(back.chipOrder.slice(0, 2), ['lines', 'street']);
  const s = applyPreset(fresh(), back);
  assert.deepEqual(barOrderOf(s.chipOrder, []).slice(0, 2), ['lines', 'street']);
  assert.deepEqual(s.mapTools.slice(0, 3), ['vu', 'paris', 'locate']); // v380 : Vu en passant, nouveau, arrive en tête
  assert.deepEqual(s.categories.slice(0, 3).map((c) => c.id), p.categories.map((c) => c.id));
  assert.equal(cleanPreset({}).chipOrder, null, 'ordre de départ');
  assert.match(app, /moveChip\(\{ chipOrder: p\.chipOrder \}/);
  assert.match(app, /p\.mapTools = moveTool\(p\.mapTools, t, dd\)/);
});

test('2B : ma clé ne part que si je coche, pour un fond CARTO, et n\'est jamais gardée dans mes préparations', async () => {
  const p = { ...defaultPreset('Anne'), mapStyle: 'positron' };
  assert.equal('carto' in (await decodePreset(await encodePreset(p, KEY))), false, 'pas cochée : pas de clé');
  p.withKey = true;
  const back = await decodePreset(await encodePreset(p, KEY));
  assert.equal(back.carto, KEY);
  assert.equal('carto' in (await decodePreset(await encodePreset({ ...p, mapStyle: 'pastel' }, KEY))), false, 'fond sans clé : pas de clé');
  assert.equal('carto' in (await decodePreset(await encodePreset(p, '<script>'))), false, 'clé illisible : rien');
  const kept = cleanPreps([{ id: 'a', name: 'Pour Paul', at: 1, p: { ...p, carto: KEY } }]);
  assert.equal('carto' in kept[0].p, false, 'jamais gardée avec la préparation');
  assert.equal(kept[0].p.withKey, true);
  assert.equal('carto' in applyPreset(fresh(), back), false, 'la clé ne va jamais dans la mémoire des lieux');
});

test('2A : sans clé chez lui, « C\'est prêt » propose de demander la sienne ; une clé reçue ne remplace jamais la sienne', () => {
  assert.match(app, /needsKey\(state\.mapStyle\) && !cartoKey\(\) \? el\('button'[^\n]*'Demander ma clé gratuite'/);
  assert.match(app, /const gotKey = \(\) => \{ if \(pp\.carto && !cartoKey\(\)\)/);
  assert.equal((app.match(/gotKey\(\); state = /g) ?? []).length, 2, 'appli neuve et Remplacer');
});

test('3A : « Envoyer mes réglages » n\'a plus la case « Avec ma clé CARTO »', () => {
  assert.doesNotMatch(app, /withCarto/);
  assert.match(app, /exportSettingsJSON\(state\)\]/);
  assert.equal('carto' in JSON.parse(exportSettingsJSON(fresh())), false);
});

test('4A et 5A : où sa carte s\'ouvre, icônes seules en haut', async () => {
  const p = { ...defaultPreset(), startView: 'paris', chipIcons: true };
  const back = await decodePreset(await encodePreset(p));
  const s = applyPreset(fresh(), back);
  assert.equal(s.startView, 'paris'); assert.equal(s.startOnMe, false); assert.equal(s.chipIcons, true);
  assert.equal(cleanPreset({ startView: 'home' }).startView, 'me', 'pas Chez moi : il n\'en a pas');
  const r = replaceWithPreset({ ...fresh(), chipIcons: false, startView: 'last' }, back, 5);
  assert.equal(r.startView, 'paris'); assert.equal(r.mySettings.settings.startView, 'last', 'Revenir aux miens les garde');
});

test('Logos : les vrais (Favoris, TTB, ses catégories), pas l\'épingle grise de secours', () => {
  assert.match(app, /const chipIcon = \(k, icon\) => \(k === 'fav' \? \(\(\) => \{ const g = glyph\(DEFAULT_FAV\.icon/);
  assert.doesNotMatch(app, /catDot\(c\.id\) \?\? ico\('tags'\)/);
});
