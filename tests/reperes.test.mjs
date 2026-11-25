// v386 : dessins des grands monuments sur la carte vue de loin (mes choix 1A à 5A du 24 nov. 2026).
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { REPERES, REPERE_SVG, REPERE_MIN_ZOOM, REPERE_MAX_ZOOM, placeReperes, touches } from '../js/reperes.js';
import { arrAt } from '../js/explore.js';
import { loadState, saveState, readSettings, exportJSON } from '../js/store.js';

const data = JSON.parse(readFileSync(new URL('../data/arrondissements.json', import.meta.url), 'utf8'));
const app = readFileSync(new URL('../js/app.js', import.meta.url), 'utf8');
const sw = readFileSync(new URL('../sw.js', import.meta.url), 'utf8');

// Arrondissement de l'adresse de chaque monument ; deux ou trois quand il est sur une place ou un pont entre plusieurs.
const ARR = {
  'Tour Eiffel': [7], 'Arc de triomphe': [8, 16, 17], 'Notre-Dame': [4], 'Opéra Garnier': [9], 'Louvre': [1], 'Panthéon': [5],
  'Concorde': [8], 'Sacré-Cœur': [18], 'Tour Montparnasse': [15], 'Invalides': [7], 'Moulin Rouge': [18], 'Centre Pompidou': [4],
  'Grand Palais': [8], 'Pont Alexandre-III': [7, 8], 'Colonne de Juillet': [4, 11, 12], 'Musée d\'Orsay': [7], 'Hôtel de Ville': [4],
  'Sainte-Chapelle': [1], 'Tour Saint-Jacques': [4],
};

test('19 monuments, chacun avec son dessin et son élément Wikidata', () => {
  assert.equal(REPERES.length, 19);
  assert.equal(new Set(REPERES.map((r) => r.name)).size, 19);
  for (const r of REPERES) {
    assert.ok(REPERE_SVG[r.name], r.name);
    assert.match(r.q, /^Q\d+$/, r.name);
  }
});

test('chaque position tombe dans l\'arrondissement de son adresse', () => {
  for (const r of REPERES) assert.ok(ARR[r.name].includes(arrAt(r.lat, r.lng, data)), `${r.name} : ${arrAt(r.lat, r.lng, data)}`);
});

test('charte : pas de bleu (métro), pas de couleur écrite en dur, un détail terre cuite', () => {
  for (const [n, svg] of Object.entries(REPERE_SVG)) {
    assert.doesNotMatch(svg, /metro|#[0-9a-f]{3,6}\b/i, n);
    assert.match(svg, /var\(--disc\)/, n);
  }
});

test('placeReperes : seulement aux zooms 12 et 13', () => {
  const r = { left: 0, top: 0, right: 48, bottom: 48 };
  assert.deepEqual(placeReperes([r], [], 11), []);
  assert.deepEqual(placeReperes([r], [], REPERE_MIN_ZOOM), [0]);
  assert.deepEqual(placeReperes([r], [], REPERE_MAX_ZOOM), [0]);
  assert.deepEqual(placeReperes([r], [], 14), []);
});

test('placeReperes : caché sous un bouton ou une goutte ; le premier de la liste gagne', () => {
  const a = { left: 0, top: 0, right: 48, bottom: 48 };
  const b = { left: 30, top: 10, right: 78, bottom: 58 }; // touche a
  const c = { left: 200, top: 0, right: 248, bottom: 48 };
  const bouton = { left: 210, top: 20, right: 260, bottom: 70 };
  assert.deepEqual(placeReperes([a, b, c], [], 12), [0, 2]);
  assert.deepEqual(placeReperes([a, b, c], [bouton], 12), [0]);
  assert.deepEqual(placeReperes([null, b], [], 12), [1], 'un dessin absent ne bloque rien');
  assert.equal(touches(a, { left: 48, top: 0, right: 60, bottom: 10 }), false, 'bord contre bord : ne touche pas');
});

test('réglage : allumé au départ, gardé, dans la sauvegarde et les réglages envoyés', () => {
  const mem = new Map();
  const st = { getItem: (k) => mem.get(k) ?? null, setItem: (k, v) => mem.set(k, v), removeItem: (k) => mem.delete(k) };
  assert.equal(loadState(st).showReperes, true);
  assert.ok(saveState(st, { ...loadState(st), showReperes: false }));
  const back = loadState(st);
  assert.equal(back.showReperes, false);
  assert.equal(readSettings(JSON.parse(exportJSON(back))).showReperes, false);
});

test('Autres réglages → La carte : l\'interrupteur, sous les numéros des arrondissements ; Nouveautés ; fichier gardé hors ligne', () => {
  const i = app.indexOf('arrNumsSwitch,\n'); const j = app.indexOf('\'Dessins des monuments\'', i); /* Chercher un réglage (25 nov.) le cite plus haut */ const k = app.indexOf('\'Ce qui s\\\'affiche\'', i);
  assert.ok(i > 0 && j > i && j < k, 'entre les numéros et « Ce qui s\'affiche »');
  // v396 : la ligne des Nouveautés est sortie (10 au plus) ; l'aide de la carte garde le réglage
  assert.match(app, /Dessins des monuments/);
  assert.ok(sw.includes('\'js/reperes.js\''));
});
