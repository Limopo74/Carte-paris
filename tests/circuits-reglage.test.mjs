// v390 (mes choix 1A 2A 3A 4A du 24 nov.) : « Circuits de visite », un interrupteur tout en bas de Autres réglages → Ce qui s'affiche.
// Éteint, les circuits disparaissent partout (bouton, Itinéraire, + Ajouter, Mes parcours, Distances et durées, Aide) ;
// rien n'est effacé ; un lien de circuit reçu s'ouvre quand même, avec une ligne qui le dit.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { loadState, saveState, readSettings, exportJSON, cleanSettings, KEY } from '../js/store.js';
import { helpWithoutCircuits } from '../js/reglages.js';

const memStorage = () => { const m = new Map(); return { getItem: (k) => (m.has(k) ? m.get(k) : null), setItem: (k, v) => m.set(k, String(v)) }; };
const app = readFileSync(new URL('../js/app.js', import.meta.url), 'utf8');

test('Circuits de visite : allumés au départ, éteints gardés, dans la sauvegarde et les réglages par défaut', () => {
  const st = memStorage();
  assert.equal(loadState(st).circuitsOn, true, 'au départ');
  st.setItem(KEY, JSON.stringify({ points: [] })); // sauvegarde d'avant la v390
  assert.equal(loadState(st).circuitsOn, true, 'ancienne sauvegarde : allumés');
  saveState(st, { ...loadState(st), circuitsOn: false, hiddenCircuits: ['marais'] });
  const s = loadState(st);
  assert.equal(s.circuitsOn, false);
  assert.deepEqual(s.hiddenCircuits, ['marais'], 'éteindre n\'efface rien (3A)');
  assert.equal(readSettings(JSON.parse(exportJSON(s))).circuitsOn, false);
  assert.equal(cleanSettings({}).circuitsOn, true);
  assert.equal(cleanSettings({ circuitsOn: false }).circuitsOn, false);
});

test('L\'interrupteur est tout en bas de « Ce qui s\'affiche », après Écrire au masculin (2A)', () => {
  const page = app.slice(app.indexOf("if (section === 'autres') {"), app.indexOf("), { name: 'settings:autres'"));
  const a = page.indexOf("onOff('masculin'");
  const b = page.indexOf("onOff('circuitsOn', 'signpost', 'Circuits de visite'");
  const c = page.indexOf("'Appli')");
  assert.ok(a > 0 && b > a && c > b, 'sous Écrire au masculin, au-dessus du groupe Appli');
  assert.ok(!page.slice(b, c).includes('row('), 'rien entre lui et le groupe Appli');
});

