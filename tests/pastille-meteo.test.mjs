// v479 (mes choix 7 bis A et 7 ter du 25 nov.) : Réglages → Autres réglages → Pastille météo, un interrupteur par élément.
// Au départ, seulement la température et l'air ; arrondissement, dimanche et jours fériés, pluie, lever et coucher du soleil
// à allumer. Laissé au départ : rien d'enregistré (null). Le canapé de Chez moi reste visible tant que Chez moi est allumé.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { loadState, saveState, readSettings, exportJSON, cleanSettings, cleanWx, wxPart, WX_DEFAULT, WX_PARTS, saveMySettings, applyMySettings, KEY } from '../js/store.js';
import { sunriseMin, sunsetMin, nextSun } from '../js/soleil.js';

const memStorage = () => { const m = new Map(); return { getItem: (k) => (m.has(k) ? m.get(k) : null), setItem: (k, v) => m.set(k, String(v)) }; };
const app = readFileSync(new URL('../js/app.js', import.meta.url), 'utf8');

test('au départ : température et air seulement ; null tant que rien n\'est changé', () => {
  assert.deepEqual(WX_PARTS, ['arr', 'day', 'temp', 'rain', 'air', 'sun', 'seine']);
  assert.deepEqual({ ...WX_DEFAULT }, { arr: false, day: false, temp: true, rain: false, air: true, sun: false, seine: false });
  const st = memStorage();
  assert.equal(loadState(st).wx, null);
  st.setItem(KEY, JSON.stringify({ points: [] })); // ancienne sauvegarde : le nouveau départ
  const s = loadState(st);
  assert.equal(s.wx, null);
  assert.deepEqual(WX_PARTS.filter((k) => wxPart(s, k)), ['temp', 'air']);
  assert.equal(cleanWx({ ...WX_DEFAULT }), null, 'remis comme au départ : null');
  assert.equal(cleanWx('oui'), null);
  assert.equal(cleanWx([true]), null);
  assert.deepEqual(cleanWx({ sun: true, temp: 'x' }), { ...WX_DEFAULT, sun: true }, 'une valeur abîmée reprend celle du départ');
});

test('un choix est gardé, va dans la sauvegarde, les réglages et les réglages de référence', () => {
  const st = memStorage();
  saveState(st, { ...loadState(st), wx: { ...WX_DEFAULT, sun: true, air: false } });
  const s = loadState(st);
  assert.deepEqual(s.wx, { ...WX_DEFAULT, sun: true, air: false });
  assert.deepEqual(readSettings(JSON.parse(exportJSON(s))).wx, s.wx);
  assert.deepEqual(cleanSettings(s).wx, s.wx);
  assert.equal(cleanSettings({}).wx, null);
  const ref = saveMySettings(s);
  const back = applyMySettings({ ...ref, wx: null });
  assert.deepEqual(back.wx, s.wx, 'Revenir aux miens remet la pastille');
});

test('lever et coucher du soleil à Paris, en temps universel, à 4 min près', () => {
  const at = (y, m, d) => new Date(y, m - 1, d, 12);
  const off = (date) => -date.getTimezoneOffset();
  const near = (v, date, h, mn, what) => assert.ok(Math.abs(v - off(date) - (h * 60 + mn)) <= 4, `${what} ${date.toDateString()}`);
  // Repères calculés par l'algorithme complet de la NOAA (25 nov. 2026), en heure de Paris : 8 h 15 / 17 h 00 ; 5 h 47 / 21 h 58 ; 8 h 41 / 16 h 56
  near(sunriseMin(at(2026, 11, 25)), at(2026, 11, 25), 7, 15, 'lever');
  near(sunsetMin(at(2026, 11, 25)), at(2026, 11, 25), 16, 0, 'coucher');
  near(sunriseMin(at(2026, 6, 21)), at(2026, 6, 21), 3, 47, 'lever');
  near(sunriseMin(at(2026, 12, 21)), at(2026, 12, 21), 7, 41, 'lever');
});

test('nextSun : le lever avant l\'aube, le coucher le jour, le lever de demain le soir', () => {
  const day = new Date(2026, 10, 25, 12);
  const rise = sunriseMin(day); const set = sunsetMin(day);
  const at = (min) => new Date(2026, 10, 25, Math.floor(min / 60), min % 60);
  assert.deepEqual(nextSun(at(rise - 30)), { kind: 'rise', min: rise });
  assert.deepEqual(nextSun(at(rise + 1)), { kind: 'set', min: set });
  const n = nextSun(at(set + 1));
  assert.equal(n.kind, 'rise');
  assert.equal(n.min, sunriseMin(new Date(2026, 10, 26, 12)));
});

test('la page et la pastille : six interrupteurs, la ligne dans Autres réglages, le canapé toujours', () => {
  const page = app.slice(app.indexOf("if (section === 'pastille') {"), app.indexOf("if (section === 'ouverture') {"));
  for (const k of WX_PARTS) assert.ok(page.includes(`sw('${k}'`), k);
  assert.ok(page.includes('backBtn'));
  assert.ok(!page.includes("'calendar-days'"), 'v480 : l\'icône de Sorties n\'est pas celle de Dimanche ou férié');
  const autres = app.slice(app.indexOf("if (section === 'autres') {"), app.indexOf("), { name: 'settings:autres'"));
  assert.ok(autres.indexOf("row('thermometer-sun', 'Pastille météo'") > autres.indexOf("row('map-pinned', 'À mettre à jour sur place'"));
  assert.ok(autres.indexOf("row('thermometer-sun', 'Pastille météo'") < autres.indexOf("onOff('masculin'"), 'au-dessus des interrupteurs'); // 1A (28 nov.) : Photos dans Sorties passe dans la page Sorties
  const draw = app.slice(app.indexOf('function drawWx() {'), app.indexOf('const AIR_ADVICE'));
  assert.match(draw, /const h = homeOn\(\);/, 'le canapé ne dépend d\'aucun interrupteur');
  assert.match(draw, /const a = h \|\| !wxOn\('arr'\) \? null : arrHere\(\);/);
  assert.match(app, /\['thermometer-sun', 'Pastille météo', RA, /, 'Chercher un réglage la trouve');
  assert.match(draw, /wxBadge\.getBoundingClientRect\(\)\.right > innerWidth - 6\) wxBadge\.classList\.add\('wx-tight'\)/, 'trop large : les mots de l\'air s\'effacent, le point reste');
});

test('v481 (27 A) : le saint du jour, un lien vers Nominis dans Météo et air, aucun prénom dans l\'appli', () => {
  const page = app.slice(app.indexOf('function openWeather('), app.indexOf("{ name: 'weather'"));
  assert.match(app, /const NOMINIS = 'https:\/\/nominis\.cef\.fr\/';/);
  assert.match(page, /el\('a', \{ class: 'btn c-disc', href: NOMINIS, target: '_blank', rel: 'noopener' \}, ico\('external-link'\), 'Saint du jour \(Nominis\)'\)/);
  assert.ok(page.indexOf('Saint du jour') > page.indexOf('Ce que montre la pastille'), 'sous l\'ancien bouton');
});
