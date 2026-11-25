// 2A (25 nov. 2026) : dans la fiche d'un lieu, Chemin à pied, Horaires et Partager se masquent aussi
// (Réglages → Autres réglages → Fiche d'un lieu). Modifier et Rangement restent toujours.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { loadState, saveState, exportJSON, readSettings, saveMySettings, applyMySettings } from '../js/store.js';
import { cleanPreset } from '../js/depart.js';

const app = readFileSync(new URL('../js/app.js', import.meta.url), 'utf8');
const memStorage = () => { const m = new Map(); return { getItem: (k) => m.get(k) ?? null, setItem: (k, v) => m.set(k, String(v)), removeItem: (k) => m.delete(k) }; };
const NEW = ['chemin', 'horaires', 'partager'];

test('la fiche d\'un lieu suit le réglage pour les trois lignes', () => {
  assert.match(app, /ficheShows\('partager'\) \? row\('share-2', 'Partager'/);
  assert.match(app, /walkGo\(d\) && ficheShows\('chemin'\) \? row\('route', 'Chemin à pied'/);
  assert.match(app, /ficheShows\('horaires'\) \? row\('clock', 'Horaires'/);
  const i = app.indexOf("el('h3', { class: 'fiche-sec' }, 'Sur ce lieu'),\n    el('div', { class: 'fiche-toc' },\n      p.artist");
  const fiche = app.slice(i, app.indexOf('uberRow(p)),', i));
  assert.ok(fiche.length > 0);
  assert.match(fiche, /\n\s*row\('pencil', 'Modifier'/, 'Modifier toujours là');
  assert.match(fiche, /\n\s*row\('wrench', 'Rangement'/, 'Rangement toujours là');
});

test('la page Fiche d\'un lieu et la préparation d\'un proche ont les trois lignes, après les anciennes', () => {
  const page = app.slice(app.indexOf("if (section === 'fiche')"), app.indexOf("name: 'settings:fiche'"));
  const order = ['qr', 'avis', 'uber', 'stars', ...NEW].map((k) => page.indexOf(`['${k}', `));
  assert.ok(order.every((x, i) => x > 0 && (i === 0 || x > order[i - 1])), 'dans l\'ordre, les nouvelles au bout');
  const prep = app.slice(app.indexOf("el('p', { class: 'legend' }, 'Sur la fiche d\\'un lieu')"), app.indexOf("el('p', { class: 'legend' }, 'Alertes et bandeau')"));
  for (const k of NEW) assert.ok(prep.includes(`['${k}', `), `préparation d'un proche : ${k}`);
});

test('gardé, dans la sauvegarde, les réglages de référence et un démarrage préparé', () => {
  const st = memStorage();
  const s0 = loadState(st);
  saveState(st, { ...s0, ficheHidden: ['horaires', 'partager', 'chemin'] });
  const back = loadState(st);
  assert.deepEqual(back.ficheHidden, NEW);
  assert.deepEqual(readSettings(JSON.parse(exportJSON(back))).ficheHidden, NEW);
  const ref = saveMySettings(back);
  assert.deepEqual(applyMySettings({ ...ref, ficheHidden: [] }).ficheHidden, NEW);
  assert.deepEqual(cleanPreset({ ficheHidden: ['partager', 'modifier'] }).ficheHidden, ['partager']);
});
