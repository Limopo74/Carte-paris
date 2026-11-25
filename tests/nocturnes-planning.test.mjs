// v519 (mes choix 1A 2A 3A 4A du 25 nov.) : « Ouvert tard cette semaine », replié, tout en bas de Mon planning, si
// Réglages → Autres réglages → Nocturnes au planning est allumé (éteint au départ) ; « Prévoir jeudi soir » dans Grands lieux.
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { loadState, saveState, readSettings, exportJSON, cleanSettings, KEY } from '../js/store.js';
import { cleanPlans } from '../js/planning.js';

const app = readFileSync(new URL('../js/app.js', import.meta.url), 'utf8');
const memStorage = () => { const m = new Map(); return { getItem: (k) => (m.has(k) ? m.get(k) : null), setItem: (k, v) => m.set(k, String(v)) }; };

test('Nocturnes au planning : éteint au départ, gardé, dans mes réglages', () => {
  const st = memStorage();
  assert.equal(loadState(st).lateWeek, false);
  st.setItem(KEY, JSON.stringify({ points: [] }));
  assert.equal(loadState(st).lateWeek, false, 'ancienne sauvegarde');
  saveState(st, { ...loadState(st), lateWeek: true });
  const s = loadState(st);
  assert.equal(s.lateWeek, true);
  assert.equal(readSettings(JSON.parse(exportJSON(s))).lateWeek, true);
  assert.equal(cleanSettings({ lateWeek: 'oui' }).lateWeek, false);
});

test('Une nocturne prévue garde sa marque (texte de la page, site officiel)', () => {
  const at = new Date(2026, 10, 26, 19).getTime();
  const [x] = cleanPlans([{ id: 'n1', name: 'Musée d\'Orsay', lat: 48.86, lng: 2.3266, plan: true, late: true, url: 'https://www.musee-orsay.fr', ticket: { at, part: 'soir' } }], new Date(2026, 10, 25).getTime());
  assert.equal(x.late, true);
  assert.equal(x.ticket.part, 'soir');
  const [y] = cleanPlans([{ id: 'n2', name: 'Concert', lat: 48.86, lng: 2.33, late: 'oui', ticket: { at } }], new Date(2026, 10, 25).getTime());
  assert.equal(y.late, undefined);
  assert.match(app, /link: x\.url \? \[x\.url, x\.late \? 'Site officiel' : 'Voir dans « Que faire à Paris »'\] : null/);
});

test('Le bloc : seulement allumé, sous « Trouver une sortie » (qui ne bouge pas), jours fériés exclus, ce soir seulement si on peut entrer', () => {
  assert.match(app, /function lateWeekBlock\(back\) \{\n  if \(state\.lateWeek !== true\) return null;/);
  const plan = app.slice(app.indexOf('function openPlanning('), app.indexOf('/* ---------- Liste du jour (v201)'));
  assert.ok(plan.indexOf("'Trouver une sortie'") < plan.indexOf('lateWeekBlock(back)'), 'sous Trouver une sortie');
  assert.match(app, /const list = k \? lateOn\(d, places, holidayOn\(d\)\) : lateTonight\(now, places, holidayOn\(now\)\);/);
  assert.match(app, /class: 'help-item week-arr late-week'/, 'replié');
});

test('Prévoir … soir : moment Soir, jamais une heure inventée ; déjà prévu, le bouton le dit', () => {
  assert.match(app, /ticket: \{ at: planAt\(w\.date, 'soir'\), part: 'soir' \}/);
  assert.match(app, /known \? `Prévu \$\{planShort\(known\.ticket\)\}` : `Prévoir \$\{lateWhen\(w\.k, w\.date\)\}`/);
  const block = app.slice(app.indexOf('async function openArtPlaces('), app.indexOf('const DAY_NAMES'));
  assert.ok(block.indexOf('lateLine(p) ?') < block.indexOf('latePlanBtn(p,'), 'sous la ligne Ouvert tard');
});

test('Réglage : tout en bas de « Ce qui s\'affiche », sous Glisser entre les sorties', () => {
  const autres = app.slice(app.indexOf("if (section === 'autres') {"), app.indexOf("), { name: 'settings:autres'"));
  const a = autres.indexOf("onOff('evSwipe'");
  const b = autres.indexOf("onOff('lateWeek', 'moon', 'Nocturnes au planning'");
  const c = autres.indexOf("'Appli'");
  assert.ok(a > 0 && a < b && b < c);
});
