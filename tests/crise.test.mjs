// v490 : Mode crise, première partie (claude/idee-mode-crise.md, réponses 1 à 3, 6, 11, 14, 16 ; maquette validée, mon choix 29 A).
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { CRISES, crisisOf, crisisShort, cleanCrisis, smsOkText } from '../js/crise.js';
import { MAP_TOOLS, DEFAULT_MORE, NEW_IN_MORE, FRESH_TOOLS, loadState, exportJSON } from '../js/store.js';

const app = readFileSync(new URL('../js/app.js', import.meta.url), 'utf8');
const html = readFileSync(new URL('../index.html', import.meta.url), 'utf8');
const sw = readFileSync(new URL('../sw.js', import.meta.url), 'utf8');

test('les cinq crises (réponse 4) ; eau et toilettes pour crue, coupure, canicule (réponse 11)', () => {
  assert.deepEqual(CRISES.map((c) => c.k), ['crue', 'coupure', 'canicule', 'abri']); // v538 : Grève retirée (mon choix A du 26 nov.)
  assert.equal(cleanCrisis({ k: 'greve', since: 1 }), null, 'une Grève gardée éteint le mode');
  assert.deepEqual(CRISES.filter((c) => c.water).map((c) => c.k), ['crue', 'coupure', 'canicule']);
  assert.equal(crisisShort('coupure'), 'Coupure');
  assert.equal(crisisShort('crue'), 'Crue');
  assert.equal(crisisOf('x'), null);
});

test('l\'état gardé est nettoyé ; une crise inconnue n\'allume rien', () => {
  assert.equal(cleanCrisis(null), null);
  assert.equal(cleanCrisis({ k: 'zombies' }), null);
  assert.deepEqual(cleanCrisis({ k: 'crue', since: 5, pratBefore: 'oui' }), { k: 'crue', since: 5, pratBefore: false });
});

test('« Je vais bien » : la position seulement si elle est donnée (réponse 14)', () => {
  assert.equal(smsOkText(), 'Je vais bien.');
  assert.equal(smsOkText({ lat: NaN, lng: 2 }), 'Je vais bien.');
  assert.equal(smsOkText({ lat: 48.876312, lng: 2.34 }), 'Je vais bien. Je suis ici : https://www.google.com/maps/search/?api=1&query=48.87631,2.34000');
});

