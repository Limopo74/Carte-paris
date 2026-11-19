// v228 : le bandeau « Maintenant » dit ce que dit Mon planning pour une sortie prévue :
// fermé à l'heure prévue (aujourd'hui et demain), pluie probable ou chaleur (demain).
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const app = readFileSync(new URL('../js/app.js', import.meta.url), 'utf8');
const now = app.slice(app.indexOf('function updateNow(force = false)'), app.indexOf('// « Dans la rue, à 5 min »'));
const plan = app.slice(app.indexOf('function planInfo(p)'), app.indexOf('/* Prévisions de Paris pour le planning'));

test('une seule règle de « fermé » pour Mon planning et le bandeau (planClosed)', () => {
  assert.match(app, /function planClosed\(p\) \{\n  const sts = hoursOf\(p\) \? planTimes\(p\.ticket\)/);
  assert.match(app, /if \(!sts\.length \|\| !sts\.every\(\(st\) => st && !st\.open\)\) return '';/); // horaires inconnus : rien
  assert.match(plan, /const shut = planClosed\(p\);/);
  assert.doesNotMatch(plan, /planTimes\(/); // plus de copie de la règle
});

test('sortie du jour fermée : « Fermé à cette heure-là » à la place de « Pars à », et pas de vibration « Pars maintenant »', () => {
  assert.match(now, /const shut = planClosed\(tk\);\n    const \{ leave, travel, how \} = isPart\(tk\.ticket\.part\) \|\| shut \? \{\} : departureFor\(tk, pos\);/);
  assert.match(now, /el\('span', \{ class: 'now-sub' \}, shut \|\| \(leave/);
});

test('sortie de demain : fermé, pluie ou chaleur seulement demain ; prévisions de tout Paris chargées', () => {
  assert.match(now, /const tomorrow = daysUntil\(nx\.ticket\.at\) === 1;\n    if \(tomorrow\) loadForecast\(\);/);
  assert.match(now, /tomorrow \? \[planClosed\(nx\), planWeather\(forecast\?\.days\?\.\[dayKey\(new Date\(nx\.ticket\.at\)\)\], nx\.covered\)\]/);
  assert.match(app, /if \(view === 'planning'\) openPlanning\(\);\n    updateNow\(true\);/);
});

test('le texte Confidentialité dit que le bandeau lit aussi les prévisions de tout Paris', () => {
  assert.match(app, /les prévisions de Mon planning, et du bandeau « Maintenant » la veille d\\'une sortie, sont celles de tout Paris, sans position/);
});
