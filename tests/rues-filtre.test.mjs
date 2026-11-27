// v429 (ma demande du 25 nov.) : le trait des rues d'intérêt est un filtre, comme les passages couverts, éteint au départ.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { rueTraitShown, lineInBox, rueNote } from '../js/rues-calque.js';
import { loadState, saveState, exportJSON, readSettings, KEY, FILTER_KEYS, cleanFilterKeys } from '../js/store.js';

const src = (f) => readFileSync(new URL(`../${f}`, import.meta.url), 'utf8');
const memStorage = () => { const m = new Map(); return { getItem: (k) => (m.has(k) ? m.get(k) : null), setItem: (k, v) => m.set(k, String(v)) }; };
const MOUFF = [[48.8459, 2.3497], [48.8430, 2.3500], [48.8405, 2.3496]]; // rue Mouffetard, en gros
const rue = (id, line = MOUFF) => ({ id, name: `Rue ${id}`, lat: line[0][0], lng: line[0][1], line });

test('trait : seulement filtre allumé, ou pour la rue dont la fiche est ouverte ; jamais pour un lieu sans tracé', () => {
  const r = rue('r1');
  assert.equal(rueTraitShown(r, false), false, 'éteint : pas de trait');
  assert.equal(rueTraitShown(r, true), true);
  assert.equal(rueTraitShown(r, false, 'r1'), true, 'sa fiche ouverte');
  assert.equal(rueTraitShown(r, false, 'autre'), false);
  assert.equal(rueTraitShown({ id: 'x', lat: 48.85, lng: 2.35 }, true), false);
  assert.equal(rueTraitShown({ id: 7, line: MOUFF }, false, '7'), true, 'identifiant nombre ou texte');
});

test('dans le cadre : un point dedans, ou un morceau qui le traverse sans point dedans', () => {
  const box = { s: 48.84, n: 48.85, w: 2.34, e: 2.36 };
  assert.equal(lineInBox(MOUFF, box), true);
  assert.equal(lineInBox([[48.83, 2.35], [48.86, 2.35]], box), true, 'traverse le cadre de bas en haut');
  assert.equal(lineInBox([[48.83, 2.33], [48.83, 2.37]], box), false, 'passe dessous');
  assert.equal(lineInBox([[48.839, 2.339], [48.851, 2.339]], box), false, 'longe le bord gauche, dehors');
  assert.equal(lineInBox([], box), false);
  assert.equal(lineInBox(null, box), false);
});

test('étiquette : filtre allumé, des rues affichées, aucune dans le cadre ; sinon rien', () => {
  const loin = { s: 48.88, n: 48.89, w: 2.33, e: 2.34 }; // Pigalle
  const ici = { s: 48.84, n: 48.85, w: 2.34, e: 2.36 };
  assert.equal(rueNote([rue('a')], false, loin), null, 'éteint');
  assert.equal(rueNote([{ id: 'x', lat: 48.885, lng: 2.335 }], true, loin), null, 'aucune rue affichée');
  assert.equal(rueNote([rue('a')], true, ici), null, 'une rue dans le cadre');
  assert.deepEqual(rueNote([rue('a')], true, loin), { text: 'Aucune rue ici · Voir la rue', act: 'rues' });
  assert.deepEqual(rueNote([rue('a'), rue('b'), { id: 'x', lat: 48.885, lng: 2.335 }], true, loin), { text: 'Aucune rue ici · Voir les 2', act: 'rues' });
});

test('réglage : éteint au départ, gardé d\'un jour à l\'autre et dans la sauvegarde ; une ligne de Filtres qu\'on peut masquer', () => {
  assert.equal(loadState(memStorage()).showRues, false, 'nouveau venu');
  const st = memStorage();
  st.setItem(KEY, JSON.stringify({ points: [rue('a')] })); // appli d'avant la v429 : le trait se dessinait toujours
  const s = loadState(st);
  assert.equal(s.showRues, false, 'après la mise à jour : éteint');
  saveState(st, { ...s, showRues: true });
  const r = loadState(st);
  assert.equal(r.showRues, true);
  assert.equal(readSettings(JSON.parse(exportJSON(r))).showRues, true);
  assert.equal(readSettings(JSON.parse(exportJSON({ ...r, showRues: false }))).showRues, false);
  assert.ok(FILTER_KEYS.includes('rues'));
  assert.deepEqual(cleanFilterKeys(['rues']), ['rues']);
});

test('appli : la carte passe par le filtre, Filtres et Filtres affichés ont la ligne, fichier gardé hors ligne', () => {
  const app = src('js/app.js');
  const draw = app.slice(app.indexOf('function renderMarkers()'), app.indexOf('const { single, groups } = groupPoints(onMap()'));
  assert.match(draw, /rueTraitShown\(p, state\.showRues, rueShown\)/);
  const filters = app.slice(app.indexOf('function openFilters()'), app.indexOf('function openListPlaces'));
  assert.match(filters, /keep\('rues', state\.showRues\) \? null : sw\(Boolean\(state\.showRues\), 'git-commit-horizontal', 'Rues d\\'intérêt'/);
  assert.ok(filters.indexOf("keep('rues', state.showRues) ? null") > filters.indexOf("keep('jardins', state.showJardins) ? null"), 'sous Jardins publics : rien ne bouge');
  assert.match(filters, /keep\('jardins', state\.showJardins\) \|\| keep\('rues', state\.showRues\) \|\| keep\('dansmarue', dmrOn\) \? el\('h3'/, 'le titre reste si seule cette ligne est affichée');
  const choice = app.slice(app.indexOf('function openFilterChoice'), app.indexOf('/** Ajoute ou retire une catégorie du filtre du haut. */'));
  assert.match(choice, /\['jardins', 'trees', 'Jardins publics'\], \['rues', 'git-commit-horizontal', 'Rues d\\'intérêt'\], \['dansmarue', 'message-square-warning', 'Signalements Dans ma rue'\], \['arr'/);
  assert.match(app, /\?\? veloNote\(\) \?\? rueNoteNow\(\);/);
  assert.match(src('sw.js'), /'js\/rues-calque\.js'/);
  assert.doesNotMatch(src('js/rues-calque.js'), /fetch\(|getCurrentPosition|watchPosition/);
});
