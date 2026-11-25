// v416 (mes choix 1A à 5A du 24 nov.) : « Boussole », un interrupteur tout en bas de Autres réglages → Ce qui s'affiche, allumé au départ.
// Éteinte : ses boutons, ses icônes de liste et la Balade guidée disparaissent ; Métro et Photo se partagent la ligne (2A) ;
// un appui qui l'ouvrait ouvre Google Maps à pied (4A) ; le cône du point bleu reste (5A) ; l'Aide ne la cite plus.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { loadState, saveState, readSettings, exportJSON, cleanSettings, KEY } from '../js/store.js';
import { helpWithoutCompass, COMPASS_OFF_HELP } from '../js/reglages.js';

const memStorage = () => { const m = new Map(); return { getItem: (k) => (m.has(k) ? m.get(k) : null), setItem: (k, v) => m.set(k, String(v)) }; };
const app = readFileSync(new URL('../js/app.js', import.meta.url), 'utf8');
const css = readFileSync(new URL('../css/style.css', import.meta.url), 'utf8');

test('Boussole : allumée au départ (et pour une ancienne sauvegarde), éteinte gardée, dans la sauvegarde et les réglages', () => {
  const st = memStorage();
  assert.equal(loadState(st).compassOn, true, 'au départ');
  st.setItem(KEY, JSON.stringify({ points: [] }));
  assert.equal(loadState(st).compassOn, true, 'ancienne sauvegarde : allumée');
  saveState(st, { ...loadState(st), compassOn: false });
  const s = loadState(st);
  assert.equal(s.compassOn, false);
  assert.equal(readSettings(JSON.parse(exportJSON(s))).compassOn, false);
  assert.equal(cleanSettings({}).compassOn, true);
  assert.equal(cleanSettings({ compassOn: false }).compassOn, false);
});

test('L\'interrupteur est tout en bas de « Ce qui s\'affiche », sous Circuits de visite (1A)', () => {
  const page = app.slice(app.indexOf("if (section === 'autres') {"), app.indexOf("), { name: 'settings:autres'"));
  const a = page.indexOf("onOff('circuitsOn'");
  const b = page.indexOf("onOff('compassOn', 'compass', 'Boussole'");
  const c = page.indexOf("'Appli')");
  assert.ok(a > 0 && b > a && c > b);
  const notStyle = (t) => t.replace("row('palette', 'Style de l\\'appli'", ''); // v452 : Style de l'appli, une ligne de plus tout en bas
  assert.ok(!notStyle(page.slice(b, c)).includes('row('), 'rien entre lui et le groupe Appli');
});

test('Éteinte : chaque bouton Boussole, chaque icône de liste et chaque Balade guidée disparaissent (2A, 3A)', () => {
  const opens = [...app.matchAll(/el\('button', \{ type: 'button', class: '(btn c-guide|go-compass)', onclick: \(\) => openCompass\(/g)];
  assert.ok(opens.length >= 16, String(opens.length));
  for (const m of opens) assert.equal(app.slice(m.index - 22, m.index), 'compassOff() ? null : ', app.slice(m.index, m.index + 90));
  const guides = [...app.matchAll(/el\('button', \{ type: 'button', class: 'btn primary go-bar', onclick: \(\) => startGuide\(/g)];
  assert.equal(guides.length, 5);
  for (const m of guides) assert.equal(app.slice(m.index - 22, m.index), 'compassOff() ? null : ');
  // une ligne de trois boutons qui n'en garde que deux se partage en deux (Métro et Photo sur la fiche)
  assert.match(css, /\.row3:has\(> :nth-child\(2\):last-child\) \{ grid-template-columns: repeat\(2, minmax\(0, 1fr\)\); \}/);
});

test('Éteinte : un appui qui ouvrait la boussole ouvre Google Maps à pied (4A) ; le cône reste (5A)', () => {
  const f = app.slice(app.indexOf('function openCompass('), app.indexOf("track('Boussole');"));
  assert.match(f, /if \(compassOff\(\)\) \{ window\.open\(mapsUrl\(goTarget\(p, freshHere\(\)\), 0\), '_blank', 'noopener'\); return; \}/);
  assert.match(app, /compassOff\(\) \? el\('a', \{ class: 'btn primary go-bar', href: mapsUrl\(target, 0\)/, 'Rejoindre : Y aller');
  assert.ok(!/compassOff\(\)[^\n]*me-cone|me-cone[^\n]*compassOff\(\)/.test(app), 'le cône ne dépend pas du réglage');
});

test('L\'Aide ne cite plus la boussole ni la Balade guidée, et dit où la rallumer', () => {
  const lines = [...app.matchAll(/^ {4}'(.*)',$/gm)].map((m) => m[1].replace(/\\'/g, '\''));
  const out = helpWithoutCompass(lines);
  assert.ok(out.includes(COMPASS_OFF_HELP));
  const left = out.filter((l) => /oussole|Balade guidée/.test(l) && l !== COMPASS_OFF_HELP && !l.includes('Ton ami a une boussole') && !l.startsWith('{compass} **Éteindre la boussole**')); // la Nouveauté dit comment la rallumer
  assert.deepEqual(left, []);
  assert.match(app, /compassOff\(\) \? helpWithoutCompass\(l1\) : l1/);
});
