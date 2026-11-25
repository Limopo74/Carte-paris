// Mode sombre (v280) : après un choix à la main, « Comme le téléphone » remet le réglage du téléphone.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { loadState, saveState, readSettings, exportJSON, KEY } from '../js/store.js';

const memStorage = () => { const m = new Map(); return { getItem: (k) => (m.has(k) ? m.get(k) : null), setItem: (k, v) => m.set(k, String(v)) }; };
const app = readFileSync(new URL('../js/app.js', import.meta.url), 'utf8');

test('Mode sombre (1A du 25 nov.) : « Comme le téléphone » est un des trois choix de Réglages → Apparence, et remet « auto »', () => {
  const page = app.slice(app.indexOf("if (section === 'apparence') {"), app.indexOf("if (section === 'vu') {"));
  assert.match(page, /radio\(theme === 'auto', 'rotate-ccw', 'Comme le téléphone'[^\n]*chooseTheme\('auto'\)/);
  assert.match(page, /const chooseTheme = \(k\) => \{ state\.theme = k;/);
  assert.match(page, /const theme = state\.theme === 'light' \|\| state\.theme === 'dark' \? state\.theme : 'auto';/);
});

test('Mode sombre : « auto » est gardé, dans le téléphone et dans la sauvegarde', () => {
  const st = memStorage();
  saveState(st, { ...loadState(st), theme: 'dark' });
  assert.equal(loadState(st).theme, 'dark');
  saveState(st, { ...loadState(st), theme: 'auto' });
  const s = loadState(st);
  assert.equal(s.theme, 'auto');
  assert.equal(readSettings(JSON.parse(exportJSON(s))).theme, 'auto');
  st.setItem(KEY, JSON.stringify({ points: [], theme: 'n\'importe quoi' }));
  assert.equal(loadState(st).theme, 'auto');
});
