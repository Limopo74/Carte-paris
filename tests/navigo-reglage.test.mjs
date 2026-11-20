// « J'ai un passe Navigo » (v282) : éteint, l'onglet Navigo de Sorties, la ligne « Avantage Navigo » des fiches
// et les avantages de la loupe disparaissent. Allumé au départ ; gardé sur le téléphone et dans la sauvegarde.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { loadState, saveState, readSettings, exportJSON, cleanSettings, KEY } from '../js/store.js';

const memStorage = () => { const m = new Map(); return { getItem: (k) => (m.has(k) ? m.get(k) : null), setItem: (k, v) => m.set(k, String(v)) }; };
const app = readFileSync(new URL('../js/app.js', import.meta.url), 'utf8');

test('Passe Navigo : allumé au départ, éteint gardé, dans la sauvegarde et les réglages par défaut', () => {
  const st = memStorage();
  assert.equal(loadState(st).navigo, true, 'au départ');
  st.setItem(KEY, JSON.stringify({ points: [] })); // sauvegarde d'avant la v282
  assert.equal(loadState(st).navigo, true, 'ancienne sauvegarde : allumé');
  saveState(st, { ...loadState(st), navigo: false });
  const s = loadState(st);
  assert.equal(s.navigo, false);
  assert.equal(readSettings(JSON.parse(exportJSON(s))).navigo, false);
  assert.equal(cleanSettings({}).navigo, true);
});

test('Passe Navigo éteint : onglet, ligne de la fiche et loupe suivent le réglage', () => {
  assert.match(app, /\['navigo', 'Navigo'\]\]\.filter\(\(\[m\]\) => m !== 'navigo' \|\| state\.navigo !== false\)/, 'onglet Navigo retiré');
  assert.match(app, /if \(eventsMode === 'navigo' && state\.navigo === false\) eventsMode = 'all';/, 'Sorties ne rouvre pas un onglet masqué');
  assert.match(app, /state\.navigo !== false && navigoOf\(p\) \? row\('badge-percent', 'Avantage Navigo'/, 'fiche');
  assert.match(app, /state\.navigo === false \? \[\] : block\('Avantages Navigo'/, 'loupe');
});

test('Passe Navigo : l\'interrupteur est tout en bas de Réglages, après Ce que j\'utilise', () => {
  const a = app.indexOf("'Ce que j\\'utilise', usage.off");
  const b = app.indexOf("onOff('navigo', 'badge-percent', 'J\\'ai un passe Navigo'");
  assert.ok(a > 0 && b > a, 'après Ce que j\'utilise');
  const end = app.indexOf('mySettingsBlock(),', b);
  assert.ok(end > b && !app.slice(b, end).includes('row('), 'en bas : après lui, seulement d\'autres interrupteurs, puis mes réglages par défaut');
});
