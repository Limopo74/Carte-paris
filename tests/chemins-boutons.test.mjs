// v440 (mes choix 1A 2A 3B 4A du 25 nov. 2026) : sur les pages, un bouton à la place des chemins « Réglages → … » écrits
// (règle du 21 nov.) ; ce qui était en cours d'écriture est gardé au retour ; une roue dans le bandeau de Chemin à pied ouvre Mon pas.
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const app = readFileSync(new URL('../js/app.js', import.meta.url), 'utf8');
const css = readFileSync(new URL('../css/style.css', import.meta.url), 'utf8');
const lines = app.split('\n');
const helpStart = lines.findIndex((l) => l.startsWith('const HELP = ['));
const helpEnd = lines.findIndex((l, i) => i > helpStart && l.startsWith('function openHelp('));
const fnOf = (i) => { for (let k = i; k >= 0; k -= 1) { const m = lines[k].match(/^(?:async )?function (\w+)/); if (m) return m[1]; } return ''; };

test('chemins écrits : plus aucun « Réglages → » dans un paragraphe de page, sauf trois cas dits', () => {
  const found = lines.map((l, i) => [i, l])
    .filter(([i, l]) => (i < helpStart || i > helpEnd) && /el\('p'/.test(l) && l.includes('Réglages →'))
    .map(([i]) => fnOf(i));
  // Envoyer à un proche : ce que fait le proche, sur son téléphone ; Bienvenue : où retrouver plus tard, sans quitter le premier lancement
  assert.deepEqual(found.sort(), ['openSendFriend', 'openWelcome', 'openWelcome']);
});

test('chaque ancien chemin a son bouton', () => {
  assert.match(app, /se change dans sa catégorie :`,\n\s+el\('button'[^\n]*\n[^\n]*\n\s+openCategory\(p\.cat, \{ back: named\(old \? 'Cette impression' : 'Écrire une impression'/);
  assert.match(app, /'La marge se règle dans :',\n[\s\S]{0,400}?openSettings\('distances', named\('Prévoir'/);
  assert.match(app, /state\.circuitsOn = true; persist\(\); applyToolOrder\(\); again\(\);[\s\S]{0,120}?'Rallumer les circuits'/);
  for (const label of ['Fiche d\\\'un lieu', 'Barre du haut', 'Boutons de la carte', 'Filtres affichés']) assert.ok(app.includes(`'${label}', (b) =>`), label);
  assert.match(app, /go\(named\('Ce que j\\'utilise', \(\) => openUsage\(\)\)\)/);
  assert.match(app, /Ils se changent dans :',[\s\S]{0,300}?openWordSeries\(here\(\)\)/);
  assert.match(app, /openSeenSubs\(c\.id, here\(\)\) \}, ico\('camera'\), 'Ses sous-catégories'/);
  assert.match(app, /openSettings\('categories', named\(`Série « \$\{old\.name\} »`, \(\) => openWordSerie\(id, back, k\)\)\)/);
  assert.match(app, /old \? ' Pour la donner à une catégorie :' : ' Une fois enregistrée, elle se donne à une catégorie\.'/, 'une série pas enregistrée ne se donne pas encore');
  assert.match(app, /openRemarks\(named\('Une remarque', \(\) => openRemark\(k\)\)\)/);
});

test('ce qui était écrit est gardé au retour', () => {
  assert.match(app, /function openPassage\(p, back, at = null, draft = null\)/);
  assert.match(app, /const keep = \{ day, date: date\.value, text: text\.value, photo, newBlob, stars \};/);
  assert.match(app, /function openPlan\(p, back = null, \{ done: doneFn = null, draft = null \} = \{\}\)/);
  assert.match(app, /const k = \{ day, part, date: date\.value, time: time\.value, who: who\.value \};/);
  assert.match(app, /function openCategory\(id, ret = null, draft = null\)/);
  assert.match(app, /const keep = \(\) => \(\{ name: name\.value, color, icon, log: log\.value, did: did\.value, wordsId, wordsTouched \}\);/);
  assert.match(app, /function openWordSerie\(id, back, draft = null\)/);
  assert.match(app, /function openRemark\(draft = null\)/);
  assert.match(app, /const where = draft\?\.where \?\? remarkWhere\(\);/, 'la remarque vise toujours l\'écran d\'où elle est partie');
  assert.ok(app.includes("btnRemark.addEventListener('click', () => openRemark());"), 'le porte-voix ne passe pas l\'événement comme brouillon');
});

test('Modifier la catégorie ouverte depuis une impression y ramène (Enregistrer, Annuler, Supprimer)', () => {
  assert.ok(app.includes("if (ret && !id) ret.done(state.categories.at(-1).id); else if (ret) ret.back(); else openSettings('categories');"));
  assert.ok(app.includes("persist(); refresh(); if (ret) ret.back(); else openSettings('categories');"));
});

test('les boutons des explications restent sous leur phrase, dans l\'Aide repliée', () => {
  assert.match(css, /^\.help > \.btn \{ display: flex; width: 100%; margin-top: 8px; \}/m);
});

test('Chemin à pied : une petite roue au bout du petit titre ouvre Mon pas ; son retour redessine le chemin', () => {
  assert.match(app, /function showPeekCard\(kicker, label, back, sub = 'Touche ici pour revenir à la liste', gear = null\)/);
  assert.match(app, /'›'\)\),\n\s+gear,\n\s+el\('button', \{ type: 'button', class: 'now-close'/, 'hors du bouton du bandeau, la croix reste au bout');
  assert.match(app, /rg\.selectNodeContents\(kick\);[\s\S]{0,200}?gear\.style\.left = `\$\{Math\.round\(r\.right - c\.left - card\.clientLeft - 6\)\}px`;/, 'au bout des mots du petit titre (v443, 1A)');
  assert.match(app, /new ResizeObserver\(place\)\.observe\(card\);/, 'suit la taille du texte');
  assert.match(app, /class: 'now-gear', 'aria-label': 'Régler mon pas'[\s\S]{0,120}?endPeek\(\); openSettings\('pas', named\('Chemin à pied', \(\) => showWalkRoute\(p, pos, back\)\)\);/);
  assert.match(app, /'touche ici pour revenir à la fiche'\]\.filter\(Boolean\)\.join\(' · '\), gear\);/);
  assert.match(css, /^\.now-gear \{ position: absolute; z-index: 1; width: 44px; height: 44px;/m, 'zone d\'appui de 44 px, sans colonne');
  assert.match(css, /^\.now-close \{ width: 44px;/m, 'la croix garde sa colonne');
});

test('Nouveautés : la ligne en tête, 10 au plus ; l\'Aide de Chemin à pied cite la roue', () => {
  const i = app.indexOf("['sparkles', 'Nouveautés', [");
  const block = app.slice(i, app.indexOf(']],', i));
  const news = block.split('\n').filter((l) => l.trim().startsWith("'{"));
  assert.equal(news.length, 10);
  assert.ok(news.slice(0, 8).some((l) => l.includes('**Des boutons à la place des chemins**'))); // v456 : « Cimetières » en tête ; v454 : « Points de vue » en tête ; v453 : « Croix Fermer plus visible » en tête ; v452 : « Deux nouveaux styles » en tête ; v450 : « Grands lieux, depuis toi » au-dessus ; v451 : « Un rond touché sur la carte change la page » en tête
  assert.ok(app.includes('touche le bandeau pour revenir à la fiche, la petite roue après « Chemin à pied » pour régler Mon pas'));
});