test('Éteints : bouton, ⋯ Plus, L\'essentiel, Itinéraire, + Ajouter, Mes parcours, Distances et durées suivent le réglage (1A)', () => {
  assert.match(app, /const hiddenNow = \(\) => \{ const h = cleanHidden\(state\.hiddenTools\); return circuitsOff\(\) && !h\.includes\('circuits'\) \? \[\.\.\.h, 'circuits'\] : h; \};/);
  assert.match(app, /const moreList = \(\) => cleanMore\(state\.moreTools, hiddenNow\(\)\);/);
  assert.match(app, /function applyToolOrder\(\) \{[\s\S]{0,200}const hidden = hiddenNow\(\);/);
  assert.match(app, /circuitsOff\(\) \? null : row\('signpost', 'Circuits de visite'/, 'Itinéraire');
  assert.match(app, /circuitsOff\(\) \? null : el\('button', \{ type: 'button', class: 'btn big c-add', onclick: \(\) => openNewCircuit\(back\) \}/, '+ Ajouter');
  assert.match(app, /circuitsOff\(\) \? null : el\('button', \{ type: 'button', class: 'btn c-disc', onclick: \(\) => openMakeCircuit\(r\.id\) \}/, 'Mes parcours');
  assert.match(app, /circuitsOff\(\) \? null : el\('h3', \{ class: 'fiche-sec' \}, 'Circuits'\)/, 'Distances et durées');
  assert.match(app, /normalizeTools\(state\.mapTools\)\.filter\(\(t\) => t !== 'circuits' \|\| !circuitsOff\(\)\)\.map\(\(t\) => \{\n\s+const info = TOOL_INFO\[t\];\n\s+const box = el\('input'/, 'L\'essentiel');
  // Boutons de la carte : le bouton n'est dans aucun groupe, une ligne dit pourquoi, sous les groupes (rien ne bouge au-dessus)
  const outils = app.slice(app.indexOf("if (section === 'outils') {"), app.indexOf("if (section === 'essentiel') {"));
  assert.match(outils, /const list = normalizeTools\(state\.mapTools\)\.filter\(\(t\) => t !== 'circuits' \|\| !circuitsOff\(\)\);/);
  assert.ok(outils.indexOf('groups,') < outils.indexOf("'Éteints : Réglages → Autres réglages'"), 'la ligne sous les groupes');
});

test('Une page de circuit ouverte par un autre chemin : Circuits dit « éteints » et propose de rallumer ; un lien reçu s\'ouvre (4A)', () => {
  assert.match(app, /async function openCircuits\(back = null\) \{\n\s+if \(circuitsOff\(\)\) \{ openCircuitsOff\(back\); return; \}/);
  assert.match(app, /c\.received && circuitsOff\(\) \? el\('div'[^\n]*\n\s+el\('p', \{ class: 'warn' \}, 'Les circuits sont éteints sur ce téléphone/); // v440 : la phrase et son bouton « Rallumer les circuits »
  assert.match(app, /withGear\(c\.titre, circuitsOff\(\) \? null : settingsGear\('distances'/, 'pas de roue vers un réglage caché');
});

test('Aide, circuits éteints : les lignes des circuits partent, Itinéraire et Ajouter ne les citent plus, une ligne dit où les rallumer', () => {
  const lines = [
    '{route} **Itinéraire** : J\'ai du temps, Sur mon chemin, Mes parcours, Parcours galeries, Circuits de visite, Rues sans voitures.',
    '{signpost} **Circuits de visite** : des balades.',
    '{signpost} **Mes circuits**, en haut.',
    '{pencil} **Modifier ce circuit**, en bas.',
    '**La page d\'un circuit** : la durée.',
    '{triangle-alert} **Un souci sur un circuit** : sur la page.',
    '{check} **Je l\'ai fait** : le circuit va dans Mon journal.',
    '{route} **Parcours ou circuit ?** Un parcours mesure.',
    '**Un parcours enregistré** : Balade guidée, Partager (un lien avec les étapes), « En faire un circuit » (titre, thème ; refusé, 40 m au plus), Supprimer.',
    'Sous « Une balade », « **Un parcours** » et « **Un circuit** » ouvrent directement la carte pour poser tes étapes.',
    '{hourglass} **J\'ai du temps** : choisis ta durée.',
  ];
  assert.deepEqual(helpWithoutCircuits(lines), [
    '{route} **Itinéraire** : J\'ai du temps, Sur mon chemin, Mes parcours, Parcours galeries, Rues sans voitures.',
    '{signpost} **Circuits de visite** : éteints sur ce téléphone. Pour les rallumer : {settings} → Autres réglages → Circuits de visite.',
    '**Un parcours enregistré** : Balade guidée, Partager (un lien avec les étapes), Supprimer.',
    'Sous « Une balade », « **Un parcours** » ouvre directement la carte pour poser tes étapes.',
    '{hourglass} **J\'ai du temps** : choisis ta durée.',
  ]);
  assert.match(app, /\(circuitsOff\(\) \? helpWithoutCircuits\(lines\) : lines\)\.map\(\(l\) => el\('li'/, 'openHelp');
  // les vraies lignes de l'Aide : chaque ligne propre aux circuits est retirée, les autres restent
  const help = app.slice(app.indexOf('const HELP = ['), app.indexOf("['sparkles', 'Nouveautés'"));
  for (const start of ['{signpost} **Mes circuits**', '{pencil} **Modifier ce circuit**', '**La page d\\\'un circuit**', '{check} **Je l\\\'ai fait**', '{route} **Parcours ou circuit ?**']) {
    assert.ok(help.includes(`'${start}`), `l'Aide a bien la ligne ${start}`);
  }
});
