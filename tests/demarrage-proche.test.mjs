// v321 : préparer le démarrage d'un proche (mes choix du 20 nov.).
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { defaultPreset, cleanPreset, cleanPreps, applyPreset, replaceWithPreset, encodePreset, decodePreset, presetLink, readPresetCode, DEPART_MAX, MSG_MAX, FREE_STYLES } from '../js/depart.js';
import { loadState } from '../js/store.js';

const app = readFileSync(new URL('../js/app.js', import.meta.url), 'utf8');
const fresh = () => loadState({ getItem: () => null, setItem() {} });

test('Le lien aller-retour : tout revient, et rien de plus', async () => {
  const p = defaultPreset('Anne');
  Object.assign(p, { msg: 'Commence par Autour de moi !', masculin: true, textSize: 'tresgrand', mapStyle: 'pastel', ficheHidden: ['qr'], voice: false });
  p.steps.position = false;
  p.categories.push({ id: 've', name: 'Vêtements', color: '#8a5a44', icon: '👕' });
  p.lists = [{ id: 'l1', name: 'À faire' }];
  const code = await encodePreset(p);
  assert.ok(code.length < 900, `lien court (${code.length})`);
  const back = await decodePreset(code);
  assert.deepEqual(back, cleanPreset(p));
  assert.equal(readPresetCode(`#depart=${code}`), code);
  assert.equal(readPresetCode(new URL(presetLink('https://x.test/Carte-paris/', code)).hash), code);
  for (const k of ['points', 'name', 'carto', 'ttb', 'myStations', 'home']) assert.ok(!(k in back), `${k} ne part pas`);
});

test('Un lien abîmé ou trafiqué ne casse rien', async () => {
  assert.equal(await decodePreset('xxxxxxxxxxxxxxxxxx'), null);
  assert.equal(await decodePreset('<script>'), null);
  const p = cleanPreset({ msg: 'a'.repeat(500), mapStyle: 'clean', textSize: 'énorme', hiddenChips: ['<b>', 'ttb'], categories: [{ id: 'x', name: '', color: 'red' }] });
  assert.equal(p.msg.length, MSG_MAX);
  assert.equal(p.mapStyle, 'clean', 'v349 : un fond CARTO peut se préparer (sa clé, ou la mienne si je coche)');
  assert.equal(cleanPreset({ mapStyle: 'inconnu' }).mapStyle, 'eclairci');
  assert.ok(FREE_STYLES.includes(cleanPreset({ mapStyle: 'satellite' }).mapStyle));
  assert.equal(p.textSize, 'normal');
  assert.deepEqual(p.hiddenChips, ['ttb']);
  assert.ok(p.categories.length >= 1, 'au moins une catégorie');
});

test('Appli neuve : son départ entier, Vu en passant compris', () => {
  const p = cleanPreset({ ...defaultPreset(), masculin: true, mapStyle: 'hot', categories: [{ id: 've', name: 'Vêtements', color: '#8a5a44', icon: '👕' }], lists: [{ id: 'l1', name: 'À faire' }], voice: false });
  const s = applyPreset(fresh(), p);
  assert.equal(s.masculin, true); assert.equal(s.mapStyle, 'hot'); assert.equal(s.voice, false);
  assert.deepEqual(s.categories.map((c) => c.id), ['ve', 'vu']);
  assert.deepEqual(s.lists.map((l) => l.name), ['À faire']);
});

test('Appli déjà là : ses lieux, ses catégories restent ; les miennes qui manquent s\'ajoutent ; « Revenir aux miens »', () => {
  const st = { ...fresh(), fresh: undefined, points: [{ id: 'z' }], categories: [{ id: 'resto', name: 'Restos', color: '#d9480f', icon: '🍽️' }], lists: [{ id: 'a', name: 'à faire' }], mapStyle: 'classic' };
  const p = cleanPreset({ ...defaultPreset(), mapStyle: 'pastel', categories: [{ id: 'r2', name: 'RESTOS', color: '#d9480f', icon: '🍽️' }, { id: 've', name: 'Vêtements', color: '#8a5a44', icon: '👕' }], lists: [{ id: 'b', name: 'À faire' }] });
  const s = replaceWithPreset(st, p, 5);
  assert.equal(s.points.length, 1);
  assert.deepEqual(s.categories.map((c) => c.id), ['resto', 've'], 'même nom (accents et majuscules ignorés) : pas de double');
  assert.deepEqual(s.lists.map((l) => l.id), ['a']);
  assert.equal(s.mapStyle, 'pastel');
  assert.equal(s.mySettings.settings.mapStyle, 'classic');
});

test('Mes préparations : 5 au plus, nom obligatoire, jamais dans le lien', async () => {
  const many = Array.from({ length: 8 }, (_, i) => ({ id: `p${i}`, name: `Pour ${i}`, at: 1, p: defaultPreset() }));
  assert.equal(cleanPreps(many).length, DEPART_MAX);
  assert.equal(cleanPreps([{ id: 'a', name: '  ', p: {} }]).length, 0);
  const code = await encodePreset(cleanPreps(many)[0].p);
  assert.ok(!(await decodePreset(code)).name);
});

test('Dans l\'appli : la rubrique, le circuit qui suit les étapes choisies, le mot, la question « Remplacer »', () => {
  assert.match(app, /row\('users', 'Préparer le démarrage d\\'un proche'/);
  assert.match(app, /const welcomeFlow = \(\) => \[1, \.\.\.STEP_KEYS\.map/);
  assert.match(app, /!\/\(lieu\|balade\|rdv\|ouvrir\|depart\)=\//, 'pas de circuit ordinaire par-dessus un lien de démarrage');
  assert.match(app, /if \(departCode && state\.ok && !ESSAI\) receiveDepart\(departCode\)/);
  assert.match(app, /history\.replaceState\(history\.state, '', location\.pathname \+ location\.search\)/, 'le lien s\'efface de l\'adresse');
  assert.match(app, /'Remplacer'\)\),/);
  assert.match(app, /prepDraft \? \{ text: 'Pour un proche · Arrêter', act: 'prep' \} : null/, 'la préparation en cours se voit et s\'arrête');
  assert.match(app, /startEssai\(x\.p\)/, 'essayer une préparation');
  const prep = app.slice(app.indexOf('function openPrep('), app.indexOf('/* ---------- Démarrage ---------- */'));
  assert.ok(!/state\s*=\s*/.test(prep.replace(/state\.categories|state\.lists|state\.me/g, '')), 'la préparation ne touche jamais mes réglages');
});
