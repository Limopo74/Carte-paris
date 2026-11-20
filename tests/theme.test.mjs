// Mode sombre (v280) : après un choix à la main, « Comme le téléphone » remet le réglage du téléphone.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { loadState, saveState, readSettings, exportJSON, KEY } from '../js/store.js';

const memStorage = () => { const m = new Map(); return { getItem: (k) => (m.has(k) ? m.get(k) : null), setItem: (k, v) => m.set(k, String(v)) }; };
const app = readFileSync(new URL('../js/app.js', import.meta.url), 'utf8');

test('Mode sombre : une ligne « Comme le téléphone » existe après un choix à la main, et remet « auto »', () => {
  const i = app.indexOf("'Comme le téléphone'");
  assert.ok(i > 0, 'la ligne existe');
  const around = app.slice(i - 600, i + 100);
  assert.match(around, /state\.theme === 'light' \|\| state\.theme === 'dark'/, 'seulement après un choix à la main');
  assert.match(around, /state\.theme = 'auto'/, 'elle remet le réglage du téléphone');
  assert.ok(i > app.indexOf("'Mode sombre'), 'menu-sub'"), 'juste sous l\'interrupteur Mode sombre');
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