test('le bouton arrive dans ⋯ Plus de la colonne, jamais sur la carte tout seul (réponse 2)', () => {
  assert.deepEqual(MAP_TOOLS.slice(-3), ['crise', 'crue', 'locate']);
  assert.ok(DEFAULT_MORE.includes('crise') && NEW_IN_MORE.includes('crise') && FRESH_TOOLS.moreTools.includes('crise'));
  const mem = (v) => { let x = v; return { getItem: () => x, setItem: (_k, val) => { x = val; } }; };
  const mine = loadState(mem(JSON.stringify({ points: [], layoutV: 4, mapTools: ['vu', 'paris', 'locate'], moreTools: [], hiddenTools: [] })));
  assert.ok(mine.moreTools.includes('crise'));
  assert.match(html, /<button type="button" id="btnCrise" class="map-btn c-guide" aria-label="[^"]+">/);
  assert.match(app, /crise: \{ el: 'btnCrise', icon: 'triangle-alert', name: '[^']+', short: 'Mode crise' \}/);
  assert.ok(sw.includes("'js/crise.js'"));
});

test('gardé à part : jamais dans la sauvegarde (ni donc chez un proche)', () => {
  assert.match(app, /const CRISIS_KEY = 'carte-paris\.crise';/);
  const s = loadState({ getItem: () => null, setItem: () => {} });
  const o = JSON.parse(exportJSON(s));
  assert.ok(!('crisis' in o) && !('crisis' in (o.settings ?? {})), 'aucun état de crise dans le fichier');
  assert.ok(!/state\.crisis(?!Points)|\bcrisis:/.test(readFileSync(new URL('../js/store.js', import.meta.url), 'utf8')), 'le store ne le connaît pas');
});

test('l\'étiquette, Où suis-je ?, Autour de moi', () => {
  // « Crise crue · Terminer » : tient sur une ligne en Très grand pour les cinq crises (« Mode crise · Canicule · Terminer » passait sur deux)
  assert.match(app, /\(crisis \? \{ text: `Crise \$\{crisisShort\(crisis\.k\)\.toLowerCase\(\)\} · Terminer`, act: 'crise' \} : null\)/);
  assert.match(app, /else if \(n\?\.act === 'crise'\) endCrisis\(\);/);
  assert.match(app, /toast\('Mode crise terminé', false, \{ label: 'Annuler'/, '« Terminer » se rattrape');
  const where = app.slice(app.indexOf('async function openWhereAmI()'), app.indexOf("openSheet([ico('locate'), ' Où suis-je ?']"));
  assert.ok(where.indexOf("'Alerter en silence'") < where.indexOf('openCrisis('), 'sous Alerter en silence');
  assert.ok(where.indexOf('openCrisis(') < where.indexOf('    delinq,'), 'au-dessus des vols');
  const near = app.slice(app.indexOf('function renderNear('), app.indexOf("body.push(el('div', { class: 'tools' },"));
  assert.match(near, /if \(crisis\) body\.push\(crisisBlock\(\)\);/, 'Autour de moi commence par les gestes utiles');
  const block = app.slice(app.indexOf('function crisisBlock()'), app.indexOf('function openImOk('));
  assert.ok((block.match(/class: 'btn primary/g) ?? []).length === 1, 'une seule plaque pleine : Rentrer à pied chez moi');
  assert.match(block, /showWalkRoute\(homeOrigin\(home\), pos, back\)/, 'part de ma vraie position, pas de Chez moi');
});

import { CRISIS_POINTS, cleanCrisisPoints, mergeCrisisPoints, smsPointText } from '../js/crise.js';
import { saveState, readSettings, mergeImport, backupHash, exportForFriend } from '../js/store.js';

test('v491 : points de crise : nettoyés, gardés, dans ma sauvegarde, jamais chez un proche (réponses 15 et 22, choix 30 B)', () => {
  assert.deepEqual(CRISIS_POINTS.map((c) => c.k), ['repli', 'pres', 'hors']);
  assert.equal(cleanCrisisPoints({ repli: { lat: 'x' } }), null);
  assert.deepEqual(cleanCrisisPoints({ repli: { lat: 45.1234567, lng: 5.7, label: ' Chez  Anne ' }, pirate: { lat: 1, lng: 1 } }), { repli: { lat: 45.123457, lng: 5.7, label: 'Chez Anne' } });
  assert.deepEqual(mergeCrisisPoints({ pres: { lat: 48.85, lng: 2.35 } }, { pres: { lat: 1, lng: 1 }, hors: { lat: 48.9, lng: 2.3 } }), { pres: { lat: 48.85, lng: 2.35, label: '' }, hors: { lat: 48.9, lng: 2.3, label: '' } }, 'le téléphone garde les siens, la sauvegarde complète');
  let raw = null; const st = { getItem: () => raw, setItem: (_k, v) => { raw = v; } };
  const s0 = loadState(st);
  const pts = { repli: { lat: 45.18, lng: 5.72, label: 'Chez Anne, Grenoble' } };
  saveState(st, { ...s0, crisisPoints: pts });
  const s1 = loadState(st);
  assert.deepEqual(s1.crisisPoints, pts);
  assert.deepEqual(JSON.parse(exportJSON(s1)).crisisPoints, pts);
  assert.notEqual(backupHash(s1), backupHash(s0), 'un point change l\'empreinte de la sauvegarde');
  assert.ok(!JSON.stringify(exportForFriend(s1)).includes('Grenoble'), 'jamais dans le fichier pour un proche');
  const back = mergeImport(s0, exportJSON(s1));
  assert.deepEqual(back.state.crisisPoints, pts, 'ma sauvegarde les remet');
  assert.match(smsPointText('repli', pts.repli), /^Mon point de repli : Chez Anne, Grenoble\. https:\/\/www\.google\.com\/maps\/search\/\?api=1&query=45\.18000,5\.72000$/);
  assert.match(smsPointText('hors', { lat: 48.9, lng: 2.3, label: '' }), /^Notre rendez-vous \(hors du quartier\) : https/);
  assert.match(app, /'Point de crise…'\) \}\);/, 'dans « Ce point », par extra (sous les boutons)');
});

test('v493 : Préparer hors ligne (réponse 21) : Mon Paris tout en bas, page Mode crise, Autour de moi en mode crise ; la date seulement si tout est arrivé', () => {
  const fn = app.slice(app.indexOf('async function prepareOffline('), app.indexOf('const offlineRow ='));
  assert.match(fn, /await downloadStreets\(\)/);
  assert.match(fn, /loadPratique\('fontaines'\), loadPratique\('toilettes'\)/);
  assert.ok(fn.indexOf('storage.setItem(OFFLINE_KEY') > fn.indexOf('if (fail.length)'), 'la date n\'est écrite que si rien ne manque');
  assert.match(app, /const OFFLINE_KEY = 'carte-paris\.horsligne';/);
  // v536 : Mon Paris → Préparer (la dernière ligne de Mon Paris ouvre la page où Préparer hors ligne est rangé)
  const my = app.slice(app.indexOf('async function openMyParis('), app.indexOf('const toMyParis ='));
  assert.ok(my.indexOf("'Préparer', prepSub()") > my.indexOf("'Mes chiffres'") && my.indexOf("'Préparer', prepSub()") < my.indexOf('foot('), 'Mon Paris : Préparer tout en bas');
  assert.match(app.slice(app.indexOf('function openPrepare('), app.indexOf('function openPrepPoints(')), /offlineRow\(/);
  assert.match(app.slice(app.indexOf('function crisisBlock()'), app.indexOf('function openImOk(')), /offlineRow\(/);
  assert.match(app.slice(app.indexOf('function openCrisis('), app.indexOf('function crisisBlock()')), /offlineRow\(self\)/);
});

import { readPlan, edgesInBox } from '../js/rues.js';
test('v494 : plan de secours (réponse 5, choix 31 A) : les rues du cadre, rien si la vue est trop large ; seulement en crise et fond en panne', () => {
  const P = readPlan(JSON.parse(readFileSync(new URL('../data/rues.json', import.meta.url), 'utf8')));
  assert.ok(P);
  const near = edgesInBox(P, 48.874, 2.336, 48.879, 2.344);
  assert.ok(near.length > 20 && near.length < 5000, `${near.length} tronçons autour de la rue des Martyrs`);
  assert.equal(new Set(near).size, near.length, 'chaque tronçon une fois');
  assert.deepEqual(edgesInBox(P, 48.80, 2.20, 48.92, 2.48), [], 'tout Paris : rien (trop de rues)');
  assert.deepEqual(edgesInBox(null, 0, 0, 1, 1), []);
  const fn = app.slice(app.indexOf('async function drawRescue()'), app.indexOf("map.on('moveend', rescueSoon);"));
  assert.match(fn, /if \(!crisis \|\| !tilesDown\(\)\)/, 'avec du réseau, la vraie carte');
  assert.match(fn, /map\.getZoom\(\) < RESCUE_ZOOM/);
  assert.ok(!/downloadStreets/.test(fn), 'rien n\'est téléchargé pour le dessiner');
});

test('v495 : plan de secours plus lisible : rues nommées en encre épaisse, sans nom en gris fin, noms des rues de près', () => {
  const fn = app.slice(app.indexOf('async function drawRescue()'), app.indexOf("map.on('moveend', rescueSoon);"));
  assert.match(fn, /\(edgeName\(P, i\) \? named : plain\)\.push/);
  assert.match(fn, /map\.getZoom\(\) >= RESCUE_NAMES_ZOOM/);
  assert.match(fn, /esc\(n\)/, 'le nom est échappé');
});

test('v496 (32 A) : Chez moi et mes points de crise dessinés sur le plan de secours', () => {
  const fn = app.slice(app.indexOf('async function drawRescue()'), app.indexOf("map.on('moveend', rescueSoon);"));
  assert.match(fn, /if \(home\) pin\(home\.lat, home\.lng, 'house', 'Chez moi'\)/);
  assert.match(fn, /for \(const c of CRISIS_POINTS\) if \(cps\[c\.k\]\) pin\(/);
});

test('v499 : bandes jaune et noir en haut et en bas en mode crise, jamais en Abri ; jamais touchables', () => {
  const css = readFileSync(new URL('../css/style.css', import.meta.url), 'utf8');
  assert.match(app, /function markCrisis\(\) \{ const r = document\.documentElement; if \(crisis && crisis\.k !== 'abri'\) r\.dataset\.crise = crisis\.k; else delete r\.dataset\.crise; \}/);
  const set = app.slice(app.indexOf('function setCrisis('), app.indexOf('function endCrisis('));
  const end = app.slice(app.indexOf('function endCrisis('), app.indexOf('function openCrisis('));
  assert.match(set, /markCrisis\(\)/); assert.match(end, /markCrisis\(\)/);
  assert.match(css, /html\[data-crise\]::before, html\[data-crise\]::after \{[^}]*pointer-events: none;/);
  assert.match(css, /var\(--crisis-a\) 0 14px, var\(--crisis-b\) 14px 28px/);
  assert.match(css, /html\[data-crise\] \.look-dot \{ z-index: 100000; \}/, 'le point du style reste visible par-dessus la bande');
});

test('v517 (mon choix A du 25 nov.) : Je vais bien garde le SMS et ajoute « Autre appli » par le menu de partage, sans logo ni wa.me', () => {
  const page = app.slice(app.indexOf('function openImOk('), app.indexOf('function openCrisisPointPick('));
  assert.match(page, /smsHref\(c\.tel, smsOkText\(at\)\)/, 'le SMS reste, un par proche');
  assert.match(page, /navigator\.share \? el\('button'[^\n]*navigator\.share\(\{ text: smsOkText\(at\) \}\)[^\n]*'Autre appli \(WhatsApp…\)'/);
  assert.doesNotMatch(page, /wa\.me|whatsapp:\/\/|\.png|\.svg/);
  const silent = app.slice(app.indexOf('function openSilentAlert('), app.indexOf('function openSilentAlert(') + 6000);
  assert.doesNotMatch(silent, /Autre appli/, 'Alerter en silence reste en SMS seulement');
});
