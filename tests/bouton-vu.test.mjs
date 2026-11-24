// v380 (mon choix 9A du 24 nov.) : « Vu en passant » dans la colonne, tout en haut, l'appareil photo en un appui ;
// les boutons près du pouce ne bougent pas.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { normalizeTools, loadState, KEY, DEFAULT_MORE, NEW_IN_MORE } from '../js/store.js';

const app = readFileSync(new URL('../js/app.js', import.meta.url), 'utf8');
const html = readFileSync(new URL('../index.html', import.meta.url), 'utf8');
const mem = (v) => { let x = v; return { getItem: () => x, setItem: (_k, val) => { x = val; }, removeItem: () => { x = null; } }; };

test('chez qui a déjà ses boutons : Vu en passant arrive en haut de la colonne, le reste garde sa place', () => {
  const before = ['paris', 'metro', 'sorties', 'planning', 'pratique', 'velib', 'home', 'circuits', 'notes', 'locate'];
  const after = normalizeTools(before);
  assert.equal(after[0], 'vu');
  assert.deepEqual(after.slice(1), before);
  const st = loadState(mem(JSON.stringify({ points: [], layoutV: 4, mapTools: before, moreTools: ['velib', 'home'], hiddenTools: [] })));
  assert.ok(!st.moreTools.includes('vu') && !st.hiddenTools.includes('vu'), 'sur la carte, pas dans ⋯ Plus');
  assert.ok(!DEFAULT_MORE.includes('vu') && !NEW_IN_MORE.includes('vu'));
});

test('le bouton ouvre l\'appareil photo de Vu en passant', () => {
  assert.match(html, /<button type="button" id="btnVu" class="map-btn c-add" aria-label="Vu en passant : prendre une photo tout de suite">/);
  assert.ok(app.includes("document.getElementById('btnVu').addEventListener('click', () => captureSeen());"));
  assert.match(app, /vu: \{ el: 'btnVu', icon: 'camera', name: '[^']+', short: 'Vu en passant' \}/);
});
