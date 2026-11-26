// v536 (mes choix 1A 2A du 26 nov., maquette « Préparer ») : une page qui réunit ce qui se règle une fois, en bas de Mon Paris.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const app = readFileSync(new URL('../js/app.js', import.meta.url), 'utf8');
const icons = readFileSync(new URL('../js/icons.js', import.meta.url), 'utf8');
const page = app.slice(app.indexOf('function openPrepare('), app.indexOf('function openPrepPoints('));

test('Préparer : 8 lignes dans l\'ordre, 4 groupes, chacune ouvre sa page et y revient', () => {
  const order = ["'Pour rentrer'", "'Chez moi'", "'Ma station Maison'", "'Pour prévenir'", "'Proches à prévenir'", "'Points de rendez-vous'", "'Pour tenir'", 'kitRow(toPrepare)', 'offlineRow(', "'Mes documents'", "'Pour ne rien perdre'", "'Sauvegarde'", 'foot(backBtn(toMyParis))'];
  for (let i = 1; i < order.length; i++) assert.ok(page.indexOf(order[i - 1]) < page.indexOf(order[i]) && page.indexOf(order[i - 1]) > 0, `${order[i - 1]} avant ${order[i]}`);
  assert.match(app, /const PREP_TOTAL = 8;/);
  assert.match(page, /openAlertContacts\(toPrepare\)/);
  assert.match(page, /openDocs\(toPrepare\)/);
  assert.match(page, /openSettings\('sauvegarde', toPrepare\)/);
  assert.match(app, /backBtn\(prepBack \?\? named\('Réglages'/, 'Chez moi ramène à Préparer');
  assert.match(app, /foot\(prepBack \? backBtn\(prepBack\)/, 'Mes stations ramène à Préparer');
});

test('Mon Paris : la ligne Préparer remplace Préparer hors ligne et Mon kit 72 h ; icône à elle', () => {
  const my = app.slice(app.indexOf('async function openMyParis('), app.indexOf('const toMyParis ='));
  assert.match(my, /row\('clipboard-list', 'Préparer', prepSub\(\)/);
  assert.doesNotMatch(my, /kitRow\(|offlineRow\(/);
  assert.match(icons, /"clipboard-list":/);
  assert.match(app, /\{clipboard-list\} \*\*Préparer\*\* : en bas de Mon Paris/, 'Aide');
  // remise à zéro du retour : sinon Chez moi ouvert depuis Réglages dirait « ← Préparer »
  assert.match(app.slice(app.indexOf('function closeSheet('), app.indexOf('function closeSheet(') + 200), /prepBack = null/);
  assert.match(app.slice(app.indexOf('function openSettings('), app.indexOf('function openSettings(') + 200), /prepBack = null/);
});
