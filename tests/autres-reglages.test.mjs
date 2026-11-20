// v322 (mon choix 1a du 20 nov.) : les réglages qu'on fait une fois sont rangés dans « Autres réglages » ;
// tout texte qui cite leur chemin passe par « Autres réglages ».
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const app = readFileSync(new URL('../js/app.js', import.meta.url), 'utf8');
const readme = readFileSync(new URL('../README.md', import.meta.url), 'utf8');

const OTHERS = ['Mes lignes de bus', 'Mots tout prêts', 'Favoris', 'Vu en passant', 'Ouvrir sur ma position', 'Distances et durées', 'Mon pas',
  'Style de la carte', 'Alertes et bandeau', 'Numéros des arrondissements', 'Filtres affichés', 'Fiche d\\\'un lieu', 'J\\\'ai un passe Navigo',
  'Écrire au masculin', 'Mise à jour et confidentialité', 'Ce que j\\\'utilise', 'Période de test', 'Mes remarques', 'Essayer le premier lancement',
  'Préparer le démarrage d\\\'un proche']; // v322 : la ligne de la v321 d'une autre conversation, rangée aussi
const MAIN = ['Aide de l\\\'appli', 'Sauvegarde', 'Restaurer ou importer', 'Mon Paris', 'Mes stations', 'Catégories et listes', 'Chez moi', 'TTB',
  'Mode sombre', 'Taille du texte', 'Barre du haut', 'Boutons de la carte', 'Autres réglages'];

const autresPage = app.slice(app.indexOf("if (section === 'autres') {"), app.indexOf("), { name: 'settings:autres'"));
const mainPage = app.slice(app.indexOf("openSheet([ico('settings'), ' Réglages'"), app.indexOf("), { name: 'settings', again: () => openSettings(), tall: true });"));

test('Autres réglages : les 20 lignes y sont, et plus sur Réglages', () => {
  assert.ok(autresPage.length > 1000 && mainPage.length > 1000);
  const key = (t) => (t === 'Numéros des arrondissements' ? 'arrNumsSwitch' : `'${t}'`); // interrupteur construit plus haut
  for (const t of OTHERS) {
    assert.ok(autresPage.includes(key(t)), `${t} dans Autres réglages`);
    assert.ok(!mainPage.includes(key(t)), `${t} plus sur Réglages`);
  }
  for (const t of MAIN) assert.ok(mainPage.includes(`'${t}'`), `${t} reste sur Réglages`);
  assert.ok(autresPage.includes("'← Réglages'"), 'retour vers Réglages');
});

test('Aucun texte ne cite un chemin qui saute « Autres réglages »', () => {
  const titles = OTHERS.map((t) => t.replace(/\\\\'/g, "\\'"));
  const alt = titles.map((t) => t.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')).join('|');
  const bad = new RegExp(`(Réglages|\\{settings\\})(,| →) (\\{[a-z0-9-]+\\} |« )?(La carte → |Ce qui s\\\\'affiche → |Appli → )?(${alt}|tout en bas)`);
  const lines = [...app.split('\n'), ...readme.split('\n')].filter((l) => !/^\s*(\/\/|\/\*|\*)/.test(l));
  const wrong = lines.filter((l) => bad.test(l.replace(/\s*\/\/.*$/, '')));
  assert.deepEqual(wrong.map((l) => l.trim().slice(0, 120)), []);
});

test('Les pages rangées ramènent à Autres réglages', () => {
  assert.match(app, /const OTHER_SECTIONS = \['vu', 'distances', 'pas', 'style', 'alertes', 'fiche', 'appli'\];/);
  assert.match(app, /inOthers \? '← Autres réglages' : '← Réglages'/);
  for (const f of ['function openFavStyle', 'function openUsage', 'async function openMyBusLines', 'function openWordSeries', 'function openPrepList']) {
    const i = app.indexOf(f);
    const body = app.slice(i, app.indexOf('\n}\n', i));
    assert.ok(/toOthers\(\)|openSettings\('autres'\)/.test(body), f);
    assert.ok(!/named\('Réglages', \(\) => openSettings\(\)\)/.test(body), `${f} : plus de retour direct à Réglages`);
  }
});
